#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const SCHEMA_VERSION = 'hololand.holoshell.run-receipt.v0.1.0';
const REGISTRY_SCHEMA_VERSION = 'hololand.holoshell.run-registry.v0.1.0';
const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const DEFAULT_REGISTRY = path.join('.tmp', 'holoshell', 'run-registry.json');
const DEFAULT_RECEIPTS_DIR = path.join('.tmp', 'holoshell', 'run-receipts');
const DEFAULT_HEALTH_OUTPUT = path.join('.tmp', 'holoshell', 'process-health.json');
const HEAVY_RUN_CLASSES = new Set([
  'build',
  'test',
  'browser_audit',
  'dev_server',
  'watcher',
  'install',
  'package_script',
  'long_running',
]);

function parseArgs(argv) {
  const args = {
    laneId: 'codex-hardware',
    agentKind: 'codex',
    surfaceKind: 'hardware_shell',
    runClass: null,
    expectedMinutes: 30,
    reason: '',
    cwd: REPO_ROOT,
    name: '',
    registry: DEFAULT_REGISTRY,
    receiptsDir: DEFAULT_RECEIPTS_DIR,
    healthOutput: DEFAULT_HEALTH_OUTPUT,
    json: false,
    dryRun: false,
    selfTest: false,
    noHealthGate: false,
    allowWarn: false,
    allowCritical: false,
    command: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      args.command = argv.slice(index + 1);
      break;
    } else if (arg === '--lane-id') args.laneId = argv[++index];
    else if (arg === '--agent-kind') args.agentKind = argv[++index];
    else if (arg === '--surface-kind') args.surfaceKind = argv[++index];
    else if (arg === '--run-class') args.runClass = argv[++index];
    else if (arg === '--expected-minutes') args.expectedMinutes = Number(argv[++index]);
    else if (arg === '--reason') args.reason = argv[++index];
    else if (arg === '--cwd') args.cwd = argv[++index];
    else if (arg === '--name') args.name = argv[++index];
    else if (arg === '--registry') args.registry = argv[++index];
    else if (arg === '--receipts-dir') args.receiptsDir = argv[++index];
    else if (arg === '--health-output') args.healthOutput = argv[++index];
    else if (arg === '--json') args.json = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--self-test') args.selfTest = true;
    else if (arg === '--no-health-gate') args.noHealthGate = true;
    else if (arg === '--allow-warn') args.allowWarn = true;
    else if (arg === '--allow-critical') args.allowCritical = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument before --: ${arg}`);
    }
  }

  if (!args.selfTest && args.command.length === 0) {
    throw new Error('Missing command. Pass command after --.');
  }
  if (!args.laneId || !args.agentKind || !args.surfaceKind) {
    throw new Error('lane id, agent kind, and surface kind are required');
  }
  if (!Number.isFinite(args.expectedMinutes) || args.expectedMinutes < 1) {
    throw new Error('--expected-minutes must be a positive number');
  }

  args.cwd = path.resolve(args.cwd || REPO_ROOT);
  args.runClass = args.runClass || inferRunClass(args.command);
  return args;
}

function printHelp() {
  console.log(`HoloShell run custody wrapper

Usage:
  node scripts/holoshell-run.mjs [options] -- <command> [args...]

Options:
  --lane-id <id>             Agent lane id. Default: codex-hardware.
  --agent-kind <kind>        Agent kind. Default: codex.
  --surface-kind <kind>      Surface kind. Default: hardware_shell.
  --run-class <class>        build, test, browser_audit, dev_server, watcher, install, package_script, long_running, light.
  --expected-minutes <n>     Expected run duration. Default: 30.
  --reason <text>            Required to proceed with warn/critical heavy runs.
  --cwd <path>               Working directory. Default: repo root.
  --name <text>              Optional human run name.
  --allow-warn               Allow heavy run when health risk is warn, with --reason.
  --allow-critical           Allow heavy run when health risk is critical, with --reason.
  --no-health-gate           Skip pre-run process health gate.
  --dry-run                  Write planned receipt without executing.
  --json                     Print final run receipt JSON.
  --self-test                Run an internal harmless command and assert receipts.
  -h, --help                 Show this help.
`);
}

function stableHash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 16);
}

function nowIso() {
  return new Date().toISOString();
}

function runIdFor(args) {
  return [
    'run',
    Date.now().toString(36),
    stableHash(`${args.laneId}:${args.command.join('\0')}:${process.pid}`),
  ].join('-');
}

function inferRunClass(command) {
  const text = command.join(' ').toLowerCase();
  if (!text) return 'light';
  if (/\b(build|tsup|next build|vite build)\b/.test(text)) return 'build';
  if (/\b(test|vitest|playwright test)\b/.test(text)) return 'test';
  if (/\b(dev|watch|serve|start)\b/.test(text)) return 'dev_server';
  if (/\b(install|add|remove|update)\b/.test(text)) return 'install';
  if (/\b(browser|playwright|chrome|edge|screenshot)\b/.test(text)) return 'browser_audit';
  if (/\b(pnpm|npm|yarn)\b/.test(text)) return 'package_script';
  return 'light';
}

function isHeavyRun(args) {
  return HEAVY_RUN_CLASSES.has(args.runClass);
}

function redactCommand(command) {
  return command
    .map((part) => String(part))
    .join(' ')
    .replace(new RegExp(os.homedir().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '%USERPROFILE%')
    .replace(/[A-Za-z]:\\Users\\[^\\\s"]+/g, '%USERPROFILE%')
    .replace(/(api[-_]?key|token|secret|password|passwd|pwd|authorization)=("[^"]+"|'[^']+'|[^\s]+)/gi, '$1=[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [redacted]')
    .replace(/sk-[A-Za-z0-9_-]+/g, 'sk-[redacted]')
    .slice(0, 260);
}

function resolveRepoPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(REPO_ROOT, filePath);
}

function readJson(filePath, fallback) {
  const resolved = resolveRepoPath(filePath);
  if (!existsSync(resolved)) return fallback;
  try {
    return JSON.parse(readFileSync(resolved, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  const resolved = resolveRepoPath(filePath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return resolved;
}

function loadRegistry(registryPath) {
  const registry = readJson(registryPath, {
    schemaVersion: REGISTRY_SCHEMA_VERSION,
    generatedAt: nowIso(),
    updatedAt: nowIso(),
    runs: [],
  });

  if (!Array.isArray(registry.runs)) registry.runs = [];
  registry.schemaVersion = registry.schemaVersion || REGISTRY_SCHEMA_VERSION;
  return registry;
}

function upsertRun(registryPath, run) {
  const registry = loadRegistry(registryPath);
  const index = registry.runs.findIndex((item) => item.runId === run.runId);
  if (index === -1) registry.runs.push(run);
  else registry.runs[index] = { ...registry.runs[index], ...run };
  registry.updatedAt = nowIso();
  writeJson(registryPath, registry);
}

function completeRun(registryPath, runId, patch) {
  const registry = loadRegistry(registryPath);
  const index = registry.runs.findIndex((item) => item.runId === runId);
  if (index !== -1) registry.runs[index] = { ...registry.runs[index], ...patch };
  registry.updatedAt = nowIso();
  writeJson(registryPath, registry);
}

function collectHealth(args) {
  if (args.noHealthGate) {
    return {
      skipped: true,
      gate: {
        allowed: true,
        reason: 'Skipped by --no-health-gate',
      },
    };
  }

  const result = spawnSync(process.execPath, [
    'scripts/holoshell-process-health.mjs',
    '--json',
    '--output',
    args.healthOutput,
    '--run-registry',
    args.registry,
  ], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 90000,
    windowsHide: true,
  });
  const health = extractJson(result.stdout);
  return {
    skipped: false,
    ok: result.status === 0 && Boolean(health),
    status: result.status,
    stderr: (result.stderr || '').slice(-1200),
    health,
    gate: evaluateGate(args, health),
  };
}

function extractJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {}
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(text.slice(first, last + 1));
    } catch {}
  }
  return null;
}

function evaluateGate(args, health) {
  if (!health?.summary) {
    return {
      allowed: !isHeavyRun(args),
      reason: isHeavyRun(args)
        ? 'No process health receipt was available for a heavy run.'
        : 'No process health receipt was available, but run class is light.',
    };
  }

  const risk = health.summary.riskState;
  if (!isHeavyRun(args)) {
    return {
      allowed: true,
      risk,
      reason: 'Run class is light.',
    };
  }

  if (risk === 'pass') {
    return {
      allowed: true,
      risk,
      reason: 'Process health is pass.',
    };
  }

  if (risk === 'warn' && args.allowWarn && args.reason) {
    return {
      allowed: true,
      risk,
      reason: 'Warn accepted with explicit reason.',
    };
  }

  if (risk === 'critical' && args.allowCritical && args.reason) {
    return {
      allowed: true,
      risk,
      reason: 'Critical accepted with explicit reason.',
    };
  }

  return {
    allowed: false,
    risk,
    reason: risk === 'critical'
      ? 'Heavy run blocked under critical process health. Use --allow-critical with --reason only when necessary.'
      : 'Heavy run blocked under warn process health. Use --allow-warn with --reason when necessary.',
  };
}

function baseReceipt(args, runId, healthCheck) {
  const startedAt = nowIso();
  const expectedEndAt = new Date(Date.parse(startedAt) + args.expectedMinutes * 60000).toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    runId,
    status: 'planned',
    name: args.name || args.command[0] || 'self-test',
    lane: {
      laneId: args.laneId,
      agentKind: args.agentKind,
      surfaceKind: args.surfaceKind,
    },
    command: {
      cwd: args.cwd,
      argvHash: stableHash(args.command.join('\0')),
      preview: redactCommand(args.command),
      runClass: args.runClass,
      heavy: isHeavyRun(args),
    },
    timing: {
      plannedAt: startedAt,
      startedAt: null,
      endedAt: null,
      expectedMinutes: args.expectedMinutes,
      expectedEndAt,
      durationMs: null,
    },
    healthGate: {
      skipped: healthCheck.skipped,
      allowed: healthCheck.gate.allowed,
      reason: healthCheck.gate.reason,
      risk: healthCheck.gate.risk || healthCheck.health?.summary?.riskState || null,
      summary: healthCheck.health?.summary || null,
    },
    policy: {
      preRunHealthRequiredForHeavy: true,
      allowWarnRequiresReason: true,
      allowCriticalRequiresReason: true,
      receiptRequired: true,
      automaticTerminationAllowed: false,
    },
    process: {
      pid: null,
      signal: null,
      exitCode: null,
    },
    reason: args.reason || null,
  };
}

function registryEntryFromReceipt(receipt, patch = {}) {
  return {
    runId: receipt.runId,
    laneId: receipt.lane.laneId,
    agentKind: receipt.lane.agentKind,
    surfaceKind: receipt.lane.surfaceKind,
    name: receipt.name,
    runClass: receipt.command.runClass,
    status: receipt.status,
    pid: receipt.process.pid,
    cwd: receipt.command.cwd,
    commandHash: receipt.command.argvHash,
    commandPreview: receipt.command.preview,
    expectedEndAt: receipt.timing.expectedEndAt,
    startedAt: receipt.timing.startedAt,
    endedAt: receipt.timing.endedAt,
    exitCode: receipt.process.exitCode,
    signal: receipt.process.signal,
    healthRiskAtStart: receipt.healthGate.risk,
    receiptPath: patch.receiptPath || null,
    ...patch,
  };
}

function resolveCommand(command) {
  if (process.platform !== 'win32') return command;
  if (/[\\/]/.test(command) || path.extname(command)) return command;
  if (['pnpm', 'npm', 'yarn', 'npx'].includes(command.toLowerCase())) return `${command}.cmd`;
  return command;
}

function quoteWindowsArg(arg) {
  const value = String(arg);
  if (value.length === 0) return '""';
  if (!/[ \t&()^|<>"]/.test(value)) return value;
  return `"${value.replace(/(\\*)"/g, '$1$1\\"').replace(/\\+$/g, '$&$&')}"`;
}

