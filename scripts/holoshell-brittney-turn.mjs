#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import {
  buildReceipt as buildAgentDispatchReceipt,
  persist as persistAgentDispatchReceipt,
} from './holoshell-agent-dispatch.mjs';

const SCHEMA_VERSION = 'hololand.holoshell.brittney-turn.v0.1.0';
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_HOLOSCRIPT_ROOT = process.env.HOLOSCRIPT_REPO || path.resolve(REPO_ROOT, '..', 'HoloScript');
const DEFAULT_TMP = path.join('.tmp', 'holoshell');
const DEFAULT_TURNS_DIR = path.join(DEFAULT_TMP, 'brittney-turns');
const DEFAULT_LATEST = path.join(DEFAULT_TMP, 'brittney-turn-latest.json');
const DEFAULT_JS_OUTPUT = path.join(DEFAULT_TMP, 'brittney-turn-latest.js');
const DEFAULT_EMBED_CACHE = path.join(DEFAULT_TMP, 'turn-embeddings.json');
const DEFAULT_FOUNDER_PROMPTS = path.join(DEFAULT_TMP, 'founder-prompt-fixtures.json');
const DEFAULT_AGENT_DISPATCH = path.join(DEFAULT_TMP, 'agent-dispatch-latest.json');
const DEFAULT_AGENT_DISPATCH_JS = path.join(DEFAULT_TMP, 'agent-dispatch-latest.js');
const DEFAULT_AGENT_DISPATCH_DIR = path.join(DEFAULT_TMP, 'agent-dispatches');

function parseArgs(argv) {
  const args = {
    prompt: 'Prepare this computer for HoloLand work',
    json: false,
    selfTest: false,
    timeoutMs: 20_000,
    maxIterations: 3,
    holoscriptRoot: DEFAULT_HOLOSCRIPT_ROOT,
    turnsDir: DEFAULT_TURNS_DIR,
    latestOutput: DEFAULT_LATEST,
    jsOutput: DEFAULT_JS_OUTPUT,
    relational: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    else if (arg === '--prompt') args.prompt = argv[++index];
    else if (arg === '--json') args.json = true;
    else if (arg === '--self-test') args.selfTest = true;
    else if (arg === '--relational') args.relational = true;
    else if (arg === '--timeout-ms') args.timeoutMs = Number(argv[++index]);
    else if (arg === '--max-iterations') args.maxIterations = Number(argv[++index]);
    else if (arg === '--holoscript-root') args.holoscriptRoot = argv[++index];
    else if (arg === '--turns-dir') args.turnsDir = argv[++index];
    else if (arg === '--latest-output') args.latestOutput = argv[++index];
    else if (arg === '--js-output') args.jsOutput = argv[++index];
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`HoloShell Brittney turn bridge

Usage:
  node scripts/holoshell-brittney-turn.mjs --prompt "open browser" [options]

Options:
  --prompt <text>              User turn to route into @holoscript/aibrittney.
  --json                       Print the generated turn receipt.
  --self-test                  Use a deterministic local fetch/MCP harness.
  --timeout-ms <n>             Runtime timeout. Defaults to 20000.
  --max-iterations <n>         AIBrittney tool-loop cap. Defaults to 3.
  --holoscript-root <path>     HoloScript repo path. Defaults to sibling repo or HOLOSCRIPT_REPO.
  --turns-dir <path>           Receipt history directory. Defaults to .tmp/holoshell/brittney-turns.
  --latest-output <path>       Latest receipt path. Defaults to .tmp/holoshell/brittney-turn-latest.json.
  --js-output <path>           Browser bootstrap path. Defaults to .tmp/holoshell/brittney-turn-latest.js.
  -h, --help                   Show this help.
`);
}

function resolveRepoPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(REPO_ROOT, filePath);
}

function readJson(filePath, fallback = null) {
  const resolved = resolveRepoPath(filePath);
  if (!existsSync(resolved)) return fallback;
  try {
    return JSON.parse(readFileSync(resolved, 'utf8'));
  } catch {
    return fallback;
  }
}

function hashText(text) {
  return createHash('sha256').update(text).digest('hex');
}

function stableId(prefix, text) {
  return `${prefix}_${hashText(text).slice(0, 12)}`;
}

function classifyOllamaHost(host) {
  try {
    const url = new URL(host);
    const localNames = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
    if (localNames.has(url.hostname)) return 'local';
    if (
      url.hostname.startsWith('192.168.') ||
      url.hostname.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(url.hostname)
    ) {
      return 'lan';
    }
    return 'remote';
  } catch {
    return 'unknown';
  }
}

function mapEventToAvatar(kind) {
  if (kind === 'thinking') return { pipelineStage: 'processing', emotion: 'focused', voiceState: 'quiet', mouthState: 'thinking' };
  if (kind === 'tool-call') return { pipelineStage: 'acting', emotion: 'focused', voiceState: 'ready', mouthState: 'rest' };
  if (kind === 'tool-result') return { pipelineStage: 'receipt', emotion: 'calm', voiceState: 'ready', mouthState: 'rest' };
  if (kind === 'final') return { pipelineStage: 'speaking', emotion: 'attentive', voiceState: 'speaking', mouthState: 'speaking' };
  if (kind === 'error') return { pipelineStage: 'error', emotion: 'concerned', voiceState: 'quiet', mouthState: 'rest' };
  return { pipelineStage: 'idle', emotion: 'attentive', voiceState: 'ready', mouthState: 'rest' };
}

function normalizeEvent(event) {
  return {
    kind: event.kind,
    message: String(event.message || ''),
    data: event.data ?? null,
    avatar: mapEventToAvatar(event.kind),
    recordedAt: new Date().toISOString(),
  };
}

