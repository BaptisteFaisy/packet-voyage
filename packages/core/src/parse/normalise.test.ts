import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { EXAMPLE_TRACE } from '../fixtures/example-7-14.ts';
import { detectFormat } from './detect.ts';
import { MAX_INPUT_CHARS, normaliseTraceText } from './normalise.ts';
import { parseTrace } from './parse.ts';
import { writeTrace } from './write.ts';

/** Seeds recorded so a counter-example can be replayed (§13). */
const SEED = 20261120;

const TRACERT_EN = [
  'Tracing route to www.example.org [203.0.113.80]',
  'over a maximum of 30 hops:',
  '',
  '  1     1 ms     1 ms     1 ms  192.168.1.1',
  '  2     5 ms     4 ms     5 ms  100.64.0.1',
  '  3     *        *        *     Request timed out.',
  '  4    10 ms     9 ms    10 ms  ix-paris.transit.example.net [198.51.100.9]',
  '',
].join('\n');

const LOCALISED: [string, string, string][] = [
  ['de', 'Routenverfolgung zu www.example.org [203.0.113.80] über maximal 30 Hops:', 'Zeitüberschreitung der Anforderung.'],
  ['es', 'Traza a la dirección www.example.org [203.0.113.80] como máximo 30 saltos:', 'Tiempo de espera agotado para la solicitud.'],
  ['pt', 'Traçando a rota para www.example.org [203.0.113.80] com o máximo de 30 saltos:', 'Tempo limite esgotado para a solicitação.'],
];

function tracertIn(header: string, timeout: string): string {
  return [
    header,
    '',
    '  1     1 ms     1 ms     1 ms  192.168.1.1',
    '  2     5 ms     4 ms     5 ms  100.64.0.1',
    `  3     *        *        *     ${timeout}`,
    '  4    10 ms     9 ms    10 ms  ix-paris.transit.example.net [198.51.100.9]',
    '',
  ].join('\n');
}

describe('VOY-F-01 byte-level noise is cleaned, and reported', () => {
  it('a BOM, CRLF endings and tabs change nothing but the warnings', () => {
    const noisy = `\uFEFF${EXAMPLE_TRACE.replace(/\n/g, '\r\n').replace(/ {2}/g, '\t ')}`;
    const clean = parseTrace(EXAMPLE_TRACE);
    const parsed = parseTrace(noisy);
    expect(parsed.format).toBe(clean.format);
    expect(parsed.hops.map((hop) => hop.ttl)).toEqual(clean.hops.map((hop) => hop.ttl));
    expect(parsed.hops.map((hop) => hop.replies.map((r) => r.ip))).toEqual(
      clean.hops.map((hop) => hop.replies.map((r) => r.ip)),
    );
    expect(parsed.hops.map((hop) => hop.replies.map((r) => r.rtt_ms))).toEqual(
      clean.hops.map((hop) => hop.replies.map((r) => r.rtt_ms)),
    );
    expect(parsed.warnings.join(' | ')).toMatch(/byte-order mark/);
    expect(parsed.warnings.join(' | ')).toMatch(/line endings/);
    expect(parsed.warnings.join(' | ')).toMatch(/tabs/);
  });

  it('detects the format through the noise, and reports what it cleaned', () => {
    expect(detectFormat(`\uFEFF${TRACERT_EN.replace(/\n/g, '\r')}`)).toBe('tracert');
    const { warnings } = normaliseTraceText('\n\n\uFEFFa\tb\u0000\r\n');
    expect(warnings.join(' | ')).toMatch(/leading blank lines|byte-order mark|control characters/);
  });

  it('truncates an absurd paste instead of hanging, and says so', () => {
    const huge = `${EXAMPLE_TRACE}${'x'.repeat(MAX_INPUT_CHARS + 10)}`;
    const { text, warnings } = normaliseTraceText(huge);
    expect(text.length).toBeLessThanOrEqual(MAX_INPUT_CHARS + EXAMPLE_TRACE.length);
    expect(warnings.join(' | ')).toMatch(/truncated/);
  });
});

describe('VOY-F-01 localised tracert outputs are read by structure', () => {
  const reference = parseTrace(TRACERT_EN);

  it('reads English, German, Spanish and Portuguese the same way', () => {
    expect(reference.format).toBe('tracert');
    expect(reference.hops).toHaveLength(4);
    for (const [lang, header, timeout] of LOCALISED) {
      const parsed = parseTrace(tracertIn(header, timeout));
      expect(parsed.format, lang).toBe('tracert');
      expect(parsed.hops.map((hop) => hop.ttl), lang).toEqual([1, 2, 3, 4]);
      expect(parsed.hops[2]?.replies[0]?.rtt_ms, lang).toEqual([]);
      expect(parsed.hops[3]?.replies[0]?.ip, lang).toBe('198.51.100.9');
    }
  });

  it('VOY-P-01 a noisy trace survives a write/read round trip', () => {
    const parsed = parseTrace(`\uFEFF${EXAMPLE_TRACE.replace(/\n/g, '\r\n')}`);
    const again = parseTrace(writeTrace(parsed, 'traceroute'));
    expect(again.hops.map((hop) => hop.replies.map((r) => r.ip))).toEqual(
      parsed.hops.map((hop) => hop.replies.map((r) => r.ip)),
    );
    expect(again.hops.map((hop) => hop.replies.map((r) => r.rtt_ms))).toEqual(
      parsed.hops.map((hop) => hop.replies.map((r) => r.rtt_ms)),
    );
  });
});

describe('VOY-P-02 fuzz: nothing a user pastes can break the reader', () => {
  it(`never throws, never invents a delay, never hangs (seed ${SEED})`, () => {
    const nasty = fc.oneof(
      fc.string({ maxLength: 4000 }),
      fc.stringOf(fc.constantFrom('\u0000', '\r', '\n', '\t', '*', ' ', '1', '.', 'm', 's', '\uFEFF', 'é', '\u2019')),
      fc.constant(`${EXAMPLE_TRACE.repeat(60)}`),
    );
    fc.assert(
      fc.property(nasty, (text) => {
        const parsed = parseTrace(text);
        expect(Array.isArray(parsed.hops)).toBe(true);
        for (const hop of parsed.hops) {
          expect(hop.ttl).toBeGreaterThanOrEqual(0);
          for (const reply of hop.replies) {
            for (const rtt of reply.rtt_ms) expect(Number.isFinite(rtt)).toBe(true);
          }
        }
        expect(parsed.unknownLines.length).toBeLessThanOrEqual(50);
      }),
      { seed: SEED, numRuns: 200 },
    );
  });
});
