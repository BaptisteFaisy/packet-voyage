#!/usr/bin/env node
/**
 * build-cables.mjs — turn a cached Overpass response into `submarine-cables.json`.
 *
 * Source: OpenStreetMap contributors, ODbL-1.0 (see provenance sheet).
 * Query:  scripts/data/cables.overpassql — refresh the cache with:
 *   curl -sS -A 'packet-voyage-data-build/0.1' \
 *        --data-urlencode "data@cables.overpassql" \
 *        https://overpass-api.de/api/interpreter -o cache/overpass-cables.json
 *
 * Offline & idempotent: same cache in, byte-identical dataset out.
 * Stdlib only (Node >= 22).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { updateProvenance } from './provenance.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const CACHE = join(here, 'cache', 'overpass-cables.json');
const OUT_DIR = join(root, 'packages', 'data', 'datasets');
const OUT = join(OUT_DIR, 'submarine-cables.json');

/** Minimum distance in degrees between two consecutive kept points. */
const SIMPLIFY_DEG = 0.05;
/** Cap on geometry points kept for a single way (polyline). */
const MAX_POINTS_PER_WAY = 400;

const FIBRE_CATEGORIES = new Set([
  'fiber_optic', 'fibre_optic', 'optical', 'communication', 'none',
]);

/** True when the way carries (or may carry) optical fibre: power-only ways are dropped. */
function isFibre(tags) {
  if (tags.power) return false;
  const cat = tags['seamark:cable_submarine:category'] ?? 'none';
  return cat.split(';').some((part) => FIBRE_CATEGORIES.has(part.trim()) || part.trim().includes('optic'));
}

/** True when the way is marked out of service. */
function isRetired(tags) {
  return Boolean(tags.disused) || tags.operational_status === 'decommissioned'
    || tags.abandoned === 'yes' || tags.removed === 'yes';
}

