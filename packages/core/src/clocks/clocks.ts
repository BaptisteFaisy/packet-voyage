/**
 * The local hour at a hop, deduced from its longitude (§7.12, "the local hour
 * of passage at every hop").
 *
 * This is an INFERRED offset, not a time-zone database: the position of a hop
 * is itself inferred (a city, a network, a prefix), so the hour is a reading
 * of that inference, rounded to a quarter of an hour. It never claims to know
 * which country's clock the router keeps.
 *
 * Pure: the instant is ALWAYS an argument. No `Date.now()`, no clock, no
 * network, no randomness — the ISO instant is parsed here, by hand.
 */

/** Minutes of offset per degree of longitude: 360° = 24 h = 1 440 min. */
const MINUTES_PER_DEGREE = 4;
/** The offset is read on a quarter-hour grid. */
const OFFSET_STEP_MINUTES = 15;
/** Half a day: the largest meaningful offset, in minutes. */
const MAX_OFFSET_MINUTES = 720;
/** Minutes in a day. */
const MINUTES_PER_DAY = 1440;

/**
 * An ISO instant: a date, a time of day and an optional zone ("Z", "+02:00").
 * A missing zone is read as UTC, which is what the journey's `traced_at` is.
 */
const INSTANT_RX =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|z|[+-]\d{2}:?\d{2})?$/;

/** Positive remainder: `-90 mod 1440` is `1350`, not `-90`. */
function mod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/**
 * The inferred offset of a longitude, in minutes, on a 15-minute grid and
 * within ±12 h. The error against the exact solar offset (lon/15 hours) never
 * exceeds half of the grid, so 7.5 minutes.
 */
export function localOffsetMinutes(lon: number): number {
  if (!Number.isFinite(lon)) return 0;
  const stepped = Math.round((lon * MINUTES_PER_DEGREE) / OFFSET_STEP_MINUTES) * OFFSET_STEP_MINUTES;
  if (stepped === 0) return 0;
  return Math.max(-MAX_OFFSET_MINUTES, Math.min(MAX_OFFSET_MINUTES, stepped));
}

/** The offset as it is read on a clock face: "UTC", "UTC+2", "UTC-5", "UTC+5.75". */
export function localOffsetLabel(lon: number): string {
  const minutes = localOffsetMinutes(lon);
  if (minutes === 0) return 'UTC';
  const hours = Math.abs(minutes) / 60;
  const text = Number.isInteger(hours) ? String(hours) : String(Number(hours.toFixed(2)));
  return `UTC${minutes > 0 ? '+' : '-'}${text}`;
}

/** Minutes of the day, in UTC, of an instant given as an ISO string. */
function utcMinutesOfDay(atUtc: string): number {
  const match = INSTANT_RX.exec(atUtc.trim());
  if (!match) throw new RangeError(`not an ISO instant: "${atUtc}"`);
  const hours = Number(match[4]);
  const minutes = Number(match[5]);
  return mod(hours * 60 + minutes - zoneShiftMinutes(match[7]), MINUTES_PER_DAY);
}

/** Minutes to subtract to bring a zoned instant back to UTC. */
function zoneShiftMinutes(zone: string | undefined): number {
  if (!zone || zone === 'Z' || zone === 'z') return 0;
  const digits = zone.slice(1).replace(':', '');
  const shift = Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4));
  return zone.startsWith('-') ? -shift : shift;
}

/** "14:32": the local hour at that longitude, at that instant. */
export function localTimeAt(lon: number, atUtc: string): string {
  const local = mod(utcMinutesOfDay(atUtc) + localOffsetMinutes(lon), MINUTES_PER_DAY);
  return `${pad2(Math.floor(local / 60))}:${pad2(local % 60)}`;
}

/** The local hour of a hop: the hour, the offset label and the offset itself. */
export function localTimeAtHop(
  lon: number,
  atUtc: string,
): { time: string; offset: string; offsetMinutes: number } {
  return {
    time: localTimeAt(lon, atUtc),
    offset: localOffsetLabel(lon),
    offsetMinutes: localOffsetMinutes(lon),
  };
}
