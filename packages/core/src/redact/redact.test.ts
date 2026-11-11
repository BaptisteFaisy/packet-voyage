import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Journey, RedactionLevel } from '@packet-voyage/schema';
import { classifyAddress } from '../addr/index.ts';
import { arbFullJourney } from '../testing/journey-arbitrary.ts';
import { computeJourney } from '../pipeline.ts';
import { parseTrace } from '../parse/index.ts';
import { loadFixedLinks, loadHints, loadLandmasses } from '@packet-voyage/data';
import {
  applyExampleNetworks,
  EXAMPLE_CANDIDATES,
  EXAMPLE_SOURCE,
  EXAMPLE_TRACE,
  EXAMPLE_TRACED_AT,
} from '../fixtures/example-7-14.ts';
import { redactJourney, redactionPreview } from './redact.ts';

/** Seeds recorded so a counter-example can be replayed (§13). */
const SEED = 20261116;

function exampleJourney(): Journey {
  const parsed = parseTrace(EXAMPLE_TRACE);
  return computeJourney({
    parsed: { ...parsed, hops: applyExampleNetworks(parsed.hops) },
    candidates: EXAMPLE_CANDIDATES,
    source: EXAMPLE_SOURCE,
    tracedAt: EXAMPLE_TRACED_AT,
    masses: loadLandmasses(),
    links: loadFixedLinks(),
    hints: loadHints(),
  });
}

/** Nothing that could identify a person survives the redaction (VOY-P-16). */
function checkNothingPersonalSurvives(journey: Journey, level: RedactionLevel): void {
  const redacted = redactJourney(journey, level);
  for (const hop of redacted.hops) {
    // Documentation ranges stay on purpose: they are examples, not a real box.
    expect(['public', 'documentation']).toContain(hop.class);
    for (const reply of hop.replies) {
      if (reply.ip === '') continue;
      expect(['public', 'documentation']).toContain(classifyAddress(reply.ip));
    }
  }
  if (level === 'country' && redacted.source) {
    expect(redacted.source.lat).toBeNull();
    expect(redacted.source.lon).toBeNull();
    expect(redacted.source.precision).toBe('country');
  }
  expect(redacted.redaction).toEqual({ level, applied: true });
}

describe('redaction (VOY-F-38)', () => {
  const journey = exampleJourney();

  it('drops the box and the access network, keeps the public route', () => {
    const redacted = redactJourney(journey, 'country');
    expect(redacted.hops.map((hop) => hop.ttl)).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
    expect(redacted.redaction).toEqual({ level: 'country', applied: true });
  });

  it('coarse-grains the departure to the country by default', () => {
    const redacted = redactJourney(journey, 'country');
    expect(redacted.source?.label).toBe('FR');
    expect(redacted.source?.lat).toBeNull();
    expect(redacted.source?.lon).toBeNull();
  });

  it('keeps the city only when the user asks for it', () => {
    expect(redactJourney(journey, 'city').source?.label).toBe('Lyon, FR');
    expect(redactJourney(journey, 'city').source?.precision).toBe('city');
  });

  it('announces what will be shared before anything is sent', () => {
    const preview = redactionPreview(journey, 'country').join(' | ');
    expect(preview).toContain('removed hop 1 (private');
    expect(preview).toContain('removed hop 2 (cgnat');
    expect(preview).toContain('departure reduced to the country (FR)');
  });

  it('keeps the summary coherent after redaction', () => {
    const summary = redactJourney(journey, 'country').summary;
    expect(summary.countries).toEqual(['FR', 'GB', 'US']);
    expect(summary.networks).toBe(3);
    expect(summary.ixps).toBe(1);
    expect(summary.rejected_by_light).toBe(1);
    expect(summary.gaps).toBe(0);
  });
});

describe('redaction properties (§13)', () => {
  it(`VOY-P-16 nothing private survives, at any level (seed ${SEED})`, () => {
    fc.assert(
      fc.property(
        arbFullJourney,
        fc.constantFrom('country' as const, 'city' as const),
        checkNothingPersonalSurvives,
      ),
      { seed: SEED, numRuns: 60 },
    );
  });
});
