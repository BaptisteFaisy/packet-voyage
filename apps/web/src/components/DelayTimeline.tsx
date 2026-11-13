import type { Journey } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import { useJourneyState } from '../state/journey.tsx';
import { formatMs } from '../lib/format.ts';
import { getNetworkStyle } from '../lib/styling.ts';

const WIDTH = 720;
const HEIGHT = 150;
const PADDING_LEFT = 40;
const PADDING_RIGHT = 16;
const AXIS_Y = 110;

interface Point {
  ttl: number;
  x: number;
  y: number;
  delay: number | null;
  network: string | null;
}

function timelinePoints(journey: Journey): { points: Point[]; maxDelay: number } {
  const delays = journey.hops
    .map((hop) => hop.envelope_ms)
    .filter((value): value is number => value !== null && value !== undefined);
  const maxDelay = Math.max(1, ...delays);
  const span = journey.hops.length > 1 ? journey.hops.length - 1 : 1;
  const points = journey.hops.map((hop, index) => {
    const delay = hop.envelope_ms ?? null;
    const x = PADDING_LEFT + ((WIDTH - PADDING_LEFT - PADDING_RIGHT) * index) / span;
    const y = delay === null ? AXIS_Y - 4 : AXIS_Y - (AXIS_Y - 20) * (delay / maxDelay);
    return { ttl: hop.ttl, x, y, delay, network: hop.as_name ?? (hop.asn ? `AS${hop.asn}` : null) };
  });
  return { points, maxDelay };
}

function polyline(points: Point[]): string {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
}

/** Millisecond axis with grid lines and tick labels. */
function TimelineAxis({ maxDelay }: { maxDelay: number }) {
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    ratio,
    y: AXIS_Y - (AXIS_Y - 20) * ratio,
    label: `${Math.round(maxDelay * ratio)}`,
  }));
  return (
    <>
      {ticks.map((tick) => (
        <g key={tick.ratio}>
          <line x1={PADDING_LEFT} x2={WIDTH - PADDING_RIGHT} y1={tick.y} y2={tick.y} className="timeline-grid" />
          <text x={4} y={tick.y + 4} className="timeline-tick">
            {tick.label} ms
          </text>
        </g>
      ))}
    </>
  );
}

/** One plotted hop: visible dot + transparent, keyboard-reachable hit band. */
function TimelinePoint({ point }: { point: Point }) {
  const { t, language } = useI18n();
  const { selectedHop, hoveredHop, selectHop, hoverHop } = useJourneyState();
  const style = getNetworkStyle(point.network);
  const isActive = selectedHop === point.ttl || hoveredHop === point.ttl;
  const select = () => selectHop(point.ttl);
  return (
    <g>
      <circle
        cx={point.x}
        cy={point.y}
        r={isActive ? 7 : 4}
        fill={style.color}
        stroke={isActive ? '#f8fafc' : 'none'}
        strokeWidth={2}
        className="timeline-point"
      />
      <text x={point.x} y={HEIGHT - 4} className="timeline-ttl">
        {point.ttl}
      </text>
      <rect
        x={point.x - 12}
        y={0}
        width={24}
        height={AXIS_Y}
        fill="transparent"
        tabIndex={0}
        role="button"
        aria-label={`${t('hop.title', { ttl: point.ttl })} — ${formatMs(point.delay, language)}`}
        data-testid={`timeline-point-${point.ttl}`}
        onMouseEnter={() => hoverHop(point.ttl)}
        onMouseLeave={() => hoverHop(null)}
        onFocus={() => hoverHop(point.ttl)}
        onClick={select}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            select();
          }
        }}
      />
    </g>
  );
}

/**
 * Delay timeline (VOY-F-31): hops on a millisecond axis, synchronised with
 * the map — hovering one highlights the other. The roadmap table is the
 * accessible equivalent, so the SVG itself is a labelled image.
 */
export function DelayTimeline({ journey }: { journey: Journey }) {
  const { t, language } = useI18n();
  const { points, maxDelay } = timelinePoints(journey);
  return (
    <figure className="timeline">
      <figcaption>{t('summary.delay')}</figcaption>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${t('summary.delay')} ${formatMs(journey.summary.rtt_ms, language)}`}
        data-testid="delay-timeline"
      >
        <TimelineAxis maxDelay={maxDelay} />
        <polyline points={polyline(points)} className="timeline-line" />
        {points.map((point) => (
          <TimelinePoint key={point.ttl} point={point} />
        ))}
      </svg>
    </figure>
  );
}
