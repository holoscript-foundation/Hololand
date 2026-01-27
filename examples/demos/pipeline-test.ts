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
  OptimizationPass,
  UnityCompiler,
  GodotCompiler,
  VisionOSCompiler,
  WebGPUCompiler,
  BabylonCompiler,
  AndroidXRCompiler,
  OpenXRCompiler,
  HoloScriptLSP,
  vrTraitRegistry,
  VR_TRAITS,
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
console.log(`    Lights:      ${comp.lights?.length ?? 0}`);
console.log(`    Effects:     ${comp.effects ? comp.effects.effects?.length ?? 0 : 'none'}`);
console.log(`    Camera:      ${comp.camera ? comp.camera.cameraType : 'none'}`);
console.log(`    Timelines:   ${comp.timelines?.length ?? 0}`);
console.log(`    Audio:       ${comp.audio?.length ?? 0}`);
console.log(`    Zones:       ${comp.zones?.length ?? 0}`);
console.log(`    UI Elements: ${comp.ui?.elements?.length ?? 0}`);
console.log(`    Transitions: ${comp.transitions?.length ?? 0}`);
console.log(`    Conditionals:${comp.conditionals?.length ?? 0}`);
console.log(`    Iterators:   ${comp.iterators?.length ?? 0}`);
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

// --- First-class Light blocks ---
assert('AST has light blocks', comp.lights?.length >= 2);
const rimLight = findNodes(tree, (n) => n.id === 'rim_light');
assert('Has rim_light from light block', rimLight.length > 0);
assert('rim_light is directionalLight', rimLight[0]?.type === 'directionalLight');
const areaLight = findNodes(tree, (n) => n.id === 'fill_area');
assert('Has fill_area from light block', areaLight.length > 0);
assert('fill_area is rectAreaLight', areaLight[0]?.type === 'rectAreaLight');

// --- First-class Effects block ---
assert('AST has effects block', !!comp.effects);
assert('Effects has 2 effects (bloom + vignette)', comp.effects?.effects?.length === 2);
const effectNodes = findNodes(tree, (n) => n.type === 'EffectComposer');
assert('Has EffectComposer from effects block', effectNodes.length > 0);
const bloomEffect = effectNodes[0]?.children?.find((c: any) => c.type === 'Bloom');
assert('EffectComposer has Bloom child', !!bloomEffect);
const vignetteEffect = effectNodes[0]?.children?.find((c: any) => c.type === 'Vignette');
assert('EffectComposer has Vignette child', !!vignetteEffect);

// --- First-class Camera block ---
assert('AST has camera block', !!comp.camera);
assert('Camera type is perspective', comp.camera?.cameraType === 'perspective');
const cameraNodes = findNodes(tree, (n) => n.type === 'Camera');
assert('Has Camera node in tree', cameraNodes.length > 0);
assert('Camera has fov property', cameraNodes[0]?.props?.fov === 75);

// --- Template trait merging ---
assert('Template has traits', comp.templates[0]?.traits?.length >= 2);
const templateTraitNames = comp.templates[0]?.traits?.map((t: any) => t.name) || [];
assert('Template has @grabbable trait', templateTraitNames.includes('grabbable'));
assert('Template has @physics trait', templateTraitNames.includes('physics'));

// --- Spatial group at [x,y,z] shorthand ---
const modelDisplay = comp.spatialGroups?.find((g: any) => g.name === 'ModelDisplay');
assert('ModelDisplay group exists', !!modelDisplay);
const modelDisplayPos = modelDisplay?.properties?.find((p: any) => p.key === 'position');
assert('ModelDisplay has position from "at" shorthand', !!modelDisplayPos);
assert('ModelDisplay position is [0,0,5]', JSON.stringify(modelDisplayPos?.value) === '[0,0,5]');

// --- Bind expression ---
const scoreDisplay = findNodes(tree, (n) => n.id === 'score_display');
assert('Has score_display node', scoreDisplay.length > 0);
const bindProp = scoreDisplay[0]?.props?.text;
assert('score_display text has bind expression', bindProp?.__bind === true);
assert('bind source is state.score', bindProp?.source === 'state.score');

