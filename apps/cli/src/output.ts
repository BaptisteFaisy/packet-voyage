/**
 * Output helpers: `--json` emission validated against `JourneySchema`
 * (VOY-P-18) and the human-readable journey summary. Wording obeys the
 * honesty contract (§5.4): travelled distances are "at least", cables are
 * "compatible", and countries are "countries where a hop was located".
 */
import { JourneySchema } from '@packet-voyage/schema';
import type { Journey } from '@packet-voyage/schema';
import { CliError, EXIT_INTERNAL } from './runtime.ts';
import type { CliIo } from './runtime.ts';

/** Validate then print a journey as JSON; never emit an invalid journey. */
export function emitJourneyJson(io: CliIo, journey: Journey): Journey {
  const result = JourneySchema.safeParse(journey);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new CliError(
      EXIT_INTERNAL,
      `internal error: the computed journey failed JourneySchema validation: ${issues.join('; ')}`,
    );
  }
  io.stdout(`${JSON.stringify(result.data, null, 2)}\n`);
  return result.data;
}

function rttLine(summary: Journey['summary']): string {
  const rtt = summary.rtt_ms != null ? `${summary.rtt_ms.toFixed(1)} ms (measured)` : 'unknown';
  const floor =
    summary.light_floor_ms != null ? `, light floor ${summary.light_floor_ms.toFixed(1)} ms` : '';
  const inflation = summary.inflation != null ? `, inflation ${summary.inflation.toFixed(2)}x` : '';
  return `Round-trip delay: ${rtt}${floor}${inflation}`;
}

export function formatJourneyHuman(journey: Journey): string {
  const s = journey.summary;
  const located = journey.hops.filter((hop) => hop.location).length;
  const lines = [
    `Target: ${journey.target.host}${journey.target.ip ? ` (${journey.target.ip})` : ''}`,
    `Traced at ${journey.traced_at} with ${journey.tool} (${journey.protocol}, IPv${journey.family})`,
    `Hops: ${journey.hops.length} (${located} located, ${s.gaps} gap(s))`,
    `Distance: at least ${Math.round(s.distance_km_min)} km`,
    rttLine(s),
    `Countries where a hop was located: ${s.countries.length > 0 ? s.countries.join(', ') : 'none'}`,
    `Networks: ${s.networks} | IXPs: ${s.ixps} | rejected by light: ${s.rejected_by_light}`,
  ];
  for (const seg of journey.segments) {
    if (seg.kind !== 'sea' && seg.kind !== 'sea-or-fixed') continue;
    if (seg.cables.length === 0) continue;
    const names = seg.cables.map((cable) => cable.name).join(', ');
    const more = seg.other_cables > 0 ? ` (+${seg.other_cables} more)` : '';
    lines.push(`Crossing ttl ${seg.from_ttl}->${seg.to_ttl}: compatible cables for this crossing: ${names}${more}`);
  }
  return `${lines.join('\n')}\n`;
}
