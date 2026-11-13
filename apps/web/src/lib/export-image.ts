/**
 * VOY-F-40 — export the map as an image, with the data credits and an alt text
 * generated from the summary (§12.4).
 *
 * Everything is injected so the module is testable without a browser: the canvas
 * factory, the 2D context and the painter. The drawing itself reuses the map
 * renderer (`paintScene`) — one implementation of the map, on screen and in the
 * exported file.
 */
import type { Cable, Journey, Landmass } from '@packet-voyage/schema';
import type { GeoProjection } from 'd3-geo';
import { geoPath } from 'd3-geo';
import type { MapScene } from '../components/map/paint-scene.ts';
import { paintScene } from '../components/map/paint-scene.ts';
import { EN_KEYS } from '../i18n/en.ts';
import { FR_KEYS } from '../i18n/fr.ts';
import type { Language } from '../i18n/context.ts';
import { buildAnimationPlan } from './map-animation.ts';
import {
  litCableIds,
  makeProjection,
  rejectedPositions,
  routeLegs,
  routeNodes,
} from './map-geometry.ts';
import type { ProjectionKind } from './map-geometry.ts';
import type { DistanceUnit } from './format.ts';
import { formatInflation, formatMs, formatQualifiedDistance } from './format.ts';

export const EXPORT_WIDTH = 1600;
export const EXPORT_MAP_HEIGHT = 900;
export const EXPORT_FOOTER_HEIGHT = 150;
export const EXPORT_SCALE = 2;
const STITCH_MS = 6000;

/** The subset of the 2D context the export uses; `CanvasRenderingContext2D` fits. */
export interface ExportCanvasContext {
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  font: string;
  textAlign: 'left' | 'center' | 'right';
  textBaseline: 'top' | 'middle' | 'bottom' | 'alphabetic';
  save(): void;
  restore(): void;
  scale(x: number, y: number): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  fillText(text: string, x: number, y: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
}

export interface ExportedImage {
  blob: Blob;
  fileName: string;
  alt: string;
}

function translate(language: Language, key: keyof typeof EN_KEYS, params: Record<string, string>): string {
  const table = language === 'fr' ? FR_KEYS : EN_KEYS;
  const template = table[key] ?? EN_KEYS[key] ?? key;
  return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), template);
}

/** A filesystem-safe, ASCII name: no space, no slash, no accent. */
export function exportFileName(journey: Journey): string {
  const host = journey.target.host
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9.-]/g, '')
    .replace(/^\.+|\.+$/g, '')
    .toLowerCase();
  const date = journey.traced_at.slice(0, 10).replace(/-/g, '');
  return `packet-voyage-${host || 'journey'}-${date}.png`;
}

/** The replacement text of §12.4: the summary, in words, with its bounds. */
export function buildExportAltText(journey: Journey, language: Language, unit: DistanceUnit): string {
  const summary = journey.summary;
  return translate(language, 'export.alt', {
    host: journey.target.host,
    distance: formatQualifiedDistance(summary.distance_km_min, unit, language),
    rtt: formatMs(summary.rtt_ms, language),
    floor: formatMs(summary.light_floor_ms, language),
    inflation: formatInflation(summary.inflation, language),
    countries: String(summary.countries.length),
    rejected: String(summary.rejected_by_light),
  });
}

/** The footer of the image: the numbers, the legend, the credits (§6.2). */
export function exportFooterLines(
  journey: Journey,
  language: Language,
  unit: DistanceUnit,
  generatedOn: string,
): string[] {
  const summary = journey.summary;
  const numbers = [
    formatQualifiedDistance(summary.distance_km_min, unit, language),
    `${formatMs(summary.rtt_ms, language)} ${language === 'fr' ? 'mesurées' : 'measured'}`,
    `${language === 'fr' ? 'lumière seule' : 'light alone'} ${formatMs(summary.light_floor_ms, language)}`,
    `${language === 'fr' ? 'inflation' : 'inflation'} ${formatInflation(summary.inflation, language)}`,
  ].join(' · ');
  const credits = translate(language, 'export.footerCredits', {
    credits: journey.credits.length > 0 ? journey.credits.join(' — ') : 'see the sources page',
  });
  return [numbers, translate(language, 'export.legend', {}), credits,
    translate(language, 'export.footerGenerated', { date: generatedOn })];
}

