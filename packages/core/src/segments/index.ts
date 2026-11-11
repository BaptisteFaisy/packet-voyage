/**
 * L4 segments: connect consecutive located hops, classify crossings, count skipped hops.
 * Pure functions, no clock, no randomness, no network (§0.6).
 *
 * `LocatedHop` is declared in `./segments.ts` as a structural twin of the L3
 * contract type (`{ hop, location }`); it is intentionally NOT re-exported
 * here so `src/index.ts` (`export *`) never collides with `src/locate`.
 */
export { buildSegments, classifyCrossing, findFixedLink, segmentKind } from './segments.ts';
export type { CrossingEndpoint } from './segments.ts';
