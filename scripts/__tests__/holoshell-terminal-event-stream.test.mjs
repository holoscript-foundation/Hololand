import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import {
  buildTerminalEventStream,
  eventsFromOperatorTerminalReceipt,
  readTerminalEventLog,
} from '../holoshell-terminal-event-stream.mjs';

const tempDir = mkdtempSync(join(tmpdir(), 'holoshell-terminal-events-'));
const receiptPath = join(tempDir, 'operator-terminal.json');
const eventLogPath = join(tempDir, 'operator-terminal-events.jsonl');
const outPath = join(tempDir, 'operator-terminal-events.json');

const receipt = {
  schemaVersion: 'hololand.holoshell.operator-terminal.v0.1.0',
  generatedAt: '2026-06-30T06:30:00.000Z',
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
  receipt: {
    terminalHash: 'terminal-event-test-hash',
  },
};

writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

const events = eventsFromOperatorTerminalReceipt(receipt, {
  sessionId: 'terminal-event-test-session',
  sourceReceipt: receiptPath,
});
assert.equal(events.length, 3);
assert.deepEqual(events.map((event) => event.type), ['process', 'artifact', 'command_catalog']);
assert.equal(events.every((event) => event.endpointExecutesCommand === false), true);
assert.equal(events.every((event) => event.destructiveActionsTaken === false), true);
assert.equal(events.every((event) => event.desktopAutomationExecuted === false), true);
assert.equal(events[2].commandCount, 2);

const firstStream = buildTerminalEventStream({
  receiptPath,
  eventLogPath,
  sessionId: 'terminal-event-test-session',
});
assert.equal(firstStream.schemaVersion, 'hololand.holoshell.terminal-event-stream.v0.1.0');
assert.equal(firstStream.status, 'ready');
assert.equal(firstStream.appendOnly, true);
assert.equal(firstStream.appendedEventCount, 3);
assert.equal(firstStream.eventCount, 3);
assert.equal(firstStream.latestReceiptHash, 'terminal-event-test-hash');
assert.equal(firstStream.browserRunCardsReady, true);
assert.deepEqual(firstStream.eventTypes, ['artifact', 'command_catalog', 'process']);

const secondStream = buildTerminalEventStream({
  receiptPath,
  eventLogPath,
  sessionId: 'terminal-event-test-session',
});
assert.equal(secondStream.appendedEventCount, 0);
assert.equal(secondStream.eventCount, 3);
assert.equal(readTerminalEventLog(eventLogPath).length, 3);

const cli = spawnSync(process.execPath, [
  'scripts/holoshell-terminal-event-stream.mjs',
  '--receipt',
  receiptPath,
  '--event-log',
  eventLogPath,
  '--session-id',
  'terminal-event-test-session',
  '--out',
  outPath,
  '--check',
  '--json',
], {
  cwd: process.cwd(),
  encoding: 'utf8',
});
assert.equal(cli.status, 0, `${cli.stdout}\n${cli.stderr}`);
const cliReceipt = JSON.parse(readFileSync(outPath, 'utf8'));
assert.equal(cliReceipt.status, 'ready');
assert.equal(cliReceipt.eventCount, 3);
assert.equal(cliReceipt.appendedEventCount, 0);
assert.equal(cliReceipt.endpointExecutesCommand, false);
assert.equal(cliReceipt.destructiveActionsTaken, false);
assert.equal(cliReceipt.desktopAutomationExecuted, false);

const port = 9490 + Math.floor(Math.random() * 200);
const serverReceiptPath = join(tempDir, 'server-operator-terminal.json');
const serverEventLogPath = join(tempDir, 'server-operator-terminal-events.jsonl');
writeFileSync(serverReceiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
const server = spawn(process.execPath, ['packages/holoshell/serve.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    HOLOSHELL_SERVE_HOST: '127.0.0.1',
    HOLOSHELL_SERVE_PORT: String(port),
    HOLOSHELL_SESSION_ID: 'terminal-event-server-session',
    HOLOSHELL_OPERATOR_TERMINAL_RECEIPT: serverReceiptPath,
    HOLOSHELL_OPERATOR_TERMINAL_EVENT_LOG: serverEventLogPath,
    HOLOSCRIPT_API_KEY: '',
    HOLOSCRIPT_MCP_API_KEY: '',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stdout = '';
let stderr = '';
server.stdout.on('data', (chunk) => { stdout += chunk; });
server.stderr.on('data', (chunk) => { stderr += chunk; });

async function fetchJson(pathname) {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`);
  assert.equal(response.status, 200, `${pathname} -> ${response.status}`);
  return response.json();
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`HoloShell server exited early (${server.exitCode})\n${stdout}\n${stderr}`);
    }
    try {
      await fetchJson('/api/live-status');
      return;
    } catch {
      await delay(100);
    }
  }
  throw new Error(`HoloShell server did not start\n${stdout}\n${stderr}`);
}

try {
  await waitForServer();
  const liveStatus = await fetchJson('/api/live-status');
  assert.equal(liveStatus.route.operatorTerminalEventsEndpoint, 'GET /api/operator-terminal/events');
  assert.ok(liveStatus.capabilities.includes('operator_terminal_event_stream'));

  const firstEvents = await fetchJson('/api/operator-terminal/events');
  assert.equal(firstEvents.status, 'ready');
  assert.equal(firstEvents.sessionId, 'terminal-event-server-session');
  assert.equal(firstEvents.appendedEventCount, 3);
  assert.equal(firstEvents.eventCount, 3);
  assert.equal(firstEvents.endpointExecutesCommand, false);

  const secondEvents = await fetchJson('/api/operator-terminal/events');
  assert.equal(secondEvents.status, 'ready');
  assert.equal(secondEvents.appendedEventCount, 0);
  assert.equal(secondEvents.eventCount, 3);

  const session = await fetchJson('/api/operator-terminal/session');
  assert.equal(session.browser.operatorTerminalEventsEndpoint, 'GET /api/operator-terminal/events');
  assert.equal(session.terminal.eventStreamEndpoint, 'GET /api/operator-terminal/events');
  assert.equal(session.terminal.eventStreamStatus, 'ready');
  assert.equal(session.terminal.eventStreamEventCount, 3);
  assert.equal(session.refreshRecovery.terminalEvidenceStreamStatus, 'polling_enabled');
  assert.equal(session.refreshRecovery.terminalEvidenceEventStreamStatus, 'ready');
  assert.equal(session.refreshRecovery.terminalEvidenceEventStreamEndpoint, 'GET /api/operator-terminal/events');
  assert.ok(session.refreshRecovery.rehydrateFrom.includes('GET /api/operator-terminal/events'));
} finally {
  server.kill();
}

console.log('PASS holoshell-terminal-event-stream');
