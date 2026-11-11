import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Hop, Reply } from '@packet-voyage/schema';
import { classifyAddress } from '../addr/index.ts';
import {
  detectFormat,
  parseAtlasResult,
  parseTrace,
  writeTrace,
  type ParsedTrace,
  type TraceFormat,
} from './index.ts';

const SAMPLE_TRACEROUTE = `traceroute to www.example.org (203.0.113.80), 30 hops max, 60 byte packets
 1  192.168.1.1  1.412 ms  1.207 ms  1.388 ms
 2  100.64.0.1  5.102 ms  4.811 ms  4.960 ms
 3  be10.par2.isp.example (198.51.100.1)  9.412 ms  9.102 ms  9.377 ms
 4  ix-paris.transit.example.net (198.51.100.9)  9.911 ms  9.604 ms  10.402 ms
 5  ae3.lon1.transit.example.net (198.51.100.21)  15.208 ms  14.903 ms  15.411 ms
 6  ae7.lon4.transit.example.net (198.51.100.25)  13.992 ms  13.801 ms  14.120 ms
 7  be2.nyc2.transit.example.net (198.51.100.41)  88.702 ms  88.404 ms  89.015 ms
 8  be5.nyc5.transit.example.net (198.51.100.45)  87.204 ms  86.903 ms  87.411 ms
 9  xe0.iad3.host.example.com (203.0.113.1)  92.611 ms  92.304 ms  92.870 ms
10  www.example.org (203.0.113.80)  91.902 ms  91.702 ms  92.015 ms`;

const SAMPLE_TRACERT = `Tracing route to www.example.org [203.0.113.80]
over a maximum of 30 hops:

  1     1 ms     1 ms     1 ms  192.168.1.1
  2     5 ms     4 ms     5 ms  100.64.0.1
  3     *        *        *     Request timed out.
  4    10 ms     9 ms    10 ms  ix-paris.transit.example.net [198.51.100.9]`;

const SAMPLE_MTR_TEXT = `Start: 2026-10-01T12:00:00+0000
HOST: localhost                   Loss%   Snt   Last   Avg  Best  Wrst StDev
  1.|-- 192.168.1.1                0.0%    10    1.2   1.3   1.1   1.6   0.1
  2.|-- ???                       100.0%   10    0.0   0.0   0.0   0.0   0.0
  3.|-- 198.51.100.9               0.0%    10    9.9   9.9   9.6  10.4   0.3`;

const SAMPLE_MTR_JSON = JSON.stringify({
  report: {
    mtr: { src: 'host', dst: 'www.example.org', tests: 5 },
    hubs: [
      { count: 1, host: '192.168.1.1', 'Loss%': 0.0, Snt: 5, Last: 1.2, Avg: 1.3, Best: 1.1, Wrst: 1.5, StDev: 0.1 },
      { count: 2, host: '???', 'Loss%': 100.0, Snt: 5, Last: 0, Avg: 0, Best: 0, Wrst: 0, StDev: 0 },
      { count: 4, host: '198.51.100.9', 'Loss%': 0.0, Snt: 5, Last: 9.9, Avg: 9.9, Best: 9.6, Wrst: 10.4, StDev: 0.3 },
    ],
  },
});

const SAMPLE_ATLAS = {
  type: 'traceroute',
  af: 4,
  proto: 'ICMP',
  dst_name: 'www.example.org',
  dst_addr: '203.0.113.80',
  result: [
    [{ from: '192.168.1.1', rtt: 1.2 }, { from: '192.168.1.1', rtt: 1.4 }],
    [{ x: '*' }, { x: '*' }],
    [{ from: '198.51.100.9', rtt: 9.6, mpls: [{ labels: [12345] }] }],
  ],
};

