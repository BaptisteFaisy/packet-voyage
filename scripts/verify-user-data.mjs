#!/usr/bin/env node
/**
 * Proof that the DEPLOYED site computes a visitor's own data like the CLI does.
 *
 * The oracle is the command line: `voyage read <trace> --offline --json` runs the
 * very pipeline the site must run in the browser. This script feeds the site the
 * same data through each of its three doors — a pasted trace, an imported
 * `journey.json`, a share link — and compares the nine numbers of the summary
 * banner with the oracle, one by one, each with its own tolerance. A figure the
 * oracle has and the site does not show is a **failure**, not a blank to read
 * past.
 *
 * Every step carries its own proof: what was done, what the site answered, what
 * the oracle says, and the verdict. The log is the human-readable form; the
 * JSON beside it is the machine-readable one.
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
const CLI = join(root, 'apps', 'cli', 'bin', 'voyage.mjs');

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

/** Run the CLI and return its stdout, or throw with what it said. */
function runCli(args) {
  const run = spawnSync(process.execPath, [CLI, ...args], {
    cwd: root,
    encoding: 'utf8',
    timeout: 120_000,
  });
  if (run.status !== 0) throw new Error(`voyage ${args[0]} failed (${run.status}): ${run.stderr?.slice(0, 400)}`);
  return run.stdout;
}

function requireCliBundle() {
  if (!existsSync(join(root, 'apps', 'cli', 'dist', 'voyage.mjs'))) {
    throw new Error('the CLI bundle is missing — run `pnpm build` first');
  }
}

/** The oracle: the same pipeline, run in Node, on the same file. */
function oracleFromTrace(tracePath) {
  const out = join(tmpdir(), `pv-oracle-${process.pid}.json`);
  runCli(['read', tracePath, '--offline', '--json', '--out', out]);
  return { journey: JSON.parse(readFileSync(out, 'utf8')), file: out };
}

/** A share link for that journey, produced by the CLI, redacted at country level. */
function shareLinkFor(journeyFile) {
  const out = runCli(['share', journeyFile, '--level', 'country', '--yes', '--base-url', `${LIVE}`]);
  const line = out.split('\n').map((l) => l.trim()).find((l) => l.startsWith('http'));
  if (!line) throw new Error('the CLI produced no share link');
  return line;
}

function numbersOf(text) {
  return [...String(text).matchAll(/-?\d[\d,]*(?:\.\d+)?/g)].map((m) => Number(m[0].replace(/,/g, '')));
}

/** One proof: what the site showed, what the oracle says, and the verdict. */
function check(name, shown, expected, tolerance) {
  if (expected === null || expected === undefined) {
    return { name, shown: String(shown).trim(), expected: null, ok: String(shown).trim() === '—' };
  }
  const found = numbersOf(shown).some((value) => Math.abs(value - expected) <= tolerance);
  return { name, shown: String(shown).trim(), expected, ok: found };
}

/** The nine proofs of one banner, in the order the site shows them. */
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
  return cells.map(([name, expected, tolerance]) => check(name, shown[name] ?? '', expected, tolerance));
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

/** Read the nine numbers of the banner the site is showing right now. */
async function readBanner(page) {
  await page.waitForSelector('[data-testid="summary-banner"]', { timeout: 20_000 });
  const shown = {};
  for (const testId of BANNER_STATS) {
    const text = await page.locator(`[data-testid="${testId}"]`).first().innerText();
    shown[testId] = text.replace(/\s+/g, ' ');
  }
  return shown;
}

