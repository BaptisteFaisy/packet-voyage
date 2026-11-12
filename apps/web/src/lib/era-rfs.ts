/**
 * The commissioning timeline of the compatible cables (§5.4): which years the
 * dataset dates them to, where the chosen year stands among them, and how many
 * carry no year at all — the blind spot of the dataset, stated as a count
 * instead of being hidden.
 *
 * Pure: no React, no DOM. The component renders what this returns.
 */
import type { EraCable } from '@packet-voyage/core';

export interface RfsTimeline {
  /** The distinct commissioning years of the cables, ascending. */
  years: number[];
  /** Cables the dataset leaves undated: the timeline cannot place them. */
  undated: number;
  /** Cables already in service in the chosen year. */
  inService: number;
  /** First year of the axis, the chosen year included. */
  from: number;
  /** Last year of the axis, the chosen year included. */
  to: number;
  /** Where the chosen year stands on the axis, in percent (0 when undated). */
  position: number;
}

function yearsOf(cables: EraCable[]): number[] {
  const years = new Set<number>();
  for (const cable of cables) {
    if (cable.rfs_year !== null) years.add(cable.rfs_year);
  }
  return [...years].sort((a, b) => a - b);
}

function countWhere(cables: EraCable[], keep: (cable: EraCable) => boolean): number {
  return cables.filter(keep).length;
}

/**
 * Build the timeline. The axis always spans the chosen year, so a year earlier
 * (or later) than every dated cable still has a place on it: the marker sits at
 * an end instead of falling off the frise. When no cable is dated, the axis
 * holds the chosen year alone and the marker sits at its start.
 */
export function rfsTimeline(cables: EraCable[], year: number): RfsTimeline {
  const years = yearsOf(cables);
  const undated = countWhere(cables, (cable) => cable.rfs_year === null);
  const inService = countWhere(
    cables,
    (cable) => cable.rfs_year !== null && cable.rfs_year <= year,
  );
  if (years.length === 0) {
    return { years, undated, inService, from: year, to: year, position: 0 };
  }
  const first = years[0] ?? year;
  const last = years[years.length - 1] ?? year;
  const from = Math.min(first, year);
  const to = Math.max(last, year);
  const position = to === from ? 0 : ((year - from) / (to - from)) * 100;
  return { years, undated, inService, from, to, position };
}
