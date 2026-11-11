/**
 * Bundle size guard (VOY-N-07, §5.12).
 * - If `apps/web/dist` is absent, exits 0 with "skipped (no build)".
 * - Otherwise gzips every asset under `apps/web/dist` using `node:zlib` and checks:
 *   - JS + CSS compressed total < 350 kB (350 * 1024 bytes)
 *   - JSON/data assets compressed total < 1.5 MB (1.5 * 1024 * 1024 bytes)
 */
import console from 'node:console';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { gzipSync } from 'node:zlib';
import { isMain } from './lib.mjs';

export const CODE_BUDGET_BYTES = 350 * 1024;
export const DATA_BUDGET_BYTES = Math.round(1.5 * 1024 * 1024);

async function listDistFiles(dir, prefix = '') {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listDistFiles(abs, rel)));
    } else if (entry.isFile()) {
      out.push({ rel, abs });
    }
  }
  return out;
}

/** Measure gzipped JS+CSS and JSON/data totals under `apps/web/dist`. */
export async function checkBundleSize(root) {
  const distDir = join(root, 'apps/web/dist');
  if (!existsSync(distDir)) {
    return { skipped: true, codeBytes: 0, dataBytes: 0, errors: [] };
  }

  const files = await listDistFiles(distDir);
  let codeBytes = 0;
  let dataBytes = 0;
  for (const file of files) {
    const lower = file.rel.toLowerCase();
    if (lower.endsWith('.map') || lower.endsWith('.gz') || lower.endsWith('.br')) continue;
    const raw = await readFile(file.abs);
    const gzLen = gzipSync(raw, { level: 9 }).length;
    if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.css')) {
      codeBytes += gzLen;
    } else if (lower.endsWith('.json') || lower.endsWith('.geojson')) {
      dataBytes += gzLen;
    }
  }

  const errors = [];
  if (codeBytes >= CODE_BUDGET_BYTES) {
    errors.push(`JS+CSS gzipped ${codeBytes} B exceeds budget ${CODE_BUDGET_BYTES} B (350 kB)`);
  }
  if (dataBytes >= DATA_BUDGET_BYTES) {
    errors.push(`JSON/data gzipped ${dataBytes} B exceeds budget ${DATA_BUDGET_BYTES} B (1.5 MB)`);
  }

  return { skipped: false, codeBytes, dataBytes, errors };
}

async function main() {
  const root = resolve('.');
  const res = await checkBundleSize(root);
  if (res.skipped) {
    console.log('bundle-size: skipped (no build)');
    process.exit(0);
  }
  console.log(
    `bundle-size: JS+CSS=${(res.codeBytes / 1024).toFixed(1)} kB gzip, data=${(res.dataBytes / 1024).toFixed(1)} kB gzip`,
  );
  for (const err of res.errors) {
    console.error(`bundle-size: ${err}`);
  }
  process.exit(res.errors.length === 0 ? 0 : 1);
}

if (isMain(import.meta.url, process.argv[1])) {
  await main();
}
