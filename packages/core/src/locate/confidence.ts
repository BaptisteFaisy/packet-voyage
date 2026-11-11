import type { Candidate, ConfidenceLevel } from '@packet-voyage/schema';
import type { Settings } from '../settings.ts';

const SOLID_THRESHOLD = 0.8;
const PROBABLE_THRESHOLD = 0.5;

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function sourceNameOf(candidate: Candidate): string {
  return candidate.source;
}

/**
 * Combined weight of a concordant candidate group at one hop (§7.5 / §7.8,
 * VOY-F-18, VOY-P-10).
 *
 * Different sources combine via noisy-OR `1 - prod(1 - p_i)`. Calling this on
 * `[fusedCandidate]` returns `fusedCandidate.weight`; calling it on the raw
 * concordant candidates returns the exact same combined weight, so adding a
 * concordant source can never lower confidence (VOY-P-10).
 */
export function combinedWeight(kept: Candidate[]): number {
  if (kept.length === 0) return 0;
  if (kept.length === 1) return clamp01(kept[0]!.weight);

  const perSource = new Map<string, number>();
  for (const c of kept) {
    const src = sourceNameOf(c);
    const w = clamp01(c.weight);
    const prev = perSource.get(src) ?? 0;
    if (w > prev) perSource.set(src, w);
  }
  let failProb = 1;
  for (const w of perSource.values()) {
    failProb *= 1 - w;
  }
  return clamp01(1 - failProb);
}

/** Maps a confidence value in [0, 1] to the §7.8 confidence band. */
export function confidenceLevelOf(score: number): ConfidenceLevel {
  if (score >= SOLID_THRESHOLD) return 'solid';
  if (score >= PROBABLE_THRESHOLD) return 'probable';
  return 'uncertain';
}

/**
 * Computes confidence and level from surviving concordant candidates at a hop
 * (CONTRACTS §5.3, VOY-F-18, VOY-P-10).
 *
 * Note: `settings` is accepted as required by the contract signature for
 * downstream calibration; the §7.8 thresholds are 0.80 / 0.50.
 * Transition penalties (when applied by the DP) scale the weight via
 * `applyTransitionPenalty`, keeping penalty factors independent of source count.
 */
export function confidenceOf(
  kept: Candidate[],
  _settings: Settings,
): { confidence: number; level: ConfidenceLevel } {
  if (kept.length === 0) {
    return { confidence: 0, level: 'unlocated' };
  }
  const confidence = combinedWeight(kept);
  return { confidence, level: confidenceLevelOf(confidence) };
}

/**
 * Scales a hop's base confidence by the DP transition factor (in (0, 1]).
 * The factor depends only on geometry/delay, never on the number of sources,
 * so VOY-P-10 holds unconditionally.
 */
export function applyTransitionPenalty(
  baseConfidence: number,
  transitionFactor: number,
): { confidence: number; level: ConfidenceLevel } {
  const confidence = clamp01(baseConfidence * clamp01(transitionFactor));
  return { confidence, level: confidenceLevelOf(confidence) };
}
