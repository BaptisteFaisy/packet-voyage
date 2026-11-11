/**
 * Kiro file-save hook: fixture-privacy-guard (§14.3, VOY-N-13).
 * Checks saved gallery or test fixture files for non-redacted/private addresses.
 */
import console from 'node:console';
import process from 'node:process';
import { checkFixturePrivacy } from '../guards/fixture-privacy.guard.mjs';
import { isMain } from '../guards/lib.mjs';
import { extractHookTargets, readHookPayload } from './hook-lib.mjs';

async function main() {
  const payload = await readHookPayload();
  const { root, files } = extractHookTargets(payload);
  const { errors } = await checkFixturePrivacy(root, files.length > 0 ? files : null);
  if (errors.length > 0) {
    for (const err of errors) {
      console.error(`fixture-privacy-guard: ${err}`);
    }
    process.exit(1);
  }
  process.exit(0);
}

if (isMain(import.meta.url, process.argv[1])) {
  await main();
}
