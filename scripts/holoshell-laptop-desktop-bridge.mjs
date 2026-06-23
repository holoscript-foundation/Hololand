#!/usr/bin/env node
/**
 * HoloShell laptop desktop-control bridge.
 *
 * Runs on the Windows laptop at 127.0.0.1:8751 so the Jetson-hosted HoloShell
 * page can discover the local desktop automation lane through the browser.
 * This bridge is intentionally non-mutating: it reports readiness, writes
 * preflight receipts, and refuses execution until a HoloGate consent-token
 * execution lane is implemented and validated.
 */

import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildDesktopControlPlan } from './holoshell-desktop-control-plan.mjs';

export const LAPTOP_DESKTOP_BRIDGE_SCHEMA = 'hololand.holoshell.laptop-desktop-bridge.v0.1.0';
export const DESKTOP_CONTROL_PREFLIGHT_SCHEMA = 'hololand.holoshell.desktop-control-preflight.v0.1.0';
export const DESKTOP_CONTROL_EXECUTION_REFUSAL_SCHEMA = 'hololand.holoshell.desktop-control-execution-refusal.v0.1.0';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_HOST = process.env.HOLOSHELL_LAPTOP_DESKTOP_BRIDGE_HOST || '127.0.0.1';
const DEFAULT_PORT = Number(process.env.HOLOSHELL_LAPTOP_DESKTOP_BRIDGE_PORT || 8751);
const DEFAULT_RECEIPT_DIR = process.env.HOLOSHELL_LAPTOP_DESKTOP_BRIDGE_RECEIPTS ||
  '.tmp/holoshell/desktop-control-bridge';

function usage() {
  return `Usage: node scripts/holoshell-laptop-desktop-bridge.mjs [options]

Options:
  --host <host>          Bind host, default 127.0.0.1
  --port <port>          Bind port, default 8751
  --receipt-dir <path>   Receipt directory, default .tmp/holoshell/desktop-control-bridge
  --created-at <iso>     Stable timestamp for tests
  --status               Print bridge status and exit
  --json                 Print JSON output for --status or --self-test
  --self-test            Run non-mutating daemon self-test and exit
`;
}

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    receiptDir: DEFAULT_RECEIPT_DIR,
    createdAt: '',
    status: false,
    json: false,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    if (arg === '--host') args.host = argv[++index] || args.host;
    else if (arg === '--port') args.port = Number(argv[++index] || args.port);
    else if (arg === '--receipt-dir') args.receiptDir = argv[++index] || args.receiptDir;
    else if (arg === '--created-at') args.createdAt = argv[++index] || '';
    else if (arg === '--status') args.status = true;
    else if (arg === '--json') args.json = true;
    else if (arg === '--self-test') args.selfTest = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!Number.isFinite(args.port) || args.port < 1 || args.port > 65535) {
    throw new Error('--port must be between 1 and 65535');
  }
  return args;
}

function generatedAt(options = {}) {
  return options.createdAt || new Date().toISOString();
}

function hashText(text) {
  return createHash('sha256').update(String(text), 'utf8').digest('hex');
}

function stableId(prefix, text) {
  return `${prefix}_${hashText(text).slice(0, 12)}`;
}

function repoPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(REPO_ROOT, filePath);
}

function safeString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export function buildBridgeStatus(options = {}) {
  const host = options.host || DEFAULT_HOST;
  const port = Number(options.port || DEFAULT_PORT);
  const url = options.url || `http://${host}:${port}`;
  const at = generatedAt(options);
  return {
    schemaVersion: LAPTOP_DESKTOP_BRIDGE_SCHEMA,
    reportId: stableId('desktop_bridge_report', `${at}:${url}:${process.pid}`),
    generatedAt: at,
    status: 'ready',
    url,
    hostRole: 'laptop_desktop_bridge',
    expectedSurface: 'Jetson-hosted HoloShell browser page',
    source: 'apps/holoshell/source/holoshell-desktop-control-bridge.hsplus',
    daemonScript: 'scripts/holoshell-laptop-desktop-bridge.mjs',
    platform: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
    },
    modelPolicy: {
      lane: 'fara_gui_grounding',
      recommendedModel: 'fara:7b',
      fallbackModels: ['hf.co/bartowski/microsoft_Fara-7B-GGUF:Q4_K_M', 'qwen3-vl:4b'],
      mayExecute: false,
    },
    capabilities: [
      'bridge_status',
      'desktop_action_preflight',
      'execution_refusal',
      'receipt_write',
      'browser_proxied_jetson_report',
    ],
    endpoints: {
      status: '/api/desktop-control/bridge',
      preflight: '/api/desktop-control/preflight',
      execute: '/api/desktop-control/execute',
    },
    mutationBoundary: 'execution_refused_until_holoshell_consent_token',
    destructiveActionsTaken: false,
    desktopAutomationExecuted: false,
    approvalRequiredForDesktopAutomation: true,
  };
}

