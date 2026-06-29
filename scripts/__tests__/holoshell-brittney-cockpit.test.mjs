import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const port = 9070 + Math.floor(Math.random() * 200);
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

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`, {
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
  assert.ok(liveStatus.capabilities.includes('brittney_desktop_cockpit'));

  const capsule = await getJson('/api/cockpit/capsule');
  assert.equal(capsule.schemaVersion, 'hololand.holoshell.brittney-cockpit-capsule.v0.1.0');
  assert.equal(capsule.source, 'apps/holoshell/source/holoshell-brittney-desktop-cockpit.hsplus');
  assert.equal(capsule.status, 'ready');
  assert.equal(capsule.mode, 'read_only_operator_capsule');
  assert.equal(capsule.destructiveActionsTaken, false);
  assert.equal(capsule.desktopAutomationExecuted, false);
  assert.equal(capsule.summary.cockpitLaneCount, capsule.cockpitLanes.length);
  assert.equal(capsule.summary.actionCardCount, capsule.actionCards.length);
  assert.ok(capsule.cockpitLanes.some((lane) => lane.id === 'runtime_truth' && lane.permissionEnvelope === 'read_only'));
  assert.ok(capsule.cockpitLanes.some((lane) => lane.id === 'route_health' && lane.sourceEndpoint === 'GET /api/cockpit/capsule'));
  assert.ok(capsule.cockpitLanes.some((lane) => lane.id === 'context_carry' && /goal, files, tests/.test(lane.detail)));
  assert.ok(capsule.cockpitLanes.some((lane) => lane.id === 'desktop_bridge' && lane.receiptRequired === true));
  assert.ok(capsule.actionCards.some((card) => card.id === 'desktop_control_plan' && card.permissionEnvelope === 'read_only_plan'));
  assert.ok(capsule.actionCards.some((card) => card.id === 'context_capsule' && card.href === '/api/cockpit/capsule'));
  assert.deepEqual(capsule.safety.admittedExecutorActions, ['open_url']);
  assert.equal(capsule.safety.allOtherDesktopActionsRemainPlanOnly, true);
  assert.ok(capsule.contextCapsuleTemplate.requiredFields.includes('next_command'));
  assert.ok(capsule.contextCapsuleTemplate.memoryInputs.includes('knowledge_store'));
  assert.match(capsule.nextSafeStep, /preflight -> consent-token -> receipt/);

  const hsplusSource = readFileSync(resolve('apps/holoshell/source/holoshell-brittney-desktop-cockpit.hsplus'), 'utf8');
  assert.match(hsplusSource, /composition "HoloShell Brittney Desktop Cockpit"/);
  assert.match(hsplusSource, /DesktopMutationStaysBehindHoloGate/);
  assert.match(hsplusSource, /ContextCapsuleCarriesIdentityAcrossCompaction/);

  const operateRoomSource = readFileSync(resolve('packages/holoshell/scenes/operate-room.holo'), 'utf8');
  assert.match(operateRoomSource, /brittney_cockpit_source/);
  assert.match(operateRoomSource, /GET \/api\/cockpit\/capsule/);

  const compileSource = readFileSync(resolve('packages/holoshell/compile.mjs'), 'utf8');
  assert.match(compileSource, /brittney-cockpit/);
  assert.match(compileSource, /loadCockpitCapsule/);
  assert.match(compileSource, /\/api\/cockpit\/capsule/);
} finally {
  if (server.exitCode === null) {
    server.kill();
  }
}
