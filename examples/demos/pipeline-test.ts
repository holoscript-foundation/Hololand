/**
 * Pipeline Test Runner
 *
 * Parses the pipeline-test.holo file through:
 *   1. HoloCompositionParser  →  HoloComposition AST
 *   2. R3FCompiler            →  R3FNode tree
 *   3. Validates output structure (lights, meshes, materials, physics, text, etc.)
 *
 * Usage:  npx tsx examples/demos/pipeline-test.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  HoloCompositionParser,
  R3FCompiler,
} from '@holoscript/core';

const holoPath = resolve(__dirname, 'pipeline-test.holo');
const source = readFileSync(holoPath, 'utf-8');

console.log('=== Pipeline Test ===\n');

// Step 1: Parse
console.log('[1] Parsing .holo file...');
const parser = new HoloCompositionParser();
const parseResult = parser.parse(source);

if (!parseResult.success) {
  console.error('PARSE FAILED:');
  for (const err of parseResult.errors) {
    console.error(`  Line ${err.loc?.line ?? '?'}: ${err.message}`);
  }
  process.exit(1);
}

const comp = parseResult.ast!;
console.log(`    Composition: "${comp.name}"`);
console.log(`    Objects:     ${comp.objects?.length ?? 0}`);
console.log(`    Groups:      ${comp.spatialGroups?.length ?? 0}`);
console.log(`    Templates:   ${comp.templates?.length ?? 0}`);
console.log('    PARSE OK\n');

// Step 2: Compile to R3F tree
console.log('[2] Compiling to R3F node tree...');
const compiler = new R3FCompiler();
const tree = compiler.compileComposition(comp);

console.log(`    Root type:   ${tree.type}`);
console.log(`    Children:    ${tree.children?.length ?? 0}`);

// Step 3: Validate structure
console.log('\n[3] Validating R3F tree structure...\n');

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) {
    console.log(`    OK   ${label}`);
    passed++;
  } else {
    console.error(`    FAIL ${label}`);
    failed++;
  }
}

function findNodes(node: any, predicate: (n: any) => boolean): any[] {
  const results: any[] = [];
  if (predicate(node)) results.push(node);
  if (node.children) {
    for (const child of node.children) {
      results.push(...findNodes(child, predicate));
    }
  }
  return results;
}

// --- Lights ---
const lights = findNodes(tree, (n) => n.type?.toLowerCase().includes('light'));
assert('Has ambient light (from preset + explicit)', lights.some((l) => l.type === 'ambientLight'));
assert('Has directional light (from preset)', lights.some((l) => l.type === 'directionalLight'));
assert('Has hemisphere light (from object)', lights.some((l) => l.type === 'hemisphereLight'));
assert('Has spot light (from object)', lights.some((l) => l.type === 'spotLight'));
assert('Has point light (from object)', lights.some((l) => l.type === 'pointLight'));

// --- Fog ---
const fogNodes = findNodes(tree, (n) => n.type === 'fog');
assert('Has fog nodes', fogNodes.length > 0);

// --- Environment ---
const envNodes = findNodes(tree, (n) => n.type === 'Environment');
assert('Has Environment node (from preset)', envNodes.length > 0);

// --- Meshes ---
const meshes = findNodes(tree, (n) => n.type === 'mesh');
assert('Has mesh nodes', meshes.length > 0);
assert('Has >= 8 meshes (ground*2 + showcase 5 + platform + 3 boxes + portal_ring)', meshes.length >= 8);

// --- PBR Material Presets ---
const glassMesh = meshes.find((m: any) => m.props?.materialProps?.transmission !== undefined);
assert('Glass material has transmission', !!glassMesh);

const chromeMesh = meshes.find((m: any) =>
  m.props?.materialProps?.metalness === 1.0 && (m.props?.materialProps?.roughness ?? 1) <= 0.1
);
assert('Chrome material has metalness=1 + low roughness', !!chromeMesh);

const goldMesh = meshes.find((m: any) => m.id === 'gold_cube');
assert('Gold material applied', !!goldMesh && goldMesh.props?.materialProps?.metalness === 1.0);

const crystalMesh = meshes.find((m: any) => m.props?.materialProps?.iridescence !== undefined);
assert('Crystal material has iridescence', !!crystalMesh);

// --- Emissive with bloom ---
const bloomNodes = findNodes(tree, (n) => n.props?.bloom);
assert('Has bloom-tagged node (emissive_torus)', bloomNodes.length > 0);

const effectComposer = findNodes(tree, (n) => n.type === 'EffectComposer');
assert('Has EffectComposer (post-processing)', effectComposer.length > 0);

// --- Physics ---
const rigidBodies = findNodes(tree, (n) => n.props?.rigidBody);
assert('Has rigid body nodes (physics)', rigidBodies.length > 0);
assert('Has >= 4 rigid bodies (ground + platform + 3 boxes)', rigidBodies.length >= 4);

const grabbables = findNodes(tree, (n) => n.props?.grabbable);
assert('Has grabbable nodes', grabbables.length > 0);
assert('Has 3 grabbable boxes', grabbables.length >= 3);

// --- Text ---
const texts = findNodes(tree, (n) => n.type === 'Text');
assert('Has Text nodes', texts.length > 0);
assert('Has >= 4 text labels', texts.length >= 4);

// --- Groups ---
const groups = findNodes(tree, (n) => n.type === 'group');
assert('Has group nodes (spatial groups)', groups.length > 0);
assert('Has >= 3 groups (MaterialShowcase + PhysicsArea + ModelDisplay)', groups.filter((g: any) => g.id).length >= 3);

// --- GLTF Model ---
const gltfModels = findNodes(tree, (n) => n.type === 'gltfModel');
assert('Has GLTF model node', gltfModels.length > 0);

// --- Sparkles ---
const sparkles = findNodes(tree, (n) => n.type === 'Sparkles');
assert('Has Sparkles node', sparkles.length > 0);

// --- Portal ---
const portalNodes = findNodes(tree, (n) => n.props?.portal);
assert('Has portal node with destination', portalNodes.length > 0);

// --- Animated ---
const animatedNodes = findNodes(tree, (n) => n.props?.animated);
assert('Has animated nodes (@animated trait)', animatedNodes.length > 0);
assert('Has >= 3 animated objects (gem, ring, orb)', animatedNodes.length >= 3);
const rotateNode = animatedNodes.find((n: any) => n.props?.animated?.rotate);
assert('Has rotate animation config', !!rotateNode);
const pulseNode = animatedNodes.find((n: any) => n.props?.animated?.pulse);
assert('Has pulse animation config', !!pulseNode);

// --- Summary ---
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);

if (failed > 0) {
  // Debug: dump tree structure
  console.log('\n--- Debug: R3F Tree ---');
  function dumpTree(node: any, indent: number = 0) {
    const pad = ' '.repeat(indent);
    const id = node.id ? ` #${node.id}` : '';
    const extra: string[] = [];
    if (node.props?.rigidBody) extra.push('rigidBody');
    if (node.props?.grabbable) extra.push('grabbable');
    if (node.props?.bloom) extra.push('bloom');
    if (node.props?.portal) extra.push('portal');
    if (node.props?.materialProps) extra.push(`mat:${Object.keys(node.props.materialProps).join(',')}`);
    const tag = extra.length > 0 ? ` [${extra.join(', ')}]` : '';
    console.log(`${pad}${node.type}${id}${tag}`);
    if (node.children) {
      for (const child of node.children) dumpTree(child, indent + 2);
    }
  }
  dumpTree(tree);
}

process.exit(failed > 0 ? 1 : 0);
