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

function baseShellObjects({ brittneyAvatar, wildHoloScript, workflow, hardwareApproval, workflowApproval, workflowIntentGate, shardWorkflow, shardImportApproval, shardImport }) {
  const avatarSummary = brittneyAvatar?.summary || {};
  const wildSummary = wildHoloScript?.summary || {};
  const workflowSummary = workflow?.summary || {};
  const shardSummary = shardWorkflow?.summary || {};
  const shardApprovalSummary = shardImportApproval?.summary || {};
  const shardImportSummary = shardImport?.summary || {};
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
    objects.push({
      id: `process.build-tree.${tree.treeId || `tree-${index}`}`,
      objectKind: 'process',
      displayName: tree.rootName || 'Build Tree',
      sourceKind: 'process',
      sourceRef: tree.treeId || '',
      capabilityFamily: 'system',
      trustState: isReview ? 'partial' : 'verified',
      permissionEnvelope: 'break_glass',
      adapterPath: 'build_custody_tree_bridge',
      visualForm: isReview ? 'warning_token' : 'machine',
      status: treeStatus === 'active' ? 'running' : treeStatus,
      actorLaneId: 'brittney',
      receiptTypes: ['build_custody_receipt', 'process_health_receipt'],
      relationships: {
        treeId: tree.treeId || '',
        rootPid: tree.rootPid || 0,
        processCount: tree.processCount || 0,
        maxAgeMinutes: tree.maxAgeMinutes || 0,
        totalMemoryMb: tree.totalMemoryMb || 0,
        buildKinds: tree.buildKinds || [],
        findings: tree.findings || [],
        processPids: tree.processPids || [],
        receiptRequired: Boolean(tree.receiptRequired),
      },
      privacyClass: 'local_private',
      replacementPath: 'observe_then_break_glass',
      glyph: 'BT',
      detail: `${tree.rootName || 'Build tree'} with ${tree.processCount || 0} process(es), ${tree.totalMemoryMb || 0} MB, status ${treeStatus}.`,
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
    readinessObjectCount: objects.filter((object) => object.capabilityFamily === 'readiness_evidence').length,
    readinessWarningObjectCount: objects.filter((object) => object.capabilityFamily === 'readiness_evidence' && ['warn', 'skipped', 'reported_fail', 'fail'].includes(object.status)).length,
    assetShardWorkflowObjectCount: objects.filter((object) => object.capabilityFamily === 'creator_workflow').length,
    founderShellObjectCount: objects.filter((object) => object.capabilityFamily === 'founder_shell').length,
    userShellObjectCount: objects.filter((object) => object.capabilityFamily === 'user_shell').length,
    userShellModeObjectCount: objects.filter((object) => object.objectKind === 'user_shell_mode').length,
    userCapabilityPackObjectCount: objects.filter((object) => object.capabilityFamily === 'user_capability_pack').length,
    formatViewerObjectCount: objects.filter((object) => object.id === 'source.format-viewer').length,
    wildHoloScriptObjectCount: objects.filter((object) => object.capabilityFamily === 'source_corpus').length,
    founderBootStatus: feeds.founderBootPreview?.summary?.status || 'unknown',
    userShellProjectionStatus: feeds.userShellProjection?.summary?.status || 'unknown',
    formatInventoryStatus: feeds.formatInventory?.summary?.status || 'unknown',
    wildHoloScriptStatus: feeds.wildHoloScript?.summary?.status || 'unknown',
    wildHoloScriptFileCount: feeds.wildHoloScript?.summary?.fileCount || 0,
    wildHoloScriptAdapterNeededCount: feeds.wildHoloScript?.summary?.adapterNeededCount || 0,
    assetShardImportApprovalStatus: feeds.shardImportApproval?.summary?.status || 'unknown',
    assetShardImportStatus: feeds.shardImport?.summary?.status || 'unknown',
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
      readinessEvidenceStatus: feeds.readinessEvidence?.summary?.status || 'unknown',
      wildHoloScriptStatus: feeds.wildHoloScript?.summary?.status || 'unknown',
      formatInventoryStatus: feeds.formatInventory?.summary?.status || 'unknown',
      founderBootStatus: feeds.founderBootPreview?.summary?.status || 'unknown',
      userShellProjectionStatus: feeds.userShellProjection?.summary?.status || 'unknown',
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
    wildHoloScript: readJson(path.join(dir, 'wild-holoscript-intake.json'), {}),
    formatInventory: readJson(path.join(dir, 'format-inventory.json'), {}),
    founderBootPreview: readJson(path.join(dir, 'founder-boot-preview.json'), {}),
    userShellProjection: readJson(path.join(dir, 'user-shell-projection.json'), {}),
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
    ...readinessObjects(feeds.readinessEvidence),
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
      wildHoloScriptIntake: 'scripts/holoshell-wild-holoscript-intake.mjs',
      formatInventory: 'scripts/holoshell-format-inventory.mjs',
      founderBootPreview: 'scripts/holoshell-founder-boot-preview.mjs',
      userShellProjection: 'scripts/holoshell-user-shell-projection.mjs',
      assetShardWorkflow: 'scripts/holoshell-asset-shard-workflow.mjs',
      assetShardImportApproval: 'scripts/holoshell-shard-import-approval.mjs',
      buildCustody: 'scripts/holoshell-build-custody.mjs',
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
  if (!graph.objects.some((object) => object.id === 'room.world-build-readiness')) failures.push('expected readiness room object');
  if (!graph.objects.some((object) => object.id === 'receipt.readiness.headset-report')) failures.push('expected readiness warning token');
  if (!graph.objects.some((object) => object.id === 'workflow.asset-shard')) failures.push('expected asset shard workflow object');
  if (!graph.objects.some((object) => object.id === 'approval.asset-shard-import')) failures.push('expected asset shard import approval object');
  if (!graph.objects.some((object) => object.displayName === 'Shard Import Receipt')) failures.push('expected asset shard import receipt object');
  if (!graph.objects.some((object) => object.id === 'source.wild-holoscript.uaa2')) failures.push('expected wild HoloScript source corpus object');
  if (!graph.objects.some((object) => object.id === 'surface.founder-boot-preview')) failures.push('expected founder boot surface object');
  if (!graph.objects.some((object) => object.id === 'surface.user-shell-projection')) failures.push('expected user shell projection object');
  if (!graph.objects.some((object) => object.id === 'assistant.brittney.user-translator')) failures.push('expected Brittney user translator object');
  if (graph.summary.wildHoloScriptStatus !== 'scanned') failures.push('expected wild HoloScript scanned status');
  if (graph.summary.userShellProjectionStatus !== 'ready') failures.push('expected user shell projection ready status');
  if (!graph.objects.some((object) => object.id === 'receipt.build-custody')) failures.push('expected build custody receipt object');
  if (!graph.objects.some((object) => object.objectKind === 'process')) failures.push('expected build tree process object');
  if (graph.summary.processObjectCount !== 1) failures.push('expected one process object from build custody');
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
