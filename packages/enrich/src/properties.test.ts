/**
 * Property tests for the enrichment lot (spec §13).
 *
 * Fixed seeds used by every `fc.assert` below: 20261111, 42, 1337, 20260101.
 * Run with: `npx vitest run packages/enrich -t "VOY-P"`.
 *
 * No real network: every outbound call goes through the fake `Fetcher` of
 * `fixtures/fake.ts`. Every address is either computed (`5.0.0.0/8` for public,
 * `10.0.0.0/8` and friends for non-public) or built from a template, so no
 * literal personal or real-world address ever lands in the repository.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Hop } from '@packet-voyage/schema';
import { classifyAddress, isPublicAddress } from '../../core/src/addr/index.ts';
import { createFileCache, createMemoryCache } from './cache.ts';
import { publicAddress } from './fixtures/fake.ts';
import { hasPublicHop, offlineOptions, onlineOptions, urlsOf } from './fixtures/harness.ts';
import { enrichHops } from './orchestrator.ts';
import type { EnrichOptions } from './types.ts';

const SEEDS = [20261111, 42, 1337, 20260101] as const;
const IPV4_RX = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const octet = fc.integer({ min: 0, max: 255 });
const publicOctets = fc.tuple(octet, octet, octet);

/** Addresses drawn from every class of §7.3, plus genuinely public ones. */
const addressArb = fc.oneof(
  publicOctets.map(([b, c, d]) => `5.${b}.${c}.${d}`),
  publicOctets.map(([b, c, d]) => `10.${b}.${c}.${d}`),
  fc.tuple(fc.integer({ min: 16, max: 31 }), octet, octet).map(([b, c, d]) => `172.${b}.${c}.${d}`),
  fc.tuple(octet, octet).map(([c, d]) => `192.168.${c}.${d}`),
  fc.tuple(fc.integer({ min: 64, max: 127 }), octet, octet).map(([b, c, d]) => `100.${b}.${c}.${d}`),
  fc.tuple(octet, octet).map(([c, d]) => `169.254.${c}.${d}`),
  octet.map((d) => `127.0.0.${d}`),
  octet.map((d) => `192.0.2.${d}`),
  octet.map((d) => `198.51.100.${d}`),
  octet.map((d) => `203.0.113.${d}`),
  fc.tuple(fc.integer({ min: 224, max: 255 }), octet, octet, octet).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
);

function makeHop(ttl: number, ips: string[]): Hop {
  return {
    ttl,
    class: classifyAddress(ips[0] ?? ''),
    replies: ips.map((ip) => ({ ip, name: null, rtt_ms: [1 + ttl] })),
  };
}

const hopArb: fc.Arbitrary<Hop> = fc
  .tuple(fc.integer({ min: 1, max: 30 }), fc.array(addressArb, { minLength: 1, maxLength: 2 }))
  .map(([ttl, ips]) => makeHop(ttl, ips));

const silentHopArb: fc.Arbitrary<Hop> = fc.constant({
  ttl: 99,
  class: 'reserved' as const,
  replies: [{ ip: '', rtt_ms: [], flags: ['timeout'] }],
});

const journeyArb = fc.array(fc.oneof(hopArb, silentHopArb), { maxLength: 8 });

/** A journey made only of non-public hops: nothing may ever be fetched. */
const nonPublicJourneyArb = fc
  .array(fc.tuple(fc.integer({ min: 1, max: 20 }), addressArb), { minLength: 1, maxLength: 6 })
  .map((pairs) => pairs.filter(([, ip]) => !isPublicAddress(ip)))
  .filter((pairs) => pairs.length > 0)
  .map((pairs) => pairs.map(([ttl, ip], i) => makeHop(ttl + i, [ip])));

/** VOY-P-04: no non-public address in any outbound URL nor in sentAddresses. */
async function nothingPrivateLeaves(hops: Hop[]): Promise<void> {
  const o: EnrichOptions = onlineOptions();
  const res = await enrichHops(hops, o);
  for (const address of res.sentAddresses) {
    expect(isPublicAddress(address)).toBe(true);
  }
  // Non-vacuity: a journey with a public hop must have sent something.
  if (hasPublicHop(hops)) expect(res.sentAddresses.length).toBeGreaterThan(0);
  const outbound = urlsOf(o).join(' ');
  const mentions = outbound.match(IPV4_RX) ?? [];
  for (const hop of hops) {
    for (const reply of hop.replies) {
      if (!reply.ip || isPublicAddress(reply.ip)) continue;
      expect(res.sentAddresses).not.toContain(reply.ip);
      expect(mentions).not.toContain(reply.ip);
    }
  }
}

