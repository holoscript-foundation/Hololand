/**
 * @hololand/lod - LOD Manager
 * Level of Detail management and selection
 */

import {
  Vec3,
  Mat4,
  Plane,
  Frustum,
  FrustumConfig,
  BoundingSphere,
  LODGroup,
  LODLevel,
  LODTransition,
  LODSelectionCriteria,
  LODSelectionResult,
  LODManagerConfig,
  LODBudget,
  AdaptiveConfig,
  PerformanceMetrics,
  Camera,
  VisibilityEvent,
  VisibilityEventHandler,
  FoveationConfig,
} from './types';

// ============================================================================
// Math Utilities
// ============================================================================

/**
 * Calculate distance between two 3D points
 */
export function vec3Distance(a: Vec3, b: Vec3): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Dot product of two vectors
 */
function vec3Dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Normalize a vector
 */
function vec3Normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/**
 * Check if a sphere is inside or intersects a frustum
 */
export function sphereInFrustum(sphere: BoundingSphere, frustum: Frustum): boolean {
  for (const plane of frustum.planes) {
    const distance =
      vec3Dot(plane.normal, sphere.center) + plane.distance;
    if (distance < -sphere.radius) {
      return false;
    }
  }
  return true;
}

/**
 * Calculate screen coverage of a sphere
 * Returns a value between 0 and 1
 */
export function calculateScreenCoverage(
  sphere: BoundingSphere,
  camera: Camera
): number {
  const distance = vec3Distance(camera.position, sphere.center);
  if (distance <= sphere.radius) {
    return 1; // Inside or touching the sphere
  }

  // Calculate angular size
  const angularSize = 2 * Math.atan(sphere.radius / distance);

  // Compare to field of view
  const fovCoverage = angularSize / camera.fov;
  const aspectCoverage = angularSize / (camera.fov * camera.aspect);

  // Return maximum of horizontal and vertical coverage
  return Math.min(1, Math.max(fovCoverage, aspectCoverage));
}

// ============================================================================
// Frustum Builder
// ============================================================================

/**
 * Builds frustum planes from camera matrices
 */
export class FrustumBuilder {
  /**
   * Build frustum from view-projection matrix
   */
  static fromViewProjection(vp: Mat4): Frustum {
    const m = vp.elements;
    const planes: Plane[] = [];

    // Left plane
    planes.push(
      this.normalizePlane({
        normal: { x: m[3] + m[0], y: m[7] + m[4], z: m[11] + m[8] },
        distance: m[15] + m[12],
      })
    );

    // Right plane
    planes.push(
      this.normalizePlane({
        normal: { x: m[3] - m[0], y: m[7] - m[4], z: m[11] - m[8] },
        distance: m[15] - m[12],
      })
    );

    // Bottom plane
    planes.push(
      this.normalizePlane({
        normal: { x: m[3] + m[1], y: m[7] + m[5], z: m[11] + m[9] },
        distance: m[15] + m[13],
      })
    );

    // Top plane
    planes.push(
      this.normalizePlane({
        normal: { x: m[3] - m[1], y: m[7] - m[5], z: m[11] - m[9] },
        distance: m[15] - m[13],
      })
    );

    // Near plane
    planes.push(
      this.normalizePlane({
        normal: { x: m[3] + m[2], y: m[7] + m[6], z: m[11] + m[10] },
        distance: m[15] + m[14],
      })
    );

    // Far plane
    planes.push(
      this.normalizePlane({
        normal: { x: m[3] - m[2], y: m[7] - m[6], z: m[11] - m[10] },
        distance: m[15] - m[14],
      })
    );

    return { planes };
  }

  /**
   * Build frustum from camera configuration
   */
  static fromConfig(config: FrustumConfig, _position: Vec3, forward: Vec3): Frustum {
    const { fov, aspect, near, far } = config;

    const halfHeight = Math.tan(fov / 2);
    const halfWidth = halfHeight * aspect;

    // Simplified frustum - would need full orientation for accurate planes
    const planes: Plane[] = [];

    // Near plane
    planes.push({
      normal: vec3Normalize(forward),
      distance: -near,
    });

    // Far plane
    planes.push({
      normal: vec3Normalize({ x: -forward.x, y: -forward.y, z: -forward.z }),
      distance: far,
    });

    // Add simplified side planes (would need right/up vectors for accuracy)
    // Left
    planes.push({
      normal: { x: halfWidth, y: 0, z: 1 },
      distance: 0,
    });

    // Right
    planes.push({
      normal: { x: -halfWidth, y: 0, z: 1 },
      distance: 0,
    });

    // Top
    planes.push({
      normal: { x: 0, y: -halfHeight, z: 1 },
      distance: 0,
    });

    // Bottom
    planes.push({
      normal: { x: 0, y: halfHeight, z: 1 },
      distance: 0,
    });

    return { planes: planes.map((p) => this.normalizePlane(p)) };
  }

