import { describe, expect, it } from 'vitest';
import {
  createCannedFetcher,
  createFakeFetcher,
  publicAddress,
  type FakeFetcher,
} from './fixtures/fake.ts';
import {
  DENIED,
  hopOf,
  ixpEntry,
  onlineOptions,
  prefixOf,
  publicHop,
  silentHop,
} from './fixtures/harness.ts';
import { enrichHops } from './orchestrator.ts';
import type { EnrichOptions } from './types.ts';

function callsOf(o: EnrichOptions): FakeFetcher['calls'] {
  return (o.fetch as FakeFetcher).calls;
}

describe('VOY-F-08 enrichHops network', () => {
  it('VOY-F-08 fills ASN, AS name and prefix for a public hop', async () => {    const ip = publicAddress(7);
    const res = await enrichHops([hopOf(1, ip)], onlineOptions());
    expect(res.hops[0]?.asn).toBeTypeOf('number');
    expect(res.hops[0]?.as_name).toMatch(/^EXAMPLE-AS-/);
    expect(res.hops[0]?.prefix).toBe(prefixOf(ip));
  });

  it('VOY-F-08 prefers the local DB and skips RIPEstat entirely when it has the ASN', async () => {    const o = onlineOptions(undefined, {
      localDb: { lookup: () => ({ asn: 64500, as_name: 'LOCAL-AS', prefix: '5.0.0.0/8' }) },
    });
    const res = await enrichHops([publicHop(1, 7)], o);
    expect(res.hops[0]?.asn).toBe(64500);
    expect(callsOf(o).some((c) => c.url.includes('stat.ripe.net'))).toBe(false);
  });

  it('VOY-F-08 handles remote 5xx by setting asn to null and recording missing', async () => {    const o = onlineOptions(undefined, { fetch: createCannedFetcher({ status: 500 }) });
    const res = await enrichHops([publicHop(1, 7)], o);
    expect(res.hops[0]?.asn).toBeNull();
    expect(res.missing.some((m) => m.startsWith('ripestat:'))).toBe(true);
  });
});

describe('VOY-F-11 offline still uses the local bases', () => {
  it('VOY-F-11 fills ASN, AS name and a geodb candidate offline from localDb', async () => {    const ip = publicAddress(7);
    const o = onlineOptions(undefined, {
      offline: true,
      localDb: {
        lookup: () => ({
          asn: 64500,
          as_name: 'LOCAL-AS',
          prefix: prefixOf(ip),
          city: 'Paris',
          country: 'FR',
          lat: 48.8566,
          lon: 2.3522,
        }),
      },
    });
    const res = await enrichHops([hopOf(1, ip)], o);
    expect(callsOf(o)).toHaveLength(0);
    expect(res.hops[0]?.asn).toBe(64500);
    expect(res.hops[0]?.as_name).toBe('LOCAL-AS');
    const geodb = res.candidates[0]?.find((c) => c.source === 'geodb');
    expect(geodb?.weight).toBe(0.3);
    expect(geodb?.city).toBe('Paris');
    expect(res.sentAddresses).toEqual([]);
  });

  it('VOY-F-11 uses the injected IXP prefixes offline and marks the hop', async () => {    const ip = publicAddress(9);
    const o = onlineOptions(undefined, { offline: true, ixpPrefixes: [ixpEntry(ip)] });
    const res = await enrichHops([hopOf(1, ip)], o);
    expect(res.hops[0]?.ixp).toBe('EXAMPLE-IX');
    expect(res.candidates[0]?.some((c) => c.source === 'ixp-prefix')).toBe(true);
  });
});

describe('VOY-F-10 IXP facilities', () => {
  it('VOY-F-10 emits one ixp-prefix candidate per facility of the matched IXP', async () => {    const ip = publicAddress(9);
    const o = onlineOptions(undefined, {
      ixpPrefixes: [
        {
          ix_id: 7,
          name: 'TWO-SITE-IX',
          prefix: prefixOf(ip),
          facilities: [
            { name: 'SITE-A', city: 'Paris', country: 'FR', lat: 48.85, lon: 2.35 },
            { name: 'SITE-B', city: 'Lyon', country: 'FR', lat: 45.76, lon: 4.84 },
          ],
        },
      ],
    });
    const res = await enrichHops([hopOf(1, ip)], o);
    const ixpCandidates = res.candidates[0]?.filter((c) => c.source === 'ixp-prefix') ?? [];
    expect(ixpCandidates.map((c) => c.city)).toEqual(['Lyon', 'Paris']);
    expect(res.hops[0]?.ixp).toBe('TWO-SITE-IX');
  });
});

