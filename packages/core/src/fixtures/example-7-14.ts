/**
 * The worked example of §7.14: Lyon -> Ashburn, ten hops, one location
 * rejected by the light.
 *
 * Every address comes from the documentation ranges (RFC 5737) and every name
 * is fictitious, so this fixture can be versioned (VOY-N-13). It is the input
 * of the acceptance check "6,655 km at least, 91.7 ms, floor 63.6 ms,
 * inflation 1.44, one rejection" (§18).
 */
import type { Candidate, Hop, Position } from '@packet-voyage/schema';

/** The `traceroute` output of Annexe B, verbatim. */
export const EXAMPLE_TRACE = `traceroute to www.example.org (203.0.113.80), 30 hops max, 60 byte packets
 1  192.168.1.1  1.412 ms  1.207 ms  1.388 ms
 2  100.64.0.1  5.102 ms  4.811 ms  4.960 ms
 3  be10.par2.isp.example (198.51.100.1)  9.412 ms  9.102 ms  9.377 ms
 4  ix-paris.transit.example.net (198.51.100.9)  9.911 ms  9.604 ms  10.402 ms
 5  ae3.lon1.transit.example.net (198.51.100.21)  15.208 ms  14.903 ms  15.411 ms
 6  ae7.lon4.transit.example.net (198.51.100.25)  13.992 ms  13.801 ms  14.120 ms
 7  be2.nyc2.transit.example.net (198.51.100.41)  88.702 ms  88.404 ms  89.015 ms
 8  be5.nyc5.transit.example.net (198.51.100.45)  87.204 ms  86.903 ms  87.411 ms
 9  xe0.iad3.host.example.com (203.0.113.1)  92.611 ms  92.304 ms  92.870 ms
10  www.example.org (203.0.113.80)  91.902 ms  91.702 ms  92.015 ms
`;

export const EXAMPLE_TRACED_AT = '2026-11-12T09:14:03Z';

export const EXAMPLE_SOURCE: Position & { label: string; country: string } = {
  lat: 45.76,
  lon: 4.84,
  label: 'Lyon',
  country: 'FR',
};

const CITIES = {
  paris: { city: 'Paris', country: 'FR', lat: 48.86, lon: 2.35 },
  london: { city: 'London', country: 'GB', lat: 51.51, lon: -0.13 },
  newYork: { city: 'New York', country: 'US', lat: 40.71, lon: -74.01 },
  ashburn: { city: 'Ashburn', country: 'US', lat: 39.04, lon: -77.49 },
} as const;

function candidate(city: keyof typeof CITIES, source: string, weight: number): Candidate {
  return { ...CITIES[city], source, weight };
}

/**
 * Candidates per hop, index-aligned with the parsed hops (index 0 = ttl 1).
 * Hop 4 carries the geolocation database's wrong answer ("Ashburn") next to the
 * exchange-point prefix: the light constraint must reject the first one.
 */
export const EXAMPLE_CANDIDATES: Candidate[][] = [
  [],
  [],
  [candidate('paris', 'name-hint', 0.6)],
  [candidate('paris', 'ixp-prefix', 0.8), candidate('ashburn', 'geodb', 0.3)],
  [candidate('london', 'name-hint', 0.6)],
  [candidate('london', 'ipmap-latency', 0.85)],
  [candidate('newYork', 'name-hint', 0.6)],
  [candidate('newYork', 'ipmap-latency', 0.85)],
  [candidate('ashburn', 'name-hint', 0.6)],
  [candidate('ashburn', 'ipmap-latency', 0.85)],
];

/** The numbers §18 asks for, with the tolerance a spherical model deserves. */
export const EXAMPLE_EXPECTED = {
  distanceKmMin: 6655,
  rttMs: 91.7,
  lightFloorMs: 63.6,
  inflation: 1.44,
  countries: ['FR', 'GB', 'US'],
  networks: 3,
  ixps: 1,
  rejectedByLight: 1,
  gaps: 0,
  /** Relative tolerance applied to the computed distances and ratios. */
  tolerance: 0.02,
} as const;

/**
 * Fictional network enrichment, standing in for what `packages/enrich` would
 * return online: three networks and one exchange point, as in §7.14.
 */
export const EXAMPLE_NETWORKS: Record<number, { asn: number; as_name: string; ixp?: string }> = {
  3: { asn: 64496, as_name: 'ISP Example' },
  4: { asn: 64500, as_name: 'Transit Example', ixp: 'Example-IX Paris' },
  5: { asn: 64500, as_name: 'Transit Example' },
  6: { asn: 64500, as_name: 'Transit Example' },
  7: { asn: 64500, as_name: 'Transit Example' },
  8: { asn: 64500, as_name: 'Transit Example' },
  9: { asn: 64512, as_name: 'Example Host' },
  10: { asn: 64512, as_name: 'Example Host' },
};

/** Stamp the fictional networks onto a computed journey (test helper). */
export function applyExampleNetworks(hops: Hop[]): Hop[] {
  return hops.map((hop) => {
    const network = EXAMPLE_NETWORKS[hop.ttl];
    if (!network) return hop;
    return {
      ...hop,
      asn: network.asn,
      as_name: network.as_name,
      ixp: network.ixp ?? null,
    };
  });
}
