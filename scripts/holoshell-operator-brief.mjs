#!/usr/bin/env node
import crypto from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SCHEMA_VERSION = 'hololand.holoshell.operator-brief.v0.1.0';
const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const DEFAULT_HARDWARE_REALITY = path.join('.tmp', 'holoshell', 'hardware-reality.json');
const DEFAULT_RUN_CUSTODY = path.join('.tmp', 'holoshell', 'run-custody.json');
const DEFAULT_LEGACY_ABSORPTION = path.join('.tmp', 'holoshell', 'legacy-app-absorption.json');
const DEFAULT_LEGACY_WINDOWS = path.join('.tmp', 'holoshell', 'legacy-window-inventory.json');
const DEFAULT_OUTPUT = path.join('.tmp', 'holoshell', 'operator-brief.json');
const DEFAULT_JS_OUTPUT = path.join('.tmp', 'holoshell', 'operator-brief.js');

function parseArgs(argv) {
  const args = {
    hardwareReality: DEFAULT_HARDWARE_REALITY,
    runCustody: DEFAULT_RUN_CUSTODY,
    legacyAbsorption: DEFAULT_LEGACY_ABSORPTION,
    legacyWindows: DEFAULT_LEGACY_WINDOWS,
    output: DEFAULT_OUTPUT,
    jsOutput: DEFAULT_JS_OUTPUT,
    json: false,
    selfTest: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    else if (arg === '--hardware-reality') args.hardwareReality = argv[++index];
    else if (arg === '--run-custody') args.runCustody = argv[++index];
    else if (arg === '--legacy-absorption') args.legacyAbsorption = argv[++index];
    else if (arg === '--legacy-windows') args.legacyWindows = argv[++index];
    else if (arg === '--output') args.output = argv[++index];
    else if (arg === '--js-output') args.jsOutput = argv[++index];
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
  console.log(`HoloShell operator brief

Usage:
  node scripts/holoshell-operator-brief.mjs [options]

Options:
  --hardware-reality <path>    Hardware reality JSON.
  --run-custody <path>         Run custody JSON.
  --legacy-absorption <path>   Legacy absorption JSON.
  --legacy-windows <path>      Legacy window inventory JSON.
  --output <path>              Output JSON. Default: .tmp/holoshell/operator-brief.json.
  --js-output <path>           Browser bootstrap JS. Default: .tmp/holoshell/operator-brief.js.
  --json                       Print JSON.
  --self-test                  Use synthetic fixtures and assert invariants.
`);
}

function resolveRepoPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(REPO_ROOT, filePath);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(resolveRepoPath(filePath), 'utf8'));
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function loadInput(filePath, label) {
  const resolved = resolveRepoPath(filePath);
  if (!existsSync(resolved)) {
    throw new Error(`${label} not found: ${resolved}. Run holoshell:hardware-reality, holoshell:run-custody, and holoshell:legacy-apps first.`);
  }
  return readJson(resolved);
}

function loadOptionalInput(filePath) {
  const resolved = resolveRepoPath(filePath);
  return existsSync(resolved) ? readJson(resolved) : null;
}

