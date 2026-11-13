import { computeJourney } from '@packet-voyage/core';
import { JourneySchema } from '@packet-voyage/schema';
import type { Journey } from '@packet-voyage/schema';
import { compareJourneys } from './compare.ts';
import { explainJourney } from './explain.ts';
import {
  checkTraceAllowed,
  createGuardState,
  markTraceFinished,
  markTraceStarted,
} from './guard.ts';
import type { GuardState } from './guard.ts';
import type {
  LiveTraceParams,
  McpServerDeps,
  ToolCallResult,
  TraceFamily,
  TraceProtocol,
  TracerOutput,
  TraceSourceInput,
} from './types.ts';

function toolOk(payload: unknown): ToolCallResult {
  const structured =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : { value: payload };
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    structuredContent: structured,
  };
}

function toolError(payload: unknown): ToolCallResult {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const structured =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : { error: text };
  return {
    content: [{ type: 'text', text }],
    structuredContent: structured,
    isError: true,
  };
}

function parseSource(raw: unknown): TraceSourceInput | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.lat !== 'number' || typeof obj.lon !== 'number') {
    throw new Error('from must carry numeric lat and lon');
  }
  return {
    lat: obj.lat,
    lon: obj.lon,
    ...(typeof obj.label === 'string' ? { label: obj.label } : {}),
    ...(typeof obj.country === 'string' ? { country: obj.country } : {}),
  };
}

function buildOfflineJourney(
  text: string,
  from: TraceSourceInput | undefined,
  deps: McpServerDeps,
  tracedAt?: string,
): Journey {
  const datasets = deps.datasets ?? {};
  return computeJourney({
    text,
    source: from ?? null,
    tracedAt: tracedAt ?? (deps.nowIso ? deps.nowIso() : new Date().toISOString()),
    hints: datasets.hints ?? [],
    cables: datasets.cables ?? [],
    masses: datasets.masses ?? [],
    links: datasets.links ?? [],
    credits: datasets.credits ?? [],
  });
}

function normalizeTracerOutput(
  out: TracerOutput,
  from: TraceSourceInput | undefined,
  deps: McpServerDeps,
): { journey: Journey; filePath: string | null } {
  if (typeof out === 'string') {
    return { journey: buildOfflineJourney(out, from, deps), filePath: null };
  }
  if ('journey' in out) {
    const parsed = JourneySchema.parse(out.journey);
    return { journey: parsed, filePath: out.filePath ?? null };
  }
  return {
    journey: buildOfflineJourney(out.text, from, deps, out.tracedAt),
    filePath: out.filePath ?? null,
  };
}

function parseTraceHostParams(args: Record<string, unknown>): LiveTraceParams {
  const host = String(args.host).trim();
  const family = args.family === 4 || args.family === 6 ? (args.family as TraceFamily) : undefined;
  const protocol =
    args.protocol === 'icmp' || args.protocol === 'udp' || args.protocol === 'tcp'
      ? (args.protocol as TraceProtocol)
      : undefined;
  const from = parseSource(args.from);
  return {
    host,
    ...(family !== undefined ? { family } : {}),
    ...(protocol !== undefined ? { protocol } : {}),
    ...(from !== undefined ? { from } : {}),
  };
}

async function handleTraceHost(
  args: Record<string, unknown>,
  state: GuardState,
  deps: McpServerDeps,
): Promise<ToolCallResult> {
  const nowMs = deps.nowMs ? deps.nowMs() : Date.now();
  const check = checkTraceAllowed(state, {
    host: args.host,
    approved: args.approved,
    nowMs,
  });
  if (!check.ok) {
    return toolError(check.refusal);
  }
  if (!deps.tracer) {
    return toolError({
      ok: false,
      code: 'no_live_tracer',
      message: 'No live tracer configured in unit mode.',
    });
  }
  let params: LiveTraceParams;
  try {
    params = parseTraceHostParams(args);
  } catch (err) {
    return toolError({ ok: false, code: 'invalid_arguments', message: (err as Error).message });
  }
  markTraceStarted(state, nowMs);
  try {
    const raw = await deps.tracer(params);
    const { journey, filePath } = normalizeTracerOutput(raw, params.from, deps);
    return toolOk({
      ok: true,
      summary: journey.summary,
      file_path: filePath,
      journey,
    });
  } catch (err) {
    return toolError({ ok: false, code: 'trace_failed', message: (err as Error).message });
  } finally {
    markTraceFinished(state);
  }
}

function handleReadTrace(args: Record<string, unknown>, deps: McpServerDeps): ToolCallResult {
  if (typeof args.text !== 'string' || args.text.trim().length === 0) {
    return toolError({ ok: false, code: 'invalid_arguments', message: 'read_trace requires a non-empty text string.' });
  }
  try {
    const from = parseSource(args.from);
    const journey = buildOfflineJourney(args.text, from, deps);
    return toolOk({ journey });
  } catch (err) {
    return toolError({ ok: false, code: 'read_failed', message: (err as Error).message });
  }
}

async function resolveJourneyArg(
  raw: unknown,
  pathArg: unknown,
  deps: McpServerDeps,
): Promise<Journey> {
  let candidate = raw;
  if (candidate === undefined && typeof pathArg === 'string') {
    if (!deps.readFile) {
      throw new Error('journey_path reading is not configured on this server instance.');
    }
    candidate = JSON.parse(await deps.readFile(pathArg)) as unknown;
  }
  const parsed = JourneySchema.safeParse(candidate);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid journey: ${issues.join('; ')}`);
  }
  return parsed.data;
}

async function handleExplainJourney(args: Record<string, unknown>, deps: McpServerDeps): Promise<ToolCallResult> {
  try {
    const journey = await resolveJourneyArg(args.journey, args.journey_path, deps);
    return toolOk(explainJourney(journey));
  } catch (err) {
    return toolError({ ok: false, code: 'invalid_journey', message: (err as Error).message });
  }
}

function handleCompareJourneys(args: Record<string, unknown>): ToolCallResult {
  const aParsed = JourneySchema.safeParse(args.a);
  if (!aParsed.success) {
    const issues = aParsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    return toolError({ ok: false, code: 'invalid_journey_a', message: `Invalid journey a: ${issues.join('; ')}` });
  }
  const bParsed = JourneySchema.safeParse(args.b);
  if (!bParsed.success) {
    const issues = bParsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    return toolError({ ok: false, code: 'invalid_journey_b', message: `Invalid journey b: ${issues.join('; ')}` });
  }
  return toolOk(compareJourneys(aParsed.data, bParsed.data));
}

export function createToolDispatcher(deps: McpServerDeps = {}) {
  const guardState = createGuardState();

  return async function callTool(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<ToolCallResult> {
    switch (name) {
      case 'trace_host':
        return handleTraceHost(args, guardState, deps);
      case 'read_trace':
        return handleReadTrace(args, deps);
      case 'explain_journey':
        return handleExplainJourney(args, deps);
      case 'compare_journeys':
        return handleCompareJourneys(args);
      default:
        return toolError({ ok: false, code: 'unknown_tool', message: `Unknown tool: ${name}` });
    }
  };
}