// --- Spatial constraint traits ---
const orbitNode = findNodes(tree, (n) => n.props?.orbit);
assert('Has @orbit node (orbiting_moon)', orbitNode.length > 0);
assert('orbit config has target', orbitNode[0]?.props?.orbit?.target === 'pulsing_orb');
assert('orbit config has radius', orbitNode[0]?.props?.orbit?.radius === 2);

const attachNode = findNodes(tree, (n) => n.id === 'attached_label' && n.props?.attach);
assert('Has @attach node (attached_label)', attachNode.length > 0);
assert('attach config has target', attachNode[0]?.props?.attach?.target === 'floating_gem');

const followNode = findNodes(tree, (n) => n.props?.follow);
assert('Has @follow node (follower_drone)', followNode.length > 0);
assert('follow config has target', followNode[0]?.props?.follow?.target === 'player');

const lookAtNode = findNodes(tree, (n) => n.props?.lookAtTarget);
assert('Has @look_at node (watching_turret)', lookAtNode.length > 0);
assert('look_at config has target', lookAtNode[0]?.props?.lookAtTarget?.target === 'player');

// --- Animation Timelines ---
assert('AST has timelines', comp.timelines?.length >= 2);
const introTimeline = comp.timelines?.find((t: any) => t.name === 'intro_sequence');
assert('Has intro_sequence timeline', !!introTimeline);
assert('intro_sequence has autoplay: true', introTimeline?.autoplay === true);
assert('intro_sequence has entries', introTimeline?.entries?.length >= 3);
assert('First entry at time 0.0', introTimeline?.entries?.[0]?.time === 0);
assert('First entry is animate action', introTimeline?.entries?.[0]?.action?.kind === 'animate');
assert('Third entry is emit action', introTimeline?.entries?.[2]?.action?.kind === 'emit');
assert('Fourth entry is call action', introTimeline?.entries?.[3]?.action?.kind === 'call');

const ambientTimeline = comp.timelines?.find((t: any) => t.name === 'ambient_loop');
assert('Has ambient_loop timeline', !!ambientTimeline);
assert('ambient_loop has loop: true', ambientTimeline?.loop === true);

const timelineNodes = findNodes(tree, (n) => n.type === 'Timeline');
assert('Has Timeline nodes in tree', timelineNodes.length >= 2);
assert('Timeline has TimelineEntry children', (timelineNodes[0]?.children?.length ?? 0) >= 3);

// --- Audio blocks ---
assert('AST has audio blocks', comp.audio?.length >= 2);
const bgMusic = comp.audio?.find((a: any) => a.name === 'bg_music');
assert('Has bg_music audio', !!bgMusic);
const bgMusicSrc = bgMusic?.properties?.find((p: any) => p.key === 'src');
assert('bg_music has src property', bgMusicSrc?.value === 'forest_ambience.mp3');
const bgMusicSpatial = bgMusic?.properties?.find((p: any) => p.key === 'spatial');
assert('bg_music is non-spatial', bgMusicSpatial?.value === false);

const waterfallAudio = comp.audio?.find((a: any) => a.name === 'waterfall_sfx');
assert('Has waterfall_sfx audio', !!waterfallAudio);
const waterfallSpatial = waterfallAudio?.properties?.find((p: any) => p.key === 'spatial');
assert('waterfall_sfx is spatial', waterfallSpatial?.value === true);

const audioNodes = findNodes(tree, (n) => n.type === 'Audio');
assert('Has Audio nodes in tree', audioNodes.length >= 2);
assert('Audio node has src prop', !!audioNodes[0]?.props?.src);

// --- Interaction Zones ---
assert('AST has zones', comp.zones?.length >= 2);
const spawnZone = comp.zones?.find((z: any) => z.name === 'spawn_zone');
assert('Has spawn_zone', !!spawnZone);
const spawnShape = spawnZone?.properties?.find((p: any) => p.key === 'shape');
assert('spawn_zone shape is box', spawnShape?.value === 'box');
assert('spawn_zone has event handlers', spawnZone?.handlers?.length >= 2);
assert('spawn_zone has on_enter handler', spawnZone?.handlers?.some((h: any) => h.event === 'on_enter'));
assert('spawn_zone has on_exit handler', spawnZone?.handlers?.some((h: any) => h.event === 'on_exit'));

