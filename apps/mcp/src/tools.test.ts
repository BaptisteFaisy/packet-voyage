import { describe, expect, it } from 'vitest';
import { checkVocabulary } from '@packet-voyage/core';
import type { Journey } from '@packet-voyage/schema';
import { createMcpServer } from './index.ts';

const SYNTHETIC_TRACE = [
  'traceroute to 203.0.113.10 (203.0.113.10), 30 hops max, 60 byte packets',
  ' 1  core1.par1.example.net (192.0.2.1)  1.200 ms  1.300 ms  1.400 ms',
  ' 2  edge1.lon1.example.net (198.51.100.2)  11.100 ms  11.200 ms  11.300 ms',
  ' 3  203.0.113.10 (203.0.113.10)  12.400 ms  12.500 ms  12.600 ms',
].join('\n');

const JOURNEY_A: Journey = {
  version: 1,
  traced_at: '2026-11-11T10:00:00.000Z',
  tool: 'traceroute',
  protocol: 'icmp',
  family: 4,
  source: { label: 'Paris', lat: 48.8566, lon: 2.3522, precision: 'city', declared: true },
  target: { host: 'api.example.com', ip: '203.0.113.10' },
  hops: [
    {
      ttl: 1,
      replies: [{ ip: '192.0.2.1', name: 'core1.par1.example.net', rtt_ms: [1.2] }],
      class: 'documentation',
      asn: 64501,
      as_name: 'Example Net A',
      envelope_ms: 1.2,
      location: {
        lat: 48.8566,
        lon: 2.3522,
        city: 'Paris',
        country: 'FR',
        confidence: 0.9,
        level: 'solid',
        sources: ['name-hint', 'geodb'],
        rejected: [],
      },
    },
    {
      ttl: 2,
      replies: [{ ip: '198.51.100.2', name: 'edge1.lon1.example.net', rtt_ms: [11.1] }],
      class: 'documentation',
      asn: 64502,
      as_name: 'Example Net B',
      envelope_ms: 11.1,
      location: {
        lat: 51.5074,
        lon: -0.1278,
        city: 'London',
        country: 'GB',
        confidence: 0.75,
        level: 'probable',
        sources: ['name-hint'],
        rejected: [
          {
            source: 'geodb',
            city: 'New York',
            country: 'US',
            reason: 'light',
            allowed_km: 1663,
            needed_km: 5837,
          },
        ],
      },
    },
  ],
  segments: [
    {
      from_ttl: 1,
      to_ttl: 2,
      kind: 'sea-or-fixed',
      geodesic_km: 343.5,
      delta_ms: 9.9,
      skipped_hops: 0,
      cables: [
        {
          id: 'crosschannel-1',
          name: 'CrossChannel Example',
          compatibility: 0.85,
          band: 'high',
          landings: ['Calais', 'Dover'],
          source: 'osm-cables',
        },
      ],
      other_cables: 1,
      fixed_link: 'Channel Tunnel',
    },
  ],
  summary: {
    distance_km_min: 343.5,
    rtt_ms: 11.1,
    light_floor_ms: 2.29,
    inflation: 4.85,
    countries: ['FR', 'GB'],
    networks: 2,
    ixps: 0,
    detours: [{ kind: 'country-return', ttls: [1, 2], detail: 'FR -> GB example' }],
    rejected_by_light: 1,
    gaps: 0,
  },
  credits: ['Synthetic test fixture'],
  redaction: null,
};

const JOURNEY_B: Journey = {
  ...JOURNEY_A,
  family: 6,
  target: { host: 'api.example.com', ip: '2001:db8::10' },
  summary: {
    distance_km_min: 890.2,
    rtt_ms: 24.6,
    light_floor_ms: 5.94,
    inflation: 4.14,
    countries: ['FR', 'DE', 'GB'],
    networks: 3,
    ixps: 1,
    detours: [],
    rejected_by_light: 0,
    gaps: 1,
  },
};

function payloadOf(res: { result?: unknown } | null): Record<string, unknown> {
  const result = res?.result as { content: Array<{ text: string }> };
  return JSON.parse(result.content[0]?.text ?? '{}') as Record<string, unknown>;
}

