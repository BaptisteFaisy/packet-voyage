/**
 * Kiro file-save hook: claims-guard (§14.3, VOY-N-04).
 * Runs the vocabulary guard on the saved file under `apps/web/src/**`
 * or `packages/core/src/story/**` (or all target files if none specified).
 */
import console from 'node:console';
import process from 'node:process';
import { isMain } from '../guards/lib.mjs';
import { checkVocabulary } from '../guards/vocabulary.guard.mjs';
import { extractHookTargets, readHookPayload } from './hook-lib.mjs';

async function main() {
  const payload = await readHookPayload();
  const { root, files } = extractHookTargets(payload);
  const scoped = files.length > 0
    ? files.filter((f) => f.startsWith('apps/web/src/') || f.startsWith('packages/core/src/story/'))
    : null;
  if (scoped && scoped.length === 0) process.exit(0);

  const { hits } = await checkVocabulary(root, scoped);
  if (hits.length > 0) {
    for (const h of hits) {
      console.error(`claims-guard: ${h.file}:${h.line}: ${h.reason} — ${h.text}`);
    }
    process.exit(1);
  }
  process.exit(0);
}

if (isMain(import.meta.url, process.argv[1])) {
  await main();
}
