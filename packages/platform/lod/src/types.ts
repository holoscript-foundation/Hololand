/**
 * @hololand/lod - Types
 * Level of Detail system type definitions
 */

// ============================================================================
// Vector & Math Types
// ============================================================================

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Vec4 {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Mat4 {
  elements: Float32Array | number[];
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

// ============================================================================
// Bounding Volume Types
// ============================================================================

export interface BoundingSphere {
  center: Vec3;
  radius: number;
}

export interface BoundingBox {
  min: Vec3;
  max: Vec3;
}

export interface OrientedBoundingBox {
  center: Vec3;
  halfExtents: Vec3;
  orientation: Quaternion;
}

// ============================================================================
// Frustum Types
// ============================================================================

export interface Plane {
  normal: Vec3;
  distance: number;
}

export interface Frustum {
  planes: Plane[]; // 6 planes: near, far, left, right, top, bottom
  corners?: Vec3[]; // 8 frustum corners for precise culling
}

export interface FrustumConfig {
  fov: number;
  aspect: number;
  near: number;
  far: number;
}

// ============================================================================
// LOD Level Types
// ============================================================================

export type LODQuality = 'ultra' | 'high' | 'medium' | 'low' | 'minimal';

export interface LODLevel {
  /** Level index (0 = highest quality) */
  index: number;
  /** Quality tier */
  quality: LODQuality;
  /** Minimum screen coverage to use this level (0-1) */
  minScreenCoverage: number;
  /** Maximum distance to use this level */
  maxDistance: number;
  /** Asset path or identifier */
  assetId: string;
  /** Triangle count for this level */
  triangleCount?: number;
  /** Texture resolution multiplier */
  textureScale?: number;
}

export interface LODGroup {
  /** Group identifier */
  id: string;
  /** LOD levels (sorted by quality, highest first) */
  levels: LODLevel[];
  /** Bounding sphere for distance calculations */
  bounds: BoundingSphere;
  /** Current active level */
  activeLevel: number;
  /** Is currently visible */
  visible: boolean;
  /** World transform position */
  position: Vec3;
  /** Optional importance multiplier */
  importance?: number;
}

export interface LODTransition {
  /** Source level */
  from: number;
  /** Target level */
  to: number;
  /** Transition progress (0-1) */
  progress: number;
  /** Transition duration (ms) */
  duration: number;
  /** Start time */
  startTime: number;
}

// ============================================================================
// LOD Selection Types
// ============================================================================

export interface LODSelectionCriteria {
  /** Screen coverage weight */
  screenCoverageWeight: number;
  /** Distance weight */
  distanceWeight: number;
  /** Velocity weight (moving objects need lower LOD) */
  velocityWeight: number;
  /** Foveation weight (for VR) */
  foveationWeight: number;
}

export interface LODSelectionResult {
  /** Group ID */
  groupId: string;
  /** Selected level index */
  level: number;
  /** Selection score */
  score: number;
  /** Screen coverage */
  screenCoverage: number;
  /** Distance from camera */
  distance: number;
}

// ============================================================================
// Culling Types
// ============================================================================

export type CullingMode = 'frustum' | 'distance' | 'occlusion' | 'combined';

export interface CullingConfig {
  /** Enable frustum culling */
  frustumCulling: boolean;
  /** Enable distance culling */
  distanceCulling: boolean;
  /** Max distance for rendering */
  maxRenderDistance: number;
  /** Enable occlusion culling */
  occlusionCulling: boolean;
  /** Enable small object culling */
  smallObjectCulling: boolean;
  /** Minimum screen size for rendering (pixels) */
  minScreenSize: number;
}

export interface CullingResult {
  /** Object ID */
  id: string;
  /** Is visible */
  visible: boolean;
  /** Culling reason if not visible */
  reason?: 'frustum' | 'distance' | 'occlusion' | 'size' | 'manual';
  /** Distance from camera */
  distance?: number;
  /** Screen size in pixels */
  screenSize?: number;
}

export interface CullingStats {
  /** Total objects checked */
  totalObjects: number;
  /** Objects passed culling */
  visibleObjects: number;
  /** Frustum culled count */
  frustumCulled: number;
  /** Distance culled count */
  distanceCulled: number;
  /** Occlusion culled count */
  occlusionCulled: number;
  /** Small object culled count */
  sizeCulled: number;
  /** Time taken (ms) */
  processingTime: number;
}

// ============================================================================
// Occlusion Types
// ============================================================================

export interface Occluder {
  /** Occluder ID */
  id: string;
  /** Bounding box */
  bounds: BoundingBox;
  /** Is active */
  active: boolean;
  /** Priority (higher = checked first) */
  priority: number;
}

export interface OcclusionQuery {
  /** Query ID */
  id: string;
  /** Is query pending */
  pending: boolean;
  /** Last result */
  visible: boolean;
  /** Samples passed */
  samplesPassed: number;
}

// ============================================================================
// Visibility Types
// ============================================================================

export interface VisibilityState {
  /** Object ID */
  id: string;
  /** Is visible this frame */
  visibleThisFrame: boolean;
  /** Was visible last frame */
  visibleLastFrame: boolean;
  /** Frames since visibility changed */
  framesSinceChange: number;
  /** Last visible timestamp */
  lastVisibleTime: number;
}

export interface VisibilityEvent {
  type: 'became-visible' | 'became-hidden' | 'lod-changed';
  objectId: string;
  timestamp: number;
  previousLevel?: number;
  currentLevel?: number;
}

export type VisibilityEventHandler = (event: VisibilityEvent) => void;

// ============================================================================
// Performance Types
// ============================================================================

export interface LODBudget {
  /** Maximum triangles per frame */
  maxTriangles: number;
  /** Maximum draw calls */
  maxDrawCalls: number;
  /** Target frame time (ms) */
  targetFrameTime: number;
  /** Current triangle count */
  currentTriangles: number;
  /** Current draw calls */
  currentDrawCalls: number;
}

export interface AdaptiveConfig {
  /** Enable adaptive LOD */
  enabled: boolean;
  /** Target FPS */
  targetFps: number;
  /** Minimum acceptable FPS */
  minFps: number;
  /** Adaptation speed (0-1) */
  adaptationRate: number;
  /** Quality bias (positive = quality, negative = performance) */
  qualityBias: number;
}

export interface PerformanceMetrics {
  /** Current FPS */
  fps: number;
  /** Frame time (ms) */
  frameTime: number;
  /** GPU time (ms) if available */
  gpuTime?: number;
  /** Triangle count rendered */
  trianglesRendered: number;
  /** Draw call count */
  drawCalls: number;
  /** Objects rendered */
  objectsRendered: number;
  /** Memory usage (bytes) */
  memoryUsage: number;
}

// ============================================================================
// Manager Config Types
// ============================================================================

export interface LODManagerConfig {
  /** LOD selection criteria */
  selectionCriteria: LODSelectionCriteria;
  /** Culling configuration */
  culling: CullingConfig;
  /** Adaptive LOD configuration */
  adaptive: AdaptiveConfig;
  /** LOD budget */
  budget: LODBudget;
  /** Transition duration (ms) */
  transitionDuration: number;
  /** Enable smooth transitions */
  smoothTransitions: boolean;
  /** Hysteresis factor to prevent LOD thrashing */
  hysteresis: number;
}

// ============================================================================
// Camera Types
// ============================================================================

export interface Camera {
  /** Camera position */
  position: Vec3;
  /** Camera forward direction */
  forward: Vec3;
  /** View matrix */
  viewMatrix: Mat4;
  /** Projection matrix */
  projectionMatrix: Mat4;
  /** Combined view-projection matrix */
  viewProjectionMatrix: Mat4;
  /** Frustum for culling */
  frustum: Frustum;
  /** Viewport dimensions */
  viewport: { width: number; height: number };
  /** Field of view (radians) */
  fov: number;
  /** Aspect ratio */
  aspect: number;
  /** Near plane */
  near: number;
  /** Far plane */
  far: number;
}

// ============================================================================
// VR-Specific Types
// ============================================================================

export interface FoveationConfig {
  /** Enable foveated rendering LOD */
  enabled: boolean;
  /** Inner radius (full quality) */
  innerRadius: number;
  /** Outer radius (reduced quality) */
  outerRadius: number;
  /** Quality reduction factor for periphery */
  peripheryReduction: number;
  /** Gaze point (normalized -1 to 1) */
  gazePoint?: { x: number; y: number };
}

export interface StereoLODConfig {
  /** Enable stereo LOD optimization */
  enabled: boolean;
  /** Use shared LOD for both eyes */
  sharedLOD: boolean;
  /** Inter-pupillary distance */
  ipd: number;
}
