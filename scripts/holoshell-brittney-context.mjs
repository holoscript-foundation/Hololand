#!/usr/bin/env node
import crypto from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SCHEMA_VERSION = 'hololand.holoshell.brittney-context.v0.1.0';
const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const DEFAULT_TMP = path.join('.tmp', 'holoshell');
const DEFAULT_OUTPUT = path.join(DEFAULT_TMP, 'brittney-context.json');
const DEFAULT_JS_OUTPUT = path.join(DEFAULT_TMP, 'brittney-context.js');
const DEFAULT_PROMPT = 'Summarize the current HoloShell state and prepare the next safe operator move.';
const DEFAULT_SELECTED_OBJECT = 'shell.hololand';

function parseArgs(argv) {
  const args = {
    prompt: DEFAULT_PROMPT,
    selectedShellObjectId: DEFAULT_SELECTED_OBJECT,
    tmpDir: DEFAULT_TMP,
    output: DEFAULT_OUTPUT,
    jsOutput: DEFAULT_JS_OUTPUT,
    maxVisibleObjects: 18,
    maxTimelineItems: 14,
    json: false,
    selfTest: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    else if (arg === '--prompt') args.prompt = argv[++index];
    else if (arg === '--selected-shell-object') args.selectedShellObjectId = argv[++index];
    else if (arg === '--tmp-dir') args.tmpDir = argv[++index];
    else if (arg === '--output') args.output = argv[++index];
    else if (arg === '--js-output') args.jsOutput = argv[++index];
    else if (arg === '--max-visible-objects') args.maxVisibleObjects = Number(argv[++index]) || args.maxVisibleObjects;
    else if (arg === '--max-timeline-items') args.maxTimelineItems = Number(argv[++index]) || args.maxTimelineItems;
    else if (arg === '--json') args.json = true;
    else if (arg === '--self-test') args.selfTest = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (args.selfTest) {
    args.output = path.join(DEFAULT_TMP, 'self-test', 'brittney-context.json');
    args.jsOutput = path.join(DEFAULT_TMP, 'self-test', 'brittney-context.js');
  }
  args.maxVisibleObjects = Math.max(1, Math.floor(args.maxVisibleObjects));
  args.maxTimelineItems = Math.max(1, Math.floor(args.maxTimelineItems));
  return args;
}

function printHelp() {
  console.log(`HoloShell Brittney context packet

Usage:
  node scripts/holoshell-brittney-context.mjs [options]

Options:
  --prompt <text>                  User or operating prompt for the packet.
  --selected-shell-object <id>     Shell object id to focus. Defaults to shell.hololand.
  --tmp-dir <path>                 Input receipt directory. Defaults to .tmp/holoshell.
  --output <path>                  Output JSON. Defaults to .tmp/holoshell/brittney-context.json.
  --js-output <path>               Browser bootstrap JS. Defaults to .tmp/holoshell/brittney-context.js.
  --max-visible-objects <n>        Visible object cap. Defaults to 18.
  --max-timeline-items <n>         Recent receipt cap. Defaults to 14.
  --json                           Print JSON.
  --self-test                      Use synthetic fixtures and assert invariants.
  -h, --help                       Show this help.
`);
}

function resolveRepoPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(REPO_ROOT, filePath);
}

function readJson(filePath, fallback = {}) {
  const resolved = resolveRepoPath(filePath);
  if (!existsSync(resolved)) return fallback;
  try {
    return JSON.parse(readFileSync(resolved, 'utf8'));
  } catch (error) {
    return {
      schemaVersion: 'hololand.holoshell.read-error.v0.1.0',
      generatedAt: new Date().toISOString(),
      path: path.basename(resolved),
      error: error.message,
    };
  }
}

