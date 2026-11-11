/**
 * The imposed vocabulary of §5.4, as an executable rule.
 *
 * The same list is imported by `scripts/guards/vocabulary.guard.mjs`, so what
 * the product must never say is defined once, checked in CI and available to
 * the tests (VOY-N-04, VOY-P-20).
 */

export interface VocabularyReport {
  ok: boolean;
  violations: string[];
}

/** Wordings that claim more than a measurement can support. */
export const FORBIDDEN_PATTERNS: readonly RegExp[] = [
  /travel(l)?ed through/i,
  /took the cable/i,
  /takes the cable/i,
  /your packet crossed/i,
  /the packet crossed/i,
  /went through cable/i,
  /goes through cable/i,
  /countries your data crossed/i,
  /(packet|traffic|data) (was |were )?(routed|sent) (through|via) the cable/i,
];

/** Words that make a location honest: they state how sure the tool is. */
const LEVEL_WORDS =
  /\b(likely|probable|probably|solid|uncertain|inferred|assumed|measured|not located|sources? agree|estimated)\b/i;

/**
 * A distance that is a straight line, not a travelled path, is exact. Both
 * apostrophes are accepted: the French strings use the typographic one.
 */
const CROW_FLIES = /(\bas the crow flies\b|à vol d['\u2019]oiseau|\bgreat[- ]circle\b|\bgeodesic\b|\bstraight line\b|\ben ligne droite\b)/i;

/** A distance is honest when it says which way it is bounded. */
/**
 * Before the distance: a bound ("at least 6,655 km"), an approximation
 * ("~391 km"), or the result of a formula ("= 1,439 km").
 */
const BOUND_BEFORE =
  /(?:at least|au moins|at most|au plus|no more than|maximum|minimum|about|approximately|environ|roughly|length|longueur|span|[≥~=<]|\bde\b|\bà)[\s:]*$/i;

/**
 * After the distance: the bound may follow it ("1,439 km at most", "6,496 km
 * needed"), or the distance may be a geometric separation between two places
 * ("6,496 km from Lyon"), which is exact by nature.
 *
 * The words are matched as prefixes without a closing boundary: in rendered DOM
 * text two adjacent elements are concatenated without a space ("6,496 km
 * neededlight"), and a strict `\b…\b` would miss the bound.
 */
const BOUND_AFTER =
  /^[^.]*?(?:at most|au plus|at least|au moins|no more than|need|requi|n[ée]cessit|from|away|distant|maximum|minimum|\bde\b)/i;

// A speed ("299.79 km/ms") is not a travelled distance: the negative lookahead
// drops it.
const DISTANCE_RX = /(\d[\d.,\s\u00a0]*\d|\d)\s?(km|kilomet(?:er|re)s?|mi\b|miles)(?!\s*\/)/gi;

const LOCATED_RX = /\blocated in\b/gi;

const CONTEXT = 70;

function windowAround(text: string, index: number): string {
  const from = Math.max(0, index - CONTEXT);
  return text.slice(from, index + CONTEXT);
}

/** A travelled distance must be preceded by "at least" (or be a straight line). */
function checkDistances(text: string, violations: string[]): void {
  DISTANCE_RX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = DISTANCE_RX.exec(text)) !== null) {
    const before = text.slice(Math.max(0, match.index - 24), match.index);
    const end = match.index + match[0].length;
    const after = text.slice(end, end + 40);
    if (BOUND_BEFORE.test(before) || BOUND_AFTER.test(after) || CROW_FLIES.test(after)) continue;
    violations.push(`distance without a bound ("at least", "at most", …): "${match[0].trim()}"`);
    if (match[0] === '') DISTANCE_RX.lastIndex += 1;
  }
}

/** "Located in Paris" is a claim; "likely located in Paris" is a measurement. */
function checkLocated(text: string, violations: string[]): void {
  LOCATED_RX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LOCATED_RX.exec(text)) !== null) {
    if (LEVEL_WORDS.test(windowAround(text, match.index))) continue;
    violations.push(`"located in" without a certainty level`);
    if (match[0] === '') LOCATED_RX.lastIndex += 1;
  }
}

/**
 * Check one sentence, one label or a whole journey log against §5.4.
 * Returns the list of violations; an empty list means the text is honest.
 */
export function checkVocabulary(text: string): VocabularyReport {
  const violations: string[] = [];
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) violations.push(`forbidden wording: ${pattern.source}`);
  }
  checkLocated(text, violations);
  checkDistances(text, violations);
  return { ok: violations.length === 0, violations };
}
