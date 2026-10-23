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
  upstreamTerminalEventStreamSnapshot,
} from '../holoshell-terminal-event-stream.mjs';

// HoloShell gates /api/* and /workflow/* behind x-phone-admin: a throwaway key for this local
// test server, inherited by the spawned server and any script it runs, and added to this
// process's loopback API calls.
process.env.HOLOSHELL_PHONE_ADMIN_KEY = `test-${globalThis.crypto.randomUUID()}`;
const unkeyedFetch = globalThis.fetch;
globalThis.fetch = (input, init = {}) => (/^http:\/\/127\.0\.0\.1:\d+\/(api|workflow)\//u.test(String(input?.url ?? input))
  ? unkeyedFetch(input, { ...init, headers: { ...(init.headers || {}), 'x-phone-admin': process.env.HOLOSHELL_PHONE_ADMIN_KEY } })
  : unkeyedFetch(input, init));

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
assert.deepEqual(events.map((event) => event.nativeEventKind), ['run.started', 'receipt.written', 'artifact.detected']);
assert.equal(events.every((event) => event.endpointExecutesCommand === false), true);
assert.equal(events.every((event) => event.destructiveActionsTaken === false), true);
assert.equal(events.every((event) => event.desktopAutomationExecuted === false), true);
assert.equal(events.every((event) => event.upstreamSource === 'HoloScript:experiments/holoshell-human-os-frontier/native-terminal-event-stream.hsplus'), true);
assert.equal(events.every((event) => event.requiredCapabilityLane === 'terminal_event_read'), true);
assert.equal(events[2].commandCount, 2);