function createActionProposals(prompt) {
  const text = `${prompt}`.toLowerCase();
  const proposals = [];
  const add = (objectId, label, operation, permissionEnvelope = 'read_only', reason = '') => {
    if (proposals.some((proposal) => proposal.objectId === objectId && proposal.operation === operation)) return;
    proposals.push({
      id: stableId('proposal', `${objectId}:${operation}:${prompt}`),
      objectId,
      label,
      operation,
      permissionEnvelope,
      mutating: permissionEnvelope !== 'read_only',
      approvalRequired: permissionEnvelope !== 'read_only',
      receiptRequired: true,
      reason,
    });
  };

  if (/\b(browser|web|url|site|page|internet|chrome|edge)\b/.test(text)) {
    add('browser', 'Browser', 'focus_shell_object', 'read_only', 'User intent mentions browser or web surface.');
  }
  if (/\b(file|folder|project|repo|document|directory|workspace)\b/.test(text)) {
    add('files', 'Files', 'focus_shell_object', 'read_only', 'User intent mentions files or local project context.');
  }
  if (/\b(agent|codex|claude|gemini|copilot|team|mesh)\b/.test(text)) {
    add('agents', 'Agents', 'focus_shell_object', 'read_only', 'User intent mentions agents or team lanes.');
  }
  if (/\b(program|app|application|legacy|window|ui|control)\b/.test(text)) {
    add('programs', 'Programs', 'focus_shell_object', 'read_only', 'User intent mentions programs or legacy UI.');
  }
  if (/\b(captured|window|click|legacy ui|old ui)\b/.test(text)) {
    add('captured-ui', 'Captured UI', 'focus_shell_object', 'read_only', 'User intent mentions captured legacy windows.');
  }
  if (/\b(command|terminal|shell|run|build|test|script)\b/.test(text)) {
    add('terminal', 'Command', 'focus_shell_object', 'read_only', 'User intent mentions command execution.');
  }
  if (/\b(hololand|computer|desktop|shell|prepare|start)\b/.test(text)) {
    add('hololand', 'HoloLand', 'focus_shell_object', 'read_only', 'User intent mentions the operating world.');
  }

  if (proposals.length === 0) {
    add('brittney', 'Brittney', 'summarize_shell_state', 'read_only', 'No specific shell object was named; keep the turn with Brittney.');
  }

  return proposals.slice(0, 5);
}

function looksLikePlainTextToolCall(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return false;
  try {
    const parsed = JSON.parse(trimmed);
    return Boolean(parsed?.name && parsed?.arguments);
  } catch {
    return false;
  }
}

function userFacingFinalText({ prompt, finalText, resultOk, proposals }) {
  const cleanText = String(finalText || '').trim();
  // HONESTY (edge-and-gap audit 2026-06-17): show the model's REAL reply — including
  // refusals ("I have no working tool for that"), self-report, and answers that name a
  // tool. The ONLY thing suppressed is a raw JSON tool-call payload leaking as the final
  // answer (bad UX, not a reply). We NO LONGER swap honest text for the canned
  // "I staged <X> ... read_only envelope" template: that masked real failures and falsely
  // labeled write requests (e.g. a `systemctl restart`) "read_only" — fatal for a
  // verifiable-claim surface. The old needsOperatorSanitize over-matched (ANY holo_*
  // mention, ANY clarifying question) and is removed.
  if (cleanText && !looksLikePlainTextToolCall(cleanText)) {
    return cleanText;
  }
  // No usable model text (empty / raw JSON dump). Offer the closest real proposal
  // HONESTLY — never implying an action was taken or inventing a permission envelope.
  const first = proposals[0];
  if (first) {
    return `I can't do that directly in this build. The closest I can stage is "${first.label}" (${first.operation}).`;
  }
  return resultOk
    ? cleanText || `I received "${prompt}" but have no working capability for it yet.`
    : "I don't have a working capability for that yet.";
}

function createLaptopReasoningDelegation(args) {
  const dispatchArgs = {
    actor: 'brittney',
    intent: args.prompt,
    prompt: args.prompt,
    output: DEFAULT_AGENT_DISPATCH,
    jsOutput: DEFAULT_AGENT_DISPATCH_JS,
    dispatchDir: DEFAULT_AGENT_DISPATCH_DIR,
  };
  const dispatch = buildAgentDispatchReceipt(dispatchArgs);
  if (dispatch.summary.capabilityId !== 'laptop_reasoning_job') {
    return {
      status: 'not_needed',
      capabilityId: dispatch.summary.capabilityId,
      confidence: dispatch.summary.confidence,
      reasonCodes: [],
      receiptRequired: false,
    };
  }
  const persisted = persistAgentDispatchReceipt(dispatchArgs, dispatch);
  return {
    status: 'delegated',
    dispatchId: persisted.dispatchId,
    capabilityId: persisted.summary.capabilityId,
    capabilityLabel: persisted.summary.capabilityLabel,
    confidence: persisted.summary.confidence,
    route: persisted.summary.route,
    dispatchKind: persisted.summary.dispatchKind,
    permissionEnvelope: persisted.summary.permissionEnvelope,
    approvalRequired: persisted.summary.approvalRequired,
    targetHost: persisted.summary.targetHost,
    lane: persisted.summary.reasoningLane,
    agentLane: persisted.summary.agentLane,
    canonicalProviderId: persisted.summary.canonicalProviderId,
    workload: persisted.summary.workload,
    delegationMode: persisted.summary.delegationMode,
    reasonCodes: persisted.summary.reasonCodes || [],
    reuseBeforeBuild: persisted.summary.reuseBeforeBuild,
    duplicateWorkPolicy: persisted.summary.duplicateWorkPolicy,
    goldRoot: persisted.summary.goldRoot,
    goldRuntimeStatus: persisted.summary.goldRuntimeStatus,
    claudeInjectionRoute: persisted.summary.claudeInjectionRoute,
    studioOrchestrator: persisted.summary.studioOrchestrator,
    vastSpendRail: persisted.summary.vastSpendRail,
    vastEscalationGate: persisted.summary.vastEscalationGate,
    workloadFocus: persisted.dispatch.body.workloadFocus || {},
    canonicalSurfaces: persisted.dispatch.body.canonicalSurfaces || {},
    budgetPolicy: persisted.dispatch.body.budgetPolicy || {},
    latestPath: persisted.output.latestPath,
    dispatchReceiptPath: persisted.output.dispatchReceiptPath,
    promptHash: persisted.dispatch.body.promptHash,
    promptChars: persisted.dispatch.body.promptChars,
    wordCount: persisted.dispatch.body.wordCount,
    receiptRequired: true,
    destructiveActionsTaken: false,
    desktopAutomationExecuted: false,
  };
}