function syntheticInputs() {
  return {
    hardwareReality: {
      generatedAt: '2026-05-14T00:00:00.000Z',
      summary: {
        riskState: 'warn',
        processCount: 10,
        shellRunCount: 2,
        activeLaneCount: 2,
        laneCount: 2,
        legacyAppCount: 3,
        terminationPreflightCount: 5,
      },
      safety: { destructiveActionsTaken: false, preflightRequiredForTermination: true },
      receipt: { snapshotHash: 'hardware-fixture', destructiveActionsTaken: false },
      recommendations: [{ kind: 'preflight_before_mutation', text: 'Use preflight tools.' }],
    },
    runCustody: {
      summary: {
        observedRunCount: 2,
        claimedRunCount: 1,
        observedOwnerCount: 0,
        ownerUnknownCount: 1,
        staleRunCount: 0,
        closedRunCount: 0,
      },
      safety: { destructiveActionsTaken: false, rawCommandsIncluded: false },
      recommendations: [{ action: 'claim', runId: 'pid-404', reason: 'Owner unknown.' }],
      brittneyBrief: {
        status: 'needs_triage',
        requiredNextAction: 'claim pid-404',
        blockedActions: ['kill_process', 'delete_file'],
      },
      receipt: { custodyHash: 'custody-fixture' },
    },
    legacyAbsorption: {
      summary: {
        observedAppCount: 3,
        visibleWindowCount: 5,
        peerSurfaceCount: 2,
        peerWindowCount: 2,
        aiPeerSurfaceCount: 2,
        aiPeerWindowCount: 2,
        shellSurfaceCount: 1,
        shellWindowCount: 1,
        operatingSurfaceCount: 3,
        operatingSurfaceWindowCount: 3,
        appGroupCount: 2,
        captureCandidateCount: 2,
        preflightRequiredCount: 2,
        mutationAllowedCount: 0,
      },
      safety: { destructiveActionsTaken: false, preflightRequiredForMutation: true },
      recommendations: [{ action: 'capture_browser_surface', appName: 'msedge', reason: 'High-value surface.' }],
      brittneyBrief: {
        status: 'legacy_surfaces_visible',
        requiredNextAction: 'capture_browser_surface for msedge',
        blockedActions: ['alter_registry', 'click_destructive_ui'],
      },
      receipt: { absorptionHash: 'legacy-fixture' },
    },
    legacyWindows: {
      summary: {
        visibleWindowCount: 5,
        peerSurfaceCount: 2,
        peerWindowCount: 2,
        aiPeerSurfaceCount: 2,
        aiPeerWindowCount: 2,
        shellSurfaceCount: 1,
        shellWindowCount: 1,
        operatingSurfaceCount: 3,
        operatingSurfaceWindowCount: 3,
        legacyWindowCount: 2,
        rawWindowTitlesIncluded: false,
      },
      peerSurfaces: [
        { laneId: 'codex', label: 'Codex', windowInstanceCount: 1, processCount: 1 },
        { laneId: 'claude', label: 'Claude', windowInstanceCount: 1, processCount: 1 },
      ],
      shellSurfaces: [
        { laneId: 'terminal', label: 'Terminal', peerKind: 'shell', surfaceClass: 'shell_surface', windowInstanceCount: 1, processCount: 1 },
      ],
      operatingSurfaces: [
        { laneId: 'codex', label: 'Codex', peerKind: 'agent', surfaceClass: 'ai_peer_surface', windowInstanceCount: 1, processCount: 1 },
        { laneId: 'claude', label: 'Claude', peerKind: 'agent', surfaceClass: 'ai_peer_surface', windowInstanceCount: 1, processCount: 1 },
        { laneId: 'terminal', label: 'Terminal', peerKind: 'shell', surfaceClass: 'shell_surface', windowInstanceCount: 1, processCount: 1 },
      ],
      brittneyBrief: {
        status: 'legacy_windows_visible',
        requiredNextAction: 'Use AI peer window counts separately from shell surface counts before trusting PID lane counts.',
        peerWindowSummary: 'Codex:1, Claude:1',
        shellWindowSummary: 'Terminal:1',
        blockedActions: ['close_window', 'click_destructive_ui'],
      },
      safety: { destructiveActionsTaken: false, rawWindowTitlesIncluded: false },
      receipt: { windowInventoryHash: 'window-fixture', rawWindowTitlesIncluded: false },
    },
  };
}

