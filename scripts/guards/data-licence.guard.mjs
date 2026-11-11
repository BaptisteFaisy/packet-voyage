/**
 * Data licence & provenance guard (§6.1, §6.3, VOY-N-05).
 * Ensures every `packages/data/datasets/*.json` has a matching provenance sheet
 * with a permitted licence, no TeleGeography/PeeringDB origin, and matching sha256.
 */
import console from 'node:console';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';
import { fileSha256, isMain, walkFiles } from './lib.mjs';

export const PERMITTED_LICENCES = new Set([
  'ODbL-1.0',
  'CC0-1.0',
  'Public Domain',
  'MIT',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
]);

/** SPDX ids and plain words are written many ways: compare a normalized form. */
function normalizeLicence(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[-_]+/g, ' ');
}

const PERMITTED_NORMALIZED = new Set([...PERMITTED_LICENCES].map(normalizeLicence));

const FORBIDDEN_ORIGINS = /\b(telegeography|peeringdb)\b/i;

/** Validate a single dataset path against its provenance sheet. */
export async function validateDataset(root, relDataset) {
  const errors = [];
  const id = basename(relDataset, '.json');
  const absDataset = join(root, relDataset);
  const relProv = `packages/data/provenance/${id}.json`;
  const absProv = join(root, relProv);

  if (!existsSync(absProv)) {
    errors.push(`${relDataset}: missing provenance file ${relProv}`);
    return errors;
  }

  let prov;
  try {
    prov = JSON.parse(await readFile(absProv, 'utf8'));
  } catch (err) {
    errors.push(`${relProv}: invalid JSON (${err.message})`);
    return errors;
  }

  const originText = `${prov.origin ?? ''} ${prov.url ?? ''} ${prov.attribution ?? ''} ${prov.title ?? ''}`;
  if (FORBIDDEN_ORIGINS.test(originText)) {
    errors.push(`${relProv}: forbidden origin (TeleGeography/PeeringDB cannot be redistributed)`);
  }

  if (!PERMITTED_NORMALIZED.has(normalizeLicence(prov.licence))) {
    errors.push(`${relProv}: licence "${prov.licence ?? ''}" is not in permitted list`);
  }

  const actualHash = await fileSha256(absDataset);
  if (prov.sha256 !== actualHash) {
    errors.push(`${relProv}: sha256 mismatch (expected ${prov.sha256}, actual ${actualHash})`);
  }

  return errors;
}

/** Check all datasets under `packages/data/datasets/*.json` (or a specified list). */
export async function checkDataLicence(root, targetDatasets = null) {
  const datasets = targetDatasets ?? (await walkFiles(root, 'packages/data/datasets'))
    .filter((f) => f.endsWith('.json'));
  const allFiles = await walkFiles(root, 'packages/data');
  const errors = [];

  for (const rel of allFiles) {
    if (!rel.endsWith('.json')) continue;
    const text = await readFile(join(root, rel), 'utf8');
    if (FORBIDDEN_ORIGINS.test(text) && !rel.startsWith('packages/data/provenance/')) {
      errors.push(`${rel}: mentions forbidden data origin (TeleGeography/PeeringDB)`);
    }
  }

  for (const ds of datasets) {
    if (!existsSync(join(root, ds))) continue;
    errors.push(...(await validateDataset(root, ds)));
  }

  return { checked: datasets.length, errors };
}

async function main() {
  const root = resolve('.');
  const { checked, errors } = await checkDataLicence(root);
  console.log(`data-licence: checked ${checked} dataset(s)`);
  for (const err of errors) {
    console.error(`data-licence: ${err}`);
  }
  process.exit(errors.length === 0 ? 0 : 1);
}

if (isMain(import.meta.url, process.argv[1])) {
  await main();
}
