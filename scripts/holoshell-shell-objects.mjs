#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const SCHEMA_VERSION = 'hololand.holoshell.shell-objects.v0.1.0';
const DEFAULT_TMP_DIR = '.tmp/holoshell';
const DEFAULT_OUTPUT = '.tmp/holoshell/shell-objects.json';
const DEFAULT_JS_OUTPUT = '.tmp/holoshell/shell-objects.js';

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    tmpDir: DEFAULT_TMP_DIR,
    output: DEFAULT_OUTPUT,
    jsOutput: DEFAULT_JS_OUTPUT,
    maxPrograms: 18,
    maxWindows: 8,
    maxAgents: 6,
    json: false,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--tmp-dir') args.tmpDir = argv[++index];
    else if (arg === '--output') args.output = argv[++index];
    else if (arg === '--js-output') args.jsOutput = argv[++index];
    else if (arg === '--max-programs') args.maxPrograms = Number(argv[++index] || args.maxPrograms);
    else if (arg === '--max-windows') args.maxWindows = Number(argv[++index] || args.maxWindows);
    else if (arg === '--max-agents') args.maxAgents = Number(argv[++index] || args.maxAgents);
    else if (arg === '--json') args.json = true;
    else if (arg === '--self-test') args.selfTest = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/holoshell-shell-objects.mjs [options]

Options:
  --tmp-dir <dir>         HoloShell temp feed directory. Default: ${DEFAULT_TMP_DIR}
  --output <file>         JSON output path. Default: ${DEFAULT_OUTPUT}
  --js-output <file>      Browser bootstrap output path. Default: ${DEFAULT_JS_OUTPUT}
  --max-programs <n>      Max launchable app objects to surface. Default: 18
  --max-windows <n>       Max captured/running windows to surface. Default: 8
  --max-agents <n>        Max agent lanes to surface. Default: 6
  --json                  Print the full graph as JSON.
  --self-test             Build a fixture graph and assert expected objects.
