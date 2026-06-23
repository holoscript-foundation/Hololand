#!/usr/bin/env node
/**
 * HoloShell laptop desktop-control bridge.
 *
 * Runs on the Windows laptop at 127.0.0.1:8751 so the Jetson-hosted HoloShell
 * page can discover the local desktop automation lane through the browser.
 * This bridge is intentionally non-mutating: it reports readiness, writes
 * preflight receipts, issues HoloGate consent tokens, and stages approved
 * execution receipts without touching the OS until a concrete executor lane is
 * implemented and validated.
 */

import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildDesktopControlPlan } from './holoshell-desktop-control-plan.mjs';

export const LAPTOP_DESKTOP_BRIDGE_SCHEMA = 'hololand.holoshell.laptop-desktop-bridge.v0.1.0';
export const DESKTOP_CONTROL_PREFLIGHT_SCHEMA = 'hololand.holoshell.desktop-control-preflight.v0.1.0';
export const DESKTOP_CONTROL_CONSENT_TOKEN_SCHEMA = 'hololand.holoshell.desktop-control-consent-token.v0.1.0';
export const DESKTOP_CONTROL_EXECUTION_REFUSAL_SCHEMA = 'hololand.holoshell.desktop-control-execution-refusal.v0.1.0';
export const DESKTOP_CONTROL_EXECUTION_SCHEMA = 'hololand.holoshell.desktop-control-execution.v0.1.0';

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

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function hashValue(value) {
  return hashText(stableStringify(value));
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

function plusMinutes(iso, minutes) {
  const base = Date.parse(iso);
  const safeBase = Number.isFinite(base) ? base : Date.now();
  return new Date(safeBase + Math.max(1, Number(minutes || 5)) * 60_000).toISOString();
}

function tokenHash(token, preflightReceiptHash, operation, expiresAt) {
  return hashText(`${token}:${preflightReceiptHash}:${operation}:${expiresAt}`);
}

function preflightReceiptHash(preflight = {}) {
  return hashValue({
    schemaVersion: preflight.schemaVersion || '',
    preflightId: preflight.preflightId || '',
    planId: preflight.planId || '',
    permissionEnvelope: preflight.permissionEnvelope || '',
    primaryAction: preflight.intent?.primaryAction || '',
    intentSha256: preflight.intent?.sha256 || '',
  });
}

function tokenForResponse(consent) {
  return consent;
}

function tokenForStorage(consent) {
  return {
    ...consent,
    token: '[redacted]',
    tokenRedacted: true,
  };
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
      mayStageApprovedExecution: true,
    },
    capabilities: [
      'bridge_status',
      'desktop_action_preflight',
      'consent_token_issue',
      'consent_token_verify',
      'approved_execution_staging',
      'execution_refusal',
      'receipt_write',
      'browser_proxied_jetson_report',
    ],
    endpoints: {
      status: '/api/desktop-control/bridge',
      preflight: '/api/desktop-control/preflight',
      consentToken: '/api/desktop-control/consent-token',
      execute: '/api/desktop-control/execute',
    },
    mutationBoundary: 'os_mutation_refused_until_consent_token_and_action_executor',
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

export function buildConsentToken(payload = {}, options = {}) {
  const preflight = payload.preflight || payload.receipt || null;
  if (!preflight?.preflightId) throw new Error('consent token requires exact preflight receipt');
  const at = generatedAt(options);
  const operation = safeString(payload.operation || preflight.intent?.primaryAction, 'inspect_screen');
  const permissionEnvelope = preflight.permissionEnvelope || 'guarded_execute';
  const consentRequired = preflight.consentRequired !== false && permissionEnvelope !== 'read_only';
  const freshUserGesture = payload.freshUserGesture === true || payload.freshGesture === true;
  const hash = payload.preflightReceiptHash || preflightReceiptHash(preflight);
  const ttlMinutes = Number(payload.ttlMinutes || options.ttlMinutes || 5);
  const expiresAt = options.expiresAt || plusMinutes(at, ttlMinutes);
  const token = options.token || randomBytes(24).toString('base64url');
  const blockedReason = permissionEnvelope === 'break_glass'
    ? 'break_glass_requires_founder_review'
    : (!freshUserGesture && consentRequired ? 'fresh_user_gesture_required' : '');
  const status = blockedReason ? 'blocked' : (consentRequired ? 'issued' : 'not_required_read_only');
  const tokenId = stableId('desktop_consent_token', `${at}:${preflight.preflightId}:${operation}:${hash}`);
  return {
    schemaVersion: DESKTOP_CONTROL_CONSENT_TOKEN_SCHEMA,
    tokenId,
    token,
    tokenHash: tokenHash(token, hash, operation, expiresAt),
    generatedAt: at,
    expiresAt,
    status,
    blockedReason,
    source: 'apps/holoshell/source/holoshell-desktop-control-bridge.hsplus',
    daemonScript: 'scripts/holoshell-laptop-desktop-bridge.mjs',
    holoGateStages: ['identify', 'scope', 'log'],
    operation,
    preflightId: preflight.preflightId,
    planId: preflight.planId || '',
    preflightReceiptHash: hash,
    permissionEnvelope,
    consentRequired,
    freshUserGestureRequired: consentRequired,
    freshUserGestureObserved: freshUserGesture,
    executionAllowed: status === 'issued',
    executionMode: 'staged_receipt_only_until_action_executor',
    destructiveActionsTaken: false,
    desktopAutomationExecuted: false,
    receiptRequired: true,
    nextSafeStep: status === 'issued'
      ? 'Use this short-lived token with the exact preflight receipt to stage an approved execution receipt; OS mutation remains off until an action executor lane is admitted.'
      : (blockedReason || 'Read-only preflight does not require a consent token.'),
  };
}

export function validateConsentToken(payload = {}, options = {}) {
  const preflight = payload.preflight || null;
  const consentToken = payload.consentToken || payload.token || null;
  const token = typeof consentToken === 'string' ? { token: consentToken } : consentToken;
  if (!preflight?.preflightId) return { valid: false, reason: 'missing_exact_preflight_receipt' };
  if (!token?.token || !token?.tokenHash) return { valid: false, reason: 'missing_consent_token' };
  const operation = safeString(payload.operation || preflight.intent?.primaryAction || token.operation, 'inspect_screen');
  const hash = preflightReceiptHash(preflight);
  if (token.schemaVersion && token.schemaVersion !== DESKTOP_CONTROL_CONSENT_TOKEN_SCHEMA) {
    return { valid: false, reason: 'consent_token_schema_mismatch' };
  }
  if (token.status && token.status !== 'issued') return { valid: false, reason: token.blockedReason || 'consent_token_not_issued' };
  if (token.preflightId && token.preflightId !== preflight.preflightId) return { valid: false, reason: 'consent_token_preflight_mismatch' };
  if (token.preflightReceiptHash && token.preflightReceiptHash !== hash) return { valid: false, reason: 'consent_token_receipt_hash_mismatch' };
  if (token.operation && token.operation !== operation) return { valid: false, reason: 'consent_token_operation_mismatch' };
  if (token.expiresAt && Date.parse(token.expiresAt) <= Date.parse(generatedAt(options))) return { valid: false, reason: 'consent_token_expired' };
  const expectedHash = tokenHash(token.token, hash, operation, token.expiresAt || '');
  if (expectedHash !== token.tokenHash) return { valid: false, reason: 'consent_token_hash_mismatch' };
  return {
    valid: true,
    reason: '',
    operation,
    preflightReceiptHash: hash,
    tokenId: token.tokenId || '',
    expiresAt: token.expiresAt || '',
  };
}

export function buildDesktopControlExecution(payload = {}, options = {}) {
  const validation = validateConsentToken(payload, options);
  if (!validation.valid) {
    throw new Error(validation.reason || 'consent_token_invalid');
  }
  const at = generatedAt(options);
  const preflight = payload.preflight;
  const executionId = stableId(
    'desktop_execution',
    `${at}:${validation.tokenId}:${preflight.preflightId}:${validation.operation}:${validation.preflightReceiptHash}`
  );
  return {
    schemaVersion: DESKTOP_CONTROL_EXECUTION_SCHEMA,
    executionId,
    generatedAt: at,
    status: 'approved_execution_staged',
    source: 'apps/holoshell/source/holoshell-desktop-control-bridge.hsplus',
    daemonScript: 'scripts/holoshell-laptop-desktop-bridge.mjs',
    holoGateStages: ['identify', 'scope', 'log'],
    operation: validation.operation,
    preflightId: preflight.preflightId,
    planId: preflight.planId || '',
    preflightReceiptHash: validation.preflightReceiptHash,
    consentTokenId: validation.tokenId,
    consentTokenExpiresAt: validation.expiresAt,
    executionAllowed: true,
    executionMode: 'staged_receipt_only_until_action_executor',
    destructiveActionsTaken: false,
    desktopAutomationExecuted: false,
    approvalRequiredForDesktopAutomation: true,
    receiptRequired: true,
    bridge: buildBridgeStatus(options),
    nextSafeStep: 'Admit and validate a concrete action executor lane for this action class before allowing OS mutation.',
  };
}

export function buildExecutionRefusal(payload = {}, options = {}) {
  const at = generatedAt(options);
  const preflightId = safeString(payload.preflightId || payload.preflight?.preflightId, 'missing_preflight');
  const reason = payload.reason || 'desktop_control_execution_requires_holoshell_consent_token_lane';
  return {
    schemaVersion: DESKTOP_CONTROL_EXECUTION_REFUSAL_SCHEMA,
    refusalId: stableId('desktop_execution_refusal', `${at}:${preflightId}:${reason}`),
    generatedAt: at,
    status: 'refused',
    reason,
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

  if (req.method === 'POST' && requestUrl.pathname === '/api/desktop-control/consent-token') {
    try {
      const payload = await readRequestBody(req);
      const consent = buildConsentToken(payload, requestOptions);
      const saved = writeReceipt(
        tokenForStorage(consent),
        requestOptions.receiptDir,
        'consent-tokens',
        consent.tokenId,
        '.consent'
      );
      sendJson(res, { ...saved, ...tokenForResponse(consent), receiptPath: saved.receiptPath }, consent.status === 'issued' ? 200 : 403);
    } catch (error) {
      sendJson(res, { error: String(error.message || error), destructiveActionsTaken: false }, 400);
    }
    return;
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/desktop-control/execute') {
    try {
      const payload = await readRequestBody(req);
      if (payload.consentToken && payload.preflight) {
        const receipt = buildDesktopControlExecution(payload, requestOptions);
        const saved = writeReceipt(receipt, requestOptions.receiptDir, 'executions', receipt.executionId, '.execution');
        sendJson(res, saved);
      } else {
        const receipt = buildExecutionRefusal(payload, requestOptions);
        const saved = writeReceipt(receipt, requestOptions.receiptDir, 'refusals', receipt.refusalId, '.refusal');
        sendJson(res, saved, 403);
      }
    } catch (error) {
      const payload = { reason: `desktop_control_consent_token_invalid:${String(error.message || error)}` };
      const receipt = buildExecutionRefusal(payload, requestOptions);
      const saved = writeReceipt(receipt, requestOptions.receiptDir, 'refusals', receipt.refusalId, '.refusal');
      sendJson(res, saved, 403);
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
  const consentToken = buildConsentToken({
    preflight,
    operation: preflight.intent.primaryAction,
    freshUserGesture: true,
  }, { ...options, createdAt: status.generatedAt, token: 'self-test-token' });
  const refusal = buildExecutionRefusal({ preflightId: preflight.preflightId }, { ...options, createdAt: status.generatedAt });
  const execution = buildDesktopControlExecution({
    preflight,
    operation: preflight.intent.primaryAction,
    consentToken,
  }, { ...options, createdAt: status.generatedAt });
  const failures = [];
  if (status.status !== 'ready') failures.push('status not ready');
  if (status.destructiveActionsTaken !== false) failures.push('status mutated');
  if (preflight.modelLane !== 'fara_gui_grounding') failures.push('missing Fara lane');
  if (preflight.executionAllowed !== false) failures.push('preflight should not allow execution');
  if (preflight.destructiveActionsTaken !== false) failures.push('preflight mutated');
  if (consentToken.status !== 'issued') failures.push('consent token not issued');
  if (consentToken.executionAllowed !== true) failures.push('consent token should allow staging');
  if (refusal.status !== 'refused') failures.push('execution should be refused');
  if (refusal.desktopAutomationExecuted !== false) failures.push('refusal executed desktop automation');
  if (execution.status !== 'approved_execution_staged') failures.push('approved execution was not staged');
  if (execution.desktopAutomationExecuted !== false) failures.push('staged execution touched desktop');
  if (failures.length) throw new Error(`self-test failed: ${failures.join(', ')}`);
  return { status, preflight, consentToken, refusal, execution };
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