function loadInputs(args) {
  if (args.selfTest) return syntheticInputs();
  return {
    hardwareReality: loadInput(args.hardwareReality, 'hardware reality'),
    runCustody: loadInput(args.runCustody, 'run custody'),
    legacyAbsorption: loadInput(args.legacyAbsorption, 'legacy absorption'),
    legacyWindows: loadOptionalInput(args.legacyWindows) || {
      summary: {
        visibleWindowCount: 0,
        peerSurfaceCount: 0,
        peerWindowCount: 0,
        aiPeerSurfaceCount: 0,
        aiPeerWindowCount: 0,
        shellSurfaceCount: 0,
        shellWindowCount: 0,
        operatingSurfaceCount: 0,
        operatingSurfaceWindowCount: 0,
        rawWindowTitlesIncluded: false,
      },
      peerSurfaces: [],
      shellSurfaces: [],
      operatingSurfaces: [],
      brittneyBrief: {
        status: 'window_inventory_missing',
        requiredNextAction: 'Run holoshell:legacy-windows before trusting peer instance counts.',
        peerWindowSummary: 'window inventory missing',
        shellWindowSummary: 'window inventory missing',
        blockedActions: ['close_window', 'click_destructive_ui'],
      },
      safety: { destructiveActionsTaken: false, rawWindowTitlesIncluded: false },
      receipt: { windowInventoryHash: null, rawWindowTitlesIncluded: false },
    },
  };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function statusFor({ hardwareReality, runCustody, legacyAbsorption }) {
  if (hardwareReality.summary?.riskState === 'critical') return 'critical_triage';
  if ((runCustody.summary?.ownerUnknownCount || 0) > 0) return 'needs_run_custody';
  if ((legacyAbsorption.summary?.captureCandidateCount || 0) > 0) return 'legacy_absorption_ready';
  if (hardwareReality.summary?.riskState === 'warn') return 'hardware_warn';
  return 'ready';
}

function buildNextActions({ hardwareReality, runCustody, legacyAbsorption, legacyWindows }) {
  const actions = [];
  if (runCustody.brittneyBrief?.requiredNextAction) {
    actions.push({
      source: 'run_custody',
      priority: (runCustody.summary?.ownerUnknownCount || 0) > 0 ? 'high' : 'medium',
      action: runCustody.brittneyBrief.requiredNextAction,
    });
  }
  if (legacyWindows.brittneyBrief?.requiredNextAction && (legacyWindows.summary?.peerWindowCount || 0) > 0) {
    actions.push({
      source: 'legacy_windows',
      priority: 'high',
      action: legacyWindows.brittneyBrief.requiredNextAction,
    });
  }
  if (legacyAbsorption.brittneyBrief?.requiredNextAction) {
    actions.push({
      source: 'legacy_absorption',
      priority: 'medium',
      action: legacyAbsorption.brittneyBrief.requiredNextAction,
    });
  }
  for (const recommendation of safeArray(hardwareReality.recommendations).slice(0, 3)) {
    actions.push({
      source: 'hardware_reality',
      priority: recommendation.severity || 'medium',
      action: recommendation.text || recommendation.kind,
    });
  }
  return actions.slice(0, 8);
}

function createBrief(inputs) {
  const { hardwareReality, runCustody, legacyAbsorption, legacyWindows } = inputs;
  const aiPeerWindowCount = legacyWindows.summary?.aiPeerWindowCount ?? legacyWindows.summary?.peerWindowCount ?? 0;
  const aiPeerSurfaceCount = legacyWindows.summary?.aiPeerSurfaceCount ?? legacyWindows.summary?.peerSurfaceCount ?? 0;
  const shellWindowCount = legacyWindows.summary?.shellWindowCount || 0;
  const shellSurfaceCount = legacyWindows.summary?.shellSurfaceCount || 0;
  const operatingSurfaceWindowCount = legacyWindows.summary?.operatingSurfaceWindowCount ?? aiPeerWindowCount + shellWindowCount;
  const operatingSurfaceCount = legacyWindows.summary?.operatingSurfaceCount ?? aiPeerSurfaceCount + shellSurfaceCount;
  const blockedActions = unique([
    ...safeArray(runCustody.brittneyBrief?.blockedActions),
    ...safeArray(legacyAbsorption.brittneyBrief?.blockedActions),
    ...safeArray(legacyWindows.brittneyBrief?.blockedActions),
    'kill_process',
    'delete_file',
    'legacy_app_mutation',
    'registry_change',
    'destructive_ui_click',
  ]);
  const allowedActions = unique([
    'observe_hardware',
    'claim_run',
    'extend_run',
    'close_run_receipt',
    'mark_run_stale',
    'capture_window',
    'map_visible_controls',
    'summarize_visible_state',
  ]);
  const nextActions = buildNextActions(inputs);
  const safety = {
    destructiveActionsTaken: Boolean(
      hardwareReality.safety?.destructiveActionsTaken
        || runCustody.safety?.destructiveActionsTaken
        || legacyAbsorption.safety?.destructiveActionsTaken
        || legacyWindows.safety?.destructiveActionsTaken
    ),
    rawCommandsIncluded: Boolean(
      hardwareReality.receipt?.rawCommandsIncluded
        || runCustody.safety?.rawCommandsIncluded
        || legacyAbsorption.safety?.rawCommandsIncluded
    ),
    preflightRequiredForTermination: Boolean(hardwareReality.safety?.preflightRequiredForTermination),
    preflightRequiredForLegacyMutation: Boolean(legacyAbsorption.safety?.preflightRequiredForMutation),
    rawWindowTitlesIncluded: Boolean(legacyWindows.safety?.rawWindowTitlesIncluded || legacyWindows.receipt?.rawWindowTitlesIncluded),
  };
  const brief = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sourceAnchors: {
      source: 'apps/holoshell/source/holoshell-operator-brief.hsplus',
      adapter: 'scripts/holoshell-operator-brief.mjs',
      hardwareReality: 'scripts/holoshell-hardware-reality-bridge.mjs',
      runCustody: 'scripts/holoshell-run-custody-actions.mjs',
      legacyAbsorption: 'scripts/holoshell-legacy-app-absorption.mjs',
      legacyWindows: 'scripts/holoshell-legacy-window-inventory.mjs',
    },
    status: statusFor(inputs),
    hardware: {
      riskState: hardwareReality.summary?.riskState || 'unknown',
      processCount: hardwareReality.summary?.processCount || 0,
      shellRunCount: hardwareReality.summary?.shellRunCount || 0,
      activeLaneCount: hardwareReality.summary?.activeLaneCount || 0,
      laneCount: hardwareReality.summary?.laneCount || 0,
      legacyAppCount: hardwareReality.summary?.legacyAppCount || 0,
      terminationPreflightCount: hardwareReality.summary?.terminationPreflightCount || 0,
      snapshotHash: hardwareReality.receipt?.snapshotHash || null,
    },
    runs: {
      observedRunCount: runCustody.summary?.observedRunCount || 0,
      claimedRunCount: runCustody.summary?.claimedRunCount || 0,
      observedOwnerCount: runCustody.summary?.observedOwnerCount || 0,
      ownerUnknownCount: runCustody.summary?.ownerUnknownCount || 0,
      staleRunCount: runCustody.summary?.staleRunCount || 0,
      closedRunCount: runCustody.summary?.closedRunCount || 0,
      custodyHash: runCustody.receipt?.custodyHash || null,
    },
    legacy: {
      observedAppCount: legacyAbsorption.summary?.observedAppCount || 0,
      visibleWindowCount: legacyAbsorption.summary?.visibleWindowCount || legacyWindows.summary?.visibleWindowCount || 0,
      peerSurfaceCount: legacyAbsorption.summary?.aiPeerSurfaceCount ?? legacyAbsorption.summary?.peerSurfaceCount ?? aiPeerSurfaceCount,
      peerWindowCount: legacyAbsorption.summary?.aiPeerWindowCount ?? legacyAbsorption.summary?.peerWindowCount ?? aiPeerWindowCount,
      aiPeerSurfaceCount,
      aiPeerWindowCount,
      shellSurfaceCount: legacyAbsorption.summary?.shellSurfaceCount ?? shellSurfaceCount,
      shellWindowCount: legacyAbsorption.summary?.shellWindowCount ?? shellWindowCount,
      operatingSurfaceCount: legacyAbsorption.summary?.operatingSurfaceCount ?? operatingSurfaceCount,
      operatingSurfaceWindowCount: legacyAbsorption.summary?.operatingSurfaceWindowCount ?? operatingSurfaceWindowCount,
      appGroupCount: legacyAbsorption.summary?.appGroupCount || 0,
      captureCandidateCount: legacyAbsorption.summary?.captureCandidateCount || 0,
      preflightRequiredCount: legacyAbsorption.summary?.preflightRequiredCount || 0,
      mutationAllowedCount: legacyAbsorption.summary?.mutationAllowedCount || 0,
      absorptionHash: legacyAbsorption.receipt?.absorptionHash || null,
      windowInventoryHash: legacyWindows.receipt?.windowInventoryHash || null,
    },
    peers: {
      source: 'legacy_window_inventory',
      windowInstanceCount: aiPeerWindowCount,
      surfaceCount: aiPeerSurfaceCount,
      aiWindowInstanceCount: aiPeerWindowCount,
      aiSurfaceCount: aiPeerSurfaceCount,
      shellWindowInstanceCount: shellWindowCount,
      shellSurfaceCount,
      operatingSurfaceWindowCount,
      operatingSurfaceCount,
      rawWindowTitlesIncluded: Boolean(legacyWindows.summary?.rawWindowTitlesIncluded),
      surfaces: safeArray(legacyWindows.peerSurfaces).map((peer) => ({
        laneId: peer.laneId,
        label: peer.label,
        peerKind: peer.peerKind,
        windowInstanceCount: peer.windowInstanceCount || 0,
        processCount: peer.processCount || 0,
        evidence: peer.evidence || 'top_level_windows',
      })),
      shellSurfaces: safeArray(legacyWindows.shellSurfaces).map((surface) => ({
        laneId: surface.laneId,
        label: surface.label,
        peerKind: surface.peerKind,
        surfaceClass: surface.surfaceClass || 'shell_surface',
        windowInstanceCount: surface.windowInstanceCount || 0,
        processCount: surface.processCount || 0,
        evidence: surface.evidence || 'top_level_windows',
      })),
    },
    allowedActions,
    blockedActions,
    nextActions,
    brittneyPromptCard: {
      role: 'local_hardware_operator',
      instruction: 'Use this brief before proposing shell, process, file, or legacy-app actions. Prefer read-only observation and custody receipts. Route destructive work through HoloShell MCP preflights.',
      mustNot: blockedActions,
      firstMove: nextActions[0]?.action || 'Continue read-only observation.',
      peerWindowSummary: legacyWindows.brittneyBrief?.peerWindowSummary || safeArray(legacyWindows.peerSurfaces).map((peer) => `${peer.label}:${peer.windowInstanceCount}`).join(', ') || 'no peer windows',
      shellWindowSummary: legacyWindows.brittneyBrief?.shellWindowSummary || safeArray(legacyWindows.shellSurfaces).map((surface) => `${surface.label}:${surface.windowInstanceCount}`).join(', ') || 'no shell windows',
    },
    agentConsumption: {
      rest: '.tmp/holoshell/operator-brief.json',
      browserBootstrap: '.tmp/holoshell/operator-brief.js',
      requiredRefreshOrder: [
        'pnpm run holoshell:hardware-reality',
        'pnpm run holoshell:run-custody',
        'pnpm run holoshell:legacy-windows',
        'pnpm run holoshell:legacy-apps',
        'pnpm run holoshell:operator-brief',
      ],
    },
    safety,
  };
  return {
    ...brief,
    receipt: {
      briefHash: sha256(JSON.stringify({
        status: brief.status,
        hardware: brief.hardware,
        runs: brief.runs,
        legacy: brief.legacy,
        peers: brief.peers,
        blockedActions,
        safety,
      })),
      destructiveActionsTaken: safety.destructiveActionsTaken,
      rawCommandsIncluded: safety.rawCommandsIncluded,
      rawWindowTitlesIncluded: safety.rawWindowTitlesIncluded,
    },
  };
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
  writeFileSync(resolved, `window.HOLOSHELL_OPERATOR_BRIEF = ${payload};\n`, 'utf8');
  return resolved;
}

