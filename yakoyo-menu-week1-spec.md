# Yakoyo Menu & WhatsApp Ordering — Week 1 Build Spec

**Goal:** A mobile-first public menu where a customer builds a cart and sends a pre-filled WhatsApp order to Yakoyo. No auth and no database this week. The menu lives in a JSON file shaped exactly like the week-2 Supabase schema, so the swap later is a data-layer change only.

**Stack:** Next.js (App Router, TypeScript) · Tailwind · Vercel. Week 2 adds Supabase (auth + Postgres) and the `/admin` panel.

**Out of scope for week 1:** payments, auth, order history, delivery-fee calculation, notifications.

---

## 0. Inputs

Already in hand (11 Sep 2026): WhatsApp number `2347025973433`; full menu from the POS export, transformed into `data/menu.json`; walk-in hours 7:30–23:30 daily; delivery hours 8:30–20:00 daily; delivery fee tiers ₦200–₦2,500; takeaway pack prices ₦100 / ₦300.

Still to collect from Yakoyo:
- Street address and a Google Maps link
- Which areas map to which delivery fee tier (needed for the week-2 zone picker, not week 1)
- Logo and a handful of phone photos of the food (address, Maps link and brand colour `#F96406` are now in `menu.json`)

---

## 1. Pages

### `/` — Menu
- Header: logo, business name, Open/Closed pill (computed from `opening_hours`), short address with a "Directions" link to `maps_url`.
- Sticky horizontal category nav; tapping a category scrolls to its section.
- Item card: optional photo, name, short description, price, **Add** button.
  - `is_available = false` → greyed card with a "Sold out" badge. Never hide sold-out items; customers should see the full menu.
- **Add** on an item with option groups opens a bottom sheet: each option group rendered as radio (single) or checkbox (multi) with `price_delta` shown, a quantity stepper, and an optional note field. Items with no option groups add straight to the cart.
- Items whose required single-select group has non-zero deltas (sized fish, half/full portions, shawarma sizes) show **from ₦3,000** on the card; the sheet shows the resolved price.
- Sticky bottom cart bar: `2 items · ₦6,800 · View cart`. Hidden when the cart is empty.
- Closed state: a banner ("We're closed right now — opens 8:00 AM"). Ordering stays enabled; the WhatsApp message gets a "(sent outside opening hours)" line so the business can treat it as a pre-order.

### `/cart` — Review & order
- Line items: name, chosen options, per-item note, quantity stepper, remove.
- Customer form:
  - Name (required)
  - Order type toggle: Pickup / Delivery (only show the types Yakoyo accepts). Delivery is disabled outside `delivery_hours` with the note "Delivery runs 8:30 AM – 8:00 PM"; Pickup follows `opening_hours`.
  - Delivery address + landmark (required when Delivery)
  - Phone (optional — WhatsApp already carries it)
- Summary: subtotal; delivery line reads "Confirmed on WhatsApp" when Delivery; total = subtotal.
- Primary button **Order on WhatsApp**:
  1. Generate an order reference (see §4)
  2. Build the message (§3), `encodeURIComponent` it, open `https://wa.me/<number>?text=<encoded>`
  3. Fire the `order_sent` analytics event (§5)
  4. Switch the page to a confirmation state: "Tap **Send** in WhatsApp to complete your order. Your reference is **YK-A7F3K**." with a "Start a new order" button.
