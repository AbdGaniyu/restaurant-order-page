import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

/**
 * Client for the signed-in owner in server components, server actions and route handlers.
 * The session lives in cookies; RLS sees the owner's user id and limits them to their restaurant.
 * Reading cookies makes whatever calls this dynamic, so the public menu never uses it.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server components can't set cookies; proxy.ts refreshes the session before they render.
          }
        },
      },
    },
  );
}
