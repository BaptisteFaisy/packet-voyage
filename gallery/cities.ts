/**
 * The cities the sample journeys pass through, with the networks that own the
 * hops. Everything here is fictional or public knowledge: no real customer, no
 * real router, and addresses only from the documentation ranges (VOY-N-13).
 */

export interface City {
  city: string;
  country: string;
  lat: number;
  lon: number;
}

export const CITIES: Record<string, City> = {
  lyon: { city: 'Lyon', country: 'FR', lat: 45.76, lon: 4.84 },
  paris: { city: 'Paris', country: 'FR', lat: 48.86, lon: 2.35 },
  marseille: { city: 'Marseille', country: 'FR', lat: 43.3, lon: 5.37 },
  london: { city: 'London', country: 'GB', lat: 51.51, lon: -0.13 },
  amsterdam: { city: 'Amsterdam', country: 'NL', lat: 52.37, lon: 4.9 },
  frankfurt: { city: 'Frankfurt', country: 'DE', lat: 50.11, lon: 8.68 },
  lisbon: { city: 'Lisbon', country: 'PT', lat: 38.72, lon: -9.14 },
  madrid: { city: 'Madrid', country: 'ES', lat: 40.42, lon: -3.7 },
  newYork: { city: 'New York', country: 'US', lat: 40.71, lon: -74.01 },
  ashburn: { city: 'Ashburn', country: 'US', lat: 39.04, lon: -77.49 },
  singapore: { city: 'Singapore', country: 'SG', lat: 1.35, lon: 103.82 },
  tokyo: { city: 'Tokyo', country: 'JP', lat: 35.68, lon: 139.69 },
  hongKong: { city: 'Hong Kong', country: 'HK', lat: 22.32, lon: 114.17 },
  dubai: { city: 'Dubai', country: 'AE', lat: 25.2, lon: 55.27 },
  sydney: { city: 'Sydney', country: 'AU', lat: -33.87, lon: 151.21 },
};

export function city(key: keyof typeof CITIES | string): City {
  const found = CITIES[key];
  if (!found) throw new Error(`unknown city key: ${key}`);
  return found;
}

/** Fictional networks, one per role, so the passport has something to stamp. */
export const NETWORKS = {
  access: { asn: 64496, as_name: 'Example Access' },
  isp: { asn: 64500, as_name: 'Example ISP' },
  transit: { asn: 64501, as_name: 'Example Transit' },
  host: { asn: 64512, as_name: 'Example Host' },
  cloud: { asn: 64520, as_name: 'Example Cloud' },
} as const;

export type NetworkKey = keyof typeof NETWORKS;

/** Documentation ranges only: 198.51.100.0/24 for the route, 203.0.113.0/24 for the target. */
export function routeAddress(ttl: number): string {
  return `198.51.100.${ttl}`;
}

export function targetAddress(): string {
  return '203.0.113.80';
}