function planFromPayload(payload = {}, options = {}) {
  const suppliedPlan = payload.plan || payload.receipt || payload.desktopControlPlan || null;
  if (suppliedPlan?.schemaVersion) return suppliedPlan;
  const intent = safeString(payload.intent || payload.message, '');
  if (!intent) throw new Error('preflight requires intent or plan receipt');
  return buildDesktopControlPlan({
    intent,
    actor: payload.actor || 'brittney',
    createdAt: options.createdAt,
  });
}

export function buildDesktopControlPreflight(payload = {}, options = {}) {
  const plan = planFromPayload(payload, options);
  const at = generatedAt(options);
  const planId = plan.planId || stableId('desktop_control_plan', JSON.stringify(plan).slice(0, 2000));
  const permissionEnvelope = plan.summary?.permissionEnvelope || plan.permission?.envelope || 'guarded_execute';
  const primaryAction = plan.summary?.primaryAction || plan.intent?.primaryAction || payload.action || 'inspect_screen';
  const status = permissionEnvelope === 'break_glass'
    ? 'blocked_break_glass'
    : (permissionEnvelope === 'read_only' ? 'read_only_ready' : 'preflight_ready');
  const preflightId = stableId('desktop_preflight', `${at}:${planId}:${primaryAction}:${permissionEnvelope}`);
  const consentRequired = permissionEnvelope !== 'read_only';
  return {
    schemaVersion: DESKTOP_CONTROL_PREFLIGHT_SCHEMA,
    preflightId,
    generatedAt: at,
    status,
    source: 'apps/holoshell/source/holoshell-desktop-control-bridge.hsplus',
    daemonScript: 'scripts/holoshell-laptop-desktop-bridge.mjs',
    planId,
    planReceiptType: plan.schemaVersion || null,
    actor: payload.actor || plan.actor || 'brittney',
    intent: {
      raw: plan.intent?.raw || payload.intent || '',
      sha256: plan.intent?.sha256 || hashText(payload.intent || planId),
      primaryAction,
    },
    modelLane: 'fara_gui_grounding',
    permissionEnvelope,
    consentRequired,
    executionAllowed: false,
    executionDefault: 'refused_until_consent_token_lane',
    approvalRequiredForDesktopAutomation: true,
    founderReviewRequired: permissionEnvelope === 'break_glass',
    destructiveActionsTaken: false,
    desktopAutomationExecuted: false,
    receiptRequired: true,
    bridge: buildBridgeStatus(options),
    nextSafeStep: consentRequired
      ? 'Show this preflight receipt and require a fresh HoloGate consent token before any desktop mutation lane exists.'
      : 'Read-only inspection is preflighted; keep the receipt and do not mutate the desktop.',
  };
}

export function buildExecutionRefusal(payload = {}, options = {}) {
  const at = generatedAt(options);
  const preflightId = safeString(payload.preflightId || payload.preflight?.preflightId, 'missing_preflight');
  return {
    schemaVersion: DESKTOP_CONTROL_EXECUTION_REFUSAL_SCHEMA,
    refusalId: stableId('desktop_execution_refusal', `${at}:${preflightId}`),
    generatedAt: at,
    status: 'refused',
    reason: 'desktop_control_execution_requires_holoshell_consent_token_lane',
    source: 'apps/holoshell/source/holoshell-desktop-control-bridge.hsplus',
    daemonScript: 'scripts/holoshell-laptop-desktop-bridge.mjs',
    preflightId,
    consentTokenProvided: Boolean(payload.consentToken),
    executionAllowed: false,
    destructiveActionsTaken: false,
    desktopAutomationExecuted: false,
    approvalRequiredForDesktopAutomation: true,
    receiptRequired: true,
    nextSafeStep: 'Use the HoloShell consent-token path to authorize an exact preflight receipt before enabling any mutating executor.',
  };
}

function writeReceipt(receipt, receiptDir, subdir, fileId, suffix) {
  const dir = repoPath(path.join(receiptDir || DEFAULT_RECEIPT_DIR, subdir));
  mkdirSync(dir, { recursive: true });
  const receiptPath = path.join(dir, `${fileId}${suffix}.json`);
  const withPath = { ...receipt, receiptPath };
  writeFileSync(receiptPath, `${JSON.stringify(withPath, null, 2)}\n`, 'utf8');
  return withPath;
}

