/**
 * Property tests VOY-P-06 .. VOY-P-11 for the locator (§13 of the spec).
 *
 * Each property runs `numRuns` cases under a FIXED fast-check seed so results
 * are reproducible (no `Math.random`, no clock — §0.6). Seeds used:
 *   VOY-P-06: 42        VOY-P-07: 1337      VOY-P-08: 20261111
 *   VOY-P-09: 777       VOY-P-10: 99        VOY-P-11: 2026
 * To replay a failure fast-check reported, re-run with the printed `{ seed, path }`.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Candidate } from '@packet-voyage/schema';
import { stepAllowedKm, triangleAllowedKm } from '../envelope/index.ts';
import { haversineKm } from '../geo/index.ts';
import { buildSegments } from '../segments/index.ts';
import { DEFAULT_SETTINGS } from '../settings.ts';
import { locate } from './index.ts';
import { fuseCandidates } from './fuse.ts';
import { confidenceOf } from './confidence.ts';
import type { ArbJourney } from './arbitraries.ts';
import { arbCandidate, arbCityPosition, arbJourney } from './arbitraries.ts';

const NUM_RUNS = 500;
const EPS = 1e-6;

/** The retained path of a journey: everything but the rejection lists. */
function pathOf(result: ReturnType<typeof locate>) {
  return result.hops.map((entry) => {
    const loc = entry.location;
    if (loc === null) return null;
    return {
      ttl: entry.hop.ttl,
      lat: loc.lat,
      lon: loc.lon,
      city: loc.city,
      country: loc.country,
      confidence: loc.confidence,
      level: loc.level,
      sources: loc.sources,
    };
  });
}

