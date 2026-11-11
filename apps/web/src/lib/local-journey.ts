import type {
  Candidate,
  HintCity,
  Hop,
  Journey,
  Location,
  Position,
  Rejection,
} from '@packet-voyage/schema';
import type { ParsedTrace, Settings } from './journey-source.ts';
import {
  computeEnvelopes,
  findHints,
  haversineKm,
  parseTrace,
  withSettings,
} from './journey-source.ts';
import { FALLBACK_HINTS } from './hint-table.ts';
import { buildSegmentsLocal, summarizeLocal } from './local-segments.ts';

export interface LocalJourneyOptions {
  tracedAt: string;
  hints?: HintCity[];
  source?: (Position & { label?: string; country?: string }) | null;
  settings?: Partial<Settings>;
}

export interface LocalJourneyResult {
  ok: boolean;
  journey: Journey | null;
  parsed: ParsedTrace | null;
  unknownLine: string | null;
  warnings: string[];
}

/** Candidates from router names only: no request, no database (P8). */
export function hintCandidatesFor(hops: Hop[], table: HintCity[]): Candidate[][] {
  return hops.map((hop) => {
    const found: Candidate[] = [];
    for (const reply of hop.replies) {
      if (!reply.name) continue;
      for (const hint of findHints(reply.name, table)) {
        found.push({
          city: hint.city,
          country: hint.country,
          lat: hint.lat,
          lon: hint.lon,
          source: 'name-hint',
          weight: 0.6,
        });
      }
    }
    return dedupeCandidates(found);
  });
}

function dedupeCandidates(list: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const candidate of list) {
    const key = `${candidate.city}|${candidate.lat.toFixed(3)}|${candidate.lon.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(candidate);
  }
  return out;
}

/**
 * Light filtering of one hop's candidates against the step bound (§7.6):
 * a candidate farther than `c × env / 2 + slack` from the departure is
 * rejected and kept with its numbers — the rejection is the demo.
 */
export function filterByLightLocal(
  candidates: Candidate[],
  envelopeMs: number | null,
  from: Position | null,
  settings: Settings,
): { kept: Candidate[]; rejected: Rejection[] } {
  if (envelopeMs === null || from === null) return { kept: candidates, rejected: [] };
  const allowedKm = (settings.lightVacuumKmPerMs * envelopeMs) / 2 + settings.slackKm;
  const kept: Candidate[] = [];
  const rejected: Rejection[] = [];
  for (const candidate of candidates) {
    const neededKm = haversineKm(from, candidate);
    if (neededKm <= allowedKm) {
      kept.push(candidate);
    } else {
      rejected.push({
        source: candidate.source,
        city: candidate.city,
        country: candidate.country ?? null,
        reason: 'light',
        allowed_km: Math.round(allowedKm),
        needed_km: Math.round(neededKm),
      });
    }
  }
  return { kept, rejected };
}

function confidenceOf(kept: Candidate[]): { confidence: number; level: Location['level'] } {
  let fused = 0;
  for (const candidate of kept) {
    fused = fused === 0 ? candidate.weight : 1 - (1 - fused) * (1 - candidate.weight);
  }
  if (fused >= 0.8) return { confidence: fused, level: 'solid' };
  if (fused >= 0.5) return { confidence: fused, level: 'probable' };
  if (fused > 0) return { confidence: fused, level: 'uncertain' };
  return { confidence: 0, level: 'unlocated' };
}

function pickBest(kept: Candidate[]): Candidate | null {
  if (kept.length === 0) return null;
  let best: Candidate | null = null;
  for (const candidate of kept) {
    if (!best || candidate.weight > best.weight) best = candidate;
  }
  return best;
}

/** Locate every hop with the local light filter; unlocated hops stay unlocated. */
export function locateHopsLocal(
  hops: Hop[],
  envelopes: (number | null)[],
  from: Position | null,
  settings: Settings,
  candidates: Candidate[][],
): Hop[] {
  return hops.map((hop, index) => {
    const list = candidates[index] ?? [];
    const { kept, rejected } = filterByLightLocal(list, envelopes[index] ?? null, from, settings);
    const envelope = envelopes[index] ?? null;
    if (kept.length === 0) return { ...hop, envelope_ms: envelope, location: null };
    const best = pickBest(kept);
    if (!best) return { ...hop, envelope_ms: envelope, location: null };
    const { confidence, level } = confidenceOf(kept);
    const location: Location = {
      city: best.city,
      country: best.country ?? null,
      lat: best.lat,
      lon: best.lon,
      confidence,
      level,
      sources: [...new Set(kept.map((candidate) => candidate.source))].sort(),
      rejected,
    };
    return { ...hop, envelope_ms: envelope, location };
  });
}

/**
 * Compute a journey locally, name hints only, zero request (VOY-F-01,
 * VOY-N-01, P8). Never throws: an unreadable trace yields `ok: false`
 * with the first un-understood line (VOY-F-02).
 */
export function buildLocalJourney(text: string, options: LocalJourneyOptions): LocalJourneyResult {
  const settings = withSettings(options.settings ?? {});
  const parsed = parseTrace(text);
  if (parsed.format === 'unknown' || parsed.hops.length === 0) {
    return {
      ok: false,
      journey: null,
      parsed,
      unknownLine: parsed.unknownLines[0] ?? null,
      warnings: parsed.warnings,
    };
  }
  const table = options.hints ?? FALLBACK_HINTS;
  const envelopes = computeEnvelopes(parsed.hops);
  const source = options.source ?? null;
  const candidates = hintCandidatesFor(parsed.hops, table);
  const hops = locateHopsLocal(parsed.hops, envelopes, source, settings, candidates);
  const segments = buildSegmentsLocal(hops, settings);
  const located = hops.filter((hop) => hop.location !== null);
  const lastPos = located.length > 0 ? located[located.length - 1]?.location ?? null : null;
  const target = lastPos ? { lat: lastPos.lat, lon: lastPos.lon } : null;
  const summary = summarizeLocal(hops, segments, settings, source, target);
  const journey: Journey = {
    version: 1,
    traced_at: options.tracedAt,
    tool: parsed.tool === 'unknown' ? 'pasted' : parsed.tool,
    protocol: parsed.protocol,
    family: parsed.family,
    source: source
      ? { label: source.label ?? null, lat: source.lat, lon: source.lon, precision: 'city', declared: true }
      : null,
    target: parsed.target ?? { host: 'pasted trace', ip: null },
    hops,
    segments,
    summary,
    credits: [],
    redaction: null,
  };
  return { ok: true, journey, parsed, unknownLine: null, warnings: parsed.warnings };
}
