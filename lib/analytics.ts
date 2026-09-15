import { track } from '@vercel/analytics';
import type { OrderType } from './types';

/**
 * The pilot funnel from spec §5: add_to_cart → checkout_started → order_sent.
 * Page views are recorded on every Vercel plan; custom events like these need Pro.
 */
export const analytics = {
  addToCart: (itemId: string) => track('add_to_cart', { item_id: itemId }),
  checkoutStarted: () => track('checkout_started'),
  orderSent: (order: { order_type: OrderType; item_count: number; subtotal: number }) =>
    track('order_sent', order),
};
