import { businessShortName, takeawayPackPrices } from './business';
import { cartSubtotal, lineTotal, NOTE_MAX_LENGTH } from './cart';
import { formatNaira, formatNairaRange } from './format';
import { formatSentAt, getBusinessStatus } from './hours';
import type { BusinessSettings, CartLine, OrderType } from './types';

export interface CustomerDetails {
  name: string;
  orderType: OrderType;
  address: string;
  landmark: string;
  phone: string;
}

export interface OrderDraft {
  settings: BusinessSettings;
  lines: CartLine[];
  customer: CustomerDetails;
  reference: string;
  sentAt: Date;
  /** Shown in the footer, e.g. "yakoyo.vercel.app". */
  host: string;
}

/** Customer text goes on one line; stray newlines would break the message layout. */
const clean = (text: string) => text.replace(/\s+/g, ' ').trim();

/**
 * The plain-text WhatsApp order (spec §3). WhatsApp renders *bold*; sections are
 * separated by blank lines. Encode the result once, when building the wa.me URL.
 */
export function buildOrderMessage({ settings, lines, customer, reference, sentAt, host }: OrderDraft): string {
  const delivery = customer.orderType === 'delivery';
  const outsideHours = !getBusinessStatus(settings, sentAt).isOpen;
  const packs = takeawayPackPrices(settings);
  const fees = settings.delivery_fee_tiers;

  const header = [
    `*New order — ${settings.name}*`,
    `Ref: ${reference}`,
    `Type: ${delivery ? 'Delivery' : 'Pickup'}`,
    ...(outsideHours ? ['(sent outside opening hours)'] : []),
  ];

  const items = [
    '*Items*',
    ...lines.flatMap((line) => [
      `${line.quantity}× ${clean(line.name)} — ${formatNaira(lineTotal(line))}`,
      ...(line.selected_options.length > 0
        ? [`   ${line.selected_options.map((option) => clean(option.name)).join(', ')}`]
        : []),
      ...(clean(line.note) ? [`   Note: ${clean(line.note).slice(0, NOTE_MAX_LENGTH)}`] : []),
    ]),
  ];

  const totals = [
    `Subtotal: ${formatNaira(cartSubtotal(lines))}`,
    ...(delivery
      ? [`Delivery fee: confirmed on WhatsApp${fees.length > 0 ? ` (${formatNairaRange(fees)} by area)` : ''}`]
      : []),
    ...(packs.length > 0
      ? [`Takeaway packs: ${formatNairaRange(packs)} each, added by ${businessShortName(settings)}`]
      : []),
  ];

  const customerLines = [
    '*Customer*',
    `Name: ${clean(customer.name)}`,
    ...(delivery ? [`Deliver to: ${clean(customer.address)}`, `Landmark: ${clean(customer.landmark)}`] : []),
    ...(clean(customer.phone) ? [`Phone: ${clean(customer.phone)}`] : []),
  ];

  const footer = [`Sent from ${host} · ${formatSentAt(sentAt)}`];

  return [header, items, totals, customerLines, footer].map((section) => section.join('\n')).join('\n\n');
}