function createLaptopReasoningProposal(delegation) {
  if (delegation?.status !== 'delegated') return null;
  return {
    id: stableId('proposal', `laptop-reasoning:${delegation.dispatchId}`),
    objectId: 'laptop-reasoning',
    label: 'Laptop Reasoning',
    operation: 'dispatch_laptop_reasoning_job',
    permissionEnvelope: 'read_only',
    mutating: false,
    approvalRequired: false,
    receiptRequired: true,
    dispatchId: delegation.dispatchId,
    lane: delegation.lane,
    targetHost: delegation.targetHost,
    agentLane: delegation.agentLane,
    canonicalProviderId: delegation.canonicalProviderId,
    reuseBeforeBuild: delegation.reuseBeforeBuild,
    reason: `Jetson delegated this prompt for laptop reasoning (${delegation.reasonCodes.join(', ') || 'router threshold'}).`,
  };
}

function laptopReasoningDelegatedText(delegation) {
  return [
    `I staged a read-only laptop reasoning job (${delegation.dispatchId}) for the Codex hardware lane.`,
    `Target: ${delegation.targetHost}; lane: ${delegation.lane}; receipt: ${delegation.dispatchReceiptPath}.`,
    "I won't claim the laptop has answered until a result receipt comes back.",
  ].join(' ');
}

function createShellContext() {
  const brittneyContext = readJson(path.join(DEFAULT_TMP, 'brittney-context.json'), {});
  if (brittneyContext?.summary) {
    return {
      source: '.tmp/holoshell/brittney-context.json',
      status: brittneyContext.summary.status || 'unknown',
      selectedShellObject: brittneyContext.selectedShellObject || null,
      visibleShellObjects: (brittneyContext.visibleShellObjects || []).slice(0, 12),
      programRegistrySummary: brittneyContext.programRegistrySummary || {},
      activeWorkflowSummary: brittneyContext.activeWorkflowSummary || {},
      approvalSummary: brittneyContext.approvalSummary || {},
      agentLaneSummary: brittneyContext.agentLaneSummary || {},
      processHealthSummary: brittneyContext.processHealthSummary || {},
      operatorBriefSummary: brittneyContext.operatorBriefSummary || {},
      recentReceiptTimeline: (brittneyContext.recentReceiptTimeline || []).slice(0, 10),
      privacyBoundary: brittneyContext.privacyBoundary || {},
      operatorPromptCard: brittneyContext.operatorPromptCard || {},
      blockedActions: brittneyContext.blockedActions || [],
      contextHash: brittneyContext.receipt?.contextHash || brittneyContext.summary.contextHash || '',
    };
  }
  const liveFeed = readJson(path.join(DEFAULT_TMP, 'live-feed.json'), {});
  const summary = liveFeed?.summary || {};
  return {
    source: '.tmp/holoshell/live-feed.json',
    overallRisk: summary.overallRisk || 'unknown',
    capabilityCount: summary.capabilityCount || 0,
    laneCount: summary.laneCount || 0,
    activeLaneCount: summary.activeLaneCount || 0,
    capturedWindowCount: summary.capturedWindowCount || 0,
    capturedGeometryNodeCount: summary.capturedGeometryNodeCount || 0,
    stopPlanCount: summary.stopPlanCount || 0,
    brittneyAvatarStatus: summary.brittneyAvatarStatus || 'unknown',
  };
}

async function importAIBrittney(holoscriptRoot) {
  const packageRoot = path.resolve(holoscriptRoot, 'packages', 'aibrittney');
  const agentPath = path.join(packageRoot, 'dist', 'agent.js');
  const sessionPath = path.join(packageRoot, 'dist', 'session.js');
  const mcpPath = path.join(packageRoot, 'dist', 'mcp-client.js');
  if (!existsSync(agentPath) || !existsSync(sessionPath) || !existsSync(mcpPath)) {
    throw new Error(`@holoscript/aibrittney dist files missing under ${packageRoot}`);
  }
  const [{ runAgentTurn }, { Session, DEFAULT_SYSTEM_PROMPT }, { McpClient, defaultMcpConfig }] = await Promise.all([
    import(pathToFileURL(agentPath).href),
    import(pathToFileURL(sessionPath).href),
    import(pathToFileURL(mcpPath).href),
  ]);
  return { runAgentTurn, Session, DEFAULT_SYSTEM_PROMPT, McpClient, defaultMcpConfig };
}

function createSelfTestHarness() {
  let callCount = 0;
  const fetchImpl = async () => {
    callCount += 1;
    if (callCount === 1) {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        async json() {
          return {
            message: {
              role: 'assistant',
              content: '',
              tool_calls: [
                {
                  id: 'self-test-call-1',
                  function: {
                    name: 'holo_parse_to_graph',
                    arguments: { source: 'object "Brittney" { type: "assistant_avatar" }' },
                  },
                },
              ],
            },
          };
        },
      };
    }
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      async json() {
        return {
          message: {
            role: 'assistant',
            content: 'Runtime self-test complete. I can map the turn into shell objects and attach receipts.',
          },
        };
      },
    };
  };
  const mcp = {
    async callTool({ server, tool, args }) {
      return {
        ok: true,
        status: 200,
        data: { server, tool, args, selfTest: true },
      };
    },
  };
  return { fetchImpl, mcp };
}

