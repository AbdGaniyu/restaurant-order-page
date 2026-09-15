import { defineConfig } from 'vitest/config';

/** RLS tests against the local Supabase stack (`npx supabase start`). */
export default defineConfig({
  test: {
    include: ['supabase/tests/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
