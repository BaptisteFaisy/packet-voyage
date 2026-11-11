import type { Hop, HopClass, Journey, Reply, Target } from '@packet-voyage/schema';
import { classifyAddress, parseAddress } from '../addr/index.ts';

export type TraceFormat =
  | 'traceroute'
  | 'tracert'
  | 'mtr-text'
  | 'mtr-json'
  | 'atlas'
  | 'unknown';

export interface ParsedTrace {
  format: TraceFormat;
  family: 4 | 6;
  protocol: 'icmp' | 'udp' | 'tcp' | 'unknown';
  tool: Journey['tool'];
  target?: Target | null;
  hops: Hop[];
  unknownLines: string[];
  warnings: string[];
}

export function toolForFormat(format: TraceFormat): Journey['tool'] {
  switch (format) {
    case 'traceroute':
      return 'traceroute';
    case 'tracert':
      return 'tracert';
    case 'mtr-text':
      return 'mtr';
    case 'mtr-json':
      return 'mtr-json';
    case 'atlas':
      return 'atlas';
    default:
      return 'unknown';
  }
}

export function makeTimeoutReply(): Reply {
  return { ip: '', rtt_ms: [], flags: ['timeout'] };
}

export function classifyHopReplies(replies: readonly Reply[]): HopClass {
  for (const reply of replies) {
    if (reply.ip !== '') {
      return classifyAddress(reply.ip);
    }
  }
  return 'reserved';
}

export function inferFamilyFromHops(hops: readonly Hop[], targetIp?: string | null): 4 | 6 {
  if (targetIp) {
    const parsed = parseAddress(targetIp);
    if (parsed) return parsed.family;
  }
  for (const hop of hops) {
    for (const reply of hop.replies) {
      if (reply.ip !== '') {
        const parsed = parseAddress(reply.ip);
        if (parsed) return parsed.family;
      }
    }
  }
  return 4;
}

export function createBaseTrace(format: TraceFormat): ParsedTrace {
  return {
    format,
    family: 4,
    protocol: 'unknown',
    tool: toolForFormat(format),
    target: null,
    hops: [],
    unknownLines: [],
    warnings: [],
  };
}

export function roundRtt(value: number): number {
  return Math.round(value * 1000) / 1000;
}
