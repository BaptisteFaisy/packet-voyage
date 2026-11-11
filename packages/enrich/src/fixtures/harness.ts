import type { Hop } from '@packet-voyage/schema';
import { classifyAddress, isPublicAddress } from '../../../core/src/addr/index.ts';
import { createMemoryCache } from '../cache.ts';
import { createCannedFetcher, publicAddress, type FakeFetcher } from './fake.ts';
import type { Cache, ConsentState, EnrichOptions, IxpPrefix } from '../types.ts';

/** Shared harness for the enrich tests: options, hops, consent (no network). */

export const CONSENT: ConsentState = {
  granted: true,
  services: ['system DNS resolver', 'RIPE IPmap', 'RIPEstat', 'PeeringDB'],
  grantedAt: '2026-11-11T09:00:00Z',
};

export const DENIED: ConsentState = { granted: false, services: [], grantedAt: null };

/** A hop whose class is derived exactly like the trace parser does (§7.3). */
export function hopOf(ttl: number, ip: string, name?: string | null): Hop {
  return {
    ttl,
    class: classifyAddress(ip),
    replies: [{ ip, name: name ?? null, rtt_ms: [1 + ttl] }],
  };
}

/** A hop carrying a genuinely public, computed address. */
export function publicHop(ttl: number, index: number, name?: string | null): Hop {
  return hopOf(ttl, publicAddress(index), name);
}

export function silentHop(ttl: number): Hop {
  return {
    ttl,
    class: 'reserved',
    replies: [{ ip: '', rtt_ms: [], flags: ['timeout'] }],
  };
}

/** The /24 prefix a computed public address belongs to. */
export function prefixOf(ip: string): string {
  const [a, b, c] = ip.split('.');
  return `${a}.${b}.${c}.0/24`;
}

export function ixpEntry(ip: string, name = 'EXAMPLE-IX'): IxpPrefix {
  return {
    ix_id: 42,
    name,
    prefix: prefixOf(ip),
    city: 'Amsterdam',
    country: 'NL',
    lat: 52.3676,
    lon: 4.9041,
  };
}

export function onlineOptions(cache: Cache = createMemoryCache(), over: Partial<EnrichOptions> = {}): EnrichOptions {
  return {
    offline: false,
    consent: CONSENT,
    cache,
    fetch: createCannedFetcher(),
    now: '2026-11-11T12:00:00Z',
    reverseResolver: async (ip) => [`host-${ip.replaceAll('.', '-')}.example.net`],
    ...over,
  };
}

export function offlineOptions(cache: Cache = createMemoryCache()): EnrichOptions {
  return {
    offline: true,
    consent: CONSENT,
    cache,
    fetch: async () => {
      throw new Error('offline mode must never fetch');
    },
    now: '2026-11-11T12:00:00Z',
  };
}

export function urlsOf(o: EnrichOptions): string[] {
  return (o.fetch as FakeFetcher).calls.map((c) => c.url);
}

/** True when at least one hop carries a public address worth enriching. */
export function hasPublicHop(hops: Hop[]): boolean {
  return hops.some(
    (hop) => hop.class === 'public' && hop.replies.some((r) => r.ip !== '' && isPublicAddress(r.ip)),
  );
}
