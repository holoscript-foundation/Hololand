#!/usr/bin/env node
/**
 * HoloShell Operate Room — stale process scanner
 *
 * Detects stale machine processes and writes .preflight.json files to
 * RECEIPTS_DIR. The operate-room dashboard (serve.mjs @ localhost:8747)
 * surfaces these as "Pending Consents"; operator approves via the Approve
 * button which fires Phase A execute receipt.
 *
 * Scheduled via Windows Task Scheduler (Tier B, per F.111):
 *   Task name: HoloShell-StaleScanner
 *   Trigger:   every 5 minutes
 *   Command:   node C:\...\Hololand\packages\holoshell\scanner.mjs
 *
 * Dedup: skips writing if all detected PIDs are already in a pending preflight
 * (preflight exists without a matching execution receipt).
 */

import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const RECEIPTS_DIR =
  process.env.HOLOSHELL_RECEIPTS_DIR ??
  'C:/Users/Josep/.ai-ecosystem/runtime/holoshell/receipts';

// Stale thresholds
const STALE_GIT_MS   = 5 * 60_000;   // git.exe older than 5 min
const STALE_AGENT_MS = 30 * 60_000;  // agent node processes older than 30 min

// ── Detection ─────────────────────────────────────────────────────────────────

function detectStaleGit() {
  const ps = [
    'Get-CimInstance Win32_Process',
    "| Where-Object { $_.Name -eq 'git.exe' }",
    '| Select-Object ProcessId, CommandLine,',
    '  @{Name="AgeMs";Expression={[int]((Get-Date) - $_.CreationDate).TotalMilliseconds}}',
    '| ConvertTo-Json -Compress',
  ].join(' ');
  try {
    const raw = execSync(`powershell -NonInteractive -Command "${ps}"`, {
      encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 12_000,
    }).trim();
    if (!raw || raw === 'null') return [];
    const items = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [JSON.parse(raw)];
    return items
      .filter((p) => typeof p.AgeMs === 'number' && p.AgeMs > STALE_GIT_MS)
      .map((p) => ({
        pid:            Number(p.ProcessId),
        ageMs:          p.AgeMs,
        reason:         gitReason(String(p.CommandLine ?? '')),
        commandPreview: String(p.CommandLine ?? '').slice(0, 100),
      }));
  } catch { return []; }
}

function detectStaleAgentNodes() {
  // Node processes running long-lived agent patterns (Claude Desktop helper, MCP servers)
  const knownAgentPatterns = [
    'holoshell', 'holoscript', 'mcp-server', 'claude-desktop',
    'serve.mjs', 'compile.mjs',
  ];
  const ps = [
    'Get-CimInstance Win32_Process',
    "| Where-Object { $_.Name -eq 'node.exe' }",
    '| Select-Object ProcessId, CommandLine,',
    '  @{Name="AgeMs";Expression={[int]((Get-Date) - $_.CreationDate).TotalMilliseconds}}',
    '| ConvertTo-Json -Compress',
  ].join(' ');
  try {
    const raw = execSync(`powershell -NonInteractive -Command "${ps}"`, {
      encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 12_000,
    }).trim();
    if (!raw || raw === 'null') return [];
    const items = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [JSON.parse(raw)];
    return items
      .filter((p) => {
        if (typeof p.AgeMs !== 'number' || p.AgeMs <= STALE_AGENT_MS) return false;
        const cmd = String(p.CommandLine ?? '').toLowerCase();
        // Only flag if it matches a known agent script pattern
        return knownAgentPatterns.some((pat) => cmd.includes(pat));
      })
      .map((p) => ({
        pid:            Number(p.ProcessId),
        ageMs:          p.AgeMs,
        reason:         'agent_node_long_running',
        commandPreview: String(p.CommandLine ?? '').slice(0, 100),
      }));
  } catch { return []; }
}

function gitReason(cmd) {
  if (cmd.includes('--ignored')) return 'git_status_ignored_stale';
  if (cmd.includes('index.lock')) return 'git_lock_held';
  if (cmd.includes('fetch') || cmd.includes('pull') || cmd.includes('clone'))
    return 'git_network_stale';
  return 'git_long_running';
}

// ── Dedup ─────────────────────────────────────────────────────────────────────

function readReceipts(suffix) {
  if (!existsSync(RECEIPTS_DIR)) return [];
  try {
    return readdirSync(RECEIPTS_DIR)
      .filter((f) => f.endsWith(suffix))
      .map((f) => {
        try { return JSON.parse(readFileSync(join(RECEIPTS_DIR, f), 'utf8')); }
        catch { return null; }
      })
      .filter(Boolean);
  } catch { return []; }
}

function pendingPreflightPids() {
  const preflights  = readReceipts('.preflight.json');
  const executedIds = new Set(readReceipts('.execution.json').map((r) => r.preflightId));
  const pids = new Set();
  for (const pf of preflights) {
    if (!executedIds.has(pf.id)) {
      for (const t of (pf.targets ?? [])) pids.add(t.pid);
    }
  }
  return pids;
}

// ── Write preflight ───────────────────────────────────────────────────────────

function writePreflight(targets) {
  mkdirSync(RECEIPTS_DIR, { recursive: true });
  const now = new Date().toISOString();
  const id  = `preflight-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = {
    schema:      'hololand.holoshell.stale-process-cleanup.preflight.v0.1.0',
    id,
    operation:   'stale_process_cleanup',
    requestedBy: 'holoshell-scanner',
    timestamp:   now,
    targets,
  };
  const hash = createHash('sha256')
    .update(JSON.stringify({ ...payload, hash: undefined }))
    .digest('hex');
  writeFileSync(
    join(RECEIPTS_DIR, `${id}.preflight.json`),
    JSON.stringify({ ...payload, hash }, null, 2),
    'utf8'
  );
  return id;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const stale = [...detectStaleGit(), ...detectStaleAgentNodes()];

if (stale.length === 0) {
  process.exit(0);
}

const alreadyPending = pendingPreflightPids();
const newTargets = stale.filter((t) => !alreadyPending.has(t.pid));

if (newTargets.length === 0) {
  process.exit(0);
}

const id = writePreflight(newTargets);
process.stdout.write(`[holoshell-scanner] ${newTargets.length} stale process(es) → ${id}\n`);
process.exit(0);
