/**
 * No-network guard (VOY-N-01, §0.6, §5.12).
 * Forbids `fetch(`, `node:http`, `node:https`, `node:net`, `node:dns`,
 * `XMLHttpRequest`, and `WebSocket` outside:
 * - `packages/enrich/**`
 * - `apps/cli/**`
 * - `apps/mcp/**`
 * - `scripts/data/**`
 * - `*.test.ts` / `*.test.tsx` (tests may use fakes)
 */
import console from 'node:console';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { isMain, walkFiles } from './lib.mjs';

const FORBIDDEN_NET_RX = [
  { rx: /\bfetch\s*\(/, label: 'fetch(' },
  { rx: /['"]node:https?['"]/, label: 'node:http(s)' },
  { rx: /['"]node:net['"]/, label: 'node:net' },
  { rx: /['"]node:dns['"]/, label: 'node:dns' },
  { rx: /\bXMLHttpRequest\b/, label: 'XMLHttpRequest' },
  { rx: /\bWebSocket\b/, label: 'WebSocket' },
];

const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);

function isAllowedNetworkPath(relPath) {
  if (relPath.startsWith('packages/enrich/')) return true;
  if (relPath.startsWith('apps/cli/')) return true;
  if (relPath.startsWith('apps/mcp/')) return true;
  if (relPath.startsWith('scripts/data/')) return true;
  if (relPath.startsWith('scripts/guards/')) return true;
  // The browser proof of VOY-N-01 serves the built site on loopback only, to a
  // headless Chromium on the same machine: it opens a server and never reaches
  // the Internet. It is the single exception, and it is named, not a folder.
  // `scripts/lib/serve-dist.mjs` is that one server, factored out so the demo
  // environment and the proofs share it instead of each opening their own.
  if (relPath === 'scripts/verify-no-request.mjs') return true;
  if (relPath === 'scripts/lib/serve-dist.mjs') return true;
  if (/\.test\.(?:ts|tsx|mjs)$/.test(relPath)) return true;
  return false;
}

function hasSourceExt(relPath) {
  for (const ext of SOURCE_EXTS) {
    if (relPath.endsWith(ext)) return true;
  }
  return false;
}

/** Scan a single file's content for disallowed network primitives. */
export function scanNoNetworkContent(text, relPath) {
  if (isAllowedNetworkPath(relPath) || !hasSourceExt(relPath)) return [];
  const errors = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const item of FORBIDDEN_NET_RX) {
      if (item.rx.test(line)) {
        errors.push(`${relPath}:${i + 1}: disallowed network API ${item.label}`);
      }
    }
  }
  return errors;
}

/** Check `packages/**`, `apps/**`, and `scripts/**` (or an explicit file list). */
export async function checkNoNetwork(root, targetFiles = null) {
  const candidates = targetFiles ?? [
    ...(await walkFiles(root, 'packages')),
    ...(await walkFiles(root, 'apps')),
    ...(await walkFiles(root, 'scripts')),
  ];
  const errors = [];
  let checked = 0;
  for (const rel of candidates) {
    if (isAllowedNetworkPath(rel) || !hasSourceExt(rel)) continue;
    const abs = join(root, rel);
    if (!existsSync(abs)) continue;
    checked += 1;
    const text = await readFile(abs, 'utf8');
    errors.push(...scanNoNetworkContent(text, rel));
  }
  return { checked, errors };
}

async function main() {
  const root = resolve('.');
  const { checked, errors } = await checkNoNetwork(root);
  console.log(`no-network: checked ${checked} file(s)`);
  for (const err of errors) {
    console.error(`no-network: ${err}`);
  }
  process.exit(errors.length === 0 ? 0 : 1);
}

if (isMain(import.meta.url, process.argv[1])) {
  await main();
}
