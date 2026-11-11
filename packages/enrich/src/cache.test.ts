import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileCache, createMemoryCache } from './cache.ts';

describe('VOY-F-12 cache', () => {
  it('VOY-F-12 stores and retrieves within TTL', () => {    const dir = mkdtempSync(join(tmpdir(), 'pv-cache-'));
    try {
      const cache = createFileCache(dir);
      cache.set('k1', { asn: 64496 }, 7);
      expect(cache.get<{ asn: number }>('k1')).toEqual({ asn: 64496 });
      expect(cache.get('missing')).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('VOY-F-12 reports stats with entries, oldest, and newest', () => {    const dir = mkdtempSync(join(tmpdir(), 'pv-cache-'));
    try {
      const cache = createFileCache(dir);
      expect(cache.stats()).toEqual({ entries: 0, oldest: null, newest: null });
      cache.set('k1', 1, 7);
      cache.set('k2', 2, 7);
      const stats = cache.stats();
      expect(stats.entries).toBe(2);
      expect(stats.oldest).not.toBeNull();
      expect(stats.newest).not.toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('VOY-F-12 expires entries when ttlDays is 0', () => {    const dir = mkdtempSync(join(tmpdir(), 'pv-cache-'));
    try {
      const cache = createFileCache(dir);
      cache.set('expired', { a: 1 }, 0);
      expect(cache.get('expired')).toBeNull();
      expect(readdirSync(dir)).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

});

describe('VOY-F-12 cache entry contents', () => {
  it('VOY-F-12 stores value, source, retrieval date and expiry in the entry file', () => {    const dir = mkdtempSync(join(tmpdir(), 'pv-cache-raw-'));
    try {
      const cache = createFileCache(dir, () => new Date('2026-11-11T12:00:00Z'));
      cache.set('ripestat:v1:5.0.0.7', { asn: 64500 }, 14);
      const [file] = readdirSync(dir);
      const raw = JSON.parse(readFileSync(join(dir, file ?? ''), 'utf8')) as Record<string, unknown>;
      expect(raw.key).toBe('ripestat:v1:5.0.0.7');
      expect(raw.value).toEqual({ asn: 64500 });
      expect(raw.source).toBeTypeOf('string');
      expect(raw.retrievedAt).toBe('2026-11-11T12:00:00.000Z');
      expect(raw.expiresAt).toBe('2026-11-25T12:00:00.000Z');
      expect(cache.stats()).toEqual({
        entries: 1,
        oldest: '2026-11-11T12:00:00.000Z',
        newest: '2026-11-11T12:00:00.000Z',
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('VOY-F-12 drops an entry whose expiry is in the past', () => {    const dir = mkdtempSync(join(tmpdir(), 'pv-cache-old-'));
    try {
      const writer = createFileCache(dir, () => new Date('2026-01-01T00:00:00Z'));
      writer.set('k', 'v', 1);
      const later = createFileCache(dir, () => new Date('2026-06-01T00:00:00Z'));
      expect(later.get('k')).toBeNull();
      expect(later.stats().entries).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('VOY-F-12 memory cache', () => {
  it('VOY-F-12 createMemoryCache honors TTL and stats', () => {    const cache = createMemoryCache();
    cache.set('a', 42, 1);
    expect(cache.get<number>('a')).toBe(42);
    expect(cache.stats().entries).toBe(1);
    cache.set('b', 99, 0);
    expect(cache.get<number>('b')).toBeNull();
  });

  it('VOY-F-12 ignores corrupted files in stats', () => {    const dir = mkdtempSync(join(tmpdir(), 'pv-cache-'));
    try {
      const cache = createFileCache(dir);
      cache.set('ok', 'val', 1);
      const files = readdirSync(dir);
      if (files[0]) {
        const t = new Date('2026-01-01T00:00:00Z');
        utimesSync(join(dir, files[0]), t, t);
      }
      expect(cache.stats().entries).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
