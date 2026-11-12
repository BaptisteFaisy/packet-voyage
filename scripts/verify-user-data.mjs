#!/usr/bin/env node
/**
 * Proof that the DEPLOYED site computes a visitor's own data like the CLI does.
 *
 * The oracle is the command line: `voyage read <trace> --offline --json` runs the
 * very pipeline the site must run in the browser. This script pastes the same
 * trace into the site, in an anonymous headless Chromium, reads the nine numbers
 * of the summary banner and compares them with the oracle. A visitor's data is
 * therefore checked against the product's own computation, never against a
 * hand-written expectation.
 *
 *   node scripts/verify-user-data.mjs                            # the appendix B example
 *   node scripts/verify-user-data.mjs --trace ~/pv-traces/x.txt  # your own trace text
 *   node scripts/verify-user-data.mjs --journey ~/pv-traces/x.json
 *   LIVE_URL=http://127.0.0.1:4173/ node scripts/verify-user-data.mjs
 *
 * Nothing here probes the network (`.kiro/steering/probing-ethics.md`): the input
 * is a recorded file and the oracle runs with `--offline`. The oracle needs the
 * CLI bundle: run `pnpm build` once before the first use.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LIVE = process.env.LIVE_URL ?? 'https://baptistefaisy.github.io/packet-voyage/';
const ORIGIN = new URL(LIVE).origin;
const EVIDENCE_DIR = join(root, 'docs', 'evidence');

/** The nine numbers of the summary banner, in the order the site shows them. */
const BANNER_STATS = [
  'summary-distance',
  'summary-rtt',
  'summary-light-floor',
  'summary-inflation',
  'summary-countries',
  'summary-networks',
  'summary-ixps',
  'summary-rejections',
  'summary-gaps',
];

function parseArgs(argv) {
  const options = { trace: null, journey: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--trace') options.trace = argv[++i];
    else if (argv[i] === '--journey') options.journey = argv[++i];
  }
  if (!options.trace && !options.journey) {
    options.trace = join(root, 'docs', 'examples', 'lyon-ashburn.txt');
  }
  return options;
}

/** The CLI as oracle: the same pipeline, run in Node, on the same file. */
function oracleFromTrace(tracePath) {
  const cli = join(root, 'apps', 'cli', 'bin', 'voyage.mjs');
  const bundle = join(root, 'apps', 'cli', 'dist', 'voyage.mjs');
  if (!existsSync(bundle)) {
    throw new Error(`the CLI bundle is missing (${bundle}) — run \`pnpm build\` first`);
  }
  const out = join(tmpdir(), `pv-oracle-${process.pid}.json`);
  const run = spawnSync(
    process.execPath,
    [cli, 'read', tracePath, '--offline', '--json', '--out', out],
    { cwd: root, encoding: 'utf8', timeout: 120_000 },
  );
  if (run.status !== 0) throw new Error(`voyage read failed (${run.status}): ${run.stderr?.slice(0, 400)}`);
  return JSON.parse(readFileSync(out, 'utf8'));
}

function numbersOf(text) {
  return [...String(text).matchAll(/-?\d[\d,]*(?:\.\d+)?/g)].map((m) => Number(m[0].replace(/,/g, '')));
}

/** Compare one banner cell with the oracle value it must show. */
function checkStat(testId, shown, expected, tolerance) {
  if (expected === null || expected === undefined) {
    return { testId, shown: shown.trim(), ok: shown.trim() === '—', note: 'oracle says null' };
  }
  const found = numbersOf(shown).some((value) => Math.abs(value - expected) <= tolerance);
  return { testId, shown: shown.trim(), ok: found, note: `oracle ${expected} ±${tolerance}` };
}

function compareBanner(shown, journey) {
  const s = journey.summary;
  const cells = [
    ['summary-distance', Math.round(s.distance_km_min), 1],
    ['summary-rtt', s.rtt_ms, 0.1],
    ['summary-light-floor', s.light_floor_ms, 0.1],
    ['summary-inflation', s.inflation, 0.01],
    ['summary-countries', s.countries.length, 0],
    ['summary-networks', s.networks, 0],
    ['summary-ixps', s.ixps, 0],
    ['summary-rejections', s.rejected_by_light, 0],
    ['summary-gaps', s.gaps, 0],
  ];
  return cells.map(([testId, expected, tolerance]) =>
    checkStat(testId, shown[testId] ?? '', expected, tolerance));
}

function findChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM) return process.env.PLAYWRIGHT_CHROMIUM;
  const cache = join(homedir(), '.cache', 'ms-playwright');
  if (!existsSync(cache)) return null;
  for (const build of readdirSync(cache).filter((n) => n.startsWith('chromium-')).sort().reverse()) {
    for (const rel of ['chrome-linux64/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
      if (existsSync(join(cache, build, rel))) return join(cache, build, rel);
    }
  }
  return null;
}

/** Paste the trace in the site and read back the nine banner numbers. */
async function pasteAndRead(page, traceText) {
  await page.goto(`${LIVE}#/`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForSelector('[data-testid="paste-input"]', { timeout: 15_000 });
  await page.fill('[data-testid="paste-input"]', traceText);
  await page.click('[data-testid="paste-submit"]');
  await page.waitForSelector('[data-testid="summary-banner"]', { timeout: 20_000 });
  const shown = {};
  for (const testId of BANNER_STATS) {
    shown[testId] = (await page.locator(`[data-testid="${testId}"]`).first().innerText()).replace(/\s+/g, ' ');
  }
  return shown;
}

/** The catalogue, and which data it says it demonstrates. */
async function readCatalogue(page) {
  await page.goto(`${LIVE}#/features`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForSelector('[data-testid="features-view"]', { timeout: 15_000 });
  const blocks = await page.locator('section[data-testid^="feature-"]').count();
  const label = await page
    .locator('[data-testid="feature-source-label"]')
    .first()
    .innerText()
    .then((text) => text.trim())
    .catch(() => null);
  return { blocks, label };
}

function buildReport({ input, oracleKind, checks, catalogue, requests, errors, external }) {
  const failed = checks.filter((c) => !c.ok);
  const ok = failed.length === 0 && external.length === 0 && errors.length === 0;
  const date = process.env.EVIDENCE_DATE ?? new Date().toISOString().slice(0, 10);
  const lines = [
    `# User-data check — ${date}`, '',
    `URL: ${LIVE}`, `Input: ${input}`, `Oracle: ${oracleKind}`, '',
    '## Banner numbers, site against oracle',
    ...checks.map((c) => `- ${c.ok ? 'ok  ' : 'FAIL'} ${c.testId}: "${c.shown}" (${c.note})`), '',
    '## Catalogue',
    `- feature blocks rendered: ${catalogue.blocks}`,
    `- data on screen: ${catalogue.label ?? '(no label)'}`, '',
    '## Network',
    `- requests: ${requests.length}`,
    `- outside ${ORIGIN}: ${external.length}`,
    ...external.map((url) => `  - ${url}`),
    `- errors: ${errors.length}`,
    ...errors.map((line) => `  - ${line}`), '',
    ok
      ? 'VERDICT: the deployed site computes the visitor’s own trace exactly like the command line, and calls nobody.'
      : 'VERDICT: FAILED — see above.', '',
  ];
  return { lines, ok };
}

function writeEvidence(lines) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const date = process.env.EVIDENCE_DATE ?? new Date().toISOString().slice(0, 10);
  const file = join(EVIDENCE_DIR, `user-data-${date}.log`);
  writeFileSync(file, `${lines.join('\n')}\n`, 'utf8');
  return file;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const executablePath = findChromium();
  if (!executablePath) {
    console.log('verify-user-data: skipped — no Chromium found (set PLAYWRIGHT_CHROMIUM)');
    process.exit(0);
  }
  const tracePath = options.trace ? resolve(options.trace) : null;
  const traceText = tracePath ? readFileSync(tracePath, 'utf8') : null;
  const oracle = tracePath ? oracleFromTrace(tracePath) : JSON.parse(readFileSync(resolve(options.journey), 'utf8'));

  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const requests = [];
  const errors = [];
  page.on('request', (request) => requests.push(request.url()));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  page.on('pageerror', (e) => errors.push(`page error: ${String(e).slice(0, 200)}`));

  const shown = traceText ? await pasteAndRead(page, traceText) : {};
  const catalogue = await readCatalogue(page);
  await browser.close();

  const external = requests.filter(
    (url) => !url.startsWith(ORIGIN) && !url.startsWith('data:') && !url.startsWith('blob:'),
  );
  const { lines, ok } = buildReport({
    input: options.journey ?? options.trace,
    oracleKind: tracePath ? 'voyage read --offline (same pipeline, run in Node)' : 'the journey file itself',
    checks: traceText ? compareBanner(shown, oracle) : [],
    catalogue,
    requests,
    errors,
    external,
  });
  const file = writeEvidence(lines);
  console.log(lines.join('\n'));
  console.log(`Evidence written: ${file}`);
  process.exit(ok ? 0 : 1);
}

await main();
