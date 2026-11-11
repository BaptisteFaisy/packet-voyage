/**
 * Canvas painting of the map (§12.3 art direction): night-blue sea, slate
 * land, cables as a light watermark, route stitched with certainty-driven
 * stroke styles and one colour per network. Pure canvas calls, no React.
 */
import type { Cable, Landmass, Position } from '@packet-voyage/schema';
import type { GeoPath, GeoProjection } from 'd3-geo';
import { geoGraticule10 } from 'd3-geo';
import type { RouteLeg } from './map-geometry.ts';
import { getNetworkStyle } from './styling.ts';

export const SEA_COLOR = '#0b1220';
export const LAND_COLOR = '#1e293b';
export const GRATICULE_COLOR = '#16213a';
export const CABLE_WATERMARK = '#2b3a55';
export const CABLE_LIT = '#fbbf24';
export const ROUTE_COLOR = '#7dd3fc';
export const REJECTED_COLOR = '#f87171';
export const SECONDARY_COLOR = '#fbbf24';

function lineString(points: Position[]): GeoJSON.LineString {
  return { type: 'LineString', coordinates: points.map((p) => [p.lon, p.lat]) };
}

function multiPolygon(masses: Landmass[]): GeoJSON.MultiPolygon {
  return {
    type: 'MultiPolygon',
    coordinates: masses.map((mass) =>
      mass.polygons.map((ring) => ring.map((p) => [p.lon, p.lat])),
    ),
  };
}

function multiLineString(cables: Cable[]): GeoJSON.MultiLineString {
  return {
    type: 'MultiLineString',
    coordinates: cables.flatMap((cable) =>
      cable.geometry.map((polyline) => polyline.map((p) => [p.lon, p.lat])),
    ),
  };
}

export function drawSea(ctx: CanvasRenderingContext2D, path: GeoPath, projection: GeoProjection): void {
  ctx.fillStyle = SEA_COLOR;
  ctx.beginPath();
  path.context(ctx)({ type: 'Sphere' });
  ctx.fill();
  ctx.strokeStyle = GRATICULE_COLOR;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  path(geoGraticule10());
  ctx.stroke();
  void projection;
}

export function drawLand(ctx: CanvasRenderingContext2D, path: GeoPath, masses: Landmass[]): void {
  if (masses.length === 0) return;
  ctx.fillStyle = LAND_COLOR;
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  path(multiPolygon(masses));
  ctx.fill();
  ctx.stroke();
}

export function drawCableWatermark(ctx: CanvasRenderingContext2D, path: GeoPath, cables: Cable[]): void {
  if (cables.length === 0) return;
  ctx.strokeStyle = CABLE_WATERMARK;
  ctx.lineWidth = 0.7;
  ctx.setLineDash([]);
  ctx.beginPath();
  path(multiLineString(cables));
  ctx.stroke();
}

export function drawLitCables(
  ctx: CanvasRenderingContext2D,
  path: GeoPath,
  cables: Cable[],
  litIds: Set<string>,
): void {
  const lit = cables.filter((cable) => litIds.has(cable.id));
  if (lit.length === 0) return;
  ctx.strokeStyle = CABLE_LIT;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  path(multiLineString(lit));
  ctx.stroke();
  ctx.setLineDash([]);
}

export interface LegStyle {
  certainty: 'measured' | 'inferred' | 'assumed';
  network: string | null;
}

export function strokeForCertainty(certainty: LegStyle['certainty']): number[] {
  if (certainty === 'measured') return [];
  if (certainty === 'inferred') return [7, 4];
  return [2, 4];
}

export function drawLeg(
  ctx: CanvasRenderingContext2D,
  path: GeoPath,
  leg: RouteLeg,
  style: LegStyle,
  progress: number,
  colorOverride?: string,
): void {
  if (progress <= 0) return;
  const pointCount = Math.max(2, Math.round(leg.points.length * Math.min(1, progress)));
  const points = leg.points.slice(0, pointCount);
  const networkStyle = getNetworkStyle(style.network);
  ctx.strokeStyle = colorOverride ?? networkStyle.color;
  ctx.lineWidth = 2;
  ctx.setLineDash(strokeForCertainty(style.certainty));
  ctx.beginPath();
  path(lineString(points));
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawNode(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  position: Position,
  color: string,
  radius: number,
  highlighted: boolean,
): void {
  const projected = projection([position.lon, position.lat]);
  if (!projected) return;
  ctx.beginPath();
  ctx.arc(projected[0], projected[1], highlighted ? radius + 2 : radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** A rejected location appears, then is struck through — an undone stitch. */
export function drawRejectedNode(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  position: Position,
  strikeProgress: number,
): void {
  const projected = projection([position.lon, position.lat]);
  if (!projected) return;
  const [x, y] = projected;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.strokeStyle = REJECTED_COLOR;
  ctx.setLineDash([2, 2]);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);
  if (strikeProgress <= 0) return;
  const half = 8 * Math.min(1, strikeProgress);
  ctx.beginPath();
  ctx.moveTo(x - half, y - half);
  ctx.lineTo(x + half, y + half);
  ctx.strokeStyle = REJECTED_COLOR;
  ctx.lineWidth = 2;
  ctx.stroke();
}
