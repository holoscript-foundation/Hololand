/**
 * VRScenePerformanceBudget
 *
 * Analyzes HoloScript compositions for VR frame budget compliance.
 * Calculates draw call costs, mesh complexity, animation overhead,
 * and provides batching recommendations for 90Hz VR rendering.
 *
 * TARGET: 11.1ms frame budget at 90Hz
 *
 * BUDGET ALLOCATION (Quest 3 baseline):
 * - Scene rendering: 6.0ms (54%)
 * - Post-processing: 1.5ms (13.5%)
 * - Volumetric effects: 2.0ms (18%)
 * - Animation/physics: 1.0ms (9%)
 * - Headroom: 0.6ms (5.5%)
 *
 * @module VRScenePerformanceBudget
 */

import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

/**
 * VR target platform for budget calibration
 */
export type VRTargetPlatform = 'quest2' | 'quest3' | 'questPro' | 'pcvr' | 'desktop';

/**
 * Geometry complexity category
 */
export type GeometryComplexity = 'simple' | 'standard' | 'procedural' | 'volumetric';

/**
 * Mesh category for batching analysis
 */
export interface MeshCategory {
  /** Category name */
  name: string;
  /** Material type (for batching compatibility) */
  materialType: string;
  /** Geometry type */
  geometryType: string;
  /** Mesh IDs in this category */
  meshIds: string[];
  /** Whether meshes in this category are batchable */
  batchable: boolean;
  /** Estimated draw calls after batching */
  batchedDrawCalls: number;
  /** Estimated vertex count */
  totalVertices: number;
  /** Has animation (prevents static batching) */
  animated: boolean;
  /** Has transparency (separate pass required) */
  transparent: boolean;
}

/**
 * Per-frame budget allocation in milliseconds
 */
export interface FrameBudgetAllocation {
  /** Total frame budget (11.1ms at 90Hz, 16.6ms at 60Hz) */
  totalBudgetMs: number;
  /** Scene rendering (geometry + materials) */
  sceneRenderMs: number;
  /** Post-processing (bloom, tone mapping, etc.) */
  postProcessingMs: number;
  /** Volumetric effects (fire, smoke, fog) */
  volumetricEffectsMs: number;
  /** Animation and physics updates */
  animationPhysicsMs: number;
  /** Safety headroom */
  headroomMs: number;
}

/**
 * Draw call analysis result
 */
export interface DrawCallAnalysis {
  /** Total meshes in scene */
  totalMeshes: number;
  /** Unbatched draw calls (1 per mesh) */
  unbatchedDrawCalls: number;
  /** Estimated draw calls after batching */
  batchedDrawCalls: number;
  /** Draw call reduction percentage */
  reductionPercent: number;
  /** Mesh categories for batching */
  categories: MeshCategory[];
  /** Transparent objects (separate pass) */
  transparentCount: number;
  /** Animated objects (cannot static batch) */
  animatedCount: number;
  /** Instancable groups (identical geometry + material) */
  instancableGroups: number;
  /** Estimated GPU memory (MB) */
  estimatedMemoryMB: number;
}

/**
 * Animation overhead analysis
 */
export interface AnimationAnalysis {
  /** Total animation sequences */
  totalSequences: number;
  /** Keyframe animations */
  keyframeSequences: number;
  /** Estimated CPU time per frame (ms) */
  estimatedCpuTimeMs: number;
  /** Animations that can be GPU-driven */
  gpuDrivableCount: number;
  /** Animations requiring CPU evaluation */
  cpuBoundCount: number;
  /** Recommendation for animation budget */
  recommendation: string;
}

/**
 * Volumetric effects analysis
 */
export interface VolumetricAnalysis {
  /** Total volumetric objects (fire, smoke, haze) */
  totalObjects: number;
  /** Fire layer count */
  fireLayers: number;
  /** Ember/particle count */
  emberCount: number;
  /** Smoke wisp count */
  smokeCount: number;
  /** Estimated GPU time (ms) */
  estimatedGpuTimeMs: number;
  /** Whether within 2ms budget */
  withinBudget: boolean;
  /** Recommendation */
  recommendation: string;
}

/**
 * Lighting analysis
 */
export interface LightingAnalysis {
  /** Total light sources */
  totalLights: number;
  /** Point lights (most expensive) */
  pointLights: number;
  /** Directional lights */
  directionalLights: number;
  /** Ambient lights (cheapest) */
  ambientLights: number;
  /** Shadow-casting lights */
  shadowCasters: number;
  /** Estimated GPU overhead (ms) */
  estimatedGpuOverheadMs: number;
  /** Recommendation */
  recommendation: string;
}

/**
 * Complete scene performance budget analysis
 */
export interface ScenePerformanceBudget {
  /** Scene name */
  sceneName: string;
  /** Target platform */
  platform: VRTargetPlatform;
  /** Target frame rate */
  targetFPS: number;
  /** Frame budget allocation */
  budget: FrameBudgetAllocation;
  /** Draw call analysis */
  drawCalls: DrawCallAnalysis;
  /** Animation analysis */
  animation: AnimationAnalysis;
  /** Volumetric effects analysis */
  volumetric: VolumetricAnalysis;
  /** Lighting analysis */
  lighting: LightingAnalysis;
  /** Overall compliance */
  withinBudget: boolean;
  /** Total estimated frame time (ms) */
  estimatedFrameTimeMs: number;
  /** Budget utilization percentage */
  budgetUtilization: number;
  /** Priority-ranked optimization recommendations */
  recommendations: OptimizationRecommendation[];
  /** Timestamp */
  analyzedAt: number;
}

