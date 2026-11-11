/**
 * Vocabulary guard (§5.4, VOY-N-04).
 * Scans `apps/web/src/**` and `packages/core/src/story/**` (.ts, .tsx)
 * for forbidden phrases and unquantified travelled distances.
 */
import console from 'node:console';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { isMain, walkFiles } from './lib.mjs';

const FALLBACK_PATTERNS = [
  /\btravelled\s+through\b/i,
  /\btraveled\s+through\b/i,
  /\btook\s+the\s+cable\b/i,
  /\byour\s+packet\s+crossed\b/i,
  /\bwent\s+through\s+(?:the\s+)?cable\b/i,
  /\bcountries\s+your\s+data\s+crossed\b/i,
];

const CERTAINTY_WORDS = /\b(likely|probably|uncertain|measured|inferred|assumed|possible|solid|probable)\b/i;
const LOCATED_IN_RX = /\blocated\s+in\b/gi;
const AT_LEAST_RX = /\bat\s+least\s+$/i;
const DISTANCE_CONTEXT_RX = /(?:distance|travel(?:led|ed)?|route|path|total|journey|at\s+least)\s*[:=]?\s*$/i;
const KM_VALUE_RX = /\b\d[\d,._]*(?:\s*(?:km|mi|miles))\b/gi;

const VOCABULARY_SELF = [
  'packages/core/src/story/vocabulary.ts',
  'packages/core/src/story/vocabulary.test.ts',
];

/** Load FORBIDDEN_PATTERNS from core vocabulary.ts if present, else fallback. */
export async function loadVocabularyPatterns(root) {
  const vocabPath = join(root, 'packages/core/src/story/vocabulary.ts');
  if (!existsSync(vocabPath)) {
    return { patterns: FALLBACK_PATTERNS, missingShared: true };
  }
  try {
    const mod = await import(pathToFileURL(vocabPath).href);
    if (Array.isArray(mod.FORBIDDEN_PATTERNS) && mod.FORBIDDEN_PATTERNS.length > 0) {
      return { patterns: mod.FORBIDDEN_PATTERNS, missingShared: false };
    }
  } catch {
    // Fall back to local patterns when TS module cannot be loaded directly.
  }
  return { patterns: FALLBACK_PATTERNS, missingShared: true };
}

function checkLocatedIn(line, lineNo, relPath, hits) {
  LOCATED_IN_RX.lastIndex = 0;
  let m;
  while ((m = LOCATED_IN_RX.exec(line)) !== null) {
    const start = Math.max(0, m.index - 40);
    const end = Math.min(line.length, m.index + m[0].length + 40);
    const windowText = line.slice(start, end);
    if (!CERTAINTY_WORDS.test(windowText)) {
      hits.push({ file: relPath, line: lineNo, text: windowText.trim(), reason: '"located in" without nearby certainty level' });
    }
    if (m[0] === '') LOCATED_IN_RX.lastIndex += 1;
  }
}

function checkBareDistance(line, lineNo, relPath, hits) {
  if (/["'`].*(?:at least|au moins).*["'`]/i.test(line)) return;
  KM_VALUE_RX.lastIndex = 0;
  let m;
  while ((m = KM_VALUE_RX.exec(line)) !== null) {
    const before = line.slice(Math.max(0, m.index - 45), m.index);
    if (DISTANCE_CONTEXT_RX.test(before) && !AT_LEAST_RX.test(before)) {
      if (/\b(?:travel(?:led|ed)?|distance(?:_km_min)?|route|path|journey)\b/i.test(before)) {
        hits.push({ file: relPath, line: lineNo, text: line.trim(), reason: 'travelled distance without "at least"' });
      }
    }
    if (m[0] === '') KM_VALUE_RX.lastIndex += 1;
  }
}

/** Scan a single source text for vocabulary violations. */
export function scanVocabularyText(content, relPath, patterns) {
  // The rule itself and its unit test quote the forbidden wordings on purpose:
  // they are the specification's examples, not product labels.
  if (VOCABULARY_SELF.includes(relPath)) return [];
  if (relPath.startsWith('docs/') || relPath.startsWith('scripts/guards/')) return [];
  const hits = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const rx of patterns) {
      const flags = rx.flags.replace('g', '');
      const localRx = new RegExp(rx.source, flags);
      const match = localRx.exec(line);
      if (match) {
        hits.push({ file: relPath, line: i + 1, text: line.trim(), reason: `forbidden wording (${match[0]})` });
      }
    }
    checkLocatedIn(line, i + 1, relPath, hits);
    checkBareDistance(line, i + 1, relPath, hits);
  }
  return hits;
}

/** Check specific files or the full target directories under `root`. */
export async function checkVocabulary(root, targetFiles = null) {
  const { patterns, missingShared } = await loadVocabularyPatterns(root);
  let files = targetFiles;
  if (!files) {
    const web = await walkFiles(root, 'apps/web/src');
    const story = await walkFiles(root, 'packages/core/src/story');
    files = [...web, ...story].filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
  }
  const hits = [];
  for (const rel of files) {
    if (!rel.endsWith('.ts') && !rel.endsWith('.tsx')) continue;
    const abs = join(root, rel);
    if (!existsSync(abs)) continue;
    const text = await readFile(abs, 'utf8');
    hits.push(...scanVocabularyText(text, rel, patterns));
  }
  return { checked: files.length, hits, missingShared };
}

async function main() {
  const root = resolve('.');
  const { checked, hits, missingShared } = await checkVocabulary(root);
  if (missingShared) {
    console.warn('vocabulary: warning — packages/core/src/story/vocabulary.ts missing; using fallback patterns');
  }
  console.log(`vocabulary: checked ${checked} file(s)`);
  for (const h of hits) {
    console.error(`${h.file}:${h.line}: ${h.reason} — ${h.text}`);
  }
  process.exit(hits.length === 0 ? 0 : 1);
}

if (isMain(import.meta.url, process.argv[1])) {
  await main();
}
