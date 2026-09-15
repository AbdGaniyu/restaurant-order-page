import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { Tables } from '@/lib/database.types';
import { createServerSupabase } from '@/lib/supabase/server';

export type Restaurant = Tables<'restaurants'>;

/**
 * The signed-in owner and their restaurant (null before onboarding), or a redirect to login.
 * getClaims verifies the session token's signature, so this is a real check, not just a cookie read.
 * Every admin page and server action goes through here.
 */
export const getOwner = cache(async () => {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect('/admin/login');

  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return { supabase, userId, email: (data.claims.email as string | undefined) ?? null, restaurant };
});

/** For actions that change a restaurant's rows: the owner's restaurant, or back to /admin (onboarding). */
export async function requireRestaurant() {
  const owner = await getOwner();
  if (!owner.restaurant) redirect('/admin');
  return { ...owner, restaurant: owner.restaurant };
}
