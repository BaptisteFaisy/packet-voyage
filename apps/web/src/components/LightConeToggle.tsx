import { useI18n } from '../i18n/context.tsx';

export interface LightConeToggleProps {
  enabled: boolean;
  onToggle: (next: boolean) => void;
}

/**
 * Shows or hides the light cone: the disc of positions each measured delay still
 * allows (§7.6). Off by default, because the map is a route, not a set of bounds.
 */
export function LightConeToggle({ enabled, onToggle }: LightConeToggleProps) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="light-cone-toggle"
      aria-pressed={enabled}
      onClick={() => onToggle(!enabled)}
      title={t('map.lightConeHint')}
      data-testid="light-cone-toggle"
    >
      {t('map.lightCone')}
    </button>
  );
}
