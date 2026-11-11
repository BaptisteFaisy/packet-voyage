/**
 * Unit tests for the target validation guard (VOY-F-42, VOY-N-03, §18).
 *
 * Verifies:
 *   - acceptance of RFC 1123 hostnames, single IPv4 and single IPv6;
 *   - rejection of CIDR ranges, span ranges, comma/whitespace lists;
 *   - rejection of leading dashes (flag injection such as `-h`, `--help`);
 *   - rejection of shell metacharacters (`;`, `|`, `&`, `$`, backtick, …);
 *   - rejection of empty and non-host input;
 *   - `voyage trace <invalid>` exits with status code 2 (CONTRACTS §5.8).
 */
import { describe, expect, it } from 'vitest';
import { runCli } from './cli.ts';
import { createFakeDeps, createFakeIo } from './testing/fakes.ts';
import { isIpv4, isIpv6, isValidHost, validateHost } from './validate-host.ts';
import type { HostRejection } from './validate-host.ts';

function expectRejected(input: unknown, reason: HostRejection): void {
  const res = validateHost(input);
  expect(res.ok, `expected ${JSON.stringify(input)} to be rejected`).toBe(false);
  if (!res.ok) expect(res.reason).toBe(reason);
}

describe('VOY-F-42 validateHost accepts single hosts', () => {
  it('accepts valid RFC 1123 hostnames', () => {
    const valid = [
      'example.com',
      'www.example.org',
      'a.b.c.fr',
      'root-servers.net',
      'localhost',
      'k.root-servers.net.',
      'server1.sub-domain.example.co.uk',
      'x.org',
    ];
    for (const host of valid) {
      const res = validateHost(host);
      expect(res.ok, `expected ${host} to be valid`).toBe(true);
      if (res.ok) expect(res.family).toBe('hostname');
      expect(isValidHost(host)).toBe(true);
    }
  });

  it('accepts valid single IPv4 addresses', () => {
    for (const ip of ['192.0.2.1', '198.51.100.42', '203.0.113.80', '8.8.8.8', '0.0.0.0']) {
      expect(isIpv4(ip)).toBe(true);
      const res = validateHost(ip);
      expect(res.ok, `expected ${ip} to be valid`).toBe(true);
      if (res.ok) expect(res.family).toBe(4);
    }
  });

  it('accepts valid single IPv6 addresses', () => {
    const valid = ['::1', '2001:db8::1', '2001:0db8:0000:0000:0000:0000:0000:0001', '2606:4700:4700::1111', '::ffff:192.0.2.1'];
    for (const ip of valid) {
      expect(isIpv6(ip)).toBe(true);
      const res = validateHost(ip);
      expect(res.ok, `expected ${ip} to be valid`).toBe(true);
      if (res.ok) expect(res.family).toBe(6);
    }
  });
});

describe('VOY-F-42 validateHost rejects ranges and lists (§18)', () => {
  it('rejects CIDR ranges (no prefixes allowed)', () => {
    for (const range of ['192.0.2.0/24', '198.51.100.0/24', '2001:db8::/32', '10.0.0.0/8', '8.8.8.8/32']) {
      expectRejected(range, 'range');
    }
  });

  it('rejects span ranges (start-end)', () => {
    expectRejected('192.0.2.1-10', 'range');
    expectRejected('192.0.2.1 - 192.0.2.10', 'range');
    expectRejected('10.0.0.1-10.0.0.5', 'range');
    expectRejected('example.com/path', 'range');
  });

  it('rejects comma and whitespace lists', () => {
    expectRejected('example.com,example.org', 'list');
    expectRejected('192.0.2.1,192.0.2.2', 'list');
    expectRejected('a.com b.com', 'list');
    expectRejected('192.0.2.1\t192.0.2.2', 'list');
    expectRejected('example.com\n192.0.2.1', 'list');
    expectRejected(' 192.0.2.1 ', 'list');
  });
});

describe('VOY-F-42 validateHost rejects dash and shell injection (§18)', () => {
  it('rejects leading dashes (flag injection prevention)', () => {
    for (const dash of ['-h', '--help', '--foo', '-6', '-c3', '-T', '--version', '-']) {
      expectRejected(dash, 'leading-dash');
    }
  });

  it('rejects shell metacharacters', () => {
    const attacks = [
      'example.com;id',
      'example.com|cat /etc/passwd',
      'example.com&echo pwned',
      'example.com$(whoami)',
      'example.com`id`',
      'example.com>out',
      'example.com<in',
      'example*.com',
      'example?.com',
      '{example,test}.com',
      'example.com\\foo',
    ];
    for (const attack of attacks) {
      expectRejected(attack, 'metacharacter');
    }
  });

  it('rejects empty, missing, or non-host strings', () => {
    expect(validateHost('').ok).toBe(false);
    expect(validateHost('   ').ok).toBe(false);
    expect(validateHost(undefined).ok).toBe(false);
    expect(validateHost(null).ok).toBe(false);
    expect(validateHost('256.0.0.1').ok).toBe(false);
    expect(validateHost('01.02.03.04').ok).toBe(false);
    expect(validateHost('2001:db8::1::2').ok).toBe(false);
    expect(validateHost('fe80::1%eth0').ok).toBe(false);
  });
});

describe('§18 CLI exit code 2 for refused targets', () => {
  async function traceCode(target: string): Promise<{ code: number; err: string }> {
    const io = createFakeIo();
    const code = await runCli(['trace', target], { io, depsLoader: async () => createFakeDeps() });
    return { code, err: io.err.join('') };
  }

  it('exits 2 for a CIDR range', async () => {
    const { code, err } = await traceCode('192.0.2.0/24');
    expect(code).toBe(2);
    expect(err).toMatch(/ranges are refused/i);
  });

  it('exits 2 for a comma list', async () => {
    const { code, err } = await traceCode('example.com,example.org');
    expect(code).toBe(2);
    expect(err).toMatch(/lists are refused/i);
  });

  it('exits 2 for a dash-prefixed argument', async () => {
    const { code } = await traceCode('-x');
    expect(code).toBe(2);
  });

  it('exits 2 for a shell injection attempt', async () => {
    const { code, err } = await traceCode('example.com;id');
    expect(code).toBe(2);
    expect(err).toMatch(/metacharacter/i);
  });

  it('exits 2 when the host argument is missing', async () => {
    const io = createFakeIo();
    const code = await runCli(['trace'], { io, depsLoader: async () => createFakeDeps() });
    expect(code).toBe(2);
    expect(io.err.join('')).toMatch(/no host given/i);
  });
});
