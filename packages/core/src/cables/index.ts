/**
 * L4 cables: filter, score, and rank compatible submarine cables for a crossing.
 * Pure functions, no clock, no randomness, no network (§0.6).
 */
export {
  bandForScore,
  bestLandingPair,
  cableSegmentLengthKm,
  compatibleCables,
  scoreCable,
} from './cables.ts';
export type { LandingPairEval, SegmentContext, SegmentWithContext } from './cables.ts';
