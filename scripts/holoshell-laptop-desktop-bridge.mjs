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
 *
 * Access (security patch 4): every route except GET /health and OPTIONS needs the HoloShell admin
 * key in x-phone-admin (constant-time, fails closed when HOLOSHELL_PHONE_ADMIN_KEY is unset), and
 * every POST needs Content-Type application/json; both are checked before the body is read. The
 * :8747 page calls this bridge cross-origin, so responses allow exactly the origins in
 * HOLOSHELL_BRIDGE_ALLOWED_ORIGINS (default: the canonical HoloShell surface origins), never '*'.
 * Consent tokens are HMAC-SHA256 signed (see signConsentToken), short-lived and single-use.
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildDesktopControlPlan } from './holoshell-desktop-control-plan.mjs';
import {
  captureGesture,
  verifyProof as verifyGestureProof,
  signProof as signGestureProof,
  CONSENT_GESTURE_SCHEMA,
} from './holoshell-consent-gesture.mjs';

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
// GUI-mutating actions are wired + window-scope-protected (the action-executor's
// assertForegroundIsTarget refuses any click/type that would land on a non-target window) and
// consent-token gated — but they are ADMITTED into the autonomous bridge lane ONLY when the
// founder explicitly opts in via HOLOSHELL_ADMIT_GUI_MUTATION=1. Default OFF keeps the
// autonomous Jetson->bridge path open_url-only (the safe default). REMAINING HARDENING before
// trusting the autonomous lane fully: consent-token freshUserGesture must be a real human
// keypress, not an agent-supplied flag (board task lbe3). Direct executor (--approved --execute)
// already gives the window-scope-protected, human-invoked execute capability today.
const GUI_MUTATION_ACTIONS = ['focus_window', 'click_control', 'invoke_control', 'type_text', 'hotkey'];
const ADMIT_GUI_MUTATION = /^(1|true|on)$/i.test(process.env.HOLOSHELL_ADMIT_GUI_MUTATION || '');
const ADMITTED_EXECUTOR_ACTIONS = new Set([
  'open_url',
  ...(ADMIT_GUI_MUTATION ? GUI_MUTATION_ACTIONS : []),
]);

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

function consentGestureMaxTtlMs(preflight = {}) {
  const ttlMs = Number(preflight.consentGesture?.ttlMs || 30000);
  return Number.isFinite(ttlMs) && ttlMs > 0 ? Math.max(1000, ttlMs) : 30000;
}

// ── Consent tokens ────────────────────────────────────────────────────────────
// Format: hsct1.<base64url(JSON claims)>.<base64url(HMAC-SHA256(secret, "hsct1.<claims>"))>
// Claims bind the scope, operation, exact preflight (id + receipt hash + target fingerprint +
// challenge), issue time, a mandatory expiry (at most 5 minutes after issue) and a random nonce.
// Only this bridge mints and verifies them, so the secret never leaves the laptop. The secret is
// HOLOSHELL_CONSENT_SECRET only: at least 32 characters and NOT the admin key. There is no
// fallback (a secret derived from the admin key would let any admin-key holder mint tokens and
// skip the F8 gesture), so the bridge refuses to start without a valid one, and the token
// functions fail closed if it is missing or invalid.
export const CONSENT_TOKEN_FORMAT = 'hsct1';
export const CONSENT_TOKEN_SCOPE = 'desktop-control.execute';
export const CONSENT_TOKEN_MAX_TTL_MS = 5 * 60_000;
const CONSENT_TOKEN_FUTURE_SKEW_MS = 5_000;
export const CONSENT_SECRET_MIN_LENGTH = 32;
export const CONSENT_SECRET_GENERATE_HINT =
  'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"';
const DEFAULT_CONSUMED_NONCE_MAX = 4096;

function consumedNonceMax(env = process.env) {
  const value = Number(env.HOLOSHELL_CONSENT_NONCE_MAX || DEFAULT_CONSUMED_NONCE_MAX);
  return Number.isInteger(value) && value >= 1 ? value : DEFAULT_CONSUMED_NONCE_MAX;
}

/**
 * Condition of HOLOSHELL_CONSENT_SECRET, never its value: ok | missing | too_short |
 * equals_admin_key. The admin-key comparison is over sha256 digests with timingSafeEqual.
 */
export function consentSecretCondition(env = process.env) {
  const secret = String(env.HOLOSHELL_CONSENT_SECRET || '').trim();
  if (!secret) return 'missing';
  if (secret.length < CONSENT_SECRET_MIN_LENGTH) return 'too_short';
  const adminKey = String(env.HOLOSHELL_PHONE_ADMIN_KEY || '').trim();
  if (adminKey) {
    const a = createHash('sha256').update(secret, 'utf8').digest();
    const b = createHash('sha256').update(adminKey, 'utf8').digest();
    if (timingSafeEqual(a, b)) return 'equals_admin_key';
  }
  return 'ok';
}

export function consentSecretProblem(condition) {
  if (condition === 'missing') return 'HOLOSHELL_CONSENT_SECRET is not set.';
  if (condition === 'too_short') return `HOLOSHELL_CONSENT_SECRET is shorter than ${CONSENT_SECRET_MIN_LENGTH} characters.`;
  if (condition === 'equals_admin_key') return 'HOLOSHELL_CONSENT_SECRET must not be the same value as HOLOSHELL_PHONE_ADMIN_KEY.';
  return '';
}

export function consentSecretStartupError(condition) {
  return `${consentSecretProblem(condition)} The laptop desktop bridge refuses to start without an independent consent-token secret. ` +
    `Generate one with: ${CONSENT_SECRET_GENERATE_HINT} and set it as HOLOSHELL_CONSENT_SECRET on the laptop only ` +
    '(at least 32 characters, never the admin key).';
}

export function consentTokenSecret(env = process.env) {
  if (consentSecretCondition(env) !== 'ok') return null;
  return Buffer.from(String(env.HOLOSHELL_CONSENT_SECRET).trim(), 'utf8');
}

function consentTokenMac(body, secret) {
  return createHmac('sha256', secret).update(`${CONSENT_TOKEN_FORMAT}.${body}`, 'utf8').digest();
}

export function signConsentToken(claims, secret = consentTokenSecret()) {
  if (!secret) throw new Error('consent_secret_unavailable');
  const body = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
  return `${CONSENT_TOKEN_FORMAT}.${body}.${consentTokenMac(body, secret).toString('base64url')}`;
}

