import type { TraceFormat } from './types.ts';

// Localised `tracert` headers and hop-limit lines: English, French, German,
// Spanish, Italian, Portuguese. Detection is by shape, and these only widen the
// set of openings recognised — the hop lines themselves are parsed by structure
// (delays, then address), never by words (§16).
const TRACERT_HEADER_RE =
  /^(?:tracing route to|détermination de l'itinéraire vers|routenverfolgung zu|traza a la dirección|rilevazione instradamento verso|traçando a rota para|traceren naar)\b/i;
const TRACERT_OVER_RE =
  /^(?:over a maximum of|avec un maximum de|über maximal|como máximo|com o máximo de|met maximaal|su un massimo di)\s+\d+/i;
const TRACERT_LINE_RE = /^\s*\d+\s+(?:<\s*\d+\s*ms|\d+(?:[.,]\d+)?\s*ms|\*)(?:\s+(?:<\s*\d+\s*ms|\d+(?:[.,]\d+)?\s*ms|\*)){1,2}\s+\S+/i;
const MTR_TEXT_HEADER_RE = /\bLoss%\s+Snt\s+Last\s+Avg\s+Best\s+Wrst/i;
const MTR_TEXT_LINE_RE = /^\s*\d+\.(?:\|--|-\?)?\s+\S+\s+\d+(?:\.\d+)?%\s+\d+/;
const TRACEROUTE_HEADER_RE = /^traceroute6?\s+(?:to\s+)?\S+/i;
const TRACEROUTE_LINE_RE =
  /^\s*\d+\s+(?:\*(?:\s+\*)*|\S+\s+\([^)]+\)|[0-9a-fA-F:.]+\s+(?:<?\d+(?:\.\d+)?\s*ms|\*))/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAtlasObject(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (Array.isArray(value.result)) {
    return value.type === 'traceroute' || value.msm_id !== undefined || value.prb_id !== undefined;
  }
  return false;
}

function detectJsonFormat(trimmed: string): TraceFormat | null {
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (isRecord(parsed) && isRecord(parsed.report) && Array.isArray(parsed.report.hubs)) {
      return 'mtr-json';
    }
    if (Array.isArray(parsed) && parsed.some((item) => isAtlasObject(item))) {
      return 'atlas';
    }
    if (isAtlasObject(parsed)) {
      return 'atlas';
    }
    return null;
  } catch {
    return null;
  }
}

function detectTextFormat(lines: readonly string[]): TraceFormat {
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === '') continue;
    if (TRACERT_HEADER_RE.test(line) || TRACERT_OVER_RE.test(line)) return 'tracert';
    if (MTR_TEXT_HEADER_RE.test(line) || MTR_TEXT_LINE_RE.test(line)) return 'mtr-text';
    if (TRACEROUTE_HEADER_RE.test(line)) return 'traceroute';
    if (TRACERT_LINE_RE.test(rawLine)) return 'tracert';
    if (TRACEROUTE_LINE_RE.test(rawLine)) return 'traceroute';
  }
  return 'unknown';
}

/** Detect the trace format from raw text without throwing. */
export function detectFormat(text: string): TraceFormat {
  if (typeof text !== 'string') return 'unknown';
  const trimmed = text.trim();
  if (trimmed === '') return 'unknown';

  const jsonFmt = detectJsonFormat(trimmed);
  if (jsonFmt) return jsonFmt;

  const lines = text.split(/\r?\n/);
  return detectTextFormat(lines);
}
