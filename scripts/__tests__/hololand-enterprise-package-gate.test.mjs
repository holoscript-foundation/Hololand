#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..', '..');
const OUTPUT_DIR = path.join(REPO_ROOT, '.tmp', 'hololand', 'self-test', 'enterprise-gates', 'customer-success-room');
const RECEIPT_PATH = path.join(OUTPUT_DIR, 'receipt.json');
const HTML_PATH = path.join(OUTPUT_DIR, 'gate.html');
const JS_PATH = path.join(OUTPUT_DIR, 'gate-receipt.js');
const BROWSER_RECEIPT_PATH = path.join(OUTPUT_DIR, 'browser-receipt.json');
const BROWSER_JS_PATH = path.join(OUTPUT_DIR, 'browser-receipt.js');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    windowsHide: true,
    timeout: options.timeout ?? 120_000,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
  }
  return result;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

rmSync(OUTPUT_DIR, { recursive: true, force: true });

run(process.execPath, [
  'scripts/hololand-enterprise-package-gate.mjs',
  '--output-dir',
  OUTPUT_DIR,
  '--receipt',
  RECEIPT_PATH,
  '--html',
  HTML_PATH,
  '--js',
  JS_PATH,
  '--json',
]);

const receipt = readJson(RECEIPT_PATH);
assert.equal(receipt.schema, 'hololand.enterprise-package-gate.receipt.v0.1.0');
assert.equal(receipt.status, 'pass');
assert.equal(receipt.gate.id, 'customer-success-room');
assert.equal(receipt.gate.packageClass, 'enterprise_business_solution');
assert.equal(receipt.gate.developerPackageSurface, false);
assert.equal(receipt.source.path, 'apps/holoshell/source/hololand-enterprise-customer-success-room-gate.hsplus');
assert.equal(receipt.source.format, 'hsplus');
assert.match(receipt.source.sha256, /^[a-f0-9]{64}$/);
assert.equal(receipt.validation.status, 'pass');
assert.equal(receipt.validation.local.status, 'pass');
assert.equal(receipt.validation.local.source.status, 'pass');
assert.equal(receipt.validation.local.manifest.status, 'pass');
assert.equal(receipt.validation.mcp.status, 'not_embedded');
assert.ok(receipt.validation.local.source.policies.includes('EnterprisePackagesAreGates'));
assert.ok(receipt.validation.local.source.policies.includes('SourceReceiptsBlockPromotion'));
assert.ok(receipt.validation.local.source.policies.includes('UpstreamGapsDoNotBecomeLocalRewrites'));
assert.deepEqual(receipt.requiredReceipts, [
  'source',
  'validation',
  'runtime',
  'render',
  'interaction',
  'hardware_browser',
]);
assert.ok(receipt.holoscriptPackages.some((pkg) => pkg.name === '@holoscript/core'));
assert.ok(receipt.holoscriptPackages.some((pkg) => pkg.name === '@holoscript/framework'));
assert.equal(receipt.benchmarkGates[0].id, 'holoscript_enterprise_customer_success_room');
assert.equal(receipt.runtime.status, 'ready');
assert.equal(receipt.render.status, 'ready');
assert.equal(receipt.interaction.status, 'pending_browser_receipt');
assert.equal(receipt.hardwareBrowser.status, 'required_for_promotion');
assert.equal(receipt.upstreamGaps.status, 'recorded');
assert.equal(receipt.upstreamGaps.items[0].owner, 'HoloScript');
assert.equal(receipt.upstreamGaps.items[0].localRewriteAllowed, false);
assert.equal(receipt.promotion.status, 'blocked_by_upstream_gaps');
assert.ok(existsSync(HTML_PATH), 'gate HTML missing');
assert.ok(existsSync(JS_PATH), 'gate receipt JS missing');

const html = readFileSync(HTML_PATH, 'utf8');
assert.match(html, /Customer Success Room/);
assert.match(html, /enterprise-gate-verify/);
assert.match(html, /HoloScript Packages/);
assert.match(html, /Interaction receipt pending/);
assert.match(html, /blocked_by_upstream_gaps/);
assert.match(html, /holoscript_enterprise_customer_success_room/);

run(process.execPath, [
  'scripts/hololand-enterprise-package-gate-browser-receipt.mjs',
  '--html',
  HTML_PATH,
  '--output-dir',
  OUTPUT_DIR,
  '--output',
  BROWSER_RECEIPT_PATH,
  '--js-output',
  BROWSER_JS_PATH,
  '--json',
], {
  timeout: 120_000,
});

const browserReceipt = readJson(BROWSER_RECEIPT_PATH);
assert.equal(browserReceipt.schema, 'hololand.enterprise-package-gate-browser-receipt.v0.1.0');
assert.equal(browserReceipt.status, 'pass');
assert.equal(browserReceipt.interaction.status, 'pass');
assert.equal(browserReceipt.state.assertions.rootVisible, true);
assert.equal(browserReceipt.state.assertions.workflowVisible, true);
assert.equal(browserReceipt.state.assertions.sourceVisible, true);
assert.equal(browserReceipt.state.assertions.validationVisible, true);
assert.equal(browserReceipt.state.assertions.renderVisible, true);
assert.equal(browserReceipt.state.assertions.promotionVisible, true);
assert.equal(browserReceipt.state.assertions.benchmarkVisible, true);
assert.equal(browserReceipt.state.assertions.packageListVisible, true);
assert.equal(browserReceipt.state.assertions.requiredReceiptsVisible, true);
assert.equal(browserReceipt.state.assertions.receiptVisible, true);
assert.equal(browserReceipt.state.assertions.interactionCaptured, true);
assert.equal(browserReceipt.state.assertions.embeddedReceiptPresent, true);
assert.match(browserReceipt.evidence.screenshotSha256, /^[a-f0-9]{64}$/);
assert.match(browserReceipt.evidence.domSha256, /^[a-f0-9]{64}$/);
assert.ok(existsSync(path.resolve(REPO_ROOT, browserReceipt.evidence.screenshot)), 'screenshot file missing');
assert.ok(existsSync(path.resolve(REPO_ROOT, browserReceipt.evidence.dom)), 'DOM file missing');
assert.ok(existsSync(BROWSER_JS_PATH), 'browser receipt bootstrap JS missing');

console.log('hololand enterprise package gate test passed');
