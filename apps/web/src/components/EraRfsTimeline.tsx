/**
 * The commissioning years of the compatible cables, as a frise (§5.4): the
 * years the dataset dates them to, the place of the chosen year among them,
 * and the cables the dataset leaves undated.
 *
 * The frise says when a cable entered service, never that it carried the
 * packet: compatibility is all the measurement gives.
 */
import type { EraCable } from '@packet-voyage/core';
import { useI18n } from '../i18n/context.tsx';
import { rfsTimeline } from '../lib/era-rfs.ts';

export interface EraRfsTimelineProps {
  /** The cables compatible with the crossings of the journey. */
  cables: EraCable[];
  /** The year the reader compares the journey with. */
  year: number;
}

/** One tick per commissioning year, dated before the chosen year or not. */
function YearTicks(props: { years: number[]; year: number }) {
  return (
    <ol className="era-rfs-years" data-testid="era-rfs-years">
      {props.years.map((rfsYear) => (
        <li
          key={rfsYear}
          className="era-rfs-year"
          data-testid={`era-rfs-year-${rfsYear}`}
          data-in-service={rfsYear <= props.year ? 'true' : 'false'}
        >
          {rfsYear}
        </li>
      ))}
    </ol>
  );
}

export function EraRfsTimeline(props: EraRfsTimelineProps) {
  const { t } = useI18n();
  const { cables, year } = props;
  const timeline = rfsTimeline(cables, year);
  return (
    <div className="era-rfs" data-testid="era-rfs-timeline">
      <p className="card-line" data-testid="era-rfs-title">
        {t('era.rfsTimeline')}
      </p>
      <div className="era-rfs-axis" data-testid="era-rfs-axis" style={{ position: 'relative' }}>
        {timeline.years.length > 0 ? <YearTicks years={timeline.years} year={year} /> : null}
        {/* The chosen year always has a place on the axis, even when no cable is
            dated: the frise then holds it alone. */}
        <span
          className="era-rfs-marker"
          data-testid="era-rfs-marker"
          data-year={year}
          style={{ position: 'absolute', left: `${timeline.position}%` }}
        >
          {year}
        </span>
      </div>
      <p className="card-line" data-testid="era-rfs-unknown">
        {t('era.rfsUnknown', { count: timeline.undated })}
      </p>
    </div>
  );
}
