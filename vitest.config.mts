import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: fileURLToPath(new URL('./', import.meta.url)) }],
  },
  test: {
    // The RLS tests need the local Supabase stack; they run with `npm run test:rls`.
    exclude: [...configDefaults.exclude, 'supabase/**'],
  },
});
