/**
 * Vitest wrapper running the guard self-test suite.
 * Note: `vitest.config.ts` only includes `packages/* /src/** /*.test.ts` and
 * `apps/* /src/** /*.test.{ts,tsx}`, so `npx vitest run scripts/guards` needs
 * `--dir scripts/guards` or can be run via `node scripts/guards/selftest.mjs`.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const selftest = join(root, 'scripts/guards/selftest.mjs');

describe('project guards self-test', () => {
  it('all guards and hooks pass self-test', () => {
    const res = spawnSync(process.execPath, [selftest], { cwd: root, encoding: 'utf8' });
    expect(res.status, `${res.stdout}\n${res.stderr}`).toBe(0);
  });
});
