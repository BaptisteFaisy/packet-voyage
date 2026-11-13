/**
 * The honesty property of the log (§5.4): a number shown in the story comes
 * from the journey, or it is not shown.
 *
 * The log is built from the structured journey, so every value it prints is a
 * measurement, an inference or an assumption of that journey. This module
 * makes that checkable: it reads the numbers of a text the way the log writes
 * them ("6,655", "91.7", "1 439", "×1,31") and compares them with the numbers
 * the journey holds.
 *
 * Pure: no clock, no network, no randomness.
 */
import type { Journey, StoryEntry } from '@packet-voyage/schema';

/** Half a percent of the value: the tolerance of the comparison. */
const RELATIVE_TOLERANCE = 0.005;

/** A run of digits, grouped by separators: "6,655", "91.7", "1 439", "2". */
const NUMBER_TOKEN_RX = /\d+(?:[.,\s]\d+)*/g;

/** The digits of a token, and the separator that follows each of them. */
const GROUP_RX = /(\d+)([.,\s])?/g;

/** A number read in a text, with the number of decimals it was written with. */
interface NumberToken {
  value: number;
  decimals: number;
}

/** The digits of a token, in order, with their separators. */
interface TokenParts {
  groups: string[];
  separators: string[];
}

function splitToken(token: string): TokenParts {
  const groups: string[] = [];
  const separators: string[] = [];
  GROUP_RX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = GROUP_RX.exec(token)) !== null) {
    const digits = match[1];
    const separator = match[2];
    if (digits !== undefined) groups.push(digits);
    if (separator !== undefined) separators.push(separator);
  }
  return { groups, separators };
}

/** A number written with a decimal part. */
function decimal(integer: string, fraction: string): NumberToken {
  return { value: Number(`${integer}.${fraction}`), decimals: fraction.length };
}

/** Reads one token, following the conventions of the two log languages. */
function readToken(token: string): NumberToken[] {
  const chunks = token.split('.');
  if (chunks.length > 2) {
    // An address or a version ("203.0.113.80"): every chunk is its own number.
    return chunks.flatMap((chunk) => (chunk === '' ? [] : readToken(chunk)));
  }
  const { groups, separators } = splitToken(token);
  if (groups.length === 0) return [];
  if (groups.length === 1) return [{ value: Number(groups[0]), decimals: 0 }];
  if (separators.includes('.')) return [readWithDot(groups, separators)];
  if (groups.slice(1).every((group) => group.length === 3)) {
    return [{ value: Number(groups.join('')), decimals: 0 }];
  }
  if (separators.some((separator) => separator !== ',' && separator !== '.')) {
    return groups.map((group) => ({ value: Number(group), decimals: 0 }));
  }
  return [decimal(groups[0] ?? '', groups.slice(1).join(''))];
}

/** A dot is a decimal separator; the other separators group thousands. */
function readWithDot(groups: string[], separators: string[]): NumberToken {
  const dot = separators.indexOf('.');
  const integer = groups.slice(0, dot + 1).join('');
  const fraction = groups.slice(dot + 1).join('');
  return decimal(integer, fraction);
}

/** Every number of a text, with the decimals it was written with. */
function extractNumberTokens(text: string): NumberToken[] {
  const tokens: NumberToken[] = [];
  NUMBER_TOKEN_RX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NUMBER_TOKEN_RX.exec(text)) !== null) {
    tokens.push(...readToken(match[0]));
    if (match[0] === '') NUMBER_TOKEN_RX.lastIndex += 1;
  }
  return tokens;
}

/**
 * Every number a text shows. The log writes thousands with a comma ("6,655")
 * or a space ("1 439"), decimals with a dot ("91.7") or a comma ("×1,31");
 * a group of exactly three digits after a separator is always a thousands
 * group, as the log's own formatting does. A run of two dots or more is an
 * address, and each of its chunks is read as its own number.
 */
export function extractNumbers(text: string): number[] {
  return extractNumberTokens(text).map((token) => token.value);
}

/**
 * Walks the journey for the numbers it holds: its values, and the numbers
 * written inside its names — a cable called "2Africa" carries a 2, an address
 * carries its octets.
 */
function collect(value: unknown, found: Set<number>): void {
  if (typeof value === 'number') {
    found.add(value);
    return;
  }
  if (typeof value === 'string') {
    for (const number of extractNumbers(value)) found.add(number);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collect(item, found);
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) collect(item, found);
  }
}

/**
 * Every number the journey holds, sorted and without duplicates. The counts
 * the log shows are counts of the journey's own lists: the answers of a hop,
 * the cables compatible with a crossing.
 *
 * The `story` field is left out: the log is not evidence for itself, or the
 * rule would prove nothing.
 */
export function journeyNumbers(journey: Journey): number[] {
  const found = new Set<number>();
  for (const [key, value] of Object.entries(journey)) {
    if (key === 'story') continue;
    collect(value, found);
  }
  for (const hop of journey.hops) found.add(hop.replies.length);
  for (const segment of journey.segments) found.add(segment.cables.length);
  return [...found].sort((a, b) => a - b);
}

/**
 * A number of the story comes from the journey when one of the journey's
 * numbers explains it: within half a percent of it, or within half of the
 * digit the story shows. The log rounds for reading, and rounding is not
 * invention.
 */
function comesFromJourney(token: NumberToken, known: number[]): boolean {
  const display = 0.5 * 10 ** -token.decimals;
  return known.some(
    (value) => Math.abs(token.value - value) <= Math.max(RELATIVE_TOLERANCE * Math.abs(value), display),
  );
}

/**
 * The numbers of a story that the journey does not explain — the fault line
 * of the §5.4 rule. An empty list means the story invents nothing.
 *
 * A number the log *derives* — a scale conversion, a local hour — is permitted
 * only when the caller names it in `derived`, having computed it with the
 * `scale` or the `clocks` module from the journey's own values. The derivation
 * stays explicit: nothing is allowed by default.
 */
export function assertStoryNumbersComeFromJourney(
  story: StoryEntry[],
  journey: Journey,
  derived: number[] = [],
): string[] {
  const known = derived.length === 0 ? journeyNumbers(journey) : [...journeyNumbers(journey), ...derived];
  const faults = new Set<string>();
  for (const entry of story) {
    for (const text of [entry.en, entry.fr]) {
      for (const token of extractNumberTokens(text)) {
        if (!comesFromJourney(token, known)) faults.add(String(token.value));
      }
    }
  }
  return [...faults].sort((a, b) => Number(a) - Number(b));
}
