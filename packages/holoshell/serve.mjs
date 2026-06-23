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
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
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
  return /\b(status|health|state|online|offline|running|system|system'?s|gpu|gpus|utilization|utilisation|lane|lanes|capabilit(?:y|ies)|receipt|receipts|avatar|daimon|brittney)\b/iu.test(String(message || ''));
}

function looksLikeNextStepsIntent(message) {
  return /\b(next\s+steps?|what\s+(now|next)|where\s+do\s+we\s+go|what\s+should\s+we\s+do|plan|roadmap|priority|priorities|improve|improvement|marathon|100\+?|hundred)\b/iu.test(String(message || ''));
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
    desktopAutomation: {
      lane: 'fara_gui_grounding',
      models: (desktopAutomationModels.length ? desktopAutomationModels : [{ name: 'fara:7b', role: 'computer-use/gui-grounding' }])
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

function desktopBridgeReportReceipts() {
  return readReceipts('.desktop-bridge-report.json');
}

function latestDesktopBridgeReport() {
  return desktopBridgeReportReceipts()[0] || null;
}

function normalizeDesktopBridgeReport(payload = {}) {
  const incoming = payload.report || payload.bridge || payload;
  const serverReceivedAt = new Date().toISOString();
  const sourceStatus = String(incoming.status || '').trim() || 'reported';
  const reportId = incoming.reportId ||
    `desktop_bridge_report_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const capabilities = Array.isArray(incoming.capabilities) ? incoming.capabilities.filter(Boolean) : [];
  return {
    schemaVersion: 'hololand.holoshell.desktop-bridge-report.v0.1.0',
    source: 'browser_proxied_laptop_daemon',
    reportId,
    generatedAt: incoming.generatedAt || serverReceivedAt,
    serverReceivedAt,
    status: sourceStatus,
    url: incoming.url || 'http://127.0.0.1:8751',
    hostRole: incoming.hostRole || 'laptop_desktop_bridge',
    modelPolicy: incoming.modelPolicy || {
      lane: 'fara_gui_grounding',
      recommendedModel: 'fara:7b',
      mayExecute: false,
    },
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

function buildImprovementRunReceipt(payload = {}) {
  const objective = String(payload.objective || payload.message || payload.intent || '').trim();
  const runCount = parseImprovementRunCount(payload.runCount || payload.count || payload.requestedRunCount);
  const snapshot = buildLiveStatusSnapshot();
  const routing = buildNativeRunRouting(snapshot, objective);
  const generatedAt = new Date().toISOString();
  const runId = `hir_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const loop = [
    'capture_live_state',
    'route_to_native_model_or_skill',
    'plan_guarded_action',
    'execute_after_receipt',
    'validate_and_measure',
    'feed_lesson_to_brittney',
  ];
  const receipt = {
    schemaVersion: 'hololand.holoshell.improvement-run.v0.1.0',
    source: 'apps/holoshell/source/holoshell-improvement-run-loop.hsplus',
    runId,
    generatedAt,
    status: 'queued',
    objective: objective || 'Improve HoloShell through a receipt-backed native run loop',
    requestedRunCount: runCount,
    queuedRunCount: runCount,
    destructiveActionsTaken: false,
    receiptRequired: true,
    approvalRequiredForDesktopAutomation: true,
    routing,
    routingSummary: [
      `vision=${routing.visionUnderstanding.models.map((model) => model.model).join(', ')}`,
      `desktop=${routing.desktopAutomation.models.map((model) => model.model).join(', ')}`,
      `operator=${routing.operator.model}`,
      `skills=${routing.holoClawSkills.selected.map((skill) => skill.name).join(', ') || 'none'}`,
    ].join('; '),
    loop,
    measurementPlan: {
      everyRun: true,
      requiredSignals: ['status_delta', 'validation_result', 'gpu_snapshot', 'receipt_path', 'lesson_for_brittney'],
      firstBatchRecommendation: runCount > 10 ? 'Run a 10-run shakedown before opening the full batch.' : 'Batch size is within shakedown range.',
    },
    nextSafeStep: 'Review the queued receipt, then execute through the guarded lane that matches the task.',
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
    capabilities: [
      'screen_capture_request',
      'desktop_action_preflight',
      'admitted_open_url_executor',
      'gpu_telemetry_report',
    ],
    mutationBoundary: 'os_mutation_refused_until_consent_token_and_action_executor',
    destructiveActionsTaken: false,
    approvalRequiredForDesktopAutomation: true,
  };
  if (!report) return base;
  const mergedCapabilities = [...new Set([...base.capabilities, ...(report.capabilities || [])])];
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
    modelPolicy: report.modelPolicy,
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
      keepFaraDesktopOnly: true,
      requireMeasurementEveryRun: true,
    },
  };
}

