-- Multi-tenant menu and WhatsApp ordering.
--
-- Every table is scoped to a restaurant and has RLS on. Rules:
--   * Anyone can read a restaurant and its menu once it is published.
--   * Only the restaurant's owner (restaurants.owner_id) can read it unpublished or write any of its rows.
--   * Anyone can log an order for a published restaurant; only the owner can read orders.
-- Prices are integer kobo.

create schema if not exists private;

-- Restaurants -----------------------------------------------------------------

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name text not null check (char_length(name) between 1 and 80),
  -- E.164, e.g. +2347025973433
  whatsapp_number text not null check (whatsapp_number ~ '^\+[1-9][0-9]{6,14}$'),
  address text check (char_length(address) <= 300),
  maps_url text check (char_length(maps_url) <= 500),
  -- { "mon": [["07:30", "23:30"]], ..., "sun": [] } in Lagos wall-clock time; [] means closed that day
  opening_hours jsonb not null default '{}' check (jsonb_typeof(opening_hours) = 'object'),
  delivery_hours jsonb not null default '{}' check (jsonb_typeof(delivery_hours) = 'object'),
  accepts_pickup boolean not null default true,
  accepts_delivery boolean not null default false,
  delivery_fee_tiers_kobo integer[] not null default '{}',
  -- { "small_pack": 10000, "big_pack": 30000, "two_litre_pack": null }
  packaging_kobo jsonb not null default '{}' check (jsonb_typeof(packaging_kobo) = 'object'),
  accent_hex text not null default '#F96406' check (accent_hex ~ '^#[0-9A-Fa-f]{6}$'),
  logo_url text,
  -- Order references read "<prefix>-A7F3K"
  order_prefix text not null default 'OR' check (order_prefix ~ '^[A-Z]{2,4}$'),
  -- Owner's manual Open/Closed switch; null follows opening_hours
  is_open_override boolean,
  is_published boolean not null default false,
  owner_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index restaurants_owner_id_idx on public.restaurants (owner_id);

-- Menu ------------------------------------------------------------------------
-- Child rows reference their parent through (restaurant_id, id), so a row can
-- never point at another restaurant's category, item or option group.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  unique (restaurant_id, slug),
  unique (restaurant_id, id)
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id uuid not null,
  name text not null check (char_length(name) between 1 and 100),
  description text check (char_length(description) <= 500),
  -- Whole naira for now (multiples of 100): the cart and WhatsApp message work in naira integers.
  price_kobo integer not null check (price_kobo >= 0 and price_kobo % 100 = 0),
  photo_url text,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  -- Exact item name in the restaurant's POS; null when a size/portion option carries it
  pos_name text,
  unique (restaurant_id, id),
  foreign key (restaurant_id, category_id) references public.categories (restaurant_id, id)
);

create index items_category_idx on public.items (restaurant_id, category_id);

create table public.option_groups (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  selection_type text not null check (selection_type in ('single', 'multi')),
  is_required boolean not null default false,
  min_select integer not null default 0 check (min_select >= 0),
  -- null means no upper limit
  max_select integer check (max_select is null or max_select >= greatest(min_select, 1)),
  sort_order integer not null default 0,
  unique (restaurant_id, id),
  check (selection_type = 'multi' or max_select = 1)
);

create table public.options (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  option_group_id uuid not null,
  name text not null check (char_length(name) between 1 and 60),
  price_delta_kobo integer not null default 0 check (price_delta_kobo >= 0 and price_delta_kobo % 100 = 0),
  is_available boolean not null default true,
  sort_order integer not null default 0,
  pos_name text,
  foreign key (restaurant_id, option_group_id) references public.option_groups (restaurant_id, id) on delete cascade
);

create index options_group_idx on public.options (restaurant_id, option_group_id);

-- One option group (e.g. "Protein add-ons") can be attached to many items.
create table public.item_option_groups (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  item_id uuid not null,
  option_group_id uuid not null,
  primary key (item_id, option_group_id),
  foreign key (restaurant_id, item_id) references public.items (restaurant_id, id) on delete cascade,
  foreign key (restaurant_id, option_group_id) references public.option_groups (restaurant_id, id) on delete cascade
);

create index item_option_groups_group_idx on public.item_option_groups (restaurant_id, option_group_id);

