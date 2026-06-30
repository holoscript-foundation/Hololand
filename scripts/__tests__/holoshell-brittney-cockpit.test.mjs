import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const port = 9070 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;
const tmpDir = mkdtempSync(join(tmpdir(), 'holoshell-cockpit-'));

execFileSync(process.execPath, [
  'scripts/holoshell-legacy-window-inventory.mjs',
  '--self-test',
  '--output',
  join(tmpDir, 'legacy-window-inventory.json'),
  '--js-output',
  join(tmpDir, 'legacy-window-inventory.js'),
], { cwd: process.cwd(), stdio: 'pipe' });

execFileSync(process.execPath, [
  'scripts/holoshell-operator-brief.mjs',
  '--self-test',
  '--output',
  join(tmpDir, 'operator-brief.json'),
  '--js-output',
  join(tmpDir, 'operator-brief.js'),
], { cwd: process.cwd(), stdio: 'pipe' });

const server = spawn(process.execPath, ['packages/holoshell/serve.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    HOLOSHELL_SERVE_HOST: '127.0.0.1',
    HOLOSHELL_SERVE_PORT: String(port),
    HOLOSHELL_TMP_DIR: tmpDir,
    HOLOSCRIPT_API_KEY: '',
    HOLOSCRIPT_MCP_API_KEY: '',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stdout = '';
let stderr = '';
server.stdout.on('data', (chunk) => { stdout += chunk; });
server.stderr.on('data', (chunk) => { stderr += chunk; });

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`HoloShell server exited early (${server.exitCode})\n${stdout}\n${stderr}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/substrate-pressure`, {
        signal: AbortSignal.timeout(1500),
      });
      if (response.ok) return;
    } catch {
      await delay(250);
    }
  }
  throw new Error(`Timed out waiting for HoloShell server\n${stdout}\n${stderr}`);
}

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return body;
}

async function postJson(path, payload) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return body;
}

