#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'hololand.holoshell.brittney-turn.v0.1.0';
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_HOLOSCRIPT_ROOT = process.env.HOLOSCRIPT_REPO || path.resolve(REPO_ROOT, '..', 'HoloScript');
const DEFAULT_TMP = path.join('.tmp', 'holoshell');
const DEFAULT_TURNS_DIR = path.join(DEFAULT_TMP, 'brittney-turns');
const DEFAULT_LATEST = path.join(DEFAULT_TMP, 'brittney-turn-latest.json');
const DEFAULT_JS_OUTPUT = path.join(DEFAULT_TMP, 'brittney-turn-latest.js');
const DEFAULT_EMBED_CACHE = path.join(DEFAULT_TMP, 'turn-embeddings.json');

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
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    else if (arg === '--prompt') args.prompt = argv[++index];
    else if (arg === '--json') args.json = true;
    else if (arg === '--self-test') args.selfTest = true;
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

function isBroadShellPrepPrompt(prompt) {
  const text = String(prompt || '').toLowerCase();
  return text.includes('prepare') && text.includes('hololand');
}

function needsOperatorSanitize(prompt, text) {
  const cleanText = String(text || '').toLowerCase();
  return (
    looksLikePlainTextToolCall(text) ||
    cleanText.includes('could you please specify') ||
    cleanText.includes('please provide') ||
    cleanText.includes('code editor shell object') ||
    cleanText.includes('code editor') ||
    cleanText.includes('commands to run') ||
    cleanText.includes('receipt boundary: none') ||
    /\bholo_[a-z0-9_]+\b/.test(cleanText) ||
    (isBroadShellPrepPrompt(prompt) && cleanText.includes('install'))
  );
}

function userFacingFinalText({ prompt, finalText, resultOk, proposals }) {
  const cleanText = String(finalText || '').trim();
  if (resultOk && cleanText && !needsOperatorSanitize(prompt, cleanText)) {
    return cleanText;
  }
  const first = proposals[0];
  if (first) {
    return `I staged ${first.label} as the next shell object with a ${first.permissionEnvelope} envelope and receipt attached.`;
  }
  return resultOk
    ? `I received "${prompt}" and kept it in Brittney's shell turn receipt.`
    : '';
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
  };

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
    const systemPrompt = `${DEFAULT_SYSTEM_PROMPT}

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
    session.push('user', JSON.stringify({
      userPrompt: args.prompt,
      shellContext,
      instruction: `Answer as Brittney inside HoloShell. Keep it concise and receipt-aware.${recallInstruction}`,
    }));
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

  const proposals = createActionProposals(args.prompt);
  const finalText = userFacingFinalText({
    prompt: args.prompt,
    finalText: result.finalText,
    resultOk: result.ok,
    proposals,
  });
  const finalAvatar = events.length ? events[events.length - 1].avatar : mapEventToAvatar('error');
  const status = result.ok ? 'completed' : 'blocked';

  return {
    schemaVersion: SCHEMA_VERSION,
    turnId,
    generatedAt,
    prompt: args.prompt,
    promptHash,
    sourceAnchors: {
      source: 'apps/holoshell/source/holoshell-brittney-runtime-bridge.hsplus',
      avatarSource: 'apps/holoshell/source/holoshell-brittney-avatar.hsplus',
      bridgeScript: 'scripts/holoshell-brittney-turn.mjs',
      brittneyContext: '.tmp/holoshell/brittney-context.json',
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
