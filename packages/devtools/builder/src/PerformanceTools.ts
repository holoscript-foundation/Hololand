/**
 * Performance Tools Module
 *
 * Real-time profiling and optimization tools for HoloScript scenes:
 * - Frame rate monitor with history graph
 * - Triangle / draw call counter
 * - Memory usage tracker
 * - Scene complexity analyzer
 * - Optimization recommendation engine
 * - Export performance reports
 *
 * @module PerformanceTools
 */

import type {
  Scene,
  SceneNode,
  SceneNodeType,
  SceneManager,
  VisualScript,
} from './VisualEditor';

// =============================================================================
// TYPES
// =============================================================================

/** Frame timing data */
export interface FrameStats {
  timestamp: number;
  /** Frame time in milliseconds */
  frameTime: number;
  /** Frames per second */
  fps: number;
  /** CPU time in ms */
  cpuTime: number;
  /** GPU time estimate in ms */
  gpuTime: number;
}

/** Rendering statistics */
export interface RenderStats {
  /** Total triangles in scene */
  triangles: number;
  /** Total vertices */
  vertices: number;
  /** Draw calls per frame */
  drawCalls: number;
  /** Active materials */
  materials: number;
  /** Active textures */
  textures: number;
  /** Active lights */
  lights: number;
  /** Shader programs */
  shaderPrograms: number;
}

/** Memory usage breakdown */
export interface MemoryStats {
  /** Total estimated memory in bytes */
  totalBytes: number;
  /** Geometry memory in bytes */
  geometryBytes: number;
  /** Texture memory in bytes */
  textureBytes: number;
  /** Script/logic memory in bytes */
  scriptBytes: number;
  /** Other memory in bytes */
  otherBytes: number;
  /** Number of cached objects */
  cachedObjects: number;
}

/** Scene complexity metrics */
export interface SceneComplexity {
  /** Total object count */
  objectCount: number;
  /** Hierarchy depth (max nesting level) */
  maxDepth: number;
  /** Total component count */
  componentCount: number;
  /** Total trait count */
  traitCount: number;
  /** Visual script node count */
  scriptNodeCount: number;
  /** Visual script connection count */
  scriptConnectionCount: number;
  /** Estimated render weight (0-100) */
  renderWeight: number;
  /** Estimated physics weight (0-100) */
  physicsWeight: number;
  /** Estimated network weight (0-100) */
  networkWeight: number;
  /** Overall complexity score (0-100, lower is better) */
  complexityScore: number;
}

/** Optimization recommendation */
export interface OptimizationRecommendation {
  id: string;
  type: OptimizationType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  impact: string;
  /** Estimated performance improvement (percentage) */
  estimatedImprovement: number;
  /** Affected node IDs */
  affectedNodes: string[];
  /** Whether auto-fix is available */
  autoFixAvailable: boolean;
  /** Auto-fix function (if available) */
  autoFix?: () => void;
}

export type OptimizationType =
  | 'geometry'
  | 'texture'
  | 'lighting'
  | 'physics'
  | 'networking'
  | 'scripting'
  | 'hierarchy'
  | 'rendering'
  | 'memory';

/** Performance snapshot for comparison */
export interface PerformanceSnapshot {
  id: string;
  name: string;
  timestamp: number;
  frameStats: FrameStats;
  renderStats: RenderStats;
  memoryStats: MemoryStats;
  complexity: SceneComplexity;
  recommendations: OptimizationRecommendation[];
}

/** Performance budget thresholds */
export interface PerformanceBudget {
  maxTriangles: number;
  maxDrawCalls: number;
  maxTextureMemoryMB: number;
  targetFPS: number;
  maxObjects: number;
  maxDepth: number;
  maxScriptNodes: number;
}

/** Profile recording config */
export interface ProfileConfig {
  /** Duration in seconds (0 = manual stop) */
  duration: number;
  /** Sample interval in ms */
  sampleInterval: number;
  /** Include memory sampling */
  includeMemory: boolean;
  /** Include render stats */
  includeRender: boolean;
}

/** Recorded profile data */
export interface ProfileRecording {
  id: string;
  startTime: number;
  endTime: number;
  frames: FrameStats[];
  renderSnapshots: RenderStats[];
  memorySnapshots: MemoryStats[];
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  p95FrameTime: number;
  totalFrames: number;
}

