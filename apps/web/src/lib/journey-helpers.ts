import type { Journey, Hop, Segment } from '@packet-voyage/schema';

export interface LocationInfo {
  city: string;
  country?: string | null;
  lat: number;
  lon: number;
}

export function hopLocation(hop: Hop): LocationInfo | null {
  if (!hop.location) return null;
  return {
    city: hop.location.city,
    country: hop.location.country,
    lat: hop.location.lat,
    lon: hop.location.lon,
  };
}

export function findHopByTtl(journey: Journey, ttl: number): Hop | undefined {
  return journey.hops.find((h) => h.ttl === ttl);
}

export function findSegmentByEndpoints(
  journey: Journey,
  fromTtl: number,
  toTtl: number,
): Segment | undefined {
  return journey.segments.find((s) => s.from_ttl === fromTtl && s.to_ttl === toTtl);
}

export function locatedHops(journey: Journey): Hop[] {
  return journey.hops.filter((h) => h.location !== null && h.location !== undefined);
}

export function uniqueNetworks(journey: Journey): string[] {
  const set = new Set<string>();
  for (const hop of journey.hops) {
    if (hop.as_name) set.add(hop.as_name);
    else if (hop.asn) set.add(`AS${hop.asn}`);
  }
  return Array.from(set);
}

export function formatDistance(km: number, unit: 'km' | 'mi'): string {
  const val = unit === 'mi' ? Math.round(km * 0.621371) : Math.round(km);
  const formatted = val.toLocaleString('en-US');
  return `at least ${formatted} ${unit}`;
}

export function formatDistanceFr(km: number, unit: 'km' | 'mi'): string {
  const val = unit === 'mi' ? Math.round(km * 0.621371) : Math.round(km);
  const formatted = val.toLocaleString('fr-FR');
  return `au moins ${formatted} ${unit}`;
}

export function formatDelayMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return '—';
  return `${ms.toFixed(1)} ms`;
}
