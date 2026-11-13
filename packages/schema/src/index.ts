/**
 * Zod schemas and inferred types for `journey.json` (VOY-F-37, VOY-P-18).
 *
 * This file is the single source of truth for the data model: the CLI, the
 * site, the gallery fixtures and the MCP server all validate against it.
 */
import { z } from 'zod';

/* ------------------------------------------------------------------ enums */

export const HOP_CLASSES = [
  'private', 'cgnat', 'link-local', 'loopback',
  'documentation', 'multicast', 'reserved', 'public',
] as const;
export const HopClassSchema = z.enum(HOP_CLASSES);
export type HopClass = z.infer<typeof HopClassSchema>;

export const CERTAINTIES = ['measured', 'inferred', 'assumed'] as const;
export const CertaintySchema = z.enum(CERTAINTIES);
export type Certainty = z.infer<typeof CertaintySchema>;

export const CONFIDENCE_LEVELS = ['solid', 'probable', 'uncertain', 'unlocated'] as const;
export const ConfidenceLevelSchema = z.enum(CONFIDENCE_LEVELS);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

export const SEGMENT_KINDS = ['local', 'undetermined', 'sea', 'sea-or-fixed'] as const;
export const SegmentKindSchema = z.enum(SEGMENT_KINDS);
export type SegmentKind = z.infer<typeof SegmentKindSchema>;

export const CABLE_BANDS = ['high', 'medium', 'low'] as const;
export const CableBandSchema = z.enum(CABLE_BANDS);
export type CableBand = z.infer<typeof CableBandSchema>;

export const REJECTION_REASONS = ['light', 'triangle', 'anycast', 'no-candidate'] as const;
export const RejectionReasonSchema = z.enum(REJECTION_REASONS);
export type RejectionReason = z.infer<typeof RejectionReasonSchema>;

export const REDACTION_LEVELS = ['country', 'city'] as const;
export const RedactionLevelSchema = z.enum(REDACTION_LEVELS);
export type RedactionLevel = z.infer<typeof RedactionLevelSchema>;

/* ------------------------------------------------------------------ atoms */

export const PositionSchema = z.object({ lat: z.number(), lon: z.number() });
export type Position = z.infer<typeof PositionSchema>;

export const ReplySchema = z.object({
  ip: z.string(),
  name: z.string().nullish(),
  rtt_ms: z.array(z.number()),
  loss: z.number().min(0).max(1).optional(),
  flags: z.array(z.string()).optional(),
});
export type Reply = z.infer<typeof ReplySchema>;

export const CandidateSchema = PositionSchema.extend({
  city: z.string(),
  country: z.string().nullish(),
  source: z.string(),
  weight: z.number().min(0).max(1),
  anycast: z.boolean().optional(),
});
export type Candidate = z.infer<typeof CandidateSchema>;

export const RejectionSchema = z.object({
  source: z.string(),
  city: z.string(),
  country: z.string().nullish(),
  reason: RejectionReasonSchema,
  allowed_km: z.number(),
  needed_km: z.number(),
});
export type Rejection = z.infer<typeof RejectionSchema>;

export const LocationSchema = PositionSchema.extend({
  city: z.string(),
  country: z.string().nullish(),
  confidence: z.number().min(0).max(1),
  level: ConfidenceLevelSchema,
  sources: z.array(z.string()),
  rejected: z.array(RejectionSchema),
});
export type Location = z.infer<typeof LocationSchema>;

export const HopSchema = z.object({
  ttl: z.number().int().min(0),
  replies: z.array(ReplySchema),
  class: HopClassSchema,
  asn: z.number().int().nullish(),
  as_name: z.string().nullish(),
  prefix: z.string().nullish(),
  ixp: z.string().nullish(),
  anycast: z.boolean().optional(),
  mpls: z.array(z.string()).optional(),
  envelope_ms: z.number().nullish(),
  location: LocationSchema.nullish(),
});
export type Hop = z.infer<typeof HopSchema>;

export const CableMatchSchema = z.object({
  id: z.string(),
  name: z.string(),
  compatibility: z.number().min(0).max(1),
  band: CableBandSchema,
  landings: z.array(z.string()),
  length_km: z.number().nullish(),
  rfs_year: z.number().int().nullish(),
  owners: z.array(z.string()).optional(),
  source: z.string(),
});
export type CableMatch = z.infer<typeof CableMatchSchema>;

export const SegmentSchema = z.object({
  from_ttl: z.number().int(),
  to_ttl: z.number().int(),
  kind: SegmentKindSchema,
  geodesic_km: z.number().min(0),
  delta_ms: z.number().nullish(),
  skipped_hops: z.number().int().min(0),
  cables: z.array(CableMatchSchema),
  other_cables: z.number().int().min(0),
  fixed_link: z.string().nullish(),
});
export type Segment = z.infer<typeof SegmentSchema>;

export const DetourSchema = z.object({
  kind: z.enum(['country-return', 'zigzag']),
  ttls: z.array(z.number().int()),
  detail: z.string(),
});
export type Detour = z.infer<typeof DetourSchema>;

