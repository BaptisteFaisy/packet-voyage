#!/usr/bin/env node
/**
 * Build every application that has a build entry point.
 *
 * The monorepo is delivered lot by lot: an application whose entry point is not
 * written yet is skipped with a message instead of failing the whole build. As
 * soon as the entry point exists, it is built and a failure fails CI.
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function pnpmCommand() {
  const probe = spawnSync('pnpm', ['--version'], { encoding: 'utf8' });
  if (probe.status === 0) return ['pnpm'];
  return ['npx', '-y', 'pnpm@9.15.4'];
}

const targets = [
  { name: 'cli', probe: 'apps/cli/build.mjs', filter: 'packet-voyage' },
  { name: 'web', probe: 'apps/web/vite.config.ts', filter: '@packet-voyage/web' },
];

const [cmd, ...prefix] = pnpmCommand();
let built = 0;
for (const target of targets) {
  if (!existsSync(resolve(root, target.probe))) {
    console.log(`build: ${target.name} skipped (no ${target.probe} yet)`);
    continue;
  }
  const res = spawnSync(cmd, [...prefix, '--filter', target.filter, 'build'], {
    cwd: root,
    stdio: 'inherit',
  });
  if (res.status !== 0) {
    console.error(`build: ${target.name} FAILED`);
    process.exit(1);
  }
  built += 1;
}
console.log(`build: ${built} application(s) built`);