export function verifyConsentTokenSignature(token, secret = consentTokenSecret()) {
  if (!secret) return { ok: false, reason: 'consent_secret_unavailable' };
  const parts = typeof token === 'string' ? token.split('.') : [];
  if (parts.length !== 3 || parts[0] !== CONSENT_TOKEN_FORMAT ||
      !/^[A-Za-z0-9_-]{1,4096}$/u.test(parts[1]) || !/^[A-Za-z0-9_-]{43}$/u.test(parts[2])) {
    return { ok: false, reason: 'consent_token_malformed' };
  }
  const expected = consentTokenMac(parts[1], secret);
  const provided = Buffer.from(parts[2], 'base64url');
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return { ok: false, reason: 'consent_token_signature_invalid' };
  }
  try {
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!claims || typeof claims !== 'object') return { ok: false, reason: 'consent_token_malformed' };
    return { ok: true, claims };
  } catch {
    return { ok: false, reason: 'consent_token_malformed' };
  }
}

// Expiry uses the wall clock when options.realClock is set (the HTTP server always sets it, so
// --created-at cannot freeze token expiry); in-process callers use their createdAt clock.
function tokenClockMs(options = {}) {
  if (options.realClock) return Date.now();
  const at = Date.parse(generatedAt(options));
  return Number.isFinite(at) ? at : Date.now();
}

// Drops only EXPIRED nonces (an unexpired one must stay to block its replay). Returns true when
// there is room for one more; callers fail closed (503) when it is still full.
function pruneConsumedNonces(store, now, max = consumedNonceMax()) {
  for (const [nonce, exp] of store) if (exp <= now) store.delete(nonce);
  return store.size < max;
}

