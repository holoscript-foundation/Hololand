import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const tempDir = mkdtempSync(join(tmpdir(), 'holoshell-terminal-coupling-'));
const terminalReceiptPath = join(tempDir, 'operator-terminal.json');
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
    HOLOSHELL_OPERATOR_TERMINAL_RECEIPT: terminalReceiptPath,
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
  assert.equal(liveStatus.route.operatorTerminalSessionEndpoint, 'GET /api/operator-terminal/session');
  assert.equal(liveStatus.route.operatorTerminalReportEndpoint, 'POST /api/operator-terminal/report');
  assert.ok(liveStatus.capabilities.includes('browser_terminal_coupling'));
  assert.ok(liveStatus.capabilities.includes('operator_terminal_session'));

  const session = await getJson('/api/operator-terminal/session');
  assert.equal(session.schemaVersion, 'hololand.holoshell.browser-terminal-coupling.v0.1.0');
  assert.equal(session.source, 'apps/holoshell/source/holoshell-browser-terminal-coupling.hsplus');
  assert.equal(session.sessionId, 'test-browser-terminal-session');
  assert.equal(session.status, 'coupled');
  assert.equal(session.browser.status, 'ready');
  assert.equal(session.browser.operatorTerminalSessionEndpoint, 'GET /api/operator-terminal/session');
  assert.equal(session.terminal.status, 'ready');
  assert.equal(session.terminal.receiptStatus, 'fresh');
  assert.equal(session.terminal.receiptHash, 'terminal-test-hash');
  assert.equal(session.terminal.refreshCommand, 'node scripts/holoshell-operator-terminal.mjs --agent --json');
  assert.deepEqual(session.sharedMemory.requiredFields, ['goal', 'files_read', 'files_changed', 'tests_run', 'receipts', 'blockers', 'next_command']);
  assert.equal(session.safety.browserIsPrimaryConversationSurface, true);
  assert.equal(session.safety.terminalIsExecutionEvidenceSurface, true);
  assert.equal(session.safety.directTerminalMutationAllowed, false);
  assert.equal(session.safety.endpointMayExecuteTerminalCommand, false);
  assert.equal(session.safety.terminalSpawnedByEndpoint, false);
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

  const capsule = await getJson('/api/cockpit/capsule');
  assert.equal(capsule.route.operatorTerminalSessionEndpoint, 'GET /api/operator-terminal/session');
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
  assert.equal(capsule.receipts.operatorTerminalReceiptHash, 'terminal-post-hash');
  assert.equal(capsule.safety.browserTerminalCouplingRequires.includes('shared_session_id'), true);

  const source = readFileSync(resolve('apps/holoshell/source/holoshell-browser-terminal-coupling.hsplus'), 'utf8');
  assert.match(source, /composition "HoloShell Browser Terminal Coupling"/);
  assert.match(source, /OneSessionTwoSurfaces/);
  assert.match(source, /TerminalCannotBypassHoloGate/);

  const launcher = readFileSync(resolve('scripts/brittney-studio-launch.ps1'), 'utf8');
  assert.match(launcher, /\[switch\]\$NoTerminal/);
  assert.match(launcher, /node scripts\\holoshell-operator-terminal\.mjs/);
  assert.match(launcher, /pnpm run holoshell:operator-terminal/);
  assert.match(launcher, /-WindowStyle Normal/);

  const compileSource = readFileSync(resolve('packages/holoshell/compile.mjs'), 'utf8');
  assert.match(compileSource, /cockpit-terminal/);
  assert.match(compileSource, /operator_terminal/);

  const operateRoomSource = readFileSync(resolve('packages/holoshell/scenes/operate-room.holo'), 'utf8');
  assert.match(operateRoomSource, /browser_terminal_coupling_source/);
  assert.match(operateRoomSource, /GET \/api\/operator-terminal\/session/);
} finally {
  if (server.exitCode === null) {
    server.kill();
  }
  rmSync(tempDir, { recursive: true, force: true });
}
