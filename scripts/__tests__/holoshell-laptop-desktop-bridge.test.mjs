import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  buildBridgeStatus,
  buildDesktopControlPreflight,
  buildExecutionRefusal,
  createLaptopDesktopBridgeServer,
  DESKTOP_CONTROL_PREFLIGHT_SCHEMA,
  LAPTOP_DESKTOP_BRIDGE_SCHEMA,
  runSelfTest,
} from '../holoshell-laptop-desktop-bridge.mjs';

const NODE = process.execPath;
const SCRIPT = resolve('scripts/holoshell-laptop-desktop-bridge.mjs');
const CREATED_AT = '2026-06-23T00:00:00.000Z';

const status = buildBridgeStatus({ host: '127.0.0.1', port: 8751, createdAt: CREATED_AT });
assert.equal(status.schemaVersion, LAPTOP_DESKTOP_BRIDGE_SCHEMA);
assert.equal(status.status, 'ready');
assert.equal(status.hostRole, 'laptop_desktop_bridge');
assert.equal(status.modelPolicy.lane, 'fara_gui_grounding');
assert.equal(status.modelPolicy.mayExecute, false);
assert.equal(status.destructiveActionsTaken, false);
assert.equal(status.desktopAutomationExecuted, false);

const preflight = buildDesktopControlPreflight({
  intent: 'Use Fara to inspect the screen and click the Save button.',
}, { host: '127.0.0.1', port: 8751, createdAt: CREATED_AT });
assert.equal(preflight.schemaVersion, DESKTOP_CONTROL_PREFLIGHT_SCHEMA);
assert.equal(preflight.status, 'preflight_ready');
assert.equal(preflight.modelLane, 'fara_gui_grounding');
assert.equal(preflight.permissionEnvelope, 'guarded_execute');
assert.equal(preflight.consentRequired, true);
assert.equal(preflight.executionAllowed, false);
assert.equal(preflight.destructiveActionsTaken, false);
assert.equal(preflight.desktopAutomationExecuted, false);

const readOnlyPreflight = buildDesktopControlPreflight({
  intent: 'Inspect the current desktop and describe the active window.',
}, { createdAt: CREATED_AT });
assert.equal(readOnlyPreflight.status, 'read_only_ready');
assert.equal(readOnlyPreflight.consentRequired, false);
assert.equal(readOnlyPreflight.executionAllowed, false);

const refusal = buildExecutionRefusal({ preflightId: preflight.preflightId }, { createdAt: CREATED_AT });
assert.equal(refusal.status, 'refused');
assert.equal(refusal.executionAllowed, false);
assert.equal(refusal.destructiveActionsTaken, false);
assert.equal(refusal.desktopAutomationExecuted, false);
assert.match(refusal.reason, /consent_token/);

assert.equal(runSelfTest({ createdAt: CREATED_AT }).refusal.status, 'refused');

const cliStatus = JSON.parse(execFileSync(NODE, [
  SCRIPT,
  '--status',
  '--created-at',
  CREATED_AT,
  '--json',
], { encoding: 'utf8' }));
assert.equal(cliStatus.status, 'ready');
assert.equal(cliStatus.destructiveActionsTaken, false);

const cliSelfTest = JSON.parse(execFileSync(NODE, [
  SCRIPT,
  '--self-test',
  '--created-at',
  CREATED_AT,
  '--json',
], { encoding: 'utf8' }));
assert.equal(cliSelfTest.preflight.executionAllowed, false);
assert.equal(cliSelfTest.refusal.status, 'refused');

const tmp = mkdtempSync(join(tmpdir(), 'holoshell-laptop-bridge-'));
const server = createLaptopDesktopBridgeServer({
  host: '127.0.0.1',
  port: 8751,
  receiptDir: tmp,
  createdAt: CREATED_AT,
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
try {
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const statusResponse = await fetch(`${baseUrl}/api/desktop-control/bridge`);
  assert.equal(statusResponse.status, 200);
  const statusBody = await statusResponse.json();
  assert.equal(statusBody.status, 'ready');
  assert.equal(statusBody.destructiveActionsTaken, false);

  const preflightResponse = await fetch(`${baseUrl}/api/desktop-control/preflight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intent: 'Click the Save button after Fara identifies it.' }),
  });
  assert.equal(preflightResponse.status, 200);
  const preflightBody = await preflightResponse.json();
  assert.equal(preflightBody.executionAllowed, false);
  assert.equal(preflightBody.destructiveActionsTaken, false);
  assert.ok(existsSync(preflightBody.receiptPath));
  assert.match(readFileSync(preflightBody.receiptPath, 'utf8'), /desktop-control-preflight/);

  const executeResponse = await fetch(`${baseUrl}/api/desktop-control/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preflightId: preflightBody.preflightId }),
  });
  assert.equal(executeResponse.status, 403);
  const executeBody = await executeResponse.json();
  assert.equal(executeBody.status, 'refused');
  assert.equal(executeBody.executionAllowed, false);
  assert.equal(executeBody.destructiveActionsTaken, false);
  assert.equal(executeBody.desktopAutomationExecuted, false);
  assert.ok(existsSync(executeBody.receiptPath));
} finally {
  await new Promise((resolve) => server.close(resolve));
}

const serveSource = readFileSync(resolve('packages/holoshell/serve.mjs'), 'utf8');
assert.match(serveSource, /\/api\/desktop-control\/bridge/);

const compileSource = readFileSync(resolve('packages/holoshell/compile.mjs'), 'utf8');
assert.match(compileSource, /desktop-bridge-status/);
