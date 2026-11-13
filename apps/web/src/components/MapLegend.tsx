import type { Journey } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import { getNetworkStyle } from '../lib/styling.ts';

const CERTAINTIES = [
  { key: 'measured', dash: 'none', label: 'measured' },
  { key: 'inferred', dash: '6 4', label: 'inferred' },
  { key: 'assumed', dash: '2 3', label: 'assumed' },
] as const;

function networksOf(journey: Journey): string[] {
  const seen = new Set<string>();
  for (const hop of journey.hops) {
    const label = hop.as_name ?? (hop.asn ? `AS${hop.asn}` : null);
    if (label) seen.add(label);
  }
  return Array.from(seen).sort();
}

/** The three certainty stroke styles, each with its label (VOY-N-08). */
function CertaintyLegend() {
  const { t } = useI18n();
  return (
    <>
      <h4>{t('map.legendCertainty')}</h4>
      <ul className="legend-certainty">
        {CERTAINTIES.map((certainty) => (
          <li key={certainty.key} data-testid={`legend-certainty-${certainty.key}`}>
            <svg width="34" height="10" aria-hidden="true">
              <line
                x1="0"
                y1="5"
                x2="34"
                y2="5"
                stroke="#94a3b8"
                strokeWidth="2.5"
                strokeDasharray={certainty.dash === 'none' ? undefined : certainty.dash}
              />
            </svg>
            <span>{certainty.label}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * Map legend (§12.3, VOY-N-08): one colour per network **and** a distinct
 * stroke pattern, plus the certainty styles — certainty is never carried by
 * colour alone.
 */
export function MapLegend({ journey }: { journey: Journey }) {
  const { t } = useI18n();
  const networks = networksOf(journey);
  return (
    <aside className="map-legend" aria-label={t('map.legendTitle')} data-testid="map-legend">
      <h3>{t('map.legendTitle')}</h3>
      <ul className="legend-networks">
        {networks.map((network) => {
          const style = getNetworkStyle(network);
          return (
            <li key={network} data-testid={`legend-network-${network}`}>
              <svg width="34" height="10" aria-hidden="true">
                <line
                  x1="0"
                  y1="5"
                  x2="34"
                  y2="5"
                  stroke={style.color}
                  strokeWidth="2.5"
                  strokeDasharray={style.dashArray === 'none' ? undefined : style.dashArray}
                />
              </svg>
              <span>
                {network} <em className="legend-pattern">({style.name})</em>
              </span>
            </li>
          );
        })}
      </ul>
      <CertaintyLegend />
      <p className="legend-note">{t('map.rejectedLegend')}</p>
    </aside>
  );
}
