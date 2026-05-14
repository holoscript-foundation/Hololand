#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const SCHEMA_VERSION = 'hololand.holoshell.readiness-evidence.v0.1.0';
const DEFAULT_OUTPUT = '.tmp/holoshell/readiness-evidence.json';
const DEFAULT_JS_OUTPUT = '.tmp/holoshell/readiness-evidence.js';
const DEFAULT_HOLOSCRIPT_EVIDENCE_ROOT = path.resolve(
  REPO_ROOT,
  '..',
  'HoloScript',
  '.bench-logs',
  'holoshell-human-os-frontier',
);

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    sourceDir: '',
    sourceRoot: DEFAULT_HOLOSCRIPT_EVIDENCE_ROOT,
    output: DEFAULT_OUTPUT,
    jsOutput: DEFAULT_JS_OUTPUT,
    json: false,
    selfTest: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--source-dir') args.sourceDir = argv[++index];
    else if (arg === '--source-root') args.sourceRoot = argv[++index];
    else if (arg === '--output') args.output = argv[++index];
    else if (arg === '--js-output') args.jsOutput = argv[++index];
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
  --output <file>      JSON output. Default: ${DEFAULT_OUTPUT}
  --js-output <file>   Browser bootstrap output. Default: ${DEFAULT_JS_OUTPUT}
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
  return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 12);
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
  if (status === 'fail' || status === 'reported_fail') return 3;
  if (status === 'warn' || status === 'skipped') return 2;
  if (status === 'unknown') return 1;
  return 0;
}

