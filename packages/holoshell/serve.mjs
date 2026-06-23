#!/usr/bin/env node
/**
 * HoloShell Operate Room — local data tier (localhost:8747)
 *
 * Serves the compiled HoloShell chat surface and provides live
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
// Bind host. Default loopback (the laptop-local case). On the JETSON — where this
// surface is hosted so the laptop/Quest are just screens (founder 2026-06-17) — set
// HOLOSHELL_SERVE_HOST=0.0.0.0 so http://holojetson.local:8747 is LAN-reachable.
const HOST = process.env.HOLOSHELL_SERVE_HOST ?? '127.0.0.1';

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

function looksLikeDesktopControlIntent(message) {
  return /\b(screen|desktop|window|app|application|browser|chrome|edge|excel|word|powerpoint|terminal|button|click|type|hotkey|keyboard|mouse|focus|open|launch|control|save|submit|scroll|tab)\b/iu.test(String(message || ''));
}

function parseJsonFromNodeOutput(output) {
  const text = String(output || '');
  const firstBrace = text.indexOf('{');
  if (firstBrace < 0) throw new Error('desktop_control_plan_json_missing');
  return JSON.parse(text.slice(firstBrace));
}

function desktopControlPlanFor(intent, options = {}) {
  const repoRoot = join(__dirname, '..', '..');
  const planScript = join(repoRoot, 'scripts', 'holoshell-desktop-control-plan.mjs');
  const args = [
    planScript,
    '--intent',
    intent,
    '--actor',
    options.actor || 'brittney',
    '--json',
  ];
  if (options.selfTest) args.push('--self-test');
  const out = execFileSync('node', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 20_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  const parsed = parseJsonFromNodeOutput(out);
  return parsed.receipt || parsed;
}

function desktopControlProposal(plan) {
  if (!plan?.summary?.relevant) return null;
  return {
    operation: plan.proposal?.operation || plan.summary.primaryAction || 'desktop_control',
    lane: 'desktop_control',
    modelLane: plan.summary.modelLane || 'fara_gui_grounding',
    permissionEnvelope: plan.summary.permissionEnvelope,
    approvalRequired: plan.summary.approvalRequired,
    receiptRequired: true,
    planId: plan.planId,
  };
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

function looksLikeStatusIntent(message) {
  return /\b(status|health|state|online|offline|running|system|system'?s|gpu|gpus|utilization|utilisation|lane|lanes|capabilit(?:y|ies)|receipt|receipts|avatar|daimon|brittney)\b/iu.test(String(message || ''));
}

function looksLikeNextStepsIntent(message) {
  return /\b(next\s+steps?|what\s+(now|next)|where\s+do\s+we\s+go|what\s+should\s+we\s+do|plan|roadmap|priority|priorities|improve|improvement|marathon|100\+?|hundred)\b/iu.test(String(message || ''));
}

function gpuStatusSnapshot() {
  try {
    const raw = execFileSync('nvidia-smi', [
      '--query-gpu=name,utilization.gpu,memory.used,memory.total',
      '--format=csv,noheader,nounits',
    ], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5_000,
    }).trim();
    const items = raw
      ? raw.split(/\r?\n/)
        .map((line) => line.split(',').map((part) => part.trim()))
        .filter((parts) => parts.length >= 4)
        .map(([name, utilization, memoryUsed, memoryTotal]) => ({
          name,
          utilizationPercent: Number.parseInt(utilization, 10),
          memoryUsedMiB: Number.parseInt(memoryUsed, 10),
          memoryTotalMiB: Number.parseInt(memoryTotal, 10),
        }))
      : [];
    if (items.length === 0) {
      return {
        status: 'not_reported',
        items: [],
        summary: 'GPU telemetry was not reported by nvidia-smi on this host',
      };
    }
    return {
      status: 'reported',
      items,
      summary: items
        .map((gpu) => `${gpu.name}: ${gpu.utilizationPercent}% GPU, ${gpu.memoryUsedMiB}/${gpu.memoryTotalMiB} MiB`)
        .join('; '),
    };
  } catch {
    return {
      status: 'not_reported',
      items: [],
      summary: 'GPU telemetry was not reported by nvidia-smi on this host',
    };
  }
}

function gitStatusSnapshot() {
  return SCAN_REPOS
    .filter((repo) => existsSync(join(repo.path, '.git')))
    .map((repo) => {
      try {
        const branch = execSync('git branch --show-current', {
          cwd: repo.path,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
          timeout: 5_000,
        }).trim() || 'detached';
        const raw = execSync('git status --short --untracked-files=normal', {
          cwd: repo.path,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
          timeout: 8_000,
        }).trim();
        const lines = raw ? raw.split(/\r?\n/).filter(Boolean) : [];
        const untrackedCount = lines.filter((line) => line.startsWith('??')).length;
        return {
          label: repo.label,
          branch,
          status: lines.length ? 'dirty' : 'clean',
          changedCount: lines.length,
          untrackedCount,
        };
      } catch {
        return {
          label: repo.label,
          branch: 'not_reported',
          status: 'not_reported',
          changedCount: null,
          untrackedCount: null,
        };
      }
    });
}

function publicShellUrl() {
  return `http://${HOST === '0.0.0.0' ? 'holojetson.local' : 'localhost'}:${PORT}`;
}

function buildLiveStatusSnapshot() {
  const pending = pendingConsents();
  const executions = executionHistory();
  const stale = staleProcesses();
  return {
    schemaVersion: 'hololand.holoshell.live-status.v0.1.0',
    generatedAt: new Date().toISOString(),
    status: 'online',
    route: {
      surface: 'HoloShell Operate Room',
      url: publicShellUrl(),
      host: HOST,
      port: PORT,
      chatEndpoint: 'POST /api/brittney/chat',
      desktopControlEndpoint: 'POST /api/desktop-control/plan',
    },
    avatar: {
      name: 'Brittney',
      status: 'online',
      runtime: '@holoscript/aibrittney',
      daimonContext: 'attached when D.053 has emerged',
    },
    capabilities: [
      'brittney_chat',
      'receipt_backed_status',
      'desktop_control_plan',
      'fara_gui_grounding',
      'daimon_rehydration',
    ],
    lanes: [
      { id: 'brittney_operator', model: process.env.AIBRITTNEY_MODEL || 'qwen3:4b-instruct', role: 'operator chat and routing' },
      { id: 'fara_gui_grounding', model: 'fara:7b', role: 'desktop app visual grounding' },
      { id: 'receipt_gate', model: 'local filesystem receipts', role: 'approval and audit boundary' },
    ],
    gpu: gpuStatusSnapshot(),
    substratePressure: substratePressure(),
    worktreeHealth: worktreeHealth(),
    gitStatus: gitStatusSnapshot(),
    pendingConsentCount: pending.length,
    pendingConsents: pending.slice(0, 5),
    staleProcessCount: stale.length,
    staleProcesses: stale.slice(0, 5),
    recentExecutionCount: executions.length,
    recentExecutions: executions.slice(0, 5),
    receiptsDir: RECEIPTS_DIR,
  };
}

function metricSummary(items) {
  return items
    .map((item) => `${item.metric}: ${item.value}`)
    .join('; ');
}

function gitSummary(items) {
  if (!items.length) return 'no tracked local repos reported';
  return items
    .map((repo) => {
      if (repo.status === 'not_reported') return `${repo.label}: not reported`;
      return `${repo.label}: ${repo.status} on ${repo.branch} (${repo.changedCount} changed, ${repo.untrackedCount} untracked)`;
    })
    .join('; ');
}

function laneSummary(snapshot) {
  return snapshot.lanes
    .map((lane) => `${lane.id} -> ${lane.model}`)
    .join('; ');
}

function formatLiveStatusBrief(snapshot) {
  return [
    '[Live HoloShell status context - answer from these fields; do not answer "unknown" when a field is present.]',
    `System status: ${snapshot.status}`,
    `HoloShell route: ${snapshot.route.url} (${snapshot.route.chatEndpoint})`,
    `Brittney avatar: ${snapshot.avatar.status}; runtime ${snapshot.avatar.runtime}; Daimon context ${snapshot.avatar.daimonContext}`,
    `Capabilities: ${snapshot.capabilities.join(', ')}`,
    `Lanes: ${laneSummary(snapshot)}`,
    `GPU telemetry: ${snapshot.gpu.summary}`,
    `Substrate pressure: ${metricSummary(snapshot.substratePressure)}`,
    `Worktrees: ${gitSummary(snapshot.gitStatus)}`,
    `Pending consent receipts: ${snapshot.pendingConsentCount}`,
    `Stale git processes: ${snapshot.staleProcessCount}`,
    `Recent executions visible: ${snapshot.recentExecutionCount}`,
    `Receipts directory: ${snapshot.receiptsDir}`,
  ].join('\n');
}

function buildGroundedStatusReply(snapshot, message) {
  const wantsNextSteps = looksLikeNextStepsIntent(message);
  const baseGuardrails = `${snapshot.pendingConsentCount} pending consent(s), ${snapshot.staleProcessCount} stale git process(es), ${snapshot.recentExecutionCount} recent execution receipt(s) visible`;
  if (wantsNextSteps) {
    return [
      'Next steps, grounded in live HoloShell state:',
      `1. Keep Brittney as the operator surface; chat is online at ${snapshot.route.url} and receipts are enabled at ${snapshot.receiptsDir}.`,
      `2. Route desktop app work through Fara: ${snapshot.route.desktopControlEndpoint} uses the fara_gui_grounding lane and stays plan-only until guarded approval.`,
      `3. Balance processing across the owned-GPU lanes: ${laneSummary(snapshot)}. Current GPU telemetry: ${snapshot.gpu.summary}.`,
      `4. Run improvement batches through the desktop app route with receipts on every pass. Current guardrails: ${baseGuardrails}.`,
      `5. Cleanly separate local work by repo status: ${gitSummary(snapshot.gitStatus)}.`,
      '',
      'No cube/test object is needed here. The next move is live data -> Fara-grounded desktop plan -> guarded execution receipt -> measure the run -> feed the improvement back into Brittney.',
    ].join('\n');
  }

  return [
    'System status: online.',
    `Brittney chat is live at ${snapshot.route.url} through ${snapshot.route.chatEndpoint}; receipts are enabled.`,
    `Avatar status: ${snapshot.avatar.status}; Daimon context rides along when D.053 has emerged.`,
    `Active capabilities: ${snapshot.capabilities.join(', ')}.`,
    `Active lanes: ${laneSummary(snapshot)}.`,
    `GPU balance: ${snapshot.gpu.summary}.`,
    `Local guardrails: ${baseGuardrails}.`,
    `Worktrees: ${gitSummary(snapshot.gitStatus)}.`,
    `Substrate pressure: ${metricSummary(snapshot.substratePressure)}.`,
  ].join('\n');
}

function liveStatusProposals(snapshot, message) {
  const proposals = [
    {
      operation: 'summarize_live_system_status',
      lane: 'brittney_operator',
      receiptRequired: true,
    },
    {
      operation: 'inspect_gpu_lane_balance',
      lane: 'owned_gpu_fleet',
      receiptRequired: true,
    },
  ];
  if (looksLikeNextStepsIntent(message)) {
    proposals.push({
      operation: 'plan_receipt_backed_improvement_batch',
      lane: 'brittney_app_route',
      receiptRequired: true,
    });
    proposals.push({
      operation: 'plan_desktop_control_with_fara',
      lane: 'fara_gui_grounding',
      receiptRequired: true,
      approvalRequired: true,
    });
  }
  if (snapshot.pendingConsentCount > 0) {
    proposals.push({
      operation: 'review_pending_consent_receipts',
      lane: 'receipt_gate',
      receiptRequired: true,
    });
  }
  return proposals;
}

function mergeProposals(primary, secondary) {
  const seen = new Set();
  return [...primary, ...secondary].filter((proposal) => {
    const key = `${proposal.operation || 'action'}:${proposal.lane || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function liveStatusResponseEnvelope(snapshot) {
  return {
    schemaVersion: snapshot.schemaVersion,
    status: snapshot.status,
    generatedAt: snapshot.generatedAt,
    route: snapshot.route,
    avatar: snapshot.avatar,
    capabilityCount: snapshot.capabilities.length,
    laneCount: snapshot.lanes.length,
    gpu: snapshot.gpu,
    pendingConsentCount: snapshot.pendingConsentCount,
    staleProcessCount: snapshot.staleProcessCount,
    recentExecutionCount: snapshot.recentExecutionCount,
    gitStatus: snapshot.gitStatus,
  };
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
        const liveStatus = looksLikeStatusIntent(message) || looksLikeNextStepsIntent(message)
          ? buildLiveStatusSnapshot()
          : null;
        // If the daimon has emerged, prime Brittney with its remembered context (rehydration).
        const preamble = await daimonRehydration();
        const prompt = [preamble, liveStatus ? formatLiveStatusBrief(liveStatus) : '', message]
          .filter(Boolean)
          .join('\n\n');
        const args = [turnScript, '--prompt', prompt, '--json'];
        if (selfTest) args.push('--self-test');
        const out = execFileSync('node', args, {
          cwd: repoRoot, encoding: 'utf8', timeout: 70_000, maxBuffer: 16 * 1024 * 1024,
        });
        const receipt = JSON.parse(out.slice(out.indexOf('{')));
        const r = receipt.result || {};
        const modelReply = r.finalText || r.summary || r.text || '(no reply)';
        const reply = liveStatus
          ? buildGroundedStatusReply(liveStatus, message)
          : modelReply;
        const desktopControl = looksLikeDesktopControlIntent(message)
          ? desktopControlPlanFor(message, { actor: 'brittney' })
          : null;
        const controlProposal = desktopControlProposal(desktopControl);
        const receiptProposals = (receipt.proposals || []).map((p) => ({
          operation: p.operation || p.kind || p.title || 'action',
          lane: p.lane || p.consentLane || null,
          receiptRequired: p.receiptRequired ?? null,
        }));
        if (controlProposal) receiptProposals.push(controlProposal);
        const proposals = liveStatus
          ? mergeProposals(liveStatusProposals(liveStatus, message), receiptProposals)
          : receiptProposals;
        respond(res, {
          turnId: receipt.turnId,
          reply,
          proposals,
          desktopControl: desktopControl ? {
            planId: desktopControl.planId,
            status: desktopControl.summary?.status,
            modelLane: desktopControl.summary?.modelLane,
            recommendedModel: desktopControl.summary?.recommendedModel,
            permissionEnvelope: desktopControl.summary?.permissionEnvelope,
            approvalRequired: desktopControl.summary?.approvalRequired,
            nextSafeStep: desktopControl.summary?.nextSafeStep,
          } : null,
          systemStatus: liveStatus ? liveStatusResponseEnvelope(liveStatus) : null,
          receiptType: receipt.receipt?.receiptType || null,
        });
        growDaimon(message).catch(() => {});  // accumulate the daimon's soul from this turn
      } catch (err) {
        respond(res, { error: String(err.message || err).slice(0, 300) }, 500);
      }
    });
    return;
  }

  // ── POST /api/desktop-control/plan — plan-only desktop control. Brittney is the
  // operator surface; Fara is the GUI-grounding lane. This endpoint never clicks,
  // types, opens apps, sends messages, installs software, deletes data, or changes
  // settings. It returns a receipt-backed plan for a later guarded execution path.
  if (req.method === 'POST' && path === '/api/desktop-control/plan') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const { intent, message, selfTest } = JSON.parse(body || '{}');
        const requestedIntent = intent || message;
        if (!requestedIntent || typeof requestedIntent !== 'string') {
          respond(res, { error: 'missing intent' }, 400);
          return;
        }
        const plan = desktopControlPlanFor(requestedIntent, { actor: 'brittney', selfTest });
        respond(res, {
          planId: plan.planId,
          status: plan.summary.status,
          modelLane: plan.summary.modelLane,
          recommendedModel: plan.summary.recommendedModel,
          permissionEnvelope: plan.summary.permissionEnvelope,
          approvalRequired: plan.summary.approvalRequired,
          destructiveActionsTaken: plan.receipt.destructiveActionsTaken,
          proposal: desktopControlProposal(plan),
          receipt: plan,
        });
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
server.listen(PORT, HOST, () => {
  console.log(`HoloShell Operate Room: http://${HOST === '0.0.0.0' ? 'holojetson.local' : 'localhost'}:${PORT}  (bound ${HOST})`);
  console.log(`  Receipts: ${RECEIPTS_DIR}`);
  if (!existsSync(HTML_PATH)) {
    console.warn('  Warning: operate-room.html not found. Run compile.mjs first.');
  }
});