describe('read_trace offline', () => {
  it('parses a synthetic documentation-range trace without network', async () => {
    const server = createMcpServer({
      nowIso: () => '2026-11-11T10:00:00.000Z',
      datasets: {
        hints: [
          { code: 'par', city: 'Paris', country: 'FR', kind: 'airport', lat: 48.8566, lon: 2.3522 },
          { code: 'lon', city: 'London', country: 'GB', kind: 'airport', lat: 51.5074, lon: -0.1278 },
        ],
      },
    });
    const res = await server.handleMessage({
      jsonrpc: '2.0',
      id: 10,
      method: 'tools/call',
      params: {
        name: 'read_trace',
        arguments: {
          text: SYNTHETIC_TRACE,
          from: { label: 'Paris', lat: 48.8566, lon: 2.3522, country: 'FR' },
        },
      },
    });
    expect((res?.result as { isError?: boolean }).isError).toBeUndefined();
    const journey = payloadOf(res).journey as Journey;
    expect(journey.hops).toHaveLength(3);
    expect(journey.target.ip).toBe('203.0.113.10');
  });
});

describe('explain_journey certainty & vocabulary', () => {
  it('attaches certainty levels and passes checkVocabulary', async () => {
    const server = createMcpServer();
    const res = await server.handleMessage({
      jsonrpc: '2.0',
      id: 11,
      method: 'tools/call',
      params: { name: 'explain_journey', arguments: { journey: JOURNEY_A } },
    });
    expect((res?.result as { isError?: boolean }).isError).toBeUndefined();
    const payload = payloadOf(res) as {
      overview: { certainty: string; statement: string };
      stops: Array<{ certainty: string; statement: string }>;
      segments: Array<{ certainty: string; statement: string }>;
      detours: Array<{ certainty: string; statement: string }>;
      light_rejections: Array<{ certainty: string; statement: string }>;
    };

    expect(payload.overview.certainty).toBe('assumed');
    expect(payload.stops.every((s) => ['measured', 'inferred', 'assumed'].includes(s.certainty))).toBe(true);
    expect(payload.segments[0]?.certainty).toBe('assumed');
    expect(payload.detours[0]?.certainty).toBe('inferred');
    expect(payload.light_rejections[0]?.certainty).toBe('measured');

    const statements = [
      payload.overview.statement,
      ...payload.stops.map((s) => s.statement),
      ...payload.segments.map((s) => s.statement),
      ...payload.detours.map((d) => d.statement),
      ...payload.light_rejections.map((r) => r.statement),
    ];
    for (const sentence of statements) {
      expect(checkVocabulary(sentence)).toEqual({ ok: true, violations: [] });
    }
  });
});

describe('compare_journeys', () => {
  it('computes side-by-side summary differences', async () => {
    const server = createMcpServer();
    const res = await server.handleMessage({
      jsonrpc: '2.0',
      id: 12,
      method: 'tools/call',
      params: { name: 'compare_journeys', arguments: { a: JOURNEY_A, b: JOURNEY_B } },
    });
    expect((res?.result as { isError?: boolean }).isError).toBeUndefined();
    const diff = payloadOf(res).differences as {
      distance_km_min: { delta_km: number };
      rtt_ms: { delta_ms: number };
      inflation: { delta: number };
      countries: { only_in_b: string[]; shared: string[] };
      networks: { delta: number };
      detours: { delta_count: number };
      rejected_by_light: { delta: number };
    };

    expect(diff.distance_km_min.delta_km).toBe(546.7);
    expect(diff.rtt_ms.delta_ms).toBe(13.5);
    expect(diff.inflation.delta).toBe(-0.71);
    expect(diff.countries.only_in_b).toEqual(['DE']);
    expect(diff.countries.shared).toEqual(['FR', 'GB']);
    expect(diff.networks.delta).toBe(1);
    expect(diff.detours.delta_count).toBe(-1);
    expect(diff.rejected_by_light.delta).toBe(-1);
  });
});