/**
 * Optimization recommendation
 */
export interface OptimizationRecommendation {
  /** Priority (1 = highest) */
  priority: number;
  /** Category */
  category: 'draw-calls' | 'animation' | 'volumetric' | 'lighting' | 'memory' | 'geometry';
  /** Human-readable recommendation */
  message: string;
  /** Estimated time savings (ms) */
  estimatedSavingsMs: number;
  /** Implementation difficulty */
  difficulty: 'easy' | 'medium' | 'hard';
}

// =============================================================================
// PLATFORM BUDGETS
// =============================================================================

const PLATFORM_BUDGETS: Record<VRTargetPlatform, FrameBudgetAllocation> = {
  quest2: {
    totalBudgetMs: 11.1,
    sceneRenderMs: 5.0,
    postProcessingMs: 1.0,
    volumetricEffectsMs: 1.5,
    animationPhysicsMs: 0.8,
    headroomMs: 2.8,
  },
  quest3: {
    totalBudgetMs: 11.1,
    sceneRenderMs: 6.0,
    postProcessingMs: 1.5,
    volumetricEffectsMs: 2.0,
    animationPhysicsMs: 1.0,
    headroomMs: 0.6,
  },
  questPro: {
    totalBudgetMs: 11.1,
    sceneRenderMs: 6.5,
    postProcessingMs: 1.5,
    volumetricEffectsMs: 2.0,
    animationPhysicsMs: 1.0,
    headroomMs: 0.1,
  },
  pcvr: {
    totalBudgetMs: 11.1,
    sceneRenderMs: 7.0,
    postProcessingMs: 2.0,
    volumetricEffectsMs: 3.0,
    animationPhysicsMs: 1.5,
    headroomMs: -2.4, // Can exceed budget on powerful GPUs
  },
  desktop: {
    totalBudgetMs: 16.6, // 60Hz target
    sceneRenderMs: 10.0,
    postProcessingMs: 3.0,
    volumetricEffectsMs: 4.0,
    animationPhysicsMs: 2.0,
    headroomMs: -2.4,
  },
};

/**
 * Draw call cost estimates per platform (microseconds per draw call)
 */
const DRAW_CALL_COST_US: Record<VRTargetPlatform, number> = {
  quest2: 45,  // ~22K draw calls/frame max
  quest3: 35,  // ~28K draw calls/frame max
  questPro: 30,
  pcvr: 15,
  desktop: 10,
};

/**
 * Vertex processing cost per 1K vertices (microseconds)
 */
const VERTEX_COST_PER_1K_US: Record<VRTargetPlatform, number> = {
  quest2: 12,
  quest3: 8,
  questPro: 7,
  pcvr: 3,
  desktop: 2,
};

// =============================================================================
// VERTEX COUNT ESTIMATES BY GEOMETRY TYPE
// =============================================================================

const GEOMETRY_VERTEX_ESTIMATES: Record<string, number> = {
  sphere: 482,    // 16x16 segments
  cube: 24,       // 6 faces x 4 verts
  cylinder: 128,  // 16 segments
  cone: 68,       // 16 segments
  torus: 512,     // 16x16
  hull: 1024,     // resolution 48 hull
  spline: 640,    // 64 segments x 10 radial
  membrane: 882,  // 20 subdivisions
};

// =============================================================================
// ANALYZER
// =============================================================================

/**
 * Analyze a HoloScript composition for VR performance budget compliance.
 *
 * @param sceneName - Name of the composition
 * @param meshes - Array of mesh descriptors from parsed composition
 * @param platform - Target VR platform
 * @returns Complete performance budget analysis
 */
