/**
 * Kiro file-save hook: data-licence-guard (§14.3, VOY-N-05).
 * Validates provenance & licence when saving inside `packages/data/**`.
 */
import console from 'node:console';
import process from 'node:process';
import { checkDataLicence } from '../guards/data-licence.guard.mjs';
import { isMain } from '../guards/lib.mjs';
import { extractHookTargets, readHookPayload } from './hook-lib.mjs';

async function main() {
  const payload = await readHookPayload();
  const { root, files } = extractHookTargets(payload);
  const datasets = files
    .filter((f) => f.startsWith('packages/data/datasets/') && f.endsWith('.json'));
  const touchedData = files.length === 0 || files.some((f) => f.startsWith('packages/data/'));
  if (!touchedData) process.exit(0);

  const { errors } = await checkDataLicence(root, datasets.length > 0 ? datasets : null);
  if (errors.length > 0) {
    for (const err of errors) {
      console.error(`data-licence-guard: ${err}`);
    }
    process.exit(1);
  }
  process.exit(0);
}

if (isMain(import.meta.url, process.argv[1])) {
  await main();
}
