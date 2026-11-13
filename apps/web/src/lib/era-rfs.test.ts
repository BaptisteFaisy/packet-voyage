/**
 * The commissioning timeline of the compatible cables: the years, the place of
 * the chosen year on the axis, and the cables the dataset leaves undated.
 */
import { describe, expect, it } from 'vitest';
import type { EraCable } from '@packet-voyage/core';
import { rfsTimeline } from './era-rfs.ts';

function cable(id: string, rfs_year: number | null): EraCable {
  return { id, name: id.toUpperCase(), rfs_year, length_km: null, compatibility: 0.8, band: 'high' };
}

describe('rfsTimeline', () => {
  it('collects the distinct years, ascending, and counts the undated', () => {
    const cables = [cable('a', 2000), cable('b', 1988), cable('c', 2000), cable('d', null)];
    const timeline = rfsTimeline(cables, 1995);
    expect(timeline.years).toEqual([1988, 2000]);
    expect(timeline.undated).toBe(1);
    expect(timeline.inService).toBe(1);
  });

  it('spans the chosen year and places it on the axis', () => {
    const timeline = rfsTimeline([cable('a', 1990), cable('b', 2010)], 2000);
    expect(timeline.from).toBe(1990);
    expect(timeline.to).toBe(2010);
    expect(timeline.position).toBe(50);
  });

  it('keeps the marker on the axis when the chosen year is outside it', () => {
    const cables = [cable('a', 1990), cable('b', 2010)];
    expect(rfsTimeline(cables, 1980).position).toBe(0);
    expect(rfsTimeline(cables, 1980).from).toBe(1980);
    expect(rfsTimeline(cables, 2020).position).toBe(100);
    expect(rfsTimeline(cables, 2020).to).toBe(2020);
  });

  it('counts every dated cable in service once the year is past them all', () => {
    const cables = [cable('a', 1990), cable('b', 2010), cable('c', null)];
    const timeline = rfsTimeline(cables, 2026);
    expect(timeline.inService).toBe(2);
    expect(timeline.undated).toBe(1);
    expect(timeline.position).toBe(100);
  });

  it('holds the chosen year alone when nothing is dated', () => {
    const timeline = rfsTimeline([cable('a', null), cable('b', null)], 1987);
    expect(timeline.years).toEqual([]);
    expect(timeline.position).toBe(0);
    expect(timeline.from).toBe(1987);
    expect(timeline.to).toBe(1987);
    expect(timeline.undated).toBe(2);
    expect(timeline.inService).toBe(0);
  });

  it('accepts an empty cable list', () => {
    const timeline = rfsTimeline([], 1987);
    expect(timeline).toMatchObject({ years: [], undated: 0, inService: 0, position: 0 });
  });
});