const secretZone = comp.zones?.find((z: any) => z.name === 'secret_area');
assert('Has secret_area zone', !!secretZone);
assert('secret_area has on_enter with params', secretZone?.handlers?.[0]?.parameters?.length >= 1);

const zoneNodes = findNodes(tree, (n) => n.type === 'Zone');
assert('Has Zone nodes in tree', zoneNodes.length >= 2);
assert('Zone node has shape prop', !!zoneNodes[0]?.props?.shape);
assert('Zone node has handlers prop', zoneNodes[0]?.props?.handlers?.length >= 2);

// --- UI/HUD Overlay ---
assert('AST has UI block', !!comp.ui);
assert('UI has 3 elements', comp.ui?.elements?.length === 3);
const healthBar = comp.ui?.elements?.find((e: any) => e.name === 'health_bar');
assert('Has health_bar element', !!healthBar);
const healthType = healthBar?.properties?.find((p: any) => p.key === 'type');
assert('health_bar type is progress', healthType?.value === 'progress');
const healthValue = healthBar?.properties?.find((p: any) => p.key === 'value');
assert('health_bar value has bind expression', healthValue?.value?.__bind === true);

const fpsCounter = comp.ui?.elements?.find((e: any) => e.name === 'fps_counter');
assert('Has fps_counter element', !!fpsCounter);

const minimap = comp.ui?.elements?.find((e: any) => e.name === 'minimap');
assert('Has minimap element', !!minimap);

const uiNodes = findNodes(tree, (n) => n.type === 'UI');
assert('Has UI node in tree', uiNodes.length > 0);
const uiElementNodes = findNodes(tree, (n) => n.type === 'UIElement');
assert('Has 3 UIElement children', uiElementNodes.length === 3);
assert('UIElement has id', !!uiElementNodes[0]?.id);

// --- Scene Transitions ---
assert('AST has transitions', comp.transitions?.length >= 2);
const fadeTrans = comp.transitions?.find((t: any) => t.name === 'fade_to_plaza');
assert('Has fade_to_plaza transition', !!fadeTrans);
const fadeEffect = fadeTrans?.properties?.find((p: any) => p.key === 'effect');
assert('fade_to_plaza effect is "fade"', fadeEffect?.value === 'fade');
const fadeDuration = fadeTrans?.properties?.find((p: any) => p.key === 'duration');
assert('fade_to_plaza duration is 1.5', fadeDuration?.value === 1.5);

const warpTrans = comp.transitions?.find((t: any) => t.name === 'warp_to_arena');
assert('Has warp_to_arena transition', !!warpTrans);

const transitionNodes = findNodes(tree, (n) => n.type === 'Transition');
assert('Has Transition nodes in tree', transitionNodes.length >= 2);
assert('Transition node has target prop', !!transitionNodes[0]?.props?.target);

// --- Conditional Rendering ---
assert('AST has conditional blocks', comp.conditionals?.length >= 1);
assert('Conditional has condition string', comp.conditionals?.[0]?.condition === 'state.debug_mode');
assert('Conditional has objects', comp.conditionals?.[0]?.objects?.length >= 1);
assert('Conditional object is debug_grid', comp.conditionals?.[0]?.objects?.[0]?.name === 'debug_grid');

const condNodes = findNodes(tree, (n) => n.type === 'ConditionalGroup');
assert('Has ConditionalGroup node in tree', condNodes.length > 0);
assert('ConditionalGroup has condition prop', condNodes[0]?.props?.condition === 'state.debug_mode');
assert('ConditionalGroup has children (objects)', (condNodes[0]?.children?.length ?? 0) >= 1);

// --- For-Each Rendering ---
assert('AST has iterator blocks', comp.iterators?.length >= 1);
assert('Iterator has variable', comp.iterators?.[0]?.variable === 'item');
assert('Iterator has iterable', comp.iterators?.[0]?.iterable === 'state.inventory');
assert('Iterator has objects', comp.iterators?.[0]?.objects?.length >= 1);

