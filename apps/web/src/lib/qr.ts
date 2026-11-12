/**
 * A QR code of the share link, generated HERE: no service, no request, no
 * telemetry. The matrix comes from `qrcode-generator` (MIT, no dependency), so
 * the encoder is battle-tested instead of hand-rolled.
 *
 * A QR code is not a magic wand: past a few hundred characters it becomes
 * unreadable in a screenshot. Past the limit, the caller is told to share the
 * file instead.
 */
import qrcode from 'qrcode-generator';

export const MAX_QR_TEXT = 900;
export const QR_ERROR_CORRECTION = 'M' as const;

export class QrTooLongError extends Error {
  readonly length: number;
  readonly limit: number;

  constructor(length: number, limit: number = MAX_QR_TEXT) {
    super(`the text is too long for a QR code: ${length} characters for a ${limit} limit`);
    this.name = 'QrTooLongError';
    this.length = length;
    this.limit = limit;
  }
}

/** The square matrix of the code: `matrix[row][col]` is true for a dark module. */
export function qrMatrix(text: string): boolean[][] {
  if (text.length > MAX_QR_TEXT) throw new QrTooLongError(text.length);
  const code = qrcode(0, QR_ERROR_CORRECTION);
  code.addData(text);
  code.make();
  const size = code.getModuleCount();
  const matrix: boolean[][] = [];
  for (let row = 0; row < size; row += 1) {
    const line: boolean[] = [];
    for (let col = 0; col < size; col += 1) line.push(code.isDark(row, col));
    matrix.push(line);
  }
  return matrix;
}

export interface QrSvgOptions {
  /** Size of the SVG in CSS pixels (the quiet zone is included). */
  size?: number;
  margin?: number;
  dark?: string;
  light?: string;
}

export interface QrGeometry {
  /** One `M…h…v…h…z` sub-path per dark module: a single path, no per-module node. */
  d: string;
  /** Size of the viewBox, quiet zone included, in module units. */
  total: number;
}

/** The geometry of the code, so it can be rendered as real SVG elements. */
export function qrGeometry(matrix: boolean[][], margin = 4): QrGeometry {
  const modules = matrix.length;
  const parts: string[] = [];
  for (let row = 0; row < modules; row += 1) {
    for (let col = 0; col < modules; col += 1) {
      if (!matrix[row]?.[col]) continue;
      parts.push(`M${col + margin} ${row + margin}h1v1h-1z`);
    }
  }
  return { d: parts.join(''), total: modules + margin * 2 };
}

/** The code as an SVG document, for the downloaded file. */
export function qrSvg(matrix: boolean[][], options: QrSvgOptions = {}): string {
  const size = options.size ?? 240;
  const margin = options.margin ?? 4;
  const dark = options.dark ?? '#0b1220';
  const light = options.light ?? '#ffffff';
  const { d, total } = qrGeometry(matrix, margin);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">`,
    `<rect width="${total}" height="${total}" fill="${light}"/>`,
    `<path d="${d}" fill="${dark}"/>`,
    '</svg>',
  ].join('');
}
