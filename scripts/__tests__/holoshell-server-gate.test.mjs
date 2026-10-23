/**
 * HoloShell whole-server gate — every /api/* and /workflow/* route.
 *
 * The threat: before this gate only /api/phone/* and /api/brittney/chat checked a key. Every
 * other route answered with `Access-Control-Allow-Origin: *` and parsed text/plain bodies, so
 * any web page open on the machine running HoloShell (or any LAN device when it binds 0.0.0.0
 * on the Jetson) could stage terminal executions, run read-only adapters, approve consent,
 * ensure services, dispatch Brittney ops, and read every GET and the terminal event stream.
 *
 * This file boots the real packages/holoshell/serve.mjs on a free loopback port. Nothing runs
 * and nothing leaves the box: a preload module (written to a temp dir, passed with
 * `node --import`) runs inside the server process and
 *   - replaces every node:child_process entry point (spawn, spawnSync, exec, execSync,
 *     execFile, execFileSync, fork) with a stub that records the call and returns canned
 *     output, so handler code paths that would start a process only leave a log line;
 *   - replaces fetch: loopback passes, every other host throws and is logged.
 * Receipts and tmp state go to a temp dir. The admin key is a per-run fake.
 */

import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import vm from 'node:vm';
import { after, before, describe, test } from 'node:test';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SERVE = fileURLToPath(new URL('../../packages/holoshell/serve.mjs', import.meta.url));
const COMPILE = fileURLToPath(new URL('../../packages/holoshell/compile.mjs', import.meta.url));
const PAGE = fileURLToPath(
  new URL('../../packages/holoshell/dist/operate-room.html', import.meta.url)
);
const ADMIN_KEY = randomBytes(18).toString('hex');
const EVIL_ORIGIN = 'http://evil.example';

// The routes Release named. Bodies are chosen so that even an ungated server only reaches a
// validation branch or a stubbed process call: consent/approve without preflightId never
// executes a cleanup, supervisor `ensure` hits the stubbed execFileSync.
const DANGEROUS_POSTS = [
  { path: '/api/operator-terminal/run-readonly', body: {} },
  { path: '/api/operator-terminal/execute', body: {} },
  { path: '/api/operator-terminal/run-approved', body: {} },
  { path: '/api/consent/approve', body: {} },
  {
    path: '/workflow/services/supervisor',
    body: { ensure: true, confirmHoloServicesEnsure: true },
  },
  { path: '/api/brittney/op', body: {} },
];

const PROCESS_AND_NETWORK_STUB = String.raw`
import cp from 'node:child_process';
import { EventEmitter } from 'node:events';
import { appendFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { promisify } from 'node:util';

const LOG = process.env.GATE_TEST_STUB_LOG;
const log = (entry) => appendFileSync(LOG, JSON.stringify(entry) + '\n');
const STUB_JSON = JSON.stringify({ stub: true, status: 'stubbed', destructiveActionsTaken: false });
const record = (fn, file, args) => log({ cp: fn, file: String(file), args: Array.isArray(args) ? args.map(String) : [] });
const fakeChild = () => {
  const child = new EventEmitter();
  Object.assign(child, { pid: 0, exitCode: 0, killed: false, stdout: new EventEmitter(), stderr: new EventEmitter(),
    stdin: { write() { return true; }, end() {} }, kill() { return true; }, unref() {}, ref() {} });
  setImmediate(() => { child.emit('exit', 0, null); child.emit('close', 0, null); });
  return child;
};
const callbackOf = (...xs) => xs.find((x) => typeof x === 'function');

cp.spawn = (file, args) => { record('spawn', file, args); return fakeChild(); };
cp.fork = (file, args) => { record('fork', file, args); return fakeChild(); };
cp.spawnSync = (file, args) => { record('spawnSync', file, args); return { pid: 0, status: 0, signal: null, stdout: '', stderr: '', output: [null, '', ''] }; };
cp.execSync = (command) => { record('execSync', command, []); return ''; };
cp.execFileSync = (file, args) => { record('execFileSync', file, args); return STUB_JSON; };
cp.exec = (command, opts, cb) => { record('exec', command, []); const done = callbackOf(opts, cb); setImmediate(() => done && done(null, '', '')); return fakeChild(); };
cp.exec[promisify.custom] = async (command) => { record('exec', command, []); return { stdout: '', stderr: '' }; };
cp.execFile = (file, args, opts, cb) => { record('execFile', file, args); const done = callbackOf(args, opts, cb); setImmediate(() => done && done(null, STUB_JSON, '')); return fakeChild(); };
cp.execFile[promisify.custom] = async (file, args) => { record('execFile', file, args); return { stdout: STUB_JSON, stderr: '' }; };
syncBuiltinESMExports();

const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '::1') return realFetch(input, init);
  log({ blocked: url.hostname });
  throw new Error('server-gate test stub: network disabled for ' + url.hostname);
};
`;

