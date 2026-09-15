"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOwner, requireRestaurant } from "@/lib/admin/session";
import {
  cleanText,
  isHexColor,
  isUuid,
  normalizeWhatsAppNumber,
  orderPrefixFor,
  parseNairaToKobo,
  parseWeeklyHours,
  slugify,
} from "@/lib/admin/validation";
import { isWithinHours } from "@/lib/hours";
import type { Weekday, WeeklyHours } from "@/lib/types";

/**
 * Every admin change. Each action checks the session first (server actions can be called with a
 * plain POST), then writes as the owner so RLS confines it to their restaurant, then refreshes the
 * public menu so the change shows immediately instead of after the 60-second ISR window.
 */

/** `id` is the created row, when an action creates one (so the page can upload its photo next). */
export type ActionResult = { ok: true; id?: string; itemIds?: string[] } | { error: string };

const OK: ActionResult = { ok: true };
const fail = (error: string): ActionResult => ({ error });
const TRY_AGAIN = "Couldn’t save that. Check your connection and try again.";

function refreshMenu(slug: string) {
  revalidatePath(`/r/${slug}`);
  revalidatePath(`/r/${slug}/cart`);
  revalidatePath("/admin");
}

function done(error: PostgrestError | null, slug: string, message = TRY_AGAIN): ActionResult {
  if (error) {
    console.error(error);
    return fail(message);
  }
  refreshMenu(slug);
  return OK;
}

const PRICE_HINT = "Enter a price in whole naira, e.g. 1500";

// Items ------------------------------------------------------------------------

export async function createItem(input: {
  categoryId: string;
  name: string;
  description: string;
  price: string;
}): Promise<ActionResult> {
  const { supabase, restaurant } = await requireRestaurant();
  const { categoryId } = input;
  const itemName = cleanText(input.name, 100);
  const description = input.description.trim() ? cleanText(input.description, 500) : null;
  const priceKobo = parseNairaToKobo(input.price);
  if (!isUuid(categoryId)) return fail("Choose a category");
  if (!itemName) return fail("Enter the item’s name");
  if (input.description.trim() && !description) return fail("Keep the description under 500 characters");
  if (priceKobo === null) return fail(PRICE_HINT);

  const { data: last } = await supabase
    .from("items")
    .select("sort_order")
    .eq("restaurant_id", restaurant.id)
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("items")
    .insert({
      restaurant_id: restaurant.id,
      category_id: categoryId,
      name: itemName,
      description,
      price_kobo: priceKobo,
      sort_order: (last?.sort_order ?? 0) + 1,
    })
    .select("id")
    .single();
  if (error) return done(error, restaurant.slug);
  refreshMenu(restaurant.slug);
  return { ok: true, id: data.id };
}

export async function updateItem(
  id: string,
  fields: { name: string; description: string; categoryId: string },
): Promise<ActionResult> {
  const { supabase, restaurant } = await requireRestaurant();
  const name = cleanText(fields.name, 100);
  const description = fields.description.trim() ? cleanText(fields.description, 500) : null;
  if (!isUuid(id) || !isUuid(fields.categoryId)) return fail(TRY_AGAIN);
  if (!name) return fail("Enter the item’s name");
  if (fields.description.trim() && !description) return fail("Keep the description under 500 characters");

  const { error } = await supabase
    .from("items")
    .update({ name, description, category_id: fields.categoryId })
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);
  return done(error, restaurant.slug);
}

export async function setItemPrice(id: string, price: string): Promise<ActionResult> {
  const { supabase, restaurant } = await requireRestaurant();
  const priceKobo = parseNairaToKobo(price);
  if (!isUuid(id)) return fail(TRY_AGAIN);
  if (priceKobo === null) return fail(PRICE_HINT);
  const { error } = await supabase
    .from("items")
    .update({ price_kobo: priceKobo })
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);
  return done(error, restaurant.slug);
}

export async function setItemAvailable(id: string, available: boolean): Promise<ActionResult> {
  const { supabase, restaurant } = await requireRestaurant();
  if (!isUuid(id)) return fail(TRY_AGAIN);
  const { error } = await supabase
    .from("items")
    .update({ is_available: available })
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);
  return done(error, restaurant.slug);
}

export async function deleteItem(id: string): Promise<ActionResult> {
  const { supabase, restaurant } = await requireRestaurant();
  if (!isUuid(id)) return fail(TRY_AGAIN);
  const { data: item } = await supabase.from("items").select("photo_url").eq("id", id).maybeSingle();
  const { error } = await supabase.from("items").delete().eq("id", id).eq("restaurant_id", restaurant.id);
  if (!error) await removePhoto(restaurant.id, item?.photo_url ?? null);
  return done(error, restaurant.slug);
}

