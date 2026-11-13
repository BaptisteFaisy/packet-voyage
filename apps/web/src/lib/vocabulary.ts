/**
 * Local mirror of the vocabulary guard (§5.4, VOY-N-04) so the site can
 * self-check rendered strings even before `packages/core/src/story` lands.
 * When core exports `checkVocabulary`, it takes precedence (single source).
 */
import { loadOptionalCore } from './journey-source.ts';

export const LOCAL_FORBIDDEN_PATTERNS: RegExp[] = [
  /\btravelled\s+through\b/i,
  /\btraveled\s+through\b/i,
  /\btook\s+the\s+cable\b/i,
  /\byour\s+packet\s+crossed\b/i,
  /\bwent\s+through\s+(?:the\s+)?cable\b/i,
  /\bcountries\s+your\s+data\s+crossed\b/i,
];

export interface VocabularyResult {
  ok: boolean;
  violations: string[];
}

export function checkVocabularyLocal(text: string): VocabularyResult {
  const violations: string[] = [];
  for (const pattern of LOCAL_FORBIDDEN_PATTERNS) {
    const match = pattern.exec(text);
    if (match) violations.push(match[0]);
  }
  return { ok: violations.length === 0, violations };
}

export type VocabularyChecker = (text: string) => VocabularyResult;

/** Prefer the core checker when the story module is available. */
export async function loadVocabularyChecker(): Promise<{
  checker: VocabularyChecker;
  fromCore: boolean;
}> {
  const core = await loadOptionalCore();
  if (typeof core.checkVocabulary === 'function') {
    const coreCheck = core.checkVocabulary;
    return { checker: (text: string) => coreCheck(text), fromCore: true };
  }
  return { checker: checkVocabularyLocal, fromCore: false };
}
