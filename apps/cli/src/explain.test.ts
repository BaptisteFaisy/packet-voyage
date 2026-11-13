/**
 * `voyage explain` — the analytics panel on the terminal. Offline by design: it
 * reads a journey file and answers with bounds, a delay breakdown, the media
 * that can explain the delay, and (with --year) the same route in another year.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { runCli } from './cli.ts';
import { createFakeDeps, createFakeIo, fakeJourney } from './testing/fakes.ts';
import type { FakeIo } from './testing/fakes.ts';

const tempDirs: string[] = [];

afterAll(async () => {
  for (const dir of tempDirs) await rm(dir, { recursive: true, force: true });
});

async function journeyFile(): Promise<{ io: FakeIo; deps: ReturnType<typeof createFakeDeps>; path: string }> {
  const home = await mkdtemp(join(tmpdir(), 'voyage-explain-'));
  tempDirs.push(home);
  const path = join(home, 'journey.json');
  await writeFile(path, JSON.stringify(fakeJourney()), 'utf8');
  const io = createFakeIo({ env: { PACKET_VOYAGE_HOME: home }, cwd: home });
  return { io, deps: createFakeDeps(), path };
}

describe('voyage explain', () => {
  it('prints bounded distances, the delay breakdown and the media verdicts', async () => {
    const { io, deps, path } = await journeyFile();
    expect(await runCli(['explain', path], { io, depsLoader: async () => deps })).toBe(0);
    const text = io.out.join('');
    expect(text).toMatch(/Distance: at least \d+ km/);
    expect(text).toMatch(/light floor/);
    expect(text).toMatch(/Media compatible with this delay:/);
    expect(text).toMatch(/residual about/);
    expect(text).not.toMatch(/travelled through/i);
  });

  it('adds the era comparison when --year is given, and validates it', async () => {
    const { io, deps, path } = await journeyFile();
    expect(await runCli(['explain', path, '--year', '1987'], { io, depsLoader: async () => deps })).toBe(0);
    expect(io.out.join('')).toMatch(/Same journey in 1987:/);
    expect(io.out.join('')).toMatch(/under-represented/);
    const strict = createFakeIo({ env: { PACKET_VOYAGE_HOME: '/tmp' }, cwd: '/tmp' });
    expect(await runCli(['explain', path, '--year', '12'], { io: strict, depsLoader: async () => deps })).toBe(2);
  });

  it('emits a schema-friendly JSON payload with --json', async () => {
    const { io, deps, path } = await journeyFile();
    expect(await runCli(['explain', path, '--year', '2000', '--json'], { io, depsLoader: async () => deps })).toBe(0);
    const payload = JSON.parse(io.out.join('')) as {
      bounds: { min_basis: string; max_km: number | null };
      breakdown: { reading: string };
      media: { medium: string; compatible: boolean }[];
      era: { year: number; available_then: number } | null;
    };
    expect(payload.bounds.min_basis).toBe('geodesic-sum');
    expect(Array.isArray(payload.media)).toBe(true);
    expect(payload.media.length).toBe(5);
    expect(payload.era?.year).toBe(2000);
    expect(payload.breakdown.reading).toBe('inferred');
  });

  it('refuses a missing file with the documented exit code', async () => {
    const { io, deps } = await journeyFile();
    expect(await runCli(['explain'], { io, depsLoader: async () => deps })).toBe(2);
    expect(await runCli(['explain', '/nope/journey.json'], { io, depsLoader: async () => deps })).toBe(5);
  });
});

describe('voyage export and compare', () => {
  it('exports the journey as a GeoJSON feature collection', async () => {
    const { io, deps, path } = await journeyFile();
    expect(await runCli(['export', path, '--format', 'geojson'], { io, depsLoader: async () => deps })).toBe(0);
    const geo = JSON.parse(io.out.join('')) as { type: string; features: unknown[]; properties: Record<string, unknown> };
    expect(geo.type).toBe('FeatureCollection');
    expect(geo.properties.generator).toBe('packet-voyage');
    expect(Array.isArray(geo.features)).toBe(true);
  });

  it('refuses the ticket report until the journey is redacted, then writes it', async () => {
    const { io, deps, path } = await journeyFile();
    expect(await runCli(['export', path, '--format', 'markdown'], { io, depsLoader: async () => deps })).toBe(4);
    expect(io.err.join('')).toMatch(/not redacted/);

    const home = await mkdtemp(join(tmpdir(), 'voyage-redacted-'));
    tempDirs.push(home);
    const redactedPath = join(home, 'redacted.json');
    expect(
      await runCli(['share', path, '--level', 'country', '--yes', '--out', redactedPath], {
        io,
        depsLoader: async () => deps,
      }),
    ).toBe(0);
    const io2 = createFakeIo({ env: { PACKET_VOYAGE_HOME: home }, cwd: home });
    expect(await runCli(['export', redactedPath, '--format', 'markdown', '--language', 'fr'], { io: io2, depsLoader: async () => deps })).toBe(0);
    const report = io2.out.join('');
    expect(report).toContain('# Rapport de trajet');
    expect(report).toMatch(/au moins \d/);
    expect(report).toContain("Ce que ce rapport n'établit pas");
  });

  it('compares two journeys and refuses anything but a pair', async () => {
    const { io, deps, path } = await journeyFile();
    expect(await runCli(['compare', path, path, '--json'], { io, depsLoader: async () => deps })).toBe(0);
    const diff = JSON.parse(io.out.join('')) as { same_target: boolean; path_changed: boolean; distance_km: { delta: number } };
    expect(diff.same_target).toBe(true);
    expect(diff.path_changed).toBe(false);
    expect(diff.distance_km.delta).toBe(0);
    expect(await runCli(['compare', path], { io, depsLoader: async () => deps })).toBe(2);
    expect(await runCli(['export', path, '--format', 'pdf'], { io, depsLoader: async () => deps })).toBe(2);
  });
});
