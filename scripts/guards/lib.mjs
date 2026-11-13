/**
 * Shared stdlib-only helpers for Packet Voyage project guards and hooks.
 * No external dependencies; all file walking skips build/vendor directories.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.vite', 'coverage']);

/** Recursively list files under `dir`, returning repo-relative POSIX paths. */
export async function walkFiles(root, dir = '.') {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  const out = [];
  const entries = await readdir(abs, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const rel = dir === '.' ? entry.name : `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      out.push(...(await walkFiles(root, rel)));
    } else if (entry.isFile()) {
      out.push(rel.replace(/\\/g, '/'));
    }
  }
  return out;
}

/** Return true when this module is invoked as the CLI entry point. */
export function isMain(metaUrl, argv1) {
  if (!argv1) return false;
  return fileURLToPath(metaUrl) === argv1 || fileURLToPath(metaUrl) === join(argv1);
}

/** Compute hex SHA-256 of a file. */
export async function fileSha256(absPath) {
  const buf = await readFile(absPath);
  return createHash('sha256').update(buf).digest('hex');
}

/** Match a simple glob pattern supporting `**`, `*`, and `?` against a POSIX path. */
export function globMatch(pattern, relPath) {
  const norm = relPath.replace(/\\/g, '/');
  let rx = '^';
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i];
    if (ch === '*' && pattern[i + 1] === '*') {
      if (pattern[i + 2] === '/') {
        rx += '(?:.*/)?';
        i += 2;
      } else {
        rx += '.*';
        i += 1;
      }
    } else if (ch === '*') {
      rx += '[^/]*';
    } else if (ch === '?') {
      rx += '[^/]';
    } else if ('\\^$.|+()[]{}'.includes(ch)) {
      rx += `\\${ch}`;
    } else {
      rx += ch;
    }
  }
  rx += '$';
  return new RegExp(rx).test(norm);
}

/** Normalize a target file path from hook input to a repo-relative POSIX path. */
export function toRepoRel(root, rawPath) {
  const abs = rawPath.startsWith('/') ? rawPath : join(root, rawPath);
  return relative(root, abs).replace(/\\/g, '/');
}

/** Read full UTF-8 stdin without throwing when empty. */
export async function readStdin(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}
