/**
 * HoloShell /api/brittney/chat — admin-auth tests.
 *
 * The threat: the chat route had no auth, sent `Access-Control-Allow-Origin: *`
 * and parsed any Content-Type. A text/plain POST is a CORS "simple request", so
 * any web page open on the machine running HoloShell (or any LAN device when it
 * is bound to 0.0.0.0 on the Jetson) could drive a live Brittney turn and read
 * her reply. Error bodies also echoed the failing turn command, which carries
 * absolute filesystem paths and the turn script's stack.
 *
 * This file boots the real packages/holoshell/serve.mjs on a free loopback port.
 * Nothing leaves the box: a preload module (written to a temp dir and passed with
 * `node --import`) runs inside the server process and
 *   - replaces child_process.execFile for scripts/holoshell-brittney-turn.mjs
 *     (the model backend) with a stub that records the turn and returns a canned
 *     receipt, or throws a Node-shaped "Command failed: <abs path> ..." error
 *     with a stack when the message contains FAIL_TURN;
 *   - replaces fetch: api.telegram.org is answered by a stub, every other
 *     non-loopback host throws.
 * The daimon MCP is pointed at the cloud URL with no API key, which makes the
 * server skip it without a network call. The admin key and bot token are fakes.
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

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SERVE = fileURLToPath(new URL('../../packages/holoshell/serve.mjs', import.meta.url));
const COMPILE = fileURLToPath(new URL('../../packages/holoshell/compile.mjs', import.meta.url));
const ADMIN_KEY = randomBytes(18).toString('hex');
const BOT_TOKEN = `1000001:${randomBytes(24).toString('base64url')}`;
const FOUNDER_CHAT = '4242';
const EVIL_ORIGIN = 'http://evil.example';

const BACKEND_STUB = String.raw`
import cp from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, unlinkSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { promisify } from 'node:util';

const LOG = process.env.CHAT_TEST_STUB_LOG;
const QUEUE = process.env.CHAT_TEST_STUB_QUEUE;
const log = (entry) => appendFileSync(LOG, JSON.stringify(entry) + '\n');

// ── model backend: the Brittney turn script ──
const realExecFile = cp.execFile;
const isTurn = (args) => Array.isArray(args) && args.some((a) => typeof a === 'string' && a.endsWith('holoshell-brittney-turn.mjs'));
async function stubTurn(file, args) {
  const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : ''; };
  const intent = flag('--routing-intent');
  log({ turn: intent, flags: args.filter((a) => typeof a === 'string' && a.startsWith('--')) });
  if (intent.includes('FAIL_TURN')) {
    // Same shape as a real child_process failure: the command line (absolute paths) plus stderr.
    const cmd = [file, ...args].join(' ');
    const stderr = 'Error: model backend exploded\n    at runTurn (' + args[0] + ':42:7)\n    at async main (' + args[0] + ':99:3)';
    const err = new Error('Command failed: ' + cmd + '\n' + stderr);
    Object.assign(err, { code: 1, killed: false, signal: null, cmd, stdout: '', stderr });
    throw err;
  }
  const receipt = { turnId: 'stub-turn-' + Date.now(), result: { finalText: 'STUB_REPLY: ' + intent }, proposals: [], receipt: { receiptType: 'stub' } };
  return { stdout: JSON.stringify(receipt), stderr: '' };
}
function execFileStub(file, args, opts, cb) {
  if (!isTurn(args)) return realExecFile.apply(this, arguments);
  const done = typeof opts === 'function' ? opts : cb;
  stubTurn(file, args).then((r) => done && done(null, r.stdout, r.stderr), (e) => done && done(e, '', e.stderr || ''));
  return { pid: 0, kill() {}, on() { return this; } };
}
execFileStub[promisify.custom] = (file, args, opts) => (isTurn(args) ? stubTurn(file, args) : realExecFile[promisify.custom](file, args, opts));
cp.execFile = execFileStub;
syncBuiltinESMExports();

// ── network: Telegram stub, everything else non-loopback refused ──
const realFetch = globalThis.fetch;
let nextUpdateId = 1;
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '::1') return realFetch(input, init);
  if (url.hostname !== 'api.telegram.org') {
    log({ blocked: url.hostname });
    throw new Error('chat-auth test stub: network disabled for ' + url.hostname);
  }
  const method = url.pathname.split('/').pop();
  const body = init.body ? JSON.parse(init.body) : {};
  log({ telegram: method, body });
  if (method === 'getUpdates') {
    let texts = [];
    if (existsSync(QUEUE)) { texts = JSON.parse(readFileSync(QUEUE, 'utf8')); unlinkSync(QUEUE); }
    if (!texts.length) await new Promise((r) => setTimeout(r, 50));
    return reply(200, { ok: true, result: texts.map((t) => ({ update_id: nextUpdateId++, message: { message_id: nextUpdateId, chat: { id: Number(t.chat) }, text: t.text } })) });
  }
  if (method === 'sendMessage') return reply(200, { ok: true, result: { message_id: 1 } });
  if (method === 'getMe') return reply(200, { ok: true, result: { username: 'stub_bot' } });
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
    req.setTimeout(30000, () => req.destroy(new Error(`timeout ${method} ${path}`)));
    if (body !== undefined) req.write(body);
    req.end();
  });
}

async function bootServer({ adminKey, seedPhone = false }) {
  const dir = mkdtempSync(join(tmpdir(), 'holoshell-chat-auth-'));
  const stubPath = join(dir, 'backend-stub.mjs');
  writeFileSync(stubPath, BACKEND_STUB);
  const phoneFile = join(dir, 'phone-channel.json');
  if (seedPhone) writeFileSync(phoneFile, JSON.stringify({ botToken: BOT_TOKEN, botUsername: 'stub_bot', founderChatId: FOUNDER_CHAT }), { mode: 0o600 });
  const port = await freePort();
  const env = {
    ...process.env,
    HOLOSHELL_SERVE_HOST: '127.0.0.1',
    HOLOSHELL_SERVE_PORT: String(port),
    HOLOSHELL_PHONE_FILE: phoneFile,
    HOLOSHELL_MCP_URL: 'https://mcp.holoscript.net/mcp', // cloud URL + no key => daimon skipped, no fetch
    HOLOSCRIPT_API_KEY: '',
    HOLOSCRIPT_MCP_API_KEY: '',
    CHAT_TEST_STUB_LOG: join(dir, 'stub-calls.jsonl'),
    CHAT_TEST_STUB_QUEUE: join(dir, 'telegram-updates.json'),
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
  return {
    port,
    calls: () => (existsSync(env.CHAT_TEST_STUB_LOG)
      ? readFileSync(env.CHAT_TEST_STUB_LOG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []),
    turns: function turns() { return this.calls().filter((c) => 'turn' in c).map((c) => c.turn); },
    async deliver(texts) {
      const tmp = env.CHAT_TEST_STUB_QUEUE + '.tmp';
      writeFileSync(tmp, JSON.stringify(texts));
      renameSync(tmp, env.CHAT_TEST_STUB_QUEUE);
      for (let i = 0; i < 100 && existsSync(env.CHAT_TEST_STUB_QUEUE); i += 1) await delay(50);
      assert.ok(!existsSync(env.CHAT_TEST_STUB_QUEUE), 'stub poller never picked up the queued Telegram updates');
    },
    async stop() {
      child.kill('SIGTERM');
      await delay(200);
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

const chat = (s, headers, payload) => request(s.port, 'POST', '/api/brittney/chat', {
  headers, body: typeof payload === 'string' ? payload : JSON.stringify(payload),
});
const adminJson = { 'Content-Type': 'application/json', 'x-phone-admin': ADMIN_KEY };
const assertNoWildcardCors = (r, label) => assert.notEqual(r.headers['access-control-allow-origin'], '*', `${label} sent Access-Control-Allow-Origin: *`);

describe('/api/brittney/chat admin auth (key configured)', () => {
  let s;
  before(async () => { s = await bootServer({ adminKey: ADMIN_KEY }); });
  after(async () => { if (s) await s.stop(); });

  test('a cross-origin text/plain chat POST with no key is 403 and never reaches the model', async () => {
    const r = await chat(s, { 'Content-Type': 'text/plain;charset=UTF-8', Origin: EVIL_ORIGIN },
      { message: 'cross-origin probe one', mode: 'live' });
    assert.equal(r.status, 403, r.text);
    assert.equal(r.json && r.json.reply, undefined, 'a refused chat must not return a reply');
    assert.ok(!s.turns().includes('cross-origin probe one'), 'a refused chat must not run a Brittney turn');
  });

  test('a loopback JSON chat POST with no key, or with the key only in ?k=, is 403', async () => {
    const noKey = await chat(s, { 'Content-Type': 'application/json' }, { message: 'no key probe' });
    assert.equal(noKey.status, 403, noKey.text);
    const wrongKey = await chat(s, { 'Content-Type': 'application/json', 'x-phone-admin': 'not-the-key' }, { message: 'wrong key probe' });
    assert.equal(wrongKey.status, 403, wrongKey.text);
    const queryKey = await request(s.port, 'POST', `/api/brittney/chat?k=${ADMIN_KEY}`, {
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'query key probe' }),
    });
    assert.equal(queryKey.status, 403, queryKey.text);
    assert.deepEqual(s.turns().filter((t) => /probe$/.test(t) && t !== 'cross-origin probe one'), []);
  });

  test('text/plain with a valid key is 415 and never reaches the model', async () => {
    const r = await chat(s, { 'Content-Type': 'text/plain;charset=UTF-8', 'x-phone-admin': ADMIN_KEY, Origin: EVIL_ORIGIN },
      { message: 'text plain with key' });
    assert.equal(r.status, 415, r.text);
    assert.ok(!s.turns().includes('text plain with key'));
  });

  test('chat responses never carry Access-Control-Allow-Origin: *', async () => {
    const refused = await chat(s, { 'Content-Type': 'text/plain', Origin: EVIL_ORIGIN }, { message: 'cors probe' });
    assertNoWildcardCors(refused, 'refused chat');
    const ok = await chat(s, { ...adminJson, Origin: EVIL_ORIGIN }, { message: 'cors probe with key' });
    assertNoWildcardCors(ok, 'accepted chat');
  });

  test('a failed turn returns an error body with no filesystem path or stack trace', async () => {
    const r = await chat(s, adminJson, { message: 'please FAIL_TURN now' });
    assert.ok(r.status >= 500, `expected a 5xx, got ${r.status}: ${r.text}`);
    assert.ok(r.json && typeof r.json.error === 'string' && r.json.error.length > 0, r.text);
    assert.ok(!r.text.includes(REPO_ROOT.replace(/\/$/, '')), 'error body leaks the repo path');
    assert.doesNotMatch(r.text, /(^|[\s"'(=])\/(?:[\w.@-]+\/)+[\w.@-]+/, 'error body contains an absolute POSIX path');
    assert.doesNotMatch(r.text, /[A-Za-z]:\\\\/, 'error body contains a Windows path');
    assert.doesNotMatch(r.text, /\bat .+:\d+:\d+/, 'error body contains a stack frame');
    assert.doesNotMatch(r.text, /Command failed/, 'error body echoes the failing command');
  });

  test('invalid JSON with a valid key is a 400 with a generic message', async () => {
    const r = await chat(s, adminJson, '{"message": ');
    assert.equal(r.status, 400, r.text);
    assert.doesNotMatch(r.text, /(^|[\s"'(=])\/(?:[\w.@-]+\/)+[\w.@-]+/);
  });

  test('a valid key with application/json is processed (200 with the stubbed model reply)', async () => {
    const r = await chat(s, adminJson, { message: 'describe the color blue' });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.reply, 'STUB_REPLY: describe the color blue');
    assert.ok(s.turns().includes('describe the color blue'), 'the turn should have reached the stubbed backend');
    assert.ok(!s.calls().some((c) => c.blocked), `server tried to reach the network: ${JSON.stringify(s.calls().filter((c) => c.blocked))}`);
  });
});

describe('/api/brittney/chat admin auth (key NOT configured: fail closed)', () => {
  let s;
  before(async () => { s = await bootServer({ adminKey: '' }); });
  after(async () => { if (s) await s.stop(); });

  test('chat refuses every caller when HOLOSHELL_PHONE_ADMIN_KEY is unset', async () => {
    for (const hdr of [{}, { 'x-phone-admin': '' }, { 'x-phone-admin': ADMIN_KEY }]) {
      const r = await chat(s, { 'Content-Type': 'application/json', ...hdr }, { message: 'fail closed probe' });
      assert.equal(r.status, 403, r.text);
    }
    assert.ok(!s.turns().includes('fail closed probe'));
  });
});

describe('/api/brittney/chat callers keep working with the key', () => {
  let s;
  before(async () => { s = await bootServer({ adminKey: ADMIN_KEY, seedPhone: true }); });
  after(async () => { if (s) await s.stop(); });

  test('the phone channel (server-internal caller) still gets a Brittney reply', async () => {
    await s.deliver([{ chat: FOUNDER_CHAT, text: 'phone says hi' }]);
    let sent = [];
    for (let i = 0; i < 60 && !sent.length; i += 1) {
      await delay(100);
      sent = s.calls().filter((c) => c.telegram === 'sendMessage');
    }
    assert.equal(sent.length, 1, 'the phone channel never replied');
    assert.equal(sent[0].body.text, 'STUB_REPLY: phone says hi');
    assert.equal(String(sent[0].body.chat_id), FOUNDER_CHAT);
  });

  test('the HoloShell page source sends the sessionStorage admin key with its chat POST', () => {
    const src = readFileSync(COMPILE, 'utf8');
    const line = src.split('\n').find((l) => l.includes("fetch('/api/brittney/chat'"));
    assert.ok(line, 'compile.mjs no longer has the page chat fetch');
    assert.match(line, /'x-phone-admin'/, 'the page chat fetch must send x-phone-admin');
    assert.match(src, /sessionStorage\.getItem\('holoshell\.phoneAdminKey'\)/, 'the page must read the key from the shared sessionStorage slot');
  });
});
