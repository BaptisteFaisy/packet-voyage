// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { MAX_QR_TEXT, qrMatrix, qrSvg, QrTooLongError } from './qr.ts';

const TEXT = 'https://tradoooo.github.io/packet-voyage/#j=eyJ2ZXJzaW9uIjox';

describe('QR code, generated locally (§ idea 10)', () => {
  it('produces a square matrix with the three finder patterns', () => {
    const matrix = qrMatrix(TEXT);
    expect(matrix.length).toBeGreaterThan(20);
    expect(matrix[0]?.length).toBe(matrix.length);
    // A finder pattern is 7×7: a dark border, a light ring, a dark 3×3 centre.
    const finder = (row: number, col: number) =>
      matrix[row]?.[col] === true &&
      matrix[row]?.[col + 6] === true &&
      matrix[row + 6]?.[col] === true &&
      matrix[row + 1]?.[col + 1] === false &&
      matrix[row + 3]?.[col + 3] === true;
    expect(finder(0, 0)).toBe(true);
    expect(finder(0, matrix.length - 7)).toBe(true);
    expect(finder(matrix.length - 7, 0)).toBe(true);
  });

  it('is deterministic: the same text gives the same matrix', () => {
    expect(qrMatrix(TEXT)).toEqual(qrMatrix(TEXT));
  });

  it('refuses a text too long to be readable', () => {
    expect(() => qrMatrix('x'.repeat(MAX_QR_TEXT + 1))).toThrow(QrTooLongError);
  });

  it('renders an SVG document with one path for the dark modules', () => {
    const svg = qrSvg(qrMatrix(TEXT), { size: 200, margin: 4 });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('viewBox="0 0');
    expect(svg).toContain('<path d="M');
    expect(svg.endsWith('</svg>')).toBe(true);
    // The only URL in the document is the SVG namespace: no external resource.
    expect(svg).not.toMatch(/xlink:href|<image|url\(/);
  });
});
