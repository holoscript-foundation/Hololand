#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const HTML_PATH = path.join(REPO_ROOT, 'apps', 'holoshell', 'prototype', 'local-capability-room.html');
const RECEIPT_PATH = path.join(REPO_ROOT, '.tmp', 'holoshell', 'founder-evidence-demo-latest.json');
const LIVE_FEED_PATH = path.join(REPO_ROOT, '.tmp', 'holoshell', 'live-feed.json');
const SHELL_OBJECTS_PATH = path.join(REPO_ROOT, '.tmp', 'holoshell', 'shell-objects.json');

const html = readFileSync(HTML_PATH, 'utf8');
const receipt = JSON.parse(readFileSync(RECEIPT_PATH, 'utf8'));
const liveFeed = JSON.parse(readFileSync(LIVE_FEED_PATH, 'utf8'));
const shellObjects = JSON.parse(readFileSync(SHELL_OBJECTS_PATH, 'utf8'));

assert.match(html, /founder-evidence-demo-latest\.js/, 'prototype must load Founder evidence bootstrap');
assert.match(html, /id="founderEvidenceCard"/, 'prototype must expose Founder evidence card');
assert.match(html, /function founderEvidenceDemoFeed\(\)/, 'prototype must read Founder evidence feed');
assert.match(html, /function renderFounderEvidenceCard\(\)/, 'prototype must render Founder evidence card');
assert.match(html, /renderFounderEvidenceCard\(\)/, 'prototype must invoke Founder evidence renderer');
assert.match(html, /Founder evidence:/, 'shell memory must include Founder evidence row');

assert.equal(receipt.schemaVersion, 'hololand.holoshell.founder-evidence-demo.v0.1.0');
assert.equal(receipt.summary.status, 'approved_execution_receipted');
assert.equal(receipt.summary.visibleShellChange, true);
assert.equal(receipt.summary.visibleWitnessKind, 'browser_navigation_dispatched');
assert.equal(receipt.execution.afterState.targetUrlHost, 'example.com');
assert.equal(receipt.execution.afterState.browserNavigation.targetHost, 'example.com');

assert.equal(liveFeed.summary.founderEvidenceDemoStatus, 'approved_execution_receipted');
assert.equal(liveFeed.summary.founderEvidenceDemoVisibleShellChange, true);
assert.equal(liveFeed.summary.founderEvidenceDemoVisibleWitnessKind, 'browser_navigation_dispatched');

assert.equal(shellObjects.summary.founderEvidenceDemoStatus, 'approved_execution_receipted');
assert.equal(shellObjects.summary.founderEvidenceDemoVisibleShellChange, true);
assert.equal(shellObjects.summary.founderEvidenceDemoVisibleWitnessKind, 'browser_navigation_dispatched');
assert.equal(shellObjects.objects.some((object) => object.displayName === 'Founder Evidence Demo'), true);

console.log('HoloShell founder evidence card test passed.');