function spawnSpecFor(command, commandArgs) {
  const resolved = resolveCommand(command);
  if (process.platform === 'win32' && /\.(cmd|bat)$/i.test(resolved)) {
    return {
      command: process.env.ComSpec || 'cmd.exe',
      args: ['/d', '/s', '/c', [resolved, ...commandArgs].map(quoteWindowsArg).join(' ')],
    };
  }

  return {
    command: resolved,
    args: commandArgs,
  };
}

async function executeRun(args, receipt) {
  if (args.dryRun) {
    return {
      pid: null,
      status: 'dry_run',
      signal: null,
      exitCode: 0,
      durationMs: 0,
    };
  }

  const startedAt = Date.now();
  const spawnSpec = spawnSpecFor(args.command[0], args.command.slice(1));
  let child;
  try {
    child = spawn(spawnSpec.command, spawnSpec.args, {
      cwd: args.cwd,
      stdio: 'inherit',
      windowsHide: true,
      shell: false,
    });
  } catch (error) {
    return {
      pid: null,
      status: 'failed',
      signal: null,
      exitCode: 1,
      error: error.message,
      durationMs: Date.now() - startedAt,
      plannedReceipt: receipt.runId,
    };
  }

  completeRun(args.registry, receipt.runId, {
    pid: child.pid || null,
    status: 'running',
    startedAt: receipt.timing.startedAt,
  });

  return new Promise((resolve) => {
    let spawnError = null;
    child.on('error', (error) => {
      spawnError = error;
    });
    child.on('close', (code, signal) => {
      const endedAt = Date.now();
      resolve({
        pid: child.pid || null,
        status: code === 0 ? 'completed' : 'failed',
        signal: signal || null,
        exitCode: code,
        error: spawnError?.message,
        durationMs: endedAt - startedAt,
        plannedReceipt: receipt.runId,
      });
    });
  });
}

