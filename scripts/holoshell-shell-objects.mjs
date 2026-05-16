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

function browserBoundaryForProgram(program, fallbackUrl = '') {
  if ((program?.capabilityClass || '') !== 'browser' && !fallbackUrl) return null;
  return {
    boundaryVersion: 'hololand.holoshell.browser-boundary.v0.1.0',
    browser: program?.displayName || 'system_default_browser',
    profileBoundary: 'not_selected_until_approval',
    sessionBoundary: 'default_private_or_temporary_required_by_intent',
    urlClassification: fallbackUrl ? 'public_web' : 'browser_surface_unclassified',
    publicBrowsing: Boolean(fallbackUrl),
    credentialAdjacent: false,
    accountMutation: false,
    cookiePolicy: 'explicit_profile_boundary_required_before_account_use',
    screenshotPolicy: 'local_receipts_allowed_for_public_pages_redact_credentials',
    formSubmitPolicy: 'break_glass',
    downloadUploadPolicy: 'blocked_until_specific_approval',
    screenshotLocality: 'local_receipt_only',
  };
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

const ollamaCloudAgents = [
  { slug: 'claude', label: 'Claude Code', command: 'ollama launch claude' },
  { slug: 'openclaw', label: 'OpenClaw', command: 'ollama launch openclaw' },
  { slug: 'hermes', label: 'Hermes Agent', command: 'ollama launch hermes' },
  { slug: 'opencode', label: 'OpenCode', command: 'ollama launch opencode' },
  { slug: 'codex', label: 'Codex', command: 'ollama launch codex' },
  { slug: 'copilot', label: 'Copilot CLI', command: 'ollama launch copilot' },
  { slug: 'droid', label: 'Droid', command: 'ollama launch droid' },
  { slug: 'pi', label: 'Pi', command: 'ollama launch pi' },
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

function baseShellObjects({ brittneyAvatar, wildHoloScript, goldCodebaseBridge, grokBuild, grokHeartbeat, agentDispatch, workflow, hardwareApproval, trustLedger, workflowApproval, workflowIntentGate, shardWorkflow, shardImportApproval, shardImport }) {
  const avatarSummary = brittneyAvatar?.summary || {};
  const wildSummary = wildHoloScript?.summary || {};
  const goldCodebaseSummary = goldCodebaseBridge?.summary || {};
  const grokBuildSummary = grokBuild?.summary || {};
  const dispatchSummary = agentDispatch?.summary || {};
  const workflowSummary = workflow?.summary || {};
  const shardSummary = shardWorkflow?.summary || {};
  const shardApprovalSummary = shardImportApproval?.summary || {};
  const shardImportSummary = shardImport?.summary || {};
  const hardwareApprovalSummary = hardwareApproval?.summary || {};
  const trustSummary = trustLedger?.summary || {};
  const workflowApprovalSummary = workflowApproval?.summary || {};
  const gateSummary = workflowIntentGate?.summary || {};
  const activeWorkflowKind = workflowSummary.workflowKind || workflow?.profile || '';
  const roomWorkflowSummary = !activeWorkflowKind || activeWorkflowKind === 'room_marathon' ? workflowSummary : {};
  const claudeWorkflowSummary = activeWorkflowKind === 'claude_chat' ? workflowSummary : {};
  const ollamaWorkflowSummary = activeWorkflowKind === 'ollama_cloud_agent' ? workflowSummary : {};
  const grokWorkflowSummary = activeWorkflowKind === 'grok_build' ? workflowSummary : {};
  const grokObservation = activeWorkflowKind === 'grok_build' ? workflow?.grokObservation || null : null;
  const roomWorkflowApprovalSummary = !activeWorkflowKind || activeWorkflowKind === 'room_marathon' ? workflowApprovalSummary : {};
  const roomGateSummary = !activeWorkflowKind || activeWorkflowKind === 'room_marathon' ? gateSummary : {};
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
      id: 'workflow.agent-dispatch',
      objectKind: 'workflow',
      displayName: 'Agent Dispatch',
      sourceKind: 'workflow',
      sourceRef: 'scripts/holoshell-agent-dispatch.mjs',
      capabilityFamily: 'agent_dispatch',
      trustState: dispatchSummary.status === 'ready_to_stage' ? 'partial' : dispatchSummary.status === 'blocked' ? 'unknown' : 'verified',
      permissionEnvelope: 'intent_scoped',
      adapterPath: 'brittney_intent_to_guarded_route',
      visualForm: 'dispatch_bubble',
      status: dispatchSummary.status || 'available',
      actorLaneId: 'brittney',
      receiptTypes: ['agent_dispatch_receipt', 'workflow_receipt', 'hardware_action_receipt'],
      relationships: {
        capabilityId: dispatchSummary.capabilityId || '',
        capabilityLabel: dispatchSummary.capabilityLabel || '',
        dispatchKind: dispatchSummary.dispatchKind || '',
        route: dispatchSummary.route || '',
        confidence: dispatchSummary.confidence || 0,
        selectedAgent: dispatchSummary.selectedAgentSlug || '',
        actionKind: dispatchSummary.actionKind || '',
        targetApp: dispatchSummary.targetApp || '',
        approvalRequired: Boolean(dispatchSummary.approvalRequired),
      },
      privacyClass: 'local_private',
      replacementPath: 'plain_language_to_operator_route',
      launch: { action: 'stage_agent_dispatch', route: '/workflow/agent-dispatch' },
      glyph: 'AD',
      detail: dispatchSummary.capabilityLabel
        ? `${dispatchSummary.capabilityLabel}; ${dispatchSummary.dispatchKind || 'dispatch'}; route ${dispatchSummary.route || 'none'}; confidence ${dispatchSummary.confidence || 0}.`
        : 'Brittney routes plain-language requests into guarded HoloShell workflows and hardware actions.',
      firstScreen: true,
      layout: { x: 26, y: 66, size: 108 },
    },
    {
      id: 'source.wild-holoscript.uaa2',
      objectKind: 'source_corpus',
      displayName: 'Wild HoloScript',
      sourceKind: 'holoscript_corpus',
      sourceRef: wildHoloScript?.source?.script || 'scripts/holoshell-wild-holoscript-intake.mjs',
      capabilityFamily: 'source_corpus',
      trustState: (wildSummary.adapterNeededCount || 0) > 0 ? 'partial' : wildSummary.status === 'scanned' ? 'verified' : 'unknown',
      permissionEnvelope: 'read_only',
      adapterPath: 'wild_holoscript_intake_adapter',
      visualForm: 'source_orbit',
      status: wildSummary.status || 'unknown',
      actorLaneId: 'brittney',
      receiptTypes: ['wild_holoscript_intake_receipt', 'wild_module_promotion_receipt'],
      relationships: {
        rootName: wildHoloScript?.source?.rootName || 'uaa2-service',
        fileCount: wildSummary.fileCount || 0,
        holoCount: wildSummary.holoCount || 0,
        hsCount: wildSummary.hsCount || 0,
        hsplusCount: wildSummary.hsplusCount || 0,
        holoFeatureCount: wildSummary.holoFeatureCount || 0,
        hsFeatureCount: wildSummary.hsFeatureCount || 0,
        hsplusFeatureCount: wildSummary.hsplusFeatureCount || 0,
        holoTopFeature: wildSummary.holoTopFeature || '',
        hsTopFeature: wildSummary.hsTopFeature || '',
        hsplusTopFeature: wildSummary.hsplusTopFeature || '',
        frontierSyntaxCount: wildSummary.frontierSyntaxCount || 0,
        adapterNeededCount: wildSummary.adapterNeededCount || 0,
        canonicalCandidateCount: wildSummary.canonicalCandidateCount || 0,
        topPattern: wildSummary.topPattern || '',
        nextMove: wildSummary.nextMove || '',
        formatProfiles: (wildHoloScript?.formatProfiles || []).map((profile) => ({
          extension: profile.extension,
          role: profile.role,
          uniqueFeatureCount: profile.uniqueFeatureCount || 0,
          topFeature: profile.topFeature || '',
        })),
        flagshipPaths: (wildHoloScript?.topFlagships || []).slice(0, 5).map((item) => item.path),
      },
      privacyClass: 'local_private',
      replacementPath: 'promote_wild_holoscript_to_shell_modules',
      glyph: 'WH',
      detail: `${wildSummary.fileCount || 0} wild HoloScript files; .holo ${wildSummary.holoFeatureCount || 0} features, .hs ${wildSummary.hsFeatureCount || 0}, .hsplus ${wildSummary.hsplusFeatureCount || 0}; ${wildSummary.adapterNeededCount || 0} need adapters.`,
      firstScreen: wildSummary.status === 'scanned',
      layout: { x: 19, y: 28, size: 108 },
    },
    {
      id: 'source.holoscript-gold-codebase',
      objectKind: 'source_corpus',
      displayName: 'GOLD + Codebase',
      sourceKind: 'holoscript_substrate',
      sourceRef: goldCodebaseBridge?.sourceAnchors?.adapter || 'scripts/holoshell-holoscript-gold-codebase-bridge.mjs',
      capabilityFamily: 'source_substrate',
      trustState: goldCodebaseSummary.status === 'ready' ? 'verified' : goldCodebaseSummary.status === 'blocked' ? 'unknown' : 'partial',
      permissionEnvelope: 'read_only',
      adapterPath: 'gold_codebase_substrate_bridge',
      visualForm: 'source_orbit',
      status: goldCodebaseSummary.status || 'unknown',
      actorLaneId: 'brittney',
      receiptTypes: ['holoscript_gold_codebase_bridge', 'gold_drive_receipt', 'codebase_graph_receipt'],
      relationships: {
        goldStatus: goldCodebaseSummary.goldStatus || 'unknown',
        goldRootPresent: Boolean(goldCodebaseSummary.goldRootPresent),
        goldEntryCount: goldCodebaseSummary.goldEntryCount || 0,
        goldTierCount: goldCodebaseSummary.goldTierCount || 0,
        goldHotEntryCount: goldCodebaseSummary.goldHotEntryCount || 0,
        conflictPolicy: goldCodebaseSummary.goldConflictPolicy || 'diamond_over_platinum_over_gold_over_knowledge_store',
        codebaseStatus: goldCodebaseSummary.codebaseStatus || 'unknown',
        codebaseToolCount: goldCodebaseSummary.codebaseToolCount || 0,
        graphCacheProtocol: goldCodebaseSummary.graphCacheProtocol || 'unknown',
        surfaceMapStatus: goldCodebaseSummary.surfaceMapStatus || 'unknown',
        formatInventoryStatus: goldCodebaseSummary.formatInventoryStatus || 'unknown',
        queryTemplates: (goldCodebaseBridge?.queryTemplates || []).slice(0, 6),
        hotGoldEntries: (goldCodebaseBridge?.goldDrive?.hotEntries || []).slice(0, 6).map((entry) => ({
          path: entry.path,
          tier: entry.tier,
          title: entry.title,
          ids: entry.ids || [],
        })),
      },
      privacyClass: 'local_private',
      replacementPath: 'ask_existing_substrate_before_new_build',
      glyph: 'GC',
      detail: `GOLD ${goldCodebaseSummary.goldStatus || 'unknown'} with ${goldCodebaseSummary.goldEntryCount || 0} indexed entries; HoloScript codebase ${goldCodebaseSummary.codebaseStatus || 'unknown'} with ${goldCodebaseSummary.codebaseToolCount || 0} tools; graph ${goldCodebaseSummary.graphCacheProtocol || 'unknown'}.`,
      firstScreen: Boolean(goldCodebaseSummary.goldRootPresent || goldCodebaseSummary.codebaseToolCount),
      layout: { x: 9, y: 18, size: 116 },
    },
    {
      id: 'workflow.room-marathon',
      objectKind: 'workflow',
      displayName: 'Room Marathon',
      sourceKind: 'workflow',
      sourceRef: 'scripts/holoshell-room-marathon-workflow.mjs',
      capabilityFamily: 'agent_workflow',
      trustState: roomWorkflowSummary.status === 'pending_user_approval' ? 'partial' : 'verified',
      permissionEnvelope: 'guarded_execute',
      adapterPath: 'workflow_approval_and_brain_intent_gate',
      visualForm: 'workflow_bubble',
      status: roomWorkflowSummary.status || 'available',
      actorLaneId: 'brittney',
      receiptTypes: ['workflow_receipt', 'workflow_approval_bundle', 'brain_intent_gate_receipt'],
      relationships: {
        model: roomWorkflowSummary.model || 'kimi',
        modelRoute: roomWorkflowSummary.modelRoute || 'ollama_cloud',
        approvalStatus: roomWorkflowApprovalSummary.status || 'unknown',
        brainGateStatus: roomGateSummary.status || 'unknown',
      },
      privacyClass: 'local_private',
      replacementPath: 'compound_workflow_object',
      launch: { action: 'stage_room_marathon_workflow', route: '/workflow/room-marathon' },
      glyph: 'RM',
      detail: `${roomWorkflowSummary.stepCount || 0} staged steps; approval ${roomWorkflowApprovalSummary.status || 'unknown'}; brain gate ${roomGateSummary.status || 'unknown'}.`,
      firstScreen: true,
      layout: { x: 77, y: 63, size: 118 },
    },
    {
      id: 'workflow.claude-chat',
      objectKind: 'workflow',
      displayName: 'Claude Chat',
      sourceKind: 'workflow',
      sourceRef: 'scripts/holoshell-claude-chat-workflow.mjs',
      capabilityFamily: 'agent_workflow',
      trustState: claudeWorkflowSummary.status === 'pending_user_approval' ? 'partial' : 'verified',
      permissionEnvelope: 'guarded_execute',
      adapterPath: 'claude_chat_workflow_bridge',
      visualForm: 'workflow_bubble',
      status: claudeWorkflowSummary.status || 'available',
      actorLaneId: 'brittney',
      receiptTypes: ['workflow_receipt', 'workflow_approval_bundle', 'brain_intent_gate_receipt'],
      relationships: {
        targetSurface: claudeWorkflowSummary.targetSurface || 'Claude',
        promptPresent: Boolean(claudeWorkflowSummary.promptPresent),
        shellContextAttachedByDefault: Boolean(claudeWorkflowSummary.shellContextAttachedByDefault),
        approvalStatus: activeWorkflowKind === 'claude_chat' ? workflowApprovalSummary.status || 'unknown' : 'unknown',
        brainGateStatus: activeWorkflowKind === 'claude_chat' ? gateSummary.status || 'unknown' : 'unknown',
      },
      privacyClass: 'local_private',
      replacementPath: 'assistant_peer_chat_object',
      launch: { action: 'stage_claude_chat_workflow', route: '/workflow/claude-chat' },
      glyph: 'CC',
      detail: `${claudeWorkflowSummary.stepCount || 0} staged steps; prompt ${claudeWorkflowSummary.promptPresent ? 'ready' : 'empty'}; approval ${activeWorkflowKind === 'claude_chat' ? workflowApprovalSummary.status || 'unknown' : 'not_staged'}.`,
      firstScreen: true,
      layout: { x: 64, y: 23, size: 108 },
    },
    {
      id: 'workflow.ollama-cloud-agent',
      objectKind: 'workflow',
      displayName: 'Ollama Agents',
      sourceKind: 'workflow',
      sourceRef: 'scripts/holoshell-ollama-cloud-agent-workflow.mjs',
      capabilityFamily: 'agent_workflow',
      trustState: ollamaWorkflowSummary.status === 'pending_user_approval' ? 'partial' : 'verified',
      permissionEnvelope: 'guarded_execute',
      adapterPath: 'ollama_cloud_agent_launcher',
      visualForm: 'workflow_bubble',
      status: ollamaWorkflowSummary.status || 'available',
      actorLaneId: 'brittney',
      receiptTypes: ['workflow_receipt', 'workflow_approval_bundle', 'local_approval_gate_receipt'],
      relationships: {
        commandPrefix: 'ollama launch',
        activeAgent: ollamaWorkflowSummary.agentSlug || '',
        activeCommand: ollamaWorkflowSummary.command || '',
        agentCount: ollamaCloudAgents.length,
        agents: ollamaCloudAgents,
        approvalStatus: activeWorkflowKind === 'ollama_cloud_agent' ? workflowApprovalSummary.status || 'unknown' : 'unknown',
        localGateStatus: activeWorkflowKind === 'ollama_cloud_agent' ? gateSummary.status || 'unknown' : 'unknown',
      },
      privacyClass: 'local_private',
      replacementPath: 'cloud_agent_runtime_launcher',
      launch: { action: 'stage_ollama_cloud_agent_workflow', route: '/workflow/ollama-cloud-agent' },
      glyph: 'OA',
      detail: `${ollamaCloudAgents.length} Ollama Cloud launch targets; active ${ollamaWorkflowSummary.agentLabel || 'none'}; approval ${activeWorkflowKind === 'ollama_cloud_agent' ? workflowApprovalSummary.status || 'unknown' : 'not_staged'}.`,
      firstScreen: true,
      layout: { x: 83, y: 28, size: 106 },
    },
    {
      id: 'workflow.grok-build',
      objectKind: 'agent_lane',
      displayName: 'Grok Build',
      sourceKind: 'workflow',
      sourceRef: 'scripts/holoshell-grok-build-workflow.mjs',
      capabilityFamily: 'agent_workflow',
      trustState: grokWorkflowSummary.status === 'pending_user_approval' || grokBuildSummary.status === 'partial' ? 'partial' : grokBuildSummary.status === 'blocked' ? 'unknown' : 'verified',
      permissionEnvelope: 'guarded_execute',
      adapterPath: 'grok_build_agent_lane',
      visualForm: 'workflow_bubble',
      status: grokWorkflowSummary.status || grokBuildSummary.status || 'available',
      actorLaneId: 'brittney',
      agentLane: true,
      receiptTypes: ['grok_build_setup_receipt', 'workflow_receipt', 'workflow_approval_bundle', 'local_approval_gate_receipt'],
      relationships: {
        cliStatus: grokBuildSummary.cliStatus || 'unknown',
        cliVersion: grokBuildSummary.cliVersion || 'unknown',
        authStatus: grokBuildSummary.authStatus || 'unknown',
        authRuntimeStatus: grokBuildSummary.authRuntimeStatus || 'unknown',
        authProvider: grokBuildSummary.authProvider || '',
        operatorStatus: grokBuildSummary.operatorStatus || grokHeartbeat?.summary?.cliOperatorStatus || 'unknown',
        autonomyStatus: grokBuildSummary.autonomyStatus || grokHeartbeat?.summary?.autonomyStatus || 'unknown',
        modelStatus: grokBuildSummary.modelStatus || 'unknown',
        requestedModel: grokBuildSummary.requestedModel || grokWorkflowSummary.model || 'grok-build',
        defaultModel: grokBuildSummary.defaultModel || grokWorkflowSummary.defaultModel || 'unknown',
        projectTrusted: Boolean(grokBuildSummary.projectTrusted || grokWorkflowSummary.projectTrusted),
        projectTrustStatus: grokBuildSummary.projectTrustStatus || grokWorkflowSummary.projectTrustStatus || 'unknown',
        pathSeenOnCurrentProcess: Boolean(grokBuildSummary.pathSeenOnCurrentProcess),
        activeMode: grokWorkflowSummary.mode || 'interactive',
        promptPresent: Boolean(grokWorkflowSummary.promptPresent),
        approvalStatus: activeWorkflowKind === 'grok_build' ? workflowApprovalSummary.status || 'unknown' : 'unknown',
        localGateStatus: activeWorkflowKind === 'grok_build' ? gateSummary.status || 'unknown' : 'unknown',
        heavyAccessStatus: grokBuildSummary.heavyAccessStatus || grokBuild?.heavyUpgrade?.status || 'unknown',
        heavyVerifiedAt: grokBuild?.heavyUpgrade?.verifiedAt || '',
        readyForGrokBuild: Boolean(grokBuildSummary.readyForGrokBuild),
        heartbeatStatus: grokHeartbeat?.summary?.status || 'unknown',
        heartbeatPresenceStatus: grokHeartbeat?.summary?.agentPresenceStatus || 'unknown',
        heartbeatOperatorStatus: grokHeartbeat?.summary?.cliOperatorStatus || grokHeartbeat?.operator?.status || 'unknown',
        heartbeatAuthRuntimeStatus: grokHeartbeat?.summary?.authRuntimeStatus || grokHeartbeat?.operator?.authRuntimeStatus || 'unknown',
        heartbeatAuthProvider: grokHeartbeat?.summary?.authProvider || grokHeartbeat?.operator?.authProvider || '',
        heartbeatAutonomyStatus: grokHeartbeat?.summary?.autonomyStatus || grokHeartbeat?.operator?.autonomyStatus || 'unknown',
        heartbeatObservationStatus: grokHeartbeat?.summary?.latestObservationStatus || 'none',
        heartbeatObservationRecent: Boolean(grokHeartbeat?.summary?.latestObservationRecent),
        latestObservationStatus: grokObservation?.summary?.status || '',
        latestObservation: grokObservation?.summary?.primaryFinding || '',
        latestObservationFindingCount: grokObservation?.summary?.findingCount || 0,
        warningCount: grokBuildSummary.warningCount || 0,
      },
      privacyClass: 'local_private',
      replacementPath: 'coding_agent_runtime_launcher',
      launch: { action: 'stage_grok_build_workflow', route: '/workflow/grok-build' },
      glyph: 'GB',
      detail: activeWorkflowKind === 'grok_build'
        ? `${grokWorkflowSummary.status || 'unknown'}; ${grokWorkflowSummary.mode || 'interactive'}; ${grokWorkflowSummary.model || 'grok-build'}; approval ${workflowApprovalSummary.status || 'unknown'}; project ${grokWorkflowSummary.projectTrustStatus || 'unknown'}${grokObservation?.summary?.primaryFinding ? `; saw ${grokObservation.summary.primaryFinding}` : ''}.`
        : `Grok ${grokBuildSummary.cliVersion || 'unknown'}; operator ${grokBuildSummary.operatorStatus || grokHeartbeat?.summary?.cliOperatorStatus || 'unknown'}; auth ${grokBuildSummary.authRuntimeStatus || grokBuildSummary.authStatus || 'unknown'}; model ${grokBuildSummary.modelStatus || 'unknown'}; project ${grokBuildSummary.projectTrustStatus || 'unknown'}; Heavy ${grokBuildSummary.heavyAccessStatus || grokBuild?.heavyUpgrade?.status || 'unknown'}.`,
      firstScreen: true,
      layout: { x: 72, y: 17, size: 104 },
    },
    {
      id: 'workflow.asset-shard',
      objectKind: 'workflow',
      displayName: 'Asset Shard',
      sourceKind: 'workflow',
      sourceRef: 'scripts/holoshell-asset-shard-workflow.mjs',
      capabilityFamily: 'creator_workflow',
      trustState: shardSummary.status === 'staged' ? 'verified' : 'partial',
      permissionEnvelope: 'guarded_execute',
      adapterPath: 'asset_shard_workflow_bridge',
      visualForm: 'workflow_bubble',
      status: shardSummary.status || 'available',
      actorLaneId: 'brittney',
      receiptTypes: ['asset_shard_workflow_receipt', 'asset_shard_private_receipt', 'shard_preview_source'],
      relationships: {
        shardId: shardWorkflow?.shardPlan?.shardId || '',
        assetCount: shardSummary.assetCount || 0,
        modelCount: shardSummary.modelCount || 0,
        imageCount: shardSummary.imageCount || 0,
        audioCount: shardSummary.audioCount || 0,
        blockedAssetCount: shardSummary.blockedAssetCount || 0,
        previewSourcePath: shardWorkflow?.output?.previewSourcePath || '',
        importApprovalStatus: shardApprovalSummary.status || 'unknown',
        importStatus: shardImportSummary.status || 'unknown',
        nextWorkflow: shardSummary.nextWorkflow || '',
      },
      privacyClass: 'local_private',
      replacementPath: 'local_folder_to_playable_shard',
      launch: { action: 'stage_asset_shard_workflow', route: '/workflow/asset-shard' },
      glyph: 'AS',
      detail: `${shardSummary.assetCount || 0} staged assets; ${shardSummary.modelCount || 0} models, ${shardSummary.imageCount || 0} images, ${shardSummary.audioCount || 0} audio; import approval ${shardApprovalSummary.status || 'unknown'}; import ${shardImportSummary.status || 'not_run'}.`,
      firstScreen: true,
      layout: { x: 25, y: 66, size: 112 },
    },
    {
      id: 'approval.asset-shard-import',
      objectKind: 'approval',
      displayName: 'Shard Import Approval',
      sourceKind: 'approval',
      sourceRef: shardImportApproval?.output?.latestPath || '',
      capabilityFamily: 'creator_workflow',
      trustState: shardApprovalSummary.executionAllowed ? 'partial' : 'verified',
      permissionEnvelope: 'guarded_execute',
      adapterPath: 'asset_shard_import_approval_bundle',
      visualForm: 'approval_gate',
      status: shardApprovalSummary.status || 'not_required',
      actorLaneId: 'brittney',
      receiptTypes: ['asset_shard_import_approval_bundle', 'asset_shard_import_receipt'],
      relationships: {
        approvalId: shardImportApproval?.approvalId || '',
        shardId: shardApprovalSummary.shardId || '',
        expiresAt: shardApprovalSummary.expiresAt || '',
        executionAllowed: Boolean(shardApprovalSummary.executionAllowed),
      },
      privacyClass: 'local_private',
      replacementPath: 'consent_gate',
      glyph: 'SI',
      detail: `Shard import approval ${shardApprovalSummary.status || 'not_required'} for ${shardApprovalSummary.shardId || 'asset shard'}.`,
      firstScreen: Boolean(shardApprovalSummary.executionAllowed),
      layout: { x: 15, y: 54, size: 96 },
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
      receiptTypes: hardwareApproval?.browserBoundary ? ['hardware_approval_bundle', 'browser_boundary_receipt'] : ['hardware_approval_bundle'],
      relationships: {
        actionKind: hardwareApprovalSummary.actionKind || '',
        target: hardwareApprovalSummary.target || '',
        expiresAt: hardwareApprovalSummary.expiresAt || '',
        trustLevel: hardwareApprovalSummary.trustLevel || 'unknown',
        trustedAutonomyEligible: Boolean(hardwareApprovalSummary.trustedAutonomyEligible),
        browserBoundaryStatus: hardwareApprovalSummary.browserBoundaryStatus || hardwareApproval?.browserBoundary?.urlClassification || '',
        browserProfileBoundary: hardwareApprovalSummary.browserProfileBoundary || hardwareApproval?.browserBoundary?.profileBoundary || '',
        browserCookiePolicy: hardwareApproval?.browserBoundary?.cookiePolicy || '',
        browserScreenshotPolicy: hardwareApproval?.browserBoundary?.screenshotPolicy || '',
      },
      privacyClass: 'local_private',
      replacementPath: 'consent_gate',
      glyph: 'OK',
      detail: `Hardware approval ${hardwareApprovalSummary.status || 'not_required'} for ${hardwareApprovalSummary.target || 'local computer'}; trust ${hardwareApprovalSummary.trustLevel || 'unknown'}${hardwareApproval?.browserBoundary ? `; browser ${hardwareApproval.browserBoundary.urlClassification} / ${hardwareApproval.browserBoundary.profileBoundary}` : ''}.`,
      firstScreen: Boolean(hardwareApprovalSummary.executionAllowed),
      layout: { x: 13, y: 76, size: 104 },
    },
    {
      id: 'policy.trusted-autonomy',
      objectKind: 'policy',
      displayName: 'Trust Ladder',
      sourceKind: 'policy',
      sourceRef: 'apps/holoshell/source/holoshell-trusted-autonomy.hsplus',
      capabilityFamily: 'trusted_autonomy',
      trustState: trustSummary.trustedAutonomyEligible ? 'verified' : trustSummary.status === 'ready' ? 'partial' : 'unknown',
      permissionEnvelope: 'receipt_policy',
      adapterPath: 'trusted_autonomy_ledger',
      visualForm: 'approval_gate',
      status: trustSummary.status || 'empty',
      actorLaneId: 'brittney',
      receiptTypes: ['trust_ledger_receipt', 'hardware_action_receipt', 'hardware_approval_bundle'],
      relationships: {
        latestTrustLevel: trustSummary.latestTrustLevel || 'unknown',
        latestActionKind: trustSummary.latestActionKind || '',
        latestTarget: trustSummary.latestTarget || '',
        trustedAutonomyEligible: Boolean(trustSummary.trustedAutonomyEligible),
        successesUntilTrusted: trustSummary.successesUntilTrusted || 0,
        promotionThreshold: trustSummary.promotionThreshold || trustLedger?.policy?.promotionThreshold || 3,
        trustedRecordCount: trustSummary.trustedRecordCount || 0,
        guardedRecordCount: trustSummary.guardedRecordCount || 0,
        breakGlassRecordCount: trustSummary.breakGlassRecordCount || 0,
      },
      privacyClass: 'local_private',
      replacementPath: 'approval_to_trusted_autonomy',
      glyph: 'TL',
      detail: `Trust ladder ${trustSummary.latestTrustLevel || 'unknown'}; ${trustSummary.trustedRecordCount || 0} trusted, ${trustSummary.guardedRecordCount || 0} guarded, ${trustSummary.breakGlassRecordCount || 0} break-glass record(s).`,
      firstScreen: true,
      layout: { x: 18, y: 64, size: 104 },
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
      receiptTypes: ['browser_boundary_receipt', 'hardware_action_receipt', 'approval_bundle'],
      relationships: {
        target: 'youtube_lofi_search',
        mode: 'browser_media',
        browserBoundary: browserBoundaryForProgram(null, 'https://www.youtube.com/results?search_query=lofi+beats'),
      },
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

function founderBootObjects(feeds) {
  const preview = feeds.founderBootPreview || {};
  const formatInventory = feeds.formatInventory || {};
  const summary = preview.summary || {};
  const formatSummary = formatInventory.summary || {};
  const objects = [];

  if (preview.summary) {
    objects.push({
      id: 'surface.founder-boot-preview',
      objectKind: 'operating_world',
      displayName: 'Founder Boot',
      sourceKind: 'holoscript',
      sourceRef: preview.source?.world || 'apps/holoshell/source/holoshell-shell-world.holo',
      capabilityFamily: 'founder_shell',
      trustState: summary.status === 'ready' ? 'verified' : 'partial',
      permissionEnvelope: 'read_only',
      adapterPath: 'holo_world_with_hs_render_slice',
      visualForm: 'world_anchor',
      status: summary.status || 'unknown',
      actorLaneId: 'brittney',
      receiptTypes: ['founder_boot_preview', 'format_inventory'],
      relationships: {
        renderSlice: preview.source?.renderSlice || 'apps/holoshell/source/holoshell-shell-render.hs',
        worldObjectCount: summary.worldObjectCount || 0,
        renderObjectCount: summary.renderObjectCount || 0,
        formatViewerCardCount: summary.formatViewerCardCount || 0,
        userCapabilityPackCount: summary.userCapabilityPackCount || 0,
        brittneyProposalCount: summary.brittneyProposalCount || 0,
        bootSequence: (preview.founderBootSequence || []).map((step) => `${step.step}:${step.status}`),
      },
      privacyClass: 'local_private',
      replacementPath: 'founder_shell_boot_surface',
      launch: { action: 'preview_founder_boot', route: '/founder-boot' },
      glyph: 'FB',
      detail: `.holo world plus .hs render slice: ${summary.worldObjectCount || 0}/${summary.renderObjectCount || 0} objects; ${summary.userCapabilityPackCount || 0} user packs staged.`,
      firstScreen: true,
      layout: { x: 41, y: 8, size: 148 },
    });
  }

  if (formatInventory.summary || preview.formatViewer) {
    const cards = preview.formatViewer?.cards || formatInventory.formatViewerCards || [];
    objects.push({
      id: 'source.format-viewer',
      objectKind: 'source_corpus',
      displayName: 'Format Viewer',
      sourceKind: 'holoscript_corpus',
      sourceRef: formatInventory.source?.script || 'scripts/holoshell-format-inventory.mjs',
      capabilityFamily: 'source_corpus',
      trustState: formatSummary.status === 'scanned' ? 'verified' : 'partial',
      permissionEnvelope: 'read_only',
      adapterPath: 'format_inventory_viewer',
      visualForm: 'source_orbit',
      status: formatSummary.status || summary.status || 'unknown',
      actorLaneId: 'brittney',
      receiptTypes: ['format_inventory', 'wild_holoscript_intake_receipt'],
      relationships: {
        totalFileCount: formatSummary.totalFileCount || 0,
        featureFamilyCount: formatSummary.totalFeatureFamilies || 0,
        cardCount: cards.length,
        cards: cards.map((card) => ({
          id: card.id,
          label: card.label,
          files: card.files,
          features: card.features,
          topFeature: card.topFeature,
        })),
      },
      privacyClass: 'local_private',
      replacementPath: 'format_capability_browser',
      launch: { action: 'inspect_format_lanes', route: '/formats' },
      glyph: 'FV',
      detail: `${cards.length || 0} format lane cards; ${formatSummary.totalFileCount || 0} source files across canonical and wild HoloScript.`,
      firstScreen: true,
      layout: { x: 24, y: 18, size: 112 },
    });
  }

  for (const [index, pack] of (preview.userCapabilityPacks || []).entries()) {
    objects.push({
      id: pack.id,
      objectKind: 'workflow',
      displayName: pack.label || 'User Pack',
      sourceKind: 'workflow',
      sourceRef: preview.source?.script || 'scripts/holoshell-founder-boot-preview.mjs',
      capabilityFamily: 'user_capability_pack',
      trustState: 'partial',
      permissionEnvelope: pack.permissionEnvelope || 'guarded_execute',
      adapterPath: 'founder_to_user_capability_pack',
      visualForm: index === 0 ? 'portal_bubble' : 'document_machine',
      status: pack.executionDefault || 'staged_not_run',
      actorLaneId: 'brittney',
      receiptTypes: pack.receiptTypes || ['approval_bundle'],
      relationships: {
        derivedFrom: pack.derivedFrom || 'founder_surface',
        targetObjectId: pack.targetObjectId || '',
        steps: pack.steps || [],
      },
      privacyClass: 'local_private',
      replacementPath: 'curated_user_shell_action',
      launch: { action: 'stage_user_capability_pack', packId: pack.id },
      glyph: pack.id.includes('excel') ? 'XL' : 'LO',
      detail: `${pack.label || 'User pack'} is derived from ${pack.derivedFrom || 'founder power'} and stays staged until approval.`,
      firstScreen: true,
      layout: layout(18 + index, 96),
    });
  }

  if (preview.brittneyOperatorBridge) {
    const bridge = preview.brittneyOperatorBridge;
    objects.push({
      id: 'assistant.brittney.operator-bridge',
      objectKind: 'assistant_avatar',
      displayName: 'Brittney Operator',
      sourceKind: 'holoscript',
      sourceRef: 'apps/holoshell/source/holoshell-founder-boot-loop.hsplus',
      capabilityFamily: 'assistant',
      trustState: bridge.status === 'ready' ? 'verified' : 'partial',
      permissionEnvelope: 'intent_scoped',
      adapterPath: 'brittney_selected_object_operator',
      visualForm: 'avatar_anchor',
      status: bridge.status || 'unknown',
      actorLaneId: 'brittney',
      receiptTypes: ['founder_boot_preview', 'brittney_turn_receipt', 'approval_bundle'],
      relationships: {
        selectedObjectDefault: bridge.selectedObjectDefault || 'shell.hololand',
        proposalCount: (bridge.proposals || []).length,
        readableFormatCards: bridge.readableFormatCards || [],
      },
      privacyClass: 'local_private',
      replacementPath: 'assistant_operates_selected_shell_object',
      launch: { action: 'ask_brittney_to_operate_selected_object' },
      glyph: 'BO',
      detail: `${(bridge.proposals || []).length} operator proposal(s): inspect, explain, and stage guarded user packs.`,
      firstScreen: true,
      layout: { x: 60, y: 73, size: 108 },
    });
  }

  return objects;
}

function userShellProjectionObjects(feeds) {
  const projection = feeds.userShellProjection || {};
  const summary = projection.summary || {};
  const objects = [];
  if (!projection.summary) return objects;

  objects.push({
    id: 'surface.user-shell-projection',
    objectKind: 'user_shell',
    displayName: 'User Shell',
    sourceKind: 'holoscript',
    sourceRef: projection.source?.sourceContract || 'apps/holoshell/source/holoshell-user-shell-projection.hsplus',
    capabilityFamily: 'user_shell',
    trustState: summary.status === 'ready' ? 'verified' : 'partial',
    permissionEnvelope: 'read_only',
    adapterPath: projection.source?.script || 'scripts/holoshell-user-shell-projection.mjs',
    visualForm: 'mode_orbit',
    status: summary.status || 'unknown',
    actorLaneId: 'brittney',
    receiptTypes: ['user_shell_projection', 'founder_boot_preview', 'format_inventory'],
    relationships: {
      modeCount: summary.modeCount || 0,
      userModeCount: summary.userModeCount || 0,
      capabilityPackCount: summary.capabilityPackCount || 0,
      founderOnlyPowerCount: summary.founderOnlyPowerCount || 0,
      brittneyTranslationCount: summary.brittneyTranslationCount || 0,
      founderSurface: projection.shellDerivation?.founderSurface || 'surface.founder-boot-preview',
      rule: projection.shellDerivation?.rule || 'user_shell_is_derived_from_founder_shell',
    },
    privacyClass: 'local_private',
    replacementPath: 'founder_shell_to_user_shell_projection',
    launch: { action: 'inspect_user_shell_projection', route: '/user-shell' },
    glyph: 'US',
    detail: `${summary.userModeCount || 0} user mode(s), ${summary.capabilityPackCount || 0} pack(s), ${summary.brittneyTranslationCount || 0} Brittney translation(s).`,
    firstScreen: true,
    layout: { x: 46, y: 24, size: 136 },
  });

  for (const [index, mode] of (projection.modes || []).entries()) {
    objects.push({
      id: `mode.${mode.id}`,
      objectKind: 'user_shell_mode',
      displayName: mode.label || mode.id,
      sourceKind: 'holoscript',
      sourceRef: projection.source?.sourceContract || 'apps/holoshell/source/holoshell-user-shell-projection.hsplus',
      capabilityFamily: mode.id?.startsWith('founder.') ? 'founder_shell' : 'user_shell',
      trustState: 'partial',
      permissionEnvelope: 'read_only',
      adapterPath: 'user_shell_mode_projection',
      visualForm: mode.id === 'user.daily' ? 'home_bubble' : 'mode_bubble',
      status: 'available',
      actorLaneId: 'brittney',
      receiptTypes: ['user_shell_projection'],
      relationships: {
        audience: mode.audience || '',
        defaultSkin: mode.defaultSkin || '',
        visibleBubbleIds: mode.visibleBubbleIds || [],
        hiddenFounderPowers: mode.hiddenFounderPowers || [],
        safetyPosture: mode.safetyPosture || '',
      },
      privacyClass: 'local_private',
      replacementPath: 'mode_switcher',
      launch: { action: 'select_user_shell_mode', modeId: mode.id },
      glyph: mode.id === 'founder.full' ? 'FO' : mode.id === 'user.creator' ? 'CR' : mode.id === 'user.operator' ? 'OP' : 'DY',
      detail: `${mode.audience || 'user'} mode; ${mode.visibleBubbleIds?.length || 0} visible bubbles; ${mode.safetyPosture || 'receipt visible'}.`,
      firstScreen: mode.id === 'user.daily',
      layout: layout(72 + index, 90),
    });
  }

  for (const [index, pack] of (projection.capabilityPacks || []).entries()) {
    objects.push({
      id: `user-shell.pack.${slug(pack.id)}`,
      objectKind: 'workflow',
      displayName: pack.label || pack.id,
      sourceKind: 'workflow',
      sourceRef: projection.source?.script || 'scripts/holoshell-user-shell-projection.mjs',
      capabilityFamily: 'user_capability_pack',
      trustState: pack.permissionEnvelope === 'read_only' ? 'verified' : 'partial',
      permissionEnvelope: pack.permissionEnvelope || 'guarded_execute',
      adapterPath: 'brittney_user_intent_translator',
      visualForm: pack.permissionEnvelope === 'read_only' ? 'source_orbit' : 'portal_bubble',
      status: pack.executionDefault || 'staged_not_run',
      actorLaneId: 'brittney',
      receiptTypes: pack.receiptTypes || ['approval_bundle'],
      relationships: {
        userPhrase: pack.userPhrase || '',
        derivedFrom: pack.derivedFrom || '',
        targetObjectId: pack.targetObjectId || '',
        modeIds: pack.modeIds || [],
        steps: pack.steps || [],
        currentReceiptStatus: pack.currentReceiptStatus || '',
      },
      privacyClass: 'local_private',
      replacementPath: 'plain_language_capability_pack',
      launch: { action: 'stage_user_capability_pack', packId: pack.id },
      glyph: glyphFor(pack.label || pack.id, 'UP'),
      detail: `${pack.userPhrase || pack.label || pack.id}; ${pack.permissionEnvelope || 'guarded_execute'}; ${pack.executionDefault || 'staged_not_run'}.`,
      firstScreen: (pack.modeIds || []).includes('user.daily'),
      layout: layout(78 + index, 88),
    });
  }

  objects.push({
    id: 'assistant.brittney.user-translator',
    objectKind: 'assistant_avatar',
    displayName: 'Brittney Translator',
    sourceKind: 'holoscript',
    sourceRef: projection.source?.sourceContract || 'apps/holoshell/source/holoshell-user-shell-projection.hsplus',
    capabilityFamily: 'assistant',
    trustState: projection.brittneyTranslationLayer?.status === 'ready' ? 'verified' : 'partial',
    permissionEnvelope: 'intent_scoped',
    adapterPath: 'user_intent_to_shell_pack',
    visualForm: 'avatar_anchor',
    status: projection.brittneyTranslationLayer?.status || 'unknown',
    actorLaneId: 'brittney',
    receiptTypes: ['user_shell_projection', 'brittney_turn_receipt', 'approval_bundle'],
    relationships: {
      defaultMode: projection.brittneyTranslationLayer?.defaultMode || 'user.daily',
      translationCount: summary.brittneyTranslationCount || 0,
      translations: (projection.brittneyTranslationLayer?.translations || []).slice(0, 8).map((translation) => ({
        userPhrase: translation.userPhrase,
        targetPackId: translation.targetPackId,
        permissionEnvelope: translation.permissionEnvelope,
      })),
    },
    privacyClass: 'local_private',
    replacementPath: 'assistant_translates_plain_language_to_receipt_bound_actions',
    launch: { action: 'ask_brittney_user_intent' },
    glyph: 'BT',
    detail: `${summary.brittneyTranslationCount || 0} plain-language translation(s) from user intent to staged shell packs.`,
    firstScreen: true,
    layout: { x: 64, y: 58, size: 116 },
  });

  objects.push({
    id: 'policy.founder-only-boundary',
    objectKind: 'policy',
    displayName: 'Founder Boundary',
    sourceKind: 'holoscript',
    sourceRef: projection.source?.sourceContract || 'apps/holoshell/source/holoshell-user-shell-projection.hsplus',
    capabilityFamily: 'user_shell_policy',
    trustState: 'verified',
    permissionEnvelope: 'founder_only',
    adapterPath: 'founder_power_boundary',
    visualForm: 'warning_token',
    status: 'available',
    actorLaneId: 'brittney',
    receiptTypes: ['user_shell_projection'],
    relationships: {
      founderOnlyPowers: (projection.founderOnlyPowers || []).map((power) => power.id),
      hiddenMeansRequiresFounderModeOrApproval: Boolean(projection.shellDerivation?.hiddenMeansRequiresFounderModeOrApproval),
    },
    privacyClass: 'local_private',
    replacementPath: 'founder_power_visible_as_safe_user_surface',
    launch: { action: 'inspect_founder_only_boundary' },
    glyph: 'FO',
    detail: `${summary.founderOnlyPowerCount || 0} founder-only power(s) hidden or translated in the user shell.`,
    firstScreen: false,
    layout: layout(90, 84),
  });

  return objects;
}

function developmentalEnvironmentObjects(feeds) {
  const receipt = feeds.developmentalEnvironment || {};
  const summary = receipt.summary || {};
  const objects = [];
  if (!receipt.summary) return objects;

  const sourceRef = receipt.sourceAnchors?.source || 'apps/holoshell/source/holoshell-developmental-environment.hsplus';
  const trustState = summary.massFunctionSettled && summary.mappingFunctionSettled ? 'verified' : 'partial';
  const spine = Array.isArray(receipt.spine) ? receipt.spine : [];
  const boardTasks = Array.isArray(receipt.boardTasks) ? receipt.boardTasks : [];

  objects.push({
    id: 'source.developmental-environment',
    objectKind: 'operating_world',
    displayName: 'Developmental Environment',
    sourceKind: 'holoscript',
    sourceRef,
    capabilityFamily: 'developmental_environment',
    trustState,
    permissionEnvelope: 'read_only',
    adapterPath: receipt.sourceAnchors?.adapter || 'scripts/holoshell-developmental-environment.mjs',
    visualForm: 'source_orbit',
    status: summary.status || 'unknown',
    actorLaneId: 'brittney',
    receiptTypes: ['developmental_environment_receipt', 'diamond_ruling_receipt'],
    relationships: {
      research: receipt.sourceAnchors?.research || 'ai-ecosystem/research/2026-05-14_ui-ux-developmental-environment.md',
      researchPresent: Boolean(summary.researchPresent),
      reframe: receipt.thesis?.reframe || 'wireframe_to_simulation_to_geometrics',
      telos: receipt.thesis?.telos || 'developmental_environment',
      brittneyRole: receipt.thesis?.brittneyRole || 'assistant_parent_presence',
      spine: spine.map((layer) => layer.id),
      boardTasks: boardTasks.map((task) => task.id),
      threads: (receipt.threads || []).map((thread) => thread.thread || thread),
      massFunction: receipt.thesis?.massFunctionRuling || 'derived_not_authored',
      mappingFunction: receipt.thesis?.mappingFunctionRuling || 'pure_function_of_physics_state',
      honestyPrinciple: summary.honestyPrinciple || receipt.thesis?.mappingHonestyPrinciple || '',
      nextMove: summary.nextMove || '',
    },
    privacyClass: 'local_private',
    replacementPath: 'simulation_first_shell_substrate',
    launch: { action: 'inspect_developmental_environment', route: '/developmental-environment' },
    glyph: 'DE',
    detail: `wireframe -> simulation -> geometrics; ${summary.spineLayerCount || spine.length || 0} spine layers; mass ${receipt.thesis?.massFunctionRuling || 'unknown'}; mapping ${receipt.thesis?.mappingFunctionRuling || 'unknown'}.`,
    firstScreen: true,
    layout: { x: 36, y: 32, size: 124 },
  });

  objects.push({
    id: 'policy.physics-honesty',
    objectKind: 'policy',
    displayName: 'Physics Honesty',
    sourceKind: 'holoscript',
    sourceRef,
    capabilityFamily: 'developmental_environment_policy',
    trustState,
    permissionEnvelope: 'read_only',
    adapterPath: 'physics_state_to_animation_mapping',
    visualForm: 'warning_token',
    status: summary.mappingFunctionSettled ? 'settled' : 'engineering_next',
    actorLaneId: 'brittney',
    receiptTypes: ['developmental_environment_receipt'],
    relationships: {
      massFunction: receipt.functions?.massFunction?.boardTaskId || '',
      mappingFunction: receipt.functions?.physicsAnimationMapping?.boardTaskId || '',
      cosmeticAnimationAllowed: false,
      rule: receipt.thesis?.mappingHonestyPrinciple || 'animation must be explainable from physics state',
    },
    privacyClass: 'local_private',
    replacementPath: 'honest_visual_signal_policy',
    launch: { action: 'inspect_physics_honesty_policy' },
    glyph: 'PH',
    detail: `Animation is a pure view of physics state; ${summary.openEngineeringTaskCount || 0} engineering task(s) still open.`,
    firstScreen: false,
    layout: layout(94, 84),
  });

  return objects;
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
      const browserBoundary = objectKind === 'browser_surface' ? browserBoundaryForProgram(program) : null;
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
        receiptTypes: browserBoundary
          ? ['program_registry_receipt', 'browser_boundary_receipt', 'hardware_action_receipt', 'approval_bundle']
          : ['program_registry_receipt', 'hardware_action_receipt', 'approval_bundle'],
        relationships: {
          programRegistryId: program.id,
          capabilityClass: program.capabilityClass || 'application',
          source: program.source || 'unknown',
          launchTargetType: program.launchTarget?.type || 'unknown',
          runningWindowId: program.runningWindowId || '',
          runningWindowTitle: program.runningWindowTitle || '',
          runningProcessName: program.runningProcessName || '',
          browserBoundary,
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
  const selectedWindowId = osUiCapture?.summary?.selectedWindowId || osUiCapture?.summary?.foregroundWindowId || '';
  return windows
    .filter((window) => window?.id && (window.title || window.processName))
    .slice(0, Math.max(0, maxWindows))
    .map((window, index) => {
      const slot = layout(index + 10, 84);
      const legacySurface = window.legacySurface || {};
      const safeActions = Array.isArray(legacySurface.safeActions) ? legacySurface.safeActions.slice(0, 10) : [];
      const blockedActions = Array.isArray(legacySurface.blockedActions) ? legacySurface.blockedActions.slice(0, 12) : [];
      const selectedForReconstruction = window.id === selectedWindowId;
      return {
        id: `window.${slug(window.processName || 'app')}.${shortHash(window.id)}`,
        objectKind: 'captured_window',
        displayName: window.title || window.processName || 'Window',
        sourceKind: 'captured_ui',
        sourceRef: window.id,
        capabilityFamily: 'legacy_ui',
        trustState: 'partial',
        permissionEnvelope: 'read_only',
        adapterPath: 'os_ui_capture_bridge',
        visualForm: 'geometry_shard_cluster',
        status: selectedForReconstruction ? 'selected' : window.foreground ? 'foreground' : 'running',
        actorLaneId: 'brittney',
        receiptTypes: ['os_ui_capture_receipt', 'legacy_app_absorption_receipt', 'hardware_action_receipt'],
        relationships: {
          processName: window.processName || '',
          processId: window.processId || '',
          controlCount: Array.isArray(window.controls) ? window.controls.length : window.controlCount || 0,
          foreground: Boolean(window.foreground),
          minimized: Boolean(window.minimized),
          captureEvidence: window.captureEvidence || 'win32_uiautomation',
          selectedForReconstruction,
          targetResolution: selectedForReconstruction ? osUiCapture?.summary?.targetResolution || '' : '',
          geometryNodeCount: selectedForReconstruction ? osUiCapture?.summary?.geometryNodeCount || 0 : 0,
          actionBridgeStatus: selectedForReconstruction ? osUiCapture?.summary?.actionBridgeStatus || '' : '',
          appName: legacySurface.appName || '',
          appLabel: legacySurface.label || '',
          archetype: legacySurface.archetype || '',
          surfaceRole: legacySurface.surfaceRole || 'legacy_app_surface',
          mutationPolicy: legacySurface.mutationPolicy || 'preflight_required',
          captureCandidate: Boolean(legacySurface.captureCandidate),
          preflightRequired: legacySurface.preflightRequired !== false,
          preflightTool: legacySurface.preflightTool || 'holoshell_preflight_legacy_app_mutation',
          safeActions,
          blockedActions,
        },
        privacyClass: 'local_private',
        replacementPath: 'reconstruct_legacy_ui_as_geometry',
        launch: {
          action: 'focus_window',
          windowId: window.id,
          permissionEnvelope: 'guarded_execute',
          preflightRequired: true,
        },
        glyph: glyphFor(window.processName || window.title, 'UI'),
        detail: `${legacySurface.label || window.title || window.processName} is a ${legacySurface.archetype || 'legacy'} surface; read-only capture is available; legacy actions require guarded receipts.`,
        firstScreen: selectedForReconstruction || index < 4,
        layout: slot,
      };
    });
}

function agentObjects(lanes, maxAgents) {
  const laneList = Array.isArray(lanes?.lanes) ? lanes.lanes : [];
  return laneList.slice(0, Math.max(0, maxAgents)).map((lane, index) => {
    const slot = layout(index + 4, 88);
    const heartbeat = lane.heartbeat || null;
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
      receiptTypes: heartbeat
        ? ['agent_lane_manifest', 'grok_heartbeat_receipt', 'run_custody_receipt']
        : ['agent_lane_manifest', 'run_custody_receipt'],
      relationships: {
        agentKind: lane.agentKind || '',
        surfaceKind: lane.surfaceKind || '',
        role: lane.role || '',
        processDetected: Boolean(lane.processEvidence?.detected),
        heartbeatStatus: heartbeat?.status || '',
        heartbeatGeneratedAt: heartbeat?.generatedAt || '',
        heavyAccessStatus: heartbeat?.heavyAccessStatus || '',
        readyForGrokBuild: Boolean(heartbeat?.readyForGrokBuild),
        latestObservationStatus: heartbeat?.latestObservationStatus || '',
        latestObservationAgeMs: heartbeat?.latestObservationAgeMs ?? null,
        primaryFinding: heartbeat?.primaryFinding || '',
      },
      privacyClass: 'local_private',
      replacementPath: 'invite_agent_into_shell',
      glyph: glyphFor(lane.displayName || lane.agentKind, 'A'),
      detail: heartbeat?.status
        ? `${lane.displayName || lane.laneId} lane is ${lane.status || 'unknown'}; heartbeat ${heartbeat.status}; observation ${heartbeat.latestObservationStatus || 'none'}.`
        : `${lane.displayName || lane.laneId} lane is ${lane.status || 'unknown'} for ${lane.role || 'agent work'}.`,
      firstScreen: index < 3,
      layout: slot,
    };
  });
}

function readinessStatusTrust(status) {
  if (status === 'pass') return 'verified';
  if (status === 'warn' || status === 'skipped' || status === 'reported_fail' || status === 'fail') return 'partial';
  return 'unknown';
}

function readinessTokenGlyph(token) {
  const id = String(token?.id || token?.kind || '').toLowerCase();
  if (id.includes('build')) return 'PB';
  if (id.includes('source')) return 'SV';
  if (id.includes('webgpu')) return 'WG';
  if (id.includes('wasm')) return 'WA';
  if (id.includes('headset')) return 'VR';
  if (id.includes('replay')) return 'RP';
  if (id.includes('graph')) return 'GR';
  if (id.includes('task')) return 'HM';
  if (id.includes('mcp') || id.includes('custody')) return 'MC';
  return 'EV';
}

function readinessObjects(readinessEvidence) {
  if (!readinessEvidence?.summary) return [];
  const summary = readinessEvidence.summary;
  const objects = [{
    id: 'room.world-build-readiness',
    objectKind: 'readiness_room',
    displayName: 'World Build Readiness',
    sourceKind: 'receipt',
    sourceRef: readinessEvidence.source?.reportPath || readinessEvidence.source?.evidenceDir || '',
    capabilityFamily: 'readiness_evidence',
    trustState: readinessStatusTrust(summary.status),
    permissionEnvelope: 'read_only',
    adapterPath: 'readiness_evidence_ingestion',
    visualForm: 'room',
    status: summary.status || 'unknown',
    actorLaneId: 'brittney',
    receiptTypes: ['readiness_evidence_pack', 'device_lab_receipt', 'build_log', 'source_validations'],
    relationships: {
      scenario: summary.scenario || '',
      nextWorkflow: summary.nextWorkflow || '',
      buildStatus: summary.buildStatus || '',
      deviceLabStatus: summary.deviceLabStatus || '',
      graphStatus: summary.graphStatus || '',
      tokenCount: summary.tokenCount || 0,
      warningCount: summary.warningCount || 0,
    },
    privacyClass: 'local_private',
    replacementPath: 'world_build_readiness_room',
    glyph: 'WR',
    detail: `${summary.scenario || 'World build readiness'}; build ${summary.buildStatus || 'unknown'}; device ${summary.deviceLabStatus || 'unknown'}; ${summary.warningCount || 0} warning token(s).`,
    firstScreen: true,
    layout: { x: 22, y: 15, size: 116 },
  }];

  const tokenSlots = [
    { x: 17, y: 42, size: 80 },
    { x: 29, y: 31, size: 78 },
    { x: 38, y: 62, size: 78 },
    { x: 50, y: 17, size: 76 },
    { x: 72, y: 17, size: 78 },
    { x: 83, y: 31, size: 76 },
    { x: 87, y: 66, size: 78 },
    { x: 35, y: 83, size: 76 },
  ];

  for (const [index, token] of (readinessEvidence.tokens || []).slice(0, 8).entries()) {
    const slot = tokenSlots[index] || layout(index + 18, 76);
    objects.push({
      id: `receipt.${token.id || `readiness-${index}`}`,
      objectKind: 'receipt',
      displayName: token.title || 'Readiness Token',
      sourceKind: 'receipt',
      sourceRef: token.source || readinessEvidence.source?.evidenceDir || '',
      capabilityFamily: 'readiness_evidence',
      trustState: token.trustState || readinessStatusTrust(token.status),
      permissionEnvelope: token.status === 'skipped' || token.status === 'warn' ? 'manual_witness' : 'read_only',
      adapterPath: 'readiness_evidence_ingestion',
      visualForm: token.status === 'pass' ? 'timeline_node' : 'warning_token',
      status: token.status || 'unknown',
      actorLaneId: 'codex-hardware',
      receiptTypes: [token.receiptType || 'readiness_evidence_pack'],
      relationships: {
        tokenKind: token.kind || '',
        nextAction: token.nextAction || '',
        readinessId: readinessEvidence.readinessId || '',
      },
      privacyClass: 'local_private',
      replacementPath: token.nextAction ? 'attach_missing_evidence' : 'receipt_memory',
      glyph: readinessTokenGlyph(token),
      detail: `${token.detail || token.title || 'Readiness evidence token.'}${token.nextAction ? ` Next: ${token.nextAction}` : ''}`,
      firstScreen: index < 5 || token.status !== 'pass',
      layout: slot,
    });
  }

  return objects;
}

function mcpCustodyContractObjects(mcpCustodyContract) {
  if (!mcpCustodyContract?.summary) return [];
  const summary = mcpCustodyContract.summary;
  const nativeReady = Boolean(summary.nativeMcpCustodySplit);
  return [{
    id: 'receipt.mcp-custody-contract',
    objectKind: 'receipt',
    displayName: 'MCP Custody Contract',
    sourceKind: 'receipt',
    sourceRef: mcpCustodyContract.sourceAnchors?.adapter || 'scripts/holoshell-mcp-custody-contract.mjs',
    capabilityFamily: 'mcp_custody_contract',
    trustState: nativeReady ? 'verified' : 'partial',
    permissionEnvelope: 'read_only',
    adapterPath: 'holoshell_mcp_custody_contract',
    visualForm: summary.status === 'pass' ? 'receipt_node' : 'warning_token',
    status: summary.status || 'unknown',
    actorLaneId: 'codex-hardware',
    receiptTypes: [mcpCustodyContract.schemaVersion || 'hololand.holoshell.mcp-custody-contract.v0.1.0'],
    relationships: {
      compatibilityMode: summary.compatibilityMode || 'unknown',
      nativeMcpCustodySplit: nativeReady,
      cleanupCandidateCount: summary.cleanupCandidateCount || 0,
      ownerHandoffPlanCount: summary.ownerHandoffPlanCount || 0,
      checkPassCount: summary.checkPassCount || 0,
      checkWarnCount: summary.checkWarnCount || 0,
      checkFailCount: summary.checkFailCount || 0,
      nextAction: mcpCustodyContract.compliance?.nextAction || '',
    },
    privacyClass: 'local_private',
    replacementPath: nativeReady ? 'global_mcp_consumption' : 'upgrade_holoshell_mcp_snapshot',
    glyph: 'MC',
    detail: `MCP custody split ${summary.compatibilityMode || 'unknown'}; ${summary.cleanupCandidateCount || 0} cleanup candidate(s), ${summary.ownerHandoffPlanCount || 0} owner handoff(s).`,
    firstScreen: !nativeReady,
    layout: { x: 63, y: 78, size: 76 },
  }];
}

function mcpUpstreamHandoffObjects(mcpUpstreamHandoff) {
  if (!mcpUpstreamHandoff?.summary) return [];
  const summary = mcpUpstreamHandoff.summary;
  const nativeReady = summary.status === 'native_ready_no_handoff_needed';
  return [{
    id: 'receipt.mcp-custody-upstream-handoff',
    objectKind: 'receipt',
    displayName: 'MCP Upstream Handoff',
    sourceKind: 'receipt',
    sourceRef: mcpUpstreamHandoff.sourceAnchors?.adapter || 'scripts/holoshell-mcp-upstream-handoff.mjs',
    capabilityFamily: 'mcp_custody_upstream_handoff',
    trustState: nativeReady ? 'verified' : 'partial',
    permissionEnvelope: 'read_only',
    adapterPath: 'holoshell_mcp_upstream_handoff',
    visualForm: nativeReady ? 'receipt_node' : 'handoff_card',
    status: summary.status || 'unknown',
    actorLaneId: 'codex-hardware',
    receiptTypes: [mcpUpstreamHandoff.schemaVersion || 'hololand.holoshell.mcp-custody-upstream-handoff.v0.1.0'],
    relationships: {
      targetTool: summary.targetTool || 'holoshell_run_registry_snapshot',
      currentCompatibilityMode: summary.currentCompatibilityMode || 'unknown',
      nativeMcpCustodySplit: Boolean(summary.nativeMcpCustodySplit),
      upstreamRepoRequired: Boolean(summary.upstreamRepoRequired),
      taskCount: summary.taskCount || 0,
      acceptanceGateCount: summary.acceptanceGateCount || 0,
    },
    privacyClass: 'local_private',
    replacementPath: nativeReady ? 'native_mcp_contract_memory' : 'route_to_mcp_host_agent',
    glyph: 'UH',
    detail: `${summary.targetTool || 'holoshell_run_registry_snapshot'} handoff ${summary.status || 'unknown'}; ${summary.taskCount || 0} task(s), ${summary.acceptanceGateCount || 0} gate(s).`,
    firstScreen: !nativeReady,
    layout: { x: 74, y: 79, size: 76 },
  }];
}

function assetShardObjects({ shardWorkflow, shardImport }) {
  if (!shardWorkflow?.summary && !shardImport?.summary) return [];
  const objects = [];
  if (!shardWorkflow?.summary) return objects;
  const summary = shardWorkflow.summary;
  objects.push({
    id: `receipt.asset-shard.${shortHash(shardWorkflow.workflowId || shardWorkflow.generatedAt || 'asset-shard')}`,
    objectKind: 'receipt',
    displayName: 'Shard Workflow Receipt',
    sourceKind: 'receipt',
    sourceRef: shardWorkflow.output?.latestPath || '',
    capabilityFamily: 'creator_workflow',
    trustState: summary.status === 'staged' ? 'verified' : 'partial',
    permissionEnvelope: 'read_only',
    adapterPath: 'asset_shard_workflow_bridge',
    visualForm: summary.status === 'blocked' ? 'warning_token' : 'receipt_node',
    status: summary.status || 'unknown',
    actorLaneId: 'codex-hardware',
    receiptTypes: ['asset_shard_workflow_receipt', 'shard_preview_source'],
    relationships: {
      shardId: shardWorkflow.shardPlan?.shardId || '',
      assetCount: summary.assetCount || 0,
      previewSourcePath: shardWorkflow.output?.previewSourcePath || '',
      privateReceiptPath: shardWorkflow.output?.privateReceiptPath || '',
      sourceAssetsMutated: Boolean(shardWorkflow.rollback?.sourceAssetsMutated),
    },
    privacyClass: 'local_private',
    replacementPath: 'receipt_memory',
    glyph: 'SR',
    detail: `${summary.assetCount || 0} asset(s) staged into ${summary.previewObjectCount || 0} preview object(s); source mutation ${summary.mutationExecuted ? 'recorded' : 'none'}.`,
    firstScreen: summary.status === 'blocked',
    layout: layout(18, 82),
  });

  if (shardImport?.summary && shardImport.summary.status !== 'not_run') {
    objects.push({
      id: `receipt.asset-shard-import.${shortHash(shardImport.importId || shardImport.generatedAt || 'asset-shard-import')}`,
      objectKind: 'receipt',
      displayName: 'Shard Import Receipt',
      sourceKind: 'receipt',
      sourceRef: shardImport.output?.receiptPath || '',
      capabilityFamily: 'creator_workflow',
      trustState: shardImport.summary.status === 'completed' && !shardImport.summary.sourceAssetsMutated ? 'verified' : 'partial',
      permissionEnvelope: 'read_only',
      adapterPath: 'asset_shard_import_receipt',
      visualForm: shardImport.summary.status === 'completed' ? 'receipt_node' : 'warning_token',
      status: shardImport.summary.status || 'unknown',
      actorLaneId: 'brittney',
      receiptTypes: ['asset_shard_import_receipt', 'imported_shard_manifest'],
      relationships: {
        shardId: shardImport.summary.shardId || '',
        manifestPath: shardImport.output?.manifestPath || '',
        shardSourcePath: shardImport.output?.shardSourcePath || '',
        runtimeMutationExecuted: Boolean(shardImport.summary.runtimeMutationExecuted),
        sourceAssetsMutated: Boolean(shardImport.summary.sourceAssetsMutated),
      },
      privacyClass: 'local_private',
      replacementPath: 'receipt_memory',
      glyph: 'IR',
      detail: `Imported ${shardImport.summary.assetCount || 0} asset(s) into runtime-local shard; source assets mutated ${shardImport.summary.sourceAssetsMutated ? 'yes' : 'no'}.`,
      firstScreen: true,
      layout: layout(19, 82),
    });
  }

  return objects;
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
      receiptTypes: hardwareAction.browserBoundary ? ['hardware_action_receipt', 'browser_boundary_receipt'] : ['hardware_action_receipt'],
      relationships: {
        actionKind: hardwareAction.summary.actionKind || '',
        targetWindowTitle: hardwareAction.summary.targetWindowTitle || '',
        mutatingActionExecuted: Boolean(hardwareAction.summary.mutatingActionExecuted),
        browserBoundaryStatus: hardwareAction.summary.browserBoundaryStatus || hardwareAction.browserBoundary?.urlClassification || '',
        browserProfileBoundary: hardwareAction.summary.browserProfileBoundary || hardwareAction.browserBoundary?.profileBoundary || '',
        browserCookiePolicy: hardwareAction.browserBoundary?.cookiePolicy || '',
      },
      privacyClass: 'local_private',
      replacementPath: 'receipt_memory',
      glyph: 'RC',
      detail: `Last hardware action ${hardwareAction.summary.status || 'unknown'}; ${hardwareAction.summary.actionKind || 'none'}${hardwareAction.browserBoundary ? `; browser ${hardwareAction.browserBoundary.urlClassification} / ${hardwareAction.browserBoundary.profileBoundary}` : ''}.`,
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

function buildCustodyObjects({ buildCustody }) {
  if (!buildCustody?.summary) return [];
  const summary = buildCustody.summary;
  const trees = Array.isArray(buildCustody.buildTrees) ? buildCustody.buildTrees : [];
  const objects = [];

  objects.push({
    id: 'receipt.build-custody',
    objectKind: 'receipt',
    displayName: 'Build Custody',
    sourceKind: 'receipt',
    sourceRef: buildCustody.sourceAnchors?.adapter || 'scripts/holoshell-build-custody.mjs',
    capabilityFamily: 'evidence',
    trustState: summary.riskState === 'pass' ? 'verified' : summary.riskState === 'warn' ? 'partial' : 'unknown',
    permissionEnvelope: 'read_only',
    adapterPath: 'holoshell_build_custody_bridge',
    visualForm: summary.riskState === 'critical' ? 'warning_token' : 'receipt_node',
    status: summary.scannerStatus === 'available' ? 'running' : summary.scannerStatus || 'unknown',
    actorLaneId: 'brittney',
    receiptTypes: ['build_custody_receipt', 'process_health_receipt'],
    relationships: {
      buildProcessCount: summary.buildProcessCount || 0,
      activeBuildTreeCount: summary.activeBuildTreeCount || 0,
      longRunningBuildCount: summary.longRunningBuildCount || 0,
      highMemoryBuildCount: summary.highMemoryBuildCount || 0,
      riskState: summary.riskState || 'unknown',
      scannerStatus: summary.scannerStatus || 'unknown',
      rawCommandsIncluded: Boolean(summary.rawCommandsIncluded),
    },
    privacyClass: 'local_private',
    replacementPath: 'receipt_memory',
    glyph: 'BC',
    detail: `${summary.buildProcessCount || 0} build process(es) across ${summary.activeBuildTreeCount || 0} tree(s); ${summary.longRunningBuildCount || 0} long-running; ${summary.highMemoryBuildCount || 0} high-memory; risk ${summary.riskState || 'unknown'}.`,
    firstScreen: summary.riskState !== 'pass' && summary.riskState !== 'unknown',
    layout: { x: 5, y: 88, size: 96 },
  });

  const treeSlots = [
    { x: 10, y: 12, size: 86 },
    { x: 22, y: 8, size: 84 },
    { x: 34, y: 14, size: 82 },
    { x: 46, y: 10, size: 80 },
  ];

  for (const [index, tree] of trees.slice(0, 6).entries()) {
    const slot = treeSlots[index] || layout(index + 22, 78);
    const treeStatus = tree.status || 'unknown';
    const isReview = treeStatus === 'memory_review' || treeStatus === 'long_running';
    const ownerLaneId = tree.ownerLaneId || '';
    const ownerLaneLabel = tree.ownerLaneLabel || ownerLaneId || '';
    const displayName = ownerLaneLabel ? `${ownerLaneLabel} Build Tree` : tree.rootName ? `${tree.rootName} Build Tree` : 'Build Tree';
    const buildKinds = Array.isArray(tree.buildKinds) ? tree.buildKinds : [];
    const findings = Array.isArray(tree.findings) ? tree.findings : [];
    const processPids = Array.isArray(tree.processPids) ? tree.processPids : [];
    objects.push({
      id: `process.build-tree.${tree.treeId || `tree-${index}`}`,
      objectKind: 'process',
      displayName,
      sourceKind: 'process',
      sourceRef: tree.treeId || '',
      capabilityFamily: 'build_custody',
      trustState: isReview ? 'partial' : 'verified',
      permissionEnvelope: 'break_glass',
      adapterPath: 'build_custody_tree_bridge',
      visualForm: isReview ? 'warning_token' : 'machine',
      status: treeStatus === 'active' ? 'running' : treeStatus,
      actorLaneId: ownerLaneId,
      receiptTypes: ['build_custody_receipt', 'process_health_receipt'],
      relationships: {
        treeId: tree.treeId || '',
        rootPid: tree.rootPid || 0,
        rootName: tree.rootName || '',
        processCount: tree.processCount || 0,
        maxAgeMinutes: tree.maxAgeMinutes || 0,
        totalMemoryMb: tree.totalMemoryMb || 0,
        buildKinds,
        findings,
        processPids,
        ownerLaneId,
        ownerLaneLabel,
        ownerAgentKind: tree.ownerAgentKind || '',
        ownerColorHint: tree.ownerColorHint || '',
        ownerEvidence: Array.isArray(tree.ownerEvidence) ? tree.ownerEvidence : [],
        ownerParentPid: tree.ownerParentPid || 0,
        receiptRequired: Boolean(tree.receiptRequired),
        rawCommandsIncluded: Boolean(tree.rawCommandsIncluded),
        stopPolicy: 'break_glass_required',
      },
      privacyClass: 'local_private',
      replacementPath: 'observe_then_break_glass',
      glyph: 'BT',
      detail: `${displayName}: ${tree.processCount || 0} process(es), ${tree.totalMemoryMb || 0} MB, ${ownerLaneLabel ? `owner ${ownerLaneLabel}` : 'owner unknown'}, status ${treeStatus}; break-glass stop only.`,
      firstScreen: isReview || index < 2,
      layout: slot,
    });
  }

  return objects;
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
    processObjectCount: objects.filter((object) => object.objectKind === 'process').length,
    buildCustodyObjectCount: objects.filter((object) => object.capabilityFamily === 'build_custody').length,
    buildCustodyProcessObjectCount: objects.filter((object) => object.objectKind === 'process' && object.capabilityFamily === 'build_custody').length,
    readinessObjectCount: objects.filter((object) => object.capabilityFamily === 'readiness_evidence').length,
    readinessWarningObjectCount: objects.filter((object) => object.capabilityFamily === 'readiness_evidence' && ['warn', 'skipped', 'reported_fail', 'fail'].includes(object.status)).length,
    mcpCustodyContractObjectCount: objects.filter((object) => object.capabilityFamily === 'mcp_custody_contract').length,
    mcpCustodyContractStatus: feeds.mcpCustodyContract?.summary?.status || 'unknown',
    mcpCustodyCompatibilityMode: feeds.mcpCustodyContract?.summary?.compatibilityMode || 'unknown',
    nativeMcpCustodySplit: Boolean(feeds.mcpCustodyContract?.summary?.nativeMcpCustodySplit),
    mcpUpstreamHandoffObjectCount: objects.filter((object) => object.capabilityFamily === 'mcp_custody_upstream_handoff').length,
    mcpUpstreamHandoffStatus: feeds.mcpUpstreamHandoff?.summary?.status || 'unknown',
    mcpUpstreamHandoffTargetTool: feeds.mcpUpstreamHandoff?.summary?.targetTool || '',
    mcpUpstreamHandoffTaskCount: feeds.mcpUpstreamHandoff?.summary?.taskCount || 0,
    assetShardWorkflowObjectCount: objects.filter((object) => object.capabilityFamily === 'creator_workflow').length,
    founderShellObjectCount: objects.filter((object) => object.capabilityFamily === 'founder_shell').length,
    userShellObjectCount: objects.filter((object) => object.capabilityFamily === 'user_shell').length,
    userShellModeObjectCount: objects.filter((object) => object.objectKind === 'user_shell_mode').length,
    userCapabilityPackObjectCount: objects.filter((object) => object.capabilityFamily === 'user_capability_pack').length,
    formatViewerObjectCount: objects.filter((object) => object.id === 'source.format-viewer').length,
    wildHoloScriptObjectCount: objects.filter((object) => object.capabilityFamily === 'source_corpus').length,
    sourceSubstrateObjectCount: objects.filter((object) => object.capabilityFamily === 'source_substrate').length,
    goldCodebaseBridgeStatus: feeds.goldCodebaseBridge?.summary?.status || 'unknown',
    goldDriveStatus: feeds.goldCodebaseBridge?.summary?.goldStatus || 'unknown',
    goldEntryCount: feeds.goldCodebaseBridge?.summary?.goldEntryCount || 0,
    goldHotEntryCount: feeds.goldCodebaseBridge?.summary?.goldHotEntryCount || 0,
    codebaseBridgeStatus: feeds.goldCodebaseBridge?.summary?.codebaseStatus || 'unknown',
    codebaseToolCount: feeds.goldCodebaseBridge?.summary?.codebaseToolCount || 0,
    codebaseGraphCacheProtocol: feeds.goldCodebaseBridge?.summary?.graphCacheProtocol || 'unknown',
    founderBootStatus: feeds.founderBootPreview?.summary?.status || 'unknown',
    userShellProjectionStatus: feeds.userShellProjection?.summary?.status || 'unknown',
    developmentalEnvironmentStatus: feeds.developmentalEnvironment?.summary?.status || 'unknown',
    developmentalEnvironmentObjectCount: objects.filter((object) => object.capabilityFamily === 'developmental_environment' || object.capabilityFamily === 'developmental_environment_policy').length,
    developmentalEnvironmentSpineLayerCount: feeds.developmentalEnvironment?.summary?.spineLayerCount || 0,
    developmentalEnvironmentBoardTaskCount: feeds.developmentalEnvironment?.summary?.boardTaskCount || 0,
    developmentalEnvironmentOpenEngineeringTaskCount: feeds.developmentalEnvironment?.summary?.openEngineeringTaskCount || 0,
    developmentalEnvironmentResearchPresent: Boolean(feeds.developmentalEnvironment?.summary?.researchPresent),
    developmentalEnvironmentMassFunctionSettled: Boolean(feeds.developmentalEnvironment?.summary?.massFunctionSettled),
    developmentalEnvironmentMappingFunctionSettled: Boolean(feeds.developmentalEnvironment?.summary?.mappingFunctionSettled),
    developmentalEnvironmentNextMove: feeds.developmentalEnvironment?.summary?.nextMove || '',
    agentDispatchStatus: feeds.agentDispatch?.summary?.status || 'unknown',
    agentDispatchCapabilityId: feeds.agentDispatch?.summary?.capabilityId || '',
    agentDispatchCapabilityLabel: feeds.agentDispatch?.summary?.capabilityLabel || '',
    agentDispatchKind: feeds.agentDispatch?.summary?.dispatchKind || '',
    agentDispatchRoute: feeds.agentDispatch?.summary?.route || '',
    agentDispatchConfidence: feeds.agentDispatch?.summary?.confidence || 0,
    grokBuildSetupStatus: feeds.grokBuild?.summary?.status || 'unknown',
    grokBuildCliStatus: feeds.grokBuild?.summary?.cliStatus || 'unknown',
    grokBuildCliVersion: feeds.grokBuild?.summary?.cliVersion || 'unknown',
    grokBuildAuthStatus: feeds.grokBuild?.summary?.authStatus || 'unknown',
    grokBuildAuthRuntimeStatus: feeds.grokBuild?.summary?.authRuntimeStatus || 'unknown',
    grokBuildAuthProvider: feeds.grokBuild?.summary?.authProvider || '',
    grokBuildOperatorStatus: feeds.grokBuild?.summary?.operatorStatus || 'unknown',
    grokBuildAutonomyStatus: feeds.grokBuild?.summary?.autonomyStatus || 'unknown',
    grokBuildModelStatus: feeds.grokBuild?.summary?.modelStatus || 'unknown',
    grokBuildRequestedModel: feeds.grokBuild?.summary?.requestedModel || '',
    grokBuildDefaultModel: feeds.grokBuild?.summary?.defaultModel || '',
    grokBuildProjectTrusted: Boolean(feeds.grokBuild?.summary?.projectTrusted),
    grokBuildProjectTrustStatus: feeds.grokBuild?.summary?.projectTrustStatus || 'unknown',
    grokBuildWarningCount: feeds.grokBuild?.summary?.warningCount || 0,
    grokBuildReadyForHeavyRecheck: Boolean(feeds.grokBuild?.summary?.readyForHeavyRecheck),
    grokBuildReadyForGrokBuild: Boolean(feeds.grokBuild?.summary?.readyForGrokBuild),
    grokBuildHeavyAccessStatus: feeds.grokBuild?.summary?.heavyAccessStatus || feeds.grokBuild?.heavyUpgrade?.status || 'unknown',
    grokHeartbeatStatus: feeds.grokHeartbeat?.summary?.status || 'unknown',
    grokHeartbeatPresenceStatus: feeds.grokHeartbeat?.summary?.agentPresenceStatus || 'unknown',
    grokHeartbeatObservationStatus: feeds.grokHeartbeat?.summary?.latestObservationStatus || 'none',
    grokHeartbeatObservationRecent: Boolean(feeds.grokHeartbeat?.summary?.latestObservationRecent),
    trustLedgerStatus: feeds.trustLedger?.summary?.status || 'unknown',
    trustLedgerRecordCount: feeds.trustLedger?.summary?.recordCount || 0,
    trustedAutonomyLatestLevel: feeds.trustLedger?.summary?.latestTrustLevel || 'unknown',
    trustedAutonomyLatestActionKind: feeds.trustLedger?.summary?.latestActionKind || '',
    trustedAutonomyLatestTarget: feeds.trustLedger?.summary?.latestTarget || '',
    trustedAutonomyEligible: Boolean(feeds.trustLedger?.summary?.trustedAutonomyEligible),
    trustedAutonomyTrustedRecordCount: feeds.trustLedger?.summary?.trustedRecordCount || 0,
    trustedAutonomyGuardedRecordCount: feeds.trustLedger?.summary?.guardedRecordCount || 0,
    trustedAutonomyBreakGlassRecordCount: feeds.trustLedger?.summary?.breakGlassRecordCount || 0,
    trustedAutonomySuccessesUntilTrusted: feeds.trustLedger?.summary?.successesUntilTrusted || 0,
    formatInventoryStatus: feeds.formatInventory?.summary?.status || 'unknown',
    wildHoloScriptStatus: feeds.wildHoloScript?.summary?.status || 'unknown',
    wildHoloScriptFileCount: feeds.wildHoloScript?.summary?.fileCount || 0,
    wildHoloScriptAdapterNeededCount: feeds.wildHoloScript?.summary?.adapterNeededCount || 0,
    assetShardImportApprovalStatus: feeds.shardImportApproval?.summary?.status || 'unknown',
    assetShardImportStatus: feeds.shardImport?.summary?.status || 'unknown',
    osUiTargetApp: feeds.osUiCapture?.summary?.targetApp || '',
    osUiTargetMatched: Boolean(feeds.osUiCapture?.summary?.targetMatched),
    osUiTargetResolved: Boolean(feeds.osUiCapture?.summary?.targetResolved || feeds.osUiCapture?.summary?.targetMatched),
    osUiTargetResolution: feeds.osUiCapture?.summary?.targetResolution || '',
    osUiSelectedWindowId: feeds.osUiCapture?.summary?.selectedWindowId || feeds.osUiCapture?.summary?.foregroundWindowId || '',
    osUiSelectedAppName: feeds.osUiCapture?.summary?.selectedAppName || '',
    osUiSelectedMutationPolicy: feeds.osUiCapture?.summary?.selectedMutationPolicy || '',
    osUiControlCount: feeds.osUiCapture?.summary?.controlCount || 0,
    osUiGeometryNodeCount: feeds.osUiCapture?.summary?.geometryNodeCount || 0,
    osUiActionBridgeStatus: feeds.osUiCapture?.summary?.actionBridgeStatus || '',
    capturedWindowObjectCount: objects.filter((object) => object.objectKind === 'captured_window').length,
    runningObjectCount: objects.filter((object) => ['running', 'foreground', 'selected'].includes(object.status)).length,
    guardedExecuteCount: objects.filter((object) => object.permissionEnvelope === 'guarded_execute').length,
    breakGlassCount: objects.filter((object) => object.permissionEnvelope === 'break_glass').length,
    firstProgramObject: firstProgram?.displayName || '',
    countByKind,
    countByStatus,
    sourceFeeds: {
      programRegistryStatus: feeds.programRegistry?.summary?.status || 'unknown',
      osUiCaptureStatus: feeds.osUiCapture?.summary?.status || 'unknown',
      readinessEvidenceStatus: feeds.readinessEvidence?.summary?.status || 'unknown',
      mcpCustodyContractStatus: feeds.mcpCustodyContract?.summary?.status || 'unknown',
      mcpUpstreamHandoffStatus: feeds.mcpUpstreamHandoff?.summary?.status || 'unknown',
      goldCodebaseBridgeStatus: feeds.goldCodebaseBridge?.summary?.status || 'unknown',
      wildHoloScriptStatus: feeds.wildHoloScript?.summary?.status || 'unknown',
      formatInventoryStatus: feeds.formatInventory?.summary?.status || 'unknown',
      founderBootStatus: feeds.founderBootPreview?.summary?.status || 'unknown',
      userShellProjectionStatus: feeds.userShellProjection?.summary?.status || 'unknown',
      developmentalEnvironmentStatus: feeds.developmentalEnvironment?.summary?.status || 'unknown',
      agentDispatchStatus: feeds.agentDispatch?.summary?.status || 'unknown',
      grokBuildSetupStatus: feeds.grokBuild?.summary?.status || 'unknown',
      grokHeartbeatStatus: feeds.grokHeartbeat?.summary?.status || 'unknown',
      trustLedgerStatus: feeds.trustLedger?.summary?.status || 'unknown',
      assetShardWorkflowStatus: feeds.shardWorkflow?.summary?.status || 'unknown',
      assetShardImportApprovalStatus: feeds.shardImportApproval?.summary?.status || 'unknown',
      assetShardImportStatus: feeds.shardImport?.summary?.status || 'unknown',
      buildCustodyStatus: feeds.buildCustody?.summary?.scannerStatus || feeds.buildCustody?.summary?.riskState || 'unknown',
      agentLaneCount: feeds.lanes?.summary?.laneCount || 0,
    },
  };
}

function loadFeeds(tmpDir) {
  const dir = resolveRepoPath(tmpDir);
  return {
    programRegistry: readJson(path.join(dir, 'program-registry.json'), {}),
    readinessEvidence: readJson(path.join(dir, 'readiness-evidence.json'), {}),
    mcpCustodyContract: readJson(path.join(dir, 'mcp-custody-contract.json'), {}),
    mcpUpstreamHandoff: readJson(path.join(dir, 'mcp-custody-upstream-handoff.json'), {}),
    goldCodebaseBridge: readJson(path.join(dir, 'holoscript-gold-codebase-bridge.json'), {}),
    wildHoloScript: readJson(path.join(dir, 'wild-holoscript-intake.json'), {}),
    formatInventory: readJson(path.join(dir, 'format-inventory.json'), {}),
    founderBootPreview: readJson(path.join(dir, 'founder-boot-preview.json'), {}),
    userShellProjection: readJson(path.join(dir, 'user-shell-projection.json'), {}),
    developmentalEnvironment: readJson(path.join(dir, 'developmental-environment.json'), {}),
    agentDispatch: readJson(path.join(dir, 'agent-dispatch-latest.json'), {}),
    grokBuild: readJson(path.join(dir, 'grok-build-setup.json'), {}),
    grokHeartbeat: readJson(path.join(dir, 'grok-heartbeat.json'), {}),
    trustLedger: readJson(path.join(dir, 'trust-ledger.json'), {}),
    osUiCapture: readJson(path.join(dir, 'os-ui-capture.json'), {}),
    lanes: readJson(path.join(dir, 'agent-lanes.json'), {}),
    brittneyAvatar: readJson(path.join(dir, 'brittney-avatar.json'), {}),
    hardwareAction: readJson(path.join(dir, 'action-latest.json'), {}),
    hardwareApproval: readJson(path.join(dir, 'approval-latest.json'), {}),
    workflow: readJson(path.join(dir, 'workflow-latest.json'), {}),
    workflowApproval: readJson(path.join(dir, 'workflow-approval-latest.json'), {}),
    workflowIntentGate: readJson(path.join(dir, 'brain-intent-gate-latest.json'), {}),
    shardWorkflow: readJson(path.join(dir, 'shard-workflow-latest.json'), {}),
    shardImportApproval: readJson(path.join(dir, 'shard-import-approval-latest.json'), {}),
    shardImport: readJson(path.join(dir, 'shard-import-latest.json'), {}),
    buildCustody: readJson(path.join(dir, 'build-custody.json'), {}),
  };
}

function buildGraph(args, fixtures = null) {
  const feeds = fixtures || loadFeeds(args.tmpDir);
  const generatedAt = new Date().toISOString();
  const objects = [
    ...baseShellObjects(feeds),
    ...founderBootObjects(feeds),
    ...userShellProjectionObjects(feeds),
    ...developmentalEnvironmentObjects(feeds),
    ...readinessObjects(feeds.readinessEvidence),
    ...mcpCustodyContractObjects(feeds.mcpCustodyContract),
    ...mcpUpstreamHandoffObjects(feeds.mcpUpstreamHandoff),
    ...assetShardObjects(feeds),
    ...buildCustodyObjects(feeds),
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
      goldCodebaseBridge: 'scripts/holoshell-holoscript-gold-codebase-bridge.mjs',
      wildHoloScriptIntake: 'scripts/holoshell-wild-holoscript-intake.mjs',
      formatInventory: 'scripts/holoshell-format-inventory.mjs',
      founderBootPreview: 'scripts/holoshell-founder-boot-preview.mjs',
      userShellProjection: 'scripts/holoshell-user-shell-projection.mjs',
      developmentalEnvironment: 'scripts/holoshell-developmental-environment.mjs',
      claudeChatWorkflow: 'scripts/holoshell-claude-chat-workflow.mjs',
      ollamaCloudAgentWorkflow: 'scripts/holoshell-ollama-cloud-agent-workflow.mjs',
      grokBuildWorkflow: 'scripts/holoshell-grok-build-workflow.mjs',
      grokHeartbeat: 'scripts/holoshell-grok-heartbeat.mjs',
      trustedAutonomy: 'scripts/holoshell-trust-ledger.mjs',
      assetShardWorkflow: 'scripts/holoshell-asset-shard-workflow.mjs',
      assetShardImportApproval: 'scripts/holoshell-shard-import-approval.mjs',
      buildCustody: 'scripts/holoshell-build-custody.mjs',
      mcpCustodyContract: 'scripts/holoshell-mcp-custody-contract.mjs',
      mcpUpstreamHandoff: 'scripts/holoshell-mcp-upstream-handoff.mjs',
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
    readinessEvidence: {
      schemaVersion: 'hololand.holoshell.readiness-evidence.v0.1.0',
      readinessId: 'fixture-readiness',
      summary: {
        status: 'warn',
        scenario: 'Make this computer ready to build a HoloLand world',
        buildStatus: 'pass',
        deviceLabStatus: 'warn',
        graphStatus: 'reported_fail',
        tokenCount: 3,
        warningCount: 2,
        nextWorkflow: 'Turn a folder of local assets into a playable HoloLand shard',
      },
      source: { reportPath: 'fixture/flagship-readiness-report.md' },
      tokens: [
        { id: 'readiness.build', title: 'pnpm build passed', status: 'pass', kind: 'command_receipt', detail: 'Build passed.', receiptType: 'build_log' },
        { id: 'readiness.headset-report', title: 'Headset report missing', status: 'skipped', kind: 'manual_witness_gap', detail: 'No headset report supplied.', nextAction: 'Attach headset report.', receiptType: 'device_lab_receipt' },
        { id: 'readiness.graph-status', title: 'Graph status reported import failure', status: 'reported_fail', kind: 'tool_failure_receipt', detail: 'graph-status failed.', receiptType: 'tool_failure_receipt' },
      ],
    },
    mcpCustodyContract: {
      schemaVersion: 'hololand.holoshell.mcp-custody-contract.v0.1.0',
      sourceAnchors: { adapter: 'scripts/holoshell-mcp-custody-contract.mjs' },
      summary: {
        status: 'warn',
        compatibilityMode: 'hololand_overlay',
        nativeMcpCustodySplit: false,
        cleanupCandidateCount: 1,
        ownerHandoffPlanCount: 3,
        checkPassCount: 5,
        checkWarnCount: 1,
        checkFailCount: 0,
      },
      compliance: {
        nextAction: 'Upgrade upstream MCP snapshot so HoloLand no longer needs fallback or overlay custody splitting.',
      },
    },
    mcpUpstreamHandoff: {
      schemaVersion: 'hololand.holoshell.mcp-custody-upstream-handoff.v0.1.0',
      handoffId: 'mcp-custody-upstream-fixture',
      sourceAnchors: { adapter: 'scripts/holoshell-mcp-upstream-handoff.mjs' },
      summary: {
        status: 'ready_for_upstream_agent',
        targetTool: 'holoshell_run_registry_snapshot',
        currentCompatibilityMode: 'hololand_overlay',
        nativeMcpCustodySplit: false,
        upstreamRepoRequired: true,
        taskCount: 5,
        acceptanceGateCount: 4,
      },
    },
    goldCodebaseBridge: {
      schemaVersion: 'hololand.holoshell.holoscript-gold-codebase-bridge.v0.1.0',
      bridgeId: 'gold-codebase-fixture',
      generatedAt: new Date().toISOString(),
      sourceAnchors: { adapter: 'scripts/holoshell-holoscript-gold-codebase-bridge.mjs' },
      summary: {
        status: 'ready',
        goldStatus: 'indexed',
        goldRootPresent: true,
        goldEntryCount: 120,
        goldTierCount: 7,
        goldHotEntryCount: 12,
        goldConflictPolicy: 'diamond_over_platinum_over_gold_over_knowledge_store',
        codebaseStatus: 'ready',
        codebaseToolCount: 9,
        graphCacheProtocol: 'cache_first_graph_status_then_absorb',
        surfaceMapStatus: 'mapped',
        formatInventoryStatus: 'scanned',
      },
      goldDrive: {
        hotEntries: [
          { path: 'gotchas/G.HW.001.md', tier: 'gotchas', title: 'Hardware gotcha', ids: ['G.HW.001'] },
        ],
      },
      queryTemplates: ['What already exists?', 'Which GOLD entry changes the plan?'],
    },
    wildHoloScript: {
      schemaVersion: 'hololand.holoshell.wild-holoscript-intake.v0.1.0',
      intakeId: 'wild-holoscript-fixture',
      source: { rootName: 'uaa2-service', script: 'scripts/holoshell-wild-holoscript-intake.mjs' },
      summary: {
        status: 'scanned',
        fileCount: 45,
        holoCount: 2,
        hsCount: 4,
        hsplusCount: 39,
        frontierSyntaxCount: 18,
        adapterNeededCount: 9,
        canonicalCandidateCount: 6,
        flagshipCount: 5,
        topPattern: 'xr_world',
        nextMove: 'promote_terminal_and_brittney_modules_with_adapter_receipts',
      },
      topFlagships: [
        { path: 'src/worlds/innovation/agent-orchestration.hsplus' },
        { path: 'src/holoscript/agents/brittney.hsplus' },
      ],
    },
    formatInventory: {
      schemaVersion: 'hololand.holoshell.format-inventory.v0.1.0',
      inventoryId: 'format-inventory-fixture',
      summary: { status: 'scanned', totalFileCount: 12, totalFeatureFamilies: 9, formatViewerCardCount: 3 },
      formatViewerCards: [
        { id: 'format.holo', label: '.holo', files: 2, features: 3, topFeature: 'object_graph' },
        { id: 'format.hs', label: '.hs', files: 4, features: 2, topFeature: 'pipeline_root' },
        { id: 'format.hsplus', label: '.hsplus', files: 6, features: 4, topFeature: 'agent_runtime' },
      ],
    },
    founderBootPreview: {
      schemaVersion: 'hololand.holoshell.founder-boot-preview.v0.1.0',
      bootId: 'founder-boot-fixture',
      source: { world: 'apps/holoshell/source/holoshell-shell-world.holo', renderSlice: 'apps/holoshell/source/holoshell-shell-render.hs', script: 'scripts/holoshell-founder-boot-preview.mjs' },
      summary: { status: 'ready', worldObjectCount: 8, renderObjectCount: 6, formatViewerCardCount: 3, userCapabilityPackCount: 2, brittneyProposalCount: 3 },
      formatViewer: { cards: [{ id: 'format.holo', label: '.holo' }, { id: 'format.hs', label: '.hs' }, { id: 'format.hsplus', label: '.hsplus' }] },
      userCapabilityPacks: [
        { id: 'user-pack.browser-lofi', label: 'Play Lofi', derivedFrom: 'founder.browser_control', permissionEnvelope: 'guarded_execute', executionDefault: 'staged_not_run', steps: ['open_browser'] },
        { id: 'user-pack.open-excel', label: 'Open Excel', derivedFrom: 'founder.program_control', permissionEnvelope: 'guarded_execute', executionDefault: 'staged_not_run', steps: ['locate_program'] },
      ],
      brittneyOperatorBridge: { status: 'ready', proposals: [{ id: 'inspect-selected-object', label: 'Inspect selected shell object' }] },
    },
    userShellProjection: {
      schemaVersion: 'hololand.holoshell.user-shell-projection.v0.1.0',
      projectionId: 'user-shell-fixture',
      source: { sourceContract: 'apps/holoshell/source/holoshell-user-shell-projection.hsplus', script: 'scripts/holoshell-user-shell-projection.mjs' },
      summary: {
        status: 'ready',
        modeCount: 4,
        userModeCount: 3,
        capabilityPackCount: 6,
        guardedCapabilityPackCount: 5,
        formatLessonCount: 3,
        founderOnlyPowerCount: 5,
        brittneyTranslationCount: 9,
        visibleBubbleCount: 13,
      },
      modes: [
        { id: 'user.daily', label: 'Daily Shell', audience: 'regular_user', visibleBubbleIds: ['user-pack.browser-lofi', 'user-pack.open-claude-chat'], hiddenFounderPowers: ['raw_shell_commands'], safetyPosture: 'plain_intent_then_approval' },
        { id: 'user.creator', label: 'Creator Shell', audience: 'hololand_creator', visibleBubbleIds: ['user-pack.asset-shard-preview'], hiddenFounderPowers: [], safetyPosture: 'preview_first_import_after_approval' },
        { id: 'user.operator', label: 'Operator Shell', audience: 'trusted_power_user', visibleBubbleIds: ['user-pack.room-marathon'], hiddenFounderPowers: [], safetyPosture: 'receipt_visible_guarded_execute' },
        { id: 'founder.full', label: 'Founder Shell', audience: 'founder', visibleBubbleIds: ['surface.founder-boot-preview'], hiddenFounderPowers: [], safetyPosture: 'full_surface_with_receipts' },
      ],
      capabilityPacks: [
        { id: 'user-pack.browser-lofi', label: 'Play Lofi', userPhrase: 'Play lofi music', permissionEnvelope: 'guarded_execute', executionDefault: 'staged_not_run', modeIds: ['user.daily'], steps: ['open_browser'] },
        { id: 'user-pack.open-excel', label: 'Open Excel', userPhrase: 'Open Excel', permissionEnvelope: 'guarded_execute', executionDefault: 'staged_not_run', modeIds: ['user.daily'], steps: ['locate_program'] },
        { id: 'user-pack.room-marathon', label: 'Start Room Marathon', userPhrase: 'Start room marathon', permissionEnvelope: 'guarded_execute', executionDefault: 'staged_not_run', modeIds: ['user.operator'], steps: ['open_terminal'] },
        { id: 'user-pack.open-claude-chat', label: 'Open Claude Chat', userPhrase: 'Open Claude and start a chat', permissionEnvelope: 'guarded_execute', executionDefault: 'staged_not_run', modeIds: ['user.daily', 'user.operator'], steps: ['resolve_claude_desktop_or_cli', 'open_or_focus_claude', 'start_new_chat'] },
        { id: 'user-pack.asset-shard-preview', label: 'Make Playable Shard', userPhrase: 'Turn this folder into a playable shard', permissionEnvelope: 'guarded_execute', executionDefault: 'staged_not_run', modeIds: ['user.creator'], steps: ['choose_folder'] },
        { id: 'user-pack.format-learning', label: 'Learn Source Formats', userPhrase: 'Explain the formats', permissionEnvelope: 'read_only', executionDefault: 'inspect_only', modeIds: ['user.creator'], steps: ['show_formats'] },
      ],
      founderOnlyPowers: [{ id: 'raw_shell_commands' }, { id: 'wild_source_promotion' }],
      brittneyTranslationLayer: {
        status: 'ready',
        defaultMode: 'user.daily',
        translations: [
          { userPhrase: 'Open Excel', targetPackId: 'user-pack.open-excel', permissionEnvelope: 'guarded_execute' },
          { userPhrase: 'Play lofi music', targetPackId: 'user-pack.browser-lofi', permissionEnvelope: 'guarded_execute' },
          { userPhrase: 'Open Claude and start a chat', targetPackId: 'user-pack.open-claude-chat', permissionEnvelope: 'guarded_execute' },
        ],
      },
      shellDerivation: { founderSurface: 'surface.founder-boot-preview', rule: 'user_shell_is_subset_plus_plain_language_translation', hiddenMeansRequiresFounderModeOrApproval: true },
    },
    developmentalEnvironment: {
      schemaVersion: 'hololand.holoshell.developmental-environment.v0.1.0',
      receiptId: 'dev-env-fixture',
      sourceAnchors: {
        research: 'ai-ecosystem/research/2026-05-14_ui-ux-developmental-environment.md',
        source: 'apps/holoshell/source/holoshell-developmental-environment.hsplus',
        adapter: 'scripts/holoshell-developmental-environment.mjs',
      },
      thesis: {
        reframe: 'wireframe_to_simulation_to_geometrics',
        telos: 'developmental_environment',
        brittneyRole: 'assistant_parent_presence',
        massFunctionRuling: 'derived_not_authored',
        mappingFunctionRuling: 'pure_function_of_physics_state',
        mappingHonestyPrinciple: 'animation must be explainable from physics state rather than cosmetic preference',
      },
      spine: [
        { id: 'substrate' },
        { id: 'vocabulary' },
        { id: 'composition' },
        { id: 'two_observer_rendering' },
        { id: 'honesty' },
        { id: 'signal_presence' },
      ],
      functions: {
        massFunction: { boardTaskId: 'task_1778802617893_o5mp' },
        physicsAnimationMapping: { boardTaskId: 'task_1778802617893_zppq' },
      },
      threads: [{ thread: 'HoloShell Option C/D UI substrate' }, { thread: 'Studio rethink Phase 6' }],
      boardTasks: [
        { id: 'task_1778802617893_o5mp' },
        { id: 'task_1778802617893_zppq' },
        { id: 'task_1778802907913_5ph8' },
      ],
      summary: {
        status: 'ready',
        spineLayerCount: 6,
        boardTaskCount: 3,
        openEngineeringTaskCount: 3,
        researchPresent: true,
        massFunctionSettled: true,
        mappingFunctionSettled: true,
        honestyPrinciple: 'physics_state_drives_animation',
        nextMove: 'engineer_mass_function_then_physics_animation_mapping',
      },
    },
    osUiCapture: {
      summary: { status: 'captured', windowCount: 1, controlCount: 4, geometryNodeCount: 42 },
      windows: [{ id: 'window-chrome', title: 'HoloLand', processName: 'chrome', processId: 100, foreground: true, controls: [{}, {}, {}] }],
    },
    lanes: {
      summary: { laneCount: 2, activeLaneCount: 2, heartbeatLaneCount: 1, grokHeartbeatStatus: 'observing' },
      lanes: [
        { laneId: 'codex-hardware', displayName: 'Codex Hardware', agentKind: 'codex', surfaceKind: 'hardware_shell', role: 'local_oracle', status: 'active_or_available', processEvidence: { detected: true } },
        {
          laneId: 'grok-build',
          displayName: 'Grok Build',
          agentKind: 'grok',
          surfaceKind: 'local_coding_agent',
          role: 'peer_codebuilder',
          status: 'active_or_available',
          processEvidence: { detected: true },
          heartbeat: {
            heartbeatId: 'grokhb-fixture',
            status: 'observing',
            generatedAt: new Date().toISOString(),
            heavyAccessStatus: 'active',
            readyForGrokBuild: true,
            latestObservationStatus: 'completed',
            latestObservationAgeMs: 100,
            primaryFinding: 'Fixture Grok heartbeat is live.',
          },
        },
      ],
    },
    brittneyAvatar: { summary: { avatarStatus: 'available', runtimeStatus: 'available', emotion: 'focused', voiceState: 'ready' } },
    agentDispatch: {
      schemaVersion: 'hololand.holoshell.agent-dispatch.v0.1.0',
      dispatchId: 'agent-dispatch-fixture',
      summary: {
        status: 'ready_to_stage',
        capabilityId: 'ollama_cloud_agent',
        capabilityLabel: 'Ollama Cloud Agent',
        dispatchKind: 'workflow',
        route: '/workflow/ollama-cloud-agent',
        confidence: 95,
        permissionEnvelope: 'guarded_execute',
        approvalRequired: true,
        selectedAgentSlug: 'codex',
      },
      dispatch: {
        downstreamReceipt: 'workflow-latest.json',
        approvalSurface: 'workflow-approval-latest.json',
      },
    },
    grokBuild: {
      schemaVersion: 'hololand.holoshell.grok-build-setup.v0.1.0',
      setupId: 'grok-build-setup-fixture',
      sourceAnchors: { adapter: 'scripts/holoshell-grok-build-workflow.mjs' },
      heavyUpgrade: { status: 'active', verifiedAt: '2026-05-16T00:00:00.000Z' },
      summary: {
        status: 'ready',
        heavyAccessStatus: 'active',
        cliStatus: 'installed',
        cliVersion: '0.1.211',
        authStatus: 'present',
        authRuntimeStatus: 'authenticated',
        authProvider: 'grok.com',
        operatorStatus: 'trusted_ready',
        autonomyStatus: 'eligible_after_workflow_approval',
        modelStatus: 'available',
        requestedModel: 'grok-build',
        defaultModel: 'grok-build',
        projectTrusted: true,
        projectTrustStatus: 'trusted',
        pathSeenOnCurrentProcess: true,
        warningCount: 1,
        readyForHeavyRecheck: true,
        readyForGrokBuild: true,
      },
    },
    grokHeartbeat: {
      schemaVersion: 'hololand.holoshell.grok-heartbeat.v0.1.0',
      heartbeatId: 'grokhb-fixture',
      generatedAt: new Date().toISOString(),
      summary: {
        status: 'observing',
        agentPresenceStatus: 'active_or_available',
        cliOperatorStatus: 'trusted_ready',
        authRuntimeStatus: 'authenticated',
        authProvider: 'grok.com',
        autonomyStatus: 'eligible_after_workflow_approval',
        heavyAccessStatus: 'active',
        latestObservationStatus: 'completed',
        latestObservationRecent: true,
        primaryFinding: 'Fixture Grok heartbeat is live.',
      },
    },
    hardwareAction: {
      actionId: 'action-1',
      generatedAt: new Date().toISOString(),
      summary: {
        status: 'approval_required',
        actionKind: 'open_url',
        permissionEnvelope: 'guarded_execute',
        targetWindowTitle: '',
        mutatingActionExecuted: false,
        browserBoundaryStatus: 'public_web',
        browserProfileBoundary: 'system_default_public_ok',
      },
      browserBoundary: {
        boundaryVersion: 'hololand.holoshell.browser-boundary.v0.1.0',
        urlClassification: 'public_web',
        profileBoundary: 'system_default_public_ok',
        cookiePolicy: 'may_use_default_browser_cookies_if_user_approves_open',
        screenshotPolicy: 'local_receipts_allowed',
      },
    },
    hardwareApproval: {
      approvalId: 'approval-1',
      summary: {
        status: 'pending_user_approval',
        actionKind: 'open_url',
        target: 'example.com',
        executionAllowed: true,
        expiresAt: new Date().toISOString(),
        trustLevel: 'guarded',
        trustedAutonomyEligible: false,
        browserBoundaryStatus: 'public_web',
        browserProfileBoundary: 'system_default_public_ok',
      },
      browserBoundary: {
        boundaryVersion: 'hololand.holoshell.browser-boundary.v0.1.0',
        urlClassification: 'public_web',
        profileBoundary: 'system_default_public_ok',
        cookiePolicy: 'may_use_default_browser_cookies_if_user_approves_open',
        screenshotPolicy: 'local_receipts_allowed',
      },
    },
    trustLedger: {
      schemaVersion: 'hololand.holoshell.trust-ledger.v0.1.0',
      latestAction: { fingerprint: 'trust-fixture', actionKind: 'launch_app', targetLabel: 'Excel' },
      policy: { promotionThreshold: 3 },
      summary: {
        status: 'ready',
        recordCount: 1,
        trustedRecordCount: 0,
        guardedRecordCount: 1,
        readOnlyRecordCount: 0,
        breakGlassRecordCount: 0,
        latestTrustLevel: 'guarded',
        latestActionKind: 'launch_app',
        latestTarget: 'Excel',
        trustedAutonomyEligible: false,
        successesUntilTrusted: 2,
        promotionThreshold: 3,
      },
    },
    workflow: { workflowId: 'workflow-1', title: 'Room Marathon', summary: { status: 'pending_user_approval', stepCount: 4, pendingApprovalCount: 1, model: 'kimi', modelRoute: 'ollama_cloud' } },
    workflowApproval: { approvalId: 'workflow-approval-1', summary: { status: 'pending_user_approval', pendingApprovalCount: 1, executionAllowed: true } },
    workflowIntentGate: { gateId: 'gate-1', summary: { status: 'passed', executionAllowed: true, failedCheckCount: 0 } },
    shardWorkflow: {
      workflowId: 'shard-workflow-1',
      title: 'Asset Folder to Playable Shard',
      shardPlan: { shardId: 'shard.fixture.demo' },
      output: {
        latestPath: '.tmp/holoshell/shard-workflow-latest.json',
        previewSourcePath: '.tmp/holoshell/shard-preview.holo',
        privateReceiptPath: '.tmp/holoshell/shard-receipts/demo-private.json',
      },
      summary: {
        status: 'staged',
        assetCount: 5,
        modelCount: 1,
        imageCount: 1,
        audioCount: 1,
        blockedAssetCount: 0,
        previewObjectCount: 5,
        nextWorkflow: 'review_preview_then_approve_import_into_hololand_world',
        mutationExecuted: false,
      },
    },
    shardImportApproval: {
      schemaVersion: 'hololand.holoshell.asset-shard-import-approval.v0.1.0',
      approvalId: 'shard-import-approval-1',
      output: { latestPath: '.tmp/holoshell/shard-import-approval-latest.json' },
      summary: { status: 'pending_user_approval', shardId: 'shard.fixture.demo', executionAllowed: true, expiresAt: new Date().toISOString(), assetCount: 5 },
    },
    shardImport: {
      schemaVersion: 'hololand.holoshell.asset-shard-import-receipt.v0.1.0',
      importId: 'shard-import-1',
      output: { receiptPath: '.tmp/holoshell/imported-shards/shard-fixture-demo/import-receipt.json', manifestPath: '.tmp/holoshell/imported-shards/shard-fixture-demo/manifest.json', shardSourcePath: '.tmp/holoshell/imported-shards/shard-fixture-demo/shard.holo' },
      summary: { status: 'completed', shardId: 'shard.fixture.demo', assetCount: 5, runtimeMutationExecuted: true, sourceAssetsMutated: false },
    },
    buildCustody: {
      schemaVersion: 'hololand.holoshell.build-custody.v0.1.0',
      summary: {
        riskState: 'warn',
        scannerStatus: 'available',
        processCount: 5,
        buildProcessCount: 4,
        activeBuildTreeCount: 1,
        buildTreeCount: 1,
        longRunningBuildCount: 1,
        highMemoryBuildCount: 0,
        reviewRequiredCount: 1,
        rawCommandsIncluded: false,
        longMinutesThreshold: 45,
        highMemoryMbThreshold: 1500,
      },
      buildTrees: [
        {
          treeId: 'build-tree-100',
          rootPid: 100,
          rootName: 'pwsh.exe',
          status: 'long_running',
          processCount: 4,
          maxAgeMinutes: 12.0,
          totalMemoryMb: 460.0,
          buildKinds: ['pnpm_workspace_build', 'build_child'],
          findings: ['long_running_build'],
          processPids: [100, 101, 102, 103],
          ownerLaneId: 'codex',
          ownerLaneLabel: 'Codex',
          ownerAgentKind: 'hardware',
          ownerColorHint: '#48b7ff',
          ownerEvidence: ['synthetic_process_ancestor'],
          ownerParentPid: 77,
          receiptRequired: true,
          rawCommandsIncluded: false,
        },
      ],
      buildProcesses: [
        { pid: 100, ppid: 10, name: 'pwsh.exe', buildKind: 'pnpm_workspace_build', ageMinutes: 12.0, memoryMb: 86.0, custodyState: 'active_build', findings: ['long_running_build'] },
        { pid: 101, ppid: 100, name: 'cmd.exe', buildKind: 'build_child', ageMinutes: 12.0, memoryMb: 14.0, custodyState: 'active_build', findings: [] },
        { pid: 102, ppid: 101, name: 'node.exe', buildKind: 'build_child', ageMinutes: 11.0, memoryMb: 240.0, custodyState: 'active_build', findings: [] },
        { pid: 103, ppid: 102, name: 'node.exe', buildKind: 'build_child', ageMinutes: 3.0, memoryMb: 120.0, custodyState: 'active_build', findings: [] },
      ],
      receipt: { buildCustodyHash: 'fixture-hash-abc123', destructiveActionsTaken: false, rawCommandsIncluded: false },
    },
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
  if (!graph.objects.some((object) => object.id === 'workflow.agent-dispatch')) failures.push('expected agent dispatch workflow object');
  if (!graph.objects.some((object) => object.id === 'room.world-build-readiness')) failures.push('expected readiness room object');
  if (!graph.objects.some((object) => object.id === 'receipt.readiness.headset-report')) failures.push('expected readiness warning token');
  if (!graph.objects.some((object) => object.id === 'receipt.mcp-custody-contract')) failures.push('expected MCP custody contract object');
  if (!graph.objects.some((object) => object.id === 'receipt.mcp-custody-upstream-handoff')) failures.push('expected MCP custody upstream handoff object');
  if (!graph.objects.some((object) => object.id === 'workflow.claude-chat')) failures.push('expected Claude chat workflow object');
  if (!graph.objects.some((object) => object.id === 'workflow.ollama-cloud-agent')) failures.push('expected Ollama Cloud agent workflow object');
  if (!graph.objects.some((object) => object.id === 'workflow.grok-build')) failures.push('expected Grok Build workflow object');
  if (!graph.objects.some((object) => object.id === 'agent.grok-build' && object.relationships?.heartbeatStatus === 'observing')) failures.push('expected Grok heartbeat agent object');
  if (!graph.objects.some((object) => object.id === 'policy.trusted-autonomy')) failures.push('expected trusted autonomy policy object');
  if (!graph.objects.some((object) => object.objectKind === 'browser_surface' && object.relationships?.browserBoundary)) failures.push('expected browser surface boundary object');
  if (!graph.objects.some((object) => object.id === 'approval.hardware' && object.relationships?.browserBoundaryStatus === 'public_web')) failures.push('expected hardware approval browser boundary');
  if (!graph.objects.some((object) => object.displayName === 'Hardware Receipt' && object.relationships?.browserProfileBoundary === 'system_default_public_ok')) failures.push('expected hardware receipt browser profile boundary');
  if (!graph.objects.some((object) => object.id === 'workflow.asset-shard')) failures.push('expected asset shard workflow object');
  if (!graph.objects.some((object) => object.id === 'approval.asset-shard-import')) failures.push('expected asset shard import approval object');
  if (!graph.objects.some((object) => object.displayName === 'Shard Import Receipt')) failures.push('expected asset shard import receipt object');
  if (!graph.objects.some((object) => object.id === 'source.wild-holoscript.uaa2')) failures.push('expected wild HoloScript source corpus object');
  if (!graph.objects.some((object) => object.id === 'source.holoscript-gold-codebase')) failures.push('expected GOLD/codebase substrate object');
  if (!graph.objects.some((object) => object.id === 'surface.founder-boot-preview')) failures.push('expected founder boot surface object');
  if (!graph.objects.some((object) => object.id === 'surface.user-shell-projection')) failures.push('expected user shell projection object');
  if (!graph.objects.some((object) => object.id === 'source.developmental-environment')) failures.push('expected developmental environment object');
  if (!graph.objects.some((object) => object.id === 'policy.physics-honesty')) failures.push('expected physics honesty policy object');
  if (!graph.objects.some((object) => object.id === 'assistant.brittney.user-translator')) failures.push('expected Brittney user translator object');
  if (graph.summary.wildHoloScriptStatus !== 'scanned') failures.push('expected wild HoloScript scanned status');
  if (graph.summary.userShellProjectionStatus !== 'ready') failures.push('expected user shell projection ready status');
  if (graph.summary.developmentalEnvironmentStatus !== 'ready') failures.push('expected developmental environment ready status');
  if (graph.summary.agentDispatchStatus !== 'ready_to_stage') failures.push('expected agent dispatch ready status');
  if (graph.summary.grokBuildSetupStatus !== 'ready') failures.push('expected Grok Build setup status');
  if (graph.summary.grokHeartbeatStatus !== 'observing') failures.push('expected Grok heartbeat status');
  if (graph.summary.trustedAutonomyLatestLevel !== 'guarded') failures.push('expected trust ledger guarded status');
  if (graph.summary.goldCodebaseBridgeStatus !== 'ready') failures.push('expected GOLD/codebase bridge ready status');
  if (graph.summary.mcpCustodyContractStatus !== 'warn') failures.push('expected MCP custody contract warning status');
  if (graph.summary.mcpCustodyCompatibilityMode !== 'hololand_overlay') failures.push('expected MCP custody overlay mode');
  if (graph.summary.mcpUpstreamHandoffStatus !== 'ready_for_upstream_agent') failures.push('expected MCP upstream handoff ready status');
  if (!graph.objects.some((object) => object.id === 'receipt.build-custody')) failures.push('expected build custody receipt object');
  const buildTreeObject = graph.objects.find((object) => object.id === 'process.build-tree.build-tree-100');
  if (!buildTreeObject) failures.push('expected build tree process object');
  if (buildTreeObject?.displayName !== 'Codex Build Tree') failures.push('expected build tree display name to include owner lane');
  if (buildTreeObject?.capabilityFamily !== 'build_custody') failures.push('expected build tree custody capability family');
  if (buildTreeObject?.actorLaneId !== 'codex') failures.push('expected build tree actor lane to inherit owner');
  if (buildTreeObject?.permissionEnvelope !== 'break_glass') failures.push('expected build tree break-glass envelope');
  if (buildTreeObject?.relationships?.ownerLaneId !== 'codex') failures.push('expected build tree owner relationship');
  if (buildTreeObject?.relationships?.rawCommandsIncluded) failures.push('expected build tree to keep raw command redaction');
  if (buildTreeObject?.relationships?.stopPolicy !== 'break_glass_required') failures.push('expected build tree stop policy');
  if (graph.summary.processObjectCount !== 1) failures.push('expected one process object from build custody');
  if (graph.summary.buildCustodyProcessObjectCount !== 1) failures.push('expected one build custody process object');
  if (graph.summary.sourceFeeds.buildCustodyStatus !== 'available') failures.push('expected build custody available status');
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