describe('VOY-F-09 enrichHops reverse DNS', () => {
  it('VOY-F-09 resolves a name when the trace has none', async () => {    const o = onlineOptions(undefined, { reverseResolver: async () => ['edge1.par.example.net'] });
    const res = await enrichHops([publicHop(1, 7)], o);
    expect(res.hops[0]?.replies[0]?.name).toBe('edge1.par.example.net');
  });

  it('VOY-F-09 keeps the name the trace already carries and skips resolution', async () => {    let asked = false;
    const o = onlineOptions(undefined, {
      reverseResolver: async () => {
        asked = true;
        return ['other.example.net'];
      },
    });
    const res = await enrichHops([publicHop(1, 7, 'given.example.net')], o);
    expect(res.hops[0]?.replies[0]?.name).toBe('given.example.net');
    expect(asked).toBe(false);
  });

  it('VOY-F-09 makes no reverse lookup under --offline (VOY-F-11)', async () => {    let asked = false;
    const ip = publicAddress(7);
    const o = onlineOptions(undefined, {
      offline: true,
      reverseResolver: async () => {
        asked = true;
        return ['x.example.net'];
      },
    });
    const res = await enrichHops([hopOf(1, ip)], o);
    expect(asked).toBe(false);
    expect(res.missing).toContain(`rdns:${ip}`);
  });
});

describe('VOY-F-10 enrichHops IXP marking', () => {
  it('VOY-F-10 marks the hop and names the IXP when the address is in an IXP prefix', async () => {    const ip = publicAddress(9);
    const o = onlineOptions(undefined, { ixpPrefixes: [ixpEntry(ip)] });
    const res = await enrichHops([hopOf(2, ip)], o);
    expect(res.hops[0]?.ixp).toBe('EXAMPLE-IX');
    const ixpCandidate = res.candidates[0]?.find((c) => c.source === 'ixp-prefix');
    expect(ixpCandidate?.weight).toBe(0.8);
    expect(ixpCandidate?.city).toBe('Amsterdam');
  });

  it('VOY-F-10 leaves a hop outside every IXP prefix unmarked', async () => {    const o = onlineOptions(undefined, { ixpPrefixes: [ixpEntry(publicAddress(1234), 'OTHER-IX')] });
    const res = await enrichHops([publicHop(1, 7)], o);
    expect(res.hops[0]?.ixp).toBeNull();
  });

  it('VOY-F-10 downloads the IXP directory once per run (PeeringDB, live only)', async () => {    const o = onlineOptions();
    await enrichHops([publicHop(1, 7), publicHop(2, 8)], o);
    const peeringdbCalls = callsOf(o).filter((c) => c.url.includes('peeringdb.com'));
    expect(peeringdbCalls).toHaveLength(1);
  });
});

describe('VOY-F-20 enrichHops anycast', () => {
  it('VOY-F-20 flags an anycast address from the IPmap indicator', async () => {    const o = onlineOptions(undefined, { fetch: createCannedFetcher({ anycast: true }) });
    const res = await enrichHops([publicHop(1, 7)], o);
    expect(res.hops[0]?.anycast).toBe(true);
    expect(res.candidates[0]?.some((c) => c.source === 'ipmap-anycast')).toBe(true);
  });

  it('VOY-F-20 leaves a unicast address unflagged', async () => {    const res = await enrichHops([publicHop(1, 7)], onlineOptions());
    expect(res.hops[0]?.anycast).toBeUndefined();
  });
});

describe('VOY-F-11 / VOY-F-13 offline and consent', () => {
  it('VOY-F-11 emits zero fetch calls when offline', async () => {    const o = onlineOptions(undefined, { offline: true });
    const [a, b] = [publicAddress(7), publicAddress(8)];
    const res = await enrichHops([hopOf(1, a), hopOf(2, b)], o);
    expect(callsOf(o)).toHaveLength(0);
    expect(res.sentAddresses).toEqual([]);
    expect(res.missing).toContain(`ripestat:${a}`);
    expect(res.missing).toContain(`ipmap:${b}`);
  });

  it('VOY-F-11 behaves exactly like offline without consent (VOY-F-13)', async () => {    const offline = await enrichHops([publicHop(1, 7)], onlineOptions(undefined, { offline: true }));
    const denied = await enrichHops([publicHop(1, 7)], onlineOptions(undefined, { consent: DENIED }));
    expect(JSON.stringify(denied.hops)).toBe(JSON.stringify(offline.hops));
    expect(JSON.stringify(denied.candidates)).toBe(JSON.stringify(offline.candidates));
    expect(denied.sentAddresses).toEqual([]);
  });

  it('VOY-F-11 lists missing enrichments instead of inventing them offline', async () => {    const res = await enrichHops([publicHop(1, 7)], onlineOptions(undefined, { offline: true }));
    expect(res.hops[0]?.asn).toBeNull();
    expect(res.candidates[0]).toEqual([]);
    expect(res.missing.length).toBeGreaterThan(0);
  });
});

