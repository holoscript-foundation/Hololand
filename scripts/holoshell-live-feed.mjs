#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SCHEMA_VERSION = 'hololand.holoshell.live-feed.v0.1.0';
const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const DEFAULT_OUTPUT = path.join('.tmp', 'holoshell', 'live-feed.json');
const DEFAULT_JS_OUTPUT = path.join('.tmp', 'holoshell', 'live-feed.js');
const DEFAULT_TMP = path.join('.tmp', 'holoshell');

function parseArgs(argv) {
  const args = {
    json: false,
    selfTest: false,
    output: DEFAULT_OUTPUT,
    jsOutput: DEFAULT_JS_OUTPUT,
    tmpDir: DEFAULT_TMP,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') args.json = true;
    else if (arg === '--self-test') args.selfTest = true;
    else if (arg === '--output') args.output = argv[++index];
    else if (arg === '--js-output') args.jsOutput = argv[++index];
    else if (arg === '--tmp-dir') args.tmpDir = argv[++index];
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
  console.log(`HoloShell live feed bundler

Usage:
  node scripts/holoshell-live-feed.mjs [options]

Options:
  --json              Print the bundled feed.
  --self-test         Assert feed invariants.
  --tmp-dir <path>    Read feed inputs from this directory. Defaults to .tmp/holoshell.
  --output <path>     Write JSON output. Defaults to .tmp/holoshell/live-feed.json.
  --js-output <path>  Write browser bootstrap JS. Defaults to .tmp/holoshell/live-feed.js.
  -h, --help          Show this help.
`);
}

function resolveRepoPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(REPO_ROOT, filePath);
}

function readJson(filePath, fallback = null) {
  const resolved = resolveRepoPath(filePath);
  if (!existsSync(resolved)) return fallback;
  try {
    return JSON.parse(readFileSync(resolved, 'utf8'));
  } catch (error) {
    return {
      schemaVersion: 'hololand.holoshell.read-error.v0.1.0',
      generatedAt: new Date().toISOString(),
      path: resolved,
      error: error.message,
    };
  }
}

function readReceiptFiles(dirPath) {
  const resolved = resolveRepoPath(dirPath);
  if (!existsSync(resolved)) return [];
  return readdirSync(resolved, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => readJson(path.join(resolved, entry.name)))
    .filter(Boolean)
    .sort((left, right) => String(right?.timing?.endedAt || right?.generatedAt || '').localeCompare(String(left?.timing?.endedAt || left?.generatedAt || '')));
}

