import type { Cable, FixedLink, HintCity, Journey, Landmass } from '@packet-voyage/schema';

export type TraceFamily = 4 | 6;
export type TraceProtocol = 'icmp' | 'udp' | 'tcp';

export interface TraceSourceInput {
  label?: string;
  lat: number;
  lon: number;
  country?: string;
}

export interface TraceHostInput {
  host: string;
  family?: TraceFamily;
  protocol?: TraceProtocol;
  approved: boolean;
  from?: TraceSourceInput;
}

export interface ReadTraceInput {
  text: string;
  from?: TraceSourceInput;
}

export interface ExplainJourneyInput {
  journey?: unknown;
  journey_path?: string;
}

export interface CompareJourneysInput {
  a: unknown;
  b: unknown;
}

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
}

export interface ToolTextContent {
  type: 'text';
  text: string;
}

export interface ToolCallResult {
  content: ToolTextContent[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface LiveTraceParams {
  host: string;
  family?: TraceFamily;
  protocol?: TraceProtocol;
  from?: TraceSourceInput;
}

export type TracerOutput =
  | string
  | { text: string; tracedAt?: string; filePath?: string | null }
  | { journey: Journey; filePath?: string | null };

export type TraceRunner = (params: LiveTraceParams) => Promise<TracerOutput>;

export interface McpDatasets {
  hints?: HintCity[];
  cables?: Cable[];
  masses?: Landmass[];
  links?: FixedLink[];
  credits?: string[];
}

export interface McpServerDeps {
  /** Injected tracer callback for `trace_host`; unit mode returns explicit error if absent. */
  tracer?: TraceRunner;
  /** Injected clock in milliseconds for cooldown enforcement (VOY-N-02). */
  nowMs?: () => number;
  /** Injected RFC 3339 timestamp provider for `read_trace` / `trace_host`. */
  nowIso?: () => string;
  /** Optional datasets for `computeJourney` (name hints, cables, landmasses, fixed links). */
  datasets?: McpDatasets;
  /** Optional file reader for `explain_journey` when given `journey_path`. */
  readFile?: (filePath: string) => Promise<string>;
}