-- Orders ----------------------------------------------------------------------
-- Logged when the customer taps "Order on WhatsApp", before WhatsApp opens.

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  reference text not null check (reference ~ '^[A-Z]{2,4}-[A-Z2-9]{5}$'),
  created_at timestamptz not null default now(),
  -- Snapshot of the cart lines, with prices in kobo at the time of the order
  items jsonb not null check (
    jsonb_typeof(items) = 'array'
    and jsonb_array_length(items) between 1 and 100
    and pg_column_size(items) <= 65536
  ),
  total_kobo integer not null check (total_kobo >= 0),
  customer_name text not null check (char_length(customer_name) between 1 and 100),
  customer_phone text check (char_length(customer_phone) <= 30),
  order_type text not null check (order_type in ('pickup', 'delivery')),
  address text check (char_length(address) <= 300),
  landmark text check (char_length(landmark) <= 300),
  note text check (char_length(note) <= 500),
  status text not null default 'sent' check (status in ('sent', 'confirmed', 'fulfilled', 'cancelled')),
  unique (restaurant_id, reference)
);

create index orders_restaurant_created_idx on public.orders (restaurant_id, created_at desc);

-- Access helpers --------------------------------------------------------------
-- security definer so policies on child tables don't re-run restaurants' own RLS.
-- The private schema isn't exposed through the API, so these can't be called directly.

create function private.is_published(restaurant uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.restaurants r where r.id = restaurant and r.is_published);
$$;

create function private.is_owner(restaurant uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.restaurants r where r.id = restaurant and r.owner_id = (select auth.uid())
  );
$$;

revoke all on function private.is_published(uuid), private.is_owner(uuid) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.is_published(uuid), private.is_owner(uuid) to anon, authenticated;

-- Table privileges (RLS narrows these to rows) --------------------------------

revoke all on
  public.restaurants, public.categories, public.items, public.option_groups,
  public.options, public.item_option_groups, public.orders
from anon, authenticated;

grant select on
  public.restaurants, public.categories, public.items, public.option_groups,
  public.options, public.item_option_groups
to anon, authenticated;

grant insert, update, delete on
  public.restaurants, public.categories, public.items, public.option_groups,
  public.options, public.item_option_groups
to authenticated;

grant insert on public.orders to anon, authenticated;
grant select, update, delete on public.orders to authenticated;

-- Row level security ----------------------------------------------------------

alter table public.restaurants enable row level security;

create policy "Published restaurants are public" on public.restaurants
  for select to anon, authenticated using (is_published);

create policy "Owners read their restaurants" on public.restaurants
  for select to authenticated using (owner_id = (select auth.uid()));

create policy "Owners create their restaurants" on public.restaurants
  for insert to authenticated with check (owner_id = (select auth.uid()));

create policy "Owners update their restaurants" on public.restaurants
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Owners delete their restaurants" on public.restaurants
  for delete to authenticated using (owner_id = (select auth.uid()));

-- The menu tables all follow the same rules, keyed on restaurant_id.
do $$
declare
  t text;
begin
  foreach t in array array['categories', 'items', 'option_groups', 'options', 'item_option_groups'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "Published menus are public" on public.%I for select to anon, authenticated
         using (private.is_published(restaurant_id) or private.is_owner(restaurant_id))', t);
    execute format(
      'create policy "Owners insert" on public.%I for insert to authenticated
         with check (private.is_owner(restaurant_id))', t);
    execute format(
      'create policy "Owners update" on public.%I for update to authenticated
         using (private.is_owner(restaurant_id)) with check (private.is_owner(restaurant_id))', t);
    execute format(
      'create policy "Owners delete" on public.%I for delete to authenticated
         using (private.is_owner(restaurant_id))', t);
  end loop;
end
$$;

alter table public.orders enable row level security;

create policy "Anyone logs an order for a published restaurant" on public.orders
  for insert to anon, authenticated
  with check (status = 'sent' and private.is_published(restaurant_id));

create policy "Owners read their orders" on public.orders
  for select to authenticated using (private.is_owner(restaurant_id));

create policy "Owners update their orders" on public.orders
  for update to authenticated
  using (private.is_owner(restaurant_id))
  with check (private.is_owner(restaurant_id));

create policy "Owners delete their orders" on public.orders
  for delete to authenticated using (private.is_owner(restaurant_id));
