#!/usr/bin/env node
/**
 * Run every project guard and fail on the first non-zero exit.
 *
 * A guard is a `scripts/guards/*.guard.mjs` file: it reads the repository from
 * the root, prints what it checked, and exits non-zero with a message on
 * stderr when the rule is broken. Each guard is also a Kiro hook (see
 * `.kiro/hooks/`), so the same rule protects the agent while it writes and the
 * pull request while it merges.
 */
import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');

const files = (await readdir(here))
  .filter((f) => f.endsWith('.guard.mjs'))
  .sort();

if (files.length === 0) {
  console.log('guards: none installed yet');
}

let failed = 0;
for (const file of files) {
  const label = file.replace(/\.guard\.mjs$/, '');
  const res = spawnSync(process.execPath, [join(here, file)], {
    cwd: root,
    stdio: 'inherit',
  });
  if (res.status !== 0) {
    console.error(`guard ${label}: FAILED (exit ${res.status})`);
    failed += 1;
  } else {
    console.log(`guard ${label}: ok`);
  }
}

process.exit(failed === 0 ? 0 : 1);
