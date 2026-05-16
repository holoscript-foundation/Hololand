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

const lofiOnly = receiptFor('open browser and play lofi music on YouTube');
assert.equal(lofiOnly.summary.capabilityId, 'browser_lofi');
assert.equal(lofiOnly.summary.dispatchKind, 'hardware_action');
assert.equal(lofiOnly.dispatch.body.action, 'open_url');

const unsupported = receiptFor('make the moon purple');
assert.equal(unsupported.summary.status, 'blocked');
