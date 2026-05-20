#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const SCHEMA_VERSION = 'hololand.holoshell.readiness-evidence.v0.1.0';
const DEFAULT_OUTPUT = '.tmp/holoshell/readiness-evidence.json';
const DEFAULT_JS_OUTPUT = '.tmp/holoshell/readiness-evidence.js';
const DEFAULT_TMP_DIR = path.join('.tmp', 'holoshell');
const DEFAULT_HOLOSCRIPT_EVIDENCE_ROOT = path.resolve(
  REPO_ROOT,
  '..',
  'HoloScript',
  '.bench-logs',
  'holoshell-human-os-frontier'
);

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    sourceDir: '',
    sourceRoot: DEFAULT_HOLOSCRIPT_EVIDENCE_ROOT,
    tmpDir: DEFAULT_TMP_DIR,
    output: DEFAULT_OUTPUT,
    jsOutput: DEFAULT_JS_OUTPUT,
    liveCoreImport: true,
    json: false,
    selfTest: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    if (arg === '--source-dir') args.sourceDir = argv[++index];
    else if (arg === '--source-root') args.sourceRoot = argv[++index];
    else if (arg === '--tmp-dir') args.tmpDir = argv[++index];
    else if (arg === '--output') args.output = argv[++index];
    else if (arg === '--js-output') args.jsOutput = argv[++index];
    else if (arg === '--skip-live-core-import') args.liveCoreImport = false;
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
  console.log(`HoloShell readiness evidence ingester

Usage:
  node scripts/holoshell-readiness-evidence.mjs [options]

Options:
  --source-dir <dir>   Exact evidence-pack directory to read.
  --source-root <dir>  Evidence root containing dated runs.
                       Default: ${DEFAULT_HOLOSCRIPT_EVIDENCE_ROOT}
  --tmp-dir <dir>      HoloShell local artifact directory. Default: ${DEFAULT_TMP_DIR}
  --output <file>      JSON output. Default: ${DEFAULT_OUTPUT}
  --js-output <file>   Browser bootstrap output. Default: ${DEFAULT_JS_OUTPUT}
  --skip-live-core-import
                       Do not run the local @holoscript/core import probe.
  --json               Print generated evidence feed.
  --self-test          Build a fixture feed and assert expected warning tokens.
  -h, --help           Show this help.
`);
}

function resolveRepoPath(filePath) {
  if (path.isAbsolute(filePath)) return filePath;
  return path.resolve(REPO_ROOT, filePath);
}

function readText(filePath, fallback = '') {
  const resolved = resolveRepoPath(filePath);
  if (!existsSync(resolved)) return fallback;
  return readFileSync(resolved, 'utf8');
}

function readJson(filePath, fallback = null) {
  const text = readText(filePath, '');
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (error) {
    return {
      readError: error.message,
      path: resolveRepoPath(filePath),
    };
  }
}

function writeJson(filePath, data) {
  const resolved = resolveRepoPath(filePath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return resolved;
}

function writeBrowserBootstrap(filePath, feed) {
  const resolved = resolveRepoPath(filePath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  const payload = JSON.stringify(feed, null, 2).replace(/<\/script/gi, '<\\/script');
  writeFileSync(resolved, `window.HOLOSHELL_READINESS_EVIDENCE = ${payload};\n`, 'utf8');
  return resolved;
}

function shortHash(value) {
  return createHash('sha256')
    .update(String(value || ''))
    .digest('hex')
    .slice(0, 12);
}

function normalizeSlashes(value) {
  return String(value || '').replace(/\\/g, '/');
}

function redactionPairs() {
  const pairs = [
    [REPO_ROOT, '[hololand-root]'],
    [path.resolve(REPO_ROOT, '..', 'HoloScript'), '[holoscript-root]'],
    [process.env.USERPROFILE || process.env.HOME || '', '[user-home]'],
    [process.env.TEMP || process.env.TMP || '', '[temp]'],
  ];
  return pairs
    .filter(([target]) => target)
    .flatMap(([target, label]) => [
      [target, label],
      [normalizeSlashes(target), label],
    ]);
}

function redactText(value) {
  let out = String(value || '');
  for (const [target, label] of redactionPairs()) {
    out = out.split(target).join(label);
  }
  return out
    .replace(/(api[_-]?key|token|secret|password)=([^\s&]+)/gi, '$1=[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/g, 'Bearer [redacted]');
}

function redactValue(value) {
  if (typeof value === 'string') return redactText(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, redactValue(entry)]));
}

function changedFilesFromGitStatus(gitStatus) {
  return gitStatus
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^([ MADRCU?!]{1,2})\s+/, ''))
    .map((line) => line.replace(/^"|"$/g, ''))
    .filter(Boolean);
}

function listJsonFiles(dirPath) {
  const resolved = resolveRepoPath(dirPath);
  if (!existsSync(resolved)) return [];
  return readdirSync(resolved, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(resolved, entry.name))
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);
}

function readLatestRunReceipt(tmpDir, runClass = 'build') {
  const receiptsDir = path.join(resolveRepoPath(tmpDir), 'run-receipts');
  const files = listJsonFiles(receiptsDir);
  const receipts = files.map((file) => readJson(file, null)).filter(Boolean);
  return receipts.find((receipt) => receipt?.command?.runClass === runClass) || receipts[0] || {};
}

function readLocalArtifacts(tmpDir) {
  const resolvedTmp = resolveRepoPath(tmpDir);
  return redactValue({
    tmpDir: resolvedTmp,
    hardwareReality: readJson(path.join(resolvedTmp, 'hardware-reality.json'), {}),
    processHealth: readJson(path.join(resolvedTmp, 'process-health.json'), {}),
    mcpCustodyContract: readJson(path.join(resolvedTmp, 'mcp-custody-contract.json'), {}),
    liveFeed: readJson(path.join(resolvedTmp, 'live-feed.json'), {}),
    buildRunReceipt: readLatestRunReceipt(resolvedTmp, 'build'),
  });
}

