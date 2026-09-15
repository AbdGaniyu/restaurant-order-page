# Menu & WhatsApp Ordering

A mobile-first restaurant menu with a cart that sends the order to the restaurant on WhatsApp,
plus an owner admin. Multi-tenant: every restaurant lives at `/r/<slug>`. Piloted with
Yàkoyó Abula Joint at `/r/yakoyo`.

Next.js 16 · Supabase (Postgres, Auth, Storage) · Tailwind 4 · Vercel.

## Setup

Needs Node 24 and Docker (for the local Supabase stack).

```bash
npm install
npx supabase start          # local Postgres, Auth, Storage and Studio; prints the keys
cp .env.example .env.local  # fill in from `npx supabase status`
npm run dev
```

`.env.local` values:

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `API_URL` from `npx supabase status` (hosted: Project Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `ANON_KEY` from the same place |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY`. Server only; never commit it or expose it to the browser |
| `DEFAULT_RESTAURANT_SLUG` | Optional. Where `/` and `/cart` redirect; defaults to `yakoyo` |

On Vercel, set the same variables with the hosted project's values. The build reads the menu
from Supabase, so it fails without them.

## Routes

| Route | What it is |
|---|---|
| `/r/<slug>` | Public menu. Static, regenerated at most every 60 s (ISR) |
| `/r/<slug>/cart` | Cart and checkout |
| `/r/<slug>/opengraph-image`, `icon`, `apple-icon` | Share preview and icons from the restaurant's name, accent colour and logo |
| `POST /api/orders` | Logs an order when "Order on WhatsApp" is tapped, re-priced from the database |
| `/`, `/cart` | Redirect to the pilot restaurant (links shared before `/r/<slug>` keep working) |

## Admin

`/admin` is the owner's panel, built for a phone first (bottom tabs) with a desktop layout
(left rail) from 1024px, following the "Admin Screens" design:

- **Dashboard:** today's orders and takings, the open/closed switch, quick actions
  (add item, availability, copy link, QR code).
- **Items:** grouped by category, sold-out switch on each row, drag to reorder; tap a row to
  edit in a bottom sheet (phone) or side panel (desktop), with photos from the camera or
  gallery. Options and add-ons (sizes, extras) keep their own prices and switches below.
- **Categories** ("Menu" tab on the phone): add, rename, reorder, hide, delete.
- **Orders:** today / this week, tap to expand, mark status, open the customer's WhatsApp.
- **Settings:** opening and delivery hours, WhatsApp number, address, accent colour, logo,
  public link with QR code (PNG/SVG), pickup/delivery and visibility.

Saving refreshes the public menu straight away.

- **Login:** the owner enters their email and gets a sign-in link (`/auth/confirm`). The same
  email carries a 6-digit code, accepted on the "Check your email" screen for when the mail
  app opens links in its own browser.
- **First login:** a new owner goes through three steps (name, WhatsApp number, first items)
  and their menu goes live at `/r/<slug>`.
- **Existing restaurants** (e.g. the seeded pilot) are linked to their owner with the SQL under
  [Creating a restaurant](#creating-a-restaurant), after the owner has logged in once.
- **Photos** are resized to 1200px on the phone and stored in the public `item-photos` bucket
  under `<restaurant_id>/`; Storage policies only let an owner write to their own folder.

Locally, login emails land in Mailpit at http://127.0.0.1:54324, using the templates below
(`supabase/templates/`, wired up in `supabase/config.toml`).

For the hosted project, in the Supabase dashboard:
1. **Authentication → URL Configuration:** set the Site URL to the production domain
   (e.g. `https://menu.example.com`). The templates build their links from it.
2. **Authentication → Email Templates:** paste the two templates below.
3. **Authentication → SMTP:** set up a real email sender; the built-in one is rate-limited to a
   few emails an hour.

### Login email templates

Both emails carry the 6-digit code (`{{ .Token }}`) and a link to
`/auth/confirm?token_hash=…&type=email&next=/admin`. The link verifies the token and redirects
to `/admin`; `next` is only honoured for `/admin` paths. Returning owners get **Magic Link**;
a brand-new email gets **Confirm signup** when email confirmations are on (the hosted default).
Keep these in sync with the files in `supabase/templates/`.

**Magic Link** (`supabase/templates/magic_link.html`). Subject: `Your login code`

```html
<h2>Log in to your menu admin</h2>
<p>Enter this code on the login page:</p>
<p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 16px 0">{{ .Token }}</p>
<p>
  Or <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/admin">tap here to log in</a>.
  It opens your admin at {{ .SiteURL }}/admin.
</p>
<p>
  The code and link work once and expire in an hour. If you didn't ask to log in, ignore this email;
  nobody can get in without it.
</p>
```

**Confirm signup** (`supabase/templates/confirmation.html`). Subject: `Confirm your email to set up your menu`

```html
<h2>Welcome! Let's set up your menu</h2>
<p>Enter this code on the login page to confirm your email:</p>
<p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 16px 0">{{ .Token }}</p>
<p>
  Or <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/admin">tap here to confirm and continue</a>.
  You'll set up your restaurant in three short steps.
</p>
<p>The code and link work once and expire in an hour. If you didn't sign up, ignore this email.</p>
```

"Order on WhatsApp" opens WhatsApp in the same tap (a window opened after waiting for a server
response gets popup-blocked) and logs the order in the background under the same reference.

Local Studio runs at http://127.0.0.1:54323 and captured magic-link emails at http://127.0.0.1:54324.

## Database

`supabase/migrations/` is the source of truth. Never change the schema from the dashboard
without writing a migration.

```bash
npx supabase migration new <name>   # create a migration file, then write the SQL
npm run db:reset                    # rebuild the local database: all migrations, then seed.sql
npm run db:types                    # regenerate lib/database.types.ts after a schema change
npm run test:rls                    # prove the row-level security rules against the local stack
```

Prices are stored as integer kobo (`price_kobo`, `price_delta_kobo`, `total_kobo`).

### Seed

`supabase/seed.sql` is generated. Don't edit it by hand:

```bash
npm run seed:build    # data/menu.json → supabase/seed.sql (Yàkoyó, slug "yakoyo", refs "YK-…")
```

To change the pilot menu before it's managed in the admin, edit `data/menu.json` (whole naira;
`npm test` checks every price against the POS export in `data/pos-prices.json`), then
`npm run seed:build && npm run db:reset`.

### Hosted project

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push --include-seed   # applies new migrations, then the seed
```

The seed uses `on conflict do nothing`, so pushing it again never overwrites an owner's edits.

## Creating a restaurant

A new owner creates their own: log in at `/admin` with a new email and follow the three steps.

To load a full menu from a file instead (as for the pilot), use the seed generator:

1. Put its menu in a JSON file shaped like `data/menu.json`.
2. `node scripts/build-seed.mts <file> <slug> <order prefix> [logo url]`, e.g.
   `node scripts/build-seed.mts data/menu.json yakoyo YK /brand/logo.png`.
3. Apply it (`npm run db:reset` locally, `npx supabase db push --include-seed` hosted).
   Its menu is live at `/r/<slug>` on the first visit; there's no need to redeploy.

Seeded restaurants have no owner. After the owner signs in once, assign it in the SQL editor:

```sql
update public.restaurants
set owner_id = (select id from auth.users where email = 'owner@example.com')
where slug = 'yakoyo';
```

## Checks

```bash
npm test            # unit tests (menu data, pricing, cart, message, hours)
npm run test:rls    # RLS tests (needs `npx supabase start`)
npm run typecheck
npm run lint
npm run build
```