function writeReceipt(args, receipt) {
  const fileName = `${receipt.runId}.json`;
  const receiptPath = path.resolve(REPO_ROOT, args.receiptsDir, fileName);
  mkdirSync(path.dirname(receiptPath), { recursive: true });
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  return receiptPath;
}

async function runSelfTest() {
  const registry = path.join('.tmp', 'holoshell', 'self-test-run-registry.json');
  const receiptsDir = path.join('.tmp', 'holoshell', 'self-test-run-receipts');
  const args = parseArgs([
    '--lane-id', 'codex-hardware',
    '--agent-kind', 'codex',
    '--surface-kind', 'hardware_shell',
    '--run-class', 'light',
    '--expected-minutes', '1',
    '--registry', registry,
    '--receipts-dir', receiptsDir,
    '--no-health-gate',
    '--',
    process.execPath,
    '-e',
    'process.exit(0)',
  ]);
  const receipt = await runWithCustody(args);
  const failures = [];
  if (receipt.schemaVersion !== SCHEMA_VERSION) failures.push('schemaVersion mismatch');
  if (receipt.status !== 'completed') failures.push(`status=${receipt.status}`);
  if (receipt.process.exitCode !== 0) failures.push(`exitCode=${receipt.process.exitCode}`);
  if (!receipt.output?.receiptPath || !existsSync(receipt.output.receiptPath)) failures.push('receipt file missing');
  const reg = loadRegistry(registry);
  if (!reg.runs.some((item) => item.runId === receipt.runId && item.status === 'completed')) {
    failures.push('registry completion missing');
  }
  if (failures.length) throw new Error(`Self-test failed:\n- ${failures.join('\n- ')}`);
  return receipt;
}

