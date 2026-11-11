/**
 * Self-tests for all Packet Voyage guards and Kiro hooks.
 * Creates isolated fixture trees in a temporary directory (node:fs mkdtemp),
 * never touching the repository working tree.
 * Run with: `node scripts/guards/selftest.mjs`
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import console from 'node:console';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { checkBundleSize } from './bundle-size.guard.mjs';
import { checkDataLicence } from './data-licence.guard.mjs';
import { checkFixturePrivacy } from './fixture-privacy.guard.mjs';
import { checkKiroTracked } from './kiro-tracked.guard.mjs';
import { checkLimits } from './limits.guard.mjs';
import { checkNoNetwork } from './no-network.guard.mjs';
import { checkRoadmapParity } from './roadmap-parity.guard.mjs';
import { checkVocabulary } from './vocabulary.guard.mjs';
import { checkProbeCommand } from '../hooks/probe-guard.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

async function writeTree(base, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(base, rel);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, content, 'utf8');
  }
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function runHook(hookRel, payload) {
  return spawnSync(process.execPath, [join(REPO_ROOT, hookRel)], {
    cwd: REPO_ROOT,
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
}

async function testVocabulary(tmp) {
  const root = join(tmp, 'vocab');
  await writeTree(root, {
    'packages/core/src/story/vocabulary.ts': 'export const FORBIDDEN_PATTERNS = [/travelled through/i];\n',
    'apps/web/src/Good.tsx': 'export const msg = "Compatible cables for this crossing; likely in Paris; at least 6,655 km";\n',
  });
  const ok = await checkVocabulary(root);
  assert.equal(ok.hits.length, 0);

  await writeTree(root, {
    'apps/web/src/Bad.tsx': 'export const a = "Your packet travelled through cable X";\nexport const b = "Located in Paris";\nexport const c = "travelled distance: 6655 km";\n',
  });
  const bad = await checkVocabulary(root);
  assert.equal(bad.hits.length, 3);
}

async function testDataLicence(tmp) {
  const root = join(tmp, 'licence');
  const ds = '[{"id":"c1"}]';
  await writeTree(root, {
    'packages/data/datasets/cables.json': ds,
    'packages/data/provenance/cables.json': JSON.stringify({
      id: 'cables',
      origin: 'OpenStreetMap contributors',
      licence: 'ODbL-1.0',
      sha256: sha256(ds),
    }),
  });
  assert.equal((await checkDataLicence(root)).errors.length, 0);

  await writeTree(root, {
    'packages/data/provenance/cables.json': JSON.stringify({
      id: 'cables',
      origin: 'TeleGeography Submarine Cable Map',
      licence: 'CC-BY-SA-4.0',
      sha256: 'deadbeef',
    }),
  });
  const bad = await checkDataLicence(root);
  assert.ok(bad.errors.some((e) => e.includes('forbidden origin')));
  assert.ok(bad.errors.some((e) => e.includes('sha256 mismatch')));
}

async function testFixturePrivacy(tmp) {
  const root = join(tmp, 'privacy');
  await writeTree(root, {
    'gallery/ocean/journey.json': JSON.stringify({
      source: { label: 'FR', precision: 'country' },
      hops: [{ ttl: 1, replies: [{ ip: '198.51.100.9', rtt_ms: [9.6] }] }],
      redaction: { level: 'country', applied: true },
    }),
    'packages/core/src/parse/sample.test.ts': 'const t = "1 192.168.1.1 1ms\\n2 10.0.0.1 2ms\\n3 100.64.0.1 3ms\\n4 203.0.113.80 10ms";\n',
  });
  assert.equal((await checkFixturePrivacy(root)).errors.length, 0);

  await writeTree(root, {
    'gallery/ocean/trace.txt': '1 192.168.42.17 1.2 ms\n',
    'gallery/ocean/raw.fixture.json': JSON.stringify({ source: { label: 'Lyon', precision: 'city', lat: 45.76, lon: 4.84 } }),
    'packages/core/src/parse/fixtures/leak.json': '{ "ip": "172.16.8.9" }\n',
    // A unit-test source is the classifier's own input: synthetic literals there
    // are expected, and must not be reported.
    'packages/core/src/parse/classify.test.ts': 'const t = "172.16.8.9 169.254.1.1 127.0.0.1";\n',
  });
  const bad = await checkFixturePrivacy(root);
  assert.ok(bad.errors.some((e) => e.includes('192.168.42.17')));
  assert.ok(bad.errors.some((e) => e.includes('finer than country')));
  assert.ok(bad.errors.some((e) => e.includes('172.16.8.9')));
  assert.ok(!bad.errors.some((e) => e.includes('classify.test.ts')));
}

async function testLimits(tmp) {
  const root = join(tmp, 'limits');
  const shortBody = Array.from({ length: 10 }, (_, i) => `  const x${i} = ${i};`).join('\n');
  const longBody = Array.from({ length: 52 }, (_, i) => `  const y${i} = ${i};`).join('\n');
  const longPy = Array.from({ length: 52 }, (_, i) => `    x_${i} = ${i}`).join('\n');
  await writeTree(root, {
    'packages/core/src/ok.ts': `export function ok() {\n${shortBody}\n}\n`,
    'packages/core/src/bad.ts': `export function tooLong() {\n${longBody}\n}\n`,
    'scripts/bad.py': `def big():\n${longPy}\n`,
  });
  const res = await checkLimits(root);
  assert.equal(res.errors.length, 2);
}

async function testNoNetwork(tmp) {
  const root = join(tmp, 'nonet');
  await writeTree(root, {
    'packages/enrich/src/ok.ts': 'export const r = () => fetch("https://example.org");\n',
    'packages/core/src/bad.ts': 'export const r = () => fetch("https://example.org");\n',
    'apps/web/src/bad.tsx': 'import net from "node:net"; export const x = net;\n',
    'packages/core/src/ok.test.ts': 'const fakeFetch = () => fetch("https://example.org");\n',
  });
  const res = await checkNoNetwork(root);
  assert.equal(res.errors.length, 2);
}

async function testKiroTracked(tmp) {
  const root = join(tmp, 'kiro');
  await writeTree(root, {
    '.kiro/steering/x.md': 'ok',
    '.kiro/specs/x.md': 'ok',
    '.kiro/hooks/x.json': '{}',
    '.kiro/agents/x.md': 'ok',
    '.gitignore': 'node_modules/\n',
    'LICENSE': 'MIT License\n\nPermission is hereby granted...\n',
  });
  assert.equal((await checkKiroTracked(root)).errors.length, 0);

  await writeTree(root, { '.gitignore': '.kiro/\n', 'LICENSE': 'Proprietary' });
  const bad = await checkKiroTracked(root);
  assert.ok(bad.errors.some((e) => e.includes('.gitignore')));
  assert.ok(bad.errors.some((e) => e.includes('MIT License')));
}

async function testRoadmapParity(tmp) {
  const root = join(tmp, 'roadmap');
  await mkdir(root, { recursive: true });
  assert.equal((await checkRoadmapParity(root)).skipped, true);

  await writeTree(root, {
    'apps/web/src/components/RoadmapTable.tsx': 'export const RoadmapTable = ({ j }) => <>{j.hops.map(h=>h)}{j.segments.map(s=>s)}</>;\n',
    'apps/web/src/components/RoadmapTable.test.tsx': 'import { RoadmapTable } from "./RoadmapTable";\n',
  });
  const ok = await checkRoadmapParity(root);
  assert.equal(ok.skipped, false);
  assert.equal(ok.errors.length, 0);
}

async function testBundleSize(tmp) {
  const root = join(tmp, 'bundle');
  await mkdir(root, { recursive: true });
  assert.equal((await checkBundleSize(root)).skipped, true);

  await writeTree(root, {
    'apps/web/dist/app.js': 'console.log("small");',
    'apps/web/dist/cables.json': '{"ok":true}',
  });
  assert.equal((await checkBundleSize(root)).errors.length, 0);

  const incompressible = createHash('sha256').update('seed').digest();
  const bigChunks = [];
  for (let i = 0; i < 14000; i += 1) {
    bigChunks.push(createHash('sha256').update(`${i}`).digest());
  }
  const bigBuf = Buffer.concat(bigChunks);
  assert.ok(gzipSync(bigBuf).length > 350 * 1024);
  await writeFile(join(root, 'apps/web/dist/huge.js'), bigBuf);
  assert.ok(incompressible.length > 0);
  const over = await checkBundleSize(root);
  assert.equal(over.errors.length, 1);
}

async function testHooks(tmp) {
  const root = join(tmp, 'hooks');
  await writeTree(root, {
    '.kiro/probe-allowlist.txt': 'localhost\n127.0.0.1\n::1\n198.51.100.0/24\n',
    'apps/web/src/Bad.tsx': 'export const s = "Your packet crossed the sea";\n',
    'gallery/g1/trace.txt': '1 10.20.30.40 2 ms\n',
    'packages/data/datasets/test.json': '[]',
  });
  assert.equal((await checkProbeCommand(root, 'traceroute 198.51.100.5')).allowed, true);
  assert.equal((await checkProbeCommand(root, 'mtr 1.1.1.1')).allowed, false);

  const pRefuse = runHook('scripts/hooks/probe-guard.mjs', { cwd: root, tool_name: 'shell', tool_input: { command: 'ping 8.8.8.8' } });
  assert.notEqual(pRefuse.status, 0);
  const pAllow = runHook('scripts/hooks/probe-guard.mjs', { cwd: root, tool_name: 'shell', tool_input: { command: 'ping 127.0.0.1' } });
  assert.equal(pAllow.status, 0);

  const cRefuse = runHook('scripts/hooks/claims-guard.mjs', { cwd: root, tool_input: { file_path: 'apps/web/src/Bad.tsx' } });
  assert.notEqual(cRefuse.status, 0);
  const fRefuse = runHook('scripts/hooks/fixture-privacy-guard.mjs', { cwd: root, tool_input: { file_path: 'gallery/g1/trace.txt' } });
  assert.notEqual(fRefuse.status, 0);
  const dRefuse = runHook('scripts/hooks/data-licence-guard.mjs', { cwd: root, tool_input: { file_path: 'packages/data/datasets/test.json' } });
  assert.notEqual(dRefuse.status, 0);
  const jOk = runHook('scripts/hooks/journal-reminder.mjs', { cwd: root, spec: 'locator', task: 'T1', duration: '4s' });
  assert.equal(jOk.status, 0);
  const journal = await readFile(join(root, 'KIRO_JOURNAL.md'), 'utf8');
  assert.ok(journal.includes('| locator | T1 | 4s |'));
}

const CASES = [
  ['vocabulary.guard', testVocabulary],
  ['data-licence.guard', testDataLicence],
  ['fixture-privacy.guard', testFixturePrivacy],
  ['limits.guard', testLimits],
  ['no-network.guard', testNoNetwork],
  ['kiro-tracked.guard', testKiroTracked],
  ['roadmap-parity.guard', testRoadmapParity],
  ['bundle-size.guard', testBundleSize],
  ['hooks (probe/claims/privacy/licence/journal)', testHooks],
];

async function main() {
  const tmp = await mkdtemp(join(tmpdir(), 'pv-guards-'));
  let failed = 0;
  try {
    for (const [name, fn] of CASES) {
      try {
        await fn(tmp);
        console.log(`PASS ${name}`);
      } catch (err) {
        failed += 1;
        console.error(`FAIL ${name}: ${err.stack || err.message}`);
      }
    }
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
  process.exit(failed === 0 ? 0 : 1);
}

await main();
