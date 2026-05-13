#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const SCHEMA_VERSION = 'hololand.holoshell.process-health.v0.1.0';
const DEFAULT_OUTPUT = path.join('.tmp', 'holoshell', 'process-health.json');
const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const DEFAULT_STALE_MINUTES = 120;
const DEFAULT_HIGH_MEMORY_MB = 1500;

const SHELL_RUN_NAMES = [
  'powershell',
  'pwsh',
  'cmd',
  'bash',
  'zsh',
  'sh',
  'node',
  'pnpm',
  'npm',
  'yarn',
  'python',
  'python3',
  'tsx',
  'ts-node',
  'vitest',
  'vite',
  'next',
  'playwright',
  'git',
  'docker',
];

function parseArgs(argv) {
  const args = {
    json: false,
    output: DEFAULT_OUTPUT,
    selfTest: false,
    includeCommandLines: false,
    staleMinutes: DEFAULT_STALE_MINUTES,
    highMemoryMb: DEFAULT_HIGH_MEMORY_MB,
    planStopPid: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') args.json = true;
    else if (arg === '--output') args.output = argv[++index];
    else if (arg === '--self-test') args.selfTest = true;
    else if (arg === '--include-command-lines') args.includeCommandLines = true;
    else if (arg === '--stale-minutes') args.staleMinutes = Number(argv[++index]);
    else if (arg === '--high-memory-mb') args.highMemoryMb = Number(argv[++index]);
    else if (arg === '--plan-stop-pid') args.planStopPid = Number(argv[++index]);
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isFinite(args.staleMinutes) || args.staleMinutes < 1) {
    throw new Error('--stale-minutes must be a positive number');
  }
  if (!Number.isFinite(args.highMemoryMb) || args.highMemoryMb < 1) {
    throw new Error('--high-memory-mb must be a positive number');
  }
  if (args.planStopPid !== null && (!Number.isInteger(args.planStopPid) || args.planStopPid <= 0)) {
    throw new Error('--plan-stop-pid must be a positive integer');
  }

  return args;
}

function printHelp() {
  console.log(`HoloShell process and shell-run health

Usage:
  node scripts/holoshell-process-health.mjs [options]

Options:
  --json                    Print process health JSON.
  --output <path>           Write output path. Defaults to .tmp/holoshell/process-health.json.
  --self-test               Assert process health receipt invariants.
  --include-command-lines   Include redacted command previews. Off by default for privacy.
  --stale-minutes <n>       Mark shell/dev runs older than n minutes. Default: ${DEFAULT_STALE_MINUTES}.
  --high-memory-mb <n>      Mark processes above n MB working set. Default: ${DEFAULT_HIGH_MEMORY_MB}.
  --plan-stop-pid <pid>     Emit a break-glass stop plan for a PID. Does not stop it.
  -h, --help                Show this help.
`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || REPO_ROOT,
    encoding: 'utf8',
    timeout: options.timeoutMs || 20000,
    windowsHide: true,
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error?.message,
  };
}

function extractJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {}

  const firstArray = text.indexOf('[');
  const lastArray = text.lastIndexOf(']');
  if (firstArray !== -1 && lastArray > firstArray) {
    try {
      return JSON.parse(text.slice(firstArray, lastArray + 1));
    } catch {}
  }

  const firstObject = text.indexOf('{');
  const lastObject = text.lastIndexOf('}');
  if (firstObject !== -1 && lastObject > firstObject) {
    try {
      return JSON.parse(text.slice(firstObject, lastObject + 1));
    } catch {}
  }

  return null;
}

function stableHash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 16);
}

