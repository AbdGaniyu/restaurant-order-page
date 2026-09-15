import { ADMIN_TABS, AdminShell, type AdminTab } from "@/components/admin/AdminShell";
import { CategoriesTab } from "@/components/admin/CategoriesTab";
import { ItemsTab } from "@/components/admin/ItemsTab";
import { Onboarding } from "@/components/admin/Onboarding";
import { OrdersTab, type AdminOrder } from "@/components/admin/OrdersTab";
import { SettingsTab } from "@/components/admin/SettingsTab";
import { getOwner } from "@/lib/admin/session";
import type { WeeklyHours } from "@/lib/types";

/** Throws on a query error so the error boundary shows, rather than an admin that looks empty. */
function rows<T>({ data, error }: { data: T[] | null; error: unknown }): T[] {
  if (error) throw error;
  return data ?? [];
}

const bySortOrder = (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order;

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const { supabase: db, restaurant, email } = await getOwner();
  if (!restaurant) return <Onboarding email={email} />;

  const params = await searchParams;
  const tab: AdminTab = ADMIN_TABS.some(({ id }) => id === params.tab) ? (params.tab as AdminTab) : "items";

  let content;
  if (tab === "items") {
    const [categories, items, groups, options, links] = await Promise.all([
      db.from("categories").select("*").eq("restaurant_id", restaurant.id).then(rows),
      db.from("items").select("*").eq("restaurant_id", restaurant.id).then(rows),
      db.from("option_groups").select("*").eq("restaurant_id", restaurant.id).then(rows),
      db.from("options").select("*").eq("restaurant_id", restaurant.id).then(rows),
      db.from("item_option_groups").select("*").eq("restaurant_id", restaurant.id).then(rows),
    ]);
    const itemNames = new Map(items.map((item) => [item.id, item.name]));
    content = (
      <ItemsTab
        restaurantId={restaurant.id}
        slug={restaurant.slug}
        welcome={params.welcome === "1"}
        categories={categories.sort(bySortOrder).map((category) => ({
          id: category.id,
          name: category.name,
          is_active: category.is_active,
          items: items.filter((item) => item.category_id === category.id).sort(bySortOrder),
        }))}
        optionGroups={groups.sort(bySortOrder).map((group) => ({
          id: group.id,
          name: group.name,
          usedBy: links
            .filter((link) => link.option_group_id === group.id)
            .map((link) => itemNames.get(link.item_id) ?? ""),
          options: options.filter((option) => option.option_group_id === group.id).sort(bySortOrder),
        }))}
      />
    );
  } else if (tab === "categories") {
    const [categories, items] = await Promise.all([
      db.from("categories").select("*").eq("restaurant_id", restaurant.id).then(rows),
      db.from("items").select("category_id").eq("restaurant_id", restaurant.id).then(rows),
    ]);
    content = (
      <CategoriesTab
        categories={categories.sort(bySortOrder).map((category) => ({
          id: category.id,
          name: category.name,
          is_active: category.is_active,
          itemCount: items.filter((item) => item.category_id === category.id).length,
        }))}
      />
    );
  } else if (tab === "orders") {
    const orders = await db
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(rows);
    content = <OrdersTab orders={orders as unknown as AdminOrder[]} />;
  } else {
    content = (
      <SettingsTab
        restaurant={{
          id: restaurant.id,
          slug: restaurant.slug,
          name: restaurant.name,
          whatsappNumber: restaurant.whatsapp_number,
          address: restaurant.address ?? "",
          mapsUrl: restaurant.maps_url ?? "",
          acceptsPickup: restaurant.accepts_pickup,
          acceptsDelivery: restaurant.accepts_delivery,
          openingHours: restaurant.opening_hours as unknown as WeeklyHours,
          deliveryHours: restaurant.delivery_hours as unknown as WeeklyHours,
          accentHex: restaurant.accent_hex,
          logoUrl: restaurant.logo_url,
          isOpenOverride: restaurant.is_open_override,
          isPublished: restaurant.is_published,
        }}
      />
    );
  }

  return (
    <AdminShell restaurant={restaurant} tab={tab}>
      {content}
    </AdminShell>
  );
}
