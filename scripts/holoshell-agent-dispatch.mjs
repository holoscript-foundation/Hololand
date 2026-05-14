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
import { fileURLToPath } from 'node:url';

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

function promptFromIntent(args) {
  if (args.prompt) return args.prompt;
  const raw = String(args.intent || '');
  const match = raw.match(/\b(?:with prompt|prompt|say|ask claude to|ask grok to|tell grok to)\b\s*[:,-]?\s*(.+)$/i);
  return match ? match[1].trim() : '';
}

function scoreIntent(intent) {
  const text = normalize(intent);
  const scores = new Map(CAPABILITIES.map((capability) => [capability.id, 0]));

  if (!text) return scores;

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
    ['launch Codex through Ollama', 'ollama_cloud_agent', 'workflow'],
    ['ollama launch hermes', 'ollama_cloud_agent', 'workflow'],
    ['open Grok Build', 'grok_build', 'workflow'],
    ['ask Grok to inspect this repo', 'grok_build', 'workflow'],
    ['open terminal start room marathon using ollama kimi cloud', 'room_marathon', 'workflow'],
    ['open browser and play lofi music on youtube', 'browser_lofi', 'hardware_action'],
    ['open Excel', 'open_excel', 'hardware_action'],
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

try {
  main();
} catch (error) {
  console.error(`holoshell-agent-dispatch failed: ${error.message}`);
  process.exit(1);
}

export { buildReceipt, CAPABILITIES };
