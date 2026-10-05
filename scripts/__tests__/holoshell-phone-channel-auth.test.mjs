/**
 * HoloShell phone channel — admin-auth tests for /api/phone/*.
 *
 * The threat: any web page open in a browser on the machine running HoloShell
 * could POST a text/plain "simple request" (no preflight) to
 * http://127.0.0.1:8747/api/phone/connect, swap the Telegram bot token, read
 * the pairing code back through `Access-Control-Allow-Origin: *`, pair, and then
 * send messages as Brittney via /api/phone/notify — because loopback alone
 * counted as admin.
 *
 * This file boots the real packages/holoshell/serve.mjs on a free loopback port
 * and talks to it over HTTP. Telegram is NEVER contacted: a preload module
 * (written to a temp dir and passed with `node --import`) replaces fetch inside
 * the server process. api.telegram.org calls are answered by a stub that logs
 * them to a file; any other non-loopback fetch throws. Bot tokens and the admin
 * key below are generated fakes, and the phone state file lives in a temp dir.
 */

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { after, before, describe, test } from 'node:test';

// Resolved from this file, not the working directory, so the test runs from any cwd.
const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SERVE = fileURLToPath(new URL('../../packages/holoshell/serve.mjs', import.meta.url));
const ADMIN_KEY = randomBytes(18).toString('hex');
const fakeToken = (id) => `${id}:${randomBytes(24).toString('base64url')}`;
const TOKEN_SEEDED = fakeToken('1000001');
const TOKEN_GOOD = fakeToken('1000002');
const TOKEN_BAD = fakeToken('9000009'); // the stub's getMe rejects ids starting with 9
const SEEDED_CHAT = '4242';
const EVIL_ORIGIN = 'http://evil.example';

const TELEGRAM_STUB = String.raw`
import { appendFileSync, existsSync, readFileSync, unlinkSync } from 'node:fs';
const realFetch = globalThis.fetch;
const LOG = process.env.PHONE_TEST_STUB_LOG;
const QUEUE = process.env.PHONE_TEST_STUB_QUEUE;
let nextUpdateId = 1;
const log = (entry) => appendFileSync(LOG, JSON.stringify(entry) + '\n');
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '::1') return realFetch(input, init);
  if (url.hostname !== 'api.telegram.org') {
    log({ blocked: url.hostname });
    throw new Error('phone-channel test stub: network disabled for ' + url.hostname);
  }
  const m = /^\/bot([^/]*)\/([A-Za-z]+)$/.exec(url.pathname);
  const token = m ? m[1] : '';
  const method = m ? m[2] : '';
  const body = init.body ? JSON.parse(init.body) : {};
  log({ method, token, body });
  if (method === 'getMe') {
    if (token.startsWith('9')) return reply(401, { ok: false, error_code: 401, description: 'Unauthorized' });
    return reply(200, { ok: true, result: { id: Number(token.split(':')[0]), is_bot: true, username: 'stub_' + token.split(':')[0] + '_bot' } });
  }
  if (method === 'getUpdates') {
    let texts = [];
    if (existsSync(QUEUE)) { texts = JSON.parse(readFileSync(QUEUE, 'utf8')); unlinkSync(QUEUE); }
    if (!texts.length) await new Promise((r) => setTimeout(r, 50));
    return reply(200, { ok: true, result: texts.map((t) => ({ update_id: nextUpdateId++, message: { message_id: nextUpdateId, chat: { id: Number(t.chat) }, text: t.text } })) });
  }
  if (method === 'sendMessage') return reply(200, { ok: true, result: { message_id: 1 } });
  return reply(400, { ok: false, description: 'stub: unknown method ' + method });
};
`;

function freePort() {
  return new Promise((resolvePort, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolvePort(port)); });
  });
}

/** Raw HTTP so the test controls Origin / Content-Type exactly as a browser page would send them. */
function request(port, method, path, { headers = {}, body } = {}) {
  return new Promise((resolveReq, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path, headers }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { text += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(text); } catch { /* not json */ }
        resolveReq({ status: res.statusCode, headers: res.headers, text, json });
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error(`timeout ${method} ${path}`)));
    if (body !== undefined) req.write(body);
    req.end();
  });
}

