#!/usr/bin/env node
/**
 * HoloShell agent dispatch.
 *
 * Translates Brittney/user plain-language intent into a concrete staged
 * HoloShell route. This script only writes a dispatch receipt; the control
 * daemon performs the downstream staging through existing guarded adapters.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCHEMA_VERSION = 'hololand.holoshell.agent-dispatch.v0.1.0';
const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const DEFAULT_TMP = path.join('.tmp', 'holoshell');
const DEFAULT_OUTPUT = path.join(DEFAULT_TMP, 'agent-dispatch-latest.json');
const DEFAULT_JS_OUTPUT = path.join(DEFAULT_TMP, 'agent-dispatch-latest.js');
const DEFAULT_DISPATCH_DIR = path.join(DEFAULT_TMP, 'agent-dispatches');
const DEFAULT_LOFI_URL = 'https://www.youtube.com/watch?v=jfKfPfyJRdk';
const SOURCE_REF = 'apps/holoshell/source/holoshell-agent-dispatch.hsplus';
const HARDWARE_SOURCE_REF = 'apps/holoshell/source/holoshell-hardware-control.hsplus';
const SCRIPT_REF = 'scripts/holoshell-agent-dispatch.mjs';

const OLLAMA_AGENTS = [
  { slug: 'claude', label: 'Claude Code', aliases: ['claude code', 'anthropic'] },
  { slug: 'openclaw', label: 'OpenClaw', aliases: ['openclaw', 'open claw'] },
  { slug: 'hermes', label: 'Hermes Agent', aliases: ['hermes', 'hermes agent'] },
  { slug: 'opencode', label: 'OpenCode', aliases: ['opencode', 'open code'] },
  { slug: 'codex', label: 'Codex', aliases: ['codex'] },
  { slug: 'copilot', label: 'Copilot CLI', aliases: ['copilot', 'copilot cli'] },
  { slug: 'droid', label: 'Droid', aliases: ['droid'] },
  { slug: 'pi', label: 'Pi', aliases: ['pi', 'pi agent'] },
];

const CAPABILITIES = [
  {
    id: 'laptop_reasoning_job',
    label: 'Laptop Reasoning Job',
    route: '/workflow/laptop-reasoning-job',
    dispatchKind: 'reasoning_job',
    permissionEnvelope: 'read_only',
    examples: [
      'send this large prompt to the laptop for Codex reasoning',
      'have the laptop inspect the repo and reason through the plan',
    ],
  },
  {
    id: 'founder_command',
    label: 'Founder Command',
    route: '/workflow/founder-command',
    dispatchKind: 'workflow',
    permissionEnvelope: 'guarded_execute',
    examples: ['Brittney, open Claude, start a room marathon using Ollama Kimi Cloud, open a browser, and play lofi music on YouTube'],
  },
  {
    id: 'claude_chat',
    label: 'Claude Chat',
    route: '/workflow/claude-chat',
    dispatchKind: 'workflow',
    permissionEnvelope: 'guarded_execute',
    examples: ['open Claude and start a chat', 'ask Claude to review this'],
  },
  {
    id: 'ollama_cloud_agent',
    label: 'Ollama Cloud Agent',
    route: '/workflow/ollama-cloud-agent',
    dispatchKind: 'workflow',
    permissionEnvelope: 'guarded_execute',
    examples: ['launch Codex through Ollama', 'ollama launch hermes'],
  },
  {
    id: 'grok_build',
    label: 'Grok Build',
    route: '/workflow/grok-build',
    dispatchKind: 'workflow',
    permissionEnvelope: 'guarded_execute',
    examples: ['open Grok Build', 'ask Grok to inspect this repo'],
  },
  {
    id: 'room_marathon',
    label: 'Room Marathon',
    route: '/workflow/room-marathon',
    dispatchKind: 'workflow',
    permissionEnvelope: 'guarded_execute',
    examples: ['start room marathon using Ollama Kimi Cloud'],
  },
  {
    id: 'browser_lofi',
    label: 'YouTube Lofi',
    route: '/action',
    dispatchKind: 'hardware_action',
    permissionEnvelope: 'guarded_execute',
    examples: ['play lofi music on YouTube'],
  },
  {
    id: 'open_excel',
    label: 'Open Excel',
    route: '/action',
    dispatchKind: 'hardware_action',
    permissionEnvelope: 'guarded_execute',
    examples: ['open Excel', 'start spreadsheet'],
  },
  {
    id: 'open_terminal',
    label: 'Open Terminal',
    route: '/action',
    dispatchKind: 'hardware_action',
    permissionEnvelope: 'guarded_execute',
    examples: ['open terminal', 'launch PowerShell'],
  },
  {
    id: 'open_browser',
    label: 'Open Browser',
    route: '/action',
    dispatchKind: 'hardware_action',
    permissionEnvelope: 'guarded_execute',
    examples: ['open browser', 'open Google'],
  },
  {
    id: 'launch_program',
    label: 'Launch Program',
    route: '/action',
    dispatchKind: 'hardware_action',
    permissionEnvelope: 'guarded_execute',
    examples: ['open Spotify', 'launch Calculator'],
  },
];

function parseArgs(argv) {
  const args = {
    actor: 'brittney',
    intent: '',
    prompt: '',
    json: false,
    selfTest: false,
    listCapabilities: false,
    output: DEFAULT_OUTPUT,
    jsOutput: DEFAULT_JS_OUTPUT,
    dispatchDir: DEFAULT_DISPATCH_DIR,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--actor') args.actor = argv[++index] || args.actor;
    else if (arg === '--intent') args.intent = argv[++index] || '';
    else if (arg === '--prompt') args.prompt = argv[++index] || '';
    else if (arg === '--output') args.output = argv[++index] || DEFAULT_OUTPUT;
    else if (arg === '--js-output') args.jsOutput = argv[++index] || DEFAULT_JS_OUTPUT;
    else if (arg === '--dispatch-dir') args.dispatchDir = argv[++index] || DEFAULT_DISPATCH_DIR;
    else if (arg === '--json') args.json = true;
    else if (arg === '--self-test') args.selfTest = true;
    else if (arg === '--list-capabilities') args.listCapabilities = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (!arg.startsWith('--') && !args.intent) {
      args.intent = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`HoloShell agent dispatch

Usage:
  node scripts/holoshell-agent-dispatch.mjs --intent "open Claude and start a chat"
  node scripts/holoshell-agent-dispatch.mjs --intent "launch Codex through Ollama" --json

Options:
  --intent <text>          Plain-language request from Brittney/user.
  --prompt <text>          Optional prompt for chat-oriented routes.
  --actor <name>           Actor label. Defaults to brittney.
  --list-capabilities      Print dispatch catalog.
  --self-test              Run fixture assertions.
  --json                   Print JSON receipt.
  -h, --help               Show this help.
`);
}

function resolveRepoPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(REPO_ROOT, filePath);
}

function ensureDir(filePath) {
  mkdirSync(path.dirname(resolveRepoPath(filePath)), { recursive: true });
}

function writeJson(filePath, value) {
  const resolved = resolveRepoPath(filePath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return resolved;
}

function writeBrowserBootstrap(filePath, receipt) {
  const resolved = resolveRepoPath(filePath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  const payload = JSON.stringify(receipt, null, 2).replace(/<\/script/gi, '<\\/script');
  writeFileSync(resolved, `window.HOLOSHELL_AGENT_DISPATCH = ${payload};\n`, 'utf8');
  return resolved;
}

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function hashValue(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function shortHash(value, length = 12) {
  return hashValue(value).slice(0, length);
}

function redactedIntent(intent) {
  const text = String(intent || '');
  if (!text) return '';
  return text
    .replace(/(password|passphrase|token|secret|api key|api-key|private key)\s*[:=]\s*\S+/gi, '$1=[redacted]')
    .slice(0, 240);
}

function detectOllamaAgent(text) {
  const normalized = normalize(text);
  const launchMatch = normalized.match(/\bollama launch ([a-z0-9]+)/);
  if (launchMatch) {
    const direct = OLLAMA_AGENTS.find((agent) => agent.slug === launchMatch[1]);
    if (direct) return direct;
  }
  return OLLAMA_AGENTS.find((agent) => (
    agent.aliases.some((alias) => normalized.includes(normalize(alias)))
    || normalized.includes(`launch ${agent.slug}`)
  )) || null;
}

function laptopReasoningSignals(intent) {
  const raw = String(intent || '');
  const text = normalize(raw);
  const wordCount = raw.split(/\s+/u).filter(Boolean).length;
  const lineCount = raw.split(/\r?\n/u).length;
  const signals = [];
  let score = 0;

  const explicitLaptop = /\b(laptop|windows|rtx|codex hardware|codex)\b/u.test(text);
  const reasoningAsk = /\b(reason|reasoning|think|analyze|analyse|inspect|review|plan|large prompt|big prompt|help)\b/u.test(text);
  const repoAsk = /\b(repo|repository|worktree|codebase|backend|frontend|docs|documentation|memory|knowledge|jetson|autonomy|cloud|local)\b/u.test(text);

  if (explicitLaptop && reasoningAsk) {
    score += 100;
    signals.push('explicit_laptop_reasoning_request');
  }
  if (explicitLaptop && repoAsk) {
    score += 30;
    signals.push('explicit_laptop_repo_context');
  }
  if (raw.length >= 2400) {
    score += 90;
    signals.push('very_large_prompt');
  } else if (raw.length >= 1200) {
    score += 70;
    signals.push('large_prompt');
  }
  if (wordCount >= 180 && (repoAsk || reasoningAsk)) {
    score += 45;
    signals.push('long_repo_or_reasoning_prompt');
  }
  if (lineCount >= 16 && (repoAsk || /```|diff --git|^\s*[-*]\s+/mu.test(raw))) {
    score += 35;
    signals.push('multi_section_prompt');
  }
  if (/\b(seams?|mend|hydrate|verticals?|backend|local|cloud|autonomy|jetson)\b/u.test(text) && reasoningAsk) {
    score += 25;
    signals.push('ecosystem_architecture_reasoning');
  }

  return {
    score,
    signals,
    promptChars: raw.length,
    wordCount,
    lineCount,
    needed: score >= 70,
  };
}

function promptFromIntent(args) {
  if (args.prompt) return args.prompt;
  const raw = String(args.intent || '');
  const match = raw.match(/\b(?:with prompt|prompt|say|ask claude to|ask grok to|tell grok to)\b\s*[:,-]?\s*(.+)$/i);
  return match ? match[1].trim() : '';
}

function programNameFromIntent(intent) {
  const raw = String(intent || '').trim();
  const match = raw.match(/\b(?:open|launch|start)\s+(?:the\s+)?(.+?)(?:\s+(?:app|program|application))?\s*$/i);
  if (!match) return '';
  return match[1]
    .replace(/\b(on youtube|in browser|through ollama|using ollama|with grok|with claude)\b.*$/i, '')
    .trim();
}

function isFounderFlagshipIntent(intent) {
  const text = normalize(intent);
  const mentionsClaude = text.includes('claude');
  const mentionsRoomMarathon = text.includes('room marathon') || (text.includes('room') && text.includes('marathon'));
  const mentionsOllamaKimi = text.includes('kimi') && (text.includes('ollama') || text.includes('cloud'));
  const mentionsBrowserMedia = text.includes('lofi') || (text.includes('youtube') && text.includes('music'));
  const mentionsOpenBrowser = text.includes('browser') || text.includes('youtube');
  const namesBrittney = text.startsWith('brittney') || text.includes(' brittney ');
  return mentionsClaude
    && (mentionsRoomMarathon || mentionsOllamaKimi)
    && mentionsBrowserMedia
    && mentionsOpenBrowser
    && (namesBrittney || /\b(open|start|launch|play)\b/.test(text));
}

function scoreIntent(intent) {
  const text = normalize(intent);
  const scores = new Map(CAPABILITIES.map((capability) => [capability.id, 0]));

  if (!text) return scores;

  const laptopReasoning = laptopReasoningSignals(intent);
  if (laptopReasoning.needed) {
    scores.set('laptop_reasoning_job', laptopReasoning.score);
  }
  if (isFounderFlagshipIntent(intent)) scores.set('founder_command', 99);
  if (text.includes('room marathon') || (text.includes('marathon') && text.includes('room'))) scores.set('room_marathon', 98);
  if (text.includes('kimi') && (text.includes('ollama') || text.includes('cloud'))) {
    scores.set('room_marathon', Math.max(scores.get('room_marathon'), 86));
  }
  const agent = detectOllamaAgent(text);
  if (text.includes('ollama') || text.includes('ollama launch') || (agent && text.includes('launch'))) {
    scores.set('ollama_cloud_agent', 95);
  }
  if (text.includes('grok') || text.includes('grok build') || text.includes('supergrok') || text.includes('xai')) {
    scores.set('grok_build', 96);
  }
  if (text.includes('claude') && (text.includes('chat') || text.includes('start') || text.includes('open'))) {
    scores.set('claude_chat', Math.max(scores.get('claude_chat'), 92));
  }
  if (text.includes('lofi') || (text.includes('music') && text.includes('youtube'))) {
    scores.set('browser_lofi', 90);
  }
  if (text.includes('excel') || text.includes('spreadsheet')) scores.set('open_excel', 88);
  if (text.includes('terminal') || text.includes('powershell') || text.includes('command line') || text.includes('cmd')) {
    scores.set('open_terminal', 82);
  }
  if ((text.includes('browser') || text.includes('chrome') || text.includes('google')) && !text.includes('lofi')) {
    scores.set('open_browser', 76);
  }
  if (/\b(open|launch|start)\b/.test(text) && programNameFromIntent(intent)) {
    scores.set('launch_program', Math.max(scores.get('launch_program'), 62));
  }

  return scores;
}

function bestCapability(intent) {
  const scores = scoreIntent(intent);
  const ranked = [...scores.entries()].sort((left, right) => right[1] - left[1]);
  const [id, confidence] = ranked[0] || ['', 0];
  const capability = CAPABILITIES.find((item) => item.id === id) || null;
  return { capability, confidence, ranked };
}

function buildRouteBody(capability, args, agent) {
  const text = normalize(args.intent);
  if (!capability) return {};
  if (capability.id === 'laptop_reasoning_job') {
    const prompt = promptFromIntent(args) || args.prompt || args.intent;
    const reasoning = laptopReasoningSignals(args.intent);
    return {
      actor: args.actor,
      jobType: 'reasoning',
      delegationMode: 'jetson_autonomous_large_prompt_router',
      sourceHost: 'jetson_holoshell_surface',
      targetHost: 'laptop_windows',
      lane: 'codex-hardware',
      modelFamily: 'openai_codex',
      permissionEnvelope: 'read_only',
      prompt,
      promptHash: hashValue(prompt || 'empty'),
      reasonCodes: reasoning.signals,
      promptChars: reasoning.promptChars,
      wordCount: reasoning.wordCount,
      requestedReturn: 'reasoned_summary_with_receipt',
      receiptRequired: true,
      destructiveActionsTaken: false,
      desktopAutomationExecuted: false,
    };
  }
  if (capability.id === 'founder_command') {
    return {
      actor: args.actor,
      intent: args.intent,
      model: text.includes('kimi') ? 'kimi-cloud' : 'kimi-cloud',
      modelRoute: 'ollama_cloud',
      claudeApp: 'Claude',
      lofiUrl: DEFAULT_LOFI_URL,
    };
  }
  if (capability.id === 'claude_chat') {
    return {
      actor: args.actor,
      claudeApp: 'Claude',
      prompt: promptFromIntent(args),
      startNewChat: true,
    };
  }
  if (capability.id === 'ollama_cloud_agent') {
    return {
      actor: args.actor,
      agent: agent?.slug || 'claude',
    };
  }
  if (capability.id === 'grok_build') {
    const prompt = promptFromIntent(args);
    return {
      actor: args.actor,
      mode: prompt ? 'headless' : 'interactive',
      prompt,
      model: 'grok-build',
      permissionMode: prompt ? 'plan' : '',
    };
  }
  if (capability.id === 'room_marathon') {
    const model = text.includes('kimi') ? 'kimi-cloud' : 'kimi-cloud';
    return {
      actor: args.actor,
      model,
      modelRoute: 'ollama_cloud',
      lofiUrl: DEFAULT_LOFI_URL,
    };
  }
  if (capability.id === 'browser_lofi') {
    return {
      actor: args.actor,
      action: 'open_url',
      url: DEFAULT_LOFI_URL,
    };
  }
  if (capability.id === 'open_excel') {
    return {
      actor: args.actor,
      action: 'launch_app',
      app: 'Excel',
    };
  }
  if (capability.id === 'open_terminal') {
    return {
      actor: args.actor,
      action: 'launch_app',
      app: text.includes('powershell') ? 'Windows PowerShell' : 'Windows Terminal',
    };
  }
  if (capability.id === 'open_browser') {
    return {
      actor: args.actor,
      action: 'open_url',
      url: 'https://www.google.com',
    };
  }
  if (capability.id === 'launch_program') {
    return {
      actor: args.actor,
      action: 'launch_app',
      app: programNameFromIntent(args.intent),
    };
  }
  return {};
}

function buildReceipt(args) {
  const generatedAt = new Date().toISOString();
  const intent = String(args.intent || '').trim();
  const { capability, confidence, ranked } = bestCapability(intent);
  const agent = detectOllamaAgent(intent);
  const blocked = !capability || confidence < 50;
  const routeBody = buildRouteBody(capability, args, agent);
  const dispatchId = `hsdispatch-${Date.now().toString(36)}-${shortHash({ intent, actor: args.actor }, 10)}`;
  const dispatchReceiptPath = resolveRepoPath(path.join(args.dispatchDir, `${dispatchId}.json`));
  const matchEvidence = ranked
    .filter(([, score]) => score > 0)
    .slice(0, 5)
    .map(([id, score]) => ({ capabilityId: id, score }));

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    dispatchId,
    actor: args.actor,
    sourceAnchors: {
      source: SOURCE_REF,
      hardwareControl: HARDWARE_SOURCE_REF,
      adapter: SCRIPT_REF,
    },
    host: {
      platform: process.platform,
      arch: process.arch,
      release: os.release(),
      hostname: os.hostname(),
    },
    request: {
      intentPreview: redactedIntent(intent),
      intentHash: hashValue(intent || 'empty'),
      promptProvided: Boolean(args.prompt),
      rawIntentStoredLocallyOnly: true,
    },
    catalog: CAPABILITIES.map((capabilityItem) => ({
      id: capabilityItem.id,
      label: capabilityItem.label,
      route: capabilityItem.route,
      dispatchKind: capabilityItem.dispatchKind,
      permissionEnvelope: capabilityItem.permissionEnvelope,
      examples: capabilityItem.examples,
    })),
    match: {
      status: blocked ? 'unsupported' : 'matched',
      capabilityId: capability?.id || '',
      capabilityLabel: capability?.label || '',
      confidence,
      evidence: matchEvidence,
      selectedOllamaAgent: agent ? { slug: agent.slug, label: agent.label } : null,
    },
    dispatch: {
      status: blocked ? 'blocked' : 'ready_to_stage',
      route: blocked ? '' : capability.route,
      method: blocked ? '' : 'POST',
      dispatchKind: capability?.dispatchKind || 'unsupported',
      permissionEnvelope: capability?.permissionEnvelope || 'unknown',
      body: blocked ? {} : routeBody,
      downstreamReceipt: capability?.dispatchKind === 'workflow'
        ? 'workflow-latest.json'
        : capability?.dispatchKind === 'hardware_action'
          ? 'action-latest.json'
          : '',
      approvalSurface: capability?.dispatchKind === 'workflow'
        ? 'workflow-approval-latest.json'
        : capability?.dispatchKind === 'hardware_action'
          ? 'approval-latest.json'
          : '',
    },
    summary: {
      status: blocked ? 'blocked' : 'ready_to_stage',
      dispatchKind: capability?.dispatchKind || 'unsupported',
      capabilityId: capability?.id || '',
      capabilityLabel: capability?.label || '',
      confidence,
      route: blocked ? '' : capability.route,
      permissionEnvelope: capability?.permissionEnvelope || 'unknown',
      approvalRequired: !blocked && capability?.permissionEnvelope !== 'read_only',
      selectedAgentSlug: agent?.slug || '',
      selectedAgentLabel: agent?.label || '',
      actionKind: routeBody.action || '',
      targetApp: routeBody.app || '',
      targetUrlHost: routeBody.url ? new URL(routeBody.url).host : '',
      promptPresent: Boolean(routeBody.prompt),
      targetHost: routeBody.targetHost || '',
      reasoningLane: routeBody.lane || '',
      delegationMode: routeBody.delegationMode || '',
      reasonCodes: routeBody.reasonCodes || [],
      rawIntentStoredLocallyOnly: true,
    },
    output: {
      latestPath: resolveRepoPath(args.output),
      browserBootstrap: resolveRepoPath(args.jsOutput),
      dispatchReceiptPath,
    },
  };
}

function persist(args, receipt) {
  const output = writeJson(args.output, receipt);
  const jsOutput = writeBrowserBootstrap(args.jsOutput, receipt);
  ensureDir(path.join(args.dispatchDir, 'placeholder'));
  writeJson(receipt.output.dispatchReceiptPath, receipt);
  return { ...receipt, output: { ...receipt.output, latestPath: output, browserBootstrap: jsOutput } };
}

function assertSelfTest() {
  const cases = [
    ['open Claude and start a chat', 'claude_chat', 'workflow'],
    ['send this large prompt to the laptop for Codex reasoning', 'laptop_reasoning_job', 'reasoning_job'],
    ['have the laptop inspect the repo and reason through the plan', 'laptop_reasoning_job', 'reasoning_job'],
    ['launch Codex through Ollama', 'ollama_cloud_agent', 'workflow'],
    ['ollama launch hermes', 'ollama_cloud_agent', 'workflow'],
    ['open Grok Build', 'grok_build', 'workflow'],
    ['ask Grok to inspect this repo', 'grok_build', 'workflow'],
    ['Brittney, open Claude, start a room marathon using Ollama Kimi Cloud, open a browser, and play lofi music on YouTube', 'founder_command', 'workflow'],
    ['open terminal start room marathon using ollama kimi cloud', 'room_marathon', 'workflow'],
    ['open browser and play lofi music on youtube', 'browser_lofi', 'hardware_action'],
    ['open Excel', 'open_excel', 'hardware_action'],
    ['launch Calculator', 'launch_program', 'hardware_action'],
  ];
  const failures = [];
  for (const [intent, expectedCapability, expectedKind] of cases) {
    const receipt = buildReceipt({ actor: 'brittney', intent, prompt: '', output: DEFAULT_OUTPUT, jsOutput: DEFAULT_JS_OUTPUT, dispatchDir: DEFAULT_DISPATCH_DIR });
    if (receipt.summary.capabilityId !== expectedCapability) {
      failures.push(`${intent} -> ${receipt.summary.capabilityId}, expected ${expectedCapability}`);
    }
    if (receipt.summary.dispatchKind !== expectedKind) {
      failures.push(`${intent} kind -> ${receipt.summary.dispatchKind}, expected ${expectedKind}`);
    }
    if (receipt.summary.status !== 'ready_to_stage') failures.push(`${intent} was not ready_to_stage`);
  }
  const unsupported = buildReceipt({ actor: 'brittney', intent: 'make the moon purple', prompt: '', output: DEFAULT_OUTPUT, jsOutput: DEFAULT_JS_OUTPUT, dispatchDir: DEFAULT_DISPATCH_DIR });
  if (unsupported.summary.status !== 'blocked') failures.push('unsupported intent should block');
  if (failures.length) throw new Error(`Self-test failed:\n- ${failures.join('\n- ')}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.listCapabilities) {
    console.log(JSON.stringify({ schemaVersion: SCHEMA_VERSION, capabilities: CAPABILITIES }, null, 2));
    return;
  }
  if (args.selfTest) {
    assertSelfTest();
    console.log('HoloShell agent dispatch self-test passed.');
    return;
  }
  if (!String(args.intent || '').trim()) throw new Error('--intent is required.');
  const receipt = persist(args, buildReceipt(args));
  if (args.json) console.log(JSON.stringify(receipt, null, 2));
  else {
    console.log(`HoloShell agent dispatch: ${receipt.output.latestPath}`);
    console.log(`Status: ${receipt.summary.status}`);
    console.log(`Capability: ${receipt.summary.capabilityLabel || 'none'}`);
    console.log(`Route: ${receipt.summary.route || 'none'}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(`holoshell-agent-dispatch failed: ${error.message}`);
    process.exit(1);
  }
}

export { buildReceipt, persist, laptopReasoningSignals, CAPABILITIES };
