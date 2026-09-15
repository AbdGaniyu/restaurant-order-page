import { getMenu } from "@/lib/menu";
import { buildOrderRow, parseOrderLogRequest } from "@/lib/order-log";
import { isOrderReference } from "@/lib/order-reference";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * Logs an order when the customer taps "Order on WhatsApp". The cart page opens WhatsApp in the
 * same tap (a window opened after awaiting a response gets popup-blocked), so this only records
 * the order: lines are re-priced from the database and stored under the reference the message carries.
 * Inserts go through the anon key; RLS allows them for published restaurants only.
 */
export async function POST(request: Request) {
  const order = parseOrderLogRequest(await request.json().catch(() => null));
  if (!order) return Response.json({ error: "Invalid order" }, { status: 400 });

  const menu = await getMenu(order.slug);
  if (!menu) return Response.json({ error: "Restaurant not found" }, { status: 404 });
  if (!isOrderReference(order.reference, menu.business_settings.order_prefix)) {
    return Response.json({ error: "Invalid reference" }, { status: 400 });
  }

  const { error } = await createPublicClient().from("orders").insert(buildOrderRow(menu, order));
  // A repeated reference is the same order arriving twice (a retried request): it's already logged.
  if (error && error.code !== "23505") {
    console.error("Failed to log order", error);
    return Response.json({ error: "Could not log the order" }, { status: 500 });
  }
  return Response.json({ reference: order.reference }, { status: 201 });
}