describe('VOY-F-07 / VOY-P-04 nothing private leaves', () => {
  it('VOY-F-07 skips non-public hops before any call and records them in missing', async () => {    const hops = [
      hopOf(1, '192.168.1.1'),
      hopOf(2, '10.0.0.1'),
      hopOf(3, '100.64.0.1'),
      hopOf(4, '127.0.0.1'),
      hopOf(5, '203.0.113.5'),
      silentHop(6),
      publicHop(7, 7),
    ];
    const o = onlineOptions();
    const res = await enrichHops(hops, o);
    expect(res.sentAddresses).toEqual([publicAddress(7)]);
    expect(res.missing).toContain('skipped-non-public:ttl-1');
    expect(res.missing).toContain('skipped-non-public:ttl-5');
    expect(res.missing).toContain('skipped-non-public:ttl-6');
    expect(res.candidates[0]).toEqual([]);
  });

  it('VOY-F-07 logs every outbound address through options.log', async () => {    const ip = publicAddress(7);
    const lines: string[] = [];
    const o = onlineOptions(undefined, { log: (l) => lines.push(l) });
    await enrichHops([hopOf(1, ip)], o);
    expect(lines.filter((l) => l.includes(ip)).length).toBeGreaterThanOrEqual(2);
  });
});

describe('politeness: at most 4 concurrent requests', () => {
  it('never runs more than 4 fetches in flight', async () => {
    let inFlight = 0;
    let peak = 0;
    const base = createCannedFetcher();
    const fetch: EnrichOptions['fetch'] = async (url, init) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 3));
      try {
        return await base(url, init);
      } finally {
        inFlight -= 1;
      }
    };
    const hops = Array.from({ length: 20 }, (_, i) => publicHop(i + 1, 100 + i));
    const res = await enrichHops(hops, onlineOptions(undefined, { fetch }));
    expect(res.hops).toHaveLength(20);
    expect(peak).toBeLessThanOrEqual(4);
  });

  it('reports a 429 without retrying forever', async () => {
    const lines: string[] = [];
    const o = onlineOptions(undefined, {
      fetch: createCannedFetcher({ status: 429 }),
      log: (l) => lines.push(l),
    });
    const res = await enrichHops([publicHop(1, 7)], o);
    expect(callsOf(o).length).toBeLessThanOrEqual(3);
    expect(lines.join('\n')).toContain('429');
    expect(res.hops[0]?.asn).toBeNull();
  });
});

describe('determinism and robustness', () => {
  it('returns byte-identical output for identical inputs', async () => {
    const hops = [publicHop(1, 7), publicHop(2, 8)];
    const a = await enrichHops(hops, onlineOptions());
    const b = await enrichHops(hops, onlineOptions());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('does not mutate input hops', async () => {
    const hops = [publicHop(1, 7)];
    const before = JSON.stringify(hops);
    await enrichHops(hops, onlineOptions());
    expect(JSON.stringify(hops)).toBe(before);
  });

  it('keeps hop order and length across silent and public hops', async () => {
    const hops = [publicHop(1, 7), silentHop(2), publicHop(3, 9)];
    const res = await enrichHops(hops, onlineOptions());
    expect(res.hops.map((h) => h.ttl)).toEqual([1, 2, 3]);
    expect(res.candidates).toHaveLength(3);
  });

  it('returns an empty result for an empty trace', async () => {
    const res = await enrichHops([], onlineOptions());
    expect(res).toEqual({ hops: [], candidates: [], missing: [], sentAddresses: [] });
  });

  it('survives a fetcher that answers 404 everywhere', async () => {
    const o = onlineOptions(undefined, { fetch: createFakeFetcher(() => null) });
    const res = await enrichHops([publicHop(1, 7)], o);
    expect(res.hops).toHaveLength(1);
    expect(res.missing.length).toBeGreaterThan(0);
  });
});
