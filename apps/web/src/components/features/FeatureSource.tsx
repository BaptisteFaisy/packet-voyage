/**
 * Which data the catalogue is demonstrating, said out loud.
 *
 * A page that shows "everything the tool does" on a sample while the visitor has
 * their own journey loaded would be ambiguous, and ambiguity about whose data is
 * on screen is exactly what the honesty contract forbids. So the source is
 * named — yours, with its target and trace date, or the gallery's, with its
 * title — and the visitor can switch between the two.
 */
import type { Journey } from '@packet-voyage/schema';
import { useI18n } from '../../i18n/context.tsx';
import { formatDate } from '../../lib/format.ts';

export type FeatureSourceKind = 'yours' | 'gallery';

export interface FeatureSourceProps {
  kind: FeatureSourceKind;
  journey: Journey | null;
  /** Title of the demonstrated journey: the gallery's, or the label of yours. */
  title: string;
  /** Label of the button showing the other source; null when there is none. */
  switchLabel: string | null;
  onSwitch: (() => void) | null;
}

export function FeatureSource({ kind, journey, title, switchLabel, onSwitch }: FeatureSourceProps) {
  const { t, language } = useI18n();
  const yours = kind === 'yours' && journey !== null;
  const label = yours
    ? t('features.sourceYours', {
        target: journey?.target.host ?? title,
        date: formatDate(journey?.traced_at ?? '', language),
      })
    : t('features.sourceGallery', { title });
  const hint = yours ? t('features.sourceYoursHint') : t('features.sourceGalleryHint');

  return (
    <p className="feature-source notice" role="status" data-testid="feature-source">
      <strong data-testid="feature-source-label">{label}</strong> <span className="hint">{hint}</span>{' '}
      {onSwitch && switchLabel ? (
        <button
          type="button"
          className="link-button"
          onClick={onSwitch}
          data-testid="feature-source-switch"
        >
          {switchLabel}
        </button>
      ) : null}
    </p>
  );
}
