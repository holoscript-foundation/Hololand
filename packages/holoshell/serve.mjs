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
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, execFileSync } from 'node:child_process';
import { buildTerminalEventStream } from '../../scripts/holoshell-terminal-event-stream.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, 'dist');
const HTML_PATH = join(DIST_DIR, 'operate-room.html');
const BRITTNEY_COCKPIT_CAPSULE_SCHEMA = 'hololand.holoshell.brittney-cockpit-capsule.v0.1.0';
const BRITTNEY_COCKPIT_SOURCE = 'apps/holoshell/source/holoshell-brittney-desktop-cockpit.hsplus';
const FARA_PEER_AUTOMATION_SOURCE = 'apps/holoshell/source/holoshell-fara-peer-automation.hsplus';
const HOLOCLAW_RUNTIME_BRIDGE_SOURCE = 'apps/holoshell/source/holoshell-holoclaw-runtime-bridge.hsplus';
const HOLOCLAW_RUNTIME_BRIDGE_SCHEMA = 'hololand.holoshell.holoclaw-runtime-bridge.v0.1.0';
const HOLOCLAW_PRODUCTION_FRONTIER_SOURCE = 'apps/holoshell/source/holoshell-holoclaw-production-frontier.hsplus';
const HOLOCLAW_SESSION_OBJECT_SCHEMA = 'hololand.holoshell.holoclaw-session-object.v0.1.0';
const SOVEREIGN_ROOM_MARATHON_SOURCE = 'apps/holoshell/source/holoshell-sovereign-room-marathon.hsplus';
const SOVEREIGN_ROOM_MARATHON_SCRIPT = 'scripts/holoshell-sovereign-room-marathon.mjs';
const SOVEREIGN_ROOM_MARATHON_SCHEMA = 'hololand.holoshell.sovereign-room-marathon.v0.1.0';
const REPO_ROOT = join(__dirname, '..', '..');
const HOLOSHELL_TMP_DIR = process.env.HOLOSHELL_TMP_DIR || join(REPO_ROOT, '.tmp', 'holoshell');
const HOLOCLAW_RUNTIME_BRIDGE_RECEIPT =
  process.env.HOLOSHELL_HOLOCLAW_RUNTIME_BRIDGE_RECEIPT ||
  join(HOLOSHELL_TMP_DIR, 'holoclaw-runtime-bridge-latest.json');
const SOVEREIGN_ROOM_MARATHON_RECEIPT =
  process.env.HOLOSHELL_SOVEREIGN_ROOM_MARATHON_RECEIPT ||
  join(HOLOSHELL_TMP_DIR, 'sovereign-room-marathon-latest.json');
const LEGACY_WINDOW_INVENTORY_SOURCE = 'apps/holoshell/source/holoshell-legacy-window-inventory.hsplus';
const LEGACY_WINDOW_INVENTORY_SCHEMA = 'hololand.holoshell.legacy-window-inventory.v0.1.0';
const OPERATOR_BRIEF_SOURCE = 'apps/holoshell/source/holoshell-operator-brief.hsplus';
const OPERATOR_TERMINAL_SESSION_SCHEMA = 'hololand.holoshell.browser-terminal-coupling.v0.1.0';
const OPERATOR_TERMINAL_COUPLING_SOURCE = 'apps/holoshell/source/holoshell-browser-terminal-coupling.hsplus';
const OPERATOR_TERMINAL_SOURCE = 'apps/holoshell/source/holoshell-operator-terminal.hsplus';
const OPERATOR_TERMINAL_RECEIPT_SCHEMA = 'hololand.holoshell.operator-terminal.v0.1.0';
const OPERATOR_TERMINAL_EVENT_STREAM_SOURCE = 'apps/holoshell/source/holoshell-terminal-event-stream.hsplus';
const OPERATOR_TERMINAL_RECEIPT =
  process.env.HOLOSHELL_OPERATOR_TERMINAL_RECEIPT ||
  join(process.cwd(), '.tmp', 'holoshell', 'operator-terminal.json');
const OPERATOR_TERMINAL_EVENT_LOG =
  process.env.HOLOSHELL_OPERATOR_TERMINAL_EVENT_LOG ||
  join(process.cwd(), '.tmp', 'holoshell', 'operator-terminal-events.jsonl');
const OPERATOR_TERMINAL_REFRESH_COMMAND = 'node scripts/holoshell-operator-terminal.mjs --agent --json';
const OPERATOR_TERMINAL_FRESHNESS_MS = Number(process.env.HOLOSHELL_OPERATOR_TERMINAL_FRESHNESS_MS || 5 * 60 * 1000);
const BROWSER_SESSION_STATE_KEY = 'holoshell:brittney:browser-session:v1';
const BROWSER_SESSION_STATE_SCHEMA = 'hololand.holoshell.browser-session-state.v0.1.0';
const BROWSER_SESSION_STATE_SNAPSHOT =
  process.env.HOLOSHELL_BROWSER_SESSION_STATE ||
  join(HOLOSHELL_TMP_DIR, 'browser-session-state.json');
const BROWSER_SESSION_STATE_DIR =
  process.env.HOLOSHELL_BROWSER_SESSION_STATE_DIR ||
  join(HOLOSHELL_TMP_DIR, 'browser-sessions');
const BROWSER_SESSION_TRANSCRIPT_LIMIT = 120;
const BROWSER_SESSION_EVIDENCE_LIMIT = 80;
const BROWSER_CHAT_WORKSPACE_IDS = ['brittney', 'sovereign', 'holoclaw', 'terminal', 'improvement'];
const BROWSER_CHAT_WORKSPACE_ROUTE_MAP = {
  brittney: 'POST /api/brittney/chat',
  sovereign: 'POST /workflow/sovereign-room-marathon',
  holoclaw: 'POST /workflow/holoclaw-runtime-bridge',
  terminal: 'GET /api/operator-terminal/session',
  improvement: 'POST /api/improvement-runs',
};
const LAPTOP_REASONING_RESULT_SCHEMA = 'hololand.holoshell.laptop-reasoning-result.v0.1.0';

const PORT = Number(process.env.HOLOSHELL_SERVE_PORT ?? 8747);
// Bind host. Default loopback (the laptop-local case). On the JETSON — where this
// surface is hosted so the laptop/Quest are just screens (founder 2026-06-17) — set
// HOLOSHELL_SERVE_HOST=0.0.0.0 so http://holojetson.local:8747 is LAN-reachable.
const HOST = process.env.HOLOSHELL_SERVE_HOST ?? '127.0.0.1';
const FARA_PEER_AUTOMATION_MIN_INTERVAL_MS = 60_000;
const FARA_PEER_AUTOMATION_DEFAULT_INTERVAL_MS = Number(process.env.HOLOSHELL_FARA_PEER_AUTOMATION_INTERVAL_MS || 0);
const FARA_PEER_AUTOMATION_DEFAULT_OBJECTIVE =
  process.env.HOLOSHELL_FARA_PEER_AUTOMATION_OBJECTIVE ||
  'Keep HoloShell moving through read-only Fara/Brittney peer coordination';
let faraPeerAutomationTimer = null;
let faraPeerAutomationScheduleState = {
  schemaVersion: 'hololand.holoshell.fara-peer-automation-schedule.v0.1.0',
  source: FARA_PEER_AUTOMATION_SOURCE,
  status: 'disabled',
  intervalMs: 0,
  objective: FARA_PEER_AUTOMATION_DEFAULT_OBJECTIVE,
  cadence: 'scheduled',
  configuredAt: null,
  nextPulseAt: null,
  lastPulseAt: null,
  lastPulseId: null,
  hiddenAutomationAllowed: false,
  destructiveActionsTaken: false,
  desktopAutomationExecuted: false,
  receiptRequired: true,
};

const RECEIPTS_DIR =
  process.env.HOLOSHELL_RECEIPTS_DIR ??
  'C:/Users/Josep/.ai-ecosystem/runtime/holoshell/receipts';

const AI_ECOSYSTEM_DIR =
  process.env.AI_ECOSYSTEM_DIR ||
  process.env.HOLOTUNE_AI_ECOSYSTEM_DIR ||
  join(process.env.USERPROFILE || process.env.HOME || '.', '.ai-ecosystem');

const HOLOTUNE_TRACE_WRITER =
  process.env.HOLOTUNE_TRACE_WRITER ||
  join(AI_ECOSYSTEM_DIR, 'scripts', 'trace-writer.mjs');

const HOLOTUNE_TRACE_AGENT_ID =
  process.env.HOLOTUNE_TRACE_AGENT_ID ||
  process.env.HOLOSCRIPT_AGENT_ID ||
  'agent_brittney';

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
      .sort((a, b) => receiptSortKey(b).localeCompare(receiptSortKey(a)));
  } catch {
    return [];
  }
}

function receiptSortKey(receipt) {
  return receipt?.timestamp || receipt?.executedAt || receipt?.generatedAt || '';
}

