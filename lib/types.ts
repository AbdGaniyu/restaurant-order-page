/**
 * The menu shapes the UI renders. lib/menu.ts builds them from the Supabase rows
 * (supabase/migrations), and data/menu.json — the seed source — uses them too.
 *
 * All prices here are integers in naira; the database stores kobo.
 */

export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
  /** Exact item name in Yakoyo's POS; null when the item's size/portion options carry it. */
  pos_name: string | null;
}

export type SelectionType = 'single' | 'multi';

export interface OptionGroup {
  id: string;
  name: string;
  selection_type: SelectionType;
  is_required: boolean;
  min_select: number;
  /** Null means no upper limit. */
  max_select: number | null;
  sort_order: number;
}

export interface Option {
  id: string;
  option_group_id: string;
  name: string;
  price_delta: number;
  is_available: boolean;
  sort_order: number;
  /** POS item this option resolves to (e.g. "Fresh Fish 4K"); null for free choices. */
  pos_name: string | null;
}

/** Join table: one option group (e.g. "Protein add-ons") can be attached to many items. */
export interface MenuItemOptionGroup {
  menu_item_id: string;
  option_group_id: string;
}

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** ["07:30", "23:30"] — 24-hour wall-clock times in Lagos. An end at or before the start runs past midnight. */
export type TimeRange = [start: string, end: string];

/** An empty array means closed that day. */
export type WeeklyHours = Record<Weekday, TimeRange[]>;

export interface Packaging {
  small_pack: number | null;
  big_pack: number | null;
  two_litre_pack: number | null;
}

/** One restaurant. */
export interface BusinessSettings {
  id: string;
  /** The restaurant's URL segment: /r/<slug>. */
  slug: string;
  name: string;
  /** International format without "+", as wa.me expects: "2347025973433". */
  whatsapp_number: string;
  address: string | null;
  maps_url: string | null;
  brand_color: string;
  /** Absolute URL or a path under public/; null shows no logo. */
  logo_url: string | null;
  /** Order references read "<prefix>-A7F3K". */
  order_prefix: string;
  opening_hours: WeeklyHours;
  delivery_hours: WeeklyHours;
  accepts_delivery: boolean;
  accepts_pickup: boolean;
  /** Owner's manual Open/Closed switch; null follows opening_hours. */
  is_open_override: boolean | null;
  delivery_fee_tiers: number[];
  packaging: Packaging;
}

export type OrderType = 'pickup' | 'delivery';

export type OrderStatus = 'sent' | 'confirmed' | 'fulfilled' | 'cancelled';

/** Week 2. */
export interface Order {
  id: string;
  reference: string;
  customer_name: string;
  customer_phone: string | null;
  order_type: OrderType;
  address: string | null;
  landmark: string | null;
  /** Snapshot of the cart, including prices at the time of the order. */
  items: CartLine[];
  subtotal: number;
  status: OrderStatus;
  created_at: string;
}

/** Everything the public menu reads. Week 1: data/menu.json. Week 2: Supabase. */
export interface MenuData {
  business_settings: BusinessSettings;
  categories: Category[];
  menu_items: MenuItem[];
  option_groups: OptionGroup[];
  options: Option[];
  menu_item_option_groups: MenuItemOptionGroup[];
}

export interface SelectedOption {
  option_id: string;
  name: string;
  price_delta: number;
}

/** Client-side cart line. Total = (unit_price + sum of price_delta) × quantity. */
export interface CartLine {
  line_id: string;
  menu_item_id: string;
  name: string;
  unit_price: number;
  quantity: number;
  selected_options: SelectedOption[];
  note: string;
}
