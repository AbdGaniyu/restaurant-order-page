import { describe, expect, it } from 'vitest';
import { buildOrderRow, parseOrderLogRequest, type OrderLogRequest } from './order-log';
import { sampleMenu } from './test-fixtures';
import type { CartLine } from './types';

// The browser's prices are deliberately wrong: the row must use the menu's.
const water: CartLine = {
  line_id: 'l1',
  menu_item_id: 'item-water',
  name: 'Water',
  unit_price: 1,
  quantity: 2,
  selected_options: [],
  note: '',
};
const amala: CartLine = {
  line_id: 'l2',
  menu_item_id: 'item-amala',
  name: 'Amala',
  unit_price: 500,
  quantity: 1,
  selected_options: [
    { option_id: 'opt-soup-abula', name: 'Abula', price_delta: 0 },
    { option_id: 'opt-addon-goat', name: 'Goat meat', price_delta: 1 },
  ],
  note: 'extra pepper',
};
const customer = { name: ' Tunde ', orderType: 'delivery', address: '12  Adeola St', landmark: 'First Bank', phone: '' };
const body = { slug: 'sample', reference: 'YK-A7F3K', lines: [water, amala], customer };

const parse = (input: unknown) => parseOrderLogRequest(input) as OrderLogRequest;

describe('parseOrderLogRequest', () => {
  it('accepts a well-formed order', () => {
    expect(parseOrderLogRequest(body)).toEqual(body);
  });

  it('treats missing optional fields as blank', () => {
    const { name, orderType } = customer;
    expect(parse({ ...body, customer: { name, orderType } }).customer).toEqual({
      name,
      orderType,
      address: '',
      landmark: '',
      phone: '',
    });
  });

  it.each([
    ['no body', null],
    ['no slug', { ...body, slug: undefined }],
    ['no reference', { ...body, reference: 42 }],
    ['no lines', { ...body, lines: [] }],
    ['only malformed lines', { ...body, lines: [{ name: 'Amala' }] }],
    ['too many lines', { ...body, lines: Array(101).fill(water) }],
    ['a blank name', { ...body, customer: { ...customer, name: '  ' } }],
    ['an unknown order type', { ...body, customer: { ...customer, orderType: 'drone' } }],
    ['an oversized address', { ...body, customer: { ...customer, address: 'x'.repeat(301) } }],
  ])('rejects %s', (_, input) => {
    expect(parseOrderLogRequest(input)).toBeNull();
  });
});

describe('buildOrderRow', () => {
  const row = buildOrderRow(sampleMenu, parse(body));

  it('re-prices every line from the menu, in kobo', () => {
    expect(row.items).toEqual([
      expect.objectContaining({ menu_item_id: 'item-water', quantity: 2, unit_price_kobo: 30000, line_total_kobo: 60000 }),
      expect.objectContaining({
        menu_item_id: 'item-amala',
        unit_price_kobo: 50000,
        options: [
          expect.objectContaining({ option_id: 'opt-soup-abula', price_delta_kobo: 0 }),
          expect.objectContaining({ option_id: 'opt-addon-goat', price_delta_kobo: 150000 }),
        ],
        note: 'extra pepper',
        line_total_kobo: 200000,
      }),
    ]);
    expect(row.total_kobo).toBe(260000);
  });

  it('files the order under the restaurant and reference', () => {
    expect(row).toMatchObject({ restaurant_id: sampleMenu.business_settings.id, reference: 'YK-A7F3K' });
  });

  it('tidies the customer details and keeps the address for delivery', () => {
    expect(row).toMatchObject({
      customer_name: 'Tunde',
      customer_phone: null,
      order_type: 'delivery',
      address: '12 Adeola St',
      landmark: 'First Bank',
    });
  });

  it('drops the address for pickup', () => {
    const pickup = buildOrderRow(sampleMenu, parse({ ...body, customer: { ...customer, orderType: 'pickup' } }));
    expect(pickup).toMatchObject({ order_type: 'pickup', address: null, landmark: null });
  });

  it('flags sold-out lines and keeps lines the menu no longer has, as sent', () => {
    const soldOut: CartLine = { ...water, line_id: 'l3', menu_item_id: 'item-beef-shawarma', name: 'Beef shawarma' };
    const gone: CartLine = { ...water, line_id: 'l4', menu_item_id: 'item-gone', name: 'Old special', unit_price: 900 };
    const { items } = buildOrderRow(sampleMenu, parse({ ...body, lines: [soldOut, gone] }));
    expect(items).toEqual([
      expect.objectContaining({ menu_item_id: 'item-beef-shawarma', sold_out: true }),
      expect.objectContaining({ menu_item_id: 'item-gone', unit_price_kobo: 90000, not_on_menu: true }),
    ]);
  });
});
