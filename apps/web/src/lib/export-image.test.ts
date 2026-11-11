// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { checkVocabulary } from '@packet-voyage/core';
import { SAMPLE_JOURNEY } from '../__fixtures__/sample-journey.ts';
import type { ExportCanvasContext } from './export-image.ts';
import {
  EXPORT_FOOTER_HEIGHT,
  EXPORT_MAP_HEIGHT,
  EXPORT_WIDTH,
  buildExportAltText,
  buildExportScene,
  exportFileName,
  exportFooterLines,
  paintExport,
} from './export-image.ts';

const GENERATED_ON = '2026-11-11';

const METHODS = [
  'save', 'restore', 'scale', 'fillRect', 'fillText', 'beginPath', 'moveTo', 'lineTo', 'stroke',
] as const;

/** A context that records instead of drawing: the export must stay testable. */
function recordingContext(): { ctx: ExportCanvasContext; calls: string[] } {
  const calls: string[] = [];
  const target: Record<string, unknown> = {
    fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textAlign: 'left', textBaseline: 'top',
  };
  for (const method of METHODS) {
    target[method] = (...args: unknown[]) => {
      calls.push(`${method}(${args.map((value) => String(value)).join(',')})`);
    };
  }
  return { ctx: target as unknown as ExportCanvasContext, calls };
}

describe('VOY-F-40 image export', () => {
  it('names the file after the target and the trace date, filesystem-safe', () => {
    const name = exportFileName(SAMPLE_JOURNEY);
    expect(name).toMatch(/^packet-voyage-[a-z0-9.-]+-\d{8}\.png$/);
    expect(name).not.toMatch(/[\s/\\]/);
  });

  it('builds a replacement text from the summary, bounded and honest', () => {
    for (const language of ['en', 'fr'] as const) {
      const alt = buildExportAltText(SAMPLE_JOURNEY, language, 'km');
      expect(alt).toContain(SAMPLE_JOURNEY.target.host);
      expect(checkVocabulary(alt).violations, alt).toEqual([]);
      expect(alt.toLowerCase()).toMatch(/at least|au moins/);
    }
  });

  it('carries the numbers, the legend, the credits and the date in the footer', () => {
    const lines = exportFooterLines(SAMPLE_JOURNEY, 'en', 'km', GENERATED_ON);
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain('at least');
    expect(lines[1]).toMatch(/measured/);
    expect(lines[1]).toMatch(/inferred/);
    expect(lines[2]).toContain('Data:');
    expect(lines[3]).toContain(GENERATED_ON);
    for (const line of lines) expect(checkVocabulary(line).violations, line).toEqual([]);
  });

  it('keeps the French footer as honest as the English one', () => {
    const lines = exportFooterLines(SAMPLE_JOURNEY, 'fr', 'km', GENERATED_ON);
    expect(lines[0]).toContain('au moins');
    expect(lines[2]).toContain('Données :');
    for (const line of lines) expect(checkVocabulary(line).violations, line).toEqual([]);
  });
});

describe('VOY-F-40 painting and scene', () => {
  it('lights the cables of the sea crossings and nothing else', () => {
    const scene = buildExportScene(SAMPLE_JOURNEY, [], []);
    const expected = new Set(
      SAMPLE_JOURNEY.segments.filter((s) => s.kind === 'sea').flatMap((s) => s.cables.map((c) => c.id)),
    );
    expect(scene.litCableIds).toEqual(expected);
    expect(scene.nodes.length).toBeGreaterThan(0);
    expect(scene.legs.length).toBeGreaterThan(0);
  });

  it('paints the map once, unanimated, then the footer band and its lines', () => {
    const { ctx, calls } = recordingContext();
    const scene = buildExportScene(SAMPLE_JOURNEY, [], []);
    let painted = 0;
    const paint = () => {
      painted += 1;
    };
    paintExport({
      ctx,
      scene,
      projection: { scale: () => projectionStub(), translate: () => projectionStub() } as never,
      width: EXPORT_WIDTH,
      mapHeight: EXPORT_MAP_HEIGHT,
      footerHeight: EXPORT_FOOTER_HEIGHT,
      footerLines: ['one', 'two', 'three', 'four'],
      paint: paint as never,
    });
    expect(painted).toBe(1);
    expect(calls.filter((call) => call.startsWith('fillText('))).toHaveLength(4);
    expect(calls.some((call) => call === `fillRect(0,${EXPORT_MAP_HEIGHT},${EXPORT_WIDTH},${EXPORT_FOOTER_HEIGHT})`)).toBe(true);
  });
});

function projectionStub() {
  return { scale: () => projectionStub(), translate: () => projectionStub() };
}