// =============================================================================
// DEFAULT BUDGETS
// =============================================================================

const BUDGET_VR: PerformanceBudget = {
  maxTriangles: 500000,
  maxDrawCalls: 100,
  maxTextureMemoryMB: 256,
  targetFPS: 72,
  maxObjects: 500,
  maxDepth: 8,
  maxScriptNodes: 200,
};

const BUDGET_MOBILE: PerformanceBudget = {
  maxTriangles: 200000,
  maxDrawCalls: 50,
  maxTextureMemoryMB: 128,
  targetFPS: 60,
  maxObjects: 300,
  maxDepth: 6,
  maxScriptNodes: 100,
};

const BUDGET_DESKTOP: PerformanceBudget = {
  maxTriangles: 2000000,
  maxDrawCalls: 500,
  maxTextureMemoryMB: 1024,
  targetFPS: 60,
  maxObjects: 2000,
  maxDepth: 15,
  maxScriptNodes: 500,
};

export function getBudgetPreset(preset: 'vr' | 'mobile' | 'desktop'): PerformanceBudget {
  switch (preset) {
    case 'vr': return { ...BUDGET_VR };
    case 'mobile': return { ...BUDGET_MOBILE };
    case 'desktop': return { ...BUDGET_DESKTOP };
  }
}

// =============================================================================
// GEOMETRY COST ESTIMATOR
// =============================================================================

/** Estimated triangle counts for standard geometries */
const GEOMETRY_COSTS: Record<string, number> = {
  cube: 12,
  sphere: 960,
  cylinder: 96,
  cone: 48,
  torus: 2304,
  capsule: 1024,
  plane: 2,
  humanoid: 5000,
  billboard: 2,
  particle: 4,
};

/** Estimated memory per texture dimension (bytes per pixel * typical dimension^2) */
const TEXTURE_COST_PER_MP = 4 * 1024 * 1024; // 4 bytes/pixel * 1M pixels

function estimateNodeTriangles(node: SceneNode): number {
  // Check geometry component
  for (const comp of node.components) {
    if (comp.componentType === 'geometry' || comp.componentType === 'mesh') {
      const geo = (comp.properties.type || comp.properties.geometry || 'cube') as string;
      const baseCost = GEOMETRY_COSTS[geo] || 100;
      // Account for scale (bigger objects often have more detail)
      const sx = node.transform.scale.x;
      const sy = node.transform.scale.y;
      const sz = node.transform.scale.z;
      const avgScale = (sx + sy + sz) / 3;
      return baseCost * Math.max(1, Math.ceil(avgScale));
    }
  }

  // Check metadata for geometry type
  const geo = (node.metadata.geometry || node.metadata.shape) as string | undefined;
  if (geo) {
    return GEOMETRY_COSTS[geo] || 100;
  }

  // Default estimate based on node type
  switch (node.type) {
    case 'mesh': return 500;
    case 'light': return 0;
    case 'camera': return 0;
    case 'audio': return 0;
    case 'trigger': return 0;
    case 'spawn': return 0;
    case 'group': return 0;
    case 'prefab': return 1000;
    case 'empty': return 0;
    default: return 0;
  }
}

function estimateNodeMemory(node: SceneNode): number {
  let bytes = 256; // Base overhead per node

  // Transform data
  bytes += 10 * 4; // 10 floats (position, rotation, scale)

  // Components
  for (const comp of node.components) {
    bytes += 128; // Component overhead
    bytes += JSON.stringify(comp.properties).length * 2; // Property data
  }

  // Metadata
  bytes += JSON.stringify(node.metadata).length * 2;

  return bytes;
}

// =============================================================================
// SCENE COMPLEXITY ANALYZER
// =============================================================================

/**
 * Analyze scene complexity without runtime rendering.
 * Uses static analysis of the scene graph to estimate performance characteristics.
 */
