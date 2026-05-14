#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SCHEMA_VERSION = 'hololand.holoshell.build-custody.v0.1.0';
const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const DEFAULT_OUTPUT = path.join('.tmp', 'holoshell', 'build-custody.json');
const DEFAULT_JS_OUTPUT = path.join('.tmp', 'holoshell', 'build-custody.js');
const DEFAULT_LONG_MINUTES = 45;
const DEFAULT_HIGH_MEMORY_MB = 1500;
const MAX_TAIL = 12;

function parseArgs(argv) {
  const args = {
    output: DEFAULT_OUTPUT,
    jsOutput: DEFAULT_JS_OUTPUT,
    includeCommandLines: false,
    longMinutes: DEFAULT_LONG_MINUTES,
    highMemoryMb: DEFAULT_HIGH_MEMORY_MB,
    json: false,
    selfTest: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    else if (arg === '--output') args.output = argv[++index];
    else if (arg === '--js-output') args.jsOutput = argv[++index];
    else if (arg === '--include-command-lines') args.includeCommandLines = true;
    else if (arg === '--long-minutes') args.longMinutes = Number(argv[++index]) || DEFAULT_LONG_MINUTES;
    else if (arg === '--high-memory-mb') args.highMemoryMb = Number(argv[++index]) || DEFAULT_HIGH_MEMORY_MB;
    else if (arg === '--json') args.json = true;
    else if (arg === '--self-test') args.selfTest = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isFinite(args.longMinutes) || args.longMinutes <= 0) {
    throw new Error('--long-minutes must be a positive number');
  }
  if (!Number.isFinite(args.highMemoryMb) || args.highMemoryMb <= 0) {
    throw new Error('--high-memory-mb must be a positive number');
  }
  return args;
}

function printHelp() {
  console.log(`HoloShell build custody

Usage:
  node scripts/holoshell-build-custody.mjs [options]

Options:
  --output <path>              Output JSON. Default: .tmp/holoshell/build-custody.json.
  --js-output <path>           Browser bootstrap JS. Default: .tmp/holoshell/build-custody.js.
  --include-command-lines      Include short command previews. Hidden by default.
  --long-minutes <n>           Long-running build threshold. Default: ${DEFAULT_LONG_MINUTES}.
  --high-memory-mb <n>         High memory threshold. Default: ${DEFAULT_HIGH_MEMORY_MB}.
  --json                       Print JSON.
  --self-test                  Use synthetic fixtures and assert invariants.
`);
}

function resolveRepoPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(REPO_ROOT, filePath);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function stripAnsi(value) {
  return String(value || '').replace(/\u001b\[[0-9;]*m/g, '');
}

function parseProcessDate(value) {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;
  const match = String(value).match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  return new Date(year, month - 1, day, hour, minute, second);
}

function processAgeMinutes(processInfo, now = Date.now()) {
  const created = parseProcessDate(processInfo.createdAt);
  if (!created) return null;
  const age = (now - created.getTime()) / 60_000;
  return Number.isFinite(age) && age >= 0 ? Number(age.toFixed(1)) : null;
}

function memoryMb(processInfo) {
  const bytes = Number(processInfo.workingSetBytes || 0);
  return Number.isFinite(bytes) && bytes > 0 ? Number((bytes / 1024 / 1024).toFixed(1)) : 0;
}

function normalizeCommand(value) {
  return stripAnsi(value || '').replace(/\s+/g, ' ').trim();
}

function processCommand(processInfo) {
  return normalizeCommand(processInfo.commandLine || processInfo.command || processInfo.name || '');
}

function processLower(processInfo) {
  return `${processInfo.name || ''} ${processCommand(processInfo)}`.toLowerCase();
}

function commandTokens(command) {
  return normalizeCommand(command)
    .match(/"[^"]*"|'[^']*'|\S+/g)
    ?.map((token) => token.replace(/^["']|["']$/g, ''))
    .filter(Boolean) || [];
}

function tokenBase(token) {
  const normalized = String(token || '').replace(/\\/g, '/').split('/').pop() || '';
  return normalized.toLowerCase();
}

function tokenStem(token) {
  return tokenBase(token).replace(/\.(cmd|exe|js|cjs|mjs)$/i, '');
}

function isToken(tokens, index, names) {
  return names.includes(tokenStem(tokens[index]));
}

const BUILD_OPTION_VALUES = new Set([
  '-c',
  '-f',
  '-w',
  '-workspace',
  '--config',
  '--dir',
  '--filter',
  '--prefix',
  '--workspace',
]);

function optionConsumesNext(token) {
  const lower = String(token || '').toLowerCase();
  if (!lower.startsWith('-')) return false;
  if (lower.includes('=')) return false;
  return BUILD_OPTION_VALUES.has(lower);
}

function significantTokensAfter(tokens, startIndex) {
  const out = [];
  for (let index = startIndex; index < tokens.length; index += 1) {
    const token = String(tokens[index] || '').toLowerCase();
    if (!token) continue;
    if (optionConsumesNext(token)) {
      index += 1;
      continue;
    }
    if (token.startsWith('-')) continue;
    out.push(tokenStem(token));
  }
  return out;
}

function packageManagerBuildKind(command, managerName, kind) {
  const tokens = commandTokens(command);
  for (let index = 0; index < tokens.length; index += 1) {
    if (!isToken(tokens, index, [managerName])) continue;
    const significant = significantTokensAfter(tokens, index + 1);
    const first = significant[0] || '';
    if (['exec', 'x', 'dlx', 'create', 'add', 'install', 'i', 'test', 'lint', 'dev', 'start'].includes(first)) {
      return '';
    }
    if (first === 'run' || first === 'run-script') {
      return significant[1] === 'build' ? kind : '';
    }
    if (first === 'build') return kind;
  }
  return '';
}

function toolSubcommandBuildKind(command, toolName, kind) {
  const tokens = commandTokens(command);
  for (let index = 0; index < tokens.length; index += 1) {
    if (!isToken(tokens, index, [toolName])) continue;
    const significant = significantTokensAfter(tokens, index + 1);
    if (significant[0] === 'build') return kind;
  }
  return '';
}

function hasStandaloneBuildTask(command) {
  return Boolean(
    packageManagerBuildKind(command, 'pnpm', 'pnpm_build')
      || packageManagerBuildKind(command, 'npm', 'npm_build')
      || packageManagerBuildKind(command, 'yarn', 'yarn_build')
      || toolSubcommandBuildKind(command, 'turbo', 'turbo_build')
      || toolSubcommandBuildKind(command, 'nx', 'nx_build')
      || toolSubcommandBuildKind(command, 'next', 'next_build')
      || toolSubcommandBuildKind(command, 'vite', 'vite_build')
  );
}

function esbuildKindFor(command) {
  const lower = command.toLowerCase();
  if (!commandTokens(command).some((token) => tokenStem(token) === 'esbuild')) return '';
  if (/\s--service(?:=|\s|$)/.test(lower) && /\s--ping(?:\s|$)/.test(lower)) return '';
  return /\s--(bundle|outfile|outdir|platform|format|loader:|entry-names)(?:=|\s|$)/.test(lower)
    ? 'esbuild_bundle'
    : '';
}

function buildKindFor(processInfo) {
  const command = processCommand(processInfo);
  const lower = `${processInfo.name || ''} ${command}`.toLowerCase();
  const processName = String(processInfo.name || '').toLowerCase();
  if (/\b(claude|codex|gemini|cursor|code|copilot)(\.exe)?$/.test(processName)) return '';
  const isWrapperShell = /\b(cmd|cmd\.exe|pwsh|pwsh\.exe|powershell|powershell\.exe)\b/.test(processName);
  if (isWrapperShell && !hasStandaloneBuildTask(command)) return '';
  const pnpmKind = packageManagerBuildKind(command, 'pnpm', lower.includes(' -r ') || lower.includes(' --recursive ') ? 'pnpm_workspace_build' : 'pnpm_build');
  if (pnpmKind) {
    return lower.includes(' -r ') || lower.includes(' --recursive ') ? 'pnpm_workspace_build' : 'pnpm_build';
  }
  const npmKind = packageManagerBuildKind(command, 'npm', 'npm_build');
  if (npmKind) return npmKind;
  const yarnKind = packageManagerBuildKind(command, 'yarn', 'yarn_build');
  if (yarnKind) return yarnKind;
  const turboKind = toolSubcommandBuildKind(command, 'turbo', 'turbo_build');
  if (turboKind) return turboKind;
  const nxKind = toolSubcommandBuildKind(command, 'nx', 'nx_build');
  if (nxKind) return nxKind;
  const nextKind = toolSubcommandBuildKind(command, 'next', 'next_build');
  if (nextKind) return nextKind;
  const viteKind = toolSubcommandBuildKind(command, 'vite', 'vite_build');
  if (viteKind) return viteKind;
  if (/\btsup(\.cmd)?\b/.test(lower)) return 'tsup_bundle';
  const esbuildKind = esbuildKindFor(command);
  if (esbuildKind) return esbuildKind;
  if (/\brollup(\.cmd)?\b/.test(lower)) return 'rollup_bundle';
  if (/\bwebpack(\.cmd)?\b/.test(lower)) return 'webpack_bundle';
  if (/\btsc(\.cmd)?\b/.test(lower) && !/\bserver\b/.test(lower)) return 'typescript_compile';
  if (lower.includes('@holoscript/cli') && /\bcompile\b/.test(lower)) return 'holoscript_compile';
  return '';
}

function isBuildChildCandidate(processInfo) {
  const lower = processLower(processInfo);
  const name = String(processInfo.name || '').toLowerCase();
  if (/\b(node|node\.exe|cmd|cmd\.exe|pwsh|pwsh\.exe|powershell|powershell\.exe)\b/.test(name)) return true;
  return /\b(pnpm|npm|yarn|tsup|esbuild|rollup|webpack|vite|next|tsc|vitest)\b/.test(lower);
}

function commandPreview(command) {
  const normalized = normalizeCommand(command);
  if (!normalized) return '';
  return normalized.length <= 180 ? normalized : `${normalized.slice(0, 177)}...`;
}

function readWindowsProcesses() {
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$names = @(
  'node.exe',
  'cmd.exe',
  'pwsh.exe',
  'powershell.exe',
  'esbuild.exe',
  'pnpm.exe',
  'npm.exe',
  'yarn.exe',
  'tsup.exe',
  'vite.exe',
  'next.exe',
  'webpack.exe',
  'rollup.exe',
  'tsc.exe'
)
$filter = ($names | ForEach-Object { "Name='$($_)'" }) -join ' OR '
Get-CimInstance Win32_Process -Filter $filter | ForEach-Object {
  [PSCustomObject]@{
    pid = [int]$_.ProcessId
    ppid = [int]$_.ParentProcessId
    name = [string]$_.Name
    commandLine = [string]$_.CommandLine
    executablePath = [string]$_.ExecutablePath
    createdAt = [string]$_.CreationDate
    workingSetBytes = [double]$_.WorkingSetSize
  }
} | ConvertTo-Json -Depth 4
`;
  const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    timeout: 45_000,
  });
  if (result.error || result.status !== 0) {
    const message = result.error?.message || result.stderr || 'unknown PowerShell process snapshot error';
    throw new Error(`Unable to read Windows build-candidate process table: ${message}`);
  }
  const parsed = JSON.parse(result.stdout || '[]');
  return safeArray(parsed).map((item) => ({
    pid: Number(item.pid),
    ppid: Number(item.ppid),
    name: item.name || 'process',
    commandLine: item.commandLine || '',
    executablePath: item.executablePath || '',
    createdAt: item.createdAt || '',
    workingSetBytes: Number(item.workingSetBytes || 0),
  })).filter((item) => Number.isInteger(item.pid) && item.pid > 0);
}

function readProcesses() {
  if (process.platform === 'win32') return readWindowsProcesses();
  const result = spawnSync('ps', ['-axo', 'pid=,ppid=,comm=,args='], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) return [];
  return result.stdout.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(\d+)\s+(\S+)\s*(.*)$/);
      if (!match) return null;
      return {
        pid: Number(match[1]),
        ppid: Number(match[2]),
        name: match[3],
        commandLine: match[4] || match[3],
        executablePath: '',
        createdAt: '',
        workingSetBytes: 0,
      };
    })
    .filter(Boolean);
}

function syntheticProcesses() {
  const now = Date.now();
  const minutesAgo = (minutes) => new Date(now - minutes * 60_000).toISOString();
  return [
    {
      pid: 100,
      ppid: 10,
      name: 'pwsh.exe',
      commandLine: 'pwsh -NoLogo -Command pnpm build',
      createdAt: minutesAgo(12),
      workingSetBytes: 86 * 1024 * 1024,
    },
    {
      pid: 101,
      ppid: 100,
      name: 'cmd.exe',
      commandLine: 'cmd /d /s /c pnpm.cmd build',
      createdAt: minutesAgo(12),
      workingSetBytes: 14 * 1024 * 1024,
    },
    {
      pid: 102,
      ppid: 101,
      name: 'node.exe',
      commandLine: 'node corepack pnpm -r build',
      createdAt: minutesAgo(11),
      workingSetBytes: 240 * 1024 * 1024,
    },
    {
      pid: 103,
      ppid: 102,
      name: 'node.exe',
      commandLine: 'node tsup src/index.ts --format esm',
      createdAt: minutesAgo(3),
      workingSetBytes: 120 * 1024 * 1024,
    },
    {
      pid: 200,
      ppid: 1,
      name: 'Code.exe',
      commandLine: 'Code.exe',
      createdAt: minutesAgo(240),
      workingSetBytes: 400 * 1024 * 1024,
    },
    {
      pid: 300,
      ppid: 10,
      name: 'cmd.exe',
      commandLine: 'cmd /c pnpm exec holoscript query "HoloShell readiness receipts local hardware build custody visual witness"',
      createdAt: minutesAgo(70),
      workingSetBytes: 12 * 1024 * 1024,
    },
    {
      pid: 301,
      ppid: 300,
      name: 'node.exe',
      commandLine: 'node @holoscript/cli/bin/holoscript.cjs query "HoloShell build custody"',
      createdAt: minutesAgo(70),
      workingSetBytes: 40 * 1024 * 1024,
    },
    {
      pid: 302,
      ppid: 1,
      name: 'esbuild.exe',
      commandLine: 'esbuild.exe --service=0.27.3 --ping',
      createdAt: minutesAgo(3),
      workingSetBytes: 25 * 1024 * 1024,
    },
  ];
}

function classifyBuildProcesses(processes) {
  const byPid = new Map(processes.map((item) => [item.pid, item]));
  const kinds = new Map();

  for (const processInfo of processes) {
    const kind = buildKindFor(processInfo);
    if (kind) kinds.set(processInfo.pid, kind);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const processInfo of processes) {
      if (kinds.has(processInfo.pid)) continue;
      if (!isBuildChildCandidate(processInfo)) continue;
      const parent = byPid.get(processInfo.ppid);
      if (parent && kinds.has(parent.pid)) {
        kinds.set(processInfo.pid, buildKindFor(processInfo) || 'build_child');
        changed = true;
      }
    }
  }

  return kinds;
}

function rootPidFor(processInfo, buildKinds, byPid) {
  let root = processInfo;
  const seen = new Set([root.pid]);
  while (Number.isInteger(root.ppid) && buildKinds.has(root.ppid) && byPid.has(root.ppid) && !seen.has(root.ppid)) {
    root = byPid.get(root.ppid);
    seen.add(root.pid);
  }
  return root.pid;
}

function buildProcessEntry(processInfo, kind, args, now) {
  const command = processCommand(processInfo);
  const ageMinutes = processAgeMinutes(processInfo, now);
  const memory = memoryMb(processInfo);
  const findings = [];
  if (ageMinutes !== null && ageMinutes >= args.longMinutes) findings.push('long_running_build');
  if (memory >= args.highMemoryMb) findings.push('high_memory_build_process');

  return {
    pid: processInfo.pid,
    ppid: processInfo.ppid || null,
    name: processInfo.name || 'process',
    buildKind: kind,
    ageMinutes,
    memoryMb: memory,
    commandHash: command ? sha256(command) : null,
    commandPreview: args.includeCommandLines ? commandPreview(command) : undefined,
    rawCommandHidden: !args.includeCommandLines,
    custodyState: findings.includes('long_running_build') || findings.includes('high_memory_build_process')
      ? 'needs_review'
      : 'active_build',
    findings,
    stopPolicy: 'break_glass_required',
  };
}

function createBuildTree(rootPid, entries) {
  const root = entries.find((entry) => entry.pid === rootPid) || entries[0];
  const maxAge = entries.reduce((max, entry) => Math.max(max, entry.ageMinutes || 0), 0);
  const memory = entries.reduce((sum, entry) => sum + (entry.memoryMb || 0), 0);
  const findings = [...new Set(entries.flatMap((entry) => entry.findings || []))];
  const status = findings.includes('high_memory_build_process')
    ? 'memory_review'
    : findings.includes('long_running_build')
      ? 'long_running'
      : 'active';
  return {
    treeId: `build-tree-${rootPid}`,
    rootPid,
    rootName: root?.name || 'process',
    status,
    processCount: entries.length,
    maxAgeMinutes: Number(maxAge.toFixed(1)),
    totalMemoryMb: Number(memory.toFixed(1)),
    buildKinds: [...new Set(entries.map((entry) => entry.buildKind))],
    findings,
    processPids: entries.map((entry) => entry.pid),
    receiptRequired: true,
    rawCommandsIncluded: entries.some((entry) => entry.rawCommandHidden === false),
  };
}

function makeRecommendations(summary, trees) {
  const recommendations = [];
  if (summary.buildProcessCount === 0) {
    recommendations.push({
      kind: 'no_active_build',
      priority: 'low',
      text: 'No active local build tree is visible. Refresh build custody before launching a new build.',
    });
  } else {
    recommendations.push({
      kind: 'observe_active_build',
      priority: summary.longRunningBuildCount || summary.highMemoryBuildCount ? 'high' : 'medium',
      text: `${summary.activeBuildTreeCount} active build tree(s) are visible. Keep custody read-only unless a break-glass stop plan is explicitly approved.`,
    });
  }
  if (summary.longRunningBuildCount > 0) {
    recommendations.push({
      kind: 'review_long_running_build',
      priority: 'high',
      text: `${summary.longRunningBuildCount} build process(es) crossed the long-running threshold.`,
    });
  }
  if (summary.highMemoryBuildCount > 0) {
    recommendations.push({
      kind: 'review_high_memory_build',
      priority: 'high',
      text: `${summary.highMemoryBuildCount} build process(es) crossed the high-memory threshold.`,
    });
  }
  for (const tree of trees.slice(0, 2)) {
    recommendations.push({
      kind: 'build_tree_receipt',
      priority: tree.status === 'active' ? 'low' : 'medium',
      text: `${tree.treeId} has ${tree.processCount} process(es), ${tree.totalMemoryMb} MB, status ${tree.status}.`,
    });
  }
  return recommendations.slice(0, 8);
}

function createCustody(processes, args) {
  const now = Date.now();
  const byPid = new Map(processes.map((item) => [item.pid, item]));
  const buildKinds = classifyBuildProcesses(processes);
  const entries = processes
    .filter((item) => buildKinds.has(item.pid))
    .map((item) => buildProcessEntry(item, buildKinds.get(item.pid), args, now))
    .sort((left, right) => (right.ageMinutes || 0) - (left.ageMinutes || 0));

  const entriesByRoot = new Map();
  for (const entry of entries) {
    const processInfo = byPid.get(entry.pid);
    const rootPid = processInfo ? rootPidFor(processInfo, buildKinds, byPid) : entry.pid;
    if (!entriesByRoot.has(rootPid)) entriesByRoot.set(rootPid, []);
    entriesByRoot.get(rootPid).push(entry);
  }
  const trees = [...entriesByRoot.entries()]
    .map(([rootPid, treeEntries]) => createBuildTree(rootPid, treeEntries))
    .sort((left, right) => right.maxAgeMinutes - left.maxAgeMinutes);

  const longRunningBuildCount = entries.filter((entry) => entry.findings.includes('long_running_build')).length;
  const highMemoryBuildCount = entries.filter((entry) => entry.findings.includes('high_memory_build_process')).length;
  const riskState = highMemoryBuildCount > 0 ? 'critical' : longRunningBuildCount > 0 ? 'warn' : 'pass';
  const summary = {
    riskState,
    processCount: processes.length,
    buildProcessCount: entries.length,
    activeBuildCount: entries.length,
    activeBuildTreeCount: trees.length,
    buildTreeCount: trees.length,
    longRunningBuildCount,
    highMemoryBuildCount,
    reviewRequiredCount: longRunningBuildCount + highMemoryBuildCount,
    rawCommandsIncluded: args.includeCommandLines,
    longMinutesThreshold: args.longMinutes,
    highMemoryMbThreshold: args.highMemoryMb,
  };
  const recommendations = makeRecommendations(summary, trees);
  const safety = {
    destructiveActionsTaken: false,
    rawCommandsIncluded: args.includeCommandLines,
    processTerminationAllowed: false,
    stopPolicy: 'break_glass_required',
    stopPlanRequiredForTermination: true,
  };
  const sanitizedForHash = {
    summary,
    trees,
    processes: entries.map(({ commandPreview: _commandPreview, ...entry }) => entry),
    safety,
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sourceAnchors: {
      source: 'apps/holoshell/source/holoshell-build-custody.hsplus',
      adapter: 'scripts/holoshell-build-custody.mjs',
      upstreamReality: 'host_process_table',
    },
    summary,
    policies: {
      activeBuildsAreHardwareCustody: true,
      rawCommandsHiddenByDefault: !args.includeCommandLines,
      buildStopRequiresBreakGlass: true,
      pidCountsAreHealthSignalsOnly: true,
      activeBuildDoesNotEqualFailure: true,
    },
    buildTrees: trees,
    buildProcesses: entries.slice(0, 80),
    recommendations,
    brittneyBrief: {
      status: entries.length ? 'active_builds_visible' : 'no_active_builds_visible',
      requiredNextAction: entries.length
        ? `${trees.length} active build tree(s) visible; observe custody and do not terminate without break-glass approval.`
        : 'No active build tree visible; refresh build custody before starting or judging a build.',
      blockedActions: ['kill_build_process', 'stop_build_tree', 'delete_build_output'],
      custodySummary: `${entries.length} build process(es) across ${trees.length} tree(s); ${longRunningBuildCount} long-running; ${highMemoryBuildCount} high-memory.`,
    },
    safety,
    receipt: {
      buildCustodyHash: sha256(JSON.stringify(sanitizedForHash)),
      destructiveActionsTaken: false,
      rawCommandsIncluded: args.includeCommandLines,
    },
  };
}

function createUnavailableCustody(args, errorMessage) {
  const summary = {
    riskState: 'unknown',
    scannerStatus: 'unavailable',
    processCount: 0,
    buildProcessCount: 0,
    activeBuildCount: 0,
    activeBuildTreeCount: 0,
    buildTreeCount: 0,
    longRunningBuildCount: 0,
    highMemoryBuildCount: 0,
    reviewRequiredCount: 1,
    rawCommandsIncluded: args.includeCommandLines,
    longMinutesThreshold: args.longMinutes,
    highMemoryMbThreshold: args.highMemoryMb,
  };
  const safety = {
    destructiveActionsTaken: false,
    rawCommandsIncluded: args.includeCommandLines,
    processTerminationAllowed: false,
    stopPolicy: 'break_glass_required',
    stopPlanRequiredForTermination: true,
  };
  const receiptInput = {
    summary,
    errorHash: sha256(errorMessage),
    safety,
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sourceAnchors: {
      source: 'apps/holoshell/source/holoshell-build-custody.hsplus',
      adapter: 'scripts/holoshell-build-custody.mjs',
      upstreamReality: 'host_process_table',
    },
    summary,
    policies: {
      activeBuildsAreHardwareCustody: true,
      rawCommandsHiddenByDefault: !args.includeCommandLines,
      buildStopRequiresBreakGlass: true,
      pidCountsAreHealthSignalsOnly: true,
      activeBuildDoesNotEqualFailure: true,
      staleBuildStateForbidden: true,
    },
    buildTrees: [],
    buildProcesses: [],
    recommendations: [
      {
        kind: 'build_scanner_unavailable',
        priority: 'high',
        text: 'Build custody could not read the Windows process table in time. Treat build state as unknown and avoid starting new builds until telemetry recovers.',
      },
    ],
    brittneyBrief: {
      status: 'build_scanner_unavailable',
      requiredNextAction: 'Treat active build state as unknown; refresh build custody after memory or process pressure settles.',
      blockedActions: ['kill_build_process', 'stop_build_tree', 'delete_build_output', 'start_new_build'],
      custodySummary: 'build custody scanner unavailable; stale build state was not reused.',
    },
    safety,
    receipt: {
      buildCustodyHash: sha256(JSON.stringify(receiptInput)),
      destructiveActionsTaken: false,
      rawCommandsIncluded: args.includeCommandLines,
      staleStateReused: false,
    },
  };
}

function writeJson(filePath, data) {
  const resolved = resolveRepoPath(filePath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return resolved;
}

function writeBrowserBootstrap(filePath, data) {
  const resolved = resolveRepoPath(filePath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  const payload = JSON.stringify(data, null, 2).replace(/<\/script/gi, '<\\/script');
  writeFileSync(resolved, `window.HOLOSHELL_BUILD_CUSTODY = ${payload};\n`, 'utf8');
  return resolved;
}

function assertSelfTest(custody) {
  const failures = [];
  if (custody.schemaVersion !== SCHEMA_VERSION) failures.push('schemaVersion mismatch');
  if (custody.summary.buildProcessCount < 4) failures.push('expected synthetic build processes');
  if (custody.summary.activeBuildTreeCount !== 1) failures.push('expected one build tree');
  if (!custody.buildTrees[0]?.processPids.includes(103)) failures.push('expected descendant bundler process in build tree');
  if (custody.buildProcesses.some((processInfo) => [300, 301].includes(processInfo.pid))) {
    failures.push('holoscript query text mentioning build must not become build custody');
  }
  if (custody.buildProcesses.some((processInfo) => processInfo.pid === 302)) {
    failures.push('orphan esbuild service ping must not become an active build');
  }
  if (custody.safety.destructiveActionsTaken !== false) failures.push('destructive actions must be false');
  if (custody.safety.rawCommandsIncluded !== false) failures.push('raw commands should be hidden by default');
  if (!custody.brittneyBrief.blockedActions.includes('kill_build_process')) failures.push('kill_build_process must be blocked');
  if (!custody.receipt.buildCustodyHash) failures.push('missing custody hash');
  const serialized = JSON.stringify(custody);
  if (/commandLine|CommandLine|pnpm build|tsup src/.test(serialized)) failures.push('raw command text leaked');
  if (failures.length) {
    throw new Error(`Self-test failed:\n- ${failures.join('\n- ')}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest && args.output === DEFAULT_OUTPUT) {
    args.output = path.join('.tmp', 'holoshell', 'self-test', 'build-custody.json');
  }
  if (args.selfTest && args.jsOutput === DEFAULT_JS_OUTPUT) {
    args.jsOutput = path.join('.tmp', 'holoshell', 'self-test', 'build-custody.js');
  }
  let readError = null;
  let processes = [];
  try {
    processes = args.selfTest ? syntheticProcesses() : readProcesses();
  } catch (error) {
    readError = error;
  }
  const custody = readError
    ? createUnavailableCustody(args, readError.message || String(readError))
    : createCustody(processes, args);
  if (args.selfTest) assertSelfTest(custody);
  const output = writeJson(args.output, custody);
  const jsOutput = writeBrowserBootstrap(args.jsOutput, custody);

  if (args.json) {
    console.log(JSON.stringify(custody, null, 2));
  } else {
    console.log(`HoloShell build custody: ${output}`);
    console.log(`HoloShell build custody browser bootstrap: ${jsOutput}`);
    console.log(`Build processes: ${custody.summary.buildProcessCount}`);
    console.log(`Build trees: ${custody.summary.activeBuildTreeCount}`);
    console.log(`Long-running builds: ${custody.summary.longRunningBuildCount}`);
    console.log(`High-memory builds: ${custody.summary.highMemoryBuildCount}`);
    for (const tree of custody.buildTrees.slice(0, MAX_TAIL)) {
      console.log(`${tree.treeId}: ${tree.status}, ${tree.processCount} process(es), ${tree.totalMemoryMb} MB`);
    }
  }
}

try {
  main();
} catch (error) {
  console.error(`holoshell-build-custody failed: ${error.message}`);
  process.exit(1);
}
