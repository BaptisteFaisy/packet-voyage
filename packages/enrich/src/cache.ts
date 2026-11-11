import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import type { Cache } from './types.ts';

interface CacheEntry<T> {
  key: string;
  value: T;
  source: string;
  retrievedAt: string;
  expiresAt: string;
}

type Clock = () => Date;

const DAY_MS = 86_400_000;

function keyToFilename(key: string): string {
  const hash = createHash('sha256').update(key).digest('hex').slice(0, 16);
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48);
  return `${safe}__${hash}.json`;
}

function parseEntry<T>(raw: string): CacheEntry<T> | null {
  try {
    const data = JSON.parse(raw) as CacheEntry<T>;
    if (!data || typeof data !== 'object') return null;
    if (typeof data.expiresAt !== 'string' || typeof data.retrievedAt !== 'string') return null;
    return data;
  } catch {
    return null;
  }
}

function isExpired(entry: CacheEntry<unknown>, clock: Clock): boolean {
  const expires = new Date(entry.expiresAt).getTime();
  return !Number.isFinite(expires) || expires <= clock().getTime();
}

function readEntry<T>(dir: string, key: string, clock: Clock): CacheEntry<T> | null {
  const file = join(dir, keyToFilename(key));
  if (!existsSync(file)) return null;
  try {
    const entry = parseEntry<T>(readFileSync(file, 'utf8'));
    if (!entry) return null;
    if (isExpired(entry, clock)) {
      try {
        unlinkSync(file);
      } catch {
        // Another run already removed it.
      }
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function writeEntry<T>(dir: string, key: string, value: T, ttlDays: number, clock: Clock): void {
  const now = clock();
  const entry: CacheEntry<T> = {
    key,
    value,
    source: 'enrich-cache',
    retrievedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + Math.max(0, ttlDays) * DAY_MS).toISOString(),
  };
  writeFileSync(join(dir, keyToFilename(key)), JSON.stringify(entry), 'utf8');
}

function fileCacheStats(dir: string): { entries: number; oldest: string | null; newest: string | null } {
  if (!existsSync(dir)) return { entries: 0, oldest: null, newest: null };
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  let oldest: string | null = null;
  let newest: string | null = null;
  let entries = 0;

  for (const file of files) {
    try {
      const entry = parseEntry(readFileSync(join(dir, file), 'utf8'));
      if (!entry) continue;
      entries += 1;
      const stamp = entry.retrievedAt;
      if (!oldest || stamp < oldest) oldest = stamp;
      if (!newest || stamp > newest) newest = stamp;
    } catch {
      // A corrupted entry is simply not counted.
    }
  }
  return { entries, oldest, newest };
}

/**
 * Disk cache: one JSON file per key under `dir`, each entry carrying its value,
 * its source, its retrieval date and its TTL (VOY-F-12). `clock` is injectable
 * so tests never depend on the real clock.
 */
export function createFileCache(dir: string, clock: Clock = () => new Date()): Cache {
  mkdirSync(dir, { recursive: true });
  return {
    get<T>(key: string): T | null {
      return readEntry<T>(dir, key, clock)?.value ?? null;
    },
    set<T>(key: string, value: T, ttlDays: number): void {
      writeEntry(dir, key, value, ttlDays, clock);
    },
    stats: () => fileCacheStats(dir),
  };
}

/** In-memory cache, same semantics — handy for tests and ephemeral runs. */
export function createMemoryCache(clock: Clock = () => new Date()): Cache {
  const map = new Map<string, CacheEntry<unknown>>();
  return {
    get<T>(key: string): T | null {
      const entry = map.get(key) as CacheEntry<T> | undefined;
      if (!entry) return null;
      if (isExpired(entry, clock)) {
        map.delete(key);
        return null;
      }
      return entry.value;
    },
    set<T>(key: string, value: T, ttlDays: number): void {
      const now = clock();
      map.set(key, {
        key,
        value,
        source: 'memory-cache',
        retrievedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + Math.max(0, ttlDays) * DAY_MS).toISOString(),
      });
    },
    stats() {
      let oldest: string | null = null;
      let newest: string | null = null;
      for (const entry of map.values()) {
        const stamp = entry.retrievedAt;
        if (!oldest || stamp < oldest) oldest = stamp;
        if (!newest || stamp > newest) newest = stamp;
      }
      return { entries: map.size, oldest, newest };
    },
  };
}
