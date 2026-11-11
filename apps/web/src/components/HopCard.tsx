import type { ReactNode } from 'react';
import type { Hop, Rejection } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import { formatInteger, formatMs, formatNumber } from '../lib/format.ts';

interface SectionProps {
  title: string;
  level?: 'measured' | 'inferred' | 'assumed';
  children: ReactNode;
}

function Section({ title, level, children }: SectionProps) {
  return (
    <section className={`card-section level-${level ?? 'none'}`}>
      <h3>
        {title}
        {level ? <span className="level-badge">{level}</span> : null}
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

/** The retained location, its level, its sources — and the rejections. */
export function HopLocationSection({ hop }: { hop: Hop }) {
  const { t, language } = useI18n();
  const location = hop.location;
  return (
    <Section title={t('hop.location')} level="inferred">
      {location ? (
        <>
          <p className="card-line" data-testid="hop-city">
            <strong>
              {location.city}
              {location.country ? `, ${location.country}` : ''}
            </strong>{' '}
            <span className="level-badge">{location.level}</span>
          </p>
          <p className="card-line">
            {t('hop.certainty')}: {formatNumber(location.confidence * 100, language)}%
          </p>
          <p className="card-line" data-testid="hop-sources">
            {t('hop.sources')}: {location.sources.join(', ') || '—'}
          </p>
        </>
      ) : (
        <p className="card-line" data-testid="hop-not-located">
          {t('hop.notLocated')}
        </p>
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
