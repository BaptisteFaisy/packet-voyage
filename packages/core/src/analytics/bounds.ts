/**
 * A distance range instead of a single lower bound.
 *
 * The lower bound is the sum of the great-circle segments: the packet travelled
 * at least that. The upper bound is what the measured delay could pay for in
 * fibre — a budget, not a measurement, and it ignores the return path, which a
 * traceroute never sees (§5.2).
 */
import type { Journey } from '@packet-voyage/schema';
import type { Settings } from '../settings.ts';
import { DEFAULT_SETTINGS, withSettings } from '../settings.ts';

export interface DistanceBounds {
  min_km: number;
  max_km: number | null;
  min_basis: 'geodesic-sum';
  max_basis: 'fibre-delay-budget' | null;
  note: { en: string; fr: string };
}

function note(minKm: number, maxKm: number | null): { en: string; fr: string } {
  if (maxKm === null) {
    return {
      en: 'No measured delay, so no upper bound: the route is at least this long.',
      fr: 'Aucun délai mesuré, donc aucune borne haute : le trajet fait au moins cette longueur.',
    };
  }
  const budget = maxKm.toFixed(0);
  return {
    en: `The true path lies between at least ${minKm.toFixed(0)} km of straight-line segments and at most ` +
      `${budget} km, which is all the measured delay can pay for in fibre. The upper bound is a budget, ` +
      `not a measurement: it ignores queues and the invisible return path.`,
    fr: `Le chemin réel se situe entre au moins ${minKm.toFixed(0)} km de segments à vol d'oiseau et au plus ` +
      `${budget} km, soit tout ce que le délai mesuré peut payer en fibre. La borne haute est un budget, ` +
      `pas une mesure : elle ignore les files d'attente et le chemin du retour, invisible.`,
  };
}

export function distanceBounds(journey: Journey, settings?: Partial<Settings>): DistanceBounds {
  const config = settings ? withSettings(settings) : DEFAULT_SETTINGS;
  const minKm = journey.summary.distance_km_min;
  const rtt = journey.summary.rtt_ms ?? null;
  const maxKm = rtt === null ? null : (config.lightFibreKmPerMs * rtt) / 2;
  return {
    min_km: minKm,
    max_km: maxKm,
    min_basis: 'geodesic-sum',
    max_basis: maxKm === null ? null : 'fibre-delay-budget',
    note: note(minKm, maxKm),
  };
}