export function analyzeScenePerformanceBudget(
  sceneName: string,
  meshes: SceneMeshDescriptor[],
  platform: VRTargetPlatform = 'quest3'
): ScenePerformanceBudget {
  const budget = PLATFORM_BUDGETS[platform];
  const drawCallCostUs = DRAW_CALL_COST_US[platform];
  const vertexCostPer1K = VERTEX_COST_PER_1K_US[platform];

  // 1. Categorize meshes
  const categories = categorizeMeshes(meshes);

  // 2. Draw call analysis
  const drawCalls = analyzeDrawCalls(meshes, categories, drawCallCostUs, vertexCostPer1K);

  // 3. Animation analysis
  const animation = analyzeAnimations(meshes);

  // 4. Volumetric effects analysis
  const volumetric = analyzeVolumetricEffects(meshes, budget);

  // 5. Lighting analysis
  const lighting = analyzeLighting(meshes);

  // 6. Calculate total estimated frame time
  const sceneDrawCallTimeMs = (drawCalls.batchedDrawCalls * drawCallCostUs) / 1000;
  const sceneVertexTimeMs = (drawCalls.estimatedMemoryMB * 1024 * vertexCostPer1K) / 1000 / 1024;
  const estimatedSceneTimeMs = sceneDrawCallTimeMs + sceneVertexTimeMs;
  const estimatedFrameTimeMs =
    estimatedSceneTimeMs +
    animation.estimatedCpuTimeMs +
    volumetric.estimatedGpuTimeMs +
    lighting.estimatedGpuOverheadMs +
    1.5; // Post-processing baseline

  const withinBudget = estimatedFrameTimeMs <= budget.totalBudgetMs;
  const budgetUtilization = (estimatedFrameTimeMs / budget.totalBudgetMs) * 100;

  // 7. Generate recommendations
  const recommendations = generateRecommendations(
    drawCalls,
    animation,
    volumetric,
    lighting,
    budget,
    estimatedFrameTimeMs,
    platform
  );

  const result: ScenePerformanceBudget = {
    sceneName,
    platform,
    targetFPS: platform === 'desktop' ? 60 : 90,
    budget,
    drawCalls,
    animation,
    volumetric,
    lighting,
    withinBudget,
    estimatedFrameTimeMs,
    budgetUtilization,
    recommendations,
    analyzedAt: Date.now(),
  };

  logger.info('[VRScenePerformanceBudget] Analysis complete', {
    scene: sceneName,
    platform,
    meshes: drawCalls.totalMeshes,
    unbatchedDrawCalls: drawCalls.unbatchedDrawCalls,
    batchedDrawCalls: drawCalls.batchedDrawCalls,
    estimatedFrameTimeMs: estimatedFrameTimeMs.toFixed(2),
    withinBudget,
    budgetUtilization: budgetUtilization.toFixed(1) + '%',
  });

  return result;
}

/**
 * Mesh descriptor from parsed HoloScript composition
 */
export interface SceneMeshDescriptor {
  id: string;
  geometryType: string; // sphere, cube, cone, cylinder, torus, hull, spline, membrane
  materialType: string; // skin_dark, bone, leather, brushed_steel, neon, stone, default
  position: [number, number, number];
  scale?: [number, number, number];
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  transparent?: boolean;
  metalness?: number;
  roughness?: number;
  animated?: boolean;
  animationNames?: string[];
  isLight?: boolean;
  lightType?: 'point' | 'directional' | 'ambient';
  lightIntensity?: number;
  resolution?: number; // For hull/membrane procedural geometry
  subdivisions?: number;
  /** Custom tags for categorization */
  tags?: string[];
}

// =============================================================================
// INTERNAL ANALYSIS FUNCTIONS
// =============================================================================

function categorizeMeshes(meshes: SceneMeshDescriptor[]): MeshCategory[] {
  const categoryMap = new Map<string, MeshCategory>();

  for (const mesh of meshes) {
    if (mesh.isLight) continue; // Lights are not meshes

    const isTransparent = mesh.transparent || (mesh.opacity !== undefined && mesh.opacity < 1.0);
    const isAnimated = mesh.animated || (mesh.animationNames && mesh.animationNames.length > 0);

    // Group key: materialType + geometryType + transparent + animated
    const key = `${mesh.materialType}|${mesh.geometryType}|${isTransparent}|${isAnimated}`;

    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        name: `${mesh.materialType}_${mesh.geometryType}`,
        materialType: mesh.materialType,
        geometryType: mesh.geometryType,
        meshIds: [],
        batchable: !isAnimated, // Static meshes can be batched
        batchedDrawCalls: 1, // Will be calculated
        totalVertices: 0,
        animated: !!isAnimated,
        transparent: isTransparent,
      });
    }

    const category = categoryMap.get(key)!;
    category.meshIds.push(mesh.id);

    const vertexEstimate = GEOMETRY_VERTEX_ESTIMATES[mesh.geometryType] || 200;
    category.totalVertices += vertexEstimate;
  }

  // Calculate batched draw calls per category
  for (const category of categoryMap.values()) {
    if (category.batchable && category.meshIds.length > 1) {
      // Static batching: all meshes in category = 1 draw call
      // But limit batch size to prevent oversized VBOs
      const MAX_BATCH_VERTICES = 65536; // 16-bit index limit
      category.batchedDrawCalls = Math.max(
        1,
        Math.ceil(category.totalVertices / MAX_BATCH_VERTICES)
      );
    } else if (category.animated) {
      // Animated meshes: use instancing if same geometry
      if (category.geometryType === category.geometryType && category.meshIds.length > 3) {
        category.batchedDrawCalls = 1; // Instanced draw
      } else {
        category.batchedDrawCalls = category.meshIds.length; // Individual draws
      }
    } else {
      category.batchedDrawCalls = category.meshIds.length;
    }
  }

  return Array.from(categoryMap.values());
}

