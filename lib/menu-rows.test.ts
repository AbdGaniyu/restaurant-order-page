import { describe, expect, it } from 'vitest';
import { menuFromRows, type MenuRows } from './menu';

const restaurant_id = 'r1';

const rows: MenuRows = {
  restaurant: {
    id: restaurant_id,
    slug: 'yakoyo',
    name: 'Yàkoyó Abula Joint',
    whatsapp_number: '+2347025973433',
    address: 'Sangotedo, Lagos',
    maps_url: null,
    opening_hours: { mon: [['07:30', '23:30']] },
    delivery_hours: { mon: [] },
    accepts_pickup: true,
    accepts_delivery: false,
    delivery_fee_tiers_kobo: [20000, 250000],
    packaging_kobo: { small_pack: 10000, big_pack: null },
    accent_hex: '#F96406',
    logo_url: '/brand/logo.png',
    order_prefix: 'YK',
    is_open_override: false,
    is_published: true,
    owner_id: null,
    created_at: '2026-09-15T00:00:00Z',
  },
  categories: [{ id: 'c1', restaurant_id, name: 'Swallow', slug: 'swallow', sort_order: 1, is_active: true }],
  items: [
    {
      id: 'i1',
      restaurant_id,
      category_id: 'c1',
      name: 'Amala',
      description: 'Soft yam flour',
      price_kobo: 50000,
      photo_url: 'https://example.test/amala.jpg',
      is_available: true,
      sort_order: 1,
      pos_name: 'Amala',
    },
  ],
  option_groups: [
    {
      id: 'g1',
      restaurant_id,
      name: 'Choose soup',
      selection_type: 'single',
      is_required: true,
      min_select: 1,
      max_select: 1,
      sort_order: 1,
    },
  ],
  options: [
    {
      id: 'o1',
      restaurant_id,
      option_group_id: 'g1',
      name: 'Abula',
      price_delta_kobo: 30000,
      is_available: false,
      sort_order: 1,
      pos_name: null,
    },
  ],
  item_option_groups: [{ restaurant_id, item_id: 'i1', option_group_id: 'g1' }],
};

describe('menuFromRows', () => {
  it('maps database rows onto the menu shapes, converting kobo to naira', () => {
    expect(menuFromRows(rows)).toEqual({
      business_settings: {
        id: restaurant_id,
        slug: 'yakoyo',
        name: 'Yàkoyó Abula Joint',
        whatsapp_number: '2347025973433',
        address: 'Sangotedo, Lagos',
        maps_url: null,
        brand_color: '#F96406',
        logo_url: '/brand/logo.png',
        order_prefix: 'YK',
        opening_hours: { mon: [['07:30', '23:30']] },
        delivery_hours: { mon: [] },
        accepts_delivery: false,
        accepts_pickup: true,
        is_open_override: false,
        delivery_fee_tiers: [200, 2500],
        packaging: { small_pack: 100, big_pack: null, two_litre_pack: null },
      },
      categories: [{ id: 'c1', name: 'Swallow', slug: 'swallow', sort_order: 1, is_active: true }],
      menu_items: [
        {
          id: 'i1',
          category_id: 'c1',
          name: 'Amala',
          description: 'Soft yam flour',
          price: 500,
          image_url: 'https://example.test/amala.jpg',
          is_available: true,
          sort_order: 1,
          pos_name: 'Amala',
        },
      ],
      option_groups: [
        {
          id: 'g1',
          name: 'Choose soup',
          selection_type: 'single',
          is_required: true,
          min_select: 1,
          max_select: 1,
          sort_order: 1,
        },
      ],
      options: [
        {
          id: 'o1',
          option_group_id: 'g1',
          name: 'Abula',
          price_delta: 300,
          is_available: false,
          sort_order: 1,
          pos_name: null,
        },
      ],
      menu_item_option_groups: [{ menu_item_id: 'i1', option_group_id: 'g1' }],
    });
  });
});
