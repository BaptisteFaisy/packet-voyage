import { describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { localOffsetLabel, localOffsetMinutes, localTimeAt, localTimeAtHop } from './clocks.ts';

/** Seeds recorded so a counter-example can be replayed (§13). */
const SEED = 20261120;

/** A moment of the day, as the ISO instant the journey carries. */
const AT = '2026-11-12T09:14:03Z';

function mod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function minutesOf(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number) as [number, number];
  return hours * 60 + minutes;
}

function instantAt(minutesOfDay: number): string {
  const hours = Math.floor(minutesOfDay / 60);
  const minutes = minutesOfDay % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `2026-11-12T${pad(hours)}:${pad(minutes)}:00Z`;
}

describe('the inferred offset (§7.12)', () => {
  it('reads the longitude on a quarter-hour grid', () => {
    expect(localOffsetMinutes(0)).toBe(0);
    expect(localOffsetMinutes(15)).toBe(60);
    expect(localOffsetMinutes(30)).toBe(120);
    expect(localOffsetMinutes(-75)).toBe(-300);
    expect(localOffsetMinutes(7.5)).toBe(30);
    expect(localOffsetMinutes(86.25)).toBe(345);
  });

  it('is solar, not political: Paris reads a quarter-hour, not the French zone', () => {
    expect(localOffsetMinutes(2.3522)).toBe(15);
    expect(localOffsetLabel(2.3522)).toBe('UTC+0.25');
    expect(localOffsetMinutes(-74.006)).toBe(-300);
  });

  it('stays inside ±12 h, whatever the longitude given', () => {
    expect(localOffsetMinutes(180)).toBe(720);
    expect(localOffsetMinutes(-180)).toBe(-720);
    expect(localOffsetMinutes(400)).toBe(720);
    expect(localOffsetMinutes(-400)).toBe(-720);
    expect(localOffsetMinutes(Number.NaN)).toBe(0);
    expect(localOffsetMinutes(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it(`follows lon/15 within 30 minutes, on a 15-minute step (seed ${SEED})`, () => {
    fc.assert(
      fc.property(fc.double({ min: -180, max: 180, noNaN: true }), (lon) => {
        const offset = localOffsetMinutes(lon);
        expect(offset % 15 === 0).toBe(true);
        expect(Math.abs(offset)).toBeLessThanOrEqual(720);
        // The exact solar offset is lon/15 hours: the grid never moves it by
        // more than half a step, so never by more than 30 minutes.
        expect(Math.abs(offset / 60 - lon / 15) * 60).toBeLessThanOrEqual(30);
        expect(Math.abs(offset - lon * 4)).toBeLessThanOrEqual(7.5);
      }),
      { seed: SEED, numRuns: 400 },
    );
  });
});

describe('the offset label', () => {
  it('says UTC at the meridian, and signs the rest', () => {
    expect(localOffsetLabel(0)).toBe('UTC');
    expect(localOffsetLabel(30)).toBe('UTC+2');
    expect(localOffsetLabel(-75)).toBe('UTC-5');
    expect(localOffsetLabel(7.5)).toBe('UTC+0.5');
    expect(localOffsetLabel(86.25)).toBe('UTC+5.75');
    expect(localOffsetLabel(180)).toBe('UTC+12');
    expect(localOffsetLabel(-180)).toBe('UTC-12');
  });

  it(`never shows more than two decimals (seed ${SEED})`, () => {
    fc.assert(
      fc.property(fc.double({ min: -180, max: 180, noNaN: true }), (lon) => {
        const label = localOffsetLabel(lon);
        expect(label).toMatch(/^UTC([+-]\d{1,2}(\.\d{1,2})?)?$/);
        const shown = label === 'UTC' ? '0' : label.slice(4);
        expect(Number(shown)).toBe(Number(Number(shown).toFixed(2)));
      }),
      { seed: SEED, numRuns: 300 },
    );
  });
});

describe('the local hour at an instant', () => {
  it('adds the offset to the given instant, and only to it', () => {
    expect(localTimeAt(0, AT)).toBe('09:14');
    expect(localTimeAt(30, AT)).toBe('11:14');
    expect(localTimeAt(-75, AT)).toBe('04:14');
    expect(localTimeAt(86.25, AT)).toBe('14:59');
  });

  it('wraps around midnight in both directions', () => {
    expect(localTimeAt(180, '2026-11-12T23:30:00Z')).toBe('11:30');
    expect(localTimeAt(-180, '2026-11-12T00:10:00Z')).toBe('12:10');
    expect(localTimeAt(-15, '2026-11-12T00:30:00Z')).toBe('23:30');
  });

  it('reads a zoned instant as the same moment', () => {
    expect(localTimeAt(0, '2026-11-12T11:14:03+02:00')).toBe('09:14');
    expect(localTimeAt(0, '2026-11-12T04:14:03-05:00')).toBe('09:14');
    expect(localTimeAt(0, '2026-11-12T09:14:03.123Z')).toBe('09:14');
    expect(localTimeAt(0, '2026-11-12T09:14Z')).toBe('09:14');
  });

  it('refuses anything that is not an instant, instead of guessing', () => {
    expect(() => localTimeAt(0, 'yesterday')).toThrow(RangeError);
    expect(() => localTimeAt(0, '')).toThrow(RangeError);
    expect(() => localTimeAt(0, '12/11/2026 09:14')).toThrow(RangeError);
  });

});

describe('the local hour of a hop', () => {
  it('bundles the hour, the label and the offset for one hop', () => {
    expect(localTimeAtHop(2.3522, AT)).toEqual({
      time: '09:29',
      offset: 'UTC+0.25',
      offsetMinutes: 15,
    });
    expect(localTimeAtHop(-74.006, AT)).toEqual({
      time: '04:14',
      offset: 'UTC-5',
      offsetMinutes: -300,
    });
  });

  it(`keeps the hour on the grid, for any longitude and any instant (seed ${SEED})`, () => {
    fc.assert(
      fc.property(
        fc.double({ min: -180, max: 180, noNaN: true }),
        fc.integer({ min: 0, max: 1439 }),
        (lon, utcMinutes) => {
          const time = localTimeAt(lon, instantAt(utcMinutes));
          expect(time).toMatch(/^\d{2}:\d{2}$/);
          const shift = mod(localOffsetMinutes(lon), 1440);
          expect(mod(minutesOf(time) - utcMinutes, 1440)).toBe(shift);
        },
      ),
      { seed: SEED, numRuns: 300 },
    );
  });

  it('never reads an internal clock: the answer depends only on the arguments', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2001-01-01T00:00:00Z'));
      const first = localTimeAtHop(139.6503, AT);
      vi.setSystemTime(new Date('2031-07-04T23:59:59Z'));
      const second = localTimeAtHop(139.6503, AT);
      expect(second).toEqual(first);
      expect(first.time).toBe('18:29');
    } finally {
      vi.useRealTimers();
    }
  });
});