async function runWithCustody(args) {
  const healthCheck = collectHealth(args);
  const runId = runIdFor(args);
  const receipt = baseReceipt(args, runId, healthCheck);

  if (!healthCheck.gate.allowed) {
    receipt.status = 'blocked';
    receipt.timing.endedAt = nowIso();
    receipt.output = { receiptPath: writeReceipt(args, receipt) };
    upsertRun(args.registry, registryEntryFromReceipt(receipt, {
      receiptPath: receipt.output.receiptPath,
    }));
    return receipt;
  }

  receipt.status = 'running';
  receipt.timing.startedAt = nowIso();
  upsertRun(args.registry, registryEntryFromReceipt(receipt));

  const result = await executeRun(args, receipt);
  receipt.status = result.status;
  receipt.process.pid = result.pid;
  receipt.process.signal = result.signal;
  receipt.process.exitCode = result.exitCode;
  receipt.process.error = result.error;
  receipt.timing.endedAt = nowIso();
  receipt.timing.durationMs = result.durationMs;
  receipt.output = { receiptPath: writeReceipt(args, receipt) };
  completeRun(args.registry, runId, registryEntryFromReceipt(receipt, {
    receiptPath: receipt.output.receiptPath,
  }));
  return receipt;
}

try {
  const rawArgs = process.argv.slice(2);
  const args = rawArgs.includes('--self-test') ? { selfTest: true } : parseArgs(rawArgs);
  const receipt = args.selfTest ? await runSelfTest() : await runWithCustody(args);
  if (receipt.status === 'blocked') {
    console.error(`holoshell-run blocked: ${receipt.healthGate.reason}`);
  }
  if (args.json || receipt.status === 'blocked') {
    console.log(JSON.stringify(receipt, null, 2));
  } else {
    console.log(`HoloShell run receipt: ${receipt.output.receiptPath}`);
    console.log(`Run: ${receipt.runId}`);
    console.log(`Status: ${receipt.status}`);
    console.log(`Class: ${receipt.command.runClass}`);
    console.log(`Health: ${receipt.healthGate.risk || 'skipped'}`);
    console.log(`Exit: ${receipt.process.exitCode}`);
  }
  if (receipt.status === 'blocked' || receipt.status === 'failed') {
    process.exitCode = receipt.process.exitCode || 1;
  }
} catch (error) {
  console.error(`holoshell-run failed: ${error.message}`);
  process.exit(1);
}
