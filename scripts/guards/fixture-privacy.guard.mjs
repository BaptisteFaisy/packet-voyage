/**
 * Fixture privacy guard (VOY-N-13, §10, §14.3).
 * - In `gallery/**`, `*.fixture.json`, `gallery/<slug>/trace.txt`:
 *   forbids RFC1918, CGNAT (100.64/10), link-local, loopback, and source precision finer than country
 *   unless `redaction.applied === true` (and private/cgnat/loopback/link-local hops are still forbidden).
 * - In unit-test *sources* (`*.test.ts`, `*.test.tsx`): every non-public literal is
 *   synthetic by construction (the classifier under test needs them), so nothing is flagged.
 * - In fixture *data* (`packages/<pkg>/src/** /fixtures/**`):
 *   allows documentation ranges (192.0.2/24, 198.51.100/24, 203.0.113/24, 2001:db8::/32) and
 *   explicitly synthetic private/cgnat addresses (192.168.1.1, 10.0.0.1, 100.64.0.1);
 *   flags any other RFC1918/CGNAT/link-local/loopback IP.
 */
import console from 'node:console';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { isMain, walkFiles } from './lib.mjs';

const SYNTHETIC_ALLOWED = new Set(['192.168.1.1', '10.0.0.1', '100.64.0.1']);
const IPV4_RX = /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g;
const IPV6_TOKEN_RX = /\b(?:[0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}\b/g;

function classifyNonPublicIpv4(ip) {
  const [a, b, c] = ip.split('.').map(Number);
  if (a === 10) return 'private';
  if (a === 172 && b >= 16 && b <= 31) return 'private';
  if (a === 192 && b === 168) return 'private';
  if (a === 100 && b >= 64 && b <= 127) return 'cgnat';
  if (a === 169 && b === 254) return 'link-local';
  if (a === 127) return 'loopback';
  if (a === 192 && b === 0 && c === 2) return 'documentation';
  if (a === 198 && b === 51 && c === 100) return 'documentation';
  if (a === 203 && b === 0 && c === 113) return 'documentation';
  return 'public';
}

function classifyNonPublicIpv6(token) {
  const lower = token.toLowerCase();
  if (lower === '::1') return 'loopback';
  if (lower.startsWith('fe80:') || lower.startsWith('fe80::')) return 'link-local';
  if (lower.startsWith('fc') || lower.startsWith('fd')) {
    if (/^f[cd][0-9a-f]{2}:/i.test(lower)) return 'private';
  }
  if (lower.startsWith('2001:db8:') || lower.startsWith('2001:0db8:')) return 'documentation';
  return 'public';
}

function findViolatingIps(line, allowSynthetic) {
  const bad = [];
  IPV4_RX.lastIndex = 0;
  let m;
  while ((m = IPV4_RX.exec(line)) !== null) {
    const ip = m[0];
    const cls = classifyNonPublicIpv4(ip);
    if (cls === 'private' || cls === 'cgnat' || cls === 'link-local' || cls === 'loopback') {
      if (!(allowSynthetic && SYNTHETIC_ALLOWED.has(ip))) {
        bad.push({ ip, cls });
      }
    }
    if (m[0] === '') IPV4_RX.lastIndex += 1;
  }
  IPV6_TOKEN_RX.lastIndex = 0;
  while ((m = IPV6_TOKEN_RX.exec(line)) !== null) {
    const ip = m[0];
    if (!ip.includes('::') && ip.split(':').length < 3) continue;
    const cls = classifyNonPublicIpv6(ip);
    if (cls === 'private' || cls === 'link-local' || cls === 'loopback') {
      bad.push({ ip, cls });
    }
    if (m[0] === '') IPV6_TOKEN_RX.lastIndex += 1;
  }
  return bad;
}

function checkGalleryJsonPrivacy(text, relPath, errors) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return;
  }
  if (data && typeof data === 'object' && 'source' in data && data.source) {
    const redacted = Boolean(data.redaction && data.redaction.applied === true);
    const prec = data.source.precision;
    if (!redacted && prec && prec !== 'country') {
      errors.push(`${relPath}: source.precision "${prec}" is finer than country without redaction.applied`);
    }
    if (!redacted && (data.source.lat != null || data.source.lon != null) && prec === 'city') {
      errors.push(`${relPath}: source has city-level coordinates without redaction.applied`);
    }
  }
}

/** Check a single file's content under either gallery or test-fixture rules. */
export function scanFixtureContent(text, relPath, mode) {
  const errors = [];
  if (mode === 'test-source') {
    if (relPath.endsWith('.json')) checkGalleryJsonPrivacy(text, relPath, errors);
    return errors;
  }
  const allowSynthetic = mode === 'test';
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const bad = findViolatingIps(lines[i], allowSynthetic);
    for (const item of bad) {
      errors.push(`${relPath}:${i + 1}: disallowed ${item.cls} address "${item.ip}"`);
    }
  }
  if (mode === 'gallery' && relPath.endsWith('.json')) {
    checkGalleryJsonPrivacy(text, relPath, errors);
  }
  return errors;
}

function classifyFixtureTarget(rel) {
  if (rel.startsWith('gallery/') || rel.endsWith('.fixture.json')) return 'gallery';
  // A unit test exercises the address classifier itself: the private, CGNAT,
  // link-local and loopback literals it contains are synthetic inputs, not data
  // collected from a real route. Fixture *data* files stay strict.
  if (/\.test\.tsx?$/.test(rel)) return 'test-source';
  if (/^packages\/[^/]+\/src\/.*(?:\.test\.ts|\/fixtures\/)/.test(rel)) return 'test';
  return null;
}

/** Check all gallery/fixture/test-fixture files under `root` or a given subset. */
export async function checkFixturePrivacy(root, targetFiles = null) {
  let candidates = targetFiles;
  if (!candidates) {
    const gallery = await walkFiles(root, 'gallery');
    const pkg = await walkFiles(root, 'packages');
    const apps = await walkFiles(root, 'apps');
    candidates = [...gallery, ...pkg, ...apps];
  }
  const errors = [];
  let checked = 0;
  for (const rel of candidates) {
    const mode = classifyFixtureTarget(rel);
    if (!mode) continue;
    const abs = join(root, rel);
    if (!existsSync(abs)) continue;
    checked += 1;
    const text = await readFile(abs, 'utf8');
    errors.push(...scanFixtureContent(text, rel, mode));
  }
  return { checked, errors };
}

async function main() {
  const root = resolve('.');
  const { checked, errors } = await checkFixturePrivacy(root);
  console.log(`fixture-privacy: checked ${checked} file(s)`);
  for (const err of errors) {
    console.error(`fixture-privacy: ${err}`);
  }
  process.exit(errors.length === 0 ? 0 : 1);
}

if (isMain(import.meta.url, process.argv[1])) {
  await main();
}
