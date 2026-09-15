import { describe, expect, it } from 'vitest';
import { getMenu } from './menu';
import { buildOrderMessage, type CustomerDetails, type OrderDraft } from './order-message';
import type { CartLine } from './types';

const { business_settings: settings } = await getMenu();

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

const tunde: CustomerDetails = {
  name: 'Tunde',
  orderType: 'delivery',
  address: '12 Adeola St, Yaba',
  landmark: 'opposite First Bank',
  phone: '0803 XXX XXXX',
};

const draft: OrderDraft = {
  settings,
  lines: [amala, water],
  customer: tunde,
  reference: 'YK-A7F3K',
  sentAt: new Date('2026-09-11T14:14:00+01:00'),
  host: 'yakoyo.vercel.app',
};

describe('buildOrderMessage', () => {
  it('matches the example in spec §3', () => {
    expect(buildOrderMessage(draft)).toBe(
      [
        '*New order — Yàkoyó Abula Joint*',
        'Ref: YK-A7F3K',
        'Type: Delivery',
        '',
        '*Items*',
        '2× Amala — ₦5,000',
        '   Ewedu & Gbegiri (Abula), Goat meat, Ponmo',
        '   Note: extra pepper',
        '1× Bottled water — ₦300',
        '',
        'Subtotal: ₦5,300',
        'Delivery fee: confirmed on WhatsApp (₦200–₦2,500 by area)',
        'Takeaway packs: ₦100–₦300 each, added by Yàkoyó',
        '',
        '*Customer*',
        'Name: Tunde',
        'Deliver to: 12 Adeola St, Yaba',
        'Landmark: opposite First Bank',
        'Phone: 0803 XXX XXXX',
        '',
        'Sent from yakoyo.vercel.app · 11 Sep, 2:14 PM',
      ].join('\n'),
    );
  });

  it('drops address, landmark and delivery fee for pickup but keeps the packs line', () => {
    const message = buildOrderMessage({ ...draft, customer: { ...tunde, orderType: 'pickup' } });
    expect(message).toContain('Type: Pickup');
    expect(message).toContain('Takeaway packs: ₦100–₦300 each, added by Yàkoyó');
    expect(message).not.toMatch(/Deliver to|Landmark|Delivery fee/);
  });

  it('includes the size option staff need to find the SKU', () => {
    const fish: CartLine = {
      ...water,
      menu_item_id: 'item-fresh-fish',
      name: 'Fresh Fish',
      unit_price: 3000,
      selected_options: [{ option_id: 'opt-fish-4k', name: '4K', price_delta: 1000 }],
    };
    expect(buildOrderMessage({ ...draft, lines: [fish] })).toContain('1× Fresh Fish — ₦4,000\n   4K\n');
  });

  it('flags orders sent outside opening hours right after the Type line', () => {
    const message = buildOrderMessage({ ...draft, sentAt: new Date('2026-09-12T06:00:00+01:00') });
    expect(message).toContain('Type: Delivery\n(sent outside opening hours)\n\n*Items*');
    expect(message).toContain('Sent from yakoyo.vercel.app · 12 Sep, 6:00 AM');
  });

  it('flags orders when the owner has forced the shop closed', () => {
    const closed = { ...settings, is_open_override: false };
    expect(buildOrderMessage({ ...draft, settings: closed })).toContain('(sent outside opening hours)');
  });

  it('leaves out the phone line when none was given', () => {
    expect(buildOrderMessage({ ...draft, customer: { ...tunde, phone: '  ' } })).not.toContain('Phone:');
  });

  it('keeps customer text on one line and notes to 80 characters', () => {
    const message = buildOrderMessage({
      ...draft,
      lines: [{ ...amala, note: `line one\nline two ${'x'.repeat(100)}` }],
      customer: { ...tunde, name: '  Tunde\nAdeyemi ', address: '12 Adeola St,\nYaba' },
    });
    expect(message).toContain('Name: Tunde Adeyemi\n');
    expect(message).toContain('Deliver to: 12 Adeola St, Yaba\n');
    const note = message.split('\n').find((line) => line.startsWith('   Note:'))!;
    expect(note.replace('   Note: ', '')).toHaveLength(80);
  });

  it('stays well under 1,500 characters for a typical order', () => {
    expect(buildOrderMessage(draft).length).toBeLessThan(1500);
  });
});