export function analyzeSceneComplexity(scene: Scene): SceneComplexity {
  let objectCount = 0;
  let componentCount = 0;
  let traitCount = 0;
  let scriptNodeCount = 0;
  let scriptConnectionCount = 0;
  let maxDepth = 0;
  let physicsCount = 0;
  let networkCount = 0;
  let lightCount = 0;
  let totalTriangles = 0;

  // Traverse scene graph
  function traverse(nodeId: string, depth: number): void {
    const node = scene.nodes.get(nodeId);
    if (!node) return;

    objectCount++;
    maxDepth = Math.max(maxDepth, depth);
    componentCount += node.components.length;
    totalTriangles += estimateNodeTriangles(node);

    if (node.type === 'light') lightCount++;

    for (const comp of node.components) {
      if (comp.componentType === 'vr_trait') {
        traitCount++;
        const traitName = comp.properties.name as string;
        if (['physics', 'rigid', 'kinematic', 'collidable', 'gravity'].includes(traitName)) {
          physicsCount++;
        }
        if (['networked', 'synced', 'persistent', 'owned', 'host_only'].includes(traitName)) {
          networkCount++;
        }
      }
    }

    for (const childId of node.children) {
      traverse(childId, depth + 1);
    }
  }

  for (const rootId of scene.rootNodes) {
    traverse(rootId, 0);
  }

  // Count visual script complexity
  for (const script of scene.scripts.values()) {
    scriptNodeCount += script.nodes.size;
    scriptConnectionCount += script.connections.length;
  }

  // Calculate weights (0-100)
  const renderWeight = Math.min(100, (totalTriangles / 500000) * 50 + (lightCount / 8) * 30 + (objectCount / 200) * 20);
  const physicsWeight = Math.min(100, (physicsCount / 50) * 100);
  const networkWeight = Math.min(100, (networkCount / 30) * 100);

  // Overall complexity
  const complexityScore = Math.min(100,
    renderWeight * 0.4 +
    physicsWeight * 0.25 +
    networkWeight * 0.15 +
    (scriptNodeCount / 100) * 10 +
    (maxDepth / 10) * 10
  );

  return {
    objectCount,
    maxDepth,
    componentCount,
    traitCount,
    scriptNodeCount,
    scriptConnectionCount,
    renderWeight: Math.round(renderWeight),
    physicsWeight: Math.round(physicsWeight),
    networkWeight: Math.round(networkWeight),
    complexityScore: Math.round(complexityScore),
  };
}

// =============================================================================
// RENDER STATS ESTIMATOR
// =============================================================================

/**
 * Estimate render stats from static scene analysis.
 * In production, these would come from the actual renderer.
 */
export function estimateRenderStats(scene: Scene): RenderStats {
  let triangles = 0;
  let vertices = 0;
  let drawCalls = 0;
  let materials = 0;
  let textures = 0;
  let lights = 0;

  const materialSet = new Set<string>();
  const textureSet = new Set<string>();

  for (const node of scene.nodes.values()) {
    if (!node.visible) continue;

    const tris = estimateNodeTriangles(node);
    triangles += tris;
    vertices += Math.ceil(tris * 0.6); // Approximate vertex count

    if (tris > 0) drawCalls++;

    // Count unique materials and textures
    for (const comp of node.components) {
      if (comp.properties.material) {
        materialSet.add(comp.properties.material as string);
      }
      if (comp.properties.texture) {
        textureSet.add(comp.properties.texture as string);
      }
      if (comp.properties.color) {
        materialSet.add(`color:${comp.properties.color}`);
      }
    }

    if (node.type === 'light') lights++;
  }

  materials = Math.max(1, materialSet.size);
  textures = textureSet.size;

  return {
    triangles,
    vertices,
    drawCalls,
    materials,
    textures,
    lights,
    shaderPrograms: Math.min(materials, 10),
  };
}

// =============================================================================
// MEMORY ESTIMATOR
// =============================================================================

/**
 * Estimate memory usage from static scene analysis.
 */
export function estimateMemoryStats(scene: Scene): MemoryStats {
  let geometryBytes = 0;
  let textureBytes = 0;
  let scriptBytes = 0;
  let otherBytes = 0;
  let cachedObjects = 0;

  for (const node of scene.nodes.values()) {
    const nodeMem = estimateNodeMemory(node);
    const tris = estimateNodeTriangles(node);

    // Geometry: ~40 bytes per triangle (position, normal, uv, index)
    geometryBytes += tris * 40;

    // Node overhead goes to "other"
    otherBytes += nodeMem;
    cachedObjects++;
  }

  // Texture memory (estimate from asset references)
  for (const asset of scene.assets.values()) {
    if (asset.type === 'texture') {
      textureBytes += TEXTURE_COST_PER_MP; // Assume 1MP per texture
    }
  }

  // Script memory
  for (const script of scene.scripts.values()) {
    scriptBytes += script.nodes.size * 256; // ~256 bytes per script node
    scriptBytes += script.connections.length * 64;
    scriptBytes += script.variables.length * 128;
  }

  return {
    totalBytes: geometryBytes + textureBytes + scriptBytes + otherBytes,
    geometryBytes,
    textureBytes,
    scriptBytes,
    otherBytes,
    cachedObjects,
  };
}

