import type { EnrichOptions } from './types.ts';
import { ripeStatKey } from './keys.ts';

export interface RipeStatResult {
  asn: number | null;
  as_name: string | null;
  prefix: string | null;
}

const RIPESTAT_URL = 'https://stat.ripe.net/data/prefix-overview/data.json';
const SOURCEAPP = 'packet-voyage';
const CACHE_TTL_DAYS = 14;

interface RipeStatResponse {
  status?: string;
  status_code?: number;
  data?: {
    resource?: string;
    asns?: Array<{ asn: number; holder?: string }>;
  };
}

function parseResponse(data: unknown): RipeStatResult {
  const res = data as RipeStatResponse;
  const asns = res?.data?.asns;
  const firstAsn = Array.isArray(asns) && asns.length > 0 ? asns[0] : undefined;
  return {
    asn: typeof firstAsn?.asn === 'number' ? firstAsn.asn : null,
    as_name: typeof firstAsn?.holder === 'string' ? firstAsn.holder.trim() : null,
    prefix: typeof res?.data?.resource === 'string' ? res.data.resource.trim() : null,
  };
}

/**
 * Fetch ASN, AS name, and prefix from RIPEstat (VOY-F-08).
 * Checks the cache first, uses `sourceapp=packet-voyage`, logs requests.
 */
export async function ripeStat(ip: string, o: EnrichOptions): Promise<RipeStatResult> {
  const cacheKey = ripeStatKey(ip);
  const cached = o.cache.get<RipeStatResult>(cacheKey);
  if (cached) return cached;

  if (o.offline || !o.consent.granted) {
    return { asn: null, as_name: null, prefix: null };
  }

  o.log?.(`ripestat query for ${ip}`);
  const url = `${RIPESTAT_URL}?resource=${encodeURIComponent(ip)}&sourceapp=${SOURCEAPP}`;

  try {
    const res = await o.fetch(url, { headers: { Accept: 'application/json' } });
    if (res.status === 429 || res.status >= 500) {
      o.log?.(`ripestat HTTP ${res.status} for ${ip} (rate limit / server error)`);
      return { asn: null, as_name: null, prefix: null };
    }
    if (res.status < 200 || res.status >= 300) {
      return { asn: null, as_name: null, prefix: null };
    }
    const json = await res.json();
    const result = parseResponse(json);
    o.cache.set(cacheKey, result, CACHE_TTL_DAYS);
    return result;
  } catch (err) {
    o.log?.(`ripestat error for ${ip}: ${err instanceof Error ? err.message : String(err)}`);
    return { asn: null, as_name: null, prefix: null };
  }
}
