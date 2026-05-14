#!/usr/bin/env node
/**
 * HoloShell Ollama Cloud agent launch workflow.
 *
 * Stages a guarded terminal launch for `ollama launch <agent>` targets and
 * writes local workflow, approval, and gate receipts before any mutation.
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
const defaultCatalogOutput = join(tmpRoot, 'ollama-cloud-agent-catalog.json');
const defaultCatalogJsOutput = join(tmpRoot, 'ollama-cloud-agent-catalog.js');
const defaultWorkflowDir = join(tmpRoot, 'workflows');
const defaultApprovalDir = join(tmpRoot, 'workflow-approval-bundles');

const WORKFLOW_SCHEMA = 'hololand.holoshell.workflow.v0.1.0';
const APPROVAL_SCHEMA = 'hololand.holoshell.workflow-approval.v0.1.0';
const GATE_SCHEMA = 'hololand.holoshell.brain-intent-gate.v0.1.0';
const CATALOG_SCHEMA = 'hololand.holoshell.ollama-cloud-agent-catalog.v0.1.0';
const SCRIPT_REF = 'scripts/holoshell-ollama-cloud-agent-workflow.mjs';
const SOURCE_REF = 'apps/holoshell/source/holoshell-hardware-control.hsplus';
const GATE_CASE_ID = 'holoshell-ollama-cloud-agent-local-approval.v0';

const AGENTS = [
  {
    slug: 'claude',
    label: 'Claude Code',
    command: 'ollama launch claude',
    description: "Anthropic's coding tool with subagents",
    family: 'coding_agent',
  },
  {
    slug: 'openclaw',
    label: 'OpenClaw',
    command: 'ollama launch openclaw',
    description: 'Personal AI with 100+ skills',
    family: 'personal_ai',
  },
  {
    slug: 'hermes',
    label: 'Hermes Agent',
    command: 'ollama launch hermes',
    description: 'Self-improving AI agent built by Nous Research',
    family: 'self_improving_agent',
  },
  {
    slug: 'opencode',
    label: 'OpenCode',
    command: 'ollama launch opencode',
    description: "Anomaly's open-source coding agent",
    family: 'coding_agent',
  },
  {
    slug: 'codex',
    label: 'Codex',
    command: 'ollama launch codex',
    description: "OpenAI's coding agent",
    family: 'coding_agent',
  },
  {
    slug: 'copilot',
    label: 'Copilot CLI',
    command: 'ollama launch copilot',
    description: "GitHub's AI coding agent for the terminal",
    family: 'coding_agent',
  },
  {
    slug: 'droid',
    label: 'Droid',
    command: 'ollama launch droid',
    description: "Factory's coding agent across terminal and IDEs",
    family: 'coding_agent',
  },
  {
    slug: 'pi',
    label: 'Pi',
    command: 'ollama launch pi',
    description: 'Minimal AI agent toolkit with plugin support',
    family: 'agent_toolkit',
  },
];

function parseArgs(argv) {
  const args = {
    actor: 'brittney',
    agent: 'claude',
    executeWorkflow: false,
    workflowApprovalBundle: '',
    workflowApprovalId: '',
    workflowApprovalNonce: '',
    output: defaultWorkflowOutput,
    jsOutput: defaultWorkflowJsOutput,
    approvalOutput: defaultApprovalOutput,
    approvalJsOutput: defaultApprovalJsOutput,
    gateOutput: defaultGateOutput,
    gateJsOutput: defaultGateJsOutput,
    catalogOutput: defaultCatalogOutput,
    catalogJsOutput: defaultCatalogJsOutput,
    workflowDir: defaultWorkflowDir,
    approvalDir: defaultApprovalDir,
    json: false,
    listAgents: false,
    selfTest: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = () => argv[++i] ?? '';
    switch (token) {
      case '--actor':
        args.actor = next() || args.actor;
        break;
      case '--agent':
      case '--target-agent':
        args.agent = next() || args.agent;
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
      case '--catalog-output':
        args.catalogOutput = resolve(repoRoot, next());
        break;
      case '--catalog-js-output':
        args.catalogJsOutput = resolve(repoRoot, next());
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
      case '--list-agents':
        args.listAgents = true;
        break;
      case '--self-test':
        args.selfTest = true;
        break;
      default:
        if (token.startsWith('--')) throw new Error(`Unknown argument: ${token}`);
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
  writeFileSync(path, `window.${globalName} = ${JSON.stringify(value, null, 2)};\n`, 'utf8');
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

function normalizeAgent(value) {
  const text = String(value || '').trim().toLowerCase();
  const aliases = {
    'claude code': 'claude',
    anthropic: 'claude',
    openclaw: 'openclaw',
    'open claw': 'openclaw',
    hermes: 'hermes',
    'hermes agent': 'hermes',
    opencode: 'opencode',
    'open code': 'opencode',
    codex: 'codex',
    copilot: 'copilot',
    'copilot cli': 'copilot',
    droid: 'droid',
    pi: 'pi',
  };
  return aliases[text] || text.replace(/^ollama\s+launch\s+/, '');
}

function agentFor(value) {
  const slug = normalizeAgent(value);
  return AGENTS.find((agent) => agent.slug === slug) || null;
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

function buildCatalog(args) {
  return {
    schemaVersion: CATALOG_SCHEMA,
    generatedAt: nowIso(),
    sourceAnchors: {
      source: SOURCE_REF,
      adapter: SCRIPT_REF,
      userProvidedCatalog: true,
    },
    summary: {
      status: 'ready',
      agentCount: AGENTS.length,
      commandPrefix: 'ollama launch',
      ollamaCliPath: whereCommand('ollama'),
    },
    agents: AGENTS.map((agent) => ({
      ...agent,
      selected: agent.slug === normalizeAgent(args.agent),
      permissionEnvelope: 'guarded_execute',
      executionDefault: 'staged_until_user_approval',
    })),
  };
}

function buildSteps(args, executionResult = null) {
  const agent = agentFor(args.agent);
  const ollamaPath = whereCommand('ollama');
  const stepResults = new Map((executionResult?.steps || []).map((step) => [step.id, step]));
  const steps = [
    {
      id: 'resolve-ollama-cloud-cli',
      title: 'Resolve Ollama Cloud launch command',
      kind: 'read_only',
      status: 'resolved',
      approvalRequired: false,
      mutation: false,
      targetResolved: Boolean(ollamaPath),
      evidence: {
        ollamaCliPath: ollamaPath,
        commandPrefix: 'ollama launch',
      },
    },
    {
      id: 'resolve-agent-target',
      title: 'Resolve agent target',
      kind: 'read_only',
      status: agent ? 'resolved' : 'failed',
      approvalRequired: false,
      mutation: false,
      targetResolved: Boolean(agent),
      evidence: {
        requestedAgent: args.agent,
        resolvedAgent: agent?.slug || '',
        supportedAgents: AGENTS.map((item) => item.slug),
      },
    },
    {
      id: 'launch-ollama-cloud-agent',
      title: `Launch ${agent?.label || args.agent} through Ollama Cloud`,
      kind: 'guarded_local_action',
      status: 'approval_required',
      approvalRequired: true,
      mutation: true,
      targetResolved: Boolean(agent && ollamaPath),
      action: {
        type: 'terminal_command',
        command: agent?.command || `ollama launch ${normalizeAgent(args.agent)}`,
        visibility: 'foreground_terminal',
      },
      safety: {
        requiresUserVisibleSurface: true,
        shellContextAttached: false,
        terminalRemainsOpen: true,
      },
    },
  ];

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
  const agent = agentFor(args.agent);
  const pending = steps.filter((step) => step.status === 'approval_required');
  const failed = steps.filter((step) => step.status === 'failed');
  const targetResolved = steps.filter((step) => step.targetResolved).length;
  const mutationExecuted = Boolean(executionResult?.mutationExecuted);
  return {
    status: mutationExecuted
      ? failed.length
        ? 'execution_failed'
        : 'completed'
      : pending.length
        ? 'pending_user_approval'
        : 'staged',
    workflowKind: 'ollama_cloud_agent',
    stepCount: steps.length,
    guardedStepCount: steps.filter((step) => step.approvalRequired).length,
    pendingApprovalCount: pending.length,
    stageErrorCount: failed.length,
    targetResolvedCount: targetResolved,
    actor: args.actor,
    agentSlug: agent?.slug || normalizeAgent(args.agent),
    agentLabel: agent?.label || args.agent,
    agentDescription: agent?.description || '',
    command: agent?.command || `ollama launch ${normalizeAgent(args.agent)}`,
    shellContextAttachedByDefault: false,
    mutationExecuted,
    executionStartedAt: executionResult?.startedAt || null,
    executionFinishedAt: executionResult?.finishedAt || null,
  };
}

function buildWorkflow(args, executionResult = null) {
  const agent = agentFor(args.agent);
  const workflowId = id('hswf-ollama-cloud-agent', agent?.slug || args.agent);
  const steps = buildSteps(args, executionResult);
  const summary = workflowSummary(args, steps, executionResult);
  const generatedAt = nowIso();
  return {
    schema: WORKFLOW_SCHEMA,
    workflowId,
    profile: 'ollama_cloud_agent',
    title: `Ollama ${agent?.label || summary.agentLabel}`,
    createdAt: generatedAt,
    generatedAt,
    actor: args.actor,
    status: summary.status,
    description:
      'Guarded HoloShell workflow for launching an Ollama Cloud agent in a foreground terminal.',
    sourceAnchors: {
      source: SOURCE_REF,
      adapter: SCRIPT_REF,
    },
    policy: {
      executionDefault: 'staged_until_user_approval',
      shellContextAttachedByDefault: false,
      terminalLaunchRequiresApproval: true,
      commandBodyStoredLocallyOnly: true,
    },
    request: {
      agent: summary.agentSlug,
    },
    catalog: buildCatalog(args).agents,
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
  const approvalId = id('hswap-ollama-cloud-agent', workflow.workflowId);
  const nonce = randomBytes(16).toString('hex');
  const generatedAt = nowIso();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const bundlePath = join(args.approvalDir, `${approvalId}.json`);
  const command = approvalCommand(bundlePath, approvalId, nonce);
  const guardedSteps = workflow.steps.filter((step) => step.approvalRequired);
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
      title: `Launch ${workflow.summary.agentLabel}`,
      intent: `Open a terminal and run ${workflow.summary.command}.`,
      riskLevel: 'medium',
      localMutation: true,
      shellContextAttached: false,
      pendingStepIds: guardedSteps.map((step) => step.id),
      agentSlug: workflow.summary.agentSlug,
      command: workflow.summary.command,
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
        : ['Ollama CLI or agent target was not resolved. Restage after installing Ollama or choosing a supported agent.'],
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
      agentSlug: workflow.summary.agentSlug,
      agentLabel: workflow.summary.agentLabel,
    },
  };
}

function buildLocalGate(args, workflow) {
  const allowed =
    workflow.summary.stageErrorCount === 0 &&
    workflow.summary.targetResolvedCount === workflow.summary.stepCount &&
    !workflow.summary.mutationExecuted;
  const blockedReason = allowed
    ? ''
    : 'Ollama Cloud agent workflow is not fully staged. Restage with a supported agent and local Ollama CLI.';
  return {
    schemaVersion: GATE_SCHEMA,
    generatedAt: nowIso(),
    gateId: id('hsbig-ollama-cloud-agent', workflow.workflowId),
    sourceAnchors: {
      source: SOURCE_REF,
      adapter: SCRIPT_REF,
    },
    gate: {
      label: 'holoshell_ollama_cloud_agent_local_approval',
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
      caseId: GATE_CASE_ID,
      receiptStatus: 'local_approval_gate',
      score: 1,
      passed: allowed ? 1 : 0,
      total: 1,
      failedCheckCount: allowed ? 0 : 1,
      blockedReason,
      workflowKind: workflow.summary.workflowKind,
      workflowId: workflow.workflowId,
      agentSlug: workflow.summary.agentSlug,
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
  if (!existsSync(bundlePath)) throw new Error(`Workflow approval bundle not found: ${bundlePath}`);
  const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));
  if (bundle.schema !== APPROVAL_SCHEMA) throw new Error(`Unsupported approval schema: ${bundle.schema}`);
  if (bundle.approvalId !== args.workflowApprovalId) throw new Error('Workflow approval id mismatch.');
  if (bundle.execution?.nonce !== args.workflowApprovalNonce) throw new Error('Workflow approval nonce mismatch.');
  if (bundle.execution?.allowed !== true) {
    throw new Error(`Workflow approval is not executable: ${(bundle.execution?.blockedReasons || []).join('; ')}`);
  }
  if (Date.parse(bundle.expiresAt) < Date.now()) {
    throw new Error('Workflow approval bundle expired. Restage the workflow.');
  }
  return {
    ...args,
    actor: bundle.actor || args.actor,
    agent: bundle.workflowRequest?.agent || args.agent,
    hydratedApproval: {
      approvalId: bundle.approvalId,
      workflowId: bundle.workflowId,
      bundlePath,
    },
  };
}

function psString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function runPowerShell(command, options = {}) {
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
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

function executeTerminalCommand(command) {
  const encoded = Buffer.from(command, 'utf8').toString('base64');
  const ps = [
    `$bytes = [Convert]::FromBase64String(${psString(encoded)})`,
    '$cmd = [System.Text.Encoding]::UTF8.GetString($bytes)',
    "Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoExit','-NoProfile','-Command',$cmd)",
  ].join('; ');
  return runPowerShell(ps, { timeoutMs: 12000 });
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
        ok: step.targetResolved,
        status: step.targetResolved ? step.status : 'failed',
        startedAt: nowIso(),
        finishedAt: nowIso(),
        exitCode: step.targetResolved ? 0 : 1,
        stderr: step.targetResolved ? '' : `${step.title} did not resolve.`,
      });
      if (!step.targetResolved) break;
      continue;
    }

    const stepStarted = nowIso();
    const result = executeTerminalCommand(step.action.command);
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
  }

  return {
    startedAt,
    finishedAt: nowIso(),
    mutationExecuted,
    steps: executedSteps,
    approval: args.hydratedApproval || null,
  };
}

function persist(args, workflow, approvalBundle = null, gate = null, catalog = null) {
  writeJson(args.output, workflow);
  writeJs(args.jsOutput, 'HOLOSHELL_WORKFLOW', workflow);
  ensureDir(args.workflowDir);
  writeJson(join(args.workflowDir, `${workflow.workflowId}.json`), workflow);

  if (catalog) {
    writeJson(args.catalogOutput, catalog);
    writeJs(args.catalogJsOutput, 'HOLOSHELL_OLLAMA_CLOUD_AGENT_CATALOG', catalog);
  }

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
  const args = parseArgs(['--agent', 'codex', '--json']);
  const workflow = buildWorkflow(args);
  const approval = buildApprovalBundle(args, workflow);
  const gate = buildLocalGate(args, workflow);
  const catalog = buildCatalog(args);
  const failures = [];

  if (workflow.schema !== WORKFLOW_SCHEMA) failures.push('workflow schema mismatch');
  if (workflow.summary.workflowKind !== 'ollama_cloud_agent') failures.push('workflow kind mismatch');
  if (workflow.summary.agentSlug !== 'codex') failures.push('agent slug mismatch');
  if (workflow.summary.command !== 'ollama launch codex') failures.push('command mismatch');
  if (!workflow.steps.some((step) => step.id === 'launch-ollama-cloud-agent')) failures.push('missing launch step');
  if (approval.schema !== APPROVAL_SCHEMA) failures.push('approval schema mismatch');
  if (!approval.execution.allowed) failures.push('approval should be executable on this host');
  if (approval.execution.command.some((part) => String(part).includes('room-marathon'))) {
    failures.push('approval command leaked room-marathon workflow');
  }
  if (gate.summary.caseId !== GATE_CASE_ID) failures.push('gate case mismatch');
  if (gate.summary.runtimeBlocking) failures.push('Ollama Cloud agent should use local approval gate');
  if (catalog.summary.agentCount !== AGENTS.length) failures.push('catalog count mismatch');

  return {
    ok: failures.length === 0,
    failures,
    workflow,
    approval,
    gate,
    catalog,
  };
}

function main() {
  let args = parseArgs(process.argv.slice(2));
  if (args.listAgents) {
    const catalog = buildCatalog(args);
    if (args.json) console.log(JSON.stringify(catalog, null, 2));
    else for (const agent of catalog.agents) console.log(`${agent.label}: ${agent.command}`);
    return;
  }

  if (args.selfTest) {
    const result = selfTest();
    if (args.json) console.log(JSON.stringify(result, null, 2));
    else console.log(result.ok ? 'Ollama Cloud agent workflow self-test passed.' : result.failures.join('\n'));
    process.exit(result.ok ? 0 : 1);
  }

  let executionResult = null;
  if (args.executeWorkflow) {
    args = hydrateArgsFromBundle(args);
    executionResult = executeWorkflow(args);
  }

  const workflow = buildWorkflow(args, executionResult);
  const approval = executionResult ? null : buildApprovalBundle(args, workflow);
  const gate = buildLocalGate(args, workflow);
  const catalog = buildCatalog(args);
  persist(args, workflow, approval, gate, catalog);

  const result = {
    ok: workflow.summary.stageErrorCount === 0,
    workflow,
    approval,
    gate,
    catalog,
    outputs: {
      workflow: args.output,
      workflowJs: args.jsOutput,
      approval: approval ? args.approvalOutput : null,
      approvalJs: approval ? args.approvalJsOutput : null,
      gate: args.gateOutput,
      gateJs: args.gateJsOutput,
      catalog: args.catalogOutput,
      catalogJs: args.catalogJsOutput,
    },
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(
      `${workflow.title} ${workflow.status}: ${workflow.summary.command}; ${workflow.summary.pendingApprovalCount} approval(s) pending`,
    );
  }

  process.exit(result.ok ? 0 : 1);
}

main();