function analyzeDrawCalls(
  meshes: SceneMeshDescriptor[],
  categories: MeshCategory[],
  drawCallCostUs: number,
  vertexCostPer1K: number
): DrawCallAnalysis {
  const nonLightMeshes = meshes.filter(m => !m.isLight);
  const unbatchedDrawCalls = nonLightMeshes.length;
  const batchedDrawCalls = categories.reduce((sum, c) => sum + c.batchedDrawCalls, 0);
  const reductionPercent = unbatchedDrawCalls > 0
    ? ((unbatchedDrawCalls - batchedDrawCalls) / unbatchedDrawCalls) * 100
    : 0;

  const transparentCount = nonLightMeshes.filter(
    m => m.transparent || (m.opacity !== undefined && m.opacity < 1.0)
  ).length;

  const animatedCount = nonLightMeshes.filter(
    m => m.animated || (m.animationNames && m.animationNames.length > 0)
  ).length;

  // Count instancable groups (same geometry + material, 3+ instances)
  const instancableGroups = categories.filter(
    c => c.meshIds.length >= 3 && !c.animated
  ).length;

  // Estimate memory
  const totalVertices = categories.reduce((sum, c) => sum + c.totalVertices, 0);
  const estimatedMemoryMB = (totalVertices * 32) / (1024 * 1024); // 32 bytes per vertex (pos + normal + uv)

  return {
    totalMeshes: nonLightMeshes.length,
    unbatchedDrawCalls,
    batchedDrawCalls,
    reductionPercent,
    categories,
    transparentCount,
    animatedCount,
    instancableGroups,
    estimatedMemoryMB,
  };
}

function analyzeAnimations(meshes: SceneMeshDescriptor[]): AnimationAnalysis {
  const animatedMeshes = meshes.filter(
    m => m.animated || (m.animationNames && m.animationNames.length > 0)
  );

  const allAnimNames = new Set<string>();
  for (const m of animatedMeshes) {
    if (m.animationNames) {
      for (const name of m.animationNames) {
        allAnimNames.add(name);
      }
    }
  }

  const totalSequences = allAnimNames.size;

  // Simple keyframe animations (scale, position, rotation, opacity) can be GPU-driven
  // Complex animations need CPU evaluation
  const gpuDrivableCount = Math.floor(totalSequences * 0.7); // Most HoloScript keyframes are GPU-drivable
  const cpuBoundCount = totalSequences - gpuDrivableCount;

  // Estimate: ~0.02ms per CPU-bound animation per frame
  const estimatedCpuTimeMs = cpuBoundCount * 0.02 + gpuDrivableCount * 0.005;

  let recommendation = '';
  if (totalSequences > 20) {
    recommendation = 'High animation count. Consider LOD-gating distant animations.';
  } else if (totalSequences > 10) {
    recommendation = 'Moderate animation count. GPU-drive simple keyframes for best performance.';
  } else {
    recommendation = 'Animation count within budget.';
  }

  return {
    totalSequences,
    keyframeSequences: totalSequences,
    estimatedCpuTimeMs,
    gpuDrivableCount,
    cpuBoundCount,
    recommendation,
  };
}

function analyzeVolumetricEffects(
  meshes: SceneMeshDescriptor[],
  budget: FrameBudgetAllocation
): VolumetricAnalysis {
  // Identify fire/ember/smoke objects by emissive properties and naming
  const fireObjects = meshes.filter(m => {
    const id = m.id.toLowerCase();
    return (
      id.includes('fire') ||
      id.includes('flame') ||
      (m.emissiveIntensity && m.emissiveIntensity >= 2.0 && id.includes('core'))
    );
  });

  const emberObjects = meshes.filter(m => m.id.toLowerCase().includes('ember'));
  const smokeObjects = meshes.filter(m => m.id.toLowerCase().includes('smoke'));
  const hazeObjects = meshes.filter(m => m.id.toLowerCase().includes('haze'));
  const tendrilObjects = meshes.filter(m => m.id.toLowerCase().includes('tendril'));

  const totalObjects =
    fireObjects.length + emberObjects.length + smokeObjects.length +
    hazeObjects.length + tendrilObjects.length;

  // Estimate GPU time:
  // - Single volumetric fire shader: ~1.5ms (replaces all fire cone meshes)
  // - Embers as GPU particles: ~0.2ms
  // - Smoke as billboards: ~0.1ms
  // - Heat haze post-process: ~0.3ms
  const useVolumetricShader = fireObjects.length >= 3;
  const estimatedGpuTimeMs = useVolumetricShader
    ? 1.5 + 0.2 + 0.1 + 0.3 // Single volumetric pass
    : fireObjects.length * 0.15 + // Individual mesh draws
      emberObjects.length * 0.05 +
      smokeObjects.length * 0.03 +
      hazeObjects.length * 0.1;

  const withinBudget = estimatedGpuTimeMs <= budget.volumetricEffectsMs;

  let recommendation = '';
  if (useVolumetricShader) {
    recommendation = `Replace ${fireObjects.length} fire meshes with single VolumetricFireRenderer pass (~1.5ms). ` +
      `Convert ${emberObjects.length} embers to GPU particle system. ` +
      `This saves ${(fireObjects.length * 0.15 - 1.5).toFixed(1)}ms vs individual mesh draws.`;
  } else {
    recommendation = 'Few fire objects. Individual mesh rendering is acceptable.';
  }

  return {
    totalObjects,
    fireLayers: fireObjects.length,
    emberCount: emberObjects.length,
    smokeCount: smokeObjects.length,
    estimatedGpuTimeMs,
    withinBudget,
    recommendation,
  };
}

