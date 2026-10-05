/**
 * HoloShell laptop desktop bridge (:8751) and control daemon (:4747) — access and consent tokens.
 *
 * The threat: both servers answered every route with `Access-Control-Allow-Origin: *`, read
 * text/plain bodies and checked no key, so any web page open in the laptop browser could drive
 * them. Worse, the bridge's consent token was "verified" by an UNKEYED sha256 over fields the
 * client itself sends (token, preflight hash, operation, expiry, challenge): anyone could forge
 * one for any preflight, extend its expiry, retarget it, or replay it, skipping the physical
 * consent-gesture proof entirely, and stage or run an admitted desktop action (open_url).
 *
 * This file boots the real scripts/holoshell-laptop-desktop-bridge.mjs and
 * scripts/holoshell-control-daemon.mjs on free loopback ports. Nothing runs and nothing leaves
 * the box: a preload (`node --import`) replaces every node:child_process entry point with a
 * recording stub and disables non-loopback fetch, executions use executorMode 'simulated',
 * receipts/tmp state/HOME go to temp dirs, and the admin key is a per-run fake.
 *
 * "Attacker rewrites" below model what a caller WITHOUT the server secret can do to a real
 * token: change the bound claims and recompute whatever integrity tag it can (the old unkeyed
 * sha256 is recomputable; the new HMAC is not, so the original tag is kept).
 */

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { after, before, describe, test } from 'node:test';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const BRIDGE = fileURLToPath(new URL('../holoshell-laptop-desktop-bridge.mjs', import.meta.url));
const DAEMON = fileURLToPath(new URL('../holoshell-control-daemon.mjs', import.meta.url));
const GESTURE = new URL('../holoshell-consent-gesture.mjs', import.meta.url).href;
const ADMIN_KEY = randomBytes(18).toString('hex');
const EVIL_ORIGIN = 'http://evil.example';
const PAGE_ORIGIN = 'http://holoshell-page.test:8747';
const DAEMON_PAGE_ORIGIN = 'http://control-page.test:9000';
const OPEN_URL_INTENT = 'Open URL https://example.com/status in the default browser.';
const OTHER_URL_INTENT = 'Open URL https://example.com/other in the default browser.';
// Documented derivation (README): HMAC-SHA256(key = admin key, message = this label).
const CONSENT_SECRET = createHmac('sha256', ADMIN_KEY).update('hololand.holoshell.desktop-consent-token.v1').digest();

const tmp = mkdtempSync(join(tmpdir(), 'holoshell-desktop-bridge-auth-'));
const HOME = join(tmp, 'home');
const STUB_LOG = join(tmp, 'stub-calls.jsonl');
const PRELOAD = join(tmp, 'stub-preload.mjs');
writeFileSync(STUB_LOG, '');
writeFileSync(PRELOAD, String.raw`
import cp from 'node:child_process';
import { EventEmitter } from 'node:events';
import { appendFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { promisify } from 'node:util';
const LOG = process.env.BRIDGE_TEST_STUB_LOG;
const SRV = process.env.BRIDGE_TEST_SERVER;
const log = (entry) => appendFileSync(LOG, JSON.stringify({ server: SRV, ...entry }) + '\n');
const record = (fn, file, args) => log({ cp: fn, file: String(file), args: Array.isArray(args) ? args.map(String) : [] });
const fakeChild = () => { const c = new EventEmitter(); Object.assign(c, { pid: 0, exitCode: 0, stdout: new EventEmitter(), stderr: new EventEmitter(), stdin: { write() { return true; }, end() {} }, kill() { return true; }, unref() {}, ref() {} }); setImmediate(() => { c.emit('exit', 0, null); c.emit('close', 0, null); }); return c; };
const cbOf = (...xs) => xs.find((x) => typeof x === 'function');
cp.spawn = (f, a) => { record('spawn', f, a); return fakeChild(); };
cp.fork = (f, a) => { record('fork', f, a); return fakeChild(); };
cp.spawnSync = (f, a) => { record('spawnSync', f, a); return { pid: 0, status: 0, signal: null, stdout: '', stderr: '', output: [null, '', ''] }; };
cp.execSync = (c) => { record('execSync', c, []); return ''; };
cp.execFileSync = (f, a) => { record('execFileSync', f, a); return '{}'; };
cp.exec = (c, o, cb) => { record('exec', c, []); const d = cbOf(o, cb); setImmediate(() => d && d(null, '', '')); return fakeChild(); };
cp.exec[promisify.custom] = async (c) => { record('exec', c, []); return { stdout: '', stderr: '' }; };
cp.execFile = (f, a, o, cb) => { record('execFile', f, a); const d = cbOf(a, o, cb); setImmediate(() => d && d(null, '{}', '')); return fakeChild(); };
cp.execFile[promisify.custom] = async (f, a) => { record('execFile', f, a); return { stdout: '{}', stderr: '' }; };
syncBuiltinESMExports();
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  if (['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) return realFetch(input, init);
  log({ blocked: url.hostname });
  throw new Error('desktop-bridge-auth stub: network disabled for ' + url.hostname);
};
`);

