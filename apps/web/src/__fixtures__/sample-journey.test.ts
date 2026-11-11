import { describe, expect, it } from 'vitest';
import { JourneySchema } from '@packet-voyage/schema';
import { SAMPLE_JOURNEY } from './sample-journey.ts';

describe('SAMPLE_JOURNEY fixture (§7.14)', () => {
  it('validates against @packet-voyage/schema', () => {
    const result = JourneySchema.safeParse(SAMPLE_JOURNEY);
    expect(result.success, result.success ? '' : JSON.stringify(result.error.issues)).toBe(true);
  });

  it('reproduces the worked example of §7.14', () => {
    expect(SAMPLE_JOURNEY.hops.length).toBe(10);
    expect(SAMPLE_JOURNEY.summary.distance_km_min).toBe(6655);
    expect(SAMPLE_JOURNEY.summary.rtt_ms).toBe(91.7);
    expect(SAMPLE_JOURNEY.summary.light_floor_ms).toBe(63.6);
    expect(SAMPLE_JOURNEY.summary.inflation).toBe(1.44);
    expect(SAMPLE_JOURNEY.summary.countries).toEqual(['FR', 'GB', 'US']);
    expect(SAMPLE_JOURNEY.summary.networks).toBe(3);
    expect(SAMPLE_JOURNEY.summary.ixps).toBe(1);
    expect(SAMPLE_JOURNEY.summary.rejected_by_light).toBe(1);
    expect(SAMPLE_JOURNEY.summary.gaps).toBe(0);
    expect(SAMPLE_JOURNEY.hops[3]?.location?.rejected[0]).toMatchObject({
      city: 'Ashburn',
      reason: 'light',
      allowed_km: 1439,
      needed_km: 6496,
    });
  });
});
