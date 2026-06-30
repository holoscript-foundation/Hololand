import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const port = 9290 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;
const receiptsDir = mkdtempSync(join(tmpdir(), 'holoshell-fara-peer-automation-'));
const server = spawn(process.execPath, ['packages/holoshell/serve.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    HOLOSHELL_SERVE_HOST: '127.0.0.1',
    HOLOSHELL_SERVE_PORT: String(port),
    HOLOSHELL_RECEIPTS_DIR: receiptsDir,
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

try {
  await waitForServer();

  const liveResponse = await fetch(`${baseUrl}/api/live-status`, {
    signal: AbortSignal.timeout(10_000),
  });
  const live = await liveResponse.json();
  assert.equal(liveResponse.status, 200, JSON.stringify(live));
  assert.equal(live.route.faraPeerAutomationEndpoint, 'POST /api/fara-peer-chat/automation-pulse');
  assert.equal(live.route.faraPeerAutomationHistoryEndpoint, 'GET /api/fara-peer-chat/automation-pulses');
  assert.ok(live.capabilities.includes('fara_peer_automation_pulse'));

  const pulseResponse = await fetch(`${baseUrl}/api/fara-peer-chat/automation-pulse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      objective: 'Keep HoloShell moving without desktop mutation',
      cadence: 'manual-test',
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const pulse = await pulseResponse.json();
  assert.equal(pulseResponse.status, 200, JSON.stringify(pulse));
  assert.equal(pulse.status, 'pulse_recorded');
  assert.equal(pulse.lane, 'fara_peer_chat');
  assert.deepEqual(pulse.participants, ['brittney', 'fara']);
  assert.equal(pulse.permissionEnvelope, 'read_only');
  assert.equal(pulse.approvalRequired, false);
  assert.equal(pulse.automationMode, 'receipt_and_proposals_only');
  assert.equal(pulse.hiddenAutomationAllowed, false);
  assert.equal(pulse.desktopMutationAllowed, false);
  assert.equal(pulse.destructiveActionsTaken, false);
  assert.equal(pulse.desktopAutomationExecuted, false);
  assert.ok(pulse.nextSafeActions.some((action) => action.operation === 'queue_codebase_fix_shakedown_batch'));
  assert.ok(pulse.nextSafeActions.every((action) => action.automationMayExecute === false));
  assert.ok(existsSync(pulse.receipt.receiptPath));

  const onDisk = JSON.parse(readFileSync(pulse.receipt.receiptPath, 'utf8'));
  assert.equal(onDisk.source, 'apps/holoshell/source/holoshell-fara-peer-automation.hsplus');
  assert.equal(onDisk.pulseId, pulse.pulseId);
  assert.equal(onDisk.receiptRequired, true);

  const historyResponse = await fetch(`${baseUrl}/api/fara-peer-chat/automation-pulses`, {
    signal: AbortSignal.timeout(10_000),
  });
  const history = await historyResponse.json();
  assert.equal(historyResponse.status, 200, JSON.stringify(history));
  assert.equal(history.items[0].pulseId, pulse.pulseId);
  assert.equal(history.items[0].permissionEnvelope, 'read_only');
  assert.equal(history.items[0].desktopAutomationExecuted, false);
} finally {
  server.kill();
  rmSync(receiptsDir, { recursive: true, force: true });
}
