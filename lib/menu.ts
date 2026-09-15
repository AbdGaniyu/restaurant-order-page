import { cache } from 'react';
import type { Tables } from './database.types';
import { formatNaira } from './format';
import { createPublicClient } from './supabase/public';
import type {
  Category,
  MenuData,
  MenuItem,
  Option,
  OptionGroup,
  Packaging,
  SelectionType,
  WeeklyHours,
} from './types';

/** The database stores kobo; the app works in whole naira (the schema only allows multiples of 100). */
const toNaira = (kobo: number) => kobo / 100;

/** One restaurant's rows, as Supabase returns them. */
export interface MenuRows {
  restaurant: Tables<'restaurants'>;
  categories: Tables<'categories'>[];
  items: Tables<'items'>[];
  option_groups: Tables<'option_groups'>[];
  options: Tables<'options'>[];
  item_option_groups: Tables<'item_option_groups'>[];
}

/** Maps a restaurant's rows onto the shapes the menu UI renders. */
export function menuFromRows(rows: MenuRows): MenuData {
  const { restaurant } = rows;
  const packaging = restaurant.packaging_kobo as Partial<Record<keyof Packaging, number | null>>;
  const pack = (key: keyof Packaging) => {
    const kobo = packaging[key];
    return typeof kobo === 'number' ? toNaira(kobo) : null;
  };

  return {
    business_settings: {
      id: restaurant.id,
      slug: restaurant.slug,
      name: restaurant.name,
      // E.164 in the database; wa.me wants the digits only.
      whatsapp_number: restaurant.whatsapp_number.replace(/\D/g, ''),
      address: restaurant.address,
      maps_url: restaurant.maps_url,
      brand_color: restaurant.accent_hex,
      logo_url: restaurant.logo_url,
      order_prefix: restaurant.order_prefix,
      opening_hours: restaurant.opening_hours as unknown as WeeklyHours,
      delivery_hours: restaurant.delivery_hours as unknown as WeeklyHours,
      accepts_delivery: restaurant.accepts_delivery,
      accepts_pickup: restaurant.accepts_pickup,
      is_open_override: restaurant.is_open_override,
      delivery_fee_tiers: restaurant.delivery_fee_tiers_kobo.map(toNaira),
      packaging: { small_pack: pack('small_pack'), big_pack: pack('big_pack'), two_litre_pack: pack('two_litre_pack') },
    },
    categories: rows.categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      sort_order: category.sort_order,
      is_active: category.is_active,
    })),
    menu_items: rows.items.map((item) => ({
      id: item.id,
      category_id: item.category_id,
      name: item.name,
      description: item.description,
      price: toNaira(item.price_kobo),
      image_url: item.photo_url,
      is_available: item.is_available,
      sort_order: item.sort_order,
      pos_name: item.pos_name,
    })),
    option_groups: rows.option_groups.map((group) => ({
      id: group.id,
      name: group.name,
      selection_type: group.selection_type as SelectionType,
      is_required: group.is_required,
      min_select: group.min_select,
      max_select: group.max_select,
      sort_order: group.sort_order,
    })),
    options: rows.options.map((option) => ({
      id: option.id,
      option_group_id: option.option_group_id,
      name: option.name,
      price_delta: toNaira(option.price_delta_kobo),
      is_available: option.is_available,
      sort_order: option.sort_order,
      pos_name: option.pos_name,
    })),
    menu_item_option_groups: rows.item_option_groups.map((link) => ({
      menu_item_id: link.item_id,
      option_group_id: link.option_group_id,
    })),
  };
}

/**
 * A published restaurant's menu, or null if there's no such published restaurant.
 * cache() shares one read between the layout, page, metadata and images of a render.
 */
export const getMenu = cache(async (slug: string): Promise<MenuData | null> => {
  const db = createPublicClient();
  const { data: restaurant, error } = await db
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();
  if (error) throw error;
  if (!restaurant) return null;

  const [categories, items, optionGroups, options, links] = await Promise.all([
    db.from('categories').select('*').eq('restaurant_id', restaurant.id),
    db.from('items').select('*').eq('restaurant_id', restaurant.id),
    db.from('option_groups').select('*').eq('restaurant_id', restaurant.id),
    db.from('options').select('*').eq('restaurant_id', restaurant.id),
    db.from('item_option_groups').select('*').eq('restaurant_id', restaurant.id),
  ]);
  for (const result of [categories, items, optionGroups, options, links]) {
    if (result.error) throw result.error;
  }

  return menuFromRows({
    restaurant,
    categories: categories.data ?? [],
    items: items.data ?? [],
    option_groups: optionGroups.data ?? [],
    options: options.data ?? [],
    item_option_groups: links.data ?? [],
  });
});

export async function getPublishedSlugs(): Promise<string[]> {
  const { data, error } = await createPublicClient().from('restaurants').select('slug').eq('is_published', true);
  if (error) throw error;
  return data.map((restaurant) => restaurant.slug);
}

export type OptionGroupView = OptionGroup & { options: Option[] };
export type MenuItemView = MenuItem & { option_groups: OptionGroupView[] };
export type CategoryView = Category & { items: MenuItemView[] };

const bySortOrder = (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order;

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    groups.set(k, [...(groups.get(k) ?? []), row]);
  }
  return groups;
}

/**
 * Joins the flat tables into the nested shape the menu page renders.
 * Inactive categories drop out; sold-out items and options stay in so the page can grey them.
 */
export function buildMenuView(menu: MenuData): CategoryView[] {
  const optionsByGroup = groupBy(menu.options, (option) => option.option_group_id);
  const groupsById = new Map(
    menu.option_groups.map((group) => [
      group.id,
      { ...group, options: (optionsByGroup.get(group.id) ?? []).sort(bySortOrder) },
    ]),
  );
  const linksByItem = groupBy(menu.menu_item_option_groups, (link) => link.menu_item_id);
  const itemsByCategory = groupBy(menu.menu_items, (item) => item.category_id);

  return menu.categories
    .filter((category) => category.is_active)
    .sort(bySortOrder)
    .map((category) => ({
      ...category,
      items: (itemsByCategory.get(category.id) ?? []).sort(bySortOrder).map((item) => ({
        ...item,
        option_groups: (linksByItem.get(item.id) ?? [])
          .flatMap((link) => groupsById.get(link.option_group_id) ?? [])
          .sort(bySortOrder),
      })),
    }));
}

/**
 * The lowest price a customer can actually pay for the item. Required single-select
 * groups with non-zero deltas (sizes, portions) mean the base alone isn't orderable,
 * so the card reads "from ₦X".
 */
export function startingPrice(item: MenuItemView): { amount: number; isFrom: boolean } {
  let amount = item.price;
  let isFrom = false;
  for (const group of item.option_groups) {
    if (group.selection_type !== 'single' || !group.is_required) continue;
    if (!group.options.some((option) => option.price_delta !== 0)) continue;
    const available = group.options.filter((option) => option.is_available);
    amount += Math.min(...(available.length > 0 ? available : group.options).map((o) => o.price_delta));
    isFrom = true;
  }
  return { amount, isFrom };
}

/** "₦500" or "from ₦3,000" */
export function cardPriceLabel(item: MenuItemView): string {
  const { amount, isFrom } = startingPrice(item);
  return isFrom ? `from ${formatNaira(amount)}` : formatNaira(amount);
}
