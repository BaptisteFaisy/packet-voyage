import type { Cable, CableBand, CableMatch, Landing, Position, Segment } from '@packet-voyage/schema';
import { haversineKm } from '../geo/index.ts';
import type { Settings } from '../settings.ts';

/**
 * Optional geographic/operator context attached to a segment or passed alongside
 * so `compatibleCables` and `scoreCable` can evaluate exact landing distances
 * and operator matches (§7.10) without breaking the binding 3/4-arg signatures.
 */
export interface SegmentContext {
  from?: Position;
  to?: Position;
  fromAsName?: string | null;
  toAsName?: string | null;
}

export type SegmentWithContext = Segment & {
  context?: SegmentContext;
};

const LANDING_PROXIMITY_SCALE_KM = 1000;
const SAME_SIDE_RADIUS_KM = 1500;

function traceYear(tracedAt: string): number | null {
  const ms = Date.parse(tracedAt);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).getUTCFullYear();
}

function isInServiceAt(cable: Cable, tracedAt: string): boolean {
  if (cable.status !== 'in-service') return false;
  const year = traceYear(tracedAt);
  if (year !== null && cable.rfs_year != null && cable.rfs_year > year) {
    return false;
  }
  return true;
}

function polylineLengthKm(line: Position[]): number {
  let total = 0;
  for (let i = 1; i < line.length; i += 1) {
    const prev = line[i - 1];
    const curr = line[i];
    if (prev && curr) total += haversineKm(prev, curr);
  }
  return total;
}

function closestIndexOnLine(p: Position, line: Position[]): { idx: number; distKm: number } {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < line.length; i += 1) {
    const pt = line[i];
    if (!pt) continue;
    const d = haversineKm(p, pt);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return { idx: bestIdx, distKm: bestDist };
}

function geometrySegmentLengthKm(cable: Cable, la: Landing, lb: Landing): number | null {
  for (const line of cable.geometry) {
    if (line.length < 2) continue;
    const snapA = closestIndexOnLine(la, line);
    const snapB = closestIndexOnLine(lb, line);
    if (snapA.distKm > 100 || snapB.distKm > 100) continue;
    const lo = Math.min(snapA.idx, snapB.idx);
    const hi = Math.max(snapA.idx, snapB.idx);
    if (lo === hi) continue;
    return polylineLengthKm(line.slice(lo, hi + 1));
  }
  if (cable.geometry.length === 1 && cable.geometry[0] && cable.geometry[0].length >= 2) {
    const lineLen = polylineLengthKm(cable.geometry[0]);
    if (lineLen > 0 && cable.landings.length === 2) {
      return lineLen;
    }
  }
  return null;
}

/**
 * Estimates cable distance between two landings: uses cable geometry when usable,
 * otherwise falls back to `cableFactor * haversineKm(la, lb)` (§7.10).
 */
export function cableSegmentLengthKm(
  cable: Cable,
  la: Landing,
  lb: Landing,
  settings: Settings,
): number {
  const geomLen = geometrySegmentLengthKm(cable, la, lb);
  if (geomLen !== null && geomLen > 0) {
    return geomLen;
  }
  return settings.cableFactor * haversineKm(la, lb);
}

function landingDistanceSum(
  la: Landing,
  lb: Landing,
  ctx: SegmentContext | undefined,
  seg: Segment,
): { dALa: number; dLbB: number } {
  if (ctx?.from && ctx?.to) {
    return {
      dALa: haversineKm(ctx.from, la),
      dLbB: haversineKm(lb, ctx.to),
    };
  }
  return { dALa: 0, dLbB: Math.max(0, seg.geodesic_km - haversineKm(la, lb)) };
}

function hasBothSides(
  la: Landing,
  lb: Landing,
  ctx: SegmentContext | undefined,
): boolean {
  if (haversineKm(la, lb) < 1e-6) {
    return false;
  }
  if (!ctx?.from || !ctx?.to) {
    return true;
  }
  const dA = haversineKm(ctx.from, la);
  const dB = haversineKm(ctx.to, lb);
  const dACross = haversineKm(ctx.to, la);
  const dBCross = haversineKm(ctx.from, lb);
  if (dA > dACross && dB > dBCross) return false;
  const maxSide = Math.max(SAME_SIDE_RADIUS_KM, haversineKm(ctx.from, ctx.to));
  return dA <= maxSide && dB <= maxSide;
}

export interface LandingPairEval {
  la: Landing;
  lb: Landing;
  landKm: number;
  cableKm: number;
  totalKm: number;
  expectedMs: number;
}

/**
 * Picks the best ordered landing pair `(La, Lb)` for a crossing (§7.10).
 * Returns null if the cable does not have distinct landings on each side.
 */
export function bestLandingPair(
  cable: Cable,
  seg: SegmentWithContext,
  settings: Settings,
): LandingPairEval | null {
  if (cable.landings.length < 2) return null;
  const ctx = seg.context;
  let best: LandingPairEval | null = null;

  for (let i = 0; i < cable.landings.length; i += 1) {
    const la = cable.landings[i];
    if (!la) continue;
    for (let j = 0; j < cable.landings.length; j += 1) {
      const lb = cable.landings[j];
      if (i === j || !lb) continue;
      if (!hasBothSides(la, lb, ctx)) continue;

      const { dALa, dLbB } = landingDistanceSum(la, lb, ctx, seg);
      const landKm = dALa + dLbB;
      // Cheap pruning: cableKm is never negative, so a worse land leg cannot win.
      if (best !== null && settings.landFactor * landKm >= best.totalKm) continue;

      const cableKm = cableSegmentLengthKm(cable, la, lb, settings);
      const totalKm = settings.landFactor * landKm + cableKm;
      const expectedMs = (2 * totalKm) / settings.lightFibreKmPerMs;
      if (best === null || totalKm < best.totalKm) {
        best = { la, lb, landKm, cableKm, totalKm, expectedMs };
      }
    }
  }
  return best;
}

