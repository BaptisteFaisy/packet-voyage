import type { Journey, Stamp } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';

/** Stamps derived from the journey itself when L5 has not built them. */
export function stampsOf(journey: Journey): Stamp[] {
  const countries = new Map<string, number>();
  const networks = new Map<string, number>();
  const ixps = new Map<string, number>();
  for (const hop of journey.hops) {
    const country = hop.location?.country;
    if (country) countries.set(country, (countries.get(country) ?? 0) + 1);
    const network = hop.as_name ?? (hop.asn ? `AS${hop.asn}` : null);
    if (network) networks.set(network, (networks.get(network) ?? 0) + 1);
    if (hop.ixp) ixps.set(hop.ixp, (ixps.get(hop.ixp) ?? 0) + 1);
  }
  const toStamps = (kind: Stamp['kind'], map: Map<string, number>): Stamp[] =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ kind, label, count }));
  return [
    ...toStamps('country', countries),
    ...toStamps('network', networks),
    ...toStamps('ixp', ixps),
  ];
}

const GROUP_LABEL: Record<Stamp['kind'], string> = {
  country: 'story.stampCountries',
  network: 'story.stampNetworks',
  ixp: 'story.stampIxps',
};

/**
 * Passport (VOY-F-35): one stamp per country of a located hop, per network
 * and per exchange point — the visible trace of the journey.
 */
export function PassportView({ journey }: { journey: Journey }) {
  const { t } = useI18n();
  const stamps = stampsOf(journey);
  const groups: Stamp['kind'][] = ['country', 'network', 'ixp'];

  return (
    <section className="passport-view" data-testid="passport-view">
      <h2>{t('story.passportTitle')}</h2>
      {groups.map((kind) => {
        const group = stamps.filter((stamp) => stamp.kind === kind);
        if (group.length === 0) return null;
        return (
          <div key={kind} className="passport-group" data-testid={`passport-${kind}`}>
            <h3>{t(GROUP_LABEL[kind] as 'story.stampCountries')}</h3>
            <ul className="stamp-grid">
              {group.map((stamp) => (
                <li key={`${kind}-${stamp.label}`} className="stamp" data-testid={`stamp-${stamp.label}`}>
                  <span className="stamp-label">{stamp.label}</span>
                  <span className="stamp-count mono">×{stamp.count}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
