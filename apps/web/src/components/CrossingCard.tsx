import type { CableMatch, Journey, Segment } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import { usePreferences } from '../state/preferences.tsx';
import { formatInteger, formatMs, formatQualifiedDistance } from '../lib/format.ts';

const KIND_LABELS: Record<Segment['kind'], string> = {
  local: 'Same city',
  undetermined: 'Overland or undersea: cannot tell',
  sea: 'Sea crossing',
  'sea-or-fixed': 'Sea crossing or fixed link',
};

function CableLine({ cable }: { cable: CableMatch }) {
  const { t, language } = useI18n();
  return (
    <li className="cable-line" data-testid={`cable-${cable.id}`}>
      <span className={`band band-${cable.band}`}>{cable.band}</span>
      <strong>{cable.name}</strong>
      <span className="cable-detail">
        {t('crossing.compatibility')}: {cable.compatibility.toFixed(2)} · {t('crossing.landings')}:{' '}
        {cable.landings.join(' / ') || '—'}
      </span>
      {cable.length_km ? (
        <span className="cable-detail">
          {' · '}
          {t('crossing.cableLength')}: {formatInteger(cable.length_km, language)} km
        </span>
      ) : null}
      {cable.rfs_year ? <span className="cable-detail"> · RFS {cable.rfs_year}</span> : null}
    </li>
  );
}

function cityOf(journey: Journey, ttl: number): string {
  const hop = journey.hops.find((entry) => entry.ttl === ttl);
  return hop?.location?.city ?? `hop ${ttl}`;
}

/** Nature, distance ("at least"), delay, skipped hops, fixed link. */
function CrossingFacts({ segment }: { segment: Segment }) {
  const { t, language } = useI18n();
  const { prefs } = usePreferences();
  return (
    <dl>
      <div>
        <dt>{t('crossing.nature')}</dt>
        <dd data-testid="crossing-kind">{KIND_LABELS[segment.kind]}</dd>
      </div>
      <div>
        <dt>{t('crossing.distance')}</dt>
        <dd data-testid="crossing-distance">
          {formatQualifiedDistance(segment.geodesic_km, prefs.unit, language)}
        </dd>
      </div>
      <div>
        <dt>{t('crossing.delay')}</dt>
        <dd>{formatMs(segment.delta_ms, language)}</dd>
      </div>
      <div>
        <dt>{t('crossing.skippedHops')}</dt>
        <dd>{segment.skipped_hops}</dd>
      </div>
      {segment.fixed_link ? (
        <div>
          <dt>{t('crossing.fixedLink')}</dt>
          <dd>{segment.fixed_link}</dd>
        </div>
      ) : null}
    </dl>
  );
}

/** Ranked compatible cables + the honesty sentence (§5.4). */
function CableRanking({ segment }: { segment: Segment }) {
  const { t } = useI18n();
  const ranked = [...segment.cables].sort((a, b) => b.compatibility - a.compatibility);
  if (ranked.length === 0) return <p className="card-line">{t('crossing.noCables')}</p>;
  return (
    <section className="card-section level-assumed">
      <h3>
        {t('crossing.cablesTitle')}
        <span className="level-badge">assumed</span>
      </h3>
      <ol className="cable-list">
        {ranked.map((cable) => (
          <CableLine key={cable.id} cable={cable} />
        ))}
      </ol>
      {segment.other_cables > 0 ? (
        <p className="card-line">{t('crossing.otherCables', { count: segment.other_cables })}</p>
      ) : null}
      <p className="honesty-line" data-testid="crossing-honesty">
        {t('crossing.honestyDisclaimer')}
      </p>
    </section>
  );
}

/**
 * Crossing card (§12.1 screen 4, VOY-F-23): segment nature, distance ("at
 * least"), delay, the compatible cables ranked by band, and the sentence
 * saying that nothing tells which one carried the packet.
 */
export function CrossingCard({ journey, segment }: { journey: Journey; segment: Segment }) {
  const { t } = useI18n();
  const from = cityOf(journey, segment.from_ttl);
  const to = cityOf(journey, segment.to_ttl);
  return (
    <article
      className="crossing-card"
      data-testid={`crossing-card-${segment.from_ttl}-${segment.to_ttl}`}
      aria-label={t('crossing.title', { from: segment.from_ttl, to: segment.to_ttl })}
    >
      <h2>{t('crossing.title', { from: segment.from_ttl, to: segment.to_ttl })}</h2>
      <p className="crossing-route">
        {from} → {to}
      </p>
      <CrossingFacts segment={segment} />
      <CableRanking segment={segment} />
    </article>
  );
}
