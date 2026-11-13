#!/usr/bin/env node
/**
 * The demo environment: one command, a server that stays up, a proof written down.
 *
 *   pnpm demo                      → serve the built site, walk it, write the proof
 *   pnpm demo -- --trace <file>    → the same, on your own trace (real addresses)
 *   pnpm demo -- --journey <file>  → the same, on a journey.json you already have
 *   pnpm demo --stop               → stop the environment
 *
 * The server is started detached, so it outlives the command and the URL never
 * moves; its pid is kept in `~/.cache/packet-voyage/demo.pid`. The walk itself
 * is the bench — `scripts/verify-user-data.mjs` — run against that local server:
 * one implementation of the proof, not two.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { serveDist } from './lib/serve-dist.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PIDFILE = join(homedir(), '.cache', 'packet-voyage', 'demo.pid');
const DEFAULT_PORT = 4180;

function parseArgs(argv) {
  const options = { stop: false, serve: false, port: DEFAULT_PORT, trace: null, journey: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--stop') options.stop = true;
    else if (argv[i] === '--serve') options.serve = true;
    else if (argv[i] === '--port') options.port = Number(argv[i + 1]);
    else if (argv[i] === '--trace') options.trace = argv[++i];
    else if (argv[i] === '--journey') options.journey = argv[++i];
  }
  return options;
}

/** The server mode: serve until the process is stopped. */
async function serveForever(port) {
  const { origin } = await serveDist(root, { port });
  process.stdout.write(`packet-voyage demo → ${origin}\n`);
  process.on('SIGTERM', () => process.exit(0));
  await new Promise(() => {});
}

/** Stop a running demo environment. */
function stopDemo() {
  if (!existsSync(PIDFILE)) {
    console.log('demo: nothing to stop (no pid file)');
    return;
  }
  const pid = Number(readFileSync(PIDFILE, 'utf8').trim());
  try {
    process.kill(pid, 'SIGTERM');
    console.log(`demo: stopped (pid ${pid})`);
  } catch {
    console.log(`demo: pid ${pid} was not running`);
  }
  writeFileSync(PIDFILE, '');
}

/** Start the server detached, and wait until it answers. */
async function startDemo(port) {
  const child = spawn(
    process.execPath,
    [join(root, 'scripts', 'demo.mjs'), '--serve', '--port', String(port)],
    { detached: true, stdio: 'ignore' },
  );
  child.unref();
  mkdirSync(dirname(PIDFILE), { recursive: true });
  writeFileSync(PIDFILE, `${child.pid}\n`);
  for (let i = 0; i < 40; i += 1) {
    await new Promise((done) => setTimeout(done, 250));
    const answer = spawnSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', `http://127.0.0.1:${port}/`], { encoding: 'utf8' });
    if (answer.stdout.trim() === '200') return `http://127.0.0.1:${port}/`;
  }
  throw new Error(`the demo server did not answer on port ${port}`);
}

/** Build the site: the demo must serve what the code says, not a stale dist. */
function buildSite() {
  const run = spawnSync(process.execPath, [join(root, 'scripts', 'build.mjs')], {
    cwd: root,
    encoding: 'utf8',
    timeout: 300_000,
  });
  if (run.status !== 0) throw new Error(`the build failed: ${run.stderr?.slice(0, 400)}`);
}

/** The bench, run against the local server: it writes the proof itself. */
function runBench(origin, trace, journey) {
  const args = [join(root, 'scripts', 'verify-user-data.mjs')];
  if (trace) args.push('--trace', resolve(trace));
  if (journey) args.push('--journey', resolve(journey));
  const run = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, LIVE_URL: origin, EVIDENCE_PREFIX: 'demo' },
    timeout: 600_000,
  });
  process.stdout.write(run.stdout ?? '');
  if (run.stderr) process.stderr.write(run.stderr);
  return run.status ?? 1;
}

/** The demo page: the proof, step by step, with the screenshots. */
function writeDemoPage(origin, evidencePath) {
  const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
  const steps = evidence.steps
    .map(
      (step) => `<section class="step"><h3>${step.title} <span class="badge">${step.ok ? 'PASS' : 'FAIL'}</span></h3>
<p class="how">${step.how}</p><ul>${step.checks
        .map((c) => `<li>${c.ok ? '✓' : '✗'} ${c.name}: <b>${c.shown}</b> <span class="oracle">— attendu ${c.expected}</span></li>`)
        .join('')}</ul></section>`,
    )
    .join('\n');
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Packet Voyage — démo</title><style>
:root{color-scheme:dark}body{margin:0;padding:2rem 1.2rem;background:#0b1220;color:#e6edf7;font:16px/1.55 system-ui,sans-serif;max-width:1000px;margin-inline:auto}
h1{font-size:1.6rem;margin:0 0 .3rem}h2{font-size:1.05rem;margin:1.8rem 0 .5rem;color:#9ecbff}
.verdict{background:#0f2a1c;border:1px solid #2ea04366;border-radius:10px;padding:.9rem 1.1rem;margin:1rem 0}
.step{background:#111c31;border:1px solid #22304a;border-radius:12px;padding:.9rem 1.1rem;margin:1rem 0}
.step h3{margin:.1rem 0 .4rem;font-size:1rem;display:flex;gap:.6rem;align-items:center}
.badge{background:#0f2a1c;border:1px solid #2ea04366;color:#7ee2a8;border-radius:999px;padding:.1rem .55rem;font-size:.75rem}
.how{color:#8b9bb4;font-size:.87rem;margin:.1rem 0 .6rem}
ul{margin:.3rem 0;padding-left:1.2rem;font-size:.88rem}li{margin:.2rem 0}
.oracle{color:#7d8ea6}code{background:#0d1729;padding:.1rem .3rem;border-radius:4px;font-family:ui-monospace,monospace;font-size:.86rem}
a{color:#79c0ff}</style></head><body>
<h1>Packet Voyage — démo</h1>
<p class="lead">Le site servi sur <code>${origin}</code>, vérifié par le banc : chaque étape montre ce qui a été fait, ce que
le site a répondu et ce que l’oracle (la ligne de commande) dit.</p>
<div class="verdict"><strong>${evidence.steps.filter((s) => s.ok).length} / ${evidence.steps.length} étapes PASS</strong> ·
${evidence.steps.reduce((n, s) => n + s.checks.length, 0)} contrôles ·
${evidence.network.requests.length} requêtes, ${evidence.network.external.length} hors origine,
${evidence.network.errors.length} erreur console.</div>
<h2>Les étapes</h2>${steps}
<h2>Le site</h2><p><a href="${origin}#/features">Catalogue des fonctionnalités</a> ·
<a href="${origin}#/">Accueil, collage, import</a></p>
</body></html>`;
  writeFileSync(join(root, 'apps', 'web', 'dist', 'demo.html'), html, 'utf8');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.serve) {
    await serveForever(options.port);
    return;
  }
  if (options.stop) {
    stopDemo();
    return;
  }
  buildSite();
  const origin = await startDemo(options.port);
  console.log(`demo: serveur sur ${origin} (pid ${readFileSync(PIDFILE, 'utf8').trim()})`);
  const status = runBench(origin, options.trace, options.journey);
  const date = new Date().toISOString().slice(0, 10);
  const evidence = join(root, 'docs', 'evidence', `demo-${date}.json`);
  if (existsSync(evidence)) writeDemoPage(origin, evidence);
  console.log(`demo: page de démo → ${origin}demo.html`);
  console.log('demo: pour arrêter → pnpm demo:stop');
  process.exit(status);
}

await main();
