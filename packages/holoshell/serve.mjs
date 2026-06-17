#!/usr/bin/env node
/**
 * HoloShell Operate Room — local data tier (localhost:8747)
 *
 * Serves the Native2DCompiler-compiled HTML dashboard and provides live
 * machine-local data via /api/* endpoints.
 *
 * Data tier rationale: all data here (Win32_Process CIM, local receipt files,
 * index.lock counts) is ephemeral machine-local OS state — it cannot come from
 * a Railway service. Phase D graduation obligation (D.081): publish machine state
 * to Studio operate-room surface so the dashboard lives in production.
 *
 * Usage: node packages/holoshell/serve.mjs  (from Hololand root, after compile.mjs)
 * Prerequisites: node packages/holoshell/compile.mjs
 */

import { createServer } from 'node:http';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, 'dist');
const HTML_PATH = join(DIST_DIR, 'operate-room.html');

const PORT = Number(process.env.HOLOSHELL_SERVE_PORT ?? 8747);

const RECEIPTS_DIR =
  process.env.HOLOSHELL_RECEIPTS_DIR ??
  'C:/Users/Josep/.ai-ecosystem/runtime/holoshell/receipts';

// Relative path to Phase A scripts in HoloScript repo
const CONSENT_CONTRACT = new URL(
  '../../../HoloScript/scripts/holoshell-consent-contract.mjs',
  import.meta.url
);
const EXECUTE_RECEIPT = new URL(
  '../../../HoloScript/scripts/holoshell-execute-receipt.mjs',
  import.meta.url
);

// Lazy-load Phase A imports to avoid hard crash at startup if paths move
let _phaseA = null;
async function phaseA() {
  if (!_phaseA) {
    const [cc, er] = await Promise.all([
      import(CONSENT_CONTRACT),
      import(EXECUTE_RECEIPT),
    ]);
    _phaseA = { ...cc, ...er };
  }
  return _phaseA;
}

// ── Data helpers ──────────────────────────────────────────────────────────────

