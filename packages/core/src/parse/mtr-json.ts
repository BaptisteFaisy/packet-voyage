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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? roundRtt(value) : 0;
}

function hubToReplies(hub: Record<string, unknown>): Reply[] {
  const host = typeof hub['host'] === 'string' ? hub['host'] : '???';
  const lossPct = num(hub['Loss%']);
  const best = num(hub['Best']);
  const avg = num(hub['Avg']);
  const last = num(hub['Last']);

  if (host === '???' || host === '') return [makeTimeoutReply()];
  const parsed = parseAddress(host);
  if (!parsed) {
    return lossPct >= 100 ? [makeTimeoutReply()] : [{ ip: '', name: host, rtt_ms: [], flags: ['timeout'] }];
  }

  const rtts = [last, avg, best].filter((v) => v > 0);
  const reply: Reply = {
    ip: parsed.normalized,
    name: parsed.normalized !== host ? host : null,
    rtt_ms: rtts.length > 0 ? [rtts[0] ?? 0] : [],
    loss: Math.min(1, lossPct / 100),
  };
  if (reply.rtt_ms.length === 0) reply.flags = ['timeout'];
  return [reply];
}

function hubToHop(hub: Record<string, unknown>): Hop | null {
  const count = num(hub['count']);
  if (!Number.isInteger(count) || count <= 0) return null;
  const replies = hubToReplies(hub);
  return { ttl: count, replies, class: classifyHopReplies(replies) };
}

/** Parse mtr JSON output (`mtr --json`), VOY-F-01. */
export function parseMtrJson(json: unknown): ParsedTrace {
  const trace = createBaseTrace('mtr-json');
  trace.protocol = 'icmp';
  if (!isRecord(json)) {
    trace.warnings.push('mtr JSON: expected an object');
    return trace;
  }

  const report = isRecord(json['report']) ? json['report'] : json;
  const hubs = Array.isArray(report['hubs']) ? report['hubs'] : [];
  const mtr = isRecord(report['mtr']) ? report['mtr'] : null;

  if (mtr) {
    const dst = typeof mtr['dst'] === 'string' ? mtr['dst'] : null;
    if (dst) {
      trace.target = { host: dst, ip: parseAddress(dst)?.normalized ?? null } satisfies Target;
    }
  }

  for (const entry of hubs) {
    if (!isRecord(entry)) continue;
    const hop = hubToHop(entry);
    if (hop) trace.hops.push(hop);
  }

  trace.family = inferFamilyFromHops(trace.hops, trace.target?.ip);
  return trace;
}
