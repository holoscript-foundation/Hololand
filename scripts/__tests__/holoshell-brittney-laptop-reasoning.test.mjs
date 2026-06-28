#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const outDir = path.join('.tmp', 'holoshell', 'self-test', 'laptop-reasoning');
const latestOutput = path.join(outDir, 'brittney-turn-latest.json');
const jsOutput = path.join(outDir, 'brittney-turn-latest.js');
const turnsDir = path.join(outDir, 'turns');

const prompt = [
  'Brittney, this is a large reasoning ask.',
  'Have the Jetson keep serving the app, but send a read-only reasoning job to the laptop Codex lane.',
  'The laptop should inspect repo/autonomy/backend seams, separate cloud and local focus, and return a receipt before any mutation.',
  'We need the dispatch to happen autonomously based on the prompt shape, not because a human manually opened Codex.',
].join(' ');

const result = spawnSync(process.execPath, [
  'scripts/holoshell-brittney-turn.mjs',
  '--prompt',
  prompt,
  '--json',
  '--self-test',
  '--turns-dir',
  turnsDir,
  '--latest-output',
  latestOutput,
  '--js-output',
  jsOutput,
], {
  cwd: REPO_ROOT,
  encoding: 'utf8',
  windowsHide: true,
  maxBuffer: 16 * 1024 * 1024,
});

assert.equal(result.status, 0, `brittney turn failed:\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
const firstBrace = result.stdout.indexOf('{');
assert.ok(firstBrace >= 0, 'turn stdout must contain JSON receipt');
const receipt = JSON.parse(result.stdout.slice(firstBrace));
const delegation = receipt.runtime.laptopReasoningDelegation;

assert.equal(delegation.status, 'delegated');
assert.equal(delegation.capabilityId, 'laptop_reasoning_job');
assert.equal(delegation.dispatchKind, 'reasoning_job');
assert.equal(delegation.permissionEnvelope, 'read_only');
assert.equal(delegation.approvalRequired, false);
assert.equal(delegation.targetHost, 'laptop_windows');
assert.equal(delegation.lane, 'codex-hardware');
assert.equal(delegation.destructiveActionsTaken, false);
assert.equal(delegation.desktopAutomationExecuted, false);
assert.ok(delegation.reasonCodes.includes('explicit_laptop_reasoning_request'));
assert.ok(existsSync(delegation.latestPath), `expected dispatch latest at ${delegation.latestPath}`);
assert.ok(existsSync(delegation.dispatchReceiptPath), `expected dispatch receipt at ${delegation.dispatchReceiptPath}`);

const dispatchReceipt = JSON.parse(readFileSync(delegation.dispatchReceiptPath, 'utf8'));
assert.equal(dispatchReceipt.summary.capabilityId, 'laptop_reasoning_job');
assert.equal(dispatchReceipt.dispatch.body.targetHost, 'laptop_windows');
assert.equal(dispatchReceipt.dispatch.body.lane, 'codex-hardware');
assert.equal(dispatchReceipt.dispatch.body.permissionEnvelope, 'read_only');
assert.equal(dispatchReceipt.dispatch.body.receiptRequired, true);

assert.equal(receipt.shellContext.laptopReasoningDelegation.dispatchId, delegation.dispatchId);
assert.equal(receipt.summary.laptopReasoningDelegationStatus, 'delegated');
assert.equal(receipt.summary.laptopReasoningTargetHost, 'laptop_windows');
assert.ok(receipt.proposals.some((proposal) =>
  proposal.operation === 'dispatch_laptop_reasoning_job' &&
  proposal.objectId === 'laptop-reasoning' &&
  proposal.receiptRequired === true &&
  proposal.approvalRequired === false
));

console.log('HoloShell Brittney laptop reasoning delegation test passed.');
