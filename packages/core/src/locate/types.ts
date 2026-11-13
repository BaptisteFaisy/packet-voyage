import type { Candidate, Hop, Location, Position, Rejection } from '@packet-voyage/schema';
import type { Settings } from '../settings.ts';

/**
 * Shared shapes of the L3 locator.
 *
 * The public API stays exactly the one of `docs/CONTRACTS.md` §5.3; the types
 * below are internal plumbing. `FusedCandidate` is a plain `Candidate` plus two
 * extra properties (`sources`, `id`) which every `Candidate` structurally
 * satisfies — this keeps `choosePositions(hops, settings)` compatible with the
 * contract signature while still receiving the candidate pool.
 */

/** The public entry-point input (CONTRACTS §5.3). */
export interface LocateInput {
  hops: Hop[];
  /** Index-aligned with `hops`; an empty array means "no candidate". */
  candidates: Candidate[][];
  envelopes: (number | null)[];
  source?: (Position & { label?: string; country?: string }) | null;
  settings: Settings;
}

/** One hop with its retained location, `null` when unlocated (VOY-P-11). */
export interface LocatedHop {
  hop: Hop;
  location: Location | null;
}

/** The public result (CONTRACTS §5.3). */
export interface LocateResult {
  /** Same length and order as the input hops. */
  hops: LocatedHop[];
  /** Flat list of every rejection, for the summary counter. */
  rejected: Rejection[];
  /** True when no source position was known: relative bounds only (VOY-F-19). */
  relativeOnly: boolean;
}

/**
 * A candidate after fusion: the contract `Candidate` fields plus the union of
 * the founding sources (sorted) and a deterministic id used to break ties
 * (VOY-P-08). Built only by `fuseCandidates`.
 */
export interface FusedCandidate extends Candidate {
  /** Every source that founded this candidate, sorted, without duplicates. */
  sources: string[];
  /** Stable identity: `sources|city|lat|lon`. Ties break on it (VOY-P-08). */
  id: string;
}

/** A `LocatedHop` carrying its surviving candidate pool for the DP. */
export interface CandidateHop extends LocatedHop {
  /** Candidates that survived fusion and the light filter, sorted by id. */
  candidates?: FusedCandidate[];
}

/** Per-hop context the DP needs but the contract signature does not carry. */
export interface DpContext {
  /** Departure position, `null` in `relativeOnly` mode (VOY-F-19). */
  source: Position | null;
  /** Delay envelopes, index-aligned with the hops. */
  envelopes: (number | null)[];
}

/** Outcome of scoring one transition between two DP states. */
export interface TransitionScore {
  /** Log of the transition factor; `-Infinity` when forbidden. */
  log: number;
  /** Multiplicative factor in (0, 1], used again for the confidence. */
  factor: number;
  /** True when the triangle hard bound is violated (forbidden, VOY-P-07). */
  triangleViolated: boolean;
}
