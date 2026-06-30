#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  buildReceipt,
  classifyTask,
  fixtureQueue,
  parseArgs,
} from '../holoshell-sovereign-room-marathon.mjs';

const fixtureResult = { status: 'fixture', queue: fixtureQueue(), command: 'fixture' };

assert.equal(classifyTask({ title: '[local] sovereign task', tags: [] }), 'local');
assert.equal(classifyTask({ title: 'cloud-tagged receipt', tags: [] }), 'cloud');
assert.equal(classifyTask({ title: 'harvest native capability', tags: ['native-first'] }), 'local');
assert.equal(classifyTask({ title: 'Jetson HoloShell receipt task', tags: ['jetson', 'holoshell'] }), 'local');
assert.equal(classifyTask({ title: '[repo-harvest][Hololand] Promote harvested repo work into board-ready slice', tags: [] }), 'local');
assert.equal(classifyTask({ title: 'plain task', tags: [] }), 'unknown');

const localReceipt = buildReceipt({ ...parseArgs([]), taskLane: 'local', taskTag: 'local' }, fixtureResult);
assert.equal(localReceipt.summary.status, 'ready_to_claim');
assert.equal(localReceipt.summary.selectedTaskId, 'task_local_mid');
assert.equal(localReceipt.summary.claimAttempted, false);
assert.equal(localReceipt.summary.sovereignConsumptionDefault, true);

const cloudBlocked = buildReceipt({ ...parseArgs([]), taskLane: 'cloud', taskTag: 'cloud' }, fixtureResult);
assert.equal(cloudBlocked.summary.status, 'blocked_cloud_escalation_receipt_required');
assert.equal(cloudBlocked.summary.selectedTaskId, '');

const claimed = buildReceipt(
  { ...parseArgs([]), taskLane: 'local', taskTag: 'local', claim: true },
  fixtureResult,
  () => ({ status: 'claimed', attempted: true, succeeded: true, stdout: 'claimed', stderr: '' }),
);
assert.equal(claimed.summary.status, 'claimed');
assert.equal(claimed.summary.claimSucceeded, true);
assert.equal(claimed.summary.completionClaimAllowed, false);

execFileSync(process.execPath, ['scripts/holoshell-sovereign-room-marathon.mjs', '--self-test'], {
  cwd: fileURLToPath(new URL('../..', import.meta.url)),
  stdio: 'pipe',
  encoding: 'utf8',
});

console.log('holoshell-sovereign-room-marathon tests passed.');