/** The scene the map renderer already knows how to paint. */
export function buildExportScene(journey: Journey, masses: Landmass[], cables: Cable[]): MapScene {
  const legs = routeLegs(journey);
  return {
    journey,
    legs,
    secondaryLegs: [],
    nodes: routeNodes(journey),
    rejected: rejectedPositions(journey),
    masses,
    cables,
    litCableIds: litCableIds(journey, null),
  };
}

export interface PaintExportDeps {
  ctx: ExportCanvasContext;
  scene: MapScene;
  projection: GeoProjection;
  width: number;
  mapHeight: number;
  footerHeight: number;
  footerLines: string[];
  paint?: typeof paintScene;
}

/** Paint the map, then the footer band that carries the credits. */
export function paintExport(deps: PaintExportDeps): void {
  const { ctx, scene, projection, width, mapHeight, footerHeight, footerLines } = deps;
  const paint = deps.paint ?? paintScene;
  ctx.save();
  paint({
    ctx: ctx as CanvasRenderingContext2D,
    projection,
    path: geoPath(projection, ctx as CanvasRenderingContext2D),
    scene,
    plan: buildAnimationPlan(scene.legs, STITCH_MS),
    elapsed: 0,
    animate: false,
    selectedHop: null,
    hoveredHop: null,
  });
  ctx.restore();
  drawFooter(ctx, width, mapHeight, footerHeight, footerLines);
}

function drawFooter(
  ctx: ExportCanvasContext,
  width: number,
  mapHeight: number,
  footerHeight: number,
  lines: string[],
): void {
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(0, mapHeight, width, footerHeight);
  ctx.strokeStyle = '#2a3550';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, mapHeight);
  ctx.lineTo(width, mapHeight);
  ctx.stroke();
  ctx.fillStyle = '#e8ecf7';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  lines.forEach((line, index) => {
    ctx.font = index === 0 ? '600 26px ui-monospace, monospace' : '18px system-ui, sans-serif';
    ctx.fillText(line, 28, mapHeight + 20 + index * 30);
  });
}

export interface ExportImageDeps {
  journey: Journey;
  masses: Landmass[];
  cables: Cable[];
  language: Language;
  unit: DistanceUnit;
  projection: ProjectionKind;
  /** Injected date: the export must be reproducible in tests. */
  generatedOn: string;
  createCanvas?: (width: number, height: number) => HTMLCanvasElement;
}

/** Produce the PNG blob, its file name and its replacement text. */
export async function exportJourneyImage(deps: ExportImageDeps): Promise<ExportedImage> {
  const width = EXPORT_WIDTH;
  const height = EXPORT_MAP_HEIGHT + EXPORT_FOOTER_HEIGHT;
  const canvas = (deps.createCanvas ?? defaultCanvas)(width * EXPORT_SCALE, height * EXPORT_SCALE);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('this browser refused to open a 2D context');
  ctx.save();
  ctx.scale(EXPORT_SCALE, EXPORT_SCALE);
  const scene = buildExportScene(deps.journey, deps.masses, deps.cables);
  paintExport({
    ctx: ctx as ExportCanvasContext,
    scene,
    projection: makeProjection(deps.projection, width, EXPORT_MAP_HEIGHT, [0, 0]),
    width,
    mapHeight: EXPORT_MAP_HEIGHT,
    footerHeight: EXPORT_FOOTER_HEIGHT,
    footerLines: exportFooterLines(deps.journey, deps.language, deps.unit, deps.generatedOn),
  });
  ctx.restore();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('the canvas could not be encoded as PNG');
  return {
    blob,
    fileName: exportFileName(deps.journey),
    alt: buildExportAltText(deps.journey, deps.language, deps.unit),
  };
}

function defaultCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
