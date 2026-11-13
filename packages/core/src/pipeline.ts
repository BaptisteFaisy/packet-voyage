/**
 * The whole chain, wired once: parse -> hints -> envelopes -> locate ->
 * segments -> cables -> summary -> story (§7.1 of the specification).
 *
 * Pure: no network, no clock, no dataset of its own. Everything external
 * (candidates, cables, landmasses, the moment of the trace) comes in as an
 * argument, which is what makes the property tests possible.
 */
import type {
  Cable, CableMatch, Candidate, FixedLink, HintCity, Hop, Journey, Landmass,
  Segment, StoryEntry, Summary, Target,
} from '@packet-voyage/schema';

import { parseTrace } from './parse/index.ts';
import type { ParsedTrace, TraceFormat } from './parse/index.ts';
import { classifyAddress } from './addr/index.ts';
import { findHints } from './hints/index.ts';
import { computeEnvelopes } from './envelope/index.ts';
import { locate } from './locate/index.ts';
import type { LocatedHop } from './locate/index.ts';
import { buildSegments } from './segments/index.ts';
import { compatibleCables } from './cables/index.ts';
import { summarize } from './metrics/index.ts';
import { buildStory } from './story/index.ts';
import { DEFAULT_SETTINGS, withSettings } from './settings.ts';
import type { Settings } from './settings.ts';

export interface SourcePosition {
  lat: number;
  lon: number;
  label?: string;
  country?: string;
}

export interface ComputeJourneyInput {
  /** A raw trace, in any supported format. */
  text?: string;
  /** Or an already parsed trace. */
  parsed?: ParsedTrace;
  /** Explicit format, when detection should not decide. */
  format?: TraceFormat;
  /** Candidates per hop, index-aligned with `hops`; the router-name hints are added to them. */
  candidates?: Candidate[][];
  /** Declared or deduced departure. */
  source?: SourcePosition | null;
  target?: Target | null;
  /** Injected clock: an RFC 3339 instant. */
  tracedAt: string;
  tool?: Journey['tool'];
  protocol?: string;
  cables?: Cable[];
  masses?: Landmass[];
  links?: FixedLink[];
  hints?: HintCity[];
  credits?: string[];
  settings?: Partial<Settings>;
}

/** Candidates deduced from the router names only: no network, no database. */
export function hintCandidates(hops: Hop[], table: HintCity[]): Candidate[][] {
  return hops.map((hop) => hintCandidatesFor(hop, table));
}

/** The candidates one hop's router names yield, and nothing else. */
function hintCandidatesFor(hop: Hop, table: HintCity[]): Candidate[] {
  return hop.replies.flatMap((reply) =>
    reply.name ? findHints(reply.name, table).map(toCandidate) : [],
  );
}

function toCandidate(hint: HintCity): Candidate {
  return {
    city: hint.city,
    country: hint.country,
    lat: hint.lat,
    lon: hint.lon,
    source: 'name-hint',
    weight: 0.6,
  };
}

/** Count every light rejection, including those on unlocated hops. */
function withAllRejections(summary: Summary, result: ReturnType<typeof locate>): Summary {
  const rejectedByLight = result.rejected.filter((entry) => entry.reason === 'light').length;
  return { ...summary, rejected_by_light: Math.max(summary.rejected_by_light, rejectedByLight) };
}

/** "Lyon, FR" — the shape §11.4 gives the departure, and what redaction reads. */
function sourceLabel(source: SourcePosition): string | null {
  if (!source.label) return null;
  return source.country ? `${source.label}, ${source.country}` : source.label;
}

function withClasses(hops: Hop[]): Hop[] {
  return hops.map((hop) =>
    hop.replies.every((reply) => reply.ip === '')
      ? hop
      : { ...hop, class: classifyAddress(hop.replies[0]?.ip ?? '') },
  );
}

/**
 * The endpoint context is an internal convenience for the cable scoring
 * (§7.10): it never belongs in a journey file, which the schema defines.
 */
function withoutContext(segment: Segment & { context?: unknown }): Segment {
  const rest: Record<string, unknown> = { ...segment };
  delete rest.context;
  return rest as Segment;
}

function attachCables(
  segments: ReturnType<typeof buildSegments>,
  cables: Cable[],
  tracedAt: string,
  settings: Settings,
) {
  return segments.map((segment) => {
    if (segment.kind === 'local') return withoutContext(segment);
    const found: { cables: CableMatch[]; other_cables: number } =
      compatibleCables(segment, cables, tracedAt, settings);
    return withoutContext({ ...segment, cables: found.cables, other_cables: found.other_cables });
  });
}

/** The candidates of every hop: the router names (§7.5) plus the enrichment's. */
function candidatesFor(hops: Hop[], provided: Candidate[][] | undefined, table: HintCity[]): Candidate[][] {
  if (!provided) return hintCandidates(hops, table);
  return hops.map((hop, index) => [...hintCandidatesFor(hop, table), ...(provided[index] ?? [])]);
}

/** Compute a whole journey from a trace (or an already parsed trace). */
export function computeJourney(input: ComputeJourneyInput): Journey {
  const settings = input.settings ? withSettings(input.settings) : DEFAULT_SETTINGS;
  const parsed = input.parsed ?? parseTrace(input.text ?? '', { format: input.format });
  const hops = withClasses(parsed.hops);
  const envelopes = computeEnvelopes(hops);
  const candidates = candidatesFor(hops, input.candidates, input.hints ?? []);

  const locatedResult: ReturnType<typeof locate> = locate({
    hops,
    candidates,
    envelopes,
    source: input.source ?? null,
    settings,
  });
  const located: LocatedHop[] = locatedResult.hops;

  const sourcePos = input.source ? { lat: input.source.lat, lon: input.source.lon } : null;
  const segments = attachCables(
    buildSegments(located, input.masses ?? [], input.links ?? [], settings, sourcePos),
    input.cables ?? [],
    input.tracedAt,
    settings,
  );

  const journey: Journey = {
    version: 1,
    traced_at: input.tracedAt,
    tool: input.tool ?? parsed.tool,
    protocol: input.protocol ?? parsed.protocol,
    family: parsed.family,
    source: input.source
      ? {
          label: sourceLabel(input.source),
          lat: input.source.lat,
          lon: input.source.lon,
          precision: 'city',
          declared: true,
        }
      : null,
    target: input.target ?? parsed.target ?? { host: 'unknown', ip: null },
    hops: located.map((entry) => ({ ...entry.hop, location: entry.location })),
    segments,
    // The flat rejection list is authoritative: a candidate rejected on a hop
    // that ended up unlocated is still a lie the light caught (§4 indicator).
    summary: withAllRejections(summarize(located, segments, settings, sourcePos), locatedResult),
    credits: input.credits ?? [],
    redaction: null,
  };

  const story: StoryEntry[] = buildStory(journey, settings);
  return { ...journey, story };
}
