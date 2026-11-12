/**
 * Reading a `journey.json` from disk, in the browser.
 *
 * The File API is the only door: the bytes are read on the user's machine, by
 * the page they opened, and nothing is uploaded or requested (privacy steering
 * §6.4, VOY-N-01). Validation goes through `parseJourneySafe`, the same schema
 * the CLI and the gallery are checked against, so a file either is a journey or
 * comes back with the list of what the schema rejects — never a blank screen.
 * Pure module: no React here (contract §5.9).
 */
import type { Journey } from '@packet-voyage/schema';
import { parseJourneySafe } from '@packet-voyage/schema';

/** Above this the browser would choke; say so instead of freezing. */
export const MAX_IMPORT_BYTES = 5_000_000;

export type ImportFailureKind = 'unreadable' | 'invalid-json' | 'not-a-journey' | 'too-large';

export interface ImportFailure {
  kind: ImportFailureKind;
  /** First line of what went wrong, in the reader's own words. */
  detail: string;
  /** Every problem the schema found, so the user can fix the file. */
  issues: string[];
  size: number | null;
  limit: number;
}

export type ImportResult = { ok: true; journey: Journey } | { ok: false; failure: ImportFailure };

function failure(
  kind: ImportFailureKind,
  detail: string,
  issues: string[] = [],
  size: number | null = null,
): ImportFailure {
  return { kind, detail, issues, size, limit: MAX_IMPORT_BYTES };
}

/** Read a file's text with the browser's File API — no request involved. */
export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('the file could not be read'));
    reader.readAsText(file);
  });
}

/** JSON the parser accepts but the journey schema refuses: say which it is. */
function jsonOrJourney(text: string): ImportFailureKind {
  try {
    JSON.parse(text);
    return 'not-a-journey';
  } catch {
    return 'invalid-json';
  }
}

/** Read and validate one file; every failure comes back as content. */
export async function readJourneyFile(file: File): Promise<ImportResult> {
  if (file.size > MAX_IMPORT_BYTES) {
    return { ok: false, failure: failure('too-large', `${file.size} bytes`, [], file.size) };
  }
  let text: string;
  try {
    text = await readFileText(file);
  } catch (error) {
    return { ok: false, failure: failure('unreadable', (error as Error).message) };
  }
  const result = parseJourneySafe(text);
  if (result.ok) return { ok: true, journey: result.journey };
  const kind = jsonOrJourney(text);
  return { ok: false, failure: failure(kind, result.issues[0] ?? '', result.issues) };
}
