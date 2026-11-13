#!/usr/bin/env node
/**
 * Stage the npm package: what `npm publish` would send, and nothing else.
 *
 * The command line is a single bundled file — esbuild puts the core, the
 * data, the enrichment and the MCP server inside `dist/voyage.mjs` — so the
 * published package has **no runtime dependency**. The monorepo's
 * `workspace:*` links must never reach the registry: `npm install
 * packet-voyage` would fail on them.
 *
 *   node scripts/publish-package.mjs             # stage, pack, verify
 *   node scripts/publish-package.mjs --publish   # stage, pack, publish
 *
 * The publish step needs the owner's npm account (`npm login`); the script
 * never stores a token, and it refuses to publish when nobody is logged in.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(root, 'apps', 'cli');
const stage = join(root, 'dist', 'npm', 'packet-voyage');

/** The manifest that goes to the registry: the CLI's, minus the workspace links. */
function manifestFor(source) {
  return {
    name: source.name,
    version: source.version,
    description: source.description,
    license: source.license,
    type: source.type,
    bin: source.bin,
    files: ['bin', 'dist', 'README.md', 'LICENSE'],
    engines: source.engines ?? { node: '>=22.6' },
    repository: { type: 'git', url: 'git+https://github.com/Tradoooo/packet-voyage.git' },
    homepage: 'https://tradoooo.github.io/packet-voyage/',
    bugs: { url: 'https://github.com/Tradoooo/packet-voyage/issues' },
    keywords: ['traceroute', 'mtr', 'network', 'latency', 'submarine-cables', 'geolocation', 'cli'],
    publishConfig: { access: 'public' },
  };
}

/** Copy the three things the package needs, and nothing more. */
function stagePackage() {
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(join(stage, 'dist'), { recursive: true });
  cpSync(join(cli, 'bin'), join(stage, 'bin'), { recursive: true });
  cpSync(join(cli, 'dist', 'voyage.mjs'), join(stage, 'dist', 'voyage.mjs'));
  cpSync(join(root, 'README.md'), join(stage, 'README.md'));
  cpSync(join(root, 'LICENSE'), join(stage, 'LICENSE'));
  const source = JSON.parse(readFileSync(join(cli, 'package.json'), 'utf8'));
  writeFileSync(join(stage, 'package.json'), `${JSON.stringify(manifestFor(source), null, 2)}\n`, 'utf8');
  return source;
}

/** What the registry would receive: the file list of the tarball. */
function packDryRun() {
  const run = spawnSync('npm', ['pack', '--dry-run', '--json'], { cwd: stage, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`npm pack failed: ${run.stderr?.slice(0, 400)}`);
  const parsed = JSON.parse(run.stdout);
  // npm 10 answers with an array, npm 11 with an object keyed by package name.
  const entry = Array.isArray(parsed) ? parsed[0] : parsed[Object.keys(parsed)[0]];
  return entry?.files?.map((item) => item.path) ?? [];
}

/** The checks that keep a broken package off the registry. */
function verify(files, source) {
  const problems = [];
  const manifest = JSON.parse(readFileSync(join(stage, 'package.json'), 'utf8'));
  if (JSON.stringify(manifest).includes('workspace:')) problems.push('a workspace link would reach the registry');
  if (manifest.dependencies && Object.keys(manifest.dependencies).length > 0) {
    problems.push(`the bundle is self-contained, but the manifest declares ${Object.keys(manifest.dependencies).join(', ')}`);
  }
  for (const required of ['bin/voyage.mjs', 'dist/voyage.mjs', 'README.md', 'LICENSE', 'package.json']) {
    if (!files.includes(required)) problems.push(`the tarball has no ${required}`);
  }
  const bundle = readFileSync(join(stage, 'dist', 'voyage.mjs'), 'utf8');
  if (bundle.includes('from "@packet-voyage/')) problems.push('the bundle still imports a workspace package at runtime');
  if (!existsSync(join(stage, 'bin', 'voyage.mjs'))) problems.push('the bin shim is missing');
  if (source.version !== manifest.version) problems.push('the staged version differs from the source');
  return problems;
}

/** Publish — only when somebody is logged in, and never with a stored token. */
function publish() {
  const who = spawnSync('npm', ['whoami'], { encoding: 'utf8' });
  if (who.status !== 0) {
    console.log('npm: nobody is logged in — run `npm login` first, then this script again.');
    return 1;
  }
  console.log(`npm: publishing as ${who.stdout.trim()}`);
  const run = spawnSync('npm', ['publish', '--access', 'public'], { cwd: stage, stdio: 'inherit' });
  return run.status ?? 1;
}

async function main() {
  const source = stagePackage();
  const files = packDryRun();
  const problems = verify(files, source);
  console.log(`npm: staged ${source.name}@${source.version} in ${stage}`);
  for (const file of files) console.log(`  ${file}`);
  if (problems.length > 0) {
    for (const problem of problems) console.error(`npm: REFUSED — ${problem}`);
    process.exit(1);
  }
  console.log('npm: the package is ready — `npm publish --access public` in that directory, or run this script with --publish.');
  if (process.argv.includes('--publish')) process.exit(publish());
  process.exit(0);
}

await main();
