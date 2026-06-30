import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const port = 9070 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;
const tmpDir = mkdtempSync(join(tmpdir(), 'holoshell-cockpit-'));
const sovereignQueueFixture = join(tmpDir, 'sovereign-room-queue.json');

writeFileSync(sovereignQueueFixture, `${JSON.stringify({
  openCount: 2,
  claimableOpenCount: 2,
  tasks: [
    {
      id: 'task_local_fixture',
      title: '[local] test sovereign room from cockpit',
      status: 'open',
      priority: 50,
      tags: ['local', 'sovereign'],
      claimable: true,
    },
    {
      id: 'task_cloud_fixture',
      title: '[cloud] provider work',
      status: 'open',
      priority: 80,
      tags: ['cloud'],
      claimable: true,
    },
  ],
}, null, 2)}\n`, 'utf8');

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
    HOLOSHELL_ALLOW_QUEUE_FIXTURE: '1',
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
  assert.equal(liveStatus.route.browserSessionStateEndpoint, 'GET/POST /api/browser-session/state');
  assert.equal(liveStatus.route.holoclawRuntimeBridgeEndpoint, 'GET /api/holoclaw/runtime-bridge');
  assert.equal(liveStatus.route.holoclawRuntimeBridgeWorkflowEndpoint, 'POST /workflow/holoclaw-runtime-bridge');
  assert.equal(liveStatus.route.sovereignRoomMarathonEndpoint, 'GET /api/sovereign-room/marathon');
  assert.equal(liveStatus.route.sovereignRoomMarathonWorkflowEndpoint, 'POST /workflow/sovereign-room-marathon');
  assert.ok(liveStatus.capabilities.includes('brittney_desktop_cockpit'));
  assert.ok(liveStatus.capabilities.includes('browser_session_snapshot'));
  assert.ok(liveStatus.capabilities.includes('sovereign_room_marathon_status'));
  assert.ok(liveStatus.capabilities.includes('sovereign_room_marathon_receipt_refresh'));
  assert.ok(liveStatus.capabilities.includes('holoclaw_runtime_bridge_status'));
  assert.equal(liveStatus.sovereignRoomMarathon.directExecutionAllowed, false);
  assert.equal(liveStatus.holoclawRuntimeBridge.directExecutionAllowed, false);

  const initialSovereignRoom = await getJson('/api/sovereign-room/marathon');
  assert.equal(initialSovereignRoom.schemaVersion, 'hololand.holoshell.sovereign-room-marathon-status.v0.1.0');
  assert.equal(initialSovereignRoom.source, 'apps/holoshell/source/holoshell-sovereign-room-marathon.hsplus');
  assert.equal(initialSovereignRoom.statusEndpoint, 'GET /api/sovereign-room/marathon');
  assert.equal(initialSovereignRoom.controlDaemonRoute, 'POST /workflow/sovereign-room-marathon');
  assert.equal(initialSovereignRoom.directExecutionAllowed, false);
  assert.equal(initialSovereignRoom.endpointExecutesRuntime, false);

  const stagedSovereignRoom = await postJson('/workflow/sovereign-room-marathon', {
    intent: 'Review local sovereign queue from the browser without claiming it.',
    taskLane: 'local',
    taskTag: 'local',
    queueFixture: sovereignQueueFixture,
  });
  assert.equal(stagedSovereignRoom.schemaVersion, 'hololand.holoshell.sovereign-room-marathon-response.v0.1.0');
  assert.equal(stagedSovereignRoom.directExecutionAllowed, false);
  assert.equal(stagedSovereignRoom.endpointExecutesRuntime, false);
  assert.equal(stagedSovereignRoom.destructiveActionsTaken, false);
  assert.equal(stagedSovereignRoom.sovereignRoomMarathon.schemaVersion, 'hololand.holoshell.sovereign-room-marathon.v0.1.0');
  assert.equal(stagedSovereignRoom.summary.taskLane, 'local');
  assert.equal(stagedSovereignRoom.summary.taskTag, 'local');
  assert.equal(stagedSovereignRoom.summary.cloudEscalationAllowed, false);
  assert.equal(stagedSovereignRoom.summary.claimAttempted, false);
  assert.equal(stagedSovereignRoom.summary.status, 'ready_to_claim');
  assert.equal(stagedSovereignRoom.summary.selectedTaskId, 'task_local_fixture');

  const latestSovereignRoom = await getJson('/workflow/sovereign-room-marathon/latest');
  assert.equal(latestSovereignRoom.schemaVersion, 'hololand.holoshell.sovereign-room-marathon.v0.1.0');
  assert.equal(latestSovereignRoom.receiptId, stagedSovereignRoom.receiptId);

  const stagedSovereignRoomStatus = await getJson('/api/sovereign-room/marathon');
  assert.equal(stagedSovereignRoomStatus.receiptObserved, true);
  assert.equal(stagedSovereignRoomStatus.matchedCandidateCount, 1);
  assert.equal(stagedSovereignRoomStatus.selectedTaskId, 'task_local_fixture');
  assert.equal(stagedSovereignRoomStatus.claimAttempted, false);

  const holoclawRuntime = await getJson('/api/holoclaw/runtime-bridge');
  assert.equal(holoclawRuntime.schemaVersion, 'hololand.holoshell.holoclaw-runtime-bridge-status.v0.1.0');
  assert.equal(holoclawRuntime.source, 'apps/holoshell/source/holoshell-holoclaw-runtime-bridge.hsplus');
  assert.equal(holoclawRuntime.statusEndpoint, 'GET /api/holoclaw/runtime-bridge');
  assert.equal(holoclawRuntime.controlDaemonRoute, 'POST /workflow/holoclaw-runtime-bridge');
  assert.equal(holoclawRuntime.directExecutionAllowed, false);
  assert.equal(holoclawRuntime.endpointExecutesRuntime, false);
  assert.equal(holoclawRuntime.openClawRuntimeBackendAllowed, false);
  assert.equal(holoclawRuntime.nemoClawRuntimeBackendAllowed, false);

  const stagedHoloClaw = await postJson('/workflow/holoclaw-runtime-bridge', {
    intent: 'Stage HoloClaw as the OpenClaw and NemoClaw replacement for a browser chat turn.',
    runtimeMode: 'tick',
    agentHandle: 'holoclaw',
  });
  assert.equal(stagedHoloClaw.schemaVersion, 'hololand.holoshell.holoclaw-runtime-bridge-response.v0.1.0');
  assert.equal(stagedHoloClaw.directExecutionAllowed, false);
  assert.equal(stagedHoloClaw.endpointExecutesRuntime, false);
  assert.equal(stagedHoloClaw.destructiveActionsTaken, false);
  assert.equal(stagedHoloClaw.holoclawRuntimeBridge.schemaVersion, 'hololand.holoshell.holoclaw-runtime-bridge.v0.1.0');
  assert.equal(stagedHoloClaw.holoclawRuntimeBridge.policy.openClawRuntimeBackendAllowed, false);
  assert.equal(stagedHoloClaw.holoclawRuntimeBridge.policy.nemoClawRuntimeBackendAllowed, false);

  const latestHoloClaw = await getJson('/workflow/holoclaw-runtime-bridge/latest');
  assert.equal(latestHoloClaw.schemaVersion, 'hololand.holoshell.holoclaw-runtime-bridge.v0.1.0');
  assert.equal(latestHoloClaw.summary.bridgeId, stagedHoloClaw.bridgeId);

  const stagedHoloClawRuntime = await getJson('/api/holoclaw/runtime-bridge');
  assert.equal(stagedHoloClawRuntime.receiptObserved, true);
  assert.equal(stagedHoloClawRuntime.bridgeId, stagedHoloClaw.bridgeId);
  assert.equal(stagedHoloClawRuntime.directExecutionAllowed, false);

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
  assert.ok(capsule.cockpitLanes.some((lane) =>
    lane.id === 'source_owned_state' &&
    lane.sourceEndpoint === 'apps/holoshell/source/holoshell-brittney-desktop-cockpit.hsplus' &&
    lane.permissionEnvelope === 'read_only_source_contract'
  ));
  assert.ok(capsule.cockpitLanes.some((lane) =>
    lane.id === 'browser_session' &&
    lane.sourceEndpoint === 'GET/POST /api/browser-session/state' &&
    lane.permissionEnvelope === 'read_only_snapshot'
  ));
  assert.ok(capsule.cockpitLanes.some((lane) => lane.id === 'desktop_bridge' && lane.receiptRequired === true));
  assert.ok(capsule.cockpitLanes.some((lane) => lane.id === 'laptop_reasoning' && lane.permissionEnvelope === 'read_only'));
  assert.ok(capsule.cockpitLanes.some((lane) => lane.id === 'fara_peer_automation' && lane.permissionEnvelope === 'read_only'));
  assert.ok(capsule.cockpitLanes.some((lane) =>
    lane.id === 'sovereign_room' &&
    lane.permissionEnvelope === 'read_only_receipt_refresh' &&
    lane.sourceEndpoint === 'GET /api/sovereign-room/marathon' &&
    lane.workflowEndpoint === 'POST /workflow/sovereign-room-marathon' &&
    lane.directExecutionAllowed === false &&
    lane.endpointExecutesRuntime === false
  ));
  assert.ok(capsule.cockpitLanes.some((lane) =>
    lane.id === 'holoclaw_runtime' &&
    lane.permissionEnvelope === 'guarded_execute' &&
    lane.sourceEndpoint === 'GET /api/holoclaw/runtime-bridge' &&
    lane.directExecutionAllowed === false
  ));
  assert.ok(capsule.cockpitLanes.some((lane) => lane.id === 'window_awareness' && lane.permissionEnvelope === 'read_only'));
  assert.equal(capsule.summary.sovereignRoomStatus, 'ready');
  assert.equal(capsule.summary.sovereignRoomReceiptObserved, true);
  assert.equal(capsule.summary.sovereignRoomMatchedCandidateCount, 1);
  assert.equal(capsule.summary.sovereignRoomSelectedTaskId, 'task_local_fixture');
  assert.equal(capsule.summary.sovereignRoomSelectedTaskTitle, '[local] test sovereign room from cockpit');
  assert.equal(capsule.summary.sourceOwnedStateStatus, 'ready');
  assert.equal(capsule.summary.sourceOwnedDomainCount, 5);
  assert.equal(capsule.summary.sourceOwnedSelectedTaskId, 'task_local_fixture');
  assert.equal(capsule.sourceOwnedState.schemaVersion, 'hololand.holoshell.source-owned-cockpit-state.v0.1.0');
  assert.deepEqual(capsule.sourceOwnedState.domains, ['agents', 'files', 'worlds', 'receipts', 'board_tasks']);
  assert.equal(capsule.sourceOwnedState.summary.sourceRequiredBeforeProjection, true);
  assert.equal(capsule.sourceOwnedState.summary.sourceFormatGapNamedBeforeAdapterWork, true);
  assert.equal(capsule.sourceOwnedState.files.legacyUiMayNotOwnBehavior, true);
  assert.ok(capsule.sourceOwnedState.files.sourceAnchors.includes('packages/holoshell/scenes/operate-room.holo'));
  assert.equal(capsule.sourceOwnedState.boardTasks.selectedTaskId, 'task_local_fixture');
  assert.equal(capsule.sourceOwnedState.boardTasks.browserMayClaimRoomTask, false);
  assert.equal(capsule.sourceOwnedState.uiProjection.role, 'adapter_projection_only');
  assert.equal(capsule.sovereignRoomMarathon.statusEndpoint, 'GET /api/sovereign-room/marathon');
  assert.equal(capsule.sovereignRoomMarathon.selectedTaskId, 'task_local_fixture');
  assert.equal(capsule.summary.holoclawRuntimeBridgeStatus, stagedHoloClawRuntime.status);
  assert.equal(capsule.holoclawRuntimeBridge.statusEndpoint, 'GET /api/holoclaw/runtime-bridge');
  assert.equal(capsule.summary.browserSessionStateStatus, 'waiting');
  assert.equal(capsule.summary.browserSessionSnapshotStatus, 'empty');
  assert.equal(capsule.browserSessionState.snapshotStatus, 'empty');
  assert.equal(capsule.summary.laptopReasoningLane, 'laptop-hardware');
  assert.equal(capsule.summary.laptopReasoningModelInvocationPerformed, false);
  assert.equal(capsule.summary.laptopReasoningPingbackStatus, 'ready_for_brittney');
  assert.equal(capsule.laptopReasoning.lane, 'laptop-hardware');
  assert.ok(capsule.actionCards.some((card) => card.id === 'desktop_control_plan' && card.permissionEnvelope === 'read_only_plan'));
  assert.ok(capsule.actionCards.some((card) => card.id === 'laptop_reasoning_status' && card.lane === 'laptop-hardware'));
  assert.ok(capsule.actionCards.some((card) =>
    card.id === 'source_owned_state' &&
    card.permissionEnvelope === 'read_only_source_contract' &&
    card.primaryAction === 'inspect_source_owned_state'
  ));
  assert.ok(capsule.actionCards.some((card) =>
    card.id === 'sovereign_room_status' &&
    card.href === '/api/sovereign-room/marathon' &&
    card.mayExecuteWithoutConsent === true &&
    card.endpointExecutesRuntime === false
  ));
  assert.ok(capsule.actionCards.some((card) =>
    card.id === 'sovereign_room_receipt_refresh' &&
    card.href === '/workflow/sovereign-room-marathon' &&
    card.permissionEnvelope === 'read_only_receipt_refresh' &&
    card.defaultTaskLane === 'local' &&
    card.defaultTaskTag === 'local' &&
    card.cloudEscalationAllowed === false &&
    card.mayExecuteWithoutConsent === true &&
    card.endpointExecutesRuntime === false
  ));
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
  assert.ok(capsule.actionCards.some((card) =>
    card.id === 'browser_session_state' &&
    card.href === '/api/browser-session/state' &&
    card.permissionEnvelope === 'read_only_snapshot'
  ));
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
  assert.equal(capsule.safety.sovereignRoomBrowserClaimAllowed, false);
  assert.ok(capsule.safety.sovereignRoomClaimRequires.includes('terminal_or_control_daemon'));
  assert.equal(capsule.safety.sourceRequiredBeforeProjection, true);
  assert.equal(capsule.safety.sourceFormatGapNamedBeforeAdapterWork, true);
  assert.equal(capsule.safety.legacyUiMayNotOwnBehavior, true);
  assert.equal(capsule.safety.rawWindowTitlesHidden, true);
  assert.equal(capsule.safety.destructiveActionsTaken, false);
  assert.equal(capsule.receipts.latestSovereignRoomMarathonStatus, 'ready_to_claim');
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
  assert.match(hsplusSource, /SovereignRoomMarathonVisibleAsLocalReceipt/);
  assert.match(hsplusSource, /POST \/workflow\/sovereign-room-marathon/);
  assert.match(hsplusSource, /HoloClawRuntimeVisibleBehindConsent/);
  assert.match(hsplusSource, /GET \/api\/holoclaw\/runtime-bridge/);
  assert.match(hsplusSource, /BrowserRefreshPreservesOperatorSession/);
  assert.match(hsplusSource, /GET\/POST \/api\/browser-session\/state/);
  assert.match(hsplusSource, /window\.localStorage \+ local HoloShell snapshot endpoint/);
  assert.match(hsplusSource, /ParallelChatWorkspacesStayIsolated/);
  assert.match(hsplusSource, /SourceOwnedStateBeforeProjection/);
  assert.match(hsplusSource, /sourceOwnedStateSchema: "hololand\.holoshell\.source-owned-cockpit-state\.v0\.1\.0"/);
  assert.match(hsplusSource, /sourceOwnedDomains: \["agents", "files", "worlds", "receipts", "board_tasks"\]/);
  assert.match(hsplusSource, /browserChatWorkspaceIds: \["brittney", "sovereign", "holoclaw", "terminal", "improvement"\]/);
  assert.match(hsplusSource, /holoshell:brittney:browser-session:v1/);

  const operateRoomSource = readFileSync(resolve('packages/holoshell/scenes/operate-room.holo'), 'utf8');
  assert.match(operateRoomSource, /brittney_cockpit_source/);
  assert.match(operateRoomSource, /source_owned_state_schema: "hololand\.holoshell\.source-owned-cockpit-state\.v0\.1\.0"/);
  assert.match(operateRoomSource, /laptop_reasoning_lane: "laptop-hardware"/);
  assert.match(operateRoomSource, /GET \/api\/cockpit\/capsule/);

  const compileSource = readFileSync(resolve('packages/holoshell/compile.mjs'), 'utf8');
  assert.match(compileSource, /brittney-cockpit/);
  assert.match(compileSource, /loadCockpitCapsule/);
  assert.match(compileSource, /cockpit-reasoning/);
  assert.match(compileSource, /laptop_reasoning_status/);
  assert.match(compileSource, /_inspectSovereignRoomMarathon/);
  assert.match(compileSource, /_sendSovereignRoomChat/);
  assert.match(compileSource, /\/workflow\/sovereign-room-marathon/);
  assert.match(compileSource, /Sovereign Room/);
  assert.match(compileSource, /_inspectHoloClawRuntimeBridge/);
  assert.match(compileSource, /\/api\/holoclaw\/runtime-bridge/);
  assert.match(compileSource, /HOLOSHELL_BROWSER_STATE_SCHEMA/);
  assert.match(compileSource, /holoshell:brittney:browser-session:v1/);
  assert.match(compileSource, /HOLOSHELL_CHAT_WORKSPACES/);
  assert.match(compileSource, /transcriptByChat/);
  assert.match(compileSource, /parallel-chat-stack/);
  assert.match(compileSource, /_sendHoloClawChat/);
  assert.match(compileSource, /\/workflow\/holoclaw-runtime-bridge/);
  assert.match(compileSource, /_restoreBrowserSession/);
  assert.match(compileSource, /_hydrateBrowserSessionFromServer/);
  assert.match(compileSource, /\/api\/browser-session\/state/);
  assert.match(compileSource, /localStorage/);
  assert.match(compileSource, /cockpit-action-cards/);
  assert.match(compileSource, /sourceOwnedState/);
  assert.match(compileSource, /cockpit-source/);
  assert.match(compileSource, /\/api\/cockpit\/capsule/);
} finally {
  if (server.exitCode === null) {
    server.kill();
  }
}
