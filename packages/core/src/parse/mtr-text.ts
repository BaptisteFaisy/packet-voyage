import type { Reply } from '@packet-voyage/schema';
import { parseAddress } from '../addr/index.ts';
import {
  classifyHopReplies,
  createBaseTrace,
  inferFamilyFromHops,
  makeTimeoutReply,
  roundRtt,
  type ParsedTrace,
} from './types.ts';

/**
 * mtr report line (`--report` / `--report-wide`):
 * `  3.|-- 198.51.100.9   0.0%    10    9.9   9.9    9.6   10.4   0.3`
 * `  4.|-- ???            100.0%  10    0.0   0.0    0.0    0.0   0.0`
 */
const MTR_LINE_RE =
  /^\s*(\d+)\.(?:\|--|-\?)?\s+(\S+)\s+(\d+(?:\.\d+)?)%\s+(\d+)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/;

function normalizeRttToken(token: string): number {
  return roundRtt(Number(token.replace(',', '.')));
}

function buildReply(host: string, lossPct: number, best: number, avg: number): Reply | null {
  if (host === '???' || host === '???') {
    return makeTimeoutReply();
  }
  const parsed = parseAddress(host);
  if (!parsed) {
    if (lossPct >= 100) return makeTimeoutReply();
    return null;
  }
  const reply: Reply = {
    ip: parsed.normalized,
    name: host.includes('.') && !/^[\d.]+$/.test(host) && parsed.normalized !== host ? host : null,
    rtt_ms: avg > 0 ? [roundRtt(avg)] : best > 0 ? [roundRtt(best)] : [],
    loss: Math.min(1, lossPct / 100),
  };
  if (reply.rtt_ms.length === 0) {
    reply.flags = ['timeout'];
  }
  return reply;
}

/** Parse an mtr text report (`--report`, `--report-wide`). */
export function parseMtrText(text: string): ParsedTrace {
  const trace = createBaseTrace('mtr-text');
  trace.protocol = 'icmp';
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed === '') continue;

    const match = MTR_LINE_RE.exec(trimmed);
    if (!match) {
      trace.unknownLines.push(rawLine);
      continue;
    }

    const [, ttlStr, host, lossStr, , , avgStr, bestStr] = match;
    const ttl = Number(ttlStr);
    const lossPct = Number(lossStr);
    const avg = normalizeRttToken(avgStr ?? '0');
    const best = normalizeRttToken(bestStr ?? '0');

    const reply = buildReply(host ?? '', lossPct, best, avg);
    if (!reply) {
      trace.unknownLines.push(rawLine);
      continue;
    }

    trace.hops.push({ ttl, replies: [reply], class: classifyHopReplies([reply]) });
  }

  trace.family = inferFamilyFromHops(trace.hops, trace.target?.ip);
  return trace;
}
