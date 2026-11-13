/**
 * The proof of a block: the figures that block actually computed on the journey
 * it was given.
 *
 * A catalogue that shows what the tool does must also show that it did it: every
 * block carries the numbers it produced, and the label each number answers to.
 * Pure logic, no React (§5.9): the component formats, this computes. One
 * implementation per logic — a figure is read here, never recomputed elsewhere.
 */
import type { Hop, Journey } from '@packet-voyage/schema';
import type { I18nKey } from '../i18n/en.ts';

export type ProofBlock =
  | 'map'
  | 'timeline'
  | 'hop'
  | 'insights'
  | 'roadmap'
  | 'export'
  | 'story'
  | 'compare';

export type ProofUnit = 'count' | 'km' | 'ms' | 'ratio' | 'text';

export interface ProofFact {
  /** The i18n key of the label this figure answers to. */
  key: I18nKey;
  /** A figure the journey does not carry is null or undefined: never zero. */
  value: number | string | null | undefined;
  unit: ProofUnit;
}

export interface ProofInput {
  journey: Journey;
  block: ProofBlock;
  /** The hop the hop block demonstrates. */
  hop?: Hop | null;
  /** How many journeys the comparison block may choose from. */
  available?: number;
}

interface Located {
  located: number;
  total: number;
}

function locatedOf(journey: Journey): Located {
  return {
    located: journey.hops.filter((hop) => hop.location !== null).length,
    total: journey.hops.length,
  };
}

function cablesOf(journey: Journey): number {
  return journey.segments.reduce((total, segment) => total + segment.cables.length, 0);
}

function rejectedOf(journey: Journey): number {
  return journey.hops.reduce(
    (total, hop) => total + (hop.location?.rejected.length ?? 0),
    0,
  );
}

function timedOf(journey: Journey): number {
  return journey.hops.filter((hop) => hop.envelope_ms !== null && hop.envelope_ms !== undefined).length;
}

/** The residual: what the delay costs beyond the light alone. */
function residualOf(journey: Journey): number | null {
  const rtt = journey.summary.rtt_ms;
  const floor = journey.summary.light_floor_ms;
  if (rtt === null || rtt === undefined || floor === null || floor === undefined) return null;
  return Math.round((rtt - floor) * 10) / 10;
}

function mapFacts(journey: Journey, located: Located): ProofFact[] {
  return [
    { key: 'proof.distance', value: journey.summary.distance_km_min, unit: 'km' },
    { key: 'proof.located', value: `${located.located} / ${located.total}`, unit: 'text' },
    { key: 'proof.cables', value: cablesOf(journey), unit: 'count' },
    { key: 'proof.floor', value: journey.summary.light_floor_ms, unit: 'ms' },
  ];
}

function timelineFacts(journey: Journey, located: Located): ProofFact[] {
  return [
    { key: 'proof.delay', value: journey.summary.rtt_ms, unit: 'ms' },
    { key: 'proof.timed', value: timedOf(journey), unit: 'count' },
    { key: 'proof.hops', value: located.total, unit: 'count' },
  ];
}

function hopFacts(hop: Hop | null): ProofFact[] {
  if (!hop) return [];
  const located = hop.location;
  return [
    { key: 'proof.hop', value: `#${hop.ttl}`, unit: 'text' },
    { key: 'proof.level', value: located?.level ?? 'unlocated', unit: 'text' },
    { key: 'proof.source', value: located?.sources.join(', ') || '—', unit: 'text' },
    // The hop's own rejections — not the journey's: two different quantities,
    // two different labels, so the chain never compares them.
    { key: 'proof.rejectedHop', value: located?.rejected.length ?? 0, unit: 'count' },
  ];
}

function insightsFacts(journey: Journey): ProofFact[] {
  return [
    { key: 'proof.floor', value: journey.summary.light_floor_ms, unit: 'ms' },
    { key: 'proof.inflation', value: journey.summary.inflation, unit: 'ratio' },
    { key: 'proof.residual', value: residualOf(journey), unit: 'ms' },
    { key: 'proof.countries', value: journey.summary.countries.length, unit: 'count' },
  ];
}

function roadmapFacts(journey: Journey, located: Located): ProofFact[] {
  return [
    { key: 'proof.hops', value: located.total, unit: 'count' },
    { key: 'proof.segments', value: journey.segments.length, unit: 'count' },
    { key: 'proof.holes', value: journey.summary.gaps, unit: 'count' },
    { key: 'proof.rejected', value: rejectedOf(journey), unit: 'count' },
  ];
}

function exportFacts(journey: Journey, located: Located): ProofFact[] {
  return [
    { key: 'proof.hops', value: located.total, unit: 'count' },
    { key: 'proof.segments', value: journey.segments.length, unit: 'count' },
    { key: 'proof.distance', value: journey.summary.distance_km_min, unit: 'km' },
  ];
}

function storyFacts(journey: Journey): ProofFact[] {
  return [
    { key: 'proof.log', value: (journey.story ?? []).length, unit: 'count' },
    { key: 'proof.countries', value: journey.summary.countries.length, unit: 'count' },
    { key: 'proof.networks', value: journey.summary.networks, unit: 'count' },
  ];
}

/**
 * The figures of one block, in the order they are worth reading. A figure the
 * journey does not carry is `null` and is shown as an em dash — never as zero.
 */
export function proofFacts(input: ProofInput): ProofFact[] {
  const { journey, block } = input;
  const located = locatedOf(journey);
  switch (block) {
    case 'map':
      return mapFacts(journey, located);
    case 'timeline':
      return timelineFacts(journey, located);
    case 'hop':
      return hopFacts(input.hop ?? null);
    case 'insights':
      return insightsFacts(journey);
    case 'roadmap':
      return roadmapFacts(journey, located);
    case 'export':
      return exportFacts(journey, located);
    case 'story':
      return storyFacts(journey);
    case 'compare':
      return [{ key: 'proof.available', value: input.available ?? 0, unit: 'count' }];
    default:
      return [];
  }
}
