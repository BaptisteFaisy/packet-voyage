/**
 * Stitching animation of the route (§12.3): the path is sewn hop by hop at
 * a constant slowdown of the real delays — the ocean crossing visibly takes
 * longer. Pure timing logic, no React, no DOM.
 */
import type { RouteLeg } from './map-geometry.ts';

export interface AnimationPlan {
  /** Total duration in ms of the stitched animation. */
  totalMs: number;
  /** Per leg: start offset and duration, proportional to real delays. */
  legs: { key: string; startMs: number; durationMs: number }[];
}

const MIN_LEG_MS = 120;

/**
 * Build the plan: each leg gets a slice of `totalMs` proportional to its
 * measured delay, with a floor so tiny steps stay visible. Legs without a
 * delay share the average.
 */
export function buildAnimationPlan(legs: RouteLeg[], totalMs: number): AnimationPlan {
  if (legs.length === 0) return { totalMs: 0, legs: [] };
  const known = legs.filter((leg) => leg.durationMs !== null && (leg.durationMs ?? 0) > 0);
  const average =
    known.length > 0
      ? known.reduce((sum, leg) => sum + (leg.durationMs ?? 0), 0) / known.length
      : 1;
  const weights = legs.map((leg) => {
    const value = leg.durationMs !== null && leg.durationMs > 0 ? leg.durationMs : average;
    return Math.max(value, 0.1);
  });
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  const usable = Math.max(totalMs - legs.length * MIN_LEG_MS, totalMs / 2);
  const plan: AnimationPlan = { totalMs, legs: [] };
  let cursor = 0;
  legs.forEach((leg, index) => {
    const weight = weights[index] ?? 1;
    const durationMs = MIN_LEG_MS + (usable * weight) / weightSum;
    plan.legs.push({ key: leg.key, startMs: cursor, durationMs });
    cursor += durationMs;
  });
  plan.totalMs = cursor;
  return plan;
}

export interface AnimationState {
  /** Legs fully drawn. */
  doneKeys: Set<string>;
  /** Leg currently being stitched, with its progress 0..1. */
  activeKey: string | null;
  activeProgress: number;
  finished: boolean;
}

/** State of the stitching at time `elapsedMs`. */
export function animationStateAt(plan: AnimationPlan, elapsedMs: number): AnimationState {
  const done = new Set<string>();
  let activeKey: string | null = null;
  let activeProgress = 0;
  for (const leg of plan.legs) {
    if (elapsedMs >= leg.startMs + leg.durationMs) {
      done.add(leg.key);
    } else if (activeKey === null && elapsedMs >= leg.startMs) {
      activeKey = leg.key;
      activeProgress = Math.min(1, (elapsedMs - leg.startMs) / leg.durationMs);
    }
  }
  return { doneKeys: done, activeKey, activeProgress, finished: elapsedMs >= plan.totalMs };
}
