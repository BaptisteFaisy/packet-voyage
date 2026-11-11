/**
 * Kiro post-spec-task hook: journal-reminder (§14.3).
 * Appends a row to `KIRO_JOURNAL.md` (creating it with a header if missing).
 */
import console from 'node:console';
import { existsSync } from 'node:fs';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { isMain } from '../guards/lib.mjs';
import { extractHookTargets, readHookPayload } from './hook-lib.mjs';

const HEADER = [
  '# Kiro Journal — Packet Voyage',
  '',
  'Automated log of spec tasks and guard triggers (§14.3, §14.6).',
  '',
  '| Timestamp (UTC) | Event / Spec | Task / Detail | Duration |',
  '|---|---|---|---|',
  '',
].join('\n');

function sanitizeCell(value) {
  return String(value ?? '').replace(/\|/g, '/').replace(/\r?\n/g, ' ').trim();
}

/** Append a structured journal entry line to `KIRO_JOURNAL.md`. */
export async function appendJournalEntry(root, payload) {
  const journalPath = join(root, 'KIRO_JOURNAL.md');
  if (!existsSync(journalPath)) {
    await writeFile(journalPath, HEADER, 'utf8');
  } else {
    const existing = await readFile(journalPath, 'utf8');
    if (existing.length > 0 && !existing.endsWith('\n')) {
      await appendFile(journalPath, '\n', 'utf8');
    }
  }
  const ts = new Date().toISOString();
  const spec = sanitizeCell(payload.spec || payload.hook_event_name || 'spec-task');
  const task = sanitizeCell(payload.task || payload.task_name || payload.summary || 'completed');
  const durationValue = payload.duration ?? payload.duration_ms ?? null;
  const duration = durationValue === null ? '-' : sanitizeCell(durationValue);
  const line = `| ${ts} | ${spec} | ${task} | ${duration} |\n`;
  await appendFile(journalPath, line, 'utf8');
  return line;
}

async function main() {
  const payload = await readHookPayload();
  const { root } = extractHookTargets(payload);
  const line = await appendJournalEntry(root, payload);
  console.log(`journal-reminder: ${line.trim()}`);
  process.exit(0);
}

if (isMain(import.meta.url, process.argv[1])) {
  await main();
}
