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

interface AtlasResultItem {
  from?: unknown;
  rtt?: unknown;
  x?: unknown;
  size?: unknown;
  mpls?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function atlasFlags(item: AtlasResultItem): string[] {
  const flags: string[] = [];
  if (typeof item.x === 'string') flags.push(item.x);
  return flags;
}

function itemToReplies(item: AtlasResultItem): { replies: Reply[]; mpls: string[] } {
  const mpls: string[] = [];
  if (Array.isArray(item.mpls)) {
    for (const label of item.mpls) {
      if (isRecord(label) && label['labels'] !== undefined) {
        mpls.push(JSON.stringify(label['labels']));
      } else if (typeof label === 'string' || typeof label === 'number') {
        mpls.push(String(label));
      }
    }
  }

  const fromRaw = typeof item.from === 'string' ? item.from : '';
  if (fromRaw === '' || fromRaw === '*') {
    const reply = makeTimeoutReply();
    if (typeof item.x === 'string') reply.flags?.push(item.x);
    return { replies: [reply], mpls };
  }

  const parsed = parseAddress(fromRaw);
  if (!parsed) {
    return { replies: [{ ip: '', name: fromRaw, rtt_ms: [], flags: ['timeout'] }], mpls };
  }

  const reply: Reply = { ip: parsed.normalized, name: null, rtt_ms: [] };
  if (typeof item.rtt === 'number' && Number.isFinite(item.rtt)) {
    reply.rtt_ms.push(roundRtt(item.rtt));
  } else {
    reply.flags = ['timeout'];
  }
  const flags = atlasFlags(item);
  if (flags.length > 0) reply.flags = [...(reply.flags ?? []), ...flags];
  return { replies: [reply], mpls };
}

function extractAtlasObject(json: unknown): Record<string, unknown> | null {
  if (isRecord(json) && Array.isArray(json['result'])) return json;
  if (Array.isArray(json)) {
    for (const entry of json) {
      if (isRecord(entry) && Array.isArray(entry['result'])) return entry;
    }
  }
  return null;
}

/** Parse a RIPE Atlas traceroute measurement result (VOY-F-05). */
export function parseAtlasResult(json: unknown): ParsedTrace {
  const trace = createBaseTrace('atlas');
  const atlas = extractAtlasObject(json);
  if (!atlas) {
    trace.warnings.push('Atlas JSON: no measurement with a `result` array found');
    return trace;
  }

  const dstName = typeof atlas['dst_name'] === 'string' ? atlas['dst_name'] : null;
  const dstAddr = typeof atlas['dst_addr'] === 'string' ? atlas['dst_addr'] : null;
  const targetHost = dstName ?? dstAddr ?? 'unknown';
  trace.target = { host: targetHost, ip: dstAddr ? parseAddress(dstAddr)?.normalized ?? dstAddr : null };

  const proto = typeof atlas['proto'] === 'string' ? atlas['proto'].toLowerCase() : 'unknown';
  trace.protocol = proto === 'icmp' || proto === 'udp' || proto === 'tcp' ? proto : 'unknown';
  if (typeof atlas['af'] === 'number') trace.family = atlas['af'] === 6 ? 6 : 4;

  const srcAddr = typeof atlas['src_addr'] === 'string' ? atlas['src_addr'] : null;
  if (srcAddr) trace.warnings.push(`Atlas probe source address: ${srcAddr} (kept for reference, never located)`);

  const result = atlas['result'];
  for (let i = 0; Array.isArray(result) && i < result.length; i += 1) {
    const probes = result[i];
    const replies: Reply[] = [];
    const hopMpls: string[] = [];
    if (Array.isArray(probes)) {
      for (const probe of probes) {
        if (!isRecord(probe)) continue;
        const { replies: itemReplies, mpls } = itemToReplies(probe as AtlasResultItem);
        replies.push(...itemReplies);
        hopMpls.push(...mpls);
      }
    }
    const hop = {
      ttl: i + 1,
      replies: replies.length > 0 ? replies : [makeTimeoutReply()],
      class: classifyHopReplies(replies),
      ...(hopMpls.length > 0 ? { mpls: hopMpls } : {}),
    };
    trace.hops.push(hop);
  }

  const declared = typeof atlas['af'] === 'number' ? (atlas['af'] === 6 ? 6 : 4) : null;
  trace.family = declared ?? inferFamilyFromHops(trace.hops, trace.target?.ip);
  return trace;
}