function redactCommandLine(commandLine) {
  if (!commandLine) return null;
  return String(commandLine)
    .replace(new RegExp(os.homedir().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '%USERPROFILE%')
    .replace(/[A-Za-z]:\\Users\\[^\\\s"]+/g, '%USERPROFILE%')
    .replace(/(api[-_]?key|token|secret|password|passwd|pwd|authorization)=("[^"]+"|'[^']+'|[^\s]+)/gi, '$1=[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [redacted]')
    .replace(/sk-[A-Za-z0-9_-]+/g, 'sk-[redacted]')
    .slice(0, 240);
}

function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/\.exe$/i, '');
}

function classifyRun(processInfo) {
  const name = normalizeName(processInfo.name);
  const command = String(processInfo.commandLine || '').toLowerCase();
  if (/codex/.test(command)) return 'agent_codex';
  if (/claude|cursor/.test(command) || ['cursor', 'code'].includes(name)) return 'agent_or_ide';
  if (/gemini|antigravity/.test(command)) return 'agent_browser_vision';
  if (['powershell', 'pwsh', 'cmd', 'bash', 'zsh', 'sh'].includes(name)) return 'shell';
  if (['pnpm', 'npm', 'yarn'].includes(name)) return 'package_script';
  if (['node', 'tsx', 'ts-node', 'vitest', 'vite', 'next'].includes(name)) return 'node_runtime';
  if (['python', 'python3'].includes(name)) return 'python_runtime';
  if (['chrome', 'msedge', 'firefox'].includes(name)) return 'browser';
  if (['git', 'docker'].includes(name)) return 'tooling';
  return 'process';
}

function isShellRunCandidate(processInfo) {
  const name = normalizeName(processInfo.name);
  const command = String(processInfo.commandLine || '').toLowerCase();
  return SHELL_RUN_NAMES.includes(name) || SHELL_RUN_NAMES.some((hint) => command.includes(hint));
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ageMinutes(createdAt) {
  const date = parseDate(createdAt);
  if (!date) return null;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
}

function memoryMb(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value)) return null;
  return Number((value / 1024 / 1024).toFixed(1));
}

function collectWindowsProcesses() {
  const ps = `
$items = Get-CimInstance Win32_Process | ForEach-Object {
  $created = $null
  if ($_.CreationDate) {
    try { $created = ([DateTime]$_.CreationDate).ToUniversalTime().ToString("o") } catch { $created = [string]$_.CreationDate }
  }
  [pscustomobject]@{
    pid = [int]$_.ProcessId
    ppid = [int]$_.ParentProcessId
    name = [string]$_.Name
    commandLine = [string]$_.CommandLine
    executablePath = [string]$_.ExecutablePath
    createdAt = $created
    workingSetBytes = [int64]$_.WorkingSetSize
  }
}
$items | ConvertTo-Json -Depth 4
`;

  const result = run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], {
    timeoutMs: 30000,
  });
  const parsed = extractJson(result.stdout);
  const processes = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
  return {
    ok: result.ok || processes.length > 0,
    status: result.status,
    stderr: result.stderr.slice(-1200),
    processes,
  };
}

function parsePsElapsed(text) {
  const parts = String(text || '').trim().split('-');
  let days = 0;
  let timePart = parts[0];
  if (parts.length === 2) {
    days = Number(parts[0]) || 0;
    timePart = parts[1];
  }
  const bits = timePart.split(':').map((part) => Number(part) || 0);
  let seconds = 0;
  if (bits.length === 3) seconds = bits[0] * 3600 + bits[1] * 60 + bits[2];
  if (bits.length === 2) seconds = bits[0] * 60 + bits[1];
  return days * 1440 + Math.round(seconds / 60);
}

function collectPosixProcesses() {
  const result = run('ps', ['-axo', 'pid=,ppid=,rss=,etime=,comm=,args='], {
    timeoutMs: 20000,
  });
  const processes = [];
  for (const line of result.stdout.split(/\r?\n/)) {
    const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s*(.*)$/);
    if (!match) continue;
    const elapsedMinutes = parsePsElapsed(match[4]);
    processes.push({
      pid: Number(match[1]),
      ppid: Number(match[2]),
      name: path.basename(match[5]),
      commandLine: match[6] || match[5],
      executablePath: match[5],
      createdAt: elapsedMinutes === null ? null : new Date(Date.now() - elapsedMinutes * 60000).toISOString(),
      workingSetBytes: Number(match[3]) * 1024,
    });
  }
  return {
    ok: result.ok || processes.length > 0,
    status: result.status,
    stderr: result.stderr.slice(-1200),
    processes,
  };
}

function collectProcesses() {
  return process.platform === 'win32' ? collectWindowsProcesses() : collectPosixProcesses();
}