function staleProcesses() {
  if (process.platform !== 'win32') {
    try {
      const raw = execFileSync('ps', ['-eo', 'pid=', '-eo', 'etimes=', '-eo', 'args='], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 8_000,
      });
      return raw.split(/\r?\n/)
        .map((line) => {
          const match = /^\s*(\d+)\s+(\d+)\s+(.+)$/u.exec(line);
          if (!match) return null;
          return {
            pid: Number(match[1]),
            ageSec: Number(match[2]),
            command: match[3],
          };
        })
        .filter((p) => p && p.ageSec > 5 * 60 && /\bgit\b/u.test(p.command) && /--ignored/u.test(p.command))
        .map((p) => ({
          pid: p.pid,
          reason: 'git_status_ignored_stale',
          ageSec: p.ageSec,
          command: p.command.slice(0, 80),
        }));
    } catch {
      return [];
    }
  }
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

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function readHoloShellTmpJson(fileName) {
  const filePath = join(HOLOSHELL_TMP_DIR, fileName);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeHoloShellTmpJson(fileName, value) {
  const filePath = join(HOLOSHELL_TMP_DIR, fileName);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return filePath;
}

function writeJsonFile(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return filePath;
}

function shortWindowLabel(window, index) {
  return String(
    window?.appLabel
      || window?.label
      || window?.appName
      || window?.titleLabel
      || `Window ${index + 1}`
  ).slice(0, 44);
}

function normalizeCockpitWindow(window, index) {
  const id = String(window?.windowId || window?.id || `window_${index + 1}`);
  const appName = String(window?.appName || '').slice(0, 40);
  const label = shortWindowLabel(window, index);
  return {
    id,
    label,
    appName,
    titleLabel: String(window?.titleLabel || 'redacted_window').slice(0, 48),
    surfaceClass: String(window?.surfaceClass || window?.archetype || 'legacy_window').slice(0, 48),
    foreground: Boolean(window?.foreground),
    pidKnown: Number.isInteger(Number(window?.pid)),
    rawTitleHidden: true,
    actions: ['focus_window', 'launch_app', 'open_url'],
  };
}

function buildWindowAwareness() {
  const legacyWindows = readHoloShellTmpJson('legacy-window-inventory.json');
  const operatorBrief = readHoloShellTmpJson('operator-brief.json');
  const windows = safeArray(legacyWindows?.windows).slice(0, 8).map(normalizeCockpitWindow);
  const activeWindow = windows.find((window) => window.foreground) || windows[0] || null;
  const legacySummary = legacyWindows?.summary || {};
  const operatorLegacy = operatorBrief?.legacy || {};
  const peers = operatorBrief?.peers || {};
  const operatorNextActions = safeArray(operatorBrief?.nextActions).slice(0, 3).map((action, index) => ({
    id: `operator_next_${index + 1}`,
    source: String(action.source || 'operator_brief').slice(0, 48),
    priority: String(action.priority || 'medium').slice(0, 16),
    action: String(action.action || '').slice(0, 180),
  }));
  const visibleWindowCount = legacySummary.visibleWindowCount || operatorLegacy.visibleWindowCount || 0;
  const peerWindowCount = legacySummary.aiPeerWindowCount ?? legacySummary.peerWindowCount ?? peers.windowInstanceCount ?? operatorLegacy.peerWindowCount ?? 0;
  const shellWindowCount = legacySummary.shellWindowCount ?? peers.shellWindowInstanceCount ?? operatorLegacy.shellWindowCount ?? 0;
  const rawWindowTitlesIncluded = Boolean(
    legacyWindows?.safety?.rawWindowTitlesIncluded
      || legacyWindows?.receipt?.rawWindowTitlesIncluded
      || operatorBrief?.safety?.rawWindowTitlesIncluded
      || operatorBrief?.receipt?.rawWindowTitlesIncluded
  );
  const destructiveActionsTaken = Boolean(legacyWindows?.safety?.destructiveActionsTaken || operatorBrief?.safety?.destructiveActionsTaken);
  return {
    status: windows.length ? 'windows_visible' : (operatorBrief ? 'operator_brief_only' : 'window_receipts_missing'),
    sourceAnchors: {
      legacyWindowInventory: LEGACY_WINDOW_INVENTORY_SOURCE,
      operatorBrief: OPERATOR_BRIEF_SOURCE,
      tmpDir: HOLOSHELL_TMP_DIR === join(REPO_ROOT, '.tmp', 'holoshell') ? '.tmp/holoshell' : '[external-holoshell-tmp-dir]',
    },
    summary: {
      visibleWindowCount,
      peerWindowCount,
      shellWindowCount,
      activeWindowCount: activeWindow ? 1 : 0,
      candidateWindowCount: windows.length,
      operatorBriefStatus: operatorBrief?.status || 'missing',
      rawWindowTitlesIncluded,
    },
    activeWindow,
    windows,
    operatorNextActions,
    safety: {
      observeOnly: true,
      rawWindowTitlesIncluded,
      rawWindowTitlesHidden: !rawWindowTitlesIncluded,
      destructiveActionsTaken,
      desktopAutomationExecuted: false,
      mutationRequiresHoloGate: true,
    },
    receipts: {
      legacyWindowInventoryHash: legacyWindows?.receipt?.windowInventoryHash || null,
      operatorBriefHash: operatorBrief?.receipt?.briefHash || null,
    },
  };
}

function desktopPreflightPath(primaryAction, options = {}) {
  const admitted = primaryAction === 'open_url';
  return {
    primaryAction,
    planEndpoint: 'POST /api/desktop-control/plan',
    bridgePreflightEndpoint: 'POST http://127.0.0.1:{8751|8752|8753}/api/desktop-control/preflight',
    gestureProofEndpoint: 'POST http://127.0.0.1:{8751|8752|8753}/api/desktop-control/gesture-proof',
    consentTokenEndpoint: 'POST http://127.0.0.1:{8751|8752|8753}/api/desktop-control/consent-token',
    executionEndpoint: 'POST http://127.0.0.1:{8751|8752|8753}/api/desktop-control/execute',
    requiredSequence: ['desktop_control_plan', 'laptop_bridge_preflight', 'fresh_gesture_proof', 'consent_token', 'execution_receipt'],
    planOnlyUntilConsentToken: true,
    executionAllowedFromCockpit: false,
    admittedExecutor: admitted,
    allOtherDesktopActionsRemainPlanOnly: !admitted,
    receiptRequired: true,
    target: options.target || null,
  };
}

function desktopActionCard({ id, label, primaryAction, target = null, intent, permissionEnvelope = 'guarded_execute' }) {
  return {
    id,
    label,
    method: 'POST',
    href: '/api/desktop-control/plan',
    lane: 'desktop_control',
    primaryAction,
    target,
    intent,
    permissionEnvelope,
    mayExecuteWithoutConsent: false,
    planOnly: true,
    holoGateRequired: true,
    receiptRequired: true,
    preflightPath: desktopPreflightPath(primaryAction, { target }),
  };
}

function buildWindowActionCards(windowAwareness) {
  return safeArray(windowAwareness.windows).slice(0, 3).map((window) => desktopActionCard({
    id: `focus_window_${window.id}`,
    label: `Focus ${window.label}`.slice(0, 56),
    primaryAction: 'focus_window',
    target: {
      windowId: window.id,
      label: window.label,
      appName: window.appName,
      rawTitleHidden: true,
    },
    intent: `Focus the visible ${window.label} window without clicking content or changing state.`,
  }));
}

function buildToolPreflightCards(windowAwareness) {
  const active = windowAwareness.activeWindow;
  const selectedTarget = active ? {
    windowId: active.id,
    label: active.label,
    appName: active.appName,
    rawTitleHidden: true,
  } : {
    windowId: '',
    label: 'selected window',
    appName: '',
    rawTitleHidden: true,
  };
  const appLabel = selectedTarget.appName || selectedTarget.label || 'selected app';
  return [
    desktopActionCard({
      id: 'focus_window_preflight',
      label: 'Plan Focus Window',
      primaryAction: 'focus_window',
      target: selectedTarget,
      intent: `Plan how to focus ${selectedTarget.label} without clicking content or changing state.`,
    }),
    desktopActionCard({
      id: 'launch_app_preflight',
      label: 'Plan Launch App',
      primaryAction: 'launch_app',
      target: { appName: appLabel, rawTitleHidden: true },
      intent: `Plan how to launch ${appLabel} without executing the launch until HoloGate consent exists.`,
    }),
    desktopActionCard({
      id: 'open_url_preflight',
      label: 'Plan Open URL',
      primaryAction: 'open_url',
      target: { url: 'https://example.com/status', rawTitleHidden: true },
      intent: 'Open URL https://example.com/status in the default browser after HoloGate consent.',
    }),
  ];
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
  const planScript = join(REPO_ROOT, 'scripts', 'holoshell-desktop-control-plan.mjs');
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
    cwd: REPO_ROOT,
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
    items.push({ metric: 'Git Processes', value: process.platform === 'win32' ? 'unknown' : '0 (not reported)' });
  }

  // 2. Index lock files in HoloScript .git
  const GIT_DIR = 'C:/Users/Josep/Documents/GitHub/HoloScript/.git';
  try {
    const locks = readdirSync(GIT_DIR).filter((f) => f.endsWith('.lock'));
    items.push({ metric: 'Index Locks', value: locks.length === 0 ? '0 ✓' : `${locks.length} ⚠` });
  } catch {
    items.push({ metric: 'Index Locks', value: process.platform === 'win32' ? 'unknown' : '0 (not reported)' });
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
  // "Brittney" or "receipt" alone is address/context, not telemetry intent.
  // Likewise, "lane" can mean "Codex laptop lane" inside normal architecture
  // chat; only route to the status card when telemetry terms are paired with an
  // explicit status/check/report ask.
  const text = String(message || '');
  if (/\b(status|health|online|offline|running|system status|system health)\b/iu.test(text)) return true;
  return (
    /\b(show|give|summarize|inspect|check|report|current|live|what(?:'s| is))\b[\s\S]{0,120}\b(gpu|gpus|utilization|utilisation|lane|lanes|capabilit(?:y|ies)|avatar|daimon)\b/iu.test(text) ||
    /\b(gpu|gpus|lane|lanes|capabilit(?:y|ies)|avatar|daimon)\b[\s\S]{0,120}\b(status|health|telemetry|utilization|utilisation|balance)\b/iu.test(text)
  );
}

function looksLikeNextStepsIntent(message) {
  return /\b(next\s+steps?|what\s+(now|next)|where\s+do\s+we\s+go|what\s+should\s+we\s+do|plan|roadmap|priority|priorities|improve|improvement|marathon|100\+?|hundred)\b/iu.test(String(message || ''));
}

// The founder reaching out PERSONALLY (a feeling, the relationship itself, the vision, getting
// to know each other) — not operating the machine. This must take precedence over the status/
// next-steps classifiers, which are greedy (\bsystem\b, \bbrittney\b, \bstate\b all match) and
// were discarding Brittney's real reply in favour of a telemetry card. Conservative: a relational
// word inside an imperative tool/desktop command stays operational.
function looksLikeRelationalIntent(message) {
  const text = String(message || '');
  const relational = /\b(relationship|connection|connecting|how are you|how('?re| are) (we|things|you)|who are you|get to know|feel|feeling|trust|grow|growing|together|companion|friend|love|care about|caring|thank you|thanks|appreciate|proud|miss you|between (us|founder|you)|you and (i|me)|our (bond|relationship)|listen|present with|be (here|with) (me|you))\b/iu.test(text);
  if (!relational) return false;
  if (/^\s*(build|run|open|launch|execute|deploy|install|fix|compile|test|queue|refresh|check|stage|focus|click|type|scroll|save|submit)\b/iu.test(text)) return false;
  if (looksLikeDesktopControlIntent(text)) return false;
  return true;
}

function parseOptionalInteger(value) {
  const parsed = Number.parseInt(String(value || '').replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalFloat(value) {
  const parsed = Number.parseFloat(String(value || '').replace(/[^.\d-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function gpuMetric(value, suffix, fallback) {
  return Number.isFinite(value) ? `${value}${suffix}` : fallback;
}

function gpuSummary(items) {
  return items
    .map((gpu) => {
      const util = gpuMetric(gpu.utilizationPercent, '% GPU', 'GPU util not reported');
      const memory = Number.isFinite(gpu.memoryUsedMiB) && Number.isFinite(gpu.memoryTotalMiB)
        ? `${gpu.memoryUsedMiB}/${gpu.memoryTotalMiB} MiB`
        : 'memory not reported';
      const temperature = Number.isFinite(gpu.temperatureC) ? `, ${gpu.temperatureC}C` : '';
      const power = Number.isFinite(gpu.powerMilliwatts) ? `, ${gpu.powerMilliwatts}mW` : '';
      return `${gpu.name}: ${util}, ${memory}${temperature}${power}`;
    })
    .join('; ');
}

function tegrastatsGpuSnapshot() {
  let raw = '';
  try {
    raw = execSync('timeout 3s tegrastats --interval 1000', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 4_000,
    }).trim();
  } catch (err) {
    raw = String(err.stdout || '').trim();
  }
  const line = raw.split(/\r?\n/).find((entry) => /GR3D_FREQ/u.test(entry));
  if (!line) return null;
  const utilization = /GR3D_FREQ\s+(\d+)%/u.exec(line);
  const ram = /RAM\s+(\d+)\/(\d+)MB/u.exec(line);
  const temperature = /gpu@([0-9.]+)C/u.exec(line);
  const power = /VDD_IN\s+(\d+)mW/u.exec(line);
  const item = {
    name: 'Jetson Orin integrated GPU',
    utilizationPercent: utilization ? parseOptionalInteger(utilization[1]) : null,
    memoryUsedMiB: ram ? parseOptionalInteger(ram[1]) : null,
    memoryTotalMiB: ram ? parseOptionalInteger(ram[2]) : null,
    temperatureC: temperature ? parseOptionalFloat(temperature[1]) : null,
    powerMilliwatts: power ? parseOptionalInteger(power[1]) : null,
  };
  if (
    !Number.isFinite(item.utilizationPercent) &&
    !Number.isFinite(item.memoryUsedMiB) &&
    !Number.isFinite(item.memoryTotalMiB)
  ) {
    return null;
  }
  return {
    status: 'reported',
    source: 'tegrastats',
    items: [item],
    summary: gpuSummary([item]),
  };
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
          utilizationPercent: parseOptionalInteger(utilization),
          memoryUsedMiB: parseOptionalInteger(memoryUsed),
          memoryTotalMiB: parseOptionalInteger(memoryTotal),
        }))
      : [];
    const hasMeasuredTelemetry = items.some((gpu) =>
      Number.isFinite(gpu.utilizationPercent) ||
      Number.isFinite(gpu.memoryUsedMiB) ||
      Number.isFinite(gpu.memoryTotalMiB)
    );
    if (items.length > 0 && !hasMeasuredTelemetry) {
      const tegra = tegrastatsGpuSnapshot();
      if (tegra) return tegra;
      return {
        status: 'reported_limited',
        source: 'nvidia-smi',
        items,
        summary: gpuSummary(items),
      };
    }
    if (items.length === 0) {
      const tegra = tegrastatsGpuSnapshot();
      if (tegra) return tegra;
      return {
        status: 'not_reported',
        items: [],
        summary: 'GPU telemetry was not reported by nvidia-smi on this host',
      };
    }
    return {
      status: 'reported',
      source: 'nvidia-smi',
      items,
      summary: gpuSummary(items),
    };
  } catch {
    const tegra = tegrastatsGpuSnapshot();
    if (tegra) return tegra;
    return {
      status: 'not_reported',
      items: [],
      summary: 'GPU telemetry was not reported by nvidia-smi on this host',
    };
  }
}

function laptopReasoningStatusSnapshot() {
  const bridge = readHoloShellTmpJson('laptop-reasoning-bridge-latest.json');
  const result = readHoloShellTmpJson('laptop-reasoning-result-latest.json');
  const service = readHoloShellTmpJson('laptop-reasoning-bridge-service.json');
  const resultSummary = result?.summary || {};
  const bridgeSummary = bridge?.summary || {};
  const serviceSummary = service?.summary || {};
  const status = resultSummary.status || bridgeSummary.status || serviceSummary.serviceStatus || 'waiting_for_dispatch';
  const lane = resultSummary.lane || bridgeSummary.latestLane || 'laptop-hardware';
  const modelInvocationPerformed = Boolean(resultSummary.modelInvocationPerformed);
  const deterministicReceiptOnly = result?.result?.deterministicReceiptOnly !== undefined
    ? Boolean(result.result.deterministicReceiptOnly)
    : Boolean(resultSummary.deterministicReceiptOnly);
  const gpuStatus = resultSummary.laptopGpuStatus || bridgeSummary.latestLaptopGpuStatus || 'not_reported';
  const gpuSummary = resultSummary.laptopGpuSummary
    || bridgeSummary.latestLaptopGpuSummary
    || 'No laptop reasoning GPU receipt has been reported yet';
  const pingbackStatus = resultSummary.brittneyPingbackStatus || bridgeSummary.latestBrittneyPingbackStatus || result?.brittneyPingback?.status || '';
  const mode = resultSummary.reasoningExecutionMode || result?.result?.reasoningExecutionMode || 'waiting_for_result_receipt';
  const detail = resultSummary.resultId
    ? `${lane}; ${mode}; modelInvocationPerformed=${modelInvocationPerformed ? 'true' : 'false'}; ${gpuSummary}`
    : `${lane}; ${serviceSummary.serviceStatus || bridgeSummary.status || 'waiting'}; ${gpuSummary}`;
  return {
    status,
    lane,
    resultId: resultSummary.resultId || result?.resultId || '',
    dispatchId: resultSummary.dispatchId || result?.inputDispatch?.dispatchId || bridgeSummary.latestDispatchId || '',
    bridgeStatus: bridgeSummary.status || 'unknown',
    serviceStatus: serviceSummary.serviceStatus || 'unknown',
    modelInvocationPerformed,
    deterministicReceiptOnly,
    reasoningExecutionMode: mode,
    gpuStatus,
    gpuSummary,
    gpuUtilizationPercent: resultSummary.laptopGpuUtilizationPercent ?? null,
    gpuProcessCount: resultSummary.laptopGpuProcessCount || 0,
    pingbackStatus,
    summary: detail,
    source: result?.sourceAnchors?.workerScript || bridge?.sourceAnchors?.bridgeScript || 'scripts/holoshell-laptop-reasoning-worker.mjs',
  };
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

function readJsonFileIfPresent(filePath) {
  try {
    if (!filePath || !existsSync(filePath)) return null;
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function fileAgeMs(filePath, nowMs = Date.now()) {
  try {
    if (!filePath || !existsSync(filePath)) return null;
    return Math.max(0, nowMs - statSync(filePath).mtimeMs);
  } catch {
    return null;
  }
}

function modelLibraryPaths() {
  return [
    process.env.HOLOSHELL_MODEL_LIBRARY_PATH,
    join(__dirname, '..', '..', 'model-library', 'library.json'),
    'C:/Users/josep/.ai-ecosystem/model-library/library.json',
    'C:/Users/Josep/.ai-ecosystem/model-library/library.json',
  ].filter(Boolean);
}

function readModelCatalog() {
  for (const filePath of modelLibraryPaths()) {
    const catalog = readJsonFileIfPresent(filePath);
    if (catalog?.models && Array.isArray(catalog.models)) {
      return { source: filePath, catalog };
    }
  }
  return { source: null, catalog: null };
}

function normalizeModelName(name) {
  return String(name || '').replace(/:latest$/u, '').toLowerCase();
}

function inferModelRole(name, catalogEntry = null) {
  const key = normalizeModelName(name);
  const tags = catalogEntry?.capability_tags || [];
  if (tags.length) return tags.slice(0, 3).join('/');
  if (key.includes('holo-sdf')) return 'sdf-authoring/text-to-3d';
  if (key.includes('brittney-edge')) return 'native-field/tool-calls';
  if (key.includes('fara')) return 'computer-use/gui-grounding';
  if (key.includes('qwen3-vl')) return 'vision-language';
  if (key.includes('nomic')) return 'embeddings/semantic-search';
  if (key.includes('qwen3:4b-instruct')) return 'operator/tool-calls';
  if (key.includes('qwen3:4b')) return 'reasoning/thinking';
  if (key.includes('granite')) return 'tiny-fleet-worker';
  return 'available-model';
}

function parseOllamaList(raw) {
  return String(raw || '')
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s{2,}/u).map((part) => part.trim()).filter(Boolean);
      return {
        name: parts[0] || line.split(/\s+/u)[0] || '',
        id: parts[1] || '',
        size: parts[2] || '',
        modified: parts.slice(3).join(' ') || '',
      };
    })
    .filter((model) => model.name);
}

function installedOllamaModels() {
  const candidates = ['ollama', '/usr/local/bin/ollama'].filter((cmd, index, all) => all.indexOf(cmd) === index);
  for (const command of candidates) {
    try {
      const raw = execFileSync(command, ['list'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 8_000,
        env: { ...process.env, OLLAMA_HOST: process.env.OLLAMA_HOST || '127.0.0.1:11434' },
      });
      return { source: `${command} list`, models: parseOllamaList(raw) };
    } catch {
      // Try the next well-known Ollama path before falling back to the catalog.
    }
  }
  return { source: null, models: [] };
}

function modelLibrarySnapshot() {
  const { source: catalogSource, catalog } = readModelCatalog();
  const installed = installedOllamaModels();
  const directCatalogByName = new Map();
  const baseCatalogByName = new Map();
  for (const entry of catalog?.models || []) {
    for (const key of [entry.id, entry.display].filter(Boolean).map(normalizeModelName)) {
      if (!directCatalogByName.has(key)) directCatalogByName.set(key, entry);
    }
    if (entry.base) {
      const key = normalizeModelName(entry.base);
      if (!baseCatalogByName.has(key)) baseCatalogByName.set(key, entry);
    }
  }
  const installedModels = installed.models.map((model) => {
    const normalized = normalizeModelName(model.name);
    const alias = normalized.replace(/^hf\.co\/bartowski\//u, '');
    const catalogEntry =
      directCatalogByName.get(normalized) ||
      directCatalogByName.get(alias) ||
      baseCatalogByName.get(normalized) ||
      baseCatalogByName.get(alias);
    return {
      name: model.name,
      size: model.size,
      modified: model.modified,
      display: catalogEntry?.display || model.name,
      status: catalogEntry?.status || 'installed',
      role: inferModelRole(model.name, catalogEntry),
    };
  });
  const catalogModels = (catalog?.models || []).map((entry) => ({
    id: entry.id,
    display: entry.display || entry.id,
    status: entry.status || 'unknown',
    role: inferModelRole(entry.id, entry),
  }));
  const visibleModels = installedModels.length ? installedModels : catalogModels.filter((entry) => entry.status === 'live').slice(0, 8);
  const summary = visibleModels.length
    ? `${installedModels.length || catalogModels.length} model(s): ${visibleModels.slice(0, 8).map((model) => `${model.name || model.id} (${model.role})`).join('; ')}`
    : 'No model library entries reported';
  return {
    schemaVersion: 'hololand.holoshell.model-library.v0.1.0',
    status: visibleModels.length ? 'available' : 'not_reported',
    catalogSource,
    installedSource: installed.source,
    catalogCount: catalogModels.length,
    installedCount: installedModels.length,
    defaults: catalog?.lane_defaults || {},
    installedModels,
    catalogModels: catalogModels.slice(0, 20),
    summary,
  };
}

function holoscriptRootCandidates() {
  return [
    process.env.HOLOSCRIPT_REPO,
    process.env.HOLOSCRIPT_REPO_ROOT,
    join(__dirname, '..', '..', '..', 'HoloScript'),
    'C:/Users/josep/Documents/GitHub/HoloScript',
    'C:/Users/Josep/Documents/GitHub/HoloScript',
  ].filter(Boolean);
}

function extractHoloClawSkill(filePath, rootDir) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const fileName = filePath.split(/[\\/]/u).pop();
    const nameMatch = content.match(/composition\s+"([^"]+)"/u) || content.match(/composition\s+([A-Za-z0-9_-]+)/u);
    const description = (content.match(/\/\/\s*(.+)/u)?.[1] || '').trim();
    const actions = [...content.matchAll(/action\s+"?([A-Za-z0-9_-]+)"?/gu)].map((match) => match[1]);
    const traits = [...content.matchAll(/@([A-Za-z_][A-Za-z0-9_]*)/gu)]
      .map((match) => match[1])
      .filter((trait, index, all) => all.indexOf(trait) === index && trait !== 'absorb');
    const stat = statSync(filePath);
    return {
      name: nameMatch ? nameMatch[1] : fileName.replace(/\.hsplus$/u, ''),
      fileName,
      path: filePath.replace(rootDir, '').replace(/^[\\/]/u, '').replace(/\\/gu, '/'),
      description,
      actionCount: actions.length,
      actions: actions.slice(0, 6),
      traits: traits.slice(0, 8),
      modifiedAt: stat.mtime.toISOString(),
    };
  } catch {
    return null;
  }
}

function nativeResourceSnapshot() {
  const rootDir = holoscriptRootCandidates().find((candidate) => existsSync(candidate));
  const skillsDir = rootDir ? join(rootDir, 'compositions', 'skills') : '';
  const skillFiles = skillsDir && existsSync(skillsDir)
    ? readdirSync(skillsDir).filter((file) => file.endsWith('.hsplus')).map((file) => join(skillsDir, file))
    : [];
  const skills = skillFiles
    .map((filePath) => extractHoloClawSkill(filePath, rootDir))
    .filter(Boolean)
    .sort((a, b) => String(b.modifiedAt).localeCompare(String(a.modifiedAt)));
  return {
    schemaVersion: 'hololand.holoshell.native-resources.v0.1.0',
    status: skills.length ? 'available' : 'not_reported',
    holoscriptRoot: rootDir || null,
    holoClawSkillDir: skillsDir || null,
    holoClawSkillCount: skills.length,
    holoClawSkills: skills.slice(0, 12),
    summary: skills.length
      ? `${skills.length} HoloClaw skill(s): ${skills.slice(0, 8).map((skill) => skill.name).join(', ')}`
      : 'No HoloClaw skill shelf reported',
  };
}

function holoclawRuntimeBridgeStatusSnapshot() {
  const receipt = readJsonFileIfPresent(HOLOCLAW_RUNTIME_BRIDGE_RECEIPT);
  const hasReceipt = receipt?.schemaVersion === HOLOCLAW_RUNTIME_BRIDGE_SCHEMA;
  const summary = hasReceipt ? (receipt.summary || {}) : {};
  const runtime = hasReceipt ? (receipt.runtime || {}) : {};
  const policy = hasReceipt ? (receipt.policy || {}) : {};
  const workflowPlan = hasReceipt ? (receipt.workflowPlan || {}) : {};
  const skills = hasReceipt ? (receipt.skills || {}) : {};
  const output = hasReceipt ? (receipt.output || {}) : {};
  const status = hasReceipt
    ? String(summary.status || runtime.status || 'receipt_reported')
    : 'not_staged';
  const runtimeReady = Boolean(summary.runtimeReady ?? runtime.status === 'ready_to_stage');
  const selectedSkillCount = Number.isFinite(summary.selectedSkillCount)
    ? summary.selectedSkillCount
    : (Array.isArray(skills.selected) ? skills.selected.length : 0);
  const pendingApprovalCount = Number.isFinite(summary.pendingApprovalCount)
    ? summary.pendingApprovalCount
    : (Array.isArray(workflowPlan.steps)
        ? workflowPlan.steps.filter((step) => step?.approvalRequired === true).length
        : 0);
  const stageErrorCount = Number.isFinite(summary.stageErrorCount)
    ? summary.stageErrorCount
    : (Array.isArray(runtime.missing) ? runtime.missing.length : 0);
  const directExecutionAllowed = policy.directExecutionAllowed === true;
  return {
    schemaVersion: 'hololand.holoshell.holoclaw-runtime-bridge-status.v0.1.0',
    source: HOLOCLAW_RUNTIME_BRIDGE_SOURCE,
    generatedAt: new Date().toISOString(),
    status,
    receiptObserved: hasReceipt,
    receiptPath: hasReceipt ? (output.latestPath || HOLOCLAW_RUNTIME_BRIDGE_RECEIPT) : null,
    receiptAgeMs: hasReceipt ? fileAgeMs(HOLOCLAW_RUNTIME_BRIDGE_RECEIPT) : null,
    bridgeId: summary.bridgeId || receipt?.bridgeId || '',
    runtimeReady,
    runtimeStatus: String(runtime.status || (runtimeReady ? 'ready_to_stage' : 'not_staged')),
    runtimeMode: summary.runtimeMode || workflowPlan.runtimeMode || 'tick',
    agentHandle: summary.agentHandle || 'holoclaw',
    selectedSkillCount,
    selectedSkills: Array.isArray(skills.selected) ? skills.selected.slice(0, 6) : [],
    pendingApprovalCount,
    targetResolvedCount: Number.isFinite(summary.targetResolvedCount) ? summary.targetResolvedCount : 0,
    stageErrorCount,
    missing: Array.isArray(summary.missing)
      ? summary.missing
      : (Array.isArray(runtime.missing) ? runtime.missing : []),
    permissionEnvelope: policy.permissionEnvelope || 'guarded_execute',
    approvalRequired: policy.approvalRequired ?? runtimeReady,
    directExecutionAllowed,
    downstreamAdapterOwnsApproval: policy.downstreamAdapterOwnsApproval !== false,
    openClawRuntimeBackendAllowed: policy.openClawRuntimeBackendAllowed === true,
    nemoClawRuntimeBackendAllowed: policy.nemoClawRuntimeBackendAllowed === true,
    lowerLevelSubstrateAllowed: Array.isArray(policy.lowerLevelSubstrateAllowed)
      ? policy.lowerLevelSubstrateAllowed
      : ['ollama_compatible_serving', 'cuda_tensorrt_rtx_jetson_acceleration'],
    controlDaemonRoute: 'POST /workflow/holoclaw-runtime-bridge',
    controlDaemonLatestRoute: 'GET /workflow/holoclaw-runtime-bridge/latest',
    statusEndpoint: 'GET /api/holoclaw/runtime-bridge',
    endpointExecutesRuntime: false,
    destructiveActionsTaken: false,
    desktopAutomationExecuted: false,
    receiptRequired: true,
    summary: hasReceipt
      ? `${status}; ${selectedSkillCount} selected skill(s); ${pendingApprovalCount} pending approval(s); ${stageErrorCount} stage error(s)`
      : 'No HoloClaw runtime bridge receipt staged yet',
  };
}

function stageHoloClawRuntimeBridgeForChat(payload = {}) {
  const script = join(REPO_ROOT, 'scripts', 'holoshell-holoclaw-runtime-bridge.mjs');
  const bridgeJsOutput = join(HOLOSHELL_TMP_DIR, 'holoclaw-runtime-bridge-latest.js');
  const bridgeDir = join(HOLOSHELL_TMP_DIR, 'holoclaw-runtime-bridges');
  const workflowOutput = join(HOLOSHELL_TMP_DIR, 'workflow-latest.json');
  const workflowJsOutput = join(HOLOSHELL_TMP_DIR, 'workflow-latest.js');
  const gateOutput = join(HOLOSHELL_TMP_DIR, 'brain-intent-gate-latest.json');
  const gateJsOutput = join(HOLOSHELL_TMP_DIR, 'brain-intent-gate-latest.js');
  const args = [
    script,
    '--actor',
    String(payload.actor || 'brittney'),
    '--intent',
    String(payload.intent || payload.message || payload.text || payload.ask || payload.request || 'Stage HoloClaw runtime bridge from HoloShell.'),
    '--runtime-mode',
    String(payload.runtimeMode || 'tick'),
    '--agent-handle',
    String(payload.agentHandle || 'holoclaw'),
    '--bridge-output',
    HOLOCLAW_RUNTIME_BRIDGE_RECEIPT,
    '--bridge-js-output',
    bridgeJsOutput,
    '--bridge-dir',
    bridgeDir,
    '--workflow-output',
    workflowOutput,
    '--workflow-js-output',
    workflowJsOutput,
    '--gate-output',
    gateOutput,
    '--gate-js-output',
    gateJsOutput,
    '--json',
  ];
  const prompt = payload.prompt || payload.task || payload.chatPrompt;
  if (prompt) args.push('--prompt', String(prompt));
  if (payload.provider) args.push('--provider', String(payload.provider));
  if (payload.model) args.push('--model', String(payload.model));
  if (payload.selectedSkill || payload.skill) args.push('--selected-skill', String(payload.selectedSkill || payload.skill));
  const output = execFileSync(process.execPath, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 45_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  const bridge = parseJsonFromNodeOutput(output);
  const workflow = readHoloShellTmpJson('workflow-latest.json');
  const gate = readHoloShellTmpJson('brain-intent-gate-latest.json');
  const summary = bridge.summary || {};
  return {
    schemaVersion: 'hololand.holoshell.holoclaw-runtime-bridge-response.v0.1.0',
    status: summary.status || bridge.status || 'staged',
    bridgeId: summary.bridgeId || bridge.bridgeId || '',
    workflowId: workflow?.workflowId || '',
    runtimeReady: Boolean(summary.runtimeReady),
    pendingApprovalCount: summary.pendingApprovalCount || 0,
    stageErrorCount: summary.stageErrorCount || 0,
    permissionEnvelope: bridge.policy?.permissionEnvelope || 'guarded_execute',
    approvalRequired: bridge.policy?.approvalRequired !== false,
    directExecutionAllowed: false,
    endpointExecutesRuntime: false,
    destructiveActionsTaken: false,
    desktopAutomationExecuted: false,
    receiptRequired: true,
    holoclawRuntimeBridge: bridge,
    workflow,
    gate,
  };
}

function sovereignRoomMarathonStatusSnapshot() {
  const receipt = readJsonFileIfPresent(SOVEREIGN_ROOM_MARATHON_RECEIPT);
  const hasReceipt = receipt?.schemaVersion === SOVEREIGN_ROOM_MARATHON_SCHEMA;
  const summary = hasReceipt ? (receipt.summary || {}) : {};
  const status = hasReceipt ? String(summary.status || receipt.status || 'unknown') : 'not_checked';
  const selectedTask = hasReceipt ? (receipt.selectedTask || {}) : {};
  const selectedTaskId = String(summary.selectedTaskId || selectedTask.id || '');
  const selectedTaskTitle = String(summary.selectedTaskTitle || selectedTask.title || '');
  const selectedTaskTag = String(summary.selectedTaskTag || selectedTask.classification || 'unknown');
  const matchedCandidateCount = Number.isFinite(summary.matchedCandidateCount)
    ? summary.matchedCandidateCount
    : (Array.isArray(receipt?.candidates) ? receipt.candidates.length : 0);
  const queueOpenCount = Number.isFinite(summary.queueOpenCount) ? summary.queueOpenCount : 0;
  const queueClaimableOpenCount = Number.isFinite(summary.queueClaimableOpenCount) ? summary.queueClaimableOpenCount : 0;
  return {
    schemaVersion: 'hololand.holoshell.sovereign-room-marathon-status.v0.1.0',
    source: SOVEREIGN_ROOM_MARATHON_SOURCE,
    generatedAt: new Date().toISOString(),
    status,
    receiptObserved: hasReceipt,
    receiptPath: hasReceipt
      ? (receipt.output?.latestResolvedPath || receipt.output?.latestPath || SOVEREIGN_ROOM_MARATHON_RECEIPT)
      : null,
    receiptAgeMs: hasReceipt ? fileAgeMs(SOVEREIGN_ROOM_MARATHON_RECEIPT) : null,
    receiptId: hasReceipt ? (receipt.receiptId || '') : '',
    taskLane: String(summary.taskLane || 'local'),
    taskTag: String(summary.taskTag || 'local'),
    cloudEscalationAllowed: summary.cloudEscalationAllowed === true,
    queueStatus: String(summary.queueStatus || (hasReceipt ? 'unknown' : 'not_checked')),
    queueOpenCount,
    queueClaimableOpenCount,
    matchedCandidateCount,
    selectedTaskId,
    selectedTaskTitle,
    selectedTaskTag,
    selectedTask: hasReceipt ? (receipt.selectedTask || null) : null,
    candidates: hasReceipt && Array.isArray(receipt.candidates) ? receipt.candidates.slice(0, 8) : [],
    claimRequested: summary.claimRequested === true,
    claimAttempted: summary.claimAttempted === true,
    claimSucceeded: summary.claimSucceeded === true,
    sovereignConsumptionDefault: summary.sovereignConsumptionDefault !== false,
    completionClaimAllowed: summary.completionClaimAllowed === true,
    directExecutionAllowed: false,
    endpointExecutesRuntime: false,
    destructiveActionsTaken: false,
    desktopAutomationExecuted: false,
    receiptRequired: true,
    controlDaemonRoute: 'POST /workflow/sovereign-room-marathon',
    controlDaemonLatestRoute: 'GET /workflow/sovereign-room-marathon/latest',
    statusEndpoint: 'GET /api/sovereign-room/marathon',
    nextAction: String(summary.nextAction || (hasReceipt ? 'inspect_receipt_before_claim' : 'refresh_sovereign_room_receipt')),
    summary: hasReceipt
      ? `${status}; ${matchedCandidateCount} local candidate(s); selected ${selectedTaskTitle || selectedTaskId || 'none'}; claim attempted ${summary.claimAttempted === true ? 'yes' : 'no'}`
      : 'No sovereign room marathon receipt staged yet',
  };
}

function stageSovereignRoomMarathonForChat(payload = {}) {
  const script = join(REPO_ROOT, SOVEREIGN_ROOM_MARATHON_SCRIPT);
  const marathonJsOutput = join(HOLOSHELL_TMP_DIR, 'sovereign-room-marathon-latest.js');
  const marathonDir = join(HOLOSHELL_TMP_DIR, 'sovereign-room-marathons');
  const taskLane = String(payload.taskLane || payload.lane || 'local');
  const taskTag = String(payload.taskTag || payload.tag || taskLane || 'local');
  const maxCandidates = Number(payload.maxCandidates || 8);
  const args = [
    script,
    '--task-lane',
    taskLane,
    '--task-tag',
    taskTag,
    '--max-candidates',
    String(Number.isFinite(maxCandidates) && maxCandidates >= 1 ? maxCandidates : 8),
    '--output',
    SOVEREIGN_ROOM_MARATHON_RECEIPT,
    '--js-output',
    marathonJsOutput,
    '--receipt-dir',
    marathonDir,
    '--json',
  ];
  if (payload.cloudEscalationAllowed === true) args.push('--cloud-escalation-allowed');
  if (payload.queueFixture && process.env.HOLOSHELL_ALLOW_QUEUE_FIXTURE === '1') {
    args.push('--queue-fixture', String(payload.queueFixture));
  }
  const output = execFileSync(process.execPath, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 45_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  const receipt = parseJsonFromNodeOutput(output);
  const summary = receipt.summary || {};
  return {
    schemaVersion: 'hololand.holoshell.sovereign-room-marathon-response.v0.1.0',
    status: summary.status || receipt.status || 'staged',
    receiptId: receipt.receiptId || '',
    taskLane: summary.taskLane || 'local',
    taskTag: summary.taskTag || 'local',
    cloudEscalationAllowed: summary.cloudEscalationAllowed === true,
    matchedCandidateCount: summary.matchedCandidateCount || 0,
    selectedTaskId: summary.selectedTaskId || '',
    selectedTaskTitle: summary.selectedTaskTitle || '',
    claimRequested: summary.claimRequested === true,
    claimAttempted: summary.claimAttempted === true,
    claimSucceeded: summary.claimSucceeded === true,
    directExecutionAllowed: false,
    endpointExecutesRuntime: false,
    destructiveActionsTaken: false,
    desktopAutomationExecuted: false,
    receiptRequired: true,
    sovereignRoomMarathon: receipt,
    summary,
  };
}

function modelLabel(model) {
  return model?.name || model?.id || model?.display || '';
}

function modelSearchText(model) {
  return [
    model?.name,
    model?.id,
    model?.display,
    model?.role,
    model?.status,
  ].filter(Boolean).join(' ').toLowerCase();
}

function modelsMatching(models, needles) {
  return models.filter((model) => {
    const haystack = modelSearchText(model);
    return needles.some((needle) => haystack.includes(needle));
  });
}

function excludeModelsMatching(models, needles) {
  return models.filter((model) => {
    const haystack = modelSearchText(model);
    return !needles.some((needle) => haystack.includes(needle));
  });
}

function firstModelLabel(models, fallback) {
  return modelLabel(models[0]) || fallback;
}

function availableModelEntries(modelLibrary) {
  const installed = modelLibrary?.installedModels || [];
  return installed.length ? installed : (modelLibrary?.catalogModels || []);
}

function selectHoloClawSkills(nativeResources, objective) {
  const skills = nativeResources?.holoClawSkills || [];
  const text = String(objective || '').toLowerCase();
  const preferred = [];
  if (/\b(video|clip|reconstruct|3d|scan|map)\b/u.test(text)) preferred.push('video-to-3d');
  if (/\b(photo|image|picture|hologram|vision|screen)\b/u.test(text)) preferred.push('photo-to-hologram', 'gif-to-sprite');
  if (/\b(test|verify|validation|regression)\b/u.test(text)) preferred.push('test-runner');
  if (/\b(lint|type|code|build|bug|fix)\b/u.test(text)) preferred.push('lint-sweep', 'code-health');
  const byName = new Map(skills.map((skill) => [String(skill.name || skill.fileName || '').toLowerCase(), skill]));
  const selected = preferred
    .map((name) => byName.get(name))
    .filter(Boolean);
  const fill = skills.filter((skill) => !selected.includes(skill)).slice(0, Math.max(0, 4 - selected.length));
  return [...selected, ...fill].slice(0, 6);
}

function buildNativeRunRouting(snapshot, objective) {
  const models = availableModelEntries(snapshot.modelLibrary);
  const visionModels = excludeModelsMatching(
    modelsMatching(models, ['vision', 'multimodal', 'qwen3-vl', 'vision-language', 'screen']),
    ['sdf', 'geometry', 'text-to-3d', 'holo-sdf']
  );
  const desktopAutomationModels = modelsMatching(models, ['computer-use', 'agentic', 'fara']);
  const faraModels = desktopAutomationModels.length
    ? desktopAutomationModels
    : [{ name: 'fara:7b', role: 'computer-use/gui-grounding' }];
  const geometryModels = modelsMatching(models, ['sdf', 'geometry', 'text-to-3d', 'holo-sdf']);
  const embeddingModels = modelsMatching(models, ['embedding', 'semantic-search', 'holoembed', 'nomic']);
  const operatorModels = modelsMatching(models, ['tool-calls', 'operator', 'non-thinking', 'brittney-edge', 'qwen3:4b-instruct']);
  const skills = selectHoloClawSkills(snapshot.nativeResources, objective);
  return {
    operator: {
      lane: 'brittney_operator',
      model: firstModelLabel(operatorModels, snapshot.modelLibrary?.defaults?.operator || 'qwen3:4b-instruct'),
      role: 'operator chat, run routing, and tool-call supervision',
    },
    visionUnderstanding: {
      lane: 'vision_language',
      models: (visionModels.length ? visionModels : [{ name: snapshot.modelLibrary?.defaults?.vision || 'qwen3-vl:4b', role: 'vision-language' }])
        .slice(0, 4)
        .map((model) => ({
          model: modelLabel(model),
          role: model.role || 'screen/image understanding',
          status: model.status || 'available',
        })),
      role: 'screen/image understanding only; no desktop actuation',
    },
    faraPeerChat: {
      lane: 'fara_peer_chat',
      models: faraModels
        .slice(0, 4)
        .map((model) => ({
          model: modelLabel(model),
          role: 'read-only peer chat and co-planning',
          status: model.status || 'available',
        })),
      role: 'read-only peer chat and co-planning with Brittney; no desktop actuation',
      permissionEnvelope: 'read_only',
      approvalRequired: false,
    },
    desktopAutomation: {
      lane: 'fara_gui_grounding',
      models: faraModels
        .slice(0, 4)
        .map((model) => ({
          model: modelLabel(model),
          role: model.role || 'desktop automation planning',
          status: model.status || 'available',
        })),
      role: 'guarded desktop automation planning; approval required before mutation',
    },
    geometry: {
      lane: 'holo_sdf_geometry',
      model: firstModelLabel(geometryModels, 'holo-sdf:v0'),
      role: 'text/image-derived SDFNode geometry authoring',
    },
    embeddings: {
      lane: 'semantic_embeddings',
      model: firstModelLabel(embeddingModels, snapshot.modelLibrary?.defaults?.embeddings || 'nomic-embed-text'),
      role: 'semantic recall, search, and run memory',
    },
    holoClawSkills: {
      lane: 'holoclaw_skills',
      count: snapshot.nativeResources?.holoClawSkillCount || 0,
      selected: skills.map((skill) => ({
        name: skill.name,
        fileName: skill.fileName,
        actions: skill.actions || [],
      })),
      role: 'native repeatable task execution shelf',
    },
    receiptGate: {
      lane: 'receipt_gate',
      model: 'local filesystem receipts',
      role: 'approval, audit, measurement, and rollback boundary',
    },
  };
}

function parseImprovementRunCount(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return 10;
  return Math.max(1, Math.min(128, parsed));
}

function improvementRunHistory() {
  const executions = improvementExecutionReceipts();
  return improvementRunReceipts().slice(0, 20).map((receipt) => {
    const runExecutions = executions.filter((execution) => execution.sourceRunId === receipt.runId);
    const totalExecutedRunCount = runExecutions.reduce((sum, execution) => sum + (execution.executedRunCount || 0), 0);
    return {
      runId: receipt.runId,
      status: receipt.status,
      objective: receipt.objective,
      queuedRunCount: receipt.queuedRunCount,
      requestedRunCount: receipt.requestedRunCount,
      totalExecutedRunCount,
      remainingRunCount: Math.max(0, (receipt.queuedRunCount || 0) - totalExecutedRunCount),
      latestExecutionStatus: runExecutions[0]?.status || null,
      latestExecutionId: runExecutions[0]?.executionId || null,
      generatedAt: receipt.generatedAt,
      routingSummary: receipt.routingSummary,
      receiptPath: receipt.receiptPath,
    };
  });
}

function improvementRunReceipts() {
  return readReceipts('.improvement-run.json');
}

function improvementExecutionReceipts() {
  return readReceipts('.improvement-execution.json');
}

function faraPeerAutomationReceipts() {
  return readReceipts('.fara-peer-automation.json');
}

function faraPeerAutomationPromotionReceipts() {
  return readReceipts('.fara-peer-promotion.json');
}

function findFaraPeerAutomationReceipt(pulseId) {
  return faraPeerAutomationReceipts().find((receipt) => receipt.pulseId === pulseId);
}

function faraPeerAutomationHistory() {
  return faraPeerAutomationReceipts().slice(0, 20).map((receipt) => ({
    pulseId: receipt.pulseId,
    status: receipt.status,
    generatedAt: receipt.generatedAt,
    cadence: receipt.cadence,
    objective: receipt.objective,
    lane: receipt.lane,
    permissionEnvelope: receipt.permissionEnvelope,
    nextSafeActionCount: receipt.nextSafeActions?.length || 0,
    destructiveActionsTaken: receipt.destructiveActionsTaken,
    desktopAutomationExecuted: receipt.desktopAutomationExecuted,
    receiptPath: receipt.receiptPath,
  }));
}

function faraPeerAutomationPromotionHistory() {
  return faraPeerAutomationPromotionReceipts().slice(0, 20).map((receipt) => ({
    promotionId: receipt.promotionId,
    pulseId: receipt.pulseId,
    status: receipt.status,
    generatedAt: receipt.generatedAt,
    operation: receipt.operation,
    promotedRunId: receipt.promotedRunId,
    permissionEnvelope: receipt.permissionEnvelope,
    destructiveActionsTaken: receipt.destructiveActionsTaken,
    desktopAutomationExecuted: receipt.desktopAutomationExecuted,
    receiptPath: receipt.receiptPath,
  }));
}

function improvementExecutionHistory(runId = null) {
  return improvementExecutionReceipts()
    .filter((receipt) => !runId || receipt.sourceRunId === runId)
    .slice(0, 20)
    .map((receipt) => ({
      executionId: receipt.executionId,
      sourceRunId: receipt.sourceRunId,
      status: receipt.status,
      generatedAt: receipt.generatedAt,
      executedRunCount: receipt.executedRunCount,
      totalExecutedRunCount: receipt.totalExecutedRunCount,
      remainingRunCount: receipt.remainingRunCount,
      destructiveActionsTaken: receipt.destructiveActionsTaken,
      desktopAutomationExecuted: receipt.desktopAutomationExecuted,
      holotuneTrace: receipt.holotuneTrace || null,
      receiptPath: receipt.receiptPath,
    }));
}

function findImprovementRunReceipt(runId) {
  return improvementRunReceipts().find((receipt) => receipt.runId === runId);
}

function writeImprovementRunReceipt(receipt) {
  mkdirSync(RECEIPTS_DIR, { recursive: true });
  const fileName = `${receipt.runId}.improvement-run.json`;
  const receiptPath = join(RECEIPTS_DIR, fileName);
  const withPath = { ...receipt, receiptPath };
  writeFileSync(receiptPath, `${JSON.stringify(withPath, null, 2)}\n`, 'utf8');
  return withPath;
}

function writeImprovementExecutionReceipt(receipt) {
  mkdirSync(RECEIPTS_DIR, { recursive: true });
  const fileName = `${receipt.executionId}.improvement-execution.json`;
  const receiptPath = join(RECEIPTS_DIR, fileName);
  const withPath = { ...receipt, receiptPath };
  writeFileSync(receiptPath, `${JSON.stringify(withPath, null, 2)}\n`, 'utf8');
  return withPath;
}

function writeFaraPeerAutomationReceipt(receipt) {
  mkdirSync(RECEIPTS_DIR, { recursive: true });
  const fileName = `${receipt.pulseId}.fara-peer-automation.json`;
  const receiptPath = join(RECEIPTS_DIR, fileName);
  const withPath = { ...receipt, receiptPath };
  writeFileSync(receiptPath, `${JSON.stringify(withPath, null, 2)}\n`, 'utf8');
  return withPath;
}

function writeFaraPeerAutomationPromotionReceipt(receipt) {
  mkdirSync(RECEIPTS_DIR, { recursive: true });
  const fileName = `${receipt.promotionId}.fara-peer-promotion.json`;
  const receiptPath = join(RECEIPTS_DIR, fileName);
  const withPath = { ...receipt, receiptPath };
  writeFileSync(receiptPath, `${JSON.stringify(withPath, null, 2)}\n`, 'utf8');
  return withPath;
}

function sanitizeTraceId(id) {
  return String(id || 'unknown-agent').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 128) || 'unknown-agent';
}

function appendHolotuneTraceDirect(row) {
  if (!row?.user || !row?.target) throw new Error('trace row requires user and target');
  const agentId = sanitizeTraceId(row.agentId || HOLOTUNE_TRACE_AGENT_ID);
  const trace = {
    system: typeof row.system === 'string' ? row.system : '',
    user: row.user,
    target: row.target,
    grader: row.grader ?? null,
    grader_key: Array.isArray(row.grader_key) ? row.grader_key : [],
    family: row.family || 'live-trace',
    modality: row.modality || 'agentic',
    source: row.source || 'live-trace',
    agentId,
    ts: row.ts || new Date().toISOString(),
  };
  const dir = join(AI_ECOSYSTEM_DIR, 'traces', agentId);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'trace.jsonl');
  appendFileSync(file, `${JSON.stringify(trace)}\n`, 'utf8');
  return file;
}

function appendHolotuneTrace(row) {
  if (process.env.HOLOTUNE_TRACE_DISABLED === '1') {
    return { status: 'disabled', file: '' };
  }
  if (HOLOTUNE_TRACE_WRITER && existsSync(HOLOTUNE_TRACE_WRITER)) {
    const output = execFileSync(process.execPath, [
      HOLOTUNE_TRACE_WRITER,
      '--agent',
      row.agentId || HOLOTUNE_TRACE_AGENT_ID,
      '--row',
      JSON.stringify(row),
    ], {
      cwd: AI_ECOSYSTEM_DIR,
      encoding: 'utf8',
      timeout: 10_000,
      windowsHide: true,
      env: {
        ...process.env,
        AI_ECOSYSTEM_DIR,
      },
    });
    const match = String(output || '').match(/appended ->\s*(.+)$/m);
    return { status: 'trace-writer', file: match ? match[1].trim() : '' };
  }
  return { status: 'direct', file: appendHolotuneTraceDirect(row) };
}

function improvementResultTraceRow(receipt, result) {
  const validationPassed = result.validation?.status === 'passed';
  const agentId = HOLOTUNE_TRACE_AGENT_ID;
  const routingSummary = receipt.sourceRun?.routingSummary || receipt.routingSummary || '';
  const user = [
    `Execute a HoloShell codebase-fix shakedown run for objective: ${receipt.objective}`,
    `Run number: ${result.runNumber}`,
    result.codebaseFix?.summary ? `Fix: ${result.codebaseFix.summary}` : '',
    routingSummary ? `Routing: ${routingSummary}` : '',
  ].filter(Boolean).join('\n');
  const target = [
    `Status: ${result.status}`,
    `Validation: ${result.validation?.status || 'unknown'}`,
    `Changed files: ${(result.codebaseFix?.changedFiles || []).join(', ') || 'none recorded'}`,
    `GPU assignment: ${result.gpuAssignmentSummary}`,
    `Lesson: ${result.lesson}`,
    `Receipt: ${receipt.receiptPath || receipt.executionId}`,
  ].join('\n');
  return {
    system: 'You are Brittney operating HoloShell. Execute receipt-backed codebase-fix shakedowns, preserve safety boundaries, measure validation, and return the verified lesson.',
    user,
    target,
    grader: {
      kind: 'holoshell_codebase_fix_execution',
      passed: validationPassed && receipt.destructiveActionsTaken === false && receipt.desktopAutomationExecuted === false,
      executionId: receipt.executionId,
      sourceRunId: receipt.sourceRunId,
      runNumber: result.runNumber,
      changedFiles: result.codebaseFix?.changedFiles || [],
      validationCommands: result.codebaseFix?.validationCommands || [],
      validationSignals: Array.isArray(result.validation?.signals) ? result.validation.signals : [],
      destructiveActionsTaken: receipt.destructiveActionsTaken,
      desktopAutomationExecuted: receipt.desktopAutomationExecuted,
      receipt: receipt.receiptPath || null,
    },
    grader_key: ['holoshell-codebase-fix', receipt.executionId, String(result.runNumber)],
    family: 'codebase-fix-shakedown',
    modality: 'agentic',
    source: 'holoshell-codebase-fix-shakedown',
    agentId,
    ts: receipt.generatedAt,
  };
}

function holotuneTraceEmissionEnabled(receipt) {
  const policy = receipt.holotuneTracePolicy || receipt.sourceRun?.holotuneTracePolicy || {};
  return process.env.HOLOTUNE_TRACE_MODE === 'emit' && policy.mode === 'server_controlled_after_codebase_fix_review';
}

function buildDeferredHolotuneTraceReceipt(reason) {
  return {
    schemaVersion: 'hololand.holoshell.holotune-trace-emission.v0.1.0',
    status: 'deferred',
    reason,
    agentId: HOLOTUNE_TRACE_AGENT_ID,
    emittedRows: 0,
    traceFiles: [],
    traceWriter: 'deferred_until_codebase_fix_shakedown_validated',
    errors: [],
  };
}

function emitImprovementHolotuneTraces(receipt) {
  const runResults = Array.isArray(receipt.runResults) ? receipt.runResults : [];
  if (!holotuneTraceEmissionEnabled(receipt)) {
    return buildDeferredHolotuneTraceReceipt('actual_codebase_fixes_before_tuning');
  }
  if (!runResults.length) {
    return {
      schemaVersion: 'hololand.holoshell.holotune-trace-emission.v0.1.0',
      status: 'no_rows',
      agentId: HOLOTUNE_TRACE_AGENT_ID,
      emittedRows: 0,
      traceFiles: [],
      errors: [],
    };
  }
  const traceFiles = [];
  const errors = [];
  let emittedRows = 0;
  for (const result of runResults) {
    const row = improvementResultTraceRow(receipt, result);
    try {
      const appended = appendHolotuneTrace(row);
      if (appended.file) traceFiles.push(appended.file);
      if (appended.status !== 'disabled') emittedRows += 1;
    } catch (error) {
      errors.push(String(error.message || error).slice(0, 240));
    }
  }
  return {
    schemaVersion: 'hololand.holoshell.holotune-trace-emission.v0.1.0',
    status: errors.length ? (emittedRows ? 'partial' : 'failed') : 'emitted',
    agentId: HOLOTUNE_TRACE_AGENT_ID,
    emittedRows,
    traceFiles: [...new Set(traceFiles)].slice(0, 5),
    traceWriter: existsSync(HOLOTUNE_TRACE_WRITER) ? HOLOTUNE_TRACE_WRITER : 'direct_rec_shape_fallback',
    errors,
  };
}

function desktopBridgeReportReceipts() {
  return readReceipts('.desktop-bridge-report.json');
}

function latestDesktopBridgeReport() {
  return desktopBridgeReportReceipts()[0] || null;
}

const DESKTOP_BRIDGE_BASE_CAPABILITIES = [
  'bridge_status',
  'screen_capture_request',
  'desktop_action_preflight',
  'consent_gesture_capture',
  'consent_token_issue',
  'consent_token_verify',
  'approved_execution_staging',
  'admitted_open_url_executor',
  'execution_refusal',
  'receipt_write',
  'gpu_telemetry_report',
  'browser_proxied_jetson_report',
];

function mergeDesktopBridgeCapabilities(capabilities = []) {
  const incoming = Array.isArray(capabilities) ? capabilities.filter(Boolean) : [];
  return [...new Set([...DESKTOP_BRIDGE_BASE_CAPABILITIES, ...incoming])];
}

function normalizeDesktopBridgeModelPolicy(modelPolicy = {}) {
  const incoming = modelPolicy && typeof modelPolicy === 'object' ? modelPolicy : {};
  const admittedExecutorActions = Array.isArray(incoming.admittedExecutorActions)
    ? [...new Set(['open_url', ...incoming.admittedExecutorActions.filter(Boolean)])]
    : ['open_url'];
  return {
    lane: 'fara_gui_grounding',
    recommendedModel: 'fara:7b',
    ...incoming,
    mayExecute: false,
    mayStageApprovedExecution: true,
    admittedExecutorActions,
  };
}

function normalizeDesktopBridgeReport(payload = {}) {
  const incoming = payload.report || payload.bridge || payload;
  const serverReceivedAt = new Date().toISOString();
  const sourceStatus = String(incoming.status || '').trim() || 'reported';
  const reportId = incoming.reportId ||
    `desktop_bridge_report_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const reportedCapabilities = Array.isArray(incoming.capabilities) ? incoming.capabilities.filter(Boolean) : [];
  const capabilities = mergeDesktopBridgeCapabilities(reportedCapabilities);
  return {
    schemaVersion: 'hololand.holoshell.desktop-bridge-report.v0.1.0',
    source: 'browser_proxied_laptop_daemon',
    reportId,
    generatedAt: incoming.generatedAt || serverReceivedAt,
    serverReceivedAt,
    status: sourceStatus,
    url: incoming.url || 'http://127.0.0.1:8751',
    hostRole: incoming.hostRole || 'laptop_desktop_bridge',
    modelPolicy: normalizeDesktopBridgeModelPolicy(incoming.modelPolicy),
    reportedCapabilities,
    capabilities,
    mutationBoundary: incoming.mutationBoundary || 'os_mutation_refused_until_consent_token_and_action_executor',
    destructiveActionsTaken: false,
    desktopAutomationExecuted: false,
    approvalRequiredForDesktopAutomation: true,
  };
}

function writeDesktopBridgeReport(report) {
  mkdirSync(RECEIPTS_DIR, { recursive: true });
  const fileName = `${report.reportId}.desktop-bridge-report.json`;
  const receiptPath = join(RECEIPTS_DIR, fileName);
  const withPath = { ...report, receiptPath };
  writeFileSync(receiptPath, `${JSON.stringify(withPath, null, 2)}\n`, 'utf8');
  return withPath;
}

function unwrapSchemaPayload(payload = {}, schemaVersion, keys = []) {
  if (payload?.schemaVersion === schemaVersion) return payload;
  for (const key of keys) {
    if (payload?.[key]?.schemaVersion === schemaVersion) return payload[key];
  }
  return payload;
}

function shortBrowserString(value, max = 1200) {
  const text = String(value == null ? '' : value);
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

function safeBrowserSessionId(value) {
  const id = shortBrowserString(value || sharedHoloShellSessionId() || 'default', 96)
    .trim()
    .replace(/[^A-Za-z0-9_.:-]/gu, '_')
    .replace(/^_+|_+$/gu, '');
  return id || 'default';
}

function scopedBrowserSessionSnapshotPath(sessionId) {
  return join(BROWSER_SESSION_STATE_DIR, `${safeBrowserSessionId(sessionId)}.json`);
}

function normalizeBrowserChatId(chatId) {
  const id = String(chatId || 'brittney').toLowerCase();
  return BROWSER_CHAT_WORKSPACE_IDS.includes(id) ? id : 'brittney';
}

function normalizeBrowserTranscriptEntry(entry, fallbackChatId) {
  if (!entry || typeof entry !== 'object') return null;
  const type = shortBrowserString(entry.type || 'message', 48);
  const chatId = normalizeBrowserChatId(entry.chatId || fallbackChatId);
  const normalized = {
    type,
    chatId,
    savedAt: shortBrowserString(entry.savedAt || entry.timestamp || new Date().toISOString(), 48),
  };
  if (type === 'message') {
    normalized.who = shortBrowserString(entry.who || 'HoloShell', 80);
    normalized.text = shortBrowserString(entry.text || '', 4000);
    normalized.color = shortBrowserString(entry.color || '#c9d1d9', 40);
  } else if (type === 'turn_card') {
    normalized.title = shortBrowserString(entry.title || 'Receipt', 160);
    normalized.tone = shortBrowserString(entry.tone || 'neutral', 40);
    normalized.variant = shortBrowserString(entry.variant || '', 40);
    normalized.lines = safeArray(entry.lines).map((line) => shortBrowserString(line, 700)).slice(0, 18);
  } else if (type === 'card_grid') {
    normalized.cards = safeArray(entry.cards).map((card) => ({
      type: 'turn_card',
      title: shortBrowserString(card?.title || 'Proposal', 160),
      tone: shortBrowserString(card?.tone || 'neutral', 40),
      variant: shortBrowserString(card?.variant || '', 40),
      lines: safeArray(card?.lines).map((line) => shortBrowserString(line, 700)).slice(0, 12),
    })).slice(0, 8);
  } else {
    normalized.title = shortBrowserString(entry.title || type, 160);
    normalized.text = shortBrowserString(entry.text || entry.summary || '', 1600);
  }
  return normalized;
}

function normalizeBrowserEvidenceEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  return {
    kind: shortBrowserString(entry.kind || 'evidence', 80),
    chatId: normalizeBrowserChatId(entry.chatId || 'terminal'),
    savedAt: shortBrowserString(entry.savedAt || entry.timestamp || new Date().toISOString(), 48),
    title: shortBrowserString(entry.title || 'Evidence', 160),
    summary: shortBrowserString(entry.summary || '', 1200),
    status: shortBrowserString(entry.status || 'unknown', 80),
    tone: shortBrowserString(entry.tone || 'neutral', 40),
    receiptHash: shortBrowserString(entry.receiptHash || '', 160),
    sourceEndpoint: shortBrowserString(entry.sourceEndpoint || '', 160),
    evidenceLedgerStatus: shortBrowserString(entry.evidenceLedgerStatus || '', 80),
    key: shortBrowserString(entry.key || '', 240),
    receiptRequired: entry.receiptRequired !== false,
    lines: safeArray(entry.lines).map((line) => shortBrowserString(line, 700)).slice(0, 18),
  };
}

function normalizeBrowserRuntime(runtime = {}) {
  if (!runtime || typeof runtime !== 'object') return {};
  return Object.fromEntries(
    Object.entries(runtime).slice(0, 24).map(([key, value]) => {
      const safeKey = shortBrowserString(key, 80).replace(/[^A-Za-z0-9_.:-]/gu, '_');
      if (typeof value === 'string') return [safeKey, shortBrowserString(value, 1200)];
      if (typeof value === 'number' || typeof value === 'boolean' || value === null) return [safeKey, value];
      return [safeKey, shortBrowserString(JSON.stringify(value ?? ''), 1200)];
    })
  );
}

function boundedBrowserCapsule(capsule) {
  if (!capsule || typeof capsule !== 'object') return null;
  try {
    const raw = JSON.stringify(capsule);
    if (raw.length <= 80_000) return JSON.parse(raw);
    return {
      generatedAt: capsule.generatedAt || null,
      status: capsule.status || 'truncated',
      summary: capsule.summary || {},
      route: capsule.route || {},
      receipts: capsule.receipts || {},
      truncated: true,
    };
  } catch {
    return null;
  }
}

function emptyBrowserSessionState(sessionId = sharedHoloShellSessionId(), { scoped = false } = {}) {
  const safeSessionId = safeBrowserSessionId(sessionId);
  return {
    schemaVersion: BROWSER_SESSION_STATE_SCHEMA,
    source: 'browser_cockpit_snapshot',
    sessionId: safeSessionId,
    sessionScoped: scoped,
    storageKey: scoped ? `${BROWSER_SESSION_STATE_KEY}:${safeSessionId}` : BROWSER_SESSION_STATE_KEY,
    transcript: [],
    transcriptByChat: Object.fromEntries(BROWSER_CHAT_WORKSPACE_IDS.map((chatId) => [chatId, []])),
    drafts: {
      chatInputs: Object.fromEntries(BROWSER_CHAT_WORKSPACE_IDS.map((chatId) => [chatId, ''])),
      brittneyInput: '',
      improvementObjective: '',
      improvementCount: '',
    },
    evidenceLedger: [],
    activeChatId: 'brittney',
    expandedChatIds: ['sovereign', 'holoclaw'],
    runtime: {},
    latestCockpitCapsule: null,
    updatedAt: null,
    serverReceivedAt: null,
    safety: {
      destructiveActionsTaken: false,
      desktopAutomationExecuted: false,
      rawSecretsIncluded: false,
      hostMutationAllowed: false,
    },
    destructiveActionsTaken: false,
    desktopAutomationExecuted: false,
    receiptRequired: true,
  };
}

function normalizeBrowserSessionState(payload = {}, { requireSchema = false, sessionId = null, scoped = false } = {}) {
  const incoming = unwrapSchemaPayload(payload, BROWSER_SESSION_STATE_SCHEMA, ['state', 'browserSessionState']);
  if (requireSchema && incoming.schemaVersion !== BROWSER_SESSION_STATE_SCHEMA) {
    throw new Error(`expected ${BROWSER_SESSION_STATE_SCHEMA}`);
  }
  const safeSessionId = safeBrowserSessionId(sessionId || incoming.sessionId || sharedHoloShellSessionId());
  const base = emptyBrowserSessionState(safeSessionId, { scoped });
  const transcriptByChat = { ...base.transcriptByChat };
  for (const chatId of BROWSER_CHAT_WORKSPACE_IDS) {
    const rawEntries = safeArray(incoming.transcriptByChat?.[chatId] || (chatId === 'brittney' ? incoming.transcript : []));
    transcriptByChat[chatId] = rawEntries
      .map((entry) => normalizeBrowserTranscriptEntry(entry, chatId))
      .filter(Boolean)
      .slice(-BROWSER_SESSION_TRANSCRIPT_LIMIT);
  }
  const draftInputs = { ...base.drafts.chatInputs };
  const incomingDrafts = incoming.drafts && typeof incoming.drafts === 'object' ? incoming.drafts : {};
  for (const chatId of BROWSER_CHAT_WORKSPACE_IDS) {
    draftInputs[chatId] = shortBrowserString(incomingDrafts.chatInputs?.[chatId] || '', 2000);
  }
  const expandedChatIds = safeArray(incoming.expandedChatIds)
    .map(normalizeBrowserChatId)
    .filter((chatId, index, all) => all.indexOf(chatId) === index);
  return {
    ...base,
    source: shortBrowserString(incoming.source || base.source, 120),
    sessionId: safeSessionId,
    sessionScoped: scoped,
    storageKey: scoped ? `${BROWSER_SESSION_STATE_KEY}:${safeSessionId}` : BROWSER_SESSION_STATE_KEY,
    transcript: transcriptByChat.brittney.slice(-BROWSER_SESSION_TRANSCRIPT_LIMIT),
    transcriptByChat,
    drafts: {
      chatInputs: draftInputs,
      brittneyInput: shortBrowserString(incomingDrafts.brittneyInput || draftInputs.brittney || '', 2000),
      improvementObjective: shortBrowserString(incomingDrafts.improvementObjective || '', 3000),
      improvementCount: shortBrowserString(incomingDrafts.improvementCount || '', 20),
    },
    evidenceLedger: safeArray(incoming.evidenceLedger)
      .map(normalizeBrowserEvidenceEntry)
      .filter(Boolean)
      .slice(-BROWSER_SESSION_EVIDENCE_LIMIT),
    activeChatId: normalizeBrowserChatId(incoming.activeChatId || 'brittney'),
    expandedChatIds: expandedChatIds.length ? expandedChatIds : ['sovereign', 'holoclaw'],
    runtime: normalizeBrowserRuntime(incoming.runtime),
    latestCockpitCapsule: boundedBrowserCapsule(incoming.latestCockpitCapsule),
    updatedAt: shortBrowserString(incoming.updatedAt || new Date().toISOString(), 48),
    serverReceivedAt: new Date().toISOString(),
  };
}

function readBrowserSessionStateSnapshot({ sessionId = null, scoped = false } = {}) {
  const safeSessionId = safeBrowserSessionId(sessionId || sharedHoloShellSessionId());
  const snapshotPath = scoped ? scopedBrowserSessionSnapshotPath(safeSessionId) : BROWSER_SESSION_STATE_SNAPSHOT;
  const snapshot = readJsonFileIfPresent(snapshotPath);
  if (snapshot?.schemaVersion !== BROWSER_SESSION_STATE_SCHEMA) {
    return {
      ...emptyBrowserSessionState(safeSessionId, { scoped }),
      snapshotStatus: 'empty',
      output: null,
      snapshotPath,
    };
  }
  return {
    ...normalizeBrowserSessionState(snapshot, { sessionId: safeSessionId, scoped }),
    snapshotStatus: 'available',
    output: snapshotPath,
    snapshotPath,
  };
}

function writeBrowserSessionStateSnapshot(payload = {}, { sessionId = null, scoped = false } = {}) {
  const safeSessionId = safeBrowserSessionId(sessionId || payload?.sessionId || sharedHoloShellSessionId());
  const snapshotPath = scoped ? scopedBrowserSessionSnapshotPath(safeSessionId) : BROWSER_SESSION_STATE_SNAPSHOT;
  const state = normalizeBrowserSessionState(payload, { requireSchema: true, sessionId: safeSessionId, scoped });
  const output = writeJsonFile(snapshotPath, state);
  return {
    ...state,
    snapshotStatus: 'saved',
    output,
    snapshotPath,
  };
}

function holoclawWorkspacePermissionEnvelope(workspaceId) {
  if (workspaceId === 'holoclaw') return 'guarded_execute';
  if (workspaceId === 'terminal') return 'read_only_projection';
  if (workspaceId === 'sovereign') return 'read_only_receipt_refresh';
  if (workspaceId === 'improvement') return 'guarded_execute';
  return 'read_only_or_guarded_by_intent';
}

function buildHoloClawWorkspaceSession(workspaceId, browserSessionState, parentSessionId) {
  const id = normalizeBrowserChatId(workspaceId);
  const safeParentId = safeBrowserSessionId(parentSessionId);
  const namespace = `holoclaw:${safeParentId}:${id}`;
  const transcriptEntryCount = safeArray(browserSessionState.transcriptByChat?.[id]).length;
  const evidenceEntryCount = safeArray(browserSessionState.evidenceLedger)
    .filter((entry) => normalizeBrowserChatId(entry.chatId || 'terminal') === id)
    .length;
  const draft = browserSessionState.drafts?.chatInputs?.[id] || '';
  return {
    workspaceId: id,
    parentSessionId: safeParentId,
    sessionObjectId: `${namespace}:session`,
    runtimeTargetId: `${namespace}:runtime`,
    browserTargetId: `${namespace}:browser-target`,
    terminalStreamId: `${namespace}:terminal-stream`,
    approvalQueueId: `${namespace}:approval-queue`,
    replayBundleId: `${namespace}:replay-bundle`,
    route: BROWSER_CHAT_WORKSPACE_ROUTE_MAP[id],
    status: id === browserSessionState.activeChatId ? 'active' : 'bound',
    transcriptEntryCount,
    evidenceEntryCount,
    draftPresent: Boolean(draft),
    permissionEnvelope: holoclawWorkspacePermissionEnvelope(id),
    mayExecuteWithoutConsent: false,
    sourceOwnedBeforeAdapter: true,
    receiptRequired: true,
  };
}

function buildHoloClawSessionObject({ sessionId = null, scoped = false } = {}) {
  const safeSessionId = safeBrowserSessionId(sessionId || sharedHoloShellSessionId());
  const browserSessionState = readBrowserSessionStateSnapshot({ sessionId: safeSessionId, scoped });
  const workspaceSessions = BROWSER_CHAT_WORKSPACE_IDS.map((workspaceId) =>
    buildHoloClawWorkspaceSession(workspaceId, browserSessionState, safeSessionId)
  );
  const activeWorkspaceId = normalizeBrowserChatId(browserSessionState.activeChatId);
  const activeWorkspace = workspaceSessions.find((workspace) => workspace.workspaceId === activeWorkspaceId) || workspaceSessions[0];
  const holoclawWorkspace = workspaceSessions.find((workspace) => workspace.workspaceId === 'holoclaw') || null;
  return {
    schemaVersion: HOLOCLAW_SESSION_OBJECT_SCHEMA,
    source: HOLOCLAW_PRODUCTION_FRONTIER_SOURCE,
    generatedAt: new Date().toISOString(),
    sessionId: safeSessionId,
    sessionScoped: scoped,
    storageKey: scoped ? `${BROWSER_SESSION_STATE_KEY}:${safeSessionId}` : BROWSER_SESSION_STATE_KEY,
    status: 'session_bound',
    activeWorkspaceId,
    workspaceSessionCount: workspaceSessions.length,
    workspaceSessions,
    bindings: {
      activeWorkspace,
      holoclawWorkspace,
      runtimeTargetPerWorkspaceRequired: true,
      browserTargetPerWorkspaceRequired: true,
      terminalStreamPerWorkspaceRequired: true,
      approvalQueuePerWorkspaceRequired: true,
      replayBundlePerWorkspaceRequired: true,
    },
    browserSession: {
      schemaVersion: BROWSER_SESSION_STATE_SCHEMA,
      snapshotStatus: browserSessionState.snapshotStatus || 'empty',
      snapshotPath: browserSessionState.output,
      updatedAt: browserSessionState.updatedAt,
      activeChatId: activeWorkspaceId,
      expandedChatIds: browserSessionState.expandedChatIds,
      transcriptEntryCount: Object.values(browserSessionState.transcriptByChat || {})
        .reduce((sum, entries) => sum + safeArray(entries).length, 0),
      evidenceLedgerCount: safeArray(browserSessionState.evidenceLedger).length,
    },
    route: {
      endpoint: 'GET /api/holoclaw/session-object?sessionId=:sessionId',
      browserSessionStateEndpoint: 'GET/POST /api/browser-session/state?sessionId=:sessionId',
      holoclawRuntimeBridgeEndpoint: 'GET /api/holoclaw/runtime-bridge',
      holoclawRuntimeBridgeWorkflowEndpoint: 'POST /workflow/holoclaw-runtime-bridge',
      terminalSessionEndpoint: 'GET /api/operator-terminal/session',
      terminalEventsEndpoint: 'GET /api/operator-terminal/events',
    },
    safety: {
      directExecutionAllowed: false,
      endpointExecutesRuntime: false,
      browserMayExecuteTerminalCommand: false,
      desktopAutomationExecuted: false,
      destructiveActionsTaken: false,
      rawSecretsIncluded: false,
      approvalRequiredBeforeMutation: true,
    },
    nextSafeStep: 'Bind runtime, browser, terminal, approval, and replay ids before promoting any HoloClaw workspace to execution.',
    receiptRequired: true,
    destructiveActionsTaken: false,
    desktopAutomationExecuted: false,
  };
}

function normalizeLaptopReasoningResultReport(payload = {}) {
  const incoming = unwrapSchemaPayload(payload, LAPTOP_REASONING_RESULT_SCHEMA, ['receipt', 'laptopReasoningResult']);
  if (incoming.schemaVersion !== LAPTOP_REASONING_RESULT_SCHEMA) {
    throw new Error(`expected ${LAPTOP_REASONING_RESULT_SCHEMA}`);
  }
  const serverReceivedAt = new Date().toISOString();
  const resultId = String(incoming.resultId || incoming.summary?.resultId || '').trim();
  if (!resultId) throw new Error('laptop reasoning resultId is required');
  const status = String(incoming.status || incoming.summary?.status || '').trim() || 'reported';
  return {
    ...incoming,
    status,
    serverReceivedAt,
    reportSource: 'http_laptop_reasoning_report',
    destructiveActionsTaken: false,
    desktopAutomationExecuted: false,
  };
}

function writeLaptopReasoningResultReport(report) {
  const latestPath = writeHoloShellTmpJson('laptop-reasoning-result-latest.json', report);
  const resultDir = join(HOLOSHELL_TMP_DIR, 'laptop-reasoning-results');
  mkdirSync(resultDir, { recursive: true });
  const archivePath = join(resultDir, `${report.resultId}.json`);
  const withOutput = {
    ...report,
    output: {
      ...(report.output || {}),
      latestPath,
      archivePath,
    },
  };
  writeJsonFile(latestPath, withOutput);
  writeJsonFile(archivePath, withOutput);
  return withOutput;
}

function normalizeOperatorTerminalReport(payload = {}) {
  const incoming = unwrapSchemaPayload(payload, OPERATOR_TERMINAL_RECEIPT_SCHEMA, ['receipt', 'terminal']);
  if (incoming.schemaVersion !== OPERATOR_TERMINAL_RECEIPT_SCHEMA) {
    throw new Error(`expected ${OPERATOR_TERMINAL_RECEIPT_SCHEMA}`);
  }
  return {
    ...incoming,
    serverReceivedAt: new Date().toISOString(),
    reportSource: 'http_operator_terminal_report',
    safety: {
      ...(incoming.safety || {}),
      readOnlyByDefault: true,
      directMutationAllowed: false,
      rawSecretsIncluded: false,
      rawCommandsIncludedForHuman: false,
    },
  };
}

function writeOperatorTerminalReport(report) {
  return {
    ...report,
    output: writeJsonFile(OPERATOR_TERMINAL_RECEIPT, report),
  };
}

function normalizeWindowAwarenessReport(payload = {}) {
  const incoming = unwrapSchemaPayload(payload, LEGACY_WINDOW_INVENTORY_SCHEMA, ['receipt', 'windowInventory']);
  if (incoming.schemaVersion !== LEGACY_WINDOW_INVENTORY_SCHEMA) {
    throw new Error(`expected ${LEGACY_WINDOW_INVENTORY_SCHEMA}`);
  }
  return {
    ...incoming,
    serverReceivedAt: new Date().toISOString(),
    reportSource: 'http_window_awareness_report',
    safety: {
      ...(incoming.safety || {}),
      rawWindowTitlesIncluded: false,
      destructiveActionsTaken: false,
      desktopAutomationExecuted: false,
    },
  };
}

function writeWindowAwarenessReport(report) {
  return {
    ...report,
    output: writeHoloShellTmpJson('legacy-window-inventory.json', report),
  };
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 20);
}

function normalizeCommitEvidence(value) {
  const commit = String(value || '').trim().slice(0, 80);
  return /^[0-9a-f]{7,40}$/iu.test(commit) ? commit.toLowerCase() : '';
}

function normalizeCodebaseFixEvidence(value, index) {
  if (!value || typeof value !== 'object') return null;
  const changedFiles = normalizeStringList(value.changedFiles || value.files);
  const validationCommands = normalizeStringList(value.validationCommands || value.commands || value.tests);
  const validationStatus = String(value.validationStatus || value.validation?.status || '').trim().toLowerCase() || 'missing';
  return {
    fixId: String(value.fixId || value.issueId || `codebase_fix_${index + 1}`).slice(0, 120),
    issue: String(value.issue || value.issueTitle || value.title || 'Codebase fix').slice(0, 240),
    summary: String(value.summary || value.description || value.issue || 'Validated codebase fix').slice(0, 500),
    changedFiles,
    validationCommands,
    validationStatus,
    receiptPath: value.receiptPath ? String(value.receiptPath).slice(0, 500) : '',
    commit: normalizeCommitEvidence(value.commit || value.commitSha || value.sha),
    destructiveActionsTaken: value.destructiveActionsTaken === true,
    desktopAutomationExecuted: value.desktopAutomationExecuted === true,
  };
}

function codebaseFixEvidenceFromPayload(payload, limit) {
  const source = Array.isArray(payload.codebaseFixes)
    ? payload.codebaseFixes
    : (Array.isArray(payload.fixEvidence) ? payload.fixEvidence : []);
  return source
    .map((item, index) => normalizeCodebaseFixEvidence(item, index))
    .filter((fix) =>
      fix &&
      fix.changedFiles.length > 0 &&
      fix.validationCommands.length > 0 &&
      fix.validationStatus === 'passed' &&
      Boolean(fix.receiptPath || fix.commit) &&
      fix.destructiveActionsTaken === false &&
      fix.desktopAutomationExecuted === false
    )
    .slice(0, limit);
}

function normalizeFaraPeerAutomationInterval(value) {
  const parsed = Number.parseInt(String(value ?? 0), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.max(FARA_PEER_AUTOMATION_MIN_INTERVAL_MS, parsed);
}

function faraPeerAutomationScheduleSnapshot() {
  return { ...faraPeerAutomationScheduleState };
}

function clearFaraPeerAutomationSchedule() {
  if (faraPeerAutomationTimer) {
    clearInterval(faraPeerAutomationTimer);
    faraPeerAutomationTimer = null;
  }
}

function configureFaraPeerAutomationSchedule(payload = {}) {
  clearFaraPeerAutomationSchedule();
  const intervalMs = normalizeFaraPeerAutomationInterval(payload.intervalMs ?? payload.interval ?? payload.everyMs);
  const objective = String(payload.objective || FARA_PEER_AUTOMATION_DEFAULT_OBJECTIVE).trim().slice(0, 500);
  const cadence = String(payload.cadence || 'scheduled').trim().slice(0, 80) || 'scheduled';
  const configuredAt = new Date().toISOString();
  let immediatePulse = null;
  faraPeerAutomationScheduleState = {
    schemaVersion: 'hololand.holoshell.fara-peer-automation-schedule.v0.1.0',
    source: FARA_PEER_AUTOMATION_SOURCE,
    status: intervalMs > 0 ? 'enabled' : 'disabled',
    intervalMs,
    objective,
    cadence,
    configuredAt,
    nextPulseAt: intervalMs > 0 ? new Date(Date.now() + intervalMs).toISOString() : null,
    lastPulseAt: faraPeerAutomationScheduleState.lastPulseAt || null,
    lastPulseId: faraPeerAutomationScheduleState.lastPulseId || null,
    hiddenAutomationAllowed: false,
    destructiveActionsTaken: false,
    desktopAutomationExecuted: false,
    receiptRequired: true,
  };

  const recordScheduledPulse = (trigger = 'interval') => {
    const pulse = buildFaraPeerAutomationPulse({
      objective,
      cadence,
      trigger: `schedule:${trigger}`,
      scheduleIntervalMs: intervalMs,
    });
    faraPeerAutomationScheduleState = {
      ...faraPeerAutomationScheduleState,
      lastPulseAt: pulse.generatedAt,
      lastPulseId: pulse.pulseId,
      nextPulseAt: intervalMs > 0 ? new Date(Date.now() + intervalMs).toISOString() : null,
      destructiveActionsTaken: false,
      desktopAutomationExecuted: false,
    };
    return pulse;
  };

  if (intervalMs > 0) {
    faraPeerAutomationTimer = setInterval(() => {
      try {
        recordScheduledPulse('interval');
      } catch (err) {
        faraPeerAutomationScheduleState = {
          ...faraPeerAutomationScheduleState,
          status: 'error',
          lastError: String(err.message || err).slice(0, 300),
          nextPulseAt: null,
          destructiveActionsTaken: false,
          desktopAutomationExecuted: false,
        };
        clearFaraPeerAutomationSchedule();
      }
    }, intervalMs);
    faraPeerAutomationTimer.unref?.();
    if (payload.runImmediately === true) {
      immediatePulse = recordScheduledPulse('immediate');
    }
  }

  return {
    schedule: faraPeerAutomationScheduleSnapshot(),
    immediatePulse,
  };
}

function buildFaraPeerAutomationPulse(payload = {}) {
  const snapshot = buildLiveStatusSnapshot();
  const routing = buildNativeRunRouting(snapshot, payload.objective || payload.message || '');
  const generatedAt = new Date().toISOString();
  const pulseId = `fara_peer_pulse_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const objective = String(
    payload.objective
    || payload.message
    || FARA_PEER_AUTOMATION_DEFAULT_OBJECTIVE
  ).trim().slice(0, 500);
  const cadence = String(payload.cadence || payload.trigger || 'manual').trim().slice(0, 80) || 'manual';
  const latestRun = improvementRunHistory()[0] || null;
  const desktopBridge = desktopBridgeStatusSnapshot();
  const holoclawRuntimeBridge = snapshot.holoclawRuntimeBridge || holoclawRuntimeBridgeStatusSnapshot();
  const nextSafeActions = [
    {
      operation: 'summarize_live_system_status',
      lane: 'brittney_operator',
      route: 'GET /api/live-status',
      reason: 'refresh the shared operating picture before choosing work',
      permissionEnvelope: 'read_only',
      automationMayExecute: false,
      receiptRequired: true,
    },
    {
      operation: 'inspect_holoclaw_runtime_bridge_status',
      lane: 'holoclaw_runtime',
      route: 'GET /api/holoclaw/runtime-bridge',
      reason: `keep HoloClaw visible as the native runtime gate; current status ${holoclawRuntimeBridge.status}`,
      permissionEnvelope: 'read_only',
      automationMayExecute: false,
      receiptRequired: true,
    },
    {
      operation: 'review_improvement_run_receipts',
      lane: 'receipt_gate',
      route: 'GET /api/improvement-runs',
      reason: latestRun
        ? `latest run ${latestRun.runId} has ${latestRun.remainingRunCount} remaining counted slot(s)`
        : 'no recent improvement-run receipt is visible',
      permissionEnvelope: 'read_only',
      automationMayExecute: false,
      receiptRequired: true,
    },
    {
      operation: 'queue_codebase_fix_shakedown_batch',
      lane: 'improvement_run_queue',
      route: 'POST /api/improvement-runs',
      reason: 'keep codebase-fix work moving only by creating a receipt-backed queue proposal',
      permissionEnvelope: 'read_only_receipt_write',
      automationMayExecute: false,
      receiptRequired: true,
    },
    {
      operation: 'check_desktop_bridge_readiness',
      lane: 'fara_gui_grounding',
      route: 'GET /api/desktop-control/bridge',
      reason: 'desktop mutation remains guarded; bridge status is only a readiness signal',
      permissionEnvelope: 'read_only',
      automationMayExecute: false,
      receiptRequired: true,
    },
  ];
  return writeFaraPeerAutomationReceipt({
    schemaVersion: 'hololand.holoshell.fara-peer-automation.v0.1.0',
    source: FARA_PEER_AUTOMATION_SOURCE,
    pulseId,
    generatedAt,
    status: 'pulse_recorded',
    objective,
    cadence,
    participants: ['brittney', 'fara'],
    lane: 'fara_peer_chat',
    modelRoute: routing.faraPeerChat,
    permissionEnvelope: 'read_only',
    approvalRequired: false,
    automationMode: 'receipt_and_proposals_only',
    hiddenAutomationAllowed: false,
    mayEmitNextSafeActions: true,
    mayQueueReceiptsDirectly: false,
    desktopMutationAllowed: false,
    destructiveActionsTaken: false,
    desktopAutomationExecuted: false,
    receiptRequired: true,
    route: {
      pulseEndpoint: 'POST /api/fara-peer-chat/automation-pulse',
      historyEndpoint: 'GET /api/fara-peer-chat/automation-pulses',
      scheduleEndpoint: 'POST /api/fara-peer-chat/automation-schedule',
      scheduleStatusEndpoint: 'GET /api/fara-peer-chat/automation-schedule',
      promotionEndpoint: 'POST /api/fara-peer-chat/promote-proposal',
      promotionHistoryEndpoint: 'GET /api/fara-peer-chat/promotions',
      liveStatusEndpoint: 'GET /api/live-status',
      holoclawRuntimeBridgeStatusEndpoint: 'GET /api/holoclaw/runtime-bridge',
      holoclawRuntimeBridgeWorkflowEndpoint: 'POST /workflow/holoclaw-runtime-bridge',
      improvementRunEndpoint: 'POST /api/improvement-runs',
      desktopBridgeEndpoint: 'GET /api/desktop-control/bridge',
    },
    summary: {
      status: 'pulse_recorded',
      capabilityCount: snapshot.capabilities.length,
      laneCount: snapshot.lanes.length,
      latestImprovementRunId: latestRun?.runId || null,
      latestImprovementRunRemaining: latestRun?.remainingRunCount ?? null,
      desktopBridgeStatus: desktopBridge.status || 'unknown',
      holoclawRuntimeBridgeStatus: holoclawRuntimeBridge.status,
      holoclawRuntimeBridgePendingApprovalCount: holoclawRuntimeBridge.pendingApprovalCount,
      nextSafeActionCount: nextSafeActions.length,
    },
    nextSafeActions,
  });
}

function promoteFaraPeerAutomationProposal(payload = {}) {
  const pulseId = String(payload.pulseId || '').trim();
  const operation = String(payload.operation || '').trim();
  if (!pulseId) {
    const err = new Error('missing_pulseId');
    err.statusCode = 400;
    throw err;
  }
  if (!operation) {
    const err = new Error('missing_operation');
    err.statusCode = 400;
    throw err;
  }
  const pulse = findFaraPeerAutomationReceipt(pulseId);
  if (!pulse) {
    const err = new Error('fara_peer_pulse_not_found');
    err.statusCode = 404;
    throw err;
  }
  const proposedAction = Array.isArray(pulse.nextSafeActions)
    ? pulse.nextSafeActions.find((action) => action.operation === operation)
    : null;
  if (!proposedAction) {
    const err = new Error('proposal_not_found_on_pulse');
    err.statusCode = 404;
    throw err;
  }
  const allowedPromotion = operation === 'queue_codebase_fix_shakedown_batch';
  if (!allowedPromotion) {
    const err = new Error('proposal_is_read_only_and_not_promotable');
    err.statusCode = 403;
    err.proposal = proposedAction;
    throw err;
  }

  const queuedRun = buildImprovementRunReceipt({
    objective: payload.objective ||
      `Fara/Brittney promoted shakedown: ${pulse.objective || FARA_PEER_AUTOMATION_DEFAULT_OBJECTIVE}`,
    runCount: payload.runCount || payload.count || 10,
    sourcePulseId: pulseId,
  });
  const promotionId = `fara_peer_promotion_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return writeFaraPeerAutomationPromotionReceipt({
    schemaVersion: 'hololand.holoshell.fara-peer-proposal-promotion.v0.1.0',
    source: FARA_PEER_AUTOMATION_SOURCE,
    promotionId,
    pulseId,
    generatedAt: new Date().toISOString(),
    status: 'promoted_to_improvement_run_queue',
    operation,
    lane: 'improvement_run_queue',
    permissionEnvelope: 'receipt_backed_queue',
    promotedRunId: queuedRun.runId,
    promotedRunReceiptPath: queuedRun.receiptPath,
    sourcePulseReceiptPath: pulse.receiptPath,
    approvalRequiredForDesktopAutomation: true,
    hiddenAutomationAllowed: false,
    destructiveActionsTaken: false,
    desktopAutomationExecuted: false,
    receiptRequired: true,
    promotedAction: proposedAction,
    queuedRun: {
      runId: queuedRun.runId,
      status: queuedRun.status,
      objective: queuedRun.objective,
      requestedRunCount: queuedRun.requestedRunCount,
      queuedRunCount: queuedRun.queuedRunCount,
      receiptPath: queuedRun.receiptPath,
      destructiveActionsTaken: queuedRun.destructiveActionsTaken,
      approvalRequiredForDesktopAutomation: queuedRun.approvalRequiredForDesktopAutomation,
    },
    nextSafeStep: 'Review the queued improvement run, then attach actual patch and validation evidence before counted execution.',
  });
}

function buildImprovementRunReceipt(payload = {}) {
  const objective = String(payload.objective || payload.message || payload.intent || '').trim();
  const runCount = parseImprovementRunCount(payload.runCount || payload.count || payload.requestedRunCount);
  const snapshot = buildLiveStatusSnapshot();
  const routing = buildNativeRunRouting(snapshot, objective);
  const generatedAt = new Date().toISOString();
  const runId = `hir_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const loop = [
    'capture_live_state',
    'select_codebase_fix_candidate',
    'plan_patch',
    'apply_codebase_fix',
    'run_targeted_validation',
    'record_fix_receipt',
    'defer_holotune_until_fix_corpus_review',
    'feed_lesson_to_brittney',
  ];
  const receipt = {
    schemaVersion: 'hololand.holoshell.improvement-run.v0.1.0',
    source: 'apps/holoshell/source/holoshell-improvement-run-loop.hsplus',
    runId,
    generatedAt,
    status: 'queued',
    objective: objective || 'Land actual codebase fixes through a receipt-backed HoloShell shakedown',
    executionMode: 'codebase_fix_shakedown',
    requestedRunCount: runCount,
    queuedRunCount: runCount,
    destructiveActionsTaken: false,
    receiptRequired: true,
    approvalRequiredForDesktopAutomation: true,
    codebaseFixPolicy: {
      requiredBeforeCountedExecution: true,
      requiredEvidence: ['issue', 'changedFiles', 'validationCommands', 'validationStatus'],
      requiredValidationStatus: 'passed',
      commitEvidenceFormat: 'git_sha_7_to_40_hex',
      filterInvalidEvidenceBeforeBatchLimit: true,
      disallowedEvidence: ['validationStatus:not-passed', 'commit:invalid-format', 'destructiveActionsTaken:true', 'desktopAutomationExecuted:true'],
      tuningIsNotTheShakedown: true,
    },
    holotuneTracePolicy: {
      mode: 'defer_until_codebase_fix_shakedown_validated',
      reason: 'Actual codebase fixes must pass before any tuning corpus emission; client payloads cannot enable tuning.',
      serverControlledMode: 'server_controlled_after_codebase_fix_review',
    },
    routing,
    routingSummary: [
      `vision=${routing.visionUnderstanding.models.map((model) => model.model).join(', ')}`,
      `fara_chat=${routing.faraPeerChat.models.map((model) => model.model).join(', ')}`,
      `desktop=${routing.desktopAutomation.models.map((model) => model.model).join(', ')}`,
      `operator=${routing.operator.model}`,
      `skills=${routing.holoClawSkills.selected.map((skill) => skill.name).join(', ') || 'none'}`,
    ].join('; '),
    loop,
    measurementPlan: {
      everyRun: true,
      requiredSignals: ['codebase_issue', 'changed_files', 'validation_command', 'validation_result', 'diff_or_receipt_path', 'lesson_for_brittney'],
      firstBatchRecommendation: runCount > 10 ? 'Land and validate a 10-fix shakedown before opening the full batch.' : 'Batch size is within shakedown range.',
    },
    nextSafeStep: 'Review the queued receipt, then submit actual codebase-fix evidence before any shakedown run is counted.',
    systemStatus: {
      status: snapshot.status,
      capabilityCount: snapshot.capabilities.length,
      laneCount: snapshot.lanes.length,
      gpu: snapshot.gpu,
      modelLibrary: {
        installedCount: snapshot.modelLibrary.installedCount,
        catalogCount: snapshot.modelLibrary.catalogCount,
      },
      nativeResources: {
        holoClawSkillCount: snapshot.nativeResources.holoClawSkillCount,
      },
    },
  };
  return writeImprovementRunReceipt(receipt);
}

function parseImprovementExecutionCount(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return 10;
  return Math.max(1, Math.min(128, parsed));
}

function desktopBridgeStatusSnapshot() {
  const url = process.env.HOLOSHELL_LAPTOP_DESKTOP_BRIDGE_URL || 'http://127.0.0.1:8751';
  const configured = process.env.HOLOSHELL_LAPTOP_DESKTOP_BRIDGE_ENABLED === '1' ||
    Boolean(process.env.HOLOSHELL_LAPTOP_DESKTOP_BRIDGE_URL);
  const report = latestDesktopBridgeReport();
  const reportTimestamp = report?.serverReceivedAt || report?.generatedAt || '';
  const reportAgeMs = reportTimestamp ? Date.now() - Date.parse(reportTimestamp) : null;
  const reportFresh = Number.isFinite(reportAgeMs) && reportAgeMs >= 0 && reportAgeMs <= 120_000;
  const base = {
    schemaVersion: 'hololand.holoshell.desktop-bridge.v0.1.0',
    generatedAt: new Date().toISOString(),
    status: configured ? 'configured' : 'awaiting_laptop_daemon',
    url,
    hostRole: HOST === '0.0.0.0' ? 'jetson_surface' : 'local_surface',
    expectedDaemon: 'holoshell-laptop-desktop-bridge',
    reportEndpoint: 'POST /api/desktop-control/bridge/report',
    capabilities: [...DESKTOP_BRIDGE_BASE_CAPABILITIES],
    mutationBoundary: 'os_mutation_refused_until_consent_token_and_action_executor',
    destructiveActionsTaken: false,
    approvalRequiredForDesktopAutomation: true,
  };
  if (!report) return base;
  const mergedCapabilities = mergeDesktopBridgeCapabilities(report.capabilities);
  if (!reportFresh) {
    return {
      ...base,
      status: 'stale_laptop_report',
      latestReportId: report.reportId,
      latestReportStatus: report.status,
      latestReportReceivedAt: report.serverReceivedAt || report.generatedAt,
      reportAgeMs,
      capabilities: mergedCapabilities,
    };
  }
  return {
    ...base,
    status: report.status === 'ready' ? 'ready' : report.status,
    source: 'browser_proxied_laptop_daemon',
    url: report.url || base.url,
    hostRole: report.hostRole || 'laptop_desktop_bridge',
    latestReportId: report.reportId,
    latestReportReceivedAt: report.serverReceivedAt || report.generatedAt,
    reportAgeMs,
    modelPolicy: normalizeDesktopBridgeModelPolicy(report.modelPolicy),
    capabilities: mergedCapabilities,
    mutationBoundary: report.mutationBoundary || base.mutationBoundary,
    desktopAutomationExecuted: false,
  };
}

function buildGpuBalancePlan(snapshot, routing) {
  const desktopBridge = desktopBridgeStatusSnapshot();
  const localHost = process.platform === 'win32'
    ? 'laptop_windows'
    : (HOST === '0.0.0.0' ? 'jetson_orin' : 'local_node');
  const faraPeerChat = routing.faraPeerChat || {
    lane: 'fara_peer_chat',
    models: routing.desktopAutomation?.models?.length
      ? routing.desktopAutomation.models
      : [{ model: 'fara:7b', role: 'read-only peer chat and co-planning', status: 'available' }],
  };
  return {
    schemaVersion: 'hololand.holoshell.gpu-balance-plan.v0.1.0',
    generatedAt: new Date().toISOString(),
    localHost,
    localGpu: snapshot.gpu,
    desktopBridge,
    assignments: [
      {
        lane: routing.operator.lane,
        model: routing.operator.model,
        preferredProcessor: 'jetson_orin',
        fallbackProcessor: 'laptop_rtx3060',
        reason: 'operator turns should stay near the always-on Brittney surface',
      },
      {
        lane: faraPeerChat.lane,
        model: faraPeerChat.models.map((model) => model.model).join(', '),
        preferredProcessor: 'laptop_rtx3060',
        fallbackProcessor: 'jetson_orin',
        reason: 'Fara can chat and co-plan with Brittney as a read-only peer; desktop mutation stays on the bridge',
      },
      {
        lane: routing.visionUnderstanding.lane,
        model: routing.visionUnderstanding.models.map((model) => model.model).join(', '),
        preferredProcessor: 'jetson_orin',
        fallbackProcessor: 'laptop_rtx3060',
        reason: 'vision-language work uses owned GPUs and never performs desktop actuation',
      },
      {
        lane: routing.desktopAutomation.lane,
        model: routing.desktopAutomation.models.map((model) => model.model).join(', '),
        preferredProcessor: 'laptop_desktop_bridge',
        fallbackProcessor: 'plan_only',
        reason: 'Windows desktop control must stay on the laptop bridge and remain approval-gated',
      },
      {
        lane: routing.geometry.lane,
        model: routing.geometry.model,
        preferredProcessor: 'jetson_orin',
        fallbackProcessor: 'laptop_rtx3060',
        reason: 'geometry generation can batch on any owned GPU after validation',
      },
      {
        lane: routing.embeddings.lane,
        model: routing.embeddings.model,
        preferredProcessor: 'cpu_ok_background',
        fallbackProcessor: 'owned_gpu_when_available',
        reason: 'semantic recall can run in the background without blocking vision or desktop lanes',
      },
    ],
    policy: {
      avoidCpuOnlyWhenGpuReported: snapshot.gpu.status === 'reported' || snapshot.gpu.status === 'available',
      keepFaraDesktopOnly: false,
      keepFaraPeerChatFree: true,
      keepFaraDesktopMutationGuarded: true,
      requireMeasurementEveryRun: true,
    },
  };
}

function buildImprovementRunStep(step, routing) {
  const laneByStep = {
    capture_live_state: routing.operator.lane,
    select_codebase_fix_candidate: 'codebase_fix',
    plan_patch: 'codebase_fix',
    apply_codebase_fix: 'codebase_fix',
    run_targeted_validation: 'receipt_gate',
    record_fix_receipt: 'receipt_gate',
    defer_holotune_until_fix_corpus_review: 'holotune_trace',
    feed_lesson_to_brittney: routing.operator.lane,
  };
  const stepStatus = step === 'defer_holotune_until_fix_corpus_review'
    ? 'deferred_until_codebase_fix_corpus_review'
    : 'completed';
  return {
    step,
    lane: laneByStep[step] || 'receipt_gate',
    status: stepStatus,
    destructiveActionsTaken: false,
  };
}

function buildImprovementRunResult({ runNumber, sourceRun, snapshot, gpuBalancePlan, codebaseFix }) {
  const routing = sourceRun.routing;
  const runLoop = Array.isArray(sourceRun.loop) && sourceRun.loop.length
    ? sourceRun.loop
    : [
        'capture_live_state',
        'select_codebase_fix_candidate',
        'apply_codebase_fix',
        'run_targeted_validation',
        'record_fix_receipt',
        'feed_lesson_to_brittney',
      ];
  const validationStatus = codebaseFix?.validationStatus === 'passed' ? 'passed' : 'failed';
  const validationSignals = [
    'codebase_issue_recorded',
    codebaseFix?.changedFiles?.length ? 'changed_files_recorded' : 'changed_files_missing',
    codebaseFix?.validationCommands?.length ? 'validation_command_recorded' : 'validation_command_missing',
    `validation_${validationStatus}`,
    codebaseFix?.receiptPath || codebaseFix?.commit ? 'diff_or_receipt_recorded' : 'diff_or_receipt_missing',
  ];
  return {
    runNumber,
    status: validationStatus === 'passed' ? 'validated_codebase_fix' : 'failed_codebase_fix',
    objective: sourceRun.objective,
    executionMode: 'codebase_fix_shakedown',
    codebaseFix,
    steps: runLoop.map((step) => buildImprovementRunStep(step, routing)),
    gpuSnapshot: {
      status: snapshot.gpu.status,
      summary: snapshot.gpu.summary,
    },
    gpuAssignmentSummary: gpuBalancePlan.assignments
      .map((assignment) => `${assignment.lane}->${assignment.preferredProcessor}`)
      .join('; '),
    validation: {
      status: validationStatus,
      signals: validationSignals,
    },
    lesson: `Run ${runNumber}: codebase fix "${codebaseFix?.summary || 'unknown'}" ${validationStatus}; keep Fara peer chat read-only/free while desktop mutation stays guarded on ${routing.desktopAutomation.lane}.`,
    destructiveActionsTaken: codebaseFix?.destructiveActionsTaken === true,
    desktopAutomationExecuted: false,
  };
}

function buildImprovementExecutionReceipt(runId, payload = {}) {
  const sourceRun = findImprovementRunReceipt(runId);
  if (!sourceRun) {
    const err = new Error('improvement_run_not_found');
    err.statusCode = 404;
    throw err;
  }
  const priorExecutions = improvementExecutionReceipts().filter((receipt) => receipt.sourceRunId === runId);
  const priorExecutedRunCount = priorExecutions.reduce((sum, receipt) => sum + (receipt.executedRunCount || 0), 0);
  const queuedRunCount = sourceRun.queuedRunCount || 0;
  const remainingBefore = Math.max(0, queuedRunCount - priorExecutedRunCount);
  const requestedExecutionCount = parseImprovementExecutionCount(
    payload.executeCount || payload.shakedownCount || payload.runCount
  );
  const allowFullBatch = payload.allowFullBatch === true;
  const shakedownLimit = allowFullBatch ? 128 : 10;
  const plannedFixCount = Math.min(remainingBefore, requestedExecutionCount, shakedownLimit);
  const codebaseFixes = codebaseFixEvidenceFromPayload(payload, plannedFixCount);
  const executedRunCount = Math.min(remainingBefore, codebaseFixes.length, shakedownLimit);
  const snapshot = buildLiveStatusSnapshot();
  const gpuBalancePlan = buildGpuBalancePlan(snapshot, sourceRun.routing);
  const generatedAt = new Date().toISOString();
  const executionId = `hie_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const runResults = codebaseFixes.slice(0, executedRunCount).map((codebaseFix, index) =>
    buildImprovementRunResult({
      runNumber: priorExecutedRunCount + index + 1,
      sourceRun,
      snapshot,
      gpuBalancePlan,
      codebaseFix,
    })
  );
  const totalExecutedRunCount = priorExecutedRunCount + executedRunCount;
  const remainingRunCount = Math.max(0, queuedRunCount - totalExecutedRunCount);
  const failedRunCount = runResults.filter((result) => result.validation.status !== 'passed').length;
  const receipt = {
    schemaVersion: 'hololand.holoshell.improvement-execution.v0.1.0',
    source: 'apps/holoshell/source/holoshell-improvement-run-loop.hsplus',
    executionId,
    sourceRunId: runId,
    generatedAt,
    status: executedRunCount === 0
      ? (remainingBefore === 0 ? 'no_remaining_runs' : 'awaiting_codebase_fix_evidence')
      : (remainingRunCount === 0 ? 'completed' : 'completed_codebase_fix_shakedown'),
    objective: sourceRun.objective,
    executionMode: 'codebase_fix_shakedown',
    requestedExecutionCount,
    plannedFixCount,
    shakedownLimit,
    allowFullBatch,
    queuedRunCount,
    priorExecutedRunCount,
    executedRunCount,
    totalExecutedRunCount,
    remainingRunCount,
    destructiveActionsTaken: false,
    desktopAutomationExecuted: false,
    approvalRequiredForDesktopAutomation: true,
    receiptRequired: true,
    fixEvidenceRequired: true,
    codebaseFixPolicy: sourceRun.codebaseFixPolicy,
    holotuneTracePolicy: sourceRun.holotuneTracePolicy,
    sourceRun: {
      runId: sourceRun.runId,
      receiptPath: sourceRun.receiptPath,
      routingSummary: sourceRun.routingSummary,
      holotuneTracePolicy: sourceRun.holotuneTracePolicy,
    },
    routing: sourceRun.routing,
    gpuBalancePlan,
    desktopBridge: gpuBalancePlan.desktopBridge,
    runResults,
    aggregate: {
      passed: runResults.filter((result) => result.validation.status === 'passed').length,
      failed: failedRunCount,
      validationStatus: runResults.length ? (failedRunCount ? 'failed' : 'passed') : 'awaiting_codebase_fix_evidence',
    },
    lessons: runResults.map((result) => result.lesson),
    nextSafeStep: executedRunCount === 0
      ? 'Attach actual codebase fix evidence: issue, changed files, validation command, validation result, and receipt or commit.'
      : (remainingRunCount > 0
          ? 'Review this codebase-fix shakedown receipt, then land the next capped fix batch.'
          : 'All queued codebase-fix shakedown items are validated; review before enabling any tuning corpus emission.'),
  };
  const saved = writeImprovementExecutionReceipt(receipt);
  const holotuneTrace = emitImprovementHolotuneTraces(saved);
  const traced = { ...saved, holotuneTrace };
  writeFileSync(saved.receiptPath, `${JSON.stringify(traced, null, 2)}\n`, 'utf8');
  return traced;
}

function publicShellUrl() {
  return `http://${HOST === '0.0.0.0' ? 'holojetson.local' : 'localhost'}:${PORT}`;
}

function sharedHoloShellSessionId() {
  return process.env.HOLOSHELL_SESSION_ID || `holoshell:${HOST}:${PORT}`;
}

function buildOperatorTerminalEventStream({ append = true } = {}) {
  return buildTerminalEventStream({
    receiptPath: OPERATOR_TERMINAL_RECEIPT,
    eventLogPath: OPERATOR_TERMINAL_EVENT_LOG,
    sessionId: sharedHoloShellSessionId(),
    append,
  });
}

function terminalRunCardsFromCommands(commands, { terminalStatus, receiptHash }) {
  const runCards = commands.map((command) => ({
    id: `terminal_run_card:${command.id || command.label}`,
    label: command.label || command.id || 'Terminal evidence',
    flow: command.flow || 'operator_terminal',
    lane: 'operator_terminal',
    status: terminalStatus,
    receipt: command.receipt || OPERATOR_TERMINAL_RECEIPT,
    permissionEnvelope: command.permissionEnvelope || 'read_only_projection',
    approvalRequired: command.approvalRequired ?? 'classified_by_intent',
    browserMayRequest: true,
    browserMayExecuteCommand: false,
    endpointExecutesCommand: false,
    receiptRequired: true,
    receiptHash: receiptHash || null,
  }));
  runCards.unshift({
    id: 'terminal_run_card:refresh_operator_terminal_receipt',
    label: 'Refresh Terminal Receipt',
    flow: 'operator_terminal_receipt_refresh',
    lane: 'operator_terminal',
    status: terminalStatus,
    receipt: OPERATOR_TERMINAL_RECEIPT,
    permissionEnvelope: 'read_only_receipt_refresh',
    approvalRequired: false,
    browserMayRequest: true,
    browserMayExecuteCommand: false,
    endpointExecutesCommand: false,
    receiptRequired: true,
    command: OPERATOR_TERMINAL_REFRESH_COMMAND,
    receiptHash: receiptHash || null,
  });
  return runCards;
}

function buildOperatorTerminalSession() {
  const liveStatus = buildLiveStatusSnapshot();
  const terminalReceipt = readJsonFileIfPresent(OPERATOR_TERMINAL_RECEIPT);
  const terminalEventStream = buildOperatorTerminalEventStream({ append: false });
  const receiptAgeMs = fileAgeMs(OPERATOR_TERMINAL_RECEIPT);
  const receiptObserved = terminalReceipt?.schemaVersion === 'hololand.holoshell.operator-terminal.v0.1.0';
  const receiptFresh = receiptObserved && (receiptAgeMs === null || receiptAgeMs <= OPERATOR_TERMINAL_FRESHNESS_MS);
  const terminalStatus = !receiptObserved ? 'needs_refresh' : (receiptFresh ? 'ready' : 'stale');
  const sessionReady = liveStatus.status === 'online' && terminalStatus === 'ready';
  const sessionStatus = sessionReady ? 'coupled' : 'attention';
  const receiptStatus = !receiptObserved ? 'missing' : (receiptFresh ? 'fresh' : 'stale');
  const terminalLabels = Array.isArray(terminalReceipt?.humanContract?.labels)
    ? terminalReceipt.humanContract.labels
    : [];
  const terminalCommands = Array.isArray(terminalReceipt?.commands?.human)
    ? terminalReceipt.commands.human.map((command) => ({
        id: command.id,
        label: command.label,
        flow: command.flow,
        permissionEnvelope: command.permissionEnvelope,
        approvalRequired: command.approvalRequired,
        receipt: command.receipt,
      }))
    : [];
  const terminalReceiptHash = terminalReceipt?.receipt?.terminalHash || null;
  const terminalRunCards = terminalRunCardsFromCommands(terminalCommands, {
    terminalStatus,
    receiptHash: terminalReceiptHash,
  });
  const browserSessionState = readBrowserSessionStateSnapshot();
  const browserSessionSnapshotStatus = browserSessionState.snapshotStatus === 'available' ? 'available' : 'empty';

  return {
    schemaVersion: OPERATOR_TERMINAL_SESSION_SCHEMA,
    source: OPERATOR_TERMINAL_COUPLING_SOURCE,
    generatedAt: new Date().toISOString(),
    sessionId: sharedHoloShellSessionId(),
    status: sessionStatus,
    browser: {
      surfaceId: 'browser_cockpit',
      role: 'conversation_approval_context',
      status: liveStatus.status === 'online' ? 'ready' : 'attention',
      url: liveStatus.route.url,
      chatEndpoint: liveStatus.route.chatEndpoint,
      cockpitCapsuleEndpoint: liveStatus.route.cockpitCapsuleEndpoint,
      browserSessionStateEndpoint: 'GET/POST /api/browser-session/state?sessionId=:sessionId',
      operatorTerminalSessionEndpoint: 'GET /api/operator-terminal/session',
      operatorTerminalEventsEndpoint: 'GET /api/operator-terminal/events',
      permissionEnvelope: 'read_only',
      mayMutateWithoutConsent: false,
    },
    terminal: {
      surfaceId: 'operator_terminal',
      role: 'execution_evidence_receipts',
      status: terminalStatus,
      receiptStatus,
      receiptPath: OPERATOR_TERMINAL_RECEIPT,
      receiptAgeMs,
      freshnessMs: OPERATOR_TERMINAL_FRESHNESS_MS,
      receiptHash: terminalReceiptHash,
      source: OPERATOR_TERMINAL_SOURCE,
      eventStreamSource: OPERATOR_TERMINAL_EVENT_STREAM_SOURCE,
      adapter: 'scripts/holoshell-operator-terminal.mjs',
      eventStreamAdapter: 'scripts/holoshell-terminal-event-stream.mjs',
      launcher: 'scripts/brittney-studio-launch.ps1',
      eventStreamEndpoint: 'GET /api/operator-terminal/events',
      eventStreamStatus: terminalEventStream.status,
      eventStreamEventCount: terminalEventStream.eventCount,
      eventLog: terminalEventStream.eventLog,
      mode: terminalReceipt?.summary?.mode || 'agent',
      labels: terminalLabels,
      commands: terminalCommands,
      runCards: terminalRunCards,
      refreshCommand: OPERATOR_TERMINAL_REFRESH_COMMAND,
      jsonCommand: terminalReceipt?.agentContract?.jsonCommand || OPERATOR_TERMINAL_REFRESH_COMMAND,
      primarySurfaceUrl: terminalReceipt?.route?.primarySurfaceUrl || liveStatus.route.url,
      laptopBridgeStatus: terminalReceipt?.route?.laptopBridgeStatus || 'check_required',
      permissionEnvelope: 'read_only_projection',
      mayMutateWithoutConsent: false,
    },
    sharedMemory: {
      contextCapsuleSchema: 'hololand.holoshell.context-capsule.v0.1.0',
      requiredFields: ['goal', 'files_read', 'files_changed', 'tests_run', 'receipts', 'blockers', 'next_command'],
      browserWrites: ['chat_turns', 'approval_state', 'context_capsule'],
      terminalWrites: ['command_results', 'test_logs', 'agent_run_receipts'],
      receiptLedger: '.tmp/holoshell/',
      browserStateKey: BROWSER_SESSION_STATE_KEY,
      browserSessionStateEndpoint: 'GET/POST /api/browser-session/state?sessionId=:sessionId',
      evidenceLedger: 'browser_local_storage_plus_terminal_receipts',
      sessionId: sharedHoloShellSessionId(),
    },
    symbiosis: {
      mode: 'always_on_native_terminal_plus_browser',
      browserRole: 'intent_approval_presentable_state',
      terminalRole: 'proof_repair_execution_evidence',
      browserTerminalRelationship: 'full_time_symbiosis',
      messyTerminalTruthPresentedAs: ['run_cards', 'receipt_digest', 'next_safe_action'],
      rawShellIsDefaultHumanInterface: false,
      browserMayExecuteTerminalCommand: false,
      endpointMayExecuteTerminalCommand: false,
    },
    refreshRecovery: {
      status: 'enabled',
      browserStateKey: BROWSER_SESSION_STATE_KEY,
      browserSessionStateEndpoint: 'GET/POST /api/browser-session/state?sessionId=:sessionId',
      browserSessionSnapshotStatus,
      browserSessionSnapshotUpdatedAt: browserSessionState.updatedAt || null,
      browserSessionScoped: browserSessionState.sessionScoped || false,
      terminalEvidenceStreamStatus: 'polling_enabled',
      terminalEvidenceEventStreamStatus: terminalEventStream.status,
      terminalEvidenceEventStreamEndpoint: 'GET /api/operator-terminal/events',
      terminalEvidenceEventCount: terminalEventStream.eventCount,
      terminalEvidencePollIntervalMs: 30000,
      evidenceLedgerStatus: receiptObserved ? 'available' : 'needs_terminal_receipt',
      rehydrateFrom: ['localStorage', 'GET /api/browser-session/state?sessionId=:sessionId', 'GET /api/cockpit/capsule', 'GET /api/operator-terminal/session', 'GET /api/operator-terminal/events'],
      browserRefreshMayResetTruth: false,
      terminalReceiptsAreDurableTruth: true,
      transcriptLimit: 120,
    },
    runCards: terminalRunCards,
    actionCards: [
      {
        id: 'refresh_operator_terminal_receipt',
        label: 'Refresh Terminal Receipt',
        method: 'terminal_command',
        command: OPERATOR_TERMINAL_REFRESH_COMMAND,
        lane: 'operator_terminal',
        permissionEnvelope: 'read_only_receipt_refresh',
        mayExecuteWithoutConsent: true,
        endpointExecutesCommand: false,
        receiptRequired: true,
      },
      {
        id: 'open_browser_cockpit',
        label: 'Open Browser Cockpit',
        method: 'GET',
        href: liveStatus.route.url,
        lane: 'browser_cockpit',
        permissionEnvelope: 'read_only',
        mayExecuteWithoutConsent: true,
        receiptRequired: false,
      },
    ],
    safety: {
      browserIsPrimaryConversationSurface: true,
      terminalIsExecutionEvidenceSurface: true,
      terminalMayForkChatBrain: false,
      directTerminalMutationAllowed: false,
      endpointMayExecuteTerminalCommand: false,
      terminalSpawnedByEndpoint: false,
      terminalMutationRequires: ['identify', 'scope', 'preflight', 'fresh_gesture_proof', 'consent_token', 'execution_receipt', 'log'],
      rawSecretsIncluded: false,
      rawCommandsIncludedForHuman: false,
      destructiveActionsTaken: false,
      desktopAutomationExecuted: false,
    },
    destructiveActionsTaken: false,
    desktopAutomationExecuted: false,
    nextSafeStep: terminalStatus === 'ready'
      ? 'Use the browser for Brittney chat and approvals; use the terminal receipt as execution evidence.'
      : `Refresh the read-only terminal receipt with ${OPERATOR_TERMINAL_REFRESH_COMMAND}, then keep mutations behind preflight -> consent-token -> receipt.`,
  };
}

function buildLiveStatusSnapshot() {
  const pending = pendingConsents();
  const executions = executionHistory();
  const stale = staleProcesses();
  const modelLibrary = modelLibrarySnapshot();
  const nativeResources = nativeResourceSnapshot();
  const laptopReasoning = laptopReasoningStatusSnapshot();
  const sovereignRoomMarathon = sovereignRoomMarathonStatusSnapshot();
  const holoclawRuntimeBridge = holoclawRuntimeBridgeStatusSnapshot();
  const faraPeerAutomation = {
    latestPulse: faraPeerAutomationHistory()[0] || null,
    schedule: faraPeerAutomationScheduleSnapshot(),
    latestPromotion: faraPeerAutomationPromotionHistory()[0] || null,
  };
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
      cockpitCapsuleEndpoint: 'GET /api/cockpit/capsule',
      browserSessionStateEndpoint: 'GET/POST /api/browser-session/state?sessionId=:sessionId',
      operatorTerminalSessionEndpoint: 'GET /api/operator-terminal/session',
      operatorTerminalReportEndpoint: 'POST /api/operator-terminal/report',
      operatorTerminalEventsEndpoint: 'GET /api/operator-terminal/events',
      desktopControlEndpoint: 'POST /api/desktop-control/plan',
      desktopBridgeEndpoint: 'GET /api/desktop-control/bridge',
      desktopBridgeReportEndpoint: 'POST /api/desktop-control/bridge/report',
      laptopReasoningReportEndpoint: 'POST /api/laptop-reasoning/report',
      windowAwarenessReportEndpoint: 'POST /api/window-awareness/report',
      faraPeerAutomationEndpoint: 'POST /api/fara-peer-chat/automation-pulse',
      faraPeerAutomationHistoryEndpoint: 'GET /api/fara-peer-chat/automation-pulses',
      faraPeerAutomationScheduleEndpoint: 'POST /api/fara-peer-chat/automation-schedule',
      faraPeerAutomationScheduleStatusEndpoint: 'GET /api/fara-peer-chat/automation-schedule',
      faraPeerAutomationPromotionEndpoint: 'POST /api/fara-peer-chat/promote-proposal',
      faraPeerAutomationPromotionHistoryEndpoint: 'GET /api/fara-peer-chat/promotions',
      sovereignRoomMarathonEndpoint: 'GET /api/sovereign-room/marathon',
      sovereignRoomMarathonWorkflowEndpoint: 'POST /workflow/sovereign-room-marathon',
      sovereignRoomMarathonLatestEndpoint: 'GET /workflow/sovereign-room-marathon/latest',
      holoclawRuntimeBridgeEndpoint: 'GET /api/holoclaw/runtime-bridge',
      holoclawRuntimeBridgeWorkflowEndpoint: 'POST /workflow/holoclaw-runtime-bridge',
      holoclawRuntimeBridgeLatestEndpoint: 'GET /workflow/holoclaw-runtime-bridge/latest',
      holoclawSessionObjectEndpoint: 'GET /api/holoclaw/session-object?sessionId=:sessionId',
      improvementRunEndpoint: 'POST /api/improvement-runs',
      improvementRunExecuteEndpoint: 'POST /api/improvement-runs/:runId/execute',
      holotuneTraceSource: 'deferred until codebase-fix shakedown validation',
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
      'brittney_desktop_cockpit',
      'browser_terminal_coupling',
      'operator_terminal_session',
      'operator_terminal_event_stream',
      'operator_terminal_run_cards',
      'browser_refresh_evidence_rehydration',
      'browser_session_snapshot',
      'fara_brittney_peer_chat',
      'fara_peer_automation_pulse',
      'fara_peer_automation_schedule',
      'fara_peer_proposal_promotion',
      'sovereign_room_marathon_status',
      'sovereign_room_marathon_receipt_refresh',
      'fara_gui_grounding',
      'daimon_rehydration',
      'model_library',
      'holoclaw_skill_shelf',
      'holoclaw_runtime_bridge_status',
      'holoclaw_runtime_guarded_workflow',
      'holoclaw_session_object',
      'native_resource_inventory',
      'vision_model_routing',
      'improvement_run_queue',
      'improvement_run_execution',
      'codebase_fix_shakedown',
      'holotune_trace_deferred',
      'gpu_lane_balance',
      'desktop_bridge_status',
      'desktop_bridge_browser_report',
      'laptop_hardware_reasoning_receipts',
    ],
    lanes: [
      { id: 'brittney_operator', model: process.env.AIBRITTNEY_MODEL || 'qwen3:4b-instruct', role: 'operator chat and routing' },
      { id: 'fara_peer_chat', model: 'fara:7b', role: 'read-only peer chat and co-planning with Brittney' },
      { id: 'fara_gui_grounding', model: 'fara:7b', role: 'guarded desktop automation planning' },
      { id: 'holo_sdf_geometry', model: 'holo-sdf:v0', role: 'text/image to SDFNode geometry' },
      { id: 'vision_language', model: 'qwen3-vl:4b', role: 'vision model stack for screen and image understanding' },
      { id: 'semantic_embeddings', model: 'nomic-embed-text:latest', role: 'semantic recall and search' },
      { id: 'laptop_hardware', model: 'laptop sovereign receipt route', role: 'laptop reasoning dispatch/result receipts with GPU telemetry truth' },
      { id: 'sovereign_room_marathon', model: 'local sovereign room queue', role: 'local tagged HoloMesh room receipt and claim boundary' },
      { id: 'holoclaw_skills', model: 'HoloClaw skill shelf', role: 'native skill execution routes' },
      { id: 'holoclaw_runtime', model: 'HoloClaw AgentRunner', role: 'consent-gated HoloScript agent runtime bridge' },
      { id: 'codebase_fix', model: 'Codex/local agent seats', role: 'actual patch, validation, and commit-backed shakedown work' },
      { id: 'receipt_gate', model: 'local filesystem receipts', role: 'approval and audit boundary' },
      { id: 'holotune_trace', model: 'HoloTune trace writer', role: 'deferred corpus sink after real codebase fixes pass review' },
    ],
    modelLibrary,
    nativeResources,
    sovereignRoomMarathon,
    holoclawRuntimeBridge,
    faraPeerAutomation,
    gpu: gpuStatusSnapshot(),
    laptopReasoning,
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

function modelLibrarySummary(snapshot) {
  return snapshot.modelLibrary?.summary || 'No model library entries reported';
}

function nativeResourceSummary(snapshot) {
  return snapshot.nativeResources?.summary || 'No native resources reported';
}

function holoclawRuntimeBridgeSummary(snapshot) {
  return snapshot.holoclawRuntimeBridge?.summary || 'No HoloClaw runtime bridge status reported';
}

function sovereignRoomMarathonSummary(snapshot) {
  return snapshot.sovereignRoomMarathon?.summary || 'No sovereign room marathon status reported';
}

function formatLiveStatusBrief(snapshot) {
  const latestPulse = snapshot.faraPeerAutomation?.latestPulse;
  const schedule = snapshot.faraPeerAutomation?.schedule;
  const latestPromotion = snapshot.faraPeerAutomation?.latestPromotion;
  return [
    '[Live HoloShell status context - answer from these fields; do not answer "unknown" when a field is present.]',
    `System status: ${snapshot.status}`,
    `HoloShell route: ${snapshot.route.url} (${snapshot.route.chatEndpoint})`,
    `Brittney avatar: ${snapshot.avatar.status}; runtime ${snapshot.avatar.runtime}; Daimon context ${snapshot.avatar.daimonContext}`,
    `Capabilities: ${snapshot.capabilities.join(', ')}`,
    `Lanes: ${laneSummary(snapshot)}`,
    `Model library: ${modelLibrarySummary(snapshot)}`,
    `Native resources: ${nativeResourceSummary(snapshot)}`,
    `Sovereign room marathon: ${sovereignRoomMarathonSummary(snapshot)}`,
    `HoloClaw runtime bridge: ${holoclawRuntimeBridgeSummary(snapshot)}`,
    `GPU telemetry: ${snapshot.gpu.summary}`,
    `Laptop reasoning: ${snapshot.laptopReasoning.summary}`,
    `Fara/Brittney pulse: ${latestPulse ? `${latestPulse.status} ${latestPulse.pulseId}; ${latestPulse.nextSafeActionCount} next-safe action(s)` : 'no pulse receipt yet'}`,
    `Fara/Brittney scheduler: ${schedule?.status || 'unknown'}${schedule?.intervalMs ? ` every ${schedule.intervalMs}ms` : ''}`,
    `Fara/Brittney promotion: ${latestPromotion ? `${latestPromotion.status} -> ${latestPromotion.promotedRunId}` : 'none'}`,
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
  const latestPulse = snapshot.faraPeerAutomation?.latestPulse;
  const pulseSummary = latestPulse
    ? `latest pulse ${latestPulse.pulseId} (${latestPulse.cadence}) exposed ${latestPulse.nextSafeActionCount} next-safe action(s)`
    : 'no pulse receipt yet';
  if (wantsNextSteps) {
    return [
      'Next steps, grounded in live HoloShell state:',
      `1. Keep Brittney as the operator surface; chat is online at ${snapshot.route.url} and receipts are enabled at ${snapshot.receiptsDir}.`,
      `2. Keep model roles separated: vision models read screens/images through the vision_language lane; Fara peer chat is read-only/free, while Fara desktop plans remain guarded at ${snapshot.route.desktopControlEndpoint}.`,
      `3. Let the Fara/Brittney automation pulse keep momentum through ${snapshot.route.faraPeerAutomationEndpoint}; ${pulseSummary}. Schedule/status live at ${snapshot.route.faraPeerAutomationScheduleStatusEndpoint}.`,
      `4. Inspect local-tagged room work through ${snapshot.route.sovereignRoomMarathonEndpoint}; refresh receipts through ${snapshot.route.sovereignRoomMarathonWorkflowEndpoint} without browser claims. ${sovereignRoomMarathonSummary(snapshot)}.`,
      `5. Keep HoloClaw as the native agent-runtime gate: inspect ${snapshot.route.holoclawRuntimeBridgeEndpoint}; stage runtime work only through ${snapshot.route.holoclawRuntimeBridgeWorkflowEndpoint}. ${holoclawRuntimeBridgeSummary(snapshot)}.`,
      `6. Queue codebase-fix batches through ${snapshot.route.improvementRunEndpoint}, then count capped shakedowns only when patch and validation evidence is attached through ${snapshot.route.improvementRunExecuteEndpoint}.`,
      `7. Check laptop desktop bridge readiness through ${snapshot.route.desktopBridgeEndpoint}; Fara plans remain approval-gated and non-mutating until consent exists.`,
      `8. Balance processing across the owned-GPU lanes: ${laneSummary(snapshot)}. Current GPU telemetry: ${snapshot.gpu.summary}. Laptop reasoning: ${snapshot.laptopReasoning.summary}.`,
      `9. Use the native library before inventing routes: ${modelLibrarySummary(snapshot)}. ${nativeResourceSummary(snapshot)}.`,
      `10. Run actual codebase fixes through the desktop app route with receipts on every pass; HoloTune trace emission stays deferred until fixes pass review. Current guardrails: ${baseGuardrails}.`,
      `11. Cleanly separate local work by repo status: ${gitSummary(snapshot.gitStatus)}.`,
      '',
      'No cube/test object is needed here. The next move is real repo issue -> patch -> targeted validation -> receipt/commit evidence -> GPU/bridge measurement -> feed the verified fix back into Brittney. Tuning waits.',
    ].join('\n');
  }

  return [
    'System status: online.',
    `Brittney chat is live at ${snapshot.route.url} through ${snapshot.route.chatEndpoint}; receipts are enabled.`,
    `Avatar status: ${snapshot.avatar.status}; Daimon context rides along when D.053 has emerged.`,
    `Active capabilities: ${snapshot.capabilities.join(', ')}.`,
    `Active lanes: ${laneSummary(snapshot)}.`,
    `Fara/Brittney automation pulse: ${snapshot.route.faraPeerAutomationEndpoint}; ${pulseSummary}; promotion route ${snapshot.route.faraPeerAutomationPromotionEndpoint}.`,
    `Sovereign room marathon: ${sovereignRoomMarathonSummary(snapshot)}; status route ${snapshot.route.sovereignRoomMarathonEndpoint}; receipt refresh ${snapshot.route.sovereignRoomMarathonWorkflowEndpoint}.`,
    `HoloClaw runtime bridge: ${holoclawRuntimeBridgeSummary(snapshot)}; status route ${snapshot.route.holoclawRuntimeBridgeEndpoint}; guarded workflow ${snapshot.route.holoclawRuntimeBridgeWorkflowEndpoint}.`,
    `Improvement runs: queue through ${snapshot.route.improvementRunEndpoint}, count codebase-fix shakedowns through ${snapshot.route.improvementRunExecuteEndpoint} only after patch and validation evidence; HoloTune is deferred.`,
    `Model library: ${modelLibrarySummary(snapshot)}.`,
    `Native resources: ${nativeResourceSummary(snapshot)}.`,
    `GPU balance: ${snapshot.gpu.summary}.`,
    `Laptop reasoning: ${snapshot.laptopReasoning.summary}.`,
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
    {
      operation: 'inspect_laptop_hardware_reasoning_receipt',
      lane: 'laptop-hardware',
      receiptRequired: true,
    },
    {
      operation: 'inspect_model_library',
      lane: 'model_library',
      receiptRequired: true,
    },
    {
      operation: 'inspect_holoclaw_skill_shelf',
      lane: 'holoclaw_skills',
      receiptRequired: true,
    },
    {
      operation: 'inspect_holoclaw_runtime_bridge_status',
      lane: 'holoclaw_runtime',
      endpoint: snapshot.route.holoclawRuntimeBridgeEndpoint,
      permissionEnvelope: 'read_only',
      receiptRequired: true,
    },
    {
      operation: 'stage_holoclaw_runtime_bridge_with_approval',
      lane: 'holoclaw_runtime',
      endpoint: snapshot.route.holoclawRuntimeBridgeWorkflowEndpoint,
      permissionEnvelope: 'guarded_execute',
      approvalRequired: true,
      automationMayExecute: false,
      receiptRequired: true,
    },
    {
      operation: 'record_fara_brittney_automation_pulse',
      lane: 'fara_peer_chat',
      endpoint: snapshot.route.faraPeerAutomationEndpoint,
      permissionEnvelope: 'read_only',
      receiptRequired: true,
    },
    {
      operation: 'review_fara_brittney_automation_schedule',
      lane: 'fara_peer_chat',
      endpoint: snapshot.route.faraPeerAutomationScheduleStatusEndpoint,
      permissionEnvelope: 'read_only',
      receiptRequired: true,
    },
    {
      operation: 'promote_fara_brittney_safe_queue_proposal',
      lane: 'improvement_run_queue',
      endpoint: snapshot.route.faraPeerAutomationPromotionEndpoint,
      permissionEnvelope: 'receipt_backed_queue',
      receiptRequired: true,
    },
    {
      operation: 'queue_codebase_fix_shakedown_batch',
      lane: 'improvement_run_queue',
      receiptRequired: true,
    },
    {
      operation: 'execute_codebase_fix_shakedown',
      lane: 'improvement_run_execution',
      receiptRequired: true,
    },
    {
      operation: 'inspect_desktop_bridge_status',
      lane: 'desktop_bridge_status',
      receiptRequired: true,
    },
  ];
  if (looksLikeNextStepsIntent(message)) {
    proposals.push({
      operation: 'plan_receipt_backed_codebase_fix_batch',
      lane: 'brittney_app_route',
      receiptRequired: true,
    });
    proposals.push({
      operation: 'plan_desktop_control_with_fara',
      lane: 'fara_gui_grounding',
      receiptRequired: true,
      approvalRequired: true,
    });
    proposals.push({
      operation: 'route_task_to_native_model_or_skill',
      lane: 'native_resource_inventory',
      receiptRequired: true,
    });
    proposals.push({
      operation: 'separate_vision_from_desktop_automation',
      lane: 'vision_model_routing',
      receiptRequired: true,
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

function exposeBrittneyProposal(proposal = {}) {
  const exposed = {
    operation: proposal.operation || proposal.kind || proposal.title || 'action',
    lane: proposal.lane
      || proposal.consentLane
      || (proposal.objectId === 'conversation-plan' ? 'conversation_plan_dispatch' : null),
    receiptRequired: proposal.receiptRequired ?? null,
  };
  const passthroughKeys = [
    'id',
    'objectId',
    'label',
    'permissionEnvelope',
    'mutating',
    'approvalRequired',
    'planId',
    'planReceipt',
    'dispatcherSource',
    'dispatcherScript',
    'acceptanceRoute',
    'acceptanceMethod',
    'acceptanceMode',
    'allowedExecutionModes',
    'dryRunFlag',
    'executeFlag',
    'defaultMutationMode',
    'executionDefault',
    'dispatchReceiptRequired',
    'downstreamReceiptsRequired',
    'completionClaimAllowed',
    'completionBlockedUntil',
    'turnCount',
    'questionTurnCount',
    'sourceTurnIds',
    'reason',
  ];
  for (const key of passthroughKeys) {
    if (proposal[key] !== undefined) exposed[key] = proposal[key];
  }
  return exposed;
}

function liveStatusResponseEnvelope(snapshot) {
  return {
    schemaVersion: snapshot.schemaVersion,
    status: snapshot.status,
    generatedAt: snapshot.generatedAt,
    route: snapshot.route,
    avatar: snapshot.avatar,
    capabilities: snapshot.capabilities,
    lanes: snapshot.lanes,
    capabilityCount: snapshot.capabilities.length,
    laneCount: snapshot.lanes.length,
    modelLibrary: snapshot.modelLibrary,
    nativeResources: snapshot.nativeResources,
    sovereignRoomMarathon: snapshot.sovereignRoomMarathon,
    holoclawRuntimeBridge: snapshot.holoclawRuntimeBridge,
    faraPeerAutomation: snapshot.faraPeerAutomation,
    gpu: snapshot.gpu,
    laptopReasoning: snapshot.laptopReasoning,
    pendingConsentCount: snapshot.pendingConsentCount,
    staleProcessCount: snapshot.staleProcessCount,
    recentExecutionCount: snapshot.recentExecutionCount,
    gitStatus: snapshot.gitStatus,
  };
}

function buildSourceOwnedCockpitState({
  liveStatus,
  sovereignRoomMarathon,
  holoclawRuntimeBridge,
  operatorTerminal,
}) {
  const domains = ['agents', 'files', 'worlds', 'receipts', 'board_tasks'];
  const selectedTaskId = sovereignRoomMarathon?.selectedTaskId || '';
  const selectedTaskTitle = sovereignRoomMarathon?.selectedTaskTitle || '';
  return {
    schemaVersion: 'hololand.holoshell.source-owned-cockpit-state.v0.1.0',
    source: BRITTNEY_COCKPIT_SOURCE,
    status: 'ready',
    summary: {
      domainCount: domains.length,
      domainList: domains.join(', '),
      sourceRequiredBeforeProjection: true,
      sourceFormatGapNamedBeforeAdapterWork: true,
      legacyUiMayNotOwnBehavior: true,
      selectedTaskId,
    },
    domains,
    agents: {
      source: BRITTNEY_COCKPIT_SOURCE,
      chatSource: 'apps/holoshell/source/holoshell-brittney-operator-chat.hsplus',
      runtimeBridgeSource: HOLOCLAW_RUNTIME_BRIDGE_SOURCE,
      operator: 'Brittney',
      runtime: liveStatus?.avatar?.runtime || '@holoscript/aibrittney',
      holoclawStatus: holoclawRuntimeBridge?.status || 'unknown',
      desktopAutomationExecuted: false,
    },
    files: {
      sourceAnchors: [
        BRITTNEY_COCKPIT_SOURCE,
        OPERATOR_TERMINAL_COUPLING_SOURCE,
        SOVEREIGN_ROOM_MARATHON_SOURCE,
        HOLOCLAW_RUNTIME_BRIDGE_SOURCE,
        'packages/holoshell/scenes/operate-room.holo',
      ],
      adapterProjectionOnly: 'packages/holoshell/serve.mjs',
      compilerProjectionOnly: 'packages/holoshell/compile.mjs',
      legacyUiMayNotOwnBehavior: true,
    },
    worlds: {
      operateRoomSource: 'packages/holoshell/scenes/operate-room.holo',
      shellWorldSource: 'apps/holoshell/source/holoshell-shell-world.holo',
      surface: liveStatus?.route?.surface || 'HoloShell Operate Room',
      route: liveStatus?.route?.url || publicShellUrl(),
    },
    receipts: {
      receiptsDir: liveStatus?.receiptsDir || RECEIPTS_DIR,
      operatorTerminalReceipt: OPERATOR_TERMINAL_RECEIPT,
      operatorTerminalReceiptStatus: operatorTerminal?.terminal?.receiptStatus || operatorTerminal?.terminal?.status || 'unknown',
      sovereignRoomMarathonReceipt: sovereignRoomMarathon?.receiptPath || SOVEREIGN_ROOM_MARATHON_RECEIPT,
      sovereignRoomMarathonStatus: sovereignRoomMarathon?.status || 'unknown',
      holoclawRuntimeBridgeReceipt: holoclawRuntimeBridge?.receiptPath || HOLOCLAW_RUNTIME_BRIDGE_RECEIPT,
      holoclawRuntimeBridgeStatus: holoclawRuntimeBridge?.status || 'unknown',
      receiptRequired: true,
    },
    boardTasks: {
      source: SOVEREIGN_ROOM_MARATHON_SOURCE,
      statusEndpoint: 'GET /api/sovereign-room/marathon',
      workflowEndpoint: 'POST /workflow/sovereign-room-marathon',
      selectedTaskId,
      selectedTaskTitle,
      matchedCandidateCount: sovereignRoomMarathon?.matchedCandidateCount || 0,
      queueOpenCount: sovereignRoomMarathon?.queueOpenCount || 0,
      browserMayClaimRoomTask: false,
      claimRequires: ['terminal_or_control_daemon', 'local_task_match', 'execution_receipt_before_done'],
    },
    uiProjection: {
      role: 'adapter_projection_only',
      endpoint: 'GET /api/cockpit/capsule',
      route: 'GET /api/cockpit/capsule#sourceOwnedState',
      sourceRequiredBeforeProjection: true,
      legacyUiMayNotOwnBehavior: true,
    },
    destructiveActionsTaken: false,
    desktopAutomationExecuted: false,
    receiptRequired: true,
    nextSafeStep: 'Change HoloScript source first, then project through serve.mjs and compile.mjs adapter surfaces.',
  };
}

function buildBrittneyCockpitCapsule() {
  const liveStatus = buildLiveStatusSnapshot();
  const desktopBridge = desktopBridgeStatusSnapshot();
  const sovereignRoomMarathon = liveStatus.sovereignRoomMarathon || sovereignRoomMarathonStatusSnapshot();
  const holoclawRuntimeBridge = liveStatus.holoclawRuntimeBridge || holoclawRuntimeBridgeStatusSnapshot();
  const operatorTerminal = buildOperatorTerminalSession();
  const browserSessionState = readBrowserSessionStateSnapshot();
  const windowAwareness = buildWindowAwareness();
  const improvementRuns = improvementRunHistory();
  const latestRun = improvementRuns[0] || null;
  const faraAutomation = {
    latestPulse: faraPeerAutomationHistory()[0] || null,
    schedule: faraPeerAutomationScheduleSnapshot(),
    latestPromotion: faraPeerAutomationPromotionHistory()[0] || null,
  };
  const sourceOwnedState = buildSourceOwnedCockpitState({
    liveStatus,
    sovereignRoomMarathon,
    holoclawRuntimeBridge,
    operatorTerminal,
  });
  const bridgeReady = desktopBridge.status === 'ready';
  const bridgeAttention = ['awaiting_laptop_daemon', 'stale_laptop_report'].includes(desktopBridge.status);
  const runtimeTruthStatus = liveStatus.status === 'online' ? 'ready' : 'attention';
  const routeStatus = liveStatus.route?.chatEndpoint && liveStatus.route?.desktopControlEndpoint ? 'ready' : 'attention';
  const contextCarryStatus = 'ready';
  const sourceOwnedStateStatus = sourceOwnedState.status === 'ready' ? 'ready' : 'attention';
  const browserSessionStateStatus = browserSessionState.snapshotStatus === 'available' ? 'ready' : 'waiting';
  const browserTranscriptEntryCount = Object.values(browserSessionState.transcriptByChat || {})
    .reduce((sum, entries) => sum + safeArray(entries).length, 0);
  const desktopBridgeStatus = bridgeReady ? 'ready' : (bridgeAttention ? 'attention' : desktopBridge.status || 'unknown');
  const operatorTerminalStatus = operatorTerminal.terminal.status === 'ready' ? 'ready' : 'attention';
  const windowAwarenessStatus = windowAwareness.status === 'windows_visible' ? 'ready' : 'attention';
  const faraAutomationStatus = faraAutomation.latestPulse
    ? 'ready'
    : (faraAutomation.schedule.status === 'enabled' ? 'waiting' : 'attention');
  const toolActionStatus = 'window_preflights_ready';
  const laptopReasoning = liveStatus.laptopReasoning || laptopReasoningStatusSnapshot();
  const laptopReasoningStatus = ['completed', 'partial'].includes(laptopReasoning.status)
    ? 'ready'
    : ['blocked', 'error'].includes(laptopReasoning.status)
      ? 'attention'
      : 'waiting';
  const holoclawRuntimeStatus = holoclawRuntimeBridge.status === 'not_staged'
    ? 'waiting'
    : (/^(blocked|error|failed|runtime_command_missing)/u.test(holoclawRuntimeBridge.status) ? 'attention' : 'ready');
  const sovereignRoomStatus = ['not_checked', 'empty'].includes(sovereignRoomMarathon.status)
    ? 'waiting'
    : (/^(blocked|error|failed|claim_failed)/u.test(sovereignRoomMarathon.status) ? 'attention' : 'ready');
  const cockpitLanes = [
    {
      id: 'runtime_truth',
      label: 'Runtime',
      status: runtimeTruthStatus,
      value: liveStatus.status,
      detail: `${liveStatus.avatar.name} ${liveStatus.avatar.status}; ${liveStatus.capabilities.length} capabilities`,
      sourceEndpoint: 'GET /api/live-status',
      permissionEnvelope: 'read_only',
      receiptRequired: true,
    },
    {
      id: 'route_health',
      label: 'Routes',
      status: routeStatus,
      value: liveStatus.route.url,
      detail: `${liveStatus.route.chatEndpoint}; ${liveStatus.route.cockpitCapsuleEndpoint}`,
      sourceEndpoint: 'GET /api/cockpit/capsule',
      permissionEnvelope: 'read_only',
      receiptRequired: true,
    },
    {
      id: 'context_carry',
      label: 'Context',
      status: contextCarryStatus,
      value: 'capsule_ready',
      detail: 'goal, files, tests, receipts, blockers, next command',
      sourceEndpoint: BRITTNEY_COCKPIT_SOURCE,
      permissionEnvelope: 'read_only',
      receiptRequired: true,
    },
    {
      id: 'source_owned_state',
      label: 'Source',
      status: sourceOwnedStateStatus,
      value: sourceOwnedState.summary.domainList,
      detail: `${sourceOwnedState.summary.domainCount} domains; ${sourceOwnedState.uiProjection.role}`,
      sourceEndpoint: BRITTNEY_COCKPIT_SOURCE,
      permissionEnvelope: 'read_only_source_contract',
      receiptRequired: true,
    },
    {
      id: 'browser_session',
      label: 'Session',
      status: browserSessionStateStatus,
      value: browserSessionState.snapshotStatus,
      detail: `transcript ${browserTranscriptEntryCount}; evidence ${browserSessionState.evidenceLedger.length}; active ${browserSessionState.activeChatId}`,
      sourceEndpoint: 'GET/POST /api/browser-session/state?sessionId=:sessionId',
      permissionEnvelope: 'read_only_snapshot',
      receiptRequired: true,
    },
    {
      id: 'desktop_bridge',
      label: 'Desktop',
      status: desktopBridgeStatus,
      value: desktopBridge.status,
      detail: desktopBridge.latestReportId
        ? `${desktopBridge.hostRole}; report ${desktopBridge.latestReportId}`
        : `${desktopBridge.hostRole}; ${desktopBridge.expectedDaemon}`,
      sourceEndpoint: 'GET /api/desktop-control/bridge',
      permissionEnvelope: desktopBridge.approvalRequiredForDesktopAutomation ? 'guarded_execute' : 'read_only',
      receiptRequired: true,
    },
    {
      id: 'laptop_reasoning',
      label: 'Reasoning',
      status: laptopReasoningStatus,
      value: laptopReasoning.status,
      detail: laptopReasoning.summary,
      sourceEndpoint: 'GET /api/live-status',
      permissionEnvelope: 'read_only',
      receiptRequired: true,
    },
    {
      id: 'fara_peer_automation',
      label: 'Fara Pulse',
      status: faraAutomationStatus,
      value: faraAutomation.latestPulse?.status || faraAutomation.schedule.status,
      detail: faraAutomation.latestPulse
        ? `${faraAutomation.latestPulse.cadence}; ${faraAutomation.latestPulse.nextSafeActionCount} next-safe action(s)`
        : `schedule ${faraAutomation.schedule.status}`,
      sourceEndpoint: 'POST /api/fara-peer-chat/automation-pulse',
      permissionEnvelope: 'read_only',
      receiptRequired: true,
    },
    {
      id: 'sovereign_room',
      label: 'Sovereign Room',
      status: sovereignRoomStatus,
      value: sovereignRoomMarathon.status,
      detail: `matched ${sovereignRoomMarathon.matchedCandidateCount}; open ${sovereignRoomMarathon.queueOpenCount}; selected ${sovereignRoomMarathon.selectedTaskTitle || sovereignRoomMarathon.selectedTaskId || 'none'}`,
      sourceEndpoint: 'GET /api/sovereign-room/marathon',
      workflowEndpoint: 'POST /workflow/sovereign-room-marathon',
      permissionEnvelope: 'read_only_receipt_refresh',
      directExecutionAllowed: false,
      endpointExecutesRuntime: false,
      approvalRequired: false,
      receiptRequired: true,
    },
    {
      id: 'holoclaw_runtime',
      label: 'HoloClaw',
      status: holoclawRuntimeStatus,
      value: holoclawRuntimeBridge.status,
      detail: holoclawRuntimeBridge.receiptObserved
        ? `${holoclawRuntimeBridge.selectedSkillCount} skill(s); ${holoclawRuntimeBridge.pendingApprovalCount} approval(s)`
        : 'runtime bridge receipt not staged',
      sourceEndpoint: 'GET /api/holoclaw/runtime-bridge',
      workflowEndpoint: 'POST /workflow/holoclaw-runtime-bridge',
      permissionEnvelope: 'guarded_execute',
      approvalRequired: true,
      directExecutionAllowed: false,
      receiptRequired: true,
    },
    {
      id: 'operator_terminal',
      label: 'Terminal',
      status: operatorTerminalStatus,
      value: operatorTerminal.terminal.status,
      detail: operatorTerminal.terminal.receiptHash
        ? `receipt ${String(operatorTerminal.terminal.receiptHash).slice(0, 12)}; age ${operatorTerminal.terminal.receiptAgeMs ?? 'unknown'}ms`
        : `receipt ${operatorTerminal.terminal.receiptStatus}; ${operatorTerminal.terminal.refreshCommand}`,
      sourceEndpoint: 'GET /api/operator-terminal/session',
      eventStreamEndpoint: 'GET /api/operator-terminal/events',
      permissionEnvelope: 'read_only_projection',
      receiptRequired: true,
    },
    {
      id: 'window_awareness',
      label: 'Windows',
      status: windowAwarenessStatus,
      value: windowAwareness.status,
      detail: `${windowAwareness.summary.visibleWindowCount} visible; ${windowAwareness.summary.peerWindowCount} peer; ${windowAwareness.summary.shellWindowCount} shell`,
      sourceEndpoint: 'GET /api/cockpit/capsule',
      permissionEnvelope: 'read_only',
      receiptRequired: true,
    },
    {
      id: 'tool_action_cards',
      label: 'Tools',
      status: toolActionStatus,
      value: 'cards_ready',
      detail: 'read-only reports and receipt-backed plans',
      sourceEndpoint: 'GET /api/cockpit/capsule',
      permissionEnvelope: 'read_only_plan',
      receiptRequired: true,
    },
  ];
  const baseActionCards = [
    {
      id: 'refresh_runtime_truth',
      label: 'Runtime Truth',
      method: 'GET',
      href: '/api/live-status',
      lane: 'runtime_truth',
      permissionEnvelope: 'read_only',
      mayExecuteWithoutConsent: true,
      receiptRequired: true,
    },
    {
      id: 'desktop_bridge_report',
      label: 'Desktop Bridge',
      method: 'GET',
      href: '/api/desktop-control/bridge',
      lane: 'desktop_bridge',
      permissionEnvelope: 'read_only',
      mayExecuteWithoutConsent: true,
      receiptRequired: true,
    },
    {
      id: 'laptop_reasoning_status',
      label: 'Laptop Reasoning',
      method: 'GET',
      href: '/api/live-status',
      lane: 'laptop-hardware',
      permissionEnvelope: 'read_only',
      mayExecuteWithoutConsent: true,
      receiptRequired: true,
    },
    {
      id: 'sovereign_room_status',
      label: 'Sovereign Room',
      method: 'GET',
      href: '/api/sovereign-room/marathon',
      lane: 'sovereign_room',
      permissionEnvelope: 'read_only',
      mayExecuteWithoutConsent: true,
      primaryAction: 'inspect_sovereign_room',
      directExecutionAllowed: false,
      endpointExecutesRuntime: false,
      receiptRequired: true,
    },
    {
      id: 'sovereign_room_receipt_refresh',
      label: 'Refresh Room Receipt',
      method: 'POST',
      href: '/workflow/sovereign-room-marathon',
      externalWorkflowRoute: 'POST /workflow/sovereign-room-marathon',
      lane: 'sovereign_room',
      permissionEnvelope: 'read_only_receipt_refresh',
      mayExecuteWithoutConsent: true,
      primaryAction: 'refresh_sovereign_room_receipt',
      defaultTaskLane: 'local',
      defaultTaskTag: 'local',
      cloudEscalationAllowed: false,
      maxCandidates: 8,
      directExecutionAllowed: false,
      endpointExecutesRuntime: false,
      receiptRequired: true,
    },
    {
      id: 'desktop_control_plan',
      label: 'Desktop Plan',
      method: 'POST',
      href: '/api/desktop-control/plan',
      lane: 'fara_gui_grounding',
      permissionEnvelope: 'read_only_plan',
      mayExecuteWithoutConsent: false,
      receiptRequired: true,
    },
    {
      id: 'queue_improvement_run',
      label: 'Queue Run',
      method: 'POST',
      href: '/api/improvement-runs',
      lane: 'improvement_run_queue',
      permissionEnvelope: 'receipt_backed_queue',
      mayExecuteWithoutConsent: true,
      receiptRequired: true,
    },
    {
      id: 'fara_peer_automation_pulse',
      label: 'Fara Pulse',
      method: 'POST',
      href: '/api/fara-peer-chat/automation-pulse',
      lane: 'fara_peer_chat',
      permissionEnvelope: 'read_only',
      mayExecuteWithoutConsent: true,
      receiptRequired: true,
    },
    {
      id: 'fara_peer_automation_schedule',
      label: 'Pulse Schedule',
      method: 'POST',
      href: '/api/fara-peer-chat/automation-schedule',
      lane: 'fara_peer_chat',
      permissionEnvelope: 'read_only_receipt_schedule',
      mayExecuteWithoutConsent: true,
      receiptRequired: true,
    },
    {
      id: 'holoclaw_runtime_bridge_status',
      label: 'HoloClaw Status',
      method: 'GET',
      href: '/api/holoclaw/runtime-bridge',
      lane: 'holoclaw_runtime',
      permissionEnvelope: 'read_only',
      mayExecuteWithoutConsent: true,
      endpointExecutesRuntime: false,
      receiptRequired: true,
    },
    {
      id: 'holoclaw_runtime_bridge_workflow',
      label: 'Stage HoloClaw',
      method: 'POST',
      href: '/workflow/holoclaw-runtime-bridge',
      externalWorkflowRoute: 'POST /workflow/holoclaw-runtime-bridge',
      lane: 'holoclaw_runtime',
      permissionEnvelope: 'guarded_execute',
      approvalRequired: true,
      mayExecuteWithoutConsent: false,
      endpointExecutesRuntime: false,
      planOnly: true,
      holoGateRequired: true,
      receiptRequired: true,
    },
    {
      id: 'context_capsule',
      label: 'Context Capsule',
      method: 'GET',
      href: '/api/cockpit/capsule',
      lane: 'context_carry',
      permissionEnvelope: 'read_only',
      mayExecuteWithoutConsent: true,
      receiptRequired: true,
    },
    {
      id: 'source_owned_state',
      label: 'Source State',
      method: 'GET',
      href: '/api/cockpit/capsule',
      lane: 'source_owned_state',
      primaryAction: 'inspect_source_owned_state',
      permissionEnvelope: 'read_only_source_contract',
      mayExecuteWithoutConsent: true,
      receiptRequired: true,
    },
    {
      id: 'browser_session_state',
      label: 'Browser Session',
      method: 'GET',
      href: '/api/browser-session/state',
      scopedHrefTemplate: '/api/browser-session/state?sessionId=:sessionId',
      lane: 'browser_session',
      permissionEnvelope: 'read_only_snapshot',
      mayExecuteWithoutConsent: true,
      receiptRequired: true,
    },
    {
      id: 'operator_terminal_session',
      label: 'Terminal Session',
      method: 'GET',
      href: '/api/operator-terminal/session',
      lane: 'operator_terminal',
      permissionEnvelope: 'read_only_projection',
      mayExecuteWithoutConsent: true,
      receiptRequired: true,
    },
    {
      id: 'operator_terminal_events',
      label: 'Terminal Events',
      method: 'GET',
      href: '/api/operator-terminal/events',
      lane: 'operator_terminal',
      permissionEnvelope: 'read_only_event_stream',
      mayExecuteWithoutConsent: true,
      receiptRequired: true,
    },
  ];
  const windowActionCards = buildWindowActionCards(windowAwareness);
  const toolPreflightCards = buildToolPreflightCards(windowAwareness);
  const actionCards = [...baseActionCards, ...toolPreflightCards, ...windowActionCards];
  const preflightPaths = toolPreflightCards.map((card) => card.preflightPath);
  return {
    schemaVersion: BRITTNEY_COCKPIT_CAPSULE_SCHEMA,
    source: BRITTNEY_COCKPIT_SOURCE,
    generatedAt: new Date().toISOString(),
    mode: 'read_only_operator_capsule',
    status: 'ready',
    summary: {
      runtimeTruthStatus,
      routeStatus,
      contextCarryStatus,
      sourceOwnedStateStatus,
      sourceOwnedDomainCount: sourceOwnedState.summary.domainCount,
      sourceOwnedSelectedTaskId: sourceOwnedState.boardTasks.selectedTaskId,
      desktopBridgeStatus,
      laptopReasoningStatus,
      faraAutomationStatus,
      browserSessionStateStatus,
      browserSessionSnapshotStatus: browserSessionState.snapshotStatus,
      browserSessionSnapshotUpdatedAt: browserSessionState.updatedAt,
      browserTranscriptEntryCount,
      browserEvidenceLedgerCount: browserSessionState.evidenceLedger.length,
      activeChatWorkspaceId: browserSessionState.activeChatId,
      expandedChatWorkspaceCount: browserSessionState.expandedChatIds.length,
      operatorTerminalStatus,
      windowAwarenessStatus,
      toolActionStatus,
      laptopReasoningLane: laptopReasoning.lane,
      laptopReasoningModelInvocationPerformed: laptopReasoning.modelInvocationPerformed,
      laptopReasoningGpuStatus: laptopReasoning.gpuStatus,
      laptopReasoningPingbackStatus: laptopReasoning.pingbackStatus,
      sovereignRoomStatus,
      sovereignRoomMarathonStatus: sovereignRoomMarathon.status,
      sovereignRoomReceiptObserved: sovereignRoomMarathon.receiptObserved,
      sovereignRoomMatchedCandidateCount: sovereignRoomMarathon.matchedCandidateCount,
      sovereignRoomSelectedTaskId: sovereignRoomMarathon.selectedTaskId,
      sovereignRoomSelectedTaskTitle: sovereignRoomMarathon.selectedTaskTitle,
      holoclawRuntimeStatus,
      holoclawRuntimeBridgeStatus: holoclawRuntimeBridge.status,
      holoclawRuntimeBridgePendingApprovalCount: holoclawRuntimeBridge.pendingApprovalCount,
      holoclawRuntimeBridgeReceiptObserved: holoclawRuntimeBridge.receiptObserved,
      operatorTerminalRunCardCount: operatorTerminal.runCards.length,
      browserRefreshRecoveryStatus: operatorTerminal.refreshRecovery.status,
      evidenceLedgerStatus: operatorTerminal.refreshRecovery.evidenceLedgerStatus,
      cockpitLaneCount: cockpitLanes.length,
      actionCardCount: actionCards.length,
      windowActionCardCount: windowActionCards.length,
      preflightPathCount: preflightPaths.length,
      latestImprovementRunId: latestRun?.runId || '',
      latestFaraPeerPulseId: faraAutomation.latestPulse?.pulseId || '',
      faraPeerAutomationScheduleStatus: faraAutomation.schedule.status,
      latestFaraPeerPromotionId: faraAutomation.latestPromotion?.promotionId || '',
    },
    route: {
      ...liveStatus.route,
      cockpitCapsuleEndpoint: 'GET /api/cockpit/capsule',
      operatorTerminalSessionEndpoint: 'GET /api/operator-terminal/session',
      operatorTerminalEventsEndpoint: 'GET /api/operator-terminal/events',
      sovereignRoomMarathonEndpoint: 'GET /api/sovereign-room/marathon',
      sovereignRoomMarathonWorkflowEndpoint: 'POST /workflow/sovereign-room-marathon',
      sovereignRoomMarathonLatestEndpoint: 'GET /workflow/sovereign-room-marathon/latest',
    },
    avatar: liveStatus.avatar,
    cockpitLanes,
    actionCards,
    sourceOwnedState,
    sovereignRoomMarathon,
    holoclawRuntimeBridge,
    faraPeerAutomation: faraAutomation,
    laptopReasoning,
    windowAwareness,
    preflightPaths,
    operatorTerminal,
    browserSessionState,
    contextCapsuleTemplate: {
      schemaVersion: 'hololand.holoshell.context-capsule.v0.1.0',
      requiredFields: ['goal', 'files_read', 'files_changed', 'tests_run', 'receipts', 'blockers', 'next_command'],
      identityCarry: ['surface', 'agent_family', 'current_lane', 'room_task_id', 'handoff_source'],
      memoryInputs: ['knowledge_store', 'GOLD', 'repo_files', 'receipts', 'room_board'],
      sourceOwnedStateRequires: ['agents', 'files', 'worlds', 'receipts', 'board_tasks'],
      graphRagPrompt: 'Ask the knowledge graph for prior decisions before guessing when runtime truth is unknown.',
    },
    safety: {
      permissionDefault: 'read_only',
      desktopMutationRequires: ['desktop_control_plan', 'laptop_bridge_preflight', 'fresh_gesture_proof', 'consent_token', 'execution_receipt'],
      admittedExecutorActions: ['open_url'],
      allOtherDesktopActionsRemainPlanOnly: true,
      browserTerminalCouplingRequires: ['shared_session_id', 'terminal_receipt', 'context_capsule', 'hologate_receipt'],
      sovereignRoomClaimRequires: ['terminal_or_control_daemon', 'local_task_match', 'execution_receipt_before_done'],
      sovereignRoomBrowserClaimAllowed: false,
      holoclawRuntimeRequires: ['status_receipt', 'workflow_approval', 'runtime_env_flag', 'execution_receipt'],
      holoclawDirectExecutionAllowed: false,
      sourceRequiredBeforeProjection: true,
      sourceFormatGapNamedBeforeAdapterWork: true,
      legacyUiMayNotOwnBehavior: true,
      secretsIncluded: false,
      rawWindowTitlesIncluded: windowAwareness.safety.rawWindowTitlesIncluded,
      rawWindowTitlesHidden: windowAwareness.safety.rawWindowTitlesHidden,
      destructiveActionsTaken: windowAwareness.safety.destructiveActionsTaken,
      desktopAutomationExecuted: false,
    },
    receipts: {
      receiptsDir: liveStatus.receiptsDir,
      pendingConsentCount: liveStatus.pendingConsentCount,
      recentExecutionCount: liveStatus.recentExecutionCount,
      latestImprovementRunId: latestRun?.runId || '',
      latestImprovementRunReceipt: latestRun?.receiptPath || null,
      latestFaraPeerPulseId: faraAutomation.latestPulse?.pulseId || '',
      latestFaraPeerPulseReceipt: faraAutomation.latestPulse?.receiptPath || null,
      latestFaraPeerPromotionId: faraAutomation.latestPromotion?.promotionId || '',
      latestFaraPeerPromotionReceipt: faraAutomation.latestPromotion?.receiptPath || null,
      latestSovereignRoomMarathonReceipt: sovereignRoomMarathon.receiptPath,
      latestSovereignRoomMarathonStatus: sovereignRoomMarathon.status,
      latestHoloClawRuntimeBridgeReceipt: holoclawRuntimeBridge.receiptPath,
      latestHoloClawRuntimeBridgeStatus: holoclawRuntimeBridge.status,
      operatorTerminalReceiptHash: operatorTerminal.terminal.receiptHash,
      operatorTerminalReceiptStatus: operatorTerminal.terminal.receiptStatus,
      operatorTerminalRunCardCount: operatorTerminal.runCards.length,
      evidenceLedgerStatus: operatorTerminal.refreshRecovery.evidenceLedgerStatus,
      browserSessionSnapshotStatus: browserSessionState.snapshotStatus,
      browserSessionSnapshotReceipt: browserSessionState.output,
      browserSessionSnapshotUpdatedAt: browserSessionState.updatedAt,
      browserEvidenceLedgerCount: browserSessionState.evidenceLedger.length,
      sourceOwnedStateStatus: sourceOwnedState.status,
      legacyWindowInventoryHash: windowAwareness.receipts.legacyWindowInventoryHash,
      operatorBriefHash: windowAwareness.receipts.operatorBriefHash,
    },
    destructiveActionsTaken: windowAwareness.safety.destructiveActionsTaken,
    desktopAutomationExecuted: false,
    nextSafeStep: 'Preserve source-owned agents, files, worlds, receipts, and board tasks before projection; inspect Sovereign Room status before claiming local work, claim only in the guarded terminal/control-daemon path, inspect HoloClaw runtime status before staging agent work, refresh terminal evidence when stale, then request desktop execution only through preflight -> consent-token -> receipt.',
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

  if (req.method === 'GET' && path === '/favicon.ico') {
    res.writeHead(204);
    res.end();
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

  if (req.method === 'GET' && path === '/api/live-status') {
    respond(res, liveStatusResponseEnvelope(buildLiveStatusSnapshot()));
    return;
  }

  if (req.method === 'GET' && path === '/api/holoclaw/runtime-bridge') {
    respond(res, holoclawRuntimeBridgeStatusSnapshot());
    return;
  }

  if (req.method === 'GET' && path === '/api/holoclaw/session-object') {
    const requestedSessionId = url.searchParams.get('sessionId') || null;
    respond(res, buildHoloClawSessionObject({
      sessionId: requestedSessionId,
      scoped: Boolean(requestedSessionId),
    }));
    return;
  }

  if (req.method === 'GET' && path === '/api/sovereign-room/marathon') {
    respond(res, sovereignRoomMarathonStatusSnapshot());
    return;
  }

  if (req.method === 'GET' && path === '/workflow/sovereign-room-marathon/latest') {
    respond(res, readJsonFileIfPresent(SOVEREIGN_ROOM_MARATHON_RECEIPT) || {
      schemaVersion: SOVEREIGN_ROOM_MARATHON_SCHEMA,
      status: 'not_checked',
      receiptObserved: false,
      claimRequested: false,
      claimAttempted: false,
      claimSucceeded: false,
      directExecutionAllowed: false,
      endpointExecutesRuntime: false,
      destructiveActionsTaken: false,
      desktopAutomationExecuted: false,
      receiptRequired: true,
    });
    return;
  }

  if (req.method === 'POST' && path === '/workflow/sovereign-room-marathon') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        respond(res, stageSovereignRoomMarathonForChat(payload));
      } catch (err) {
        respond(res, {
          schemaVersion: 'hololand.holoshell.sovereign-room-marathon-response.v0.1.0',
          error: String(err.message || err).slice(0, 300),
          directExecutionAllowed: false,
          endpointExecutesRuntime: false,
          destructiveActionsTaken: false,
          desktopAutomationExecuted: false,
          receiptRequired: true,
        }, 500);
      }
    });
    return;
  }

  if (req.method === 'GET' && path === '/workflow/holoclaw-runtime-bridge/latest') {
    respond(res, readJsonFileIfPresent(HOLOCLAW_RUNTIME_BRIDGE_RECEIPT) || {
      schemaVersion: HOLOCLAW_RUNTIME_BRIDGE_SCHEMA,
      status: 'not_staged',
      receiptObserved: false,
      directExecutionAllowed: false,
      endpointExecutesRuntime: false,
      destructiveActionsTaken: false,
      desktopAutomationExecuted: false,
    });
    return;
  }

  if (req.method === 'POST' && path === '/workflow/holoclaw-runtime-bridge') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        respond(res, stageHoloClawRuntimeBridgeForChat(payload));
      } catch (err) {
        respond(res, {
          schemaVersion: 'hololand.holoshell.holoclaw-runtime-bridge-response.v0.1.0',
          error: String(err.message || err).slice(0, 300),
          directExecutionAllowed: false,
          endpointExecutesRuntime: false,
          destructiveActionsTaken: false,
          desktopAutomationExecuted: false,
        }, 500);
      }
    });
    return;
  }

  if (req.method === 'GET' && path === '/api/fara-peer-chat/automation-pulses') {
    respond(res, {
      schemaVersion: 'hololand.holoshell.fara-peer-automation-history.v0.1.0',
      items: faraPeerAutomationHistory(),
      destructiveActionsTaken: false,
      desktopAutomationExecuted: false,
      receiptRequired: true,
    });
    return;
  }

  if (req.method === 'GET' && path === '/api/fara-peer-chat/automation-schedule') {
    respond(res, {
      schemaVersion: 'hololand.holoshell.fara-peer-automation-schedule-response.v0.1.0',
      schedule: faraPeerAutomationScheduleSnapshot(),
      destructiveActionsTaken: false,
      desktopAutomationExecuted: false,
      receiptRequired: true,
    });
    return;
  }

  if (req.method === 'POST' && path === '/api/fara-peer-chat/automation-schedule') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const result = configureFaraPeerAutomationSchedule(payload);
        respond(res, {
          schemaVersion: 'hololand.holoshell.fara-peer-automation-schedule-response.v0.1.0',
          status: result.schedule.status,
          schedule: result.schedule,
          immediatePulse: result.immediatePulse,
          hiddenAutomationAllowed: false,
          destructiveActionsTaken: false,
          desktopAutomationExecuted: false,
          receiptRequired: true,
        });
      } catch (err) {
        respond(res, {
          error: String(err.message || err).slice(0, 300),
          destructiveActionsTaken: false,
          desktopAutomationExecuted: false,
        }, 400);
      }
    });
    return;
  }

  if (req.method === 'GET' && path === '/api/fara-peer-chat/promotions') {
    respond(res, {
      schemaVersion: 'hololand.holoshell.fara-peer-proposal-promotion-history.v0.1.0',
      items: faraPeerAutomationPromotionHistory(),
      destructiveActionsTaken: false,
      desktopAutomationExecuted: false,
      receiptRequired: true,
    });
    return;
  }

  if (req.method === 'POST' && path === '/api/fara-peer-chat/promote-proposal') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const receipt = promoteFaraPeerAutomationProposal(payload);
        respond(res, {
          schemaVersion: 'hololand.holoshell.fara-peer-proposal-promotion-response.v0.1.0',
          status: receipt.status,
          promotionId: receipt.promotionId,
          pulseId: receipt.pulseId,
          operation: receipt.operation,
          promotedRunId: receipt.promotedRunId,
          permissionEnvelope: receipt.permissionEnvelope,
          approvalRequiredForDesktopAutomation: receipt.approvalRequiredForDesktopAutomation,
          hiddenAutomationAllowed: receipt.hiddenAutomationAllowed,
          destructiveActionsTaken: receipt.destructiveActionsTaken,
          desktopAutomationExecuted: receipt.desktopAutomationExecuted,
          queuedRun: receipt.queuedRun,
          nextSafeStep: receipt.nextSafeStep,
          receipt,
        });
      } catch (err) {
        respond(res, {
          error: String(err.message || err).slice(0, 300),
          proposal: err.proposal || null,
          destructiveActionsTaken: false,
          desktopAutomationExecuted: false,
        }, err.statusCode || 500);
      }
    });
    return;
  }

  if (req.method === 'POST' && path === '/api/fara-peer-chat/automation-pulse') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const receipt = buildFaraPeerAutomationPulse(payload);
        respond(res, {
          schemaVersion: 'hololand.holoshell.fara-peer-automation-response.v0.1.0',
          status: receipt.status,
          pulseId: receipt.pulseId,
          objective: receipt.objective,
          cadence: receipt.cadence,
          participants: receipt.participants,
          lane: receipt.lane,
          permissionEnvelope: receipt.permissionEnvelope,
          approvalRequired: receipt.approvalRequired,
          automationMode: receipt.automationMode,
          hiddenAutomationAllowed: receipt.hiddenAutomationAllowed,
          desktopMutationAllowed: receipt.desktopMutationAllowed,
          destructiveActionsTaken: receipt.destructiveActionsTaken,
          desktopAutomationExecuted: receipt.desktopAutomationExecuted,
          nextSafeActions: receipt.nextSafeActions,
          proposals: receipt.nextSafeActions,
          receipt,
        });
      } catch (err) {
        respond(res, { error: String(err.message || err).slice(0, 300), destructiveActionsTaken: false }, 400);
      }
    });
    return;
  }

  if (req.method === 'GET' && path === '/api/cockpit/capsule') {
    respond(res, buildBrittneyCockpitCapsule());
    return;
  }

  if (req.method === 'GET' && path === '/api/browser-session/state') {
    const requestedSessionId = url.searchParams.get('sessionId');
    respond(res, readBrowserSessionStateSnapshot({
      sessionId: requestedSessionId || sharedHoloShellSessionId(),
      scoped: Boolean(requestedSessionId),
    }));
    return;
  }

  if (req.method === 'POST' && path === '/api/browser-session/state') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const querySessionId = url.searchParams.get('sessionId');
        const requestedSessionId = querySessionId || payload.sessionId || null;
        const snapshot = writeBrowserSessionStateSnapshot(payload, {
          sessionId: requestedSessionId || sharedHoloShellSessionId(),
          scoped: Boolean(querySessionId),
        });
        respond(res, {
          ...snapshot,
          schemaVersion: BROWSER_SESSION_STATE_SCHEMA,
          status: 'saved',
          destructiveActionsTaken: false,
          desktopAutomationExecuted: false,
          receiptRequired: true,
        });
      } catch (err) {
        respond(res, { error: String(err.message || err).slice(0, 300), destructiveActionsTaken: false }, 400);
      }
    });
    return;
  }

  if (req.method === 'GET' && path === '/api/operator-terminal/session') {
    respond(res, buildOperatorTerminalSession());
    return;
  }

  if (req.method === 'GET' && path === '/api/operator-terminal/events') {
    respond(res, buildOperatorTerminalEventStream({ append: true }));
    return;
  }

  if (req.method === 'POST' && path === '/api/operator-terminal/report') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const report = writeOperatorTerminalReport(normalizeOperatorTerminalReport(payload));
        respond(res, {
          schemaVersion: 'hololand.holoshell.operator-terminal-report-response.v0.1.0',
          status: report.summary?.status || 'reported',
          receiptHash: report.receipt?.terminalHash || null,
          output: report.output,
          destructiveActionsTaken: false,
          desktopAutomationExecuted: false,
          receiptRequired: true,
          receipt: report,
        });
      } catch (err) {
        respond(res, { error: String(err.message || err).slice(0, 300), destructiveActionsTaken: false }, 400);
      }
    });
    return;
  }

  if (req.method === 'GET' && path === '/api/improvement-runs') {
    respond(res, {
      schemaVersion: 'hololand.holoshell.improvement-run-history.v0.1.0',
      items: improvementRunHistory(),
      executions: improvementExecutionHistory(),
    });
    return;
  }

  const improvementRunDetail = /^\/api\/improvement-runs\/([^/]+)$/u.exec(path);
  if (req.method === 'GET' && improvementRunDetail) {
    const runId = decodeURIComponent(improvementRunDetail[1]);
    const receipt = findImprovementRunReceipt(runId);
    if (!receipt) {
      respond(res, { error: 'improvement_run_not_found', runId }, 404);
      return;
    }
    const executions = improvementExecutionHistory(runId);
    const totalExecutedRunCount = executions.reduce((sum, execution) => sum + (execution.executedRunCount || 0), 0);
    respond(res, {
      schemaVersion: 'hololand.holoshell.improvement-run-detail.v0.1.0',
      runId,
      receipt,
      executions,
      totalExecutedRunCount,
      remainingRunCount: Math.max(0, (receipt.queuedRunCount || 0) - totalExecutedRunCount),
      destructiveActionsTaken: false,
    });
    return;
  }

  if (req.method === 'GET' && path === '/api/desktop-control/bridge') {
    respond(res, desktopBridgeStatusSnapshot());
    return;
  }

  if (req.method === 'POST' && path === '/api/desktop-control/bridge/report') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const report = writeDesktopBridgeReport(normalizeDesktopBridgeReport(payload));
        respond(res, {
          schemaVersion: 'hololand.holoshell.desktop-bridge-report-response.v0.1.0',
          status: report.status,
          reportId: report.reportId,
          source: report.source,
          hostRole: report.hostRole,
          destructiveActionsTaken: false,
          desktopAutomationExecuted: false,
          approvalRequiredForDesktopAutomation: true,
          receipt: report,
        });
      } catch (err) {
        respond(res, { error: String(err.message || err).slice(0, 300), destructiveActionsTaken: false }, 400);
      }
    });
    return;
  }

  if (req.method === 'POST' && path === '/api/laptop-reasoning/report') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const report = writeLaptopReasoningResultReport(normalizeLaptopReasoningResultReport(payload));
        respond(res, {
          schemaVersion: 'hololand.holoshell.laptop-reasoning-report-response.v0.1.0',
          status: report.status || report.summary?.status || 'reported',
          resultId: report.resultId || report.summary?.resultId || '',
          dispatchId: report.summary?.dispatchId || report.inputDispatch?.dispatchId || '',
          lane: report.summary?.lane || report.inputDispatch?.lane || 'laptop-hardware',
          modelInvocationPerformed: Boolean(report.summary?.modelInvocationPerformed),
          gpuStatus: report.summary?.laptopGpuStatus || report.targetHostChecks?.gpu?.status || 'not_reported',
          gpuSummary: report.summary?.laptopGpuSummary || report.targetHostChecks?.gpu?.summary || '',
          brittneyPingbackStatus: report.summary?.brittneyPingbackStatus || report.brittneyPingback?.status || '',
          destructiveActionsTaken: false,
          desktopAutomationExecuted: false,
          receiptRequired: true,
          receipt: report,
        });
      } catch (err) {
        respond(res, { error: String(err.message || err).slice(0, 300), destructiveActionsTaken: false }, 400);
      }
    });
    return;
  }

  if (req.method === 'POST' && path === '/api/window-awareness/report') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const report = writeWindowAwarenessReport(normalizeWindowAwarenessReport(payload));
        respond(res, {
          schemaVersion: 'hololand.holoshell.window-awareness-report-response.v0.1.0',
          status: report.summary?.visibleWindowCount ? 'windows_visible' : 'reported',
          visibleWindowCount: report.summary?.visibleWindowCount || 0,
          peerWindowCount: report.summary?.peerWindowCount || 0,
          shellWindowCount: report.summary?.shellWindowCount || 0,
          rawWindowTitlesIncluded: false,
          output: report.output,
          destructiveActionsTaken: false,
          desktopAutomationExecuted: false,
          receiptRequired: true,
          receipt: report,
        });
      } catch (err) {
        respond(res, { error: String(err.message || err).slice(0, 300), destructiveActionsTaken: false }, 400);
      }
    });
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
        // Relational turns win over the status/next-steps override: the founder talking WITH
        // Brittney gets HER reply, never a substituted status card (the "system" in "founder and
        // system" used to trip looksLikeStatusIntent and bury her answer).
        const relational = looksLikeRelationalIntent(message);
        const liveStatus = !relational && (looksLikeStatusIntent(message) || looksLikeNextStepsIntent(message))
          ? buildLiveStatusSnapshot()
          : null;
        // If the daimon has emerged, prime Brittney with its remembered context (rehydration).
        const preamble = await daimonRehydration();
        const prompt = [preamble, message]
          .filter(Boolean)
          .join('\n\n');
        const args = [turnScript, '--prompt', prompt, '--routing-intent', message, '--json'];
        if (selfTest) args.push('--self-test');
        if (relational) args.push('--relational');
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
        const receiptProposals = (receipt.proposals || []).map(exposeBrittneyProposal);
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
            intent: desktopControl.intent?.raw || message,
            primaryAction: desktopControl.summary?.primaryAction || desktopControl.intent?.primaryAction || '',
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

  // ── POST /api/improvement-runs — queue a receipt-backed improvement batch.
  // This endpoint only records routing and guardrails; execution remains a later,
  // receipt-gated step. Fara peer chat stays free/read-only; Fara desktop
  // automation is selected only through the guarded plan lane.
  const improvementRunExecute = /^\/api\/improvement-runs\/([^/]+)\/execute$/u.exec(path);
  if (req.method === 'POST' && improvementRunExecute) {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const runId = decodeURIComponent(improvementRunExecute[1]);
        const receipt = buildImprovementExecutionReceipt(runId, payload);
        respond(res, {
          schemaVersion: 'hololand.holoshell.improvement-execution-response.v0.1.0',
          status: receipt.status,
          executionId: receipt.executionId,
          sourceRunId: receipt.sourceRunId,
          executionMode: receipt.executionMode,
          requestedExecutionCount: receipt.requestedExecutionCount,
          plannedFixCount: receipt.plannedFixCount,
          executedRunCount: receipt.executedRunCount,
          totalExecutedRunCount: receipt.totalExecutedRunCount,
          remainingRunCount: receipt.remainingRunCount,
          destructiveActionsTaken: receipt.destructiveActionsTaken,
          desktopAutomationExecuted: receipt.desktopAutomationExecuted,
          approvalRequiredForDesktopAutomation: receipt.approvalRequiredForDesktopAutomation,
          gpuBalancePlan: receipt.gpuBalancePlan,
          desktopBridge: receipt.desktopBridge,
          runResults: receipt.runResults,
          aggregate: receipt.aggregate,
          lessons: receipt.lessons,
          holotuneTrace: receipt.holotuneTrace,
          nextSafeStep: receipt.nextSafeStep,
          receipt,
          proposals: [
            {
              operation: 'review_codebase_fix_shakedown_receipt',
              lane: 'receipt_gate',
              receiptRequired: true,
              executionId: receipt.executionId,
            },
            {
              operation: receipt.remainingRunCount > 0 ? 'land_next_codebase_fix_batch' : 'queue_next_codebase_fix_batch',
              lane: 'improvement_run_queue',
              receiptRequired: true,
              runId: receipt.sourceRunId,
            },
          ],
        });
      } catch (err) {
        respond(res, { error: String(err.message || err).slice(0, 300) }, err.statusCode || 500);
      }
    });
    return;
  }

  if (req.method === 'POST' && path === '/api/improvement-runs') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const receipt = buildImprovementRunReceipt(payload);
        respond(res, {
          schemaVersion: 'hololand.holoshell.improvement-run-response.v0.1.0',
          status: receipt.status,
          runId: receipt.runId,
          objective: receipt.objective,
          executionMode: receipt.executionMode,
          requestedRunCount: receipt.requestedRunCount,
          queuedRunCount: receipt.queuedRunCount,
          destructiveActionsTaken: receipt.destructiveActionsTaken,
          approvalRequiredForDesktopAutomation: receipt.approvalRequiredForDesktopAutomation,
          codebaseFixPolicy: receipt.codebaseFixPolicy,
          holotuneTracePolicy: receipt.holotuneTracePolicy,
          routing: receipt.routing,
          routingSummary: receipt.routingSummary,
          loop: receipt.loop,
          measurementPlan: receipt.measurementPlan,
          nextSafeStep: receipt.nextSafeStep,
          receipt,
          proposals: [
            {
              operation: 'review_codebase_fix_shakedown_queue_receipt',
              lane: 'receipt_gate',
              receiptRequired: true,
              runId: receipt.runId,
            },
            {
              operation: 'attach_codebase_fix_evidence',
              lane: 'improvement_run_queue',
              receiptRequired: true,
              runId: receipt.runId,
            },
          ],
        });
      } catch (err) {
        respond(res, { error: String(err.message || err).slice(0, 300) }, 500);
      }
    });
    return;
  }

  // ── POST /api/desktop-control/plan — plan-only desktop control. Brittney is the
  // operator surface; Fara is the GUI-grounding lane here. Fara's peer chat is
  // read-only/free; this endpoint never clicks,
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
  if (FARA_PEER_AUTOMATION_DEFAULT_INTERVAL_MS > 0) {
    configureFaraPeerAutomationSchedule({
      intervalMs: FARA_PEER_AUTOMATION_DEFAULT_INTERVAL_MS,
      objective: FARA_PEER_AUTOMATION_DEFAULT_OBJECTIVE,
      cadence: 'env-scheduled',
      runImmediately: false,
    });
    console.log(`  Fara/Brittney pulse schedule: every ${faraPeerAutomationScheduleState.intervalMs}ms`);
  }
  if (!existsSync(HTML_PATH)) {
    console.warn('  Warning: operate-room.html not found. Run compile.mjs first.');
  }
});