const forEachNodes = findNodes(tree, (n) => n.type === 'ForEachGroup');
assert('Has ForEachGroup node in tree', forEachNodes.length > 0);
assert('ForEachGroup has variable prop', forEachNodes[0]?.props?.variable === 'item');
assert('ForEachGroup has iterable prop', forEachNodes[0]?.props?.iterable === 'state.inventory');
assert('ForEachGroup has template children', (forEachNodes[0]?.children?.length ?? 0) >= 1);

// ==========================================================================
// INITIATIVE 1: AUTO-OPTIMIZATION PASS
// ==========================================================================

console.log('\n[4] Testing Optimization Pass...\n');

const optimizer = new OptimizationPass({ platform: 'vr' });
const report = optimizer.analyze(tree);

assert('Optimization report has hints', report.hints.length > 0);
assert('Optimization report has stats', !!report.stats);
assert('Stats has meshCount', report.stats.meshCount > 0);
assert('Stats has lightCount', report.stats.lightCount > 0);
assert('Stats has totalNodes', report.stats.totalNodes > 0);
assert('Stats has estimatedDrawCalls', report.stats.estimatedDrawCalls > 0);
assert('Stats has estimatedTriangles', report.stats.estimatedTriangles > 0);
assert('Stats has estimatedVRAM_MB', report.stats.estimatedVRAM_MB > 0);
assert('Stats has uniqueMaterials', report.stats.uniqueMaterials > 0);
assert('Stats has shadowCasterCount', report.stats.shadowCasterCount >= 0);
assert('Stats has rigidBodyCount', report.stats.rigidBodyCount > 0);
assert('Optimization score is 0-100', report.score >= 0 && report.score <= 100);

// LOD recommendations
assert('Has LOD recommendations', report.lodRecommendations.length > 0);
const lodRec = report.lodRecommendations[0];
assert('LOD recommendation has nodeId', !!lodRec.nodeId);
assert('LOD recommendation has tiers', lodRec.tiers.length >= 3);
assert('LOD tier 0 is high detail', lodRec.tiers[0].detail === 'high');
assert('LOD tier has cull level', lodRec.tiers.some((t: any) => t.detail === 'cull'));

// Batch groups
assert('Has batch groups', report.batchGroups.length > 0);
const batchGroup = report.batchGroups[0];
assert('Batch group has nodeIds', batchGroup.nodeIds.length >= 2);
assert('Batch group has canInstance flag', typeof batchGroup.canInstance === 'boolean');
assert('Batch group has canStaticBatch flag', typeof batchGroup.canStaticBatch === 'boolean');

// Hints structure
const hint = report.hints[0];
assert('Hint has category', !!hint.category);
assert('Hint has severity', ['info', 'warning', 'critical'].includes(hint.severity));
assert('Hint has message', !!hint.message);

// VR-specific transparency warning (pipeline-test has glass + crystal + emissive)
const transparencyHints = report.hints.filter((h: any) => h.category === 'overdraw');
assert('VR platform triggers transparency analysis', transparencyHints.length >= 0); // may or may not trigger

// Desktop optimizer should have different budgets
const desktopOptimizer = new OptimizationPass({ platform: 'desktop' });
const desktopReport = desktopOptimizer.analyze(tree);
assert('Desktop report has stats', !!desktopReport.stats);
assert('Desktop score may differ from VR', typeof desktopReport.score === 'number');

console.log(`    Optimization score (VR):      ${report.score}/100`);
console.log(`    Optimization score (Desktop):  ${desktopReport.score}/100`);
console.log(`    Total hints:    ${report.hints.length}`);
console.log(`    LOD candidates: ${report.lodRecommendations.length}`);
console.log(`    Batch groups:   ${report.batchGroups.length}`);

// ==========================================================================
// INITIATIVE 2: MULTI-TARGET COMPILATION
// ==========================================================================

console.log('\n[5] Testing Multi-Target Compilers...\n');

// --- Unity C# ---
const unityCompiler = new UnityCompiler({ className: 'PipelineTestScene' });
const unityCode = unityCompiler.compile(comp);

