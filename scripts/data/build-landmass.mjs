#!/usr/bin/env node
/**
 * build-landmass.mjs — turn Natural Earth 110m land into `landmasses.json`.
 *
 * Source: Natural Earth 110m land (public domain).
 * Mirror: nvkelso/natural-earth-vector on GitHub.
 *
 * Requirements:
 * - Simplify hard: a few hundred points per continent is enough.
 * - Group into recognized landmasses: afro-eurasia, americas-north,
 *   americas-south, australia, antarctica, great-britain, ireland, japan,
 *   madagascar, new-zealand, iceland, ...
 * - Natural Earth 110m bundles North and South America in a single polygon:
 *   split them at the Darien gap (Panama/Colombia border) so transatlantic /
 *   trans-isthmus reasoning works as specified in §7.9.
 *
 * Offline & idempotent: same cache in, byte-identical dataset out.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { updateProvenance } from './provenance.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const CACHE = join(here, 'cache', 'ne_110m_land.geojson');
const OUT_DIR = join(root, 'packages', 'data', 'datasets');
const OUT = join(OUT_DIR, 'landmasses.json');

const SIMPLIFY_DEG = 0.25;

function round4(n) { return Math.round(n * 1e4) / 1e4; }

function simplifyRing(coords) {
  const kept = [];
  let last = null;
  for (const p of coords) {
    if (!last || Math.abs(p[0] - last[0]) >= SIMPLIFY_DEG || Math.abs(p[1] - last[1]) >= SIMPLIFY_DEG) {
      kept.push(p);
      last = p;
    }
  }
  const first = coords[0];
  const lastPt = coords[coords.length - 1];
  if (first && kept.length && (kept[0] !== first)) kept.unshift(first);
  if (lastPt && kept.length && kept[kept.length - 1] !== lastPt) kept.push(lastPt);
  if (kept.length > 0) {
    const k0 = kept[0];
    const kn = kept[kept.length - 1];
    if (k0[0] !== kn[0] || k0[1] !== kn[1]) kept.push([k0[0], k0[1]]);
  }
  return kept;
}

function toPositions(coords) {
  return simplifyRing(coords).map(([lon, lat]) => ({ lat: round4(lat), lon: round4(lon) }));
}

function pointInRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = ((yi > pt[1]) !== (yj > pt[1]))
      && (pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

const LANDMASS_DEFINITIONS = [
  { id: 'afro-eurasia', name: 'Afro-Eurasia', anchors: [[2.35, 48.85], [116.4, 39.9], [31.2, 30.0]] },
  { id: 'australia', name: 'Australia', anchors: [[133.7, -25.2], [151.2, -33.8]] },
  { id: 'antarctica', name: 'Antarctica', anchors: [[0, -85]] },
  { id: 'great-britain', name: 'Great Britain', anchors: [[-0.12, 51.5]] },
  { id: 'ireland', name: 'Ireland', anchors: [[-6.26, 53.3]] },
  { id: 'japan', name: 'Japan', anchors: [[139.69, 35.68]] },
  { id: 'madagascar', name: 'Madagascar', anchors: [[47.5, -18.8]] },
  { id: 'new-zealand', name: 'New Zealand', anchors: [[174.7, -36.8], [170.5, -45.8]] },
  { id: 'iceland', name: 'Iceland', anchors: [[-21.9, 64.1]] },
  { id: 'greenland', name: 'Greenland', anchors: [[-40, 72]] },
  { id: 'cuba', name: 'Cuba', anchors: [[-82.3, 23.1]] },
  { id: 'hispaniola', name: 'Hispaniola', anchors: [[-72.3, 18.5]] },
  { id: 'taiwan', name: 'Taiwan', anchors: [[121.5, 25.0]] },
  { id: 'hainan', name: 'Hainan', anchors: [[110.3, 20.0]] },
  { id: 'sri-lanka', name: 'Sri Lanka', anchors: [[80.6, 7.8]] },
  { id: 'sumatra', name: 'Sumatra', anchors: [[102.0, -0.5]] },
  { id: 'java', name: 'Java', anchors: [[110.0, -7.5]] },
  { id: 'borneo', name: 'Borneo', anchors: [[114.0, 1.0]] },
  { id: 'sulawesi', name: 'Sulawesi', anchors: [[120.0, -1.5]] },
  { id: 'new-guinea', name: 'New Guinea', anchors: [[140.0, -4.5]] },
  { id: 'philippines-luzon', name: 'Luzon', anchors: [[121.0, 16.0]] },
  { id: 'philippines-mindanao', name: 'Mindanao', anchors: [[125.0, 8.0]] },
  { id: 'tasmania', name: 'Tasmania', anchors: [[147.0, -42.0]] },
  { id: 'svalbard', name: 'Svalbard', anchors: [[16.0, 78.0]] },
  { id: 'hawaii', name: 'Hawaii', anchors: [[-155.5, 19.6]] },
  { id: 'bermuda', name: 'Bermuda', anchors: [[-64.75, 32.3]] },
  { id: 'fiji', name: 'Fiji', anchors: [[178.0, -17.8]] },
  { id: 'tierra-del-fuego', name: 'Tierra del Fuego', anchors: [[-69.0, -54.0]] },
  { id: 'newfoundland', name: 'Newfoundland', anchors: [[-56.0, 48.5]] },
  { id: 'vancouver-island', name: 'Vancouver Island', anchors: [[-125.0, 49.5]] },
  { id: 'sardinia', name: 'Sardinia', anchors: [[9.1, 40.0]] },
  { id: 'sicily', name: 'Sicily', anchors: [[14.1, 37.6]] },
  { id: 'corsica', name: 'Corsica', anchors: [[9.1, 42.2]] },
  { id: 'cyprus', name: 'Cyprus', anchors: [[33.4, 35.1]] },
  { id: 'crete', name: 'Crete', anchors: [[24.9, 35.4]] },
];

/** The combined Americas ring of NE 110m land: contains both New York and Bogota. */
function isAmericasRing(ring) {
  return pointInRing([-74.006, 40.7128], ring) && pointInRing([-74.0721, 4.711], ring);
}

