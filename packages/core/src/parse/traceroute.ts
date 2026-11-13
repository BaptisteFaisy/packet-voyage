import type { Hop, Reply, Target } from '@packet-voyage/schema';
import { parseAddress } from '../addr/index.ts';
import {
  classifyHopReplies,
  createBaseTrace,
  inferFamilyFromHops,
  makeTimeoutReply,
  roundRtt,
  type ParsedTrace,
} from './types.ts';

const HEADER_RE = /^traceroute6?\s+to\s+(\S+)\s+\(([^)]+)\)/i;
const MPLS_RE = /^\s*MPLS\s+(.*)$/i;
const HOP_START_RE = /^\s*(\d+)\s+(.*)$/;
const FLAG_SET = new Set(['!H', '!N', '!P', '!S', '!F', '!X', '!Z', '!V', '!C']);

function parseHeaderTarget(line: string): Target | null {
  const match = HEADER_RE.exec(line.trim());
  if (!match) return null;
  const host = match[1] ?? '';
  const rawIp = match[2] ?? '';
  const parsed = parseAddress(rawIp);
  return { host, ip: parsed ? parsed.normalized : rawIp };
}

function parseMplsLabels(line: string): string[] | null {
  const match = MPLS_RE.exec(line);
  if (!match) return null;
  const body = match[1]?.trim() ?? '';
  if (body === '') return [];
  return body.split(/\s*;\s*|\s+(?=Label=)/i).map((s) => s.trim()).filter(Boolean);
}

function extractParenIp(token: string): string | null {
  if (!token.startsWith('(') || !token.endsWith(')')) return null;
  const inner = token.slice(1, -1);
  return parseAddress(inner)?.normalized ?? null;
}

function findOrCreateReply(replies: Reply[], ip: string, name: string | null): Reply {
  const existing = replies.find((r) => r.ip === ip && (r.name ?? null) === name);
  if (existing) return existing;
  const created: Reply = { ip, name, rtt_ms: [] };
  replies.push(created);
  return created;
}

function pushFlag(reply: Reply, flag: string): void {
  if (!reply.flags) reply.flags = [];
  if (!reply.flags.includes(flag)) reply.flags.push(flag);
}

function parseDelayStep(
  tok: string,
  next: string,
): { rtt: number; lt1ms: boolean; step: number } | null {
  if (tok === '<1' && next.toLowerCase() === 'ms') {
    return { rtt: 0.5, lt1ms: true, step: 2 };
  }
  if (/^<\d+(?:\.\d+)?$/.test(tok) && next.toLowerCase() === 'ms') {
    const val = Number(tok.slice(1));
    return { rtt: val <= 1 ? 0.5 : roundRtt(val), lt1ms: true, step: 2 };
  }
  if (/^<\d+(?:\.\d+)?ms$/i.test(tok)) {
    const val = Number(tok.slice(1, -2));
    return { rtt: val <= 1 ? 0.5 : roundRtt(val), lt1ms: true, step: 1 };
  }
  if (/^\d+(?:\.\d+)?$/.test(tok) && next.toLowerCase() === 'ms') {
    return { rtt: roundRtt(Number(tok)), lt1ms: false, step: 2 };
  }
  if (/^\d+(?:\.\d+)?ms$/i.test(tok)) {
    return { rtt: roundRtt(Number(tok.slice(0, -2))), lt1ms: false, step: 1 };
  }
  return null;
}

function buildProbeLoss(replies: Reply[], timeouts: number): { replies: Reply[]; ok: boolean } {
  if (replies.length === 0 && timeouts > 0) {
    return { replies: [makeTimeoutReply()], ok: true };
  }
  if (replies.length > 0 && timeouts > 0) {
    const totalProbes = timeouts + replies.reduce((sum, r) => sum + Math.max(r.rtt_ms.length, 1), 0);
    const first = replies[0];
    if (first) first.loss = Math.round((timeouts / totalProbes) * 1000) / 1000;
  }
  return { replies, ok: replies.length > 0 };
}

