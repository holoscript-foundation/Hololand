import assert from 'node:assert/strict';
import { buildReceipt } from '../holoshell-agent-dispatch.mjs';

const baseArgs = {
  actor: 'brittney',
  prompt: '',
  output: '.tmp/holoshell/test-agent-dispatch.json',
  jsOutput: '.tmp/holoshell/test-agent-dispatch.js',
  dispatchDir: '.tmp/holoshell/test-agent-dispatches',
};

function receiptFor(intent) {
  return buildReceipt({ ...baseArgs, intent });
}

const flagship = receiptFor(
  'Brittney, open Claude, start a room marathon using Ollama Kimi Cloud, open a browser, and play lofi music on YouTube'
);

assert.equal(flagship.summary.status, 'ready_to_stage');
assert.equal(flagship.summary.capabilityId, 'founder_command');
assert.equal(flagship.summary.route, '/workflow/founder-command');
assert.equal(flagship.dispatch.body.model, 'kimi-cloud');
assert.equal(flagship.dispatch.body.modelRoute, 'ollama_cloud');
assert.equal(flagship.request.rawIntentStoredLocallyOnly, true);

const roomOnly = receiptFor('start room marathon using Ollama Kimi Cloud');
assert.equal(roomOnly.summary.capabilityId, 'room_marathon');
assert.equal(roomOnly.summary.route, '/workflow/room-marathon');

const laptopReasoning = receiptFor('Have the laptop use Codex reasoning to inspect this repo and return a receipt.');
assert.equal(laptopReasoning.summary.status, 'ready_to_stage');
assert.equal(laptopReasoning.summary.capabilityId, 'laptop_reasoning_job');
assert.equal(laptopReasoning.summary.dispatchKind, 'reasoning_job');
assert.equal(laptopReasoning.summary.permissionEnvelope, 'read_only');
assert.equal(laptopReasoning.summary.approvalRequired, false);
assert.equal(laptopReasoning.dispatch.body.targetHost, 'laptop_windows');
assert.equal(laptopReasoning.dispatch.body.lane, 'laptop-hardware');
assert.equal(laptopReasoning.dispatch.body.agentLane, 'local');
assert.equal(laptopReasoning.dispatch.body.canonicalProviderId, 'laptop-ollama');
assert.equal(laptopReasoning.dispatch.body.workload, 'heavy_reasoning');
assert.equal(laptopReasoning.dispatch.body.reuseBeforeBuild, true);
assert.equal(laptopReasoning.dispatch.body.canonicalSurfaces.goldDrive.root, 'D:/GOLD');
assert.equal(laptopReasoning.dispatch.body.canonicalSurfaces.claudeInjection.route, '/workflow/claude-chat');
assert.equal(laptopReasoning.dispatch.body.canonicalSurfaces.studioBrittney.serviceOrchestrator, 'packages/brittney/service/src/orchestrator.ts');
assert.equal(laptopReasoning.dispatch.body.canonicalSurfaces.vastFleet.spendRail, 'purchased_compute');
assert.ok(laptopReasoning.dispatch.body.canonicalSurfaces.vastFleet.requires.includes('daily_current_job_budget_fields'));
assert.equal(laptopReasoning.summary.agentLane, 'local');
assert.equal(laptopReasoning.summary.canonicalProviderId, 'laptop-ollama');
assert.equal(laptopReasoning.summary.reuseBeforeBuild, true);
assert.equal(laptopReasoning.summary.goldRoot, 'D:/GOLD');
assert.equal(laptopReasoning.summary.claudeInjectionRoute, '/workflow/claude-chat');
assert.equal(laptopReasoning.summary.vastSpendRail, 'purchased_compute');
assert.ok(laptopReasoning.dispatch.body.reasonCodes.includes('explicit_laptop_reasoning_request'));

const codexLaunch = receiptFor('launch Codex through Ollama');
assert.equal(codexLaunch.summary.capabilityId, 'ollama_cloud_agent');
assert.equal(codexLaunch.summary.route, '/workflow/ollama-cloud-agent');

const lofiOnly = receiptFor('open browser and play lofi music on YouTube');
assert.equal(lofiOnly.summary.capabilityId, 'browser_lofi');
assert.equal(lofiOnly.summary.dispatchKind, 'hardware_action');
assert.equal(lofiOnly.dispatch.body.action, 'open_url');

const unsupported = receiptFor('make the moon purple');
assert.equal(unsupported.summary.status, 'blocked');
assert.equal(unsupported.summary.capabilityId, '');
assert.equal(unsupported.summary.capabilityLabel, '');
assert.equal(unsupported.summary.dispatchKind, 'unsupported');
assert.equal(unsupported.summary.route, '');
assert.equal(unsupported.match.capabilityId, '');
assert.equal(unsupported.match.confidence, 0);
assert.deepEqual(unsupported.match.evidence, []);
assert.deepEqual(unsupported.dispatch.body, {});

const weakLaptopReasoning = receiptFor('reason about the local backend');
assert.equal(weakLaptopReasoning.summary.status, 'blocked');
assert.equal(weakLaptopReasoning.summary.capabilityId, '');
assert.equal(weakLaptopReasoning.summary.route, '');
assert.equal(weakLaptopReasoning.match.confidence, 25);
assert.deepEqual(weakLaptopReasoning.dispatch.body, {});
assert.ok(weakLaptopReasoning.match.evidence.some((item) =>
  item.capabilityId === 'laptop_reasoning_job' && item.score === 25
));