function sendJson(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-HoloShell-Bridge',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(JSON.stringify(data));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error(`invalid_json: ${error.message}`));
      }
    });
    req.on('error', reject);
  });
}

export async function handleBridgeRequest(req, res, options = {}) {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
  const requestOptions = {
    host: options.host || DEFAULT_HOST,
    port: options.port || DEFAULT_PORT,
    receiptDir: options.receiptDir || DEFAULT_RECEIPT_DIR,
    createdAt: options.createdAt,
  };

  if (req.method === 'OPTIONS') {
    sendJson(res, { ok: true }, 204);
    return;
  }

  if (req.method === 'GET' && (requestUrl.pathname === '/health' || requestUrl.pathname === '/api/desktop-control/bridge')) {
    const status = buildBridgeStatus(requestOptions);
    sendJson(res, requestUrl.pathname === '/health' ? { ok: true, bridge: status } : status);
    return;
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/desktop-control/preflight') {
    try {
      const payload = await readRequestBody(req);
      const receipt = buildDesktopControlPreflight(payload, requestOptions);
      const saved = writeReceipt(receipt, requestOptions.receiptDir, 'preflights', receipt.preflightId, '.preflight');
      sendJson(res, { ...saved, destructiveActionsTaken: false });
    } catch (error) {
      sendJson(res, { error: String(error.message || error), destructiveActionsTaken: false }, 400);
    }
    return;
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/desktop-control/execute') {
    try {
      const payload = await readRequestBody(req);
      const receipt = buildExecutionRefusal(payload, requestOptions);
      const saved = writeReceipt(receipt, requestOptions.receiptDir, 'refusals', receipt.refusalId, '.refusal');
      sendJson(res, saved, 403);
    } catch (error) {
      sendJson(res, { error: String(error.message || error), destructiveActionsTaken: false }, 400);
    }
    return;
  }

  sendJson(res, { error: 'not_found', path: requestUrl.pathname, destructiveActionsTaken: false }, 404);
}

export function createLaptopDesktopBridgeServer(options = {}) {
  return createServer((req, res) => {
    handleBridgeRequest(req, res, options).catch((error) => {
      sendJson(res, { error: String(error.message || error), destructiveActionsTaken: false }, 500);
    });
  });
}

export function runSelfTest(options = {}) {
  const status = buildBridgeStatus({ ...options, createdAt: options.createdAt || '2026-06-23T00:00:00.000Z' });
  const preflight = buildDesktopControlPreflight({
    intent: 'Use Fara to inspect the screen and click the Save button.',
  }, { ...options, createdAt: status.generatedAt });
  const refusal = buildExecutionRefusal({ preflightId: preflight.preflightId }, { ...options, createdAt: status.generatedAt });
  const failures = [];
  if (status.status !== 'ready') failures.push('status not ready');
  if (status.destructiveActionsTaken !== false) failures.push('status mutated');
  if (preflight.modelLane !== 'fara_gui_grounding') failures.push('missing Fara lane');
  if (preflight.executionAllowed !== false) failures.push('preflight should not allow execution');
  if (preflight.destructiveActionsTaken !== false) failures.push('preflight mutated');
  if (refusal.status !== 'refused') failures.push('execution should be refused');
  if (refusal.desktopAutomationExecuted !== false) failures.push('refusal executed desktop automation');
  if (failures.length) throw new Error(`self-test failed: ${failures.join(', ')}`);
  return { status, preflight, refusal };
}

function isMain() {
  return process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

if (isMain()) {
  try {
    const args = parseArgs();
    if (args.selfTest) {
      const result = runSelfTest(args);
      if (args.json) console.log(JSON.stringify(result, null, 2));
      else console.log('HoloShell laptop desktop bridge self-test passed');
      process.exit(0);
    }
    if (args.status) {
      const status = buildBridgeStatus(args);
      if (args.json) console.log(JSON.stringify(status, null, 2));
      else {
        console.log(`Status: ${status.status}`);
        console.log(`URL: ${status.url}`);
        console.log(`Mutation boundary: ${status.mutationBoundary}`);
      }
      process.exit(0);
    }
    const server = createLaptopDesktopBridgeServer(args);
    server.listen(args.port, args.host, () => {
      console.log(`HoloShell laptop desktop bridge: http://${args.host}:${args.port}`);
      console.log('Execution: refused until HoloGate consent-token lane exists');
    });
  } catch (error) {
    console.error(`holoshell-laptop-desktop-bridge failed: ${error.message}`);
    process.exit(1);
  }
}
