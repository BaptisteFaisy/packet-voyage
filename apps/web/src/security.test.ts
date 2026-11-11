/**
 * VOY-N-01 / VOY-N-03: zero network request after load, strict CSP.
 * Static checks over the shipped sources — the site must contain no fetch,
 * no XHR, no WebSocket, no external URL in markup, and index.html must carry
 * the strict Content-Security-Policy meta tag.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const WEB_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC_ROOT = join(WEB_ROOT, 'src');

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

function sourceFiles(): string[] {
  return [...walk(SRC_ROOT)].filter(
    (file) =>
      (file.endsWith('.ts') || file.endsWith('.tsx')) &&
      !file.endsWith('.test.ts') &&
      !file.endsWith('.test.tsx') &&
      !file.endsWith('test-utils.tsx'),
  );
}

const FORBIDDEN = [
  { rx: /\bfetch\s*\(/, label: 'fetch(' },
  { rx: /\bXMLHttpRequest\b/, label: 'XMLHttpRequest' },
  { rx: /\bWebSocket\b/, label: 'WebSocket' },
  { rx: /['"]node:(?:http|https|net|dns)['"]/, label: 'node network module' },
  { rx: /navigator\.sendBeacon/, label: 'sendBeacon' },
];

describe('zero network after load (VOY-N-01, VOY-N-03)', () => {
  it('VOY-N-01 index.html carries the strict CSP meta tag', () => {
    const html = readFileSync(join(WEB_ROOT, 'index.html'), 'utf8');
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("script-src 'self'");
    expect(html).toContain("style-src 'self' 'unsafe-inline'");
    expect(html).toContain("img-src 'self' data: blob:");
    expect(html).toContain("connect-src 'none'");
    expect(html).toContain("font-src 'self'");
    expect(html).toContain("base-uri 'none'");
    expect(html).toContain("form-action 'none'");
  });

  it('VOY-N-01 index.html references no external resource', () => {
    const html = readFileSync(join(WEB_ROOT, 'index.html'), 'utf8');
    expect(html).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    expect(html).not.toMatch(/<link[^>]+href=["']https?:/);
    expect(html).not.toMatch(/<script[^>]+src=["']https?:/);
  });

  it('VOY-N-01 no application source performs a network request', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const text = readFileSync(file, 'utf8');
      const lines = text.split(/\r?\n/);
      lines.forEach((line, index) => {
        for (const item of FORBIDDEN) {
          if (item.rx.test(line)) {
            offenders.push(`${file}:${index + 1}: ${item.label}`);
          }
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it('VOY-N-03 imported content is validated by schema and never injected as HTML', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const text = readFileSync(file, 'utf8');
      if (/dangerouslySetInnerHTML/.test(text)) offenders.push(`${file}: dangerouslySetInnerHTML`);
      if (/\binnerHTML\s*=/.test(text)) offenders.push(`${file}: innerHTML assignment`);
      if (/\beval\s*\(/.test(text)) offenders.push(`${file}: eval(`);
    }
    expect(offenders).toEqual([]);
  });
});
