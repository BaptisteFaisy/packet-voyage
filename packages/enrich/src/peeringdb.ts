import type { EnrichOptions, IxpPrefix } from './types.ts';
import { ixpPrefixesKey } from './keys.ts';

/**
 * PeeringDB adapter (`/ixpfx` — the IXP prefix directory).
 * Live queries only (the licence forbids redistributing the data, §6.1),
 * but the answer is cached locally like every other enrichment. Nothing
 * route-specific is ever sent: this is a plain directory download (§6.4).
 */

const PEERINGDB_URL = 'https://www.peeringdb.com/api/ixpfx';
const CACHE_TTL_DAYS = 30;

interface IxpfxRow {
  ix_id?: number;
  name?: string | null;
  prefix?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface IxpfxResponse {
  data?: IxpfxRow[];
}

/** Convert a PeeringDB `ixpfx` payload to normalized IxpPrefix records. */
export function parseIxpfxResponse(json: unknown): IxpPrefix[] {
  const res = json as IxpfxResponse;
  if (!res || !Array.isArray(res.data)) return [];
  const list: IxpPrefix[] = [];
  for (const row of res.data) {
    if (typeof row?.ix_id !== 'number' || typeof row?.prefix !== 'string') continue;
    const prefix = row.prefix.trim();
    const name = typeof row.name === 'string' ? row.name.trim() : '';
    if (prefix === '' || name === '') continue;
    const city = typeof row.city === 'string' && row.city.trim() !== '' ? row.city.trim() : null;
    const country =
      typeof row.country === 'string' && row.country.trim() !== '' ? row.country.trim() : null;
    list.push({
      ix_id: row.ix_id,
      name,
      prefix,
      city,
      country,
      lat: typeof row.latitude === 'number' && Number.isFinite(row.latitude) ? row.latitude : null,
      lon: typeof row.longitude === 'number' && Number.isFinite(row.longitude) ? row.longitude : null,
    });
  }
  // Deterministic order: by prefix then ix name then id.
  list.sort((a, b) =>
    a.prefix.localeCompare(b.prefix) || a.name.localeCompare(b.name) || a.ix_id - b.ix_id,
  );
  return list;
}

/**
 * Return the IXP prefix list: from `options.ixpPrefixes` when injected,
 * else from the cache, else from a live PeeringDB query (consent required;
 * never under `offline`). On 429/5xx the failure is logged and `[]` returned.
 */
export async function ixpPrefixes(o: EnrichOptions): Promise<IxpPrefix[]> {
  if (o.ixpPrefixes && o.ixpPrefixes.length > 0) return o.ixpPrefixes;

  const cached = o.cache.get<IxpPrefix[]>(ixpPrefixesKey());
  if (cached) return cached;

  if (o.offline || !o.consent.granted) return [];

  o.log?.('peeringdb: downloading the IXP prefix directory (no route address sent)');
  try {
    const res = await o.fetch(PEERINGDB_URL, { headers: { Accept: 'application/json' } });
    if (res.status === 429 || res.status >= 500) {
      o.log?.(`peeringdb: service answered HTTP ${res.status} — skipping, not retrying`);
      return [];
    }
    if (res.status < 200 || res.status >= 300) return [];
    const list = parseIxpfxResponse(await res.json());
    o.cache.set(ixpPrefixesKey(), list, CACHE_TTL_DAYS);
    return list;
  } catch (err) {
    o.log?.(`peeringdb: error: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}