function trustCounts(capabilities = []) {
  return capabilities.reduce((counts, capability) => {
    const key = capability.trustState || capability.trust_state || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function riskRank(risk) {
  if (risk === 'critical') return 3;
  if (risk === 'warn') return 2;
  if (risk === 'unknown') return 1;
  return 0;
}

function riskFromEvidenceStatus(status) {
  if (status === 'fail' || status === 'reported_fail' || status === 'warn' || status === 'skipped') return 'warn';
  if (status === 'pass') return 'pass';
  return 'unknown';
}

function createTimeline({ inventory, surfaceMap, wildHoloScript, lanes, processHealth, osUiCapture, programRegistry, readinessEvidence, shellObjects, brittneyAvatar, brittneyTurn, hardwareAction, hardwareApproval, workflow, workflowApproval, workflowIntentGate, shardWorkflow, shardImportApproval, shardImport, runReceipts, pilotReceipts }) {
  const timeline = [];
  const now = new Date().toISOString();

  if (inventory?.summary) {
    timeline.push({
      id: 'capability-inventory',
      kind: 'capability_inventory',
      title: 'Capability inventory refreshed',
      detail: `${inventory.summary.capabilityCount || 0} capabilities, ${inventory.summary.legacyProgramCount || 0} legacy programs classified.`,
      trustState: (inventory.summary.unknown || 0) > 0 ? 'partial' : 'verified',
      generatedAt: inventory.generatedAt || now,
      receiptType: 'hololand.holoshell.capability-inventory.v0.1.0',
      source: 'scripts/holoshell-capability-inventory.mjs',
    });
  }

  if (surfaceMap?.summary) {
    timeline.push({
      id: 'holoscript-surface-map',
      kind: 'surface_map',
      title: 'HoloScript surfaces mapped',
      detail: `${surfaceMap.summary.mcpToolCount || 0} MCP tools, ${surfaceMap.summary.cliCommandCount || 0} CLI commands, ${surfaceMap.summary.restReachable || 0}/${surfaceMap.summary.restSurfaceCount || 0} REST surfaces reachable.`,
      trustState: 'verified',
      generatedAt: surfaceMap.generatedAt || now,
      receiptType: 'hololand.holoshell.holoscript-surface-map.v0.1.0',
      source: 'scripts/holoshell-holoscript-surface-map.mjs',
    });
  }

  if (wildHoloScript?.summary) {
    timeline.push({
      id: wildHoloScript.intakeId || 'wild-holoscript-intake',
      kind: 'wild_holoscript_intake',
      title: `Wild HoloScript intake ${wildHoloScript.summary.status || 'unknown'}`,
      detail: `${wildHoloScript.summary.fileCount || 0} files from ${wildHoloScript.source?.rootName || 'uaa2-service'}; ${wildHoloScript.summary.frontierSyntaxCount || 0} frontier syntax; ${wildHoloScript.summary.adapterNeededCount || 0} adapter needed.`,
      trustState: (wildHoloScript.summary.adapterNeededCount || 0) > 0 ? 'partial' : wildHoloScript.summary.status === 'scanned' ? 'verified' : 'unknown',
      generatedAt: wildHoloScript.generatedAt || now,
      receiptType: wildHoloScript.schemaVersion,
      source: wildHoloScript.source?.script || 'scripts/holoshell-wild-holoscript-intake.mjs',
    });
  }

  if (lanes?.summary) {
    timeline.push({
      id: 'agent-lanes',
      kind: 'agent_presence',
      title: 'Agent lanes refreshed',
      detail: `${lanes.summary.activeLaneCount || 0}/${lanes.summary.laneCount || 0} lanes active or available.`,
      trustState: 'verified',
      generatedAt: lanes.generatedAt || now,
      receiptType: 'hololand.holoshell.agent-lanes.v0.1.0',
      source: 'scripts/holoshell-agent-lanes.mjs',
    });
  }

  if (processHealth?.summary) {
    timeline.push({
      id: 'process-health',
      kind: 'process_health',
      title: `Process health is ${processHealth.summary.riskState || 'unknown'}`,
      detail: `${processHealth.summary.processCount || 0} processes, ${processHealth.summary.shellRunCount || 0} shell/dev runs, ${processHealth.summary.staleRunCount || 0} stale, ${processHealth.summary.highMemoryCount || 0} high-memory.`,
      trustState: processHealth.summary.riskState === 'pass' ? 'verified' : 'partial',
      generatedAt: processHealth.generatedAt || now,
      receiptType: 'hololand.holoshell.process-health.v0.1.0',
      source: 'scripts/holoshell-process-health.mjs',
    });
  }

  if (osUiCapture?.summary) {
    timeline.push({
      id: 'os-ui-capture',
      kind: 'os_ui_capture',
      title: 'Legacy UI captured as HoloShell geometry',
      detail: `${osUiCapture.summary.windowCount || 0} windows, ${osUiCapture.summary.controlCount || 0} controls, ${osUiCapture.summary.geometryNodeCount || 0} geometric shards.`,
      trustState: osUiCapture.summary.status === 'captured' ? 'verified' : 'partial',
      generatedAt: osUiCapture.generatedAt || now,
      receiptType: 'hololand.holoshell.os-ui-capture.v0.1.0',
      source: 'scripts/holoshell-os-ui-capture.mjs',
    });
  }

  if (programRegistry?.summary) {
    timeline.push({
      id: 'program-registry',
      kind: 'program_registry',
      title: 'Launchable programs registered',
      detail: `${programRegistry.summary.launchableProgramCount || 0}/${programRegistry.summary.programCount || 0} programs launchable; ${programRegistry.summary.runningWindowCount || 0} running windows correlated.`,
      trustState: programRegistry.summary.status === 'captured' ? 'verified' : 'partial',
      generatedAt: programRegistry.generatedAt || now,
      receiptType: 'hololand.holoshell.program-registry.v0.1.0',
      source: 'scripts/holoshell-program-registry.mjs',
    });
  }

  if (readinessEvidence?.summary) {
    timeline.push({
      id: readinessEvidence.readinessId || 'holoshell-readiness-evidence',
      kind: 'readiness_evidence',
      title: `World build readiness ${readinessEvidence.summary.status || 'unknown'}`,
      detail: `${readinessEvidence.summary.scenario || 'HoloShell readiness'}; build ${readinessEvidence.summary.buildStatus || 'unknown'}; device ${readinessEvidence.summary.deviceLabStatus || 'unknown'}; graph ${readinessEvidence.summary.graphStatus || 'unknown'}.`,
      trustState: readinessEvidence.summary.status === 'pass' ? 'verified' : 'partial',
      generatedAt: readinessEvidence.generatedAt || now,
      receiptType: readinessEvidence.schemaVersion,
      source: readinessEvidence.source?.reportPath || 'scripts/holoshell-readiness-evidence.mjs',
    });
    for (const token of (readinessEvidence.tokens || []).slice(0, 8)) {
      timeline.push({
        id: token.id,
        kind: `readiness_${token.kind || 'token'}`,
        title: token.title || 'Readiness token',
        detail: token.detail || token.nextAction || 'Readiness evidence recorded.',
        trustState: token.trustState || (token.status === 'pass' ? 'verified' : 'partial'),
        generatedAt: readinessEvidence.generatedAt || now,
        receiptType: token.receiptType || readinessEvidence.schemaVersion,
        source: token.source || readinessEvidence.source?.evidenceDir || 'scripts/holoshell-readiness-evidence.mjs',
      });
    }
  }

  if (shellObjects?.summary) {
    timeline.push({
      id: 'shell-objects',
      kind: 'shell_object_graph',
      title: 'Shell objects materialized',
      detail: `${shellObjects.summary.shellObjectCount || 0} addressable objects; ${shellObjects.summary.programObjectCount || 0} app bubbles; ${shellObjects.summary.capturedWindowObjectCount || 0} captured windows; ${shellObjects.summary.guardedExecuteCount || 0} guarded powers.`,
      trustState: shellObjects.summary.status === 'ready' ? 'verified' : 'partial',
      generatedAt: shellObjects.generatedAt || now,
      receiptType: shellObjects.schemaVersion,
      source: 'scripts/holoshell-shell-objects.mjs',
    });
  }

  if (brittneyAvatar?.summary) {
    timeline.push({
      id: 'brittney-avatar',
      kind: 'brittney_avatar',
      title: `Brittney avatar ${brittneyAvatar.summary.avatarStatus || 'unknown'}`,
      detail: `${brittneyAvatar.runtime?.packageName || '@holoscript/aibrittney'} runtime ${brittneyAvatar.summary.runtimeStatus || 'unknown'}; ${brittneyAvatar.summary.emotion || 'attentive'} expression; ${brittneyAvatar.summary.voiceState || 'ready'} voice state.`,
      trustState: brittneyAvatar.summary.runtimeStatus === 'available' ? 'verified' : 'partial',
      generatedAt: brittneyAvatar.generatedAt || now,
      receiptType: 'hololand.holoshell.brittney-avatar.v0.1.0',
      source: 'scripts/holoshell-brittney-avatar.mjs',
    });
  }

  if (brittneyTurn?.summary) {
    timeline.push({
      id: brittneyTurn.turnId || 'brittney-turn',
      kind: 'brittney_turn',
      title: `Brittney turn ${brittneyTurn.summary.status || 'unknown'}`,
      detail: `${brittneyTurn.summary.eventCount || 0} runtime events, ${brittneyTurn.summary.actionProposalCount || 0} shell proposal(s), first target ${brittneyTurn.summary.firstProposalObject || 'none'}.`,
      trustState: brittneyTurn.summary.status === 'completed' ? 'verified' : 'partial',
      generatedAt: brittneyTurn.generatedAt || now,
      receiptType: 'hololand.holoshell.brittney-turn.v0.1.0',
      source: 'scripts/holoshell-brittney-turn.mjs',
    });
  }

  if (hardwareAction?.summary) {
    timeline.push({
      id: hardwareAction.actionId || 'hardware-action',
      kind: 'hardware_action',
      title: `Hardware action ${hardwareAction.summary.status || 'unknown'}`,
      detail: `${hardwareAction.summary.actionKind || 'unknown action'} via ${hardwareAction.summary.permissionEnvelope || 'unknown'}; ${hardwareAction.summary.windowCount || 0} windows visible; target ${hardwareAction.summary.targetWindowTitle || 'none'}.`,
      trustState: hardwareAction.summary.status === 'completed' ? 'verified' : hardwareAction.summary.status === 'approval_required' ? 'partial' : 'unknown',
      generatedAt: hardwareAction.generatedAt || now,
      receiptType: 'hololand.holoshell.hardware-action.v0.1.0',
      source: 'scripts/holoshell-action-executor.mjs',
    });
  }

  if (hardwareApproval?.summary) {
    timeline.push({
      id: hardwareApproval.approvalId || 'hardware-approval',
      kind: 'hardware_approval',
      title: `Hardware approval ${hardwareApproval.summary.status || 'unknown'}`,
      detail: `${hardwareApproval.summary.actionKind || 'unknown action'} for ${hardwareApproval.summary.target || 'local computer'}; execution ${hardwareApproval.summary.executionAllowed ? 'allowed after approval' : 'blocked'}.`,
      trustState: hardwareApproval.summary.executionAllowed ? 'partial' : hardwareApproval.summary.status === 'not_required' ? 'verified' : 'unknown',
      generatedAt: hardwareApproval.generatedAt || now,
      receiptType: 'hololand.holoshell.hardware-approval.v0.1.0',
      source: 'scripts/holoshell-approval-bundle.mjs',
    });
  }

  if (workflow?.summary) {
    timeline.push({
      id: workflow.workflowId || 'holoshell-workflow',
      kind: 'workflow',
      title: `${workflow.title || 'HoloShell workflow'} ${workflow.summary.status || 'unknown'}`,
      detail: `${workflow.summary.stepCount || 0} steps, ${workflow.summary.pendingApprovalCount || 0} pending approval(s), model ${workflow.summary.modelRoute || 'unknown'}/${workflow.summary.model || 'unknown'}.`,
      trustState: workflow.summary.mutationExecuted ? 'partial' : workflow.summary.status === 'pending_user_approval' ? 'partial' : 'verified',
      generatedAt: workflow.generatedAt || now,
      receiptType: 'hololand.holoshell.workflow.v0.1.0',
      source: 'scripts/holoshell-room-marathon-workflow.mjs',
    });
  }

  if (workflowApproval?.summary) {
    timeline.push({
      id: workflowApproval.approvalId || 'holoshell-workflow-approval',
      kind: 'workflow_approval',
      title: `Workflow approval ${workflowApproval.summary.status || 'unknown'}`,
      detail: `${workflowApproval.summary.title || 'HoloShell workflow'}; ${workflowApproval.summary.pendingApprovalCount || 0} guarded approval(s); execution ${workflowApproval.summary.executionAllowed ? 'allowed after gesture' : 'blocked'}.`,
      trustState: workflowApproval.summary.executionAllowed ? 'partial' : 'verified',
      generatedAt: workflowApproval.generatedAt || now,
      receiptType: 'hololand.holoshell.workflow-approval.v0.1.0',
      source: 'scripts/holoshell-workflow-approval-bundle.mjs',
    });
  }

  if (workflowIntentGate?.summary) {
    timeline.push({
      id: workflowIntentGate.gateId || 'holoshell-brain-intent-gate',
      kind: 'brain_intent_gate',
      title: `Brain intent gate ${workflowIntentGate.summary.status || 'unknown'}`,
      detail: `${workflowIntentGate.summary.caseId || 'unknown case'}; execution ${workflowIntentGate.summary.executionAllowed ? 'allowed' : 'blocked'}; ${workflowIntentGate.summary.failedCheckCount || 0} failed check(s).`,
      trustState: workflowIntentGate.summary.executionAllowed ? 'verified' : 'partial',
      generatedAt: workflowIntentGate.generatedAt || now,
      receiptType: workflowIntentGate.schemaVersion,
      source: 'scripts/holoshell-brain-intent-gate.mjs',
    });
  }

  if (shardWorkflow?.summary) {
    timeline.push({
      id: shardWorkflow.workflowId || 'holoshell-asset-shard-workflow',
      kind: 'asset_shard_workflow',
      title: `Asset shard workflow ${shardWorkflow.summary.status || 'unknown'}`,
      detail: `${shardWorkflow.summary.assetCount || 0} assets, ${shardWorkflow.summary.modelCount || 0} model(s), ${shardWorkflow.summary.imageCount || 0} image(s), ${shardWorkflow.summary.audioCount || 0} audio file(s); import approval ${shardWorkflow.summary.approvalRequired ? 'required' : 'not required'}.`,
      trustState: shardWorkflow.summary.status === 'staged' ? 'verified' : 'partial',
      generatedAt: shardWorkflow.generatedAt || now,
      receiptType: shardWorkflow.schemaVersion,
      source: shardWorkflow.output?.latestPath || 'scripts/holoshell-asset-shard-workflow.mjs',
    });
  }

  if (shardImportApproval?.summary) {
    timeline.push({
      id: shardImportApproval.approvalId || 'holoshell-shard-import-approval',
      kind: 'asset_shard_import_approval',
      title: `Shard import approval ${shardImportApproval.summary.status || 'unknown'}`,
      detail: `${shardImportApproval.summary.assetCount || 0} assets for ${shardImportApproval.summary.shardId || 'asset shard'}; execution ${shardImportApproval.summary.executionAllowed ? 'allowed after approval' : 'blocked'}.`,
      trustState: shardImportApproval.summary.executionAllowed ? 'partial' : 'verified',
      generatedAt: shardImportApproval.generatedAt || now,
      receiptType: shardImportApproval.schemaVersion,
      source: shardImportApproval.output?.latestPath || 'scripts/holoshell-shard-import-approval.mjs',
    });
  }

  if (shardImport?.summary && shardImport.summary.status !== 'not_run') {
    timeline.push({
      id: shardImport.importId || 'holoshell-shard-import',
      kind: 'asset_shard_import_receipt',
      title: `Shard import ${shardImport.summary.status || 'unknown'}`,
      detail: `${shardImport.summary.assetCount || 0} assets imported into runtime-local shard ${shardImport.summary.shardId || 'unknown'}; source assets mutated ${shardImport.summary.sourceAssetsMutated ? 'yes' : 'no'}.`,
      trustState: shardImport.summary.status === 'completed' && !shardImport.summary.sourceAssetsMutated ? 'verified' : 'partial',
      generatedAt: shardImport.generatedAt || now,
      receiptType: shardImport.schemaVersion,
      source: shardImport.output?.receiptPath || 'scripts/holoshell-shard-import-approval.mjs',
    });
  }

  for (const receipt of runReceipts.slice(0, 12)) {
    timeline.push({
      id: receipt.runId,
      kind: 'run_receipt',
      title: `${receipt.name || 'Run'} ${receipt.status || 'recorded'}`,
      detail: `${receipt.command?.preview || 'local command'} as ${receipt.command?.runClass || 'run'} on ${receipt.lane?.laneId || 'unknown lane'}.`,
      trustState: receipt.status === 'completed' ? 'verified' : receipt.status === 'blocked' ? 'partial' : 'unknown',
      generatedAt: receipt.timing?.endedAt || receipt.timing?.plannedAt || now,
      receiptType: receipt.schemaVersion,
      source: receipt.output?.receiptPath || '.tmp/holoshell/run-receipts',
    });
  }

  for (const receipt of pilotReceipts.slice(0, 12)) {
    timeline.push({
      id: receipt.receiptId,
      kind: 'pilot_receipt',
      title: receipt.title || `${receipt.pilot} pilot receipt`,
      detail: receipt.summary || receipt.outcome || 'Pilot outcome recorded.',
      trustState: receipt.trustState || 'partial',
      generatedAt: receipt.generatedAt || now,
      receiptType: receipt.schemaVersion,
      source: receipt.source || '.tmp/holoshell/pilot-receipts',
    });
  }

  return timeline
    .filter((item) => item.id)
    .sort((left, right) => String(right.generatedAt).localeCompare(String(left.generatedAt)))
    .slice(0, 32);
}

function createFeed(args) {
  const tmpDir = resolveRepoPath(args.tmpDir);
  const inventory = readJson(path.join(tmpDir, 'capability-inventory.json'), {});
  const surfaceMap = readJson(path.join(tmpDir, 'holoscript-surface-map.json'), {});
  const wildHoloScript = readJson(path.join(tmpDir, 'wild-holoscript-intake.json'), {});
  const lanes = readJson(path.join(tmpDir, 'agent-lanes.json'), {});
  const processHealth = readJson(path.join(tmpDir, 'process-health.json'), {});
  const osUiCapture = readJson(path.join(tmpDir, 'os-ui-capture.json'), {});
  const programRegistry = readJson(path.join(tmpDir, 'program-registry.json'), {});
  const readinessEvidence = readJson(path.join(tmpDir, 'readiness-evidence.json'), {});
  const shellObjects = readJson(path.join(tmpDir, 'shell-objects.json'), {});
  const brittneyAvatar = readJson(path.join(tmpDir, 'brittney-avatar.json'), {});
  const brittneyTurn = readJson(path.join(tmpDir, 'brittney-turn-latest.json'), {});
  const hardwareAction = readJson(path.join(tmpDir, 'action-latest.json'), {});
  const hardwareApproval = readJson(path.join(tmpDir, 'approval-latest.json'), {});
  const workflow = readJson(path.join(tmpDir, 'workflow-latest.json'), {});
  const workflowApproval = readJson(path.join(tmpDir, 'workflow-approval-latest.json'), {});
  const workflowIntentGate = readJson(path.join(tmpDir, 'brain-intent-gate-latest.json'), {});
  const shardWorkflow = readJson(path.join(tmpDir, 'shard-workflow-latest.json'), {});
  const shardImportApproval = readJson(path.join(tmpDir, 'shard-import-approval-latest.json'), {});
  const shardImport = readJson(path.join(tmpDir, 'shard-import-latest.json'), {});
  const runRegistry = readJson(path.join(tmpDir, 'run-registry.json'), { runs: [] });
  const runReceipts = readReceiptFiles(path.join(tmpDir, 'run-receipts'));
  const actionReceipts = readReceiptFiles(path.join(tmpDir, 'action-receipts'));
  const approvalBundles = readReceiptFiles(path.join(tmpDir, 'approval-bundles'));
  const workflowApprovalBundles = readReceiptFiles(path.join(tmpDir, 'workflow-approval-bundles'));
  const shardImportApprovalBundles = readReceiptFiles(path.join(tmpDir, 'shard-import-approval-bundles'));
  const pilotReceipts = readReceiptFiles(path.join(tmpDir, 'pilot-receipts'));
  const stopPlans = [
    ...(Array.isArray(processHealth?.stopPlans) ? processHealth.stopPlans : []),
    ...(processHealth?.stopPlan ? [processHealth.stopPlan] : []),
  ].filter(Boolean);
  const timeline = createTimeline({
    inventory,
    surfaceMap,
    wildHoloScript,
    lanes,
    processHealth,
    osUiCapture,
    programRegistry,
    readinessEvidence,
    shellObjects,
    brittneyAvatar,
    brittneyTurn,
    hardwareAction,
    hardwareApproval,
    workflow,
    workflowApproval,
    workflowIntentGate,
    shardWorkflow,
    shardImportApproval,
    shardImport,
    runReceipts,
    pilotReceipts,
  });
  const trust = trustCounts(inventory?.capabilities || []);
  const processRisk = processHealth?.summary?.riskState || 'unknown';
  const readinessRisk = riskFromEvidenceStatus(readinessEvidence?.summary?.status || 'unknown');
  const shardRisk = shardWorkflow?.summary?.status === 'blocked' ? 'warn' : shardWorkflow?.summary?.status === 'staged' ? 'pass' : 'unknown';
  const overallRisk = [processRisk, stopPlans.length ? 'warn' : 'pass', readinessRisk, shardRisk]
    .sort((left, right) => riskRank(right) - riskRank(left))[0];

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sourceAnchors: {
      source: 'apps/holoshell/source/holoshell-home.hsplus',
      hardwareControl: 'apps/holoshell/source/holoshell-hardware-control.hsplus',
      programRegistry: 'scripts/holoshell-program-registry.mjs',
      readinessEvidence: 'scripts/holoshell-readiness-evidence.mjs',
      shellObjects: 'scripts/holoshell-shell-objects.mjs',
      wildHoloScriptIntake: 'scripts/holoshell-wild-holoscript-intake.mjs',
      brainIntentGate: 'scripts/holoshell-brain-intent-gate.mjs',
      assetShardWorkflow: 'scripts/holoshell-asset-shard-workflow.mjs',
      assetShardImportApproval: 'scripts/holoshell-shard-import-approval.mjs',
      prototype: 'apps/holoshell/prototype/local-capability-room.html',
      roadmap: 'apps/holoshell/docs/PHASE_1_ROADMAP.md',
    },
    summary: {
      overallRisk,
      capabilityCount: inventory?.summary?.capabilityCount || inventory?.capabilities?.length || 0,
      verifiedCapabilityCount: trust.verified || 0,
      partialCapabilityCount: trust.partial || 0,
      unknownCapabilityCount: trust.unknown || 0,
      legacyProgramCount: inventory?.summary?.legacyProgramCount || 0,
      holoscriptRoomCount: surfaceMap?.summary?.holoshellRoomCount || surfaceMap?.holoshellRooms?.length || 0,
      mcpToolCount: surfaceMap?.summary?.mcpToolCount || 0,
      cliCommandCount: surfaceMap?.summary?.cliCommandCount || 0,
      wildHoloScriptStatus: wildHoloScript?.summary?.status || 'unknown',
      wildHoloScriptFileCount: wildHoloScript?.summary?.fileCount || 0,
      wildHoloScriptHoloCount: wildHoloScript?.summary?.holoCount || 0,
      wildHoloScriptHsCount: wildHoloScript?.summary?.hsCount || 0,
      wildHoloScriptHsplusCount: wildHoloScript?.summary?.hsplusCount || 0,
      wildHoloScriptFrontierSyntaxCount: wildHoloScript?.summary?.frontierSyntaxCount || 0,
      wildHoloScriptAdapterNeededCount: wildHoloScript?.summary?.adapterNeededCount || 0,
      wildHoloScriptCanonicalCandidateCount: wildHoloScript?.summary?.canonicalCandidateCount || 0,
      wildHoloScriptFlagshipCount: wildHoloScript?.summary?.flagshipCount || 0,
      wildHoloScriptTopPattern: wildHoloScript?.summary?.topPattern || '',
      wildHoloScriptNextMove: wildHoloScript?.summary?.nextMove || '',
      activeLaneCount: lanes?.summary?.activeLaneCount || 0,
      laneCount: lanes?.summary?.laneCount || lanes?.lanes?.length || 0,
      processRisk,
      processCount: processHealth?.summary?.processCount || 0,
      staleRunCount: processHealth?.summary?.staleRunCount || 0,
      highMemoryCount: processHealth?.summary?.highMemoryCount || 0,
      capturedWindowCount: osUiCapture?.summary?.windowCount || 0,
      capturedControlCount: osUiCapture?.summary?.controlCount || 0,
      capturedGeometryNodeCount: osUiCapture?.summary?.geometryNodeCount || 0,
      osUiActionBridgeStatus: osUiCapture?.summary?.actionBridgeStatus || 'unknown',
      programRegistryStatus: programRegistry?.summary?.status || 'unknown',
      installedProgramCount: programRegistry?.summary?.programCount || 0,
      launchableProgramCount: programRegistry?.summary?.launchableProgramCount || 0,
      startMenuProgramCount: programRegistry?.summary?.startMenuProgramCount || 0,
      appPathProgramCount: programRegistry?.summary?.appPathProgramCount || 0,
      programRegistryRunningWindowCount: programRegistry?.summary?.runningWindowCount || 0,
      readinessEvidenceStatus: readinessEvidence?.summary?.status || 'unknown',
      readinessScenario: readinessEvidence?.summary?.scenario || '',
      readinessTokenCount: readinessEvidence?.summary?.tokenCount || 0,
      readinessWarningCount: readinessEvidence?.summary?.warningCount || 0,
      readinessBuildStatus: readinessEvidence?.summary?.buildStatus || 'unknown',
      readinessValidationStatus: readinessEvidence?.summary?.validationStatus || 'unknown',
      readinessDeviceLabStatus: readinessEvidence?.summary?.deviceLabStatus || 'unknown',
      readinessWasmSimdStatus: readinessEvidence?.summary?.wasmSimdStatus || 'unknown',
      readinessWebgpuStatus: readinessEvidence?.summary?.webgpuStatus || 'unknown',
      readinessHeadsetStatus: readinessEvidence?.summary?.headsetStatus || 'unknown',
      readinessReplayStatus: readinessEvidence?.summary?.replayStatus || 'unknown',
      readinessGraphStatus: readinessEvidence?.summary?.graphStatus || 'unknown',
      readinessTaskCount: readinessEvidence?.summary?.taskCount || 0,
      readinessNextWorkflow: readinessEvidence?.summary?.nextWorkflow || '',
      shellObjectGraphStatus: shellObjects?.summary?.status || 'unknown',
      shellObjectCount: shellObjects?.summary?.shellObjectCount || 0,
      firstScreenObjectCount: shellObjects?.summary?.firstScreenObjectCount || 0,
      appShellObjectCount: shellObjects?.summary?.programObjectCount || 0,
      browserShellObjectCount: shellObjects?.summary?.browserSurfaceCount || 0,
      terminalShellObjectCount: shellObjects?.summary?.terminalSurfaceCount || 0,
      documentAppShellObjectCount: shellObjects?.summary?.documentAppCount || 0,
      agentShellObjectCount: shellObjects?.summary?.agentObjectCount || 0,
      workflowShellObjectCount: shellObjects?.summary?.workflowObjectCount || 0,
      approvalShellObjectCount: shellObjects?.summary?.approvalObjectCount || 0,
      receiptShellObjectCount: shellObjects?.summary?.receiptObjectCount || 0,
      capturedShellObjectCount: shellObjects?.summary?.capturedWindowObjectCount || 0,
      runningShellObjectCount: shellObjects?.summary?.runningObjectCount || 0,
      guardedShellObjectCount: shellObjects?.summary?.guardedExecuteCount || 0,
      firstProgramShellObject: shellObjects?.summary?.firstProgramObject || '',
      brittneyAvatarStatus: brittneyAvatar?.summary?.avatarStatus || 'unknown',
      brittneyRuntimeStatus: brittneyAvatar?.summary?.runtimeStatus || 'unknown',
      brittneyEmotion: brittneyAvatar?.summary?.emotion || 'attentive',
      brittneyVoiceState: brittneyAvatar?.summary?.voiceState || 'ready',
      brittneyRuntimeRoute: brittneyAvatar?.summary?.ollamaHostKind || 'unknown',
      brittneyLastTurnStatus: brittneyTurn?.summary?.status || 'unknown',
      brittneyLastTurnRuntimeStatus: brittneyTurn?.summary?.runtimeStatus || 'unknown',
      brittneyRuntimeEventCount: brittneyTurn?.summary?.eventCount || 0,
      brittneyActionProposalCount: brittneyTurn?.summary?.actionProposalCount || 0,
      brittneyFirstProposalObject: brittneyTurn?.summary?.firstProposalObject || '',
      brittneyFinalAvatarStage: brittneyTurn?.summary?.finalAvatarStage || '',
      hardwareControlStatus: hardwareAction?.schemaVersion === 'hololand.holoshell.hardware-action.v0.1.0' ? 'available' : 'unknown',
      hardwareActionStatus: hardwareAction?.summary?.status || 'unknown',
      hardwareActionKind: hardwareAction?.summary?.actionKind || '',
      hardwareActionPermissionEnvelope: hardwareAction?.summary?.permissionEnvelope || 'unknown',
      hardwareActionApprovalRequired: Boolean(hardwareAction?.summary?.approvalRequired),
      hardwareActionApproved: Boolean(hardwareAction?.summary?.approved),
      hardwareActionExecutionPerformed: Boolean(hardwareAction?.summary?.executionPerformed),
      hardwareMutatingActionExecuted: Boolean(hardwareAction?.summary?.mutatingActionExecuted),
      hardwareActionReceiptCount: actionReceipts.length,
      hardwareTargetWindowTitle: hardwareAction?.summary?.targetWindowTitle || '',
      hardwareTargetProcessName: hardwareAction?.summary?.targetProcessName || '',
      hardwareApprovalStatus: hardwareApproval?.summary?.status || 'unknown',
      hardwareApprovalActionKind: hardwareApproval?.summary?.actionKind || '',
      hardwareApprovalTarget: hardwareApproval?.summary?.target || '',
      hardwareApprovalExpiresAt: hardwareApproval?.summary?.expiresAt || '',
      hardwareApprovalExecutionAllowed: Boolean(hardwareApproval?.summary?.executionAllowed),
      hardwareApprovalBundleCount: approvalBundles.length,
      pendingHardwareApprovalCount: hardwareApproval?.summary?.executionAllowed ? 1 : 0,
      activeWorkflowStatus: workflow?.summary?.status || 'unknown',
      activeWorkflowTitle: workflow?.title || '',
      activeWorkflowStepCount: workflow?.summary?.stepCount || 0,
      activeWorkflowPendingApprovalCount: workflow?.summary?.pendingApprovalCount || 0,
      activeWorkflowModel: workflow?.summary?.model || '',
      activeWorkflowModelRoute: workflow?.summary?.modelRoute || '',
      activeWorkflowMusicTarget: workflow?.summary?.musicTarget || '',
      activeWorkflowMutationExecuted: Boolean(workflow?.summary?.mutationExecuted),
      activeWorkflowApprovalStatus: workflowApproval?.summary?.status || 'unknown',
      activeWorkflowApprovalId: workflowApproval?.approvalId || '',
      activeWorkflowApprovalExpiresAt: workflowApproval?.summary?.expiresAt || '',
      activeWorkflowApprovalExecutionAllowed: Boolean(workflowApproval?.summary?.executionAllowed),
      activeWorkflowApprovalBundleCount: workflowApprovalBundles.length,
      activeWorkflowApprovalPendingCount: workflowApproval?.summary?.pendingApprovalCount || 0,
      activeWorkflowIntentGateStatus: workflowIntentGate?.summary?.status || 'unknown',
      activeWorkflowIntentGateCaseId: workflowIntentGate?.summary?.caseId || '',
      activeWorkflowIntentGateExecutionAllowed: Boolean(workflowIntentGate?.summary?.executionAllowed),
      activeWorkflowIntentGateRuntimeBlocking: Boolean(workflowIntentGate?.summary?.runtimeBlocking),
      activeWorkflowIntentGateFailedCheckCount: workflowIntentGate?.summary?.failedCheckCount || 0,
      activeWorkflowIntentGateReceiptStatus: workflowIntentGate?.summary?.receiptStatus || 'unknown',
      activeShardWorkflowStatus: shardWorkflow?.summary?.status || 'unknown',
      activeShardWorkflowId: shardWorkflow?.workflowId || '',
      activeShardId: shardWorkflow?.shardPlan?.shardId || '',
      activeShardAssetCount: shardWorkflow?.summary?.assetCount || 0,
      activeShardModelCount: shardWorkflow?.summary?.modelCount || 0,
      activeShardImageCount: shardWorkflow?.summary?.imageCount || 0,
      activeShardAudioCount: shardWorkflow?.summary?.audioCount || 0,
      activeShardSourceCount: shardWorkflow?.summary?.sourceCount || 0,
      activeShardUnknownCount: shardWorkflow?.summary?.unknownCount || 0,
      activeShardBlockedAssetCount: shardWorkflow?.summary?.blockedAssetCount || 0,
      activeShardPreviewObjectCount: shardWorkflow?.summary?.previewObjectCount || 0,
      activeShardApprovalRequired: Boolean(shardWorkflow?.summary?.approvalRequired),
      activeShardMutationExecuted: Boolean(shardWorkflow?.summary?.mutationExecuted),
      activeShardPreviewSourcePath: shardWorkflow?.output?.previewSourcePath || '',
      activeShardPrivateReceiptPath: shardWorkflow?.output?.privateReceiptPath || '',
      activeShardNextWorkflow: shardWorkflow?.summary?.nextWorkflow || '',
      activeShardImportApprovalStatus: shardImportApproval?.summary?.status || 'unknown',
      activeShardImportApprovalId: shardImportApproval?.approvalId || '',
      activeShardImportApprovalExpiresAt: shardImportApproval?.summary?.expiresAt || '',
      activeShardImportExecutionAllowed: Boolean(shardImportApproval?.summary?.executionAllowed),
      activeShardImportApprovalPendingCount: shardImportApproval?.summary?.executionAllowed ? 1 : 0,
      activeShardImportApprovalBundleCount: shardImportApprovalBundles.length,
      activeShardImportCommandPreview: shardImportApproval?.execution?.commandPreview || '',
      activeShardImportStatus: shardImport?.summary?.status || 'unknown',
      activeShardImportId: shardImport?.importId || '',
      activeShardImportManifestPath: shardImport?.output?.manifestPath || '',
      activeShardImportSourcePath: shardImport?.output?.shardSourcePath || '',
      activeShardImportReceiptPath: shardImport?.output?.receiptPath || '',
      activeShardImportRuntimeMutationExecuted: Boolean(shardImport?.summary?.runtimeMutationExecuted),
      activeShardImportSourceAssetsMutated: Boolean(shardImport?.summary?.sourceAssetsMutated),
      stopPlanCount: stopPlans.length,
      activeRegisteredRunCount: processHealth?.summary?.activeRegisteredRunCount || 0,
      timelineCount: timeline.length,
      pilotReceiptCount: pilotReceipts.length,
    },
    feeds: {
      inventory,
      surfaceMap,
      wildHoloScript,
      lanes,
      processHealth,
      osUiCapture,
      programRegistry,
      readinessEvidence,
      shellObjects,
      brittneyAvatar,
      brittneyTurn,
      hardwareAction,
      hardwareApproval,
      workflow,
      workflowApproval,
      workflowIntentGate,
      shardWorkflow,
      shardImportApproval,
      shardImport,
      runRegistry,
    },
    stopPlans,
    runReceipts,
    actionReceipts,
    approvalBundles,
    workflowApprovalBundles,
    pilotReceipts,
    timeline,
  };
}

function writeJson(filePath, data) {
  const resolved = resolveRepoPath(filePath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return resolved;
}

function writeBrowserBootstrap(filePath, feed) {
  const resolved = resolveRepoPath(filePath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  const payload = JSON.stringify(feed, null, 2).replace(/<\/script/gi, '<\\/script');
  writeFileSync(resolved, `window.HOLOSHELL_LIVE_FEED = ${payload};\n`, 'utf8');
  return resolved;
}

function assertSelfTest(feed) {
  const failures = [];
  if (feed.schemaVersion !== SCHEMA_VERSION) failures.push('schemaVersion mismatch');
  if (!feed.summary.capabilityCount) failures.push('expected capability feed');
  if (!feed.summary.holoscriptRoomCount) failures.push('expected HoloScript room feed');
  if (!feed.summary.laneCount) failures.push('expected agent lane feed');
  if (!feed.summary.processCount) failures.push('expected process health feed');
  if (feed.summary.brittneyAvatarStatus === 'unknown') failures.push('expected Brittney avatar feed');
  if (feed.summary.brittneyLastTurnStatus === 'unknown') failures.push('expected Brittney turn feed');
  if (feed.summary.hardwareActionStatus === 'unknown') failures.push('expected hardware action feed');
  if (feed.summary.programRegistryStatus === 'unknown') failures.push('expected program registry feed');
  if (feed.summary.hardwareApprovalStatus === 'unknown') failures.push('expected hardware approval feed');
  if (!Array.isArray(feed.timeline) || feed.timeline.length < 3) failures.push('expected linked timeline');
  if (!Array.isArray(feed.stopPlans)) failures.push('expected stop plan array');
  if (failures.length) {
    throw new Error(`Self-test failed:\n- ${failures.join('\n- ')}`);
  }
}

try {
  const args = parseArgs(process.argv.slice(2));
  const feed = createFeed(args);
  const output = writeJson(args.output, feed);
  const jsOutput = writeBrowserBootstrap(args.jsOutput, feed);
  if (args.selfTest) assertSelfTest(feed);

  if (args.json) {
    console.log(JSON.stringify(feed, null, 2));
  } else {
    console.log(`HoloShell live feed: ${output}`);
    console.log(`HoloShell browser bootstrap: ${jsOutput}`);
    console.log(`Risk: ${feed.summary.overallRisk}`);
    console.log(`Capabilities: ${feed.summary.capabilityCount}`);
    console.log(`Timeline: ${feed.summary.timelineCount}`);
    console.log(`Launchable programs: ${feed.summary.launchableProgramCount}`);
    console.log(`Shell objects: ${feed.summary.shellObjectCount}`);
    console.log(`Hardware action: ${feed.summary.hardwareActionStatus}`);
    console.log(`Hardware approval: ${feed.summary.hardwareApprovalStatus}`);
    console.log(`Workflow: ${feed.summary.activeWorkflowStatus}`);
    console.log(`Workflow approval: ${feed.summary.activeWorkflowApprovalStatus}`);
    console.log(`Brain intent gate: ${feed.summary.activeWorkflowIntentGateStatus}`);
    console.log(`Stop plans: ${feed.summary.stopPlanCount}`);
    console.log(`Pilot receipts: ${feed.summary.pilotReceiptCount}`);
  }
} catch (error) {
  console.error(`holoshell-live-feed failed: ${error.message}`);
  process.exit(1);
}