- Fallback: if the page is still focused ~2s after the click (WhatsApp didn't open — common on desktop), show the message text with a **Copy order** button and the phone number.
- Empty-cart state links back to the menu.

### `/admin` — week 2 (not built this week)

---

## 2. Data model

Define these tables now; week 1 stores the same shapes in `data/menu.json`. Keep JSON keys **snake_case, identical to the column names**, so week 2 is "replace the JSON import with a Supabase query".

```
categories
  id, name, slug, sort_order, is_active

menu_items
  id, category_id, name, description, price (integer, NGN), image_url, is_available, sort_order,
  pos_name (exact item name in Yakoyo's POS, null for items whose options carry the pos_name)

option_groups
  id, name, selection_type ('single' | 'multi'), is_required, min_select, max_select, sort_order

options
  id, option_group_id, name, price_delta (integer, NGN), is_available, sort_order,
  pos_name (POS item this option resolves to, e.g. "Fresh Fish 4K"; null for free choices like Plantain/Moi-Moi)

menu_item_option_groups        -- join table
  menu_item_id, option_group_id
  -- "Protein add-ons" is defined once and attached to every swallow item

business_settings              -- single row
  id, name, whatsapp_number, address, maps_url, brand_color, opening_hours (jsonb), delivery_hours (jsonb),
  accepts_delivery, accepts_pickup, is_open_override (null | true | false),
  delivery_fee_tiers (integer[]), packaging (jsonb: small_pack, big_pack, two_litre_pack)

orders                         -- week 2
  id, reference, customer_name, customer_phone, order_type, address, landmark,
  items (jsonb snapshot of the cart incl. prices at time of order),
  subtotal, status ('sent' | 'confirmed' | 'fulfilled' | 'cancelled'), created_at
```

Prices are integers in naira. Format for display with `Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 })` → `₦3,000`.

`opening_hours` shape: `{ "mon": [["08:00","20:00"]], "tue": [...], ..., "sun": [] }` — an empty array means closed that day. `is_open_override` lets the owner force Open/Closed from the admin panel in week 2 regardless of the schedule.

### `data/menu.json`

Generated from Yakoyo's POS export (252 SKUs → 17 categories, 204 items, 23 option groups, 61 options). Every price comes from the export and every option resolves to an exact POS SKU via `pos_name`, so staff can key WhatsApp orders into the POS line-for-line. How the POS list was mapped:

- **Sized SKUs collapsed into one item + size group.** "Fresh Fish 3K … 7K" is one item, base ₦3,000, with a required "Choose size" group whose deltas add up to the exact SKU price. Same for Chicken/Turkey, Panla/Titus, Eja Kika, Ponmo Ijebu, Chicken Wings, Plantain, and all shawarma variants.
- **Half/full portions** became a "Choose portion" group (base = half).
- **Combos with a choice** ("Plantain/Moi-Moi", "Eba/Semo", "Beef/Ponmo") got a free single-select group.
- **Per-scoop rice** (Jollof, White, Fried at ₦500) and **per-piece proteins** (Beef, Ponmo, Assorted at ₦500) are plain items — the quantity stepper is the number of scoops/pieces.
- **Not on the customer menu:** VIP charge, Delivery 1–7 (moved into `delivery_fee_tiers`), takeaway packs (moved into `packaging`), "Extreme sausage" (₦0), and duplicate rows (Agidi, Macaroni).
- Names tidied for display only (e.g. "Ewa Igoyin" → Ewa Agoyin, "Coke Pet" → Coke (PET)); `pos_name` keeps the original.

Cart line item (client-side type): `{ line_id, menu_item_id, name, unit_price, quantity, selected_options: [{ option_id, name, price_delta }], note }`. Line total = `(unit_price + sum(price_delta)) × quantity`.

---

## 3. WhatsApp message format

WhatsApp renders `*bold*` and `_italic_`. Keep the whole message under ~1,500 characters (truncate per-item notes at 80 chars). Blank lines separate sections.

```
*New order — Yakoyo Abula Joint*
Ref: YK-A7F3K
Type: Delivery

*Items*
2× Amala — ₦5,000
   Ewedu & Gbegiri (Abula), Goat meat, Ponmo
   Note: extra pepper
1× Bottled water — ₦300

Subtotal: ₦5,300
Delivery fee: confirmed on WhatsApp (₦200–₦2,500 by area)
Takeaway packs: ₦100–₦300 each, added by Yakoyo

*Customer*
Name: Tunde
Deliver to: 12 Adeola St, Yaba
Landmark: opposite First Bank
Phone: 0803 XXX XXXX

Sent from yakoyo.vercel.app · 11 Sep, 2:14 PM
```

Rules:
- Item line shows the **line total** (unit price + options, × quantity), options on the next indented line, note on the line after if present.
- Pickup orders replace the delivery block with `Type: Pickup` and omit address/landmark/fee lines; the packs line stays.
- For sized/portioned items the option name is what staff need to find the SKU, so always include it: `1× Fresh Fish — ₦4,000` + indented `4K`.
- Add `(sent outside opening hours)` after the Type line when the business is closed.
- Phone line only if provided.
- Build the plain string first, then `encodeURIComponent` once. Do not pre-encode `₦` or newlines.

---

## 4. Order reference

`YK-` + 5 characters from `crypto.getRandomValues`, alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I). Generated client-side in week 1; generated on insert in week 2 so the reference in WhatsApp matches the database row.

---

## 5. State, persistence, analytics

- Cart in a React context, persisted to `localStorage` under `yakoyo_cart_v1`. Do **not** clear on "Order on WhatsApp" — clear only on "Start a new order", so a failed WhatsApp launch doesn't lose the cart.
- Analytics (this is what turns the pilot into a case study): Vercel Web Analytics with custom events —
  `add_to_cart { item_id }`, `checkout_started`, `order_sent { order_type, item_count, subtotal }`.
- SEO/sharing: `metadata` with title, description, and an OG image so the link previews properly when shared on WhatsApp/Instagram.

---

## 6. Day-by-day

| Day | Build | Done when |
|---|---|---|
| 1 | Scaffold Next.js + Tailwind. TS types for §2. Drop in the generated `data/menu.json`. Price formatter. Open/closed helpers from `opening_hours` and `delivery_hours`. | Types compile; a test renders every item with correct prices and every option resolves to a `pos_name` price. |
| 2 | Menu page: header, sticky category nav, item cards, sold-out state. | Full menu browsable on a phone. |
| 3 | Option bottom sheet (single/multi validation), cart context + localStorage, sticky cart bar. | Can build a multi-item cart with options and refresh without losing it. |
| 4 | Cart page: line items, customer form, validation, message builder, `wa.me` launch, confirmation state, desktop fallback. | A real order lands in a test WhatsApp number formatted as §3. |
| 5 | Polish: closed banner, empty states, loading, OG metadata, analytics events, Lighthouse pass. Deploy to Vercel, point at Yakoyo's number, end-to-end test from a phone. | Live URL shared with Yakoyo. |

---

## 7. Week-2 preview (so week-1 choices don't box you in)

- Supabase: create the tables in §2; seed from `menu.json`.
- RLS: anonymous `select` on `categories`, `menu_items`, `option_groups`, `options`, `menu_item_option_groups`, `business_settings` (rows where `is_active`/`is_available`); anonymous `insert` on `orders` only; all `update`/`delete` restricted to the authenticated owner.
- Insert the order row **before** opening WhatsApp so every attempted order is recorded even if the customer never taps Send.
- `/admin` (Supabase Auth, single owner account): edit items and prices, toggle `is_available`, reorder, toggle `is_open_override`, view orders list with status.
