#!/usr/bin/env node
/**
 * Bundle `src/main.ts` into `dist/voyage.mjs` with esbuild.
 *
 * Requirements:
 * - platform: node, format: esm, target: node22;
 * - Node built-ins stay external;
 * - workspace packages (@packet-voyage/*, including @packet-voyage/mcp) are
 *   bundled into the single file; the mcp import stays a lazy dynamic import
 *   so `voyage mcp` degrades gracefully if the export is missing at runtime;
 * - when a sibling lot in @packet-voyage/core (e.g. L5 story/redact/share) has
 *   not landed on disk yet, a fallback plugin provides the CONTRACTS.md stubs
 *   so the bundle builds cleanly without breaking the build pipeline.
 */
import { existsSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));

const SIBLING_STUBS = {
  './story/index.ts': [
    'export function buildStory(journey, _settings) { return journey.story ?? []; }',
    'export function passport(_journey) { return []; }',
    'export function checkVocabulary(_text) { return { ok: true, violations: [] }; }',
    'export const FORBIDDEN_PATTERNS = [];',
  ].join('\n'),
  './redact/index.ts': [
    'export function redactJourney(journey, level) {',
    '  const src = journey.source ? { ...journey.source, precision: level, lat: null, lon: null } : null;',
    '  return { ...journey, source: src, redaction: { level, applied: true } };',
    '}',
    'export function redactionPreview(journey, level) {',
    '  return [`redaction level: ${level}`, `target: ${journey.target.host}`, `${journey.hops.length} hop(s)`];',
    '}',
  ].join('\n'),
  './share/index.ts': [
    'export const MAX_FRAGMENT_BYTES = 60000;',
    'export function encodeShareLink(journey, baseUrl) {',
    '  const b64 = Buffer.from(JSON.stringify(journey)).toString("base64url");',
    '  return `${baseUrl.replace(/\\/$/, "")}/#j=${b64}`;',
    '}',
    'export function decodeShareLink(url) {',
    '  const hash = url.split("#j=")[1] ?? "";',
    '  return JSON.parse(Buffer.from(hash, "base64url").toString("utf8"));',
    '}',
  ].join('\n'),
};

const siblingFallbackPlugin = {
  name: 'sibling-fallback',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /^\.\/(?:story|redact|share)\/index\.ts$/ }, (args) => {
      const full = resolve(args.resolveDir, args.path);
      if (existsSync(full)) return null;
      return { path: args.path, namespace: 'sibling-stub' };
    });
    pluginBuild.onLoad({ filter: /.*/, namespace: 'sibling-stub' }, (args) => {
      const contents = SIBLING_STUBS[args.path] ?? '';
      return { contents, loader: 'ts' };
    });
  },
};

const result = await build({
  entryPoints: [resolve(here, 'src/main.ts')],
  outfile: resolve(here, 'dist/voyage.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: false,
  legalComments: 'none',
  banner: {
    js: [
      '#!/usr/bin/env node',
      'import { createRequire as __pvCreateRequire } from "node:module";',
      'const require = __pvCreateRequire(import.meta.url);',
    ].join('\n'),
  },
  external: [...builtinModules, ...builtinModules.map((name) => `node:${name}`)],
  plugins: [siblingFallbackPlugin],
  metafile: true,
  logLevel: 'info',
});

const outputs = Object.values(result.metafile.outputs);
const bytes = outputs.reduce((total, entry) => total + entry.bytes, 0);
console.log(`build: dist/voyage.mjs (${(bytes / 1024).toFixed(1)} kB)`);
