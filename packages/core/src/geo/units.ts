/**
 * Distance units conversion.
 */

/** Conversion factor from kilometers to miles (1 international mile = 1.609344 km). */
const KM_TO_MILES = 0.621371;

/**
 * Converts a distance in kilometers to miles.
 */
export function toMiles(km: number): number {
  return km * KM_TO_MILES;
}