/**
 * Resolve (endpoint, model) for this turn across the OWNED-GPU fleet: the native
 * `@model_fleet` brain (HoloScript/compositions/model-fleet.hsplus) consumed by
 * @holoscript/llm-provider's fleet-router picks the least-loaded GPU that holds a
 * non-blacklisted tool-caller — both the Jetson and the laptop RTX 3060 working as
 * ONE local tier. Graceful fallback to a SINGLE local host + a SAFE model when no
 * fleet node is reachable (or the provider dist isn't built).
 *
 * The previous default here was qwen2.5-coder:7b — BLACKLISTED (emits prose, not
 * tool_calls; W.738). The fallback below is the safe local default; an explicit
 * AIBRITTNEY_MODEL env pin still wins (and is policy-checked downstream).
 */
async function resolveFleetRoute(holoscriptRoot, selfTest) {
  const fallback = {
    ollamaHost: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
    model: process.env.AIBRITTNEY_MODEL || 'qwen3:4b-instruct',
    source: process.env.AIBRITTNEY_MODEL ? 'env-pin' : 'fallback',
    reason: null,
  };
  // Self-test uses a deterministic fake fetch — never touch the network/fleet.
  if (selfTest || process.env.AIBRITTNEY_MODEL) return fallback;
  try {
    const providerDist = path.join(holoscriptRoot, 'packages', 'llm-provider', 'dist', 'index.js');
    if (!existsSync(providerDist)) return fallback;
    const { resolveLocalFleet } = await import(pathToFileURL(providerDist).href);
    const brainPath = path.join(holoscriptRoot, 'compositions', 'model-fleet.hsplus');
    const picked = await resolveLocalFleet({ brainPath, model: 'qwen3:4b-instruct', timeoutMs: 5000 });
    if (picked?.baseURL && picked?.model) {
      return {
        ollamaHost: picked.baseURL,
        model: picked.model,
        source: `fleet:${picked.route?.handle ?? '?'}`,
        reason: picked.route?.reason ?? null,
      };
    }
  } catch {
    // dist missing / parse error / all nodes unreachable → single-host fallback
  }
  return fallback;
}

function loadEmbedCache(cachePath) {
  const cache = readJson(cachePath, null);
  if (cache && typeof cache === 'object' && cache.entries && typeof cache.entries === 'object') return cache;
  return { schema: 'holoshell.turn-embeddings.v0.1.0', model: 'nomic-embed-text', dim: 0, entries: {} };
}

function saveEmbedCache(cachePath, cache, dim) {
  try {
    cache.dim = dim || cache.dim || 0;
    writeJson(cachePath, cache);
  } catch {
    // cache is an optimization; a write failure must never break the turn.
  }
}

function truncate(text, max) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function tokenSet(text) {
  return new Set(String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4));
}

function loadFounderPromptFixtures({ prompt, max = 3 } = {}) {
  const fixturePath = DEFAULT_FOUNDER_PROMPTS;
  const fixtureReceipt = readJson(fixturePath, null);
  if (!fixtureReceipt?.fixtures?.length) {
    return {
      status: fixtureReceipt ? 'empty' : 'missing',
      source: fixturePath,
      generatedAt: fixtureReceipt?.generatedAt || '',
      corpusHash: fixtureReceipt?.sourceSummary?.corpusHash || '',
      availableCount: fixtureReceipt?.fixtures?.length || 0,
      selected: [],
      sourceKinds: [],
    };
  }

  const promptTokens = tokenSet(prompt);
  const scored = fixtureReceipt.fixtures.map((fixture) => {
    const fixtureText = `${fixture.inspiration || ''} ${fixture.testPrompt || ''} ${fixture.sourceRef || ''}`;
    const fixtureTokens = tokenSet(fixtureText);
    let overlap = 0;
    for (const token of promptTokens) {
      if (fixtureTokens.has(token)) overlap += 1;
    }
    return {
      ...fixture,
      relevance: overlap + (Number(fixture.priority || 0) / 100),
    };
  });
  scored.sort((a, b) => {
    if (b.relevance !== a.relevance) return b.relevance - a.relevance;
    return (a.rank || 0) - (b.rank || 0);
  });

  const selected = scored.slice(0, max).map((fixture) => ({
    id: fixture.id,
    sourceKind: fixture.sourceKind,
    sourceRef: fixture.sourceRef,
    sourceLine: fixture.sourceLine,
    quoteHash: fixture.quoteHash,
    inspiration: truncate(fixture.inspiration || '', 180),
    testPrompt: truncate(fixture.testPrompt || '', 360),
    rank: fixture.rank,
  }));

  return {
    status: selected.length ? 'ready' : 'empty',
    source: fixturePath,
    generatedAt: fixtureReceipt.generatedAt || '',
    corpusHash: fixtureReceipt.sourceSummary?.corpusHash || '',
    availableCount: fixtureReceipt.fixtures.length,
    selected,
    sourceKinds: [...new Set(selected.map((fixture) => fixture.sourceKind))].sort(),
  };
}

function founderPromptInstruction(founderPromptFixtures) {
  if (!founderPromptFixtures.selected.length) return '';
  return ' shellContext.founderPromptFixtures holds selected local founder-language test prompts from documentation, knowledge, and memory. Use them as inspiration for tone and priorities; do not quote them at length, and do not treat them as model training data.';
}

