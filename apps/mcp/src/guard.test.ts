import { describe, expect, it } from 'vitest';
import type { Journey } from '@packet-voyage/schema';
import { createMcpServer, MAX_TRACES_PER_SESSION } from './index.ts';
import { isSingleValidHost } from './guard.ts';

describe('isSingleValidHost (VOY-F-42, VOY-N-02)', () => {
  it('accepts single hostnames and addresses', () => {
    for (const host of [
      'api.example.com',
      'core1.par1.example.net',
      'my-host.example.org',
      '203.0.113.10',
      '2001:db8::10',
      '::1',
    ]) {
      expect(isSingleValidHost(host), host).toBe(true);
    }
  });

  it('refuses ranges, lists, options and malformed hosts', () => {
    for (const host of [
      '192.0.2.0/24',
      '192.0.2.1-10',
      '192.0.2.1-192.0.2.5',
      'a.example.com,b.example.com',
      'a.example.com b.example.com',
      '-n',
      '--fast',
      'host;rm',
      'host*wild',
      '',
      '   ',
      42,
      null,
      undefined,
    ]) {
      expect(isSingleValidHost(host), String(host)).toBe(false);
    }
  });
});

const SYNTHETIC_JOURNEY: Journey = {
  version: 1,
  traced_at: '2026-11-11T10:00:00.000Z',
  tool: 'traceroute',
  protocol: 'icmp',
  family: 4,
  source: { label: 'Paris', lat: 48.8566, lon: 2.3522, precision: 'city', declared: true },
  target: { host: 'api.example.com', ip: '203.0.113.10' },
  hops: [],
  segments: [],
  summary: {
    distance_km_min: 0,
    rtt_ms: 11.1,
    light_floor_ms: null,
    inflation: null,
    countries: [],
    networks: 0,
    ixps: 0,
    detours: [],
    rejected_by_light: 0,
    gaps: 0,
  },
  credits: [],
  redaction: null,
};

function payloadOf(res: { result?: unknown } | null): Record<string, unknown> {
  const result = res?.result as { content: Array<{ text: string }> };
  return JSON.parse(result.content[0]?.text ?? '{}') as Record<string, unknown>;
}

function traceReq(id: number, args: Record<string, unknown>) {
  return {
    jsonrpc: '2.0' as const,
    id,
    method: 'tools/call',
    params: { name: 'trace_host', arguments: args },
  };
}

describe('trace_host approval & host guards (VOY-N-02)', () => {
  it('VOY-N-02 refuses when approved is missing or false', async () => {
    let called = false;
    const server = createMcpServer({
      tracer: async () => {
        called = true;
        return { journey: SYNTHETIC_JOURNEY };
      },
    });
    const r1 = await server.handleMessage(traceReq(1, { host: '203.0.113.10' }));
    expect((r1?.result as { isError?: boolean }).isError).toBe(true);
    expect(payloadOf(r1).code).toBe('approval_required');

    const r2 = await server.handleMessage(traceReq(2, { host: '203.0.113.10', approved: false }));
    expect(payloadOf(r2).code).toBe('approval_required');
    expect(called).toBe(false);
  });

  it('VOY-N-02 refuses ranges, lists, and leading dashes', async () => {
    const server = createMcpServer({ tracer: async () => ({ journey: SYNTHETIC_JOURNEY }) });
    for (const host of ['192.0.2.0/24', '192.0.2.1-10', 'a.example,b.example', '-n', 'host 2']) {
      const res = await server.handleMessage(traceReq(1, { host, approved: true }));
      expect((res?.result as { isError?: boolean }).isError).toBe(true);
      expect(payloadOf(res).code).toBe('invalid_host');
    }
  });

  it('VOY-N-02 returns explicit unit-mode error when no live tracer is configured', async () => {
    const server = createMcpServer({ nowMs: () => 10_000 });
    const res = await server.handleMessage(traceReq(1, { host: '203.0.113.10', approved: true }));
    expect((res?.result as { isError?: boolean }).isError).toBe(true);
    expect(payloadOf(res).code).toBe('no_live_tracer');
  });
});

describe('trace_host cooldown (VOY-N-02)', () => {
  it('VOY-N-02 enforces 5 s cooldown with an injected clock', async () => {
    let clock = 100_000;
    const server = createMcpServer({
      nowMs: () => clock,
      tracer: async () => ({ journey: SYNTHETIC_JOURNEY, filePath: '/tmp/j.json' }),
    });

    const first = await server.handleMessage(traceReq(1, { host: '203.0.113.10', approved: true }));
    expect((first?.result as { isError?: boolean }).isError).toBeUndefined();

    clock += 3_000;
    const tooSoon = await server.handleMessage(traceReq(2, { host: '203.0.113.10', approved: true }));
    expect((tooSoon?.result as { isError?: boolean }).isError).toBe(true);
    expect(payloadOf(tooSoon).code).toBe('cooldown_active');
    expect(payloadOf(tooSoon).retryAfterSeconds).toBe(2);

    clock += 2_000;
    const ok = await server.handleMessage(traceReq(3, { host: '203.0.113.10', approved: true }));
    expect((ok?.result as { isError?: boolean }).isError).toBeUndefined();
  });
});

describe('trace_host session cap & concurrency (VOY-N-02)', () => {
  it('VOY-N-02 enforces max 20 traces per session', async () => {
    let clock = 1_000_000;
    const server = createMcpServer({
      nowMs: () => clock,
      tracer: async () => ({ journey: SYNTHETIC_JOURNEY }),
    });

    for (let i = 0; i < MAX_TRACES_PER_SESSION; i += 1) {
      const ok = await server.handleMessage(traceReq(i + 1, { host: '203.0.113.10', approved: true }));
      expect((ok?.result as { isError?: boolean }).isError).toBeUndefined();
      clock += 5_000;
    }

    const overCap = await server.handleMessage(traceReq(99, { host: '203.0.113.10', approved: true }));
    expect((overCap?.result as { isError?: boolean }).isError).toBe(true);
    expect(payloadOf(overCap).code).toBe('session_cap_reached');
  });

  it('VOY-N-02 allows only 1 trace in flight at a time', async () => {
    let clock = 50_000;
    let releaseFirst!: () => void;
    const pending = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const server = createMcpServer({
      nowMs: () => clock,
      tracer: async () => {
        await pending;
        return { journey: SYNTHETIC_JOURNEY };
      },
    });

    const p1 = server.handleMessage(traceReq(1, { host: '203.0.113.10', approved: true }));
    clock += 10_000;
    const p2 = await server.handleMessage(traceReq(2, { host: '203.0.113.10', approved: true }));
    expect((p2?.result as { isError?: boolean }).isError).toBe(true);
    expect(payloadOf(p2).code).toBe('trace_in_progress');

    releaseFirst();
    const r1 = await p1;
    expect((r1?.result as { isError?: boolean }).isError).toBeUndefined();
  });
});
