#!/usr/bin/env node
/**
 * provenance.mjs — shared helper for the dataset build scripts.
 *
 * Recomputes `features` (dataset entry count) and `sha256` (of the built file,
 * byte for byte) and merges them into `packages/data/provenance/<id>.json`.
 * Hand-written fields (title, origin, url, licence, attribution, …) live in
 * `provenance-templates.mjs` so every run stays idempotent and offline.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEMPLATES } from './provenance-templates.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const DATA_DIR = join(root, 'packages', 'data');

export function sha256File(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

/** Number of top-level entries of a dataset file (array length). */
export function countFeatures(file) {
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error(`${file}: expected a JSON array`);
  return parsed.length;
}

/**
 * Rewrite `provenance/<id>.json` from the template plus freshly measured
 * `features` and `sha256`. Extra overrides are merged on top of the template.
 */
export function updateProvenance(id, overrides = {}) {
  const template = TEMPLATES[id];
  if (!template) throw new Error(`no provenance template for dataset id '${id}'`);
  const datasetFile = join(DATA_DIR, 'datasets', `${id}.json`);
  const sheet = {
    ...template,
    features: countFeatures(datasetFile),
    sha256: sha256File(datasetFile),
    ...overrides,
  };
  const outDir = join(DATA_DIR, 'provenance');
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `${id}.json`);
  writeFileSync(outFile, `${JSON.stringify(sheet, null, 2)}\n`);
  console.log(`wrote ${outFile}: features=${sheet.features} sha256=${sheet.sha256.slice(0, 12)}…`);
  return sheet;
}
