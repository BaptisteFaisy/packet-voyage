import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const webRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(webRoot, '../..');

/**
 * Is the `@packet-voyage/core` barrel complete? While parallel lots are
 * still writing locate/segments/cables/metrics/story/redact/share, the
 * barrel cannot be bundled; the site then runs on its fixture and local
 * computation through the guarded adapter (`src/lib/journey-source.ts`).
 */
function coreBarrelIsComplete(): boolean {
  const indexPath = join(repoRoot, 'packages/core/src/index.ts');
  if (!existsSync(indexPath)) return false;
  const text = readFileSync(indexPath, 'utf8');
  const specs = [...text.matchAll(/from '\.\/([^']+)'/g)].map((match) => match[1]);
  if (specs.length === 0) return false;
  return specs.every((spec) => spec !== undefined && existsSync(join(repoRoot, 'packages/core/src', spec)));
}

export default defineConfig({
  root: webRoot,
  // Relative base so the build works on GitHub Pages under a sub-path.
  base: './',
  plugins: [react()],
  resolve: {
    alias: coreBarrelIsComplete()
      ? {}
      : { '@packet-voyage/core': join(webRoot, 'src/lib/core-stub.ts') },
  },
  // GeoJSON as static assets. NOTE: '**/*.json' must NOT be listed here —
  // assetsInclude would race the vite:json plugin and break small JSON files;
  // datasets are code-split through `import.meta.glob` instead (VOY-N-07).
  assetsInclude: ['**/*.geojson'],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
  },
});
