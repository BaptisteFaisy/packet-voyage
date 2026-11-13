import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createMcpServer, runStdioServer } from './index.ts';

describe('MCP lifecycle (VOY-F-46)', () => {
  it('handles initialize, notifications/initialized, and tools/list with all 4 tools', async () => {
    const server = createMcpServer();
    const initLine = await server.handleLine(
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
    );
    expect(JSON.parse(initLine!).result.protocolVersion).toBe('2024-11-05');

    const notif = await server.handleLine(
      JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    );
    expect(notif).toBeNull();

    const listLine = await server.handleLine(
      JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
    );
    const names = (JSON.parse(listLine!).result.tools as Array<{ name: string }>).map((t) => t.name);
    expect(names).toEqual(['trace_host', 'read_trace', 'explain_journey', 'compare_journeys']);
  });

  it('streams newline-delimited JSON-RPC over stdio', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const chunks: string[] = [];
    output.on('data', (c: Buffer) => chunks.push(c.toString('utf8')));

    const done = runStdioServer({}, { input, output });
    input.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' })}\n`);
    input.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
    input.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' })}\n`);
    input.end();
    await done;

    const lines = chunks.join('').trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!).id).toBe(1);
    expect(JSON.parse(lines[1]!).id).toBe(2);
  });

  it('returns JSON-RPC parse error on malformed JSON and -32601 on unknown method', async () => {
    const server = createMcpServer();
    const bad = await server.handleLine('{bad json');
    expect(JSON.parse(bad!).error.code).toBe(-32700);

    const unknown = await server.handleLine(
      JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'unknown/method' }),
    );
    expect(JSON.parse(unknown!).error.code).toBe(-32601);
  });
});
