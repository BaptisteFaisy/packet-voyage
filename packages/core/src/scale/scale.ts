/**
 * The human scale of a distance (§7.12, "light gauge + everyday scales").
 *
 * These values are ANCHORS OF SCALE, never measurements of the route: the
 * light gauge is a bound of physics, the laps and the trips are comparisons
 * ("worth ten Paris–Marseilles"), not a claim about the path the packet took.
 * Nothing here is bounded "at most", because nothing here measures the
 * journey — the story keeps that wording for the distances it derives.
 *
 * Pure: no clock, no network, no randomness, every input is an argument.
 */
import type { Settings } from '../settings.ts';
import { withSettings } from '../settings.ts';
import { EARTH_RADIUS_KM } from '../geo/index.ts';

/** Speed of light in the vacuum, km per millisecond (§7.13). */
export const LIGHT_KM_PER_MS = 299.79;

/** Circumference of the Earth at the radius used by the geometry, km. */
export const EARTH_CIRCUMFERENCE_KM = 2 * Math.PI * EARTH_RADIUS_KM;

/** Paris–Marseille by the road, km: the everyday yardstick. */
export const PARIS_MARSEILLE_KM = 660;

/** Digits kept by every number of this module: two, never more. */
const DIGITS = 2;

/** Rounds to two decimals, never to a misleading precision. */
function round2(value: number): number {
  const rounded = Number(value.toFixed(DIGITS));
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** A scale anchor is a magnitude: negatives and non-finite values read as zero. */
function magnitude(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** The distance light covers in the given milliseconds, km. */
export function lightDistanceKm(ms: number): number {
  return round2(magnitude(ms) * LIGHT_KM_PER_MS);
}

/** How many laps of the Earth a distance makes. */
export function earthLaps(km: number): number {
  return round2(magnitude(km) / EARTH_CIRCUMFERENCE_KM);
}

/** How many Paris–Marseille trips a distance makes. */
export function parisMarseilleCount(km: number): number {
  return round2(magnitude(km) / PARIS_MARSEILLE_KM);
}

/** The everyday reading of one distance, all of it anchored on the settings. */
export interface EverydayScale {
  /** The distance as given, km. */
  km: number;
  /** Laps of the Earth. */
  laps: number;
  /** Paris–Marseille trips. */
  trips: number;
  /** The light gauge used, km per millisecond. */
  lightKmPerMs: number;
}

/**
 * Reads a distance in human terms. The light gauge comes from the settings
 * (the vacuum speed by default), so a caller that calibrates on fibre keeps
 * the same anchor everywhere.
 */
export function everydayScale(km: number, settings?: Partial<Settings>): EverydayScale {
  const resolved = withSettings(settings ?? {});
  const distance = round2(magnitude(km));
  return {
    km: distance,
    laps: earthLaps(distance),
    trips: parisMarseilleCount(distance),
    lightKmPerMs: resolved.lightVacuumKmPerMs,
  };
}