function writeJson(filePath, data) {
  const resolved = resolveRepoPath(filePath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return resolved;
}

function writeBrowserBootstrap(filePath, data) {
  const resolved = resolveRepoPath(filePath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  const payload = JSON.stringify(data, null, 2).replace(/<\/script/gi, '<\\/script');
  writeFileSync(resolved, `window.HOLOSHELL_BRITTNEY_CONTEXT = ${payload};\n`, 'utf8');
  return resolved;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function stableId(prefix, value) {
  return `${prefix}_${sha256(value).slice(0, 12)}`;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function countTruthy(values) {
  return values.filter(Boolean).length;
}

function sourceBasename(sourceRef) {
  const text = String(sourceRef || '');
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`;
    } catch {
      return 'web_resource';
    }
  }
  return text.split(/[\\/]/).filter(Boolean).slice(-2).join('/');
}

function sanitizeShellObject(object) {
  if (!object?.id) return null;
  const relationships = safeObject(object.relationships);
  const operationContext = object.objectKind === 'captured_window'
    ? {
        appName: relationships.appName || '',
        appLabel: relationships.appLabel || '',
        archetype: relationships.archetype || '',
        surfaceRole: relationships.surfaceRole || '',
        mutationPolicy: relationships.mutationPolicy || '',
        captureCandidate: Boolean(relationships.captureCandidate),
        selectedForReconstruction: Boolean(relationships.selectedForReconstruction),
        controlCount: relationships.controlCount || 0,
        geometryNodeCount: relationships.geometryNodeCount || 0,
        actionBridgeStatus: relationships.actionBridgeStatus || '',
        preflightRequired: relationships.preflightRequired !== false,
        preflightTool: relationships.preflightTool || '',
        safeActions: Array.isArray(relationships.safeActions) ? relationships.safeActions.slice(0, 8) : [],
        blockedActions: Array.isArray(relationships.blockedActions) ? relationships.blockedActions.slice(0, 8) : [],
      }
    : undefined;
  return {
    id: object.id,
    objectKind: object.objectKind || 'unknown',
    displayName: object.displayName || object.label || object.id,
    capabilityFamily: object.capabilityFamily || '',
    trustState: object.trustState || 'unknown',
    permissionEnvelope: object.permissionEnvelope || 'unknown',
    adapterPath: object.adapterPath || '',
    visualForm: object.visualForm || '',
    status: object.status || 'unknown',
    actorLaneId: object.actorLaneId || '',
    receiptTypes: safeArray(object.receiptTypes).slice(0, 6),
    privacyClass: object.privacyClass || 'local_private',
    replacementPath: object.replacementPath || '',
    sourceKind: object.sourceKind || '',
    sourceRefLabel: sourceBasename(object.sourceRef),
    detail: String(object.detail || '').slice(0, 220),
    firstScreen: Boolean(object.firstScreen),
    operationContext,
  };
}

function shellObjectRank(object, selectedId) {
  if (object.id === selectedId) return -10;
  if (object.id === DEFAULT_SELECTED_OBJECT) return -9;
  if (object.objectKind === 'assistant_avatar') return -8;
  if (object.objectKind === 'captured_window' && ['selected', 'foreground'].includes(object.status)) return -7.5;
  if (object.objectKind === 'captured_window') return -6.5;
  if (object.firstScreen) return -6;
  if (object.objectKind === 'approval') return -5.5;
  if (object.permissionEnvelope === 'guarded_execute') return -5;
  if (object.status === 'running') return -4;
  return 0;
}

function visibleShellObjects(shellObjects, selectedId, maxVisibleObjects) {
  const objects = safeArray(shellObjects.objects);
  return objects
    .filter((object) => object?.id)
    .sort((left, right) => shellObjectRank(left, selectedId) - shellObjectRank(right, selectedId))
    .slice(0, maxVisibleObjects)
    .map(sanitizeShellObject)
    .filter(Boolean);
}

function selectedShellObject(shellObjects, selectedId, visibleObjects) {
  const objects = safeArray(shellObjects.objects);
  const selected = objects.find((object) => object.id === selectedId)
    || objects.find((object) => object.id === DEFAULT_SELECTED_OBJECT)
    || objects[0];
  return sanitizeShellObject(selected) || visibleObjects[0] || null;
}

function summarizeProgramRegistry(programRegistry) {
  const summary = programRegistry.summary || {};
  return {
    status: summary.status || 'unknown',
    programCount: summary.programCount || 0,
    launchableProgramCount: summary.launchableProgramCount || 0,
    runningWindowCount: summary.runningWindowCount || 0,
    startMenuProgramCount: summary.startMenuProgramCount || 0,
    appPathProgramCount: summary.appPathProgramCount || 0,
    classCounts: summary.classCounts || {},
    permissionEnvelope: summary.permissionEnvelope || 'guarded_execute_for_launch',
    actionBridgeStatus: summary.actionBridgeStatus || 'unknown',
  };
}

function summarizeWorkflow({ workflow, workflowApproval, workflowIntentGate, shardWorkflow, shardImportApproval, shardImport }) {
  return {
    status: workflow?.summary?.status || 'unknown',
    title: workflow?.title || '',
    stepCount: workflow?.summary?.stepCount || 0,
    pendingApprovalCount: workflow?.summary?.pendingApprovalCount || 0,
    model: workflow?.summary?.model || '',
    modelRoute: workflow?.summary?.modelRoute || '',
    mutationExecuted: Boolean(workflow?.summary?.mutationExecuted),
    approvalStatus: workflowApproval?.summary?.status || 'unknown',
    approvalExecutionAllowed: Boolean(workflowApproval?.summary?.executionAllowed),
    intentGateStatus: workflowIntentGate?.summary?.status || 'unknown',
    intentGateExecutionAllowed: Boolean(workflowIntentGate?.summary?.executionAllowed),
    shardWorkflowStatus: shardWorkflow?.summary?.status || 'unknown',
    shardApprovalStatus: shardImportApproval?.summary?.status || 'unknown',
    shardImportStatus: shardImport?.summary?.status || 'unknown',
  };
}

function summarizeApprovals({ hardwareApproval, workflowApproval, shardImportApproval, shellObjects }) {
  const approvalObjects = safeArray(shellObjects.objects).filter((object) => object.objectKind === 'approval');
  const pendingApprovalCount = countTruthy([
    hardwareApproval?.summary?.executionAllowed,
    workflowApproval?.summary?.executionAllowed,
    shardImportApproval?.summary?.executionAllowed,
  ]) + approvalObjects.filter((object) => object.status === 'pending_user_approval').length;
  return {
    pendingApprovalCount,
    hardwareStatus: hardwareApproval?.summary?.status || 'unknown',
    hardwareActionKind: hardwareApproval?.summary?.actionKind || '',
    workflowStatus: workflowApproval?.summary?.status || 'unknown',
    shardImportStatus: shardImportApproval?.summary?.status || 'unknown',
    approvalObjectCount: approvalObjects.length,
    executionAllowedCount: countTruthy([
      hardwareApproval?.summary?.executionAllowed,
      workflowApproval?.summary?.executionAllowed,
      shardImportApproval?.summary?.executionAllowed,
    ]),
    approvalRequiredForMutation: true,
  };
}

function summarizeLanes(lanes) {
  const laneSummaries = safeArray(lanes.lanes).map((lane) => ({
    laneId: lane.laneId,
    displayName: lane.displayName || lane.label || lane.laneId,
    agentKind: lane.agentKind || '',
    surfaceKind: lane.surfaceKind || '',
    role: lane.role || '',
    status: lane.status || 'unknown',
    color: lane.color ? { name: lane.color.name, hex: lane.color.hex, ansiSgr: lane.color.ansiSgr } : null,
    semanticPrefix: lane.semanticPrefix || '',
    processDetected: Boolean(lane.processEvidence?.detected),
    processMatchCount: safeArray(lane.processEvidence?.matches).length,
    colorIsVisualHintOnly: lane.receiptPolicy?.colorIsVisualHintOnly !== false,
  }));
  return {
    laneCount: lanes.summary?.laneCount || laneSummaries.length,
    activeLaneCount: lanes.summary?.activeLaneCount || laneSummaries.filter((lane) => lane.status !== 'offline').length,
    colorLaneCount: lanes.summary?.colorLaneCount || laneSummaries.filter((lane) => lane.color).length,
    semanticLaneCount: lanes.summary?.semanticLaneCount || laneSummaries.filter((lane) => lane.semanticPrefix).length,
    lanes: laneSummaries,
  };
}

function summarizeProcessHealth(processHealth, operatorBrief) {
  const summary = processHealth.summary || {};
  return {
    riskState: summary.riskState || operatorBrief.hardware?.riskState || 'unknown',
    processCount: summary.processCount || operatorBrief.hardware?.processCount || 0,
    shellRunCount: summary.shellRunCount || operatorBrief.hardware?.shellRunCount || 0,
    registeredRunCount: summary.registeredRunCount || 0,
    activeRegisteredRunCount: summary.activeRegisteredRunCount || 0,
    ownedProcessCount: summary.ownedProcessCount || 0,
    staleRunCount: summary.staleRunCount || operatorBrief.runs?.staleRunCount || 0,
    highMemoryCount: summary.highMemoryCount || 0,
    orphanLikeCount: summary.orphanLikeCount || 0,
    overdueRegisteredRunCount: summary.overdueRegisteredRunCount || 0,
    unmatchedActiveRunCount: summary.unmatchedActiveRunCount || 0,
    stopPlanCount: summary.stopPlanCount || safeArray(processHealth.stopPlans).length,
    memoryUsedRatio: processHealth.host?.memoryUsedRatio || 0,
    commandLinesIncluded: Boolean(processHealth.collection?.commandLinesIncluded),
    automaticTerminationAllowed: processHealth.policies?.automaticTerminationAllowed === true,
    exactPidRequired: processHealth.policies?.exactPidRequired !== false,
  };
}

function summarizeOperatorBrief(operatorBrief) {
  const peers = operatorBrief.peers || {};
  const promptCard = operatorBrief.brittneyPromptCard || {};
  return {
    status: operatorBrief.status || 'unknown',
    hardwareRisk: operatorBrief.hardware?.riskState || 'unknown',
    peerWindowCount: peers.windowInstanceCount || operatorBrief.legacy?.peerWindowCount || 0,
    peerSurfaceCount: peers.surfaceCount || operatorBrief.legacy?.peerSurfaceCount || 0,
    shellWindowCount: peers.shellWindowInstanceCount || operatorBrief.legacy?.shellWindowCount || 0,
    shellSurfaceCount: peers.shellSurfaceCount || operatorBrief.legacy?.shellSurfaceCount || 0,
    operatingSurfaceWindowCount: peers.operatingSurfaceWindowCount || operatorBrief.legacy?.operatingSurfaceWindowCount || 0,
    operatingSurfaceCount: peers.operatingSurfaceCount || operatorBrief.legacy?.operatingSurfaceCount || 0,
    visibleWindowCount: operatorBrief.legacy?.visibleWindowCount || 0,
    legacyCaptureCandidateCount: operatorBrief.legacy?.captureCandidateCount || 0,
    shellWindowBoundCount: operatorBrief.shellCustody?.boundWindowCount || operatorBrief.legacy?.shellWindowBoundCount || 0,
    shellWindowOwnerUnknownRunCount: operatorBrief.shellCustody?.ownerUnknownRunCount || operatorBrief.legacy?.shellWindowOwnerUnknownRunCount || 0,
    rawWindowTitlesIncluded: Boolean(peers.rawWindowTitlesIncluded || operatorBrief.receipt?.rawWindowTitlesIncluded),
    peerWindowSummary: promptCard.peerWindowSummary || '',
    shellWindowSummary: promptCard.shellWindowSummary || '',
    shellCustodySummary: promptCard.shellCustodySummary || '',
    firstMove: promptCard.firstMove || safeArray(operatorBrief.nextActions)[0]?.action || '',
    mustNot: safeArray(promptCard.mustNot || operatorBrief.blockedActions),
    source: peers.source || 'operator_brief',
  };
}

function summarizeOsUiCapture(osUiCapture) {
  const summary = osUiCapture.summary || {};
  const selectedWindow = osUiCapture.selectedWindow || {};
  const legacySurface = selectedWindow.legacySurface || {};
  const controls = safeArray(selectedWindow.controls)
    .filter((control) => control?.name || control?.controlType)
    .slice(0, 8)
    .map((control) => ({
      name: String(control.name || control.controlType || '').slice(0, 80),
      controlType: control.controlType || '',
      enabled: Boolean(control.enabled),
      offscreen: Boolean(control.offscreen),
      actionBridge: control.shellSemantics?.actionBridge || '',
    }));
  return {
    status: summary.status || 'unknown',
    targetApp: summary.targetApp || '',
    targetSource: summary.targetSource || '',
    targetMatched: Boolean(summary.targetMatched),
    targetResolved: Boolean(summary.targetResolved || summary.targetMatched),
    targetResolution: summary.targetResolution || '',
    selectedWindowId: summary.selectedWindowId || summary.foregroundWindowId || '',
    selectedAppName: summary.selectedAppName || legacySurface.appName || selectedWindow.processName || '',
    selectedSurfaceRole: summary.selectedSurfaceRole || legacySurface.surfaceRole || '',
    selectedMutationPolicy: summary.selectedMutationPolicy || legacySurface.mutationPolicy || '',
    selectedTitle: selectedWindow.title || '',
    selectedProcessName: selectedWindow.processName || '',
    windowCount: summary.windowCount || 0,
    controlCount: summary.controlCount || 0,
    selectedControlCount: safeArray(selectedWindow.controls).length,
    geometryNodeCount: summary.geometryNodeCount || 0,
    uiAutomationStatus: summary.uiAutomationStatus || 'unknown',
    actionBridgeStatus: summary.actionBridgeStatus || osUiCapture.actionDryRun?.status || '',
    permissionEnvelope: osUiCapture.receipt?.permissionEnvelope || 'read_only',
    mutatingActionsExecuted: Boolean(osUiCapture.receipt?.mutatingActionsExecuted),
    preflightRequired: osUiCapture.actionDryRun?.preflightRequired !== false,
    preflightTool: osUiCapture.actionDryRun?.preflightTool || legacySurface.preflightTool || 'holoshell_preflight_legacy_app_mutation',
    safeActions: safeArray(osUiCapture.actionDryRun?.safeActions || legacySurface.safeActions).slice(0, 8),
    blockedActions: safeArray(osUiCapture.actionDryRun?.blockedActions || legacySurface.blockedActions).slice(0, 8),
    sampleControls: controls,
    localUiLabelsIncluded: Boolean(selectedWindow.title || controls.some((control) => control.name)),
    receiptId: osUiCapture.receipt?.id || '',
  };
}

function recentReceiptTimeline({ liveFeed, brittneyTurn, operatingTurn, operatorBrief, osUiCapture }, maxTimelineItems) {
  const items = [];
  for (const item of safeArray(liveFeed.timeline)) {
    items.push({
      id: item.id,
      kind: item.kind || 'receipt',
      title: item.title || item.id,
      trustState: item.trustState || 'unknown',
      generatedAt: item.generatedAt || liveFeed.generatedAt || '',
      receiptType: item.receiptType || '',
      source: item.source || '',
    });
  }
  if (brittneyTurn?.turnId) {
    items.push({
      id: brittneyTurn.turnId,
      kind: 'brittney_turn',
      title: `Brittney turn ${brittneyTurn.summary?.status || 'unknown'}`,
      trustState: brittneyTurn.summary?.status === 'completed' ? 'verified' : 'partial',
      generatedAt: brittneyTurn.generatedAt || '',
      receiptType: brittneyTurn.schemaVersion || '',
      source: 'scripts/holoshell-brittney-turn.mjs',
    });
  }
  if (operatingTurn?.receipt?.operatingTurnHash) {
    items.push({
      id: stableId('operating_turn', operatingTurn.receipt.operatingTurnHash),
      kind: 'operating_turn',
      title: `Operating turn ${operatingTurn.summary?.status || 'unknown'}`,
      trustState: operatingTurn.summary?.status === 'pass' ? 'verified' : 'partial',
      generatedAt: operatingTurn.generatedAt || '',
      receiptType: operatingTurn.schemaVersion || '',
      source: 'scripts/holoshell-operating-turn.mjs',
    });
  }
  if (operatorBrief?.receipt?.briefHash) {
    items.push({
      id: stableId('operator_brief', operatorBrief.receipt.briefHash),
      kind: 'operator_brief',
      title: `Operator brief ${operatorBrief.status || 'unknown'}`,
      trustState: operatorBrief.status === 'legacy_absorption_ready' ? 'verified' : 'partial',
      generatedAt: operatorBrief.generatedAt || '',
      receiptType: operatorBrief.schemaVersion || '',
      source: 'scripts/holoshell-operator-brief.mjs',
    });
  }
  if (osUiCapture?.receipt?.id) {
    items.push({
      id: osUiCapture.receipt.id,
      kind: 'os_ui_capture',
      title: `OS UI capture ${osUiCapture.summary?.status || 'unknown'}`,
      trustState: osUiCapture.summary?.status === 'captured' ? 'partial' : 'unknown',
      generatedAt: osUiCapture.generatedAt || '',
      receiptType: osUiCapture.schemaVersion || '',
      source: 'scripts/holoshell-os-ui-capture.mjs',
    });
  }
  return items
    .filter((item) => item.id)
    .sort((left, right) => String(right.generatedAt).localeCompare(String(left.generatedAt)))
    .slice(0, maxTimelineItems);
}

function privacyBoundary({ processHealth, operatorBrief, osUiCapture }) {
  const rawCommandsIncluded = Boolean(processHealth.collection?.commandLinesIncluded || operatorBrief.safety?.rawCommandsIncluded || operatorBrief.receipt?.rawCommandsIncluded);
  const rawWindowTitlesIncluded = Boolean(operatorBrief.safety?.rawWindowTitlesIncluded || operatorBrief.receipt?.rawWindowTitlesIncluded || operatorBrief.peers?.rawWindowTitlesIncluded);
  const selectedWindow = osUiCapture?.selectedWindow || {};
  const localUiLabelsIncluded = Boolean(selectedWindow.title || safeArray(selectedWindow.controls).some((control) => control?.name));
  return {
    locality: 'local_hardware',
    rawCommandsIncluded,
    rawWindowTitlesIncluded,
    localUiLabelsIncluded,
    secretsIncluded: false,
    privatePathsIncluded: false,
    browserContentIncluded: false,
    destructiveActionsTaken: Boolean(operatorBrief.safety?.destructiveActionsTaken),
    modelContextDefault: 'redacted_receipts_only',
    remoteModelRequiresUserBoundary: true,
    notes: [
      'Peer counts come from top-level legacy window inventory, not PID approximations.',
      'Shell windows are tracked separately from AI peer windows.',
      'Colors are visual hints; semantic lane ids remain authoritative.',
      'OS UI capture can include local-only window and control labels for Brittney; remote models need a boundary review before receiving those labels.',
    ],
  };
}

function loadInputs(args) {
  if (args.selfTest) return fixtureInputs();
  const tmpDir = resolveRepoPath(args.tmpDir);
  return {
    shellObjects: readJson(path.join(tmpDir, 'shell-objects.json'), {}),
    programRegistry: readJson(path.join(tmpDir, 'program-registry.json'), {}),
    processHealth: readJson(path.join(tmpDir, 'process-health.json'), {}),
    lanes: readJson(path.join(tmpDir, 'agent-lanes.json'), {}),
    osUiCapture: readJson(path.join(tmpDir, 'os-ui-capture.json'), {}),
    operatorBrief: readJson(path.join(tmpDir, 'operator-brief.json'), {}),
    workflow: readJson(path.join(tmpDir, 'workflow-latest.json'), {}),
    workflowApproval: readJson(path.join(tmpDir, 'workflow-approval-latest.json'), {}),
    workflowIntentGate: readJson(path.join(tmpDir, 'brain-intent-gate-latest.json'), {}),
    shardWorkflow: readJson(path.join(tmpDir, 'shard-workflow-latest.json'), {}),
    shardImportApproval: readJson(path.join(tmpDir, 'shard-import-approval-latest.json'), {}),
    shardImport: readJson(path.join(tmpDir, 'shard-import-latest.json'), {}),
    hardwareApproval: readJson(path.join(tmpDir, 'approval-latest.json'), {}),
    brittneyTurn: readJson(path.join(tmpDir, 'brittney-turn-latest.json'), {}),
    operatingTurn: readJson(path.join(tmpDir, 'operating-turn.json'), {}),
    liveFeed: readJson(path.join(tmpDir, 'live-feed.json'), {}),
  };
}

function fixtureInputs() {
  return {
    shellObjects: {
      summary: { shellObjectCount: 4, firstScreenObjectCount: 3, approvalObjectCount: 1 },
      objects: [
        { id: 'shell.hololand', objectKind: 'operating_world', displayName: 'HoloLand', status: 'running', trustState: 'verified', permissionEnvelope: 'read_only', adapterPath: 'holo_shell_world', firstScreen: true, receiptTypes: ['shell_object_graph'], privacyClass: 'local_private', detail: 'Fixture operating shell.' },
        { id: 'assistant.brittney', objectKind: 'assistant_avatar', displayName: 'Brittney', status: 'ready', trustState: 'verified', permissionEnvelope: 'intent_scoped', adapterPath: 'aibrittney_runtime_bridge', firstScreen: true, receiptTypes: ['brittney_turn_receipt'], privacyClass: 'local_private', detail: 'Fixture Brittney.' },
        { id: 'approval.hardware', objectKind: 'approval', displayName: 'Hardware Approval', status: 'pending_user_approval', trustState: 'partial', permissionEnvelope: 'guarded_execute', adapterPath: 'hardware_approval_bundle', firstScreen: true, receiptTypes: ['approval_bundle'], privacyClass: 'local_private', detail: 'Fixture approval.' },
        { id: 'surface.terminal', objectKind: 'terminal_surface', displayName: 'Terminal', status: 'running', trustState: 'partial', permissionEnvelope: 'read_only', adapterPath: 'terminal_custody', firstScreen: false, receiptTypes: ['run_custody'], privacyClass: 'local_private', detail: 'Fixture terminal.' },
      ],
    },
    programRegistry: {
      summary: { status: 'captured', programCount: 12, launchableProgramCount: 12, runningWindowCount: 3, classCounts: { browser: 1, developer_tool: 2 }, permissionEnvelope: 'guarded_execute_for_launch', actionBridgeStatus: 'guarded_execute_available' },
    },
    osUiCapture: {
      schemaVersion: 'hololand.holoshell.os-ui-capture.v0.1.0',
      generatedAt: '2026-05-14T00:00:00.500Z',
      summary: {
        status: 'captured',
        targetApp: 'chrome',
        targetSource: 'legacy_absorption_recommendation',
        targetMatched: true,
        targetResolved: true,
        targetResolution: 'rich_capture',
        selectedWindowId: 'window-chrome',
        selectedAppName: 'chrome',
        selectedSurfaceRole: 'legacy_app_surface',
        selectedMutationPolicy: 'preflight_required',
        windowCount: 2,
        controlCount: 7,
        geometryNodeCount: 1200,
        uiAutomationStatus: 'available',
        actionBridgeStatus: 'route_planned',
      },
      selectedWindow: {
        id: 'window-chrome',
        title: 'Fixture Browser',
        processName: 'chrome',
        controls: [
          { name: 'Address and search bar', controlType: 'Edit', enabled: true, offscreen: false, shellSemantics: { actionBridge: 'guarded_execute_pending' } },
          { name: 'Back', controlType: 'Button', enabled: true, offscreen: false, shellSemantics: { actionBridge: 'guarded_execute_pending' } },
        ],
        legacySurface: {
          appName: 'chrome',
          label: 'Chrome',
          surfaceRole: 'legacy_app_surface',
          mutationPolicy: 'preflight_required',
          safeActions: ['capture_window', 'map_visible_controls', 'summarize_tabs'],
          blockedActions: ['submit_form', 'change_browser_profile'],
          preflightTool: 'holoshell_preflight_legacy_app_mutation',
        },
      },
      actionDryRun: {
        status: 'route_planned',
        preflightRequired: true,
        preflightTool: 'holoshell_preflight_legacy_app_mutation',
        safeActions: ['capture_window', 'map_visible_controls', 'summarize_tabs'],
        blockedActions: ['submit_form', 'change_browser_profile'],
      },
      receipt: { id: 'os-ui-capture-fixture', permissionEnvelope: 'read_only', mutatingActionsExecuted: false },
    },
    processHealth: {
      summary: { riskState: 'warn', processCount: 42, shellRunCount: 7, registeredRunCount: 3, activeRegisteredRunCount: 1, staleRunCount: 1, highMemoryCount: 0, stopPlanCount: 1 },
      collection: { commandLinesIncluded: false },
      policies: { automaticTerminationAllowed: false, exactPidRequired: true },
    },
    lanes: {
      summary: { laneCount: 3, activeLaneCount: 3, colorLaneCount: 3, semanticLaneCount: 3 },
      lanes: [
        { laneId: 'codex-hardware', displayName: 'Codex Hardware', agentKind: 'codex', surfaceKind: 'hardware_shell', role: 'local_oracle', status: 'active', color: { name: 'electric blue', hex: '#0087D7', ansiSgr: '38;5;33' }, semanticPrefix: '[lane:codex-hardware]', processEvidence: { detected: true, matches: ['codex'] }, receiptPolicy: { colorIsVisualHintOnly: true } },
        { laneId: 'claude-desktop', displayName: 'Claude Desktop', agentKind: 'claude', surfaceKind: 'desktop_app', role: 'reasoning_partner', status: 'active', color: { name: 'copper', hex: '#D97706', ansiSgr: '38;5;208' }, semanticPrefix: '[lane:claude-desktop]', processEvidence: { detected: true, matches: ['claude'] }, receiptPolicy: { colorIsVisualHintOnly: true } },
        { laneId: 'local-shell', displayName: 'Local Shell', agentKind: 'shell', surfaceKind: 'terminal', role: 'command_executor', status: 'active', color: { name: 'amber', hex: '#EAB308', ansiSgr: '38;5;220' }, semanticPrefix: '[lane:local-shell]', processEvidence: { detected: true, matches: ['terminal'] }, receiptPolicy: { colorIsVisualHintOnly: true } },
      ],
    },
    operatorBrief: {
      schemaVersion: 'hololand.holoshell.operator-brief.v0.1.0',
      generatedAt: '2026-05-14T00:00:00.000Z',
      status: 'legacy_absorption_ready',
      hardware: { riskState: 'warn', processCount: 42, shellRunCount: 7, activeLaneCount: 3, laneCount: 3, legacyAppCount: 4 },
      runs: { staleRunCount: 1, ownerUnknownCount: 0 },
      legacy: { visibleWindowCount: 8, peerWindowCount: 2, peerSurfaceCount: 2, shellWindowCount: 1, shellSurfaceCount: 1, operatingSurfaceWindowCount: 3, operatingSurfaceCount: 3, captureCandidateCount: 4, shellWindowBoundCount: 1, shellWindowOwnerUnknownRunCount: 0 },
      peers: { source: 'legacy_window_inventory', windowInstanceCount: 2, surfaceCount: 2, shellWindowInstanceCount: 1, shellSurfaceCount: 1, operatingSurfaceWindowCount: 3, operatingSurfaceCount: 3, rawWindowTitlesIncluded: false },
      brittneyPromptCard: { firstMove: 'No custody action required before low-risk read-only work.', peerWindowSummary: 'Claude:1, Codex:1', shellWindowSummary: 'Terminal:1', shellCustodySummary: '1/1 shell windows bound.', mustNot: ['kill_process', 'legacy_app_mutation'] },
      blockedActions: ['kill_process', 'legacy_app_mutation'],
      safety: { destructiveActionsTaken: false, rawCommandsIncluded: false, rawWindowTitlesIncluded: false },
      receipt: { briefHash: 'fixture-brief', rawCommandsIncluded: false, rawWindowTitlesIncluded: false },
    },
    workflow: { title: 'Fixture Workflow', summary: { status: 'pending_user_approval', stepCount: 2, pendingApprovalCount: 1 } },
    workflowApproval: { summary: { status: 'pending_user_approval', executionAllowed: true } },
    workflowIntentGate: { summary: { status: 'pass', executionAllowed: true } },
    shardWorkflow: { summary: { status: 'staged' } },
    shardImportApproval: { summary: { status: 'pending_user_approval', executionAllowed: true } },
    shardImport: { summary: { status: 'not_run' } },
    hardwareApproval: { summary: { status: 'pending_user_approval', actionKind: 'launch_app', executionAllowed: true } },
    brittneyTurn: { turnId: 'fixture-turn', generatedAt: '2026-05-14T00:00:01.000Z', schemaVersion: 'hololand.holoshell.brittney-turn.v0.1.0', summary: { status: 'completed' } },
    operatingTurn: { generatedAt: '2026-05-14T00:00:02.000Z', schemaVersion: 'hololand.holoshell.operating-turn.v0.1.0', summary: { status: 'pass' }, receipt: { operatingTurnHash: 'fixture-operating-turn' } },
    liveFeed: { timeline: [] },
  };
}

function createPacket(args, inputs = loadInputs(args)) {
  const visibleObjects = visibleShellObjects(inputs.shellObjects, args.selectedShellObjectId, args.maxVisibleObjects);
  const selectedObject = selectedShellObject(inputs.shellObjects, args.selectedShellObjectId, visibleObjects);
  const programRegistrySummary = summarizeProgramRegistry(inputs.programRegistry);
  const activeWorkflowSummary = summarizeWorkflow(inputs);
  const approvalSummary = summarizeApprovals(inputs);
  const agentLaneSummary = summarizeLanes(inputs.lanes);
  const processHealthSummary = summarizeProcessHealth(inputs.processHealth, inputs.operatorBrief);
  const operatorBriefSummary = summarizeOperatorBrief(inputs.operatorBrief);
  const legacyUiCaptureSummary = summarizeOsUiCapture(inputs.osUiCapture);
  const timeline = recentReceiptTimeline(inputs, args.maxTimelineItems);
  const privacy = privacyBoundary(inputs);
  const contextHashInput = {
    prompt: args.prompt,
    selected: selectedObject?.id || '',
    visibleObjectIds: visibleObjects.map((object) => object.id),
    programRegistrySummary,
    activeWorkflowSummary,
    approvalSummary,
    agentLaneSummary,
    processHealthSummary,
    operatorBriefSummary,
    legacyUiCaptureSummary,
    timelineIds: timeline.map((item) => item.id),
    privacy,
  };
  const contextHash = sha256(JSON.stringify(contextHashInput));
  const status = privacy.rawCommandsIncluded || privacy.rawWindowTitlesIncluded || privacy.secretsIncluded
    ? 'boundary_review_required'
    : 'ready';

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sourceAnchors: {
      source: 'apps/holoshell/source/holoshell-brittney-context-packet.hsplus',
      adapter: 'scripts/holoshell-brittney-context.mjs',
      operatorBrief: 'scripts/holoshell-operator-brief.mjs',
      shellObjects: 'scripts/holoshell-shell-objects.mjs',
      processHealth: 'scripts/holoshell-process-health.mjs',
      agentLanes: 'scripts/holoshell-agent-lanes.mjs',
      programRegistry: 'scripts/holoshell-program-registry.mjs',
      osUiCapture: 'scripts/holoshell-os-ui-capture.mjs',
    },
    prompt: args.prompt,
    selectedShellObject: selectedObject,
    visibleShellObjects: visibleObjects,
    programRegistrySummary,
    activeWorkflowSummary,
    approvalSummary,
    agentLaneSummary,
    processHealthSummary,
    operatorBriefSummary,
    legacyUiCaptureSummary,
    recentReceiptTimeline: timeline,
    privacyBoundary: privacy,
    operatorPromptCard: inputs.operatorBrief.brittneyPromptCard || {},
    blockedActions: operatorBriefSummary.mustNot,
    actionProposalDefaults: {
      actor: 'brittney',
      approvalRequiredForNonReadOnly: true,
      expectedReceipts: ['brittney_context', 'os_ui_capture_receipt', 'brittney_turn_receipt', 'approval_bundle_when_guarded', 'adapter_receipt'],
      rollbackOrWitnessPlan: 'read-only preview first; guarded execution needs receipt-backed witness or approval.',
    },
    summary: {
      status,
      selectedShellObjectId: selectedObject?.id || '',
      visibleShellObjectCount: visibleObjects.length,
      totalShellObjectCount: inputs.shellObjects.summary?.shellObjectCount || safeArray(inputs.shellObjects.objects).length,
      activeLaneCount: agentLaneSummary.activeLaneCount,
      processRisk: processHealthSummary.riskState,
      processCount: processHealthSummary.processCount,
      staleRunCount: processHealthSummary.staleRunCount,
      highMemoryCount: processHealthSummary.highMemoryCount,
      stopPlanCount: processHealthSummary.stopPlanCount,
      osUiCaptureStatus: legacyUiCaptureSummary.status,
      osUiTargetApp: legacyUiCaptureSummary.targetApp,
      osUiTargetMatched: legacyUiCaptureSummary.targetMatched,
      osUiTargetResolved: legacyUiCaptureSummary.targetResolved,
      osUiTargetResolution: legacyUiCaptureSummary.targetResolution,
      osUiSelectedAppName: legacyUiCaptureSummary.selectedAppName,
      osUiSelectedMutationPolicy: legacyUiCaptureSummary.selectedMutationPolicy,
      osUiControlCount: legacyUiCaptureSummary.controlCount,
      osUiGeometryNodeCount: legacyUiCaptureSummary.geometryNodeCount,
      localUiLabelsIncluded: privacy.localUiLabelsIncluded,
      peerWindowCount: operatorBriefSummary.peerWindowCount,
      shellWindowCount: operatorBriefSummary.shellWindowCount,
      operatingSurfaceWindowCount: operatorBriefSummary.operatingSurfaceWindowCount,
      pendingApprovalCount: approvalSummary.pendingApprovalCount,
      recentReceiptCount: timeline.length,
      rawCommandsIncluded: privacy.rawCommandsIncluded,
      rawWindowTitlesIncluded: privacy.rawWindowTitlesIncluded,
      secretsIncluded: privacy.secretsIncluded,
      contextHash,
    },
    agentConsumption: {
      rest: '.tmp/holoshell/brittney-context.json',
      browserBootstrap: '.tmp/holoshell/brittney-context.js',
      requiredRefreshOrder: [
        'pnpm run holoshell:hardware-reality',
        'pnpm run holoshell:legacy-windows',
        'pnpm run holoshell:run-custody',
        'pnpm run holoshell:legacy-apps',
        'pnpm run holoshell:os-ui-capture',
        'pnpm run holoshell:operator-brief',
        'pnpm run holoshell:shell-objects',
        'pnpm run holoshell:brittney-context',
      ],
    },
    receipt: {
      contextHash,
      destructiveActionsTaken: privacy.destructiveActionsTaken,
      rawCommandsIncluded: privacy.rawCommandsIncluded,
      rawWindowTitlesIncluded: privacy.rawWindowTitlesIncluded,
      secretsIncluded: privacy.secretsIncluded,
    },
  };
}

function assertSelfTest(packet) {
  const failures = [];
  if (packet.schemaVersion !== SCHEMA_VERSION) failures.push('schemaVersion mismatch');
  if (packet.summary.status !== 'ready') failures.push(`expected ready status, got ${packet.summary.status}`);
  if (!packet.selectedShellObject?.id) failures.push('missing selected shell object');
  if (packet.visibleShellObjects.length < 3) failures.push('expected visible shell objects');
  if (packet.operatorBriefSummary.peerWindowCount < 2) failures.push('expected peer windows from operator brief');
  if (packet.operatorBriefSummary.shellWindowCount < 1) failures.push('expected shell windows tracked separately');
  if (packet.agentLaneSummary.colorLaneCount < 3) failures.push('expected color lane evidence');
  if (packet.legacyUiCaptureSummary.status !== 'captured') failures.push('expected OS UI capture summary');
  if (packet.legacyUiCaptureSummary.targetApp !== 'chrome') failures.push('expected Chrome OS UI target');
  if (!packet.legacyUiCaptureSummary.targetResolved) failures.push('expected resolved OS UI target');
  if (packet.legacyUiCaptureSummary.mutatingActionsExecuted !== false) failures.push('OS UI capture must remain read-only');
  if (packet.approvalSummary.pendingApprovalCount < 1) failures.push('expected pending approval summary');
  if (packet.processHealthSummary.commandLinesIncluded !== false) failures.push('raw command lines must be excluded');
  if (packet.privacyBoundary.rawCommandsIncluded !== false) failures.push('privacy boundary leaked raw commands');
  if (packet.privacyBoundary.rawWindowTitlesIncluded !== false) failures.push('privacy boundary leaked raw window titles');
  if (packet.privacyBoundary.secretsIncluded !== false) failures.push('privacy boundary leaked secrets');
  if (!packet.receipt.contextHash) failures.push('missing context hash');
  const serialized = JSON.stringify(packet);
  if (/commandPreview|commandText|rawCommandValue|rawWindowTitleValue|rawTitleValue|api[_-]?key|password\s*=|token\s*=|C:\\\\Users\\\\/i.test(serialized)) failures.push('packet leaked raw command, title, secret, or private path');
  if (failures.length) {
    throw new Error(`Self-test failed:\n- ${failures.join('\n- ')}`);
  }
}

try {
  const args = parseArgs(process.argv.slice(2));
  const packet = createPacket(args);
  const output = writeJson(args.output, packet);
  const jsOutput = writeBrowserBootstrap(args.jsOutput, packet);
  if (args.selfTest) assertSelfTest(packet);

  if (args.json) {
    console.log(JSON.stringify(packet, null, 2));
  } else {
    console.log(`HoloShell Brittney context: ${output}`);
    console.log(`HoloShell Brittney context browser bootstrap: ${jsOutput}`);
    console.log(`Status: ${packet.summary.status}`);
    console.log(`Selected shell object: ${packet.summary.selectedShellObjectId}`);
    console.log(`Visible shell objects: ${packet.summary.visibleShellObjectCount}/${packet.summary.totalShellObjectCount}`);
    console.log(`Peer windows: ${packet.summary.peerWindowCount}`);
    console.log(`Shell windows: ${packet.summary.shellWindowCount}`);
    console.log(`Process risk: ${packet.summary.processRisk}`);
    console.log(`Pending approvals: ${packet.summary.pendingApprovalCount}`);
  }
} catch (error) {
  console.error(`holoshell-brittney-context failed: ${error.message}`);
  process.exit(1);
}
