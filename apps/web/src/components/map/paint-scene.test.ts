// @vitest-environment node
/**
 * paintScene optional layer: the direct great-circle is handed to the canvas
 * after the land and under the route when `directArc` is provided — and no
 * LineString appears when it is not (§12.3).
 */
import { describe, expect, it, vi } from 'vitest';
import type { GeoPath, GeoProjection } from 'd3-geo';
import type { Position } from '@packet-voyage/schema';
import { SAMPLE_JOURNEY } from '../../__fixtures__/sample-journey.ts';
import { buildAnimationPlan } from '../../lib/map-animation.ts';
import type { RouteLeg } from '../../lib/map-geometry.ts';
import { paintScene } from './paint-scene.ts';
import type { MapScene } from './paint-scene.ts';

const PARIS: Position = { lat: 48.8566, lon: 2.3522 };
const NEW_YORK: Position = { lat: 40.7128, lon: -74.006 };

function sceneWith(legs: RouteLeg[] = []): MapScene {
  return {
    journey: SAMPLE_JOURNEY,
    legs,
    secondaryLegs: [],
    nodes: [],
    rejected: [],
    masses: [],
    cables: [],
    litCableIds: new Set(),
  };
}

function mockContext(): CanvasRenderingContext2D {
  return {
    canvas: { width: 800, height: 600 },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    setLineDash: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

/** Records every geometry handed to the GeoPath generator. */
function recordingPath(): { path: GeoPath; calls: unknown[] } {
  const calls: unknown[] = [];
  const fn = (geometry: unknown): null => {
    calls.push(geometry);
    return null;
  };
  const path: GeoPath = Object.assign(fn, { context: () => path }) as unknown as GeoPath;
  return { path, calls };
}

const projection = vi.fn((..._coords: unknown[]) => [0, 0] as [number, number]) as unknown as GeoProjection;

function lineStrings(calls: unknown[]): GeoJSON.LineString[] {
  return calls.filter(
    (geometry): geometry is GeoJSON.LineString =>
      (geometry as GeoJSON.GeometryObject).type === 'LineString',
  );
}

function paint(directArc: { from: Position; to: Position } | null | undefined, legs: RouteLeg[] = []): unknown[] {
  const { path, calls } = recordingPath();
  paintScene({
    ctx: mockContext(),
    projection,
    path,
    scene: sceneWith(legs),
    plan: buildAnimationPlan(legs, 400),
    elapsed: 400,
    animate: false,
    selectedHop: null,
    hoveredHop: null,
    directArc,
  });
  return calls;
}

describe('paintScene directArc layer (§12.3)', () => {
  it('hands the direct great-circle to the context when directArc is provided', () => {
    const lines = lineStrings(paint({ from: PARIS, to: NEW_YORK }));
    expect(lines).toHaveLength(1);
    const arc = lines[0];
    expect(arc?.coordinates.length).toBeGreaterThanOrEqual(2);
    expect(arc?.coordinates[0]).toEqual([PARIS.lon, PARIS.lat]);
    expect(arc?.coordinates[arc.coordinates.length - 1]).toEqual([NEW_YORK.lon, NEW_YORK.lat]);
  });

  it('draws no LineString when directArc is absent or null', () => {
    expect(lineStrings(paint(undefined))).toHaveLength(0);
    expect(lineStrings(paint(null))).toHaveLength(0);
  });

  it('paints the arc under the route: its LineString comes before the leg', () => {
    const leg: RouteLeg = { key: 'leg-0-1', fromTtl: 0, toTtl: 1, points: [PARIS, NEW_YORK], durationMs: 40 };
    const lines = lineStrings(paint({ from: PARIS, to: NEW_YORK }, [leg]));
    expect(lines).toHaveLength(2);
    // The arc is sampled along the great circle; the test leg holds 2 points.
    expect((lines[0]?.coordinates.length ?? 0)).toBeGreaterThan(lines[1]?.coordinates.length ?? 0);
  });
});
