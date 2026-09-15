import { describe, expect, it } from 'vitest';
import {
  addLine,
  buildCartLine,
  cartItemCount,
  cartSubtotal,
  lineTotal,
  MAX_QUANTITY,
  parseCart,
  repriceCart,
  setLineQuantity,
} from './cart';
import { buildMenuView } from './menu';
import { sampleMenu } from './test-fixtures';
import type { CartLine } from './types';

// The example order from spec §3.
const amala: CartLine = {
  line_id: 'line-1',
  menu_item_id: 'item-amala',
  name: 'Amala',
  unit_price: 500,
  quantity: 2,
  selected_options: [
    { option_id: 'opt-soup-abula', name: 'Ewedu & Gbegiri (Abula)', price_delta: 0 },
    { option_id: 'opt-addon-goat', name: 'Goat meat', price_delta: 1500 },
    { option_id: 'opt-addon-ponmo', name: 'Ponmo', price_delta: 500 },
  ],
  note: 'extra pepper',
};

const water: CartLine = {
  line_id: 'line-2',
  menu_item_id: 'item-water',
  name: 'Bottled water',
  unit_price: 300,
  quantity: 1,
  selected_options: [],
  note: '',
};

describe('cart totals', () => {
  it('multiplies unit price plus options by quantity', () => {
    expect(lineTotal(amala)).toBe(5000);
    expect(lineTotal(water)).toBe(300);
  });

  it('prices a sized item from its size option', () => {
    const fish: CartLine = {
      ...water,
      menu_item_id: 'item-fresh-fish',
      name: 'Fresh Fish',
      unit_price: 3000,
      selected_options: [{ option_id: 'opt-fish-4k', name: '4K', price_delta: 1000 }],
    };
    expect(lineTotal(fish)).toBe(4000);
  });

  it('sums lines into the subtotal', () => {
    expect(cartSubtotal([amala, water])).toBe(5300);
    expect(cartSubtotal([])).toBe(0);
  });

  it('counts items by quantity', () => {
    expect(cartItemCount([amala, water])).toBe(3);
  });
});

describe('buildCartLine', async () => {
  const items = buildMenuView(sampleMenu).flatMap((category) => category.items);
  const amalaItem = items.find((item) => item.id === 'item-amala')!;

  it('snapshots the item, chosen options and a trimmed note', () => {
    const line = buildCartLine(amalaItem, { 'grp-soup': ['opt-soup-abula'] }, 2, '  extra pepper  ');
    expect(line).toMatchObject({
      menu_item_id: 'item-amala',
      name: 'Amala',
      unit_price: 500,
      quantity: 2,
      selected_options: [{ option_id: 'opt-soup-abula', name: 'Ewedu & Gbegiri (Abula)', price_delta: 0 }],
      note: 'extra pepper',
    });
    expect(line.line_id).toMatch(/^[0-9a-f]{16}$/);
  });

  it('cuts notes to 80 characters', () => {
    expect(buildCartLine(amalaItem, {}, 1, 'x'.repeat(200)).note).toHaveLength(80);
  });
});

describe('addLine', () => {
  it('merges an identical line into the existing one', () => {
    const reordered = { ...amala, line_id: 'line-3', quantity: 1, selected_options: [...amala.selected_options].reverse() };
    const lines = addLine([amala, water], reordered);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ line_id: 'line-1', quantity: 3 });
  });

  it('keeps lines with a different note or options separate', () => {
    expect(addLine([amala], { ...amala, line_id: 'line-3', note: 'no pepper' })).toHaveLength(2);
    expect(addLine([amala], { ...amala, line_id: 'line-3', selected_options: [] })).toHaveLength(2);
  });

  it('caps the merged quantity', () => {
    expect(addLine([{ ...water, quantity: 98 }], { ...water, line_id: 'x', quantity: 5 })[0].quantity).toBe(MAX_QUANTITY);
  });
});

describe('setLineQuantity', () => {
  it('changes the quantity of one line', () => {
    expect(setLineQuantity([amala, water], 'line-2', 4)[1].quantity).toBe(4);
  });

  it('removes the line at zero', () => {
    expect(setLineQuantity([amala, water], 'line-2', 0)).toEqual([amala]);
  });
});

describe('repriceCart', async () => {
  const items = buildMenuView(sampleMenu).flatMap((category) => category.items);

  it('refreshes names and prices from the current menu', () => {
    const stale = { ...amala, name: 'Old name', unit_price: 1, selected_options: [{ ...amala.selected_options[1], price_delta: 1 }] };
    const { lines, removed } = repriceCart([stale], items);
    expect(removed).toEqual([]);
    expect(lines[0]).toMatchObject({ name: 'Amala', unit_price: 500, sold_out: false });
    expect(lines[0].selected_options).toEqual([{ option_id: 'opt-addon-goat', name: 'Goat meat', price_delta: 1500 }]);
  });

  it('flags sold-out items and sold-out options', () => {
    const beefShawarma = { ...water, menu_item_id: 'item-beef-shawarma', selected_options: [] };
    const fish7k = { ...water, menu_item_id: 'item-fresh-fish', selected_options: [{ option_id: 'opt-fish-7k', name: '7K', price_delta: 4000 }] };
    expect(repriceCart([beefShawarma, fish7k], items).lines.map((l) => l.sold_out)).toEqual([true, true]);
  });

  it('splits out lines whose item or option no longer exists', () => {
    const gone = { ...water, menu_item_id: 'item-gone' };
    const oldOption = { ...amala, selected_options: [{ option_id: 'opt-gone', name: 'Gone', price_delta: 0 }] };
    const { lines, removed } = repriceCart([water, gone, oldOption], items);
    expect(lines.map((l) => l.line_id)).toEqual(['line-2']);
    expect(removed).toEqual([gone, oldOption]);
  });
});

describe('parseCart', () => {
  it('round-trips a saved cart', () => {
    expect(parseCart(JSON.stringify([amala, water]))).toEqual([amala, water]);
  });

  it('returns an empty cart for missing or corrupt data', () => {
    expect(parseCart(null)).toEqual([]);
    expect(parseCart('{not json')).toEqual([]);
    expect(parseCart('{"line_id":"x"}')).toEqual([]);
  });

  it('drops malformed lines and keeps the rest', () => {
    const saved = JSON.stringify([amala, { ...water, quantity: 0 }, { ...water, unit_price: '300' }, 'junk']);
    expect(parseCart(saved)).toEqual([amala]);
  });
});