function analyzeLighting(meshes: SceneMeshDescriptor[]): LightingAnalysis {
  const lights = meshes.filter(m => m.isLight);
  const pointLights = lights.filter(m => m.lightType === 'point').length;
  const directionalLights = lights.filter(m => m.lightType === 'directional').length;
  const ambientLights = lights.filter(m => m.lightType === 'ambient').length;

  // Shadow-casting lights (typically point + directional)
  const shadowCasters = Math.min(pointLights + directionalLights, 2); // Cap at 2 for VR

  // Estimate: point lights ~0.3ms each, directional ~0.2ms, ambient ~0.01ms, shadows ~0.5ms each
  const estimatedGpuOverheadMs =
    pointLights * 0.3 +
    directionalLights * 0.2 +
    ambientLights * 0.01 +
    shadowCasters * 0.5;

  let recommendation = '';
  if (pointLights > 3) {
    recommendation = `${pointLights} point lights is expensive. Merge close lights or use light probes.`;
  } else if (shadowCasters > 1) {
    recommendation = 'Multiple shadow casters. Consider single cascade shadow for VR.';
  } else {
    recommendation = 'Lighting within budget.';
  }

  return {
    totalLights: lights.length,
    pointLights,
    directionalLights,
    ambientLights,
    shadowCasters,
    estimatedGpuOverheadMs,
    recommendation,
  };
}

function generateRecommendations(
  drawCalls: DrawCallAnalysis,
  animation: AnimationAnalysis,
  volumetric: VolumetricAnalysis,
  lighting: LightingAnalysis,
  budget: FrameBudgetAllocation,
  estimatedFrameTimeMs: number,
  platform: VRTargetPlatform
): OptimizationRecommendation[] {
  const recommendations: OptimizationRecommendation[] = [];

  // Draw call recommendations
  if (drawCalls.unbatchedDrawCalls > 100) {
    recommendations.push({
      priority: 1,
      category: 'draw-calls',
      message: `Batch ${drawCalls.unbatchedDrawCalls} meshes to ${drawCalls.batchedDrawCalls} draw calls ` +
        `(${drawCalls.reductionPercent.toFixed(0)}% reduction). ` +
        `Group by material: ${drawCalls.categories.filter(c => c.batchable).length} batchable categories.`,
      estimatedSavingsMs: ((drawCalls.unbatchedDrawCalls - drawCalls.batchedDrawCalls) * DRAW_CALL_COST_US[platform]) / 1000,
      difficulty: 'medium',
    });
  }

  if (drawCalls.instancableGroups > 0) {
    const instancableMeshes = drawCalls.categories
      .filter(c => c.meshIds.length >= 3 && !c.animated)
      .reduce((sum, c) => sum + c.meshIds.length, 0);
    recommendations.push({
      priority: 2,
      category: 'draw-calls',
      message: `Use instanced rendering for ${drawCalls.instancableGroups} groups ` +
        `(${instancableMeshes} meshes). Teeth, spines, claws, and scales are ideal candidates.`,
      estimatedSavingsMs: (instancableMeshes * DRAW_CALL_COST_US[platform]) / 1000 * 0.8,
      difficulty: 'easy',
    });
  }

  // Volumetric recommendations
  if (volumetric.fireLayers >= 3) {
    recommendations.push({
      priority: 1,
      category: 'volumetric',
      message: volumetric.recommendation,
      estimatedSavingsMs: Math.max(0, volumetric.fireLayers * 0.15 - 1.5),
      difficulty: 'medium',
    });
  }

  // Animation recommendations
  if (animation.totalSequences > 10) {
    recommendations.push({
      priority: 3,
      category: 'animation',
      message: animation.recommendation,
      estimatedSavingsMs: animation.cpuBoundCount * 0.01,
      difficulty: 'easy',
    });
  }

  // Lighting recommendations
  if (lighting.pointLights > 3) {
    recommendations.push({
      priority: 2,
      category: 'lighting',
      message: lighting.recommendation,
      estimatedSavingsMs: (lighting.pointLights - 2) * 0.3,
      difficulty: 'easy',
    });
  }

  // Memory recommendations
  if (drawCalls.estimatedMemoryMB > 50) {
    recommendations.push({
      priority: 3,
      category: 'memory',
      message: `Estimated geometry memory: ${drawCalls.estimatedMemoryMB.toFixed(1)}MB. ` +
        `Consider LOD system to reduce distant geometry complexity.`,
      estimatedSavingsMs: 0, // Memory, not time
      difficulty: 'medium',
    });
  }

  // Geometry recommendations for procedural types
  const proceduralCategories = drawCalls.categories.filter(
    c => ['hull', 'spline', 'membrane'].includes(c.geometryType)
  );
  if (proceduralCategories.length > 0) {
    const totalProcVertices = proceduralCategories.reduce((sum, c) => sum + c.totalVertices, 0);
    recommendations.push({
      priority: 2,
      category: 'geometry',
      message: `${proceduralCategories.length} procedural geometry categories ` +
        `(${totalProcVertices.toLocaleString()} estimated vertices). ` +
        `Apply ProceduralGeometryLODManager for distance-based simplification (60-85% savings at distance).`,
      estimatedSavingsMs: (totalProcVertices * VERTEX_COST_PER_1K_US[platform]) / 1000 / 1000 * 0.7,
      difficulty: 'medium',
    });
  }

  // Sort by priority
  recommendations.sort((a, b) => a.priority - b.priority);

  return recommendations;
}

/**
 * Parse fire-dragon.holo mesh descriptors for budget analysis.
 *
 * This is a convenience function that extracts mesh descriptors from
 * the Inferno Wyrm composition for performance analysis.
 */
