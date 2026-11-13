import type { Reply, Target } from '@packet-voyage/schema';
import { parseAddress } from '../addr/index.ts';
import {
  classifyHopReplies,
  createBaseTrace,
  inferFamilyFromHops,
  makeTimeoutReply,
  roundRtt,
  type ParsedTrace,
} from './types.ts';

const TRACERT_TARGET_RE =
  /^(?:tracing route to|détermination de l'itinéraire vers|routenverfolgung zu|traza a la dirección|rilevazione instradamento verso)\s+(\S+)(?:\s+\[([^\]]+)\])?/i;
const TRACERT_OVER_RE = /^(?:over a maximum of|avec un maximum de|über maximal)\b/i;
const TRACERT_DONE_RE = /^(?:trace complete\.?|itinéraire déterminé\.?|ablaufverfolgung beendet\.?)$/i;
const HOP_PREFIX_RE = /^\s*(\d+)\s+(.*)$/;
const PROBE_TOKEN_RE = /^(<\s*\d+\s*ms|\d+(?:[.,]\d+)?\s*ms|\*)/i;

function parseTargetLine(line: string): Target | null {
  const match = TRACERT_TARGET_RE.exec(line.trim());
  if (!match) return null;
  const first = match[1] ?? '';
  const bracketIp = match[2] ? parseAddress(match[2])?.normalized ?? match[2] : null;
  if (bracketIp) return { host: first, ip: bracketIp };
  const direct = parseAddress(first);
  return { host: first, ip: direct ? direct.normalized : null };
}

function parseProbeValue(token: string): { rtt: number | null; lt1ms: boolean } {
  const trimmed = token.trim();
  if (trimmed === '*') return { rtt: null, lt1ms: false };
  if (/^<\s*1\s*ms$/i.test(trimmed)) return { rtt: 0.5, lt1ms: true };
  if (trimmed.startsWith('<')) {
    const num = Number(trimmed.slice(1).replace(/ms/i, '').replace(',', '.').trim());
    return { rtt: Number.isFinite(num) ? (num <= 1 ? 0.5 : roundRtt(num)) : 0.5, lt1ms: true };
  }
  const num = Number(trimmed.replace(/ms/i, '').replace(',', '.').trim());
  return { rtt: Number.isFinite(num) ? roundRtt(num) : null, lt1ms: false };
}

function parseDestinationToken(rest: string): { ip: string; name: string | null } | null {
  const trimmed = rest.trim();
  if (trimmed === '') return null;
  const bracketMatch = /^(\S+)\s+\[([^\]]+)\]$/.exec(trimmed);
  if (bracketMatch) {
    const ip = parseAddress(bracketMatch[2] ?? '');
    if (ip) return { ip: ip.normalized, name: bracketMatch[1] ?? null };
  }
  const bare = parseAddress(trimmed);
  if (bare) return { ip: bare.normalized, name: null };
  return null;
}

function parseTracertHopLine(line: string): { ttl: number; replies: Reply[] } | null {
  const match = HOP_PREFIX_RE.exec(line);
  if (!match) return null;
  const ttl = Number(match[1]);
  let rest = (match[2] ?? '').trim();

  const rtts: number[] = [];
  const flags: string[] = [];
  let timeouts = 0;

  for (let probe = 0; probe < 3; probe += 1) {
    const tokMatch = PROBE_TOKEN_RE.exec(rest);
    if (!tokMatch) break;
    const parsed = parseProbeValue(tokMatch[1] ?? '');
    if (parsed.rtt === null) {
      timeouts += 1;
    } else {
      rtts.push(parsed.rtt);
      if (parsed.lt1ms && !flags.includes('lt1ms')) flags.push('lt1ms');
    }
    rest = rest.slice(tokMatch[0].length).trim();
  }

  if (rtts.length === 0 && timeouts === 0) return null;
  const dest = parseDestinationToken(rest);
  if (!dest) {
    if (timeouts > 0 && rtts.length === 0) {
      return { ttl, replies: [makeTimeoutReply()] };
    }
    return null;
  }

  const reply: Reply = { ip: dest.ip, name: dest.name, rtt_ms: rtts };
  if (flags.length > 0) reply.flags = flags;
  if (timeouts > 0) {
    reply.loss = Math.round((timeouts / (timeouts + rtts.length)) * 1000) / 1000;
  }
  return { ttl, replies: [reply] };
}

/** Parse Windows `tracert` text output (including localized timeout messages). */
export function parseTracert(text: string): ParsedTrace {
  const trace = createBaseTrace('tracert');
  trace.protocol = 'icmp';
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed === '') continue;

    if (!trace.target) {
      const target = parseTargetLine(trimmed);
      if (target) {
        trace.target = target;
        continue;
      }
    }

    if (TRACERT_OVER_RE.test(trimmed) || TRACERT_DONE_RE.test(trimmed)) continue;

    const hop = parseTracertHopLine(rawLine);
    if (hop) {
      trace.hops.push({
        ttl: hop.ttl,
        replies: hop.replies,
        class: classifyHopReplies(hop.replies),
      });
      continue;
    }

    trace.unknownLines.push(rawLine);
  }

  trace.family = inferFamilyFromHops(trace.hops, trace.target?.ip);
  return trace;
}
