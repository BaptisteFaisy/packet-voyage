import type { HintCity } from '@packet-voyage/schema';

/**
 * Compact fallback hint table used by the paste-a-trace flow while the
 * L7 dataset (`packages/data/datasets/hints.json`) is not built yet.
 * When the dataset ships, `lib/datasets.ts` supplies it and this table is
 * only the safety net. Airport codes and large cities only (§7.5).
 */
export const FALLBACK_HINTS: HintCity[] = [
  { code: 'par', city: 'Paris', country: 'FR', lat: 48.8566, lon: 2.3522, kind: 'airport' },
  { code: 'cdg', city: 'Paris', country: 'FR', lat: 49.0097, lon: 2.5479, kind: 'airport' },
  { code: 'lys', city: 'Lyon', country: 'FR', lat: 45.764, lon: 4.8357, kind: 'airport' },
  { code: 'mrs', city: 'Marseille', country: 'FR', lat: 43.2965, lon: 5.3698, kind: 'airport' },
  { code: 'lon', city: 'London', country: 'GB', lat: 51.5074, lon: -0.1278, kind: 'airport' },
  { code: 'lhr', city: 'London', country: 'GB', lat: 51.47, lon: -0.4543, kind: 'airport' },
  { code: 'ams', city: 'Amsterdam', country: 'NL', lat: 52.3676, lon: 4.9041, kind: 'airport' },
  { code: 'fra', city: 'Frankfurt', country: 'DE', lat: 50.1109, lon: 8.6821, kind: 'airport' },
  { code: 'mad', city: 'Madrid', country: 'ES', lat: 40.4168, lon: -3.7038, kind: 'airport' },
  { code: 'mil', city: 'Milan', country: 'IT', lat: 45.4642, lon: 9.19, kind: 'city' },
  { code: 'nyc', city: 'New York', country: 'US', lat: 40.7128, lon: -74.006, kind: 'airport' },
  { code: 'jfk', city: 'New York', country: 'US', lat: 40.6413, lon: -73.7781, kind: 'airport' },
  { code: 'iad', city: 'Ashburn', country: 'US', lat: 39.0438, lon: -77.4874, kind: 'airport' },
  { code: 'atl', city: 'Atlanta', country: 'US', lat: 33.749, lon: -84.388, kind: 'airport' },
  { code: 'ord', city: 'Chicago', country: 'US', lat: 41.8781, lon: -87.6298, kind: 'airport' },
  { code: 'sfo', city: 'San Francisco', country: 'US', lat: 37.7749, lon: -122.4194, kind: 'airport' },
  { code: 'lax', city: 'Los Angeles', country: 'US', lat: 34.0522, lon: -118.2437, kind: 'airport' },
  { code: 'yul', city: 'Montreal', country: 'CA', lat: 45.5019, lon: -73.5674, kind: 'airport' },
  { code: 'yyz', city: 'Toronto', country: 'CA', lat: 43.6532, lon: -79.3832, kind: 'airport' },
  { code: 'sin', city: 'Singapore', country: 'SG', lat: 1.3521, lon: 103.8198, kind: 'airport' },
  { code: 'hkg', city: 'Hong Kong', country: 'HK', lat: 22.3193, lon: 114.1694, kind: 'airport' },
  { code: 'nrt', city: 'Tokyo', country: 'JP', lat: 35.6762, lon: 139.6503, kind: 'airport' },
  { code: 'syd', city: 'Sydney', country: 'AU', lat: -33.8688, lon: 151.2093, kind: 'airport' },
  { code: 'dub', city: 'Dublin', country: 'IE', lat: 53.3498, lon: -6.2603, kind: 'airport' },
];