export function createDragonMeshDescriptors(): SceneMeshDescriptor[] {
  const meshes: SceneMeshDescriptor[] = [];

  // === BODY CORE ===
  meshes.push({
    id: 'TorsoHull', geometryType: 'hull', materialType: 'skin_dark',
    position: [0, 2.5, 0], color: '#1e0f3d', resolution: 48,
    animated: true, animationNames: ['breathe'],
  });
  meshes.push({ id: 'ChestPlate', geometryType: 'cube', materialType: 'brushed_steel', position: [0, -0.1, 0.9], color: '#2a1a50', metalness: 0.6 });

  // Ribs (4)
  for (const side of ['Left', 'Right']) {
    for (let i = 1; i <= 2; i++) {
      meshes.push({ id: `Rib${side}${i}`, geometryType: 'cylinder', materialType: 'bone', position: [0, 0, 0], color: '#1a0c35' });
    }
  }

  // Belly scales (8)
  for (let i = 1; i <= 8; i++) {
    meshes.push({ id: `BellyScale${i}`, geometryType: 'sphere', materialType: 'leather', position: [0, -0.5, 0], color: i % 2 === 1 ? '#3d2870' : '#352260' });
  }

  // Shoulder plates (2)
  meshes.push({ id: 'LeftShoulderPlate', geometryType: 'sphere', materialType: 'brushed_steel', position: [-1, 0.5, 0.3], color: '#3c1f7e', metalness: 0.5 });
  meshes.push({ id: 'RightShoulderPlate', geometryType: 'sphere', materialType: 'brushed_steel', position: [1, 0.5, 0.3], color: '#2a1a50', metalness: 0.5 });

  // === NECK ===
  meshes.push({ id: 'NeckSpline', geometryType: 'spline', materialType: 'skin_dark', position: [0, 0, 0], color: '#1e0f3d', animated: true, animationNames: ['neckWave'] });
  for (let i = 1; i <= 4; i++) {
    meshes.push({ id: `NeckSpine${i}`, geometryType: 'cone', materialType: 'default', position: [0, 3.4, 1.5], color: '#ff4400', emissive: '#ff2200', emissiveIntensity: 0.6 });
  }
  meshes.push({ id: 'NeckScale1', geometryType: 'sphere', materialType: 'leather', position: [0, 2.85, 1.7], color: '#3d2870' });
  meshes.push({ id: 'NeckScale2', geometryType: 'sphere', materialType: 'leather', position: [0, 3.25, 2.2], color: '#352260' });

  // === HEAD ===
  meshes.push({ id: 'SkullHull', geometryType: 'hull', materialType: 'skin_dark', position: [0, 4.5, 4.2], color: '#251548', resolution: 48, animated: true, animationNames: ['nod'] });

  // Eyes (8 meshes: 4 layers per eye)
  for (const side of ['Left', 'Right']) {
    meshes.push({ id: `${side}EyeSclera`, geometryType: 'sphere', materialType: 'default', position: [0, 0, 0], color: '#1a0a00' });
    meshes.push({ id: `${side}EyeIris`, geometryType: 'sphere', materialType: 'default', position: [0, 0, 0], color: '#ff6600', emissive: '#ff4400', emissiveIntensity: 1.5 });
    meshes.push({ id: `${side}EyePupil`, geometryType: 'sphere', materialType: 'default', position: [0, 0, 0], color: '#000000' });
    meshes.push({
      id: `${side}EyeGlow`, geometryType: 'sphere', materialType: 'default',
      position: [0, 0, 0], color: '#ff4400', emissive: '#ff2200', emissiveIntensity: 2.5,
      opacity: 0.25, transparent: true, animated: true, animationNames: ['eyeGlow'],
    });
  }

  // Nostrils (2)
  meshes.push({ id: 'LeftNostril', geometryType: 'sphere', materialType: 'default', position: [0, 0, 0], color: '#0a0520', emissive: '#ff2200', emissiveIntensity: 0.8 });
  meshes.push({ id: 'RightNostril', geometryType: 'sphere', materialType: 'default', position: [0, 0, 0], color: '#0a0520', emissive: '#ff2200', emissiveIntensity: 0.8 });

  // Ear fins (2)
  meshes.push({ id: 'LeftEarFin', geometryType: 'cone', materialType: 'leather', position: [0, 0, 0], color: '#cc2200', opacity: 0.7, transparent: true });
  meshes.push({ id: 'RightEarFin', geometryType: 'cone', materialType: 'leather', position: [0, 0, 0], color: '#cc2200', opacity: 0.7, transparent: true });

  // Upper teeth (6)
  for (let i = 1; i <= 5; i++) {
    meshes.push({ id: `UpperTooth${i}`, geometryType: 'cone', materialType: 'bone', position: [0, 0, 0], color: '#f5f0e0' });
  }
  meshes.push({ id: 'UpperFang', geometryType: 'cone', materialType: 'bone', position: [0, 0, 0], color: '#f5f0e0' });

  // Horns (2 spline + 4 crown cones)
  meshes.push({ id: 'LeftHorn', geometryType: 'spline', materialType: 'bone', position: [0, 0, 0], color: '#0d0520', metalness: 0.4, roughness: 0.2 });
  meshes.push({ id: 'RightHorn', geometryType: 'spline', materialType: 'bone', position: [0, 0, 0], color: '#0d0520', metalness: 0.4, roughness: 0.2 });
  for (let i = 1; i <= 4; i++) {
    meshes.push({ id: `CrownHorn${i}`, geometryType: 'cone', materialType: 'bone', position: [0, 0, 0], color: '#0d0520' });
  }

  // === JAW ===
  meshes.push({ id: 'Jaw', geometryType: 'cube', materialType: 'skin_dark', position: [0, 4.2, 4.6], color: '#2a1a50', animated: true, animationNames: ['chomp'] });
  for (let i = 1; i <= 5; i++) {
    meshes.push({ id: `LowerTooth${i}`, geometryType: 'cone', materialType: 'bone', position: [0, 0, 0], color: '#f5f0e0' });
  }
  meshes.push({ id: 'LowerFang', geometryType: 'cone', materialType: 'bone', position: [0, 0, 0], color: '#f5f0e0' });
  meshes.push({ id: 'Tongue', geometryType: 'sphere', materialType: 'skin_pale', position: [0, 0, 0], color: '#8b2252' });

  // === WINGS (2x symmetric) ===
  for (const side of ['Left', 'Right']) {
    const flapAnim = side === 'Left' ? 'flapLeft' : 'flapRight';
    meshes.push({ id: `${side}WingBone`, geometryType: 'spline', materialType: 'bone', position: [0, 0, 0], color: '#1a0c35', animated: true, animationNames: [flapAnim] });
    for (let f = 1; f <= 4; f++) {
      meshes.push({ id: `${side}WingFinger${f}`, geometryType: 'spline', materialType: 'bone', position: [0, 0, 0], color: '#0d0520' });
    }
    meshes.push({ id: `${side}WingMembrane`, geometryType: 'membrane', materialType: 'default', position: [0, 0, 0], color: '#4a1525', emissive: '#330a0a', emissiveIntensity: 0.5, opacity: 0.8, transparent: true });
    for (let s = 1; s <= 3; s++) {
      meshes.push({
        id: `${side}SubMembrane${s}${s + 1}`, geometryType: 'membrane', materialType: 'default',
        position: [0, 0, 0], color: '#3d1020', emissive: '#220505', opacity: 0.7, transparent: true,
      });
    }
    meshes.push({ id: `${side}WingClaw`, geometryType: 'cone', materialType: 'bone', position: [0, 0, 0], color: '#0d0520' });
  }

  // === LEGS (4) ===
  for (const leg of ['FrontLeft', 'FrontRight', 'BackLeft', 'BackRight']) {
    meshes.push({ id: `${leg}Leg`, geometryType: 'spline', materialType: 'skin_dark', position: [0, 0, 0], color: '#1e0f3d' });
    const prefix = leg.charAt(0) + leg.charAt(5); // FL, FR, BL, BR
    meshes.push({ id: `${prefix}Paw`, geometryType: 'hull', materialType: 'skin_dark', position: [0, 0, 0], color: '#1a0c35', resolution: 20 });
    for (let t = 1; t <= 3; t++) {
      meshes.push({ id: `${prefix}Toe${t}`, geometryType: 'sphere', materialType: 'skin_dark', position: [0, 0, 0], color: '#1a0c35' });
    }
    for (let c = 1; c <= 3; c++) {
      meshes.push({ id: `${prefix}Claw${c}`, geometryType: 'cone', materialType: 'bone', position: [0, 0, 0], color: '#0d0520', metalness: 0.3 });
    }
    meshes.push({ id: `${prefix}Dewclaw`, geometryType: 'cone', materialType: 'bone', position: [0, 0, 0], color: '#0d0520', metalness: 0.3 });
  }

  // === BACK SPINES (12) ===
  for (let i = 1; i <= 12; i++) {
    meshes.push({
      id: `BackSpine${i}`, geometryType: 'cone', materialType: 'default',
      position: [0, 3.2 - (i - 1) * 0.1, 1.2 - (i - 1) * 0.4],
      color: '#ff4400', emissive: '#ff2200', emissiveIntensity: 0.7,
    });
  }

  // === TAIL ===
  meshes.push({ id: 'TailSpline', geometryType: 'spline', materialType: 'skin_dark', position: [0, 0, 0], color: '#1e0f3d', animated: true, animationNames: ['tailSway'] });
  for (let i = 1; i <= 8; i++) {
    meshes.push({ id: `TailSpine${i}`, geometryType: 'cone', materialType: 'default', position: [0, 0, 0], color: '#ff3300', emissive: '#cc1100', emissiveIntensity: 0.4 });
  }
  meshes.push({ id: 'TailBarb', geometryType: 'cone', materialType: 'neon', position: [0, -0.2, -4.8], color: '#cc2200', emissive: '#ff4400', emissiveIntensity: 1.5 });
  meshes.push({ id: 'TailBarbLeft', geometryType: 'cone', materialType: 'default', position: [0, 0, 0], color: '#cc2200', emissive: '#ff4400', emissiveIntensity: 1.0 });
  meshes.push({ id: 'TailBarbRight', geometryType: 'cone', materialType: 'default', position: [0, 0, 0], color: '#cc2200', emissive: '#ff4400', emissiveIntensity: 1.0 });

  // === FIRE BREATH (9 objects) ===
  meshes.push({ id: 'FireCore', geometryType: 'cone', materialType: 'default', position: [0, 4.35, 5.5], color: '#ffffff', emissive: '#ffffdd', emissiveIntensity: 8.0, opacity: 0.95, transparent: true, animated: true, animationNames: ['firePulse'] });
  meshes.push({ id: 'FireInner', geometryType: 'cone', materialType: 'default', position: [0, 4.35, 5.8], color: '#ff6600', emissive: '#ff4400', emissiveIntensity: 6.0, opacity: 0.85, transparent: true, animated: true, animationNames: ['fireFlicker1'] });
  meshes.push({ id: 'FireMid', geometryType: 'cone', materialType: 'default', position: [0, 4.35, 6.2], color: '#ff8800', emissive: '#ff6600', emissiveIntensity: 4.0, opacity: 0.7, transparent: true, animated: true, animationNames: ['fireFlicker2'] });
  meshes.push({ id: 'FireOuter', geometryType: 'cone', materialType: 'default', position: [0, 4.35, 6.5], color: '#ffaa00', emissive: '#ff8800', emissiveIntensity: 2.5, opacity: 0.45, transparent: true, animated: true, animationNames: ['fireFlicker3'] });
  meshes.push({ id: 'FireTendrilUL', geometryType: 'cone', materialType: 'default', position: [0, 0, 0], color: '#ff7700', emissive: '#ff5500', emissiveIntensity: 5.0, opacity: 0.7, transparent: true, animated: true, animationNames: ['tendrilUL'] });
  meshes.push({ id: 'FireTendrilUR', geometryType: 'cone', materialType: 'default', position: [0, 0, 0], color: '#ff7700', emissive: '#ff5500', emissiveIntensity: 5.0, opacity: 0.7, transparent: true, animated: true, animationNames: ['tendrilUR'] });
  meshes.push({ id: 'FireTendrilLL', geometryType: 'cone', materialType: 'default', position: [0, 0, 0], color: '#ff9900', emissive: '#ff6600', emissiveIntensity: 4.0, opacity: 0.6, transparent: true });
  meshes.push({ id: 'FireTendrilLR', geometryType: 'cone', materialType: 'default', position: [0, 0, 0], color: '#ff9900', emissive: '#ff6600', emissiveIntensity: 4.0, opacity: 0.6, transparent: true });
  meshes.push({ id: 'HeatHaze', geometryType: 'sphere', materialType: 'default', position: [0, 4.35, 6.0], color: '#ff4400', emissive: '#ff2200', emissiveIntensity: 0.8, opacity: 0.1, transparent: true, animated: true, animationNames: ['hazePulse'] });

  // === EMBERS (8) ===
  for (let i = 1; i <= 8; i++) {
    const hasAnim = i <= 4;
    meshes.push({
      id: `Ember${i}`, geometryType: 'sphere', materialType: 'default',
      position: [0, 4.5, 5.5], color: '#ffcc00', emissive: '#ff8800', emissiveIntensity: 3.5,
      animated: hasAnim, animationNames: hasAnim ? [`emberDrift${i}`] : undefined,
    });
  }

  // === SMOKE (4) ===
  for (let i = 1; i <= 4; i++) {
    const hasAnim = i <= 2;
    meshes.push({
      id: `Smoke${i}`, geometryType: 'sphere', materialType: 'default',
      position: [0, 4.6, 7.0], color: '#222222', opacity: 0.12, transparent: true,
      animated: hasAnim, animationNames: hasAnim ? [`smokeRise${i}`] : undefined,
    });
  }

  // === LIGHTS ===
  meshes.push({ id: 'FireGlowLight', geometryType: 'sphere', materialType: 'default', position: [0, 4.4, 5.5], color: '#ff6600', isLight: true, lightType: 'point', lightIntensity: 8 });
  meshes.push({ id: 'FireTipLight', geometryType: 'sphere', materialType: 'default', position: [0, 4.4, 6.5], color: '#ffaa00', isLight: true, lightType: 'point', lightIntensity: 4 });
  meshes.push({ id: 'LeftEyeLight', geometryType: 'sphere', materialType: 'default', position: [-0.3, 4.6, 4.6], color: '#ff4400', isLight: true, lightType: 'point', lightIntensity: 1.5 });
  meshes.push({ id: 'RimLight', geometryType: 'sphere', materialType: 'default', position: [2, 8, -3], color: '#2244aa', isLight: true, lightType: 'directional', lightIntensity: 0.4 });
  meshes.push({ id: 'GroundAmbient', geometryType: 'sphere', materialType: 'default', position: [0, 0, 0], color: '#0a0315', isLight: true, lightType: 'ambient', lightIntensity: 0.2 });

  // === PLATFORM ===
  meshes.push({ id: 'Platform', geometryType: 'cylinder', materialType: 'stone', position: [0, -0.15, 0], color: '#1a1a2e', roughness: 0.9 });
  meshes.push({ id: 'PlatformRim', geometryType: 'torus', materialType: 'brushed_steel', position: [0, -0.1, 0], color: '#0d0520', metalness: 0.7 });

  return meshes;
}
