/**
 * The headless browser — one implementation, for every browser proof.
 *
 * The Chromium that Playwright already installed is used; the caller may point
 * at another one with PLAYWRIGHT_CHROMIUM. No browser is downloaded here, and
 * no page is ever fetched from the Internet by the proofs themselves.
 */
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** The newest installed Chromium, or null when there is none. */
export function findChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM) return process.env.PLAYWRIGHT_CHROMIUM;
  const cache = join(homedir(), '.cache', 'ms-playwright');
  if (!existsSync(cache)) return null;
  const builds = readdirSync(cache).filter((name) => name.startsWith('chromium-')).sort().reverse();
  for (const build of builds) {
    for (const rel of ['chrome-linux64/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
      const binary = join(cache, build, rel);
      if (existsSync(binary)) return binary;
    }
  }
  return null;
}

/** Launch the browser; returns null when there is no Chromium to launch. */
export async function launchBrowser(executablePath = findChromium()) {
  if (!executablePath) return null;
  const { chromium } = await import('playwright-core');
  return chromium.launch({ executablePath, args: ['--no-sandbox'] });
}
