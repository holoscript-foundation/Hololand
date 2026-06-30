import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const tempDir = mkdtempSync(join(tmpdir(), 'holoshell-terminal-coupling-'));
const terminalReceiptPath = join(tempDir, 'operator-terminal.json');
const browserSessionStatePath = join(tempDir, 'browser-session-state.json');
const browserSessionStateDir = join(tempDir, 'browser-sessions');
writeFileSync(terminalReceiptPath, `${JSON.stringify({
  schemaVersion: 'hololand.holoshell.operator-terminal.v0.1.0',
  generatedAt: new Date().toISOString(),
  route: {
    primarySurfaceUrl: 'http://holojetson.local:8747',
    laptopBridgeStatus: 'ready',
  },
  summary: {
    mode: 'agent',
    status: 'ready',
  },
  commands: {
    human: [
      {
        id: 'ask_brittney',
        label: 'Ask Brittney',
        flow: 'brittney_turn',
        permissionEnvelope: 'read_only_or_guarded_by_intent',
        approvalRequired: 'classified_by_intent',
        receipt: '.tmp/holoshell/brittney-turn-latest.json',
      },
      {
        id: 'build_world',
        label: 'Build World',
        flow: 'world_build_custody',
        permissionEnvelope: 'guarded_execute',
        approvalRequired: true,
        receipt: '.tmp/holoshell/build-custody.json',
      },
      {
        id: 'show_receipts',
        label: 'Show Receipts',
        flow: 'receipt_control',
        permissionEnvelope: 'read_only',
        approvalRequired: false,
        receipt: '.tmp/holoshell/receipt-control-latest.json',
      },
    ],
  },
  humanContract: {
    labels: ['Ask Brittney', 'Show Receipts'],
  },
  agentContract: {
    jsonCommand: 'node scripts/holoshell-operator-terminal.mjs --agent --json',
  },
  receipt: {
    terminalHash: 'terminal-test-hash',
  },
}, null, 2)}\n`, 'utf8');

const port = 9270 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['packages/holoshell/serve.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    HOLOSHELL_SERVE_HOST: '127.0.0.1',
    HOLOSHELL_SERVE_PORT: String(port),
    HOLOSHELL_SESSION_ID: 'test-browser-terminal-session',
    HOLOSHELL_TMP_DIR: tempDir,
    HOLOSHELL_OPERATOR_TERMINAL_RECEIPT: terminalReceiptPath,
    HOLOSHELL_BROWSER_SESSION_STATE: browserSessionStatePath,
    HOLOSHELL_BROWSER_SESSION_STATE_DIR: browserSessionStateDir,
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

async function postJsonExpectStatus(path, payload, status) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json();
  assert.equal(response.status, status, JSON.stringify(body));
  return body;
}

