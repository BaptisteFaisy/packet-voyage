import { useMemo } from 'react';
import type { RefObject } from 'react';
import type { Cable, Journey, Landmass } from '@packet-voyage/schema';
import type { GeoProjection } from 'd3-geo';
import { litCableIds, makeProjection } from '../../lib/map-geometry.ts';
import type { ProjectionKind } from '../../lib/map-geometry.ts';
import { useMapAnimation } from './use-map-animation.ts';
import { useMapScene } from './use-map-scene.ts';
import { useScenePainting } from './use-scene-painting.ts';
import type { MapSceneData } from './use-map-scene.ts';

export interface PaintedMapInput {
  journey: Journey;
  secondary: Journey | null;
  masses: Landmass[];
  cables: Cable[];
  kind: ProjectionKind;
  rotation: [number, number];
  animationsEnabled: boolean;
  selectedHop: number | null;
  hoveredHop: number | null;
  selectedSegment: { from: number; to: number } | null;
  width: number;
  height: number;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

export interface PaintedMap {
  projection: GeoProjection;
  scene: MapSceneData;
}

/** Scene memoisation + projection + stitching clock + canvas painting. */
export function usePaintedMap(input: PaintedMapInput): PaintedMap {
  const { journey, secondary, masses, cables, kind, rotation, animationsEnabled, canvasRef } = input;
  const scene = useMapScene(journey, secondary);
  const elapsed = useMapAnimation(scene.plan, animationsEnabled);
  const lit = useMemo(
    () => litCableIds(journey, input.selectedSegment),
    [journey, input.selectedSegment],
  );
  const projection = useMemo(
    () => makeProjection(kind, input.width, input.height, rotation),
    [kind, input.width, input.height, rotation],
  );
  const mapScene = useMemo(
    () => ({
      journey,
      legs: scene.legs,
      secondaryLegs: scene.secondaryLegs,
      nodes: scene.nodes,
      rejected: scene.rejected,
      masses,
      cables,
      litCableIds: lit,
    }),
    [journey, scene, masses, cables, lit],
  );

  useScenePainting({
    canvasRef,
    projection,
    scene: mapScene,
    plan: scene.plan,
    elapsed,
    animate: animationsEnabled,
    selectedHop: input.selectedHop,
    hoveredHop: input.hoveredHop,
  });

  return { projection, scene };
}
