import type { Candidate, Hop, Position, Rejection } from '@packet-voyage/schema';
import { stepAllowedKm, triangleAllowedKm } from '../envelope/index.ts';
import { haversineKm } from '../geo/index.ts';
import type { Settings } from '../settings.ts';
import { fuseCandidates } from './fuse.ts';
import { filterByLight } from './filter.ts';
import { choosePositions, violatesTriangleBound } from './dp.ts';
import type {
  CandidateHop,
  FusedCandidate,
  LocatedHop,
  LocateInput,
  LocateResult,
} from './types.ts';

export type {
  CandidateHop,
  DpContext,
  FusedCandidate,
  LocatedHop,
  LocateInput,
  LocateResult,
  TransitionScore,
} from './types.ts';
export {
  applyTransitionPenalty,
  combinedWeight,
  confidenceLevelOf,
  confidenceOf,
} from './confidence.ts';
export { fuseCandidates } from './fuse.ts';
export { filterByLight } from './filter.ts';
export { choosePositions, violatesTriangleBound } from './dp.ts';

function compareStr(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Weight of the user-declared departure (§3 closed list, VOY-F-19). */
const DECLARED_WEIGHT = 1.0;

/**
 * A declared departure may be written "Lyon, FR" (§11.4). The city field must
 * hold a city name only, or every sentence would repeat the country twice.
 */
function splitDeclaredLabel(label?: string | null): { city: string; country: string | null } {
  const text = (label ?? '').trim();
  const comma = text.lastIndexOf(',');
  if (comma > 0) {
    const tail = text.slice(comma + 1).trim();
    if (tail.length === 2) {
      return { city: text.slice(0, comma).trim() || 'Departure', country: tail.toUpperCase() };
    }
  }
  return { city: text || 'Departure', country: null };
}

function declaredCandidate(source: Position & { label?: string; country?: string }): Candidate {
  const { city, country } = splitDeclaredLabel(source.label);
  return {
    city,
    country: country ?? source.country ?? null,
    lat: source.lat,
    lon: source.lon,
    source: 'declared',
    weight: DECLARED_WEIGHT,
  };
}

function compareRejection(a: Rejection, b: Rejection): number {
  return (
    compareStr(a.city, b.city) ||
    compareStr(a.source, b.source) ||
    compareStr(a.reason, b.reason) ||
    a.needed_km - b.needed_km ||
    a.allowed_km - b.allowed_km ||
    compareStr(a.country ?? '', b.country ?? '')
  );
}

/**
 * Anycast (VOY-F-20): when a hop carries anycast candidates (or is marked
 * `anycast: true`), keep only the single delay-compatible instance closest to
 * the departure (the light filter already removed incompatible ones); the
 * remaining instances are recorded as rejections with reason `anycast`.
 * In `relativeOnly` mode there is no reference point, so all surviving
 * instances remain available to the DP.
 */
function selectAnycastInstance(
  fused: FusedCandidate[],
  hopAnycast: boolean,
  allowedKm: number | null,
  sourcePos: Position | null,
): { kept: FusedCandidate[]; rejected: Rejection[] } {
  const flagged = fused.filter((c) => c.anycast === true);
  const instances = flagged.length > 0 ? flagged : hopAnycast ? fused : [];
  if (instances.length <= 1 || sourcePos === null) {
    return { kept: fused, rejected: [] };
  }
  const byDistance = [...instances].sort(
    (a, b) => haversineKm(sourcePos, a) - haversineKm(sourcePos, b) || compareStr(a.id, b.id),
  );
  const chosen = byDistance[0]!;
  const droppedIds = new Set(byDistance.slice(1).map((c) => c.id));
  const rejected: Rejection[] = byDistance.slice(1).map((c) => ({
    source: c.source,
    city: c.city,
    country: c.country ?? null,
    reason: 'anycast' as const,
    allowed_km: allowedKm ?? Infinity,
    needed_km: haversineKm(sourcePos, c),
  }));
  return {
    kept: fused.filter((c) => !droppedIds.has(c.id) || c.id === chosen.id),
    rejected,
  };
}

function prepareHop(
  hopIdx: number,
  input: LocateInput,
  sourcePos: Position | null,
  settings: Settings,
): { entry: CandidateHop; rejected: Rejection[] } {
  const hop: Hop = input.hops[hopIdx]!;
  const env = input.envelopes[hopIdx] ?? null;
  const raw: Candidate[] = [...(input.candidates[hopIdx] ?? [])];

  // The declared departure lands on the first hop when it is not public
  // (home box, CGNAT — §7.14 hop 1 "Chez toi", VOY-F-19). A declared candidate
  // provided by the caller is never duplicated.
  if (sourcePos && hopIdx === 0 && hop.class !== 'public' && input.source) {
    if (!raw.some((c) => c.source === 'declared')) raw.push(declaredCandidate(input.source));
  }

  // The hard step bound runs BEFORE fusion: an impossible candidate must
  // never merge into a valid one nor influence the path (VOY-P-06, VOY-P-09).
  const allowedKm = env !== null && sourcePos ? stepAllowedKm(env, settings) : null;
  const light =
    allowedKm !== null && sourcePos
      ? filterByLight(raw, allowedKm, sourcePos)
      : { kept: raw, rejected: [] as Rejection[] };

  const fused = fuseCandidates(light.kept, settings);
  const anycastHop = hop.anycast === true || raw.some((c) => c.anycast === true);
  const anycast = anycastHop
    ? selectAnycastInstance(fused, hop.anycast === true, allowedKm, sourcePos)
    : { kept: fused, rejected: [] as Rejection[] };

  const entry: CandidateHop = {
    hop: { ...hop, envelope_ms: env, ...(anycastHop ? { anycast: true } : {}) },
    location: null,
    candidates: anycast.kept,
  };
  const rejected = [...light.rejected, ...anycast.rejected].sort(compareRejection);
  return { entry, rejected };
}

function sameCoords(a: Position, b: Position): boolean {
  return Math.abs(a.lat - b.lat) < 1e-9 && Math.abs(a.lon - b.lon) < 1e-9;
}

function collectTriangleRejections(
  hopIdx: number,
  candidates: FusedCandidate[],
  chosen: LocatedHop[],
  envelopes: (number | null)[],
  sourcePos: Position | null,
  settings: Settings,
): Rejection[] {
  const envJ = envelopes[hopIdx] ?? null;
  if (envJ === null) return [];
  const chosenLoc = chosen[hopIdx]?.location ?? null;
  const allowedKm = triangleAllowedKm(envJ, settings);
  const rejections: Rejection[] = [];

  const currTtl = chosen[hopIdx]!.hop.ttl;
  for (const cand of candidates) {
    if (chosenLoc && cand.city === chosenLoc.city && sameCoords(cand, chosenLoc)) {
      continue;
    }
    let worstNeeded: number | null = null;
    for (let i = 0; i < chosen.length; i += 1) {
      const otherTtl = chosen[i]!.hop.ttl;
      if (otherTtl > currTtl || (otherTtl === currTtl && i >= hopIdx)) continue;
      const prevLoc = chosen[i]?.location ?? null;
      if (!prevLoc) continue;
      if (!violatesTriangleBound(prevLoc, cand, sourcePos, envJ, settings)) continue;
      const dAB = haversineKm(prevLoc, cand);
      const needed = sourcePos
        ? haversineKm(sourcePos, prevLoc) + dAB + haversineKm(cand, sourcePos)
        : 2 * dAB;
      if (worstNeeded === null || needed > worstNeeded) worstNeeded = needed;
    }
    if (worstNeeded !== null) {
      rejections.push({
        source: cand.source,
        city: cand.city,
        country: cand.country ?? null,
        reason: 'triangle',
        allowed_km: allowedKm,
        needed_km: worstNeeded,
      });
    }
  }
  return rejections;
}

/**
 * Public entry point of the locator (CONTRACTS §5.3, §7.5–§7.8).
 *
 * Applies the hard step light bound from the departure (when known), fuses the
 * surviving candidates per hop, runs the deterministic Viterbi path choice
 * (which enforces the hard triangle bound), and grades each retained position.
 * Nothing is ever invented: a hop without a surviving candidate stays
 * `location: null` (VOY-P-11).
 */
export function locate(input: LocateInput): LocateResult {
  const { hops, settings } = input;
  const sourcePos: Position | null =
    input.source && Number.isFinite(input.source.lat) && Number.isFinite(input.source.lon)
      ? { lat: input.source.lat, lon: input.source.lon }
      : null;

  const prepared: CandidateHop[] = [];
  const rejectedPerHop: Rejection[][] = [];
  for (let i = 0; i < hops.length; i += 1) {
    const { entry, rejected } = prepareHop(i, input, sourcePos, settings);
    prepared.push(entry);
    rejectedPerHop.push(rejected);
  }

  const envelopes = hops.map((_, i) => input.envelopes[i] ?? null);
  const chosen = choosePositions(prepared, settings, { source: sourcePos, envelopes });

  for (let i = 0; i < hops.length; i += 1) {
    const pool = prepared[i]!.candidates ?? [];
    const tri = collectTriangleRejections(i, pool, chosen, envelopes, sourcePos, settings);
    rejectedPerHop[i] = [...rejectedPerHop[i]!, ...tri].sort(compareRejection);
  }

  const finalHops: LocatedHop[] = chosen.map((entry, i) => ({
    hop: prepared[i]!.hop,
    location: entry.location ? { ...entry.location, rejected: rejectedPerHop[i]! } : null,
  }));

  return {
    hops: finalHops,
    rejected: rejectedPerHop.flat(),
    relativeOnly: sourcePos === null,
  };
}
