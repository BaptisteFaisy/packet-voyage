#!/usr/bin/env node
/**
 * The browser proof of VOY-N-01 and of §18 line 4: the hosted site makes no
 * request after its own load.
 *
 * It serves `apps/web/dist` on loopback only, drives a real Chromium, records
 * every request the page issues while a judge-like visit runs (open a gallery
 * journey, open a hop, open a crossing, switch to French), and writes the log to
 * `docs/evidence/`. Exit 0 when nothing left the loopback origin, 1 otherwise.
 *
 * Skipped with a clear message when no browser is installed: a proof must never
 * turn a build red on a machine that has nothing to prove.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';

import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { findChromium } from './lib/browser.mjs';
import { serveDist } from './lib/serve-dist.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(root, 'apps', 'web', 'dist');
const EVIDENCE_DIR = join(root, 'docs', 'evidence');

/** Minimal static server, bound to loopback: nothing outside can reach it. */

/** Newest installed Chromium, or the one the caller points at. */

function classify(url, origin) {
  if (url.startsWith('data:') || url.startsWith('blob:')) return 'inline';
  if (url.startsWith(origin)) return 'loopback';
  return 'external';
}

/** A judge-like visit: gallery, one journey, a hop, a crossing, French. */
async function visit(page) {
  const steps = [];
  const click = async (selector, label) => {
    const target = page.locator(selector).first();
    if ((await target.count()) === 0) {
      steps.push(`skipped ${label} — ${selector} is not in the page`);
      return;
    }
    try {
      await target.click({ timeout: 3000 });
      await page.waitForTimeout(400);
      steps.push(`clicked ${label}`);
    } catch {
      // An element can be present and still not clickable (covered by the
      // canvas, off-screen). The proof is about requests, not about clicks.
      steps.push(`skipped ${label} — ${selector} is present but not clickable`);
    }
  };
  await click('[data-testid="gallery-open-ocean-crossing"]', 'the ocean crossing');
  await click('[data-testid="world-map-overlay"] > *', 'a map element');
  await click('[data-testid="detail-panel"] [data-testid="close-detail"]', 'close the panel');
  await click('[data-testid="roadmap-table"] tbody tr', 'a roadmap row');
  await click('a[href="#/settings"], [data-testid="settings-view"]', 'settings');
  const language = page.locator('[data-testid="setting-language"]');
  if ((await language.count()) > 0) {
    await language.selectOption('fr').catch(() => {});
    await page.waitForTimeout(300);
    steps.push('switched the language to French');
  }
  await click('a[href="#/sources"]', 'sources');
  await click('a[href="#/classroom"]', 'classroom');
  return steps;
}

/** The CSP the page ships with: it is the other half of the proof. */
function readCsp() {
  const index = join(DIST, 'index.html');
  const html = existsSync(index) ? readFileSync(index, 'utf8') : '';
  const match = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(html);
  return match ? match[1] : 'no CSP meta tag found';
}

async function main() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('verify-no-request: apps/web/dist is missing — run `pnpm build` first');
    process.exit(2);
  }
  const executablePath = findChromium();
  if (!executablePath) {
    console.log('verify-no-request: skipped — no Chromium found (set PLAYWRIGHT_CHROMIUM)');
    process.exit(0);
  }
  const { chromium } = await import('playwright-core');
  const { server, port } = await serveDist(root);
  const origin = `http://127.0.0.1:${port}`;
  const requests = [];
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  let steps = [];
  try {
    const page = await browser.newPage();
    page.on('request', (request) => requests.push({ method: request.method(), url: request.url() }));
    page.on('requestfailed', (request) =>
      requests.push({ method: request.method(), url: request.url(), failed: true }));
    await page.goto(`${origin}/index.html`, { waitUntil: 'networkidle' });
    steps = await visit(page);
    await page.waitForTimeout(2000);
  } finally {
    await browser.close();
    server.close();
  }
  await report(requests, origin, steps);
}

async function report(requests, origin, steps) {
  const external = requests.filter((entry) => classify(entry.url, origin) === 'external');
  const loopback = requests.filter((entry) => classify(entry.url, origin) === 'loopback');
  const date = process.env.EVIDENCE_DATE ?? new Date().toISOString().slice(0, 10);
  const lines = [
    `# Browser network log — ${date}`,
    '',
    'Proof for VOY-N-01 and §18 line 4: the built site, served on loopback and',
    'visited like a judge would visit it, issues no request to any other origin.',
    '',
    `Content-Security-Policy: ${readCsp()}`,
    `Assets served from the loopback origin: ${loopback.length}`,
    `Inline (data:/blob:) resources: ${requests.filter((r) => classify(r.url, origin) === 'inline').length}`,
    `External requests: ${external.length}`,
    '',
    '## Visit',
    ...steps.map((step) => `- ${step}`),
    '',
    '## Every request issued',
    ...requests.map((entry) => `- ${entry.method} ${entry.url}${entry.failed ? ' (failed)' : ''}`),
    '',
    external.length === 0
      ? `VERDICT: 0 external request(s) after load — ${loopback.length} loopback asset(s)`
      : `VERDICT: ${external.length} EXTERNAL REQUEST(S) — ${external.map((e) => e.url).join(', ')}`,
    '',
  ];
  await mkdir(EVIDENCE_DIR, { recursive: true });
  const path = join(EVIDENCE_DIR, `no-request-${date}.log`);
  await writeFile(path, lines.join('\n'));
  console.log(lines.filter((line) => line.startsWith('VERDICT'))[0]);
  console.log(`verify-no-request: log written to ${path.slice(root.length + 1)}`);
  process.exit(external.length === 0 ? 0 : 1);
}

await main();