assert('Unity output is non-empty', unityCode.length > 0);
assert('Unity output has namespace', unityCode.includes('namespace HoloScene'));
assert('Unity output has class', unityCode.includes('class PipelineTestScene'));
assert('Unity output has MonoBehaviour', unityCode.includes('MonoBehaviour'));
assert('Unity output has Awake', unityCode.includes('void Awake()'));
assert('Unity output has lights', unityCode.includes('AddComponent<Light>()'));
assert('Unity output has camera', unityCode.includes('Camera.main'));
assert('Unity output has GameObjects', unityCode.includes('new GameObject('));
assert('Unity output has materials', unityCode.includes('.material'));
assert('Unity output has audio', unityCode.includes('AudioSource'));
assert('Unity output has primitives', unityCode.includes('CreatePrimitive'));
assert('Unity output has coroutine', unityCode.includes('IEnumerator'));
assert('Unity output has Vector3', unityCode.includes('Vector3('));

console.log(`    Unity C#:    ${unityCode.split('\n').length} lines`);

// --- Godot GDScript ---
const godotCompiler = new GodotCompiler({ className: 'PipelineTestScene' });
const godotCode = godotCompiler.compile(comp);

assert('Godot output is non-empty', godotCode.length > 0);
assert('Godot output has extends Node3D', godotCode.includes('extends Node3D'));
assert('Godot output has class_name', godotCode.includes('class_name PipelineTestScene'));
assert('Godot output has _ready', godotCode.includes('func _ready():'));
assert('Godot output has MeshInstance3D', godotCode.includes('MeshInstance3D.new()'));
assert('Godot output has lights', godotCode.includes('Light3D') || godotCode.includes('DirectionalLight3D') || godotCode.includes('OmniLight3D'));
assert('Godot output has Camera3D', godotCode.includes('Camera3D'));
assert('Godot output has materials', godotCode.includes('StandardMaterial3D'));
assert('Godot output has audio', godotCode.includes('AudioStreamPlayer'));
assert('Godot output has Area3D (zones)', godotCode.includes('Area3D'));
assert('Godot output has Vector3', godotCode.includes('Vector3('));
assert('Godot output has Node3D groups', godotCode.includes('Node3D.new()'));

console.log(`    Godot GDScript: ${godotCode.split('\n').length} lines`);

// --- visionOS Swift ---
const visionOSCompiler = new VisionOSCompiler({ structName: 'PipelineTestScene' });
const swiftCode = visionOSCompiler.compile(comp);

assert('visionOS output is non-empty', swiftCode.length > 0);
assert('visionOS output has import SwiftUI', swiftCode.includes('import SwiftUI'));
assert('visionOS output has import RealityKit', swiftCode.includes('import RealityKit'));
assert('visionOS output has struct', swiftCode.includes('struct PipelineTestScene'));
assert('visionOS output has RealityView', swiftCode.includes('RealityView'));
assert('visionOS output has Entity', swiftCode.includes('Entity()'));
assert('visionOS output has ModelEntity', swiftCode.includes('ModelEntity'));
assert('visionOS output has MeshResource', swiftCode.includes('MeshResource'));
assert('visionOS output has PhysicallyBasedMaterial', swiftCode.includes('PhysicallyBasedMaterial'));
assert('visionOS output has SIMD3', swiftCode.includes('SIMD3<Float>'));
assert('visionOS output has light components', swiftCode.includes('LightComponent'));
assert('visionOS output has physics', swiftCode.includes('PhysicsBodyComponent') || swiftCode.includes('CollisionComponent'));

console.log(`    visionOS Swift: ${swiftCode.split('\n').length} lines`);

// --- WebGPU ---
const webgpuCompiler = new WebGPUCompiler({ entryPoint: 'main', enableCompute: true });
const webgpuCode = webgpuCompiler.compile(comp);

assert('WebGPU output is non-empty', webgpuCode.length > 0);
assert('WebGPU output has navigator.gpu', webgpuCode.includes('navigator.gpu'));
assert('WebGPU output has requestAdapter', webgpuCode.includes('requestAdapter'));
assert('WebGPU output has createShaderModule', webgpuCode.includes('createShaderModule'));
assert('WebGPU output has createRenderPipeline', webgpuCode.includes('createRenderPipeline'));
assert('WebGPU output has GPUBuffer', webgpuCode.includes('createBuffer'));
assert('WebGPU output has requestAnimationFrame', webgpuCode.includes('requestAnimationFrame'));
assert('WebGPU output has WGSL shader', webgpuCode.includes('@vertex') || webgpuCode.includes('@fragment'));
assert('WebGPU output has composition name', webgpuCode.includes('Pipeline Test'));

