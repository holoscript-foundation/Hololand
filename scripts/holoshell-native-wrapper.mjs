#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const SCHEMA_VERSION = 'hololand.holoshell.native-wrapper.v0.1.0';
const DEFAULT_TMP = path.join('.tmp', 'holoshell');

const SOURCE_ANCHORS = {
  source: 'apps/holoshell/source/holoshell-native-wrapper.hsplus',
  founderHostSource: 'apps/holoshell/source/holoshell-founder-host.hsplus',
  wrapperRoot: 'apps/holoshell/native',
  windowsLauncher: 'apps/holoshell/native/windows/Start-HoloShellFounderHost.ps1',
  windowsCommandShim: 'apps/holoshell/native/windows/Start-HoloShellFounderHost.cmd',
  previewHost: 'apps/holoshell/prototype/local-capability-room.html',
  founderHostReceipt: '.tmp/holoshell/founder-host.json',
  adapter: 'scripts/holoshell-native-wrapper.mjs',
};

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    tmpDir: DEFAULT_TMP,
    output: null,
    jsOutput: null,
    json: false,
    selfTest: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--tmp-dir') args.tmpDir = argv[++index];
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

  if (args.selfTest) args.tmpDir = path.join(DEFAULT_TMP, 'self-test');
  args.output ||= path.join(args.tmpDir, 'native-wrapper.json');
  args.jsOutput ||= path.join(args.tmpDir, 'native-wrapper.js');
  return args;
}

function printHelp() {
  console.log(`HoloShell native wrapper receipt

Usage:
  node scripts/holoshell-native-wrapper.mjs [options]

Options:
  --json              Print the wrapper receipt.
  --tmp-dir <path>    Receipt directory. Defaults to .tmp/holoshell.
  --output <path>     Receipt JSON path. Defaults to <tmp-dir>/native-wrapper.json.
  --js-output <path>  Browser bootstrap path. Defaults to <tmp-dir>/native-wrapper.js.
  --self-test         Use fixtures and assert invariants.
  -h, --help          Show this help.
`);
}

function resolveRepoPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(REPO_ROOT, filePath);
}

function toRepoPath(filePath) {
  const resolved = resolveRepoPath(filePath);
  const relative = path.relative(REPO_ROOT, resolved);
  return relative && !relative.startsWith('..') ? relative.replace(/\\/g, '/') : path.basename(resolved);
}

function readJson(filePath, fallback = {}) {
  const resolved = resolveRepoPath(filePath);
  if (!existsSync(resolved)) return fallback;
  try {
    return JSON.parse(readFileSync(resolved, 'utf8'));
  } catch (error) {
    return {
      schemaVersion: 'hololand.holoshell.read-error.v0.1.0',
      generatedAt: new Date().toISOString(),
      path: toRepoPath(resolved),
      error: error.message,
    };
  }
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
  writeFileSync(resolved, `window.HOLOSHELL_NATIVE_WRAPPER = ${payload};\n`, 'utf8');
  return resolved;
}

