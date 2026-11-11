import { useMemo } from 'react';
import type { Journey } from '@packet-voyage/schema';
import { rejectedPositions, routeLegs, routeNodes } from '../../lib/map-geometry.ts';
import { buildAnimationPlan } from '../../lib/map-animation.ts';
import type { AnimationPlan } from '../../lib/map-animation.ts';
import type { RouteLeg, RouteNode } from '../../lib/map-geometry.ts';
import type { RejectedMark } from './paint-scene.ts';

const STITCH_MS = 6000;

export interface MapSceneData {
  legs: RouteLeg[];
  nodes: RouteNode[];
  rejected: RejectedMark[];
  secondaryLegs: RouteLeg[];
  plan: AnimationPlan;
}

/** Memoised geometry of one journey (+ an optional compared journey). */
export function useMapScene(journey: Journey, secondary: Journey | null): MapSceneData {
  const legs = useMemo(() => routeLegs(journey), [journey]);
  const nodes = useMemo(() => routeNodes(journey), [journey]);
  const rejected = useMemo(() => rejectedPositions(journey), [journey]);
  const secondaryLegs = useMemo(() => (secondary ? routeLegs(secondary) : []), [secondary]);
  const plan = useMemo(() => buildAnimationPlan(legs, STITCH_MS), [legs]);
  return { legs, nodes, rejected, secondaryLegs, plan };
}
