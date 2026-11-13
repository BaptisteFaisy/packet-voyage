/**
 * VOY-N-07: application code under 350 kB compressed, data under 1.5 MB
 * compressed. Measured on the real build output (`npx vite build`); skipped
 * with a clear message while `apps/web/dist` does not exist.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const CODE_BUDGET = 350 * 1024;
const DATA_BUDGET = Math.round(1.5 * 1024 * 1024);

function* walk(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

describe('bundle budget (VOY-N-07)', () => {
  it('VOY-N-07 built assets stay under the compressed budgets', (ctx) => {
    if (!existsSync(DIST)) {
            console.info('SKIPPED: apps/web/dist not built yet — run `npx vite build` first.');
      ctx.skip();
      return;
    }
    let code = 0;
    let data = 0;
    const perAsset: string[] = [];
    for (const file of walk(DIST)) {
      if (file.endsWith('.map') || file.endsWith('.gz') || file.endsWith('.br')) continue;
      const gz = gzipSync(readFileSync(file), { level: 9 }).length;
      const rel = file.slice(DIST.length + 1);
      perAsset.push(`${rel}: ${(gz / 1024).toFixed(1)} kB gzip`);
      if (/\.(?:js|mjs|css)$/.test(file)) code += gz;
      else if (/\.(?:json|geojson)$/.test(file)) data += gz;
    }
        console.info(`bundle assets:\n${perAsset.join('\n')}\ncode=${code} B, data=${data} B`);
    expect(code, 'JS+CSS gzipped').toBeLessThan(CODE_BUDGET);
    expect(data, 'JSON/data gzipped').toBeLessThan(DATA_BUDGET);
  });
});
