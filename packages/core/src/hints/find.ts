import type { HintCity } from '@packet-voyage/schema';
import { EXCLUDED_TOKENS } from './excluded.ts';
import { splitRouterName } from './tokens.ts';

/** Normalizes a city name for case- and punctuation-insensitive comparison. */
export function normalizeCityName(city: string): string {
  return city.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** Lower-cased, punctuation-free form used to compare a token against a city name. */
function cityKey(entry: HintCity): string {
  return normalizeCityName(entry.city);
}

function entryMatchesToken(entry: HintCity, token: string): boolean {
  return entry.code.toLowerCase() === token || cityKey(entry) === token;
}

/**
 * Finds the geographic hints of a router host name (VOY-F-15, §7.5).
 *
 * Each token of the name is compared, case-insensitively, to the airport codes
 * and the city names of `table`. Tokens on the exclusion list (`gig`, `net`,
 * `core`, …) are dropped first. Results are deduplicated by city: the first
 * table entry of a city wins, in token order then table order.
 *
 * A hint is a *candidate*, never a position: an ambiguous code may yield
 * several cities, and only the light constraint (§7.6) will tell them apart.
 */
export function findHints(hostName: string, table: HintCity[]): HintCity[] {
  const excluded = new Set<string>(EXCLUDED_TOKENS);
  const hints: HintCity[] = [];
  const seenCities = new Set<string>();

  for (const token of splitRouterName(hostName)) {
    if (excluded.has(token)) continue;
    for (const entry of table) {
      const key = cityKey(entry);
      if (seenCities.has(key)) continue;
      if (entryMatchesToken(entry, token)) {
        seenCities.add(key);
        hints.push(entry);
      }
    }
  }

  return hints;
}
