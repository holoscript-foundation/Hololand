#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

const files = {
  source: 'apps/holoshell/source/holoshell-brittney-desktop-cockpit.hsplus',
  browserTerminalSource: 'apps/holoshell/source/holoshell-browser-terminal-coupling.hsplus',
  chatSource: 'apps/holoshell/source/holoshell-brittney-operator-chat.hsplus',
  launch: 'scripts/brittney-studio-launch.ps1',
  gateway: 'scripts/start-brittney.ts',
  terminal: 'scripts/holoshell-operator-terminal.mjs',
  serve: 'packages/holoshell/serve.mjs',
  compiler: 'packages/holoshell/compile.mjs',
  packageJson: 'package.json',
};

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

function requireIncludes(label, text, snippets, failures) {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      failures.push(`${label} missing ${snippet}`);
    }
  }
}

const source = read(files.source);
const browserTerminalSource = read(files.browserTerminalSource);
const chatSource = read(files.chatSource);
const launch = read(files.launch);
const gateway = read(files.gateway);
const terminal = read(files.terminal);
const serve = read(files.serve);
const compiler = read(files.compiler);
const packageJson = read(files.packageJson);
const failures = [];

requireIncludes('desktop cockpit source', source, [
  'desktopLaunchAdapter: "scripts/brittney-studio-launch.ps1"',
  'legacyGatewayAdapter: "scripts/start-brittney.ts"',
  'laptopReceiptFreshnessAdapter: "scripts/holoshell-laptop-receipt-freshness.mjs"',
  'operatorTerminalReceipt: ".tmp/holoshell/operator-terminal.json"',
  'laptopReceiptFreshnessWatchLog: ".tmp/holoshell/laptop-receipt-freshness-watch.log"',
  'sovereignRoomMarathonReceipt: ".tmp/holoshell/sovereign-room-marathon-latest.json"',
  'browserSessionStateSchema: "hololand.holoshell.browser-session-state.v0.1.0"',
  'browserSessionStateStorageKey: "holoshell:brittney:browser-session:v1"',
  'browserChatWorkspaceIds: ["brittney", "sovereign", "holoclaw", "terminal", "improvement"]',
  'sourceOwnedStateSchema: "hololand.holoshell.source-owned-cockpit-state.v0.1.0"',
  'sourceOwnedStateEndpoint: "GET /api/cockpit/capsule#sourceOwnedState"',
  'ChatWorkspace',
  'ParallelChatWorkspacesStayIsolated',
  'BrowserRefreshPreservesOperatorSession',
  'SourceOwnedStateBeforeProjection',
  'cockpitCapsuleReceiptSchema: "hololand.holoshell.brittney-cockpit-capsule.v0.1.0"',
  'desktopSurfaceRouteReceiptSchema: "hololand.holoshell.brittney-desktop-surface-route.v0.1.0"',
  'sovereignRoomMarathonSource: "apps/holoshell/source/holoshell-sovereign-room-marathon.hsplus"',
  'sovereignRoomMarathonStatusEndpoint: "GET /api/sovereign-room/marathon"',
  'SovereignRoomMarathonVisibleAsLocalReceipt',
  'holoclawRuntimeBridgeSource: "apps/holoshell/source/holoshell-holoclaw-runtime-bridge.hsplus"',
  'holoclawRuntimeBridgeStatusEndpoint: "GET /api/holoclaw/runtime-bridge"',
  'HoloClawRuntimeVisibleBehindConsent',
  'adapterMayOpenVisibleTerminalByDefault: false',
  'adapterMayRunLaptopReceiptFreshnessWatch: true',
  'visibleOperatorTerminalRequiresFlag: "-OperatorTerminal"',
  'hiddenReceiptRefreshDefault: true',
  'hiddenReceiptRefreshIntervalMs: 60000',
  'legacyUiRole: "adapter_projection_only"',
  'sourceRequiredBeforeProjection: true',
  'sourceFormatGapNamedBeforeAdapterWork: true',
  'legacyUiMayNotOwnBehavior: true',
  'routeProofCommand: "pnpm run check:brittney-desktop-source-contract"',
  'receiptRequired: true',
], failures);

requireIncludes('browser-terminal source', browserTerminalSource, [
  'guardedExecuteEndpoint: "POST /api/operator-terminal/execute"',
  'endpointMayStageGuardedExecutionReceipt: true',
  'GuardedTerminalExecutionStagesReceipts',
], failures);

requireIncludes('operator chat source', chatSource, [
  'runtimeSurface: "Brittney Studio desktop app"',
  'chatEndpoint: "POST /api/brittney/chat"',
  'desktopBridgeEndpoint: "GET /api/desktop-control/bridge"',
  'receiptRequired: true',
], failures);

