import { describe, expect, it } from 'vitest';
import { createJsonNetworkDb, loadJsonNetworkDb } from './localdb.ts';
import { createLimiter, MAX_CONCURRENT_REQUESTS } from './limiter.ts';
import { reverseDns } from './reverse-dns.ts';
import { publicAddress } from './fixtures/fake.ts';

describe('VOY-F-08 localDb', () => {
  it('VOY-F-08 looks up public prefixes from localDb JSON', () => {    const ip = publicAddress(42);
    const [a, b, c] = ip.split('.');
    const prefix = `${a}.${b}.${c}.0/24`;
    const db = createJsonNetworkDb([
      { prefix, asn: 64512, as_name: 'EXAMPLE-NET', city: 'Paris', country: 'FR', lat: 48.8, lon: 2.3 },
    ]);
    expect(db.lookup(ip)).toEqual({
      asn: 64512,
      as_name: 'EXAMPLE-NET',
      prefix,
      city: 'Paris',
      country: 'FR',
      lat: 48.8,
      lon: 2.3,
    });
    expect(db.lookup(publicAddress(9999))).toBeNull();
  });

  it('VOY-F-08 loadJsonNetworkDb handles missing files gracefully', () => {    expect(loadJsonNetworkDb('/nonexistent/path/db.json')).toBeNull();
  });
});

describe('VOY-F-09 reverseDns', () => {
  it('VOY-F-09 uses injected resolver and returns first host', async () => {    const ok = await reverseDns(publicAddress(1), async () => ['edge1.par.example.net']);
    expect(ok).toBe('edge1.par.example.net');
  });

  it('VOY-F-09 returns null when resolver throws', async () => {    const fail = await reverseDns(publicAddress(2), async () => {
      throw new Error('ENOTFOUND');
    });
    expect(fail).toBeNull();
  });
});

describe('politeness limiter', () => {
  it('caps in-flight tasks to MAX_CONCURRENT_REQUESTS', async () => {
    const limiter = createLimiter(MAX_CONCURRENT_REQUESTS);
    const jobs = Array.from({ length: 12 }, (_, i) =>
      limiter.run(async () => {
        await new Promise((r) => setTimeout(r, 4));
        return i;
      }),
    );
    const results = await Promise.all(jobs);
    expect(results).toHaveLength(12);
    expect(limiter.peak).toBeLessThanOrEqual(4);
    expect(limiter.active).toBe(0);
  });
});
