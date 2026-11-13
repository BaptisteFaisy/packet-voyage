/**
 * Kiro file-save hook: light-properties (§14.3, VOY-P-05..11).
 * Runs `npx vitest run packages/core/src/envelope packages/core/src/locate`.
 */
import { spawnSync } from 'node:child_process';
import console from 'node:console';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { isMain } from '../guards/lib.mjs';
import { extractHookTargets, readHookPayload } from './hook-lib.mjs';

async function main() {
  const payload = await readHookPayload();
  const { root } = extractHookTargets(payload);
  const targets = ['packages/core/src/envelope', 'packages/core/src/locate']
    .filter((dir) => existsSync(join(root, dir)));
  if (targets.length === 0) {
    console.log('light-properties: skipped (envelope/locate not present yet)');
    process.exit(0);
  }
  const res = spawnSync('npx', ['vitest', 'run', ...targets], {
    cwd: root,
    encoding: 'utf8',
  });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  if (res.status !== 0) {
    console.error('light-properties: vitest failed');
    process.exit(res.status ?? 1);
  }
  process.exit(0);
}

if (isMain(import.meta.url, process.argv[1])) {
  await main();
}