function processToReceipt(processInfo, args, pidSet) {
  const age = ageMinutes(processInfo.createdAt);
  const memory = memoryMb(processInfo.workingSetBytes);
  const shellRunCandidate = isShellRunCandidate(processInfo);
  const category = classifyRun(processInfo);
  const orphanLike = Number(processInfo.ppid) > 0 && !pidSet.has(Number(processInfo.ppid));
  const stale = shellRunCandidate && age !== null && age >= args.staleMinutes;
  const highMemory = memory !== null && memory >= args.highMemoryMb;
  const findings = [];

  if (stale) findings.push('stale_shell_or_dev_run');
  if (highMemory) findings.push('high_memory_process');
  if (orphanLike) findings.push('parent_not_visible');

  return {
    pid: Number(processInfo.pid),
    ppid: Number(processInfo.ppid),
    name: processInfo.name || 'unknown',
    category,
    shellRunCandidate,
    ageMinutes: age,
    memoryMb: memory,
    commandHash: stableHash(processInfo.commandLine || processInfo.executablePath || processInfo.name),
    commandPreview: args.includeCommandLines ? redactCommandLine(processInfo.commandLine) : undefined,
    executableName: processInfo.executablePath ? path.basename(String(processInfo.executablePath)) : undefined,
    findings,
    custody: {
      state: findings.length > 0 ? 'needs_review' : shellRunCandidate ? 'tracked' : 'observed',
      stopPolicy: 'break_glass_required',
      receiptRequired: true,
    },
  };
}

function createStopPlan(args, processes) {
  if (!args.planStopPid) return null;
  const target = processes.find((item) => item.pid === args.planStopPid);
  if (!target) {
    return {
      status: 'target_not_found',
      pid: args.planStopPid,
      approvalRequired: true,
      safeToExecuteAutomatically: false,
    };
  }

  return {
    status: 'approval_required',
    pid: target.pid,
    name: target.name,
    category: target.category,
    reason: 'Stopping a process can destroy user work, agent state, local servers, or build/test evidence.',
    approvalRequired: true,
    safeToExecuteAutomatically: false,
    recommendedCommand: process.platform === 'win32'
      ? `Stop-Process -Id ${target.pid} -Confirm`
      : `kill -TERM ${target.pid}`,
    receiptRequired: true,
  };
}

function createHealth(args) {
  const collection = collectProcesses();
  const pidSet = new Set(collection.processes.map((item) => Number(item.pid)).filter(Boolean));
  const processes = collection.processes
    .map((item) => processToReceipt(item, args, pidSet))
    .sort((left, right) => {
      const leftScore = left.findings.length * 100000 + (left.memoryMb || 0);
      const rightScore = right.findings.length * 100000 + (right.memoryMb || 0);
      return rightScore - leftScore;
    });

  const shellRuns = processes.filter((item) => item.shellRunCandidate);
  const highMemory = processes.filter((item) => item.findings.includes('high_memory_process'));
  const staleRuns = processes.filter((item) => item.findings.includes('stale_shell_or_dev_run'));
  const orphanLike = processes.filter((item) => item.findings.includes('parent_not_visible'));
  const memoryUsedRatio = 1 - (os.freemem() / os.totalmem());
  const riskState = memoryUsedRatio > 0.9 || highMemory.length > 8
    ? 'critical'
    : staleRuns.length > 0 || orphanLike.length > 0 || highMemory.length > 0
      ? 'warn'
      : 'pass';
  const categories = {};
  for (const item of processes) {
    categories[item.category] = (categories[item.category] || 0) + 1;
  }

  const processSample = [
    ...processes.filter((item) => item.findings.length > 0),
    ...shellRuns.filter((item) => item.findings.length === 0),
  ].slice(0, 80);

  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sourceAnchors: {
      source: 'apps/holoshell/source/holoshell-process-health-room.hsplus',
      doc: 'apps/holoshell/docs/PROCESS_SHELL_RUN_HEALTH.md',
      roadmap: 'apps/holoshell/docs/PHASE_1_ROADMAP.md',
    },
    thresholds: {
      staleMinutes: args.staleMinutes,
      highMemoryMb: args.highMemoryMb,
      memoryCriticalRatio: 0.9,
    },
    host: {
      platform: os.platform(),
      arch: os.arch(),
      uptimeMinutes: Math.round(os.uptime() / 60),
      totalMemoryGb: Number((os.totalmem() / 1024 / 1024 / 1024).toFixed(2)),
      freeMemoryGb: Number((os.freemem() / 1024 / 1024 / 1024).toFixed(2)),
      memoryUsedRatio: Number(memoryUsedRatio.toFixed(3)),
      logicalCpus: os.cpus().length,
    },
    summary: {
      riskState,
      processCount: processes.length,
      shellRunCount: shellRuns.length,
      highMemoryCount: highMemory.length,
      staleRunCount: staleRuns.length,
      orphanLikeCount: orphanLike.length,
      trackedCategoryCount: categories,
    },
    collection: {
      ok: collection.ok,
      status: collection.status,
      stderr: collection.stderr,
      commandLinesIncluded: args.includeCommandLines,
    },
    policies: {
      readOnlyByDefault: true,
      automaticTerminationAllowed: false,
      stopPolicy: 'break_glass_required',
      exactPidRequired: true,
      receiptRequired: true,
    },
    recommendations: makeRecommendations({ memoryUsedRatio, staleRuns, highMemory, orphanLike, shellRuns }),
    processes: processSample,
    stopPlan: createStopPlan(args, processes),
  };

  return manifest;
}

