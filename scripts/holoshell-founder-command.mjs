#!/usr/bin/env node
/**
 * HoloShell Founder Command bridge.
 *
 * Runtime bridge for the Founder HoloShell flagship command. The behavior is
 * specified in apps/holoshell/source/holoshell-founder-command-pipeline.hs;
 * this script materializes the staged receipts for the local shell preview.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'hololand.holoshell.founder-command.v0.1.0';
const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const DEFAULT_TMP = path.join('.tmp', 'holoshell');
const DEFAULT_OUTPUT = path.join(DEFAULT_TMP, 'founder-command-latest.json');
const DEFAULT_JS_OUTPUT = path.join(DEFAULT_TMP, 'founder-command-latest.js');
const DEFAULT_COMMAND_DIR = path.join(DEFAULT_TMP, 'founder-commands');
const DEFAULT_INTENT = 'Brittney, open Claude, start a room marathon using Ollama Kimi Cloud, open a browser, and play lofi music on YouTube';
const DEFAULT_LOFI_URL = 'https://www.youtube.com/watch?v=jfKfPfyJRdk';

function parseArgs(argv) {
  const args = {
    actor: 'brittney',
    intent: DEFAULT_INTENT,
    model: 'kimi-cloud',
    modelRoute: 'ollama_cloud',
    claudeApp: 'Claude',
    lofiUrl: DEFAULT_LOFI_URL,
    stageClaudeSurface: true,
    json: false,
    selfTest: false,
    output: DEFAULT_OUTPUT,
    jsOutput: DEFAULT_JS_OUTPUT,
    commandDir: DEFAULT_COMMAND_DIR,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--actor') args.actor = argv[++index] || args.actor;
    else if (arg === '--intent') args.intent = argv[++index] || DEFAULT_INTENT;
    else if (arg === '--model') args.model = argv[++index] || args.model;
    else if (arg === '--model-route') args.modelRoute = argv[++index] || args.modelRoute;
    else if (arg === '--claude-app') args.claudeApp = argv[++index] || args.claudeApp;
    else if (arg === '--lofi-url') args.lofiUrl = argv[++index] || args.lofiUrl;
    else if (arg === '--no-claude-surface') args.stageClaudeSurface = false;
    else if (arg === '--output') args.output = argv[++index] || DEFAULT_OUTPUT;
    else if (arg === '--js-output') args.jsOutput = argv[++index] || DEFAULT_JS_OUTPUT;
    else if (arg === '--command-dir') args.commandDir = argv[++index] || DEFAULT_COMMAND_DIR;
    else if (arg === '--json') args.json = true;
    else if (arg === '--self-test') args.selfTest = true;
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
  console.log(`HoloShell Founder Command

Usage:
  node scripts/holoshell-founder-command.mjs
  node scripts/holoshell-founder-command.mjs --intent "${DEFAULT_INTENT}" --json

Options:
  --intent <text>          Founder/Brittney natural command.
  --actor <name>           Actor label. Defaults to brittney.
  --model <name>           Room marathon model. Defaults to kimi-cloud.
  --model-route <route>    Room marathon route. Defaults to ollama_cloud.
  --claude-app <name>      Claude surface label. Defaults to Claude.
  --lofi-url <url>         YouTube lofi URL.
  --no-claude-surface      Skip the separate Claude surface staging step.
  --self-test              Run fixture assertions without touching hardware.
  --json                   Print JSON receipt.
  -h, --help               Show this help.
`);
}

function resolveRepoPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(REPO_ROOT, filePath);
}

function readJson(filePath, fallback = null) {
  const resolved = resolveRepoPath(filePath);
  if (!existsSync(resolved)) return fallback;
  return JSON.parse(readFileSync(resolved, 'utf8'));
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
  writeFileSync(resolved, `window.HOLOSHELL_FOUNDER_COMMAND = ${payload};\n`, 'utf8');
  return resolved;
}

function hashValue(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function shortHash(value, length = 10) {
  return hashValue(value).slice(0, length);
}

function runNode(cli) {
  const result = spawnSync(process.execPath, cli, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? result.error.message : '',
    cli,
  };
}

function compactRun(label, result, receiptPath = '') {
  return {
    label,
    ok: result.ok,
    status: result.status,
    receiptPath: receiptPath ? resolveRepoPath(receiptPath) : '',
    stdout: result.stdout.trim().slice(0, 900),
    stderr: result.stderr.trim().slice(0, 900),
    command: result.cli,
  };
}

function pipelineStep(id, label, state, detail, confidence, receiptPath = '') {
  return {
    id,
    label,
    state,
    detail,
    confidence,
    receiptPath: receiptPath ? resolveRepoPath(receiptPath) : '',
  };
}

function normalizeConfidence(value, fallback = 0.86) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.min(number > 1 ? number / 100 : number, 1);
}

function fixtureReceipt(args) {
  return {
    dispatch: {
      summary: {
        status: 'ready_to_stage',
        capabilityId: 'founder_command',
        capabilityLabel: 'Founder Command',
        confidence: 99,
      },
    },
    claudeWorkflow: {
      summary: {
        status: 'pending_user_approval',
        workflowKind: 'claude_chat',
        stepCount: 3,
        pendingApprovalCount: 2,
        executionAllowed: true,
      },
    },
    roomWorkflow: {
      summary: {
        status: 'pending_user_approval',
        workflowKind: 'room_marathon',
        stepCount: 6,
        pendingApprovalCount: 5,
        model: args.model,
        modelRoute: args.modelRoute,
        mutationExecuted: false,
      },
    },
    workflowApproval: {
      summary: {
        status: 'pending_user_approval',
        title: 'Room Marathon with Lofi',
        pendingApprovalCount: 5,
        executionAllowed: true,
      },
    },
    workflowIntentGate: {
      summary: {
        status: 'pass',
        executionAllowed: true,
        runtimeBlocking: true,
        failedCheckCount: 0,
      },
    },
    liveFeed: {
      summary: {
        overallRisk: 'pass',
        timelineCount: 5,
      },
    },
    runs: [],
  };
}

function stageReceipts(args, commandId) {
  if (args.selfTest) return fixtureReceipt(args);

  const commandRoot = path.join(args.commandDir, commandId);
  const claudeWorkflow = path.join(commandRoot, 'claude-workflow.json');
  const claudeWorkflowJs = path.join(commandRoot, 'claude-workflow.js');
  const claudeApproval = path.join(commandRoot, 'claude-approval.json');
  const claudeApprovalJs = path.join(commandRoot, 'claude-approval.js');
  const claudeGate = path.join(commandRoot, 'claude-gate.json');
  const claudeGateJs = path.join(commandRoot, 'claude-gate.js');

  const dispatchRun = runNode([
    'scripts/holoshell-agent-dispatch.mjs',
    '--actor',
    args.actor,
    '--intent',
    args.intent,
  ]);
  const dispatch = readJson(path.join(DEFAULT_TMP, 'agent-dispatch-latest.json'), {});

  let claudeRun = { ok: true, status: 0, stdout: 'Claude surface staging skipped.', stderr: '', cli: [] };
  let claudeWorkflowReceipt = {};
  if (args.stageClaudeSurface) {
    claudeRun = runNode([
      'scripts/holoshell-claude-chat-workflow.mjs',
      '--actor',
      args.actor,
      '--claude-app',
      args.claudeApp,
      '--output',
      claudeWorkflow,
      '--js-output',
      claudeWorkflowJs,
      '--approval-output',
      claudeApproval,
      '--approval-js-output',
      claudeApprovalJs,
      '--gate-output',
      claudeGate,
      '--gate-js-output',
      claudeGateJs,
    ]);
    claudeWorkflowReceipt = readJson(claudeWorkflow, {});
  }

  const roomRun = runNode([
    'scripts/holoshell-room-marathon-workflow.mjs',
    '--actor',
    args.actor,
    '--model',
    args.model,
    '--model-route',
    args.modelRoute,
    '--claude-app',
    args.claudeApp,
    '--lofi-url',
    args.lofiUrl,
  ]);
  const roomWorkflow = readJson(path.join(DEFAULT_TMP, 'workflow-latest.json'), {});

  const approvalRun = runNode(['scripts/holoshell-workflow-approval-bundle.mjs']);
  const workflowApproval = readJson(path.join(DEFAULT_TMP, 'workflow-approval-latest.json'), {});

  const gateRun = runNode(['scripts/holoshell-brain-intent-gate.mjs']);
  const workflowIntentGate = readJson(path.join(DEFAULT_TMP, 'brain-intent-gate-latest.json'), {});

  const liveFeedRun = runNode(['scripts/holoshell-live-feed.mjs']);
  const liveFeed = readJson(path.join(DEFAULT_TMP, 'live-feed.json'), {});

  return {
    dispatch,
    claudeWorkflow: claudeWorkflowReceipt,
    roomWorkflow,
    workflowApproval,
    workflowIntentGate,
    liveFeed,
    runs: [
      compactRun('intent_dispatch', dispatchRun, path.join(DEFAULT_TMP, 'agent-dispatch-latest.json')),
      compactRun('claude_surface', claudeRun, args.stageClaudeSurface ? claudeWorkflow : ''),
      compactRun('room_marathon', roomRun, path.join(DEFAULT_TMP, 'workflow-latest.json')),
      compactRun('workflow_approval', approvalRun, path.join(DEFAULT_TMP, 'workflow-approval-latest.json')),
      compactRun('brain_intent_gate', gateRun, path.join(DEFAULT_TMP, 'brain-intent-gate-latest.json')),
      compactRun('live_feed', liveFeedRun, path.join(DEFAULT_TMP, 'live-feed.json')),
    ],
  };
}

function buildReceipt(args) {
  const generatedAt = new Date().toISOString();
  const commandId = `hsfc-${Date.now().toString(36)}-${shortHash({ intent: args.intent, actor: args.actor })}`;
  const staged = stageReceipts(args, commandId);
  const dispatchSummary = staged.dispatch?.summary || {};
  const claudeSummary = staged.claudeWorkflow?.summary || {};
  const roomSummary = staged.roomWorkflow?.summary || {};
  const approvalSummary = staged.workflowApproval?.summary || {};
  const gateSummary = staged.workflowIntentGate?.summary || {};
  const liveSummary = staged.liveFeed?.summary || {};
  const runFailures = (staged.runs || []).filter((run) => !run.ok);
  const receiptNeedsAttention =
    roomSummary.status === 'needs_attention'
    || approvalSummary.status === 'blocked'
    || Number(roomSummary.stageErrorCount || 0) > 0
    || (gateSummary.status && gateSummary.status !== 'unknown' && gateSummary.executionAllowed === false);
  const approvalCount = Number(approvalSummary.pendingApprovalCount || 0)
    + Number(claudeSummary.pendingApprovalCount || 0);
  const mutationExecuted = Boolean(roomSummary.mutationExecuted || claudeSummary.mutationExecuted);
  const executionAllowed = Boolean(approvalSummary.executionAllowed && gateSummary.executionAllowed);
  const status = runFailures.length || receiptNeedsAttention
    ? 'needs_attention'
    : mutationExecuted
      ? 'completed'
      : approvalCount > 0
        ? 'pending_user_approval'
        : 'staged';

  const pipeline = [
    pipelineStep(
      'intent',
      'Intent',
      dispatchSummary.status || 'unknown',
      dispatchSummary.capabilityLabel || 'Founder command',
      normalizeConfidence(dispatchSummary.confidence),
      path.join(DEFAULT_TMP, 'agent-dispatch-latest.json'),
    ),
    pipelineStep(
      'plan',
      'Plan',
      roomSummary.status || 'unknown',
      `${roomSummary.stepCount || 0} room steps, ${claudeSummary.stepCount || 0} Claude steps`,
      0.88,
      path.join(DEFAULT_TMP, 'workflow-latest.json'),
    ),
    pipelineStep(
      'approval',
      'Approval',
      approvalSummary.status || 'unknown',
      approvalSummary.executionAllowed ? 'nonce ready' : `${approvalCount} approval(s)`,
      0.86,
      path.join(DEFAULT_TMP, 'workflow-approval-latest.json'),
    ),
    pipelineStep(
      'trust_gate',
      'Trust Gate',
      gateSummary.status || 'unknown',
      gateSummary.executionAllowed ? 'brain contract passed' : gateSummary.blockedReason || 'waiting',
      gateSummary.executionAllowed ? 0.9 : 0.68,
      path.join(DEFAULT_TMP, 'brain-intent-gate-latest.json'),
    ),
    pipelineStep(
      'launcher',
      'Launcher',
      mutationExecuted ? 'completed' : 'guarded',
      mutationExecuted ? 'mutation executed' : 'stage only until Execute approval',
      executionAllowed ? 0.84 : 0.72,
      path.join(DEFAULT_TMP, 'workflow-latest.json'),
    ),
    pipelineStep(
      'receipt',
      'Receipt',
      liveSummary.overallRisk || status,
      `${liveSummary.timelineCount || 0} timeline nodes`,
      runFailures.length ? 0.58 : 0.86,
      path.join(DEFAULT_TMP, 'live-feed.json'),
    ),
  ];

  const outputPath = resolveRepoPath(args.output);
  const jsOutputPath = resolveRepoPath(args.jsOutput);
  const archivePath = resolveRepoPath(path.join(args.commandDir, `${commandId}.json`));

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    commandId,
    actor: args.actor,
    sourceAnchors: {
      source: 'apps/holoshell/source/holoshell-founder-command-pipeline.hs',
      policy: 'apps/holoshell/source/holoshell-founder-intent-policy.hsplus',
      hardwareControl: 'apps/holoshell/source/holoshell-hardware-control.hsplus',
      adapter: 'scripts/holoshell-founder-command.mjs',
    },
    host: {
      platform: process.platform,
      arch: process.arch,
      release: os.release(),
      hostname: os.hostname(),
    },
    request: {
      intentPreview: args.intent,
      intentHash: hashValue(args.intent),
      rawIntentStoredLocallyOnly: true,
      model: args.model,
      modelRoute: args.modelRoute,
      lofiUrl: args.lofiUrl,
    },
    executionPolicy: {
      default: 'stage_only',
      approvalRequired: true,
      executeRequiresControlDaemon: true,
      executeRoute: 'POST /workflow/execute',
      trustedAutonomyEligibleOnlyAfterReceipts: true,
      mutationExecuted,
    },
    targetSurfaces: [
      'Claude',
      'Windows Terminal',
      'Ollama Kimi Cloud',
      'browser',
      'YouTube lofi',
    ],
    pipeline,
    receipts: {
      dispatch: staged.dispatch || {},
      claudeWorkflow: staged.claudeWorkflow || {},
      roomWorkflow: staged.roomWorkflow || {},
      workflowApproval: staged.workflowApproval || {},
      workflowIntentGate: staged.workflowIntentGate || {},
    },
    runs: staged.runs || [],
    summary: {
      status,
      confidence: normalizeConfidence(dispatchSummary.confidence),
      pipelineStepCount: pipeline.length,
      approvalCount,
      workflowStepCount: Number(roomSummary.stepCount || 0) + Number(claudeSummary.stepCount || 0),
      roomWorkflowStepCount: Number(roomSummary.stepCount || 0),
      claudeWorkflowStepCount: Number(claudeSummary.stepCount || 0),
      executionAllowed,
      mutationExecuted,
      dispatchStatus: dispatchSummary.status || 'unknown',
      dispatchCapabilityLabel: dispatchSummary.capabilityLabel || '',
      workflowStatus: roomSummary.status || 'unknown',
      workflowApprovalStatus: approvalSummary.status || 'unknown',
      intentGateStatus: gateSummary.status || 'unknown',
      failedRunCount: runFailures.length,
      rawIntentStoredLocallyOnly: true,
    },
    output: {
      latestPath: outputPath,
      browserBootstrap: jsOutputPath,
      archivePath,
    },
  };
}

function assertSelfTest(receipt) {
  const failures = [];
  if (receipt.schemaVersion !== SCHEMA_VERSION) failures.push('schemaVersion mismatch');
  if (receipt.summary.status !== 'pending_user_approval') failures.push('expected pending_user_approval');
  if (receipt.summary.pipelineStepCount !== 6) failures.push('expected six pipeline steps');
  if (!receipt.summary.executionAllowed) failures.push('expected execution allowed after approval and gate');
  if (receipt.summary.mutationExecuted) failures.push('self-test should not execute mutations');
  if (!receipt.pipeline.some((step) => step.id === 'launcher' && step.state === 'guarded')) failures.push('expected guarded launcher');
  if (failures.length) throw new Error(`Self-test failed:\n- ${failures.join('\n- ')}`);
}

try {
  const args = parseArgs(process.argv.slice(2));
  const receipt = buildReceipt(args);
  if (args.selfTest) assertSelfTest(receipt);
  const archive = writeJson(receipt.output.archivePath, receipt);
  const output = writeJson(args.output, { ...receipt, output: { ...receipt.output, archivePath: archive } });
  const jsOutput = writeBrowserBootstrap(args.jsOutput, { ...receipt, output: { ...receipt.output, latestPath: output, browserBootstrap: resolveRepoPath(args.jsOutput), archivePath: archive } });
  const written = {
    ...receipt,
    output: {
      ...receipt.output,
      latestPath: output,
      browserBootstrap: jsOutput,
      archivePath: archive,
    },
  };
  if (args.json) {
    console.log(JSON.stringify(written, null, 2));
  } else {
    console.log(`HoloShell Founder Command: ${output}`);
    console.log(`Archive: ${archive}`);
    console.log(`Status: ${written.summary.status}`);
    console.log(`Pipeline steps: ${written.summary.pipelineStepCount}`);
    console.log(`Approvals: ${written.summary.approvalCount}`);
    console.log(`Execution allowed after approval: ${written.summary.executionAllowed ? 'yes' : 'no'}`);
  }
} catch (error) {
  console.error(`holoshell-founder-command failed: ${error.message}`);
  process.exit(1);
}
