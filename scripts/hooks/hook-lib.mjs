/**
 * Shared helpers for Kiro hook entry points (`scripts/hooks/*.mjs`).
 */
import { resolve } from 'node:path';
import process from 'node:process';
import { readStdin, toRepoRel } from '../guards/lib.mjs';

/** Parse Kiro hook JSON from stdin (returns empty object on empty/invalid input). */
export async function readHookPayload() {
  const raw = await readStdin(process.stdin);
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Extract the target repository root and changed file paths from a hook payload. */
export function extractHookTargets(payload) {
  const root = resolve(payload.cwd || '.');
  const input = payload.tool_input && typeof payload.tool_input === 'object' ? payload.tool_input : {};
  const rawPaths = [];
  for (const key of ['file_path', 'path', 'target_file', 'file', 'changed_file']) {
    if (typeof input[key] === 'string' && input[key].trim() !== '') {
      rawPaths.push(input[key].trim());
    }
  }
  for (const key of ['file_path', 'path', 'changed_file']) {
    if (typeof payload[key] === 'string' && payload[key].trim() !== '') {
      rawPaths.push(payload[key].trim());
    }
  }
  if (Array.isArray(payload.files)) {
    for (const f of payload.files) {
      if (typeof f === 'string' && f.trim() !== '') rawPaths.push(f.trim());
    }
  }
  const files = [...new Set(rawPaths.map((p) => toRepoRel(root, p)))];
  return { root, files, input };
}