function statusFromRisk(risk) {
  if (risk === 'pass' || risk === 'ok' || risk === 'ready') return 'pass';
  if (risk === 'warn' || risk === 'partial') return 'warn';
  if (risk === 'critical' || risk === 'fail' || risk === 'failed') return 'fail';
  return 'unknown';
}

function statusFromRunReceipt(receipt) {
  if (!receipt?.schemaVersion) return 'unknown';
  if (receipt.status === 'completed' && receipt.process?.exitCode === 0) return 'pass';
  if (receipt.status === 'blocked' || receipt.status === 'dry_run') return 'warn';
  if (receipt.status === 'failed' || Number(receipt.process?.exitCode || 0) > 0) return 'fail';
  return 'unknown';
}

function localArtifactSummary(localArtifacts) {
  const hardware = localArtifacts?.hardwareReality || {};
  const processHealth = localArtifacts?.processHealth || {};
  const mcpCustodyContract = localArtifacts?.mcpCustodyContract || {};
  const liveFeed = localArtifacts?.liveFeed || {};
  const buildRun = localArtifacts?.buildRunReceipt || {};
  const processSummary = processHealth.summary || {};
  const contractSummary = mcpCustodyContract.summary || {};
  const liveSummary = liveFeed.summary || {};
  const hardwareSummary = hardware.summary || {};

  return {
    hardwareReality: {
      status: statusFromRisk(hardwareSummary.riskState),
      riskState: hardwareSummary.riskState || 'unknown',
      processCount: hardwareSummary.processCount || 0,
      shellRunCount: hardwareSummary.shellRunCount || 0,
      requiredToolsAvailable: Boolean(hardwareSummary.requiredToolsAvailable),
      source: path.join(localArtifacts?.tmpDir || DEFAULT_TMP_DIR, 'hardware-reality.json'),
    },
    processHealth: {
      status: statusFromRisk(processSummary.riskState),
      riskState: processSummary.riskState || 'unknown',
      processCount: processSummary.processCount || 0,
      staleRunCount: processSummary.staleRunCount || 0,
      ownerUnknownStaleRunCount: processSummary.ownerUnknownStaleRunCount || 0,
      laneOwnedStaleRunCount: processSummary.laneOwnedStaleRunCount || 0,
      highMemoryCount: processSummary.highMemoryCount || 0,
      actionableCleanupCandidateCount: processSummary.actionableCleanupCandidateCount || processSummary.cleanupCandidateCount || 0,
      ownerHandoffPlanCount: processSummary.ownerHandoffPlanCount || 0,
      cleanupStopPlanCount: processSummary.cleanupStopPlanCount || processSummary.stopPlanCount || 0,
      stopPlanCount: processSummary.stopPlanCount || processSummary.cleanupStopPlanCount || 0,
      recommendationCount: Array.isArray(processHealth.recommendations)
        ? processHealth.recommendations.length
        : 0,
      source: path.join(localArtifacts?.tmpDir || DEFAULT_TMP_DIR, 'process-health.json'),
    },
    mcpCustodyContract: {
      status: mcpCustodyContract.schemaVersion ? statusFromRisk(contractSummary.status) : 'unknown',
      compatibilityMode: contractSummary.compatibilityMode || 'unknown',
      nativeMcpCustodySplit: Boolean(contractSummary.nativeMcpCustodySplit),
      cleanupCandidateCount: contractSummary.cleanupCandidateCount || 0,
      ownerHandoffPlanCount: contractSummary.ownerHandoffPlanCount || 0,
      checkPassCount: contractSummary.checkPassCount || 0,
      checkWarnCount: contractSummary.checkWarnCount || 0,
      checkFailCount: contractSummary.checkFailCount || 0,
      nextAction: mcpCustodyContract.compliance?.nextAction || '',
      source: path.join(localArtifacts?.tmpDir || DEFAULT_TMP_DIR, 'mcp-custody-contract.json'),
    },
    liveFeed: {
      status: statusFromRisk(liveSummary.overallRisk),
      gatesReadiness: false,
      overallRisk: liveSummary.overallRisk || 'unknown',
      timelineCount: liveSummary.timelineCount || 0,
      readinessEvidenceStatus: liveSummary.readinessEvidenceStatus || 'unknown',
      warningCount: liveSummary.readinessWarningCount || 0,
      source: path.join(localArtifacts?.tmpDir || DEFAULT_TMP_DIR, 'live-feed.json'),
    },
    buildRun: {
      status: statusFromRunReceipt(buildRun),
      runId: buildRun.runId || '',
      runClass: buildRun.command?.runClass || '',
      exitCode: Number.isFinite(buildRun.process?.exitCode) ? buildRun.process.exitCode : null,
      healthRiskAtStart: buildRun.healthGate?.risk || null,
      durationMs: buildRun.timing?.durationMs ?? null,
      source: buildRun.output?.receiptPath || '',
      commandPreviewHash: buildRun.command?.argvHash || '',
    },
  };
}

function latestEvidenceDir(sourceRoot) {
  const root = resolveRepoPath(sourceRoot);
  if (!existsSync(root)) return '';
  const datedDirs = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name))
    .filter((dir) => existsSync(path.join(dir, 'flagship-readiness-report.md')))
    .sort((left, right) => right.localeCompare(left));
  return datedDirs[0] || '';
}

function firstMatch(text, regex, fallback = '') {
  return text.match(regex)?.[1]?.trim() || fallback;
}

function statusRank(status) {
  if (['fail', 'failed', 'critical', 'blocked', 'reported_fail'].includes(status)) return 3;
  if (['warn', 'skipped', 'dry_run'].includes(status)) return 2;
  if (status === 'unknown') return 1;
  return 0;
}

