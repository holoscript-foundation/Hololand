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
  assert.equal(capsule.summary.windowActionCardCount, 3);
  assert.equal(capsule.summary.preflightPathCount, 3);
  assert.ok(capsule.cockpitLanes.some((lane) => lane.id === 'runtime_truth' && lane.permissionEnvelope === 'read_only'));
  assert.ok(capsule.cockpitLanes.some((lane) => lane.id === 'route_health' && lane.sourceEndpoint === 'GET /api/cockpit/capsule'));
  assert.ok(capsule.cockpitLanes.some((lane) => lane.id === 'context_carry' && /goal, files, tests/.test(lane.detail)));
  assert.ok(capsule.cockpitLanes.some((lane) => lane.id === 'desktop_bridge' && lane.receiptRequired === true));
  assert.ok(capsule.cockpitLanes.some((lane) => lane.id === 'window_awareness' && lane.permissionEnvelope === 'read_only'));
  assert.ok(capsule.actionCards.some((card) => card.id === 'desktop_control_plan' && card.permissionEnvelope === 'read_only_plan'));
  assert.ok(capsule.actionCards.some((card) => card.id === 'context_capsule' && card.href === '/api/cockpit/capsule'));
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

  const operateRoomSource = readFileSync(resolve('packages/holoshell/scenes/operate-room.holo'), 'utf8');
  assert.match(operateRoomSource, /brittney_cockpit_source/);
  assert.match(operateRoomSource, /GET \/api\/cockpit\/capsule/);

  const compileSource = readFileSync(resolve('packages/holoshell/compile.mjs'), 'utf8');
  assert.match(compileSource, /brittney-cockpit/);
  assert.match(compileSource, /loadCockpitCapsule/);
  assert.match(compileSource, /cockpit-action-cards/);
  assert.match(compileSource, /\/api\/cockpit\/capsule/);
} finally {
  if (server.exitCode === null) {
    server.kill();
  }
}