function makeRecommendations({ memoryUsedRatio, staleRuns, highMemory, orphanLike, shellRuns }) {
  const recommendations = [];
  if (memoryUsedRatio > 0.85) {
    recommendations.push({
      severity: 'high',
      kind: 'memory_pressure',
      text: 'Memory pressure is high. Review high-memory shell/dev runs before starting another build or browser audit.',
    });
  }
  if (staleRuns.length > 0) {
    recommendations.push({
      severity: 'medium',
      kind: 'stale_shell_runs',
      text: `${staleRuns.length} shell or dev run candidate(s) are older than the stale threshold. Ask the owning agent to claim, close, or justify them.`,
    });
  }
  if (highMemory.length > 0) {
    recommendations.push({
      severity: 'medium',
      kind: 'high_memory_processes',
      text: `${highMemory.length} process(es) exceed the high-memory threshold. Do not start memory-heavy jobs until reviewed.`,
    });
  }
  if (orphanLike.length > 0) {
    recommendations.push({
      severity: 'medium',
      kind: 'parent_not_visible',
      text: `${orphanLike.length} process(es) have parents that are not visible in the current process table. Treat as custody gaps.`,
    });
  }
  if (shellRuns.length === 0) {
    recommendations.push({
      severity: 'low',
      kind: 'no_shell_runs',
      text: 'No shell/dev run candidates were detected.',
    });
  }
  if (recommendations.length === 0) {
    recommendations.push({
      severity: 'low',
      kind: 'healthy',
      text: 'No PID or shell-run custody issues crossed current thresholds.',
    });
  }
  return recommendations;
}

function writeHealth(health, outputPath) {
  const resolved = path.resolve(REPO_ROOT, outputPath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(health, null, 2)}\n`, 'utf8');
  return resolved;
}

function assertSelfTest(health) {
  const failures = [];
  if (health.schemaVersion !== SCHEMA_VERSION) failures.push('schemaVersion mismatch');
  if (!health.collection.ok) failures.push('process collection failed');
  if (health.summary.processCount < 1) failures.push('expected at least one process');
  if (!['pass', 'warn', 'critical'].includes(health.summary.riskState)) failures.push('invalid riskState');
  if (health.policies.automaticTerminationAllowed !== false) failures.push('automatic termination must be disabled');
  if (!Array.isArray(health.recommendations) || health.recommendations.length < 1) failures.push('expected recommendations');
  if (failures.length) {
    throw new Error(`Self-test failed:\n- ${failures.join('\n- ')}`);
  }
}

try {
  const args = parseArgs(process.argv.slice(2));
  const health = createHealth(args);
  const output = writeHealth(health, args.output);
  if (args.selfTest) assertSelfTest(health);

  if (args.json) {
    console.log(JSON.stringify(health, null, 2));
  } else {
    console.log(`HoloShell process health: ${output}`);
    console.log(`Risk: ${health.summary.riskState}`);
    console.log(`Processes: ${health.summary.processCount}`);
    console.log(`Shell/dev runs: ${health.summary.shellRunCount}`);
    console.log(`Stale: ${health.summary.staleRunCount}`);
    console.log(`High memory: ${health.summary.highMemoryCount}`);
    console.log(`Parent not visible: ${health.summary.orphanLikeCount}`);
  }
} catch (error) {
  console.error(`holoshell-process-health failed: ${error.message}`);
  process.exit(1);
}