function readReceipts(suffix) {
  if (!existsSync(RECEIPTS_DIR)) return [];
  try {
    return readdirSync(RECEIPTS_DIR)
      .filter((f) => f.endsWith(suffix))
      .map((f) => {
        try { return JSON.parse(readFileSync(join(RECEIPTS_DIR, f), 'utf8')); }
        catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => (b.timestamp || b.executedAt || '').localeCompare(a.timestamp || a.executedAt || ''));
  } catch {
    return [];
  }
}

function staleProcesses() {
  const ps = [
    'Get-CimInstance Win32_Process',
    "| Where-Object { $_.Name -eq 'git.exe' -and $_.CommandLine -like '*--ignored*' }",
    '| Select-Object ProcessId, CommandLine,',
    '  @{Name="AgeMs";Expression={[int]((Get-Date) - $_.CreationDate).TotalMilliseconds}}',
    '| ConvertTo-Json -Compress',
  ].join(' ');
  try {
    const raw = execSync(`powershell -NonInteractive -Command "${ps}"`, {
      encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 10_000,
    }).trim();
    if (!raw || raw === 'null') return [];
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return items
      .filter((p) => typeof p.AgeMs === 'number' && p.AgeMs > 5 * 60_000)
      .map((p) => ({
        pid:    Number(p.ProcessId),
        reason: 'git_status_ignored_stale',
        ageSec: Math.round(p.AgeMs / 1000),
        command: String(p.CommandLine ?? '').slice(0, 80),
      }));
  } catch { return []; }
}

function pendingConsents() {
  const preflights = readReceipts('.preflight.json');
  const executedIds = new Set(
    readReceipts('.execution.json').map((r) => r.preflightId)
  );
  return preflights
    .filter((pf) => !executedIds.has(pf.id))
    .map((pf) => ({
      id:          pf.id,
      operation:   pf.operation,
      targetCount: pf.targets?.length ?? 0,
      timestamp:   pf.timestamp,
    }));
}

function executionHistory() {
  return readReceipts('.execution.json').slice(0, 20).map((r) => ({
    id:              r.id,
    preflightId:     r.preflightId,
    operation:       r.operation,
    executedAtShort: r.executedAt ? r.executedAt.slice(11, 19) : '?',
    summary:         r.summary ?? { killed: 0, errors: 0 },
  }));
}

function substratePressure() {
  const items = [];

  // 1. Running git processes
  try {
    const ps = "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'git.exe' } | Measure-Object | Select-Object -ExpandProperty Count";
    const count = parseInt(execSync(`powershell -NonInteractive -Command "${ps}"`, {
      encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 8_000,
    }).trim(), 10) || 0;
    items.push({ metric: 'Git Processes', value: count === 0 ? '0 ✓' : `${count} ⚠` });
  } catch {
    items.push({ metric: 'Git Processes', value: 'unknown' });
  }

  // 2. Index lock files in HoloScript .git
  const GIT_DIR = 'C:/Users/Josep/Documents/GitHub/HoloScript/.git';
  try {
    const locks = readdirSync(GIT_DIR).filter((f) => f.endsWith('.lock'));
    items.push({ metric: 'Index Locks', value: locks.length === 0 ? '0 ✓' : `${locks.length} ⚠` });
  } catch {
    items.push({ metric: 'Index Locks', value: 'unknown' });
  }

  // 3. Pending consent receipts count
  const pending = pendingConsents().length;
  items.push({ metric: 'Pending Consents', value: pending === 0 ? '0 ✓' : `${pending}` });

  // 4. Server uptime
  const uptimeSec = Math.round(process.uptime());
  items.push({ metric: 'Server Uptime', value: `${uptimeSec}s` });

  return items;
}

// Local repos to scan for the #1 recurring local-agent friction: a stale
// .git/index.lock (blocks every commit) and orphan worktrees. Pure machine-local,
// no network — exactly the "easier for agents locally" operate signal.
const SCAN_REPOS = [
  { label: 'HoloScript', path: join(__dirname, '..', '..', '..', 'HoloScript') },
  { label: 'Hololand', path: join(__dirname, '..', '..') },
  { label: 'ai-ecosystem', path: 'C:/Users/Josep/.ai-ecosystem' },
];

function worktreeHealth() {
  const items = [];
  for (const repo of SCAN_REPOS) {
    if (!existsSync(join(repo.path, '.git'))) continue;
    const lock = join(repo.path, '.git', 'index.lock');
    if (existsSync(lock)) {
      let ageSec = 0;
      try { ageSec = Math.round((Date.now() - statSync(lock).mtimeMs) / 1000); } catch { /* race */ }
      items.push({ label: repo.label, status: `index.lock held ${ageSec}s ⚠` });
      continue;
    }
    let worktrees = 1;
    try {
      const out = execSync('git worktree list --porcelain', {
        cwd: repo.path, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
      });
      worktrees = (out.match(/^worktree /gm) || []).length;
    } catch { /* git absent / not a repo */ }
    items.push({ label: repo.label, status: worktrees > 1 ? `clean ✓ · ${worktrees} worktrees` : 'clean ✓' });
  }
  if (items.length === 0) items.push({ label: 'no repos found', status: '—' });
  return items;
}

// Shared ConversationDaemon (D.053) substrate access (mcp.holoscript.net). Returns the
// PARSED tool result (e.g. {daemons:[...]} / a turn object), or null on any failure.
const DAIMON_OWNER = () => process.env.HOLOSHELL_DAIMON_OWNER || 'founder';
const MCP_KEY = () => process.env.HOLOSCRIPT_API_KEY || process.env.HOLOSCRIPT_MCP_API_KEY || '';
function holoMcp(name, args) {
  const key = MCP_KEY();
  if (!key) return Promise.resolve(null);
  return fetch('https://mcp.holoscript.net/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-mcp-api-key': key },
    body: JSON.stringify({ jsonrpc: '2.0', id: name, method: 'tools/call', params: { name, arguments: args } }),
    signal: AbortSignal.timeout(8000),
  }).then((r) => r.json())
    .then((j) => { try { return JSON.parse(j?.result?.content?.[0]?.text || 'null'); } catch { return null; } })
    .catch(() => null);
}

