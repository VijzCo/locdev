import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: { alias: { '@': path.resolve(here, './src') } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Rules tests need the Firestore emulator, so they run separately via
    // `npm run test:rules` rather than in the default unit-test pass.
    // Only the Firestore rules suite is excluded here; it needs the
    // emulator and runs via `npm run test:rules`. The path is exact on
    // purpose — a `**/rules.test.ts` glob would also swallow the alert
    // rules tests, which is a silent way to lose coverage.
    exclude: ['**/node_modules/**', 'src/rules.test.ts'],
    testTimeout: 15000,
  },
});
