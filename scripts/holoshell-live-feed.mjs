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

function networkContractStatus(networkReality) {
  return networkReality?.schemaContract?.validationStatus || 'missing';
}

function networkRealityTrustState(networkReality) {
  if (networkContractStatus(networkReality) === 'pass') return 'verified';
  if (networkReality?.underlay?.confidence === 'owner_declared' || networkReality?.underlay?.confidence === 'os_reported') return 'partial';
  return 'unknown';
}

function legacyRealityContractStatus(legacyAppReality) {
  return legacyAppReality?.schemaContract?.validationStatus || 'missing';
}

function legacyRealityTrustState(legacyAppReality) {
  if (legacyRealityContractStatus(legacyAppReality) === 'pass') return 'verified';
  if (legacyAppReality?.summary?.confidence === 'os_reported' || legacyAppReality?.summary?.confidence === 'fixture') return 'partial';
  return 'unknown';
}

function runReceiptDetail(receipt) {
  const base = `${receipt.command?.preview || 'local command'} as ${receipt.command?.runClass || 'run'} on ${receipt.lane?.laneId || 'unknown lane'}.`;
  const networkGate = receipt.networkGate;
  if (!networkGate) return base;

  const intent = networkGate.intent || receipt.command?.networkIntent || 'network';
  if (networkGate.bandwidthSpending && !networkGate.allowed) {
    return `${base} Network gate blocked ${intent} under ${networkGate.classification || 'unknown'}: ${networkGate.reason || 'owner network gesture required'}`;
  }

  if (networkGate.bandwidthSpending && networkGate.ownerGesture) {
    return `${base} Network gate allowed ${intent} under ${networkGate.classification || 'unknown'} with owner network gesture.`;
  }

  if (networkGate.bandwidthSpending) {
    return `${base} Network gate allowed ${intent} under ${networkGate.classification || 'unknown'} with receipt.`;
  }

  return `${base} Network intent ${intent}; protected bandwidth not spent.`;
}

function runReceiptTrustState(receipt) {
  if (receipt.status === 'completed') return 'verified';
  if (receipt.status === 'dry_run' && receipt.networkGate?.allowed !== false) return 'verified';
  if (receipt.status === 'blocked') return 'partial';
  return 'unknown';
}