// Emergence loop: every management turn is a care-signal that accumulates the daimon's
// soul; emergence_check manifests it at threshold (5 turns + richness 3). Fire-and-forget.
async function growDaimon(message) {
  if (!MCP_KEY() || !message) return;
  const significanceScore = Math.min(0.95, 0.5 + message.length / 400);
  const recentFocus = message.toLowerCase().split(/\s+/).slice(0, 3).join(' ').slice(0, 48);
  await holoMcp('holo_observe_soul', { ownerId: DAIMON_OWNER(), contextDelta: {
    careSignalHistory: ['system-management', 'shared-work'], significanceScore, updatedPreferences: { recentFocus } } });
  await holoMcp('holo_daemon_emergence_check', { ownerId: DAIMON_OWNER(), displayName: 'Daimon' });
}

// Once the daimon has EMERGED, pull its turn (the Brittney rehydration channel, surfaceId
// 'holoshell') and return a preamble that primes Brittney's prompt with the companion's
// accumulated context. Empty string until emergence — so this is a no-op cost today.
async function daimonRehydration() {
  if (!MCP_KEY()) return '';
  const list = await holoMcp('holo_list_daemons', {});
  const daemons = (list && list.daemons) || [];
  if (!daemons.length) return '';  // not yet emerged
  const owner = DAIMON_OWNER();
  const mine = daemons.find((d) => d.ownerId === owner) || daemons[0];
  const turn = await holoMcp('holo_daemon_turn', {
    daemonId: mine.daemonId || mine.id, callerId: owner,
    contextDelta: { careSignalHistory: ['system-management'], significanceScore: 0.6, updatedPreferences: {} },
    surfaceId: 'holoshell',
  });
  const ctx = turn && (turn.rehydration || turn.context || turn.finalText || turn.summary || turn.text);
  if (!ctx) return '';
  return `[${mine.displayName || 'Daimon'} — your emergent companion — offers remembered context: ${String(ctx).slice(0, 600)}]`;
}

