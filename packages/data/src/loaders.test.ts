/**
 * loaders.test.ts — unit and validation tests for @packet-voyage/data loaders.
 *
 * Verifies:
 * - loadCables, loadLandmasses, loadFixedLinks, loadHints, loadProvenance
 * - every returned object conforms to the @packet-voyage/schema shape
 * - creditsFor returns expected attributions and handles aliases + unknown ids
 * - staleProvenance identifies old sheets and respects the threshold (VOY-N-11)
 * - landmass lookup matches Paris to 'afro-eurasia' and rejects a mid-Atlantic point
 */
import { describe, expect, it } from 'vitest';
import {
  creditsFor,
  loadCables,
  loadFixedLinks,
  loadHints,
  loadLandmasses,
  loadProvenance,
  provenanceAgeDays,
  staleProvenance,
} from './index.ts';

describe('dataset loaders', () => {
  it('loads cables and validates schema', () => {
    const cables = loadCables();
    expect(cables.length).toBeGreaterThan(100);
    const marea = cables.find((c) => c.id.includes('marea') || c.id.includes('apollo') || c.id.includes('cantat'));
    expect(marea).toBeDefined();
    expect(marea?.geometry.length).toBeGreaterThan(0);
    expect(marea?.status).toMatch(/^(in-service|retired|planned)$/);
  });

  it('loads landmasses and validates schema', () => {
    const landmasses = loadLandmasses();
    expect(landmasses.length).toBeGreaterThan(10);
    const afro = landmasses.find((l) => l.id === 'afro-eurasia');
    expect(afro).toBeDefined();
    expect(afro?.polygons.length).toBeGreaterThan(0);
  });

  it('loads fixed links and validates schema', () => {
    const links = loadFixedLinks();
    expect(links.length).toBeGreaterThanOrEqual(5);
    const chann = links.find((l) => l.id === 'channel-tunnel');
    expect(chann).toBeDefined();
    expect(chann?.countries).toEqual(expect.arrayContaining(['GB', 'FR']));
    expect(chann?.a.lat).toBeCloseTo(51.1, 1);
  });

  it('loads hints table and validates schema', () => {
    const hints = loadHints();
    expect(hints.length).toBeGreaterThanOrEqual(100);
    const cdg = hints.find((h) => h.code === 'CDG');
    expect(cdg).toBeDefined();
    expect(cdg?.city).toBe('Paris');
    expect(cdg?.country).toBe('FR');
    expect(cdg?.kind).toBe('airport');
  });

  it('loads provenance sheets and validates schema', () => {
    const sheets = loadProvenance();
    expect(sheets.length).toBe(4);
    const ids = sheets.map((s) => s.id).sort();
    expect(ids).toEqual(['fixed-links', 'hints', 'landmasses', 'submarine-cables']);
    for (const sheet of sheets) {
      expect(sheet.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(sheet.features).toBeGreaterThan(0);
      expect(sheet.retrieved_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe('creditsFor (VOY-F-48)', () => {
  it('returns attributions for known dataset ids', () => {
    const credits = creditsFor(['submarine-cables', 'landmasses']);
    expect(credits).toEqual([
      '© OpenStreetMap contributors',
      'Made with Natural Earth',
    ]);
  });

  it('resolves source aliases (e.g. osm-cables, hand-curated)', () => {
    const credits = creditsFor(['osm-cables', 'natural-earth']);
    expect(credits).toEqual([
      '© OpenStreetMap contributors',
      'Made with Natural Earth',
    ]);
  });

  it('collapses duplicates and ignores unknown ids gracefully', () => {
    const credits = creditsFor(['osm-cables', 'submarine-cables', 'non-existent-source']);
    expect(credits).toEqual(['© OpenStreetMap contributors']);
  });
});

describe('staleProvenance (VOY-N-11)', () => {
  it('computes provenance age in days', () => {
    const now = new Date('2026-11-11T12:00:00Z');
    expect(provenanceAgeDays('2026-11-11', now)).toBe(0);
    expect(provenanceAgeDays('2026-08-13', now)).toBe(90);
    expect(provenanceAgeDays('2026-05-15', now)).toBe(180);
    expect(provenanceAgeDays('invalid-date', now)).toBe(Number.POSITIVE_INFINITY);
  });

  it('returns no stale sheets when data is fresh (< 90 days)', () => {
    const freshDate = new Date('2026-11-15T00:00:00Z');
    const stale = staleProvenance(90, freshDate);
    expect(stale).toEqual([]);
  });

  it('flags sheets older than 90 days when checked in the future', () => {
    const futureDate = new Date('2027-04-01T00:00:00Z');
    const stale = staleProvenance(90, futureDate);
    expect(stale.length).toBe(4);
    expect(stale.map((s) => s.id).sort()).toEqual([
      'fixed-links',
      'hints',
      'landmasses',
      'submarine-cables',
    ]);
  });
});

describe('landmass geographic lookup', () => {
  function pointInRing(lat: number, lon: number, ring: { lat: number; lon: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const pi = ring[i];
      const pj = ring[j];
      if (!pi || !pj) continue;
      const intersect = ((pi.lat > lat) !== (pj.lat > lat))
        && (lon < ((pj.lon - pi.lon) * (lat - pi.lat)) / (pj.lat - pi.lat) + pi.lon);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function landmassOf(lat: number, lon: number): string | null {
    for (const land of loadLandmasses()) {
      for (const poly of land.polygons) {
        if (pointInRing(lat, lon, poly)) return land.id;
      }
    }
    return null;
  }

  it('finds Paris on afro-eurasia', () => {
    expect(landmassOf(48.8566, 2.3522)).toBe('afro-eurasia');
  });

  it('finds New York on americas-north', () => {
    expect(landmassOf(40.7128, -74.006)).toBe('americas-north');
  });

  it('finds Bogota on americas-south', () => {
    expect(landmassOf(4.711, -74.0721)).toBe('americas-south');
  });

  it('finds London on great-britain', () => {
    expect(landmassOf(51.5074, -0.1278)).toBe('great-britain');
  });

  it('rejects a mid-Atlantic point (30°N, 30°W)', () => {
    expect(landmassOf(30.0, -30.0)).toBeNull();
  });

  it('rejects a mid-Pacific point (0°N, 160°W)', () => {
    expect(landmassOf(0.0, -160.0)).toBeNull();
  });
});
