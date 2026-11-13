/**
 * Unit tests for the trace probe wrapper (VOY-F-41, VOY-N-03, §11.6).
 *
 * Everything runs with an injected spawn runner — never a real traceroute
 * against the Internet (probe-guard):
 *   - `shell: false` on every spawn (VOY-N-03);
 *   - fallback order mtr (JSON-capable) -> traceroute -> tracert;
 *   - the exact contract argv per tool, host as a single final element;
 *   - exit code 3 when no trace tool is found;
 *   - privilege failures are detected, explained, and never escalated.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from './cli.ts';
import {
  detectTraceTool,
  emitsJson,
  noToolMessage,
  installHint,
  isPrivilegeError,
  normalizeCycles,
  privilegeMessage,
  runTrace,
  traceArgv,
} from './probe.ts';
import type { SpawnOptions, SpawnResult, SpawnRunner } from './probe.ts';
import { createFakeDeps, createFakeIo } from './testing/fakes.ts';

function recordRunner(
  handler: (cmd: string, args: string[]) => SpawnResult,
): { runner: SpawnRunner; calls: { cmd: string; args: string[]; opts: SpawnOptions }[] } {
  const calls: { cmd: string; args: string[]; opts: SpawnOptions }[] = [];
  const runner: SpawnRunner = async (cmd, args, opts) => {
    calls.push({ cmd, args, opts });
    return handler(cmd, args);
  };
  return { runner, calls };
}

const ENOENT: SpawnResult = {
  code: null,
  stdout: '',
  stderr: '',
  error: { code: 'ENOENT', message: 'not found' },
};

describe('VOY-F-41 traceArgv builds the contract argv', () => {
  it('formats mtr argv with the host as single final element', () => {
    expect(traceArgv('mtr', 'example.test', { cycles: 5, ipv6: false })).toEqual([
      'mtr', '--json', '-n', '-c', '5', 'example.test',
    ]);
  });

  it('formats mtr argv with ipv6 and protocol flags', () => {
    expect(traceArgv('mtr', '2001:db8::1', { cycles: 3, ipv6: true, protocol: 'udp' })).toEqual([
      'mtr', '--json', '-n', '-6', '--udp', '-c', '3', '2001:db8::1',
    ]);
    expect(traceArgv('mtr', '192.0.2.1', { cycles: 3, ipv6: false, protocol: 'tcp' })).toEqual([
      'mtr', '--json', '-n', '--tcp', '-c', '3', '192.0.2.1',
    ]);
  });

  it('formats traceroute argv with -n -q 3 and protocol flags', () => {
    expect(traceArgv('traceroute', 'example.test', { cycles: 3, ipv6: false })).toEqual([
      'traceroute', '-n', '-q', '3', 'example.test',
    ]);
    expect(traceArgv('traceroute', '192.0.2.1', { cycles: 3, ipv6: false, protocol: 'icmp' })).toEqual([
      'traceroute', '-n', '-q', '3', '-I', '192.0.2.1',
    ]);
    expect(traceArgv('traceroute', '2001:db8::1', { cycles: 3, ipv6: true, protocol: 'tcp' })).toEqual([
      'traceroute', '-n', '-q', '3', '-6', '-T', '2001:db8::1',
    ]);
  });

  it('formats tracert argv for Windows', () => {
    expect(traceArgv('tracert', 'example.test', { cycles: 3, ipv6: false })).toEqual([
      'tracert', '-d', 'example.test',
    ]);
    expect(traceArgv('tracert', '2001:db8::1', { cycles: 3, ipv6: true })).toEqual([
      'tracert', '-d', '-6', '2001:db8::1',
    ]);
  });

  it('clamps cycles to the documented maximum with a warning', () => {
    expect(normalizeCycles(3).cycles).toBe(3);
    expect(normalizeCycles(0).cycles).toBe(3);
    expect(normalizeCycles(NaN).cycles).toBe(3);
    expect(normalizeCycles(500).cycles).toBe(100);
    expect(normalizeCycles(500).warning).toMatch(/clamped/);
  });
});

describe('VOY-F-41 detectTraceTool fallback order', () => {
  it('picks mtr when mtr exists and emits valid JSON', async () => {
    const { runner, calls } = recordRunner((cmd, args) => {
      if (cmd === 'mtr' && args.includes('--json')) {
        return { code: 0, stdout: '{"report":{"hub":[]}}', stderr: '' };
      }
      return { code: 0, stdout: 'mtr 0.95', stderr: '' };
    });
    expect(await detectTraceTool(runner, 'linux')).toBe('mtr');
    for (const call of calls) {
      expect(call.opts.shell, 'must never use a shell').toBe(false);
    }
  });

  it('skips mtr without JSON support and falls through to traceroute', async () => {
    const { runner } = recordRunner((cmd, args) => {
      if (cmd === 'mtr' && args.includes('--json')) {
        return { code: 1, stdout: '', stderr: 'unknown option --json' };
      }
      if (cmd === 'traceroute') return { code: 0, stdout: 'Modern traceroute for Linux', stderr: '' };
      return ENOENT;
    });
    expect(await detectTraceTool(runner, 'linux')).toBe('traceroute');
  });

  it('VOY-N-12 falls through to tracert on Windows, traceroute elsewhere', async () => {
    const { runner } = recordRunner((cmd) =>
      cmd === 'tracert' ? { code: 0, stdout: 'Usage: tracert [-d] target_name', stderr: '' } : ENOENT,
    );
    expect(await detectTraceTool(runner, 'win32')).toBe('tracert');
    expect(await detectTraceTool(runner, 'linux')).toBeNull();
  });

  it('returns null with per-OS install hints when nothing is installed', async () => {
    const { runner } = recordRunner(() => ENOENT);
    expect(await detectTraceTool(runner, 'linux')).toBeNull();
    expect(installHint('linux')).toMatch(/mtr/i);
    expect(installHint('darwin')).toMatch(/brew install mtr/i);
    expect(installHint('win32')).toMatch(/tracert/i);
  });
});

describe('VOY-N-03 runTrace never uses a shell', () => {
  it('passes shell:false and the host as one argv element', async () => {
    const { runner, calls } = recordRunner(() => ({
      code: 0,
      stdout: 'traceroute to example.test (192.0.2.1), 30 hops max\n 1 192.0.2.1 1.2 ms',
      stderr: '',
    }));
    await runTrace(runner, 'traceroute', 'example.test', { cycles: 3, ipv6: false });
    expect(calls.length).toBe(1);
    expect(calls[0]?.cmd).toBe('traceroute');
    expect(calls[0]?.opts.shell).toBe(false);
    expect(calls[0]?.args[calls[0]!.args.length - 1]).toBe('example.test');
  });
});

describe('§11.6 privilege failures never escalate', () => {
  it('detects privilege errors and suggests the default mode', () => {
    const failed: SpawnResult = {
      code: 1,
      stdout: '',
      stderr: 'traceroute: icmp socket: Operation not permitted',
    };
    expect(isPrivilegeError(failed)).toBe(true);
    const msg = privilegeMessage('icmp');
    expect(msg).toMatch(/never uses sudo/i);
    expect(msg).toMatch(/drop --proto/i);
  });

  it('does not treat a successful trace as a privilege error', () => {
    expect(isPrivilegeError({ code: 0, stdout: 'report', stderr: '' })).toBe(false);
  });
});

describe('§5.8 trace failure exit codes', () => {
  it('exits 3 when no trace tool is found', async () => {
    const io = createFakeIo();
    const missing: SpawnRunner = async () => ENOENT;
    const code = await runCli(['trace', 'example.test'], {
      io,
      depsLoader: async () => createFakeDeps(),
      runner: missing,
    });
    expect(code).toBe(3);
    expect(io.err.join('')).toMatch(/no trace tool found/i);
  });

  it('exits 3 on a privilege failure, explaining the default mode', async () => {
    const io = createFakeIo();
    const privRunner: SpawnRunner = async (_cmd, args) => {
      if (args.includes('--version')) return { code: 0, stdout: 'traceroute 2.1', stderr: '' };
      return { code: 1, stdout: '', stderr: 'traceroute: socket: Operation not permitted' };
    };
    const code = await runCli(['trace', 'example.test', '--proto', 'icmp'], {
      io,
      depsLoader: async () => createFakeDeps(),
      runner: privRunner,
    });
    expect(code).toBe(3);
    expect(io.err.join('')).toMatch(/never uses sudo/i);
  });
});

describe('VOY-F-41 mtr detection probes a real JSON report, not --version', () => {
  it('accepts an mtr that only emits JSON on an actual run', async () => {
    const { runner, calls } = recordRunner((cmd, args) => {
      if (cmd === 'mtr' && args.includes('--version')) return { code: 0, stdout: 'mtr 0.95', stderr: '' };
      if (cmd === 'mtr' && args.includes('--json')) {
        return { code: 0, stdout: '{\n  "report": { "hubs": [] }\n}\n', stderr: '' };
      }
      return ENOENT;
    });
    expect(await detectTraceTool(runner, 'linux')).toBe('mtr');
    const probe = calls.find((call) => call.args.includes('-c'));
    expect(probe?.args).toEqual(['--json', '-c', '1', '-n', '127.0.0.1']);
    expect(probe?.opts.shell).toBe(false);
  });

  it('refuses an mtr whose --json run is not JSON, and says why', async () => {
    const { runner } = recordRunner((cmd, args) => {
      if (cmd === 'mtr' && args.includes('--version')) return { code: 0, stdout: 'mtr 0.95', stderr: '' };
      if (cmd === 'mtr') return { code: 1, stdout: '', stderr: 'unknown option --json' };
      return ENOENT;
    });
    expect(await detectTraceTool(runner, 'linux')).toBeNull();
    const message = await noToolMessage(runner, 'linux');
    expect(message).toMatch(/does not emit JSON/i);
    expect(message).toMatch(/traceroute/i);
  });

  it('keeps the plain install hint when no tool is present at all', async () => {
    const { runner } = recordRunner(() => ENOENT);
    expect(await noToolMessage(runner, 'linux')).toMatch(/install one of: mtr/i);
  });

  it('emitsJson tolerates warnings printed before the report', () => {
    expect(emitsJson('mtr: warning\n{"report":{"hubs":[]}}\n')).toBe(true);
    expect(emitsJson('mtr 0.95')).toBe(false);
    expect(emitsJson('')).toBe(false);
    expect(emitsJson('{ broken')).toBe(false);
  });
});
