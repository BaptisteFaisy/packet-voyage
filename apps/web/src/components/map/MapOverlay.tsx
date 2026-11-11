import type { GeoProjection } from 'd3-geo';
import type { Journey } from '@packet-voyage/schema';
import { useI18n } from '../../i18n/context.tsx';
import { useJourneyState } from '../../state/journey.tsx';
import type { RouteNode } from '../../lib/map-geometry.ts';

function activate(onSelect: () => void) {
  return (event: { key: string; preventDefault: () => void }) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  };
}

interface NodesProps {
  projection: GeoProjection;
  journey: Journey;
  nodes: RouteNode[];
}

/** Transparent, keyboard-reachable hit targets for every located hop. */
export function NodeTargets({ projection, journey, nodes }: NodesProps) {
  const { t } = useI18n();
  const { selectHop, hoverHop } = useJourneyState();
  return (
    <>
      {nodes.map((node) => {
        const projected = projection([node.position.lon, node.position.lat]);
        if (!projected) return null;
        const hop = journey.hops.find((entry) => entry.ttl === node.ttl);
        return (
          <circle
            key={`hit-${node.ttl}`}
            cx={projected[0]}
            cy={projected[1]}
            r={10}
            className="map-hit"
            tabIndex={0}
            role="button"
            aria-label={`${t('hop.title', { ttl: node.ttl })} ${hop?.location?.city ?? ''}`}
            data-testid={`map-node-${node.ttl}`}
            onMouseEnter={() => hoverHop(node.ttl)}
            onMouseLeave={() => hoverHop(null)}
            onFocus={() => hoverHop(node.ttl)}
            onClick={() => selectHop(node.ttl)}
            onKeyDown={activate(() => selectHop(node.ttl))}
          />
        );
      })}
    </>
  );
}

interface SegmentsProps {
  projection: GeoProjection;
  journey: Journey;
  nodes: RouteNode[];
}

/** Hit targets at the midpoint of every crossing (opens the CrossingCard). */
export function SegmentTargets({ projection, journey, nodes }: SegmentsProps) {
  const { t } = useI18n();
  const { selectSegment } = useJourneyState();
  return (
    <>
      {journey.segments.map((segment) => {
        const from = nodes.find((node) => node.ttl === segment.from_ttl);
        const to = nodes.find((node) => node.ttl === segment.to_ttl);
        if (!from || !to) return null;
        const mid = projection([
          (from.position.lon + to.position.lon) / 2,
          (from.position.lat + to.position.lat) / 2,
        ]);
        if (!mid) return null;
        const select = () => selectSegment({ from: segment.from_ttl, to: segment.to_ttl });
        return (
          <circle
            key={`seg-hit-${segment.from_ttl}-${segment.to_ttl}`}
            cx={mid[0]}
            cy={mid[1]}
            r={9}
            className="map-hit map-hit-segment"
            tabIndex={0}
            role="button"
            aria-label={t('crossing.title', { from: segment.from_ttl, to: segment.to_ttl })}
            data-testid={`map-segment-${segment.from_ttl}-${segment.to_ttl}`}
            onClick={select}
            onKeyDown={activate(select)}
          />
        );
      })}
    </>
  );
}

interface OverlayProps extends NodesProps {
  width: number;
  height: number;
}

/** SVG interaction layer above the canvas (§11.8, §12.4). */
export function MapOverlay({ projection, journey, nodes, width, height }: OverlayProps) {
  const { t } = useI18n();
  return (
    <svg
      className="map-overlay"
      viewBox={`0 0 ${width} ${height}`}
      role="group"
      aria-label={t('map.overlayLabel')}
      data-testid="world-map-overlay"
    >
      <NodeTargets projection={projection} journey={journey} nodes={nodes} />
      <SegmentTargets projection={projection} journey={journey} nodes={nodes} />
    </svg>
  );
}