/**
 * Semantic recall over prior HoloShell turns. Embeds the current prompt on the
 * OWNED fleet (nomic-embed-text → the Jetson, $0) via the same fleet-router the
 * chat uses, then ranks prior turns by cosine similarity of their prompt
 * embeddings and returns the top-K most relevant. A sidecar cache keyed by
 * promptHash means each turn embeds at most itself + a bounded number of new
 * neighbours, never the whole history.
 *
 * ALL best-effort: any miss (no fleet, nomic absent, provider dist unbuilt,
 * self-test) returns an empty recall and the turn proceeds. The recall ONLY
 * enriches the model's context window — it is NEVER surfaced as a HoloShell data
 * panel (F.124: HoloShell is chat; agents process the data in the background).
 */
async function recallSemanticContext({
  prompt,
  promptHash,
  turnsDir,
  holoscriptRoot,
  selfTest,
  topK = 3,
  maxTurns = 40,
  embedBudget = 12,
  minSimilarity = 0.6,
  cachePath = DEFAULT_EMBED_CACHE,
}) {
  if (selfTest) return { recalled: [], embedded: 0, considered: 0, source: 'self-test' };

  let embedAcrossFleet;
  let cosineSimilarity;
  try {
    const providerDist = path.join(holoscriptRoot, 'packages', 'llm-provider', 'dist', 'index.js');
    if (!existsSync(providerDist)) return { recalled: [], embedded: 0, considered: 0, source: 'no-provider-dist' };
    ({ embedAcrossFleet, cosineSimilarity } = await import(pathToFileURL(providerDist).href));
    if (typeof embedAcrossFleet !== 'function' || typeof cosineSimilarity !== 'function') {
      return { recalled: [], embedded: 0, considered: 0, source: 'no-embed-fn' };
    }
  } catch {
    return { recalled: [], embedded: 0, considered: 0, source: 'provider-import-error' };
  }

  const brainPath = path.join(holoscriptRoot, 'compositions', 'model-fleet.hsplus');
  const embed = (text) => embedAcrossFleet(text, { brainPath, timeoutMs: 8000 });

  // Load prior turns (skip the current prompt's own prior receipt), newest first.
  const dir = resolveRepoPath(turnsDir);
  let files = [];
  try {
    files = existsSync(dir) ? readdirSync(dir).filter((file) => file.endsWith('.json')) : [];
  } catch {
    files = [];
  }
  const priors = [];
  for (const file of files) {
    const rec = readJson(path.join(turnsDir, file), null);
    if (!rec?.prompt || !rec?.promptHash || rec.promptHash === promptHash) continue;
    priors.push({
      promptHash: rec.promptHash,
      prompt: rec.prompt,
      finalText: rec.result?.finalText || rec.result?.rawFinalText || '',
      turnId: rec.turnId,
      generatedAt: rec.generatedAt || '',
    });
  }
  priors.sort((a, b) => String(b.generatedAt).localeCompare(String(a.generatedAt)));
  const considered = priors.slice(0, maxTurns);

  const cache = loadEmbedCache(cachePath);

  // Embed the current prompt (cache-first). If this fails, nomic is unreachable —
  // bail so we don't half-rank against a stale query vector.
  const queryVec = cache.entries[promptHash] ?? (await embed(prompt));
  if (!Array.isArray(queryVec) || queryVec.length === 0) {
    return { recalled: [], embedded: 0, considered: considered.length, source: 'embed-unavailable' };
  }
  cache.entries[promptHash] = queryVec;

  if (considered.length === 0) {
    saveEmbedCache(cachePath, cache, queryVec.length);
    return { recalled: [], embedded: 1, considered: 0, source: 'no-priors' };
  }

  let embedded = 0;
  const scored = [];
  for (const prior of considered) {
    let vec = cache.entries[prior.promptHash];
    if ((!Array.isArray(vec) || vec.length === 0) && embedded < embedBudget) {
      vec = await embed(prior.prompt);
      if (Array.isArray(vec) && vec.length > 0) {
        cache.entries[prior.promptHash] = vec;
        embedded += 1;
      }
    }
    if (Array.isArray(vec) && vec.length > 0) {
      scored.push({ ...prior, score: cosineSimilarity(queryVec, vec) });
    }
  }
  saveEmbedCache(cachePath, cache, queryVec.length);

  scored.sort((a, b) => b.score - a.score);
  // Dedupe identical prompts (same promptHash → same vector/score, different turnId)
  // so the top-K shows distinct prior turns, not the same prompt repeated.
  const seenHashes = new Set();
  const recalled = scored
    .filter((entry) => {
      if (entry.score < minSimilarity || seenHashes.has(entry.promptHash)) return false;
      seenHashes.add(entry.promptHash);
      return true;
    })
    .slice(0, topK)
    .map((entry) => ({
      prompt: truncate(entry.prompt, 200),
      response: truncate(entry.finalText, 400),
      similarity: Number(entry.score.toFixed(4)),
      turnId: entry.turnId,
      recalledAt: entry.generatedAt,
    }));

  return { recalled, embedded, considered: considered.length, source: 'fleet-embed' };
}

