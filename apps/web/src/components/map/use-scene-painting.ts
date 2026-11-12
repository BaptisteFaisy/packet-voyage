import { useEffect } from 'react';
import type { RefObject } from 'react';
import type { Position } from '@packet-voyage/schema';
import type { GeoProjection } from 'd3-geo';
import { geoPath } from 'd3-geo';
import { paintScene } from './paint-scene.ts';
import type { MapScene } from './paint-scene.ts';
import type { AnimationPlan } from '../../lib/map-animation.ts';

export interface ScenePaintingInput {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  projection: GeoProjection;
  scene: MapScene;
  plan: AnimationPlan;
  elapsed: number;
  animate: boolean;
  selectedHop: number | null;
  hoveredHop: number | null;
  lightCones?: boolean;
  /** The direct great-circle, drawn under the route so a detour is visible. */
  directArc?: { from: Position; to: Position } | null;
}

/** Repaints the canvas whenever any input of the scene changes. */
export function useScenePainting(input: ScenePaintingInput): void {
  const { canvasRef, projection, scene, plan, elapsed, animate, selectedHop, hoveredHop } = input;
  const lightCones = input.lightCones ?? false;
  const directArc = input.directArc ?? null;
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    paintScene({
      ctx,
      projection,
      path: geoPath(projection, ctx),
      scene,
      plan,
      elapsed,
      animate,
      selectedHop,
      hoveredHop,
      lightCones,
      directArc,
    });
  }, [canvasRef, projection, scene, plan, elapsed, animate, selectedHop, hoveredHop, lightCones, directArc]);
}
