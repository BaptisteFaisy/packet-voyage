/**
 * End-to-end tests for `consent`, `data status|update`, `trace` (fake spawn
 * runner — never a real probe) and the CLI dispatcher (help, exit codes,
 * lazy dependency loading). `PACKET_VOYAGE_HOME` points at a temp dir;
 * fixtures use RFC 5737 documentation addresses only.
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { JourneySchema, parseJourney } from '@packet-voyage/schema';
import { runCli } from './cli.ts';
import type { SpawnOptions, SpawnResult, SpawnRunner } from './probe.ts';
import { TRACE_FIXTURE, createFakeDeps, createFakeIo, fakeJourney } from './testing/fakes.ts';
import type { FakeIo } from './testing/fakes.ts';

const tempDirs: string[] = [];

afterAll(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

async function makeHome(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'voyage-cli-test-'));
  tempDirs.push(dir);
  return dir;
}

function makeIo(home: string, overrides: Partial<FakeIo> = {}): FakeIo {
  return createFakeIo({ env: { PACKET_VOYAGE_HOME: home }, cwd: home, ...overrides });
}

function stdoutJson(io: FakeIo): Record<string, unknown> {
  return JSON.parse(io.out.join('')) as Record<string, unknown>;
}

interface RecordedCall {
  cmd: string;
  args: string[];
  opts: SpawnOptions;
}

function fakeToolEnv(
  tool: 'mtr' | 'traceroute',
  output: string = TRACE_FIXTURE,
): { runner: SpawnRunner; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const enoent: SpawnResult = {
    code: null,
    stdout: '',
    stderr: '',
    error: { code: 'ENOENT', message: 'not found' },
  };
  const runner: SpawnRunner = async (cmd, args, opts) => {
    calls.push({ cmd, args, opts });
    if (cmd === 'mtr') {
      if (tool !== 'mtr') return enoent;
      if (args.includes('--json')) return { code: 0, stdout: '{"report":{"hub":[]}}', stderr: '' };
      return { code: 0, stdout: 'mtr 0.95', stderr: '' };
    }
    if (cmd === 'traceroute') {
      if (tool === 'mtr' && args.includes('--version')) return enoent;
      if (args.includes('--version')) return { code: 0, stdout: 'traceroute 2.1', stderr: '' };
      return { code: 0, stdout: output, stderr: '' };
    }
    return enoent;
  };
  return { runner, calls };
}

describe('VOY-F-13 voyage consent management', () => {
  it('status reports "not granted" by default and shows the notice', async () => {
    const home = await makeHome();
    const io = makeIo(home);
    const deps = createFakeDeps();
    expect(await runCli(['consent'], { io, depsLoader: async () => deps })).toBe(0);
    expect(io.out.join('')).toMatch(/not granted/);
    expect(io.out.join('')).toMatch(/RIPE IPmap/);
  });

  it('grant remembers the consent under PACKET_VOYAGE_HOME', async () => {
    const home = await makeHome();
    const io = makeIo(home);
    const deps = createFakeDeps();
    expect(await runCli(['consent', 'grant'], { io, depsLoader: async () => deps })).toBe(0);
    expect(deps.consentState.granted).toBe(true);
    expect(deps.consentState.grantedAt).toBe('2026-11-11T12:00:00.000Z');
    expect(deps.consentDirs).toContain(home);
  });

  it('revoke removes a previously granted consent', async () => {
    const home = await makeHome();
    const io = makeIo(home);
    const deps = createFakeDeps({
      consent: { granted: true, services: ['dns'], grantedAt: '2026-11-01T00:00:00.000Z' },
    });
    expect(await runCli(['consent', 'revoke'], { io, depsLoader: async () => deps })).toBe(0);
    expect(deps.consentState.granted).toBe(false);
    expect(deps.consentState.services).toEqual([]);
  });

  it('--json emits the state and the notice text; exits 2 on bad action', async () => {
    const home = await makeHome();
    const io = makeIo(home);
    const deps = createFakeDeps();
    expect(await runCli(['consent', 'status', '--json'], { io, depsLoader: async () => deps })).toBe(0);
    const payload = stdoutJson(io);
    expect(payload.home).toBe(home);
    expect((payload.consent as { granted: boolean }).granted).toBe(false);
    expect(typeof payload.notice).toBe('string');
    expect(await runCli(['consent', 'maybe'], { io, depsLoader: async () => deps })).toBe(2);
  });
});

describe('VOY-F-43 voyage data status (VOY-N-11)', () => {
  it('status --json reports datasets, staleness and cache stats', async () => {
    const home = await makeHome();
    const io = makeIo(home);
    const deps = createFakeDeps({ staleIds: ['test-dataset'] });
    expect(await runCli(['data', 'status', '--json'], { io, depsLoader: async () => deps })).toBe(0);
    const payload = stdoutJson(io);
    expect(payload.home).toBe(home);
    expect(payload.stale_threshold_days).toBe(90);
    expect(payload.stale_ids).toEqual(['test-dataset']);
    const datasets = payload.datasets as { id: string; licence: string }[];
    expect(datasets[0]?.id).toBe('test-dataset');
    expect(datasets[0]?.licence).toBe('ODbL');
    expect((payload.cache as { entries: number }).entries).toBe(0);
  });

  it('status (human) flags stale datasets and exits 2 on unknown subcommands', async () => {
    const home = await makeHome();
    const io = makeIo(home);
    const deps = createFakeDeps({ staleIds: ['test-dataset'] });
    expect(await runCli(['data', 'status'], { io, depsLoader: async () => deps })).toBe(0);
    expect(io.out.join('')).toMatch(/STALE: older than 90 days/);
    expect(await runCli(['data', 'frobnicate'], { io, depsLoader: async () => deps })).toBe(2);
  });
});

describe('VOY-F-43 voyage data update', () => {
  it('update refuses with --offline and without consent (exit 4)', async () => {
    const home = await makeHome();
    const io = makeIo(home);
    const deps = createFakeDeps();
    expect(await runCli(['data', 'update', '--offline'], { io, depsLoader: async () => deps })).toBe(4);
    expect(await runCli(['data', 'update'], { io, depsLoader: async () => deps })).toBe(4);
  });

  it('update refreshes the prefix cache with consent', async () => {
    const home = await makeHome();
    const io = makeIo(home);
    const deps = createFakeDeps({
      consent: { granted: true, services: ['peeringdb'], grantedAt: '2026-11-01T00:00:00.000Z' },
    });
    const code = await runCli(['data', 'update', '--json'], {
      io,
      depsLoader: async () => deps,
      fetcher: async () => {
        throw new Error('network must not be used in tests');
      },
    });
    expect(code).toBe(0);
    expect(stdoutJson(io).updated).toBe(true);
  });
});

describe('VOY-F-41 voyage trace with mtr', () => {
  it('spawns mtr with the contract argv, shell:false, host as one element', async () => {
    const home = await makeHome();
    const io = makeIo(home);
    const deps = createFakeDeps();
    const { runner, calls } = fakeToolEnv('mtr');
    expect(await runCli(['trace', '192.0.2.1', '--json'], { io, depsLoader: async () => deps, runner })).toBe(0);
    const traceCall = calls.find((c) => !c.args.includes('--version'));
    expect(traceCall?.cmd).toBe('mtr');
    expect(traceCall?.args).toEqual(['--json', '-n', '-c', '3', '192.0.2.1']);
    for (const call of calls) expect(call.opts.shell).toBe(false);
    const journey = JourneySchema.parse(stdoutJson(io));
    expect(journey.tool).toBe('mtr-json');
  });

  it('--ipv6 adds -6 and --cycles 500 is clamped to 100 with a warning', async () => {
    const home = await makeHome();
    const io = makeIo(home);
    const deps = createFakeDeps();
    const { runner, calls } = fakeToolEnv('mtr');
    const argv = ['trace', '2001:db8::1', '--ipv6', '--cycles', '500', '--json'];
    expect(await runCli(argv, { io, depsLoader: async () => deps, runner })).toBe(0);
    expect(io.err.join('')).toMatch(/clamped to 100/);
    const traceCall = calls.find((c) => !c.args.includes('--version'));
    expect(traceCall?.args).toEqual(['--json', '-n', '-6', '-c', '100', '2001:db8::1']);
  });
});

describe('VOY-F-41 voyage trace with traceroute fallback', () => {
  it('falls back to traceroute and writes journey.json by default', async () => {
    const home = await makeHome();
    const io = makeIo(home);
    const deps = createFakeDeps();
    const { runner, calls } = fakeToolEnv('traceroute');
    expect(await runCli(['trace', 'example.test'], { io, depsLoader: async () => deps, runner })).toBe(0);
    const traceCall = calls.find((c) => !c.args.includes('--version'));
    expect(traceCall?.args).toEqual(['-n', '-q', '3', 'example.test']);
    const written = await readFile(join(home, 'journey.json'), 'utf8');
    expect(() => parseJourney(written)).not.toThrow();
    expect(io.err.join('')).toMatch(/Wrote/);
  });

  it('--offline keeps enrichment offline and succeeds (hints only)', async () => {
    const home = await makeHome();
    const io = makeIo(home);
    const deps = createFakeDeps();
    const { runner } = fakeToolEnv('traceroute');
    expect(await runCli(['trace', '192.0.2.1', '--offline', '--json'], { io, depsLoader: async () => deps, runner })).toBe(0);
    expect(deps.enrichCalls).toBe(1);
    expect(deps.enrichOpts[0]?.offline).toBe(true);
  });

  it('without consent the trace still succeeds offline', async () => {
    const home = await makeHome();
    const io = makeIo(home);
    const deps = createFakeDeps({ enrichMissing: ['ipmap'] });
    const { runner } = fakeToolEnv('traceroute');
    expect(await runCli(['trace', '192.0.2.1', '--json'], { io, depsLoader: async () => deps, runner })).toBe(0);
    expect(deps.enrichOpts[0]?.offline).toBe(true);
  });

  it('exits 5 on unparseable output and 2 on an unknown --proto value', async () => {
    const home = await makeHome();
    const io = makeIo(home);
    const deps = createFakeDeps({ parseResult: 'unknown' });
    const { runner } = fakeToolEnv('traceroute', 'total garbage');
    expect(await runCli(['trace', '192.0.2.1'], { io, depsLoader: async () => deps, runner })).toBe(5);
    expect(await runCli(['trace', '192.0.2.1', '--proto', 'sctp'], { io, depsLoader: async () => deps, runner })).toBe(2);
  });

  it('--from Paris declares the source in the journey', async () => {
    const home = await makeHome();
    const io = makeIo(home);
    const { runner } = fakeToolEnv('traceroute');
    expect(await runCli(['trace', '192.0.2.1', '--from', 'Paris', '--json'], { io, depsLoader: async () => createFakeDeps(), runner })).toBe(0);
    const journey = JourneySchema.parse(stdoutJson(io));
    expect(journey.source?.label).toBe('Paris, FR');
  });
});

describe('VOY-F-41 voyage trace --open fallback', () => {
  it('prints guidance when the web dist is absent (never fails the trace)', async () => {
    const home = await makeHome();
    const io = makeIo(home);
    const { runner } = fakeToolEnv('traceroute');
    const argv = ['trace', '192.0.2.1', '--open', '--json'];
    const opts = { io, depsLoader: async () => createFakeDeps(), runner };
    expect(await runCli(argv, opts)).toBe(0);
    expect(io.err.join('')).toMatch(/Local UI not found/);
  });
});

describe('§5.8 CLI dispatcher: help and guards', () => {
  it('--help prints usage and exit codes without loading workspace deps', async () => {
    const io = createFakeIo();
    const code = await runCli(['--help'], {
      io,
      depsLoader: async () => {
        throw new Error('deps must not be loaded for --help');
      },
    });
    expect(code).toBe(0);
    expect(io.out.join('')).toMatch(/Usage:/);
    expect(io.out.join('')).toMatch(/Exit codes:/);
  });

  it('refuses a bad host before loading workspace deps', async () => {
    const io = createFakeIo();
    const code = await runCli(['trace', '192.0.2.0/24'], {
      io,
      depsLoader: async () => {
        throw new Error('deps must not be loaded for a refused host');
      },
    });
    expect(code).toBe(2);
  });
});

describe('§5.8 CLI dispatcher: errors and round-trips', () => {
  it('exits 2 on unknown commands, options, missing values or extra operands', async () => {
    const io = createFakeIo();
    const deps = createFakeDeps();
    expect(await runCli(['frobnicate'], { io, depsLoader: async () => deps })).toBe(2);
    expect(await runCli(['trace', '192.0.2.1', '--nope'], { io, depsLoader: async () => deps })).toBe(2);
    expect(await runCli(['read', 'x', '--out'], { io, depsLoader: async () => deps })).toBe(2);
    expect(await runCli(['read', 'a.txt', 'b.txt'], { io, depsLoader: async () => deps })).toBe(2);
  });

  it('exits 1 with a clear message when workspace deps fail to load', async () => {
    const home = await makeHome();
    await writeFile(join(home, 'trace.txt'), TRACE_FIXTURE, 'utf8');
    const io = makeIo(home);
    const code = await runCli(['read', 'trace.txt'], {
      io,
      depsLoader: async () => {
        throw new Error('module @packet-voyage/enrich not found');
      },
    });
    expect(code).toBe(1);
    expect(io.err.join('')).toMatch(/workspace packages unavailable/);
  });

  it('no arguments prints help; stored journey feeds share command', async () => {
    const ioHelp = createFakeIo();
    expect(await runCli([], { io: ioHelp, depsLoader: async () => createFakeDeps() })).toBe(0);
    expect(ioHelp.out.join('')).toMatch(/Usage:/);

    const home = await makeHome();
    await writeFile(join(home, 'journey.json'), JSON.stringify(fakeJourney()), 'utf8');
    const ioShare = makeIo(home);
    const deps = createFakeDeps();
    expect(await runCli(['share', 'journey.json', '--yes', '--json'], { io: ioShare, depsLoader: async () => deps })).toBe(0);
    expect(() => JourneySchema.parse(stdoutJson(ioShare).journey)).not.toThrow();
  });
});