try {
  await waitForServer();

  const liveStatus = await getJson('/api/live-status');
  assert.equal(liveStatus.status, 'online');
  assert.equal(liveStatus.route.cockpitCapsuleEndpoint, 'GET /api/cockpit/capsule');
  assert.equal(liveStatus.route.laptopReasoningReportEndpoint, 'POST /api/laptop-reasoning/report');
  assert.equal(liveStatus.route.windowAwarenessReportEndpoint, 'POST /api/window-awareness/report');
  assert.equal(liveStatus.route.holoclawRuntimeBridgeEndpoint, 'GET /api/holoclaw/runtime-bridge');
  assert.equal(liveStatus.route.holoclawRuntimeBridgeWorkflowEndpoint, 'POST /workflow/holoclaw-runtime-bridge');
  assert.ok(liveStatus.capabilities.includes('brittney_desktop_cockpit'));
  assert.ok(liveStatus.capabilities.includes('holoclaw_runtime_bridge_status'));
  assert.equal(liveStatus.holoclawRuntimeBridge.directExecutionAllowed, false);

  const holoclawRuntime = await getJson('/api/holoclaw/runtime-bridge');
  assert.equal(holoclawRuntime.schemaVersion, 'hololand.holoshell.holoclaw-runtime-bridge-status.v0.1.0');
  assert.equal(holoclawRuntime.source, 'apps/holoshell/source/holoshell-holoclaw-runtime-bridge.hsplus');
  assert.equal(holoclawRuntime.statusEndpoint, 'GET /api/holoclaw/runtime-bridge');
  assert.equal(holoclawRuntime.controlDaemonRoute, 'POST /workflow/holoclaw-runtime-bridge');
  assert.equal(holoclawRuntime.directExecutionAllowed, false);
  assert.equal(holoclawRuntime.endpointExecutesRuntime, false);
  assert.equal(holoclawRuntime.openClawRuntimeBackendAllowed, false);
  assert.equal(holoclawRuntime.nemoClawRuntimeBackendAllowed, false);

  const laptopReport = await postJson('/api/laptop-reasoning/report', {
    schemaVersion: 'hololand.holoshell.laptop-reasoning-result.v0.1.0',
    resultId: 'laptop_reasoning_result_http_fixture',
    generatedAt: new Date().toISOString(),
    status: 'completed',
    sourceAnchors: {
      workerScript: 'scripts/holoshell-laptop-reasoning-worker.mjs',
    },
    inputDispatch: {
      dispatchId: 'hsdispatch-http-fixture',
      lane: 'laptop-hardware',
    },
    result: {
      modelInvocationPerformed: false,
      deterministicReceiptOnly: true,
      reasoningExecutionMode: 'receipt_consumption_only',
    },
    brittneyPingback: {
      status: 'ready_for_brittney',
    },
    summary: {
      status: 'completed',
      resultId: 'laptop_reasoning_result_http_fixture',
      dispatchId: 'hsdispatch-http-fixture',
      lane: 'laptop-hardware',
      reasoningExecutionMode: 'receipt_consumption_only',
      modelInvocationPerformed: false,
      deterministicReceiptOnly: true,
      laptopGpuStatus: 'reported',
      laptopGpuSummary: 'Fixture RTX: 0% GPU, 256/6144 MiB, no compute process reported',
      laptopGpuProcessCount: 0,
      brittneyPingbackStatus: 'ready_for_brittney',
    },
  });
  assert.equal(laptopReport.schemaVersion, 'hololand.holoshell.laptop-reasoning-report-response.v0.1.0');
  assert.equal(laptopReport.status, 'completed');
  assert.equal(laptopReport.resultId, 'laptop_reasoning_result_http_fixture');
  assert.equal(laptopReport.lane, 'laptop-hardware');
  assert.equal(laptopReport.modelInvocationPerformed, false);
  assert.equal(laptopReport.brittneyPingbackStatus, 'ready_for_brittney');

  const reportedLiveStatus = await getJson('/api/live-status');
  assert.equal(reportedLiveStatus.laptopReasoning.status, 'completed');
  assert.equal(reportedLiveStatus.laptopReasoning.resultId, 'laptop_reasoning_result_http_fixture');
  assert.equal(reportedLiveStatus.laptopReasoning.gpuStatus, 'reported');
  assert.equal(reportedLiveStatus.laptopReasoning.pingbackStatus, 'ready_for_brittney');

  const windowReport = await postJson(
    '/api/window-awareness/report',
    JSON.parse(readFileSync(join(tmpDir, 'legacy-window-inventory.json'), 'utf8')),
  );
  assert.equal(windowReport.schemaVersion, 'hololand.holoshell.window-awareness-report-response.v0.1.0');
  assert.equal(windowReport.status, 'windows_visible');
  assert.equal(windowReport.visibleWindowCount >= 1, true);
  assert.equal(windowReport.rawWindowTitlesIncluded, false);

  const capsule = await getJson('/api/cockpit/capsule');
  assert.equal(capsule.schemaVersion, 'hololand.holoshell.brittney-cockpit-capsule.v0.1.0');
  assert.equal(capsule.source, 'apps/holoshell/source/holoshell-brittney-desktop-cockpit.hsplus');
  assert.equal(capsule.status, 'ready');
  assert.equal(capsule.mode, 'read_only_operator_capsule');
  assert.equal(capsule.destructiveActionsTaken, false);
  assert.equal(capsule.desktopAutomationExecuted, false);
  assert.equal(capsule.summary.cockpitLaneCount, capsule.cockpitLanes.length);
  assert.equal(capsule.summary.actionCardCount, capsule.actionCards.length);
  assert.equal(capsule.summary.windowActionCardCount, 3);
  assert.equal(capsule.summary.preflightPathCount, 3);
  assert.ok(capsule.cockpitLanes.some((lane) => lane.id === 'runtime_truth' && lane.permissionEnvelope === 'read_only'));
  assert.ok(capsule.cockpitLanes.some((lane) => lane.id === 'route_health' && lane.sourceEndpoint === 'GET /api/cockpit/capsule'));
  assert.ok(capsule.cockpitLanes.some((lane) => lane.id === 'context_carry' && /goal, files, tests/.test(lane.detail)));
  assert.ok(capsule.cockpitLanes.some((lane) => lane.id === 'desktop_bridge' && lane.receiptRequired === true));
  assert.ok(capsule.cockpitLanes.some((lane) => lane.id === 'laptop_reasoning' && lane.permissionEnvelope === 'read_only'));
  assert.ok(capsule.cockpitLanes.some((lane) => lane.id === 'fara_peer_automation' && lane.permissionEnvelope === 'read_only'));
  assert.ok(capsule.cockpitLanes.some((lane) =>
    lane.id === 'holoclaw_runtime' &&
    lane.permissionEnvelope === 'guarded_execute' &&
    lane.sourceEndpoint === 'GET /api/holoclaw/runtime-bridge' &&
    lane.directExecutionAllowed === false
  ));
  assert.ok(capsule.cockpitLanes.some((lane) => lane.id === 'window_awareness' && lane.permissionEnvelope === 'read_only'));
  assert.equal(capsule.summary.holoclawRuntimeBridgeStatus, holoclawRuntime.status);
  assert.equal(capsule.holoclawRuntimeBridge.statusEndpoint, 'GET /api/holoclaw/runtime-bridge');
  assert.equal(capsule.summary.laptopReasoningLane, 'laptop-hardware');
  assert.equal(capsule.summary.laptopReasoningModelInvocationPerformed, false);
  assert.equal(capsule.summary.laptopReasoningPingbackStatus, 'ready_for_brittney');
  assert.equal(capsule.laptopReasoning.lane, 'laptop-hardware');
  assert.ok(capsule.actionCards.some((card) => card.id === 'desktop_control_plan' && card.permissionEnvelope === 'read_only_plan'));
  assert.ok(capsule.actionCards.some((card) => card.id === 'laptop_reasoning_status' && card.lane === 'laptop-hardware'));
  assert.ok(capsule.actionCards.some((card) => card.id === 'fara_peer_automation_pulse' && card.href === '/api/fara-peer-chat/automation-pulse'));
  assert.ok(capsule.actionCards.some((card) => card.id === 'fara_peer_automation_schedule' && card.permissionEnvelope === 'read_only_receipt_schedule'));
  assert.ok(capsule.actionCards.some((card) =>
    card.id === 'holoclaw_runtime_bridge_status' &&
    card.href === '/api/holoclaw/runtime-bridge' &&
    card.mayExecuteWithoutConsent === true &&
    card.endpointExecutesRuntime === false
  ));
  assert.ok(capsule.actionCards.some((card) =>
    card.id === 'holoclaw_runtime_bridge_workflow' &&
    card.href === '/workflow/holoclaw-runtime-bridge' &&
    card.permissionEnvelope === 'guarded_execute' &&
    card.mayExecuteWithoutConsent === false
  ));
  assert.ok(capsule.actionCards.some((card) => card.id === 'context_capsule' && card.href === '/api/cockpit/capsule'));
  assert.equal(capsule.faraPeerAutomation.schedule.status, 'disabled');
  assert.ok(capsule.windowAwareness);
  assert.equal(capsule.windowAwareness.status, 'windows_visible');
  assert.equal(capsule.windowAwareness.summary.rawWindowTitlesIncluded, false);
  assert.equal(capsule.windowAwareness.summary.peerWindowCount, 2);
  assert.equal(capsule.windowAwareness.summary.shellWindowCount, 1);
  assert.ok(capsule.windowAwareness.activeWindow?.rawTitleHidden);
  assert.ok(capsule.windowAwareness.windows.every((window) => window.rawTitleHidden === true));
  assert.ok(capsule.windowAwareness.operatorNextActions.length > 0);
  const focusCard = capsule.actionCards.find((card) => card.id === 'focus_window_preflight');
  const launchCard = capsule.actionCards.find((card) => card.id === 'launch_app_preflight');
  const openUrlCard = capsule.actionCards.find((card) => card.id === 'open_url_preflight');
  assert.equal(focusCard.primaryAction, 'focus_window');
  assert.equal(launchCard.primaryAction, 'launch_app');
  assert.equal(openUrlCard.primaryAction, 'open_url');
  for (const card of [focusCard, launchCard, openUrlCard]) {
    assert.equal(card.planOnly, true);
    assert.equal(card.holoGateRequired, true);
    assert.equal(card.mayExecuteWithoutConsent, false);
    assert.equal(card.preflightPath.planOnlyUntilConsentToken, true);
    assert.deepEqual(card.preflightPath.requiredSequence, [
      'desktop_control_plan',
      'laptop_bridge_preflight',
      'fresh_gesture_proof',
      'consent_token',
      'execution_receipt',
    ]);
  }
  assert.equal(openUrlCard.preflightPath.admittedExecutor, true);
  assert.equal(focusCard.preflightPath.allOtherDesktopActionsRemainPlanOnly, true);
  assert.ok(capsule.actionCards.some((card) => card.id.startsWith('focus_window_window-') && card.target?.rawTitleHidden === true));
  assert.deepEqual(capsule.safety.admittedExecutorActions, ['open_url']);
  assert.equal(capsule.safety.allOtherDesktopActionsRemainPlanOnly, true);
  assert.equal(capsule.safety.rawWindowTitlesHidden, true);
  assert.equal(capsule.safety.destructiveActionsTaken, false);
  assert.ok(capsule.contextCapsuleTemplate.requiredFields.includes('next_command'));
  assert.ok(capsule.contextCapsuleTemplate.memoryInputs.includes('knowledge_store'));
  assert.match(capsule.nextSafeStep, /preflight -> consent-token -> receipt/);

  const hsplusSource = readFileSync(resolve('apps/holoshell/source/holoshell-brittney-desktop-cockpit.hsplus'), 'utf8');
  assert.match(hsplusSource, /composition "HoloShell Brittney Desktop Cockpit"/);
  assert.match(hsplusSource, /DesktopMutationStaysBehindHoloGate/);
  assert.match(hsplusSource, /ContextCapsuleCarriesIdentityAcrossCompaction/);
  assert.match(hsplusSource, /WindowAwarePreflightCards/);
  assert.match(hsplusSource, /LaptopReasoningPingbackIsVisible/);
  assert.match(hsplusSource, /FaraPeerAutomationIsVisibleButNonMutating/);
  assert.match(hsplusSource, /HoloClawRuntimeVisibleBehindConsent/);
  assert.match(hsplusSource, /GET \/api\/holoclaw\/runtime-bridge/);
  assert.match(hsplusSource, /BrowserRefreshPreservesOperatorSession/);
  assert.match(hsplusSource, /holoshell:brittney:browser-session:v1/);

  const operateRoomSource = readFileSync(resolve('packages/holoshell/scenes/operate-room.holo'), 'utf8');
  assert.match(operateRoomSource, /brittney_cockpit_source/);
  assert.match(operateRoomSource, /laptop_reasoning_lane: "laptop-hardware"/);
  assert.match(operateRoomSource, /GET \/api\/cockpit\/capsule/);

  const compileSource = readFileSync(resolve('packages/holoshell/compile.mjs'), 'utf8');
  assert.match(compileSource, /brittney-cockpit/);
  assert.match(compileSource, /loadCockpitCapsule/);
  assert.match(compileSource, /cockpit-reasoning/);
  assert.match(compileSource, /laptop_reasoning_status/);
  assert.match(compileSource, /_inspectHoloClawRuntimeBridge/);
  assert.match(compileSource, /\/api\/holoclaw\/runtime-bridge/);
  assert.match(compileSource, /HOLOSHELL_BROWSER_STATE_SCHEMA/);
  assert.match(compileSource, /holoshell:brittney:browser-session:v1/);
  assert.match(compileSource, /_restoreBrowserSession/);
  assert.match(compileSource, /localStorage/);
  assert.match(compileSource, /cockpit-action-cards/);
  assert.match(compileSource, /\/api\/cockpit\/capsule/);
} finally {
  if (server.exitCode === null) {
    server.kill();
  }
}
