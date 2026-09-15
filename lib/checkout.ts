import { buildOrderMessage, type CustomerDetails } from './order-message';
import { generateOrderReference } from './order-reference';
import type { BusinessSettings, CartLine, OrderType } from './types';
import { whatsappUrl } from './whatsapp';

export interface CheckoutForm {
  name: string;
  orderType: OrderType | null;
  address: string;
  landmark: string;
  phone: string;
}

export type CheckoutField = keyof CheckoutForm;

/** Form order, so the first error found is the first one on screen. */
export const CHECKOUT_FIELDS: CheckoutField[] = ['name', 'orderType', 'address', 'landmark', 'phone'];

export interface Availability {
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
}

export function checkoutErrors(
  form: CheckoutForm,
  { deliveryAvailable, pickupAvailable }: Availability,
): Partial<Record<CheckoutField, string>> {
  const errors: Partial<Record<CheckoutField, string>> = {};
  if (!form.name.trim()) errors.name = 'Enter your name';

  if (form.orderType === null) errors.orderType = 'Choose pickup or delivery';
  else if (form.orderType === 'delivery' && !deliveryAvailable) errors.orderType = 'Delivery isn’t available right now';
  else if (form.orderType === 'pickup' && !pickupAvailable) errors.orderType = 'Pickup isn’t available';

  if (form.orderType === 'delivery') {
    if (!form.address.trim()) errors.address = 'Enter the delivery address';
    if (!form.landmark.trim()) errors.landmark = 'Add a landmark so the rider can find you';
  }

  const phoneDigits = form.phone.replace(/\D/g, '').length;
  if (form.phone.trim() && (phoneDigits < 7 || phoneDigits > 15)) {
    errors.phone = 'Check the number, or leave it blank';
  }
  return errors;
}

export interface PreparedOrder {
  reference: string;
  message: string;
  url: string;
}

export function prepareOrder({
  settings,
  lines,
  customer,
  host,
  now = new Date(),
  reference = generateOrderReference(),
}: {
  settings: BusinessSettings;
  lines: CartLine[];
  customer: CustomerDetails;
  host: string;
  now?: Date;
  reference?: string;
}): PreparedOrder {
  const message = buildOrderMessage({ settings, lines, customer, reference, sentAt: now, host });
  return { reference, message, url: whatsappUrl(settings.whatsapp_number, message) };
}
