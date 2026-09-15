import { execFileSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Proves the RLS rules in supabase/migrations against the local stack (`npx supabase start`).
 * Two owners each get a restaurant. Owner B must not be able to read A's unpublished menu or
 * any of A's orders, or change any of A's rows; the public can only read published menus and
 * log orders. Run with `npm run test:rls`.
 */

interface LocalKeys {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

function localKeys(): LocalKeys {
  const status = JSON.parse(execFileSync('npx', ['supabase', 'status', '-o', 'json'], { encoding: 'utf8' }));
  return { url: status.API_URL, anonKey: status.ANON_KEY, serviceRoleKey: status.SERVICE_ROLE_KEY };
}

const keys = localKeys();
const client = (key: string) =>
  createClient(keys.url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const run = Date.now().toString(36);
const admin = client(keys.serviceRoleKey);
const anon = client(keys.anonKey);

interface Owner {
  id: string;
  db: SupabaseClient;
}

async function createOwner(label: string): Promise<Owner> {
  const email = `rls-${label}-${run}@example.test`;
  const password = `rls-${run}-password`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const db = client(keys.anonKey);
  const signIn = await db.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  await waitForSession(db);
  return { id: data.user.id, db };
}

/**
 * The local API sometimes rejects a brand-new session token as "JWT issued at future" (its clock
 * briefly lags the auth server's, typically on the first request after the stack sits idle).
 * Retry a cheap read until the token is accepted, so the RLS assertions never see that error.
 */
async function waitForSession(db: SupabaseClient) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const { error } = await db.from('restaurants').select('id').limit(1);
    if (!error?.message.includes('issued at future')) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('The API never accepted the session token');
}

/** Creates a restaurant with one category and one item, as its owner. */
async function createRestaurant(owner: Owner, label: string) {
  const restaurant = await owner.db
    .from('restaurants')
    .insert({ slug: `rls-${label}-${run}`, name: `Kitchen ${label}`, whatsapp_number: '+2348000000000', owner_id: owner.id })
    .select()
    .single();
  if (restaurant.error) throw restaurant.error;
  const category = await owner.db
    .from('categories')
    .insert({ restaurant_id: restaurant.data.id, name: 'Mains', slug: 'mains' })
    .select()
    .single();
  if (category.error) throw category.error;
  const item = await owner.db
    .from('items')
    .insert({ restaurant_id: restaurant.data.id, category_id: category.data.id, name: 'Amala', price_kobo: 50000 })
    .select()
    .single();
  if (item.error) throw item.error;
  return { id: restaurant.data.id as string, categoryId: category.data.id as string, itemId: item.data.id as string };
}

const order = (restaurantId: string, overrides: Record<string, unknown> = {}) => ({
  restaurant_id: restaurantId,
  reference: 'OR-ABCDE',
  items: [{ name: 'Amala', quantity: 1, unit_price_kobo: 50000 }],
  total_kobo: 50000,
  customer_name: 'Test customer',
  order_type: 'pickup',
  ...overrides,
});

let ownerA: Owner;
let ownerB: Owner;
let a: Awaited<ReturnType<typeof createRestaurant>>;
let b: Awaited<ReturnType<typeof createRestaurant>>;

beforeAll(async () => {
  [ownerA, ownerB] = await Promise.all([createOwner('a'), createOwner('b')]);
  [a, b] = await Promise.all([createRestaurant(ownerA, 'a'), createRestaurant(ownerB, 'b')]);
});

// By this run's slugs and emails, so a setup that failed halfway still cleans up.
afterAll(async () => {
  for (const restaurant of [a, b].filter(Boolean)) {
    const { data: files } = await admin.storage.from('item-photos').list(restaurant.id);
    if (files?.length) {
      await admin.storage.from('item-photos').remove(files.map((file) => `${restaurant.id}/${file.name}`));
    }
  }
  await admin.from('restaurants').delete().like('slug', `rls-%-${run}`);
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const users = data.users.filter((user) => user.email?.endsWith(`-${run}@example.test`));
  await Promise.all(users.map((user) => admin.auth.admin.deleteUser(user.id)));
});

/** A's item as the owner sees it: the ground truth for "did B's write land?". */
async function itemAsOwnerA() {
  const { data, error } = await ownerA.db.from('items').select('name, price_kobo').eq('id', a.itemId).single();
  if (error) throw error;
  return data;
}

describe('an unpublished restaurant', () => {
  it('is hidden from the public', async () => {
    expect((await anon.from('restaurants').select('id').eq('id', a.id)).data).toEqual([]);
    expect((await anon.from('categories').select('id').eq('restaurant_id', a.id)).data).toEqual([]);
    expect((await anon.from('items').select('id').eq('restaurant_id', a.id)).data).toEqual([]);
  });

  it("is hidden from another owner: B can't read A's items", async () => {
    expect((await ownerB.db.from('restaurants').select('id').eq('id', a.id)).data).toEqual([]);
    expect((await ownerB.db.from('items').select('id').eq('restaurant_id', a.id)).data).toEqual([]);
  });

  it('is visible to its owner', async () => {
    expect((await ownerA.db.from('items').select('id').eq('restaurant_id', a.id)).data).toHaveLength(1);
  });

  it('takes no orders', async () => {
    expect((await anon.from('orders').insert(order(a.id))).error).not.toBeNull();
  });
});

describe('a published restaurant', () => {
  beforeAll(async () => {
    const { error } = await ownerA.db.from('restaurants').update({ is_published: true }).eq('id', a.id);
    if (error) throw error;
  });

  it('shows its menu to the public and to other owners', async () => {
    expect((await anon.from('items').select('id').eq('restaurant_id', a.id)).data).toHaveLength(1);
    expect((await ownerB.db.from('items').select('id').eq('restaurant_id', a.id)).data).toHaveLength(1);
  });

  it("doesn't let another owner change A's items", async () => {
    const updated = await ownerB.db.from('items').update({ price_kobo: 100 }).eq('id', a.itemId).select();
    expect(updated.data).toEqual([]);
    await ownerB.db.from('items').delete().eq('id', a.itemId);
    expect(await itemAsOwnerA()).toEqual({ name: 'Amala', price_kobo: 50000 });
  });

  it("doesn't let another owner add rows to A's restaurant", async () => {
    const item = await ownerB.db
      .from('items')
      .insert({ restaurant_id: a.id, category_id: a.categoryId, name: 'Intruder', price_kobo: 1 });
    expect(item.error).not.toBeNull();
    const category = await ownerB.db.from('categories').insert({ restaurant_id: a.id, name: 'Intruder', slug: 'x' });
    expect(category.error).not.toBeNull();
  });

  it("doesn't let another owner file an item under A's category", async () => {
    const { error } = await ownerB.db
      .from('items')
      .insert({ restaurant_id: b.id, category_id: a.categoryId, name: 'Crossed', price_kobo: 1 });
    expect(error).not.toBeNull();
  });

  it("doesn't let another owner change or take over A's restaurant", async () => {
    await ownerB.db.from('restaurants').update({ name: 'Hijacked', owner_id: ownerB.id }).eq('id', a.id);
    const { data } = await ownerA.db.from('restaurants').select('name, owner_id').eq('id', a.id).single();
    expect(data).toEqual({ name: 'Kitchen a', owner_id: ownerA.id });
  });

  it("doesn't let an owner create a restaurant in someone else's name", async () => {
    const { error } = await ownerB.db
      .from('restaurants')
      .insert({ slug: `rls-c-${run}`, name: 'Kitchen c', whatsapp_number: '+2348000000000', owner_id: ownerA.id });
    expect(error).not.toBeNull();
  });

  it('is read-only to the public', async () => {
    await anon.from('items').update({ price_kobo: 1 }).eq('id', a.itemId);
    await anon.from('items').delete().eq('id', a.itemId);
    expect(await itemAsOwnerA()).toEqual({ name: 'Amala', price_kobo: 50000 });
  });
});

describe('item photos', () => {
  const photo = () => new Blob(['not really a jpeg'], { type: 'image/jpeg' });
  const upload = (db: SupabaseClient, path: string, upsert = false) =>
    db.storage.from('item-photos').upload(path, photo(), { contentType: 'image/jpeg', upsert });
  const ownPhoto = () => `${a.id}/rls-${run}.jpg`;

  it("go into the owner's own restaurant folder", async () => {
    expect((await upload(ownerA.db, ownPhoto())).error).toBeNull();
  });

  it('are served publicly', async () => {
    const { publicUrl } = anon.storage.from('item-photos').getPublicUrl(ownPhoto()).data;
    expect((await fetch(publicUrl)).status).toBe(200);
  });

  it("can't be added to, replaced in or deleted from another owner's folder", async () => {
    expect((await upload(ownerB.db, `${a.id}/intruder-${run}.jpg`)).error).not.toBeNull();
    expect((await upload(ownerB.db, ownPhoto(), true)).error).not.toBeNull();
    await ownerB.db.storage.from('item-photos').remove([ownPhoto()]);
    const { data } = await ownerA.db.storage.from('item-photos').list(a.id);
    expect(data?.map((file) => file.name)).toEqual([`rls-${run}.jpg`]);
  });

  it("can't be uploaded by the public or outside a restaurant folder", async () => {
    expect((await upload(anon, `${a.id}/anon-${run}.jpg`)).error).not.toBeNull();
    expect((await upload(ownerA.db, `loose-${run}.jpg`)).error).not.toBeNull();
  });
});

describe('orders', () => {
  it('can be logged by anyone', async () => {
    expect((await anon.from('orders').insert(order(a.id))).error).toBeNull();
  });

  it("can't be logged with a status other than sent", async () => {
    const { error } = await anon.from('orders').insert(order(a.id, { reference: 'OR-FGHJK', status: 'confirmed' }));
    expect(error).not.toBeNull();
  });

  it('are hidden from the public and from other owners', async () => {
    // The public can't read the orders table at all, not just no rows of it.
    const publicRead = await anon.from('orders').select('id').eq('restaurant_id', a.id);
    expect(publicRead.error?.code).toBe('42501');
    expect((await ownerB.db.from('orders').select('id').eq('restaurant_id', a.id)).data).toEqual([]);
  });

  it("can't be changed by another owner", async () => {
    await ownerB.db.from('orders').update({ status: 'cancelled' }).eq('restaurant_id', a.id);
    const { data } = await ownerA.db.from('orders').select('status').eq('restaurant_id', a.id);
    expect(data).toEqual([{ status: 'sent' }]);
  });

  it('are visible to the owner', async () => {
    expect((await ownerA.db.from('orders').select('reference').eq('restaurant_id', a.id)).data).toEqual([
      { reference: 'OR-ABCDE' },
    ]);
  });
});