function checkLiveCoreImport(enabled = true) {
  if (!enabled) {
    return {
      status: 'skipped',
      packageName: '@holoscript/core',
      detail: 'Live @holoscript/core import probe skipped by operator flag.',
      checkedAt: new Date().toISOString(),
      source: 'node --skip-live-core-import',
    };
  }

  const probe = [
    "import('@holoscript/core')",
    '.then((module) => {',
    'const keys = Object.keys(module);',
    'console.log(JSON.stringify({ keyCount: keys.length, sample: keys.slice(0, 12) }));',
    '})',
    '.catch((error) => {',
    'console.error(error && (error.stack || error.message || String(error)));',
    'process.exit(1);',
    '});',
  ].join('');

  const attempts = [
    {
      mode: 'node_direct',
      command: process.execPath,
      args: ['-e', probe],
    },
    {
      mode: 'node_direct_retry',
      command: process.execPath,
      args: ['-e', probe],
    },
    {
      mode: 'pnpm_exec_node',
      command: process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
      args: ['exec', 'node', '-e', probe],
    },
  ];

  let lastResult = null;
  for (const attempt of attempts) {
    const packageLinkExists = existsSync(
      path.join(REPO_ROOT, 'node_modules', '@holoscript', 'core')
    );
    const result = spawnSync(attempt.command, attempt.args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, NO_COLOR: '1' },
    });
    lastResult = { ...result, attempt, packageLinkExists };
    if (!result.error && result.status === 0) {
      let payload = {};
      try {
        payload = JSON.parse(result.stdout || '{}');
      } catch {
        payload = {};
      }

      return {
        status: 'pass',
        packageName: '@holoscript/core',
        detail: `Live import passed with ${payload.keyCount || 0} exported symbol(s) via ${attempt.mode}.`,
        keyCount: payload.keyCount || 0,
        sample: Array.isArray(payload.sample) ? payload.sample : [],
        checkedAt: new Date().toISOString(),
        source: '@holoscript/core',
        probeMode: attempt.mode,
        packageLinkExistsAtStart: packageLinkExists,
      };
    }
  }

  const stderr = redactText(lastResult?.stderr || lastResult?.error?.message || '');

  return {
    status: 'fail',
    packageName: '@holoscript/core',
    detail:
      stderr ||
      `Import probe exited ${lastResult?.status ?? 'unknown'} after ${lastResult?.attempt?.mode || 'unknown'}; package link existed at start: ${Boolean(lastResult?.packageLinkExists)}.`,
    errorHash: shortHash(stderr || lastResult?.status || 'unknown'),
    checkedAt: new Date().toISOString(),
    source: '@holoscript/core',
    probeMode: lastResult?.attempt?.mode || 'unknown',
    packageLinkExistsAtStart: Boolean(lastResult?.packageLinkExists),
  };
}