async function bootServer({ adminKey, seed }) {
  const dir = mkdtempSync(join(tmpdir(), 'holoshell-phone-auth-'));
  const stubPath = join(dir, 'telegram-stub.mjs');
  writeFileSync(stubPath, TELEGRAM_STUB);
  const phoneFile = join(dir, 'phone-channel.json');
  if (seed) writeFileSync(phoneFile, JSON.stringify(seed), { mode: 0o600 });
  const port = await freePort();
  const env = {
    ...process.env,
    HOLOSHELL_SERVE_HOST: '127.0.0.1',
    HOLOSHELL_SERVE_PORT: String(port),
    HOLOSHELL_PHONE_FILE: phoneFile,
    PHONE_TEST_STUB_LOG: join(dir, 'telegram-calls.jsonl'),
    PHONE_TEST_STUB_QUEUE: join(dir, 'telegram-updates.json'),
    HOLOSCRIPT_API_KEY: '',
    HOLOSCRIPT_MCP_API_KEY: '',
  };
  delete env.TELEGRAM_BOT_TOKEN;
  delete env.HOLOSHELL_PHONE_ADMIN_KEY;
  if (adminKey) env.HOLOSHELL_PHONE_ADMIN_KEY = adminKey;
  const child = spawn(process.execPath, ['--import', pathToFileURL(stubPath).href, SERVE], {
    cwd: REPO_ROOT, env, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (c) => { output += c; });
  child.stderr.on('data', (c) => { output += c; });
  for (let i = 0; i < 120; i += 1) {
    if (child.exitCode !== null) throw new Error(`serve.mjs exited early (${child.exitCode})\n${output}`);
    try {
      const r = await request(port, 'GET', '/api/health'); // open liveness route (the gate keys the rest)
      if (r.status === 200) break;
    } catch { /* not up yet */ }
    await delay(250);
    if (i === 119) throw new Error(`serve.mjs did not come up\n${output}`);
  }
  const ctx = {
    port, dir, child,
    calls: () => (existsSync(env.PHONE_TEST_STUB_LOG)
      ? readFileSync(env.PHONE_TEST_STUB_LOG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []),
    status: async () => (await request(port, 'GET', '/api/phone/status', { headers: { 'x-phone-admin': adminKey || '' } })).json,
    async deliver(texts) {
      const tmp = env.PHONE_TEST_STUB_QUEUE + '.tmp';
      writeFileSync(tmp, JSON.stringify(texts));
      renameSync(tmp, env.PHONE_TEST_STUB_QUEUE);
      for (let i = 0; i < 100 && existsSync(env.PHONE_TEST_STUB_QUEUE); i += 1) await delay(50);
      assert.ok(!existsSync(env.PHONE_TEST_STUB_QUEUE), 'stub poller never picked up the queued Telegram updates');
      await delay(300); // let phonePoll finish handling that batch
    },
    async stop() {
      child.kill('SIGTERM');
      await delay(200);
      rmSync(dir, { recursive: true, force: true });
    },
  };
  return ctx;
}

const json = (obj) => JSON.stringify(obj);
const adminJson = { 'Content-Type': 'application/json', 'x-phone-admin': ADMIN_KEY };
const assertNoWildcardCors = (r, label) => assert.notEqual(r.headers['access-control-allow-origin'], '*', `${label} sent Access-Control-Allow-Origin: *`);

describe('HoloShell phone channel admin auth (key configured)', () => {
  let s;
  before(async () => {
    s = await bootServer({
      adminKey: ADMIN_KEY,
      seed: { botToken: TOKEN_SEEDED, botUsername: 'stub_1000001_bot', founderChatId: SEEDED_CHAT, pairedAt: new Date().toISOString() },
    });
  });
  after(async () => { if (s) await s.stop(); });

  test('loopback notify with no admin header is 403 and sends nothing', async () => {
    const before = s.calls().filter((c) => c.method === 'sendMessage').length;
    const r = await request(s.port, 'POST', '/api/phone/notify', {
      headers: { 'Content-Type': 'application/json', Origin: EVIL_ORIGIN }, body: json({ text: 'hello from a web page' }),
    });
    assert.equal(r.status, 403, r.text);
    assert.equal(s.calls().filter((c) => c.method === 'sendMessage').length, before, 'notify without the key must not send');
  });

  test('loopback text/plain connect from a foreign Origin with no admin header is 403 and changes nothing', async () => {
    const r = await request(s.port, 'POST', '/api/phone/connect', {
      headers: { 'Content-Type': 'text/plain;charset=UTF-8', Origin: EVIL_ORIGIN }, body: json({ token: TOKEN_GOOD }),
    });
    assert.equal(r.status, 403, r.text);
    assert.equal(r.json && r.json.pairingCode, undefined, 'a refused connect must not return a pairing code');
    assert.ok(!s.calls().some((c) => c.token === TOKEN_GOOD), 'a refused connect must not reach Telegram with the new token');
    const st = await s.status();
    assert.equal(st.configured, true);
    assert.equal(st.paired, true, 'the seeded pairing must survive a refused connect');
  });

  test('the admin key in ?k= alone (no header) is refused', async () => {
    const r = await request(s.port, 'POST', `/api/phone/connect?k=${ADMIN_KEY}`, {
      headers: { 'Content-Type': 'application/json' }, body: json({ token: TOKEN_GOOD }),
    });
    assert.equal(r.status, 403, r.text);
  });

  test('text/plain connect is rejected with 415 even with a valid admin header', async () => {
    const r = await request(s.port, 'POST', '/api/phone/connect', {
      headers: { 'Content-Type': 'text/plain;charset=UTF-8', 'x-phone-admin': ADMIN_KEY, Origin: EVIL_ORIGIN }, body: json({ token: TOKEN_GOOD }),
    });
    assert.equal(r.status, 415, r.text);
    assert.ok(!s.calls().some((c) => c.token === TOKEN_GOOD), 'a rejected connect must not reach Telegram with the new token');
  });

  test('/api/phone/* responses never carry Access-Control-Allow-Origin: *', async () => {
    const st = await request(s.port, 'GET', '/api/phone/status', { headers: { Origin: EVIL_ORIGIN } });
    assertNoWildcardCors(st, 'GET /api/phone/status');
    const c = await request(s.port, 'POST', '/api/phone/connect', {
      headers: { 'Content-Type': 'text/plain', Origin: EVIL_ORIGIN }, body: json({ token: 'x' }),
    });
    assertNoWildcardCors(c, 'POST /api/phone/connect');
    const n = await request(s.port, 'POST', '/api/phone/notify', {
      headers: { 'Content-Type': 'text/plain', Origin: EVIL_ORIGIN }, body: json({ text: 'probe' }),
    });
    assertNoWildcardCors(n, 'POST /api/phone/notify');
  });

});

describe('HoloShell phone channel: a bad token paste does not take the live bot offline', () => {
  let s;
  before(async () => {
    s = await bootServer({
      adminKey: ADMIN_KEY,
      seed: { botToken: TOKEN_SEEDED, botUsername: 'stub_1000001_bot', founderChatId: SEEDED_CHAT, pairedAt: new Date().toISOString() },
    });
  });
  after(async () => { if (s) await s.stop(); });

  test('a failed getMe keeps the previous token, username and chat in memory', async () => {
    const r = await request(s.port, 'POST', '/api/phone/connect', { headers: adminJson, body: json({ token: TOKEN_BAD }) });
    assert.equal(r.status, 502, r.text);
    const st = await s.status();
    assert.equal(st.configured, true, 'the live bot must stay configured after a bad token paste');
    assert.equal(st.paired, true, 'the founder chat must stay paired after a bad token paste');
    const n = await request(s.port, 'POST', '/api/phone/notify', { headers: adminJson, body: json({ text: 'still here' }) });
    assert.equal(n.status, 200, n.text);
    const sent = s.calls().filter((c) => c.method === 'sendMessage' && c.body.text === 'still here');
    assert.equal(sent.length, 1);
    assert.equal(sent[0].token, TOKEN_SEEDED, 'notify must still go out through the previous bot token');
    assert.equal(String(sent[0].body.chat_id), SEEDED_CHAT);
  });

});

describe('HoloShell phone channel: legitimate connect and pairing', () => {
  let s;
  before(async () => {
    s = await bootServer({
      adminKey: ADMIN_KEY,
      seed: { botToken: TOKEN_SEEDED, botUsername: 'stub_1000001_bot', founderChatId: SEEDED_CHAT, pairedAt: new Date().toISOString() },
    });
  });
  after(async () => { if (s) await s.stop(); });

  test('a valid admin header with application/json connects (200 with a pairing code)', async () => {
    const r = await request(s.port, 'POST', '/api/phone/connect', { headers: adminJson, body: json({ token: TOKEN_GOOD }) });
    assert.equal(r.status, 200, r.text);
    assert.match(String(r.json.pairingCode), /^\d{4}$/);
    assert.equal(r.json.botUsername, 'stub_1000002_bot');
  });

  test('issuing a new pairing code resets pairingAttempts', async () => {
    // Burn the current code with five wrong messages; the fifth voids it.
    const first = await request(s.port, 'POST', '/api/phone/connect', { headers: adminJson, body: json({ token: TOKEN_GOOD }) });
    assert.equal(first.status, 200, first.text);
    await s.deliver(['0000', '0001', '0002', '0003', '0004'].map((text) => ({ chat: 777, text })));
    assert.equal((await s.status()).pairingOpen, false, 'five misses should void the open code');
    // A fresh code must start from zero misses: one stray message must not void it.
    const second = await request(s.port, 'POST', '/api/phone/connect', { headers: adminJson, body: json({ token: TOKEN_GOOD }) });
    assert.equal(second.status, 200, second.text);
    await s.deliver([{ chat: 778, text: '0005' }]);
    assert.equal((await s.status()).pairingOpen, true, 'one miss after a fresh code voided it: pairingAttempts was not reset');
    await s.deliver([{ chat: 779, text: String(second.json.pairingCode) }]);
    assert.equal((await s.status()).paired, true, 'the fresh code should pair');
  });
});

describe('HoloShell phone channel admin auth (key NOT configured: fail closed)', () => {
  let s;
  before(async () => { s = await bootServer({ adminKey: '' }); });
  after(async () => { if (s) await s.stop(); });

  test('connect and notify refuse every caller when HOLOSHELL_PHONE_ADMIN_KEY is unset', async () => {
    for (const hdr of [{}, { 'x-phone-admin': '' }, { 'x-phone-admin': ADMIN_KEY }]) {
      const c = await request(s.port, 'POST', '/api/phone/connect', {
        headers: { 'Content-Type': 'application/json', ...hdr }, body: json({ token: TOKEN_GOOD }),
      });
      assert.equal(c.status, 403, c.text);
      const n = await request(s.port, 'POST', '/api/phone/notify', {
        headers: { 'Content-Type': 'application/json', ...hdr }, body: json({ text: 'x' }),
      });
      assert.equal(n.status, 403, n.text);
    }
    assert.ok(!s.calls().some((c) => c.method === 'getMe'), 'no connect may reach Telegram without a configured key');
  });

  test('the connect page keeps the key in sessionStorage and never copies ?k= into the header', async () => {
    const r = await request(s.port, 'GET', `/connect-phone?k=${ADMIN_KEY}`);
    assert.equal(r.status, 200);
    assert.match(r.text, /sessionStorage/);
    assert.doesNotMatch(r.text, /\.get\('k'\)/, 'the page must not read the key out of ?k=');
    assert.ok(!r.text.includes(ADMIN_KEY), 'the page must not echo the key');
  });
});
