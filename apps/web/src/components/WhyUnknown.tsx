/**
 * "Why we cannot know more" (§7.6, §5.4): the honest band that stands next to
 * a value the tool only assumed or only inferred. It names what blocks the
 * knowledge instead of dressing a guess up as a number.
 *
 * The wording comes from the shared dictionary (`why.*`): this component only
 * chooses the lines that fit the value it is given. A measured value is
 * blocked by nothing, so the band then says nothing and renders nothing.
 *
 * Inline-safe: the root is a `span`, so the band can be mounted inside a list
 * item, a paragraph or a heading without breaking the document.
 */
import type { Certainty } from '@packet-voyage/schema';
import { useI18n } from '../i18n/context.tsx';
import type { I18nValue } from '../i18n/context.tsx';

type Translate = I18nValue['t'];

export interface WhyUnknownProps {
  /** The level of the value the band explains. */
  certainty: Certainty;
  /** The sources that carried this value, if any did. */
  sources?: string[];
  /** The place the value names, when it names one. */
  city?: string;
  /** True when no source placed the hop: the band then says exactly that. */
  unlocated?: boolean;
  /** Extra blockers the caller carries, listed verbatim after the shared ones. */
  blockers?: string[];
  /** Test id of the band; the caller names it after the value it explains. */
  testId?: string;
}

const BLOCK_STYLE = { display: 'block' } as const;

/**
 * An assumed value: what the drawn path, the cable choice and the distance all
 * have in common is that nothing observes them. When the caller says no source
 * placed the hop, that is the only honest line; when a place is named but no
 * source carried it, both are said.
 */
function assumedReasons(
  city: string | undefined,
  sources: string[],
  unlocated: boolean,
  t: Translate,
): string[] {
  if (unlocated) return [t('why.unlocated')];
  const lines = [t('why.assumed.path'), t('why.assumed.cables'), t('why.assumed.distance')];
  if (city && sources.length === 0) lines.push(t('why.unlocated'));
  return lines;
}

/** An inferred value: the sources say where it comes from, and the bound says what it cannot do. */
function inferredReasons(sources: string[], t: Translate): string[] {
  if (sources.length === 0) return [t('why.unknown')];
  return [t('why.inferred.city', { sources: sources.join(', ') })];
}

/** The lines that fit a certainty level; empty for a measured value. */
function reasonsFor(
  certainty: Certainty,
  sources: string[],
  city: string | undefined,
  unlocated: boolean,
  t: Translate,
): string[] {
  if (certainty === 'assumed') return assumedReasons(city, sources, unlocated, t);
  if (certainty === 'inferred') return inferredReasons(sources, t);
  return [];
}

/**
 * The band itself. It renders nothing when the value is measured: inventing a
 * blocker for a measured number would be the one lie this component must never
 * tell.
 */
export function WhyUnknown(props: WhyUnknownProps) {
  const { t } = useI18n();
  const { certainty, sources = [], city, unlocated = false, blockers = [], testId } = props;
  const lines = [...reasonsFor(certainty, sources, city, unlocated, t), ...blockers];
  if (lines.length === 0) return null;
  return (
    <span
      className="why-unknown"
      role="note"
      data-testid={testId}
      style={BLOCK_STYLE}
    >
      <span className="why-unknown-title" style={BLOCK_STYLE}>
        {t('why.title')}
      </span>
      <span className="why-unknown-list" style={BLOCK_STYLE}>
        {lines.map((line, index) => (
          <span
            key={`${index}-${line}`}
            className="why-unknown-line"
            data-testid={`why-unknown-line-${index}`}
            style={BLOCK_STYLE}
          >
            {line}
          </span>
        ))}
      </span>
    </span>
  );
}
