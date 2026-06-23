import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const port = 8870 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['packages/holoshell/serve.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    HOLOSHELL_SERVE_HOST: '127.0.0.1',
    HOLOSHELL_SERVE_PORT: String(port),
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

async function postChat(message) {
  const response = await fetch(`${baseUrl}/api/brittney/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, selfTest: true }),
    signal: AbortSignal.timeout(80_000),
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return body;
}

try {
  await waitForServer();

  const status = await postChat('whats the status of the system?');
  assert.match(status.reply, /System status: online/);
  assert.doesNotMatch(status.reply, /System status:\s*unknown/i);
  assert.doesNotMatch(status.reply, /Avatar status:\s*unknown/i);
  assert.doesNotMatch(status.reply, /No active capabilities/i);
  assert.doesNotMatch(status.reply, /NaN/);
  assert.equal(status.systemStatus.status, 'online');
  assert.ok(status.systemStatus.capabilityCount >= 4);
  assert.ok(status.systemStatus.laneCount >= 3);
  assert.ok(status.proposals.some((proposal) => proposal.operation === 'summarize_live_system_status'));
  assert.ok(status.proposals.some((proposal) => proposal.operation === 'inspect_gpu_lane_balance'));

  const next = await postChat('what are our next steps?');
  assert.match(next.reply, /Next steps, grounded in live HoloShell state/);
  assert.match(next.reply, /Fara/i);
  assert.match(next.reply, /No cube\/test object is needed/);
  assert.doesNotMatch(next.reply, /Begin with a minimal test object/i);
  assert.doesNotMatch(next.reply, /NaN/);
  assert.ok(next.proposals.some((proposal) => proposal.operation === 'plan_receipt_backed_improvement_batch'));
  assert.ok(next.proposals.some((proposal) => proposal.operation === 'plan_desktop_control_with_fara'));

  const serveSource = readFileSync(resolve('packages/holoshell/serve.mjs'), 'utf8');
  assert.match(serveSource, /tegrastatsGpuSnapshot/);
  assert.match(serveSource, /Number\.isFinite/);
  assert.match(serveSource, /GPU util not reported/);
} finally {
  if (server.exitCode === null) {
    server.kill();
  }
}
