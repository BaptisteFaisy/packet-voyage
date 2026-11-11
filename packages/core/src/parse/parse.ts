import { detectFormat } from './detect.ts';
import { parseAtlasResult } from './atlas.ts';
import { parseMtrJson } from './mtr-json.ts';
import { parseMtrText } from './mtr-text.ts';
import { parseTracert } from './tracert.ts';
import { parseTraceroute } from './traceroute.ts';
import { createBaseTrace, type ParsedTrace, type TraceFormat } from './types.ts';

const UNKNOWN_LINE_CAP = 50;

function firstMeaningfulLine(text: string): string {
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line !== '') return line;
  }
  return '';
}

function tryJsonParse(text: string): unknown {
  try {
    return JSON.parse(text.trim());
  } catch {
    return undefined;
  }
}

function dispatchFormat(format: TraceFormat, text: string): ParsedTrace {
  switch (format) {
    case 'traceroute':
      return parseTraceroute(text);
    case 'tracert':
      return parseTracert(text);
    case 'mtr-text':
      return parseMtrText(text);
    case 'mtr-json':
      return parseMtrJson(tryJsonParse(text));
    case 'atlas':
      return parseAtlasResult(tryJsonParse(text));
    default: {
      const trace = createBaseTrace('unknown');
      const first = firstMeaningfulLine(text);
      if (first !== '') trace.unknownLines.push(first);
      trace.warnings.push(
        'Unrecognized trace format. Accepted: traceroute, tracert, mtr text report, mtr JSON, RIPE Atlas JSON.',
      );
      return trace;
    }
  }
}

/**
 * Parse a trace in any supported format (VOY-F-01, VOY-F-02).
 * Never throws: an unreadable input yields `{ format: 'unknown', hops: [] }`
 * with the first un-understood line kept verbatim (VOY-F-02, VOY-N-10).
 */
export function parseTrace(text: string, options?: { format?: TraceFormat }): ParsedTrace {
  if (typeof text !== 'string') {
    const trace = createBaseTrace('unknown');
    trace.warnings.push('Input was not a string');
    return trace;
  }
  try {
    const format = options?.format && options.format !== 'unknown' ? options.format : detectFormat(text);
    const trace = dispatchFormat(format, text);
    if (trace.unknownLines.length > UNKNOWN_LINE_CAP) {
      trace.unknownLines = trace.unknownLines.slice(0, UNKNOWN_LINE_CAP);
      trace.warnings.push(`Truncated unknownLines to ${UNKNOWN_LINE_CAP} entries`);
    }
    trace.hops.sort((a, b) => a.ttl - b.ttl);
    return trace;
  } catch {
    const trace = createBaseTrace('unknown');
    const first = firstMeaningfulLine(text);
    if (first !== '') trace.unknownLines.push(first);
    trace.warnings.push('Parsing failed unexpectedly; the input is kept for inspection');
    return trace;
  }
}