requireIncludes('desktop launcher', launch, [
  "'Brittney Studio.lnk'",
  "$JetsonSurface = 'http://holojetson.local:8747'",
  "Start-Process $JetsonSurface",
  '[switch]$OperatorTerminal',
  '$RefreshOperatorReceipt = (-not $Headless) -and (-not $NoTerminal)',
  '$ShowOperatorTerminal = $RefreshOperatorReceipt -and $OperatorTerminal',
  'Keep the paired read-only laptop receipts fresh',
  "node scripts\\holoshell-laptop-receipt-freshness.mjs --watch --interval-ms 60000 --timeout-ms 60000 --json",
  'laptop-receipt-freshness-watch.log',
  "node scripts\\holoshell-operator-terminal.mjs",
  '-WindowStyle Hidden',
  'persistent operator terminal is still available with -OperatorTerminal',
  "[Brittney Studio] receipt: .tmp/holoshell/operator-terminal.json",
  'projection',
], failures);

for (const disallowed of [
  'packages/holoshell/serve.mjs',
  'holoshell:operate-room:serve',
  'pnpm run brittney',
]) {
  if (launch.includes(disallowed)) {
    failures.push(`desktop launcher should not own service runtime: found ${disallowed}`);
  }
}

requireIncludes('legacy Brittney gateway', gateway, [
  'HOLOSHELL_DESKTOP_SOURCE_CONTRACT',
  'apps/holoshell/source/holoshell-brittney-desktop-cockpit.hsplus',
  'BRITTNEY_PORT = 11435',
  'Primary inference: Ollama',
  'Compatibility routes are now available',
  'primaryInference',
], failures);

requireIncludes('operator terminal adapter', terminal, [
  "id: 'ask_brittney'",
  "adapter: 'scripts/holoshell-brittney-turn.mjs'",
  "receipt: '.tmp/holoshell/brittney-turn-latest.json'",
  "desktopBridgeStatus: 'ready'",
], failures);

requireIncludes('HoloShell server adapter', serve, [
  "const BRITTNEY_COCKPIT_SOURCE = 'apps/holoshell/source/holoshell-brittney-desktop-cockpit.hsplus'",
  "const BRITTNEY_COCKPIT_CAPSULE_SCHEMA = 'hololand.holoshell.brittney-cockpit-capsule.v0.1.0'",
  'buildSourceOwnedCockpitState',
  'sourceOwnedState',
  'read_only_source_contract',
  "'/api/cockpit/capsule'",
  "'/api/brittney/chat'",
  "'/api/operator-terminal/session'",
  "'/api/operator-terminal/execute'",
  'OPERATOR_TERMINAL_GUARDED_EXECUTE_SCHEMA',
  'buildOperatorTerminalGuardedExecuteReceipt',
  "'/api/sovereign-room/marathon'",
  "'/workflow/sovereign-room-marathon'",
  'stageSovereignRoomMarathonForChat',
  'sovereignRoomMarathonStatusSnapshot()',
  "'/api/holoclaw/runtime-bridge'",
  "'/workflow/holoclaw-runtime-bridge'",
  'stageHoloClawRuntimeBridgeForChat',
  'holoclawRuntimeBridgeStatusSnapshot()',
], failures);

requireIncludes('HoloShell compiler bridge', compiler, [
  "HOLOSHELL_BROWSER_STATE_SCHEMA = 'hololand.holoshell.browser-session-state.v0.1.0'",
  "HOLOSHELL_BROWSER_STATE_KEY = 'holoshell:brittney:browser-session:v1'",
  'HOLOSHELL_CHAT_WORKSPACES',
  'transcriptByChat',
  '_setActiveChat',
  '_sendSovereignRoomChat',
  '_sendHoloClawChat',
  '_inspectSovereignRoomMarathon',
  'parallel-chat-stack',
  '_restoreBrowserSession',
  '_rememberTranscript',
  '_persistCockpitCapsule',
  'sourceOwnedState',
  'cockpit-source',
  ], failures);

requireIncludes('package scripts', packageJson, [
  '"check:brittney-desktop-source-contract": "node scripts/check-brittney-desktop-source-contract.mjs"',
  '"test:holoshell-brittney-cockpit": "node scripts/__tests__/holoshell-brittney-cockpit.test.mjs"',
  '"test:holoshell-brittney-operator-chat-browser-receipt": "node scripts/__tests__/holoshell-brittney-operator-chat-browser-receipt.test.mjs"',
], failures);

if (failures.length > 0) {
  console.error('[brittney-desktop-source-contract] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[brittney-desktop-source-contract] ok');
console.log(`source: ${files.source}`);
console.log('route: desktop shortcut -> Jetson HoloShell surface -> laptop receipt freshness watch -> operator terminal receipt -> Sovereign Room status -> HoloClaw status -> HoloShell server receipts');
