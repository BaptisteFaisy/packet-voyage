import type { Settings } from '../settings.ts';

/**
 * Light bounds of §7.6 and §7.11. All distances are one-way unless stated;
 * every round trip counts the path twice, hence the `/ 2`.
 */

/**
 * Maximum one-way distance light can cover in a vacuum during a round trip
 * of `rttMs`: `kmPerMs * rttMs / 2`. This is the hard bound — nothing, not
 * even a radio or satellite link, beats light in the vacuum.
 */
export function lightBudgetKm(rttMs: number, kmPerMs: number): number {
  return (kmPerMs * rttMs) / 2;
}

/**
 * Step bound (§7.6): how far a hop with envelope `envelopeMs` may sit from
 * the departure point, tolerance included:
 * `c_vacuum * env / 2 + slackKm`.
 */
export function stepAllowedKm(envelopeMs: number, settings: Settings): number {
  return (settings.lightVacuumKmPerMs * envelopeMs) / 2 + settings.slackKm;
}

/**
 * Triangle bound (§7.6): the allowed perimeter departure → hop i → hop j →
 * departure for a later hop of envelope `envJ`, tolerance included:
 * `c_vacuum * envJ + 2 * slackKm`.
 */
export function triangleAllowedKm(envJ: number, settings: Settings): number {
  return settings.lightVacuumKmPerMs * envJ + 2 * settings.slackKm;
}

/**
 * Light floor (§7.11): the delay an ideal straight fibre would need for a
 * round trip of `distanceKm`: `2 * d / c_fibre`. Displayed as the "at least"
 * counterpart of a measured delay; the inflation is rtt / floor.
 */
export function lightFloorMs(distanceKm: number, settings: Settings): number {
  return (2 * distanceKm) / settings.lightFibreKmPerMs;
}
