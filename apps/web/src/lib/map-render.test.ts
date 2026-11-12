// @vitest-environment node
/**
 * drawDirectArc: the direct great-circle painted under the route so the
 * detour is visible in three seconds (§12.3).
 */
import { describe, expect, it, vi } from 'vitest';
import type { GeoPath, GeoProjection } from 'd3-geo';
import type { Position } from '@packet-voyage/schema';
import { DIRECT_ARC_COLOR, drawDirectArc } from './map-render.ts';

const PARIS: Position = { lat: 48.8566, lon: 2.3522 };
const NEW_YORK: Position = { lat: 40.7128, lon: -74.006 };

function mockContext() {
  const raw = {
    strokeStyle: '',
    lineWidth: 0,
    beginPath: vi.fn(),
    setLineDash: vi.fn(),
    stroke: vi.fn(),
  };
  return { raw, ctx: raw as unknown as CanvasRenderingContext2D };
}

function mockPath() {
  const fn = vi.fn((..._args: unknown[]) => null);
  return { fn, path: fn as unknown as GeoPath };
}

function mockProjection(visible: boolean) {
  const fn = vi.fn((..._coords: unknown[]) => (visible ? ([0, 0] as [number, number]) : null));
  return fn as unknown as GeoProjection;
}

describe('drawDirectArc (§12.3, detour visible in three seconds)', () => {
  it('strokes a LineString of at least two points, endpoints included', () => {
    const { raw, ctx } = mockContext();
    const { fn, path } = mockPath();
    drawDirectArc(ctx, path, mockProjection(true), PARIS, NEW_YORK);
    expect(fn).toHaveBeenCalledTimes(1);
    const line = fn.mock.calls[0]?.[0] as GeoJSON.LineString;
    expect(line.type).toBe('LineString');
    expect(line.coordinates.length).toBeGreaterThanOrEqual(2);
    expect(line.coordinates[0]).toEqual([PARIS.lon, PARIS.lat]);
    expect(line.coordinates[line.coordinates.length - 1]).toEqual([NEW_YORK.lon, NEW_YORK.lat]);
    expect(raw.stroke).toHaveBeenCalledTimes(1);
  });

  it('dots it grey and thinner than the route, then resets the dash', () => {
    const { raw, ctx } = mockContext();
    const { path } = mockPath();
    drawDirectArc(ctx, path, mockProjection(true), PARIS, NEW_YORK);
    expect(raw.strokeStyle).toBe(DIRECT_ARC_COLOR);
    expect(raw.lineWidth).toBeGreaterThan(0);
    expect(raw.lineWidth).toBeLessThan(2); // the route strokes at 2
    const dash = raw.setLineDash.mock.calls[0]?.[0] as number[];
    expect(dash.length).toBeGreaterThan(0);
    expect(dash.every((value) => value > 0)).toBe(true);
    expect(raw.setLineDash.mock.calls.at(-1)?.[0]).toEqual([]);
  });

  it('does nothing when both endpoints are the same place', () => {
    const { raw, ctx } = mockContext();
    const { fn, path } = mockPath();
    drawDirectArc(ctx, path, mockProjection(true), PARIS, { ...PARIS });
    expect(fn).not.toHaveBeenCalled();
    expect(raw.stroke).not.toHaveBeenCalled();
  });

  it('stays hidden on the globe when neither endpoint is visible', () => {
    const { raw, ctx } = mockContext();
    const { fn, path } = mockPath();
    drawDirectArc(ctx, path, mockProjection(false), PARIS, NEW_YORK);
    expect(fn).not.toHaveBeenCalled();
    expect(raw.stroke).not.toHaveBeenCalled();
  });
});