function deriveBuildStatus(buildLog, report) {
  const lower = `${buildLog}\n${report}`.toLowerCase();
  if (/(pnpm build`?: failed|build failed|err_pnpm|elifecycle)/i.test(lower)) return 'fail';
  if (/pnpm build`?: passed|pnpm build passed|build: passed|build passed/i.test(lower))
    return 'pass';
  if (buildLog && !/(error:|failed|err_pnpm|elifecycle)/i.test(buildLog)) return 'pass';
  return 'unknown';
}

function deriveGraphStatus(report) {
  if (
    /graph-status[^.\n]*failed|graph status cli import gap|missing .*@holoscript\/core\/dist\/index\.js/i.test(
      report
    )
  ) {
    return 'reported_fail';
  }
  if (/graph-status[^.\n]*passed|graph status[^.\n]*fresh/i.test(report)) return 'pass';
  return 'unknown';
}

function deriveEffectiveGraphStatus(reportGraphStatus, liveCoreImport) {
  if (liveCoreImport?.status === 'pass') return 'pass';
  if (liveCoreImport?.status === 'fail') return 'fail';
  return reportGraphStatus;
}

function graphToken({ graphStatus, reportGraphStatus, liveCoreImport, source }) {
  const liveStatus = liveCoreImport?.status || 'unknown';
  const clearedStaleFailure = reportGraphStatus === 'reported_fail' && liveStatus === 'pass';
  const liveFailed = liveStatus === 'fail';

  return makeToken({
    id: 'readiness.graph-status',
    kind: liveStatus === 'pass' ? 'tool_recheck_receipt' : 'tool_failure_receipt',
    title: clearedStaleFailure
      ? 'Graph status import rechecked'
      : graphStatus === 'reported_fail' || liveFailed
        ? 'Graph status reported import failure'
        : 'Graph status',
    status: graphStatus,
    detail: clearedStaleFailure
      ? `${liveCoreImport.detail} The stale report failure is preserved as history, not current readiness risk.`
      : liveFailed
        ? `Live @holoscript/core import failed: ${liveCoreImport.detail}`
        : graphStatus === 'reported_fail'
          ? 'The automation reported graph-status failed on a missing @holoscript/core dist import; HoloShell should show this as provenance risk until rechecked.'
          : liveCoreImport?.detail ||
            'Graph status was not recorded as a failure in the evidence report.',
    source,
    trustState: graphStatus === 'pass' ? 'verified' : 'partial',
    receiptType:
      liveStatus === 'pass' || liveStatus === 'fail'
        ? 'hololand.holoshell.live-core-import.v0.1.0'
        : 'tool_failure_receipt',
    nextAction:
      graphStatus === 'pass' ? '' : 'Re-run graph-status and attach a structured tool receipt.',
  });
}

function validationSummary(validations) {
  const entries = Array.isArray(validations) ? validations : [];
  const pass = entries.filter((entry) => entry.status === 'pass' || entry.exitCode === 0).length;
  const fail = entries.filter((entry) => entry.status === 'fail' || entry.exitCode > 0).length;
  return {
    status: fail ? 'fail' : pass ? 'pass' : 'unknown',
    pass,
    fail,
    count: entries.length,
  };
}

function deviceCheckStatus(deviceReceipt, id) {
  const check = (deviceReceipt?.checks || []).find((item) => item.id === id);
  return check?.status || 'unknown';
}

function makeToken({
  id,
  kind,
  title,
  status,
  detail,
  source,
  trustState,
  receiptType,
  nextAction = '',
}) {
  return {
    id,
    kind,
    title,
    status,
    detail,
    source,
    trustState:
      trustState ||
      (status === 'pass'
        ? 'verified'
        : status === 'warn' || status === 'skipped'
          ? 'partial'
          : 'unknown'),
    receiptType,
    nextAction,
  };
}

function createFeedFromFiles(
  sourceDir,
  localArtifacts = readLocalArtifacts(DEFAULT_TMP_DIR),
  liveCoreImport = { status: 'unknown' }
) {
  const evidenceDir = resolveRepoPath(sourceDir);
  const reportPath = path.join(evidenceDir, 'flagship-readiness-report.md');
  const deviceReceiptPath = path.join(evidenceDir, 'device-lab-receipt.json');
  const validationsPath = path.join(evidenceDir, 'source-validations.json');
  const tasksPath = path.join(evidenceDir, 'holomesh-tasks.json');
  const buildLogPath = path.join(evidenceDir, 'pnpm-build.log');
  const gitStatusPath = path.join(evidenceDir, 'git-status.txt');
  // Local codebase bundle (the missing token from world-build-cockpit-v2 research)
  const localCodebaseBundlePath = path.join(evidenceDir, 'local-codebase-absorb-bundle.json');
  // Native build/MCP custody (the next substrate gap from the same research — now has
  // HoloShellBuildCustodyReceipt in HoloScript/framework after b675f8d4b)
  const buildCustodyPath = path.join(evidenceDir, 'build-custody.json');

  const report = readText(reportPath);
  const buildLog = readText(buildLogPath);
  const gitStatus = readText(gitStatusPath);
  const deviceReceipt = readJson(deviceReceiptPath, {});
  const validations = readJson(validationsPath, []);
  const taskBundle = readJson(tasksPath, { tasks: [] });
  const localCodebaseBundle = readJson(localCodebaseBundlePath, null);
  const buildCustody = readJson(buildCustodyPath, null);
  return createFeed({
    evidenceDir,
    report,
    buildLog,
    gitStatus,
    deviceReceipt,
    validations,
    taskBundle,
    localArtifacts,
    liveCoreImport,
    localCodebaseBundle,
    buildCustody,
    paths: {
      reportPath,
      deviceReceiptPath,
      validationsPath,
      tasksPath,
      buildLogPath,
      gitStatusPath,
      localCodebaseBundlePath,
      buildCustodyPath,
    },
  });
}

function createFeed({
  evidenceDir,
  report,
  buildLog,
  gitStatus,
  deviceReceipt,
  validations,
  taskBundle,
  localArtifacts,
  liveCoreImport,
  localCodebaseBundle,
  paths,
}) {
  const runId = firstMatch(report, /Automation ID:\s*`([^`]+)`/, 'holoshell-human-os-frontier');
  const runTime = firstMatch(report, /Run time:\s*([^\n]+)/, deviceReceipt?.createdAt || '');
  const scenario = firstMatch(
    report,
    /Workflow explored:\s*"([^"]+)"/,
    'Make this computer ready to build a HoloLand world'
  );
  const nextWorkflow = firstMatch(
    report,
    /Next workflow to push:\s*"([^"]+)"/,
    firstMatch(
      report,
      /Next Workflow[\s\S]*?["“]([^"”]+)["”]/,
      'Turn a folder of local assets into a playable HoloLand shard'
    )
  );
  const knowledgeId = firstMatch(report, /HoloMesh knowledge entry posted:\s*`([^`]+)`/, '');
  const buildStatus = deriveBuildStatus(buildLog, report);
  const reportGraphStatus = deriveGraphStatus(report);
  const graphStatus = deriveEffectiveGraphStatus(reportGraphStatus, liveCoreImport);
  const validation = validationSummary(validations);
  const deviceLabStatus = deviceReceipt?.overallStatus || 'unknown';
  const wasmSimdStatus = deviceCheckStatus(deviceReceipt, 'wasm-simd');
  const runtimeInventoryStatus = deviceCheckStatus(deviceReceipt, 'runtime-inventory');
  const webgpuStatus = deviceCheckStatus(deviceReceipt, 'webgpu-browser');
  const headsetStatus = deviceCheckStatus(deviceReceipt, 'headset-report');
  const replayStatus = deviceCheckStatus(deviceReceipt, 'replay-receipt');
  const tasks = Array.isArray(taskBundle?.tasks) ? taskBundle.tasks : [];
  const changedFiles = changedFilesFromGitStatus(gitStatus);
  const dirtyLineCount = changedFiles.length;
  const localSummary = localArtifactSummary(localArtifacts);
  const warningCount = [
    deviceLabStatus,
    headsetStatus,
    replayStatus,
    graphStatus,
    localSummary.hardwareReality.status,
    localSummary.processHealth.status,
    localSummary.mcpCustodyContract.status,
    localSummary.buildRun.status,
  ].filter((status) => ['warn', 'skipped', 'reported_fail', 'fail'].includes(status)).length;
  const worstStatus =
    [
      buildStatus,
      validation.status,
      deviceLabStatus,
      wasmSimdStatus,
      runtimeInventoryStatus,
      webgpuStatus,
      headsetStatus,
      replayStatus,
      graphStatus,
      localSummary.hardwareReality.status,
      localSummary.processHealth.status,
      localSummary.mcpCustodyContract.status,
      localSummary.buildRun.status,
    ].sort((left, right) => statusRank(right) - statusRank(left))[0] || 'unknown';
  const overallStatus =
    worstStatus === 'reported_fail' || worstStatus === 'skipped' ? 'warn' : worstStatus;

  const tokens = [
    makeToken({
      id: 'readiness.build',
      kind: 'command_receipt',
      title: buildStatus === 'pass' ? 'pnpm build passed' : 'pnpm build needs review',
      status: buildStatus,
      detail:
        buildStatus === 'pass'
          ? 'The flagship run recorded a successful HoloScript build.'
          : 'The build log did not prove a clean build.',
      source: paths.buildLogPath,
      receiptType: 'build_log',
    }),
    makeToken({
      id: 'readiness.source-validation',
      kind: 'source_validation',
      title: `${validation.pass}/${validation.count} HoloScript source validations passed`,
      status: validation.status,
      detail: `${validation.pass} passed, ${validation.fail} failed across HoloShell and frontier source files.`,
      source: paths.validationsPath,
      receiptType: 'source_validations',
    }),
    makeToken({
      id: 'readiness.webgpu',
      kind: 'hardware_receipt',
      title: 'WebGPU browser smoke',
      status: webgpuStatus,
      detail:
        deviceReceipt?.checks?.find((check) => check.id === 'webgpu-browser')?.detail ||
        'WebGPU browser smoke status from device-lab.',
      source: paths.deviceReceiptPath,
      receiptType: deviceReceipt?.schemaVersion || 'device_lab_receipt',
    }),
    makeToken({
      id: 'readiness.wasm-simd',
      kind: 'hardware_receipt',
      title: 'WASM SIMD',
      status: wasmSimdStatus,
      detail:
        deviceReceipt?.checks?.find((check) => check.id === 'wasm-simd')?.detail ||
        'WASM SIMD status from device-lab.',
      source: paths.deviceReceiptPath,
      receiptType: deviceReceipt?.schemaVersion || 'device_lab_receipt',
    }),
    makeToken({
      id: 'readiness.headset-report',
      kind: 'manual_witness_gap',
      title: 'Headset report missing',
      status: headsetStatus,
      detail:
        deviceReceipt?.checks?.find((check) => check.id === 'headset-report')?.detail ||
        'Attach headset report to prove headset-specific readiness.',
      source: paths.deviceReceiptPath,
      receiptType: deviceReceipt?.schemaVersion || 'device_lab_receipt',
      nextAction: 'Attach Studio /quest-probe observations.md.',
    }),
    makeToken({
      id: 'readiness.replay-receipt',
      kind: 'manual_witness_gap',
      title: 'Replay receipt missing',
      status: replayStatus,
      detail:
        deviceReceipt?.checks?.find((check) => check.id === 'replay-receipt')?.detail ||
        'Attach replay receipt to prove deterministic replay.',
      source: paths.deviceReceiptPath,
      receiptType: deviceReceipt?.schemaVersion || 'device_lab_receipt',
      nextAction: 'Attach a scene replay, trace, or validation receipt.',
    }),
    graphToken({
      graphStatus,
      reportGraphStatus,
      liveCoreImport,
      source: liveCoreImport?.source || paths.reportPath,
    }),
    makeToken({
      id: 'readiness.holomesh-tasks',
      kind: 'coordination_receipt',
      title: `${tasks.length} HoloMesh tasks filed`,
      status: tasks.length ? 'pass' : 'unknown',
      detail:
        tasks
          .map((task) => task.title)
          .filter(Boolean)
          .slice(0, 3)
          .join('; ') || 'No tasks were listed in the evidence pack.',
      source: paths.tasksPath,
      receiptType: 'holomesh_task_seed',
    }),
    makeToken({
      id: 'readiness.hardware-reality',
      kind: 'hardware_reality_receipt',
      title: `Hardware reality ${localSummary.hardwareReality.riskState}`,
      status: localSummary.hardwareReality.status,
      detail: `${localSummary.hardwareReality.processCount} process(es), ${localSummary.hardwareReality.shellRunCount} shell run(s), required HoloShell tools ${localSummary.hardwareReality.requiredToolsAvailable ? 'available' : 'not fully available'}.`,
      source: localSummary.hardwareReality.source,
      receiptType: 'hololand.holoshell.hardware-reality-bridge.v0.1.0',
    }),
    makeToken({
      id: 'readiness.process-health',
      kind: 'process_health_receipt',
      title: `Process health ${localSummary.processHealth.riskState}`,
      status: localSummary.processHealth.status,
      detail: `${localSummary.processHealth.processCount} process(es), ${localSummary.processHealth.staleRunCount} stale run(s): ${localSummary.processHealth.actionableCleanupCandidateCount} cleanup candidate(s), ${localSummary.processHealth.ownerHandoffPlanCount} owner handoff(s), ${localSummary.processHealth.cleanupStopPlanCount} cleanup stop plan(s).`,
      source: localSummary.processHealth.source,
      receiptType: 'hololand.holoshell.process-health.v0.1.0',
      nextAction: localSummary.processHealth.cleanupStopPlanCount
        ? 'Review cleanup stop plans and owner handoffs before launching more heavy HoloShell runs.'
        : '',
    }),
    makeToken({
      id: 'readiness.mcp-custody-contract',
      kind: 'mcp_contract_receipt',
      title: localSummary.mcpCustodyContract.nativeMcpCustodySplit
        ? 'MCP custody split native'
        : `MCP custody split ${localSummary.mcpCustodyContract.compatibilityMode}`,
      status: localSummary.mcpCustodyContract.status,
      detail: `Compatibility ${localSummary.mcpCustodyContract.compatibilityMode}; ${localSummary.mcpCustodyContract.cleanupCandidateCount} cleanup candidate(s), ${localSummary.mcpCustodyContract.ownerHandoffPlanCount} owner handoff(s), ${localSummary.mcpCustodyContract.checkFailCount} failing contract check(s).`,
      source: localSummary.mcpCustodyContract.source,
      receiptType: 'hololand.holoshell.mcp-custody-contract.v0.1.0',
      nextAction: localSummary.mcpCustodyContract.status === 'pass'
        ? ''
        : localSummary.mcpCustodyContract.nextAction || 'Upgrade holoshell_run_registry_snapshot to emit the custody split natively.',
    }),
    makeToken({
      id: 'readiness.live-feed',
      kind: 'live_feed_receipt',
      title: `Live feed ${localSummary.liveFeed.overallRisk}`,
      status: localSummary.liveFeed.status,
      detail: `${localSummary.liveFeed.timelineCount} timeline item(s); readiness feed ${localSummary.liveFeed.readinessEvidenceStatus}; ${localSummary.liveFeed.warningCount} readiness warning(s). Live feed is a downstream projection and does not gate this readiness calculation.`,
      source: localSummary.liveFeed.source,
      receiptType: 'hololand.holoshell.live-feed.v0.1.0',
    }),
    // Local codebase bundle token (the missing gate from world-build-cockpit-v2 research)
    // When the holoshell-local-codebase-absorb-bundle.mjs artifact is present, we surface it
    // as a first-class HoloShellLocalCodebaseSnapshotReceipt so the cockpit and WorldBuildReadyToken
    // validator can see file counts, skipped reasons, redaction status, and graph authority.
    ...(localCodebaseBundle && localCodebaseBundle.receipt ? [makeToken({
      id: 'readiness.local-codebase-bundle',
      kind: 'local_codebase_snapshot_receipt',
      title: `Local codebase bundle (${(localCodebaseBundle.receipt.roots || []).reduce((s, r) => s + (r.selectedFileCount || 0), 0)} files)`,
      status: localCodebaseBundle.schemaVersion ? 'pass' : 'unknown',
      detail: localCodebaseBundle.receipt
        ? `${(localCodebaseBundle.receipt.roots || []).reduce((s, r) => s + (r.selectedFileCount || 0), 0)} files across ${(localCodebaseBundle.receipt.roots || []).length} roots, ${(localCodebaseBundle.receipt.roots || []).reduce((s, r) => s + (r.skippedFileCount || 0), 0)} skipped, redaction ${localCodebaseBundle.receipt.redactionStatus || 'unknown'}, graph authority ${localCodebaseBundle.receipt.graphReceipt?.authoritative ? 'local' : 'stale-hosted'}.`
        : 'Bundle artifact present but no receipt payload.',
      source: paths.localCodebaseBundlePath || evidenceDir,
      receiptType: localCodebaseBundle.receiptType || 'hololand.holoshell.local-codebase-absorb-bundle.v0.1.0',
      nextAction: (localCodebaseBundle.receipt?.roots || []).some(r => (r.skippedFileCount || 0) > 0)
        ? 'Review skipped files in the local codebase bundle before promotion.'
        : '',
    })] : []),
    // Native build/MCP custody token (derived from world-build-cockpit-v2 research gap).
    // When a producer drops build-custody.json using the HoloShellBuildCustodyReceipt shape
    // (created in HoloScript after b675f8d4b), this surfaces authoritative native custody
    // instead of hololand_overlay. This is the direct fix for "readiness evidence still
    // reports MCP custody split as hololand_overlay".
    ...(buildCustody ? [makeToken({
      id: 'readiness.build-custody',
      kind: 'build_custody_receipt',
      title: buildCustody.custody?.isNative
        ? 'Build custody (native)'
        : 'Build custody (overlay — legacy)',
      status: buildCustody.custody?.isNative ? 'pass' : 'warn',
      detail: buildCustody.custody
        ? `${buildCustody.custody.source} • builtBy=${buildCustody.custody.builtBy} • sourceRef=${buildCustody.custody.sourceRef?.slice(0, 12)} • MCP authoritative=${buildCustody.custody.mcpHealthSnapshot?.graphAuthoritative ?? 'unknown'}`
        : 'Build custody artifact present.',
      source: paths.buildCustodyPath || evidenceDir,
      receiptType: buildCustody.schemaVersion || 'holoscript.framework.holoshell-build-custody.v1',
      nextAction: !buildCustody.custody?.isNative
        ? 'Produce native HoloShellBuildCustodyReceipt (no hololand_overlay) for this evidence pack.'
        : '',
    })] : []),
    makeToken({
      id: 'readiness.holoshell-run',
      kind: 'run_custody_receipt',
      title:
        localSummary.buildRun.status === 'pass'
          ? 'HoloShell build run completed'
          : 'HoloShell build run needs review',
      status: localSummary.buildRun.status,
      detail: `Run ${localSummary.buildRun.runId || 'unknown'} class ${localSummary.buildRun.runClass || 'unknown'} exited ${localSummary.buildRun.exitCode ?? 'unknown'} after ${localSummary.buildRun.durationMs ?? 'unknown'}ms; health gate ${localSummary.buildRun.healthRiskAtStart || 'skipped'}.`,
      source: localSummary.buildRun.source,
      receiptType: 'hololand.holoshell.run-receipt.v0.1.0',
      nextAction:
        localSummary.buildRun.status === 'pass'
          ? ''
          : 'Re-run through holoshell-run with an explicit reason and attach the receipt.',
    }),
    makeToken({
      id: 'readiness.repo-dirtiness',
      kind: 'git_diff_receipt',
      title: dirtyLineCount
        ? `${dirtyLineCount} changed file(s) observed`
        : 'Repo clean in evidence pack',
      status: dirtyLineCount ? 'warn' : 'pass',
      detail:
        changedFiles.slice(0, 8).join('; ') || 'No changed files were listed in git-status.txt.',
      source: paths.gitStatusPath,
      receiptType: 'git_status_receipt',
      nextAction: dirtyLineCount
        ? 'Review changed files before presenting the machine as clean.'
        : '',
    }),
  ];

  return redactValue({
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    readinessId: `${runId}-${shortHash(`${runTime}:${evidenceDir}`)}`,
    source: {
      evidenceDir,
      reportPath: paths.reportPath,
      deviceReceiptPath: paths.deviceReceiptPath,
      validationsPath: paths.validationsPath,
      tasksPath: paths.tasksPath,
      buildLogPath: paths.buildLogPath,
      gitStatusPath: paths.gitStatusPath,
      holoscriptExperimentDir: path.resolve(
        evidenceDir,
        '..',
        '..',
        '..',
        'experiments',
        'holoshell-human-os-frontier'
      ),
    },
    summary: {
      status: overallStatus,
      scenario,
      runTime,
      automationId: runId,
      knowledgeId,
      buildStatus,
      validationStatus: validation.status,
      validationPassCount: validation.pass,
      validationCount: validation.count,
      deviceLabStatus,
      wasmSimdStatus,
      runtimeInventoryStatus,
      webgpuStatus,
      headsetStatus,
      replayStatus,
      graphStatus,
      reportGraphStatus,
      liveCoreImportStatus: liveCoreImport?.status || 'unknown',
      liveCoreImportCheckedAt: liveCoreImport?.checkedAt || '',
      liveCoreImportKeyCount: liveCoreImport?.keyCount || 0,
      taskCount: tasks.length,
      warningCount,
      dirtyLineCount,
      changedFileCount: changedFiles.length,
      changedFiles: changedFiles.slice(0, 24),
      hardwareRealityStatus: localSummary.hardwareReality.status,
      processHealthStatus: localSummary.processHealth.status,
      mcpCustodyContractStatus: localSummary.mcpCustodyContract.status,
      mcpCustodyCompatibilityMode: localSummary.mcpCustodyContract.compatibilityMode,
      nativeMcpCustodySplit: localSummary.mcpCustodyContract.nativeMcpCustodySplit,
      liveFeedStatus: localSummary.liveFeed.status,
      buildRunStatus: localSummary.buildRun.status,
      buildRunExitCode: localSummary.buildRun.exitCode,
      stopPlanCount: localSummary.processHealth.stopPlanCount,
      tokenCount: tokens.length,
      nextWorkflow,
    },
    tokens,
    liveCoreImport: redactValue(liveCoreImport),
    localArtifacts: redactValue(localSummary),
    commands: {
      replay: redactText(
        `node scripts/holoshell-readiness-evidence.mjs --source-dir "${evidenceDir || '<evidence-dir>'}" --tmp-dir "${localArtifacts?.tmpDir || DEFAULT_TMP_DIR}"`
      ),
      rollback:
        'Read-only aggregation; delete .tmp/holoshell/readiness-evidence.json and .tmp/holoshell/readiness-evidence.js to clear the projection.',
      rerunBuild:
        'node scripts/holoshell-run.mjs --run-class build --allow-warn --reason "<reason>" -- pnpm build',
    },
    privacy: {
      redacted: true,
      rawCommandsIncluded: false,
      rawSecretsIncluded: false,
      localPathLabels: ['[hololand-root]', '[holoscript-root]', '[user-home]', '[temp]'],
    },
    tasks,
    taskLinks: tasks.map((task, index) => ({
      id: task.id || task.taskId || `task-${index + 1}`,
      title: task.title || '',
      status: task.status || 'filed',
      source: paths.tasksPath,
    })),
    gotchas: Array.isArray(deviceReceipt?.gotchas) ? deviceReceipt.gotchas : [],
  });
}

function fixtureLocalArtifacts() {
  return {
    tmpDir: 'fixture/tmp',
    hardwareReality: {
      summary: {
        riskState: 'pass',
        processCount: 4,
        shellRunCount: 2,
        requiredToolsAvailable: true,
      },
    },
    processHealth: {
      summary: {
        riskState: 'warn',
        processCount: 4,
        staleRunCount: 1,
        stopPlanCount: 1,
      },
      recommendations: ['Review the stale build runner before starting another heavy workflow.'],
    },
    mcpCustodyContract: {
      schemaVersion: 'hololand.holoshell.mcp-custody-contract.v0.1.0',
      summary: {
        status: 'warn',
        compatibilityMode: 'hololand_overlay',
        nativeMcpCustodySplit: false,
        cleanupCandidateCount: 1,
        ownerHandoffPlanCount: 3,
        checkPassCount: 5,
        checkWarnCount: 1,
        checkFailCount: 0,
      },
      compliance: {
        nextAction: 'Upgrade upstream MCP snapshot so HoloLand no longer needs fallback or overlay custody splitting.',
      },
      receipt: { contractHash: 'fixture-contract-hash' },
    },
    liveFeed: {
      summary: {
        overallRisk: 'warn',
        timelineCount: 5,
        readinessEvidenceStatus: 'warn',
        readinessWarningCount: 2,
      },
    },
    buildRunReceipt: {
      schemaVersion: 'hololand.holoshell.run-receipt.v0.1.0',
      status: 'completed',
      command: {
        runClass: 'build',
        argvHash: 'fixture-build-hash',
      },
      process: {
        exitCode: 0,
      },
      healthGate: {
        risk: 'warn',
      },
      timing: {
        durationMs: 1234,
      },
      output: {
        receiptPath: 'fixture/tmp/run-receipts/run-build.json',
      },
    },
  };
}

function fixtureLiveCoreImport() {
  return {
    status: 'pass',
    packageName: '@holoscript/core',
    detail: 'Live import passed with 42 exported symbol(s).',
    keyCount: 42,
    sample: ['Compiler', 'Runtime'],
    checkedAt: '2026-05-14T06:30:00.000Z',
    source: '@holoscript/core',
  };
}

function fixtureFeed() {
  return createFeed({
    evidenceDir: 'fixture',
    report:
      'Run time: 2026-05-14T06:20:00Z\nAutomation ID: `holoshell-human-os-frontier`\nWorkflow explored: "Make this computer ready to build a HoloLand world"\n`pnpm build`: passed\n`pnpm exec holoscript graph-status --json`: failed with missing `@holoscript/core/dist/index.js` import.\nNext workflow to push: "Turn a folder of local assets into a playable HoloLand shard with validation, preview, receipts, and rollback."',
    buildLog: 'Done',
    gitStatus: ' M file',
    deviceReceipt: {
      schemaVersion: 'hololand-device-lab-receipt/v1',
      overallStatus: 'warn',
      checks: [
        { id: 'wasm-simd', status: 'pass', detail: 'WASM SIMD validation passed.' },
        { id: 'runtime-inventory', status: 'pass', detail: 'Detected local GPU controllers.' },
        {
          id: 'webgpu-browser',
          status: 'pass',
          detail: 'WebGPU adapter/device smoke shader completed.',
        },
        { id: 'headset-report', status: 'skipped', detail: 'No headset report supplied.' },
        { id: 'replay-receipt', status: 'skipped', detail: 'No replay artifact supplied.' },
      ],
      gotchas: [],
    },
    validations: [
      { status: 'pass', exitCode: 0 },
      { status: 'pass', exitCode: 0 },
    ],
    taskBundle: {
      tasks: [{ title: '[holoshell][graph-status] Fix local CLI cache status import' }],
    },
    localArtifacts: fixtureLocalArtifacts(),
    liveCoreImport: fixtureLiveCoreImport(),
    paths: {
      reportPath: 'fixture/report.md',
      deviceReceiptPath: 'fixture/device.json',
      validationsPath: 'fixture/validations.json',
      tasksPath: 'fixture/tasks.json',
      buildLogPath: 'fixture/build.log',
      gitStatusPath: 'fixture/git-status.txt',
    },
  });
}

function assertSelfTest(feed) {
  const failures = [];
  if (feed.schemaVersion !== SCHEMA_VERSION) failures.push('schema version mismatch');
  if (feed.summary.buildStatus !== 'pass') failures.push('expected build pass');
  if (feed.summary.webgpuStatus !== 'pass') failures.push('expected WebGPU pass token');
  if (feed.summary.headsetStatus !== 'skipped') failures.push('expected skipped headset status');
  if (feed.summary.reportGraphStatus !== 'reported_fail')
    failures.push('expected reported graph-status failure history');
  if (feed.summary.graphStatus !== 'pass') failures.push('expected live graph-status pass');
  if (feed.summary.liveCoreImportStatus !== 'pass') failures.push('expected live core import pass');
  if (!feed.tokens.find((token) => token.id === 'readiness.replay-receipt'))
    failures.push('expected replay token');
  if (!feed.tokens.find((token) => token.id === 'readiness.hardware-reality'))
    failures.push('expected hardware reality token');
  if (!feed.tokens.find((token) => token.id === 'readiness.process-health'))
    failures.push('expected process health token');
  if (!feed.tokens.find((token) => token.id === 'readiness.mcp-custody-contract'))
    failures.push('expected MCP custody contract token');
  if (!feed.tokens.find((token) => token.id === 'readiness.live-feed'))
    failures.push('expected live feed token');
  if (!feed.tokens.find((token) => token.id === 'readiness.holoshell-run'))
    failures.push('expected HoloShell run token');
  if (!feed.tokens.find((token) => token.id === 'readiness.repo-dirtiness'))
    failures.push('expected repo dirtiness token');
  if (feed.summary.tokenCount !== 14)
    failures.push(`expected 14 tokens, got ${feed.summary.tokenCount}`);
  if (feed.summary.hardwareRealityStatus !== 'pass')
    failures.push('expected hardware reality pass');
  if (feed.summary.processHealthStatus !== 'warn') failures.push('expected process health warn');
  if (feed.summary.mcpCustodyContractStatus !== 'warn')
    failures.push('expected MCP custody contract warn');
  if (feed.summary.mcpCustodyCompatibilityMode !== 'hololand_overlay')
    failures.push('expected MCP custody overlay mode');
  if (feed.summary.liveFeedStatus !== 'warn') failures.push('expected live feed warn');
  if (feed.summary.buildRunStatus !== 'pass') failures.push('expected build run pass');
  if (feed.summary.liveCoreImportKeyCount !== 42)
    failures.push('expected live core import key count');
  if (feed.summary.changedFileCount !== 1) failures.push('expected one changed fixture file');
  if (!feed.commands?.replay?.includes('--tmp-dir'))
    failures.push('expected replay command with tmp dir');
  if (feed.privacy?.redacted !== true) failures.push('expected redaction marker');
  if (!feed.summary.nextWorkflow.includes('playable HoloLand shard'))
    failures.push('expected next workflow');
  if (failures.length) throw new Error(`Self-test failed:\n- ${failures.join('\n- ')}`);
}

try {
  const args = parseArgs();
  const sourceDir = args.sourceDir
    ? resolveRepoPath(args.sourceDir)
    : latestEvidenceDir(args.sourceRoot);
  const localArtifacts = readLocalArtifacts(args.tmpDir);
  const liveCoreImport = args.selfTest
    ? fixtureLiveCoreImport()
    : checkLiveCoreImport(args.liveCoreImport);
  const feed = args.selfTest
    ? fixtureFeed()
    : sourceDir
      ? createFeedFromFiles(sourceDir, localArtifacts, liveCoreImport)
      : createFeed({
          evidenceDir: '',
          report: '',
          buildLog: '',
          gitStatus: '',
          deviceReceipt: {},
          validations: [],
          taskBundle: { tasks: [] },
          localArtifacts,
          liveCoreImport,
          paths: {
            reportPath: '',
            deviceReceiptPath: '',
            validationsPath: '',
            tasksPath: '',
            buildLogPath: '',
            gitStatusPath: '',
          },
        });
  if (args.selfTest) assertSelfTest(feed);

  // Join all gates into the single deterministic HoloShellWorldBuildReadyToken
  // (blocks on stale graph, active/high-memory builds, missing device witness, dirty tree, missing replay receipts)
  const critical = feed.tokens.filter(t =>
    ['graph', 'build', 'hardware', 'process', 'mcp', 'repo', 'liveFeed', 'custody'].some(k => t.id.includes(k))
  );
  const blocking = critical
    .filter(t => t.status === 'blocked' || t.status === 'warn')
    .map(t => `${t.id}:${t.status}${t.nextAction ? '(' + t.nextAction + ')' : ''}`);
  const joinedStatus = blocking.length === 0 ? 'ready' : (critical.some(t => t.status === 'blocked') ? 'blocked' : 'warn');
  feed.worldBuildReadyToken = {
    id: 'holoshell.world-build-ready',
    kind: 'world_build_ready_token',
    status: joinedStatus,
    blockingReasons: blocking,
    receiptRequired: true,
    nextAction: joinedStatus === 'ready' ? 'start_world_build' : 'resolve_blockers_and_replay',
    receiptInputs: critical.map(t => t.id)
  };

  const output = writeJson(args.output, feed);
  const jsOutput = writeBrowserBootstrap(args.jsOutput, feed);

  if (args.json) {
    console.log(JSON.stringify(feed, null, 2));
  } else {
    console.log(`HoloShell readiness evidence: ${output}`);
    console.log(`HoloShell readiness bootstrap: ${jsOutput}`);
    console.log(`Status: ${feed.summary.status}`);
    console.log(`Scenario: ${feed.summary.scenario}`);
    console.log(`Tokens: ${feed.summary.tokenCount}`);
    console.log(`Warnings: ${feed.summary.warningCount}`);
    console.log(`Next workflow: ${feed.summary.nextWorkflow}`);
  }
} catch (error) {
  console.error(`holoshell-readiness-evidence failed: ${error.message}`);
  process.exit(1);
}