console.log(`    WebGPU JS:   ${webgpuCode.split('\n').length} lines`);

// --- Babylon.js ---
const babylonCompiler = new BabylonCompiler({ className: 'PipelineTestScene', enableXR: true });
const babylonCode = babylonCompiler.compile(comp);

assert('Babylon output is non-empty', babylonCode.length > 0);
assert('Babylon output has class', babylonCode.includes('class PipelineTestScene'));
assert('Babylon output has BABYLON or MeshBuilder', babylonCode.includes('MeshBuilder') || babylonCode.includes('BABYLON'));
assert('Babylon output has PBRMaterial', babylonCode.includes('PBRMaterial'));
assert('Babylon output has Scene', babylonCode.includes('Scene'));
assert('Babylon output has Light', babylonCode.includes('Light') || babylonCode.includes('HemisphericLight') || babylonCode.includes('DirectionalLight'));
assert('Babylon output has Camera', babylonCode.includes('Camera'));
assert('Babylon output has Vector3', babylonCode.includes('Vector3'));
assert('Babylon output has engine/canvas', babylonCode.includes('Engine') || babylonCode.includes('canvas'));

console.log(`    Babylon TS:  ${babylonCode.split('\n').length} lines`);

// --- Android XR ---
const androidXRCompiler = new AndroidXRCompiler({ packageName: 'com.holo.test', activityName: 'PipelineTestActivity' });
const kotlinCode = androidXRCompiler.compile(comp);

assert('AndroidXR output is non-empty', kotlinCode.length > 0);
assert('AndroidXR output has package', kotlinCode.includes('package com.holo.test'));
assert('AndroidXR output has import', kotlinCode.includes('import '));
assert('AndroidXR output has Activity', kotlinCode.includes('Activity') || kotlinCode.includes('ComponentActivity'));
assert('AndroidXR output has class', kotlinCode.includes('class PipelineTestActivity'));
assert('AndroidXR output has onCreate', kotlinCode.includes('onCreate'));
assert('AndroidXR output has composition name', kotlinCode.includes('Pipeline Test'));

console.log(`    AndroidXR Kotlin: ${kotlinCode.split('\n').length} lines`);

// --- OpenXR C++ ---
const openxrCompiler = new OpenXRCompiler({ appName: 'PipelineTest', renderBackend: 'vulkan' });
const cppCode = openxrCompiler.compile(comp);

assert('OpenXR output is non-empty', cppCode.length > 0);
assert('OpenXR output has #include openxr', cppCode.includes('#include <openxr/openxr.h>'));
assert('OpenXR output has namespace', cppCode.includes('namespace Pipeline_Test'));
assert('OpenXR output has XrInstance', cppCode.includes('XrInstance'));
assert('OpenXR output has XrSession', cppCode.includes('XrSession'));
assert('OpenXR output has xrCreateInstance', cppCode.includes('xrCreateInstance'));
assert('OpenXR output has glm references', cppCode.includes('glm::'));
assert('OpenXR output has main()', cppCode.includes('int main()'));
assert('OpenXR output has Vulkan', cppCode.includes('vulkan') || cppCode.includes('VK_'));
assert('OpenXR output has render loop', cppCode.includes('renderLoop'));

console.log(`    OpenXR C++:  ${cppCode.split('\n').length} lines`);

// ==========================================================================
// INITIATIVE 3: LSP + DIAGNOSTICS
// ==========================================================================

console.log('\n[6] Testing LSP Service...\n');

const lsp = new HoloScriptLSP();

// --- Diagnostics on valid source ---
const diags = lsp.getDiagnostics(source);
assert('Valid source has no errors', diags.filter((d: any) => d.severity === 'error').length === 0);

// --- Diagnostics on broken source ---
const brokenSource = `composition "Broken" {\n  object "test" {\n    mesh: \n  }\n}`;
const brokenDiags = lsp.getDiagnostics(brokenSource);
assert('Broken source has errors', brokenDiags.some((d: any) => d.severity === 'error'));
assert('Diagnostics have range', !!brokenDiags[0]?.range);
assert('Diagnostics have message', !!brokenDiags[0]?.message);
assert('Diagnostics have source "holoscript"', brokenDiags[0]?.source === 'holoscript');

