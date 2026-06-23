import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const port = 9080 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;
const receiptsDir = mkdtempSync(join(tmpdir(), 'holoshell-improvement-runs-'));
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

  const queued = await fetch(`${baseUrl}/api/improvement-runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      objective: 'Improve HoloShell screen understanding and desktop automation routing',
      runCount: 12,
    }),
    signal: AbortSignal.timeout(80_000),
  });
  const body = await queued.json();
  assert.equal(queued.status, 200, JSON.stringify(body));
  assert.equal(body.status, 'queued');
  assert.equal(body.queuedRunCount, 12);
  assert.equal(body.destructiveActionsTaken, false);
  assert.equal(body.approvalRequiredForDesktopAutomation, true);
  assert.equal(body.routing.visionUnderstanding.lane, 'vision_language');
  assert.equal(body.routing.desktopAutomation.lane, 'fara_gui_grounding');
  assert.match(body.routing.visionUnderstanding.role, /no desktop actuation/);
  assert.match(body.routing.desktopAutomation.role, /desktop automation/);
  assert.ok(body.routing.visionUnderstanding.models.some((model) => /qwen3-vl|vision/i.test(`${model.model} ${model.role}`)));
  assert.ok(body.routing.visionUnderstanding.models.every((model) => !/holo-sdf|sdf|geometry|text-to-3d/i.test(`${model.model} ${model.role}`)));
  assert.ok(body.routing.desktopAutomation.models.some((model) => /fara|computer-use/i.test(`${model.model} ${model.role}`)));
  assert.ok(body.routingSummary.includes('vision='));
  assert.ok(body.routingSummary.includes('desktop='));
  assert.ok(existsSync(body.receipt.receiptPath));

  const historyResponse = await fetch(`${baseUrl}/api/improvement-runs`, {
    signal: AbortSignal.timeout(10_000),
  });
  const history = await historyResponse.json();
  assert.equal(historyResponse.status, 200, JSON.stringify(history));
  assert.equal(history.items[0].runId, body.runId);
  assert.equal(history.items[0].totalExecutedRunCount, 0);
  assert.equal(history.items[0].remainingRunCount, 12);
  assert.ok(history.items.some((item) => item.runId === body.runId));

  const bridgeResponse = await fetch(`${baseUrl}/api/desktop-control/bridge`, {
    signal: AbortSignal.timeout(10_000),
  });
  const bridge = await bridgeResponse.json();
  assert.equal(bridgeResponse.status, 200, JSON.stringify(bridge));
  assert.equal(bridge.destructiveActionsTaken, false);
  assert.equal(bridge.approvalRequiredForDesktopAutomation, true);
  assert.ok(bridge.capabilities.includes('gpu_telemetry_report'));

  const firstExecutionResponse = await fetch(`${baseUrl}/api/improvement-runs/${body.runId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shakedownCount: 10 }),
    signal: AbortSignal.timeout(80_000),
  });
  const firstExecution = await firstExecutionResponse.json();
  assert.equal(firstExecutionResponse.status, 200, JSON.stringify(firstExecution));
  assert.equal(firstExecution.status, 'completed_shakedown');
  assert.equal(firstExecution.executedRunCount, 10);
  assert.equal(firstExecution.totalExecutedRunCount, 10);
  assert.equal(firstExecution.remainingRunCount, 2);
  assert.equal(firstExecution.destructiveActionsTaken, false);
  assert.equal(firstExecution.desktopAutomationExecuted, false);
  assert.equal(firstExecution.approvalRequiredForDesktopAutomation, true);
  assert.equal(firstExecution.desktopBridge.destructiveActionsTaken, false);
  assert.equal(firstExecution.gpuBalancePlan.policy.keepFaraDesktopOnly, true);
  assert.ok(firstExecution.gpuBalancePlan.assignments.some((assignment) => assignment.lane === 'vision_language'));
  assert.ok(firstExecution.gpuBalancePlan.assignments.some((assignment) => assignment.lane === 'fara_gui_grounding' && assignment.preferredProcessor === 'laptop_desktop_bridge'));
  assert.equal(firstExecution.runResults.length, 10);
  assert.ok(firstExecution.runResults.every((result) => result.validation.status === 'passed'));
  assert.ok(firstExecution.runResults.every((result) => result.destructiveActionsTaken === false));
  assert.ok(existsSync(firstExecution.receipt.receiptPath));

  const secondExecutionResponse = await fetch(`${baseUrl}/api/improvement-runs/${body.runId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shakedownCount: 10 }),
    signal: AbortSignal.timeout(80_000),
  });
  const secondExecution = await secondExecutionResponse.json();
  assert.equal(secondExecutionResponse.status, 200, JSON.stringify(secondExecution));
  assert.equal(secondExecution.status, 'completed');
  assert.equal(secondExecution.executedRunCount, 2);
  assert.equal(secondExecution.totalExecutedRunCount, 12);
  assert.equal(secondExecution.remainingRunCount, 0);

  const detailResponse = await fetch(`${baseUrl}/api/improvement-runs/${body.runId}`, {
    signal: AbortSignal.timeout(10_000),
  });
  const detail = await detailResponse.json();
  assert.equal(detailResponse.status, 200, JSON.stringify(detail));
  assert.equal(detail.totalExecutedRunCount, 12);
  assert.equal(detail.remainingRunCount, 0);
  assert.equal(detail.executions.length, 2);

  const receiptText = readFileSync(body.receipt.receiptPath, 'utf8');
  assert.match(receiptText, /holoshell-improvement-run-loop\.hsplus/);
  assert.match(receiptText, /visionUnderstanding/);
  assert.match(receiptText, /desktopAutomation/);

  const serveSource = readFileSync(resolve('packages/holoshell/serve.mjs'), 'utf8');
  assert.match(serveSource, /buildNativeRunRouting/);
  assert.match(serveSource, /buildImprovementExecutionReceipt/);
  assert.match(serveSource, /desktopBridgeStatusSnapshot/);
  assert.match(serveSource, /buildGpuBalancePlan/);
  assert.match(serveSource, /approvalRequiredForDesktopAutomation/);

  const compileSource = readFileSync(resolve('packages/holoshell/compile.mjs'), 'utf8');
  assert.match(compileSource, /improvement-run-panel/);
  assert.match(compileSource, /api\/improvement-runs/);
  assert.match(compileSource, /executeLatestImprovementRun/);
  assert.match(compileSource, /improvement-history/);
} finally {
  if (server.exitCode === null) server.kill();
  rmSync(receiptsDir, { recursive: true, force: true });
}
