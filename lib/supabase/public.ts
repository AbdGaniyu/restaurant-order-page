import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

/**
 * Anonymous, cookie-less client for public reads and order logging. It never reads the request,
 * so the menu pages that use it stay statically rendered and ISR-cached. RLS decides what it sees:
 * published restaurants and their menus, and inserting orders.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example)');
  }
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
