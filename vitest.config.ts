import { defineConfig } from 'vitest/config';

/**
 * One runner for the whole workspace (CI budget: a single `vitest run`).
 * DOM tests declare their own environment with a `@vitest-environment` header.
 */
export default defineConfig({
  test: {
    include: [
      'packages/*/src/**/*.test.ts',
      'apps/*/src/**/*.test.{ts,tsx}',
      'fixtures/*/**/*.test.ts',
      'scripts/**/__tests__/*.test.mjs',
    ],
    environment: 'node',
    // Bound the fork pool: this machine is shared with other builds, and a
    // pool sized to the CPU count starves them (and tinypool rejects
    // `maxWorkers` below the inherited minimum unless `minForks` is set).
    poolOptions: { forks: { minForks: 1, maxForks: 4 } },
    reporters: ['default'],
    testTimeout: 20_000,
  },
});
