import type { Hop, Location, Position } from '@packet-voyage/schema';
import { triangleAllowedKm } from '../envelope/index.ts';
import { haversineKm } from '../geo/index.ts';
import type { Settings } from '../settings.ts';
import { applyTransitionPenalty, confidenceLevelOf } from './confidence.ts';
import type {
  CandidateHop,
  DpContext,
  FusedCandidate,
  LocatedHop,
  TransitionScore,
} from './types.ts';

const FIBRE_PENALTY = 0.65;
const ZIGZAG_PENALTY = 0.8;
const SAME_NETWORK_BONUS = 1.25;
const SAME_NETWORK_DELTA_MS = 1.0;
const EPSILON = 1e-9;

function compareStr(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function candidateIdOf(c: FusedCandidate): string {
  if (c.id) return c.id;
  const sources = Array.isArray(c.sources) ? [...c.sources].sort(compareStr).join('+') : c.source;
  return `${sources}|${c.city}|${c.lat}|${c.lon}`;
}

function toFusedCandidate(c: FusedCandidate | (Location & { id?: string })): FusedCandidate {
  const rawSources = (c as Partial<FusedCandidate>).sources;
  const sources = Array.isArray(rawSources) ? [...rawSources].sort(compareStr) : [];
  const weight = 'weight' in c ? c.weight : c.confidence;
  const source = 'source' in c ? c.source : (sources[0] ?? 'declared');
  const fused: FusedCandidate = {
    city: c.city,
    country: c.country ?? null,
    lat: c.lat,
    lon: c.lon,
    source,
    weight,
    sources: sources.length > 0 ? sources : [source],
    id: '',
  };
  fused.id = candidateIdOf(fused);
  return fused;
}

function extractCandidates(entry: CandidateHop): FusedCandidate[] {
  if (Array.isArray(entry.candidates)) {
    return entry.candidates
      .map((c) => toFusedCandidate(c))
      .sort((a, b) => compareStr(a.id, b.id));
  }
  if (entry.location) {
    return [toFusedCandidate(entry.location)];
  }
  return [];
}

function sameCity(a: FusedCandidate, b: FusedCandidate): boolean {
  return (
    a.city.trim().toLowerCase() === b.city.trim().toLowerCase() &&
    (a.country ?? null) === (b.country ?? null)
  );
}

/**
 * Checks whether transitioning from `prev` (at hop index `i`) to `curr` (at `j`)
 * violates the triangle hard bound (§7.6, VOY-P-07).
 *
 * When `source` is known: `d(S, p_i) + d(p_i, p_j) + d(p_j, S) > triangleAllowedKm(env_j)`.
 * When `source` is null (`relativeOnly`): `2 * d(p_i, p_j) > triangleAllowedKm(env_j)`.
 */
export function violatesTriangleBound(
  prev: Position,
  curr: Position,
  source: Position | null,
  envJ: number | null,
  settings: Settings,
): boolean {
  if (envJ === null) return false;
  const allowed = triangleAllowedKm(envJ, settings);
  const dAB = haversineKm(prev, curr);
  if (source === null) {
    return 2 * dAB > allowed;
  }
  const perimeter = haversineKm(source, prev) + dAB + haversineKm(curr, source);
  return perimeter > allowed;
}

function computeTransitionScore(
  prevHop: Hop,
  prevCand: FusedCandidate,
  prevEnv: number | null,
  currHop: Hop,
  currCand: FusedCandidate,
  currEnv: number | null,
  source: Position | null,
  settings: Settings,
): TransitionScore {
  if (violatesTriangleBound(prevCand, currCand, source, currEnv, settings)) {
    return { log: -Infinity, factor: 0, triangleViolated: true };
  }

  let penaltyFactor = 1;
  let bonusFactor = 1;
  const distKm = haversineKm(prevCand, currCand);

  if (prevEnv !== null && currEnv !== null) {
    const deltaMs = Math.max(0, currEnv - prevEnv);
    const fibreBudget = (settings.lightFibreKmPerMs * deltaMs) / 2 + settings.slackKm;
    if (distKm > fibreBudget) penaltyFactor *= FIBRE_PENALTY;
    if (
      prevHop.asn != null &&
      currHop.asn != null &&
      prevHop.asn === currHop.asn &&
      deltaMs < SAME_NETWORK_DELTA_MS &&
      sameCity(prevCand, currCand)
    ) {
      bonusFactor *= SAME_NETWORK_BONUS;
    }
  }

  if (source !== null) {
    const dPrevS = haversineKm(source, prevCand);
    const dCurrS = haversineKm(source, currCand);
    if (dPrevS - dCurrS > settings.zigzagKm) penaltyFactor *= ZIGZAG_PENALTY;
  }

  return {
    log: Math.log(penaltyFactor * bonusFactor),
    factor: penaltyFactor,
    triangleViolated: false,
  };
}

interface LocatedCell {
  logScore: number;
  prevHopIdx: number;
  prevCandIdx: number;
  transitionFactor: number;
}

function isBetterPath(
  scoreA: number,
  idA: string,
  scoreB: number,
  idB: string,
): boolean {
  if (Math.abs(scoreA - scoreB) > 1e-12) return scoreA > scoreB;
  return compareStr(idA, idB) < 0;
}

function violatesAnyEarlier(
  cells: LocatedCell[][],
  candsPerHop: FusedCandidate[][],
  prevHop: number,
  prevCand: number,
  currCand: FusedCandidate,
  currEnv: number | null,
  context: DpContext,
  settings: Settings,
): boolean {
  let h = prevHop;
  let c = prevCand;
  while (h >= 0) {
    const earlier = candsPerHop[h]![c]!;
    if (violatesTriangleBound(earlier, currCand, context.source, currEnv, settings)) {
      return true;
    }
    const cell = cells[h]![c]!;
    h = cell.prevHopIdx;
    c = cell.prevCandIdx;
  }
  return false;
}

interface Winner {
  cell: LocatedCell;
  prevId: string;
}

function considerPredecessor(
  prevCand: FusedCandidate,
  prevCell: LocatedCell,
  skipLog: number,
  stateLog: number,
  trans: TransitionScore,
  current: Winner,
): Winner {
  const total = prevCell.logScore + skipLog + trans.log + stateLog;
  if (!isBetterPath(total, prevCand.id, current.cell.logScore, current.prevId)) {
    return current;
  }
  return {
    cell: {
      logScore: total,
      prevHopIdx: prevCell.prevHopIdx,
      prevCandIdx: prevCell.prevCandIdx,
      transitionFactor: trans.factor,
    },
    prevId: prevCand.id,
  };
}

function bestFromEarlierLocated(
  hopIdx: number,
  cand: FusedCandidate,
  currEnv: number | null,
  ordered: CandidateHop[],
  candsPerHop: FusedCandidate[][],
  cells: LocatedCell[][],
  context: DpContext,
  settings: Settings,
  best: LocatedCell,
): LocatedCell {
  const unlocLog = Math.log(Math.max(EPSILON, settings.unlocatedScore));
  const stateLog = Math.log(Math.max(EPSILON, cand.weight));
  let winner: Winner = { cell: best, prevId: '~unlocated' };

  for (let k = 0; k < hopIdx; k += 1) {
    const prevCands = candsPerHop[k]!;
    const skipLog = (hopIdx - k - 1) * unlocLog;
    const prevEnv = context.envelopes[k] ?? ordered[k]!.hop.envelope_ms ?? null;

    for (let p = 0; p < prevCands.length; p += 1) {
      const prevCell = cells[k]![p]!;
      const prevCand = prevCands[p]!;
      const trans = computeTransitionScore(
        ordered[k]!.hop,
        prevCand,
        prevEnv,
        ordered[hopIdx]!.hop,
        cand,
        currEnv,
        context.source,
        settings,
      );
      if (
        trans.triangleViolated ||
        violatesAnyEarlier(cells, candsPerHop, k, p, cand, currEnv, context, settings)
      ) {
        continue;
      }
      const withHop: LocatedCell = { ...prevCell, prevHopIdx: k, prevCandIdx: p };
      winner = considerPredecessor(prevCand, withHop, skipLog, stateLog, trans, winner);
    }
  }
  return winner.cell;
}

function bestCellForCandidate(
  hopIdx: number,
  cand: FusedCandidate,
  ordered: CandidateHop[],
  candsPerHop: FusedCandidate[][],
  cells: LocatedCell[][],
  context: DpContext,
  settings: Settings,
): LocatedCell {
  const unlocLog = Math.log(Math.max(EPSILON, settings.unlocatedScore));
  const stateLog = Math.log(Math.max(EPSILON, cand.weight));
  const currEnv = context.envelopes[hopIdx] ?? ordered[hopIdx]!.hop.envelope_ms ?? null;

  // Baseline: no earlier located hop — every preceding hop stays unlocated.
  const baseline: LocatedCell = {
    logScore: hopIdx * unlocLog + stateLog,
    prevHopIdx: -1,
    prevCandIdx: -1,
    transitionFactor: 1,
  };
  return bestFromEarlierLocated(
    hopIdx,
    cand,
    currEnv,
    ordered,
    candsPerHop,
    cells,
    context,
    settings,
    baseline,
  );
}

function extractWinner(
  n: number,
  candsPerHop: FusedCandidate[][],
  cells: LocatedCell[][],
  unlocLog: number,
): { chosen: (FusedCandidate | null)[]; transitionFactors: number[] } {
  const chosen = new Array<FusedCandidate | null>(n).fill(null);
  const transitionFactors = new Array<number>(n).fill(1);
  let bestTotal = n * unlocLog;
  let bestId = '~unlocated';
  let endHop = -1;
  let endCand = -1;

  for (let i = 0; i < n; i += 1) {
    const tailLog = (n - 1 - i) * unlocLog;
    for (let s = 0; s < candsPerHop[i]!.length; s += 1) {
      const score = cells[i]![s]!.logScore + tailLog;
      const id = candsPerHop[i]![s]!.id;
      if (isBetterPath(score, id, bestTotal, bestId)) {
        bestTotal = score;
        bestId = id;
        endHop = i;
        endCand = s;
      }
    }
  }

  let h = endHop;
  let c = endCand;
  while (h >= 0) {
    chosen[h] = candsPerHop[h]![c]!;
    const cell = cells[h]![c]!;
    transitionFactors[h] = cell.transitionFactor;
    h = cell.prevHopIdx;
    c = cell.prevCandIdx;
  }
  return { chosen, transitionFactors };
}

function solveDp(
  ordered: CandidateHop[],
  context: DpContext,
  settings: Settings,
): { chosen: (FusedCandidate | null)[]; transitionFactors: number[] } {
  const n = ordered.length;
  const candsPerHop = ordered.map(extractCandidates);
  const cells: LocatedCell[][] = [];
  const unlocLog = Math.log(Math.max(EPSILON, settings.unlocatedScore));

  for (let i = 0; i < n; i += 1) {
    const row = candsPerHop[i]!.map((cand) =>
      bestCellForCandidate(i, cand, ordered, candsPerHop, cells, context, settings),
    );
    cells.push(row);
  }
  return extractWinner(n, candsPerHop, cells, unlocLog);
}

function buildLocation(
  cand: FusedCandidate,
  transitionFactor: number,
  existingRejected: Location['rejected'],
): Location {
  const { confidence, level } =
    transitionFactor < 1
      ? applyTransitionPenalty(cand.weight, transitionFactor)
      : { confidence: cand.weight, level: confidenceLevelOf(cand.weight) };

  return {
    lat: cand.lat,
    lon: cand.lon,
    city: cand.city,
    country: cand.country ?? null,
    confidence,
    level,
    sources: [...cand.sources],
    rejected: existingRejected,
  };
}

/**
 * Chooses globally consistent hop positions by Viterbi DP (§7.7, VOY-F-17,
 * VOY-P-08). Hops are sorted by `ttl` internally while preserving the original
 * input order in the returned array.
 */
export function choosePositions(
  hops: CandidateHop[],
  settings: Settings,
  context?: DpContext,
): LocatedHop[] {
  if (hops.length === 0) return [];

  const indexed = hops.map((entry, originalIdx) => ({ entry, originalIdx }));
  indexed.sort((a, b) => a.entry.hop.ttl - b.entry.hop.ttl || a.originalIdx - b.originalIdx);

  const ordered = indexed.map((item) => item.entry);
  const dpContext: DpContext = context
    ? {
        source: context.source,
        envelopes: indexed.map((item) => context.envelopes[item.originalIdx] ?? null),
      }
    : {
        source: null,
        envelopes: ordered.map((item) => item.hop.envelope_ms ?? null),
      };

  const { chosen, transitionFactors } = solveDp(ordered, dpContext, settings);

  const results = new Array<LocatedHop>(hops.length);
  for (let i = 0; i < indexed.length; i += 1) {
    const { entry, originalIdx } = indexed[i]!;
    const picked = chosen[i] ?? null;
    const factor = transitionFactors[i] ?? 1;
    const existingRejected = entry.location?.rejected ?? [];
    results[originalIdx] = {
      hop: entry.hop,
      location: picked ? buildLocation(picked, factor, existingRejected) : null,
    };
  }
  return results;
}
