/**
 * End-to-end command tests: `read`, `share`, `enrich` (VOY-F-43, VOY-F-38,
 * VOY-P-18). Everything runs against `PACKET_VOYAGE_HOME` in a temp dir with
 * synthetic RFC 5737 fixtures and injected dependency fakes — no network, no
 * real probe, ever. `--json` outputs are validated with the REAL
 * `@packet-voyage/schema` (VOY-P-18).
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { parseJourney } from '@packet-voyage/schema';
import { runCli } from './cli.ts';
import type { FakeDepsOptions } from './testing/fakes.ts';
import { TRACE_FIXTURE, createFakeDeps, createFakeIo, fakeJourney } from './testing/fakes.ts';
import type { FakeIo } from './testing/fakes.ts';

const tempDirs: string[] = [];

afterAll(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

interface Harness {
  home: string;
  io: FakeIo;
  deps: ReturnType<typeof createFakeDeps>;
}

async function harness(
  depsOptions: FakeDepsOptions = {},
  ioOverrides: Partial<FakeIo> = {},
): Promise<Harness> {
  const home = await mkdtemp(join(tmpdir(), 'voyage-cli-test-'));
  tempDirs.push(home);
  return {
    home,
    io: createFakeIo({ env: { PACKET_VOYAGE_HOME: home }, cwd: home, ...ioOverrides }),
    deps: createFakeDeps(depsOptions),
  };
}

function cli(h: Harness, argv: string[]): Promise<number> {
  return runCli(argv, {
    io: h.io,
    depsLoader: async () => h.deps,
    fetcher: async () => {
      throw new Error('network must not be used in tests');
    },
  });
}

function stdoutJson(io: FakeIo): Record<string, unknown> {
  return JSON.parse(io.out.join('')) as Record<string, unknown>;
}

describe('VOY-F-43 voyage read: happy paths', () => {
  it('computes a schema-valid journey from a trace file with --json', async () => {
    const h = await harness();
    await writeFile(join(h.home, 'trace.txt'), TRACE_FIXTURE, 'utf8');
    expect(await cli(h, ['read', 'trace.txt', '--json'])).toBe(0);
    // VOY-P-18: the emitted journey validates against the real schema.
    const journey = parseJourney(JSON.stringify(stdoutJson(h.io)));
    expect(journey.version).toBe(1);
    expect(journey.target.host).toBe('example.test');
    expect(journey.hops.length).toBeGreaterThan(0);
  });

  it('reads the trace from stdin with "-"', async () => {
    const h = await harness({}, { stdinText: TRACE_FIXTURE });
    expect(await cli(h, ['read', '-', '--json'])).toBe(0);
    expect(() => parseJourney(JSON.stringify(stdoutJson(h.io)))).not.toThrow();
  });

  it('writes the journey with --out and prints an honest human summary', async () => {
    const h = await harness();
    await writeFile(join(h.home, 'trace.txt'), TRACE_FIXTURE, 'utf8');
    expect(await cli(h, ['read', 'trace.txt', '--out', 'out/journey.json'])).toBe(0);
    const written = await readFile(join(h.home, 'out/journey.json'), 'utf8');
    expect(() => parseJourney(written)).not.toThrow();
    expect(h.io.out.join('')).toMatch(/at least \d+ km/);
    expect(h.io.out.join('')).toMatch(/Countries where a hop was located/);
  });

  it('declares the source with --from <known city>', async () => {
    const h = await harness();
    await writeFile(join(h.home, 'trace.txt'), TRACE_FIXTURE, 'utf8');
    expect(await cli(h, ['read', 'trace.txt', '--from', 'Lyon', '--json'])).toBe(0);
    const journey = parseJourney(JSON.stringify(stdoutJson(h.io)));
    expect(journey.source?.label).toBe('Lyon, FR');
    expect(journey.source?.declared).toBe(true);
  });
});

describe('§5.8 voyage read: failure exit codes', () => {
  it('exits 2 for an unknown --from city (never invents a position)', async () => {
    const h = await harness();
    await writeFile(join(h.home, 'trace.txt'), TRACE_FIXTURE, 'utf8');
    expect(await cli(h, ['read', 'trace.txt', '--from', 'Nowhereville'])).toBe(2);
    expect(h.io.err.join('')).toMatch(/unknown --from city/);
  });

  it('exits 5 on a missing file', async () => {
    const h = await harness();
    expect(await cli(h, ['read', 'missing.txt'])).toBe(5);
    expect(h.io.err.join('')).toMatch(/file not found/);
  });

  it('exits 5 on an unparseable trace', async () => {
    const h = await harness({ parseResult: 'unknown' });
    await writeFile(join(h.home, 'garbage.txt'), 'not a trace', 'utf8');
    expect(await cli(h, ['read', 'garbage.txt'])).toBe(5);
    expect(h.io.err.join('')).toMatch(/unrecognized or empty trace input/);
  });

  it('exits 5 when stdin is empty and 2 when stdin is a TTY', async () => {
    const empty = await harness({}, { stdinText: '' });
    expect(await cli(empty, ['read', '-'])).toBe(5);
    const tty = await harness({}, { stdinTty: true });
    expect(await cli(tty, ['read'])).toBe(2);
  });

  it('exits 2 on a leading-dash operand (§18)', async () => {
    const h = await harness();
    expect(await cli(h, ['read', '-x'])).toBe(2);
    expect(h.io.err.join('')).toMatch(/starting with a dash/);
  });
});

describe('VOY-F-38 voyage share: preview then confirm', () => {
  async function shareHarness(ioOverrides: Partial<FakeIo> = {}) {
    const h = await harness({}, ioOverrides);
    await writeFile(join(h.home, 'journey.json'), JSON.stringify(fakeJourney()), 'utf8');
    return h;
  }

  it('shows what will be shared and refuses without confirmation (exit 4)', async () => {
    const h = await shareHarness();
    expect(await cli(h, ['share', 'journey.json'])).toBe(4);
    expect(h.io.out.join('')).toMatch(/What will be shared \(redaction preview\)/);
    expect(h.io.out.join('')).toMatch(/redaction level: country/);
    expect(h.io.err.join('')).toMatch(/--yes/);
  });

  it('proceeds with --yes and prints the share link', async () => {
    const h = await shareHarness();
    expect(await cli(h, ['share', 'journey.json', '--yes'])).toBe(0);
    expect(h.io.out.join('')).toMatch(/^https:\/\/packet-voyage\.invalid\/#j=/);
  });

  it('asks confirmation on a TTY and proceeds on yes', async () => {
    const h = await shareHarness({ stdinTty: true, confirmAnswer: true });
    expect(await cli(h, ['share', 'journey.json'])).toBe(0);
    expect(h.io.confirms.length).toBe(1);
    expect(h.io.confirms[0]).toMatch(/Share this journey/);
  });

  it('exits 4 when the interactive confirmation is refused', async () => {
    const h = await shareHarness({ stdinTty: true, confirmAnswer: false });
    expect(await cli(h, ['share', 'journey.json'])).toBe(4);
  });
});

describe('VOY-P-18 voyage share: levels, links and files', () => {
  it('honours --base-url and --level city with schema-valid JSON', async () => {
    const h = await harness();
    await writeFile(join(h.home, 'journey.json'), JSON.stringify(fakeJourney()), 'utf8');
    const argv = ['share', 'journey.json', '--yes', '--level', 'city', '--base-url', 'https://example.test/pv', '--json'];
    expect(await cli(h, argv)).toBe(0);
    const payload = stdoutJson(h.io) as { level: string; link: string; journey: unknown };
    expect(payload.level).toBe('city');
    expect(payload.link).toMatch(/^https:\/\/example\.test\/pv\/#j=/);
    const journey = parseJourney(JSON.stringify(payload.journey));
    expect(journey.redaction).toEqual({ level: 'city', applied: true });
  });

  it('exits 2 on an invalid --level and 5 on an invalid journey file', async () => {
    const bad = await harness();
    await writeFile(join(bad.home, 'journey.json'), JSON.stringify(fakeJourney()), 'utf8');
    expect(await cli(bad, ['share', 'journey.json', '--yes', '--level', 'street'])).toBe(2);
    const invalid = await harness();
    await writeFile(join(invalid.home, 'bad.json'), 'this is not json', 'utf8');
    expect(await cli(invalid, ['share', 'bad.json', '--yes'])).toBe(5);
    expect(invalid.io.err.join('')).toMatch(/invalid journey JSON/);
  });

  it('writes the redacted journey with --out', async () => {
    const h = await harness();
    await writeFile(join(h.home, 'journey.json'), JSON.stringify(fakeJourney()), 'utf8');
    expect(await cli(h, ['share', 'journey.json', '--yes', '--out', 'shared.json'])).toBe(0);
    const written = await readFile(join(h.home, 'shared.json'), 'utf8');
    expect(parseJourney(written).redaction?.applied).toBe(true);
  });
});

describe('VOY-F-43 voyage enrich: consent rules (§6.4)', () => {
  const GRANTED = {
    consent: { granted: true, services: ['dns', 'ripestat'], grantedAt: '2026-11-01T00:00:00.000Z' },
  };

  async function enrichHarness(depsOptions: FakeDepsOptions = {}) {
    const h = await harness(depsOptions);
    await writeFile(join(h.home, 'journey.json'), JSON.stringify(fakeJourney()), 'utf8');
    return h;
  }

  it('exits 4 when consent was never granted (non-interactive)', async () => {
    const h = await enrichHarness();
    expect(await cli(h, ['enrich', 'journey.json'])).toBe(4);
    expect(h.io.err.join('')).toMatch(/consent/i);
  });

  it('exits 4 with --offline (contradictory request)', async () => {
    const h = await enrichHarness(GRANTED);
    expect(await cli(h, ['enrich', 'journey.json', '--offline'])).toBe(4);
  });

  it('exits 5 on a missing journey file', async () => {
    const h = await enrichHarness();
    expect(await cli(h, ['enrich', 'nope.json'])).toBe(5);
  });
});

describe('VOY-P-04 voyage enrich: happy paths', () => {
  const GRANTED = {
    consent: { granted: true, services: ['dns', 'ripestat'], grantedAt: '2026-11-01T00:00:00.000Z' },
  };

  async function enrichHarness(depsOptions: FakeDepsOptions = {}) {
    const h = await harness(depsOptions);
    await writeFile(join(h.home, 'journey.json'), JSON.stringify(fakeJourney()), 'utf8');
    return h;
  }

  it('enriches with consent and rewrites the journey file', async () => {
    const h = await enrichHarness(GRANTED);
    expect(await cli(h, ['enrich', 'journey.json'])).toBe(0);
    expect(h.deps.enrichCalls).toBe(1);
    expect(h.deps.enrichOpts[0]?.offline).toBe(false);
    // The cache lives under PACKET_VOYAGE_HOME (a temp dir here).
    expect(h.deps.cacheDirs[0]).toBe(join(h.home, 'cache'));
    const written = await readFile(join(h.home, 'journey.json'), 'utf8');
    expect(() => parseJourney(written)).not.toThrow();
  });

  it('reports missing enrichments and emits schema-valid JSON with --json', async () => {
    const h = await enrichHarness({ ...GRANTED, enrichMissing: ['ripestat'] });
    expect(await cli(h, ['enrich', 'journey.json', '--json'])).toBe(0);
    expect(() => parseJourney(JSON.stringify(stdoutJson(h.io)))).not.toThrow();
    expect(h.io.err.join('')).toMatch(/Missing enrichments: ripestat/);
  });
});
