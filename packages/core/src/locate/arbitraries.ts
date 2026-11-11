import fc from 'fast-check';
import type { Candidate, Hop, Position, Reply } from '@packet-voyage/schema';

const SOURCE_IDS = [
  'declared',
  'ipmap-latency',
  'ixp-prefix',
  'name-hint',
  'ipmap-rdns',
  'ipmap-ix',
  'ipmap-contribution',
  'ipmap-anycast',
  'neighbourhood',
  'geodb',
  'ripestat',
  'operator',
] as const;

const CITY_POOL = [
  { city: 'Lyon', country: 'FR', lat: 45.764, lon: 4.8357 },
  { city: 'Paris', country: 'FR', lat: 48.8566, lon: 2.3522 },
  { city: 'London', country: 'GB', lat: 51.5074, lon: -0.1278 },
  { city: 'Frankfurt', country: 'DE', lat: 50.1109, lon: 8.6821 },
  { city: 'New York', country: 'US', lat: 40.7128, lon: -74.006 },
  { city: 'Ashburn', country: 'US', lat: 39.0438, lon: -77.4874 },
  { city: 'Tokyo', country: 'JP', lat: 35.6762, lon: 139.6503 },
  { city: 'Suva', country: 'FJ', lat: -18.1416, lon: 178.4419 },
  { city: 'Anchorage', country: 'US', lat: 61.2181, lon: -149.9003 },
  { city: 'Sao Paulo', country: 'BR', lat: -23.5505, lon: -46.6333 },
  { city: 'Sydney', country: 'AU', lat: -33.8688, lon: 151.2093 },
  { city: 'Singapore', country: 'SG', lat: 1.3521, lon: 103.8198 },
] as const;

/** A WGS84 position, sometimes near the antimeridian. */
export const arbPosition: fc.Arbitrary<Position> = fc.oneof(
  fc.record({
    lat: fc.double({ min: -89, max: 89, noNaN: true }),
    lon: fc.double({ min: -180, max: 180, noNaN: true }),
  }),
  fc.record({
    lat: fc.double({ min: -60, max: 60, noNaN: true }),
    lon: fc.oneof(
      fc.double({ min: 175, max: 180, noNaN: true }),
      fc.double({ min: -180, max: -175, noNaN: true }),
    ),
  }),
);

/** A position drawn from a fixed city pool (keeps distances physically sane). */
export const arbCityPosition: fc.Arbitrary<(typeof CITY_POOL)[number]> = fc.constantFrom(
  ...CITY_POOL,
);

/** A reply carrying an optional non-negative delay. */
export const arbReply: fc.Arbitrary<Reply> = fc.record({
  ip: fc.constantFrom('198.51.100.1', '203.0.113.5', ''),
  rtt_ms: fc.oneof(
    fc.constant([] as number[]),
    fc.array(fc.double({ min: 0.1, max: 400, noNaN: true }), { minLength: 1, maxLength: 3 }),
  ),
});

/** Builds a hop at a given ttl with an explicit delay (or null => silent). */
export function hopWithDelay(ttl: number, envMs: number | null): Hop {
  const reply: Reply =
    envMs === null
      ? { ip: '', rtt_ms: [], flags: ['timeout'] }
      : { ip: `198.51.100.${ttl}`, rtt_ms: [envMs] };
  return { ttl, replies: [reply], class: 'public' };
}

/** A candidate at a pooled city with a source id and a starting weight. */
export const arbCandidate: fc.Arbitrary<Candidate> = fc
  .tuple(arbCityPosition, fc.constantFrom(...SOURCE_IDS), fc.double({ min: 0, max: 1, noNaN: true }))
  .map(([pos, source, weight]) => ({
    city: pos.city,
    country: pos.country,
    lat: pos.lat,
    lon: pos.lon,
    source,
    weight,
  }));

/** A candidate carrying the anycast flag. */
export const arbAnycastCandidate: fc.Arbitrary<Candidate> = arbCandidate.map((c) => ({
  ...c,
  anycast: true,
}));

/** Mostly plain candidates, sometimes anycast ones (VOY-F-20 coverage). */
const arbMaybeAnycast: fc.Arbitrary<Candidate> = fc.oneof(
  { weight: 4, arbitrary: arbCandidate },
  { weight: 1, arbitrary: arbAnycastCandidate },
);

/**
 * A generated journey for the locator: an optional source, a list of hops with
 * monotonically non-decreasing envelopes, and index-aligned candidate lists.
 */
export interface ArbJourney {
  hops: Hop[];
  candidates: Candidate[][];
  envelopes: (number | null)[];
  source: Position | null;
}

export const arbJourney: fc.Arbitrary<ArbJourney> = fc
  .integer({ min: 1, max: 8 })
  .chain((n) =>
    fc.tuple(
      // non-decreasing envelopes (some may be null => silent)
      fc.array(fc.option(fc.double({ min: 0.5, max: 200, noNaN: true }), { nil: null }), {
        minLength: n,
        maxLength: n,
      }),
      fc.array(fc.array(arbMaybeAnycast, { minLength: 0, maxLength: 3 }), {
        minLength: n,
        maxLength: n,
      }),
      fc.option(arbPosition, { nil: null }),
    ).map(([rawEnvs, candidateLists, source]) => {
      // enforce non-decreasing envelopes
      const envelopes: (number | null)[] = [];
      let running = 0;
      for (const e of rawEnvs) {
        if (e === null) {
          envelopes.push(null);
        } else {
          running = Math.max(running, e);
          envelopes.push(running);
        }
      }
      const hops = envelopes.map((e, i) => hopWithDelay(i + 1, e));
      return { hops, candidates: candidateLists, envelopes, source };
    }),
  );
