import type { Hop, Reply } from '@packet-voyage/schema';
import type { ParsedTrace, TraceFormat } from './types.ts';

function formatRttTraceroute(rtt: number, lt1ms: boolean): string {
  if (lt1ms && rtt <= 0.5) return '<1 ms';
  return `${rtt} ms`;
}

function formatRttTracert(rtt: number, lt1ms: boolean): string {
  if (lt1ms && rtt <= 0.5) return '<1 ms';
  return `${rtt} ms`;
}

function formatTracerouteReply(reply: Reply): string {
  if (reply.ip === '' && reply.rtt_ms.length === 0) return '*';
  const lt1ms = reply.flags?.includes('lt1ms') ?? false;
  const hostPart = reply.name && reply.name !== reply.ip
    ? `${reply.name} (${reply.ip})`
    : reply.ip;
  const delays = reply.rtt_ms.map((r) => formatRttTraceroute(r, lt1ms));
  const extraFlags = (reply.flags ?? []).filter((f) => f !== 'lt1ms' && f !== 'timeout' && f !== 'mpls');
  return [hostPart, ...delays, ...extraFlags].filter(Boolean).join('  ');
}

function writeTraceroute(trace: ParsedTrace): string {
  const host = trace.target?.host ?? 'unknown';
  const ip = trace.target?.ip ?? '0.0.0.0';
  const header = `traceroute to ${host} (${ip}), 30 hops max, 60 byte packets`;
  const lines = [header];

  for (const hop of trace.hops) {
    const parts = hop.replies.map((r) => formatTracerouteReply(r));
    lines.push(`${String(hop.ttl).padStart(2, ' ')}  ${parts.join('  ')}`);
    if (hop.mpls && hop.mpls.length > 0) {
      lines.push(`    MPLS ${hop.mpls.join(' ')}`);
    }
  }
  return lines.join('\n');
}

function formatTracertHop(hop: Hop): string {
  const ttlPrefix = `${String(hop.ttl).padStart(3, ' ')}`;
  const primary = hop.replies[0];
  if (!primary || (primary.ip === '' && primary.rtt_ms.length === 0)) {
    return `${ttlPrefix}     *        *        *     Request timed out.`;
  }
  const lt1ms = primary.flags?.includes('lt1ms') ?? false;
  const slots = [0, 1, 2].map((idx) => {
    const val = primary.rtt_ms[idx];
    if (val === undefined) return '*'.padStart(6, ' ');
    return formatRttTracert(val, lt1ms).padStart(6, ' ');
  });
  const dest = primary.name && primary.name !== primary.ip
    ? `${primary.name} [${primary.ip}]`
    : primary.ip;
  return `${ttlPrefix}  ${slots.join('  ')}  ${dest}`;
}

function writeTracert(trace: ParsedTrace): string {
  const host = trace.target?.host ?? 'unknown';
  const ip = trace.target?.ip ? ` [${trace.target.ip}]` : '';
  const lines = [
    `Tracing route to ${host}${ip}`,
    'over a maximum of 30 hops:',
    '',
    ...trace.hops.map(formatTracertHop),
  ];
  return lines.join('\n');
}

function writeMtrText(trace: ParsedTrace): string {
  const lines = ['Start: 2026-01-01T00:00:00+0000', 'HOST: host  Loss%   Snt   Last   Avg  Best  Wrst StDev'];
  for (const hop of trace.hops) {
    const primary = hop.replies[0];
    if (!primary || primary.ip === '') {
      lines.push(`${String(hop.ttl).padStart(3, ' ')}.|-- ???            100.0%    10    0.0   0.0   0.0   0.0   0.0`);
      continue;
    }
    const rtts = primary.rtt_ms;
    const avg = rtts.length > 0 ? rtts.reduce((a, b) => a + b, 0) / rtts.length : 0;
    const best = rtts.length > 0 ? Math.min(...rtts) : 0;
    const wrst = rtts.length > 0 ? Math.max(...rtts) : 0;
    const last = rtts[rtts.length - 1] ?? 0;
    const lossPct = ((primary.loss ?? 0) * 100).toFixed(1);
    const host = primary.ip;
    lines.push(
      `${String(hop.ttl).padStart(3, ' ')}.|-- ${host}  ${lossPct}%  10  ${last.toFixed(3)}  ${avg.toFixed(3)}  ${best.toFixed(3)}  ${wrst.toFixed(3)}  0.0`,
    );
  }
  return lines.join('\n');
}

function writeMtrJson(trace: ParsedTrace): string {
  const hubs = trace.hops.map((hop) => {
    const primary = hop.replies[0];
    if (!primary || primary.ip === '') {
      return {
        count: hop.ttl,
        host: '???',
        'Loss%': 100.0,
        Snt: 5,
        Last: 0,
        Avg: 0,
        Best: 0,
        Wrst: 0,
        StDev: 0,
      };
    }
    const rtts = primary.rtt_ms;
    const avg = rtts.length > 0 ? rtts.reduce((a, b) => a + b, 0) / rtts.length : 0;
    const best = rtts.length > 0 ? Math.min(...rtts) : 0;
    const wrst = rtts.length > 0 ? Math.max(...rtts) : 0;
    const last = rtts[rtts.length - 1] ?? 0;
    return {
      count: hop.ttl,
      host: primary.ip,
      'Loss%': (primary.loss ?? 0) * 100,
      Snt: 5,
      Last: last,
      Avg: avg,
      Best: best,
      Wrst: wrst,
      StDev: 0,
    };
  });
  return JSON.stringify({
    report: {
      mtr: { src: 'host', dst: trace.target?.host ?? 'unknown', tests: 5 },
      hubs,
    },
  });
}

function writeAtlas(trace: ParsedTrace): string {
  const result = trace.hops.map((hop) => {
    const probes: Record<string, unknown>[] = [];
    for (const reply of hop.replies) {
      if (reply.ip === '' && reply.rtt_ms.length === 0) {
        probes.push({ x: '*' });
        continue;
      }
      if (reply.rtt_ms.length === 0) {
        probes.push({ from: reply.ip });
        continue;
      }
      for (const rtt of reply.rtt_ms) {
        probes.push({ from: reply.ip, rtt });
      }
    }
    return probes;
  });
  return JSON.stringify({
    type: 'traceroute',
    af: trace.family,
    proto: trace.protocol === 'unknown' ? 'ICMP' : trace.protocol.toUpperCase(),
    dst_name: trace.target?.host ?? 'unknown',
    dst_addr: trace.target?.ip ?? undefined,
    result,
  });
}

/** Serialize a parsed trace back into a target format (VOY-P-01 round-trip). */
export function writeTrace(trace: ParsedTrace, format: TraceFormat): string {
  switch (format) {
    case 'traceroute':
      return writeTraceroute(trace);
    case 'tracert':
      return writeTracert(trace);
    case 'mtr-text':
      return writeMtrText(trace);
    case 'mtr-json':
      return writeMtrJson(trace);
    case 'atlas':
      return writeAtlas(trace);
    default:
      return writeTraceroute(trace);
  }
}