function sha256(value) {
  return createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function sourceManifest(fixtures = null) {
  if (fixtures?.sources) return fixtures.sources;
  const entries = [
    ['wrapperSource', SOURCE_ANCHORS.source, true],
    ['founderHostSource', SOURCE_ANCHORS.founderHostSource, true],
    ['wrapperRoot', SOURCE_ANCHORS.wrapperRoot, true],
    ['windowsLauncher', SOURCE_ANCHORS.windowsLauncher, true],
    ['windowsCommandShim', SOURCE_ANCHORS.windowsCommandShim, true],
    ['previewHost', SOURCE_ANCHORS.previewHost, true],
  ];

  return entries.map(([id, filePath, required]) => ({
    id,
    path: filePath,
    required,
    present: existsSync(resolveRepoPath(filePath)),
  }));
}

function browserCandidates(fixtures = null) {
  if (fixtures?.browserCandidates) return fixtures.browserCandidates;
  const candidates = [
    { family: 'chrome', source: 'env.CHROME', path: process.env.CHROME || '' },
    { family: 'chrome', source: 'program_files', path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
    { family: 'chrome', source: 'program_files_x86', path: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' },
    { family: 'edge', source: 'program_files', path: 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe' },
    { family: 'edge', source: 'program_files_x86', path: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' },
  ];
  return candidates
    .filter((candidate) => candidate.path)
    .map((candidate) => ({
      family: candidate.family,
      source: candidate.source,
      present: existsSync(candidate.path),
    }));
}

function statusFrom({ sourceReady, launcherPresent, commandShimPresent, previewHostPresent, browserCandidateCount }) {
  if (!sourceReady || !launcherPresent || !commandShimPresent || !previewHostPresent) return 'blocked_missing_source';
  if (!browserCandidateCount) return 'wrapper_present_browser_missing';
  return 'launchable_wrapper_present';
}

function createReceipt(args, fixtures = null) {
  const generatedAt = new Date().toISOString();
  const sources = sourceManifest(fixtures);
  const requiredSources = sources.filter((source) => source.required);
  const sourceReady = requiredSources.every((source) => source.present);
  const launcherPresent = sources.some((source) => source.id === 'windowsLauncher' && source.present);
  const commandShimPresent = sources.some((source) => source.id === 'windowsCommandShim' && source.present);
  const previewHostPresent = sources.some((source) => source.id === 'previewHost' && source.present);
  const browsers = browserCandidates(fixtures);
  const availableBrowsers = browsers.filter((candidate) => candidate.present);
  const status = statusFrom({
    sourceReady,
    launcherPresent,
    commandShimPresent,
    previewHostPresent,
    browserCandidateCount: availableBrowsers.length,
  });
  const founderHost = fixtures?.founderHost || readJson(path.join(args.tmpDir, 'founder-host.json'), {});
  const startupIntegrationPresent = false;
  const localMutationExecutionEnabled = false;
  const launchable = status === 'launchable_wrapper_present';
  const nextMove = launchable ? 'wire_startup_integration_with_approval' : 'install_chromium_or_repair_launcher';
  const hashInput = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    status,
    sourceReady,
    launcherPresent,
    commandShimPresent,
    previewHostPresent,
    browserCandidateCount: availableBrowsers.length,
    startupIntegrationPresent,
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    sourceAnchors: SOURCE_ANCHORS,
    summary: {
      status,
      platform: process.platform,
      sourceReady,
      requiredSourceCount: requiredSources.length,
      requiredSourcePresentCount: requiredSources.filter((source) => source.present).length,
      launcherPresent,
      commandShimPresent,
      previewHostPresent,
      browserCandidateCount: availableBrowsers.length,
      primaryBrowserFamily: availableBrowsers[0]?.family || 'none',
      launchMode: 'chromium_app_mode',
      launchable,
      startsWithoutManualHtml: launchable,
      startupIntegrationPresent,
      localMutationExecutionEnabled,
      primarySurfaceOwnership: 'native_wrapper_candidate',
      founderHostStatus: founderHost?.summary?.status || 'unknown',
      nextMove,
    },
    sources,
    browsers,
    launcher: {
      script: SOURCE_ANCHORS.windowsLauncher,
      commandShim: SOURCE_ANCHORS.windowsCommandShim,
      surface: SOURCE_ANCHORS.previewHost,
      profileDir: '.tmp/holoshell/native-profile',
      commandPreview: [
        'apps/holoshell/native/windows/Start-HoloShellFounderHost.ps1',
        '-RefreshReceipts',
      ],
      rawBrowserPathIncluded: false,
      rawCommandLineIncluded: false,
    },
    policy: {
      localOnly: true,
      appModeOnly: true,
      launcherMayOpenHoloShell: true,
      launcherMayClaimOsReplacement: false,
      startupRegistrationRequiresApproval: true,
      explorerShellReplacementRequiresSeparateNativePlan: true,
      daemonExecuteDisabledByDefault: true,
      appMutationsRequireApprovalBundle: true,
      destructiveActionsAllowed: false,
    },
    receipt: {
      wrapperSnapshotHash: sha256(JSON.stringify(hashInput)),
      launchPerformed: false,
      startupRegistered: false,
      serviceMutationTaken: false,
      destructiveActionsTaken: false,
      rawBrowserPathIncluded: false,
      rawCommandLineIncluded: false,
    },
  };
}

function selfTestFixtures() {
  return {
    sources: [
      ['wrapperSource', SOURCE_ANCHORS.source, true, true],
      ['founderHostSource', SOURCE_ANCHORS.founderHostSource, true, true],
      ['wrapperRoot', SOURCE_ANCHORS.wrapperRoot, true, true],
      ['windowsLauncher', SOURCE_ANCHORS.windowsLauncher, true, true],
      ['windowsCommandShim', SOURCE_ANCHORS.windowsCommandShim, true, true],
      ['previewHost', SOURCE_ANCHORS.previewHost, true, true],
    ].map(([id, filePath, required, present]) => ({ id, path: filePath, required, present })),
    browserCandidates: [{ family: 'chrome', source: 'fixture', present: true }],
    founderHost: { summary: { status: 'native_host_present' } },
  };
}

function assertSelfTest(receipt) {
  const failures = [];
  if (receipt.schemaVersion !== SCHEMA_VERSION) failures.push('schemaVersion mismatch');
  if (receipt.summary.status !== 'launchable_wrapper_present') failures.push(`unexpected status ${receipt.summary.status}`);
  if (receipt.summary.launchable !== true) failures.push('wrapper should be launchable');
  if (receipt.summary.startsWithoutManualHtml !== true) failures.push('wrapper should start without manual HTML open');
  if (receipt.summary.startupIntegrationPresent !== false) failures.push('startup integration should be absent in fixture');
  if (receipt.summary.localMutationExecutionEnabled !== false) failures.push('execute must default disabled');
  if (receipt.policy.launcherMayClaimOsReplacement !== false) failures.push('wrapper must not claim OS replacement');
  if (receipt.policy.startupRegistrationRequiresApproval !== true) failures.push('startup registration must require approval');
  if (receipt.receipt.launchPerformed !== false) failures.push('receipt check must not launch');
  if (receipt.receipt.destructiveActionsTaken !== false) failures.push('self-test must be non-destructive');
  if (receipt.receipt.rawCommandLineIncluded !== false) failures.push('raw command must stay hidden');
  if (!receipt.receipt.wrapperSnapshotHash) failures.push('missing wrapper hash');
  if (failures.length) throw new Error(`Self-test failed:\n- ${failures.join('\n- ')}`);
}

try {
  const args = parseArgs();
  const receipt = createReceipt(args, args.selfTest ? selfTestFixtures() : null);
  if (args.selfTest) assertSelfTest(receipt);
  const output = writeJson(args.output, receipt);
  const jsOutput = writeBrowserBootstrap(args.jsOutput, receipt);

  if (args.json) {
    console.log(JSON.stringify(receipt, null, 2));
  } else {
    console.log(`HoloShell native wrapper: ${output}`);
    console.log(`HoloShell native wrapper browser bootstrap: ${jsOutput}`);
    console.log(`Status: ${receipt.summary.status}`);
    console.log(`Launchable: ${receipt.summary.launchable ? 'yes' : 'no'}`);
    console.log(`Launcher: ${receipt.summary.launcherPresent ? 'present' : 'missing'}`);
    console.log(`Browser candidates: ${receipt.summary.browserCandidateCount}`);
    console.log(`Startup integration: ${receipt.summary.startupIntegrationPresent ? 'present' : 'missing'}`);
    console.log(`Next: ${receipt.summary.nextMove}`);
  }
} catch (error) {
  console.error(`holoshell-native-wrapper failed: ${error.message}`);
  process.exit(1);
}
