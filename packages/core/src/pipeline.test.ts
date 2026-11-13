import { describe, expect, it } from 'vitest';
import { loadCables, loadFixedLinks, loadHints, loadLandmasses } from '@packet-voyage/data';
import { JourneySchema } from '@packet-voyage/schema';
import {
  applyExampleNetworks,
  EXAMPLE_CANDIDATES,
  EXAMPLE_EXPECTED,
  EXAMPLE_SOURCE,
  EXAMPLE_TRACE,
  EXAMPLE_TRACED_AT,
} from './fixtures/example-7-14.ts';
import { parseTrace } from './parse/index.ts';
import { computeJourney } from './pipeline.ts';

const masses = loadLandmasses();
const cables = loadCables();
const links = loadFixedLinks();
const hints = loadHints();

function exampleJourney() {
  const parsed = parseTrace(EXAMPLE_TRACE);
  return computeJourney({
    parsed: { ...parsed, hops: applyExampleNetworks(parsed.hops) },
    candidates: EXAMPLE_CANDIDATES,
    source: EXAMPLE_SOURCE,
    tracedAt: EXAMPLE_TRACED_AT,
    masses,
    cables,
    links,
    hints,
  });
}

function closeTo(value: number | null | undefined, expected: number): void {
  expect(value).not.toBeNull();
  const tolerance = Math.abs(expected) * EXAMPLE_EXPECTED.tolerance;
  expect(Math.abs((value ?? 0) - expected)).toBeLessThanOrEqual(tolerance);
}

describe('the chain of §7.1 on the worked example of §7.14', () => {
  const journey = exampleJourney();

  it('§18 gives at least 6,655 km, 91.7 ms, a 63.6 ms floor and an inflation of 1.44', () => {
    closeTo(journey.summary.distance_km_min, EXAMPLE_EXPECTED.distanceKmMin);
    closeTo(journey.summary.rtt_ms, EXAMPLE_EXPECTED.rttMs);
    closeTo(journey.summary.light_floor_ms, EXAMPLE_EXPECTED.lightFloorMs);
    closeTo(journey.summary.inflation, EXAMPLE_EXPECTED.inflation);
  });

  it('§18 rejects exactly one location by the light, and keeps the rejection', () => {
    expect(journey.summary.rejected_by_light).toBe(EXAMPLE_EXPECTED.rejectedByLight);
    const hop4 = journey.hops.find((hop) => hop.ttl === 4);
    const rejected = hop4?.location?.rejected ?? [];
    expect(rejected.map((entry) => entry.city)).toContain('Ashburn');
    expect(rejected[0]?.reason).toBe('light');
    expect(hop4?.location?.city).toBe('Paris');
  });

  it('counts three countries, three networks, one exchange point and no gap', () => {
    expect(journey.summary.countries).toEqual(EXAMPLE_EXPECTED.countries);
    expect(journey.summary.networks).toBe(EXAMPLE_EXPECTED.networks);
    expect(journey.summary.ixps).toBe(EXAMPLE_EXPECTED.ixps);
    expect(journey.summary.gaps).toBe(EXAMPLE_EXPECTED.gaps);
  });
});

describe('the shape of the computed journey (§7.1)', () => {
  const journey = exampleJourney();

  it('includes the leg from the departure in the distance (§7.14 counts Lyon -> Paris)', () => {
    // The first hop is the box, at the declared departure; the leg to Paris is
    // the first segment that actually travels, and it spans the CGNAT hop.
    expect(journey.segments[0]?.from_ttl).toBe(0);
    const toParis = journey.segments.find((segment) => segment.to_ttl === 3);
    closeTo(toParis?.geodesic_km ?? null, 391);
    expect(toParis?.skipped_hops).toBe(1);
  });

  it('lists compatible cables for the Atlantic crossing, never a chosen one', () => {
    const atlantic = journey.segments.find((segment) => segment.geodesic_km > 5000);
    expect(atlantic?.kind).toBe('sea');
    expect(atlantic?.cables.length).toBeGreaterThan(0);
    expect(atlantic?.cables.length).toBeLessThanOrEqual(5);
    // The band depends on the open cable data: what matters is that it is
    // ranked, bounded, and never called a certainty (§7.10).
    expect(['high', 'medium']).toContain(atlantic?.cables[0]?.band);
    for (const cable of atlantic?.cables ?? []) {
      expect(cable.compatibility).toBeGreaterThan(0);
      expect(cable.compatibility).toBeLessThanOrEqual(1);
    }
  });

  it('produces a journey that validates against the schema (VOY-P-18)', () => {
    expect(JourneySchema.safeParse(JSON.parse(JSON.stringify(journey))).success).toBe(true);
  });

  it('is deterministic: the same inputs give the same journey (VOY-F-17)', () => {
    expect(exampleJourney()).toEqual(journey);
  });

  it('never throws on garbage, it returns a journey or nothing to show (VOY-N-10)', () => {
    const junk = computeJourney({ text: 'not a trace at all\n!!!', tracedAt: EXAMPLE_TRACED_AT });
    expect(junk.hops).toEqual([]);
    expect(junk.summary.distance_km_min).toBe(0);
  });
});
