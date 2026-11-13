import type { ReactNode } from 'react';
import type {
  ConfidenceLevel,
  Hop,
  Location as HopLocation,
  Rejection,
} from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import { formatInteger, formatMs, formatNumber } from '../lib/format.ts';
import { CertaintyInspector } from './CertaintyInspector.tsx';
import { RejectedExplainer } from './RejectedExplainer.tsx';
import { RejectionContrast } from './RejectionContrast.tsx';
import { WhyUnknown } from './WhyUnknown.tsx';

interface SectionProps {
  title: string;
  level?: 'measured' | 'inferred' | 'assumed';
  children: ReactNode;
}

/** The band of a hop no source placed: there is no city to name it after. */
const UNLOCATED_TEST_ID = 'why-unknown-unlocated';

/** Test id of the band, named after the place it explains (as `rejection-…`). */
function whyTestId(city: string): string {
  return `why-unknown-${city.trim().replace(/\s+/g, '-')}`;
}

/**
 * A location is assumed when nothing agrees on it: `uncertain` means the
 * candidates contradict each other, `unlocated` means none won. Both deserve
 * the "why we cannot know more" band; a `solid` or `probable` one does not.
 */
function isAssumed(level: ConfidenceLevel): boolean {
  return level === 'uncertain' || level === 'unlocated';
}

function Section({ title, level, children }: SectionProps) {
  return (
    <section className={`card-section level-${level ?? 'none'}`}>
      <h3>
        {title}
        {level ? <CertaintyInspector certainty={level} label={level} /> : null}
      </h3>
      {children}
    </section>
  );
}

function RejectionLine({ rejection, envelopeMs }: { rejection: Rejection; envelopeMs: number | null }) {
  const { t, language } = useI18n();
  const country = rejection.country ?? '??';
  const allowedText =
    envelopeMs !== null
      ? t('hop.rejectedDetail', {
          city: rejection.city,
          country,
          allowed: formatMs(envelopeMs, language),
          allowedKm: `${formatInteger(rejection.allowed_km, language)} km`,
          neededKm: `${formatInteger(rejection.needed_km, language)} km`,
        })
      : `${rejection.city}, ${country} — ${t('hop.rejectedPrefix')} ${formatInteger(rejection.allowed_km, language)} km`;
  return (
    <li className="rejection" data-testid={`rejection-${rejection.city}`}>
      <s>{allowedText}</s>
      <span className="rejection-reason">{rejection.reason}</span>
      <RejectedExplainer rejection={rejection} envelopeMs={envelopeMs} />
      <RejectionContrast rejection={rejection} envelopeMs={envelopeMs} />
      {/* The refused city was proposed by a source: say which, and what the
          light bound can and cannot do with it (§7.6). */}
      <WhyUnknown
        certainty="inferred"
        city={rejection.city}
        sources={[rejection.source]}
        testId={whyTestId(rejection.city)}
      />
    </li>
  );
}

/** What the probe measured: addresses, delays, loss, envelope (§5.3). */
export function HopMeasuredSection({ hop }: { hop: Hop }) {
  const { t, language } = useI18n();
  return (
    <Section title={t('hop.address')} level="measured">
      <ul className="reply-list">
        {hop.replies.map((reply, index) => (
          <li key={`${reply.ip}-${index}`} className="mono">
            {reply.ip === '' ? '*' : reply.ip}
            {reply.name ? <span className="reply-name"> ({reply.name})</span> : null}
            <span className="reply-rtt">
              {' '}
              —{' '}
              {reply.rtt_ms.length > 0
                ? reply.rtt_ms.map((rtt) => formatMs(rtt, language)).join(' / ')
                : 'no reply'}
            </span>
            {reply.loss !== undefined ? (
              <span> · loss {formatNumber(reply.loss * 100, language)}%</span>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="card-line">
        {t('hop.envelope')}: <strong>{formatMs(hop.envelope_ms, language)}</strong>
      </p>
      {hop.mpls && hop.mpls.length > 0 ? (
        <p className="card-line">
          {t('hop.flags')}: MPLS {hop.mpls.join(', ')}
        </p>
      ) : null}
    </Section>
  );
}

/** What was inferred about the network behind the address (§5.3). */
export function HopNetworkSection({ hop }: { hop: Hop }) {
  const { t } = useI18n();
  return (
    <>
      <Section title={t('hop.network')} level="inferred">
        <p className="card-line">
          {hop.asn ? `AS${hop.asn}` : 'unknown'}
          {hop.as_name ? ` — ${hop.as_name}` : ''}
        </p>
        {hop.prefix ? <p className="card-line mono">{hop.prefix}</p> : null}
        {hop.anycast ? <p className="card-line">anycast</p> : null}
      </Section>
      {hop.ixp ? (
        <Section title={t('hop.ixp')} level="inferred">
          <p className="card-line">{hop.ixp}</p>
        </Section>
      ) : null}
    </>
  );
}

/** The retained place: its name, its level, its confidence and its sources. */
function RetainedLocation({ location }: { location: HopLocation }) {
  const { t, language } = useI18n();
  return (
    <>
      <p className="card-line" data-testid="hop-city">
        <strong>
          {location.city}
          {location.country ? `, ${location.country}` : ''}
        </strong>{' '}
        <CertaintyInspector
          certainty={isAssumed(location.level) ? 'assumed' : 'inferred'}
          label={location.level}
          sources={location.sources}
        />
      </p>
      <p className="card-line">
        {t('hop.certainty')}: {formatNumber(location.confidence * 100, language)}%
      </p>
      <p className="card-line" data-testid="hop-sources">
        {t('hop.sources')}: {location.sources.join(', ') || '—'}
      </p>
      {isAssumed(location.level) ? (
        <WhyUnknown
          certainty="assumed"
          city={location.city}
          sources={location.sources}
          testId={whyTestId(location.city)}
        />
      ) : null}
    </>
  );
}

/** The retained location, its level, its sources — and the rejections. */
export function HopLocationSection({ hop }: { hop: Hop }) {
  const { t } = useI18n();
  const location = hop.location;
  return (
    <Section title={t('hop.location')} level="inferred">
      {location ? (
        <RetainedLocation location={location} />
      ) : (
        <>
          <p className="card-line" data-testid="hop-not-located">
            {t('hop.notLocated')}
          </p>
          <WhyUnknown certainty="assumed" unlocated testId={UNLOCATED_TEST_ID} />
        </>
      )}
      {location && location.rejected.length > 0 ? (
        <>
          <h4>{t('hop.rejectedCandidate')}</h4>
          <ul className="rejection-list">
            {location.rejected.map((rejection, index) => (
              <RejectionLine
                key={`${rejection.city}-${rejection.source}-${index}`}
                rejection={rejection}
                envelopeMs={hop.envelope_ms ?? null}
              />
            ))}
          </ul>
        </>
      ) : null}
    </Section>
  );
}

/**
 * Hop card (§12.1 screen 3, VOY-F-32): what is measured (address, delays,
 * loss), what is inferred (network, city, IXP) with its sources and level,
 * and the rejected candidates with their reason and numbers.
 */
export function HopCard({ hop }: { hop: Hop }) {
  const { t } = useI18n();
  return (
    <article
      className="hop-card"
      data-testid={`hop-card-${hop.ttl}`}
      aria-label={t('hop.title', { ttl: hop.ttl })}
    >
      <h2>{t('hop.title', { ttl: hop.ttl })}</h2>
      <HopMeasuredSection hop={hop} />
      <HopNetworkSection hop={hop} />
      <HopLocationSection hop={hop} />
    </article>
  );
}