function stubCalls(server) {
  return readFileSync(STUB_LOG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((e) => e.server === server);
}

function freePort() {
  return new Promise((resolvePort, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolvePort(port)); });
  });
}

const seen = []; // every response, for the global no-ACAO-* check

function request(port, method, path, { headers = {}, body } = {}) {
  return new Promise((resolveReq, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path, headers }, (res) => {
      const rec = { port, method, path, status: res.statusCode, headers: res.headers, text: '', json: null };
      seen.push(rec);
      res.setEncoding('utf8');
      res.on('data', (c) => { rec.text += c; });
      res.on('end', () => { try { rec.json = JSON.parse(rec.text); } catch { /* not json */ } resolveReq(rec); });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

const keyedJson = (extra = {}) => ({ 'x-phone-admin': ADMIN_KEY, 'Content-Type': 'application/json', ...extra });
const crossOriginPlain = { Origin: EVIL_ORIGIN, 'Content-Type': 'text/plain' };

function startServer(label, script, args, extraEnv) {
  const env = { ...process.env, HOME, BRIDGE_TEST_STUB_LOG: STUB_LOG, BRIDGE_TEST_SERVER: label,
    HOLOSHELL_PHONE_ADMIN_KEY: ADMIN_KEY, ...extraEnv };
  delete env.HOLOSHELL_CONSENT_SECRET;
  delete env.HOLOSHELL_ALLOW_FLAG_GESTURE;
  delete env.HOLOSHELL_ADMIT_GUI_MUTATION;
  const child = spawn(process.execPath, ['--import', pathToFileURL(PRELOAD).href, script, ...args], {
    cwd: REPO_ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', (c) => { output += c; });
  child.stderr.on('data', (c) => { output += c; });
  return { child, output: () => output };
}

async function waitHealthy(port, srv) {
  for (let i = 0; i < 150; i += 1) {
    try { const r = await request(port, 'GET', '/health'); if (r.status === 200) return; } catch { /* not up */ }
    await delay(100);
  }
  throw new Error(`server on ${port} did not start:\n${srv.output()}`);
}

let bridgePort; let daemonPort; let bridge; let daemon; let signGestureProof; let CONSENT_GESTURE_SCHEMA;

before(async () => {
  process.env.HOME = HOME; // consent-gesture.mjs resolves its key file from HOME at import time
  ({ signProof: signGestureProof, CONSENT_GESTURE_SCHEMA } = await import(GESTURE));
  bridgePort = await freePort();
  daemonPort = await freePort();
  bridge = startServer('bridge', BRIDGE, ['--host', '127.0.0.1', '--port', String(bridgePort), '--receipt-dir', join(tmp, 'bridge-receipts')],
    { HOLOSHELL_BRIDGE_ALLOWED_ORIGINS: PAGE_ORIGIN });
  daemon = startServer('daemon', DAEMON, ['--host', '127.0.0.1', '--port', String(daemonPort), '--tmp-dir', join(tmp, 'daemon-tmp')],
    { HOLOSHELL_CONTROL_ALLOWED_ORIGINS: DAEMON_PAGE_ORIGIN });
  await waitHealthy(bridgePort, bridge);
  await waitHealthy(daemonPort, daemon);
});

after(() => {
  bridge?.child.kill();
  daemon?.child.kill();
});

// ── helpers for the legitimate flow (key + JSON + real signed gesture proof) ──────────────────
async function preflightFor(intent) {
  const r = await request(bridgePort, 'POST', '/api/desktop-control/preflight', { headers: keyedJson(), body: { intent } });
  assert.equal(r.status, 200, r.text);
  return r.json;
}

function gestureProofFor(preflight) {
  const fields = {
    schemaVersion: CONSENT_GESTURE_SCHEMA,
    challenge: preflight.consentChallenge,
    preflightReceiptHash: preflight.preflightReceiptHash,
    key: 'F8',
    pressedAt: new Date().toISOString(),
    observedGesture: true,
    ttlMs: 30000,
  };
  return { ...fields, signature: signGestureProof(fields) };
}

async function mintConsent(preflight, extra = {}) {
  const r = await request(bridgePort, 'POST', '/api/desktop-control/consent-token', {
    headers: keyedJson(),
    body: { preflight, operation: 'open_url', gestureProof: gestureProofFor(preflight), ...extra },
  });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.status, 'issued');
  return r.json;
}

function execute(preflight, consentToken, { headers = keyedJson(), extra = {} } = {}) {
  return request(bridgePort, 'POST', '/api/desktop-control/execute', {
    headers, body: { preflight, operation: 'open_url', consentToken, ...extra } });
}

const sha256 = (text) => createHash('sha256').update(String(text), 'utf8').digest('hex');
const oldTokenHash = (token, prh, op, exp, ch) => sha256(`${token}:${prh}:${op}:${exp}:${ch}`);

/** The pre-patch token format, built entirely by the caller (no server involvement). */
function forgeOldFormatToken(preflight) {
  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + 3600_000).toISOString();
  return {
    schemaVersion: 'hololand.holoshell.desktop-control-consent-token.v0.1.0',
    tokenId: 'desktop_consent_token_forged',
    token,
    tokenHash: oldTokenHash(token, preflight.preflightReceiptHash, 'open_url', expiresAt, preflight.consentChallenge),
    expiresAt,
    status: 'issued',
    operation: 'open_url',
    preflightId: preflight.preflightId,
    preflightReceiptHash: preflight.preflightReceiptHash,
    targetFingerprint: preflight.targetFingerprint || '',
    consentChallenge: preflight.consentChallenge,
  };
}

/** What a caller without the secret can do to a real token: rewrite claims, recompute what it can. */
function attackerRewrite(consent, { preflight, expiresAtMs }) {
  if (String(consent.token).startsWith('hsct1.')) {
    const [fmt, body, mac] = consent.token.split('.');
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (expiresAtMs) claims.exp = expiresAtMs;
    if (preflight) Object.assign(claims, { pid: preflight.preflightId, prh: preflight.preflightReceiptHash,
      tfp: preflight.targetFingerprint || '', ch: preflight.consentChallenge });
    return { ...consent, token: `${fmt}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.${mac}` };
  }
  const out = { ...consent };
  if (expiresAtMs) out.expiresAt = new Date(expiresAtMs).toISOString();
  if (preflight) Object.assign(out, { preflightId: preflight.preflightId, preflightReceiptHash: preflight.preflightReceiptHash,
    targetFingerprint: preflight.targetFingerprint || '', consentChallenge: preflight.consentChallenge });
  out.tokenHash = oldTokenHash(out.token, out.preflightReceiptHash, out.operation, out.expiresAt, out.consentChallenge);
  return out;
}

/** A correctly signed token with chosen claims (only possible because the test knows the secret). */
function signedToken(claims) {
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const mac = createHmac('sha256', CONSENT_SECRET).update(`hsct1.${body}`).digest('base64url');
  return `hsct1.${body}.${mac}`;
}
function claimsFor(preflight, overrides = {}) {
  const now = Date.now();
  return { v: 1, scope: 'desktop-control.execute', tid: 'desktop_consent_token_test', op: 'open_url',
    pid: preflight.preflightId, prh: preflight.preflightReceiptHash, tfp: preflight.targetFingerprint || '',
    ch: preflight.consentChallenge, iat: now, exp: now + 60_000, nonce: randomBytes(16).toString('hex'), ...overrides };
}

function assertRefusedExecution(r, label, reason) {
  assert.equal(r.status, 403, `${label}: expected 403, got ${r.status} ${r.text.slice(0, 300)}`);
  if (reason) assert.match(String(r.json?.reason || ''), reason, `${label}: refusal reason`);
  assert.notEqual(r.json?.status, 'approved_execution_staged', `${label}: execution was staged`);
  assert.notEqual(r.json?.executionAllowed, true, `${label}: execution allowed`);
}

describe('HoloShell laptop desktop bridge and control daemon access', () => {
  // ── bridge: transport gate ──────────────────────────────────────────────────────────────────
  test('bridge: a forged old-format consent token sent cross-origin as text/plain with no key is refused', async () => {
    const preflight = await preflightFor(OPEN_URL_INTENT);
    const r = await execute(preflight, forgeOldFormatToken(preflight), { headers: crossOriginPlain });
    assertRefusedExecution(r, 'cross-origin forged');
    assert.equal(r.headers['x-holoshell-gate'], 'key-required');
  });

  test('bridge: keyless requests are refused on every route but /health', async () => {
    for (const [method, path] of [['GET', '/api/desktop-control/bridge'], ['POST', '/api/desktop-control/preflight'],
      ['POST', '/api/desktop-control/gesture-proof'], ['POST', '/api/desktop-control/consent-token'], ['POST', '/api/desktop-control/execute']]) {
      const r = await request(bridgePort, method, path, {
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {}, body: method === 'POST' ? {} : undefined });
      assert.equal(r.status, 403, `${method} ${path} -> ${r.status}`);
      assert.equal(r.headers['x-holoshell-gate'], 'key-required', `${method} ${path}`);
    }
    const health = await request(bridgePort, 'GET', '/health');
    assert.equal(health.status, 200);
    assert.equal(health.json.ok, true);
  });

  test('bridge: a keyed text/plain POST gets 415 on every POST route', async () => {
    for (const path of ['/api/desktop-control/preflight', '/api/desktop-control/gesture-proof',
      '/api/desktop-control/consent-token', '/api/desktop-control/execute']) {
      const r = await request(bridgePort, 'POST', path, { headers: { 'x-phone-admin': ADMIN_KEY, 'Content-Type': 'text/plain' }, body: '{}' });
      assert.equal(r.status, 415, `${path} -> ${r.status}`);
    }
  });

  // ── bridge: consent tokens ──────────────────────────────────────────────────────────────────
  test('bridge: a forged old-format token is refused even with the key', async () => {
    const preflight = await preflightFor(OPEN_URL_INTENT);
    assertRefusedExecution(await execute(preflight, forgeOldFormatToken(preflight)), 'keyed forged old-format', /consent_token_malformed/);
  });

  test('bridge: a random token string is refused', async () => {
    const preflight = await preflightFor(OPEN_URL_INTENT);
    assertRefusedExecution(await execute(preflight, randomBytes(24).toString('base64url')), 'random string', /consent_token_malformed/);
    assertRefusedExecution(await execute(preflight, `hsct1.${randomBytes(30).toString('base64url')}.${randomBytes(32).toString('base64url')}`), 'random hsct1', /consent_token_signature_invalid/);
  });

  test('bridge: a tampered token (expiry extended by a caller without the secret) is refused', async () => {
    const preflight = await preflightFor(OPEN_URL_INTENT);
    const consent = await mintConsent(preflight);
    const tampered = attackerRewrite(consent, { expiresAtMs: Date.now() + 24 * 3600_000 });
    assertRefusedExecution(await execute(preflight, tampered), 'tampered expiry', /consent_token_signature_invalid/);
    if (String(consent.token).startsWith('hsct1.')) {
      const [fmt, body, mac] = consent.token.split('.');
      const flipped = Buffer.from(mac, 'base64url'); flipped[0] ^= 1;
      assertRefusedExecution(await execute(preflight, `${fmt}.${body}.${flipped.toString('base64url')}`), 'flipped MAC', /consent_token_signature_invalid/);
    }
  });

  test('bridge: a token cannot be minted with a lifetime over 5 minutes', async () => {
    const preflight = await preflightFor(OPEN_URL_INTENT);
    const consent = await mintConsent(preflight, { ttlMinutes: 600 });
    const lifetimeMs = Date.parse(consent.expiresAt) - Date.now();
    assert.ok(lifetimeMs <= 5 * 60_000 + 2_000, `token lifetime ${Math.round(lifetimeMs / 1000)} s exceeds 5 minutes`);
  });

  test('bridge: an expired (correctly signed) token is refused', async () => {
    const preflight = await preflightFor(OPEN_URL_INTENT);
    const now = Date.now();
    const expired = signedToken(claimsFor(preflight, { iat: now - 120_000, exp: now - 60_000 }));
    const r = await execute(preflight, expired);
    assertRefusedExecution(r, 'expired', /consent_token_expired/);
  });

  test('bridge: a wrong-scope token is refused (retargeted to another preflight, or signed for another scope)', async () => {
    const preflightA = await preflightFor(OPEN_URL_INTENT);
    const preflightB = await preflightFor(OTHER_URL_INTENT);
    const consentA = await mintConsent(preflightA);
    assertRefusedExecution(await execute(preflightB, attackerRewrite(consentA, { preflight: preflightB }),
      { extra: { url: 'https://example.com/other', executeApprovedAction: true, executorMode: 'simulated' } }), 'retargeted to preflight B', /consent_token_signature_invalid/);
    assertRefusedExecution(await execute(preflightA, signedToken(claimsFor(preflightA, { scope: 'desktop-control.other' }))), 'other scope', /consent_token_scope_mismatch/);
    assertRefusedExecution(await execute(preflightA, signedToken(claimsFor(preflightA, { op: 'type_text' }))), 'other operation', /consent_token_operation_mismatch/);
  });

  test('bridge: a consent token is single-use (replay refused)', async () => {
    const preflight = await preflightFor(OPEN_URL_INTENT);
    const consent = await mintConsent(preflight);
    const first = await execute(preflight, consent);
    assert.equal(first.status, 200, first.text);
    assert.equal(first.json.status, 'approved_execution_staged');
    assertRefusedExecution(await execute(preflight, consent), 'replay', /consent_token_replayed/);
  });

  test('bridge: CORS allows only the configured page origin, never *', async () => {
    const page = await request(bridgePort, 'OPTIONS', '/api/desktop-control/execute', { headers: {
      Origin: PAGE_ORIGIN, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-phone-admin' } });
    assert.equal(page.headers['access-control-allow-origin'], PAGE_ORIGIN);
    assert.match(String(page.headers['access-control-allow-headers']), /x-phone-admin/i);
    const evil = await request(bridgePort, 'OPTIONS', '/api/desktop-control/execute', { headers: {
      Origin: EVIL_ORIGIN, 'Access-Control-Request-Method': 'POST' } });
    assert.equal(evil.headers['access-control-allow-origin'], undefined);
    const evilGet = await request(bridgePort, 'GET', '/api/desktop-control/bridge', { headers: { Origin: EVIL_ORIGIN, 'x-phone-admin': ADMIN_KEY } });
    assert.equal(evilGet.headers['access-control-allow-origin'], undefined);
  });

  // ── daemon ────────────────────────────────────────────────────────────────────────────────
  test('daemon: a cross-origin text/plain POST with no key is refused and reaches no handler', async () => {
    const before = stubCalls('daemon').length;
    for (const path of ['/action', '/approval/execute', '/workflow/founder-command', '/workflow/agent-dispatch']) {
      const r = await request(daemonPort, 'POST', path, { headers: crossOriginPlain, body: JSON.stringify({ action: 'list_programs' }) });
      assert.equal(r.status, 403, `${path} -> ${r.status} ${r.text.slice(0, 200)}`);
    }
    assert.equal(stubCalls('daemon').length, before, 'a refused daemon request started a (stubbed) process');
  });

  test('daemon: keyless GET reads are refused; /health stays open', async () => {
    const feed = await request(daemonPort, 'GET', '/feed', { headers: { Origin: EVIL_ORIGIN } });
    assert.equal(feed.status, 403);
    const health = await request(daemonPort, 'GET', '/health');
    assert.equal(health.status, 200);
  });

  test('daemon: a keyed text/plain POST gets 415', async () => {
    const r = await request(daemonPort, 'POST', '/action', { headers: { 'x-phone-admin': ADMIN_KEY, 'Content-Type': 'text/plain' }, body: '{}' });
    assert.equal(r.status, 415);
  });

  test('daemon: CORS allows only the configured origin, never *', async () => {
    const allowed = await request(daemonPort, 'GET', '/health', { headers: { Origin: DAEMON_PAGE_ORIGIN } });
    assert.equal(allowed.headers['access-control-allow-origin'], DAEMON_PAGE_ORIGIN);
    const evil = await request(daemonPort, 'OPTIONS', '/action', { headers: { Origin: EVIL_ORIGIN, 'Access-Control-Request-Method': 'POST' } });
    assert.equal(evil.headers['access-control-allow-origin'], undefined);
  });

  // ── green on both: the legitimate path ─────────────────────────────────────────────────────
  test('bridge: key + JSON + a properly minted token reaches the handler (staged, then simulated open_url)', async () => {
    const preflight = await preflightFor(OPEN_URL_INTENT);
    const staged = await execute(preflight, await mintConsent(preflight));
    assert.equal(staged.status, 200, staged.text);
    assert.equal(staged.json.status, 'approved_execution_staged');
    assert.equal(staged.json.desktopAutomationExecuted, false);
    const opened = await execute(preflight, await mintConsent(preflight), {
      extra: { url: 'https://example.com/status', executeApprovedAction: true, executorMode: 'simulated' } });
    assert.equal(opened.status, 200, opened.text);
    assert.equal(opened.json.status, 'completed_open_url');
    assert.equal(opened.json.destructiveActionsTaken, false);
    const status = await request(bridgePort, 'GET', '/api/desktop-control/bridge', { headers: { 'x-phone-admin': ADMIN_KEY } });
    assert.equal(status.status, 200);
    assert.equal(status.json.schemaVersion, 'hololand.holoshell.laptop-desktop-bridge.v0.1.0');
  });

  test('daemon: a keyed JSON request reaches its handler (process call stubbed)', async () => {
    const before = stubCalls('daemon').length;
    const r = await request(daemonPort, 'POST', '/action', { headers: keyedJson(), body: { action: 'list_programs' } });
    assert.equal(r.status, 200, r.text.slice(0, 300));
    assert.equal(r.json.ok, true);
    assert.ok(stubCalls('daemon').length > before, 'the keyed /action request should reach the stubbed process call');
    const feed = await request(daemonPort, 'GET', '/feed', { headers: { 'x-phone-admin': ADMIN_KEY } });
    assert.equal(feed.status, 200);
  });

  test('nothing ran for real: no non-simulated executor call, no network attempt', () => {
    const calls = stubCalls('bridge');
    assert.deepEqual(calls.filter((c) => c.blocked), [], 'a server tried to reach the network');
    assert.deepEqual(stubCalls('daemon').filter((c) => c.blocked), []);
    assert.deepEqual(calls.filter((c) => c.cp && c.args.some((a) => /holoshell-action-executor/.test(a))), [],
      'the bridge started the action executor');
  });

  test('no response from the bridge or the daemon carried Access-Control-Allow-Origin: *', () => {
    const wildcard = seen.filter((r) => r.headers['access-control-allow-origin'] === '*');
    assert.deepEqual(wildcard.map((r) => `${r.port === bridgePort ? 'bridge' : 'daemon'} ${r.method} ${r.path} ${r.status}`), []);
    assert.ok(seen.length > 20);
    assert.ok(existsSync(join(tmp, 'bridge-receipts')));
  });
});