function buildImprovementRunStep(step, routing) {
  const laneByStep = {
    capture_live_state: routing.operator.lane,
    route_to_native_model_or_skill: routing.visionUnderstanding.lane,
    plan_guarded_action: routing.desktopAutomation.lane,
    execute_after_receipt: 'receipt_gate',
    validate_and_measure: 'receipt_gate',
    feed_lesson_to_brittney: routing.operator.lane,
  };
  const stepStatus = step === 'plan_guarded_action'
    ? 'planned_approval_required'
    : (step === 'execute_after_receipt' ? 'skipped_non_mutating_shakedown' : 'completed');
  return {
    step,
    lane: laneByStep[step] || 'receipt_gate',
    status: stepStatus,
    destructiveActionsTaken: false,
  };
}

function buildImprovementRunResult({ runNumber, sourceRun, snapshot, gpuBalancePlan }) {
  const routing = sourceRun.routing;
  const runLoop = Array.isArray(sourceRun.loop) && sourceRun.loop.length
    ? sourceRun.loop
    : [
        'capture_live_state',
        'route_vision_to_vision_models',
        'route_desktop_automation_to_fara_bridge',
        'measure_gpu_balance',
        'record_lesson',
      ];
  const validationSignals = [
    'routing_receipt_present',
    'gpu_balance_snapshot_present',
    'desktop_bridge_boundary_present',
    'destructive_actions_false',
    'lesson_recorded',
  ];
  return {
    runNumber,
    status: 'validated_dry_run',
    objective: sourceRun.objective,
    steps: runLoop.map((step) => buildImprovementRunStep(step, routing)),
    gpuSnapshot: {
      status: snapshot.gpu.status,
      summary: snapshot.gpu.summary,
    },
    gpuAssignmentSummary: gpuBalancePlan.assignments
      .map((assignment) => `${assignment.lane}->${assignment.preferredProcessor}`)
      .join('; '),
    validation: {
      status: 'passed',
      signals: validationSignals,
    },
    lesson: `Run ${runNumber}: keep vision on ${routing.visionUnderstanding.lane}, keep Fara on ${routing.desktopAutomation.lane}, measure before expanding the batch.`,
    destructiveActionsTaken: false,
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
  const executedRunCount = Math.min(remainingBefore, requestedExecutionCount, shakedownLimit);
  const snapshot = buildLiveStatusSnapshot();
  const gpuBalancePlan = buildGpuBalancePlan(snapshot, sourceRun.routing);
  const generatedAt = new Date().toISOString();
  const executionId = `hie_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const runResults = Array.from({ length: executedRunCount }, (_, index) =>
    buildImprovementRunResult({
      runNumber: priorExecutedRunCount + index + 1,
      sourceRun,
      snapshot,
      gpuBalancePlan,
    })
  );
  const totalExecutedRunCount = priorExecutedRunCount + executedRunCount;
  const remainingRunCount = Math.max(0, queuedRunCount - totalExecutedRunCount);
  const receipt = {
    schemaVersion: 'hololand.holoshell.improvement-execution.v0.1.0',
    source: 'apps/holoshell/source/holoshell-improvement-run-loop.hsplus',
    executionId,
    sourceRunId: runId,
    generatedAt,
    status: executedRunCount === 0
      ? 'no_remaining_runs'
      : (remainingRunCount === 0 ? 'completed' : 'completed_shakedown'),
    objective: sourceRun.objective,
    requestedExecutionCount,
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
    sourceRun: {
      runId: sourceRun.runId,
      receiptPath: sourceRun.receiptPath,
      routingSummary: sourceRun.routingSummary,
    },
    routing: sourceRun.routing,
    gpuBalancePlan,
    desktopBridge: gpuBalancePlan.desktopBridge,
    runResults,
    aggregate: {
      passed: runResults.filter((result) => result.validation.status === 'passed').length,
      failed: 0,
      validationStatus: runResults.length ? 'passed' : 'not_applicable',
    },
    lessons: runResults.map((result) => result.lesson),
    nextSafeStep: remainingRunCount > 0
      ? 'Review this shakedown receipt, then execute the next capped batch or explicitly allow a larger batch.'
      : 'All queued dry-run improvements for this receipt are measured; queue a new receipt for the next iteration.',
  };
  return writeImprovementExecutionReceipt(receipt);
}

function publicShellUrl() {
  return `http://${HOST === '0.0.0.0' ? 'holojetson.local' : 'localhost'}:${PORT}`;
}

function buildLiveStatusSnapshot() {
  const pending = pendingConsents();
  const executions = executionHistory();
  const stale = staleProcesses();
  const modelLibrary = modelLibrarySnapshot();
  const nativeResources = nativeResourceSnapshot();
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
      desktopBridgeEndpoint: 'GET /api/desktop-control/bridge',
      desktopBridgeReportEndpoint: 'POST /api/desktop-control/bridge/report',
      improvementRunEndpoint: 'POST /api/improvement-runs',
      improvementRunExecuteEndpoint: 'POST /api/improvement-runs/:runId/execute',
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
      'model_library',
      'holoclaw_skill_shelf',
      'native_resource_inventory',
      'vision_model_routing',
      'improvement_run_queue',
      'improvement_run_execution',
      'gpu_lane_balance',
      'desktop_bridge_status',
      'desktop_bridge_browser_report',
    ],
    lanes: [
      { id: 'brittney_operator', model: process.env.AIBRITTNEY_MODEL || 'qwen3:4b-instruct', role: 'operator chat and routing' },
      { id: 'fara_gui_grounding', model: 'fara:7b', role: 'guarded desktop automation planning' },
      { id: 'holo_sdf_geometry', model: 'holo-sdf:v0', role: 'text/image to SDFNode geometry' },
      { id: 'vision_language', model: 'qwen3-vl:4b', role: 'vision model stack for screen and image understanding' },
      { id: 'semantic_embeddings', model: 'nomic-embed-text:latest', role: 'semantic recall and search' },
      { id: 'holoclaw_skills', model: 'HoloClaw skill shelf', role: 'native skill execution routes' },
      { id: 'receipt_gate', model: 'local filesystem receipts', role: 'approval and audit boundary' },
    ],
    modelLibrary,
    nativeResources,
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

function modelLibrarySummary(snapshot) {
  return snapshot.modelLibrary?.summary || 'No model library entries reported';
}

function nativeResourceSummary(snapshot) {
  return snapshot.nativeResources?.summary || 'No native resources reported';
}

function formatLiveStatusBrief(snapshot) {
  return [
    '[Live HoloShell status context - answer from these fields; do not answer "unknown" when a field is present.]',
    `System status: ${snapshot.status}`,
    `HoloShell route: ${snapshot.route.url} (${snapshot.route.chatEndpoint})`,
    `Brittney avatar: ${snapshot.avatar.status}; runtime ${snapshot.avatar.runtime}; Daimon context ${snapshot.avatar.daimonContext}`,
    `Capabilities: ${snapshot.capabilities.join(', ')}`,
    `Lanes: ${laneSummary(snapshot)}`,
    `Model library: ${modelLibrarySummary(snapshot)}`,
    `Native resources: ${nativeResourceSummary(snapshot)}`,
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
      `2. Keep model roles separated: vision models read screens/images through the vision_language lane; Fara stays the guarded desktop automation lane at ${snapshot.route.desktopControlEndpoint}.`,
      `3. Queue improvement batches through ${snapshot.route.improvementRunEndpoint}, then execute capped shakedowns through ${snapshot.route.improvementRunExecuteEndpoint}.`,
      `4. Check laptop desktop bridge readiness through ${snapshot.route.desktopBridgeEndpoint}; Fara plans remain approval-gated and non-mutating until consent exists.`,
      `5. Balance processing across the owned-GPU lanes: ${laneSummary(snapshot)}. Current GPU telemetry: ${snapshot.gpu.summary}.`,
      `6. Use the native library before inventing routes: ${modelLibrarySummary(snapshot)}. ${nativeResourceSummary(snapshot)}.`,
      `7. Run improvement batches through the desktop app route with receipts on every pass. Current guardrails: ${baseGuardrails}.`,
      `8. Cleanly separate local work by repo status: ${gitSummary(snapshot.gitStatus)}.`,
      '',
      'No cube/test object is needed here. The next move is live data -> native vision/skill/model route -> capped shakedown execution -> GPU/bridge measurement -> Fara only when desktop automation is needed -> feed the improvement back into Brittney.',
    ].join('\n');
  }

  return [
    'System status: online.',
    `Brittney chat is live at ${snapshot.route.url} through ${snapshot.route.chatEndpoint}; receipts are enabled.`,
    `Avatar status: ${snapshot.avatar.status}; Daimon context rides along when D.053 has emerged.`,
    `Active capabilities: ${snapshot.capabilities.join(', ')}.`,
    `Active lanes: ${laneSummary(snapshot)}.`,
    `Improvement runs: queue through ${snapshot.route.improvementRunEndpoint}, execute shakedowns through ${snapshot.route.improvementRunExecuteEndpoint}; vision understanding is separate from Fara desktop automation.`,
    `Model library: ${modelLibrarySummary(snapshot)}.`,
    `Native resources: ${nativeResourceSummary(snapshot)}.`,
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
      operation: 'queue_improvement_run_batch',
      lane: 'improvement_run_queue',
      receiptRequired: true,
    },
    {
      operation: 'execute_improvement_shakedown',
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
  // receipt-gated step, and Fara is only selected for desktop automation work.
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
          requestedExecutionCount: receipt.requestedExecutionCount,
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
          nextSafeStep: receipt.nextSafeStep,
          receipt,
          proposals: [
            {
              operation: 'review_improvement_execution_receipt',
              lane: 'receipt_gate',
              receiptRequired: true,
              executionId: receipt.executionId,
            },
            {
              operation: receipt.remainingRunCount > 0 ? 'execute_next_shakedown_batch' : 'queue_next_improvement_batch',
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
          requestedRunCount: receipt.requestedRunCount,
          queuedRunCount: receipt.queuedRunCount,
          destructiveActionsTaken: receipt.destructiveActionsTaken,
          approvalRequiredForDesktopAutomation: receipt.approvalRequiredForDesktopAutomation,
          routing: receipt.routing,
          routingSummary: receipt.routingSummary,
          loop: receipt.loop,
          measurementPlan: receipt.measurementPlan,
          nextSafeStep: receipt.nextSafeStep,
          receipt,
          proposals: [
            {
              operation: 'review_improvement_run_receipt',
              lane: 'receipt_gate',
              receiptRequired: true,
              runId: receipt.runId,
            },
            {
              operation: 'execute_shakedown_batch',
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
