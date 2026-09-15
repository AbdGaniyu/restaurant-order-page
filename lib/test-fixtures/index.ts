import pilotMenuJson from '@/data/menu.json';
import type { MenuData } from '../types';
import sampleMenuJson from './sample-menu.json';

const withRestaurant = (menu: MenuData, fields: Pick<MenuData['business_settings'], 'slug' | 'logo_url' | 'order_prefix'>): MenuData => ({
  ...menu,
  business_settings: { ...menu.business_settings, ...fields },
});

/**
 * A small, stable menu for logic tests (selection, cart, pricing), so they don't break
 * when Yakoyo's real menu changes. The real data/menu.json is checked by menu.test.ts.
 */
export const sampleMenu = withRestaurant(sampleMenuJson as MenuData, {
  slug: 'sample',
  logo_url: null,
  order_prefix: 'YK',
});

/** Yakoyo's real menu as the database seed carries it (data/menu.json plus the restaurant's own fields). */
export const pilotMenu = withRestaurant(pilotMenuJson as MenuData, {
  slug: 'yakoyo',
  logo_url: '/brand/logo.png',
  order_prefix: 'YK',
});