// ── Request handler ───────────────────────────────────────────────────────────

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  // ── GET / → compiled dashboard HTML
  if (req.method === 'GET' && path === '/') {
    if (!existsSync(HTML_PATH)) {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('operate-room.html not found. Run: node packages/holoshell/compile.mjs');
      return;
    }
    const html = readFileSync(HTML_PATH, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // ── GET /api/stale-processes
  if (req.method === 'GET' && path === '/api/stale-processes') {
    const items = staleProcesses();
    respond(res, { items });
    return;
  }

  // ── GET /api/pending-consents
  if (req.method === 'GET' && path === '/api/pending-consents') {
    respond(res, { items: pendingConsents() });
    return;
  }

  // ── GET /api/execution-history
  if (req.method === 'GET' && path === '/api/execution-history') {
    respond(res, { items: executionHistory() });
    return;
  }

  // ── GET /api/substrate-pressure
  if (req.method === 'GET' && path === '/api/substrate-pressure') {
    respond(res, { items: substratePressure() });
    return;
  }

  // ── GET /api/worktree-health  (stale index.lock + orphan worktrees per repo)
  if (req.method === 'GET' && path === '/api/worktree-health') {
    respond(res, { items: worktreeHealth() });
    return;
  }

  // ── GET /api/daimon/status — the emergent companion (D.053). Reads the live
  // ConversationDaemon substrate (holo_list_daemons @ mcp.holoscript.net). The daimon is
  // NOT granted; it emerges from accumulated soul-context and then feeds Brittney here.
  if (req.method === 'GET' && path === '/api/daimon/status') {
    const key = process.env.HOLOSCRIPT_API_KEY || process.env.HOLOSCRIPT_MCP_API_KEY || '';
    try {
      const mcp = await fetch('https://mcp.holoscript.net/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-mcp-api-key': key },
        body: JSON.stringify({ jsonrpc: '2.0', id: 'd', method: 'tools/call',
          params: { name: 'holo_list_daemons', arguments: {} } }),
        signal: AbortSignal.timeout(8000),
      });
      const j = await mcp.json();
      if (j.error) { respond(res, { items: [{ label: 'Daimon', status: 'substrate: ' + (j.message || j.error) }] }); return; }
      const data = JSON.parse(j?.result?.content?.[0]?.text || '{}');
      const items = (data.daemons && data.daemons.length)
        ? data.daemons.map((d) => ({ label: d.displayName || d.daemonId || 'Daimon', status: 'emerged ✓ · feeding Brittney' }))
        : [{ label: 'Daimon', status: 'not yet emerged — accumulating soul (D.053)' }];
      respond(res, { items });
    } catch (err) {
      respond(res, { items: [{ label: 'Daimon', status: 'substrate offline (' + String(err.message || err).slice(0, 60) + ')' }] });
    }
    return;
  }

  // ── POST /api/brittney/chat  — the management chat. Routes the message through the
  // REAL HoloShell Brittney operator loop (scripts/holoshell-brittney-turn.mjs →
  // @holoscript/aibrittney, model-policy LOCAL/Jetson by default) and returns Brittney's
  // reply + permission-enveloped action proposals + receipt. NOT a Studio-only operator.
  if (req.method === 'POST' && path === '/api/brittney/chat') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', async () => {
      try {
        const { message, selfTest } = JSON.parse(body || '{}');
        if (!message || typeof message !== 'string') {
          respond(res, { error: 'missing message' }, 400);
          return;
        }
        const repoRoot = join(__dirname, '..', '..');
        const turnScript = join(repoRoot, 'scripts', 'holoshell-brittney-turn.mjs');
        // If the daimon has emerged, prime Brittney with its remembered context (rehydration).
        const preamble = await daimonRehydration();
        const prompt = preamble ? preamble + '\n\n' + message : message;
        const args = [turnScript, '--prompt', prompt, '--json'];
        if (selfTest) args.push('--self-test');
        const out = execFileSync('node', args, {
          cwd: repoRoot, encoding: 'utf8', timeout: 70_000, maxBuffer: 16 * 1024 * 1024,
        });
        const receipt = JSON.parse(out.slice(out.indexOf('{')));
        const r = receipt.result || {};
        respond(res, {
          turnId: receipt.turnId,
          reply: r.finalText || r.summary || r.text || '(no reply)',
          proposals: (receipt.proposals || []).map((p) => ({
            operation: p.operation || p.kind || p.title || 'action',
            lane: p.lane || p.consentLane || null,
            receiptRequired: p.receiptRequired ?? null,
          })),
          receiptType: receipt.receipt?.receiptType || null,
        });
        growDaimon(message).catch(() => {});  // accumulate the daimon's soul from this turn
      } catch (err) {
        respond(res, { error: String(err.message || err).slice(0, 300) }, 500);
      }
    });
    return;
  }

  // ── POST /api/consent/approve
  if (req.method === 'POST' && path === '/api/consent/approve') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', async () => {
      try {
        const { preflightId } = JSON.parse(body);
        if (!preflightId) { respond(res, { outcome: 'error', reason: 'missing_preflightId' }, 400); return; }

        const a = await phaseA();
        const classification = a.classifyConsentRequirement('stale_process_cleanup');
        if (classification.lane === 'founder_required') {
          respond(res, { outcome: 'error', reason: 'founder_required' }, 403);
          return;
        }
        const { token } = a.issueConsentToken({
          operation:   'stale_process_cleanup',
          preflightId,
          agentId:     'holoshell-dashboard',
        });
        const result = a.executeReceipt({ consentToken: token, preflightId });
        respond(res, result);
      } catch (err) {
        respond(res, { outcome: 'error', reason: err.message }, 500);
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not_found', path }));
}

function respond(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

// ── Start ─────────────────────────────────────────────────────────────────────

const server = createServer(handleRequest);
server.listen(PORT, '127.0.0.1', () => {
  console.log(`HoloShell Operate Room: http://localhost:${PORT}`);
  console.log(`  Receipts: ${RECEIPTS_DIR}`);
  if (!existsSync(HTML_PATH)) {
    console.warn('  Warning: operate-room.html not found. Run compile.mjs first.');
  }
});