function preflightReceiptHash(preflight = {}) {
  return hashValue({
    schemaVersion: preflight.schemaVersion || '',
    preflightId: preflight.preflightId || '',
    planId: preflight.planId || '',
    permissionEnvelope: preflight.permissionEnvelope || '',
    primaryAction: preflight.intent?.primaryAction || '',
    intentSha256: preflight.intent?.sha256 || '',
    target: preflight.target || {},
    targetFingerprint: preflight.targetFingerprint || '',
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

function classifyPublicUrl(url) {
  if (!url) return 'missing_url';
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return 'invalid_url';
  }
  if (!/^https?:$/i.test(parsed.protocol)) return 'blocked_scheme';
  const combined = `${parsed.hostname} ${parsed.pathname} ${parsed.search}`.toLowerCase();
  if (/(checkout|payment|billing|purchase|subscribe|transfer|wallet|bank)/iu.test(combined)) {
    return 'break_glass_payment';
  }
  if (/(login|signin|sign-in|account|settings|profile|admin|oauth|auth|password|security|2fa|mfa|upload|download|export|import|delete|remove|submit|compose|send)/iu.test(combined)) {
    return 'credential_adjacent';
  }
  return 'public_web';
}

function normalizeUrlTarget(url) {
  const text = safeString(url, '');
  if (!text) return '';
  try {
    return new URL(text).href;
  } catch {
    return text;
  }
}

function extractFirstUrl(text) {
  const match = String(text || '').match(/\bhttps?:\/\/[^\s<>"']+/iu);
  if (!match) return '';
  return normalizeUrlTarget(match[0].replace(/[),.;!?]+$/u, ''));
}

function extractActionTarget(payload = {}, operation = '') {
  const action = payload.action || payload.target || {};
  return {
    operation,
    url: safeString(payload.url || action.url || payload.preflight?.target?.url, ''),
    windowTitle: safeString(payload.windowTitle || action.windowTitle, ''),
    handle: safeString(payload.handle || action.handle, ''),
    controlName: safeString(payload.controlName || action.controlName, ''),
    text: typeof (payload.text ?? action.text) === 'string' ? String(payload.text ?? action.text) : '',
    hotkey: safeString(payload.hotkey || action.hotkey, ''),
    x: payload.x ?? action.x ?? '',
    y: payload.y ?? action.y ?? '',
  };
}

function normalizeActionTarget(target = {}, operation = '') {
  return {
    operation: safeString(operation || target.operation, ''),
    url: normalizeUrlTarget(target.url),
    windowTitle: safeString(target.windowTitle, ''),
    handle: safeString(target.handle, ''),
    controlName: safeString(target.controlName, ''),
    text: typeof target.text === 'string' ? target.text : '',
    hotkey: safeString(target.hotkey, ''),
    x: target.x === '' || target.x == null ? '' : String(target.x).trim(),
    y: target.y === '' || target.y == null ? '' : String(target.y).trim(),
  };
}

function buildPreflightTarget(plan = {}, payload = {}, operation = '') {
  const payloadTarget = extractActionTarget(payload, operation);
  const planTarget = plan.target || {};
  return normalizeActionTarget({
    operation,
    url: payloadTarget.url || planTarget.url || extractFirstUrl(plan.intent?.raw || payload.intent || ''),
    windowTitle: payloadTarget.windowTitle || planTarget.windowTitle || '',
    handle: payloadTarget.handle || planTarget.handle || '',
    controlName: payloadTarget.controlName || planTarget.controlName || '',
    text: payloadTarget.text || planTarget.text || '',
    hotkey: payloadTarget.hotkey || planTarget.hotkey || '',
    x: payloadTarget.x !== '' && payloadTarget.x != null ? payloadTarget.x : (planTarget.x ?? ''),
    y: payloadTarget.y !== '' && payloadTarget.y != null ? payloadTarget.y : (planTarget.y ?? ''),
  }, operation);
}

function actionTargetFingerprint(target = {}) {
  return hashValue(normalizeActionTarget(target, target.operation));
}

function requiresExactExecutionTarget(operation) {
  return ADMITTED_EXECUTOR_ACTIONS.has(operation);
}

function assertExactExecutionTarget(preflight = {}, target = {}, operation = '') {
  if (!requiresExactExecutionTarget(operation)) return;
  const expectedFingerprint = preflight.targetFingerprint || '';
  if (!expectedFingerprint) throw new Error('desktop_control_target_unbound');
  const actualFingerprint = actionTargetFingerprint(normalizeActionTarget(target, operation));
  if (actualFingerprint !== expectedFingerprint) throw new Error('desktop_control_target_mismatch');
}

// Invoke the action-executor for a GUI-mutating action with --approved --execute. The executor
// applies the window-scope assertion (refuses on foreground!=target) and writes a signed receipt;
// a window_scope_violation surfaces as a status:'error' receipt (executionPerformed:false), never
// a stray keystroke. Only reachable when the operation is in ADMITTED_EXECUTOR_ACTIONS.
function runGuiActionExecutor(operation, target, options = {}) {
  const receiptRoot = repoPath(path.join(options.receiptDir || DEFAULT_RECEIPT_DIR, 'hardware-actions'));
  mkdirSync(receiptRoot, { recursive: true });
  const archiveDir = path.join(receiptRoot, 'receipts');
  const argv = [
    path.join(REPO_ROOT, 'scripts', 'holoshell-action-executor.mjs'),
    '--action', operation, '--approved', '--execute', '--json',
    '--receipt-dir', archiveDir,
    '--output', path.join(receiptRoot, 'action-latest.json'),
    '--js-output', path.join(receiptRoot, 'action-latest.js'),
  ];
  if (target.handle) argv.push('--handle', target.handle);
  else if (target.windowTitle) argv.push('--window-title', target.windowTitle);
  if (target.controlName) argv.push('--control-name', target.controlName);
  if (target.text) argv.push('--text', target.text);
  if (target.hotkey) argv.push('--hotkey', target.hotkey);
  if (target.x !== '' && target.x != null) argv.push('--x', String(target.x));
  if (target.y !== '' && target.y != null) argv.push('--y', String(target.y));
  const result = spawnSync(process.execPath, argv, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 30_000,
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(`gui_action_executor_failed:${(result.stderr || result.stdout || '').trim().slice(0, 400)}`);
  }
  return JSON.parse(result.stdout);
}

function simulatedOpenUrlReceipt(url, options = {}) {
  const generatedAt = generatedAtForReceipt(options);
  const target = new URL(url);
  return {
    schemaVersion: 'hololand.holoshell.hardware-action.v0.1.0',
    generatedAt,
    actionId: stableId('hwa_simulated_open_url', `${generatedAt}:${url}`),
    request: {
      actionKind: 'open_url',
      url,
      approved: true,
      executeRequested: true,
      receiptRequired: true,
    },
    permission: {
      envelope: 'guarded_execute',
      approvalRequired: true,
      approved: true,
      executeRequested: true,
      mutating: true,
      breakGlass: false,
    },
    browserBoundary: {
      urlClassification: 'public_web',
      publicBrowsing: true,
      host: target.host,
      profileBoundary: 'system_default_public_ok',
    },
    witness: {
      shellVisibleChange: true,
      visibleChangeSource: 'browser_navigation_dispatched',
      browserNavigation: {
        targetUrl: target.href,
        targetHost: target.host,
        targetOrigin: target.origin,
        targetPath: `${target.pathname}${target.search}${target.hash}`,
        dispatchAccepted: true,
        witnessKind: 'browser_navigation_dispatched',
      },
    },
    summary: {
      status: 'completed',
      actionKind: 'open_url',
      permissionEnvelope: 'guarded_execute',
      approvalRequired: true,
      approved: true,
      executeRequested: true,
      executionPerformed: true,
      mutatingActionExecuted: true,
      targetResolved: true,
      targetUrlHost: target.host,
      shellVisibleChange: true,
      visibleWitnessKind: 'browser_navigation_dispatched',
      browserBoundaryStatus: 'public_web',
      browserProfileBoundary: 'system_default_public_ok',
      error: '',
    },
    result: {
      ok: true,
      target: url,
      simulated: true,
      browserNavigation: {
        targetUrl: target.href,
        targetHost: target.host,
        targetOrigin: target.origin,
        targetPath: `${target.pathname}${target.search}${target.hash}`,
        dispatchAccepted: true,
        witnessKind: 'browser_navigation_dispatched',
      },
    },
    rollback: 'close_browser_tab_or_window_manually',
  };
}

function generatedAtForReceipt(options = {}) {
  return options.createdAt || new Date().toISOString();
}

function runOpenUrlActionExecutor(url, options = {}, payload = {}) {
  const classification = classifyPublicUrl(url);
  if (classification !== 'public_web') {
    throw new Error(`open_url_executor_refused:${classification}`);
  }
  if (payload.executorMode === 'simulated' || options.executorMode === 'simulated') {
    return simulatedOpenUrlReceipt(url, options);
  }
  const receiptRoot = repoPath(path.join(options.receiptDir || DEFAULT_RECEIPT_DIR, 'hardware-actions'));
  mkdirSync(receiptRoot, { recursive: true });
  const latestPath = path.join(receiptRoot, 'action-latest.json');
  const latestJsPath = path.join(receiptRoot, 'action-latest.js');
  const archiveDir = path.join(receiptRoot, 'receipts');
  const result = spawnSync(process.execPath, [
    path.join(REPO_ROOT, 'scripts', 'holoshell-action-executor.mjs'),
    '--action',
    'open_url',
    '--url',
    url,
    '--approved',
    '--execute',
    '--json',
    '--receipt-dir',
    archiveDir,
    '--output',
    latestPath,
    '--js-output',
    latestJsPath,
  ], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 30_000,
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(`open_url_executor_failed:${(result.stderr || result.stdout || '').trim().slice(0, 400)}`);
  }
  return JSON.parse(result.stdout);
}

function executeAdmittedAction(payload = {}, options = {}, validation = {}) {
  const operation = validation.operation || safeString(payload.operation, '');
  if (!ADMITTED_EXECUTOR_ACTIONS.has(operation)) {
    throw new Error(`executor_lane_not_admitted:${operation || 'unknown'}`);
  }
  const target = normalizeActionTarget(extractActionTarget(payload, operation), operation);
  assertExactExecutionTarget(payload.preflight, target, operation);
  if (operation === 'open_url') {
    if (!target.url) throw new Error('open_url_executor_requires_url');
    return {
      action: operation,
      target,
      hardwareActionReceipt: runOpenUrlActionExecutor(target.url, options, payload),
    };
  }
  if (GUI_MUTATION_ACTIONS.includes(operation)) {
    // Admitted only when HOLOSHELL_ADMIT_GUI_MUTATION is on (the membership check above already
    // enforced that). Window-scope assertion + signed receipt applied by the executor.
    return {
      action: operation,
      target,
      hardwareActionReceipt: runGuiActionExecutor(operation, target, options),
    };
  }
  throw new Error(`executor_lane_not_implemented:${operation}`);
}

export function buildBridgeStatus(options = {}) {
  const host = options.host || DEFAULT_HOST;
  const port = Number(options.port || DEFAULT_PORT);
  const url = options.url || `http://${host}:${port}`;
  const at = generatedAt(options);
  const status = options.status || 'ready';
  return {
    schemaVersion: LAPTOP_DESKTOP_BRIDGE_SCHEMA,
    reportId: stableId('desktop_bridge_report', `${at}:${url}:${process.pid}`),
    generatedAt: at,
    status,
    url,
    hostRole: 'laptop_desktop_bridge',
    expectedSurface: 'Jetson-hosted HoloShell browser page',
    source: 'apps/holoshell/source/holoshell-desktop-control-bridge.hsplus',
    daemonScript: 'scripts/holoshell-laptop-desktop-bridge.mjs',
    statusSource: options.statusSource || 'daemon_runtime',
    loopbackReachable: options.loopbackReachable ?? status === 'ready',
    statusProbe: options.statusProbe || null,
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
      admittedExecutorActions: [...ADMITTED_EXECUTOR_ACTIONS],
    },
    capabilities: [
      'bridge_status',
      'desktop_action_preflight',
      'consent_gesture_capture',
      'consent_token_issue',
      'consent_token_verify',
      'approved_execution_staging',
      'admitted_open_url_executor',
      'execution_refusal',
      'receipt_write',
      'browser_proxied_jetson_report',
    ],
    endpoints: {
      status: '/api/desktop-control/bridge',
      preflight: '/api/desktop-control/preflight',
      gestureProof: '/api/desktop-control/gesture-proof',
      consentToken: '/api/desktop-control/consent-token',
      execute: '/api/desktop-control/execute',
    },
    mutationBoundary: 'os_mutation_refused_until_consent_token_and_action_executor',
    // Condition only (never the value) of this process's HOLOSHELL_CONSENT_SECRET.
    consentSecret: {
      variable: 'HOLOSHELL_CONSENT_SECRET',
      condition: consentSecretCondition(),
      problem: consentSecretProblem(consentSecretCondition()),
    },
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
  const target = buildPreflightTarget(plan, payload, primaryAction);
  const targetFingerprint = actionTargetFingerprint(target);
  const status = permissionEnvelope === 'break_glass'
    ? 'blocked_break_glass'
    : (permissionEnvelope === 'read_only' ? 'read_only_ready' : 'preflight_ready');
  const preflightId = stableId('desktop_preflight', `${at}:${planId}:${primaryAction}:${permissionEnvelope}:${targetFingerprint}`);
  const consentRequired = permissionEnvelope !== 'read_only';
  const consentChallenge = consentRequired
    ? safeString(payload.consentChallenge || options.consentChallenge, randomBytes(16).toString('base64url'))
    : '';
  const receipt = {
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
    target,
    targetFingerprint,
    targetUrlClassification: target.url ? classifyPublicUrl(target.url) : 'not_applicable',
    requiresExactExecutionTarget: requiresExactExecutionTarget(primaryAction),
    modelLane: 'fara_gui_grounding',
    permissionEnvelope,
    consentRequired,
    consentChallenge,
    consentGesture: consentRequired ? {
      schemaVersion: CONSENT_GESTURE_SCHEMA,
      challenge: consentChallenge,
      key: 'F8',
      ttlMs: 30000,
      proofRequired: true,
    } : null,
    executionAllowed: false,
    executionDefault: 'refused_until_consent_token_lane',
    approvalRequiredForDesktopAutomation: true,
    founderReviewRequired: permissionEnvelope === 'break_glass',
    destructiveActionsTaken: false,
    desktopAutomationExecuted: false,
    receiptRequired: true,
    bridge: buildBridgeStatus(options),
    nextSafeStep: consentRequired
      ? 'Show this preflight receipt and require a fresh challenge-bound HoloGate consent gesture before any desktop mutation lane exists.'
      : 'Read-only inspection is preflighted; keep the receipt and do not mutate the desktop.',
  };
  return {
    ...receipt,
    preflightReceiptHash: preflightReceiptHash(receipt),
  };
}

export function buildConsentToken(payload = {}, options = {}) {
  const preflight = payload.preflight || payload.receipt || null;
  if (!preflight?.preflightId) throw new Error('consent token requires exact preflight receipt');
  const at = generatedAt(options);
  const operation = safeString(payload.operation || preflight.intent?.primaryAction, 'inspect_screen');
  const permissionEnvelope = preflight.permissionEnvelope || 'guarded_execute';
  const consentRequired = preflight.consentRequired !== false && permissionEnvelope !== 'read_only';
  const hash = payload.preflightReceiptHash || preflightReceiptHash(preflight);
  const expectedChallenge = safeString(payload.consentChallenge || preflight.consentChallenge, '');
  // freshUserGesture is now a REAL physical keypress proof (HMAC-signed, preflight-bound,
  // fresh-TTL via holoshell-consent-gesture.mjs), NOT an agent-assertable flag (founder
  // 2026-06-24). The legacy boolean flag is honored ONLY when HOLOSHELL_ALLOW_FLAG_GESTURE=1
  // (dev/test escape hatch); production desktop mutation requires the signed gesture proof.
  const maxGestureTtlMs = consentGestureMaxTtlMs(preflight);
  const gestureResult = payload.gestureProof
    ? verifyGestureProof(payload.gestureProof, {
        preflightReceiptHash: hash,
        expectedChallenge,
        nowIso: at,
        maxTtlMs: maxGestureTtlMs,
      })
    : { ok: false, reason: 'no_gesture_proof' };
  const flagGestureAllowed = /^(1|true|on)$/i.test(process.env.HOLOSHELL_ALLOW_FLAG_GESTURE || '');
  const missingChallenge = consentRequired && !expectedChallenge;
  const freshUserGesture = gestureResult.ok
    || (flagGestureAllowed && (payload.freshUserGesture === true || payload.freshGesture === true));
  const issuedAtMs = tokenClockMs(options);
  const requestedTtlMs = Number(payload.ttlMinutes || options.ttlMinutes || 5) * 60_000;
  const ttlMs = Math.min(CONSENT_TOKEN_MAX_TTL_MS, Math.max(1_000, Number.isFinite(requestedTtlMs) ? requestedTtlMs : CONSENT_TOKEN_MAX_TTL_MS));
  const optionExpiryMs = options.expiresAt ? Date.parse(options.expiresAt) : NaN;
  const expiresAtMs = Number.isFinite(optionExpiryMs) ? Math.min(optionExpiryMs, issuedAtMs + CONSENT_TOKEN_MAX_TTL_MS) : issuedAtMs + ttlMs;
  const expiresAt = new Date(expiresAtMs).toISOString();
  const secret = options.consentSecret || consentTokenSecret();
  const blockedReason = permissionEnvelope === 'break_glass'
    ? 'break_glass_requires_founder_review'
    : (missingChallenge
        ? 'consent_challenge_required'
        : (!freshUserGesture && consentRequired
        ? (gestureResult.reason && gestureResult.reason !== 'no_gesture_proof'
            ? gestureResult.reason
            : 'fresh_user_gesture_required')
        : (consentRequired && !secret ? 'consent_secret_unavailable' : '')));
  const status = blockedReason ? 'blocked' : (consentRequired ? 'issued' : 'not_required_read_only');
  const nonce = randomBytes(16).toString('hex');
  const tokenId = stableId('desktop_consent_token', `${at}:${preflight.preflightId}:${operation}:${hash}:${nonce}`);
  // Only an issued consent carries a token; blocked and read-only receipts carry none.
  const token = status === 'issued'
    ? signConsentToken({
        v: 1,
        scope: CONSENT_TOKEN_SCOPE,
        tid: tokenId,
        op: operation,
        pid: preflight.preflightId,
        prh: hash,
        tfp: preflight.targetFingerprint || '',
        ch: expectedChallenge,
        iat: issuedAtMs,
        exp: expiresAtMs,
        nonce,
      }, secret)
    : '';
  return {
    schemaVersion: DESKTOP_CONTROL_CONSENT_TOKEN_SCHEMA,
    tokenId,
    token,
    tokenFormat: token ? CONSENT_TOKEN_FORMAT : '',
    tokenScope: CONSENT_TOKEN_SCOPE,
    tokenSingleUse: true,
    tokenHash: token ? hashText(token) : '',
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
    targetFingerprint: preflight.targetFingerprint || '',
    tokenBoundToTargetFingerprint: Boolean(preflight.targetFingerprint),
    consentChallenge: expectedChallenge,
    permissionEnvelope,
    consentRequired,
    freshUserGestureRequired: consentRequired,
    freshUserGestureObserved: freshUserGesture,
    gestureVerified: gestureResult.ok,
    gestureReason: gestureResult.reason || '',
    gestureProofSchema: CONSENT_GESTURE_SCHEMA,
    maxGestureProofTtlMs: maxGestureTtlMs,
    challengeBound: Boolean(expectedChallenge),
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
  // Only the signed token string is trusted; every other client-supplied field is ignored.
  const tokenString = typeof consentToken === 'string' ? consentToken : consentToken?.token;
  if (!preflight?.preflightId) return { valid: false, reason: 'missing_exact_preflight_receipt' };
  if (!tokenString || typeof tokenString !== 'string') return { valid: false, reason: 'missing_consent_token' };
  const verified = verifyConsentTokenSignature(tokenString, options.consentSecret || consentTokenSecret());
  if (!verified.ok) return { valid: false, reason: verified.reason };
  const claims = verified.claims;
  if (claims.v !== 1 || claims.scope !== CONSENT_TOKEN_SCOPE) return { valid: false, reason: 'consent_token_scope_mismatch' };
  const operation = safeString(payload.operation || preflight.intent?.primaryAction || claims.op, 'inspect_screen');
  if (claims.op !== operation) return { valid: false, reason: 'consent_token_operation_mismatch' };
  if (claims.pid !== preflight.preflightId) return { valid: false, reason: 'consent_token_preflight_mismatch' };
  const hash = preflightReceiptHash(preflight);
  if (claims.prh !== hash) return { valid: false, reason: 'consent_token_receipt_hash_mismatch' };
  if (claims.tfp !== (preflight.targetFingerprint || '')) return { valid: false, reason: 'consent_token_target_mismatch' };
  if (preflight.consentChallenge && claims.ch !== preflight.consentChallenge) {
    return { valid: false, reason: 'consent_token_challenge_mismatch' };
  }
  const now = tokenClockMs(options);
  if (!Number.isFinite(claims.iat) || !Number.isFinite(claims.exp) ||
      claims.exp <= claims.iat || claims.exp - claims.iat > CONSENT_TOKEN_MAX_TTL_MS) {
    return { valid: false, reason: 'consent_token_expiry_invalid' };
  }
  if (claims.exp <= now) return { valid: false, reason: 'consent_token_expired' };
  if (claims.iat - now > CONSENT_TOKEN_FUTURE_SKEW_MS) return { valid: false, reason: 'consent_token_from_future' };
  if (typeof claims.nonce !== 'string' || !/^[0-9a-f]{32}$/u.test(claims.nonce)) {
    return { valid: false, reason: 'consent_token_malformed' };
  }
  if (options.consumedNonces && options.consumedNonces.has(claims.nonce)) {
    return { valid: false, reason: 'consent_token_replayed' };
  }
  return {
    valid: true,
    reason: '',
    operation,
    preflightReceiptHash: hash,
    targetFingerprint: preflight.targetFingerprint || '',
    consentChallenge: safeString(claims.ch, ''),
    tokenId: safeString(claims.tid, ''),
    expiresAt: new Date(claims.exp).toISOString(),
    nonce: claims.nonce,
    nonceExpiresAtMs: claims.exp,
  };
}

export function buildDesktopControlExecution(payload = {}, options = {}) {
  const validation = validateConsentToken(payload, options);
  if (!validation.valid) {
    throw new Error(validation.reason || 'consent_token_invalid');
  }
  // Single use: burn the nonce before anything runs, so a failed or refused execution cannot be
  // retried with the same token either.
  if (options.consumedNonces) {
    if (!pruneConsumedNonces(options.consumedNonces, tokenClockMs(options), options.consumedNonceMax)) {
      throw new Error('consent_nonce_store_full');
    }
    options.consumedNonces.set(validation.nonce, validation.nonceExpiresAtMs);
  }
  const at = generatedAt(options);
  const preflight = payload.preflight;
  const executeApprovedAction = payload.executeApprovedAction === true;
  const actionExecution = executeApprovedAction
    ? executeAdmittedAction(payload, options, validation)
    : null;
  const hardwareSummary = actionExecution?.hardwareActionReceipt?.summary || null;
  const hardwareStatus = hardwareSummary?.status || '';
  const performed = Boolean(hardwareSummary?.executionPerformed);
  const executionId = stableId(
    'desktop_execution',
    `${at}:${validation.tokenId}:${preflight.preflightId}:${validation.operation}:${validation.preflightReceiptHash}:${executeApprovedAction ? 'execute' : 'stage'}`
  );
  return {
    schemaVersion: DESKTOP_CONTROL_EXECUTION_SCHEMA,
    executionId,
    generatedAt: at,
    status: actionExecution ? `completed_${validation.operation}` : 'approved_execution_staged',
    source: 'apps/holoshell/source/holoshell-desktop-control-bridge.hsplus',
    daemonScript: 'scripts/holoshell-laptop-desktop-bridge.mjs',
    holoGateStages: ['identify', 'scope', 'log'],
    operation: validation.operation,
    preflightId: preflight.preflightId,
    planId: preflight.planId || '',
    preflightReceiptHash: validation.preflightReceiptHash,
    consentChallenge: validation.consentChallenge,
    consentTokenId: validation.tokenId,
    consentTokenExpiresAt: validation.expiresAt,
    executionAllowed: true,
    executionMode: actionExecution ? `admitted_${validation.operation}_executor` : 'staged_receipt_only_until_action_executor',
    executeApprovedAction,
    admittedExecutorAction: ADMITTED_EXECUTOR_ACTIONS.has(validation.operation),
    requiresExactExecutionTarget: requiresExactExecutionTarget(validation.operation),
    preflightTargetFingerprint: preflight.targetFingerprint || '',
    executionTargetFingerprint: actionExecution?.target ? actionTargetFingerprint(actionExecution.target) : '',
    executionTargetMatchVerified: Boolean(actionExecution?.target && preflight.targetFingerprint),
    destructiveActionsTaken: false,
    desktopAutomationExecuted: performed,
    hardwareAction: actionExecution ? {
      action: actionExecution.action,
      target: actionExecution.target,
      status: hardwareStatus,
      actionId: actionExecution.hardwareActionReceipt?.actionId || '',
      receiptPath: actionExecution.hardwareActionReceipt?.output?.receiptPath || '',
      visibleWitnessKind: hardwareSummary?.visibleWitnessKind || '',
      targetUrlHost: hardwareSummary?.targetUrlHost || '',
    } : null,
    approvalRequiredForDesktopAutomation: true,
    receiptRequired: true,
    bridge: buildBridgeStatus(options),
    nextSafeStep: actionExecution
      ? 'Review the hardware action receipt and rollback manually if the opened browser tab is not desired.'
      : 'Admit and validate a concrete action executor lane for this action class before allowing OS mutation.',
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

export function writeLatestBridgeStatus(status, receiptDir = DEFAULT_RECEIPT_DIR) {
  const receiptPath = repoPath(path.join(receiptDir || DEFAULT_RECEIPT_DIR, 'latest-status.json'));
  mkdirSync(path.dirname(receiptPath), { recursive: true });
  const withPath = { ...status, receiptPath };
  writeFileSync(receiptPath, `${JSON.stringify(withPath, null, 2)}\n`, 'utf8');
  return withPath;
}

// ── Access gate ───────────────────────────────────────────────────────────────
const DEFAULT_BRIDGE_ALLOWED_ORIGINS = 'http://holojetson.local:8747,http://127.0.0.1:8747,http://localhost:8747';

// Exact origins (scheme://host[:port]) the HoloShell page is served from. '*', 'null' and
// anything that is not a bare http(s) origin are dropped, so there is no wildcard path.
export function bridgeAllowedOrigins(env = process.env) {
  const raw = env.HOLOSHELL_BRIDGE_ALLOWED_ORIGINS ?? DEFAULT_BRIDGE_ALLOWED_ORIGINS;
  return new Set(String(raw).split(',')
    .map((item) => item.trim().replace(/\/+$/u, ''))
    .filter((item) => /^https?:\/\/[A-Za-z0-9.\-\[\]:]+$/u.test(item)));
}

export function isBridgeAdmin(req, env = process.env) {
  const key = String(env.HOLOSHELL_PHONE_ADMIN_KEY || '').trim();
  if (!key) return false; // fail closed
  const given = String(req.headers['x-phone-admin'] || '').trim();
  const a = createHash('sha256').update(given, 'utf8').digest();
  const b = createHash('sha256').update(key, 'utf8').digest();
  return timingSafeEqual(a, b);
}

function isJsonRequest(req) {
  return String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase() === 'application/json';
}

function corsHeadersFor(req) {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  if (!origin || !bridgeAllowedOrigins().has(origin)) return { Vary: 'Origin' };
  const headers = {
    Vary: 'Origin',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, X-HoloShell-Bridge, X-Phone-Admin',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '600',
  };
  // Chrome Private Network Access preflight (page on a LAN/host origin calling 127.0.0.1).
  if (String(req.headers['access-control-request-private-network'] || '').toLowerCase() === 'true') {
    headers['Access-Control-Allow-Private-Network'] = 'true';
  }
  return headers;
}

function sendJson(res, data, statusCode = 200, extraHeaders = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    ...(res.holoshellCorsHeaders || {}),
    ...extraHeaders,
  });
  res.end(JSON.stringify(data));
}

// Returns true when the gate answered the request itself.
function gateBridgeRequest(req, res, pathname) {
  res.holoshellCorsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    req.resume();
    res.writeHead(204, { Allow: 'GET, POST, OPTIONS', 'Cache-Control': 'no-store', ...res.holoshellCorsHeaders });
    res.end();
    return true;
  }
  if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/health') return false;
  if (!isBridgeAdmin(req)) {
    req.resume();
    sendJson(res, { error: 'admin key required: send it as the x-phone-admin header', destructiveActionsTaken: false }, 403, { 'X-HoloShell-Gate': 'key-required' });
    return true;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD' && !isJsonRequest(req)) {
    req.resume();
    sendJson(res, { error: 'Content-Type must be application/json', destructiveActionsTaken: false }, 415, { 'X-HoloShell-Gate': 'json-required' });
    return true;
  }
  return false;
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

const DEFAULT_CONSUMED_NONCES = new Map(); // nonce -> expiry (ms), per bridge process

export async function handleBridgeRequest(req, res, options = {}) {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
  const requestOptions = {
    host: options.host || DEFAULT_HOST,
    port: options.port || DEFAULT_PORT,
    receiptDir: options.receiptDir || DEFAULT_RECEIPT_DIR,
    createdAt: options.createdAt,
    realClock: true,
    consumedNonces: options.consumedNonces || DEFAULT_CONSUMED_NONCES,
    consumedNonceMax: options.consumedNonceMax || consumedNonceMax(),
  };

  if (gateBridgeRequest(req, res, requestUrl.pathname)) return;

  // Open liveness only: no status, receipts or paths without the key. HEAD gets the same headers.
  if ((req.method === 'GET' || req.method === 'HEAD') && requestUrl.pathname === '/health') {
    if (req.method === 'HEAD') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(res.holoshellCorsHeaders || {}) });
      res.end();
      return;
    }
    sendJson(res, { ok: true, service: 'holoshell-laptop-desktop-bridge', schemaVersion: LAPTOP_DESKTOP_BRIDGE_SCHEMA });
    return;
  }

  // Single-use nonces must stay until they expire. If the store is full of unexpired nonces,
  // refuse to mint or accept tokens (fail closed) instead of forgetting one.
  if (req.method === 'POST' && (requestUrl.pathname === '/api/desktop-control/consent-token' ||
      requestUrl.pathname === '/api/desktop-control/execute') &&
      !pruneConsumedNonces(requestOptions.consumedNonces, Date.now(), requestOptions.consumedNonceMax)) {
    req.resume();
    sendJson(res, { error: 'consent_nonce_store_full', reason: 'too many unexpired consent tokens; retry after they expire',
      destructiveActionsTaken: false, desktopAutomationExecuted: false }, 503, { 'Retry-After': '60' });
    return;
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/desktop-control/bridge') {
    const status = writeLatestBridgeStatus(buildBridgeStatus(requestOptions), requestOptions.receiptDir);
    sendJson(res, status);
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

  if (req.method === 'POST' && requestUrl.pathname === '/api/desktop-control/gesture-proof') {
    try {
      const payload = await readRequestBody(req);
      const preflight = payload.preflight || payload.receipt || null;
      if (!preflight?.preflightId) throw new Error('gesture proof requires exact preflight receipt');
      const challenge = safeString(payload.challenge || payload.consentChallenge || preflight.consentChallenge, '');
      if (!challenge) throw new Error('consent_challenge_required');
      const hash = payload.preflightReceiptHash || preflight.preflightReceiptHash || preflightReceiptHash(preflight);
      const maxTtlMs = consentGestureMaxTtlMs(preflight);
      const requestedTtlMs = Number(payload.ttlMs || payload.ttl || maxTtlMs);
      const ttlMs = Math.min(
        Math.max(1000, Number.isFinite(requestedTtlMs) ? requestedTtlMs : maxTtlMs),
        maxTtlMs
      );
      const proof = captureGesture({
        challenge,
        preflightReceiptHash: hash,
        key: payload.key || preflight.consentGesture?.key || 'F8',
        ttlMs,
      });
      sendJson(res, {
        ...proof,
        preflightId: preflight.preflightId,
        destructiveActionsTaken: false,
        desktopAutomationExecuted: false,
      }, proof.observedGesture ? 200 : 403);
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
    let payload = {};
    try {
      payload = await readRequestBody(req);
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
      const refusalPayload = {
        ...payload,
        reason: `desktop_control_consent_token_invalid:${String(error.message || error)}`,
      };
      const receipt = buildExecutionRefusal(refusalPayload, requestOptions);
      const saved = writeReceipt(receipt, requestOptions.receiptDir, 'refusals', receipt.refusalId, '.refusal');
      sendJson(res, saved, 403);
    }
    return;
  }

  sendJson(res, { error: 'not_found', path: requestUrl.pathname, destructiveActionsTaken: false }, 404);
}

export function createLaptopDesktopBridgeServer(options = {}) {
  // Refuse to start without an independent consent-token secret (see consentSecretCondition).
  const condition = consentSecretCondition();
  if (condition !== 'ok') throw new Error(consentSecretStartupError(condition));
  const serverOptions = { ...options, consumedNonces: options.consumedNonces || new Map() };
  return createServer((req, res) => {
    handleBridgeRequest(req, res, serverOptions).catch((error) => {
      sendJson(res, { error: String(error.message || error), destructiveActionsTaken: false }, 500);
    });
  });
}

function bridgeStatusEndpoint(options = {}) {
  const host = options.host || DEFAULT_HOST;
  const port = Number(options.port || DEFAULT_PORT);
  const url = options.url || `http://${host}:${port}`;
  return `${url}/api/desktop-control/bridge`;
}

function statusProbeError(error) {
  return String(error?.cause?.code || error?.message || error || 'unknown_error');
}

export async function probeBridgeStatus(options = {}) {
  const endpoint = bridgeStatusEndpoint(options);
  try {
    const adminKey = String(process.env.HOLOSHELL_PHONE_ADMIN_KEY || '').trim();
    const response = await fetch(endpoint, {
      cache: 'no-store',
      headers: adminKey ? { 'x-phone-admin': adminKey } : {},
      signal: AbortSignal.timeout(1500),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`status_endpoint_${response.status}`);
    }
    if (body.schemaVersion !== LAPTOP_DESKTOP_BRIDGE_SCHEMA) {
      throw new Error('schema_mismatch');
    }
    return writeLatestBridgeStatus({
      ...body,
      statusSource: 'status_cli_live_probe',
      loopbackReachable: true,
      statusProbe: {
        mode: 'loopback_status_cli',
        endpoint,
        ok: true,
        statusCode: response.status,
      },
    }, options.receiptDir);
  } catch (error) {
    return writeLatestBridgeStatus(buildBridgeStatus({
      ...options,
      status: 'offline',
      statusSource: 'status_cli_live_probe',
      loopbackReachable: false,
      statusProbe: {
        mode: 'loopback_status_cli',
        endpoint,
        ok: false,
        error: statusProbeError(error),
      },
    }), options.receiptDir);
  }
}

export function runSelfTest(inputOptions = {}) {
  // The self-test signs with a throwaway in-memory secret; it never needs the real one.
  const options = { ...inputOptions, consentSecret: inputOptions.consentSecret || randomBytes(32) };
  const status = buildBridgeStatus({ ...options, createdAt: options.createdAt || '2026-06-23T00:00:00.000Z' });
  const preflight = buildDesktopControlPreflight({
    intent: 'Use Fara to inspect the screen and click the Save button.',
  }, { ...options, createdAt: status.generatedAt });
  // Construct a VALID signed gesture proof (mirrors a real keypress capture) so the self-test
  // exercises the real proof path — not the agent-assertable flag.
  const proofFor = (pf) => {
    const fields = {
      schemaVersion: CONSENT_GESTURE_SCHEMA,
      challenge: pf.consentChallenge,
      preflightReceiptHash: pf.preflightReceiptHash || preflightReceiptHash(pf),
      key: 'F8',
      pressedAt: status.generatedAt,
      observedGesture: true,
      ttlMs: pf.consentGesture?.ttlMs || 30000,
    };
    return { ...fields, signature: signGestureProof(fields) };
  };
  const consentToken = buildConsentToken({
    preflight,
    operation: preflight.intent.primaryAction,
    gestureProof: proofFor(preflight),
  }, { ...options, createdAt: status.generatedAt });
  // A consent request with NO gesture proof must be BLOCKED (the agent can't self-authorize).
  const noGestureConsent = buildConsentToken({
    preflight,
    operation: preflight.intent.primaryAction,
  }, { ...options, createdAt: status.generatedAt });
  const refusal = buildExecutionRefusal({ preflightId: preflight.preflightId }, { ...options, createdAt: status.generatedAt });
  const execution = buildDesktopControlExecution({
    preflight,
    operation: preflight.intent.primaryAction,
    consentToken,
  }, { ...options, createdAt: status.generatedAt });
  const openUrlPreflight = buildDesktopControlPreflight({
    intent: 'Open URL https://example.com/status in the default browser.',
  }, { ...options, createdAt: status.generatedAt });
  const openUrlConsent = buildConsentToken({
    preflight: openUrlPreflight,
    operation: 'open_url',
    gestureProof: proofFor(openUrlPreflight),
  }, { ...options, createdAt: status.generatedAt });
  const openUrlExecution = buildDesktopControlExecution({
    preflight: openUrlPreflight,
    operation: 'open_url',
    consentToken: openUrlConsent,
    url: 'https://example.com/status',
    executeApprovedAction: true,
    executorMode: 'simulated',
  }, { ...options, createdAt: status.generatedAt, executorMode: 'simulated' });
  const failures = [];
  if (status.status !== 'ready') failures.push('status not ready');
  if (status.destructiveActionsTaken !== false) failures.push('status mutated');
  if (preflight.modelLane !== 'fara_gui_grounding') failures.push('missing Fara lane');
  if (preflight.executionAllowed !== false) failures.push('preflight should not allow execution');
  if (preflight.destructiveActionsTaken !== false) failures.push('preflight mutated');
  if (consentToken.status !== 'issued') failures.push('consent token not issued');
  if (consentToken.executionAllowed !== true) failures.push('consent token should allow staging');
  if (consentToken.gestureVerified !== true) failures.push('valid signed gesture proof should verify');
  if (noGestureConsent.status !== 'blocked') failures.push('consent WITHOUT a gesture proof must be blocked (no agent self-authorize)');
  if (noGestureConsent.blockedReason !== 'fresh_user_gesture_required') failures.push('missing-gesture consent must require fresh user gesture');
  if (refusal.status !== 'refused') failures.push('execution should be refused');
  if (refusal.desktopAutomationExecuted !== false) failures.push('refusal executed desktop automation');
  if (execution.status !== 'approved_execution_staged') failures.push('approved execution was not staged');
  if (execution.desktopAutomationExecuted !== false) failures.push('staged execution touched desktop');
  if (openUrlExecution.status !== 'completed_open_url') failures.push('open_url executor did not complete');
  if (openUrlExecution.desktopAutomationExecuted !== true) failures.push('open_url executor did not record desktop automation');
  if (openUrlExecution.destructiveActionsTaken !== false) failures.push('open_url executor marked destructive action');
  // Safe-default guarantee (founder 2026-06-24): open_url is always admitted; GUI-mutating
  // actions (click/type/focus/hotkey) must NOT be admitted into the autonomous lane unless the
  // founder explicitly set HOLOSHELL_ADMIT_GUI_MUTATION.
  if (!ADMITTED_EXECUTOR_ACTIONS.has('open_url')) failures.push('open_url must always be admitted');
  if (!ADMIT_GUI_MUTATION && (ADMITTED_EXECUTOR_ACTIONS.has('type_text') || ADMITTED_EXECUTOR_ACTIONS.has('click_control'))) {
    failures.push('GUI mutation MUST stay gated off without HOLOSHELL_ADMIT_GUI_MUTATION');
  }
  if (failures.length) throw new Error(`self-test failed: ${failures.join(', ')}`);
  return { status, preflight, consentToken, refusal, execution, openUrlExecution };
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
      const probed = await probeBridgeStatus(args);
      // The live bridge reports its own consent-secret condition; this adds the condition of the
      // environment running --status (the one a restart would use). Never the value.
      const localCondition = consentSecretCondition();
      const status = { ...probed, localConsentSecret: { variable: 'HOLOSHELL_CONSENT_SECRET', condition: localCondition,
        problem: consentSecretProblem(localCondition), bridgeWouldStart: localCondition === 'ok' } };
      if (args.json) console.log(JSON.stringify(status, null, 2));
      else {
        console.log(`Status: ${status.status}`);
        console.log(`URL: ${status.url}`);
        console.log(`Loopback reachable: ${status.loopbackReachable ? 'yes' : 'no'}`);
        console.log(`Mutation boundary: ${status.mutationBoundary}`);
        console.log(`Consent secret (this environment): ${localCondition === 'ok' ? 'ok' : `NOT OK - ${consentSecretProblem(localCondition)} Generate one with: ${CONSENT_SECRET_GENERATE_HINT}`}`);
      }
      process.exit(0);
    }
    const condition = consentSecretCondition();
    if (condition !== 'ok') {
      console.error(`holoshell-laptop-desktop-bridge refused to start: ${consentSecretStartupError(condition)}`);
      process.exit(2);
    }
    const server = createLaptopDesktopBridgeServer(args);
    server.listen(args.port, args.host, () => {
      console.log(`HoloShell laptop desktop bridge: http://${args.host}:${args.port}`);
      console.log('Execution: consent-token staging enabled; OS mutation waits for an admitted action executor');
    });
  } catch (error) {
    console.error(`holoshell-laptop-desktop-bridge failed: ${error.message}`);
    process.exit(1);
  }
}
