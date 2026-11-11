/**
 * Tunables of the product (§7.13 of the cahier des charges).
 *
 * They are values of departure, meant to be calibrated on real traces: the
 * light bounds are physics, the rest are judgement. Every module takes its
 * settings as an argument — no global, no hidden default.
 */
export interface Settings {
  /** Hard bound: the speed of light in the vacuum, km per millisecond. */
  lightVacuumKmPerMs: number;
  /** Plausibility bound: the speed of light in fibre, km per millisecond. */
  lightFibreKmPerMs: number;
  /** Tolerance on positions, km. */
  slackKm: number;
  /** Two candidates closer than this are merged, km. */
  agreeRadiusKm: number;
  /** Score of the "not located" state. */
  unlocatedScore: number;
  /** Threshold of a penalised geographic round trip, km. */
  zigzagKm: number;
  /** Below this distance a segment is local, km. */
  localKm: number;
  /** Land detour factor between a city and a landing. */
  landFactor: number;
  /** Detour factor of a cable without usable geometry. */
  cableFactor: number;
  /** Tolerance on a cable delay. */
  cableTolerance: number;
  /** Threshold of a detour. */
  detourRatio: number;
  /** Maximum number of cables listed for one crossing. */
  maxCablesShown: number;
  /** Score thresholds of the compatibility bands. */
  maxCableScoreBands: { high: number; medium: number };
  /** Interface language. */
  language: 'en' | 'fr';
  /** Display unit for distances. */
  unit: 'km' | 'mi';
}

export const DEFAULT_SETTINGS: Settings = {
  lightVacuumKmPerMs: 299.79,
  lightFibreKmPerMs: 204,
  slackKm: 50,
  agreeRadiusKm: 100,
  unlocatedScore: 0.15,
  zigzagKm: 500,
  localKm: 50,
  landFactor: 1.5,
  cableFactor: 1.2,
  cableTolerance: 0.1,
  detourRatio: 3,
  maxCablesShown: 5,
  maxCableScoreBands: { high: 0.6, medium: 0.3 },
  language: 'en',
  unit: 'km',
};

export function withSettings(partial: Partial<Settings>): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...partial,
    maxCableScoreBands: {
      ...DEFAULT_SETTINGS.maxCableScoreBands,
      ...(partial.maxCableScoreBands ?? {}),
    },
  };
}
