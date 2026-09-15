import type { MenuItemView } from './menu';
import { selectedOptions, type Selection } from './selection';
import type { CartLine, SelectedOption } from './types';

export const MAX_QUANTITY = 99;
/** Notes are cut to this length so the WhatsApp message stays short (spec §3). */
export const NOTE_MAX_LENGTH = 80;

/** One unit including its chosen options. */
export function lineUnitPrice(line: CartLine): number {
  return line.unit_price + line.selected_options.reduce((sum, option) => sum + option.price_delta, 0);
}

export function lineTotal(line: CartLine): number {
  return lineUnitPrice(line) * line.quantity;
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

export function cartItemCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** Random hex id. getRandomValues works on plain-http LAN testing, unlike crypto.randomUUID. */
export function createLineId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function buildCartLine(
  item: MenuItemView,
  selection: Selection,
  quantity: number,
  note: string,
): CartLine {
  return {
    line_id: createLineId(),
    menu_item_id: item.id,
    name: item.name,
    unit_price: item.price,
    quantity: clampQuantity(quantity),
    selected_options: selectedOptions(item, selection),
    note: note.trim().slice(0, NOTE_MAX_LENGTH),
  };
}

const clampQuantity = (quantity: number) => Math.min(MAX_QUANTITY, Math.max(1, Math.round(quantity)));

/** Lines for the same item with the same options and note are the same order line. */
const lineKey = (line: CartLine) =>
  [line.menu_item_id, line.selected_options.map((o) => o.option_id).sort().join(','), line.note].join('|');

/** Adds a line, or bumps the quantity of an identical one already in the cart. */
export function addLine(lines: CartLine[], line: CartLine): CartLine[] {
  const key = lineKey(line);
  const existing = lines.find((l) => lineKey(l) === key);
  if (!existing) return [...lines, line];
  return lines.map((l) =>
    l === existing ? { ...l, quantity: clampQuantity(l.quantity + line.quantity) } : l,
  );
}

/** A quantity of zero or less removes the line. */
export function setLineQuantity(lines: CartLine[], lineId: string, quantity: number): CartLine[] {
  if (quantity <= 0) return removeLine(lines, lineId);
  return lines.map((l) => (l.line_id === lineId ? { ...l, quantity: clampQuantity(quantity) } : l));
}

export function removeLine(lines: CartLine[], lineId: string): CartLine[] {
  return lines.filter((l) => l.line_id !== lineId);
}

const isSelectedOption = (value: unknown): value is SelectedOption => {
  const o = value as Record<string, unknown> | null;
  return (
    typeof o === 'object' &&
    o !== null &&
    typeof o.option_id === 'string' &&
    typeof o.name === 'string' &&
    Number.isInteger(o.price_delta)
  );
};

const isCartLine = (value: unknown): value is CartLine => {
  const l = value as Record<string, unknown> | null;
  return (
    typeof l === 'object' &&
    l !== null &&
    typeof l.line_id === 'string' &&
    typeof l.menu_item_id === 'string' &&
    typeof l.name === 'string' &&
    Number.isInteger(l.unit_price) &&
    Number.isInteger(l.quantity) &&
    (l.quantity as number) > 0 &&
    typeof l.note === 'string' &&
    Array.isArray(l.selected_options) &&
    l.selected_options.every(isSelectedOption)
  );
};

export interface CheckedLine extends CartLine {
  sold_out: boolean;
}

/**
 * Re-checks saved lines against the current menu: names and prices are refreshed,
 * sold-out items are flagged, and lines whose item or options are gone are split out.
 */
export function repriceCart(
  lines: CartLine[],
  items: MenuItemView[],
): { lines: CheckedLine[]; removed: CartLine[] } {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const checked: CheckedLine[] = [];
  const removed: CartLine[] = [];

  for (const line of lines) {
    const item = itemsById.get(line.menu_item_id);
    const itemOptions = item?.option_groups.flatMap((group) => group.options) ?? [];
    const options = line.selected_options.map((chosen) => itemOptions.find((o) => o.id === chosen.option_id));
    if (!item || options.some((option) => option === undefined)) {
      removed.push(line);
      continue;
    }
    const current = options.filter((option) => option !== undefined);
    checked.push({
      ...line,
      name: item.name,
      unit_price: item.price,
      selected_options: current.map((o) => ({ option_id: o.id, name: o.name, price_delta: o.price_delta })),
      sold_out: !item.is_available || current.some((option) => !option.is_available),
    });
  }
  return { lines: checked, removed };
}

/** Reads a saved cart, dropping anything malformed rather than failing. */
export function parseCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isCartLine) : [];
  } catch {
    return [];
  }
}
