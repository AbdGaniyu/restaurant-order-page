import { describe, expect, it } from 'vitest';
import { checkoutErrors, prepareOrder, type CheckoutForm } from './checkout';
import { generateOrderReference, isOrderReference } from './order-reference';
import { pilotMenu } from './test-fixtures';
import { formatWhatsAppNumber, whatsappUrl } from './whatsapp';

const { business_settings: settings } = pilotMenu;
const open = { deliveryAvailable: true, pickupAvailable: true };
const filled: CheckoutForm = {
  name: 'Tunde',
  orderType: 'delivery',
  address: '12 Adeola St, Yaba',
  landmark: 'opposite First Bank',
  phone: '',
};

describe('checkoutErrors', () => {
  it('accepts a complete delivery order with no phone', () => {
    expect(checkoutErrors(filled, open)).toEqual({});
  });

  it('needs a name, and an address and landmark for delivery', () => {
    expect(checkoutErrors({ ...filled, name: ' ', address: '', landmark: '' }, open)).toEqual({
      name: 'Enter your name',
      address: 'Enter the delivery address',
      landmark: 'Add a landmark so the rider can find you',
    });
  });

  it('does not ask pickup customers for an address', () => {
    expect(checkoutErrors({ ...filled, orderType: 'pickup', address: '', landmark: '' }, open)).toEqual({});
  });

  it('rejects delivery outside delivery hours', () => {
    expect(checkoutErrors(filled, { ...open, deliveryAvailable: false }).orderType).toBe(
      'Delivery isn’t available right now',
    );
  });

  it('checks a phone number only when one is given', () => {
    expect(checkoutErrors({ ...filled, phone: '0803 123 4567' }, open)).toEqual({});
    expect(checkoutErrors({ ...filled, phone: '12' }, open).phone).toBe('Check the number, or leave it blank');
  });
});

describe('prepareOrder', () => {
  const order = prepareOrder({
    settings,
    lines: [
      {
        line_id: 'l1',
        menu_item_id: 'item-water',
        name: 'Bottled water',
        unit_price: 300,
        quantity: 1,
        selected_options: [],
        note: '',
      },
    ],
    customer: { ...filled, orderType: 'delivery' },
    host: 'yakoyo.vercel.app',
    now: new Date('2026-09-11T14:14:00+01:00'),
    reference: 'YK-A7F3K',
  });

  it('opens a chat with Yakoyo carrying the message, encoded exactly once', () => {
    expect(order.url.startsWith('https://wa.me/2347025973433?text=')).toBe(true);
    const text = order.url.split('?text=')[1];
    expect(decodeURIComponent(text)).toBe(order.message);
    expect(text).not.toContain('%25'); // a double-encoded "%"
    expect(text).toContain('%E2%82%A6'); // ₦
    expect(text).toContain('%0A'); // newline
  });

  it('puts the reference in the message', () => {
    expect(order.message).toContain('Ref: YK-A7F3K');
  });
});

describe('generateOrderReference', () => {
  it("is the restaurant's prefix plus 5 characters without 0, O, 1 or I", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateOrderReference('YK')).toMatch(/^YK-[A-HJ-NP-Z2-9]{5}$/);
    }
  });

  it('round-trips through isOrderReference', () => {
    expect(isOrderReference(generateOrderReference('SK'), 'SK')).toBe(true);
    expect(isOrderReference('YK-A7F3K', 'SK')).toBe(false);
    expect(isOrderReference('YK-A7F3O', 'YK')).toBe(false);
    expect(isOrderReference('YK-A7F3KX', 'YK')).toBe(false);
  });
});

describe('WhatsApp helpers', () => {
  it('strips non-digits from the number', () => {
    expect(whatsappUrl('+234 702 597 3433', 'hi')).toBe('https://wa.me/2347025973433?text=hi');
  });

  it('formats a Nigerian number for display', () => {
    expect(formatWhatsAppNumber('2347025973433')).toBe('+234 702 597 3433');
  });
});
