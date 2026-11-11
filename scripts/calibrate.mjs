#!/usr/bin/env node
/**
 * Calibration dashboard (open question 9, indicator "at least 70 % of public
 * hops located at solid or probable level").
 *
 * Reads journey files — the gallery, or the ones produced by `voyage trace` on
 * real routes — and reports, per journey and in total, how many public hops were
 * located, at which confidence, how many locations the light rejected and how
 * many holes stayed holes. Nothing is guessed: a journey that located nothing
 * counts as nothing.
 *
 *   node scripts/calibrate.mjs                       # the gallery
 *   node scripts/calibrate.mjs ~/traces/*.json       # your own journeys
 *   node scripts/calibrate.mjs --json --min-located=70   # fail below the target
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import process from 'node:process';

const LOCATED_LEVELS = new Set(['solid', 'probable']);
const COUNTED_CLASSES = new Set(['public', 'documentation']);

function parseArgs(argv) {
  const options = { json: false, minLocated: null, paths: [] };
  for (const arg of argv) {
    if (arg === '--json') options.json = true;
    else if (arg.startsWith('--min-located=')) options.minLocated = Number(arg.slice(14));
    else if (!arg.startsWith('-')) options.paths.push(arg);
  }
  return options;
}

function defaultPaths() {
  return globSync('gallery/*/journey.json').sort();
}

function readJourney(path) {
  const journey = JSON.parse(readFileSync(path, 'utf8'));
  if (journey?.version !== 1 || !Array.isArray(journey.hops)) {
    throw new Error(`${path}: not a journey file (version 1 with hops expected)`);
  }
  return journey;
}

/** The honest ratio: located public hops over public hops, not over all hops. */
export function journeyStats(journey) {
  const counted = journey.hops.filter((hop) => COUNTED_CLASSES.has(hop.class));
  const located = counted.filter((hop) => hop.location);
  const confident = located.filter((hop) => LOCATED_LEVELS.has(hop.location.level));
  const rejected = journey.hops.reduce(
    (total, hop) => total + (hop.location?.rejected?.length ?? 0),
    0,
  );
  const ratio = (part, whole) => (whole === 0 ? null : Number(((part / whole) * 100).toFixed(1)));
  return {
    hops: journey.hops.length,
    counted_hops: counted.length,
    located: located.length,
    located_pct: ratio(located.length, counted.length),
    confident: confident.length,
    confident_pct: ratio(confident.length, counted.length),
    rejected_by_light: journey.summary?.rejected_by_light ?? 0,
    rejected_candidates: rejected,
    gaps: journey.summary?.gaps ?? 0,
    distance_km_min: journey.summary?.distance_km_min ?? 0,
    rtt_ms: journey.summary?.rtt_ms ?? null,
    light_floor_ms: journey.summary?.light_floor_ms ?? null,
    inflation: journey.summary?.inflation ?? null,
    countries: journey.summary?.countries ?? [],
    redacted: journey.redaction?.applied === true,
  };
}

function totalStats(rows) {
  const sum = (key) => rows.reduce((total, row) => total + (row.stats[key] ?? 0), 0);
  const counted = sum('counted_hops');
  const located = sum('located');
  const confident = sum('confident');
  const ratio = (part) => (counted === 0 ? null : Number(((part / counted) * 100).toFixed(1)));
  return {
    journeys: rows.length,
    counted_hops: counted,
    located,
    located_pct: ratio(located),
    confident,
    confident_pct: ratio(confident),
    rejected_by_light: sum('rejected_by_light'),
    gaps: sum('gaps'),
    target_located_pct: 70,
  };
}

function pad(value, width) {
  return String(value ?? '—').padStart(width);
}

function printTable(rows, totals) {
  const head = ['journey', 'public', 'loc.', 'loc%', 'conf%', 'rej.', 'gaps', 'km min', 'infl.'];
  console.log(head.map((h, i) => (i === 0 ? h.padEnd(20) : pad(h, 7))).join(''));
  for (const row of rows) {
    const s = row.stats;
    console.log(
      [
        row.path.replace(/^gallery\//, '').replace(/\/journey\.json$/, '').padEnd(20),
        pad(s.counted_hops, 7),
        pad(s.located, 7),
        pad(s.located_pct, 7),
        pad(s.confident_pct, 7),
        pad(s.rejected_by_light, 7),
        pad(s.gaps, 7),
        pad(Math.round(s.distance_km_min), 7),
        pad(s.inflation === null ? null : s.inflation.toFixed(2), 7),
      ].join(''),
    );
  }
  console.log(
    `TOTAL ${totals.journeys} journeys · ${totals.located}/${totals.counted_hops} public hops located ` +
      `(${totals.located_pct} %), ${totals.confident_pct} % at solid or probable · ` +
      `${totals.rejected_by_light} rejected by light · ${totals.gaps} gaps · target ${totals.target_located_pct} %`,
  );
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const paths = options.paths.length > 0 ? options.paths : defaultPaths();
  if (paths.length === 0) {
    console.error('calibrate: no journey file found (pass paths, or build the gallery first)');
    process.exit(2);
  }
  const rows = paths.map((path) => ({ path, stats: journeyStats(readJourney(path)) }));
  const totals = totalStats(rows);
  if (options.json) console.log(JSON.stringify({ rows, totals }, null, 2));
  else printTable(rows, totals);
  if (options.minLocated !== null && (totals.located_pct ?? 0) < options.minLocated) {
    console.error(`calibrate: ${totals.located_pct} % located, below the ${options.minLocated} % threshold`);
    process.exit(1);
  }
}

main();
