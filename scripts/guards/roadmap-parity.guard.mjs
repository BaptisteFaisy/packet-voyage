/**
 * Roadmap parity guard (VOY-F-33, VOY-N-08, §18).
 * - Skips cleanly (exit 0) while `apps/web/src` has no source files yet.
 * - Otherwise verifies `apps/web/src/ * * /RoadmapTable*.tsx` iterates over
 *   both `hops` and `segments`, and that a test in `apps/web/src/ * * /*.test.tsx`
 *   mentions `RoadmapTable`.
 * - Also validates any existing `gallery/<slug>/journey.json` files are parseable
 *   and expose `hops` and `segments` arrays.
 */
import console from 'node:console';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { isMain, walkFiles } from './lib.mjs';

async function checkGalleryJourneys(root, errors) {
  const galleryFiles = await walkFiles(root, 'gallery');
  const journeys = galleryFiles.filter((f) => /^gallery\/[^/]+\/journey\.json$/.test(f));
  for (const rel of journeys) {
    try {
      const data = JSON.parse(await readFile(join(root, rel), 'utf8'));
      if (!Array.isArray(data.hops) || !Array.isArray(data.segments)) {
        errors.push(`${rel}: missing hops or segments array`);
      }
    } catch (err) {
      errors.push(`${rel}: invalid JSON (${err.message})`);
    }
  }
  return journeys.length;
}

/** Check roadmap table rendering parity and its unit test under `root`. */
export async function checkRoadmapParity(root) {
  const webFiles = await walkFiles(root, 'apps/web/src');
  if (webFiles.length === 0) {
    return { skipped: true, reason: 'apps/web/src has no source files yet', checked: 0, errors: [] };
  }

  const errors = [];
  const journeyCount = await checkGalleryJourneys(root, errors);
  const tableFiles = webFiles.filter((f) => /\/RoadmapTable[^/]*\.tsx$/.test(f) || /^apps\/web\/src\/RoadmapTable[^/]*\.tsx$/.test(f));
  if (tableFiles.length === 0) {
    errors.push('apps/web/src: missing RoadmapTable*.tsx component');
  } else {
    let iteratesHops = false;
    let iteratesSegments = false;
    for (const rel of tableFiles) {
      if (!existsSync(join(root, rel))) continue;
      const text = await readFile(join(root, rel), 'utf8');
      if (/\bhops\b/.test(text) && /\.map\s*\(/.test(text)) iteratesHops = true;
      if (/\bsegments\b/.test(text) && /\.map\s*\(/.test(text)) iteratesSegments = true;
    }
    if (!iteratesHops) errors.push('RoadmapTable*.tsx: must iterate over journey hops');
    if (!iteratesSegments) errors.push('RoadmapTable*.tsx: must iterate over journey segments');
  }

  const testFiles = webFiles.filter((f) => f.endsWith('.test.tsx') || f.endsWith('.test.ts'));
  let hasTableTest = false;
  for (const rel of testFiles) {
    const text = await readFile(join(root, rel), 'utf8');
    if (/\bRoadmapTable\b/.test(text)) {
      hasTableTest = true;
      break;
    }
  }
  if (!hasTableTest) {
    errors.push('apps/web/src: missing unit test (*.test.tsx) referencing RoadmapTable');
  }

  return { skipped: false, checked: tableFiles.length + journeyCount, errors };
}

async function main() {
  const root = resolve('.');
  const res = await checkRoadmapParity(root);
  if (res.skipped) {
    console.log(`roadmap-parity: skipped (${res.reason})`);
    process.exit(0);
  }
  console.log(`roadmap-parity: checked ${res.checked} item(s)`);
  for (const err of res.errors) {
    console.error(`roadmap-parity: ${err}`);
  }
  process.exit(res.errors.length === 0 ? 0 : 1);
}

if (isMain(import.meta.url, process.argv[1])) {
  await main();
}