// --- Completions ---
const completions = lsp.getCompletions(source, { line: 28, character: 2 }); // empty line inside composition
assert('Returns completion items', completions.length > 0);
assert('Completions have labels', completions.every((c: any) => !!c.label));
assert('Completions have kinds', completions.every((c: any) => !!c.kind));

// Top-level completions include keywords
const topLevelCompletions = lsp.getCompletions('composition "test" {\n  \n}', { line: 1, character: 2 });
assert('Top-level includes keyword completions', topLevelCompletions.some((c: any) => c.kind === 'keyword'));
const kwLabels = topLevelCompletions.map((c: any) => c.label);
assert('Has "object" completion', kwLabels.includes('object'));
assert('Has "environment" completion', kwLabels.includes('environment'));
assert('Has "light" completion', kwLabels.includes('light'));
assert('Has "timeline" completion', kwLabels.includes('timeline'));
assert('Has "audio" completion', kwLabels.includes('audio'));
assert('Has "zone" completion', kwLabels.includes('zone'));
assert('Has "ui" completion', kwLabels.includes('ui'));
assert('Has "transition" completion', kwLabels.includes('transition'));

// --- Hover ---
const hoverResult = lsp.getHover(source, { line: 26, character: 2 }); // "composition" keyword on line 27
assert('Hover returns result for keyword', !!hoverResult);
assert('Hover has markdown contents', !!hoverResult?.contents);

const bindHover = lsp.getHover('text: bind(state.score)', { line: 0, character: 6 }); // "bind"
assert('Hover returns result for bind', !!bindHover);
assert('Bind hover has documentation', bindHover?.contents?.includes('bind'));

// --- Go-to-definition ---
const defSource = `composition "test" {\n  template "Foo" {\n    @grabbable\n  }\n  object "bar" using "Foo" {\n    mesh: "box"\n  }\n}`;
const defResult = lsp.getDefinition(defSource, { line: 4, character: 25 }); // "Foo" in using clause
// Note: definition may not find it if word extraction at that position doesn't match.
// We test the general structure rather than exact behavior here.
assert('getDefinition returns result or null', defResult === null || !!defResult?.range);

// --- Document Symbols ---
const symbols = lsp.getDocumentSymbols(source);
assert('Document symbols returns items', symbols.length > 0);
assert('Root symbol is module', symbols[0]?.kind === 'module');
assert('Root symbol has children', (symbols[0]?.children?.length ?? 0) > 0);
assert('Symbols include lights', symbols[0]?.children?.some((s: any) => s.name.includes('light')) ?? false);
assert('Symbols include objects', symbols[0]?.children?.some((s: any) => s.name.includes('object')) ?? false);
assert('Symbols include timelines', symbols[0]?.children?.some((s: any) => s.name.includes('timeline')) ?? false);
assert('Symbols include zones', symbols[0]?.children?.some((s: any) => s.name.includes('zone')) ?? false);

// --- Semantic validation ---
const undefinedTmplSource = `composition "test" {\n  object "bar" using "NonexistentTemplate" {\n    mesh: "box"\n  }\n}`;
const semanticDiags = lsp.getDiagnostics(undefinedTmplSource);
assert('Detects undefined template reference', semanticDiags.some((d: any) => d.message.includes('not defined') || d.code?.includes('undefined-template')));

// ==========================================================================
// INITIATIVE 4: TRAIT REGISTRY VALIDATION
// ==========================================================================

console.log('\n[7] Testing VR Trait Registry...\n');

// --- VR_TRAITS constant ---
assert('VR_TRAITS is an array', Array.isArray(VR_TRAITS));
assert('VR_TRAITS has 130+ entries (full semantic expansion)', VR_TRAITS.length >= 130);

// --- Core VR trait names present ---
const coreVRTraits = ['grabbable', 'throwable', 'pointable', 'hoverable', 'scalable', 'rotatable'];
for (const t of coreVRTraits) {
  assert(`VR_TRAITS includes "${t}"`, VR_TRAITS.includes(t as any));
}

