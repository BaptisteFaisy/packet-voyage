/**
 * File & function size guard (§0.4, VOY-N).
 * - Every source file (.ts, .tsx, .mjs, .py, .json) under packages/<pkg>/src,
 *   apps/<app>/src, scripts, .github must stay under 500 non-blank, non-comment lines.
 * - Every function in .ts/.tsx/.mjs/.py must stay under 50 non-blank, non-comment lines.
 *
 * Heuristics (AST-free):
 * - JS/TS: counts effective lines, detects `function name(...)`, `async function`,
 *   method definitions, and arrow functions assigned/declared with `{`, then tracks
 *   brace depth ignoring braces inside strings/comments.
 * - Python: detects `def name(` / `async def name(` and measures body lines while
 *   indentation remains strictly deeper than the `def` line (skipping blanks/comments).
 */
import console from 'node:console';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { isMain, walkFiles } from './lib.mjs';

const MAX_FILE_LINES = 500;
const MAX_FUNC_LINES = 50;
const ALLOWED_EXTS = new Set(['.ts', '.tsx', '.mjs', '.py', '.json']);
const JS_FUNC_START = /^\s*(?:export\s+(?:default\s+)?)?(?:async\s+)?(?:function\b[^(]*\([^)]*\)[^{]*\{|(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*(?::[^=]+)?=>\s*\{)/;
const PY_DEF_START = /^(\s*)(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/;

function extOf(relPath) {
  const dot = relPath.lastIndexOf('.');
  return dot >= 0 ? relPath.slice(dot) : '';
}

function isIncludedPath(relPath) {
  if (
    relPath.startsWith('packages/data/datasets/') ||
    relPath.startsWith('scripts/data/cache/') ||
    relPath === 'pnpm-lock.yaml'
  ) {
    return false;
  }
  if (!ALLOWED_EXTS.has(extOf(relPath))) return false;
  return (
    /^packages\/[^/]+\/src\//.test(relPath) ||
    /^apps\/[^/]+\/src\//.test(relPath) ||
    relPath.startsWith('scripts/') ||
    relPath.startsWith('.github/')
  );
}

function stripJsCommentsAndCount(lines) {
  const effective = [];
  let inBlock = false;
  for (let i = 0; i < lines.length; i += 1) {
    let s = lines[i];
    if (inBlock) {
      const end = s.indexOf('*/');
      if (end < 0) continue;
      s = s.slice(end + 2);
      inBlock = false;
    }
    const blockStart = s.indexOf('/*');
    if (blockStart >= 0 && !s.slice(0, blockStart).includes('//')) {
      const blockEnd = s.indexOf('*/', blockStart + 2);
      if (blockEnd >= 0) {
        s = `${s.slice(0, blockStart)} ${s.slice(blockEnd + 2)}`;
      } else {
        s = s.slice(0, blockStart);
        inBlock = true;
      }
    }
    const trimmed = s.trim();
    if (trimmed === '' || trimmed.startsWith('//')) continue;
    effective.push({ lineNo: i + 1, text: s });
  }
  return effective;
}

function braceDelta(line) {
  let delta = 0;
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quote) {
      if (ch === '\\') i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && line[i + 1] === '/') break;
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
    } else if (ch === '{') {
      delta += 1;
    } else if (ch === '}') {
      delta -= 1;
    }
  }
  return delta;
}

function checkJsFunctions(effective, relPath, errors) {
  const stack = [];
  for (const item of effective) {
    if (JS_FUNC_START.test(item.text)) {
      stack.push({ startLine: item.lineNo, depth: 0, count: 0 });
    }
    const delta = braceDelta(item.text);
    for (let k = stack.length - 1; k >= 0; k -= 1) {
      stack[k].count += 1;
      stack[k].depth += delta;
      if (stack[k].depth <= 0) {
        const finished = stack.splice(k, 1)[0];
        // ESLint `max-lines-per-function` counts the body between `{` and `}`,
        // so exclude the declaration/closing lines (2 lines) when comparing to < 50.
        const bodyCount = Math.max(0, finished.count - 2);
        if (bodyCount >= MAX_FUNC_LINES) {
          errors.push(`${relPath}:${finished.startLine}: function body is ${bodyCount} lines (limit < ${MAX_FUNC_LINES})`);
        }
      }
    }
  }
}

function checkPythonFile(lines, relPath, errors) {
  const effective = [];
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    effective.push({ lineNo: i + 1, raw: lines[i], trimmed });
  }
  if (effective.length >= MAX_FILE_LINES) {
    errors.push(`${relPath}: ${effective.length} effective lines (limit < ${MAX_FILE_LINES})`);
  }
  for (let idx = 0; idx < effective.length; idx += 1) {
    const m = PY_DEF_START.exec(effective[idx].raw);
    if (!m) continue;
    const indent = m[1].length;
    const fnName = m[2];
    let count = 1;
    for (let j = idx + 1; j < effective.length; j += 1) {
      const nextIndent = effective[j].raw.match(/^\s*/)[0].length;
      if (nextIndent <= indent) break;
      count += 1;
    }
    if (count >= MAX_FUNC_LINES) {
      errors.push(`${relPath}:${effective[idx].lineNo}: def ${fnName} is ${count} lines (limit < ${MAX_FUNC_LINES})`);
    }
  }
}

/** Check a single source string for file and function line limits. */
export function scanLimitsContent(text, relPath) {
  const errors = [];
  const lines = text.split(/\r?\n/);
  const ext = extOf(relPath);
  if (ext === '.py') {
    checkPythonFile(lines, relPath, errors);
    return errors;
  }
  if (ext === '.json') {
    const nonBlank = lines.filter((l) => l.trim() !== '').length;
    if (nonBlank >= MAX_FILE_LINES) {
      errors.push(`${relPath}: ${nonBlank} lines (limit < ${MAX_FILE_LINES})`);
    }
    return errors;
  }
  const effective = stripJsCommentsAndCount(lines);
  if (effective.length >= MAX_FILE_LINES) {
    errors.push(`${relPath}: ${effective.length} effective lines (limit < ${MAX_FILE_LINES})`);
  }
  checkJsFunctions(effective, relPath, errors);
  return errors;
}

/** Check all tracked source files (or an explicit list) under `root`. */
export async function checkLimits(root, targetFiles = null) {
  const all = targetFiles ?? [
    ...(await walkFiles(root, 'packages')),
    ...(await walkFiles(root, 'apps')),
    ...(await walkFiles(root, 'scripts')),
    ...(await walkFiles(root, '.github')),
  ];
  const files = all.filter(isIncludedPath);
  const errors = [];
  for (const rel of files) {
    const abs = join(root, rel);
    if (!existsSync(abs)) continue;
    const text = await readFile(abs, 'utf8');
    errors.push(...scanLimitsContent(text, rel));
  }
  return { checked: files.length, errors };
}

async function main() {
  const root = resolve('.');
  const { checked, errors } = await checkLimits(root);
  console.log(`limits: checked ${checked} file(s)`);
  for (const err of errors) {
    console.error(`limits: ${err}`);
  }
  process.exit(errors.length === 0 ? 0 : 1);
}

if (isMain(import.meta.url, process.argv[1])) {
  await main();
}