/**
 * Split the combined Americas ring into North and South America at the Darien
 * gap. Indices 322 (Caribbean coast) and 565 (Pacific coast) mark the two ends
 * of the cut, near the Panama/Colombia border, for the cached ne_110m_land.geojson
 * (retrieved 2026-11-11); the build is offline against that exact cache.
 */
function splitAmericas(ring) {
  const northRing = [...ring.slice(0, 323), ...ring.slice(565)];
  if (northRing[0][0] !== northRing[northRing.length - 1][0] || northRing[0][1] !== northRing[northRing.length - 1][1]) {
    northRing.push([northRing[0][0], northRing[0][1]]);
  }
  const southRing = [...ring.slice(322, 566)];
  if (southRing[0][0] !== southRing[southRing.length - 1][0] || southRing[0][1] !== southRing[southRing.length - 1][1]) {
    southRing.push([southRing[0][0], southRing[0][1]]);
  }
  return { northRing, southRing };
}

function classifyPolygon(ring) {
  for (const def of LANDMASS_DEFINITIONS) {
    for (const anchor of def.anchors) {
      if (pointInRing(anchor, ring)) return def;
    }
  }
  return null;
}

function processFeatures(features) {
  const byId = new Map();
  function addPoly(id, name, ring) {
    if (!byId.has(id)) byId.set(id, { id, name, polygons: [] });
    const pos = toPositions(ring);
    if (pos.length >= 4) byId.get(id).polygons.push(pos);
  }
  for (const f of features) {
    const geom = f.geometry;
    const rings = geom.type === 'Polygon'
      ? [geom.coordinates[0]]
      : geom.type === 'MultiPolygon'
        ? geom.coordinates.map((poly) => poly[0])
        : [];
    for (const ring of rings) {
      if (isAmericasRing(ring)) {
        const { northRing, southRing } = splitAmericas(ring);
        addPoly('americas-north', 'North America', northRing);
        addPoly('americas-south', 'South America', southRing);
        continue;
      }
      const match = classifyPolygon(ring);
      if (match) addPoly(match.id, match.name, ring);
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function main() {
  const raw = JSON.parse(readFileSync(CACHE, 'utf8'));
  const landmasses = processFeatures(raw.features);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(landmasses, null, 1)}\n`);
  const totalPolys = landmasses.reduce((sum, l) => sum + l.polygons.length, 0);
  const totalPts = landmasses.reduce((s, l) => s + l.polygons.reduce((p, r) => p + r.length, 0), 0);
  console.log(`wrote ${OUT}: ${landmasses.length} landmasses (${totalPolys} polygons, ${totalPts} points)`);
  updateProvenance('landmasses', { features: landmasses.length });
}

main();