function createTimeline({ inventory, surfaceMap, goldCodebaseBridge, wildHoloScript, formatInventory, founderBootPreview, userShellProjection, developmentalEnvironment, lanes, processHealth, networkReality, legacyAppReality, mcpCustodyContract, mcpUpstreamHandoff, osUiCapture, programRegistry, readinessEvidence, shellObjects, brittneyAvatar, brittneyTurn, brittneyContext, operatorBrief, operatingTurn, founderCommand, agentDispatch, grokBuild, hardwareAction, hardwareApproval, trustLedger, workflow, workflowApproval, workflowIntentGate, shardWorkflow, shardImportApproval, shardImport, runReceipts, pilotReceipts }) {
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

  if (goldCodebaseBridge?.summary) {
    timeline.push({
      id: goldCodebaseBridge.bridgeId || 'holoscript-gold-codebase-bridge',
      kind: 'holoscript_gold_codebase_bridge',
      title: `GOLD plus codebase bridge ${goldCodebaseBridge.summary.status || 'unknown'}`,
      detail: `${goldCodebaseBridge.summary.goldEntryCount || 0} GOLD entries; ${goldCodebaseBridge.summary.codebaseToolCount || 0} HoloScript codebase tools; graph ${goldCodebaseBridge.summary.graphCacheProtocol || 'unknown'}.`,
      trustState: goldCodebaseBridge.summary.status === 'ready' ? 'verified' : 'partial',
      generatedAt: goldCodebaseBridge.generatedAt || now,
      receiptType: goldCodebaseBridge.schemaVersion,
      source: goldCodebaseBridge.sourceAnchors?.adapter || 'scripts/holoshell-holoscript-gold-codebase-bridge.mjs',
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

  if (formatInventory?.summary) {
    timeline.push({
      id: formatInventory.inventoryId || 'holoshell-format-inventory',
      kind: 'format_inventory',
      title: `Format inventory ${formatInventory.summary.status || 'unknown'}`,
      detail: `${formatInventory.summary.totalFileCount || 0} .holo/.hs/.hsplus files; ${formatInventory.summary.totalFeatureFamilies || 0} feature families across canonical HoloScript and wild uAA2.`,
      trustState: formatInventory.summary.status === 'scanned' ? 'verified' : 'partial',
      generatedAt: formatInventory.generatedAt || now,
      receiptType: formatInventory.schemaVersion,
      source: formatInventory.source?.script || 'scripts/holoshell-format-inventory.mjs',
    });
  }

  if (founderBootPreview?.summary) {
    timeline.push({
      id: founderBootPreview.bootId || 'holoshell-founder-boot-preview',
      kind: 'founder_boot_preview',
      title: `Founder boot preview ${founderBootPreview.summary.status || 'unknown'}`,
      detail: `${founderBootPreview.summary.worldObjectCount || 0} .holo world objects, ${founderBootPreview.summary.renderObjectCount || 0} .hs render objects, ${founderBootPreview.summary.userCapabilityPackCount || 0} user pack(s), ${founderBootPreview.summary.brittneyProposalCount || 0} Brittney proposal(s).`,
      trustState: founderBootPreview.summary.status === 'ready' ? 'verified' : 'partial',
      generatedAt: founderBootPreview.generatedAt || now,
      receiptType: founderBootPreview.schemaVersion,
      source: founderBootPreview.source?.script || 'scripts/holoshell-founder-boot-preview.mjs',
    });
  }

  if (userShellProjection?.summary) {
    timeline.push({
      id: userShellProjection.projectionId || 'holoshell-user-shell-projection',
      kind: 'user_shell_projection',
      title: `User shell projection ${userShellProjection.summary.status || 'unknown'}`,
      detail: `${userShellProjection.summary.userModeCount || 0} user mode(s), ${userShellProjection.summary.capabilityPackCount || 0} pack(s), ${userShellProjection.summary.brittneyTranslationCount || 0} Brittney translation(s), ${userShellProjection.summary.founderOnlyPowerCount || 0} founder-only power(s).`,
      trustState: userShellProjection.summary.status === 'ready' ? 'verified' : 'partial',
      generatedAt: userShellProjection.generatedAt || now,
      receiptType: userShellProjection.schemaVersion,
      source: userShellProjection.source?.script || 'scripts/holoshell-user-shell-projection.mjs',
    });
  }

  if (developmentalEnvironment?.summary) {
    timeline.push({
      id: developmentalEnvironment.receiptId || 'holoshell-developmental-environment',
      kind: 'developmental_environment',
      title: `Developmental environment ${developmentalEnvironment.summary.status || 'unknown'}`,
      detail: `${developmentalEnvironment.summary.spineLayerCount || 0} spine layers; mass ${developmentalEnvironment.thesis?.massFunctionRuling || 'unknown'}; mapping ${developmentalEnvironment.thesis?.mappingFunctionRuling || 'unknown'}; next ${developmentalEnvironment.summary.nextMove || 'unknown'}.`,
      trustState: developmentalEnvironment.summary.massFunctionSettled && developmentalEnvironment.summary.mappingFunctionSettled ? 'verified' : 'partial',
      generatedAt: developmentalEnvironment.generatedAt || now,
      receiptType: developmentalEnvironment.schemaVersion,
      source: developmentalEnvironment.sourceAnchors?.adapter || 'scripts/holoshell-developmental-environment.mjs',
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

  if (networkReality?.underlay) {
    const contractStatus = networkContractStatus(networkReality);
    timeline.push({
      id: 'network-reality',
      kind: 'network_reality',
      title: `Network reality is ${networkReality.underlay.classification || 'unknown'}`,
      detail: `${networkReality.underlay.osInterfaceKind || 'unknown'} underlay, OS cost ${networkReality.underlay.osCost || 'Unknown'}, VPN ${networkReality.underlay.vpnState || 'unknown'}, ${networkReality.lanes?.networkConsumerCount || 0} network consumer(s); policy ${networkReality.policy?.heavyWorkPolicy || 'unknown'}; HoloScript contract ${contractStatus}.`,
      trustState: networkRealityTrustState(networkReality),
      generatedAt: networkReality.generatedAt || now,
      receiptType: networkReality.schemaVersion,
      source: networkReality.sourceAnchors?.adapter || 'scripts/holoshell-network-reality.mjs',
    });
  }

  if (legacyAppReality?.summary) {
    const contractStatus = legacyRealityContractStatus(legacyAppReality);
    timeline.push({
      id: 'legacy-app-reality',
      kind: 'legacy_app_reality',
      title: `Legacy app reality has ${legacyAppReality.summary.agentInstanceCount || 0} agent instance(s)`,
      detail: `${legacyAppReality.summary.processCount || 0} process(es), ${legacyAppReality.summary.visibleWindowCount || 0} visible window(s), ${legacyAppReality.summary.shellInstanceCount || 0} shell instance(s), ${legacyAppReality.summary.networkConsumerCount || 0} network consumer(s), ${legacyAppReality.summary.colorLaneCount || 0} color lane(s); HoloScript contract ${contractStatus}.`,
      trustState: legacyRealityTrustState(legacyAppReality),
      generatedAt: legacyAppReality.generatedAt || now,
      receiptType: legacyAppReality.schemaVersion,
      source: legacyAppReality.sourceAnchors?.adapter || 'scripts/holoshell-legacy-app-reality.mjs',
    });
  }

  if (mcpCustodyContract?.summary) {
    const summary = mcpCustodyContract.summary;
    timeline.push({
      id: 'mcp-custody-contract',
      kind: 'mcp_custody_contract',
      title: summary.nativeMcpCustodySplit
        ? 'MCP custody split native'
        : `MCP custody split ${summary.compatibilityMode || 'unknown'}`,
      detail: `${summary.cleanupCandidateCount || 0} cleanup candidate(s), ${summary.ownerHandoffPlanCount || 0} owner handoff(s), ${summary.checkFailCount || 0} failing check(s).`,
      trustState: summary.nativeMcpCustodySplit ? 'verified' : 'partial',
      generatedAt: mcpCustodyContract.generatedAt || now,
      receiptType: mcpCustodyContract.schemaVersion,
      source: mcpCustodyContract.sourceAnchors?.adapter || 'scripts/holoshell-mcp-custody-contract.mjs',
    });
  }

  if (mcpUpstreamHandoff?.summary) {
    const summary = mcpUpstreamHandoff.summary;
    timeline.push({
      id: mcpUpstreamHandoff.handoffId || 'mcp-custody-upstream-handoff',
      kind: 'mcp_custody_upstream_handoff',
      title: `MCP custody handoff ${summary.status || 'unknown'}`,
      detail: `${summary.targetTool || 'holoshell_run_registry_snapshot'}; ${summary.taskCount || 0} task(s), ${summary.acceptanceGateCount || 0} gate(s), current mode ${summary.currentCompatibilityMode || 'unknown'}.`,
      trustState: summary.status === 'native_ready_no_handoff_needed' ? 'verified' : 'partial',
      generatedAt: mcpUpstreamHandoff.generatedAt || now,
      receiptType: mcpUpstreamHandoff.schemaVersion,
      source: mcpUpstreamHandoff.sourceAnchors?.adapter || 'scripts/holoshell-mcp-upstream-handoff.mjs',
    });
  }

  if (osUiCapture?.summary) {
    const targetLabel = osUiCapture.summary.targetApp || osUiCapture.summary.selectedAppName || 'legacy surface';
    timeline.push({
      id: 'os-ui-capture',
      kind: 'os_ui_capture',
      title: 'Legacy UI captured as HoloShell geometry',
      detail: `${targetLabel} target ${osUiCapture.summary.targetResolution || (osUiCapture.summary.targetMatched ? 'rich_capture' : 'fallback')}; ${osUiCapture.summary.windowCount || 0} windows, ${osUiCapture.summary.controlCount || 0} controls, ${osUiCapture.summary.geometryNodeCount || 0} geometric shards; action bridge ${osUiCapture.summary.actionBridgeStatus || 'unknown'}.`,
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

  if (brittneyContext?.summary) {
    timeline.push({
      id: `brittney-context-${brittneyContext.summary.contextHash || 'latest'}`,
      kind: 'brittney_context',
      title: `Brittney context ${brittneyContext.summary.status || 'unknown'}`,
      detail: `${brittneyContext.summary.visibleShellObjectCount || 0} visible shell object(s), ${brittneyContext.summary.peerWindowCount || 0} peer window(s), ${brittneyContext.summary.shellWindowCount || 0} shell window(s), process risk ${brittneyContext.summary.processRisk || 'unknown'}.`,
      trustState: brittneyContext.summary.status === 'ready' ? 'verified' : 'partial',
      generatedAt: brittneyContext.generatedAt || now,
      receiptType: brittneyContext.schemaVersion,
      source: 'scripts/holoshell-brittney-context.mjs',
    });
  }

  if (operatorBrief?.status) {
    timeline.push({
      id: operatorBrief.receipt?.briefHash ? `operator-brief-${operatorBrief.receipt.briefHash}` : 'operator-brief',
      kind: 'operator_brief',
      title: `Operator brief ${operatorBrief.status}`,
      detail: `${operatorBrief.peers?.windowInstanceCount || 0} AI peer window(s), ${operatorBrief.peers?.shellWindowInstanceCount || 0} shell window(s), ${operatorBrief.legacy?.captureCandidateCount || 0} legacy capture candidate(s).`,
      trustState: operatorBrief.status === 'legacy_absorption_ready' ? 'verified' : 'partial',
      generatedAt: operatorBrief.generatedAt || now,
      receiptType: operatorBrief.schemaVersion,
      source: 'scripts/holoshell-operator-brief.mjs',
    });
  }

  if (operatingTurn?.summary) {
    timeline.push({
      id: operatingTurn.receipt?.operatingTurnHash ? `operating-turn-${operatingTurn.receipt.operatingTurnHash}` : 'operating-turn',
      kind: 'operating_turn',
      title: `Operating turn ${operatingTurn.summary.status || 'unknown'}`,
      detail: `${operatingTurn.summary.passedStepCount || 0}/${operatingTurn.summary.stepCount || 0} step(s) passed; Brittney context ${operatingTurn.summary.brittneyContextStatus || 'unknown'}.`,
      trustState: operatingTurn.summary.status === 'pass' ? 'verified' : 'partial',
      generatedAt: operatingTurn.generatedAt || now,
      receiptType: operatingTurn.schemaVersion,
      source: 'scripts/holoshell-operating-turn.mjs',
    });
  }

  if (founderCommand?.summary) {
    timeline.push({
      id: founderCommand.commandId || 'holoshell-founder-command',
      kind: 'founder_command',
      title: `Founder command ${founderCommand.summary.status || 'unknown'}`,
      detail: `${founderCommand.summary.pipelineStepCount || 0} pipeline step(s), ${founderCommand.summary.workflowStepCount || 0} workflow step(s), ${founderCommand.summary.approvalCount || 0} approval(s); execution ${founderCommand.summary.executionAllowed ? 'allowed after gesture' : 'blocked or staged'}.`,
      trustState: founderCommand.summary.executionAllowed ? 'partial' : founderCommand.summary.status === 'completed' ? 'verified' : 'unknown',
      generatedAt: founderCommand.generatedAt || now,
      receiptType: founderCommand.schemaVersion,
      source: founderCommand.sourceAnchors?.adapter || 'scripts/holoshell-founder-command.mjs',
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

  if (agentDispatch?.summary) {
    timeline.push({
      id: agentDispatch.dispatchId || 'holoshell-agent-dispatch',
      kind: 'agent_dispatch',
      title: `Agent dispatch ${agentDispatch.summary.status || 'unknown'}`,
      detail: `${agentDispatch.summary.capabilityLabel || 'No capability'}; route ${agentDispatch.summary.route || 'none'}; confidence ${agentDispatch.summary.confidence || 0}; approval ${agentDispatch.summary.approvalRequired ? 'required downstream' : 'not required'}.`,
      trustState: agentDispatch.summary.status === 'ready_to_stage' ? 'partial' : 'unknown',
      generatedAt: agentDispatch.generatedAt || now,
      receiptType: agentDispatch.schemaVersion,
      source: agentDispatch.sourceAnchors?.adapter || 'scripts/holoshell-agent-dispatch.mjs',
    });
  }

  if (grokBuild?.summary) {
    timeline.push({
      id: grokBuild.setupId || 'holoshell-grok-build-setup',
      kind: 'grok_build_setup',
      title: `Grok Build setup ${grokBuild.summary.status || 'unknown'}`,
      detail: `CLI ${grokBuild.summary.cliVersion || 'unknown'}; auth ${grokBuild.summary.authStatus || 'unknown'}; model ${grokBuild.summary.modelStatus || 'unknown'}; project ${grokBuild.summary.projectTrustStatus || 'unknown'}; Heavy ${grokBuild.summary.heavyAccessStatus || grokBuild.heavyUpgrade?.status || 'unknown'}.`,
      trustState: grokBuild.summary.status === 'ready' ? 'verified' : grokBuild.summary.status === 'blocked' ? 'unknown' : 'partial',
      generatedAt: grokBuild.generatedAt || now,
      receiptType: grokBuild.schemaVersion,
      source: grokBuild.sourceAnchors?.adapter || 'scripts/holoshell-grok-build-workflow.mjs',
    });
  }

  if (hardwareApproval?.summary) {
    timeline.push({
      id: hardwareApproval.approvalId || 'hardware-approval',
      kind: 'hardware_approval',
      title: `Hardware approval ${hardwareApproval.summary.status || 'unknown'}`,
      detail: `${hardwareApproval.summary.actionKind || 'unknown action'} for ${hardwareApproval.summary.target || 'local computer'}; execution ${hardwareApproval.summary.executionAllowed ? 'allowed after approval' : 'blocked'}; trust ${hardwareApproval.summary.trustLevel || 'unknown'}.`,
      trustState: hardwareApproval.summary.executionAllowed ? 'partial' : hardwareApproval.summary.status === 'not_required' ? 'verified' : 'unknown',
      generatedAt: hardwareApproval.generatedAt || now,
      receiptType: 'hololand.holoshell.hardware-approval.v0.1.0',
      source: 'scripts/holoshell-approval-bundle.mjs',
    });
  }

  if (trustLedger?.summary) {
    timeline.push({
      id: trustLedger.latestAction?.fingerprint || 'holoshell-trust-ledger',
      kind: 'trusted_autonomy',
      title: `Trust ladder ${trustLedger.summary.latestTrustLevel || 'unknown'}`,
      detail: `${trustLedger.summary.latestActionKind || 'no action'} for ${trustLedger.summary.latestTarget || 'local computer'}; trusted records ${trustLedger.summary.trustedRecordCount || 0}/${trustLedger.summary.recordCount || 0}; ${trustLedger.summary.successesUntilTrusted || 0} success(es) until trusted.`,
      trustState: trustLedger.summary.trustedAutonomyEligible ? 'verified' : trustLedger.summary.status === 'ready' ? 'partial' : 'unknown',
      generatedAt: trustLedger.generatedAt || now,
      receiptType: trustLedger.schemaVersion,
      source: trustLedger.sourceAnchors?.adapter || 'scripts/holoshell-trust-ledger.mjs',
    });
  }

  if (workflow?.summary) {
    const workflowKind = workflow.summary.workflowKind || workflow.profile || 'workflow';
    const workflowDetail = workflowKind === 'claude_chat'
      ? `${workflow.summary.stepCount || 0} steps, ${workflow.summary.pendingApprovalCount || 0} pending approval(s), target ${workflow.summary.targetSurface || 'Claude'}, prompt ${workflow.summary.promptPresent ? 'staged' : 'empty'}.`
      : workflowKind === 'ollama_cloud_agent'
        ? `${workflow.summary.stepCount || 0} steps, ${workflow.summary.pendingApprovalCount || 0} pending approval(s), agent ${workflow.summary.agentLabel || workflow.summary.agentSlug || 'unknown'}, command ${workflow.summary.command || 'ollama launch'}.`
        : workflowKind === 'grok_build'
          ? `${workflow.summary.stepCount || 0} steps, ${workflow.summary.pendingApprovalCount || 0} pending approval(s), mode ${workflow.summary.mode || 'interactive'}, model ${workflow.summary.model || 'grok-build'}, project ${workflow.summary.projectTrustStatus || 'unknown'}.`
      : `${workflow.summary.stepCount || 0} steps, ${workflow.summary.pendingApprovalCount || 0} pending approval(s), model ${workflow.summary.modelRoute || 'unknown'}/${workflow.summary.model || 'unknown'}.`;
    timeline.push({
      id: workflow.workflowId || 'holoshell-workflow',
      kind: 'workflow',
      title: `${workflow.title || 'HoloShell workflow'} ${workflow.summary.status || 'unknown'}`,
      detail: workflowDetail,
      trustState: workflow.summary.mutationExecuted ? 'partial' : workflow.summary.status === 'pending_user_approval' ? 'partial' : 'verified',
      generatedAt: workflow.generatedAt || workflow.createdAt || now,
      receiptType: 'hololand.holoshell.workflow.v0.1.0',
      source: workflow.sourceAnchors?.adapter || workflow.source?.script || 'scripts/holoshell-room-marathon-workflow.mjs',
    });
  }

  if (workflowApproval?.summary) {
    timeline.push({
      id: workflowApproval.approvalId || 'holoshell-workflow-approval',
      kind: 'workflow_approval',
      title: `Workflow approval ${workflowApproval.summary.status || 'unknown'}`,
      detail: `${workflowApproval.summary.title || 'HoloShell workflow'}; ${workflowApproval.summary.pendingApprovalCount || 0} guarded approval(s); execution ${workflowApproval.summary.executionAllowed ? 'allowed after gesture' : 'blocked'}.`,
      trustState: workflowApproval.summary.executionAllowed ? 'partial' : 'verified',
      generatedAt: workflowApproval.generatedAt || workflowApproval.createdAt || now,
      receiptType: 'hololand.holoshell.workflow-approval.v0.1.0',
      source: workflowApproval.sourceAnchors?.adapter || workflowApproval.source?.script || 'scripts/holoshell-workflow-approval-bundle.mjs',
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
      detail: runReceiptDetail(receipt),
      trustState: runReceiptTrustState(receipt),
      generatedAt: receipt.timing?.endedAt || receipt.timing?.plannedAt || now,
      receiptType: receipt.schemaVersion,
      source: receipt.output?.receiptPath || '.tmp/holoshell/run-receipts',
      networkGate: receipt.networkGate
        ? {
            allowed: Boolean(receipt.networkGate.allowed),
            intent: receipt.networkGate.intent || receipt.command?.networkIntent || 'unknown',
            bandwidthSpending: Boolean(receipt.networkGate.bandwidthSpending),
            classification: receipt.networkGate.classification || null,
            ownerGesture: Boolean(receipt.networkGate.ownerGesture),
          }
        : null,
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
  const goldCodebaseBridge = readJson(path.join(tmpDir, 'holoscript-gold-codebase-bridge.json'), {});
  const wildHoloScript = readJson(path.join(tmpDir, 'wild-holoscript-intake.json'), {});
  const formatInventory = readJson(path.join(tmpDir, 'format-inventory.json'), {});
  const founderBootPreview = readJson(path.join(tmpDir, 'founder-boot-preview.json'), {});
  const userShellProjection = readJson(path.join(tmpDir, 'user-shell-projection.json'), {});
  const developmentalEnvironment = readJson(path.join(tmpDir, 'developmental-environment.json'), {});
  const lanes = readJson(path.join(tmpDir, 'agent-lanes.json'), {});
  const processHealth = readJson(path.join(tmpDir, 'process-health.json'), {});
  const networkReality = readJson(path.join(tmpDir, 'network-reality.json'), {});
  const legacyAppReality = readJson(path.join(tmpDir, 'legacy-app-reality.json'), {});
  const mcpCustodyContract = readJson(path.join(tmpDir, 'mcp-custody-contract.json'), {});
  const mcpUpstreamHandoff = readJson(path.join(tmpDir, 'mcp-custody-upstream-handoff.json'), {});
  const osUiCapture = readJson(path.join(tmpDir, 'os-ui-capture.json'), {});
  const programRegistry = readJson(path.join(tmpDir, 'program-registry.json'), {});
  const readinessEvidence = readJson(path.join(tmpDir, 'readiness-evidence.json'), {});
  const shellObjects = readJson(path.join(tmpDir, 'shell-objects.json'), {});
  const brittneyAvatar = readJson(path.join(tmpDir, 'brittney-avatar.json'), {});
  const brittneyTurn = readJson(path.join(tmpDir, 'brittney-turn-latest.json'), {});
  const brittneyContext = readJson(path.join(tmpDir, 'brittney-context.json'), {});
  const operatorBrief = readJson(path.join(tmpDir, 'operator-brief.json'), {});
  const operatingTurn = readJson(path.join(tmpDir, 'operating-turn.json'), {});
  const founderCommand = readJson(path.join(tmpDir, 'founder-command-latest.json'), {});
  const agentDispatch = readJson(path.join(tmpDir, 'agent-dispatch-latest.json'), {});
  const grokBuild = readJson(path.join(tmpDir, 'grok-build-setup.json'), {});
  const hardwareAction = readJson(path.join(tmpDir, 'action-latest.json'), {});
  const hardwareApproval = readJson(path.join(tmpDir, 'approval-latest.json'), {});
  const trustLedger = readJson(path.join(tmpDir, 'trust-ledger.json'), {});
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
    goldCodebaseBridge,
    wildHoloScript,
    formatInventory,
    founderBootPreview,
    userShellProjection,
    developmentalEnvironment,
    lanes,
    processHealth,
    networkReality,
    legacyAppReality,
    mcpCustodyContract,
    mcpUpstreamHandoff,
    osUiCapture,
    programRegistry,
    readinessEvidence,
    shellObjects,
    brittneyAvatar,
    brittneyTurn,
    brittneyContext,
    operatorBrief,
    operatingTurn,
    founderCommand,
    agentDispatch,
    grokBuild,
    hardwareAction,
    hardwareApproval,
    trustLedger,
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
  const networkRisk = networkReality?.health?.state || 'pass';
  const legacyRealityRisk = legacyRealityContractStatus(legacyAppReality) === 'fail'
    ? 'warn'
    : legacyRealityContractStatus(legacyAppReality) === 'missing'
      ? 'unknown'
      : 'pass';
  const runNetworkBlockedCount = runReceipts.filter((receipt) => receipt.networkGate && !receipt.networkGate.allowed).length;
  const runBandwidthSpendingCount = runReceipts.filter((receipt) => receipt.networkGate?.bandwidthSpending || receipt.command?.bandwidthSpending).length;
  const runOwnerNetworkGestureCount = runReceipts.filter((receipt) => receipt.networkGate?.ownerGesture).length;
  const mcpCustodyRisk = riskFromEvidenceStatus(mcpCustodyContract?.summary?.status || 'unknown');
  const mcpHandoffRisk = mcpUpstreamHandoff?.summary?.status === 'ready_for_upstream_agent'
    ? 'warn'
    : mcpUpstreamHandoff?.summary?.status === 'native_ready_no_handoff_needed'
      ? 'pass'
      : 'unknown';
  const readinessRisk = riskFromEvidenceStatus(readinessEvidence?.summary?.status || 'unknown');
  const shardRisk = shardWorkflow?.summary?.status === 'blocked' ? 'warn' : shardWorkflow?.summary?.status === 'staged' ? 'pass' : 'unknown';
  const overallRisk = [processRisk, networkRisk, legacyRealityRisk, stopPlans.length ? 'warn' : 'pass', mcpCustodyRisk, mcpHandoffRisk, readinessRisk, shardRisk]
    .sort((left, right) => riskRank(right) - riskRank(left))[0];

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sourceAnchors: {
      source: 'apps/holoshell/source/holoshell-home.hsplus',
      hardwareControl: 'apps/holoshell/source/holoshell-hardware-control.hsplus',
      networkReality: 'apps/holoshell/source/holoshell-network-reality.hsplus',
      networkRealityAdapter: 'scripts/holoshell-network-reality.mjs',
      legacyAppRealityAdapter: 'scripts/holoshell-legacy-app-reality.mjs',
      programRegistry: 'scripts/holoshell-program-registry.mjs',
      mcpCustodyContract: 'scripts/holoshell-mcp-custody-contract.mjs',
      mcpUpstreamHandoff: 'scripts/holoshell-mcp-upstream-handoff.mjs',
      readinessEvidence: 'scripts/holoshell-readiness-evidence.mjs',
      shellObjects: 'scripts/holoshell-shell-objects.mjs',
      brittneyContext: 'scripts/holoshell-brittney-context.mjs',
      operatorBrief: 'scripts/holoshell-operator-brief.mjs',
      operatingTurn: 'scripts/holoshell-operating-turn.mjs',
      wildHoloScriptIntake: 'scripts/holoshell-wild-holoscript-intake.mjs',
      goldCodebaseBridge: 'scripts/holoshell-holoscript-gold-codebase-bridge.mjs',
      formatInventory: 'scripts/holoshell-format-inventory.mjs',
      founderBootPreview: 'scripts/holoshell-founder-boot-preview.mjs',
      userShellProjection: 'scripts/holoshell-user-shell-projection.mjs',
      developmentalEnvironment: 'scripts/holoshell-developmental-environment.mjs',
      founderCommand: 'scripts/holoshell-founder-command.mjs',
      agentDispatch: 'scripts/holoshell-agent-dispatch.mjs',
      grokBuildWorkflow: 'scripts/holoshell-grok-build-workflow.mjs',
      trustedAutonomy: 'scripts/holoshell-trust-ledger.mjs',
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
      goldCodebaseBridgeStatus: goldCodebaseBridge?.summary?.status || 'unknown',
      goldDriveStatus: goldCodebaseBridge?.summary?.goldStatus || 'unknown',
      goldRootPresent: Boolean(goldCodebaseBridge?.summary?.goldRootPresent),
      goldEntryCount: goldCodebaseBridge?.summary?.goldEntryCount || 0,
      goldTierCount: goldCodebaseBridge?.summary?.goldTierCount || 0,
      goldHotEntryCount: goldCodebaseBridge?.summary?.goldHotEntryCount || 0,
      goldConflictPolicy: goldCodebaseBridge?.summary?.goldConflictPolicy || '',
      codebaseBridgeStatus: goldCodebaseBridge?.summary?.codebaseStatus || 'unknown',
      codebaseToolCount: goldCodebaseBridge?.summary?.codebaseToolCount || 0,
      codebaseCliCommandCount: goldCodebaseBridge?.summary?.codebaseCliCommandCount || 0,
      codebaseGraphCacheProtocol: goldCodebaseBridge?.summary?.graphCacheProtocol || 'unknown',
      codebaseForceAbsorbDefault: Boolean(goldCodebaseBridge?.summary?.forceAbsorbDefault),
      codebaseBridgeCapabilityCount: goldCodebaseBridge?.summary?.capabilityMapCount || 0,
      wildHoloScriptStatus: wildHoloScript?.summary?.status || 'unknown',
      wildHoloScriptFileCount: wildHoloScript?.summary?.fileCount || 0,
      wildHoloScriptHoloCount: wildHoloScript?.summary?.holoCount || 0,
      wildHoloScriptHsCount: wildHoloScript?.summary?.hsCount || 0,
      wildHoloScriptHsplusCount: wildHoloScript?.summary?.hsplusCount || 0,
      wildHoloScriptHoloFeatureCount: wildHoloScript?.summary?.holoFeatureCount || 0,
      wildHoloScriptHsFeatureCount: wildHoloScript?.summary?.hsFeatureCount || 0,
      wildHoloScriptHsplusFeatureCount: wildHoloScript?.summary?.hsplusFeatureCount || 0,
      wildHoloScriptHoloTopFeature: wildHoloScript?.summary?.holoTopFeature || '',
      wildHoloScriptHsTopFeature: wildHoloScript?.summary?.hsTopFeature || '',
      wildHoloScriptHsplusTopFeature: wildHoloScript?.summary?.hsplusTopFeature || '',
      wildHoloScriptFrontierSyntaxCount: wildHoloScript?.summary?.frontierSyntaxCount || 0,
      wildHoloScriptAdapterNeededCount: wildHoloScript?.summary?.adapterNeededCount || 0,
      wildHoloScriptCanonicalCandidateCount: wildHoloScript?.summary?.canonicalCandidateCount || 0,
      wildHoloScriptFlagshipCount: wildHoloScript?.summary?.flagshipCount || 0,
      wildHoloScriptTopPattern: wildHoloScript?.summary?.topPattern || '',
      wildHoloScriptNextMove: wildHoloScript?.summary?.nextMove || '',
      formatInventoryStatus: formatInventory?.summary?.status || 'unknown',
      formatInventoryTotalFileCount: formatInventory?.summary?.totalFileCount || 0,
      formatInventoryFeatureFamilyCount: formatInventory?.summary?.totalFeatureFamilies || 0,
      formatInventoryCardCount: formatInventory?.summary?.formatViewerCardCount || 0,
      founderBootStatus: founderBootPreview?.summary?.status || 'unknown',
      founderBootWorldObjectCount: founderBootPreview?.summary?.worldObjectCount || 0,
      founderBootRenderObjectCount: founderBootPreview?.summary?.renderObjectCount || 0,
      founderBootFormatCardCount: founderBootPreview?.summary?.formatViewerCardCount || 0,
      founderBootUserPackCount: founderBootPreview?.summary?.userCapabilityPackCount || 0,
      founderBootBrittneyProposalCount: founderBootPreview?.summary?.brittneyProposalCount || 0,
      userShellProjectionStatus: userShellProjection?.summary?.status || 'unknown',
      userShellModeCount: userShellProjection?.summary?.modeCount || 0,
      userShellUserModeCount: userShellProjection?.summary?.userModeCount || 0,
      userShellCapabilityPackCount: userShellProjection?.summary?.capabilityPackCount || 0,
      userShellGuardedCapabilityPackCount: userShellProjection?.summary?.guardedCapabilityPackCount || 0,
      userShellFormatLessonCount: userShellProjection?.summary?.formatLessonCount || 0,
      userShellFounderOnlyPowerCount: userShellProjection?.summary?.founderOnlyPowerCount || 0,
      userShellBrittneyTranslationCount: userShellProjection?.summary?.brittneyTranslationCount || 0,
      userShellVisibleBubbleCount: userShellProjection?.summary?.visibleBubbleCount || 0,
      developmentalEnvironmentStatus: developmentalEnvironment?.summary?.status || 'unknown',
      developmentalEnvironmentSpineLayerCount: developmentalEnvironment?.summary?.spineLayerCount || 0,
      developmentalEnvironmentBoardTaskCount: developmentalEnvironment?.summary?.boardTaskCount || 0,
      developmentalEnvironmentOpenEngineeringTaskCount: developmentalEnvironment?.summary?.openEngineeringTaskCount || 0,
      developmentalEnvironmentResearchPresent: Boolean(developmentalEnvironment?.summary?.researchPresent),
      developmentalEnvironmentMassFunctionSettled: Boolean(developmentalEnvironment?.summary?.massFunctionSettled),
      developmentalEnvironmentMappingFunctionSettled: Boolean(developmentalEnvironment?.summary?.mappingFunctionSettled),
      developmentalEnvironmentHonestyPrinciple: developmentalEnvironment?.summary?.honestyPrinciple || '',
      developmentalEnvironmentNextMove: developmentalEnvironment?.summary?.nextMove || '',
      activeLaneCount: lanes?.summary?.activeLaneCount || 0,
      laneCount: lanes?.summary?.laneCount || lanes?.lanes?.length || 0,
      processRisk,
      processCount: processHealth?.summary?.processCount || 0,
      staleRunCount: processHealth?.summary?.staleRunCount || 0,
      highMemoryCount: processHealth?.summary?.highMemoryCount || 0,
      networkRealityStatus: networkReality?.underlay?.classification || 'unknown',
      networkRealityConfidence: networkReality?.underlay?.confidence || 'unknown',
      networkRealityOwnerDeclaredKind: networkReality?.underlay?.ownerDeclaredKind || 'none',
      networkRealityInterfaceKind: networkReality?.underlay?.osInterfaceKind || 'unknown',
      networkRealityOsCost: networkReality?.underlay?.osCost || 'Unknown',
      networkRealityConnectivity: networkReality?.underlay?.connectivity || 'Unknown',
      networkRealityVpnState: networkReality?.underlay?.vpnState || 'unknown',
      networkRealityHealthState: networkReality?.health?.state || 'unknown',
      networkRealityContractStatus: networkContractStatus(networkReality),
      networkRealityBandwidthPosture: networkReality?.policy?.bandwidthPosture || 'unknown',
      networkRealityHeavyWorkPolicy: networkReality?.policy?.heavyWorkPolicy || 'unknown',
      networkRealityBrittneyStance: networkReality?.brittney?.stance || 'unknown',
      networkRealityProtectBandwidth: Boolean(networkReality?.brittney?.protectBandwidth),
      networkRealityConsumerCount: networkReality?.lanes?.networkConsumerCount || 0,
      networkRealityAgentOrShellConsumerCount: networkReality?.lanes?.agentOrShellNetworkConsumerCount || 0,
      networkRealityLegacyConsumerCount: networkReality?.lanes?.legacyNetworkConsumerCount || 0,
      networkRealityProcessCountIsNotPeerCount: Boolean(networkReality?.lanes?.processCountIsNotPeerCount),
      legacyAppRealityStatus: legacyAppReality?.summary?.confidence || 'unknown',
      legacyAppRealityContractStatus: legacyRealityContractStatus(legacyAppReality),
      legacyAppRealityProcessCount: legacyAppReality?.summary?.processCount || 0,
      legacyAppRealityVisibleWindowCount: legacyAppReality?.summary?.visibleWindowCount || 0,
      legacyAppRealityAgentInstanceCount: legacyAppReality?.summary?.agentInstanceCount || 0,
      legacyAppRealityShellInstanceCount: legacyAppReality?.summary?.shellInstanceCount || 0,
      legacyAppRealityLegacyAppCount: legacyAppReality?.summary?.legacyAppCount || 0,
      legacyAppRealityBrowserCount: legacyAppReality?.summary?.browserCount || 0,
      legacyAppRealityNetworkConsumerCount: legacyAppReality?.summary?.networkConsumerCount || 0,
      legacyAppRealityHeavyNetworkConsumerCount: legacyAppReality?.summary?.heavyNetworkConsumerCount || 0,
      legacyAppRealityColorLaneCount: legacyAppReality?.summary?.colorLaneCount || 0,
      legacyAppRealityProcessCountIsPeerCount: Boolean(legacyAppReality?.summary?.processCountIsPeerCount),
      runNetworkBlockedCount,
      runBandwidthSpendingCount,
      runOwnerNetworkGestureCount,
      mcpCustodyContractStatus: mcpCustodyContract?.summary?.status || 'unknown',
      mcpCustodyCompatibilityMode: mcpCustodyContract?.summary?.compatibilityMode || 'unknown',
      nativeMcpCustodySplit: Boolean(mcpCustodyContract?.summary?.nativeMcpCustodySplit),
      mcpCustodyCleanupCandidateCount: mcpCustodyContract?.summary?.cleanupCandidateCount || 0,
      mcpCustodyOwnerHandoffPlanCount: mcpCustodyContract?.summary?.ownerHandoffPlanCount || 0,
      mcpCustodyCheckFailCount: mcpCustodyContract?.summary?.checkFailCount || 0,
      mcpUpstreamHandoffStatus: mcpUpstreamHandoff?.summary?.status || 'unknown',
      mcpUpstreamHandoffTargetTool: mcpUpstreamHandoff?.summary?.targetTool || '',
      mcpUpstreamHandoffTaskCount: mcpUpstreamHandoff?.summary?.taskCount || 0,
      mcpUpstreamHandoffAcceptanceGateCount: mcpUpstreamHandoff?.summary?.acceptanceGateCount || 0,
      capturedWindowCount: osUiCapture?.summary?.windowCount || 0,
      capturedControlCount: osUiCapture?.summary?.controlCount || 0,
      capturedGeometryNodeCount: osUiCapture?.summary?.geometryNodeCount || 0,
      osUiCaptureStatus: osUiCapture?.summary?.status || 'unknown',
      osUiTargetApp: osUiCapture?.summary?.targetApp || '',
      osUiTargetMatched: Boolean(osUiCapture?.summary?.targetMatched),
      osUiTargetResolved: Boolean(osUiCapture?.summary?.targetResolved || osUiCapture?.summary?.targetMatched),
      osUiTargetResolution: osUiCapture?.summary?.targetResolution || '',
      osUiSelectedAppName: osUiCapture?.summary?.selectedAppName || '',
      osUiSelectedMutationPolicy: osUiCapture?.summary?.selectedMutationPolicy || '',
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
      brittneyContextStatus: brittneyContext?.summary?.status || 'unknown',
      brittneyContextVisibleShellObjectCount: brittneyContext?.summary?.visibleShellObjectCount || 0,
      brittneyContextSelectedShellObjectId: brittneyContext?.summary?.selectedShellObjectId || '',
      brittneyContextPeerWindowCount: brittneyContext?.summary?.peerWindowCount || 0,
      brittneyContextShellWindowCount: brittneyContext?.summary?.shellWindowCount || 0,
      brittneyContextOperatingSurfaceWindowCount: brittneyContext?.summary?.operatingSurfaceWindowCount || 0,
      brittneyContextPendingApprovalCount: brittneyContext?.summary?.pendingApprovalCount || 0,
      brittneyContextProcessRisk: brittneyContext?.summary?.processRisk || 'unknown',
      brittneyContextRawCommandsIncluded: Boolean(brittneyContext?.summary?.rawCommandsIncluded),
      brittneyContextRawWindowTitlesIncluded: Boolean(brittneyContext?.summary?.rawWindowTitlesIncluded),
      brittneyContextLocalUiLabelsIncluded: Boolean(brittneyContext?.summary?.localUiLabelsIncluded),
      operatorBriefStatus: operatorBrief?.status || 'unknown',
      operatorBriefPeerWindowCount: operatorBrief?.peers?.windowInstanceCount || 0,
      operatorBriefShellWindowCount: operatorBrief?.peers?.shellWindowInstanceCount || 0,
      operatorBriefOperatingSurfaceWindowCount: operatorBrief?.peers?.operatingSurfaceWindowCount || 0,
      operatorBriefLegacyCaptureCandidateCount: operatorBrief?.legacy?.captureCandidateCount || 0,
      operatorBriefFirstMove: operatorBrief?.brittneyPromptCard?.firstMove || '',
      operatingTurnStatus: operatingTurn?.summary?.status || 'unknown',
      operatingTurnStepCount: operatingTurn?.summary?.stepCount || 0,
      operatingTurnPassedStepCount: operatingTurn?.summary?.passedStepCount || 0,
      founderCommandStatus: founderCommand?.summary?.status || 'unknown',
      founderCommandId: founderCommand?.commandId || '',
      founderCommandConfidence: founderCommand?.summary?.confidence || 0,
      founderCommandPipelineStepCount: founderCommand?.summary?.pipelineStepCount || 0,
      founderCommandWorkflowStepCount: founderCommand?.summary?.workflowStepCount || 0,
      founderCommandApprovalCount: founderCommand?.summary?.approvalCount || 0,
      founderCommandExecutionAllowed: Boolean(founderCommand?.summary?.executionAllowed),
      founderCommandMutationExecuted: Boolean(founderCommand?.summary?.mutationExecuted),
      founderCommandDispatchStatus: founderCommand?.summary?.dispatchStatus || 'unknown',
      founderCommandWorkflowStatus: founderCommand?.summary?.workflowStatus || 'unknown',
      founderCommandIntentGateStatus: founderCommand?.summary?.intentGateStatus || 'unknown',
      agentDispatchStatus: agentDispatch?.summary?.status || 'unknown',
      agentDispatchCapabilityId: agentDispatch?.summary?.capabilityId || '',
      agentDispatchCapabilityLabel: agentDispatch?.summary?.capabilityLabel || '',
      agentDispatchKind: agentDispatch?.summary?.dispatchKind || '',
      agentDispatchRoute: agentDispatch?.summary?.route || '',
      agentDispatchConfidence: agentDispatch?.summary?.confidence || 0,
      agentDispatchPermissionEnvelope: agentDispatch?.summary?.permissionEnvelope || 'unknown',
      agentDispatchApprovalRequired: Boolean(agentDispatch?.summary?.approvalRequired),
      agentDispatchSelectedAgentSlug: agentDispatch?.summary?.selectedAgentSlug || '',
      agentDispatchActionKind: agentDispatch?.summary?.actionKind || '',
      agentDispatchTargetApp: agentDispatch?.summary?.targetApp || '',
      agentDispatchTargetUrlHost: agentDispatch?.summary?.targetUrlHost || '',
      grokBuildSetupStatus: grokBuild?.summary?.status || 'unknown',
      grokBuildCliStatus: grokBuild?.summary?.cliStatus || 'unknown',
      grokBuildCliVersion: grokBuild?.summary?.cliVersion || 'unknown',
      grokBuildAuthStatus: grokBuild?.summary?.authStatus || 'unknown',
      grokBuildModelStatus: grokBuild?.summary?.modelStatus || 'unknown',
      grokBuildRequestedModel: grokBuild?.summary?.requestedModel || '',
      grokBuildDefaultModel: grokBuild?.summary?.defaultModel || '',
      grokBuildProjectTrusted: Boolean(grokBuild?.summary?.projectTrusted),
      grokBuildProjectTrustStatus: grokBuild?.summary?.projectTrustStatus || 'unknown',
      grokBuildWarningCount: grokBuild?.summary?.warningCount || 0,
      grokBuildReadyForHeavyRecheck: Boolean(grokBuild?.summary?.readyForHeavyRecheck),
      grokBuildReadyForGrokBuild: Boolean(grokBuild?.summary?.readyForGrokBuild),
      grokBuildHeavyAccessStatus: grokBuild?.summary?.heavyAccessStatus || grokBuild?.heavyUpgrade?.status || 'unknown',
      grokBuildHeavyVerifiedAt: grokBuild?.heavyUpgrade?.verifiedAt || '',
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
      trustLedgerStatus: trustLedger?.summary?.status || 'unknown',
      trustLedgerRecordCount: trustLedger?.summary?.recordCount || 0,
      trustedAutonomyTrustedRecordCount: trustLedger?.summary?.trustedRecordCount || 0,
      trustedAutonomyGuardedRecordCount: trustLedger?.summary?.guardedRecordCount || 0,
      trustedAutonomyReadOnlyRecordCount: trustLedger?.summary?.readOnlyRecordCount || 0,
      trustedAutonomyBreakGlassRecordCount: trustLedger?.summary?.breakGlassRecordCount || 0,
      trustedAutonomyLatestLevel: trustLedger?.summary?.latestTrustLevel || 'unknown',
      trustedAutonomyLatestActionKind: trustLedger?.summary?.latestActionKind || '',
      trustedAutonomyLatestTarget: trustLedger?.summary?.latestTarget || '',
      trustedAutonomyEligible: Boolean(trustLedger?.summary?.trustedAutonomyEligible),
      trustedAutonomySuccessesUntilTrusted: trustLedger?.summary?.successesUntilTrusted || 0,
      trustedAutonomyPromotionThreshold: trustLedger?.summary?.promotionThreshold || trustLedger?.policy?.promotionThreshold || 3,
      activeWorkflowKind: workflow?.summary?.workflowKind || workflow?.profile || '',
      activeWorkflowStatus: workflow?.summary?.status || 'unknown',
      activeWorkflowTitle: workflow?.title || '',
      activeWorkflowTargetSurface: workflow?.summary?.targetSurface || '',
      activeWorkflowAgentSlug: workflow?.summary?.agentSlug || '',
      activeWorkflowAgentLabel: workflow?.summary?.agentLabel || '',
      activeWorkflowCommand: workflow?.summary?.command || '',
      activeWorkflowMode: workflow?.summary?.mode || '',
      activeWorkflowStepCount: workflow?.summary?.stepCount || 0,
      activeWorkflowPendingApprovalCount: workflow?.summary?.pendingApprovalCount || 0,
      activeWorkflowModel: workflow?.summary?.model || '',
      activeWorkflowModelRoute: workflow?.summary?.modelRoute || '',
      activeWorkflowMusicTarget: workflow?.summary?.musicTarget || '',
      activeWorkflowPromptPresent: Boolean(workflow?.summary?.promptPresent),
      activeWorkflowProjectTrusted: Boolean(workflow?.summary?.projectTrusted),
      activeWorkflowProjectTrustStatus: workflow?.summary?.projectTrustStatus || '',
      activeWorkflowShellContextAttachedByDefault: Boolean(workflow?.summary?.shellContextAttachedByDefault),
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
      goldCodebaseBridge,
      wildHoloScript,
      formatInventory,
      founderBootPreview,
      userShellProjection,
      developmentalEnvironment,
      lanes,
      processHealth,
      networkReality,
      legacyAppReality,
      mcpCustodyContract,
      mcpUpstreamHandoff,
      osUiCapture,
      programRegistry,
      readinessEvidence,
      shellObjects,
      brittneyAvatar,
      brittneyTurn,
      brittneyContext,
      operatorBrief,
      operatingTurn,
      founderCommand,
      agentDispatch,
      grokBuild,
      hardwareAction,
      hardwareApproval,
      trustLedger,
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
  if (feed.summary.brittneyContextStatus === 'unknown') failures.push('expected Brittney context feed');
  if (feed.summary.hardwareActionStatus === 'unknown') failures.push('expected hardware action feed');
  if (feed.summary.programRegistryStatus === 'unknown') failures.push('expected program registry feed');
  if (feed.summary.hardwareApprovalStatus === 'unknown') failures.push('expected hardware approval feed');
  if (feed.summary.developmentalEnvironmentStatus === 'unknown') failures.push('expected developmental environment feed');
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
    console.log(`Founder boot: ${feed.summary.founderBootStatus}`);
    console.log(`User shell: ${feed.summary.userShellProjectionStatus}`);
    console.log(`Developmental environment: ${feed.summary.developmentalEnvironmentStatus}`);
    console.log(`MCP custody: ${feed.summary.mcpCustodyContractStatus}`);
    console.log(`MCP upstream handoff: ${feed.summary.mcpUpstreamHandoffStatus}`);
    console.log(`Brittney context: ${feed.summary.brittneyContextStatus}`);
    console.log(`GOLD/codebase bridge: ${feed.summary.goldCodebaseBridgeStatus}`);
    console.log(`Format inventory: ${feed.summary.formatInventoryStatus}`);
    console.log(`Network reality: ${feed.summary.networkRealityStatus}`);
    console.log(`Legacy app reality: ${feed.summary.legacyAppRealityStatus}`);
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