function consumeTokens(tokens: string[]): { replies: Reply[]; ok: boolean } {
  const replies: Reply[] = [];
  let current: Reply | null = null;
  let timeouts = 0;

  for (let i = 0; i < tokens.length; ) {
    const tok = tokens[i] ?? '';
    const next = tokens[i + 1] ?? '';

    if (tok === '*') {
      timeouts += 1;
      i += 1;
      continue;
    }

    const delay = parseDelayStep(tok, next);
    if (delay) {
      if (!current) current = findOrCreateReply(replies, '', null);
      current.rtt_ms.push(delay.rtt);
      if (delay.lt1ms) pushFlag(current, 'lt1ms');
      i += delay.step;
      continue;
    }

    if (FLAG_SET.has(tok) || /^!\d+$/.test(tok)) {
      if (!current) current = findOrCreateReply(replies, '', null);
      pushFlag(current, tok);
      i += 1;
      continue;
    }

    const parenIp = extractParenIp(next);
    if (parenIp) {
      current = findOrCreateReply(replies, parenIp, tok === parenIp ? null : tok);
      i += 2;
      continue;
    }

    const bareIp = parseAddress(tok);
    if (bareIp) {
      current = findOrCreateReply(replies, bareIp.normalized, null);
      i += 1;
      continue;
    }

    return { replies: [], ok: false };
  }

  return buildProbeLoss(replies, timeouts);
}

function attachMplsToPrevious(hops: Hop[], labels: string[]): void {
  const prev = hops[hops.length - 1];
  if (!prev) return;
  prev.mpls = [...(prev.mpls ?? []), ...labels];
  const firstReply = prev.replies[0];
  if (firstReply) pushFlag(firstReply, 'mpls');
}

function mergeRepliesIntoHop(hop: Hop, replies: Reply[]): void {
  for (const r of replies) {
    if (r.ip === '' && hop.replies.some((ex) => ex.ip !== '')) continue;
    if (r.ip !== '' && hop.replies.length === 1 && hop.replies[0]?.ip === '') {
      hop.replies = [r];
      continue;
    }
    const existing = hop.replies.find((ex) => ex.ip === r.ip && (ex.name ?? null) === (r.name ?? null));
    if (existing) {
      existing.rtt_ms.push(...r.rtt_ms);
      for (const f of r.flags ?? []) pushFlag(existing, f);
    } else {
      hop.replies.push(r);
    }
  }
  hop.class = classifyHopReplies(hop.replies);
}

function parseHopLine(line: string, hops: Hop[]): boolean {
  const match = HOP_START_RE.exec(line);
  if (match) {
    const ttl = Number(match[1]);
    const rest = (match[2] ?? '').trim();
    if (rest === '') return false;
    const { replies, ok } = consumeTokens(rest.split(/\s+/));
    if (!ok) return false;
    const existing = hops.find((h) => h.ttl === ttl);
    if (existing) {
      mergeRepliesIntoHop(existing, replies);
    } else {
      hops.push({ ttl, replies, class: classifyHopReplies(replies) });
    }
    return true;
  }

  if (/^\s+\S+/.test(line) && hops.length > 0) {
    const { replies, ok } = consumeTokens(line.trim().split(/\s+/));
    if (!ok) return false;
    const prev = hops[hops.length - 1];
    if (prev) mergeRepliesIntoHop(prev, replies);
    return true;
  }
  return false;
}

/** Parse standard Linux/macOS/BSD traceroute output. */
export function parseTraceroute(text: string): ParsedTrace {
  const trace = createBaseTrace('traceroute');
  trace.protocol = 'udp';
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed === '') continue;

    if (!trace.target) {
      const target = parseHeaderTarget(trimmed);
      if (target) {
        trace.target = target;
        continue;
      }
    }

    if (/^traceroute6?\s+/i.test(trimmed)) continue;

    const mpls = parseMplsLabels(trimmed);
    if (mpls && trace.hops.length > 0) {
      attachMplsToPrevious(trace.hops, mpls);
      continue;
    }

    if (parseHopLine(rawLine, trace.hops)) continue;
    trace.unknownLines.push(rawLine);
    trace.warnings.push(`Unrecognized traceroute line: ${trimmed}`);
  }

  trace.family = inferFamilyFromHops(trace.hops, trace.target?.ip);
  return trace;
}
