#!/usr/bin/env node
import crypto from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SCHEMA_VERSION = 'hololand.holoshell.legacy-app-absorption.v0.1.0';
const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const DEFAULT_HARDWARE_REALITY = path.join('.tmp', 'holoshell', 'hardware-reality.json');
const DEFAULT_OUTPUT = path.join('.tmp', 'holoshell', 'legacy-app-absorption.json');
const DEFAULT_JS_OUTPUT = path.join('.tmp', 'holoshell', 'legacy-app-absorption.js');

function parseArgs(argv) {
  const args = {
    hardwareReality: DEFAULT_HARDWARE_REALITY,
    output: DEFAULT_OUTPUT,
    jsOutput: DEFAULT_JS_OUTPUT,
    json: false,
    selfTest: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    else if (arg === '--hardware-reality') args.hardwareReality = argv[++index];
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
  console.log(`HoloShell legacy app absorption

Usage:
  node scripts/holoshell-legacy-app-absorption.mjs [options]

Options:
  --hardware-reality <path>   Hardware reality JSON. Default: .tmp/holoshell/hardware-reality.json.
  --output <path>             Snapshot output. Default: .tmp/holoshell/legacy-app-absorption.json.
  --js-output <path>          Browser bootstrap JS. Default: .tmp/holoshell/legacy-app-absorption.js.
  --json                      Print snapshot JSON.
  --self-test                 Use synthetic fixture and assert invariants.
`);
}

function resolveRepoPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(REPO_ROOT, filePath);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(resolveRepoPath(filePath), 'utf8'));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function syntheticHardwareReality() {
  return {
    schemaVersion: 'hololand.holoshell.hardware-reality-bridge.v0.1.0',
    generatedAt: '2026-05-14T00:00:00.000Z',
    summary: {
      legacyAppCount: 4,
      terminationPreflightCount: 4,
      riskState: 'pass',
    },
    legacyApps: [
      { appName: 'msedge', observedProcessCount: 2, samplePids: [303, 304], mutationPolicy: 'preflight_required' },
      { appName: 'explorer', observedProcessCount: 1, samplePids: [505], mutationPolicy: 'preflight_required' },
      { appName: 'SystemSettings', observedProcessCount: 1, samplePids: [606], mutationPolicy: 'preflight_required' },
    ],
    receipt: {
      snapshotHash: 'fixture-snapshot-hash',
      destructiveActionsTaken: false,
      rawCommandsIncluded: false,
    },
  };
}

function loadHardwareReality(args) {
  if (args.selfTest) return syntheticHardwareReality();
  const resolved = resolveRepoPath(args.hardwareReality);
  if (!existsSync(resolved)) {
    throw new Error(`Hardware reality not found: ${resolved}. Run pnpm run holoshell:hardware-reality first.`);
  }
  return readJson(resolved);
}

function archetypeFor(appName) {
  const name = String(appName || '').toLowerCase();
  if (/(msedge|chrome|firefox|brave)/.test(name)) return 'browser';
  if (/(explorer|files|finder)/.test(name)) return 'file_manager';
  if (/(systemsettings|settings|control)/.test(name)) return 'settings_panel';
  if (/(webview|native|messagehost|powerautomate|pad\.)/.test(name)) return 'automation_bridge';
  if (/(code|cursor|devenv|studio)/.test(name)) return 'developer_ide';
  return 'unknown_legacy_app';
}

function safeActionsFor(archetype) {
  const common = ['observe_process', 'capture_window', 'read_title', 'map_visible_controls'];
  if (archetype === 'browser') return [...common, 'capture_url_bar', 'summarize_tabs'];
  if (archetype === 'file_manager') return [...common, 'summarize_visible_folder'];
  if (archetype === 'settings_panel') return [...common, 'summarize_visible_settings'];
  if (archetype === 'automation_bridge') return ['observe_process', 'capture_window', 'map_visible_controls'];
  if (archetype === 'developer_ide') return [...common, 'summarize_workspace_state'];
  return common;
}

function blockedActionsFor(archetype) {
  const blocked = [
    'click_destructive_ui',
    'change_app_setting',
    'alter_registry',
    'uninstall_app',
    'submit_form',
    'close_window',
  ];
  if (archetype === 'file_manager') return [...blocked, 'delete_file', 'move_file'];
  if (archetype === 'browser') return [...blocked, 'submit_purchase', 'change_browser_profile'];
  if (archetype === 'settings_panel') return [...blocked, 'change_system_setting'];
  return blocked;
}

function appGroups(hardwareReality) {
  return safeArray(hardwareReality.legacyApps).map((app) => {
    const archetype = archetypeFor(app.appName);
    return {
      appName: app.appName || 'legacy_app',
      archetype,
      observedProcessCount: Number(app.observedProcessCount || 0),
      samplePids: safeArray(app.samplePids).slice(0, 8),
      captureCandidate: archetype !== 'automation_bridge' || Number(app.observedProcessCount || 0) > 0,
      mutationPolicy: 'preflight_required',
      safeActions: safeActionsFor(archetype),
      blockedActions: blockedActionsFor(archetype),
      preflightTool: 'holoshell_preflight_legacy_app_mutation',
      receiptRequired: true,
    };
  }).sort((left, right) => right.observedProcessCount - left.observedProcessCount);
}