function freePort() {
  return new Promise((resolvePort, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolvePort(port));
    });
  });
}

const seen = []; // every response this file receives, for the global no-ACAO-* check

/** Raw HTTP so the test controls Origin / Content-Type exactly. `headOnly` resolves on headers (SSE). */
function request(port, method, path, { headers = {}, body, headOnly = false } = {}) {
  return new Promise((resolveReq, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path, headers }, (res) => {
      const record = {
        method,
        path,
        status: res.statusCode,
        headers: res.headers,
        text: '',
        json: null,
      };
      seen.push(record);
      if (headOnly) {
        resolveReq(record);
        res.destroy();
        return;
      }
      res.setEncoding('utf8');
      res.on('data', (c) => {
        record.text += c;
      });
      res.on('end', () => {
        try {
          record.json = JSON.parse(record.text);
        } catch {
          /* not json */
        }
        resolveReq(record);
      });
    });
    req.on('error', (err) => (headOnly && err.code === 'ECONNRESET' ? undefined : reject(err)));
    req.setTimeout(20000, () => req.destroy(new Error(`timeout ${method} ${path}`)));
    if (body !== undefined) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function bootServer() {
  const dir = mkdtempSync(join(tmpdir(), 'holoshell-server-gate-'));
  const stubPath = join(dir, 'process-network-stub.mjs');
  writeFileSync(stubPath, PROCESS_AND_NETWORK_STUB);
  const port = await freePort();
  const env = {
    ...process.env,
    HOLOSHELL_SERVE_HOST: '127.0.0.1',
    HOLOSHELL_SERVE_PORT: String(port),
    HOLOSHELL_PHONE_ADMIN_KEY: ADMIN_KEY,
    HOLOSHELL_PHONE_FILE: join(dir, 'phone-channel.json'),
    HOLOSHELL_RECEIPTS_DIR: join(dir, 'receipts'),
    HOLOSHELL_TMP_DIR: join(dir, 'tmp'),
    HOLOSHELL_MCP_URL: 'https://mcp.holoscript.net/mcp',
    HOLOSCRIPT_API_KEY: '',
    HOLOSCRIPT_MCP_API_KEY: '',
    HOLOTUNE_TRACE_DISABLED: '1',
    GATE_TEST_STUB_LOG: join(dir, 'stub-calls.jsonl'),
  };
  delete env.TELEGRAM_BOT_TOKEN;
  const child = spawn(process.execPath, ['--import', pathToFileURL(stubPath).href, SERVE], {
    cwd: REPO_ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (c) => {
    output += c;
  });
  child.stderr.on('data', (c) => {
    output += c;
  });
  for (let i = 0; i < 120; i += 1) {
    if (child.exitCode !== null)
      throw new Error(`serve.mjs exited early (${child.exitCode})\n${output}`);
    try {
      // Any HTTP answer means the server is up (on an ungated tree /api/health does not exist).
      await request(port, 'GET', '/favicon.ico');
      break;
    } catch {
      /* not up yet */
    }
    await delay(250);
    if (i === 119) throw new Error(`serve.mjs did not come up\n${output}`);
  }
  return {
    port,
    calls: () =>
      existsSync(env.GATE_TEST_STUB_LOG)
        ? readFileSync(env.GATE_TEST_STUB_LOG, 'utf8')
            .split('\n')
            .filter(Boolean)
            .map((l) => JSON.parse(l))
        : [],
    async stop() {
      child.kill('SIGTERM');
      await delay(200);
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

const keyJson = { 'Content-Type': 'application/json', 'x-phone-admin': ADMIN_KEY };

describe('HoloShell whole-server gate', () => {
  let s;
  before(async () => {
    // Build the page the server serves (offline; the same step the deploy runs on the laptop).
    const built = spawnSync(process.execPath, [COMPILE], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 120_000,
    });
    assert.equal(built.status, 0, `compile.mjs failed\n${built.stdout}\n${built.stderr}`);
    s = await bootServer();
  });
  after(async () => {
    if (s) await s.stop();
  });

  for (const { path, body } of DANGEROUS_POSTS) {
    test(`cross-origin text/plain POST ${path} with no key is refused (403)`, async () => {
      const r = await request(s.port, 'POST', path, {
        headers: { 'Content-Type': 'text/plain;charset=UTF-8', Origin: EVIL_ORIGIN },
        body,
      });
      assert.equal(r.status, 403, r.text);
    });
  }

  for (const { path, body } of DANGEROUS_POSTS) {
    test(`text/plain POST ${path} with a valid key is 415`, async () => {
      const r = await request(s.port, 'POST', path, {
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
          'x-phone-admin': ADMIN_KEY,
          Origin: EVIL_ORIGIN,
        },
        body,
      });
      assert.equal(r.status, 415, r.text);
    });
  }

  test('a refused request never reached a handler: no process call recorded for supervisor ensure', () => {
    const ensures = s.calls().filter((c) => c.cp && c.args.includes('--ensure'));
    assert.equal(
      ensures.length,
      0,
      `refused supervisor requests reached runServiceSupervisorSnapshot: ${JSON.stringify(ensures)}`
    );
  });

  test('a cross-origin GET read (/api/live-status) without the key is refused', async () => {
    const r = await request(s.port, 'GET', '/api/live-status', {
      headers: { Origin: EVIL_ORIGIN },
    });
    assert.equal(r.status, 403, r.text.slice(0, 300));
  });

  test('the terminal event stream refuses a cross-origin open without key or token', async () => {
    const r = await request(s.port, 'GET', '/api/operator-terminal/events/stream', {
      headers: { Origin: EVIL_ORIGIN, Accept: 'text/event-stream' },
      headOnly: true,
    });
    assert.equal(r.status, 403);
    const bogus = await request(
      s.port,
      'GET',
      `/api/operator-terminal/events/stream?t=${'0'.repeat(48)}`,
      {
        headers: { Origin: EVIL_ORIGIN, Accept: 'text/event-stream' },
        headOnly: true,
      }
    );
    assert.equal(bogus.status, 403);
  });

  test('a keyed POST mints a stream token that opens the stream (EventSource path)', async () => {
    const grant = await request(s.port, 'POST', '/api/operator-terminal/events/stream-token', {
      headers: keyJson,
      body: {},
    });
    assert.equal(grant.status, 200, grant.text);
    assert.match(String(grant.json.token), /^[0-9a-f]{48}$/);
    const r = await request(
      s.port,
      'GET',
      `/api/operator-terminal/events/stream?t=${grant.json.token}`,
      {
        headers: { Accept: 'text/event-stream' },
        headOnly: true,
      }
    );
    assert.equal(r.status, 200);
    assert.match(String(r.headers['content-type']), /text\/event-stream/);
  });

  test('OPTIONS preflight from a foreign origin is answered without granting access', async () => {
    const r = await request(s.port, 'OPTIONS', '/api/brittney/op', {
      headers: {
        Origin: EVIL_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,x-phone-admin',
      },
    });
    assert.equal(r.headers['access-control-allow-origin'], undefined);
    assert.equal(r.headers['access-control-allow-headers'], undefined);
    assert.equal(r.headers['access-control-allow-methods'], undefined);
  });

  test('GET /api/health stays open and carries no state', async () => {
    const r = await request(s.port, 'GET', '/api/health');
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json, { ok: true, service: 'holoshell' });
  });

  test('the page wraps fetch so same-origin /api and /workflow calls carry the key, other origins never do', () => {
    const html = readFileSync(PAGE, 'utf8');
    const start = html.indexOf('var _holoshellAdminKeyDeclined = false;');
    assert.ok(start >= 0, 'operate-room.html has no admin-key fetch wrapper');
    const wrapper = html.slice(start, html.indexOf('})();', start) + 5);
    const fnStart = html.indexOf('function _holoshellAdminKey(');
    const helpers = html.slice(fnStart, html.indexOf('function sendBrittneyChat(', fnStart));
    const store = {};
    const calls = [];
    let prompts = 0;
    const sandbox = {
      URL,
      Headers,
      sessionStorage: {
        getItem: (k) => store[k] || null,
        setItem: (k, v) => {
          store[k] = v;
        },
        removeItem: (k) => {
          delete store[k];
        },
      },
      window: {
        location: { href: 'http://127.0.0.1:8747/operator', origin: 'http://127.0.0.1:8747' },
        prompt: () => {
          prompts += 1;
          return 'typed-key';
        },
        fetch: (input, init) => {
          calls.push([
            String(input),
            init && init.headers ? new Headers(init.headers).get('x-phone-admin') : null,
          ]);
          return Promise.resolve({ status: 200, headers: new Headers() });
        },
      },
    };
    sandbox.window.window = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(`${wrapper}\n${helpers}\nthis.f = window.fetch;`, sandbox);
    sandbox.f('/api/live-status');
    sandbox.f('/workflow/services/supervisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    sandbox.f('http://127.0.0.1:8751/api/desktop-control/bridge');
    sandbox.f('/api/health');
    assert.deepEqual(calls, [
      ['/api/live-status', 'typed-key'],
      ['/workflow/services/supervisor', 'typed-key'],
      ['http://127.0.0.1:8751/api/desktop-control/bridge', null],
      ['/api/health', null],
    ]);
    assert.equal(prompts, 1, 'the key is asked once per tab');
    assert.match(
      html,
      /\/api\/operator-terminal\/events\/stream-token/,
      'the page must mint a stream token for EventSource'
    );
  });

  // ── green on both trees ──
  for (const { path, body } of DANGEROUS_POSTS) {
    test(`a keyed JSON POST ${path} reaches its handler`, async () => {
      const r = await request(s.port, 'POST', path, { headers: keyJson, body });
      assert.ok(
        r.json && typeof r.json === 'object',
        `${path}: expected a JSON handler answer, got ${r.status} ${r.text.slice(0, 200)}`
      );
      assert.ok(
        !(r.status === 403 && /admin key required/.test(r.text)),
        `${path}: refused by the gate with a valid key`
      );
      assert.notEqual(r.status, 415, `${path}: refused as non-JSON`);
      assert.ok(
        !(r.status === 404 && r.json.error === 'not_found' && r.json.path === path),
        `${path}: fell through to the router's 404, no handler answered`
      );
    });
  }

  test('the keyed supervisor ensure ran only the stubbed process call', () => {
    const ensures = s.calls().filter((c) => c.cp && c.args.includes('--ensure'));
    assert.equal(
      ensures.length,
      1,
      `expected exactly one stubbed --ensure call, got ${JSON.stringify(ensures)}`
    );
    assert.ok(
      !s.calls().some((c) => c.blocked),
      `server tried to reach the network: ${JSON.stringify(s.calls().filter((c) => c.blocked))}`
    );
  });

  test('a keyed GET read (/api/live-status) is served', async () => {
    const r = await request(s.port, 'GET', '/api/live-status', {
      headers: { 'x-phone-admin': ADMIN_KEY },
    });
    assert.equal(r.status, 200, r.text.slice(0, 300));
  });

  test('the static page still loads without a key (/operator and /connect-phone)', async () => {
    const page = await request(s.port, 'GET', '/operator');
    assert.equal(page.status, 200, page.text.slice(0, 200));
    assert.match(String(page.headers['content-type']), /text\/html/);
    assert.match(page.text, /brittney-input/);
    const phonePage = await request(s.port, 'GET', '/connect-phone');
    assert.equal(phonePage.status, 200);
  });

  test('no response anywhere in this file carried Access-Control-Allow-Origin: *', () => {
    const wildcard = seen
      .filter((r) => r.headers['access-control-allow-origin'] === '*')
      .map((r) => `${r.method} ${r.path} -> ${r.status}`);
    assert.deepEqual(wildcard, []);
    assert.ok(seen.length > 25, `expected to have checked many responses, saw ${seen.length}`);
  });
});