const upstreamContract = upstreamTerminalEventStreamSnapshot();
assert.equal(upstreamContract.schemaVersion, 'holoscript.holoshell.native-terminal-event-stream.v0.1.0');
assert.equal(upstreamContract.source, 'HoloScript:experiments/holoshell-human-os-frontier/native-terminal-event-stream.hsplus');
assert.equal(upstreamContract.status, 'ready');
assert.equal(upstreamContract.requiredCapabilityLane, 'terminal_event_read');
assert.equal(upstreamContract.matchedEventKindCount, 7);
assert.deepEqual(upstreamContract.missingEventKinds, []);
assert.equal(upstreamContract.browserMayOwnExecution, false);

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
assert.equal(firstStream.upstreamSource, 'HoloScript:experiments/holoshell-human-os-frontier/native-terminal-event-stream.hsplus');
assert.equal(firstStream.upstreamSchemaVersion, 'holoscript.holoshell.native-terminal-event-stream.v0.1.0');
assert.equal(firstStream.upstreamContractStatus, 'ready');
assert.equal(firstStream.requiredCapabilityLane, 'terminal_event_read');
assert.equal(firstStream.browserMayOwnExecution, false);
assert.deepEqual(firstStream.eventTypes, ['artifact', 'command_catalog', 'process']);
assert.deepEqual(firstStream.nativeEventKinds, ['artifact.detected', 'receipt.written', 'run.started']);

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
assert.equal(cliReceipt.upstreamContractStatus, 'ready');

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
    HOLOSHELL_OPERATOR_TERMINAL_SSE_TICK_MS: '150',
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
  assert.equal(liveStatus.route.nativeTerminalEventStreamSource, 'HoloScript:experiments/holoshell-human-os-frontier/native-terminal-event-stream.hsplus');
  assert.equal(liveStatus.route.nativeTerminalEventStreamSchema, 'holoscript.holoshell.native-terminal-event-stream.v0.1.0');
  assert.ok(liveStatus.capabilities.includes('operator_terminal_event_stream'));
  assert.ok(liveStatus.capabilities.includes('native_terminal_event_stream'));

  const firstEvents = await fetchJson('/api/operator-terminal/events');
  assert.equal(firstEvents.status, 'ready');
  assert.equal(firstEvents.sessionId, 'terminal-event-server-session');
  assert.equal(firstEvents.appendedEventCount, 3);
  assert.equal(firstEvents.eventCount, 3);
  assert.equal(firstEvents.endpointExecutesCommand, false);
  assert.equal(firstEvents.upstreamContractStatus, 'ready');
  assert.equal(firstEvents.requiredCapabilityLane, 'terminal_event_read');
  assert.equal(firstEvents.browserMayOwnExecution, false);

  const secondEvents = await fetchJson('/api/operator-terminal/events');
  assert.equal(secondEvents.status, 'ready');
  assert.equal(secondEvents.appendedEventCount, 0);
  assert.equal(secondEvents.eventCount, 3);

  const session = await fetchJson('/api/operator-terminal/session');
  assert.equal(session.browser.operatorTerminalEventsEndpoint, 'GET /api/operator-terminal/events');
  assert.equal(session.terminal.eventStreamEndpoint, 'GET /api/operator-terminal/events');
  assert.equal(session.terminal.eventStreamStatus, 'ready');
  assert.equal(session.terminal.eventStreamEventCount, 3);
  assert.equal(session.terminal.upstreamEventStreamSource, 'HoloScript:experiments/holoshell-human-os-frontier/native-terminal-event-stream.hsplus');
  assert.equal(session.terminal.upstreamEventStreamSchema, 'holoscript.holoshell.native-terminal-event-stream.v0.1.0');
  assert.equal(session.terminal.upstreamEventStreamStatus, 'ready');
  assert.equal(session.terminal.requiredEventCapabilityLane, 'terminal_event_read');
  assert.equal(session.terminal.browserMayOwnExecution, false);
  assert.equal(session.refreshRecovery.terminalEvidenceStreamStatus, 'polling_enabled');
  assert.equal(session.refreshRecovery.terminalEvidenceEventStreamStatus, 'ready');
  assert.equal(session.refreshRecovery.terminalEvidenceEventStreamEndpoint, 'GET /api/operator-terminal/events');
  assert.equal(session.refreshRecovery.terminalEvidenceUpstreamStatus, 'ready');
  assert.ok(session.refreshRecovery.rehydrateFrom.includes('GET /api/operator-terminal/events'));
  assert.equal(session.browser.operatorTerminalEventsStreamEndpoint, 'GET /api/operator-terminal/events/stream');
  assert.equal(session.terminal.eventStreamPushEndpoint, 'GET /api/operator-terminal/events/stream');
  assert.equal(session.terminal.eventStreamPushTransport, 'sse');
  assert.equal(session.refreshRecovery.terminalEvidenceEventStreamPushEndpoint, 'GET /api/operator-terminal/events/stream');
  assert.equal(session.refreshRecovery.terminalEvidenceEventStreamPushTransport, 'sse');
  // Polling stays declared honestly as the fallback transport — SSE supplements it,
  // it does not silently overwrite what was already true.
  assert.equal(session.refreshRecovery.terminalEvidenceStreamStatus, 'polling_enabled');
  assert.equal(session.refreshRecovery.terminalEvidencePollIntervalMs, 30000);

  const liveStatusAfterSessionCheck = await fetchJson('/api/live-status');
  assert.equal(liveStatusAfterSessionCheck.route.operatorTerminalEventsStreamEndpoint, 'GET /api/operator-terminal/events/stream');
  assert.ok(liveStatusAfterSessionCheck.capabilities.includes('operator_terminal_event_stream_push'));

  // ── SSE push: real end-to-end proof, not a route-existence check ──
  // Open the stream ONCE, capture the initial snapshot, force the receipt to advance (a
  // new terminalHash mints new receipt-derived events), then assert the push arrives on
  // the SAME connection without the client ever issuing a second request — this is the
  // P0's actual claim ("replace 30-second polling"), not just "the endpoint responds".
  function makeSSEEventWaiter(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    return {
      async waitFor(predicate, timeoutMs = 5000) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
          const remaining = Math.max(50, deadline - Date.now());
          const { value, done } = await Promise.race([
            reader.read(),
            delay(remaining).then(() => ({ done: true, value: undefined, timedOut: true })),
          ]);
          if (done) {
            if (value === undefined) continue; // our own timeout race losing branch fired; keep polling until deadline
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          let boundary;
          while ((boundary = buffer.indexOf('\n\n')) !== -1) {
            const block = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const eventLine = block.split('\n').find((line) => line.startsWith('event: '));
            const dataLine = block.split('\n').find((line) => line.startsWith('data: '));
            if (eventLine && dataLine) {
              const message = { event: eventLine.slice(7), data: JSON.parse(dataLine.slice(6)) };
              if (predicate(message)) return message;
            }
          }
        }
        throw new Error('Timed out waiting for matching SSE message');
      },
      async close() {
        await reader.cancel().catch(() => {});
      },
    };
  }

  const sseController = new AbortController();
  const sseResponse = await fetch(`http://127.0.0.1:${port}/api/operator-terminal/events/stream`, {
    signal: sseController.signal,
  });
  assert.equal(sseResponse.status, 200);
  assert.match(sseResponse.headers.get('content-type') || '', /text\/event-stream/);

  const sseWaiter = makeSSEEventWaiter(sseResponse);
  try {
    const snapshotMessage = await sseWaiter.waitFor((message) => message.event === 'snapshot', 5000);
    assert.equal(snapshotMessage.data.status, 'ready');
    const snapshotLatestEventId = snapshotMessage.data.latestEventId;
    assert.ok(snapshotLatestEventId, 'snapshot should carry a latestEventId');

    // Advance the receipt WITHOUT the client making any further request — this is the
    // behavior 30s polling could not give the browser without a fresh fetch.
    const advancedReceipt = { ...receipt, receipt: { terminalHash: 'terminal-event-test-hash-sse-advance' } };
    writeFileSync(serverReceiptPath, `${JSON.stringify(advancedReceipt, null, 2)}\n`, 'utf8');

    const eventsMessage = await sseWaiter.waitFor((message) => message.event === 'events', 5000);
    assert.notEqual(eventsMessage.data.latestEventId, snapshotLatestEventId);
    assert.ok(eventsMessage.data.events.length > 0);
    assert.ok(eventsMessage.data.events.every((event) => event.receiptHash === 'terminal-event-test-hash-sse-advance'));
    assert.ok(eventsMessage.data.events.every((event) => event.endpointExecutesCommand === false));
  } finally {
    await sseWaiter.close();
    sseController.abort();
  }
} finally {
  server.kill();
}

console.log('PASS holoshell-terminal-event-stream');
