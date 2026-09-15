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

Until owner onboarding ships in the admin, a restaurant is added through the seed generator:

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
