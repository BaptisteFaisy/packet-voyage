import { useRef, useState } from 'react';
import type { Cable, Journey, Landmass } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import { usePreferences } from '../state/preferences.tsx';
import { useJourneyState } from '../state/journey.tsx';
import type { ProjectionKind } from '../lib/map-geometry.ts';
import { useMapDrag } from './map/use-map-drag.ts';
import { usePaintedMap } from './map/use-painted-map.ts';
import { MapOverlay } from './map/MapOverlay.tsx';
import { LightConeToggle } from './LightConeToggle.tsx';

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
/** The map's replacement text carries the bounded distance (§12.4). */
function mapAltText(journey: Journey, t: (key: 'map.altText', params: Record<string, string | number>) => string): string {
  const { distance_km_min: distance, countries } = journey.summary;
  return t('map.altText', { distance, countries: countries.join(', ') });
}

/** Pointer handlers grouped so the JSX stays short and readable. */
function dragHandlers(drag: ReturnType<typeof useMapDrag>) {
  return {
    onPointerDown: drag.onPointerDown,
    onPointerMove: drag.onPointerMove,
    onPointerUp: drag.onPointerUp,
    onPointerLeave: drag.onPointerUp,
  };
}

/**
 * The map controls, OUTSIDE `.world-map`: the SVG hit-target overlay covers that
 * box absolutely (`inset: 0`), so a control placed inside it never receives a
 * click. jsdom cannot see that; the live-site check can, and does.
 */
function MapToolbar({ enabled, onToggle }: { enabled: boolean; onToggle: (next: boolean) => void }) {
  return (
    <div className="world-map-toolbar">
      <LightConeToggle enabled={enabled} onToggle={onToggle} />
    </div>
  );
}

export function WorldMap(props: WorldMapProps) {
  const { journey, secondary = null, masses = [], cables = [], projection: forced } = props;
  const { t } = useI18n();
  const { prefs, animationsEnabled } = usePreferences();
  const { selectedHop, hoveredHop, selectedSegment } = useJourneyState();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [lightCones, setLightCones] = useState(false);
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
    lightCones,
  });
  return (
    <div className="world-map-block">
      <MapToolbar enabled={lightCones} onToggle={setLightCones} />
      <div className="world-map">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          role="img"
          aria-label={mapAltText(journey, t)}
          data-testid="world-map-canvas"
          {...dragHandlers(drag)}
        />
        <MapOverlay
          projection={painted.projection}
          journey={journey}
          nodes={painted.scene.nodes}
          width={WIDTH}
          height={HEIGHT}
        />
      </div>
    </div>
  );
}