// =============================================================================
// OPTIMIZATION RECOMMENDATION ENGINE
// =============================================================================

/**
 * Generate optimization recommendations based on scene analysis.
 */
export function generateRecommendations(
  scene: Scene,
  budget: PerformanceBudget = BUDGET_VR
): OptimizationRecommendation[] {
  const recommendations: OptimizationRecommendation[] = [];
  const renderStats = estimateRenderStats(scene);
  const memoryStats = estimateMemoryStats(scene);
  const complexity = analyzeSceneComplexity(scene);

  let recId = 1;

  // --- Triangle budget ---
  if (renderStats.triangles > budget.maxTriangles) {
    const over = ((renderStats.triangles - budget.maxTriangles) / budget.maxTriangles * 100).toFixed(0);
    const highTriNodes: string[] = [];

    for (const node of scene.nodes.values()) {
      if (estimateNodeTriangles(node) > 2000) {
        highTriNodes.push(node.id);
      }
    }

    recommendations.push({
      id: `rec-${recId++}`,
      type: 'geometry',
      severity: 'critical',
      title: 'Triangle count exceeds budget',
      description: `Scene has ${renderStats.triangles.toLocaleString()} triangles (${over}% over budget of ${budget.maxTriangles.toLocaleString()}).`,
      impact: 'Reduced frame rate, especially on mobile/VR',
      estimatedImprovement: 20,
      affectedNodes: highTriNodes,
      autoFixAvailable: false,
    });
  }

  // --- Draw calls ---
  if (renderStats.drawCalls > budget.maxDrawCalls) {
    recommendations.push({
      id: `rec-${recId++}`,
      type: 'rendering',
      severity: renderStats.drawCalls > budget.maxDrawCalls * 2 ? 'critical' : 'warning',
      title: 'Too many draw calls',
      description: `${renderStats.drawCalls} draw calls (budget: ${budget.maxDrawCalls}). Consider batching similar objects or using instancing.`,
      impact: 'CPU bottleneck, reduced frame rate',
      estimatedImprovement: 15,
      affectedNodes: [],
      autoFixAvailable: false,
    });
  }

  // --- Object count ---
  if (complexity.objectCount > budget.maxObjects) {
    recommendations.push({
      id: `rec-${recId++}`,
      type: 'hierarchy',
      severity: 'warning',
      title: 'High object count',
      description: `${complexity.objectCount} objects (budget: ${budget.maxObjects}). Consider combining static objects or using LOD groups.`,
      impact: 'Scene graph traversal overhead',
      estimatedImprovement: 10,
      affectedNodes: [],
      autoFixAvailable: false,
    });
  }

  // --- Deep hierarchy ---
  if (complexity.maxDepth > budget.maxDepth) {
    recommendations.push({
      id: `rec-${recId++}`,
      type: 'hierarchy',
      severity: 'info',
      title: 'Deep hierarchy',
      description: `Max depth is ${complexity.maxDepth} (budget: ${budget.maxDepth}). Deep hierarchies slow down transform updates.`,
      impact: 'Transform calculation overhead',
      estimatedImprovement: 5,
      affectedNodes: [],
      autoFixAvailable: false,
    });
  }

  // --- Too many lights ---
  if (renderStats.lights > 8) {
    const lightNodes: string[] = [];
    for (const node of scene.nodes.values()) {
      if (node.type === 'light') lightNodes.push(node.id);
    }

    recommendations.push({
      id: `rec-${recId++}`,
      type: 'lighting',
      severity: 'warning',
      title: 'Too many real-time lights',
      description: `${renderStats.lights} lights in scene. Most platforms support 4-8 real-time lights efficiently. Consider baking shadows or using light probes.`,
      impact: 'Per-pixel lighting cost increases linearly',
      estimatedImprovement: 15,
      affectedNodes: lightNodes,
      autoFixAvailable: false,
    });
  }

  // --- Texture memory ---
  const textureMemMB = memoryStats.textureBytes / (1024 * 1024);
  if (textureMemMB > budget.maxTextureMemoryMB) {
    recommendations.push({
      id: `rec-${recId++}`,
      type: 'texture',
      severity: 'warning',
      title: 'High texture memory usage',
      description: `${textureMemMB.toFixed(0)}MB texture memory (budget: ${budget.maxTextureMemoryMB}MB). Consider compressing textures or reducing resolution.`,
      impact: 'GPU memory pressure, potential swapping',
      estimatedImprovement: 10,
      affectedNodes: [],
      autoFixAvailable: false,
    });
  }

  // --- Excessive physics ---
  if (complexity.physicsWeight > 60) {
    const physicsNodes: string[] = [];
    for (const node of scene.nodes.values()) {
      for (const comp of node.components) {
        if (comp.componentType === 'vr_trait') {
          const name = comp.properties.name as string;
          if (['physics', 'rigid', 'collidable'].includes(name)) {
            physicsNodes.push(node.id);
            break;
          }
        }
      }
    }

    recommendations.push({
      id: `rec-${recId++}`,
      type: 'physics',
      severity: complexity.physicsWeight > 80 ? 'critical' : 'warning',
      title: 'Heavy physics workload',
      description: `Physics weight is ${complexity.physicsWeight}/100. ${physicsNodes.length} objects have physics traits. Consider using simplified collision shapes or reducing dynamic objects.`,
      impact: 'Physics simulation bottleneck',
      estimatedImprovement: 15,
      affectedNodes: physicsNodes,
      autoFixAvailable: false,
    });
  }

  // --- Excessive networking ---
  if (complexity.networkWeight > 50) {
    const networkNodes: string[] = [];
    for (const node of scene.nodes.values()) {
      for (const comp of node.components) {
        if (comp.componentType === 'vr_trait') {
          const name = comp.properties.name as string;
          if (['networked', 'synced'].includes(name)) {
            networkNodes.push(node.id);
            break;
          }
        }
      }
    }

    recommendations.push({
      id: `rec-${recId++}`,
      type: 'networking',
      severity: 'warning',
      title: 'High network sync overhead',
      description: `${networkNodes.length} networked objects. Consider reducing sync frequency or making non-essential objects client-side only.`,
      impact: 'Bandwidth and latency',
      estimatedImprovement: 10,
      affectedNodes: networkNodes,
      autoFixAvailable: false,
    });
  }

  // --- Script complexity ---
  if (complexity.scriptNodeCount > budget.maxScriptNodes) {
    recommendations.push({
      id: `rec-${recId++}`,
      type: 'scripting',
      severity: 'info',
      title: 'Complex visual scripts',
      description: `${complexity.scriptNodeCount} script nodes (budget: ${budget.maxScriptNodes}). Consider simplifying logic or using compiled scripts.`,
      impact: 'Script evaluation overhead',
      estimatedImprovement: 5,
      affectedNodes: [],
      autoFixAvailable: false,
    });
  }

  // --- Invisible objects still in scene ---
  const invisibleNodes: string[] = [];
  for (const node of scene.nodes.values()) {
    if (!node.visible && estimateNodeTriangles(node) > 0) {
      invisibleNodes.push(node.id);
    }
  }
  if (invisibleNodes.length > 5) {
    recommendations.push({
      id: `rec-${recId++}`,
      type: 'hierarchy',
      severity: 'info',
      title: 'Many invisible objects in scene',
      description: `${invisibleNodes.length} invisible objects still occupy memory. Consider removing or converting to prefabs for dynamic loading.`,
      impact: 'Memory usage',
      estimatedImprovement: 5,
      affectedNodes: invisibleNodes,
      autoFixAvailable: true,
      autoFix: () => {
        for (const id of invisibleNodes) {
          // Would remove invisible nodes in production
        }
      },
    });
  }

  return recommendations;
}