  private static normalizePlane(plane: Plane): Plane {
    const len = Math.sqrt(
      plane.normal.x ** 2 + plane.normal.y ** 2 + plane.normal.z ** 2
    );
    if (len === 0) return plane;

    return {
      normal: {
        x: plane.normal.x / len,
        y: plane.normal.y / len,
        z: plane.normal.z / len,
      },
      distance: plane.distance / len,
    };
  }
}

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_SELECTION_CRITERIA: LODSelectionCriteria = {
  screenCoverageWeight: 0.5,
  distanceWeight: 0.3,
  velocityWeight: 0.1,
  foveationWeight: 0.1,
};

const DEFAULT_BUDGET: LODBudget = {
  maxTriangles: 2_000_000,
  maxDrawCalls: 1000,
  targetFrameTime: 11.1, // 90fps target for VR
  currentTriangles: 0,
  currentDrawCalls: 0,
};

const DEFAULT_ADAPTIVE_CONFIG: AdaptiveConfig = {
  enabled: true,
  targetFps: 90,
  minFps: 72,
  adaptationRate: 0.1,
  qualityBias: 0,
};

// ============================================================================
// LOD Group Manager
// ============================================================================

/**
 * Manages a collection of LOD groups
 */
export class LODGroupManager {
  private groups: Map<string, LODGroup> = new Map();
  private transitions: Map<string, LODTransition> = new Map();
  private transitionDuration: number;
  private smoothTransitions: boolean;

  constructor(options: { transitionDuration?: number; smoothTransitions?: boolean } = {}) {
    this.transitionDuration = options.transitionDuration ?? 200;
    this.smoothTransitions = options.smoothTransitions ?? true;
  }

  /**
   * Register a LOD group
   */
  register(group: LODGroup): void {
    this.groups.set(group.id, group);
  }

  /**
   * Unregister a LOD group
   */
  unregister(id: string): void {
    this.groups.delete(id);
    this.transitions.delete(id);
  }

  /**
   * Get a LOD group
   */
  get(id: string): LODGroup | undefined {
    return this.groups.get(id);
  }

  /**
   * Get all groups
   */
  getAll(): LODGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * Update group position
   */
  updatePosition(id: string, position: Vec3): void {
    const group = this.groups.get(id);
    if (group) {
      group.position = position;
      group.bounds.center = position;
    }
  }

  /**
   * Set active LOD level for a group
   */
  setActiveLevel(id: string, level: number): void {
    const group = this.groups.get(id);
    if (!group) return;

    const previousLevel = group.activeLevel;
    if (previousLevel === level) return;

    if (this.smoothTransitions) {
      this.transitions.set(id, {
        from: previousLevel,
        to: level,
        progress: 0,
        duration: this.transitionDuration,
        startTime: Date.now(),
      });
    }

    group.activeLevel = level;
  }

  /**
   * Update transitions
   */
  updateTransitions(): void {
    const now = Date.now();

    for (const [id, transition] of this.transitions) {
      const elapsed = now - transition.startTime;
      transition.progress = Math.min(1, elapsed / transition.duration);

      if (transition.progress >= 1) {
        this.transitions.delete(id);
      }
    }
  }

  /**
   * Get transition state for a group
   */
  getTransition(id: string): LODTransition | undefined {
    return this.transitions.get(id);
  }

  /**
   * Check if group is transitioning
   */
  isTransitioning(id: string): boolean {
    return this.transitions.has(id);
  }

  /**
   * Get count
   */
  get count(): number {
    return this.groups.size;
  }

  /**
   * Clear all groups
   */
  clear(): void {
    this.groups.clear();
    this.transitions.clear();
  }
}

// ============================================================================
// LOD Manager
// ============================================================================

/**
 * Main LOD management system
 */
export class LODManager {
  private groupManager: LODGroupManager;
  private criteria: LODSelectionCriteria;
  private budget: LODBudget;
  private hysteresis: number;
  private handlers: Set<VisibilityEventHandler> = new Set();
  private lastCamera: Camera | null = null;
  private foveation: FoveationConfig | null = null;

  constructor(config: Partial<LODManagerConfig> = {}) {
    this.groupManager = new LODGroupManager({
      transitionDuration: config.transitionDuration ?? 200,
      smoothTransitions: config.smoothTransitions ?? true,
    });
    this.criteria = config.selectionCriteria ?? DEFAULT_SELECTION_CRITERIA;
    this.budget = config.budget ?? { ...DEFAULT_BUDGET };
    this.hysteresis = config.hysteresis ?? 0.1;
  }

