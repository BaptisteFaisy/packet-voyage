import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { creditsFor, loadCables, loadFixedLinks, loadHints, loadLandmasses } from '@packet-voyage/data';
import type { Journey } from '@packet-voyage/schema';
import { computeJourney } from '../pipeline.ts';
import { parseTrace } from '../parse/index.ts';
import { redactJourney } from '../redact/index.ts';
import { checkVocabulary } from '../story/index.ts';
import { arbFullJourney } from '../testing/journey-arbitrary.ts';
import {
  applyExampleNetworks,
  EXAMPLE_CANDIDATES,
  EXAMPLE_SOURCE,
  EXAMPLE_TRACE,
  EXAMPLE_TRACED_AT,
} from '../fixtures/example-7-14.ts';
import { diffJourneys } from './diff.ts';
import { incidentReport, UnredactedJourneyError } from './incident.ts';
import { journeyToGeoJSON } from './geojson.ts';

/** Seeds recorded so a counter-example can be replayed (§13). */
const SEED = 20261119;

function example(redacted: boolean, slower = false): Journey {
  const parsed = parseTrace(EXAMPLE_TRACE);
  const hops = applyExampleNetworks(parsed.hops).map((hop) =>
    slower
      ? { ...hop, replies: hop.replies.map((reply) => ({ ...reply, rtt_ms: reply.rtt_ms.map((ms) => ms * 1.3) })) }
      : hop,
  );
  const journey = computeJourney({
    parsed: { ...parsed, hops },
    candidates: EXAMPLE_CANDIDATES,
    source: EXAMPLE_SOURCE,
    tracedAt: EXAMPLE_TRACED_AT,
    masses: loadLandmasses(),
    cables: loadCables(),
    links: loadFixedLinks(),
    hints: loadHints(),
    credits: creditsFor(['submarine-cables', 'landmasses', 'fixed-links', 'hints']),
  });
  return redacted ? redactJourney(journey, 'country') : journey;
}

function privateAddressIn(text: string): boolean {
  return /(^|[^0-9.])(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|127\.|169\.254\.)/.test(text);
}

describe('journey diff (VOY-F-29)', () => {
  const a = example(true);
  const b = example(true, true);

  it('reports exact deltas and a changed path', () => {
    const diff = diffJourneys(a, b);
    expect(diff.same_target).toBe(true);
    expect(diff.rtt_ms.delta).toBeCloseTo((b.summary.rtt_ms ?? 0) - (a.summary.rtt_ms ?? 0), 6);
    expect(diff.distance_km.a).toBe(a.summary.distance_km_min);
    expect(diff.hops).toEqual({ a: a.hops.length, b: b.hops.length });
    expect(diff.rejected_by_light.a).toBe(a.summary.rejected_by_light);
    expect(diff.path_changed).toBe(false);
    expect(diff.city_path.a).toEqual(diff.city_path.b);
  });

  it('a journey compared with itself changes nothing', () => {
    const diff = diffJourneys(a, a);
    expect(diff.distance_km.delta).toBe(0);
    expect(diff.rtt_ms.delta).toBe(0);
    expect(diff.countries_added).toEqual([]);
    expect(diff.countries_removed).toEqual([]);
    expect(diff.path_changed).toBe(false);
  });

  it('the sentence states facts only, in both languages', () => {
    const diff = diffJourneys(a, b);
    expect(checkVocabulary(diff.sentence.en).violations).toEqual([]);
    expect(checkVocabulary(diff.sentence.fr).violations).toEqual([]);
    expect(diff.sentence.en).toMatch(/at least|no comparable delay/);
  });
});

describe('incident report (VOY-F-38)', () => {
  it('refuses an unredacted journey', () => {
    expect(() => incidentReport(example(false))).toThrow(UnredactedJourneyError);
  });

  it('carries the bounded numbers, the rejections and the credits', () => {
    const report = incidentReport(example(true), 'en');
    expect(report).toContain('# Journey report');
    expect(report).toMatch(/at least 6,6\d\d km/);
    expect(report).toMatch(/allowed at most 1,4\d\d km/);
    expect(report).toMatch(/would need at least 6,\d\d\d km/);
    expect(report).toContain('OpenStreetMap');
    expect(report).toContain('What this report does not establish');
    expect(report).toContain('Nothing in the measurement says which one');
  });

  it('leaks nothing private and stays inside the vocabulary', () => {
    for (const language of ['en', 'fr'] as const) {
      const report = incidentReport(example(true), language);
      expect(privateAddressIn(report)).toBe(false);
      for (const line of report.split('\n')) {
        if (line.trim() === '' || line.startsWith('#')) continue;
        expect(checkVocabulary(line).violations, line).toEqual([]);
      }
    }
  });
});

describe('GeoJSON export', () => {
  const journey = example(true);
  const collection = journeyToGeoJSON(journey);

  it('draws every located hop, and accounts for every segment', () => {
    const located = journey.hops.filter((hop) => hop.location).length;
    const points = collection.features.filter((f) => f.geometry.type === 'Point');
    const lines = collection.features.filter((f) => f.geometry.type === 'LineString');
    const undrawn = collection.properties.undrawn_segments as { from_ttl: number }[];
    // A redacted departure has no coordinates: the leg is not drawn, but it is
    // listed, so nothing disappears silently.
    expect(points.length).toBe(located);
    expect(lines.length + undrawn.length).toBe(journey.segments.length);
    expect(collection.properties.segments).toBe(journey.segments.length);
    expect(collection.properties.generator).toBe('packet-voyage');
    expect(undrawn.every((entry) => entry.from_ttl === 0)).toBe(true);
  });

  it('writes [lon, lat] inside the valid range and bends long crossings', () => {
    for (const feature of collection.features) {
      const coords = feature.geometry.coordinates as number[][];
      const pairs = feature.geometry.type === 'Point' ? [coords as unknown as number[]] : coords;
      for (const pair of pairs) {
        expect(pair[0]).toBeGreaterThanOrEqual(-180);
        expect(pair[0]).toBeLessThanOrEqual(180);
        expect(pair[1]).toBeGreaterThanOrEqual(-90);
        expect(pair[1]).toBeLessThanOrEqual(90);
      }
      if (feature.geometry.type === 'LineString') expect(coords.length).toBeGreaterThan(2);
    }
  });

  it('never claims a cable: the property is compatible_cables', () => {
    const text = JSON.stringify(collection);
    expect(text).toContain('compatible_cables');
    expect(text).not.toContain('"cable":');
  });

  it(`VOY-P-18 round trip: hops and segments survive the conversion (seed ${SEED})`, () => {
    fc.assert(
      fc.property(arbFullJourney, (generated) => {
        const geo = journeyToGeoJSON(generated);
        const hops = geo.features.filter((f) => f.properties.kind === 'hop');
        expect(hops.map((f) => f.properties.ttl)).toEqual(
          generated.hops.filter((hop) => hop.location).map((hop) => hop.ttl),
        );
        const segments = geo.features.filter((f) => f.properties.kind === 'segment');
        expect(segments.length).toBeGreaterThanOrEqual(generated.segments.length);
      }),
      { seed: SEED, numRuns: 40 },
    );
  });
});