function delayComponent(expectedMs: number, deltaMs: number | null, settings: Settings): number {
  if (deltaMs == null || deltaMs <= 0) {
    return 0.5;
  }
  if (expectedMs <= deltaMs) {
    const ratio = expectedMs / deltaMs;
    return Math.max(0, Math.min(1, ratio));
  }
  const maxAllowed = deltaMs * (1 + settings.cableTolerance);
  if (expectedMs > maxAllowed) return 0;
  const overshoot = (expectedMs - deltaMs) / Math.max(1e-9, maxAllowed - deltaMs);
  return Math.max(0, Math.min(1, 1 - 0.15 * overshoot));
}

function proximityComponent(landKm: number): number {
  return Math.max(0, Math.min(1, 1 / (1 + landKm / LANDING_PROXIMITY_SCALE_KM)));
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function ownerTokensMatch(asName: string, owner: string): boolean {
  const a = normalizeName(asName);
  const o = normalizeName(owner);
  if (a.length < 2 || o.length < 2) return false;
  if (a.includes(o) || o.includes(a)) return true;
  const aWords = new Set(a.split(' ').filter((w) => w.length >= 3));
  const oWords = o.split(' ').filter((w) => w.length >= 3);
  return oWords.some((w) => aWords.has(w));
}

function operatorComponent(cable: Cable, ctx: SegmentContext | undefined): number {
  const owners = cable.owners ?? [];
  if (owners.length === 0) return 0.5;
  const names = [ctx?.fromAsName, ctx?.toAsName].filter((n): n is string => Boolean(n && n.trim()));
  if (names.length === 0) return 0;
  const matched = owners.some((owner) => names.some((asName) => ownerTokensMatch(asName, owner)));
  return matched ? 1 : 0;
}

export function bandForScore(score: number, settings: Settings): CableBand {
  if (score >= settings.maxCableScoreBands.high) return 'high';
  if (score >= settings.maxCableScoreBands.medium) return 'medium';
  return 'low';
}

/**
 * Scores a cable's compatibility for a given segment in [0, 1] (§7.10).
 * Weights: 0.5 delay + 0.2 proximity + 0.3 operator match.
 * Never presented as a probability.
 */
export function scoreCable(
  cable: Cable,
  seg: Segment,
  settings: Settings,
): { compatibility: number; band: CableBand } {
  const segCtx = (seg as SegmentWithContext).context;
  const pair = bestLandingPair(cable, seg as SegmentWithContext, settings);
  if (!pair) {
    return { compatibility: 0, band: 'low' };
  }
  const dScore = delayComponent(pair.expectedMs, seg.delta_ms ?? null, settings);
  const pScore = proximityComponent(pair.landKm);
  const oScore = operatorComponent(cable, segCtx);
  const raw = 0.5 * dScore + 0.2 * pScore + 0.3 * oScore;
  const compatibility = Math.max(0, Math.min(1, Math.round(raw * 1000) / 1000));
  return { compatibility, band: bandForScore(compatibility, settings) };
}

function satisfiesDelayBudget(
  pair: LandingPairEval,
  deltaMs: number | null | undefined,
  settings: Settings,
): boolean {
  if (deltaMs == null) return true;
  if (deltaMs < 0) return false;
  return pair.expectedMs <= deltaMs * (1 + settings.cableTolerance);
}

/**
 * Filters, scores, and stably sorts compatible cables for a crossing (VOY-F-23, VOY-P-13).
 *
 * Returns at most `settings.maxCablesShown` entries and the exact `other_cables` count.
 */
export function compatibleCables(
  seg: Segment,
  cables: Cable[],
  tracedAt: string,
  settings: Settings,
): { cables: CableMatch[]; other_cables: number } {
  if (seg.kind === 'local') {
    return { cables: [], other_cables: 0 };
  }
  const scored: CableMatch[] = [];

  for (const cable of cables) {
    if (!isInServiceAt(cable, tracedAt)) continue;
    const pair = bestLandingPair(cable, seg as SegmentWithContext, settings);
    if (!pair) continue;
    if (!satisfiesDelayBudget(pair, seg.delta_ms, settings)) continue;

    const { compatibility, band } = scoreCable(cable, seg, settings);
    scored.push({
      id: cable.id,
      name: cable.name,
      compatibility,
      band,
      landings: [pair.la.name, pair.lb.name],
      length_km: cable.length_km ?? null,
      rfs_year: cable.rfs_year ?? null,
      owners: cable.owners,
      source: cable.source,
    });
  }

  scored.sort((a, b) => {
    if (b.compatibility !== a.compatibility) return b.compatibility - a.compatibility;
    const nameCmp = a.name.localeCompare(b.name);
    if (nameCmp !== 0) return nameCmp;
    return a.id.localeCompare(b.id);
  });

  const maxShown = Math.max(0, settings.maxCablesShown);
  const shown = scored.slice(0, maxShown);
  const other_cables = Math.max(0, scored.length - shown.length);
  return { cables: shown, other_cables };
}
