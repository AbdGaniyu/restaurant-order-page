import { AdminShell, type AdminTab } from "@/components/admin/AdminShell";
import { CategoriesTab } from "@/components/admin/CategoriesTab";
import { Dashboard } from "@/components/admin/Dashboard";
import { ItemsTab } from "@/components/admin/ItemsTab";
import { Onboarding } from "@/components/admin/Onboarding";
import { OrdersTab, type AdminOrder } from "@/components/admin/OrdersTab";
import { SettingsTab } from "@/components/admin/SettingsTab";
import { dashboardStats, startOfBusinessWeek } from "@/lib/admin/dashboard";
import { orderTime } from "@/lib/admin/format";
import { getOwner } from "@/lib/admin/session";
import { closingTime, formatNextOpening, isWithinHours, nextOpening } from "@/lib/hours";
import { siteUrl } from "@/lib/site";
import type { WeeklyHours } from "@/lib/types";

const TABS: AdminTab[] = ["home", "items", "categories", "orders", "settings"];

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
  const tab = TABS.find((id) => id === params.tab) ?? "home";
  const now = new Date();
  const publicUrl = `${siteUrl()}/r/${restaurant.slug}`;
  const hours = restaurant.opening_hours as unknown as WeeklyHours;

  // This week's orders (Lagos time) cover the dashboard and both order filters.
  const recentOrders = async () =>
    rows(
      await db
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", startOfBusinessWeek(now).toISOString())
        .order("created_at", { ascending: false })
        .limit(300),
    ) as unknown as AdminOrder[];

  let content;
  if (tab === "home") {
    const [orders, soldOut] = await Promise.all([
      recentOrders(),
      db.from("items").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id).eq("is_available", false),
    ]);
    if (soldOut.error) throw soldOut.error;
    const isOpen = restaurant.is_open_override ?? isWithinHours(hours, now);
    const next = isOpen ? null : nextOpening(hours, now);
    content = (
      <Dashboard
        restaurantName={restaurant.name}
        slug={restaurant.slug}
        publicUrl={publicUrl}
        nowIso={now.toISOString()}
        stats={dashboardStats(orders, now)}
        soldOut={soldOut.count ?? 0}
        latest={orders.slice(0, 4).map((order) => ({
          id: order.id,
          when: orderTime(order.created_at, now),
          customer: order.customer_name,
          summary: order.items.map((line) => `${line.quantity}× ${line.name}`).join(", "),
          totalKobo: order.total_kobo,
        }))}
        open={{
          isOpen,
          overridden: restaurant.is_open_override !== null,
          closesAt: isOpen ? closingTime(hours, now) : null,
          opensAt: next && formatNextOpening(next),
        }}
      />
    );
  } else if (tab === "items") {
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
        welcome={params.welcome === "1"}
        startAdding={params.add === "1"}
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
    content = <OrdersTab orders={await recentOrders()} nowIso={now.toISOString()} />;
  } else {
    content = (
      <SettingsTab
        publicUrl={publicUrl}
        restaurant={{
          id: restaurant.id,
          slug: restaurant.slug,
          name: restaurant.name,
          whatsappNumber: restaurant.whatsapp_number,
          address: restaurant.address ?? "",
          mapsUrl: restaurant.maps_url ?? "",
          acceptsPickup: restaurant.accepts_pickup,
          acceptsDelivery: restaurant.accepts_delivery,
          openingHours: hours,
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
    <AdminShell restaurant={restaurant} tab={tab} publicUrl={publicUrl}>
      {content}
    </AdminShell>
  );
}