/** A deterministic pseudo-shuffle (no randomness inside packages/core). */
function lcgShuffle<T>(list: T[], seed: number): T[] {
  const copy = [...list];
  let s = seed + 1;
  for (let i = copy.length - 1; i > 0; i -= 1) {
    s = (s * 1103515245 + 12345) % 2147483647;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/** The retained positions of a journey, paired with their hop index. */
function retainedOf(journey: ArbJourney) {
  const result = locate({ ...journey, settings: DEFAULT_SETTINGS });
  return result.hops
    .map((entry, i) => ({ entry, i }))
    .filter((x) => x.entry.location !== null);
}

describe('VOY-P-06 no retained position violates the light bound', () => {
  it('VOY-P-06 no retained position exceeds c*env/2 + slackKm from the source', () => {
    fc.assert(
      fc.property(arbJourney, (journey: ArbJourney) => {
        const result = locate({ ...journey, settings: DEFAULT_SETTINGS });
        for (let i = 0; i < result.hops.length; i += 1) {
          const loc = result.hops[i]!.location;
          const env = journey.envelopes[i] ?? null;
          if (loc === null || env === null || journey.source === null) continue;
          const allowed = stepAllowedKm(env, DEFAULT_SETTINGS);
          const needed = haversineKm(journey.source, loc);
          expect(needed).toBeLessThanOrEqual(allowed + EPS);
        }
      }),
      { numRuns: NUM_RUNS, seed: 42 },
    );
  });
});

describe('VOY-P-07 triangle bound for every located pair', () => {
  it('VOY-P-07 triangle perimeter S-i-j-S <= c*env_j with tolerance', () => {
    fc.assert(
      fc.property(arbJourney, (journey: ArbJourney) => {
        const located = retainedOf(journey);
        for (const { entry: later, i: j } of located) {
          const envJ = journey.envelopes[j] ?? null;
          if (envJ === null) continue;
          const allowed = triangleAllowedKm(envJ, DEFAULT_SETTINGS);
          for (const { entry: earlier, i: k } of located) {
            if (k >= j) continue;
            const a = earlier.location!;
            const b = later.location!;
            const perimeter =
              journey.source === null
                ? 2 * haversineKm(a, b)
                : haversineKm(journey.source, a) +
                  haversineKm(a, b) +
                  haversineKm(b, journey.source);
            expect(perimeter).toBeLessThanOrEqual(allowed + EPS);
          }
        }
      }),
      { numRuns: NUM_RUNS, seed: 1337 },
    );
  });
});

describe('VOY-P-08 determinism under candidate and source shuffling', () => {
  it('VOY-P-08 shuffled candidate and source order yields identical path', () => {
    fc.assert(
      fc.property(arbJourney, fc.integer({ min: 0, max: 1_000_000 }), (journey: ArbJourney, seed2: number) => {
        // Shuffle the candidate order inside every hop (the source order inside
        // each hop's list is part of the shuffle).
        const shuffledCandidates = journey.candidates.map((list, i) => lcgShuffle(list, seed2 + i));
        const a = locate({ ...journey, settings: DEFAULT_SETTINGS });
        const b = locate({
          ...journey,
          candidates: shuffledCandidates,
          settings: DEFAULT_SETTINGS,
        });
        expect(pathOf(b)).toEqual(pathOf(a));
        // Rejections carry the same entries, possibly in the order the sources
        // were seen: compare them as sorted multisets.
        const sortRej = (x: typeof a.rejected) =>
          [...x].sort((p, q) => JSON.stringify(p).localeCompare(JSON.stringify(q)));
        expect(sortRej(b.rejected)).toEqual(sortRej(a.rejected));
        expect(b.relativeOnly).toBe(a.relativeOnly);
      }),
      { numRuns: NUM_RUNS, seed: 20261111 },
    );
  });
});

describe('VOY-P-09 impossible candidates only add rejections', () => {
  it('VOY-P-09 impossible candidate never changes retained path, only rejected', () => {
    fc.assert(
      fc.property(arbJourney, arbCandidate, (journey: ArbJourney, base: Candidate) => {
        fc.pre(journey.source !== null);
        const source = journey.source!;

        // The antipode of the source is the farthest reachable point (~20,015
        // km), so it exceeds the hard bound of any hop whose envelope is small
        // enough. Inject it at the hop with the smallest non-null envelope.
        const impossible: Candidate = {
          ...base,
          lat: -source.lat,
          lon: source.lon > 0 ? source.lon - 180 : source.lon + 180,
          city: `Impossible-${base.city}`,
          anycast: false,
        };
        let hopIdx = -1;
        let minEnv = Infinity;
        for (let i = 0; i < journey.envelopes.length; i += 1) {
          const e = journey.envelopes[i] ?? null;
          if (e !== null && e < minEnv) {
            minEnv = e;
            hopIdx = i;
          }
        }
        fc.pre(hopIdx >= 0);
        fc.pre(haversineKm(source, impossible) > stepAllowedKm(minEnv, DEFAULT_SETTINGS));

        const before = locate({ ...journey, settings: DEFAULT_SETTINGS });
        const injected = journey.candidates.map((list, i) =>
          i === hopIdx ? [...list, impossible] : list,
        );
        const after = locate({ ...journey, candidates: injected, settings: DEFAULT_SETTINGS });

        // The retained path (positions, confidence, levels, sources) is
        // identical: an impossible candidate is filtered by light before fusion
        // and never reaches the DP.
        expect(pathOf(after)).toEqual(pathOf(before));
        // It only shows up as one extra rejection, kept and displayed.
        expect(after.rejected.length).toBe(before.rejected.length + 1);
        const added = after.rejected.filter(
          (r) => r.city === impossible.city && r.reason === 'light',
        );
        expect(added).toHaveLength(1);
        expect(added[0]!.needed_km).toBeGreaterThan(added[0]!.allowed_km);
      }),
      { numRuns: NUM_RUNS, seed: 777 },
    );
  });
});

const P10_SOURCES = ['geodb', 'name-hint', 'ipmap-rdns', 'ixp-prefix', 'ipmap-latency'] as const;

describe('VOY-P-10 confidence is monotone in concordant sources', () => {
  it('VOY-P-10 adding a concordant source never lowers confidence', () => {
    fc.assert(
      fc.property(
        arbCityPosition,
        fc.array(fc.double({ min: 0.3, max: 1, noNaN: true }), { minLength: 1, maxLength: 3 }),
        fc.double({ min: 0.3, max: 1, noNaN: true }),
        (city, weights: number[], extraWeight: number) => {
          // A concordant group: every candidate sits at (essentially) the same
          // point, each from a distinct source, so they fuse into one cluster.
          const group: Candidate[] = weights.map((w, i) => ({
            city: city.city,
            country: city.country,
            lat: city.lat + i * 0.001,
            lon: city.lon + i * 0.001,
            source: P10_SOURCES[i]!,
            weight: w,
          }));
          const concordant: Candidate = {
            city: city.city,
            country: city.country,
            lat: city.lat,
            lon: city.lon,
            source: P10_SOURCES[weights.length]!,
            weight: extraWeight,
          };

          const before = fuseCandidates(group, DEFAULT_SETTINGS);
          const after = fuseCandidates([...group, concordant], DEFAULT_SETTINGS);
          expect(before).toHaveLength(1);
          expect(after).toHaveLength(1);

          const confBefore = confidenceOf(before, DEFAULT_SETTINGS).confidence;
          const confAfter = confidenceOf(after, DEFAULT_SETTINGS).confidence;
          expect(confAfter).toBeGreaterThanOrEqual(confBefore - EPS);

          // End-to-end: a single hop at the source with a generous envelope,
          // so the cluster is retained; adding the source cannot lower it.
          const journey = {
            hops: [{ ttl: 1, replies: [{ ip: '198.51.100.1', rtt_ms: [400] }], class: 'public' as const }],
            envelopes: [400] as (number | null)[],
            source: { lat: city.lat, lon: city.lon },
            settings: DEFAULT_SETTINGS,
          };
          const locBefore = locate({ ...journey, candidates: [group] }).hops[0]!.location;
          const locAfter = locate({ ...journey, candidates: [[...group, concordant]] }).hops[0]!.location;
          if (locBefore !== null) {
            expect(locAfter).not.toBeNull();
            expect(locAfter!.confidence).toBeGreaterThanOrEqual(locBefore.confidence - EPS);
          }
        },
      ),
      { numRuns: NUM_RUNS, seed: 99 },
    );
  });
});

describe('VOY-P-11 no invented position', () => {
  it('VOY-P-11 hop with no kept candidate is unlocated with null location', () => {
    fc.assert(
      fc.property(arbJourney, (journey: ArbJourney) => {
        const result = locate({ ...journey, settings: DEFAULT_SETTINGS });
        expect(result.hops).toHaveLength(journey.hops.length);

        let locatedCount = 0;
        for (let i = 0; i < result.hops.length; i += 1) {
          const entry = result.hops[i]!;
          if (entry.location === null) continue;
          locatedCount += 1;
          // A located hop must trace back to a real surviving candidate.
          expect(entry.location!.sources.length).toBeGreaterThan(0);
          expect(entry.location!.confidence).toBeGreaterThan(0);
          expect(['solid', 'probable', 'uncertain']).toContain(entry.location!.level);
        }

        // Hops with no candidate at all can never be located (nothing invented).
        for (let i = 0; i < journey.hops.length; i += 1) {
          if (journey.candidates[i]!.length === 0) {
            expect(result.hops[i]!.location).toBeNull();
          }
        }

        // located + skipped = the number of public hops fed to the locator:
        // every hop is either located or a gap, none is both, none is dropped.
        const skipped = result.hops.filter((e) => e.location === null).length;
        expect(locatedCount + skipped).toBe(journey.hops.length);

        // No segment ever starts or ends on an unlocated hop: every segment
        // endpoint maps back to a hop whose location is retained.
        const locatedTtls = new Set(
          result.hops.filter((e) => e.location !== null).map((e) => e.hop.ttl),
        );
        const segments = buildSegments(result.hops, [], [], DEFAULT_SETTINGS);
        for (const seg of segments) {
          expect(locatedTtls.has(seg.from_ttl)).toBe(true);
          expect(locatedTtls.has(seg.to_ttl)).toBe(true);
        }
      }),
      { numRuns: NUM_RUNS, seed: 2026 },
    );
  });
});
