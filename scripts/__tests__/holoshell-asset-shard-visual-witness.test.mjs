#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..', '..');

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 60_000,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
  }
  return result;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(path.resolve(REPO_ROOT, filePath), 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

run('node', ['scripts/holoshell-asset-shard-workflow.mjs', '--self-test']);
run('node', [
  'scripts/holoshell-visual-witness.mjs',
  '--shard-workflow',
  '.tmp/holoshell/shard-workflow-latest.json',
  '--preview-source',
  '.tmp/holoshell/shard-preview.holo',
  '--output',
  '.tmp/holoshell/self-test/asset-shard-visual-witness.json',
  '--js-output',
  '.tmp/holoshell/self-test/asset-shard-visual-witness.js',
  '--output-dir',
  '.tmp/holoshell/self-test/asset-shard-visual-witness',
  '--json',
]);

const receipt = readJson('.tmp/holoshell/self-test/asset-shard-visual-witness.json');

assert(receipt.schemaVersion === 'hololand.holoshell.visual-witness.v0.1.0', 'schema mismatch');
assert(receipt.status === 'pass', 'visual witness should pass');
assert(receipt.shardWitness?.enabled === true, 'missing shard witness envelope');
assert(receipt.shardWitness.previewHash, 'missing preview hash');
assert(receipt.shardWitness.sourceAssetsMutated === false, 'source assets must not mutate');
assert(receipt.screenshot?.sha256, 'missing screenshot hash');
assert(receipt.domWitness?.sha256, 'missing DOM hash');
assert(Array.isArray(receipt.domWitness?.missingText), 'missing text list absent');
assert(receipt.domWitness.missingText.length === 0, 'expected all shard witness text to render');
assert(existsSync(path.resolve(REPO_ROOT, receipt.screenshot.path)), 'screenshot file missing');

console.log('holoshell asset shard visual witness test passed');