try {
  await waitForServer();

  const liveStatus = await getJson('/api/live-status');
  assert.equal(liveStatus.route.operatorTerminalSessionEndpoint, 'GET /api/operator-terminal/session');
  assert.equal(liveStatus.route.operatorTerminalReportEndpoint, 'POST /api/operator-terminal/report');
  assert.equal(liveStatus.route.operatorTerminalGuardedExecuteEndpoint, 'POST /api/operator-terminal/execute');
  assert.equal(liveStatus.route.operatorTerminalApprovedAdapterExecuteEndpoint, 'POST /api/operator-terminal/run-approved');
  assert.equal(liveStatus.route.browserSessionStateEndpoint, 'GET/POST /api/browser-session/state?sessionId=:sessionId');
  assert.ok(liveStatus.capabilities.includes('browser_terminal_coupling'));
  assert.ok(liveStatus.capabilities.includes('operator_terminal_session'));
  assert.ok(liveStatus.capabilities.includes('operator_terminal_guarded_execute_receipts'));
  assert.ok(liveStatus.capabilities.includes('operator_terminal_approved_adapter_execution'));
  assert.ok(liveStatus.capabilities.includes('browser_session_snapshot'));

  const emptyBrowserState = await getJson('/api/browser-session/state');
  assert.equal(emptyBrowserState.schemaVersion, 'hololand.holoshell.browser-session-state.v0.1.0');
  assert.equal(emptyBrowserState.snapshotStatus, 'empty');
  assert.equal(emptyBrowserState.activeChatId, 'brittney');

  const session = await getJson('/api/operator-terminal/session');
  assert.equal(session.schemaVersion, 'hololand.holoshell.browser-terminal-coupling.v0.1.0');
  assert.equal(session.source, 'apps/holoshell/source/holoshell-browser-terminal-coupling.hsplus');
  assert.equal(session.sessionId, 'test-browser-terminal-session');
  assert.equal(session.status, 'coupled');
  assert.equal(session.browser.status, 'ready');
  assert.equal(session.browser.operatorTerminalSessionEndpoint, 'GET /api/operator-terminal/session');
  assert.equal(session.browser.operatorTerminalApprovedAdapterExecuteEndpoint, 'POST /api/operator-terminal/run-approved');
  assert.equal(session.terminal.status, 'ready');
  assert.equal(session.terminal.receiptStatus, 'fresh');
  assert.equal(session.terminal.receiptHash, 'terminal-test-hash');
  assert.equal(session.terminal.refreshCommand, 'node scripts/holoshell-operator-terminal.mjs --agent --json');
  assert.equal(session.terminal.guardedExecuteEndpoint, 'POST /api/operator-terminal/execute');
  assert.equal(session.terminal.approvedAdapterExecuteEndpoint, 'POST /api/operator-terminal/run-approved');
  assert.equal(session.terminal.approvedAdapterExecutionSchema, 'hololand.holoshell.operator-terminal-approved-adapter-execution.v0.1.0');
  assert.ok(session.terminal.approvedAdapterAllowlist.some((adapter) => adapter.commandId === 'build_world'));
  assert.equal(session.terminal.runCards.length, 4);
  assert.equal(session.runCards.length, 4);
  assert.equal(session.runCards[0].label, 'Refresh Terminal Receipt');
  assert.equal(session.runCards[0].browserMayExecuteCommand, false);
  assert.equal(session.runCards[0].endpointExecutesCommand, false);
  const buildWorldCard = session.runCards.find((card) => card.id === 'terminal_run_card:build_world');
  assert.equal(buildWorldCard.endpointExecutesCommand, false);
  assert.equal(buildWorldCard.endpointStagesGuardedExecutionReceipt, true);
  assert.equal(buildWorldCard.guardedExecuteEndpoint, 'POST /api/operator-terminal/execute');
  assert.equal(buildWorldCard.approvedAdapterAvailable, true);
  assert.equal(buildWorldCard.approvedAdapterExecuteEndpoint, 'POST /api/operator-terminal/run-approved');
  assert.equal(buildWorldCard.endpointExecutesApprovedAdapter, false);
  assert.equal(buildWorldCard.endpointExecutesRawCommand, false);
  assert.equal(session.symbiosis.mode, 'always_on_native_terminal_plus_browser');
  assert.equal(session.symbiosis.browserMayExecuteTerminalCommand, false);
  assert.equal(session.symbiosis.endpointMayExecuteTerminalCommand, false);
  assert.equal(session.symbiosis.endpointMayStageGuardedExecutionReceipt, true);
  assert.equal(session.symbiosis.endpointMayExecuteApprovedAdapter, true);
  assert.equal(session.refreshRecovery.status, 'enabled');
  assert.equal(session.refreshRecovery.browserStateKey, 'holoshell:brittney:browser-session:v1');
  assert.equal(session.refreshRecovery.browserSessionStateEndpoint, 'GET/POST /api/browser-session/state?sessionId=:sessionId');
  assert.equal(session.refreshRecovery.browserSessionSnapshotStatus, 'empty');
  assert.ok(session.refreshRecovery.rehydrateFrom.includes('GET /api/browser-session/state?sessionId=:sessionId'));
  assert.equal(session.refreshRecovery.terminalEvidenceStreamStatus, 'polling_enabled');
  assert.equal(session.refreshRecovery.terminalEvidencePollIntervalMs, 30000);
  assert.equal(session.refreshRecovery.browserRefreshMayResetTruth, false);
  assert.deepEqual(session.sharedMemory.requiredFields, ['goal', 'files_read', 'files_changed', 'tests_run', 'receipts', 'blockers', 'next_command']);
  assert.equal(session.sharedMemory.browserStateKey, 'holoshell:brittney:browser-session:v1');
  assert.equal(session.safety.browserIsPrimaryConversationSurface, true);
  assert.equal(session.safety.terminalIsExecutionEvidenceSurface, true);
  assert.equal(session.safety.directTerminalMutationAllowed, false);
  assert.equal(session.safety.endpointMayExecuteTerminalCommand, false);
  assert.equal(session.safety.endpointMayStageGuardedExecutionReceipt, true);
  assert.equal(session.safety.endpointMayExecuteApprovedAdapter, true);
  assert.equal(session.safety.terminalSpawnedByEndpoint, false);
  assert.equal(session.safety.adapterProcessMaySpawnFromEndpoint, true);
  assert.equal(session.destructiveActionsTaken, false);
  assert.equal(session.desktopAutomationExecuted, false);
  assert.match(session.nextSafeStep, /browser for Brittney chat and approvals/);

  const reported = await postJson('/api/operator-terminal/report', {
    schemaVersion: 'hololand.holoshell.operator-terminal.v0.1.0',
    generatedAt: new Date().toISOString(),
    route: {
      primarySurfaceUrl: 'http://holojetson.local:8747',
      laptopBridgeStatus: 'ready',
    },
    summary: {
      mode: 'agent',
      status: 'ready',
    },
    commands: {
      human: [
        {
          id: 'ask_brittney',
          label: 'Ask Brittney',
          flow: 'brittney_turn',
          permissionEnvelope: 'read_only_or_guarded_by_intent',
          approvalRequired: 'classified_by_intent',
          receipt: '.tmp/holoshell/brittney-turn-latest.json',
        },
        {
          id: 'build_world',
          label: 'Build World',
          flow: 'world_build_custody',
          permissionEnvelope: 'guarded_execute',
          approvalRequired: true,
          receipt: '.tmp/holoshell/build-custody.json',
        },
      ],
    },
    humanContract: {
      labels: ['Ask Brittney'],
    },
    agentContract: {
      jsonCommand: 'node scripts/holoshell-operator-terminal.mjs --agent --json',
    },
    receipt: {
      terminalHash: 'terminal-post-hash',
    },
  });
  assert.equal(reported.schemaVersion, 'hololand.holoshell.operator-terminal-report-response.v0.1.0');
  assert.equal(reported.status, 'ready');
  assert.equal(reported.receiptHash, 'terminal-post-hash');
  assert.equal(reported.destructiveActionsTaken, false);
  assert.equal(reported.desktopAutomationExecuted, false);
  assert.match(readFileSync(terminalReceiptPath, 'utf8'), /terminal-post-hash/);

  const reportedSession = await getJson('/api/operator-terminal/session');
  assert.equal(reportedSession.terminal.receiptHash, 'terminal-post-hash');

  const rejectedExecution = await postJsonExpectStatus('/api/operator-terminal/execute', {
    commandId: 'build_world',
    reason: 'test missing confirmation',
  }, 403);
  assert.equal(rejectedExecution.status, 'approval_required');
  assert.equal(rejectedExecution.executionAllowed, false);
  assert.equal(rejectedExecution.endpointExecutesCommand, false);
  assert.equal(rejectedExecution.destructiveActionsTaken, false);

  const stagedExecution = await postJson('/api/operator-terminal/execute', {
    commandId: 'build_world',
    confirmGuardedExecute: true,
    approvalReceipt: 'approval-test-receipt-123',
    reason: 'stage build custody from browser approval',
    requestedBy: 'browser-test',
  });
  assert.equal(stagedExecution.schemaVersion, 'hololand.holoshell.operator-terminal-guarded-execute.v0.1.0');
  assert.equal(stagedExecution.status, 'receipt_staged');
  assert.equal(stagedExecution.commandId, 'build_world');
  assert.equal(stagedExecution.executionAllowed, true);
  assert.equal(stagedExecution.endpointExecutesCommand, false);
  assert.equal(stagedExecution.endpointStagesGuardedExecutionReceipt, true);
  assert.equal(stagedExecution.destructiveActionsTaken, false);
  assert.equal(stagedExecution.receipt.execution.adapterSpawned, false);
  assert.match(readFileSync(join(tempDir, 'operator-terminal-guarded-execute-latest.json'), 'utf8'), /approval-test-receipt-123/);

  const rejectedApprovedExecution = await postJsonExpectStatus('/api/operator-terminal/run-approved', {
    executionId: stagedExecution.executionId,
    commandId: 'build_world',
    approvalReceipt: 'adapter-approval-test-456',
    reason: 'missing second confirmation',
  }, 403);
  assert.equal(rejectedApprovedExecution.status, 'approval_required');
  assert.equal(rejectedApprovedExecution.executionAllowed, false);
  assert.equal(rejectedApprovedExecution.endpointExecutesApprovedAdapter, false);
  assert.equal(rejectedApprovedExecution.endpointExecutesRawCommand, false);
  assert.equal(rejectedApprovedExecution.destructiveActionsTaken, false);

  const stagedAskBrittney = await postJson('/api/operator-terminal/execute', {
    commandId: 'ask_brittney',
    intentClass: 'guarded_execute',
    confirmGuardedExecute: true,
    approvalReceipt: 'approval-test-ask-brittney',
    reason: 'stage non-allowlisted guarded intent',
    requestedBy: 'browser-test',
  });
  assert.equal(stagedAskBrittney.status, 'receipt_staged');
  assert.equal(stagedAskBrittney.commandId, 'ask_brittney');

  const rejectedNonAllowlistedAdapter = await postJsonExpectStatus('/api/operator-terminal/run-approved', {
    executionId: stagedAskBrittney.executionId,
    commandId: 'ask_brittney',
    confirmApprovedAdapterExecution: true,
    approvalReceipt: 'adapter-approval-test-ask-brittney',
    reason: 'try to run non-allowlisted adapter',
  }, 403);
  assert.equal(rejectedNonAllowlistedAdapter.reason, 'operator_terminal_command_not_approved_for_adapter_execution');
  assert.equal(rejectedNonAllowlistedAdapter.executionAllowed, false);
  assert.equal(rejectedNonAllowlistedAdapter.endpointExecutesApprovedAdapter, false);
  assert.equal(rejectedNonAllowlistedAdapter.endpointExecutesRawCommand, false);
  assert.equal(rejectedNonAllowlistedAdapter.destructiveActionsTaken, false);

  const approvedAdapterExecution = await postJson('/api/operator-terminal/run-approved', {
    executionId: stagedExecution.executionId,
    commandId: 'build_world',
    confirmApprovedAdapterExecution: true,
    approvalReceipt: 'adapter-approval-test-456',
    reason: 'run allowlisted build custody adapter from staged receipt',
  });
  assert.equal(approvedAdapterExecution.schemaVersion, 'hololand.holoshell.operator-terminal-approved-adapter-execution.v0.1.0');
  assert.equal(approvedAdapterExecution.status, 'approved_adapter_executed');
  assert.equal(approvedAdapterExecution.commandId, 'build_world');
  assert.equal(approvedAdapterExecution.executionAllowed, true);
  assert.equal(approvedAdapterExecution.endpointExecutesCommand, false);
  assert.equal(approvedAdapterExecution.endpointExecutesApprovedAdapter, true);
  assert.equal(approvedAdapterExecution.endpointExecutesRawCommand, false);
  assert.equal(approvedAdapterExecution.adapterSpawned, true);
  assert.equal(approvedAdapterExecution.destructiveActionsTaken, false);
  assert.equal(approvedAdapterExecution.desktopAutomationExecuted, false);
  assert.equal(approvedAdapterExecution.receipt.adapter.ok, true);
  assert.equal(approvedAdapterExecution.receipt.adapter.allowedByServerAllowlist, true);
  assert.equal(approvedAdapterExecution.receipt.adapter.receiptObserved, true);
  assert.equal(approvedAdapterExecution.receipt.execution.browserMayExecuteTerminalCommand, false);
  assert.equal(approvedAdapterExecution.receipt.execution.endpointExecutesApprovedAdapter, true);
  assert.equal(approvedAdapterExecution.receipt.execution.endpointExecutesRawCommand, false);
  assert.match(readFileSync(join(tempDir, 'operator-terminal-approved-execution-latest.json'), 'utf8'), /adapter-approval-test-456/);
  assert.match(readFileSync(join(tempDir, 'build-custody.json'), 'utf8'), /hololand.holoshell.build-custody.v0.1.0/);

  const browserState = await postJson('/api/browser-session/state', {
    schemaVersion: 'hololand.holoshell.browser-session-state.v0.1.0',
    source: 'browser_cockpit_snapshot',
    activeChatId: 'terminal',
    expandedChatIds: ['holoclaw', 'terminal'],
    transcriptByChat: {
      terminal: [
        {
          type: 'message',
          who: 'You',
          text: 'persist terminal proof',
          color: '#58a6ff',
        },
      ],
      holoclaw: [
        {
          type: 'turn_card',
          title: 'HoloClaw runtime',
          lines: ['guarded runtime bridge visible'],
          tone: 'ready',
        },
      ],
    },
    evidenceLedger: [
      {
        kind: 'operator_terminal_session',
        chatId: 'terminal',
        status: 'coupled',
        receiptHash: 'terminal-post-hash',
        summary: 'server snapshot test',
        sourceEndpoint: 'GET /api/operator-terminal/session',
      },
    ],
    drafts: {
      chatInputs: {
        terminal: 'draft survives',
      },
    },
    runtime: {
      lastImprovementRunId: 'run_fixture',
    },
    updatedAt: new Date().toISOString(),
  });
  assert.equal(browserState.status, 'saved');
  assert.equal(browserState.snapshotStatus, 'saved');
  assert.equal(browserState.activeChatId, 'terminal');
  assert.equal(browserState.transcriptByChat.terminal[0].text, 'persist terminal proof');
  assert.equal(browserState.evidenceLedger[0].receiptHash, 'terminal-post-hash');
  assert.equal(browserState.destructiveActionsTaken, false);
  assert.equal(browserState.desktopAutomationExecuted, false);
  assert.match(readFileSync(browserSessionStatePath, 'utf8'), /persist terminal proof/);

  const savedBrowserState = await getJson('/api/browser-session/state');
  assert.equal(savedBrowserState.snapshotStatus, 'available');
  assert.equal(savedBrowserState.sessionScoped, false);
  assert.equal(savedBrowserState.activeChatId, 'terminal');
  assert.equal(savedBrowserState.drafts.chatInputs.terminal, 'draft survives');
  assert.equal(savedBrowserState.runtime.lastImprovementRunId, 'run_fixture');
  assert.equal(savedBrowserState.evidenceLedger[0].sourceEndpoint, 'GET /api/operator-terminal/session');

  const snapshotSession = await getJson('/api/operator-terminal/session');
  assert.equal(snapshotSession.refreshRecovery.browserSessionSnapshotStatus, 'available');

  const scopedBrowserState = await postJson('/api/browser-session/state?sessionId=holoclaw-alpha', {
    schemaVersion: 'hololand.holoshell.browser-session-state.v0.1.0',
    source: 'browser_cockpit_snapshot',
    sessionId: 'holoclaw-alpha',
    activeChatId: 'holoclaw',
    transcriptByChat: {
      holoclaw: [
        {
          type: 'message',
          who: 'HoloClaw',
          text: 'scoped holoclaw transcript survives',
          color: '#bc8cff',
        },
      ],
    },
    drafts: {
      chatInputs: {
        holoclaw: 'scoped holoclaw draft',
      },
    },
    updatedAt: new Date().toISOString(),
  });
  assert.equal(scopedBrowserState.snapshotStatus, 'saved');
  assert.equal(scopedBrowserState.sessionId, 'holoclaw-alpha');
  assert.equal(scopedBrowserState.sessionScoped, true);
  assert.equal(scopedBrowserState.storageKey, 'holoshell:brittney:browser-session:v1:holoclaw-alpha');
  assert.equal(scopedBrowserState.activeChatId, 'holoclaw');
  assert.match(readFileSync(join(browserSessionStateDir, 'holoclaw-alpha.json'), 'utf8'), /scoped holoclaw transcript/);

  const savedScopedBrowserState = await getJson('/api/browser-session/state?sessionId=holoclaw-alpha');
  assert.equal(savedScopedBrowserState.snapshotStatus, 'available');
  assert.equal(savedScopedBrowserState.sessionScoped, true);
  assert.equal(savedScopedBrowserState.activeChatId, 'holoclaw');
  assert.equal(savedScopedBrowserState.drafts.chatInputs.holoclaw, 'scoped holoclaw draft');

  const defaultBrowserStateAfterScopedWrite = await getJson('/api/browser-session/state');
  assert.equal(defaultBrowserStateAfterScopedWrite.activeChatId, 'terminal');
  assert.equal(defaultBrowserStateAfterScopedWrite.drafts.chatInputs.terminal, 'draft survives');

  const capsule = await getJson('/api/cockpit/capsule');
  assert.equal(capsule.route.operatorTerminalSessionEndpoint, 'GET /api/operator-terminal/session');
  assert.equal(capsule.route.browserSessionStateEndpoint, 'GET/POST /api/browser-session/state?sessionId=:sessionId');
  assert.ok(capsule.cockpitLanes.some((lane) =>
    lane.id === 'operator_terminal'
    && lane.status === 'ready'
    && lane.sourceEndpoint === 'GET /api/operator-terminal/session'
  ));
  assert.ok(capsule.actionCards.some((card) =>
    card.id === 'operator_terminal_session'
    && card.href === '/api/operator-terminal/session'
    && card.permissionEnvelope === 'read_only_projection'
  ));
  assert.equal(capsule.operatorTerminal.sessionId, 'test-browser-terminal-session');
  assert.equal(capsule.browserSessionState.snapshotStatus, 'available');
  assert.equal(capsule.receipts.operatorTerminalReceiptHash, 'terminal-post-hash');
  assert.equal(capsule.receipts.browserSessionSnapshotStatus, 'available');
  assert.equal(capsule.summary.browserSessionStateStatus, 'ready');
  assert.equal(capsule.summary.activeChatWorkspaceId, 'terminal');
  assert.equal(capsule.summary.browserEvidenceLedgerCount, 1);
  assert.equal(capsule.summary.operatorTerminalRunCardCount >= 2, true);
  assert.equal(capsule.summary.browserRefreshRecoveryStatus, 'enabled');
  assert.equal(capsule.receipts.operatorTerminalRunCardCount >= 2, true);
  assert.equal(capsule.safety.browserTerminalCouplingRequires.includes('shared_session_id'), true);

  const source = readFileSync(resolve('apps/holoshell/source/holoshell-browser-terminal-coupling.hsplus'), 'utf8');
  assert.match(source, /composition "HoloShell Browser Terminal Coupling"/);
  assert.match(source, /terminalVisibilityDefault: "hidden_receipt_refresh"/);
  assert.match(source, /visibleTerminalLaunchFlag: "-OperatorTerminal"/);
  assert.match(source, /laptopReceiptFreshnessAdapter: "scripts\/holoshell-laptop-receipt-freshness\.mjs"/);
  assert.match(source, /laptopReceiptFreshnessCommand: "pnpm run holoshell:laptop-receipt-freshness -- --watch --interval-ms 60000 --timeout-ms 60000 --json"/);
  assert.match(source, /receiptFreshnessWatchLog: "\.tmp\/holoshell\/laptop-receipt-freshness-watch\.log"/);
  assert.match(source, /OneSessionTwoSurfaces/);
  assert.match(source, /TerminalCannotBypassHoloGate/);
  assert.match(source, /NativeTerminalBrowserSymbiosis/);
  assert.match(source, /TerminalEvidenceStreamsToBrowser/);
  assert.match(source, /browserPollIntervalMs: 30000/);
  assert.match(source, /BrowserRefreshRehydratesFromReceipts/);
  assert.match(source, /BrowserSessionSnapshotMirrorsLocalStorage/);
  assert.match(source, /GET\/POST \/api\/browser-session\/state\?sessionId=:sessionId/);
  assert.match(source, /sessionScopedSnapshots: true/);
  assert.match(source, /TerminalRunCardsStayPresentable/);

  const launcher = readFileSync(resolve('scripts/brittney-studio-launch.ps1'), 'utf8');
  assert.match(launcher, /\[switch\]\$NoTerminal/);
  assert.match(launcher, /\[switch\]\$OperatorTerminal/);
  assert.match(launcher, /\$RefreshOperatorReceipt = \(-not \$Headless\) -and \(-not \$NoTerminal\)/);
  assert.match(launcher, /\$ShowOperatorTerminal = \$RefreshOperatorReceipt -and \$OperatorTerminal/);
  assert.match(launcher, /node scripts\\holoshell-laptop-receipt-freshness\.mjs --watch --interval-ms 60000 --timeout-ms 60000 --json/);
  assert.match(launcher, /pnpm run holoshell:laptop-receipt-freshness -- --watch --interval-ms 60000 --timeout-ms 60000 --json/);
  assert.match(launcher, /laptop-receipt-freshness-watch\.log/);
  assert.match(launcher, /node scripts\\holoshell-operator-terminal\.mjs/);
  assert.match(launcher, /pnpm run holoshell:operator-terminal/);
  assert.match(launcher, /-WindowStyle Hidden/);
  assert.match(launcher, /\$ShowOperatorTerminal[\s\S]+-WindowStyle Normal/);

  const compileSource = readFileSync(resolve('packages/holoshell/compile.mjs'), 'utf8');
  assert.match(compileSource, /cockpit-terminal/);
  assert.match(compileSource, /operator_terminal/);
  assert.match(compileSource, /evidenceLedger/);
  assert.match(compileSource, /_hydrateBrowserSessionFromServer/);
  assert.match(compileSource, /_browserSessionStateEndpoint/);
  assert.match(compileSource, /_browserStateStorageKey/);
  assert.match(compileSource, /\/api\/browser-session\/state/);
  assert.match(compileSource, /_rehydrateTerminalSessionFromServer/);
  assert.match(compileSource, /_startTerminalSessionEvidencePolling/);
  assert.match(compileSource, /visibilitychange/);
  assert.match(compileSource, /Evidence ledger/);
  assert.match(compileSource, /loadCockpitCapsule\(\)/);

  const operateRoomSource = readFileSync(resolve('packages/holoshell/scenes/operate-room.holo'), 'utf8');
  assert.match(operateRoomSource, /browser_terminal_coupling_source/);
  assert.match(operateRoomSource, /GET \/api\/operator-terminal\/session/);
} finally {
  if (server.exitCode === null) {
    server.kill();
  }
  rmSync(tempDir, { recursive: true, force: true });
}
