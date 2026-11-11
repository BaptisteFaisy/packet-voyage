/**
 * Byte-level noise a pasted trace carries: a UTF-8 BOM from Windows Notepad,
 * CRLF or lone CR line endings, tabs instead of spaces, trailing whitespace,
 * control characters, leading blank lines.
 *
 * Nothing is fixed silently — every normalisation is reported in `warnings`, so
 * the interface can tell the user what was cleaned before reading (VOY-F-02,
 * VOY-N-10).
 */
export interface NormalisedTrace {
  text: string;
  warnings: string[];
}

/** A paste is a trace, not a data dump: beyond this it is truncated, and told. */
export const MAX_INPUT_CHARS = 2_000_000;

const BOM = '\uFEFF';
// Everything ASCII-control except tab (handled separately) and newline. The
// control characters ARE the target of this expression, so the lint rule that
// forbids them is disabled here, on this line only.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function normaliseTraceText(raw: string): NormalisedTrace {
  const warnings: string[] = [];
  let text = typeof raw === 'string' ? raw : '';

  if (text.length > MAX_INPUT_CHARS) {
    text = text.slice(0, MAX_INPUT_CHARS);
    warnings.push(`input truncated to ${MAX_INPUT_CHARS} characters`);
  }
  if (text.startsWith(BOM)) {
    text = text.slice(BOM.length);
    warnings.push('byte-order mark stripped');
  }
  if (text.includes('\r')) {
    text = text.replace(/\r\n?/g, '\n');
    warnings.push('line endings normalised to LF');
  }
  if (text.includes('\t')) {
    text = text.replace(/\t/g, ' ');
    warnings.push('tabs replaced by spaces');
  }
  if (CONTROL_CHARS.test(text)) {
    CONTROL_CHARS.lastIndex = 0;
    text = text.replace(CONTROL_CHARS, '');
    warnings.push('control characters removed');
  }
  const trimmedStart = text.replace(/^\n+/, '');
  if (trimmedStart !== text) {
    text = trimmedStart;
    warnings.push('leading blank lines dropped');
  }
  const lines = text.split('\n').map((line) => line.replace(/\s+$/, ''));
  const trimmed = lines.join('\n').replace(/\n+$/, '');
  if (trimmed !== text) warnings.push('trailing whitespace removed');
  return { text: trimmed, warnings };
}
