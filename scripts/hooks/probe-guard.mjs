/**
 * Kiro PreToolUse (`shell`) hook: probe-guard (§14.3, VOY-N-02).
 * Refuses any shell command containing `traceroute`, `tracert`, `mtr`, `ping`,
 * `nmap`, or `tracepath` whose target is not in `.kiro/probe-allowlist.txt`.
 */
import console from 'node:console';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { isMain } from '../guards/lib.mjs';
import { readHookPayload } from './hook-lib.mjs';

const PROBE_TOOLS = new Set(['traceroute', 'tracert', 'mtr', 'ping', 'nmap', 'tracepath']);

/** Minimal IP version detection without importing node:net (this is a guard). */
function ipVersion(ip) {
  const clean = ip.split('%')[0];
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(clean)) {
    return clean.split('.').every((p) => Number(p) <= 255) ? 4 : 0;
  }
  if (clean.includes(':') && /^[0-9a-fA-F:.]+$/.test(clean)) return 6;
  return 0;
}

function ipv4ToInt(ip) {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function expandIpv6(ip) {
  const zoneIdx = ip.indexOf('%');
  const clean = zoneIdx >= 0 ? ip.slice(0, zoneIdx) : ip;
  const halves = clean.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const missing = halves.length === 2 ? 8 - (left.length + right.length) : 0;
  if (missing < 0) return null;
  const full = [...left, ...new Array(missing).fill('0'), ...right];
  if (full.length !== 8) return null;
  let val = 0n;
  for (const grp of full) {
    val = (val << 16n) | BigInt(Number.parseInt(grp || '0', 16));
  }
  return val;
}

function ipInCidr(ip, cidr) {
  const [net, bitsStr] = cidr.split('/');
  const bits = Number(bitsStr);
  const ipVer = ipVersion(ip);
  const netVer = ipVersion(net);
  if (ipVer === 0 || ipVer !== netVer) return false;
  if (ipVer === 4) {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ipv4ToInt(ip) & mask) === (ipv4ToInt(net) & mask);
  }
  const a = expandIpv6(ip);
  const b = expandIpv6(net);
  if (a === null || b === null) return false;
  const max = (1n << 128n) - 1n;
  const mask = bits === 0 ? 0n : (max << BigInt(128 - bits)) & max;
  return (a & mask) === (b & mask);
}

/** Parse `.kiro/probe-allowlist.txt` into hostnames, IPs, and CIDRs. */
export function parseAllowlist(text) {
  const entries = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split('#')[0].trim().toLowerCase();
    if (line) entries.push(line);
  }
  return entries;
}

/** Check whether a target string matches an allowlist entry. */
export function isTargetAllowed(target, allowlist) {
  const clean = target.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!clean) return false;
  for (const entry of allowlist) {
    if (entry.includes('/')) {
      if (ipInCidr(clean, entry)) return true;
    } else if (clean === entry) {
      return true;
    }
  }
  return false;
}

function extractCommandTargets(cmd) {
  const segments = cmd.split(/[;&|\n]+/);
  const invocations = [];
  for (const seg of segments) {
    const tokens = seg.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    let idx = 0;
    while (idx < tokens.length && /^[A-Za-z_]\w*=/.test(tokens[idx])) idx += 1;
    if (tokens[idx] === 'sudo' || tokens[idx] === 'env' || tokens[idx] === 'command') idx += 1;
    const bin = (tokens[idx] ?? '').split('/').pop().toLowerCase();
    if (!PROBE_TOOLS.has(bin)) continue;
    const targets = [];
    for (let j = idx + 1; j < tokens.length; j += 1) {
      const tok = tokens[j];
      if (tok.startsWith('-')) {
        // Only the flags that really take a value swallow the next token:
        // `traceroute -n` and `tracert -d` mean "no DNS", and treating them as
        // `-n <value>` would eat the target and refuse a legitimate command.
        if (/^-[cqwfmspigtz]$/.test(tok) || /^--(cycles|queries|wait|interface|first|max|port|source|tos|length|packets)=?$/.test(tok)) {
          if (!tok.includes('=')) j += 1;
        }
        continue;
      }
      targets.push(tok);
    }
    invocations.push({ tool: bin, targets });
  }
  return invocations;
}

/** Evaluate a shell command string against the allowlist under `root`. */
export async function checkProbeCommand(root, command) {
  const invocations = extractCommandTargets(command);
  if (invocations.length === 0) return { allowed: true, reason: null };

  const allowPath = join(root, '.kiro/probe-allowlist.txt');
  const allowlist = existsSync(allowPath)
    ? parseAllowlist(await readFile(allowPath, 'utf8'))
    : ['localhost', '127.0.0.1', '::1'];

  for (const inv of invocations) {
    if (inv.targets.length === 0) {
      return { allowed: false, reason: `probe-guard: refused "${inv.tool}" with no explicit allowlisted target` };
    }
    for (const target of inv.targets) {
      if (!isTargetAllowed(target, allowlist)) {
        return {
          allowed: false,
          reason: `probe-guard: refused "${inv.tool} ${target}" — target is not in .kiro/probe-allowlist.txt (VOY-N-02)`,
        };
      }
    }
  }
  return { allowed: true, reason: null };
}

function extractCommandField(payload) {
  const input = payload.tool_input && typeof payload.tool_input === 'object' ? payload.tool_input : {};
  for (const key of ['command', 'cmd', 'script', 'input']) {
    if (typeof input[key] === 'string') return input[key];
  }
  return typeof payload.command === 'string' ? payload.command : '';
}

async function main() {
  const payload = await readHookPayload();
  const root = resolve(payload.cwd || '.');
  const command = extractCommandField(payload);
  const res = await checkProbeCommand(root, command);
  if (!res.allowed) {
    console.error(res.reason);
    process.exit(2);
  }
  process.exit(0);
}

if (isMain(import.meta.url, process.argv[1])) {
  await main();
}