`);
}

function resolveRepoPath(filePath) {
  if (path.isAbsolute(filePath)) return filePath;
  return path.resolve(REPO_ROOT, filePath);
}

function readJson(filePath, fallback = {}) {
  const resolved = resolveRepoPath(filePath);
  if (!existsSync(resolved)) return fallback;
  try {
    return JSON.parse(readFileSync(resolved, 'utf8'));
  } catch (error) {
    return { ...fallback, readError: error.message };
  }
}

function writeJson(filePath, data) {
  const resolved = resolveRepoPath(filePath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return resolved;
}

function writeBrowserBootstrap(filePath, graph) {
  const resolved = resolveRepoPath(filePath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  const payload = `window.HOLOSHELL_SHELL_OBJECTS = ${JSON.stringify(graph, null, 2)};\n`;
  writeFileSync(resolved, payload, 'utf8');
  return resolved;
}

function shortHash(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 14);
}

function slug(value) {
  return String(value || 'object')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 54) || 'object';
}

function normalizeName(value) {
  const text = String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (/^(google )?chrome$/.test(text) || text === 'chrome') return 'google chrome';
  if (/^(microsoft )?edge$/.test(text) || text === 'msedge') return 'microsoft edge';
  if (/^(microsoft )?word$/.test(text) || text === 'winword') return 'microsoft word';
  if (/^(visual studio code|vs code|code)$/.test(text)) return 'visual studio code';
  if (/^(windows )?powershell( \(x86\))?$/.test(text)) return 'windows powershell';
  return text;
}

function glyphFor(name, fallback = 'O') {
  const words = String(name || '')
    .replace(/[^a-z0-9 ]/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return fallback;
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}

function displayNameForProgram(program) {
  const key = normalizeName(program.displayName);
  const canonical = {
    'google chrome': 'Google Chrome',
    'microsoft edge': 'Microsoft Edge',
    'visual studio code': 'Visual Studio Code',
    'windows powershell': 'Windows PowerShell',
    'microsoft word': 'Word',
  };
  if (canonical[key]) return canonical[key];
  if (String(program.displayName || '').toUpperCase() === 'MSACCESS') return 'Access';
  return program.displayName || 'Program';
}

function capabilityFamilyForProgram(program) {
  const klass = program.capabilityClass || 'application';
  if (klass === 'browser') return 'web';
  if (klass === 'productivity') return 'documents';
  if (klass === 'developer_tool' || klass === 'command_tool') return 'developer';
  if (klass === 'creative_tool') return 'creative';
  if (klass === 'system') return 'system';
  if (klass === 'game') return 'games';
  return 'apps';
}

function objectKindForProgram(program) {
  const klass = program.capabilityClass || 'application';
  if (klass === 'browser') return 'browser_surface';
  if (klass === 'command_tool') return 'terminal_surface';
  if (klass === 'developer_tool') return 'developer_surface';
  if (klass === 'productivity') return 'document_app';
  return 'program';
}

function visualFormForProgram(program) {
  const klass = program.capabilityClass || 'application';
  if (klass === 'browser') return 'portal_bubble';
  if (klass === 'command_tool' || klass === 'developer_tool') return 'terminal_bubble';
  if (klass === 'productivity') return 'document_machine';
  return 'app_bubble';
}

function scoreProgram(program) {
  const name = String(program.displayName || '').toLowerCase();
  let score = 0;
  if (hasMeaningfulRunningWindow(program)) score += 120;
  if (program.launchable) score += 18;
  if (program.source === 'app_paths') score += 4;

  const classScores = {
    browser: 42,
    command_tool: 38,
    developer_tool: 34,
    productivity: 32,
    creative_tool: 18,
    application: 10,
    system: 4,
  };
  score += classScores[program.capabilityClass] || 8;

  const importantNames = [
    ['excel', 55],
    ['chrome', 50],
    ['edge', 36],
    ['terminal', 44],
    ['powershell', 42],
    ['cursor', 40],
    ['visual studio code', 38],
    ['code', 28],
    ['claude', 38],
    ['ollama', 36],
    ['word', 34],
    ['access', 20],
    ['notepad', 18],
    ['youtube', 20],
  ];
  for (const [needle, weight] of importantNames) {
    if (name.includes(needle)) score += weight;
  }

  const lowerPriority = ['uninstall', 'readme', 'documentation', 'help', 'license', 'x86', 'wow', 'ise', 'software development kit'];
  for (const needle of lowerPriority) {
    if (name.includes(needle)) score -= 24;
  }
  return score;
}

function hasMeaningfulRunningWindow(program) {
  const title = String(program.runningWindowTitle || '').trim().toLowerCase();
  if (!program.runningWindowId && !title) return false;
  if (!title) return true;
  return !['program manager', 'default ime'].includes(title);
}

function dedupePrograms(programs) {
  const byName = new Map();
  for (const program of programs) {
    const key = normalizeName(program.displayName);
    const current = byName.get(key);
    if (!current || scoreProgram(program) > scoreProgram(current)) byName.set(key, program);
  }
  return [...byName.values()];
}

const layoutSlots = [
  { x: 59, y: 15, size: 112 },
  { x: 75, y: 26, size: 100 },
  { x: 18, y: 24, size: 104 },
  { x: 66, y: 45, size: 106 },
  { x: 31, y: 51, size: 102 },
  { x: 82, y: 58, size: 96 },
  { x: 15, y: 68, size: 96 },
  { x: 49, y: 72, size: 100 },
  { x: 38, y: 17, size: 92 },
  { x: 8, y: 42, size: 90 },
  { x: 73, y: 72, size: 90 },
  { x: 45, y: 35, size: 92 },
  { x: 86, y: 10, size: 86 },
  { x: 27, y: 78, size: 86 },
  { x: 4, y: 10, size: 84 },
  { x: 88, y: 40, size: 84 },
  { x: 52, y: 87, size: 86 },
  { x: 22, y: 9, size: 86 },
];

function layout(index, fallbackSize = 92) {
  const slot = layoutSlots[index % layoutSlots.length] || {};
  const cycle = Math.floor(index / layoutSlots.length);
  return {
    x: slot.x ?? (8 + ((index * 17) % 80)),
    y: slot.y ?? (8 + ((index * 23) % 78)),
    size: Math.max(76, (slot.size || fallbackSize) - cycle * 4),
  };
}

function baseShellObjects({ brittneyAvatar, workflow, hardwareApproval, workflowApproval, workflowIntentGate }) {
  const avatarSummary = brittneyAvatar?.summary || {};
  const workflowSummary = workflow?.summary || {};
  const hardwareApprovalSummary = hardwareApproval?.summary || {};
  const workflowApprovalSummary = workflowApproval?.summary || {};
  const gateSummary = workflowIntentGate?.summary || {};
  return [
    {
      id: 'shell.hololand',
      objectKind: 'operating_world',
      displayName: 'HoloLand',
      sourceKind: 'holoscript',
      sourceRef: 'apps/holoshell/source/holoshell-shell-world.holo',
      capabilityFamily: 'operating_world',
      trustState: 'verified',
      permissionEnvelope: 'read_only',
      adapterPath: 'holo_shell_world',
      visualForm: 'world_anchor',
      status: 'running',
      actorLaneId: 'brittney',
      receiptTypes: ['shell_object_graph', 'live_feed'],
      relationships: { replaces: ['desktop', 'launcher', 'taskbar', 'window_manager'] },
      privacyClass: 'local_private',
      replacementPath: 'native_os_shell',
      glyph: 'HL',
      detail: 'The computer surface becomes the HoloLand operating world.',
      firstScreen: true,
      layout: { x: 39, y: 12, size: 160 },
    },
    {
      id: 'assistant.brittney',
      objectKind: 'assistant_avatar',
      displayName: 'Brittney',
      sourceKind: 'holoscript',
      sourceRef: 'apps/holoshell/source/holoshell-brittney-avatar.hsplus',
      capabilityFamily: 'assistant',
      trustState: avatarSummary.runtimeStatus === 'available' ? 'verified' : 'partial',
      permissionEnvelope: 'intent_scoped',
      adapterPath: 'aibrittney_runtime_bridge',
      visualForm: 'avatar_anchor',
      status: avatarSummary.avatarStatus || 'available',
      actorLaneId: 'brittney',
      receiptTypes: ['brittney_avatar_manifest', 'brittney_turn_receipt'],
      relationships: {
        runtimeStatus: avatarSummary.runtimeStatus || 'unknown',
        emotion: avatarSummary.emotion || 'attentive',
        voiceState: avatarSummary.voiceState || 'ready',
      },
      privacyClass: 'local_private',
      replacementPath: 'assistant_presence',
      glyph: 'AI',
      detail: `Brittney avatar ${avatarSummary.avatarStatus || 'unknown'}; runtime ${avatarSummary.runtimeStatus || 'unknown'}.`,
      firstScreen: true,
      layout: { x: 54, y: 68, size: 126 },
    },
    {
      id: 'workflow.room-marathon',
      objectKind: 'workflow',
      displayName: 'Room Marathon',
      sourceKind: 'workflow',
      sourceRef: 'scripts/holoshell-room-marathon-workflow.mjs',
      capabilityFamily: 'agent_workflow',
      trustState: workflowSummary.status === 'pending_user_approval' ? 'partial' : 'verified',
      permissionEnvelope: 'guarded_execute',
      adapterPath: 'workflow_approval_and_brain_intent_gate',
      visualForm: 'workflow_bubble',
      status: workflowSummary.status || 'available',
      actorLaneId: 'brittney',
      receiptTypes: ['workflow_receipt', 'workflow_approval_bundle', 'brain_intent_gate_receipt'],
      relationships: {
        model: workflowSummary.model || 'kimi',
        modelRoute: workflowSummary.modelRoute || 'ollama_cloud',
        approvalStatus: workflowApprovalSummary.status || 'unknown',
        brainGateStatus: gateSummary.status || 'unknown',
      },
      privacyClass: 'local_private',
      replacementPath: 'compound_workflow_object',
      launch: { action: 'stage_room_marathon_workflow', route: '/workflow/room-marathon' },
      glyph: 'RM',
      detail: `${workflowSummary.stepCount || 0} staged steps; approval ${workflowApprovalSummary.status || 'unknown'}; brain gate ${gateSummary.status || 'unknown'}.`,
      firstScreen: true,
      layout: { x: 77, y: 63, size: 118 },
    },
    {
      id: 'approval.hardware',
      objectKind: 'approval',
      displayName: 'Hardware Approval',
      sourceKind: 'receipt',
      sourceRef: 'scripts/holoshell-approval-bundle.mjs',
      capabilityFamily: 'safety',
      trustState: hardwareApprovalSummary.executionAllowed ? 'partial' : 'verified',
      permissionEnvelope: 'guarded_execute',
      adapterPath: 'hardware_approval_bundle',
      visualForm: 'approval_gate',
      status: hardwareApprovalSummary.status || 'not_required',
      actorLaneId: 'brittney',
      receiptTypes: ['hardware_approval_bundle'],
      relationships: {
        actionKind: hardwareApprovalSummary.actionKind || '',
        target: hardwareApprovalSummary.target || '',
        expiresAt: hardwareApprovalSummary.expiresAt || '',
      },
      privacyClass: 'local_private',
      replacementPath: 'consent_gate',
      glyph: 'OK',
      detail: `Hardware approval ${hardwareApprovalSummary.status || 'not_required'} for ${hardwareApprovalSummary.target || 'local computer'}.`,
      firstScreen: Boolean(hardwareApprovalSummary.executionAllowed),
      layout: { x: 13, y: 76, size: 104 },
    },
    {
      id: 'surface.browser.lofi',
      objectKind: 'browser_surface',
      displayName: 'Lofi Browser',
      sourceKind: 'web',
      sourceRef: 'https://www.youtube.com/results?search_query=lofi+beats',
      capabilityFamily: 'media',
      trustState: 'partial',
      permissionEnvelope: 'guarded_execute',
      adapterPath: 'browser_automation_or_launch_app',
      visualForm: 'portal_bubble',
      status: 'available',
      actorLaneId: 'brittney',
      receiptTypes: ['hardware_action_receipt', 'approval_bundle'],
      relationships: { target: 'youtube_lofi_search', mode: 'browser_media' },
      privacyClass: 'local_private',
      replacementPath: 'media_surface',
      launch: { action: 'open_url', url: 'https://www.youtube.com/results?search_query=lofi+beats' },
      glyph: 'LO',
      detail: 'A guarded browser media portal for the lofi part of room marathon.',
      firstScreen: true,
      layout: { x: 62, y: 16, size: 110 },
    },
  ];
}

function programObjects(programRegistry, maxPrograms) {
  const programs = Array.isArray(programRegistry?.programs) ? programRegistry.programs : [];
  return dedupePrograms(programs)
    .filter((program) => program.launchable)
    .sort((left, right) => scoreProgram(right) - scoreProgram(left))
    .slice(0, Math.max(0, maxPrograms))
    .map((program, index) => {
      const objectKind = objectKindForProgram(program);
      const displayName = displayNameForProgram(program);
      const slot = layout(index, 96);
      const status = hasMeaningfulRunningWindow(program) ? 'running' : 'available';
      return {
        id: `program.${slug(displayName)}.${shortHash(program.id || displayName)}`,
        objectKind,
        displayName,
        sourceKind: 'app',
        sourceRef: program.id,
        capabilityFamily: capabilityFamilyForProgram(program),
        trustState: program.trustState || 'partial',
        permissionEnvelope: program.permissionEnvelope || 'guarded_execute',
        adapterPath: objectKind === 'browser_surface' ? 'browser_automation_or_launch_app' : 'hardware_program_registry',
        visualForm: visualFormForProgram(program),
        status,
        actorLaneId: 'brittney',
        receiptTypes: ['program_registry_receipt', 'hardware_action_receipt', 'approval_bundle'],
        relationships: {
          programRegistryId: program.id,
          capabilityClass: program.capabilityClass || 'application',
          source: program.source || 'unknown',
          launchTargetType: program.launchTarget?.type || 'unknown',
          runningWindowId: program.runningWindowId || '',
          runningWindowTitle: program.runningWindowTitle || '',
          runningProcessName: program.runningProcessName || '',
        },
        privacyClass: 'local_private',
        replacementPath: objectKind === 'browser_surface' ? 'render_as_portal' : 'wrap_then_reimagine',
        launch: { action: 'launch_app', app: displayName },
        glyph: glyphFor(displayName, 'P'),
        detail: `${displayName} is a ${program.capabilityClass || 'program'} object; ${status}; launch is guarded by approval receipt.`,
        firstScreen: index < 12 || status === 'running',
        layout: slot,
      };
    });
}

function capturedWindowObjects({ osUiCapture, programRegistry }, maxWindows) {
  const windows = Array.isArray(osUiCapture?.windows) && osUiCapture.windows.length
    ? osUiCapture.windows
    : Array.isArray(programRegistry?.runningWindows)
      ? programRegistry.runningWindows
      : [];
  return windows
    .filter((window) => window?.id && (window.title || window.processName))
    .slice(0, Math.max(0, maxWindows))
    .map((window, index) => {
      const slot = layout(index + 10, 84);
      return {
        id: `window.${slug(window.processName || 'app')}.${shortHash(window.id)}`,
        objectKind: 'captured_window',
        displayName: window.title || window.processName || 'Window',
        sourceKind: 'captured_ui',
        sourceRef: window.id,
        capabilityFamily: 'legacy_ui',
        trustState: 'partial',
        permissionEnvelope: 'guarded_execute',
        adapterPath: 'os_ui_capture_bridge',
        visualForm: 'geometry_shard_cluster',
        status: window.foreground ? 'foreground' : 'running',
        actorLaneId: 'brittney',
        receiptTypes: ['os_ui_capture_receipt', 'hardware_action_receipt'],
        relationships: {
          processName: window.processName || '',
          processId: window.processId || '',
          controlCount: Array.isArray(window.controls) ? window.controls.length : window.controlCount || 0,
          foreground: Boolean(window.foreground),
          minimized: Boolean(window.minimized),
        },
        privacyClass: 'local_private',
        replacementPath: 'reconstruct_legacy_ui_as_geometry',
        launch: { action: 'focus_window', windowId: window.id },
        glyph: glyphFor(window.processName || window.title, 'UI'),
        detail: `${window.title || window.processName} is a running legacy window wrapped as geometric shards.`,
        firstScreen: index < 4,
        layout: slot,
      };
    });
}

function agentObjects(lanes, maxAgents) {
  const laneList = Array.isArray(lanes?.lanes) ? lanes.lanes : [];
  return laneList.slice(0, Math.max(0, maxAgents)).map((lane, index) => {
    const slot = layout(index + 4, 88);
    return {
      id: `agent.${slug(lane.laneId || lane.displayName)}`,
      objectKind: 'agent_lane',
      displayName: lane.displayName || lane.laneId || 'Agent',
      sourceKind: 'agent',
      sourceRef: lane.laneId || '',
      capabilityFamily: 'agent_presence',
      trustState: lane.status === 'active_or_available' ? 'verified' : 'partial',
      permissionEnvelope: 'intent_scoped',
      adapterPath: 'holomesh_agent_lane',
      visualForm: 'agent_bubble',
      status: lane.status || 'unknown',
      actorLaneId: lane.laneId || '',
      receiptTypes: ['agent_lane_manifest', 'run_custody_receipt'],
      relationships: {
        agentKind: lane.agentKind || '',
        surfaceKind: lane.surfaceKind || '',
        role: lane.role || '',
        processDetected: Boolean(lane.processEvidence?.detected),
      },
      privacyClass: 'local_private',
      replacementPath: 'invite_agent_into_shell',
      glyph: glyphFor(lane.displayName || lane.agentKind, 'A'),
      detail: `${lane.displayName || lane.laneId} lane is ${lane.status || 'unknown'} for ${lane.role || 'agent work'}.`,
      firstScreen: index < 3,
      layout: slot,
    };
  });
}

function receiptObjects({ hardwareAction, hardwareApproval, workflow, workflowApproval, workflowIntentGate }) {
  const receipts = [];
  if (hardwareAction?.summary) {
    receipts.push({
      id: `receipt.hardware-action.${shortHash(hardwareAction.actionId || hardwareAction.generatedAt || 'hardware')}`,
      objectKind: 'receipt',
      displayName: 'Hardware Receipt',
      sourceKind: 'receipt',
      sourceRef: hardwareAction.actionId || '',
      capabilityFamily: 'evidence',
      trustState: hardwareAction.summary.status === 'completed' ? 'verified' : 'partial',
      permissionEnvelope: hardwareAction.summary.permissionEnvelope || 'unknown',
      adapterPath: 'hardware_action_executor',
      visualForm: 'receipt_node',
      status: hardwareAction.summary.status || 'unknown',
      actorLaneId: 'brittney',
      receiptTypes: ['hardware_action_receipt'],
      relationships: {
        actionKind: hardwareAction.summary.actionKind || '',
        targetWindowTitle: hardwareAction.summary.targetWindowTitle || '',
        mutatingActionExecuted: Boolean(hardwareAction.summary.mutatingActionExecuted),
      },
      privacyClass: 'local_private',
      replacementPath: 'receipt_memory',
      glyph: 'RC',
      detail: `Last hardware action ${hardwareAction.summary.status || 'unknown'}; ${hardwareAction.summary.actionKind || 'none'}.`,
      firstScreen: false,
      layout: layout(16, 82),
    });
  }
  if (workflow?.summary || workflowApproval?.summary || workflowIntentGate?.summary) {
    receipts.push({
      id: `receipt.workflow.${shortHash(workflow?.workflowId || workflowApproval?.approvalId || workflowIntentGate?.gateId || 'workflow')}`,
      objectKind: 'receipt',
      displayName: 'Workflow Receipt',
      sourceKind: 'receipt',
      sourceRef: workflow?.workflowId || workflowApproval?.approvalId || workflowIntentGate?.gateId || '',
      capabilityFamily: 'evidence',
      trustState: workflowIntentGate?.summary?.executionAllowed ? 'verified' : 'partial',
      permissionEnvelope: 'guarded_execute',
      adapterPath: 'workflow_receipt_bundle',
      visualForm: 'receipt_node',
      status: workflow?.summary?.status || workflowApproval?.summary?.status || workflowIntentGate?.summary?.status || 'unknown',
      actorLaneId: 'brittney',
      receiptTypes: ['workflow_receipt', 'workflow_approval_bundle', 'brain_intent_gate_receipt'],
      relationships: {
        workflowStatus: workflow?.summary?.status || '',
        approvalStatus: workflowApproval?.summary?.status || '',
        gateStatus: workflowIntentGate?.summary?.status || '',
        executionAllowed: Boolean(workflowApproval?.summary?.executionAllowed && workflowIntentGate?.summary?.executionAllowed),
      },
      privacyClass: 'local_private',
      replacementPath: 'receipt_memory',
      glyph: 'WF',
      detail: `Workflow approval ${workflowApproval?.summary?.status || 'unknown'}; brain gate ${workflowIntentGate?.summary?.status || 'unknown'}.`,
      firstScreen: false,
      layout: layout(17, 82),
    });
  }
  return receipts;
}

function summarize(objects, feeds) {
  const countByKind = {};
  const countByStatus = {};
  for (const object of objects) {
    countByKind[object.objectKind] = (countByKind[object.objectKind] || 0) + 1;
    countByStatus[object.status] = (countByStatus[object.status] || 0) + 1;
  }
  const firstProgram = objects.find((object) => object.sourceKind === 'app');
  return {
    status: objects.length ? 'ready' : 'empty',
    shellObjectCount: objects.length,
    firstScreenObjectCount: objects.filter((object) => object.firstScreen).length,
    programObjectCount: objects.filter((object) => object.sourceKind === 'app').length,
    browserSurfaceCount: objects.filter((object) => object.objectKind === 'browser_surface').length,
    terminalSurfaceCount: objects.filter((object) => object.objectKind === 'terminal_surface').length,
    documentAppCount: objects.filter((object) => object.objectKind === 'document_app').length,
    agentObjectCount: objects.filter((object) => object.objectKind === 'agent_lane' || object.objectKind === 'assistant_avatar').length,
    workflowObjectCount: objects.filter((object) => object.objectKind === 'workflow').length,
    approvalObjectCount: objects.filter((object) => object.objectKind === 'approval').length,
    receiptObjectCount: objects.filter((object) => object.objectKind === 'receipt').length,
    capturedWindowObjectCount: objects.filter((object) => object.objectKind === 'captured_window').length,
    runningObjectCount: objects.filter((object) => ['running', 'foreground'].includes(object.status)).length,
    guardedExecuteCount: objects.filter((object) => object.permissionEnvelope === 'guarded_execute').length,
    breakGlassCount: objects.filter((object) => object.permissionEnvelope === 'break_glass').length,
    firstProgramObject: firstProgram?.displayName || '',
    countByKind,
    countByStatus,
    sourceFeeds: {
      programRegistryStatus: feeds.programRegistry?.summary?.status || 'unknown',
      osUiCaptureStatus: feeds.osUiCapture?.summary?.status || 'unknown',
      agentLaneCount: feeds.lanes?.summary?.laneCount || 0,
    },
  };
}

function loadFeeds(tmpDir) {
  const dir = resolveRepoPath(tmpDir);
  return {
    programRegistry: readJson(path.join(dir, 'program-registry.json'), {}),
    osUiCapture: readJson(path.join(dir, 'os-ui-capture.json'), {}),
    lanes: readJson(path.join(dir, 'agent-lanes.json'), {}),
    brittneyAvatar: readJson(path.join(dir, 'brittney-avatar.json'), {}),
    hardwareAction: readJson(path.join(dir, 'action-latest.json'), {}),
    hardwareApproval: readJson(path.join(dir, 'approval-latest.json'), {}),
    workflow: readJson(path.join(dir, 'workflow-latest.json'), {}),
    workflowApproval: readJson(path.join(dir, 'workflow-approval-latest.json'), {}),
    workflowIntentGate: readJson(path.join(dir, 'brain-intent-gate-latest.json'), {}),
  };
}

function buildGraph(args, fixtures = null) {
  const feeds = fixtures || loadFeeds(args.tmpDir);
  const generatedAt = new Date().toISOString();
  const objects = [
    ...baseShellObjects(feeds),
    ...programObjects(feeds.programRegistry, args.maxPrograms),
    ...capturedWindowObjects(feeds, args.maxWindows),
    ...agentObjects(feeds.lanes, args.maxAgents),
    ...receiptObjects(feeds),
  ];
  const seen = new Set();
  const uniqueObjects = objects.filter((object) => {
    if (seen.has(object.id)) return false;
    seen.add(object.id);
    return true;
  });
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    host: {
      platform: os.platform(),
      release: os.release(),
      hostname: os.hostname(),
    },
    sourceAnchors: {
      source: 'apps/holoshell/source/holoshell-home.hsplus',
      schema: 'apps/holoshell/docs/SHELL_OBJECT_SCHEMA.md',
      programRegistry: 'scripts/holoshell-program-registry.mjs',
      osUiCapture: 'scripts/holoshell-os-ui-capture.mjs',
      prototype: 'apps/holoshell/prototype/local-capability-room.html',
    },
    summary: summarize(uniqueObjects, feeds),
    objects: uniqueObjects,
    invariants: {
      noRawLaunchPathsInGraph: true,
      mutatingActionsRequireApproval: true,
      brittneyIsAssistantNotDesktop: true,
      legacyUiIsWrappedThenReimagined: true,
    },
  };
}

function fixtureFeeds() {
  return {
    programRegistry: {
      summary: { status: 'captured', programCount: 4, launchableProgramCount: 4, runningWindowCount: 1 },
      programs: [
        {
          id: 'program-chrome',
          displayName: 'Google Chrome',
          source: 'app_paths',
          capabilityClass: 'browser',
          trustState: 'partial',
          permissionEnvelope: 'guarded_execute',
          launchable: true,
          launchTarget: { type: 'registry' },
          runningWindowId: 'window-chrome',
          runningWindowTitle: 'HoloLand',
        },
        {
          id: 'program-excel',
          displayName: 'Excel',
          source: 'start_menu',
          capabilityClass: 'productivity',
          trustState: 'partial',
          permissionEnvelope: 'guarded_execute',
          launchable: true,
          launchTarget: { type: 'path' },
        },
        {
          id: 'program-powershell',
          displayName: 'Windows PowerShell',
          source: 'start_menu',
          capabilityClass: 'command_tool',
          trustState: 'partial',
          permissionEnvelope: 'guarded_execute',
          launchable: true,
          launchTarget: { type: 'path' },
        },
        {
          id: 'program-readme',
          displayName: 'Readme',
          source: 'start_menu',
          capabilityClass: 'application',
          trustState: 'unknown',
          permissionEnvelope: 'guarded_execute',
          launchable: true,
          launchTarget: { type: 'path' },
        },
      ],
      runningWindows: [{ id: 'window-chrome', title: 'HoloLand', processName: 'chrome', processId: 100 }],
    },
    osUiCapture: {
      summary: { status: 'captured', windowCount: 1, controlCount: 4, geometryNodeCount: 42 },
      windows: [{ id: 'window-chrome', title: 'HoloLand', processName: 'chrome', processId: 100, foreground: true, controls: [{}, {}, {}] }],
    },
    lanes: {
      summary: { laneCount: 1, activeLaneCount: 1 },
      lanes: [{ laneId: 'codex-hardware', displayName: 'Codex Hardware', agentKind: 'codex', surfaceKind: 'hardware_shell', role: 'local_oracle', status: 'active_or_available', processEvidence: { detected: true } }],
    },
    brittneyAvatar: { summary: { avatarStatus: 'available', runtimeStatus: 'available', emotion: 'focused', voiceState: 'ready' } },
    hardwareAction: { actionId: 'action-1', generatedAt: new Date().toISOString(), summary: { status: 'approval_required', actionKind: 'launch_app', permissionEnvelope: 'guarded_execute', targetWindowTitle: '', mutatingActionExecuted: false } },
    hardwareApproval: { approvalId: 'approval-1', summary: { status: 'pending_user_approval', actionKind: 'launch_app', target: 'Excel', executionAllowed: true, expiresAt: new Date().toISOString() } },
    workflow: { workflowId: 'workflow-1', title: 'Room Marathon', summary: { status: 'pending_user_approval', stepCount: 4, pendingApprovalCount: 1, model: 'kimi', modelRoute: 'ollama_cloud' } },
    workflowApproval: { approvalId: 'workflow-approval-1', summary: { status: 'pending_user_approval', pendingApprovalCount: 1, executionAllowed: true } },
    workflowIntentGate: { gateId: 'gate-1', summary: { status: 'passed', executionAllowed: true, failedCheckCount: 0 } },
  };
}

function assertSelfTest() {
  const graph = buildGraph({ maxPrograms: 10, maxWindows: 4, maxAgents: 2, tmpDir: DEFAULT_TMP_DIR }, fixtureFeeds());
  const failures = [];
  const names = new Set(graph.objects.map((object) => object.displayName));
  if (!names.has('Excel')) failures.push('expected Excel object');
  if (!names.has('Google Chrome')) failures.push('expected Chrome object');
  if (!graph.objects.some((object) => object.objectKind === 'terminal_surface')) failures.push('expected terminal surface object');
  if (!graph.objects.some((object) => object.objectKind === 'assistant_avatar')) failures.push('expected Brittney assistant avatar object');
  if (!graph.objects.some((object) => object.objectKind === 'captured_window')) failures.push('expected captured window object');
  if (!graph.summary.guardedExecuteCount) failures.push('expected guarded execute objects');
  if (JSON.stringify(graph).includes('targetPath')) failures.push('graph must not expose raw targetPath fields');
  if (failures.length) {
    throw new Error(`Self-test failed:\n- ${failures.join('\n- ')}`);
  }
  return graph;
}

function main() {
  const args = parseArgs();
  if (args.selfTest) {
    const graph = assertSelfTest();
    if (args.json) console.log(JSON.stringify(graph, null, 2));
    else console.log(`Self-test passed: ${graph.summary.shellObjectCount} shell objects`);
    return;
  }
  const graph = buildGraph(args);
  const output = writeJson(args.output, graph);
  const jsOutput = writeBrowserBootstrap(args.jsOutput, graph);
  if (args.json) console.log(JSON.stringify(graph, null, 2));
  else {
    console.log(`Wrote ${output}`);
    console.log(`Wrote ${jsOutput}`);
    console.log(`Shell objects: ${graph.summary.shellObjectCount}`);
    console.log(`Programs: ${graph.summary.programObjectCount}`);
    console.log(`Running objects: ${graph.summary.runningObjectCount}`);
    console.log(`Guarded execute objects: ${graph.summary.guardedExecuteCount}`);
  }
}

if (import.meta.url === `file://${process.argv[1].replaceAll('\\', '/')}` || process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

export { buildGraph, fixtureFeeds };
