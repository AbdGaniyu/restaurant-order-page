import { cartLinesFrom, lineTotal, repriceCart } from './cart';
import type { TablesInsert } from './database.types';
import { buildMenuView } from './menu';
import type { CustomerDetails } from './order-message';
import type { CartLine, MenuData } from './types';

/** What the cart page posts to /api/orders when the customer taps "Order on WhatsApp". */
export interface OrderLogRequest {
  slug: string;
  reference: string;
  lines: CartLine[];
  customer: CustomerDetails;
}

const MAX_LINES = 100;

/** A string no longer than max; missing values take the fallback. Null when invalid. */
function text(value: unknown, max: number, fallback?: string): string | null {
  const v = value ?? fallback;
  return typeof v === 'string' && v.length <= max ? v : null;
}

/** Validates an untrusted request body. Limits mirror the orders table's checks. */
export function parseOrderLogRequest(body: unknown): OrderLogRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const input = body as Record<string, unknown>;
  const customer = (typeof input.customer === 'object' && input.customer !== null ? input.customer : {}) as Record<
    string,
    unknown
  >;

  const slug = text(input.slug, 60);
  const reference = text(input.reference, 10);
  const name = text(customer.name, 100);
  const address = text(customer.address, 300, '');
  const landmark = text(customer.landmark, 300, '');
  const phone = text(customer.phone, 30, '');
  const orderType = customer.orderType === 'pickup' || customer.orderType === 'delivery' ? customer.orderType : null;
  const lines = Array.isArray(input.lines) && input.lines.length <= MAX_LINES ? cartLinesFrom(input.lines) : [];

  if (slug === null || reference === null || orderType === null || lines.length === 0) return null;
  if (!name?.trim() || address === null || landmark === null || phone === null) return null;
  return { slug, reference, lines, customer: { name, orderType, address, landmark, phone } };
}

const toKobo = (naira: number) => naira * 100;
const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

function snapshotLine(line: CartLine, flags: { sold_out?: true; not_on_menu?: true } = {}) {
  return {
    menu_item_id: line.menu_item_id,
    name: line.name,
    quantity: line.quantity,
    unit_price_kobo: toKobo(line.unit_price),
    options: line.selected_options.map((option) => ({
      option_id: option.option_id,
      name: option.name,
      price_delta_kobo: toKobo(option.price_delta),
    })),
    note: line.note,
    line_total_kobo: toKobo(lineTotal(line)),
    ...flags,
  };
}

/**
 * The orders row for a logged order. Lines are re-priced from the menu rather than trusting the
 * browser. Lines the menu no longer has are kept as sent and flagged, because the customer's
 * WhatsApp message already lists them.
 */
export function buildOrderRow(menu: MenuData, request: OrderLogRequest): TablesInsert<'orders'> {
  const items = buildMenuView(menu).flatMap((category) => category.items);
  const { lines, removed } = repriceCart(request.lines, items);
  const snapshot = [
    ...lines.map(({ sold_out, ...line }) => snapshotLine(line, sold_out ? { sold_out: true } : {})),
    ...removed.map((line) => snapshotLine(line, { not_on_menu: true })),
  ];
  const { customer } = request;
  const delivery = customer.orderType === 'delivery';

  return {
    restaurant_id: menu.business_settings.id,
    reference: request.reference,
    items: snapshot,
    total_kobo: snapshot.reduce((sum, line) => sum + line.line_total_kobo, 0),
    customer_name: clean(customer.name),
    customer_phone: clean(customer.phone) || null,
    order_type: customer.orderType,
    address: delivery ? clean(customer.address) || null : null,
    landmark: delivery ? clean(customer.landmark) || null : null,
  };
}