/** Step 1 — the visitor pastes the trace; the site computes it here. */
async function stepPaste(page, traceText) {
  await page.goto(`${LIVE}#/`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForSelector('[data-testid="paste-input"]', { timeout: 15_000 });
  await page.fill('[data-testid="paste-input"]', traceText);
  await page.click('[data-testid="paste-submit"]');
  return readBanner(page);
}

/** Step 2 — the visitor opens the journey.json the command line wrote. */
async function stepImport(page, journeyFile) {
  await page.goto(`${LIVE}#/`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForSelector('[data-testid="import-input"]', { timeout: 15_000 });
  await page.setInputFiles('[data-testid="import-input"]', journeyFile);
  await page.waitForSelector('[data-testid="import-error"]', { timeout: 5_000 }).catch(() => null);
  return readBanner(page);
}

/** Step 3 — the visitor opens a share link; the journey rides in the fragment. */
async function stepShare(page, link) {
  await page.goto(link, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForSelector('[data-testid="share-opened"]', { timeout: 20_000 });
  return readBanner(page);
}

/** Step 4 — the catalogue, and the data it says it demonstrates. */
async function stepCatalogue(page) {
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

/** One step of the proof: what was done, what the site said, and the verdict. */
function buildStep(id, title, how, checks) {
  const failed = checks.filter((c) => !c.ok);
  return { id, title, how, checks, ok: failed.length === 0, failed: failed.length };
}

function reportSteps(steps) {
  const lines = [];
  for (const step of steps) {
    lines.push(`## ${step.title}`, `How: ${step.how}`, '');
    for (const c of step.checks) {
      const expected = c.expected === null ? 'null' : String(c.expected);
      lines.push(`- ${c.ok ? 'ok  ' : 'FAIL'} ${c.name}: "${c.shown}" — oracle ${expected}`);
    }
    lines.push('', `**Step verdict: ${step.ok ? 'PASS' : `FAIL (${step.failed} check(s))`}**`, '');
  }
  return lines;
}

function writeEvidence(steps, network) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const date = process.env.EVIDENCE_DATE ?? new Date().toISOString().slice(0, 10);
  const failed = steps.filter((s) => !s.ok).length + network.external.length + network.errors.length;
  const lines = [
    `# User-data check — ${date}`, '',
    `URL: ${LIVE}`,
    `Oracle: voyage read --offline (the same pipeline, run in Node)`,
    `Browser: headless Chromium, no credentials, no local build.`, '',
    ...reportSteps(steps),
    '## Network',
    `- requests: ${network.requests.length}`,
    `- outside ${ORIGIN}: ${network.external.length}`,
    ...network.external.map((url) => `  - ${url}`),
    `- errors: ${network.errors.length}`,
    ...network.errors.map((line) => `  - ${line}`), '',
    failed === 0
      ? 'VERDICT: every door of the site gives the visitor’s own data exactly like the command line, and calls nobody.'
      : 'VERDICT: FAILED — see above.', '',
  ];
  const log = join(EVIDENCE_DIR, `user-data-${date}.log`);
  writeFileSync(log, `${lines.join('\n')}\n`, 'utf8');
  const json = join(EVIDENCE_DIR, `user-data-${date}.json`);
  writeFileSync(json, `${JSON.stringify({ url: LIVE, date, steps, network }, null, 2)}\n`, 'utf8');
  return { log, json, ok: failed === 0 };
}

/** Launch the browser and watch every request, response and page error. */
async function openBrowser(executablePath) {
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const requests = [];
  const errors = [];
  page.on('request', (request) => requests.push(request.url()));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  page.on('pageerror', (e) => errors.push(`page error: ${String(e).slice(0, 200)}`));
  return { browser, page, requests, errors };
}

/** The three doors of the site, each one with its own proof. */
async function runDoors(page, traceText, oracle) {
  const steps = [];
  if (traceText) {
    steps.push(buildStep('paste', 'Step 1 — the visitor pastes the trace',
      'the text is pasted in the site and computed there',
      compareBanner(await stepPaste(page, traceText), oracle.journey)));
  }
  steps.push(buildStep('import', 'Step 2 — the visitor opens the journey.json the command line wrote',
    '`voyage read --offline --json` wrote it; the site reads it with the File API',
    compareBanner(await stepImport(page, oracle.file), oracle.journey)));
  const link = shareLinkFor(oracle.file);
  steps.push(buildStep('share', 'Step 3 — the visitor opens a share link',
    'the journey rides in the fragment; no server stores it',
    compareBanner(await stepShare(page, link), oracle.journey)));
  return steps;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const executablePath = findChromium();
  if (!executablePath) {
    console.log('verify-user-data: skipped — no Chromium found (set PLAYWRIGHT_CHROMIUM)');
    process.exit(0);
  }
  requireCliBundle();
  const tracePath = options.trace ? resolve(options.trace) : null;
  const journeyPath = options.journey ? resolve(options.journey) : null;
  const traceText = tracePath ? readFileSync(tracePath, 'utf8') : null;
  const oracle = tracePath
    ? oracleFromTrace(tracePath)
    : { journey: JSON.parse(readFileSync(journeyPath, 'utf8')), file: journeyPath };

  const { browser, page, requests, errors } = await openBrowser(executablePath);
  const steps = await runDoors(page, traceText, oracle);
  const catalogue = await stepCatalogue(page);
  await browser.close();

  steps.push(buildStep('catalogue', 'Step 4 — the catalogue demonstrates that journey',
    'every block of #/features runs on the loaded journey',
    [
      { name: 'feature blocks rendered', shown: String(catalogue.blocks), expected: 13, ok: catalogue.blocks >= 13 },
      { name: 'data named on screen', shown: catalogue.label ?? '', expected: 'Your data', ok: (catalogue.label ?? '').startsWith('Your data') },
    ]));

  const external = requests.filter(
    (url) => !url.startsWith(ORIGIN) && !url.startsWith('data:') && !url.startsWith('blob:'),
  );
  const { log, json, ok } = writeEvidence(steps, { requests, errors, external });
  for (const step of steps) {
    console.log(`${step.ok ? 'PASS' : 'FAIL'}  ${step.title}`);
    for (const c of step.checks) console.log(`   ${c.ok ? 'ok  ' : 'FAIL'} ${c.name}: "${c.shown}"`);
  }
  console.log(`\nEvidence: ${log}\n           ${json}`);
  process.exit(ok ? 0 : 1);
}

await main();
