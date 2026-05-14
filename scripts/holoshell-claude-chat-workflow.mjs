#!/usr/bin/env node
/**
 * HoloShell Claude chat workflow bridge.
 *
 * Stages a guarded local workflow for opening Claude, starting a chat, and
 * optionally placing a user prompt into the chat box. Execution is approval
 * gated and writes local receipts before and after any mutation.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');
const tmpRoot = join(repoRoot, '.tmp', 'holoshell');
const defaultWorkflowOutput = join(tmpRoot, 'workflow-latest.json');
const defaultWorkflowJsOutput = join(tmpRoot, 'workflow-latest.js');
const defaultApprovalOutput = join(tmpRoot, 'workflow-approval-latest.json');
const defaultApprovalJsOutput = join(tmpRoot, 'workflow-approval-latest.js');
const defaultGateOutput = join(tmpRoot, 'brain-intent-gate-latest.json');
const defaultGateJsOutput = join(tmpRoot, 'brain-intent-gate-latest.js');
const defaultWorkflowDir = join(tmpRoot, 'workflows');
const defaultApprovalDir = join(tmpRoot, 'workflow-approval-bundles');

const WORKFLOW_SCHEMA = 'hololand.holoshell.workflow.v0.1.0';
const APPROVAL_SCHEMA = 'hololand.holoshell.workflow-approval.v0.1.0';
const GATE_SCHEMA = 'hololand.holoshell.brain-intent-gate.v0.1.0';
const SCRIPT_REF = 'scripts/holoshell-claude-chat-workflow.mjs';
const SOURCE_REF = 'apps/holoshell/source/holoshell-hardware-control.hsplus';
const USER_PACK_REF = 'user-pack.open-claude-chat';

function parseArgs(argv) {
  const args = {
    actor: 'brittney',
    claudeApp: 'Claude',
    prompt: '',
    newChatHotkey: 'Ctrl+N',
    startNewChat: true,
    submit: false,
    executeWorkflow: false,
    workflowApprovalBundle: '',
    workflowApprovalId: '',
    workflowApprovalNonce: '',
    stepDelayMs: 900,
    output: defaultWorkflowOutput,
    jsOutput: defaultWorkflowJsOutput,
    approvalOutput: defaultApprovalOutput,
    approvalJsOutput: defaultApprovalJsOutput,
    gateOutput: defaultGateOutput,
    gateJsOutput: defaultGateJsOutput,
    workflowDir: defaultWorkflowDir,
    approvalDir: defaultApprovalDir,
    json: false,
    selfTest: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = () => argv[++i] ?? '';

    switch (token) {
      case '--actor':
        args.actor = next() || args.actor;
        break;
      case '--claude-app':
        args.claudeApp = next() || args.claudeApp;
        break;
      case '--prompt':
      case '--chat-prompt':
        args.prompt = next();
        break;
      case '--new-chat-hotkey':
        args.newChatHotkey = next() || args.newChatHotkey;
        break;
      case '--no-new-chat':
        args.startNewChat = false;
        break;
      case '--submit':
        args.submit = true;
        break;
      case '--execute-workflow':
        args.executeWorkflow = true;
        break;
      case '--workflow-approval-bundle':
        args.workflowApprovalBundle = next();
        break;
      case '--workflow-approval-id':
        args.workflowApprovalId = next();
        break;
      case '--workflow-approval-nonce':
        args.workflowApprovalNonce = next();
        break;
      case '--step-delay-ms':
        args.stepDelayMs = Number(next()) || args.stepDelayMs;
        break;
      case '--output':
        args.output = resolve(repoRoot, next());
        break;
      case '--js-output':
        args.jsOutput = resolve(repoRoot, next());
        break;
      case '--approval-output':
        args.approvalOutput = resolve(repoRoot, next());
        break;
      case '--approval-js-output':
        args.approvalJsOutput = resolve(repoRoot, next());
        break;
      case '--gate-output':
        args.gateOutput = resolve(repoRoot, next());
        break;
      case '--gate-js-output':
        args.gateJsOutput = resolve(repoRoot, next());
        break;
      case '--workflow-dir':
        args.workflowDir = resolve(repoRoot, next());
        break;
      case '--approval-dir':
        args.approvalDir = resolve(repoRoot, next());
        break;
      case '--json':
        args.json = true;
        break;
      case '--self-test':
        args.selfTest = true;
        break;
      default:
        if (token.startsWith('--')) {
          throw new Error(`Unknown argument: ${token}`);
        }
    }
  }

  return args;
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function writeJson(path, value) {
  ensureDir(dirname(path));
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeJs(path, globalName, value) {
  ensureDir(dirname(path));
  writeFileSync(
    path,
    `window.${globalName} = ${JSON.stringify(value, null, 2)};\n`,
    'utf8',
  );
}

function nowIso() {
  return new Date().toISOString();
}

function shortHash(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 12);
}

function id(prefix, seed = '') {
  return `${prefix}-${Date.now()}-${shortHash(`${seed}:${randomBytes(4).toString('hex')}`)}`;
}

function whereCommand(command) {
  const result = spawnSync('where.exe', [command], {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) return null;
  return (result.stdout || '').split(/\r?\n/).find(Boolean) || null;
}

function promptDigest(prompt) {
  const clean = String(prompt || '');
  return {
    present: clean.trim().length > 0,
    length: clean.length,
    sha256: clean ? createHash('sha256').update(clean).digest('hex') : null,
  };
}

function buildSteps(args, executionResult = null) {
  const cliPath = whereCommand('claude');
  const promptInfo = promptDigest(args.prompt);
  const stepResults = new Map(
    (executionResult?.steps || []).map((step) => [step.id, step]),
  );

  const steps = [
    {
      id: 'resolve-claude-surface',
      title: 'Resolve Claude surface',
      kind: 'read_only',
      status: 'resolved',
      approvalRequired: false,
      mutation: false,
      targetResolved: Boolean(args.claudeApp || cliPath),
      evidence: {
        claudeApp: args.claudeApp,
        claudeCliPath: cliPath,
        hardwareSurface: 'windows_desktop',
      },
    },
    {
      id: 'open-claude',
      title: 'Open or focus Claude',
      kind: 'guarded_local_action',
      status: 'approval_required',
      approvalRequired: true,
      mutation: true,
      targetResolved: Boolean(args.claudeApp),
      action: {
        type: 'launch_app',
        app: args.claudeApp,
        visibility: 'foreground',
      },
      safety: {
        requiresUserVisibleSurface: true,
        shellContextAttached: false,
      },
    },
  ];

  if (args.startNewChat) {
    steps.push({
      id: 'start-new-chat',
      title: 'Start a new Claude chat',
      kind: 'guarded_local_action',
      status: 'approval_required',
      approvalRequired: true,
      mutation: true,
      targetResolved: Boolean(args.claudeApp && args.newChatHotkey),
      action: {
        type: 'hotkey',
        processName: args.claudeApp,
        hotkey: args.newChatHotkey,
      },
      safety: {
        shellContextAttached: false,
        submitsMessage: false,
      },
    });
  }

  if (promptInfo.present) {
    steps.push({
      id: 'stage-chat-prompt',
      title: 'Place prompt in Claude chat box',
      kind: 'guarded_local_action',
      status: 'approval_required',
      approvalRequired: true,
      mutation: true,
      targetResolved: Boolean(args.claudeApp),
      action: {
        type: 'paste_text',
        processName: args.claudeApp,
        text: args.prompt,
        promptHash: promptInfo.sha256,
        promptLength: promptInfo.length,
      },
      safety: {
        shellContextAttached: false,
        submitsMessage: false,
        clipboardTemporarilyTouched: true,
      },
    });
  }

  if (args.submit && promptInfo.present) {
    steps.push({
      id: 'submit-chat-prompt',
      title: 'Submit prompt to Claude',
      kind: 'guarded_local_action',
      status: 'approval_required',
      approvalRequired: true,
      mutation: true,
      targetResolved: Boolean(args.claudeApp),
      action: {
        type: 'hotkey',
        processName: args.claudeApp,
        hotkey: 'Enter',
      },
      safety: {
        shellContextAttached: false,
        submitsMessage: true,
      },
    });
  }

  return steps.map((step) => {
    const result = stepResults.get(step.id);
    if (!result) return step;
    return {
      ...step,
      status: result.status,
      execution: {
        ok: result.ok,
        startedAt: result.startedAt,
        finishedAt: result.finishedAt,
        exitCode: result.exitCode,
        stderr: result.stderr,
      },
    };
  });
}

function workflowSummary(args, steps, executionResult = null) {
  const guarded = steps.filter((step) => step.approvalRequired);
  const pending = steps.filter((step) => step.status === 'approval_required');
  const failed = steps.filter((step) => step.status === 'failed');
  const targetResolved = steps.filter((step) => step.targetResolved).length;
  const mutationExecuted = Boolean(executionResult?.mutationExecuted);
  const promptInfo = promptDigest(args.prompt);

  return {
    status: mutationExecuted
      ? failed.length
        ? 'execution_failed'
        : 'completed'
      : pending.length
        ? 'pending_user_approval'
        : 'staged',
    workflowKind: 'claude_chat',
    stepCount: steps.length,
    guardedStepCount: guarded.length,
    pendingApprovalCount: pending.length,
    stageErrorCount: failed.length,
    targetResolvedCount: targetResolved,
    targetSurface: args.claudeApp,
    actor: args.actor,
    promptPresent: promptInfo.present,
    promptHash: promptInfo.sha256,
    promptLength: promptInfo.length,
    promptSubmissionRequested: Boolean(args.submit),
    shellContextAttachedByDefault: false,
    mutationExecuted,
    executionStartedAt: executionResult?.startedAt || null,
    executionFinishedAt: executionResult?.finishedAt || null,
  };
}

function buildWorkflow(args, executionResult = null) {
  const workflowId = id('hswf-claude-chat', args.prompt || args.claudeApp);
  const steps = buildSteps(args, executionResult);
  const summary = workflowSummary(args, steps, executionResult);
  const generatedAt = nowIso();

  return {
    schema: WORKFLOW_SCHEMA,
    workflowId,
    profile: 'claude_chat',
    title: 'Claude Chat',
    createdAt: generatedAt,
    generatedAt,
    actor: args.actor,
    status: summary.status,
    description:
      'Guarded HoloShell workflow for opening Claude, starting a chat, and staging an optional prompt without attaching shell context by default.',
    sourceAnchors: {
      source: SOURCE_REF,
      adapter: SCRIPT_REF,
      userPack: USER_PACK_REF,
    },
    policy: {
      executionDefault: 'staged_until_user_approval',
      shellContextAttachedByDefault: false,
      promptSubmitRequiresApproval: true,
      promptBodyStoredLocallyOnly: true,
      clipboardMayBeTemporarilyTouchedOnExecute: summary.promptPresent,
    },
    request: {
      claudeApp: args.claudeApp,
      startNewChat: args.startNewChat,
      newChatHotkey: args.newChatHotkey,
      submit: args.submit,
      prompt: args.prompt,
    },
    steps,
    summary,
  };
}

function approvalCommand(bundlePath, approvalId, nonce) {
  return [
    'node',
    SCRIPT_REF,
    '--workflow-approval-bundle',
    bundlePath,
    '--workflow-approval-id',
    approvalId,
    '--workflow-approval-nonce',
    nonce,
    '--execute-workflow',
  ];
}

function buildApprovalBundle(args, workflow) {
  const approvalId = id('hswap-claude-chat', workflow.workflowId);
  const nonce = randomBytes(16).toString('hex');
  const generatedAt = nowIso();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const bundlePath = join(args.approvalDir, `${approvalId}.json`);
  const command = approvalCommand(bundlePath, approvalId, nonce);
  const steps = workflow.steps.filter((step) => step.approvalRequired);
  const allowed =
    workflow.summary.pendingApprovalCount > 0 &&
    workflow.summary.stageErrorCount === 0 &&
    workflow.summary.targetResolvedCount === workflow.summary.stepCount &&
    !workflow.summary.mutationExecuted;

  return {
    schema: APPROVAL_SCHEMA,
    approvalId,
    workflowId: workflow.workflowId,
    createdAt: generatedAt,
    generatedAt,
    expiresAt,
    status: allowed ? 'pending_user_approval' : 'blocked',
    actor: args.actor,
    nonce,
    sourceAnchors: workflow.sourceAnchors,
    approvalRequest: {
      title: 'Open Claude chat',
      intent: 'Open Claude and stage a new chat prompt for the user to review.',
      riskLevel: args.submit ? 'high' : 'medium',
      localMutation: true,
      shellContextAttached: false,
      pendingStepIds: steps.map((step) => step.id),
      promptHash: workflow.summary.promptHash,
      promptLength: workflow.summary.promptLength,
      submitRequested: args.submit,
    },
    workflowRequest: workflow.request,
    execution: {
      allowed,
      bundlePath,
      command,
      commandPreview: command.join(' '),
      workingDirectory: repoRoot,
      nonce,
      blockedReasons: allowed
        ? []
        : [
            'Workflow is not fully resolved or has already executed. Restage the Claude chat workflow.',
          ],
    },
    summary: {
      status: allowed ? 'pending_user_approval' : 'blocked',
      workflowId: workflow.workflowId,
      title: workflow.title,
      expiresAt,
      executionAllowed: allowed,
      pendingApprovalCount: workflow.summary.pendingApprovalCount,
      targetResolvedCount: workflow.summary.targetResolvedCount,
      stepCount: workflow.summary.stepCount,
      mutationExecuted: workflow.summary.mutationExecuted,
      shellContextAttachedByDefault: false,
      workflowKind: workflow.summary.workflowKind,
    },
  };
}

function buildLocalIntentGate(args, workflow) {
  const generatedAt = nowIso();
  const allowed =
    workflow.summary.stageErrorCount === 0 &&
    workflow.summary.targetResolvedCount === workflow.summary.stepCount &&
    !workflow.summary.mutationExecuted;
  const blockedReason = allowed
    ? ''
    : 'Claude chat workflow is not fully staged. Restage the workflow before execution.';

  return {
    schemaVersion: GATE_SCHEMA,
    generatedAt,
    gateId: id('hsbig-claude-chat', workflow.workflowId),
    sourceAnchors: {
      source: SOURCE_REF,
      adapter: SCRIPT_REF,
      userPack: USER_PACK_REF,
    },
    gate: {
      label: 'holoshell_claude_chat_local_approval',
      allowed,
      status: allowed ? 'allow' : 'block',
      runtimeBlocking: false,
      blockedReason,
      failedCheckIds: [],
    },
    summary: {
      status: allowed ? 'not_required' : 'blocked',
      executionAllowed: allowed,
      runtimeBlocking: false,
      caseId: 'holoshell-claude-chat-local-approval.v0',
      receiptStatus: 'local_approval_gate',
      score: 1,
      passed: allowed ? 1 : 0,
      total: 1,
      failedCheckCount: allowed ? 0 : 1,
      blockedReason,
      workflowKind: workflow.summary.workflowKind,
    },
    output: {
      latestPath: args.gateOutput,
      browserBootstrap: args.gateJsOutput,
      sourceReceiptPath: '',
    },
  };
}

function hydrateArgsFromBundle(args) {
  if (!args.workflowApprovalBundle) {
    throw new Error('--execute-workflow requires --workflow-approval-bundle');
  }
  const bundlePath = resolve(repoRoot, args.workflowApprovalBundle);
  if (!existsSync(bundlePath)) {
    throw new Error(`Workflow approval bundle not found: ${bundlePath}`);
  }
  const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));
  if (bundle.schema !== APPROVAL_SCHEMA) {
    throw new Error(`Unsupported approval schema: ${bundle.schema}`);
  }
  if (bundle.approvalId !== args.workflowApprovalId) {
    throw new Error('Workflow approval id mismatch.');
  }
  if (bundle.execution?.nonce !== args.workflowApprovalNonce) {
    throw new Error('Workflow approval nonce mismatch.');
  }
  if (bundle.execution?.allowed !== true) {
    throw new Error(
      `Workflow approval is not executable: ${(bundle.execution?.blockedReasons || []).join('; ')}`,
    );
  }
  if (Date.parse(bundle.expiresAt) < Date.now()) {
    throw new Error('Workflow approval bundle expired. Restage the workflow.');
  }

  const request = bundle.workflowRequest || {};
  return {
    ...args,
    actor: bundle.actor || args.actor,
    claudeApp: request.claudeApp || args.claudeApp,
    prompt: request.prompt || '',
    startNewChat: request.startNewChat !== false,
    newChatHotkey: request.newChatHotkey || args.newChatHotkey,
    submit: Boolean(request.submit),
    hydratedApproval: {
      approvalId: bundle.approvalId,
      workflowId: bundle.workflowId,
      bundlePath,
    },
  };
}

function runPowerShell(command, options = {}) {
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-Sta', '-ExecutionPolicy', 'Bypass', '-Command', command],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      windowsHide: true,
      timeout: options.timeoutMs || 15000,
    },
  );
  return {
    ok: result.status === 0,
    exitCode: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || result.error?.message || '',
  };
}

function psString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function hotkeyToSendKeys(hotkey) {
  const normalized = String(hotkey || '').trim().toLowerCase();
  if (normalized === 'ctrl+n' || normalized === 'control+n') return '^n';
  if (normalized === 'enter' || normalized === 'return') return '{ENTER}';
  if (/^[a-z0-9]$/i.test(normalized)) return normalized;
  throw new Error(`Unsupported hotkey for local execution: ${hotkey}`);
}

function executeLaunchApp(app) {
  return runPowerShell(`Start-Process -FilePath ${psString(app)}`, {
    timeoutMs: 10000,
  });
}

function executeHotkey(hotkey) {
  const sendKeys = hotkeyToSendKeys(hotkey);
  return runPowerShell(
    `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(${psString(sendKeys)})`,
    { timeoutMs: 10000 },
  );
}

function executePasteText(text) {
  const encoded = Buffer.from(String(text), 'utf8').toString('base64');
  const command = [
    'Add-Type -AssemblyName System.Windows.Forms',
    `$old = Get-Clipboard -Raw -ErrorAction SilentlyContinue`,
    `$bytes = [Convert]::FromBase64String(${psString(encoded)})`,
    `$text = [System.Text.Encoding]::UTF8.GetString($bytes)`,
    'Set-Clipboard -Value $text',
    'Start-Sleep -Milliseconds 150',
    "[System.Windows.Forms.SendKeys]::SendWait('^v')",
    'Start-Sleep -Milliseconds 150',
    'if ($null -ne $old) { Set-Clipboard -Value $old }',
  ].join('; ');
  return runPowerShell(command, { timeoutMs: 15000 });
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function executeWorkflow(args) {
  const startedAt = nowIso();
  const steps = buildSteps(args);
  const executedSteps = [];
  let mutationExecuted = false;

  for (const step of steps) {
    if (!step.approvalRequired) {
      executedSteps.push({
        id: step.id,
        ok: true,
        status: step.status,
        startedAt: nowIso(),
        finishedAt: nowIso(),
        exitCode: 0,
        stderr: '',
      });
      continue;
    }

    const stepStarted = nowIso();
    let result;
    try {
      if (step.action?.type === 'launch_app') {
        result = executeLaunchApp(step.action.app);
      } else if (step.action?.type === 'hotkey') {
        result = executeHotkey(step.action.hotkey);
      } else if (step.action?.type === 'paste_text') {
        result = executePasteText(step.action.text);
      } else {
        throw new Error(`Unsupported workflow action: ${step.action?.type}`);
      }
    } catch (error) {
      result = {
        ok: false,
        exitCode: 1,
        stdout: '',
        stderr: error.message,
      };
    }

    mutationExecuted = mutationExecuted || result.ok;
    executedSteps.push({
      id: step.id,
      ok: result.ok,
      status: result.ok ? 'completed' : 'failed',
      startedAt: stepStarted,
      finishedAt: nowIso(),
      exitCode: result.exitCode,
      stderr: String(result.stderr || '').trim().slice(0, 1200),
    });

    if (!result.ok) break;
    sleep(args.stepDelayMs);
  }

  return {
    startedAt,
    finishedAt: nowIso(),
    mutationExecuted,
    steps: executedSteps,
    approval: args.hydratedApproval || null,
  };
}

function persist(args, workflow, approvalBundle = null, gate = null) {
  writeJson(args.output, workflow);
  writeJs(args.jsOutput, 'HOLOSHELL_WORKFLOW', workflow);

  ensureDir(args.workflowDir);
  writeJson(join(args.workflowDir, `${workflow.workflowId}.json`), workflow);

  if (gate) {
    writeJson(args.gateOutput, gate);
    writeJs(args.gateJsOutput, 'HOLOSHELL_BRAIN_INTENT_GATE', gate);
  }

  if (approvalBundle) {
    writeJson(args.approvalOutput, approvalBundle);
    writeJs(args.approvalJsOutput, 'HOLOSHELL_WORKFLOW_APPROVAL', approvalBundle);
    writeJson(
      approvalBundle.execution?.bundlePath || join(args.approvalDir, `${approvalBundle.approvalId}.json`),
      approvalBundle,
    );
  }
}

function selfTest() {
  const args = parseArgs([
    '--actor',
    'self-test',
    '--claude-app',
    'Claude',
    '--prompt',
    'Open a calm planning chat for HoloShell.',
    '--json',
  ]);
  const workflow = buildWorkflow(args);
  const approval = buildApprovalBundle(args, workflow);
  const gate = buildLocalIntentGate(args, workflow);

  const failures = [];
  if (workflow.schema !== WORKFLOW_SCHEMA) failures.push('workflow schema mismatch');
  if (workflow.profile !== 'claude_chat') failures.push('workflow profile mismatch');
  if (workflow.summary.promptSubmissionRequested) failures.push('submit should be false by default');
  if (workflow.summary.shellContextAttachedByDefault) failures.push('shell context should be off');
  if (!workflow.steps.some((step) => step.id === 'open-claude')) failures.push('missing open step');
  if (!workflow.steps.some((step) => step.id === 'stage-chat-prompt')) failures.push('missing prompt step');
  if (approval.schema !== APPROVAL_SCHEMA) failures.push('approval schema mismatch');
  if (!approval.execution.allowed) failures.push('approval should be executable');
  if (approval.execution.command.some((part) => String(part).includes('room-marathon'))) {
    failures.push('approval command leaked room-marathon workflow');
  }
  if (gate.summary.runtimeBlocking) failures.push('Claude chat should not reuse a runtime-blocking room-marathon gate');
  if (gate.summary.caseId !== 'holoshell-claude-chat-local-approval.v0') failures.push('Claude chat gate case mismatch');

  return {
    ok: failures.length === 0,
    failures,
    workflow,
    approval,
    gate,
  };
}

function main() {
  let args = parseArgs(process.argv.slice(2));

  if (args.selfTest) {
    const result = selfTest();
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result.ok ? 'Claude chat workflow self-test passed.' : result.failures.join('\n'));
    }
    process.exit(result.ok ? 0 : 1);
  }

  let executionResult = null;
  if (args.executeWorkflow) {
    args = hydrateArgsFromBundle(args);
    executionResult = executeWorkflow(args);
  }

  const workflow = buildWorkflow(args, executionResult);
  const approval = executionResult ? null : buildApprovalBundle(args, workflow);
  const gate = buildLocalIntentGate(args, workflow);
  persist(args, workflow, approval, gate);

  const result = {
    ok: workflow.summary.stageErrorCount === 0,
    workflow,
    approval,
    gate,
    outputs: {
      workflow: args.output,
      workflowJs: args.jsOutput,
      approval: approval ? args.approvalOutput : null,
      approvalJs: approval ? args.approvalJsOutput : null,
      gate: args.gateOutput,
      gateJs: args.gateJsOutput,
    },
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(
      `${workflow.title} ${workflow.status}: ${workflow.summary.pendingApprovalCount} approval(s) pending`,
    );
  }

  process.exit(result.ok ? 0 : 1);
}

main();
