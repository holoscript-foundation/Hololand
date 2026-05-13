import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const specDir = path.join(repoRoot, 'docs', 'specs');
const docPath = path.join(specDir, 'HOLOLAND_CROSS_MCP_RECEIPT_ENVELOPE.md');
const schemaPath = path.join(specDir, 'hololand-cross-mcp-receipt-envelope.schema.json');
const examplePath = path.join(specDir, 'hololand-cross-mcp-receipt-envelope.example.json');
const manifestPath = path.join(specDir, 'hololand-mcp-sovereign-manifest.v1.json');

const docText = fs.readFileSync(docPath, 'utf8');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const example = JSON.parse(fs.readFileSync(examplePath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const failures = [];

function check(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function getPath(object, dottedPath) {
  return dottedPath.split('.').reduce((value, key) => value?.[key], object);
}

function requirePath(object, dottedPath) {
  const value = getPath(object, dottedPath);
  check(value !== undefined && value !== null && value !== '', `missing required example path ${dottedPath}`);
  return value;
}

function requiredSet(defName) {
  return new Set(schema.$defs?.[defName]?.required || []);
}

check(schema.$id === 'https://hololand.dev/schemas/hololand-cross-mcp-receipt-envelope.schema.json', 'schema $id must stay stable');
check(schema.properties?.schemaVersion?.const === 'hololand.cross-mcp-receipt-envelope.v1', 'schemaVersion const mismatch');
check(example.schemaVersion === 'hololand.cross-mcp-receipt-envelope.v1', 'example schemaVersion mismatch');

const requiredTopLevel = [
  'actor',
  'toolTrace',
  'holoscriptArtifact',
  'holoscriptValidation',
  'hololandTarget',
  'runtimeOutcome',
  'hardwareBrowserEvidence',
  'rollback'
];

for (const field of requiredTopLevel) {
  check(schema.required?.includes(field), `schema top-level required missing ${field}`);
  requirePath(example, field);
}

const requiredNested = {
  actor: ['actorId', 'surface'],
  toolTrace: ['traceId', 'toolName', 'argumentsHash'],
  holoscriptArtifact: ['artifactPath', 'artifactHash', 'sourceTrustStatus'],
  holoscriptValidation: ['status', 'validator', 'resultHash'],
  hololandTarget: ['worldId', 'shardId', 'targetType'],
  runtimeOutcome: ['status', 'mutationHash', 'affectedRefs'],
  hardwareBrowserEvidence: ['applicability', 'evidenceRefs'],
  rollback: ['available', 'strategy', 'plan', 'rollbackRef']
};

for (const [defName, fields] of Object.entries(requiredNested)) {
  const required = requiredSet(defName);
  for (const field of fields) {
    check(required.has(field), `${defName}.required missing ${field}`);
    requirePath(example, `${defName}.${field}`);
  }
}

check(
  schema.$defs?.hololandTarget?.anyOf?.some((entry) => entry.required?.includes('zoneId')),
  'hololandTarget must allow/require zoneId evidence'
);
check(
  schema.$defs?.hololandTarget?.anyOf?.some((entry) => entry.required?.includes('twinEarthAnchorId')),
  'hololandTarget must allow/require twinEarthAnchorId evidence'
);
requirePath(example, 'hololandTarget.zoneId');
requirePath(example, 'hololandTarget.twinEarthAnchorId');

const trustStatuses = new Set(schema.$defs?.holoscriptArtifact?.properties?.sourceTrustStatus?.enum || []);
for (const status of ['official', 'third-party-conformance-pass', 'sandboxed-experimental', 'rejected', 'unknown']) {
  check(trustStatuses.has(status), `sourceTrustStatus enum missing ${status}`);
}

const evidenceTypes = new Set(schema.$defs?.hardwareBrowserEvidence?.properties?.evidenceRefs?.items?.properties?.type?.enum || []);
for (const evidenceType of ['browser-screenshot', 'webgpu-audit', 'xr-profile', 'manual-hardware-note']) {
  check(evidenceTypes.has(evidenceType), `hardware/browser evidence type missing ${evidenceType}`);
}

const runtimeStatuses = new Set(schema.$defs?.runtimeOutcome?.properties?.status?.enum || []);
for (const status of ['previewed', 'applied', 'rejected', 'rolled-back', 'failed']) {
  check(runtimeStatuses.has(status), `runtimeOutcome.status enum missing ${status}`);
}

const rollbackStrategies = new Set(schema.$defs?.rollback?.properties?.strategy?.enum || []);
for (const strategy of ['automatic', 'manual', 'immutable-receipt-only']) {
  check(rollbackStrategies.has(strategy), `rollback.strategy enum missing ${strategy}`);
}

check(Array.isArray(example.hardwareBrowserEvidence.evidenceRefs), 'example hardwareBrowserEvidence.evidenceRefs must be an array');
check(example.hardwareBrowserEvidence.evidenceRefs.length >= 1, 'example must include at least one hardware/browser evidence reference');
check(Array.isArray(example.runtimeOutcome.affectedRefs), 'example runtimeOutcome.affectedRefs must be an array');
check(example.runtimeOutcome.affectedRefs.length >= 1, 'example must include affectedRefs');

for (const phrase of [
  'Actor ID',
  'Tool trace ID',
  'HoloScript artifact path',
  'HoloScript validation result',
  'HoloLand world ID',
  'Runtime outcome',
  'Hardware or browser evidence',
  'Rollback metadata'
]) {
  check(docText.includes(phrase), `doc missing evidence phrase: ${phrase}`);
}

const envelope = manifest.crossMcpReceiptEnvelope || {};
check(envelope.schemaPath === 'docs/specs/hololand-cross-mcp-receipt-envelope.schema.json', 'MCP manifest must link receipt schemaPath');
check(envelope.examplePath === 'docs/specs/hololand-cross-mcp-receipt-envelope.example.json', 'MCP manifest must link receipt examplePath');
for (const field of ['actor', 'toolTrace', 'holoscriptArtifact', 'holoscriptValidation', 'hololandTarget', 'runtimeOutcome', 'hardwareBrowserEvidence', 'rollback']) {
  check(envelope.requiredFieldGroups?.includes(field), `MCP manifest requiredFieldGroups missing ${field}`);
}

if (failures.length > 0) {
  console.error('[cross-mcp-receipt-envelope] FAIL');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('[cross-mcp-receipt-envelope] PASS schema, example, documentation, and MCP manifest linkage validated.');
