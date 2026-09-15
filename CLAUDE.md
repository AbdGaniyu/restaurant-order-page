@AGENTS.md

# CLAUDE.md — Menu & WhatsApp Ordering

## What this is
A public menu page for a restaurant with a cart and an "Order on WhatsApp"
button that opens a pre-filled message to the business. Plus a private admin
panel where the owner edits items, prices, categories, and marks things sold
out — from a phone. Multi-tenant from day one (one deployment, many
restaurants at /r/<slug>), piloted with one real restaurant: Yàkoyó Abula Joint
(slug `yakoyo`). Mobile-first: customers order from phones; owners manage from phones.

## Stack
- Next.js 16 (App Router), TypeScript, Tailwind 4. Read `node_modules/next/dist/docs/`
  before using a Next API — it differs from older versions (e.g. middleware is `proxy.ts`).
- Supabase: Postgres, Auth (email magic link for owners), Storage (item photos)
- Deployment: Vercel. Single app, no separate API.
- Each restaurant can override accent colour and logo only.

## Data model (Supabase, Row Level Security ON for every table)
Source of truth: `supabase/migrations/`. Summary:
```
restaurants         id, slug, name, whatsapp_number (E.164), address, maps_url,
                    opening_hours (jsonb), delivery_hours (jsonb), accepts_pickup,
                    accepts_delivery, delivery_fee_tiers_kobo (int[]), packaging_kobo (jsonb),
                    accent_hex, logo_url, order_prefix, is_open_override (bool|null),
                    is_published, owner_id -> auth.users
categories          id, restaurant_id, name, slug, sort_order, is_active
items               id, restaurant_id, category_id, name, description, price_kobo (int),
                    photo_url, is_available, sort_order, pos_name
option_groups       id, restaurant_id, name, selection_type (single|multi), is_required,
                    min_select, max_select, sort_order
options             id, restaurant_id, option_group_id, name, price_delta_kobo (int),
                    is_available, sort_order, pos_name
item_option_groups  restaurant_id, item_id, option_group_id
orders              id, restaurant_id, reference, created_at, items (jsonb snapshot),
                    total_kobo, customer_name, customer_phone, order_type, address,
                    landmark, note, status
```
- Prices are stored in kobo as integers; never floats. The app works in whole naira:
  `lib/menu.ts` converts at the boundary. Format as ₦ with separators.
- Child rows reference parents through (restaurant_id, id) so they can't cross tenants.
- RLS: public can SELECT a restaurant and its menu rows once `is_published`; only
  owner_id can INSERT/UPDATE/DELETE their own rows; orders INSERT is public (anon,
  published restaurants, status 'sent') but SELECT is owner-only.
- Never change the schema from the dashboard without writing the migration.
- `supabase/seed.sql` is generated from `data/menu.json` by `npm run seed:build` —
  never edit it by hand. It seeds Yàkoyó as the pilot restaurant.

## Routes
```
app/r/[slug]/page.tsx          public menu (server component, ISR 60s)
app/r/[slug]/cart/page.tsx     cart and checkout
app/r/[slug]/opengraph-image   OG image with restaurant name and logo
app/admin/page.tsx             owner dashboard: items, categories, orders, settings
app/admin/login/page.tsx       magic-link login
app/api/orders/route.ts        POST logs an order snapshot (re-priced from the database)
```

## Ordering flow
- The cart is client state (`lib/cart-store.ts`, useSyncExternalStore) persisted to
  localStorage per restaurant slug.
- "Order on WhatsApp" builds the message and reference on the device, sends
  POST /api/orders (keepalive, fire-and-forget) and opens
  `https://wa.me/<number>?text=<encoded message>` in the same tap. WhatsApp must open
  synchronously: a window opened after awaiting a response is popup-blocked. The route
  re-prices from the database and logs the snapshot under the same reference.
- Message format is built by `lib/order-message.ts` (tested in `order-message.test.ts`):
  bold header with Ref and Type, items with line totals and options, subtotal,
  delivery/packs notes, customer block, footer.
- Show opening hours. When closed (by hours or is_open_override) the menu stays
  browsable and orders go through as pre-orders marked "(sent outside opening hours)".

## Admin rules
- Every admin action works on a 375px screen with a thumb: toggle
  availability, edit price inline, reorder by drag, upload photo from camera.
- Photo uploads: client-side resize to max 1200px and compress before upload;
  store in Supabase Storage bucket `item-photos/<restaurant_id>/`.
- Owner onboarding: after first login, a 3-step form creates the restaurant
  (name, WhatsApp number, first three items).

## Working rules
- One task at a time from my list. Finish, `npm run build`, tests, commit.
- Commit messages: imperative, under 60 chars.
- Never install a package without saying why.
- Never commit Supabase keys. `.env.example` lists NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (server only).
- Write RLS policies as part of the same task as the table; prove them in
  `supabase/tests/rls.test.ts` (`npm run test:rls`, needs `npx supabase start`).
- Keep README current: setup, running migrations, creating a restaurant.

## Definition of done (v1)
- Public menu at /r/<slug> with categories, photos, cart, WhatsApp ordering
- Admin: login, manage items/categories/availability/photos, view orders,
  edit settings including hours and WhatsApp number
- RLS proven by test; seed and migrations reproducible from scratch
- Lighthouse mobile perf and a11y >= 90 on the public menu
- Deployed; README done; one real restaurant onboarded