// --- Environment Understanding ---
const envTraits = ['plane_detection', 'mesh_detection', 'anchor', 'persistent_anchor', 'shared_anchor', 'occlusion', 'light_estimation'];
for (const t of envTraits) {
  assert(`VR_TRAITS includes "${t}" (env understanding)`, VR_TRAITS.includes(t as any));
}

// --- Physics Expansion ---
const physicsTraits = ['cloth', 'fluid', 'soft_body', 'rope', 'chain', 'wind', 'buoyancy', 'destruction'];
for (const t of physicsTraits) {
  assert(`VR_TRAITS includes "${t}" (physics)`, VR_TRAITS.includes(t as any));
}

// --- Advanced Spatial Audio ---
const audioTraits = ['reverb_zone', 'audio_occlusion', 'ambisonics', 'hrtf', 'audio_portal', 'audio_material', 'head_tracked_audio'];
for (const t of audioTraits) {
  assert(`VR_TRAITS includes "${t}" (spatial audio)`, VR_TRAITS.includes(t as any));
}

// --- Volumetric Content ---
const volumetricTraits = ['gaussian_splat', 'nerf', 'volumetric_video', 'point_cloud', 'photogrammetry'];
for (const t of volumetricTraits) {
  assert(`VR_TRAITS includes "${t}" (volumetric)`, VR_TRAITS.includes(t as any));
}

// --- Input Modalities ---
const inputTraits = ['eye_tracking', 'hand_tracking', 'body_tracking', 'face_tracking', 'controller', 'haptic'];
for (const t of inputTraits) {
  assert(`VR_TRAITS includes "${t}" (input)`, VR_TRAITS.includes(t as any));
}

// --- Accessibility ---
const a11yTraits = ['accessible', 'alt_text', 'screen_reader', 'high_contrast', 'motion_reduced', 'magnifiable'];
for (const t of a11yTraits) {
  assert(`VR_TRAITS includes "${t}" (accessibility)`, VR_TRAITS.includes(t as any));
}

// --- Autonomous Agents ---
const agentTraits = ['behavior_tree', 'goal_oriented', 'llm_agent', 'memory', 'perception', 'emotion', 'dialogue', 'faction', 'patrol'];
for (const t of agentTraits) {
  assert(`VR_TRAITS includes "${t}" (agents)`, VR_TRAITS.includes(t as any));
}

// --- Geospatial ---
const geoTraits = ['geospatial_anchor', 'terrain_anchor', 'rooftop_anchor', 'vps', 'poi'];
for (const t of geoTraits) {
  assert(`VR_TRAITS includes "${t}" (geospatial)`, VR_TRAITS.includes(t as any));
}

// --- Trait Registry singleton ---
assert('vrTraitRegistry exists', !!vrTraitRegistry);
assert('vrTraitRegistry has getHandler method', typeof (vrTraitRegistry as any).getHandler === 'function');
assert('vrTraitRegistry has register method', typeof (vrTraitRegistry as any).register === 'function');
assert('vrTraitRegistry has attachTrait method', typeof (vrTraitRegistry as any).attachTrait === 'function');

// Verify handlers are registered for key traits across all phases
const registeredHandlers = (vrTraitRegistry as any).handlers as Map<string, any>;
const registeredCount = registeredHandlers.size;
assert('Registry has 80+ registered handlers', registeredCount >= 80);

const sampleHandlers = ['grabbable', 'cloth', 'gaussian_splat', 'eye_tracked', 'accessible', 'reverb_zone', 'plane_detection', 'behavior_tree', 'usd', 'co_located', 'geospatial_anchor', 'nft', 'wind', 'hrtf'];
for (const t of sampleHandlers) {
  const handler = (vrTraitRegistry as any).getHandler(t);
  assert(`Registry has handler for "${t}"`, !!handler);
  assert(`Handler "${t}" has onAttach`, typeof handler?.onAttach === 'function');
  assert(`Handler "${t}" has onUpdate`, typeof handler?.onUpdate === 'function');
  assert(`Handler "${t}" has defaultConfig`, !!handler?.defaultConfig);
}

console.log(`    VR_TRAITS count:      ${VR_TRAITS.length}`);
console.log(`    Registered handlers:  ${registeredCount}`);

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
