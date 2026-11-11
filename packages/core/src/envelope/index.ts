/**
 * L2 delay envelope and light bounds (VOY-P-05, §7.6, §7.11).
 * Pure functions, no clock, no randomness, no network (§0.6).
 */
export { computeEnvelopes, minDelayMs } from './envelope.ts';
export { lightBudgetKm, lightFloorMs, stepAllowedKm, triangleAllowedKm } from './bounds.ts';