// =============================================================================
// PERFORMANCE PROFILER
// =============================================================================

/**
 * Performance Profiler for real-time monitoring and recording.
 *
 * In a browser environment, uses requestAnimationFrame for frame timing.
 * In Node.js/test environments, provides manual frame submission.
 */
export class PerformanceProfiler {
  private frameHistory: FrameStats[] = [];
  private maxHistoryLength: number = 300; // ~5 seconds at 60fps
  private recording: ProfileRecording | null = null;
  private isRunning: boolean = false;
  private lastFrameTime: number = 0;
  private snapshots: Map<string, PerformanceSnapshot> = new Map();
  private budget: PerformanceBudget;
  private listeners: Set<(stats: FrameStats) => void> = new Set();

  constructor(
    private sceneManager: SceneManager,
    budget?: PerformanceBudget
  ) {
    this.budget = budget || { ...BUDGET_VR };
  }

  // ─── FRAME MONITORING ────────────────────────────────────────────────────

  /**
   * Submit a frame timing manually (for testing or custom render loops)
   */
  submitFrame(frameTime: number, cpuTime?: number): FrameStats {
    const now = Date.now();
    const stats: FrameStats = {
      timestamp: now,
      frameTime,
      fps: frameTime > 0 ? 1000 / frameTime : 0,
      cpuTime: cpuTime || frameTime * 0.7,
      gpuTime: frameTime * 0.3,
    };

    this.frameHistory.push(stats);
    if (this.frameHistory.length > this.maxHistoryLength) {
      this.frameHistory.shift();
    }

    // Add to recording if active
    if (this.recording) {
      this.recording.frames.push(stats);
      this.recording.totalFrames++;
    }

    // Notify listeners
    for (const listener of this.listeners) {
      listener(stats);
    }

    return stats;
  }

