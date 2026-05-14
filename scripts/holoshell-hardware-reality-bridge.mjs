#!/usr/bin/env node
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCHEMA_VERSION = 'hololand.holoshell.hardware-reality-bridge.v0.1.0';
const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const DEFAULT_OUTPUT = path.join('.tmp', 'holoshell', 'hardware-reality.json');
const DEFAULT_JS_OUTPUT = path.join('.tmp', 'holoshell', 'hardware-reality.js');
const DEFAULT_FIXTURE = path.join('apps', 'holoshell', 'samples', 'hardware-reality-fixture.json');
const REQUIRED_TOOLS = [
  'holoshell_run_registry_snapshot',
  'holoshell_preflight_terminate',
  'holoshell_preflight_delete',
  'holoshell_preflight_legacy_app_mutation',
];

function defaultMcpScript() {
  return path.join(os.homedir(), '.ai-ecosystem', 'scripts', 'holoshell-mcp-stdio.mjs');
}

function parseArgs(argv) {
  const args = {
    json: false,
    output: DEFAULT_OUTPUT,
    jsOutput: DEFAULT_JS_OUTPUT,
    fixture: '',
    mcpScript: defaultMcpScript(),
    timeoutMs: 20000,
    selfTest: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    else if (arg === '--json') args.json = true;
    else if (arg === '--output') args.output = argv[++index];
    else if (arg === '--js-output') args.jsOutput = argv[++index];
    else if (arg === '--fixture') args.fixture = argv[++index];
    else if (arg === '--mcp-script') args.mcpScript = argv[++index];
    else if (arg === '--timeout-ms') args.timeoutMs = Number(argv[++index]) || args.timeoutMs;
    else if (arg === '--self-test') args.selfTest = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (args.selfTest && !args.fixture) args.fixture = DEFAULT_FIXTURE;
  return args;
}

function printHelp() {
  console.log(`HoloShell hardware reality bridge

Usage:
  node scripts/holoshell-hardware-reality-bridge.mjs [options]

Options:
  --json                 Print the visual hardware model.
  --output <path>        Write output path. Defaults to .tmp/holoshell/hardware-reality.json.
  --js-output <path>     Write browser bootstrap JS. Defaults to .tmp/holoshell/hardware-reality.js.
  --fixture <path>       Ask the upstream MCP server to serve a fixture instead of probing live PIDs.
  --mcp-script <path>    HoloShell stdio MCP script. Defaults to ~/.ai-ecosystem/scripts/holoshell-mcp-stdio.mjs.
  --timeout-ms <n>       Upstream live snapshot timeout. Defaults to 20000.
  --self-test            Use the sample fixture and assert bridge invariants.
  -h, --help             Show this help.
`);
}

function resolveRepoPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(REPO_ROOT, filePath);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseMcpContent(result) {
  const text = result?.content?.find((item) => item?.type === 'text')?.text;
  if (!text) throw new Error('MCP tools/call response did not include text content');
  return JSON.parse(text);
}

class JsonRpcStdioClient {
  constructor({ scriptPath, fixture, timeoutMs }) {
    this.scriptPath = path.resolve(scriptPath);
    this.fixture = fixture ? resolveRepoPath(fixture) : '';
    this.timeoutMs = timeoutMs;
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = '';
    this.stderr = '';
    this.child = null;
  }

  start() {
    if (!existsSync(this.scriptPath)) {
      throw new Error(`HoloShell MCP script not found: ${this.scriptPath}`);
    }

    const args = [this.scriptPath, '--timeout-ms', String(this.timeoutMs)];
    if (this.fixture) args.push('--fixture', this.fixture);
    this.child = spawn(process.execPath, args, {
      cwd: path.dirname(this.scriptPath),
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    this.child.stdout.setEncoding('utf8');
    this.child.stdout.on('data', (chunk) => this.handleStdout(chunk));
    this.child.stderr.setEncoding('utf8');
    this.child.stderr.on('data', (chunk) => {
      this.stderr += chunk;
    });
    this.child.on('exit', (code, signal) => {
      const error = new Error(`HoloShell MCP exited before response: code=${code} signal=${signal} stderr=${this.stderr.trim()}`);
      for (const { reject, timer } of this.pending.values()) {
        clearTimeout(timer);
        reject(error);
      }
      this.pending.clear();
    });
  }

  handleStdout(chunk) {
    this.buffer += chunk;
    let index;
    while ((index = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, index).replace(/\r$/, '').trim();
      this.buffer = this.buffer.slice(index + 1);
      if (!line) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch (error) {
        this.rejectAll(new Error(`Invalid JSON-RPC from MCP: ${error.message}; line=${line.slice(0, 240)}`));
        continue;
      }

      const pending = this.pending.get(message.id);
      if (!pending) continue;
      clearTimeout(pending.timer);
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message || JSON.stringify(message.error)));
      else pending.resolve(message.result);
    }
  }

  rejectAll(error) {
    for (const { reject, timer } of this.pending.values()) {
      clearTimeout(timer);
      reject(error);
    }
    this.pending.clear();
  }

  request(method, params = {}) {
    if (!this.child) this.start();
    const id = this.nextId;
    this.nextId += 1;
    const payload = { jsonrpc: '2.0', id, method, params };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for MCP method ${method}`));
      }, this.timeoutMs + 5000);
      this.pending.set(id, { resolve, reject, timer });
      this.child.stdin.write(`${JSON.stringify(payload)}\n`, 'utf8');
    });
  }

  async close() {
    if (!this.child) return;
    this.child.stdin.end();
    await new Promise((resolveClose) => {
      const timer = setTimeout(() => {
        this.child.kill();
        resolveClose();
      }, 1000);
      this.child.once('exit', () => {
        clearTimeout(timer);
        resolveClose();
      });
    });
  }
}

async function readMcpReality(args) {
  const client = new JsonRpcStdioClient(args);
  try {
    const initialize = await client.request('initialize', {
      protocolVersion: '2025-11-25',
      clientInfo: { name: 'hololand-hardware-reality-bridge', version: '0.1.0' },
      capabilities: {},
    });
    const listed = await client.request('tools/list', {});
    const called = await client.request('tools/call', {
      name: 'holoshell_run_registry_snapshot',
      arguments: {},
    });
    return {
      initialize,
      tools: safeArray(listed?.tools),
      snapshot: parseMcpContent(called),
    };
  } finally {
    await client.close();
  }
}

function semanticPrefixForLane(lane) {
  return `[lane:${lane.agent_id} surface:${lane.surface} source:holoshell-mcp]`;
}

function numericPids(values) {
  return safeArray(values).map(Number).filter((pid) => Number.isInteger(pid) && pid > 0);
}

function lanePidIndex(snapshot) {
  const index = new Map();
  for (const lane of safeArray(snapshot.agentLanes)) {
    const evidence = {
      laneId: lane.agent_id,
      label: lane.lane_label || lane.agent_id,
      surfaceKind: lane.surface,
      colorHint: lane.lane_color || 'white',
      trustState: 'observed_by_holoshell_mcp',
    };
    for (const pid of numericPids(lane.pid_links)) {
      index.set(pid, evidence);
    }
  }
  return index;
}

function buildLaneModels(snapshot) {
  return safeArray(snapshot.agentLanes).map((lane) => ({
    laneId: lane.agent_id,
    label: lane.lane_label || lane.agent_id,
    surfaceKind: lane.surface,
    colorHint: lane.lane_color || 'white',
    pidLinks: numericPids(lane.pid_links),
    runIds: safeArray(lane.current_run_ids).map(String),
    pidCount: safeArray(lane.pid_links).length,
    runCount: safeArray(lane.current_run_ids).length,
    healthState: lane.health_state || 'observed',
    semanticPrefix: semanticPrefixForLane(lane),
    trustState: 'observed_by_holoshell_mcp',
    receiptRequired: true,
  }));
}

function buildShellRunModels(snapshot) {
  const laneByPid = lanePidIndex(snapshot);
  return safeArray(snapshot.shellRuns)
    .slice(0, 48)
    .map((run) => {
      const pid = Number(run.pid);
      const parentPid = Number(run.parentPid);
      const directLane = laneByPid.get(pid);
      const parentLane = laneByPid.get(parentPid);
      const owner = directLane || parentLane || null;
      return {
        runId: run.run_id,
        pid,
        processName: run.process,
        parentPid: Number.isInteger(parentPid) ? parentPid : null,
        healthState: run.health_state || 'observed',
        listeningPorts: safeArray(run.listeningPorts),
        commandHash: run.command_hash || null,
        ownerLaneId: owner?.laneId || null,
        ownerLaneLabel: owner?.label || null,
        ownerSurfaceKind: owner?.surfaceKind || null,
        ownerColorHint: owner?.colorHint || null,
        ownerEvidence: directLane ? 'direct_pid' : parentLane ? 'parent_pid' : null,
        ownerParentPid: parentLane ? parentPid : null,
        ownerTrustState: owner?.trustState || null,
        rawCommandHidden: true,
        receiptRequired: true,
      };
    });
}

function groupLegacyApps(snapshot) {
  const groups = new Map();
  for (const processInfo of safeArray(snapshot.processes).filter((item) => item.kind === 'legacy_app')) {
    const appName = String(processInfo.name || 'legacy_app').replace(/\.exe$/i, '');
    const key = appName.toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, {
        appName,
        observedProcessCount: 0,
        samplePids: [],
        mutationPolicy: 'preflight_required',
        receiptRequired: true,
      });
    }
    const group = groups.get(key);
    group.observedProcessCount += 1;
    if (group.samplePids.length < 8) group.samplePids.push(processInfo.pid);
  }
  return [...groups.values()].sort((left, right) => right.observedProcessCount - left.observedProcessCount);
}

function buildPortModels(snapshot) {
  return safeArray(snapshot.listeners)
    .slice(0, 64)
    .map((listener) => ({
      pid: listener.pid,
      localAddress: listener.localAddress,
      localPort: listener.localPort,
      state: listener.state,
      receiptRequired: true,
    }));
}

function riskState(snapshot) {
  const findings = safeArray(snapshot.healthFindings);
  if (findings.some((finding) => finding.severity === 'critical')) return 'critical';
  if (findings.some((finding) => finding.severity === 'warn')) return 'warn';
  return 'pass';
}

function buildRecommendations(snapshot, summary) {
  const recommendations = [];
  if (summary.riskState !== 'pass') {
    recommendations.push({
      severity: summary.riskState === 'critical' ? 'high' : 'medium',
      kind: 'hardware_findings_present',
      text: 'Review MCP health findings before starting a memory-heavy build, browser run, or model job.',
    });
  }
  if (summary.terminationPreflightCount > 0) {
    recommendations.push({
      severity: 'medium',
      kind: 'preflight_before_mutation',
      text: 'Use the HoloShell MCP preflight tools before terminating PIDs, deleting files, or changing legacy apps.',
    });
  }
  if (summary.legacyAppCount > 0) {
    recommendations.push({
      severity: 'medium',
      kind: 'legacy_apps_absorbable',
      text: 'Legacy apps are visible enough to wrap with HoloShell custody, but mutation still needs app identity, window identity, and rollback receipts.',
    });
  }
  if (safeArray(snapshot.agentLanes).length > 1) {
    recommendations.push({
      severity: 'low',
      kind: 'multi_agent_lanes_active',
      text: 'Multiple agent lanes are active; project lane ownership in HoloShell so the user does not need to read terminals.',
    });
  }
  if (!recommendations.length) {
    recommendations.push({
      severity: 'low',
      kind: 'hardware_reality_ready',
      text: 'The MCP-backed hardware projection is ready for read-only HoloShell visualization.',
    });
  }
  return recommendations;
}

function createHardwareRealityModel({ initialize, tools, snapshot, args }) {
  const lanes = buildLaneModels(snapshot);
  const shellRuns = buildShellRunModels(snapshot);
  const legacyApps = groupLegacyApps(snapshot);
  const listeners = buildPortModels(snapshot);
  const toolNames = tools.map((tool) => tool.name).filter(Boolean);
  const summary = {
    riskState: riskState(snapshot),
    processCount: snapshot.counts?.processes || safeArray(snapshot.processes).length,
    listenerCount: snapshot.counts?.listeners || safeArray(snapshot.listeners).length,
    shellRunCount: snapshot.counts?.shellRuns || safeArray(snapshot.shellRuns).length,
    laneAttributedShellRunCount: shellRuns.filter((run) => run.ownerLaneId).length,
    unattributedShellRunCount: shellRuns.filter((run) => !run.ownerLaneId).length,
    laneCount: lanes.length,
    activeLaneCount: lanes.filter((lane) => lane.pidCount > 0).length,
    legacyAppCount: legacyApps.reduce((sum, app) => sum + app.observedProcessCount, 0),
    legacyAppGroupCount: legacyApps.length,
    terminationPreflightCount: safeArray(snapshot.terminationPreflights).length,
    mcpToolCount: toolNames.length,
    requiredToolCount: REQUIRED_TOOLS.length,
    requiredToolsAvailable: REQUIRED_TOOLS.every((name) => toolNames.includes(name)),
  };
  const safety = {
    destructiveActionsTaken: Boolean(snapshot.receipt?.destructive_actions_taken),
    preflightRequiredForTermination: Boolean(snapshot.receipt?.preflight_required_for_termination),
    mutationPreflightTools: REQUIRED_TOOLS.filter((name) => toolNames.includes(name)),
    policies: [
      'read_only_projection',
      'raw_commands_hidden_by_default',
      'semantic_lane_truth_required',
      'legacy_app_mutation_requires_preflight',
      'process_termination_requires_preflight',
      'file_deletion_requires_preflight',
    ],
  };
  const model = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sourceAnchors: {
      source: 'apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus',
      adapter: 'scripts/holoshell-hardware-reality-bridge.mjs',
      sample: 'apps/holoshell/samples/hardware-reality-fixture.json',
      upstreamMcp: path.resolve(args.mcpScript),
      upstreamSnapshotTool: 'holoshell_run_registry_snapshot',
    },
    mcp: {
      initialized: Boolean(initialize?.serverInfo),
      serverInfo: initialize?.serverInfo || null,
      tools: toolNames,
    },
    summary,
    safety,
    lanes,
    shellRuns,
    listeners,
    legacyApps,
    findings: safeArray(snapshot.healthFindings).map((finding) => ({
      severity: finding.severity,
      class: finding.class,
      pid: finding.pid || null,
      process: finding.process || null,
      ports: safeArray(finding.ports),
      receipt: finding.receipt || 'mcp_health_finding',
    })),
    operatorCards: [
      {
        cardId: 'agent-lanes',
        title: 'Agent Lanes',
        value: `${summary.activeLaneCount}/${summary.laneCount}`,
        intent: 'Show which AI surfaces are awake and what they own.',
      },
      {
        cardId: 'shell-runs',
        title: 'Shell Runs',
        value: String(summary.shellRunCount),
        intent: 'Show active command and dev-run custody without requiring terminal reading.',
      },
      {
        cardId: 'legacy-apps',
        title: 'Legacy Apps',
        value: String(summary.legacyAppCount),
        intent: 'Show absorbable Windows programs before any visual or settings mutation.',
      },
      {
        cardId: 'preflight-gate',
        title: 'Mutation Gate',
        value: safety.destructiveActionsTaken ? 'blocked' : 'armed',
        intent: 'Keep every destructive operation behind MCP preflight and receipt checks.',
      },
    ],
    recommendations: buildRecommendations(snapshot, summary),
    receipt: {
      snapshotHash: snapshot.receipt?.snapshot_hash || null,
      bridgeHash: sha256(JSON.stringify({
        snapshotHash: snapshot.receipt?.snapshot_hash || null,
        summary,
        safety,
        lanes: lanes.map((lane) => [lane.laneId, lane.pidCount, lane.healthState]),
        shellRunOwners: shellRuns.map((run) => [run.runId, run.ownerLaneId, run.ownerEvidence]),
      })),
      destructiveActionsTaken: safety.destructiveActionsTaken,
      rawCommandsIncluded: false,
    },
  };
  return model;
}

function writeModel(model, outputPath) {
  const resolved = resolveRepoPath(outputPath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(model, null, 2)}\n`, 'utf8');
  return resolved;
}

function writeBrowserBootstrap(model, outputPath) {
  const resolved = resolveRepoPath(outputPath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  const payload = JSON.stringify(model, null, 2).replace(/<\/script/gi, '<\\/script');
  writeFileSync(resolved, `window.HOLOSHELL_HARDWARE_REALITY = ${payload};\n`, 'utf8');
  return resolved;
}

function assertSelfTest(model) {
  const failures = [];
  if (model.schemaVersion !== SCHEMA_VERSION) failures.push('schemaVersion mismatch');
  if (!model.mcp.initialized) failures.push('MCP initialize did not return serverInfo');
  if (!model.summary.requiredToolsAvailable) failures.push('not all required MCP tools are available');
  if (model.summary.processCount < 4) failures.push('expected fixture processes');
  if (model.summary.shellRunCount < 1) failures.push('expected fixture shell run');
  if (model.summary.laneAttributedShellRunCount < 1) failures.push('expected fixture shell run lane attribution');
  if (model.shellRuns.find((run) => run.pid === 202)?.ownerLaneId !== 'codex') {
    failures.push('expected fixture shell run 202 to inherit codex lane from parent pid');
  }
  if (model.summary.listenerCount < 1) failures.push('expected fixture listener');
  if (model.summary.activeLaneCount < 1) failures.push('expected active agent lane');
  if (model.summary.legacyAppCount < 1) failures.push('expected legacy app custody');
  if (model.safety.destructiveActionsTaken !== false) failures.push('bridge must not take destructive actions');
  if (!model.safety.preflightRequiredForTermination) failures.push('termination preflight must be required');
  if (!model.receipt.snapshotHash) failures.push('missing upstream snapshot hash');
  const serialized = JSON.stringify(model);
  if (/command_summary|commandLine|CommandLine/.test(serialized)) failures.push('raw command text leaked into visual model');
  if (failures.length) {
    throw new Error(`Self-test failed:\n- ${failures.join('\n- ')}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mcpReality = await readMcpReality({
    scriptPath: args.mcpScript,
    fixture: args.fixture,
    timeoutMs: args.timeoutMs,
  });
  const model = createHardwareRealityModel({ ...mcpReality, args });
  const output = writeModel(model, args.output);
  const jsOutput = writeBrowserBootstrap(model, args.jsOutput);
  if (args.selfTest) assertSelfTest(model);

  if (args.json) {
    console.log(JSON.stringify(model, null, 2));
  } else {
    console.log(`HoloShell hardware reality: ${output}`);
    console.log(`HoloShell browser bootstrap: ${jsOutput}`);
    console.log(`Risk: ${model.summary.riskState}`);
    console.log(`Processes: ${model.summary.processCount}`);
    console.log(`Shell runs: ${model.summary.shellRunCount}`);
    console.log(`Listeners: ${model.summary.listenerCount}`);
    console.log(`Agent lanes: ${model.summary.activeLaneCount}/${model.summary.laneCount}`);
    console.log(`Legacy apps: ${model.summary.legacyAppCount}`);
    console.log(`Preflights: ${model.summary.terminationPreflightCount}`);
    console.log(`Destructive actions: ${model.safety.destructiveActionsTaken}`);
  }
}

try {
  await main();
} catch (error) {
  console.error(`holoshell-hardware-reality-bridge failed: ${error.message}`);
  process.exit(1);
}