export const SummarySchema = z.object({
  distance_km_min: z.number().min(0),
  rtt_ms: z.number().nullish(),
  light_floor_ms: z.number().nullish(),
  inflation: z.number().nullish(),
  countries: z.array(z.string()),
  networks: z.number().int().min(0),
  ixps: z.number().int().min(0),
  detours: z.array(DetourSchema),
  rejected_by_light: z.number().int().min(0),
  gaps: z.number().int().min(0),
});
export type Summary = z.infer<typeof SummarySchema>;

export const SourceSchema = z.object({
  label: z.string().nullish(),
  lat: z.number().nullish(),
  lon: z.number().nullish(),
  precision: z.enum(['city', 'country']).nullish(),
  declared: z.boolean().optional(),
});
export type Source = z.infer<typeof SourceSchema>;

export const TargetSchema = z.object({
  host: z.string(),
  ip: z.string().nullish(),
});
export type Target = z.infer<typeof TargetSchema>;

export const StoryEntrySchema = z.object({
  kind: z.enum(['stop', 'crossing', 'gap', 'rejected', 'arrival']),
  ttl: z.number().int().nullish(),
  certainty: CertaintySchema,
  en: z.string(),
  fr: z.string(),
});
export type StoryEntry = z.infer<typeof StoryEntrySchema>;

export const StampSchema = z.object({
  kind: z.enum(['country', 'network', 'ixp']),
  label: z.string(),
  count: z.number().int().min(0),
});
export type Stamp = z.infer<typeof StampSchema>;

/* --------------------------------------------------------------- journey */

export const JourneySchema = z.object({
  version: z.literal(1),
  traced_at: z.string(),
  tool: z.enum(['traceroute', 'tracert', 'mtr', 'mtr-json', 'atlas', 'pasted', 'unknown']),
  protocol: z.string(),
  family: z.union([z.literal(4), z.literal(6)]),
  source: SourceSchema.nullish(),
  target: TargetSchema,
  hops: z.array(HopSchema),
  segments: z.array(SegmentSchema),
  summary: SummarySchema,
  story: z.array(StoryEntrySchema).optional(),
  credits: z.array(z.string()),
  redaction: z.object({
    level: RedactionLevelSchema,
    applied: z.boolean(),
  }).nullish(),
});
export type Journey = z.infer<typeof JourneySchema>;

/* ------------------------------------------------------------ provenance */

export const ProvenanceSchema = z.object({
  id: z.string(),
  title: z.string(),
  origin: z.string(),
  url: z.string(),
  licence: z.string(),
  retrieved_at: z.string(),
  query: z.string().optional(),
  transform: z.string().optional(),
  attribution: z.string(),
  features: z.number().int().min(0),
  sha256: z.string(),
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

/* --------------------------------------------------------------- dataset */

export const LandingSchema = PositionSchema.extend({
  name: z.string(),
  country: z.string().nullish(),
});
export type Landing = z.infer<typeof LandingSchema>;

export const CableSchema = z.object({
  id: z.string(),
  name: z.string(),
  length_km: z.number().nullish(),
  rfs_year: z.number().int().nullish(),
  owners: z.array(z.string()).optional(),
  landings: z.array(LandingSchema),
  geometry: z.array(z.array(PositionSchema)),
  status: z.enum(['in-service', 'retired', 'planned']),
  source: z.string(),
});
export type Cable = z.infer<typeof CableSchema>;

export const LandmassSchema = z.object({
  id: z.string(),
  name: z.string(),
  polygons: z.array(z.array(PositionSchema)),
});
export type Landmass = z.infer<typeof LandmassSchema>;

export const FixedLinkSchema = z.object({
  id: z.string(),
  name: z.string(),
  a: PositionSchema,
  b: PositionSchema,
  countries: z.array(z.string()),
});
export type FixedLink = z.infer<typeof FixedLinkSchema>;

export const HintCitySchema = PositionSchema.extend({
  code: z.string(),
  city: z.string(),
  country: z.string(),
  kind: z.enum(['airport', 'city']),
});
export type HintCity = z.infer<typeof HintCitySchema>;

/* ---------------------------------------------------------------- errors */

export class JourneyParseError extends Error {
  /** Structured Zod issues, so a caller can show what is wrong. */
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`invalid journey: ${issues.join('; ')}`);
    this.name = 'JourneyParseError';
    this.issues = issues;
  }
}

export function parseJourney(text: string): Journey {
  const result = JourneySchema.safeParse(JSON.parse(text));
  if (!result.success) {
    throw new JourneyParseError(result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }
  return result.data;
}

export function parseJourneySafe(text: string): { ok: true; journey: Journey } | { ok: false; issues: string[] } {
  try {
    return { ok: true, journey: parseJourney(text) };
  } catch (error) {
    if (error instanceof JourneyParseError) return { ok: false, issues: error.issues };
    return { ok: false, issues: [(error as Error).message] };
  }
}