  /**
   * Get recent frame history
   */
  getFrameHistory(): FrameStats[] {
    return [...this.frameHistory];
  }

  /**
   * Get current FPS (average over last 60 frames)
   */
  getCurrentFPS(): number {
    const recent = this.frameHistory.slice(-60);
    if (recent.length === 0) return 0;
    const avgFrameTime = recent.reduce((sum, f) => sum + f.frameTime, 0) / recent.length;
    return avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
  }

  /**
   * Get stats summary for the current frame history
   */
  getStatsSummary(): {
    currentFPS: number;
    avgFPS: number;
    minFPS: number;
    maxFPS: number;
    avgFrameTime: number;
    p95FrameTime: number;
    jank: number;
  } {
    const frames = this.frameHistory;
    if (frames.length === 0) {
      return { currentFPS: 0, avgFPS: 0, minFPS: 0, maxFPS: 0, avgFrameTime: 0, p95FrameTime: 0, jank: 0 };
    }

    const fpsValues = frames.map(f => f.fps);
    const frameTimes = frames.map(f => f.frameTime).sort((a, b) => a - b);

    const jankThreshold = 1000 / this.budget.targetFPS * 2; // 2x target frame time
    const jank = frames.filter(f => f.frameTime > jankThreshold).length;

    return {
      currentFPS: frames[frames.length - 1].fps,
      avgFPS: fpsValues.reduce((s, v) => s + v, 0) / fpsValues.length,
      minFPS: Math.min(...fpsValues),
      maxFPS: Math.max(...fpsValues),
      avgFrameTime: frameTimes.reduce((s, v) => s + v, 0) / frameTimes.length,
      p95FrameTime: frameTimes[Math.floor(frameTimes.length * 0.95)] || 0,
      jank,
    };
  }

  // ─── RECORDING ────────────────────────────────────────────────────────────

  /**
   * Start recording performance data
   */
  startRecording(config?: Partial<ProfileConfig>): string {
    const id = `profile-${Date.now().toString(36)}`;
    this.recording = {
      id,
      startTime: Date.now(),
      endTime: 0,
      frames: [],
      renderSnapshots: [],
      memorySnapshots: [],
      averageFPS: 0,
      minFPS: 0,
      maxFPS: 0,
      p95FrameTime: 0,
      totalFrames: 0,
    };

    // Auto-stop if duration specified
    const duration = config?.duration || 0;
    if (duration > 0) {
      setTimeout(() => this.stopRecording(), duration * 1000);
    }

    return id;
  }

  /**
   * Stop recording and return the profile
   */
  stopRecording(): ProfileRecording | null {
    if (!this.recording) return null;

    const recording = this.recording;
    recording.endTime = Date.now();

    // Calculate summary stats
    if (recording.frames.length > 0) {
      const fpsValues = recording.frames.map(f => f.fps);
      const frameTimes = recording.frames.map(f => f.frameTime).sort((a, b) => a - b);

      recording.averageFPS = fpsValues.reduce((s, v) => s + v, 0) / fpsValues.length;
      recording.minFPS = Math.min(...fpsValues);
      recording.maxFPS = Math.max(...fpsValues);
      recording.p95FrameTime = frameTimes[Math.floor(frameTimes.length * 0.95)] || 0;
    }

    this.recording = null;
    return recording;
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.recording !== null;
  }

