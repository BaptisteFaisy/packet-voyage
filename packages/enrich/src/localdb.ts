import { existsSync, readFileSync } from 'node:fs';
import { inPrefix } from '../../core/src/addr/index.ts';
import type { LocalNetworkDb, LocalNetworkRecord } from './types.ts';

/**
 * Minimal JSON-backed local network database (VOY-F-08, VOY-F-11).
 *
 * The data file itself (e.g. DB-IP Lite converted to this shape) is downloaded
 * by the user through the CLI — never vendored in the repository (§6.1).
 * File shape: `{ "entries": [ { "prefix": "1.0.0.0/24", ...record } ] }`.
 * Lookup is a linear scan over prefixes; files from DB-IP Lite are ordered so
 * the first match is the most specific enough for a weak `geodb` candidate.
 */

export interface JsonNetworkDbEntry extends LocalNetworkRecord {
  prefix: string;
}

export interface JsonNetworkDbFile {
  source?: string;
  retrieved_at?: string;
  entries?: JsonNetworkDbEntry[];
}

/** Project a stored entry onto the record shape (the prefix is the key, not data). */
function toRecord(entry: JsonNetworkDbEntry): LocalNetworkRecord {
  return {
    asn: entry.asn ?? null,
    as_name: entry.as_name ?? null,
    prefix: entry.prefix,
    city: entry.city ?? null,
    country: entry.country ?? null,
    lat: entry.lat ?? null,
    lon: entry.lon ?? null,
  };
}

/** Build a LocalNetworkDb from an already-parsed entry list. */
export function createJsonNetworkDb(entries: JsonNetworkDbEntry[]): LocalNetworkDb {
  // Deterministic order: by prefix string (stable regardless of file order).
  const sorted = [...entries].sort((a, b) => a.prefix.localeCompare(b.prefix));
  return {
    lookup(ip: string): LocalNetworkRecord | null {
      for (const entry of sorted) {
        if (inPrefix(ip, entry.prefix)) return toRecord(entry);
      }
      return null;
    },
  };
}

/** Load a JSON network database from disk; returns null when absent/corrupt. */
export function loadJsonNetworkDb(path: string): LocalNetworkDb | null {
  if (!existsSync(path)) return null;
  try {
    const file = JSON.parse(readFileSync(path, 'utf8')) as JsonNetworkDbFile;
    if (!file || !Array.isArray(file.entries)) return null;
    const entries = file.entries.filter(
      (e): e is JsonNetworkDbEntry => Boolean(e) && typeof e.prefix === 'string',
    );
    return createJsonNetworkDb(entries);
  } catch {
    return null;
  }
}
