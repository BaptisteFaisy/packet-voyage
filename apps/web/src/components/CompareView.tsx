import { useMemo, useState } from 'react';
import { useI18n } from '../i18n/context.tsx';
import type { GalleryItem } from '../lib/gallery.ts';
import { SummaryBanner } from './SummaryBanner.tsx';
import { WorldMap } from './WorldMap.tsx';

interface CompareViewProps {
  items: GalleryItem[];
}

interface SelectorsProps {
  items: GalleryItem[];
  indexA: number;
  indexB: number;
  onChangeA: (value: number) => void;
  onChangeB: (value: number) => void;
}

function JourneySelectors({ items, indexA, indexB, onChangeA, onChangeB }: SelectorsProps) {
  const { t } = useI18n();
  const labels = useMemo(() => items.map((item, index) => ({ index, title: item.en })), [items]);
  return (
    <div className="compare-selectors">
      <label>
        {t('compare.journeyA')}
        <select
          value={indexA}
          onChange={(event) => onChangeA(Number(event.target.value))}
          data-testid="compare-select-a"
        >
          {labels.map((label) => (
            <option key={`a-${label.index}`} value={label.index}>
              {label.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('compare.journeyB')}
        <select
          value={indexB}
          onChange={(event) => onChangeB(Number(event.target.value))}
          data-testid="compare-select-b"
        >
          {labels.map((label) => (
            <option key={`b-${label.index}`} value={label.index}>
              {label.title}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/**
 * Comparison (VOY-F-29, §12.1 screen 5): two journeys on the same map and
 * their summaries side by side.
 */
export function CompareView({ items }: CompareViewProps) {
  const { t } = useI18n();
  const [indexA, setIndexA] = useState(0);
  const [indexB, setIndexB] = useState(Math.min(1, Math.max(items.length - 1, 0)));
  const itemA = items[indexA] ?? null;
  const itemB = items[indexB] ?? null;

  if (!itemA || !itemB) {
    return (
      <section className="compare-view" data-testid="compare-view">
        <h2>{t('compare.title')}</h2>
        <p className="notice">{t('compare.notEnough')}</p>
      </section>
    );
  }

  return (
    <section className="compare-view" data-testid="compare-view">
      <h2>{t('compare.title')}</h2>
      <p>{t('compare.description')}</p>
      <JourneySelectors
        items={items}
        indexA={indexA}
        indexB={indexB}
        onChangeA={setIndexA}
        onChangeB={setIndexB}
      />
      <WorldMap journey={itemA.journey} secondary={itemB.journey} />
      <div className="compare-banners">
        <div data-testid="compare-banner-a">
          <h3>{itemA.en}</h3>
          <SummaryBanner journey={itemA.journey} />
        </div>
        <div data-testid="compare-banner-b">
          <h3>{itemB.en}</h3>
          <SummaryBanner journey={itemB.journey} />
        </div>
      </div>
    </section>
  );
}