function assertSelfTest(brief) {
  const failures = [];
  if (brief.schemaVersion !== SCHEMA_VERSION) failures.push('schemaVersion mismatch');
  if (!brief.blockedActions.includes('kill_process')) failures.push('kill_process must be blocked');
  if (!brief.blockedActions.includes('legacy_app_mutation')) failures.push('legacy_app_mutation must be blocked');
  if (!brief.allowedActions.includes('claim_run')) failures.push('claim_run should be allowed');
  if (brief.peers.windowInstanceCount < 2) failures.push('expected synthetic peer window instances');
  if (brief.peers.shellWindowInstanceCount < 1) failures.push('expected synthetic shell window instances');
  if (brief.peers.operatingSurfaceWindowCount < 3) failures.push('expected synthetic operating surface windows');
  if (!brief.nextActions.length) failures.push('expected next action');
  if (brief.safety.destructiveActionsTaken !== false) failures.push('destructive actions must be false');
  if (brief.safety.rawCommandsIncluded !== false) failures.push('raw commands must be hidden');
  if (brief.safety.rawWindowTitlesIncluded !== false) failures.push('raw window titles must be hidden');
  if (!brief.receipt.briefHash) failures.push('missing brief hash');
  const serialized = JSON.stringify(brief);
  if (/commandLine|CommandLine|command_summary/.test(serialized)) failures.push('raw command text leaked');
  if (failures.length) {
    throw new Error(`Self-test failed:\n- ${failures.join('\n- ')}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputs = loadInputs(args);
  const brief = createBrief(inputs);
  if (args.selfTest) assertSelfTest(brief);
  const output = writeJson(args.output, brief);
  const jsOutput = writeBrowserBootstrap(args.jsOutput, brief);

  if (args.json) {
    console.log(JSON.stringify(brief, null, 2));
  } else {
    console.log(`HoloShell operator brief: ${output}`);
    console.log(`HoloShell operator brief browser bootstrap: ${jsOutput}`);
    console.log(`Status: ${brief.status}`);
    console.log(`Hardware risk: ${brief.hardware.riskState}`);
    console.log(`Owner unknown runs: ${brief.runs.ownerUnknownCount}`);
    console.log(`AI peer windows: ${brief.peers.windowInstanceCount}`);
    console.log(`Shell windows: ${brief.peers.shellWindowInstanceCount}`);
    console.log(`Legacy capture candidates: ${brief.legacy.captureCandidateCount}`);
    console.log(`Blocked actions: ${brief.blockedActions.length}`);
    console.log(`Destructive actions: ${brief.safety.destructiveActionsTaken}`);
  }
}

try {
  main();
} catch (error) {
  console.error(`holoshell-operator-brief failed: ${error.message}`);
  process.exit(1);
}
