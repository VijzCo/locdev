import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Separate config for the security rules suite.
 *
 * The default config excludes this file so `npm test` stays fast and needs
 * no emulator. That exclude applies even when the file is named explicitly
 * on the command line, so the rules run needs its own config rather than a
 * filter argument.
 */
export default defineConfig({
  resolve: { alias: { '@': path.resolve(here, './src') } },
  test: {
    environment: 'node',
    include: ['src/rules.test.ts'],
    // The emulator adds latency to every assertion, and there are 31.
    testTimeout: 30000,
    hookTimeout: 30000,
    // Rules tests share one emulator instance, so they cannot run in
    // parallel without clobbering each other's seed data.
    fileParallelism: false,
  },
});
