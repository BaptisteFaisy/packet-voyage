/**
 * Which physical medium can explain the measured delay.
 *
 * The speed of light is a filter, not a decoration: a medium whose minimum
 * round-trip time exceeds the measurement is impossible, whatever the databases
 * say. A geostationary relay is not a speed but a floor — four times the
 * 35 786 km altitude, at c.
 */
import type { Journey } from '@packet-voyage/schema';
import type { Settings } from '../settings.ts';
import { DEFAULT_SETTINGS, withSettings } from '../settings.ts';

export type Medium = 'vacuum' | 'fibre' | 'copper' | 'microwave' | 'geostationary';

export interface MediumCheck {
  medium: Medium;
  km_per_ms: number | null;
  min_rtt_ms: number;
  compatible: boolean;
  note: string;
}

export const GEO_ORBIT_KM = 35_786;
const COPPER_KM_PER_MS = 231;

export const MEDIA: readonly { medium: Medium; label: { en: string; fr: string } }[] = [
  { medium: 'vacuum', label: { en: 'vacuum', fr: 'vide' } },
  { medium: 'microwave', label: { en: 'microwave in air', fr: 'faisceau hertzien' } },
  { medium: 'copper', label: { en: 'copper / coax', fr: 'cuivre / coaxial' } },
  { medium: 'fibre', label: { en: 'optical fibre', fr: 'fibre optique' } },
  { medium: 'geostationary', label: { en: 'geostationary relay', fr: 'relais géostationnaire' } },
];

function speedOf(medium: Medium, settings: Settings): number | null {
  switch (medium) {
    case 'vacuum':
      return settings.lightVacuumKmPerMs;
    case 'microwave':
      return settings.lightVacuumKmPerMs;
    case 'copper':
      return COPPER_KM_PER_MS;
    case 'fibre':
      return settings.lightFibreKmPerMs;
    case 'geostationary':
      return null;
  }
}

function minRttOf(medium: Medium, distanceKm: number, settings: Settings): number {
  const speed = speedOf(medium, settings);
  if (speed === null) return (4 * GEO_ORBIT_KM) / settings.lightVacuumKmPerMs;
  return (2 * distanceKm) / speed;
}

function noteFor(check: Omit<MediumCheck, 'note'>): string {
  if (check.min_rtt_ms <= 0) return 'no distance to cover: any medium fits';
  return check.compatible
    ? `possible: light in this medium needs at least ${check.min_rtt_ms.toFixed(1)} ms`
    : `impossible: this medium alone would need at least ${check.min_rtt_ms.toFixed(1)} ms`;
}

/** Every medium, with the minimum round-trip time it would require. */
export function compatibleMedia(
  distanceKm: number,
  rttMs: number | null,
  settings?: Partial<Settings>,
): MediumCheck[] {
  const config = settings ? withSettings(settings) : DEFAULT_SETTINGS;
  return MEDIA.map(({ medium }) => {
    const minRtt = minRttOf(medium, distanceKm, config);
    const compatible = rttMs !== null && rttMs >= minRtt - 1e-9;
    const base = { medium, km_per_ms: speedOf(medium, config), min_rtt_ms: minRtt, compatible };
    return { ...base, note: noteFor(base) };
  }).sort((a, b) => a.min_rtt_ms - b.min_rtt_ms || a.medium.localeCompare(b.medium));
}

/** The same filter applied to the whole journey: departure to destination. */
export function mediaForJourney(journey: Journey, settings?: Partial<Settings>): MediumCheck[] {
  const floor = journey.summary.light_floor_ms;
  const config = settings ? withSettings(settings) : DEFAULT_SETTINGS;
  const distance =
    floor === null || floor === undefined
      ? journey.summary.distance_km_min
      : (floor * config.lightFibreKmPerMs) / 2;
  return compatibleMedia(distance, journey.summary.rtt_ms ?? null, config);
}