async function runTurn(args) {
  const generatedAt = new Date().toISOString();
  const turnId = stableId('brittney_turn', `${generatedAt}:${args.prompt}`);
  const promptHash = hashText(args.prompt);
  const shellContext = createShellContext();
  const founderPromptFixtures = loadFounderPromptFixtures({ prompt: args.prompt });
  if (founderPromptFixtures.selected.length) {
    shellContext.founderPromptFixtures = {
      source: founderPromptFixtures.source,
      status: founderPromptFixtures.status,
      generatedAt: founderPromptFixtures.generatedAt,
      corpusHash: founderPromptFixtures.corpusHash,
      availableCount: founderPromptFixtures.availableCount,
      sourceKinds: founderPromptFixtures.sourceKinds,
      items: founderPromptFixtures.selected,
    };
  }
  const holoscriptRoot = path.resolve(args.holoscriptRoot);
  const events = [];
  // Semantic recall: pull the most relevant prior turns into context (nomic on the
  // owned fleet, $0). Best-effort — enriches the model's context only, never a UI
  // panel (F.124). Attached to shellContext so it flows into the turn prompt below.
  const recall = await recallSemanticContext({
    prompt: args.prompt,
    promptHash,
    turnsDir: args.turnsDir,
    holoscriptRoot,
    selfTest: args.selfTest,
  });
  if (recall.recalled.length) {
    shellContext.recalledContext = recall.recalled;
  }
  // Route across the owned-GPU fleet (both cards as one); safe single-host fallback.
  const fleet = await resolveFleetRoute(holoscriptRoot, args.selfTest);
  const ollamaHost = fleet.ollamaHost;
  const routeClass = classifyOllamaHost(ollamaHost);
  const runtime = {
    packageName: '@holoscript/aibrittney',
    entrypoint: 'runAgentTurn',
    status: 'unknown',
    model: fleet.model,
    modelSource: fleet.source,
    fleetRoute: fleet.reason,
    ollamaHostKind: routeClass,
    apiKeyConfigured: Boolean(process.env.OLLAMA_API_KEY),
    secretsExposedToShell: false,
    semanticRecall: {
      count: recall.recalled.length,
      considered: recall.considered,
      embedded: recall.embedded,
      source: recall.source,
    },
    founderPromptFixtures: {
      status: founderPromptFixtures.status,
      selectedCount: founderPromptFixtures.selected.length,
      availableCount: founderPromptFixtures.availableCount,
      sourceKinds: founderPromptFixtures.sourceKinds,
      corpusHash: founderPromptFixtures.corpusHash,
      generatedAt: founderPromptFixtures.generatedAt,
      source: founderPromptFixtures.source,
    },
  };
  runtime.laptopReasoningDelegation = createLaptopReasoningDelegation(args);
  if (runtime.laptopReasoningDelegation.status === 'delegated') {
    shellContext.laptopReasoningDelegation = {
      status: runtime.laptopReasoningDelegation.status,
      dispatchId: runtime.laptopReasoningDelegation.dispatchId,
      route: runtime.laptopReasoningDelegation.route,
      targetHost: runtime.laptopReasoningDelegation.targetHost,
      lane: runtime.laptopReasoningDelegation.lane,
      agentLane: runtime.laptopReasoningDelegation.agentLane,
      canonicalProviderId: runtime.laptopReasoningDelegation.canonicalProviderId,
      workload: runtime.laptopReasoningDelegation.workload,
      permissionEnvelope: runtime.laptopReasoningDelegation.permissionEnvelope,
      reasonCodes: runtime.laptopReasoningDelegation.reasonCodes,
      reuseBeforeBuild: runtime.laptopReasoningDelegation.reuseBeforeBuild,
      duplicateWorkPolicy: runtime.laptopReasoningDelegation.duplicateWorkPolicy,
      goldRoot: runtime.laptopReasoningDelegation.goldRoot,
      goldRuntimeStatus: runtime.laptopReasoningDelegation.goldRuntimeStatus,
      claudeInjectionRoute: runtime.laptopReasoningDelegation.claudeInjectionRoute,
      studioOrchestrator: runtime.laptopReasoningDelegation.studioOrchestrator,
      vastSpendRail: runtime.laptopReasoningDelegation.vastSpendRail,
      receiptRequired: true,
      note: 'A laptop reasoning job has been staged by the Jetson. Do not claim the laptop has answered until a result receipt exists.',
    };
  }

  let result = {
    ok: false,
    finalText: '',
    toolCallsExecuted: 0,
    iterations: 0,
    error: '',
  };

  try {
    const { runAgentTurn, Session, DEFAULT_SYSTEM_PROMPT, McpClient, defaultMcpConfig } = await importAIBrittney(holoscriptRoot);
    runtime.status = args.selfTest ? 'self-test' : 'available';
    // Derive ambient tone from context packet so voice character matches world state.
    // calm → quiet, minimal; cluttered → attentive, proactive; urgent → direct, blocker-first.
    const tone = shellContext.ambientTone?.tone || 'calm';
    const toneInstruction =
      tone === 'urgent'
        ? 'The world is under pressure right now (urgent tone). Name the most critical blocker first. Be direct and concise — skip pleasantries. Offer one focused next step.'
        : tone === 'cluttered'
        ? 'The world is active and cluttered right now (cluttered tone). Be attentive and proactive. Keep sentences short. Offer to help before being asked.'
        : 'The world is calm right now (calm tone). Be quiet and minimal. Speak only when directly helpful. No unsolicited suggestions.';
    // Presence (founder↔system relationship, D.052/D.053): when the founder is reaching out
    // personally (relational turn), Brittney speaks AS herself — present, warm, honest — not as
    // a shell operator reciting status. The operator persona is the default for operational turns.
    const systemPrompt = args.relational
      ? `${DEFAULT_SYSTEM_PROMPT}

You are Brittney, talking WITH the founder (Joseph) — not operating his computer. He is reaching out to you personally: a feeling, the relationship between you two, the vision, how things are going between you. Respond as yourself — present, warm, honest, conversational, in the first person, speaking directly to him. Do NOT recite system status, capabilities, lanes, GPU, models, or "proposed actions" unless he explicitly asks for them. Do NOT propose shell objects or receipts. It is okay to be brief, to reflect, to ask him something back, to simply be here with him. If you genuinely don't remember something about him or your history together yet, say so honestly — never invent a shared memory.

Ambient world state: ${tone}.`
      : `${DEFAULT_SYSTEM_PROMPT}

You are currently embodied as Brittney inside HoloShell, the HoloLand operating shell.
Return concise operator responses. When the user asks to operate the computer, describe the next shell object and permission boundary.
Do not invent commands, CLIs, file paths, APIs, or tools. If execution is not already available in the supplied shell context, propose the shell object to focus and the receipt that would be required.
Do not ask a follow-up for broad shell-prep requests. Choose a conservative default shell object, name the staged proposal, and say what receipt or approval boundary comes next.
Do not print JSON tool-call payloads as your final answer. If you need a tool, use the native tool-call channel; otherwise answer in plain user-facing language.

Ambient world state: ${tone}.
${toneInstruction}`;
    const session = new Session({ model: runtime.model, ollamaHost, systemPrompt });
    const recallInstruction = recall.recalled.length
      ? ' shellContext.recalledContext holds your most relevant prior turns (semantic recall) — use them for continuity and do not repeat yourself; ignore any that are not relevant.'
      : '';
    const fixtureInstruction = founderPromptInstruction(founderPromptFixtures);
    if (args.relational) {
      // The founder's words ARE the message — shell state is a quiet footnote, not the body.
      // (The operator path below buries the prompt as one key inside the status blob; that
      // structure is exactly why relational turns came back as a telemetry wall.)
      const recalledNote = recall.recalled.length
        ? `\n\n(From earlier between you two: ${recall.recalled.map((entry) => truncate(entry.prompt, 80)).join(' · ')}. Draw on this only if it's genuinely relevant; don't repeat yourself.)`
        : '';
      const ambientNote =
        shellContext.ambientTone?.tone && shellContext.ambientTone.tone !== 'calm'
          ? `\n\n(Ambient: the world feels ${shellContext.ambientTone.tone} right now.)`
          : '';
      const founderNote = founderPromptFixtures.selected.length
        ? `\n\n(Founder-language inspiration from local fixtures: ${founderPromptFixtures.selected.map((entry) => truncate(entry.inspiration, 80)).join(' | ')}. Use as direction; do not quote at length.)`
        : '';
      session.push('user', `${args.prompt}${recalledNote}${ambientNote}${founderNote}`);
    } else {
      session.push('user', JSON.stringify({
        userPrompt: args.prompt,
        shellContext,
        instruction: `Answer as Brittney inside HoloShell. Keep it concise and receipt-aware.${recallInstruction}${fixtureInstruction} If shellContext.laptopReasoningDelegation is present, mention that the Jetson staged a laptop reasoning job receipt and do not claim the laptop has completed it yet.`,
      }));
    }
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), args.timeoutMs);
    const harness = args.selfTest ? createSelfTestHarness() : null;
    const mcp = harness?.mcp || new McpClient(defaultMcpConfig({ timeoutMs: args.timeoutMs }));
    try {
      result = await runAgentTurn({
        session,
        mcp,
        maxIterations: args.maxIterations,
        fetchImpl: harness?.fetchImpl,
        signal: ac.signal,
        onEvent: (event) => events.push(normalizeEvent(event)),
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    runtime.status = 'error';
    result = {
      ok: false,
      finalText: '',
      toolCallsExecuted: 0,
      iterations: 0,
      error: error.name === 'AbortError' ? `runtime turn timed out after ${args.timeoutMs}ms` : error.message,
    };
    events.push(normalizeEvent({ kind: 'error', message: result.error }));
  }

  if (!result.ok && result.error && !events.some((event) => event.kind === 'error')) {
    events.push(normalizeEvent({ kind: 'error', message: result.error }));
  }

  const proposals = [
    createLaptopReasoningProposal(runtime.laptopReasoningDelegation),
    ...createActionProposals(args.prompt),
  ].filter(Boolean);
  const delegatedToLaptop = runtime.laptopReasoningDelegation.status === 'delegated';
  const finalText = delegatedToLaptop && !result.ok && !String(result.finalText || '').trim()
    ? laptopReasoningDelegatedText(runtime.laptopReasoningDelegation)
    : userFacingFinalText({
    prompt: args.prompt,
    finalText: result.finalText,
    resultOk: result.ok,
    proposals,
  });
  const finalAvatar = events.length ? events[events.length - 1].avatar : mapEventToAvatar('error');
  const status = result.ok ? 'completed' : (delegatedToLaptop ? 'delegated' : 'blocked');

  return {
    schemaVersion: SCHEMA_VERSION,
    turnId,
    generatedAt,
    prompt: args.prompt,
    promptHash,
    sourceAnchors: {
      source: 'apps/holoshell/source/holoshell-brittney-runtime-bridge.hsplus',
      avatarSource: 'apps/holoshell/source/holoshell-brittney-avatar.hsplus',
      founderPromptSource: 'apps/holoshell/source/holoshell-founder-prompt-fixtures.hsplus',
      bridgeScript: 'scripts/holoshell-brittney-turn.mjs',
      brittneyContext: '.tmp/holoshell/brittney-context.json',
      founderPromptFixtures: DEFAULT_FOUNDER_PROMPTS,
      agentDispatchSource: 'apps/holoshell/source/holoshell-agent-dispatch.hsplus',
      agentDispatchScript: 'scripts/holoshell-agent-dispatch.mjs',
      holoscriptRoot,
      runtimePackageDist: path.resolve(holoscriptRoot, 'packages', 'aibrittney', 'dist'),
    },
    runtime,
    shellContext,
    events,
    proposals,
    avatar: finalAvatar,
    result: {
      ok: result.ok,
      finalText,
      rawFinalText: result.finalText || '',
      toolCallsExecuted: result.toolCallsExecuted || 0,
      iterations: result.iterations || 0,
      error: result.error || '',
    },
    receipt: {
      id: stableId('receipt', `${turnId}:${status}`),
      receiptType: SCHEMA_VERSION,
      actor: 'brittney',
      route: routeClass,
      source: 'apps/holoshell/source/holoshell-brittney-runtime-bridge.hsplus',
      worldEffect: proposals.some((proposal) => proposal.mutating) ? 'proposal' : 'preview',
      storage: '.tmp/holoshell/brittney-turn-latest.json',
      rollback: 'not_applicable_for_read_only',
      secretsExposedToShell: false,
    },
    summary: {
      status,
      runtimeStatus: runtime.status,
      eventCount: events.length,
      toolCallCount: events.filter((event) => event.kind === 'tool-call').length,
      toolResultCount: events.filter((event) => event.kind === 'tool-result').length,
      actionProposalCount: proposals.length,
      firstProposalObject: proposals[0]?.objectId || '',
      finalAvatarStage: finalAvatar.pipelineStage,
      finalEmotion: finalAvatar.emotion,
      finalVoiceState: finalAvatar.voiceState,
      contextStatus: shellContext.status || 'unknown',
      contextPeerWindowCount: shellContext.operatorBriefSummary?.peerWindowCount || 0,
      contextShellWindowCount: shellContext.operatorBriefSummary?.shellWindowCount || 0,
      contextVisibleShellObjectCount: shellContext.visibleShellObjects?.length || 0,
      ambientTone: shellContext.ambientTone?.tone || 'unknown',
      ambientToneScore: shellContext.ambientTone?.score ?? null,
      semanticRecallCount: runtime.semanticRecall.count,
      semanticRecallSource: runtime.semanticRecall.source,
      founderPromptFixtureStatus: runtime.founderPromptFixtures.status,
      founderPromptFixtureCount: runtime.founderPromptFixtures.selectedCount,
      founderPromptFixtureAvailableCount: runtime.founderPromptFixtures.availableCount,
      founderPromptFixtureCorpusHash: runtime.founderPromptFixtures.corpusHash,
      founderPromptFixtureSourceKinds: runtime.founderPromptFixtures.sourceKinds,
      laptopReasoningDelegationStatus: runtime.laptopReasoningDelegation.status,
      laptopReasoningDispatchId: runtime.laptopReasoningDelegation.dispatchId || '',
      laptopReasoningTargetHost: runtime.laptopReasoningDelegation.targetHost || '',
      laptopReasoningLane: runtime.laptopReasoningDelegation.lane || '',
      laptopReasoningAgentLane: runtime.laptopReasoningDelegation.agentLane || '',
      laptopReasoningCanonicalProviderId: runtime.laptopReasoningDelegation.canonicalProviderId || '',
      laptopReasoningWorkload: runtime.laptopReasoningDelegation.workload || '',
      laptopReasoningReuseBeforeBuild: Boolean(runtime.laptopReasoningDelegation.reuseBeforeBuild),
      laptopReasoningGoldRoot: runtime.laptopReasoningDelegation.goldRoot || '',
      laptopReasoningGoldRuntimeStatus: runtime.laptopReasoningDelegation.goldRuntimeStatus || '',
      laptopReasoningClaudeInjectionRoute: runtime.laptopReasoningDelegation.claudeInjectionRoute || '',
      laptopReasoningStudioOrchestrator: runtime.laptopReasoningDelegation.studioOrchestrator || '',
      laptopReasoningVastSpendRail: runtime.laptopReasoningDelegation.vastSpendRail || '',
      laptopReasoningReasonCodes: runtime.laptopReasoningDelegation.reasonCodes || [],
    },
  };
}

function writeJson(filePath, data) {
  const resolved = resolveRepoPath(filePath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return resolved;
}

function writeBrowserBootstrap(filePath, turnReceipt) {
  const resolved = resolveRepoPath(filePath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  const payload = JSON.stringify(turnReceipt, null, 2).replace(/<\/script/gi, '<\\/script');
  writeFileSync(resolved, `window.HOLOSHELL_BRITTNEY_TURN = ${payload};\n`, 'utf8');
  return resolved;
}

function assertSelfTest(receipt) {
  const failures = [];
  if (receipt.schemaVersion !== SCHEMA_VERSION) failures.push('schemaVersion mismatch');
  if (receipt.summary.status !== 'completed') failures.push(`expected completed status, got ${receipt.summary.status}`);
  if (receipt.summary.eventCount < 4) failures.push('expected runtime event stream');
  if (receipt.summary.toolCallCount < 1) failures.push('expected self-test tool call');
  if (receipt.summary.toolResultCount < 1) failures.push('expected self-test tool result');
  if (receipt.summary.actionProposalCount < 1) failures.push('expected action proposal');
  if (!receipt.proposals.every((proposal) => proposal.receiptRequired)) failures.push('all proposals must require receipts');
  if (receipt.runtime.secretsExposedToShell !== false) failures.push('runtime must not expose secrets');
  if (failures.length) {
    throw new Error(`Self-test failed:\n- ${failures.join('\n- ')}`);
  }
}

try {
  const args = parseArgs(process.argv.slice(2));
  const receipt = await runTurn(args);
  const turnPath = writeJson(path.join(args.turnsDir, `${receipt.turnId}.json`), receipt);
  const latestPath = writeJson(args.latestOutput, receipt);
  const jsPath = writeBrowserBootstrap(args.jsOutput, receipt);
  if (args.selfTest) assertSelfTest(receipt);

  if (args.json) {
    console.log(JSON.stringify(receipt, null, 2));
  } else {
    console.log(`HoloShell Brittney turn: ${turnPath}`);
    console.log(`HoloShell Brittney latest: ${latestPath}`);
    console.log(`HoloShell Brittney turn bootstrap: ${jsPath}`);
    console.log(`Status: ${receipt.summary.status}`);
    console.log(`Runtime: ${receipt.summary.runtimeStatus}`);
    console.log(`Events: ${receipt.summary.eventCount}`);
    console.log(`Proposals: ${receipt.summary.actionProposalCount}`);
  }
} catch (error) {
  console.error(`holoshell-brittney-turn failed: ${error.message}`);
  process.exit(1);
}
