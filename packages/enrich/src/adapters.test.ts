import { describe, expect, it } from 'vitest';
import { createMemoryCache } from './cache.ts';
import { createCannedFetcher, createFakeFetcher, publicAddress } from './fixtures/fake.ts';
import { ipmapLocate, parseIpmapResponse } from './ipmap.ts';
import { ixpPrefixes, parseIxpfxResponse } from './peeringdb.ts';
import { ripeStat } from './ripestat.ts';
import type { ConsentState, EnrichOptions } from './types.ts';

const CONSENT: ConsentState = {
  granted: true,
  services: ['system DNS resolver', 'RIPE IPmap', 'RIPEstat', 'PeeringDB'],
  grantedAt: '2026-11-11T09:00:00Z',
};
const DENIED: ConsentState = { granted: false, services: [], grantedAt: null };

function options(over: Partial<EnrichOptions> = {}): EnrichOptions {
  return {
    offline: false,
    consent: CONSENT,
    cache: createMemoryCache(),
    fetch: createCannedFetcher(),
    now: '2026-11-11T12:00:00Z',
    ...over,
  };
}

describe('VOY-F-08 ripeStat', () => {
  it('VOY-F-08 returns network info and sends sourceapp=packet-voyage', async () => {    const o = options();
    const ip = publicAddress(7);
    const res = await ripeStat(ip, o);
    expect(res.asn).toBeTypeOf('number');
    expect(res.as_name).toMatch(/^EXAMPLE-AS-/);
    const url = (o.fetch as ReturnType<typeof createCannedFetcher>).calls[0]?.url ?? '';
    expect(url).toContain('sourceapp=packet-voyage');
    expect(url).toContain(`resource=${ip}`);
  });

  it('VOY-F-08 serves subsequent calls from cache (VOY-F-12)', async () => {    const o = options();
    const ip = publicAddress(7);
    const first = await ripeStat(ip, o);
    const callCount = (o.fetch as ReturnType<typeof createCannedFetcher>).calls.length;
    const second = await ripeStat(ip, o);
    expect(second).toEqual(first);
    expect((o.fetch as ReturnType<typeof createCannedFetcher>).calls.length).toBe(callCount);
  });

  it('VOY-F-08 handles 429 without infinite retry', async () => {    const lines: string[] = [];
    const o = options({ fetch: createCannedFetcher({ status: 429 }), log: (l) => lines.push(l) });
    const res = await ripeStat(publicAddress(9), o);
    expect(res).toEqual({ asn: null, as_name: null, prefix: null });
    expect((o.fetch as ReturnType<typeof createCannedFetcher>).calls).toHaveLength(1);
    expect(lines.join('\n')).toContain('429');
  });

  it('VOY-F-08 makes no fetch offline or without consent (VOY-F-11, VOY-F-13)', async () => {    const offline = options({ offline: true });
    expect(await ripeStat(publicAddress(1), offline)).toEqual({ asn: null, as_name: null, prefix: null });
    expect((offline.fetch as ReturnType<typeof createCannedFetcher>).calls).toHaveLength(0);

    const denied = options({ consent: DENIED });
    expect(await ripeStat(publicAddress(1), denied)).toEqual({ asn: null, as_name: null, prefix: null });
    expect((denied.fetch as ReturnType<typeof createCannedFetcher>).calls).toHaveLength(0);
  });
});

describe('VOY-F-14 ipmapLocate', () => {
  it('VOY-F-14 maps engines to closed source ids with correct weights', async () => {    const candidates = await ipmapLocate(publicAddress(7), options());
    const bySource = new Map(candidates.map((c) => [c.source, c]));
    expect(bySource.get('ipmap-latency')?.weight).toBe(0.85);
    expect(bySource.get('ipmap-rdns')?.weight).toBe(0.5);
    expect(candidates.every((c) => typeof c.lat === 'number' && typeof c.lon === 'number')).toBe(true);
  });

  it('VOY-F-14 flags anycast hops (VOY-F-20)', async () => {    const candidates = await ipmapLocate(publicAddress(7), options({ fetch: createCannedFetcher({ anycast: true }) }));
    expect(candidates.some((c) => c.source === 'ipmap-anycast')).toBe(true);
    expect(candidates.every((c) => c.anycast === true)).toBe(true);
  });

  it('VOY-F-14 filters engines lacking valid city or coordinates', () => {    expect(
      parseIpmapResponse({
        locations: {
          latency: { city: null, latitude: 1, longitude: 2 },
          ixp: { city: 'Amsterdam', country: 'NL', latitude: null, longitude: 4 },
        },
      }),
    ).toEqual([]);
  });

  it('VOY-F-14 makes no fetch offline', async () => {    const o = options({ offline: true });
    expect(await ipmapLocate(publicAddress(7), o)).toEqual([]);
    expect((o.fetch as ReturnType<typeof createCannedFetcher>).calls).toHaveLength(0);
  });
});

describe('VOY-F-10 ixpPrefixes (PeeringDB)', () => {
  it('VOY-F-10 parses and sorts ixpfx records', () => {    const list = parseIxpfxResponse({
      data: [
        { ix_id: 2, name: 'B-IX', prefix: '5.2.0.0/16' },
        { ix_id: 1, name: 'A-IX', prefix: '5.1.0.0/16', city: 'Paris', country: 'FR' },
      ],
    });
    expect(list.map((p) => p.prefix)).toEqual(['5.1.0.0/16', '5.2.0.0/16']);
    expect(list[0]?.city).toBe('Paris');
  });

  it('VOY-F-10 downloads once then uses cache', async () => {    const o = options();
    const first = await ixpPrefixes(o);
    const second = await ixpPrefixes(o);
    expect(second).toEqual(first);
    expect((o.fetch as ReturnType<typeof createCannedFetcher>).calls).toHaveLength(1);
  });

  it('VOY-F-10 prefers injected prefixes', async () => {    const o = options({ ixpPrefixes: [{ ix_id: 9, name: 'INJECTED', prefix: '5.0.0.0/8' }] });
    const list = await ixpPrefixes(o);
    expect(list[0]?.name).toBe('INJECTED');
    expect((o.fetch as ReturnType<typeof createCannedFetcher>).calls).toHaveLength(0);
  });

  it('VOY-F-10 returns empty array on error payload', async () => {    const o = options({ fetch: createFakeFetcher(() => ({ status: 200, body: { error: 'bad' } })) });
    expect(await ixpPrefixes(o)).toEqual([]);
  });
});