  /**
   * Subscribe to visibility events
   */
  on(handler: VisibilityEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Register a LOD group
   */
  registerGroup(group: LODGroup): void {
    this.groupManager.register(group);
  }

  /**
   * Unregister a LOD group
   */
  unregisterGroup(id: string): void {
    this.groupManager.unregister(id);
  }

  /**
   * Set foveation configuration for VR
   */
  setFoveation(config: FoveationConfig): void {
    this.foveation = config;
  }

  /**
   * Update LOD selection for all groups
   */
  update(camera: Camera): LODSelectionResult[] {
    this.lastCamera = camera;
    this.groupManager.updateTransitions();

    const results: LODSelectionResult[] = [];
    this.budget.currentTriangles = 0;
    this.budget.currentDrawCalls = 0;

    const groups = this.groupManager.getAll();

    // Sort by importance and distance
    const sortedGroups = groups
      .map((group) => ({
        group,
        distance: vec3Distance(camera.position, group.position),
      }))
      .sort((a, b) => {
        const importanceA = a.group.importance ?? 1;
        const importanceB = b.group.importance ?? 1;
        return importanceB / a.distance - importanceA / b.distance;
      });

    for (const { group, distance } of sortedGroups) {
      // Frustum culling
      if (!sphereInFrustum(group.bounds, camera.frustum)) {
        if (group.visible) {
          group.visible = false;
          this.emit({
            type: 'became-hidden',
            objectId: group.id,
            timestamp: Date.now(),
          });
        }
        continue;
      }

      // Select LOD level
      const screenCoverage = calculateScreenCoverage(group.bounds, camera);
      const result = this.selectLevel(group, distance, screenCoverage);
      results.push(result);

      // Update visibility
      if (!group.visible) {
        group.visible = true;
        this.emit({
          type: 'became-visible',
          objectId: group.id,
          timestamp: Date.now(),
        });
      }

      // Update active level if changed
      if (result.level !== group.activeLevel) {
        const previousLevel = group.activeLevel;
        this.groupManager.setActiveLevel(group.id, result.level);
        this.emit({
          type: 'lod-changed',
          objectId: group.id,
          timestamp: Date.now(),
          previousLevel,
          currentLevel: result.level,
        });
      }

      // Update budget
      const level = group.levels[result.level];
      if (level?.triangleCount) {
        this.budget.currentTriangles += level.triangleCount;
      }
      this.budget.currentDrawCalls++;
    }

    return results;
  }

  /**
   * Select appropriate LOD level for a group
   */
  private selectLevel(
    group: LODGroup,
    distance: number,
    screenCoverage: number
  ): LODSelectionResult {
    const levels = group.levels;
    if (levels.length === 0) {
      return {
        groupId: group.id,
        level: 0,
        score: 0,
        screenCoverage,
        distance,
      };
    }

    let selectedLevel = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];

      // Check distance constraint
      if (distance > level.maxDistance) continue;

      // Check screen coverage constraint
      if (screenCoverage < level.minScreenCoverage) continue;

      // Calculate score
      let score = 0;

      // Screen coverage contribution
      score +=
        (1 - Math.abs(screenCoverage - level.minScreenCoverage)) *
        this.criteria.screenCoverageWeight;

      // Distance contribution (prefer higher LOD when closer)
      const normalizedDistance = distance / level.maxDistance;
      score += (1 - normalizedDistance) * this.criteria.distanceWeight;

      // Foveation contribution
      if (this.foveation?.enabled && this.foveation.gazePoint) {
        const foveationScore = this.calculateFoveationScore(group.position);
        score += foveationScore * this.criteria.foveationWeight;
      }

      // Apply hysteresis to current level
      if (i === group.activeLevel) {
        score += this.hysteresis;
      }

      if (score > bestScore) {
        bestScore = score;
        selectedLevel = i;
      }
    }

    return {
      groupId: group.id,
      level: selectedLevel,
      score: bestScore,
      screenCoverage,
      distance,
    };
  }

  /**
   * Calculate foveation score based on gaze
   */
  private calculateFoveationScore(position: Vec3): number {
    if (!this.foveation || !this.lastCamera) return 0;

    // Simplified foveation - would need proper gaze ray projection
    const distance = vec3Distance(this.lastCamera.position, position);
    const normalizedDist = Math.min(
      1,
      distance / this.foveation.outerRadius
    );

    if (normalizedDist < this.foveation.innerRadius / this.foveation.outerRadius) {
      return 1; // Full quality in foveal region
    }

    return 1 - normalizedDist * this.foveation.peripheryReduction;
  }

  /**
   * Get current budget status
   */
  getBudget(): LODBudget {
    return { ...this.budget };
  }

  /**
   * Check if budget is exceeded
   */
  isBudgetExceeded(): boolean {
    return (
      this.budget.currentTriangles > this.budget.maxTriangles ||
      this.budget.currentDrawCalls > this.budget.maxDrawCalls
    );
  }

  /**
   * Get group manager
   */
  getGroupManager(): LODGroupManager {
    return this.groupManager;
  }

  /**
   * Get all visible groups
   */
  getVisibleGroups(): LODGroup[] {
    return this.groupManager.getAll().filter((g) => g.visible);
  }

  private emit(event: VisibilityEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[LODManager] Handler error:', error);
      }
    }
  }
}

