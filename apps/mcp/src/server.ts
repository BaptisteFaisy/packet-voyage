import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { MCP_PROTOCOL_VERSION, MCP_SERVER_INFO, MCP_TOOLS } from './tools-schema.ts';
import { createToolDispatcher } from './tools.ts';
import type { JsonRpcRequest, JsonRpcResponse, McpServerDeps } from './types.ts';

function errorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: data !== undefined ? { code, message, data } : { code, message },
  };
}

function isValidRequest(msg: unknown): msg is JsonRpcRequest {
  if (!msg || typeof msg !== 'object') return false;
  const obj = msg as Record<string, unknown>;
  return obj.jsonrpc === '2.0' && typeof obj.method === 'string';
}

export interface McpServer {
  handleMessage: (msg: unknown) => Promise<JsonRpcResponse | null>;
  handleLine: (line: string) => Promise<string | null>;
}

function withDefaultDeps(deps: McpServerDeps): McpServerDeps {
  return {
    readFile: deps.readFile ?? ((p: string) => readFile(p, 'utf8')),
    ...deps,
  };
}

async function dispatchMethod(
  req: JsonRpcRequest,
  callTool: ReturnType<typeof createToolDispatcher>,
): Promise<unknown> {
  switch (req.method) {
    case 'initialize':
      return {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: MCP_SERVER_INFO,
      };
    case 'ping':
      return {};
    case 'tools/list':
      return { tools: MCP_TOOLS };
    case 'tools/call': {
      const params = req.params ?? {};
      const name = typeof params.name === 'string' ? params.name : '';
      const args =
        params.arguments && typeof params.arguments === 'object'
          ? (params.arguments as Record<string, unknown>)
          : {};
      return callTool(name, args);
    }
    default:
      throw { code: -32601, message: `Method not found: ${req.method}` };
  }
}

export function createMcpServer(deps: McpServerDeps = {}): McpServer {
  const callTool = createToolDispatcher(withDefaultDeps(deps));

  async function handleMessage(msg: unknown): Promise<JsonRpcResponse | null> {
    if (!isValidRequest(msg)) {
      const id =
        msg && typeof msg === 'object' && 'id' in msg
          ? ((msg as { id?: string | number | null }).id ?? null)
          : null;
      return errorResponse(id, -32600, 'Invalid Request');
    }
    if (msg.id === undefined || msg.method.startsWith('notifications/')) {
      return null;
    }
    const id = msg.id ?? null;
    try {
      const result = await dispatchMethod(msg, callTool);
      return { jsonrpc: '2.0', id, result };
    } catch (err) {
      const rpcErr = err as { code?: number; message?: string };
      const code = typeof rpcErr.code === 'number' ? rpcErr.code : -32603;
      const message = typeof rpcErr.message === 'string' ? rpcErr.message : 'Internal error';
      return errorResponse(id, code, message);
    }
  }

  async function handleLine(line: string): Promise<string | null> {
    const trimmed = line.trim();
    if (!trimmed) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return JSON.stringify(errorResponse(null, -32700, 'Parse error'));
    }
    const response = await handleMessage(parsed);
    return response ? JSON.stringify(response) : null;
  }

  return { handleMessage, handleLine };
}

export interface StdioStreams {
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
}

export async function runStdioServer(
  deps: McpServerDeps = {},
  streams: StdioStreams = {},
): Promise<void> {
  const input = streams.input ?? process.stdin;
  const output = streams.output ?? process.stdout;
  const server = createMcpServer(deps);
  const rl = createInterface({ input, crlfDelay: Infinity });

  for await (const line of rl) {
    const reply = await server.handleLine(line);
    if (reply !== null) {
      output.write(`${reply}\n`);
    }
  }
}