describe('detectFormat', () => {
  it('detects all five supported formats and unknown', () => {
    expect(detectFormat(SAMPLE_TRACEROUTE)).toBe('traceroute');
    expect(detectFormat(SAMPLE_TRACERT)).toBe('tracert');
    expect(detectFormat(SAMPLE_MTR_TEXT)).toBe('mtr-text');
    expect(detectFormat(SAMPLE_MTR_JSON)).toBe('mtr-json');
    expect(detectFormat(JSON.stringify(SAMPLE_ATLAS))).toBe('atlas');
    expect(detectFormat('hello world\nnot a trace')).toBe('unknown');
    expect(detectFormat('')).toBe('unknown');
  });
});

describe('parseTrace across Annexe B samples (text formats)', () => {
  it('parses Linux traceroute with names, classes and delays (VOY-F-01, VOY-F-06)', () => {
    const parsed = parseTrace(SAMPLE_TRACEROUTE);
    expect(parsed.format).toBe('traceroute');
    expect(parsed.family).toBe(4);
    expect(parsed.target).toEqual({ host: 'www.example.org', ip: '203.0.113.80' });
    expect(parsed.hops).toHaveLength(10);
    expect(parsed.hops[0]?.class).toBe('private');
    expect(parsed.hops[1]?.class).toBe('cgnat');
    expect(parsed.hops[2]?.replies[0]).toMatchObject({
      ip: '198.51.100.1',
      name: 'be10.par2.isp.example',
      rtt_ms: [9.412, 9.102, 9.377],
    });
    expect(parsed.hops[9]?.replies[0]?.ip).toBe('203.0.113.80');
  });

  it('parses traceroute special cases: <1 ms, !H/!N/!X, multi-reply, MPLS, IPv6 (VOY-F-03, VOY-F-04)', () => {
    const trace = [
      'traceroute to 2001:db8::80 (2001:db8::80), 30 hops max, 80 byte packets',
      ' 1  gw.example (2001:db8::1)  <1 ms  0.412 ms  0.501 ms',
      ' 2  core-a.example (2001:db8::2)  4.100 ms  core-b.example (2001:db8::3)  5.200 ms !X',
      '    MPLS Label=24015 Exp=0 S=1 TTL=1',
      ' 3  * * *',
    ].join('\n');

    const parsed = parseTrace(trace);
    expect(parsed.family).toBe(6);
    expect(parsed.hops[0]?.replies[0]?.rtt_ms).toEqual([0.5, 0.412, 0.501]);
    expect(parsed.hops[0]?.replies[0]?.flags).toContain('lt1ms');
    expect(parsed.hops[1]?.replies).toHaveLength(2);
    expect(parsed.hops[1]?.replies[1]?.flags).toContain('!X');
    expect(parsed.hops[1]?.mpls).toEqual(['Label=24015 Exp=0 S=1 TTL=1']);
    expect(parsed.hops[2]?.replies[0]?.flags).toContain('timeout');
  });

  it('parses Windows tracert with <1 ms and silent hop', () => {
    const tracertLt1 = `${SAMPLE_TRACERT}\n  5    <1 ms    <1 ms     1 ms  203.0.113.5`;
    const parsed = parseTrace(tracertLt1);
    expect(parsed.format).toBe('tracert');
    expect(parsed.hops).toHaveLength(5);
    expect(parsed.hops[2]?.replies[0]?.flags).toContain('timeout');
    expect(parsed.hops[3]?.replies[0]?.name).toBe('ix-paris.transit.example.net');
    expect(parsed.hops[4]?.replies[0]?.rtt_ms).toEqual([0.5, 0.5, 1]);
    expect(parsed.hops[4]?.replies[0]?.flags).toContain('lt1ms');
  });

});

