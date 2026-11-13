import type { Candidate, Position, Rejection } from '@packet-voyage/schema';
import { haversineKm } from '../geo/index.ts';

function toRejection(
  candidate: Candidate,
  reason: Rejection['reason'],
  allowedKm: number,
  neededKm: number,
): Rejection {
  return {
    source: candidate.source,
    city: candidate.city,
    country: candidate.country ?? null,
    reason,
    allowed_km: allowedKm,
    needed_km: neededKm,
  };
}

/**
 * Hard light bound (VOY-F-16, VOY-P-06, VOY-P-09): rejects every candidate
 * farther from `from` than `allowedKm`. Rejected candidates are never dropped:
 * each carries `allowed_km`, `needed_km`, and its `source`.
 */
export function filterByLight<T extends Candidate>(
  candidates: T[],
  allowedKm: number,
  from: Position,
): { kept: T[]; rejected: Rejection[] } {
  const kept: T[] = [];
  const rejected: Rejection[] = [];

  for (const candidate of candidates) {
    const neededKm = haversineKm(from, candidate);
    if (neededKm <= allowedKm) {
      kept.push(candidate);
    } else {
      rejected.push(toRejection(candidate, 'light', allowedKm, neededKm));
    }
  }

  return { kept, rejected };
}