function buildRecommendations(groups) {
  const recommendations = [];
  for (const group of groups) {
    if (group.archetype === 'browser') {
      recommendations.push({
        appName: group.appName,
        action: 'capture_browser_surface',
        priority: 'high',
        reason: 'Browser is a high-value legacy surface for user tasks and web automation.',
        receiptRequired: true,
      });
    } else if (group.archetype === 'file_manager') {
      recommendations.push({
        appName: group.appName,
        action: 'capture_file_manager_surface',
        priority: 'high',
        reason: 'File manager needs visual wrapping before agents can help a non-developer user safely.',
        receiptRequired: true,
      });
    } else if (group.archetype === 'settings_panel') {
      recommendations.push({
        appName: group.appName,
        action: 'observe_settings_only',
        priority: 'medium',
        reason: 'Settings panels are useful, but every change requires rollback and explicit preflight.',
        receiptRequired: true,
      });
    } else {
      recommendations.push({
        appName: group.appName,
        action: 'observe_and_classify',
        priority: group.archetype === 'automation_bridge' ? 'low' : 'medium',
        reason: 'Classify the legacy surface before offering operations.',
        receiptRequired: true,
      });
    }
  }
  return recommendations.slice(0, 16);
}

function createSnapshot(hardwareReality) {
  const groups = appGroups(hardwareReality);
  const recommendations = buildRecommendations(groups);
  const observedAppCount = groups.reduce((sum, app) => sum + app.observedProcessCount, 0);
  const snapshot = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sourceAnchors: {
      source: 'apps/holoshell/source/holoshell-legacy-app-absorption.hsplus',
      adapter: 'scripts/holoshell-legacy-app-absorption.mjs',
      hardwareReality: 'scripts/holoshell-hardware-reality-bridge.mjs',
    },
    summary: {
      observedAppCount,
      appGroupCount: groups.length,
      captureCandidateCount: groups.filter((group) => group.captureCandidate).length,
      preflightRequiredCount: groups.length,
      mutationAllowedCount: 0,
      recommendationCount: recommendations.length,
    },
    safety: {
      observeOnly: true,
      destructiveActionsTaken: false,
      legacyMutationPerformed: false,
      preflightRequiredForMutation: true,
      rawCommandsIncluded: false,
      requiredPreflightTool: 'holoshell_preflight_legacy_app_mutation',
    },
    hardwareReality: {
      generatedAt: hardwareReality.generatedAt || null,
      riskState: hardwareReality.summary?.riskState || 'unknown',
      snapshotHash: hardwareReality.receipt?.snapshotHash || null,
    },
    appGroups: groups,
    recommendations,
    brittneyBrief: {
      status: groups.length ? 'legacy_surfaces_visible' : 'no_legacy_surfaces',
      summary: `${observedAppCount} legacy app process(es) across ${groups.length} group(s). ${groups.length} mutation preflight gate(s) required.`,
      requiredNextAction: recommendations[0]
        ? `${recommendations[0].action} for ${recommendations[0].appName}: ${recommendations[0].reason}`
        : 'No legacy app absorption action is required.',
      allowedActions: ['observe_process', 'capture_window', 'read_title', 'map_visible_controls', 'summarize_visible_state'],
      blockedActions: ['click_destructive_ui', 'change_app_setting', 'alter_registry', 'uninstall_app', 'submit_form', 'close_window'],
      operatorRule: 'Legacy app mutation requires holoshell_preflight_legacy_app_mutation plus app identity, window identity, rollback plan, approval, and receipt.',
    },
    receipt: {
      absorptionHash: sha256(JSON.stringify({
        groups: groups.map((group) => [group.appName, group.archetype, group.observedProcessCount]),
        hardwareSnapshotHash: hardwareReality.receipt?.snapshotHash || null,
      })),
      destructiveActionsTaken: false,
      rawCommandsIncluded: false,
    },
  };
  return snapshot;
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
  writeFileSync(resolved, `window.HOLOSHELL_LEGACY_APP_ABSORPTION = ${payload};\n`, 'utf8');
  return resolved;
}

function assertSelfTest(snapshot) {
  const failures = [];
  if (snapshot.schemaVersion !== SCHEMA_VERSION) failures.push('schemaVersion mismatch');
  if (snapshot.summary.observedAppCount < 3) failures.push('expected synthetic legacy app observations');
  if (snapshot.summary.mutationAllowedCount !== 0) failures.push('mutation must not be allowed');
  if (snapshot.safety.destructiveActionsTaken !== false) failures.push('destructive actions must be false');
  if (!snapshot.safety.preflightRequiredForMutation) failures.push('legacy mutation preflight is required');
  if (!snapshot.brittneyBrief.blockedActions.includes('alter_registry')) failures.push('Brittney brief must block registry mutation');
  const serialized = JSON.stringify(snapshot);
  if (/commandLine|CommandLine|command_summary/.test(serialized)) failures.push('raw command text leaked');
  if (failures.length) {
    throw new Error(`Self-test failed:\n- ${failures.join('\n- ')}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const hardwareReality = loadHardwareReality(args);
  const snapshot = createSnapshot(hardwareReality);
  if (args.selfTest) assertSelfTest(snapshot);
  const output = writeJson(args.output, snapshot);
  const jsOutput = writeBrowserBootstrap(args.jsOutput, snapshot);

  if (args.json) {
    console.log(JSON.stringify(snapshot, null, 2));
  } else {
    console.log(`HoloShell legacy app absorption: ${output}`);
    console.log(`HoloShell legacy app absorption browser bootstrap: ${jsOutput}`);
    console.log(`Observed apps: ${snapshot.summary.observedAppCount}`);
    console.log(`Groups: ${snapshot.summary.appGroupCount}`);
    console.log(`Capture candidates: ${snapshot.summary.captureCandidateCount}`);
    console.log(`Preflight required: ${snapshot.summary.preflightRequiredCount}`);
    console.log(`Mutation allowed: ${snapshot.summary.mutationAllowedCount}`);
    console.log(`Destructive actions: ${snapshot.safety.destructiveActionsTaken}`);
  }
}

try {
  main();
} catch (error) {
  console.error(`holoshell-legacy-app-absorption failed: ${error.message}`);
  process.exit(1);
}
