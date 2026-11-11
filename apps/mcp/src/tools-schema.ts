import type { McpToolDefinition } from './types.ts';

export const MCP_PROTOCOL_VERSION = '2024-11-05';
export const MCP_SERVER_INFO = {
  name: 'packet-voyage-mcp',
  version: '0.1.0',
} as const;

const SOURCE_SCHEMA = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    lat: { type: 'number' },
    lon: { type: 'number' },
    country: { type: 'string' },
  },
  required: ['lat', 'lon'],
  additionalProperties: false,
} as const;

export const MCP_TOOLS: readonly McpToolDefinition[] = [
  {
    name: 'trace_host',
    description:
      'Run a single-host network trace subject to VOY-N-02 ethics guardrails: explicit approved=true, single valid host, one trace at a time, at least 5 s cooldown, and at most 20 traces per session.',
    inputSchema: {
      type: 'object',
      properties: {
        host: { type: 'string', description: 'Single target hostname or IP address (no ranges, no lists, no leading dash).' },
        family: { type: 'integer', enum: [4, 6] },
        protocol: { type: 'string', enum: ['icmp', 'udp', 'tcp'] },
        approved: { type: 'boolean', description: 'Must be true to confirm explicit user approval for this trace.' },
        from: SOURCE_SCHEMA,
      },
      required: ['host', 'approved'],
      additionalProperties: false,
    },
  },
  {
    name: 'read_trace',
    description: 'Parse a traceroute/mtr/tracert/Atlas text offline and compute a physical journey using router-name hints only (zero network).',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Raw trace output to parse offline.' },
        from: SOURCE_SCHEMA,
      },
      required: ['text'],
      additionalProperties: false,
    },
  },
  {
    name: 'explain_journey',
    description: 'Return structured facts from a Journey (stops, segments, detours, light rejections), each carrying its certainty level and honest §5.4 wording.',
    inputSchema: {
      type: 'object',
      properties: {
        journey: { type: 'object', description: 'A Journey JSON object matching JourneySchema.' },
        journey_path: { type: 'string', description: 'Optional path to a Journey JSON file.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'compare_journeys',
    description: 'Compare two Journey objects side by side (distance_km_min, rtt_ms, inflation, countries, networks, detours, rejected_by_light).',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'object', description: 'Baseline Journey JSON object.' },
        b: { type: 'object', description: 'Comparison Journey JSON object.' },
      },
      required: ['a', 'b'],
      additionalProperties: false,
    },
  },
];