// ============================================================================
// Adaptive LOD Controller
// ============================================================================

/**
 * Automatically adjusts LOD based on performance
 */
export class AdaptiveLODController {
  private config: AdaptiveConfig;
  private lodManager: LODManager;
  private metrics: PerformanceMetrics;
  private qualityMultiplier = 1.0;
  private frameHistory: number[] = [];
  private maxHistoryLength = 60;

  constructor(lodManager: LODManager, config: Partial<AdaptiveConfig> = {}) {
    this.lodManager = lodManager;
    this.config = { ...DEFAULT_ADAPTIVE_CONFIG, ...config };
    this.metrics = {
      fps: this.config.targetFps,
      frameTime: 1000 / this.config.targetFps,
      trianglesRendered: 0,
      drawCalls: 0,
      objectsRendered: 0,
      memoryUsage: 0,
    };
  }

  /**
   * Update with frame metrics
   */
  update(frameTime: number): void {
    if (!this.config.enabled) return;

    // Track frame history
    this.frameHistory.push(frameTime);
    if (this.frameHistory.length > this.maxHistoryLength) {
      this.frameHistory.shift();
    }

    // Calculate average FPS
    const avgFrameTime =
      this.frameHistory.reduce((a, b) => a + b, 0) / this.frameHistory.length;
    const currentFps = 1000 / avgFrameTime;

    this.metrics.fps = currentFps;
    this.metrics.frameTime = avgFrameTime;

    // Adapt quality
    this.adaptQuality(currentFps);
  }

  /**
   * Adapt quality based on FPS
   */
  private adaptQuality(currentFps: number): void {
    const targetFps = this.config.targetFps;
    const minFps = this.config.minFps;
    const rate = this.config.adaptationRate;
    const bias = this.config.qualityBias;

    if (currentFps < minFps) {
      // Critical - reduce quality faster
      this.qualityMultiplier = Math.max(
        0.25,
        this.qualityMultiplier - rate * 2
      );
    } else if (currentFps < targetFps * 0.95) {
      // Below target - reduce quality
      this.qualityMultiplier = Math.max(
        0.25,
        this.qualityMultiplier - rate
      );
    } else if (currentFps > targetFps * 1.1) {
      // Above target - can increase quality
      const maxQuality = 1.0 + bias * 0.5;
      this.qualityMultiplier = Math.min(
        maxQuality,
        this.qualityMultiplier + rate * 0.5
      );
    }

    // Quality multiplier is applied via getQualityMultiplier() for external use
    // Budget scaling would be handled by the rendering system
  }

  /**
   * Get current quality multiplier
   */
  getQualityMultiplier(): number {
    return this.qualityMultiplier;
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    const budget = this.lodManager.getBudget();
    return {
      ...this.metrics,
      trianglesRendered: budget.currentTriangles,
      drawCalls: budget.currentDrawCalls,
      objectsRendered: this.lodManager.getVisibleGroups().length,
    };
  }

  /**
   * Set quality bias
   */
  setQualityBias(bias: number): void {
    this.config.qualityBias = Math.max(-1, Math.min(1, bias));
  }

  /**
   * Reset adaptation
   */
  reset(): void {
    this.qualityMultiplier = 1.0;
    this.frameHistory = [];
  }

  /**
   * Enable/disable adaptation
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.qualityMultiplier = 1.0;
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a LOD manager
 */
export function createLODManager(config?: Partial<LODManagerConfig>): LODManager {
  return new LODManager(config);
}

/**
 * Create an adaptive LOD controller
 */
export function createAdaptiveLODController(
  lodManager: LODManager,
  config?: Partial<AdaptiveConfig>
): AdaptiveLODController {
  return new AdaptiveLODController(lodManager, config);
}

/**
 * Create a LOD group
 */
export function createLODGroup(options: {
  id: string;
  levels: Omit<LODLevel, 'index'>[];
  position?: Vec3;
  radius?: number;
  importance?: number;
}): LODGroup {
  const levels: LODLevel[] = options.levels.map((level, index) => ({
    ...level,
    index,
  }));

  return {
    id: options.id,
    levels,
    bounds: {
      center: options.position ?? { x: 0, y: 0, z: 0 },
      radius: options.radius ?? 1,
    },
    activeLevel: 0,
    visible: true,
    position: options.position ?? { x: 0, y: 0, z: 0 },
    importance: options.importance,
  };
}