/** VOY-P-19: an offline run on the warm cache replays hops and candidates. */
async function warmCacheReplays(hops: Hop[], cache: ReturnType<typeof createMemoryCache>): Promise<void> {
  const online = await enrichHops(hops, onlineOptions(cache));
  // Non-vacuity: the online run really filled the cache it is replayed from.
  if (hasPublicHop(hops)) expect(cache.stats().entries).toBeGreaterThan(0);
  const offline = await enrichHops(hops, offlineOptions(cache));
  expect(JSON.stringify(offline.hops)).toBe(JSON.stringify(online.hops));
  expect(JSON.stringify(offline.candidates)).toBe(JSON.stringify(online.candidates));
  expect(offline.sentAddresses).toEqual([]);
}

describe('VOY-P-04 nothing private leaves', () => {
  it('VOY-P-04 no non-public address reaches an outbound URL or sentAddresses', async () => {
    for (const seed of SEEDS) {
      await fc.assert(fc.asyncProperty(journeyArb, nothingPrivateLeaves), { seed, numRuns: 25 });
    }
  });

  it('VOY-P-04 no fetch at all when every hop is non-public', async () => {
    for (const seed of SEEDS) {
      await fc.assert(
        fc.asyncProperty(nonPublicJourneyArb, async (hops) => {
          const o = onlineOptions();
          const res = await enrichHops(hops, o);
          expect(urlsOf(o)).toEqual([]);
          expect(res.sentAddresses).toEqual([]);
          expect(res.candidates.every((list) => list.length === 0)).toBe(true);
          expect(res.hops.map((h) => h.ttl)).toEqual(hops.map((h) => h.ttl));
        }),
        { seed, numRuns: 25 },
      );
    }
  });

  it('VOY-P-04 offline emits no call and sends nothing, whatever the journey', async () => {
    for (const seed of SEEDS) {
      await fc.assert(
        fc.asyncProperty(journeyArb, async (hops) => {
          const res = await enrichHops(hops, offlineOptions(createMemoryCache()));
          expect(res.sentAddresses).toEqual([]);
          expect(res.hops).toHaveLength(hops.length);
        }),
        { seed, numRuns: 25 },
      );
    }
  });
});

describe('VOY-P-19 warm cache offline equals the online run', () => {
  it('VOY-P-19 a memory cache filled online replays byte-identically offline', async () => {
    for (const seed of SEEDS) {
      await fc.assert(
        fc.asyncProperty(journeyArb, async (hops) => {
          await warmCacheReplays(hops, createMemoryCache());
        }),
        { seed, numRuns: 25 },
      );
    }
  });

  it('VOY-P-19 a file cache survives the process and still replays offline', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pv-warm-'));
    try {
      const hops: Hop[] = [
        { ttl: 1, class: 'private', replies: [{ ip: '10.0.0.1', rtt_ms: [0.5] }] },
        { ttl: 2, class: 'public', replies: [{ ip: publicAddress(21), name: null, rtt_ms: [4] }] },
        { ttl: 3, class: 'public', replies: [{ ip: publicAddress(22), name: 'edge.example.net', rtt_ms: [9] }] },
      ];
      const online = await enrichHops(hops, onlineOptions(createFileCache(dir)));
      // A brand-new Cache object on the same directory: the process died.
      const offline = await enrichHops(hops, offlineOptions(createFileCache(dir)));
      expect(JSON.stringify(offline.hops)).toBe(JSON.stringify(online.hops));
      expect(JSON.stringify(offline.candidates)).toBe(JSON.stringify(online.candidates));
      expect(offline.sentAddresses).toEqual([]);
      expect(online.sentAddresses.length).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('VOY-P-19 a cold cache offline yields no candidate and lists what is missing', async () => {
    const hops: Hop[] = [
      { ttl: 1, class: 'public', replies: [{ ip: publicAddress(31), name: null, rtt_ms: [3] }] },
    ];
    const cold = await enrichHops(hops, offlineOptions(createMemoryCache()));
    expect(cold.candidates[0]).toEqual([]);
    expect(cold.missing.length).toBeGreaterThan(0);
  });
});
