/**
 * Kiro tracked & MIT licence guard (§18 last line, §5.12).
 * Checks:
 * - `.kiro/` exists at repository root and contains `steering/`, `specs/`, `hooks/`, `agents/`
 * - `.kiro` is not ignored in `.gitignore`
 * - `LICENSE` exists at repository root and contains an MIT Licence header
 */
import console from 'node:console';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { isMain } from './lib.mjs';

const REQUIRED_KIRO_DIRS = ['steering', 'specs', 'hooks', 'agents'];

function isKiroIgnored(gitignoreText) {
  for (const raw of gitignoreText.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('!')) continue;
    const normalized = line.replace(/^\//, '').replace(/\/$/, '');
    if (normalized === '.kiro' || normalized === '.kiro/*') {
      return true;
    }
  }
  return false;
}

/** Check `.kiro` structure, `.gitignore`, and root `LICENSE` under `root`. */
export async function checkKiroTracked(root) {
  const errors = [];
  const kiroDir = join(root, '.kiro');
  if (!existsSync(kiroDir)) {
    errors.push('.kiro/ directory missing at repository root');
  } else {
    for (const sub of REQUIRED_KIRO_DIRS) {
      const subPath = join(kiroDir, sub);
      if (!existsSync(subPath)) {
        errors.push(`.kiro/${sub}/ directory missing`);
      } else {
        const st = await stat(subPath);
        if (!st.isDirectory()) {
          errors.push(`.kiro/${sub} is not a directory`);
        }
      }
    }
  }

  const gitignorePath = join(root, '.gitignore');
  if (existsSync(gitignorePath)) {
    const gi = await readFile(gitignorePath, 'utf8');
    if (isKiroIgnored(gi)) {
      errors.push('.gitignore lists .kiro (must remain tracked)');
    }
  }

  const licensePath = join(root, 'LICENSE');
  if (!existsSync(licensePath)) {
    errors.push('LICENSE file missing at repository root');
  } else {
    const lic = await readFile(licensePath, 'utf8');
    if (!/\bMIT License\b/i.test(lic)) {
      errors.push('LICENSE does not contain an MIT License header');
    }
  }

  return { checked: REQUIRED_KIRO_DIRS.length + 2, errors };
}

async function main() {
  const root = resolve('.');
  const { checked, errors } = await checkKiroTracked(root);
  console.log(`kiro-tracked: checked ${checked} item(s)`);
  for (const err of errors) {
    console.error(`kiro-tracked: ${err}`);
  }
  process.exit(errors.length === 0 ? 0 : 1);
}

if (isMain(import.meta.url, process.argv[1])) {
  await main();
}