export async function reorderItems(ids: string[]): Promise<ActionResult> {
  const { supabase, restaurant } = await requireRestaurant();
  if (!Array.isArray(ids) || ids.length > 500 || !ids.every(isUuid)) return fail(TRY_AGAIN);
  const results = await Promise.all(
    ids.map((id, index) =>
      supabase.from("items").update({ sort_order: index + 1 }).eq("id", id).eq("restaurant_id", restaurant.id),
    ),
  );
  return done(results.find((result) => result.error)?.error ?? null, restaurant.slug);
}

// Photos -----------------------------------------------------------------------

/** Public URL prefix of a restaurant's photo folder; uploads must land under it. */
function photoFolderUrl(restaurantId: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/item-photos/${restaurantId}/`;
}

/** Deletes a photo from Storage if it's one of this restaurant's uploads. Best effort. */
async function removePhoto(restaurantId: string, url: string | null) {
  const folder = photoFolderUrl(restaurantId);
  if (!url?.startsWith(folder)) return;
  const { supabase } = await getOwner();
  const { error } = await supabase.storage.from("item-photos").remove([`${restaurantId}/${url.slice(folder.length)}`]);
  if (error) console.error("Couldn't remove old photo", error);
}

/** Points an item at a photo the browser just uploaded (or clears it), and deletes the old file. */
export async function setItemPhoto(id: string, url: string | null): Promise<ActionResult> {
  const { supabase, restaurant } = await requireRestaurant();
  if (!isUuid(id)) return fail(TRY_AGAIN);
  if (url !== null && !url.startsWith(photoFolderUrl(restaurant.id))) return fail("That photo didn’t upload properly");

  const { data: item } = await supabase.from("items").select("photo_url").eq("id", id).maybeSingle();
  const { error } = await supabase
    .from("items")
    .update({ photo_url: url })
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);
  if (!error && item?.photo_url !== url) await removePhoto(restaurant.id, item?.photo_url ?? null);
  return done(error, restaurant.slug);
}

export async function setLogo(url: string | null): Promise<ActionResult> {
  const { supabase, restaurant } = await requireRestaurant();
  if (url !== null && !url.startsWith(photoFolderUrl(restaurant.id))) return fail("That logo didn’t upload properly");
  const { error } = await supabase.from("restaurants").update({ logo_url: url }).eq("id", restaurant.id);
  if (!error && restaurant.logo_url !== url) await removePhoto(restaurant.id, restaurant.logo_url);
  return done(error, restaurant.slug);
}

// Options ----------------------------------------------------------------------

export async function setOptionAvailable(id: string, available: boolean): Promise<ActionResult> {
  const { supabase, restaurant } = await requireRestaurant();
  if (!isUuid(id)) return fail(TRY_AGAIN);
  const { error } = await supabase
    .from("options")
    .update({ is_available: available })
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);
  return done(error, restaurant.slug);
}

export async function setOptionPrice(id: string, price: string): Promise<ActionResult> {
  const { supabase, restaurant } = await requireRestaurant();
  const priceKobo = parseNairaToKobo(price);
  if (!isUuid(id)) return fail(TRY_AGAIN);
  if (priceKobo === null) return fail(PRICE_HINT);
  const { error } = await supabase
    .from("options")
    .update({ price_delta_kobo: priceKobo })
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);
  return done(error, restaurant.slug);
}

// Categories -------------------------------------------------------------------

export async function createCategory(name: string): Promise<ActionResult> {
  const { supabase, restaurant } = await requireRestaurant();
  const categoryName = cleanText(name, 60);
  if (!categoryName) return fail("Enter the category’s name");

  const { data: existing } = await supabase
    .from("categories")
    .select("slug, sort_order")
    .eq("restaurant_id", restaurant.id);
  const taken = new Set(existing?.map((category) => category.slug));
  const base = slugify(categoryName);
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  const sortOrder = Math.max(0, ...(existing ?? []).map((category) => category.sort_order)) + 1;

  const { error } = await supabase
    .from("categories")
    .insert({ restaurant_id: restaurant.id, name: categoryName, slug, sort_order: sortOrder });
  return done(error, restaurant.slug);
}

export async function renameCategory(id: string, name: string): Promise<ActionResult> {
  const { supabase, restaurant } = await requireRestaurant();
  const categoryName = cleanText(name, 60);
  if (!isUuid(id)) return fail(TRY_AGAIN);
  if (!categoryName) return fail("Enter the category’s name");
  // The slug (the menu's #anchor) stays put so shared links to a section keep working.
  const { error } = await supabase
    .from("categories")
    .update({ name: categoryName })
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);
  return done(error, restaurant.slug);
}

export async function setCategoryActive(id: string, active: boolean): Promise<ActionResult> {
  const { supabase, restaurant } = await requireRestaurant();
  if (!isUuid(id)) return fail(TRY_AGAIN);
  const { error } = await supabase
    .from("categories")
    .update({ is_active: active })
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);
  return done(error, restaurant.slug);
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const { supabase, restaurant } = await requireRestaurant();
  if (!isUuid(id)) return fail(TRY_AGAIN);
  const { error } = await supabase.from("categories").delete().eq("id", id).eq("restaurant_id", restaurant.id);
  // 23503: items still reference it (items → categories has no cascade on purpose).
  if (error?.code === "23503") return fail("Move or delete this category’s items first");
  return done(error, restaurant.slug);
}

export async function reorderCategories(ids: string[]): Promise<ActionResult> {
  const { supabase, restaurant } = await requireRestaurant();
  if (!Array.isArray(ids) || ids.length > 200 || !ids.every(isUuid)) return fail(TRY_AGAIN);
  const results = await Promise.all(
    ids.map((id, index) =>
      supabase.from("categories").update({ sort_order: index + 1 }).eq("id", id).eq("restaurant_id", restaurant.id),
    ),
  );
  return done(results.find((result) => result.error)?.error ?? null, restaurant.slug);
}

// Orders -----------------------------------------------------------------------

const ORDER_STATUSES = ["sent", "confirmed", "fulfilled", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export async function setOrderStatus(id: string, status: OrderStatus): Promise<ActionResult> {
  const { supabase, restaurant } = await requireRestaurant();
  if (!isUuid(id) || !ORDER_STATUSES.includes(status)) return fail(TRY_AGAIN);
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);
  if (error) {
    console.error(error);
    return fail(TRY_AGAIN);
  }
  revalidatePath("/admin");
  return OK;
}

// Settings ---------------------------------------------------------------------

export type DayHoursInput = { closed: boolean; open: string; close: string };

export interface SettingsInput {
  name: string;
  whatsappNumber: string;
  address: string;
  mapsUrl: string;
  acceptsPickup: boolean;
  acceptsDelivery: boolean;
  openingHours: Record<Weekday, DayHoursInput>;
  deliveryHours: Record<Weekday, DayHoursInput>;
  accentHex: string;
  openOverride: "schedule" | "open" | "closed";
  isPublished: boolean;
}

export async function saveSettings(input: SettingsInput): Promise<ActionResult> {
  const { supabase, restaurant } = await requireRestaurant();
  const name = cleanText(input.name, 80);
  const whatsapp = normalizeWhatsAppNumber(input.whatsappNumber);
  const address = input.address.trim() ? cleanText(input.address, 300) : null;
  const mapsUrl = input.mapsUrl.trim() || null;
  const openingHours = parseWeeklyHours(input.openingHours);
  const deliveryHours = parseWeeklyHours(input.deliveryHours);

  if (!name) return fail("Enter the restaurant’s name");
  if (!whatsapp) return fail("Enter the WhatsApp number with its country code, e.g. +234 803 123 4567");
  if (input.address.trim() && !address) return fail("Keep the address under 300 characters");
  if (mapsUrl && (!/^https:\/\/\S+$/.test(mapsUrl) || mapsUrl.length > 500)) return fail("The map link should start with https://");
  if (!openingHours) return fail("Check the opening hours: each open day needs an opening and closing time");
  if (!deliveryHours) return fail("Check the delivery hours: each delivery day needs a start and end time");
  if (!input.acceptsPickup && !input.acceptsDelivery) return fail("Offer pickup, delivery or both");
  if (!isHexColor(input.accentHex)) return fail("Pick an accent colour");
  if (!["schedule", "open", "closed"].includes(input.openOverride)) return fail(TRY_AGAIN);

  const { error } = await supabase
    .from("restaurants")
    .update({
      name,
      whatsapp_number: whatsapp,
      address,
      maps_url: mapsUrl,
      accepts_pickup: Boolean(input.acceptsPickup),
      accepts_delivery: Boolean(input.acceptsDelivery),
      opening_hours: openingHours,
      delivery_hours: deliveryHours,
      accent_hex: input.accentHex,
      is_open_override: input.openOverride === "schedule" ? null : input.openOverride === "open",
      is_published: Boolean(input.isPublished),
    })
    .eq("id", restaurant.id);
  return done(error, restaurant.slug);
}

/**
 * The dashboard's "Open now" switch. It only overrides the schedule when the switch disagrees
 * with it; switching back to what the hours say clears the override, so the restaurant doesn't
 * stay forced open or closed after the owner meant a one-off.
 */
export async function setOpenNow(open: boolean): Promise<ActionResult> {
  const { supabase, restaurant } = await requireRestaurant();
  if (typeof open !== "boolean") return fail(TRY_AGAIN);
  const scheduledOpen = isWithinHours(restaurant.opening_hours as unknown as WeeklyHours);
  const { error } = await supabase
    .from("restaurants")
    .update({ is_open_override: open === scheduledOpen ? null : open })
    .eq("id", restaurant.id);
  return done(error, restaurant.slug);
}

// Onboarding -------------------------------------------------------------------

export interface OnboardingInput {
  name: string;
  whatsappNumber: string;
  openingHours: Record<Weekday, DayHoursInput>;
  items: { name: string; price: string }[];
}

const MAX_ONBOARDING_ITEMS = 10;

/**
 * First login: creates the restaurant with its hours, a "Menu" category and the first items, and
 * publishes it. Returns the new ids so the page can upload photos picked during onboarding.
 */
export async function createRestaurant(input: OnboardingInput): Promise<ActionResult> {
  const { supabase, userId, restaurant: existing } = await getOwner();
  if (existing) redirect("/admin");

  const name = cleanText(input.name, 80);
  const whatsapp = normalizeWhatsAppNumber(input.whatsappNumber);
  const openingHours = parseWeeklyHours(input.openingHours);
  if (!name) return fail("Enter your restaurant’s name");
  if (!whatsapp) return fail("Enter the WhatsApp number with its country code, e.g. +234 803 123 4567");
  if (!openingHours) return fail("Check the hours: each open day needs an opening and closing time");
  if (!Array.isArray(input.items) || input.items.length > MAX_ONBOARDING_ITEMS) {
    return fail(`Add up to ${MAX_ONBOARDING_ITEMS} items now; you can add the rest from the admin`);
  }

  const items = [];
  for (const [index, item] of input.items.entries()) {
    if (!item.name.trim() && !item.price.trim()) continue;
    const itemName = cleanText(item.name, 100);
    const priceKobo = parseNairaToKobo(item.price);
    if (!itemName) return fail(`Item ${index + 1} needs a name`);
    if (priceKobo === null) return fail(`Item ${index + 1}: ${PRICE_HINT.toLowerCase()}`);
    items.push({ name: itemName, price_kobo: priceKobo, sort_order: items.length + 1 });
  }
  if (items.length === 0) return fail("Add at least one item");

  // Slugs are unique across all restaurants; add a number until one is free.
  const base = slugify(name);
  let restaurantId: string | null = null;
  let slug = base;
  for (let attempt = 1; attempt <= 20 && !restaurantId; attempt++) {
    slug = attempt === 1 ? base : `${base}-${attempt}`;
    const { data, error } = await supabase
      .from("restaurants")
      .insert({
        slug,
        name,
        whatsapp_number: whatsapp,
        opening_hours: openingHours,
        // Delivery starts off; when the owner turns it on in Settings, its hours start from these.
        delivery_hours: openingHours,
        accepts_pickup: true,
        accepts_delivery: false,
        order_prefix: orderPrefixFor(name),
        is_published: true,
        owner_id: userId,
      })
      .select("id")
      .single();
    if (data) restaurantId = data.id;
    else if (error?.code !== "23505") {
      console.error(error);
      return fail(TRY_AGAIN);
    }
  }
  if (!restaurantId) return fail("That name is taken many times over. Try a more specific name.");

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .insert({ restaurant_id: restaurantId, name: "Menu", slug: "menu", sort_order: 1 })
    .select("id")
    .single();
  if (categoryError) return done(categoryError, slug);
  const { data: created, error } = await supabase
    .from("items")
    .insert(items.map((item) => ({ ...item, restaurant_id: restaurantId, category_id: category.id })))
    .select("id, sort_order");
  if (error) return done(error, slug);

  refreshMenu(slug);
  return {
    ok: true,
    id: restaurantId,
    itemIds: [...(created ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((item) => item.id),
  };
}

// Session ----------------------------------------------------------------------

export async function signOut() {
  const { supabase } = await getOwner();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
