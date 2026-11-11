import type { KeyboardEvent } from 'react';
import type { Hop, Journey } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import { formatMs } from '../lib/format.ts';
import { useJourneyState } from '../state/journey.tsx';

function hopSummary(hop: Hop): string {
  const reply = hop.replies[0];
  const ip = reply?.ip && reply.ip !== '' ? reply.ip : '*';
  const city = hop.location?.city ?? null;
  const level = hop.location?.level ?? 'unlocated';
  return city ? `${ip} · ${city} (${level})` : `${ip} · not located`;
}

interface ItemProps {
  hop: Hop;
  index: number;
  focusHop: number | null;
  selectedHop: number | null;
  hoveredHop: number | null;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, index: number, hop: Hop) => void;
}

/** One entry of the hop list; roving tabindex keeps a single stop (§12.4). */
function HopListItem({ hop, index, focusHop, selectedHop, hoveredHop, onKeyDown }: ItemProps) {
  const { t, language } = useI18n();
  const { selectHop, hoverHop, setFocusHop } = useJourneyState();
  const isSelected = selectedHop === hop.ttl;
  const isHovered = hoveredHop === hop.ttl;
  const label = `${t('hop.title', { ttl: hop.ttl })} — ${hopSummary(hop)}`;
  return (
    <li>
      <button
        type="button"
        className={`hop-item${isSelected ? ' is-selected' : ''}${isHovered ? ' is-hovered' : ''}`}
        tabIndex={focusHop === null ? (index === 0 ? 0 : -1) : focusHop === hop.ttl ? 0 : -1}
        aria-current={isSelected ? 'true' : undefined}
        aria-label={label}
        data-testid={`hop-item-${hop.ttl}`}
        onClick={() => {
          setFocusHop(hop.ttl);
          selectHop(hop.ttl);
        }}
        onMouseEnter={() => hoverHop(hop.ttl)}
        onMouseLeave={() => hoverHop(null)}
        onFocus={() => setFocusHop(hop.ttl)}
        onKeyDown={(event) => onKeyDown(event, index, hop)}
      >
        <span className="hop-ttl mono">{hop.ttl}</span>
        <span className="hop-main">
          <span className="hop-ip mono">{hop.replies[0]?.ip || '*'}</span>
          <span className="hop-city">
            {hop.location ? `${hop.location.city} (${hop.location.level})` : t('hop.notLocated')}
          </span>
        </span>
        <span className="hop-delay mono">{formatMs(hop.envelope_ms ?? null, language)}</span>
      </button>
    </li>
  );
}

/**
 * Left column of the journey screen: the hop list. Roving keyboard focus —
 * arrows move the cursor, Enter opens the card (§12.4, VOY-F-34).
 */
export function HopList({ journey }: { journey: Journey }) {
  const { t } = useI18n();
  const { selectedHop, hoveredHop, focusHop, selectHop, hoverHop, setFocusHop, announce } =
    useJourneyState();

  const move = (index: number, delta: number) => {
    const nextIndex = Math.min(journey.hops.length - 1, Math.max(0, index + delta));
    const hop = journey.hops[nextIndex];
    if (!hop) return;
    setFocusHop(hop.ttl);
    hoverHop(hop.ttl);
    announce(`${t('hop.title', { ttl: hop.ttl })} — ${hopSummary(hop)}`);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number, hop: Hop) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      move(index, 1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      move(index, -1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectHop(hop.ttl);
      announce(`${t('hop.title', { ttl: hop.ttl })} — ${hopSummary(hop)}`);
    }
  };

  return (
    <nav className="hop-list" aria-label={t('hop.listLabel')}>
      <ol>
        {journey.hops.map((hop, index) => (
          <HopListItem
            key={hop.ttl}
            hop={hop}
            index={index}
            focusHop={focusHop}
            selectedHop={selectedHop}
            hoveredHop={hoveredHop}
            onKeyDown={onKeyDown}
          />
        ))}
      </ol>
    </nav>
  );
}