function deriveBuildStatus(buildLog, report) {
  const lower = `${buildLog}\n${report}`.toLowerCase();
  if (/(pnpm build`?: failed|build failed|err_pnpm|elifecycle)/i.test(lower)) return 'fail';
  if (/pnpm build`?: passed|pnpm build passed|build: passed|build passed/i.test(lower)) return 'pass';
  if (buildLog && !/(error:|failed|err_pnpm|elifecycle)/i.test(buildLog)) return 'pass';
  return 'unknown';
}

function deriveGraphStatus(report) {
  if (/graph-status[^.\n]*failed|graph status cli import gap|missing .*@holoscript\/core\/dist\/index\.js/i.test(report)) {
    return 'reported_fail';
  }
  if (/graph-status[^.\n]*passed|graph status[^.\n]*fresh/i.test(report)) return 'pass';
  return 'unknown';
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

function makeToken({ id, kind, title, status, detail, source, trustState, receiptType, nextAction = '' }) {
  return {
    id,
    kind,
    title,
    status,
    detail,
    source,
    trustState: trustState || (status === 'pass' ? 'verified' : status === 'warn' || status === 'skipped' ? 'partial' : 'unknown'),
    receiptType,
    nextAction,
  };
}

function createFeedFromFiles(sourceDir) {
  const evidenceDir = resolveRepoPath(sourceDir);
  const reportPath = path.join(evidenceDir, 'flagship-readiness-report.md');
  const deviceReceiptPath = path.join(evidenceDir, 'device-lab-receipt.json');
  const validationsPath = path.join(evidenceDir, 'source-validations.json');
  const tasksPath = path.join(evidenceDir, 'holomesh-tasks.json');
  const buildLogPath = path.join(evidenceDir, 'pnpm-build.log');
  const gitStatusPath = path.join(evidenceDir, 'git-status.txt');

  const report = readText(reportPath);
  const buildLog = readText(buildLogPath);
  const gitStatus = readText(gitStatusPath);
  const deviceReceipt = readJson(deviceReceiptPath, {});
  const validations = readJson(validationsPath, []);
  const taskBundle = readJson(tasksPath, { tasks: [] });
  return createFeed({
    evidenceDir,
    report,
    buildLog,
    gitStatus,
    deviceReceipt,
    validations,
    taskBundle,
    paths: {
      reportPath,
      deviceReceiptPath,
      validationsPath,
      tasksPath,
      buildLogPath,
      gitStatusPath,
    },
  });
}

function createFeed({ evidenceDir, report, buildLog, gitStatus, deviceReceipt, validations, taskBundle, paths }) {
  const runId = firstMatch(report, /Automation ID:\s*`([^`]+)`/, 'holoshell-human-os-frontier');
  const runTime = firstMatch(report, /Run time:\s*([^\n]+)/, deviceReceipt?.createdAt || '');
  const scenario = firstMatch(report, /Workflow explored:\s*"([^"]+)"/, 'Make this computer ready to build a HoloLand world');
  const nextWorkflow = firstMatch(report, /Next workflow to push:\s*"([^"]+)"/, firstMatch(report, /Next Workflow[\s\S]*?["“]([^"”]+)["”]/, 'Turn a folder of local assets into a playable HoloLand shard'));
  const knowledgeId = firstMatch(report, /HoloMesh knowledge entry posted:\s*`([^`]+)`/, '');
  const buildStatus = deriveBuildStatus(buildLog, report);
  const graphStatus = deriveGraphStatus(report);
  const validation = validationSummary(validations);
  const deviceLabStatus = deviceReceipt?.overallStatus || 'unknown';
  const wasmSimdStatus = deviceCheckStatus(deviceReceipt, 'wasm-simd');
  const runtimeInventoryStatus = deviceCheckStatus(deviceReceipt, 'runtime-inventory');
  const webgpuStatus = deviceCheckStatus(deviceReceipt, 'webgpu-browser');
  const headsetStatus = deviceCheckStatus(deviceReceipt, 'headset-report');
  const replayStatus = deviceCheckStatus(deviceReceipt, 'replay-receipt');
  const tasks = Array.isArray(taskBundle?.tasks) ? taskBundle.tasks : [];
  const dirtyLineCount = gitStatus.split(/\r?\n/).filter((line) => line.trim()).length;
  const warningCount = [
    deviceLabStatus,
    headsetStatus,
    replayStatus,
    graphStatus,
  ].filter((status) => ['warn', 'skipped', 'reported_fail', 'fail'].includes(status)).length;
  const worstStatus = [
    buildStatus,
    validation.status,
    deviceLabStatus,
    wasmSimdStatus,
    runtimeInventoryStatus,
    webgpuStatus,
    headsetStatus,
    replayStatus,
    graphStatus,
  ].sort((left, right) => statusRank(right) - statusRank(left))[0] || 'unknown';
  const overallStatus = worstStatus === 'reported_fail' || worstStatus === 'skipped' ? 'warn' : worstStatus;

  const tokens = [
    makeToken({
      id: 'readiness.build',
      kind: 'command_receipt',
      title: buildStatus === 'pass' ? 'pnpm build passed' : 'pnpm build needs review',
      status: buildStatus,
      detail: buildStatus === 'pass' ? 'The flagship run recorded a successful HoloScript build.' : 'The build log did not prove a clean build.',
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
      detail: deviceReceipt?.checks?.find((check) => check.id === 'webgpu-browser')?.detail || 'WebGPU browser smoke status from device-lab.',
      source: paths.deviceReceiptPath,
      receiptType: deviceReceipt?.schemaVersion || 'device_lab_receipt',
    }),
    makeToken({
      id: 'readiness.wasm-simd',
      kind: 'hardware_receipt',
      title: 'WASM SIMD',
      status: wasmSimdStatus,
      detail: deviceReceipt?.checks?.find((check) => check.id === 'wasm-simd')?.detail || 'WASM SIMD status from device-lab.',
      source: paths.deviceReceiptPath,
      receiptType: deviceReceipt?.schemaVersion || 'device_lab_receipt',
    }),
    makeToken({
      id: 'readiness.headset-report',
      kind: 'manual_witness_gap',
      title: 'Headset report missing',
      status: headsetStatus,
      detail: deviceReceipt?.checks?.find((check) => check.id === 'headset-report')?.detail || 'Attach headset report to prove headset-specific readiness.',
      source: paths.deviceReceiptPath,
      receiptType: deviceReceipt?.schemaVersion || 'device_lab_receipt',
      nextAction: 'Attach Studio /quest-probe observations.md.',
    }),
    makeToken({
      id: 'readiness.replay-receipt',
      kind: 'manual_witness_gap',
      title: 'Replay receipt missing',
      status: replayStatus,
      detail: deviceReceipt?.checks?.find((check) => check.id === 'replay-receipt')?.detail || 'Attach replay receipt to prove deterministic replay.',
      source: paths.deviceReceiptPath,
      receiptType: deviceReceipt?.schemaVersion || 'device_lab_receipt',
      nextAction: 'Attach a scene replay, trace, or validation receipt.',
    }),
    makeToken({
      id: 'readiness.graph-status',
      kind: 'tool_failure_receipt',
      title: graphStatus === 'reported_fail' ? 'Graph status reported import failure' : 'Graph status',
      status: graphStatus,
      detail: graphStatus === 'reported_fail'
        ? 'The automation reported graph-status failed on a missing @holoscript/core dist import; HoloShell should show this as provenance risk until rechecked.'
        : 'Graph status was not recorded as a failure in the evidence report.',
      source: paths.reportPath,
      trustState: graphStatus === 'reported_fail' ? 'partial' : 'unknown',
      receiptType: 'tool_failure_receipt',
      nextAction: 'Re-run graph-status and attach a structured tool receipt.',
    }),
    makeToken({
      id: 'readiness.holomesh-tasks',
      kind: 'coordination_receipt',
      title: `${tasks.length} HoloMesh tasks filed`,
      status: tasks.length ? 'pass' : 'unknown',
      detail: tasks.map((task) => task.title).filter(Boolean).slice(0, 3).join('; ') || 'No tasks were listed in the evidence pack.',
      source: paths.tasksPath,
      receiptType: 'holomesh_task_seed',
    }),
  ];

  return {
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
      holoscriptExperimentDir: path.resolve(evidenceDir, '..', '..', '..', 'experiments', 'holoshell-human-os-frontier'),
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
      taskCount: tasks.length,
      warningCount,
      dirtyLineCount,
      tokenCount: tokens.length,
      nextWorkflow,
    },
    tokens,
    tasks,
    gotchas: Array.isArray(deviceReceipt?.gotchas) ? deviceReceipt.gotchas : [],
  };
}

function fixtureFeed() {
  return createFeed({
    evidenceDir: 'fixture',
    report: 'Run time: 2026-05-14T06:20:00Z\nAutomation ID: `holoshell-human-os-frontier`\nWorkflow explored: "Make this computer ready to build a HoloLand world"\n`pnpm build`: passed\n`pnpm exec holoscript graph-status --json`: failed with missing `@holoscript/core/dist/index.js` import.\nNext workflow to push: "Turn a folder of local assets into a playable HoloLand shard with validation, preview, receipts, and rollback."',
    buildLog: 'Done',
    gitStatus: ' M file',
    deviceReceipt: {
      schemaVersion: 'hololand-device-lab-receipt/v1',
      overallStatus: 'warn',
      checks: [
        { id: 'wasm-simd', status: 'pass', detail: 'WASM SIMD validation passed.' },
        { id: 'runtime-inventory', status: 'pass', detail: 'Detected local GPU controllers.' },
        { id: 'webgpu-browser', status: 'pass', detail: 'WebGPU adapter/device smoke shader completed.' },
        { id: 'headset-report', status: 'skipped', detail: 'No headset report supplied.' },
        { id: 'replay-receipt', status: 'skipped', detail: 'No replay artifact supplied.' },
      ],
      gotchas: [],
    },
    validations: [{ status: 'pass', exitCode: 0 }, { status: 'pass', exitCode: 0 }],
    taskBundle: { tasks: [{ title: '[holoshell][graph-status] Fix local CLI cache status import' }] },
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
  if (feed.summary.graphStatus !== 'reported_fail') failures.push('expected reported graph-status failure');
  if (!feed.tokens.find((token) => token.id === 'readiness.replay-receipt')) failures.push('expected replay token');
  if (!feed.summary.nextWorkflow.includes('playable HoloLand shard')) failures.push('expected next workflow');
  if (failures.length) throw new Error(`Self-test failed:\n- ${failures.join('\n- ')}`);
}

try {
  const args = parseArgs();
  const sourceDir = args.sourceDir ? resolveRepoPath(args.sourceDir) : latestEvidenceDir(args.sourceRoot);
  const feed = args.selfTest ? fixtureFeed() : sourceDir ? createFeedFromFiles(sourceDir) : createFeed({
    evidenceDir: '',
    report: '',
    buildLog: '',
    gitStatus: '',
    deviceReceipt: {},
    validations: [],
    taskBundle: { tasks: [] },
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
