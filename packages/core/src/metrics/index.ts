/**
 * L4 metrics: journey summary, light floor, inflation, detours (§7.11).
 * Pure functions, no clock, no randomness, no network (§0.6).
 */
export { detectDetours, inflationOf, summarize } from './metrics.ts';
