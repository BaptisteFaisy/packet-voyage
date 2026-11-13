/**
 * Where the delay goes: the part light itself must spend, and the residual left
 * for queues, routing and processing. The residual is inferred, never measured —
 * the return path is invisible, so it is an estimate and says so (§5.3).
 */
import type { Journey } from '@packet-voyage/schema';
import { lightFloorMs } from '../envelope/index.ts';
import type { Settings } from '../settings.ts';
import { DEFAULT_SETTINGS, withSettings } from '../settings.ts';

export interface DelayBreakdown {
  rtt_ms: number | null;
  propagation_floor_ms: number | null;
  residual_ms: number | null;
  residual_share: number | null;
  clamped: boolean;
  reading: 'measured' | 'inferred';
  note: { en: string; fr: string };
}

function floorOf(journey: Journey, settings: Settings): number | null {
  if (journey.summary.light_floor_ms !== null && journey.summary.light_floor_ms !== undefined) {
    return journey.summary.light_floor_ms;
  }
  const source = journey.source;
  const destination = [...journey.hops].reverse().find((hop) => hop.location)?.location;
  if (!source || source.lat === null || source.lon === null || !destination) return null;
  const km = journey.summary.distance_km_min;
  return lightFloorMs(km, settings);
}

function noteOf(residual: number | null, share: number | null, clamped: boolean) {
  const value = residual === null ? null : residual.toFixed(1);
  const percent = share === null ? null : (share * 100).toFixed(0);
  const tail = clamped
    ? ' The floor exceeded the measured delay, so the residual is clamped at zero.'
    : '';
  return {
    en: value === null
      ? 'No measured delay: nothing to break down.'
      : `About ${value} ms (${percent} %) is left for queues, routing and processing once light has ` +
        `taken its share. This residual is inferred, not measured: the return path is invisible.${tail}`,
    fr: value === null
      ? 'Aucun délai mesuré : rien à décomposer.'
      : `Environ ${value} ms (${percent} %) restent pour les files d'attente, le routage et le traitement ` +
        `une fois la part de la lumière prélevée. Ce résidu est déduit, non mesuré : le chemin du retour ` +
        `est invisible.${tail === '' ? '' : ' Le plancher dépassait le délai mesuré : le résidu est ramené à zéro.'}`,
  };
}

export function delayBreakdown(journey: Journey, settings?: Partial<Settings>): DelayBreakdown {
  const config = settings ? withSettings(settings) : DEFAULT_SETTINGS;
  const rtt = journey.summary.rtt_ms ?? null;
  const floor = floorOf(journey, config);
  if (rtt === null || floor === null) {
    return {
      rtt_ms: rtt,
      propagation_floor_ms: floor,
      residual_ms: null,
      residual_share: null,
      clamped: false,
      reading: 'inferred',
      note: noteOf(null, null, false),
    };
  }
  const raw = rtt - floor;
  const residual = Math.max(0, raw);
  return {
    rtt_ms: rtt,
    propagation_floor_ms: floor,
    residual_ms: residual,
    residual_share: rtt > 0 ? residual / rtt : null,
    clamped: raw < 0,
    reading: 'inferred',
    note: noteOf(residual, rtt > 0 ? residual / rtt : null, raw < 0),
  };
}