describe('parseTrace across Annexe B samples (reports)', () => {
  it('parses mtr text report with ??? silent hops', () => {
    const parsed = parseTrace(SAMPLE_MTR_TEXT);
    expect(parsed.format).toBe('mtr-text');
    expect(parsed.hops).toHaveLength(3);
    expect(parsed.hops[1]?.replies[0]?.flags).toContain('timeout');
    expect(parsed.hops[2]?.replies[0]?.rtt_ms).toEqual([9.9]);
  });

  it('parses mtr JSON report', () => {
    const parsed = parseTrace(SAMPLE_MTR_JSON);
    expect(parsed.format).toBe('mtr-json');
    expect(parsed.target?.host).toBe('www.example.org');
    expect(parsed.hops).toHaveLength(3);
    expect(parsed.hops[1]?.replies[0]?.flags).toContain('timeout');
    expect(parsed.hops[2]?.ttl).toBe(4);
    expect(parsed.hops[2]?.replies[0]?.ip).toBe('198.51.100.9');
  });

  it('parses RIPE Atlas JSON (VOY-F-05)', () => {
    const parsed = parseAtlasResult(SAMPLE_ATLAS);
    expect(parsed.format).toBe('atlas');
    expect(parsed.protocol).toBe('icmp');
    expect(parsed.hops).toHaveLength(3);
    expect(parsed.hops[0]?.replies).toHaveLength(2);
    expect(parsed.hops[1]?.replies[0]?.flags).toContain('timeout');
    expect(parsed.hops[2]?.mpls).toEqual(['[12345]']);
  });

  it('keeps first unrecognized line when format is unknown (VOY-F-02)', () => {
    const parsed = parseTrace('not a valid trace line\nsecond line');
    expect(parsed.format).toBe('unknown');
    expect(parsed.hops).toEqual([]);
    expect(parsed.unknownLines).toEqual(['not a valid trace line']);
  });
});

function roundTripHopArb(): fc.Arbitrary<Hop[]> {
  const ipArb = fc.tuple(
    fc.constantFrom(192, 198, 203, 10),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 1, max: 254 }),
  ).map(([a, b, c]) => (a === 192 ? `192.0.2.${c}` : a === 198 ? `198.51.100.${c}` : a === 203 ? `203.0.113.${c}` : `10.${b}.1.${c}`));

  const rttArb = fc.integer({ min: 1, max: 25000 }).map((n) => Math.round((n / 100) * 100) / 100);
  const hopSpec = fc.record({
    silent: fc.boolean(),
    ip: ipArb,
    rtt: rttArb,
  });

  return fc.array(hopSpec, { minLength: 1, maxLength: 8 }).map((specs) =>
    specs.map((spec, idx): Hop => {
      const reply: Reply = spec.silent
        ? { ip: '', rtt_ms: [], flags: ['timeout'] }
        : { ip: spec.ip, name: null, rtt_ms: [spec.rtt] };
      return {
        ttl: idx + 1,
        replies: [reply],
        class: spec.silent ? 'reserved' : classifyAddress(spec.ip),
      };
    }),
  );
}

describe('parse properties', () => {
  it('VOY-P-01 round-trip parsing preserves hops and delays', () => {
    const formats: TraceFormat[] = ['traceroute', 'tracert', 'mtr-text', 'mtr-json', 'atlas'];

    fc.assert(
      fc.property(roundTripHopArb(), fc.constantFrom(...formats), (hops, format) => {
        const input: ParsedTrace = {
          format,
          family: 4,
          protocol: 'icmp',
          tool: format === 'mtr-text' ? 'mtr' : format === 'unknown' ? 'unknown' : format,
          target: { host: 'www.example.org', ip: '203.0.113.80' },
          hops,
          unknownLines: [],
          warnings: [],
        };

        const serialized = writeTrace(input, format);
        const reparsed = parseTrace(serialized);

        expect(reparsed.format).toBe(format);
        expect(reparsed.hops).toHaveLength(hops.length);
        for (let i = 0; i < hops.length; i += 1) {
          const orig = hops[i]!;
          const got = reparsed.hops[i]!;
          expect(got.ttl).toBe(orig.ttl);
          expect(got.replies[0]?.ip).toBe(orig.replies[0]?.ip);
          expect(got.replies[0]?.rtt_ms).toEqual(orig.replies[0]?.rtt_ms);
        }
      }),
    );
  });

  it('VOY-P-02 parseTrace never throws on arbitrary input', () => {
    fc.assert(
      fc.property(fc.string(), (arbitrary) => {
        const result = parseTrace(arbitrary);
        expect(Array.isArray(result.hops)).toBe(true);
        expect(Array.isArray(result.unknownLines)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
      }),
    );
  });
});
