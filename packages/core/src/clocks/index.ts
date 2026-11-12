/**
 * The local hour deduced from the longitude of a hop (§7.12). The instant is
 * always an argument; the offset is inferred, never a time-zone claim.
 */
export {
  localOffsetLabel,
  localOffsetMinutes,
  localTimeAt,
  localTimeAtHop,
} from './clocks.ts';
