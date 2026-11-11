import type { Candidate } from '@packet-voyage/schema';
import type { EnrichOptions } from './types.ts';
import { ipmapKey } from './keys.ts';

/**
 * RIPE IPmap adapter (`locate/all`). The wire shape below is what the fake
 * Fetcher in `ipmap.test.ts` serves; the real API is documented at
 * https://ipmap-api.ripe.net. Engines are mapped to the closed source ids of
 * CONTRACTS §3 with their fixed starting weights — never the API's own score,
 * so results stay deterministic across runs.
 */

const IPMAP_URL = 'https://ipmap-api.ripe.net/v1/locate/all';
const CACHE_TTL_DAYS = 14;

interface IpmapLocation {
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface IpmapResponse {
  is_anycast?: boolean;
  locations?: Record<string, IpmapLocation | null> | null;
}

/** Engine key -> closed source id + starting weight (CONTRACTS §3). */
const ENGINES: ReadonlyArray<{
  key: string;
  source: string;
  weight: number;
  impliesAnycast: boolean;
}> = [
  { key: 'latency', source: 'ipmap-latency', weight: 0.85, impliesAnycast: false },
  { key: 'reverse_dns', source: 'ipmap-rdns', weight: 0.5, impliesAnycast: false },
  { key: 'ixp', source: 'ipmap-ix', weight: 0.5, impliesAnycast: false },
  { key: 'contributions', source: 'ipmap-contribution', weight: 0.5, impliesAnycast: false },
  { key: 'anycast', source: 'ipmap-anycast', weight: 0.5, impliesAnycast: true },
];

function toCandidate(
  loc: IpmapLocation,
  source: string,
  weight: number,
  anycast: boolean,
): Candidate | null {
  const city = typeof loc.city === 'string' ? loc.city.trim() : '';
  if (city === '') return null;
  if (typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return null;
  if (!Number.isFinite(loc.latitude) || !Number.isFinite(loc.longitude)) return null;
  const country = typeof loc.country === 'string' ? loc.country.trim() : '';
  return {
    lat: loc.latitude,
    lon: loc.longitude,
    city,
    country: country === '' ? null : country,
    source,
    weight,
    anycast: anycast ? true : undefined,
  };
}

/** Convert an IPmap `locate/all` payload to candidates (fixed engine order). */
export function parseIpmapResponse(json: unknown): Candidate[] {
  const res = json as IpmapResponse;
  const locations = res?.locations;
  if (!locations || typeof locations !== 'object') return [];
  const isAnycast = Boolean(res.is_anycast);
  const candidates: Candidate[] = [];
  for (const engine of ENGINES) {
    const loc = locations[engine.key];
    if (!loc) continue;
    const anycast = isAnycast || engine.impliesAnycast;
    const candidate = toCandidate(loc, engine.source, engine.weight, anycast);
    if (candidate) candidates.push(candidate);
  }
  return candidates;
}

/**
 * Fetch geolocation candidates from RIPE IPmap for one public address.
 * Cached; returns `[]` when offline, without consent, or on 429/5xx
 * (no endless retry — the failure is logged once).
 */
export async function ipmapLocate(ip: string, o: EnrichOptions): Promise<Candidate[]> {
  const cacheKey = ipmapKey(ip);
  const cached = o.cache.get<Candidate[]>(cacheKey);
  if (cached) return cached;

  if (o.offline || !o.consent.granted) return [];

  o.log?.(`ipmap: sending public address ${ip} to RIPE IPmap`);
  const url = `${IPMAP_URL}/${encodeURIComponent(ip)}`;

  try {
    const res = await o.fetch(url, { headers: { Accept: 'application/json' } });
    if (res.status === 429 || res.status >= 500) {
      o.log?.(`ipmap: service answered HTTP ${res.status} for ${ip} — skipping, not retrying`);
      return [];
    }
    if (res.status < 200 || res.status >= 300) return [];
    const candidates = parseIpmapResponse(await res.json());
    o.cache.set(cacheKey, candidates, CACHE_TTL_DAYS);
    return candidates;
  } catch (err) {
    o.log?.(`ipmap: error for ${ip}: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}
