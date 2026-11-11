import { useRef } from 'react';
import type { Cable, Journey, Landmass } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import { usePreferences } from '../state/preferences.tsx';
import { useJourneyState } from '../state/journey.tsx';
import type { ProjectionKind } from '../lib/map-geometry.ts';
import { useMapDrag } from './map/use-map-drag.ts';
import { usePaintedMap } from './map/use-painted-map.ts';
import { MapOverlay } from './map/MapOverlay.tsx';

const WIDTH = 960;
const HEIGHT = 520;

export interface WorldMapProps {
  journey: Journey;
  /** Second journey drawn on the same map (VOY-F-29 compare mode). */
  secondary?: Journey | null;
  masses?: Landmass[];
  cables?: Cable[];
  projection?: ProjectionKind;
}

/**
 * World map (§11.8, §12.3, VOY-F-30): canvas rendering with d3-geo, an SVG
 * interaction layer above it, drag-to-rotate globe, and a stitching
 * animation disabled when `prefers-reduced-motion` is set (VOY-F-34).
 */
export function WorldMap(props: WorldMapProps) {
  const { journey, secondary = null, masses = [], cables = [], projection: forced } = props;
  const { t } = useI18n();
  const { prefs, animationsEnabled } = usePreferences();
  const { selectedHop, hoveredHop, selectedSegment } = useJourneyState();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const kind: ProjectionKind = forced ?? prefs.projection;
  const drag = useMapDrag(kind);
  const painted = usePaintedMap({
    journey,
    secondary,
    masses,
    cables,
    kind,
    rotation: drag.rotation,
    animationsEnabled,
    selectedHop,
    hoveredHop,
    selectedSegment,
    width: WIDTH,
    height: HEIGHT,
    canvasRef,
  });
  const { distance_km_min: distance, countries } = journey.summary;

  return (
    <div className="world-map">
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        role="img"
        aria-label={t('map.altText', { distance, countries: countries.join(', ') })}
        data-testid="world-map-canvas"
        onPointerDown={drag.onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onPointerLeave={drag.onPointerUp}
      />
      <MapOverlay
        projection={painted.projection}
        journey={journey}
        nodes={painted.scene.nodes}
        width={WIDTH}
        height={HEIGHT}
      />
    </div>
  );
}