  // ─── SNAPSHOTS ────────────────────────────────────────────────────────────

  /**
   * Take a performance snapshot for later comparison
   */
  takeSnapshot(name: string): PerformanceSnapshot {
    const scene = this.sceneManager.getScene();
    const snapshot: PerformanceSnapshot = {
      id: `snap-${Date.now().toString(36)}`,
      name,
      timestamp: Date.now(),
      frameStats: this.frameHistory.length > 0
        ? this.frameHistory[this.frameHistory.length - 1]
        : { timestamp: Date.now(), frameTime: 0, fps: 0, cpuTime: 0, gpuTime: 0 },
      renderStats: estimateRenderStats(scene),
      memoryStats: estimateMemoryStats(scene),
      complexity: analyzeSceneComplexity(scene),
      recommendations: generateRecommendations(scene, this.budget),
    };

    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  /**
   * Compare two snapshots
   */
  compareSnapshots(idA: string, idB: string): {
    before: PerformanceSnapshot;
    after: PerformanceSnapshot;
    deltas: Record<string, { before: number; after: number; change: number; changePercent: string }>;
  } | null {
    const a = this.snapshots.get(idA);
    const b = this.snapshots.get(idB);
    if (!a || !b) return null;

    const delta = (key: string, valA: number, valB: number) => ({
      before: valA,
      after: valB,
      change: valB - valA,
      changePercent: valA > 0 ? ((valB - valA) / valA * 100).toFixed(1) + '%' : 'N/A',
    });

    return {
      before: a,
      after: b,
      deltas: {
        triangles: delta('triangles', a.renderStats.triangles, b.renderStats.triangles),
        drawCalls: delta('drawCalls', a.renderStats.drawCalls, b.renderStats.drawCalls),
        objects: delta('objects', a.complexity.objectCount, b.complexity.objectCount),
        memoryMB: delta('memoryMB',
          a.memoryStats.totalBytes / (1024 * 1024),
          b.memoryStats.totalBytes / (1024 * 1024)),
        complexity: delta('complexity', a.complexity.complexityScore, b.complexity.complexityScore),
        fps: delta('fps', a.frameStats.fps, b.frameStats.fps),
      },
    };
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): PerformanceSnapshot[] {
    return [...this.snapshots.values()];
  }

  // ─── BUDGET MANAGEMENT ────────────────────────────────────────────────────

  /**
   * Set performance budget
   */
  setBudget(budget: PerformanceBudget): void {
    this.budget = { ...budget };
  }

  /**
   * Get current budget
   */
  getBudget(): PerformanceBudget {
    return { ...this.budget };
  }

  /**
   * Check if current scene is within budget
   */
  checkBudget(): {
    withinBudget: boolean;
    violations: Array<{ metric: string; current: number; budget: number; over: string }>;
  } {
    const scene = this.sceneManager.getScene();
    const renderStats = estimateRenderStats(scene);
    const memoryStats = estimateMemoryStats(scene);
    const complexity = analyzeSceneComplexity(scene);

    const violations: Array<{ metric: string; current: number; budget: number; over: string }> = [];

    const check = (metric: string, current: number, budget: number) => {
      if (current > budget) {
        violations.push({
          metric,
          current,
          budget,
          over: ((current - budget) / budget * 100).toFixed(0) + '%',
        });
      }
    };

    check('triangles', renderStats.triangles, this.budget.maxTriangles);
    check('drawCalls', renderStats.drawCalls, this.budget.maxDrawCalls);
    check('textureMemoryMB', memoryStats.textureBytes / (1024 * 1024), this.budget.maxTextureMemoryMB);
    check('objects', complexity.objectCount, this.budget.maxObjects);
    check('hierarchyDepth', complexity.maxDepth, this.budget.maxDepth);
    check('scriptNodes', complexity.scriptNodeCount, this.budget.maxScriptNodes);

    return {
      withinBudget: violations.length === 0,
      violations,
    };
  }

  // ─── REPORT GENERATION ────────────────────────────────────────────────────

  /**
   * Generate a full performance report as a formatted string
   */
  generateReport(): string {
    const scene = this.sceneManager.getScene();
    const renderStats = estimateRenderStats(scene);
    const memoryStats = estimateMemoryStats(scene);
    const complexity = analyzeSceneComplexity(scene);
    const recommendations = generateRecommendations(scene, this.budget);
    const budgetCheck = this.checkBudget();
    const summary = this.getStatsSummary();

    const lines: string[] = [
      '═══════════════════════════════════════════════════',
      '  HoloScript Performance Report',
      `  Scene: ${scene.name}`,
      `  Generated: ${new Date().toISOString()}`,
      '═══════════════════════════════════════════════════',
      '',
      '── Scene Complexity ──',
      `  Objects:       ${complexity.objectCount}`,
      `  Max Depth:     ${complexity.maxDepth}`,
      `  Components:    ${complexity.componentCount}`,
      `  VR Traits:     ${complexity.traitCount}`,
      `  Script Nodes:  ${complexity.scriptNodeCount}`,
      `  Connections:   ${complexity.scriptConnectionCount}`,
      `  Complexity:    ${complexity.complexityScore}/100`,
      '',
      '── Render Stats ──',
      `  Triangles:     ${renderStats.triangles.toLocaleString()}`,
      `  Vertices:      ${renderStats.vertices.toLocaleString()}`,
      `  Draw Calls:    ${renderStats.drawCalls}`,
      `  Materials:     ${renderStats.materials}`,
      `  Textures:      ${renderStats.textures}`,
      `  Lights:        ${renderStats.lights}`,
      '',
      '── Memory ──',
      `  Total:         ${(memoryStats.totalBytes / 1024 / 1024).toFixed(1)} MB`,
      `  Geometry:      ${(memoryStats.geometryBytes / 1024 / 1024).toFixed(1)} MB`,
      `  Textures:      ${(memoryStats.textureBytes / 1024 / 1024).toFixed(1)} MB`,
      `  Scripts:       ${(memoryStats.scriptBytes / 1024).toFixed(1)} KB`,
      `  Other:         ${(memoryStats.otherBytes / 1024).toFixed(1)} KB`,
      '',
      '── Performance ──',
      `  Current FPS:   ${summary.currentFPS.toFixed(1)}`,
      `  Average FPS:   ${summary.avgFPS.toFixed(1)}`,
      `  Min FPS:       ${summary.minFPS.toFixed(1)}`,
      `  P95 Frame:     ${summary.p95FrameTime.toFixed(1)}ms`,
      `  Jank Frames:   ${summary.jank}`,
      '',
      `── Budget Check (${budgetCheck.withinBudget ? '✅ PASS' : '❌ OVER BUDGET'}) ──`,
    ];

    if (budgetCheck.violations.length > 0) {
      for (const v of budgetCheck.violations) {
        lines.push(`  ❌ ${v.metric}: ${v.current} / ${v.budget} (+${v.over})`);
      }
    } else {
      lines.push('  All metrics within budget');
    }

    if (recommendations.length > 0) {
      lines.push('');
      lines.push('── Recommendations ──');
      for (const rec of recommendations) {
        const icon = rec.severity === 'critical' ? '🔴' : rec.severity === 'warning' ? '🟡' : '🔵';
        lines.push(`  ${icon} [${rec.type}] ${rec.title}`);
        lines.push(`     ${rec.description}`);
        if (rec.estimatedImprovement > 0) {
          lines.push(`     Potential improvement: ~${rec.estimatedImprovement}%`);
        }
      }
    }

    lines.push('');
    lines.push('═══════════════════════════════════════════════════');

    return lines.join('\n');
  }

  // ─── EVENT LISTENERS ──────────────────────────────────────────────────────

  /**
   * Subscribe to frame stats updates
   */
  onFrame(listener: (stats: FrameStats) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Clear all frame history
   */
  clearHistory(): void {
    this.frameHistory = [];
  }
}

// =============================================================================
// CONVENIENCE FACTORY
// =============================================================================

/**
 * Create a performance profiler with a budget preset
 */
export function createProfiler(
  sceneManager: SceneManager,
  preset: 'vr' | 'mobile' | 'desktop' = 'vr'
): PerformanceProfiler {
  return new PerformanceProfiler(sceneManager, getBudgetPreset(preset));
}
