/**
 * Shared arbitraries: a *complete* journey, built by running the real pipeline
 * on generated traces. Property tests for the story, the redaction and the
 * share link all draw from here, so they exercise the product rather than a
 * hand-written approximation of it.
 */
import type fc from 'fast-check';
import type { Journey } from '@packet-voyage/schema';
import { arbJourney } from '../locate/arbitraries.ts';
import type { ArbJourney } from '../locate/arbitraries.ts';
import type { ParsedTrace } from '../parse/index.ts';
import { computeJourney } from '../pipeline.ts';

const TRACED_AT = '2026-11-12T09:14:03Z';

/** Wrap generated hops in the shape a parser would have produced. */
export function parsedFrom(generated: ArbJourney): ParsedTrace {
  return {
    format: 'traceroute',
    family: 4,
    protocol: 'icmp',
    tool: 'pasted',
    target: { host: 'www.example.org', ip: '203.0.113.80' },
    hops: generated.hops,
    unknownLines: [],
    warnings: [],
  };
}

/** Run the whole chain on a generated trace: the journey a user would get. */
export function journeyFrom(generated: ArbJourney): Journey {
  return computeJourney({
    parsed: parsedFrom(generated),
    candidates: generated.candidates,
    source: generated.source,
    tracedAt: TRACED_AT,
  });
}

export const arbFullJourney: fc.Arbitrary<Journey> = arbJourney.map(journeyFrom);