/** Normalise an OSM cable name into a group key (drops segment suffixes). */
function baseName(name) {
  return name
    .replace(/\s*[-–]\s*(Seg\.?|FC|BU|F\d|segment|branch).*/i, '')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s*(Seg\.?|,)\s*F?\d.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/** Round to 5 decimals (~1 m) for deterministic output. */
function round5(n) { return Math.round(n * 1e5) / 1e5; }

/** Haversine distance in km between two [lon, lat] points. */
function kmBetween(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Total polyline length in km. */
function polylineKm(points) {
  let km = 0;
  for (let i = 1; i < points.length; i += 1) km += kmBetween(points[i - 1], points[i]);
  return km;
}

/** Douglas-Peucker-style thinning: keep a point every >= SIMPLIFY_DEG, plus endpoints, capped. */
function simplify(points) {
  const kept = [];
  let last = null;
  for (const p of points) {
    if (!last || Math.abs(p[0] - last[0]) >= SIMPLIFY_DEG || Math.abs(p[1] - last[1]) >= SIMPLIFY_DEG) {
      kept.push(p);
      last = p;
    }
  }
  const first = points[0];
  const lastPt = points[points.length - 1];
  if (first && kept.length && (kept[0] !== first)) kept.unshift(first);
  if (lastPt && kept.length && kept[kept.length - 1] !== lastPt) kept.push(lastPt);
  if (kept.length > MAX_POINTS_PER_WAY) {
    const step = kept.length / MAX_POINTS_PER_WAY;
    const capped = [];
    for (let i = 0; i < MAX_POINTS_PER_WAY; i += 1) capped.push(kept[Math.floor(i * step)]);
    capped.push(lastPt);
    return capped;
  }
  return kept;
}

/** Slugify a cable name into a stable id. */
function slug(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'unnamed';
}

/** Extract a 4-digit year from an OSM start_date-like tag. */
function rfsYear(tags) {
  const raw = tags.start_date ?? tags['construction:date'] ?? tags.rfs ?? tags.vayla_cdate ?? '';
  const m = String(raw).match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

/** Load the built hints table if present (build-hints.mjs must run first for landing names). */
function loadHints() {
  try {
    return JSON.parse(readFileSync(join(OUT_DIR, 'hints.json'), 'utf8'));
  } catch {
    return [];
  }
}

/** Nearest hint city within `maxKm`, else null. */
function nearestCity(pos, hints, maxKm) {
  let best = null;
  let bestKm = maxKm;
  for (const h of hints) {
    const km = kmBetween([pos.lon, pos.lat], [h.lon, h.lat]);
    if (km < bestKm) { bestKm = km; best = h; }
  }
  return best;
}

/**
 * Derive landings from the endpoints of every polyline (inferred positions:
 * they are real OSM geometry endpoints, but OSM does not tag landing
 * stations). Duplicates within ~25 km are merged; named from the hints table
 * when a city is within 100 km, else "Unnamed landing". Capped at 24.
 */
function landingsFromWays(ways, hints) {
  const endpoints = [];
  for (const w of ways) {
    const geom = w.geometry ?? [];
    if (geom.length >= 2) {
      endpoints.push([round5(geom[0].lon), round5(geom[0].lat)]);
      endpoints.push([round5(geom[geom.length - 1].lon), round5(geom[geom.length - 1].lat)]);
    }
  }
  const landings = [];
  for (const [lon, lat] of endpoints) {
    if (landings.some((l) => Math.abs(l.lon - lon) < 0.25 && Math.abs(l.lat - lat) < 0.25)) continue;
    const city = nearestCity({ lon, lat }, hints, 100);
    landings.push({
      name: city ? `${city.city} area` : 'Unnamed landing',
      country: city ? city.country : null,
      lat,
      lon,
    });
    if (landings.length >= 24) break;
  }
  return landings;
}

function loadCache() {
  try {
    return JSON.parse(readFileSync(CACHE, 'utf8'));
  } catch {
    throw new Error(`missing or unreadable cache ${CACHE}; refresh it with the curl command in this file's header`);
  }
}

/** Group Overpass ways by (wikidata, then base name). Returns Map key -> ways. */
function groupWays(elements) {
  const groups = new Map();
  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = tags.name ?? tags['seamark:name'] ?? null;
    if (!name) continue;
    const key = tags.wikidata ? `q:${tags.wikidata}` : `n:${baseName(name)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(el);
  }
  return groups;
}

/** Build one Cable object from a group of ways. */
function buildCable(key, ways, hints) {
  const names = ways.map((w) => w.tags?.name ?? w.tags?.['seamark:name']).filter(Boolean);
  names.sort((a, b) => a.length - b.length || a.localeCompare(b));
  const name = names[0] ?? key;
  const retired = ways.every((w) => isRetired(w.tags ?? {}));
  const geometry = ways
    .map((w) => simplify((w.geometry ?? []).map((p) => [round5(p.lon), round5(p.lat)])))
    .filter((poly) => poly.length >= 2)
    .map((poly) => poly.map(([lon, lat]) => ({ lat, lon })));
  const lengthKm = Math.round(
    ways.reduce((sum, w) => sum + polylineKm((w.geometry ?? []).map((p) => [p.lon, p.lat])), 0),
  );
  const owners = [...new Set(ways.map((w) => w.tags?.operator).filter(Boolean))].sort();
  const rfs = ways.map((w) => rfsYear(w.tags ?? {})).filter((y) => y !== null);
  return {
    id: slug(name) || slug(key),
    name,
    length_km: lengthKm > 0 ? lengthKm : null,
    rfs_year: rfs.length ? Math.min(...rfs) : null,
    owners: owners.length ? owners : undefined,
    landings: landingsFromWays(ways, hints),
    geometry,
    status: retired ? 'retired' : 'in-service',
    source: 'osm-cables',
  };
}

function main() {
  const cache = loadCache();
  const fibreWays = cache.elements.filter((el) => isFibre(el.tags ?? {}));
  const groups = groupWays(fibreWays);
  const hints = loadHints();
  const cables = [...groups.entries()].map(([key, ways]) => buildCable(key, ways, hints));
  cables.sort((a, b) => a.id.localeCompare(b.id));
  // Deterministic ids: de-duplicate collisions with a numeric suffix.
  const seen = new Map();
  for (const c of cables) {
    const n = seen.get(c.id) ?? 0;
    seen.set(c.id, n + 1);
    if (n > 0) c.id = `${c.id}-${n + 1}`;
  }
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(cables, null, 1)}\n`);
  console.log(`wrote ${OUT}: ${cables.length} cables from ${fibreWays.length} fibre ways`);
  updateProvenance('submarine-cables', { features: cables.length });
}

main();
