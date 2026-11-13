import type { Cable, Journey, Landmass, Position } from '@packet-voyage/schema';
import type { GeoPath, GeoProjection } from 'd3-geo';
import type { RouteLeg, RouteNode } from '../../lib/map-geometry.ts';
import type { AnimationPlan } from '../../lib/map-animation.ts';
import { animationStateAt } from '../../lib/map-animation.ts';
import {
  SECONDARY_COLOR,
  drawCableWatermark,
  drawDirectArc,
  drawLand,
  drawLeg,
  drawLightDiscs,
  drawLitCables,
  drawNode,
  drawRejectedNode,
  drawSea,
} from '../../lib/map-render.ts';
import { discRings, lightDiscs } from '../../lib/light-cone.ts';
import { getNetworkStyle } from '../../lib/styling.ts';

export interface RejectedMark {
  ttl: number;
  position: { lat: number; lon: number };
  city: string;
}

export interface MapScene {
  journey: Journey;
  legs: RouteLeg[];
  secondaryLegs: RouteLeg[];
  nodes: RouteNode[];
  rejected: RejectedMark[];
  masses: Landmass[];
  cables: Cable[];
  litCableIds: Set<string>;
}

export interface PaintInput {
  ctx: CanvasRenderingContext2D;
  projection: GeoProjection;
  path: GeoPath;
  scene: MapScene;
  plan: AnimationPlan;
  elapsed: number;
  animate: boolean;
  selectedHop: number | null;
  hoveredHop: number | null;
  /** Draw the disc of positions each delay allows (§7.6). Off by default. */
  lightCones?: boolean;
  /** Direct great-circle origin→destination, dotted grey under the route. Off by default. */
  directArc?: { from: Position; to: Position } | null;
}

function legStyle(journey: Journey, leg: RouteLeg): { certainty: 'measured' | 'inferred' | 'assumed'; network: string | null } {
  const segment = journey.segments.find((seg) => seg.from_ttl === leg.fromTtl && seg.to_ttl === leg.toTtl);
  const hop = journey.hops.find((entry) => entry.ttl === leg.toTtl);
  const network = hop?.as_name ?? (hop?.asn ? `AS${hop.asn}` : null);
  const certainty =
    segment && (segment.kind === 'sea' || segment.kind === 'sea-or-fixed') ? 'assumed' : 'inferred';
  return { certainty, network };
}

function legProgress(plan: AnimationPlan, elapsed: number, animate: boolean, key: string): number {
  if (!animate) return 1;
  const state = animationStateAt(plan, elapsed);
  if (state.doneKeys.has(key)) return 1;
  return state.activeKey === key ? state.activeProgress : 0;
}

/** Paint one full frame of the map (§12.3). */
export function paintScene(input: PaintInput): void {
  const { ctx, projection, path, scene, plan, elapsed, animate } = input;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawSea(ctx, path, projection);
  drawLand(ctx, path, scene.masses);
  if (input.directArc) {
    drawDirectArc(ctx, path, projection, input.directArc.from, input.directArc.to);
  }
  drawCableWatermark(ctx, path, scene.cables);
  drawLitCables(ctx, path, scene.cables, scene.litCableIds);
  if (input.lightCones === true) {
    drawLightDiscs(ctx, path, discRings(lightDiscs(scene.journey)));
  }
  const state = animationStateAt(plan, animate ? elapsed : plan.totalMs);
  for (const leg of scene.legs) {
    const progress = legProgress(plan, elapsed, animate, leg.key);
    drawLeg(ctx, path, leg, legStyle(scene.journey, leg), progress);
  }
  for (const leg of scene.secondaryLegs) {
    drawLeg(ctx, path, leg, { certainty: 'assumed', network: null }, 1, SECONDARY_COLOR);
  }
  for (const node of scene.nodes) {
    const hop = scene.journey.hops.find((entry) => entry.ttl === node.ttl);
    const style = getNetworkStyle(hop?.as_name ?? null);
    const active = input.selectedHop === node.ttl || input.hoveredHop === node.ttl;
    drawNode(ctx, projection, node.position, node.ttl === 0 ? '#f8fafc' : style.color, 5, active);
  }
  for (const item of scene.rejected) {
    drawRejectedNode(ctx, projection, item.position, state.finished ? 1 : 0);
  }
}
