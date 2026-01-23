/**
 * AR Filter Manager
 *
 * Manages AR overlay filters for face, body, environment, and object augmentation.
 * Integrates with Hololand's detection systems for real-time tracking.
 *
 * Features:
 * - Face filters (masks, makeup, effects)
 * - Body filters (clothing, poses)
 * - Environment filters (sky replacement, lighting)
 * - Object augmentation (labels, info overlays)
 * - Portal effects
 * - HoloScript-driven dynamic filters
 */

import type {
  ARFilter,
  ARFilterAsset,
  ARAttachment,
  ARFilterAnimation,
  AROverlayState,
  FaceDetection,
  FaceLandmark,
  SurfaceAnchor,
  WorldAnchor,
  FilterCategory,
  Vector2,
  Vector3,
  Quaternion,
  Transform,
} from '../types';

export interface ARFilterManagerConfig {
  /** Maximum concurrent face detections */
  maxFaces: number;
  /** Enable body tracking */
  enableBodyTracking: boolean;
  /** Enable surface detection */
  enableSurfaceDetection: boolean;
  /** Filter smoothing (0-1) */
  smoothing: number;
  /** Debug visualization */
  debug: boolean;
}

const DEFAULT_CONFIG: ARFilterManagerConfig = {
  maxFaces: 4,
  enableBodyTracking: false,
  enableSurfaceDetection: true,
  smoothing: 0.3,
  debug: false,
};

/**
 * ARFilterManager - AR Overlay Engine
 */
export class ARFilterManager {
  private config: ARFilterManagerConfig;
  private filters: Map<string, ARFilter> = new Map();
  private activeFilters: Map<string, ARFilter> = new Map();
  private detectedFaces: FaceDetection[] = [];
  private surfaceAnchors: Map<string, SurfaceAnchor> = new Map();
  private worldAnchors: Map<string, WorldAnchor> = new Map();
  private animationStates: Map<string, AnimationState> = new Map();
  private isTracking = false;
  private lastFrameTime = 0;
  private fps = 0;

  constructor(config?: Partial<ARFilterManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a filter
   */
  registerFilter(filter: ARFilter): void {
    this.filters.set(filter.id, filter);
  }

  /**
   * Remove a filter
   */
  unregisterFilter(filterId: string): void {
    this.filters.delete(filterId);
    this.activeFilters.delete(filterId);
  }

  /**
   * Activate a filter
   */
  activateFilter(filterId: string): boolean {
    const filter = this.filters.get(filterId);
    if (!filter) return false;

    this.activeFilters.set(filterId, filter);

    // Initialize animation state if needed
    if (filter.animation) {
      this.animationStates.set(filterId, {
        filterId,
        startTime: Date.now(),
        progress: 0,
        triggered: false,
      });
    }

    return true;
  }

  /**
   * Deactivate a filter
   */
  deactivateFilter(filterId: string): void {
    this.activeFilters.delete(filterId);
    this.animationStates.delete(filterId);
  }

  /**
   * Update with new detection data
   */
  update(faces: FaceDetection[], deltaTime: number): AROverlayState {
    const now = Date.now();
    this.fps = 1000 / (now - this.lastFrameTime);
    this.lastFrameTime = now;

    // Smooth face detections
    this.detectedFaces = this.smoothDetections(faces);
    this.isTracking = this.detectedFaces.length > 0;

    // Update animations
    this.updateAnimations(deltaTime);

    return this.getState();
  }

  /**
   * Get current overlay state
   */
  getState(): AROverlayState {
    return {
      activeFilters: new Map(this.activeFilters),
      detectedFaces: [...this.detectedFaces],
      surfaceAnchors: Array.from(this.surfaceAnchors.values()),
      worldAnchors: Array.from(this.worldAnchors.values()),
      isTracking: this.isTracking,
      fps: this.fps,
    };
  }

  /**
   * Get filter attachment transforms
   */
  getFilterAttachments(filterId: string): AttachmentResult[] {
    const filter = this.activeFilters.get(filterId);
    if (!filter) return [];

    const results: AttachmentResult[] = [];

    for (const attachment of filter.attachments) {
      const transform = this.calculateAttachmentTransform(attachment);
      if (transform) {
        results.push({
          assetId: attachment.assetId,
          transform,
          visible: true,
          animationProgress: this.animationStates.get(filterId)?.progress ?? 1,
        });
      }
    }

    return results;
  }

  /**
   * Calculate transform for an attachment
   */
  private calculateAttachmentTransform(attachment: ARAttachment): Transform | null {
    const target = attachment.target;

    // Face landmark attachment
    if (this.isFaceLandmark(target)) {
      return this.getFaceLandmarkTransform(target, attachment);
    }

    // Head attachment (uses face rotation)
    if (target === 'head') {
      return this.getHeadTransform(attachment);
    }

    // Surface attachment
    if (target === 'surface') {
      return this.getSurfaceTransform(attachment);
    }

    // World anchor attachment
    if (target === 'world') {
      return this.getWorldTransform(attachment);
    }

    return null;
  }

  private isFaceLandmark(target: string): target is FaceLandmark {
    const landmarks: FaceLandmark[] = [
      'leftEye', 'rightEye', 'nose', 'mouth', 'leftEar',
      'rightEar', 'chin', 'forehead', 'leftCheek', 'rightCheek',
    ];
    return landmarks.includes(target as FaceLandmark);
  }

  private getFaceLandmarkTransform(
    landmark: FaceLandmark,
    attachment: ARAttachment
  ): Transform | null {
    if (this.detectedFaces.length === 0) return null;

    const face = this.detectedFaces[0];
    const point = face.landmarks.get(landmark);
    if (!point) return null;

    // Convert 2D point to 3D (using face depth estimation)
    const depth = 0.5; // Estimated face distance
    const position: Vector3 = {
      x: (point.x - 0.5) * depth * 2 + attachment.offset.position.x,
      y: (0.5 - point.y) * depth * 2 + attachment.offset.position.y,
      z: depth + attachment.offset.position.z,
    };

    // Use face rotation if available
    const rotation = face.rotation || { x: 0, y: 0, z: 0, w: 1 };

    return {
      position,
      rotation: this.multiplyQuaternions(rotation, attachment.offset.rotation),
      scale: {
        x: attachment.scale * attachment.offset.scale.x,
        y: attachment.scale * attachment.offset.scale.y,
        z: attachment.scale * attachment.offset.scale.z,
      },
    };
  }

  private getHeadTransform(attachment: ARAttachment): Transform | null {
    if (this.detectedFaces.length === 0) return null;

    const face = this.detectedFaces[0];

    // Calculate head center from landmarks
    const nose = face.landmarks.get('nose');
    const forehead = face.landmarks.get('forehead');
    if (!nose) return null;

    const centerY = forehead ? (nose.y + forehead.y) / 2 : nose.y;
    const depth = 0.5;

    const position: Vector3 = {
      x: (nose.x - 0.5) * depth * 2 + attachment.offset.position.x,
      y: (0.5 - centerY) * depth * 2 + attachment.offset.position.y,
      z: depth + attachment.offset.position.z,
    };

    const rotation = face.rotation || { x: 0, y: 0, z: 0, w: 1 };

    return {
      position,
      rotation: this.multiplyQuaternions(rotation, attachment.offset.rotation),
      scale: {
        x: attachment.scale * attachment.offset.scale.x,
        y: attachment.scale * attachment.offset.scale.y,
        z: attachment.scale * attachment.offset.scale.z,
      },
    };
  }

  private getSurfaceTransform(attachment: ARAttachment): Transform | null {
    if (this.surfaceAnchors.size === 0) return null;

    // Get first horizontal surface
    for (const anchor of this.surfaceAnchors.values()) {
      if (anchor.type === 'horizontal') {
        return {
          position: {
            x: anchor.position.x + attachment.offset.position.x,
            y: anchor.position.y + attachment.offset.position.y,
            z: anchor.position.z + attachment.offset.position.z,
          },
          rotation: this.multiplyQuaternions(anchor.rotation, attachment.offset.rotation),
          scale: {
            x: attachment.scale * attachment.offset.scale.x,
            y: attachment.scale * attachment.offset.scale.y,
            z: attachment.scale * attachment.offset.scale.z,
          },
        };
      }
    }

    return null;
  }

  private getWorldTransform(attachment: ARAttachment): Transform | null {
    // Return offset as world position
    return {
      position: attachment.offset.position,
      rotation: attachment.offset.rotation,
      scale: {
        x: attachment.scale * attachment.offset.scale.x,
        y: attachment.scale * attachment.offset.scale.y,
        z: attachment.scale * attachment.offset.scale.z,
      },
    };
  }

  /**
   * Smooth face detections to reduce jitter
   */
  private smoothDetections(newFaces: FaceDetection[]): FaceDetection[] {
    if (this.config.smoothing === 0) return newFaces;

    const alpha = this.config.smoothing;
    const smoothed: FaceDetection[] = [];

    for (const newFace of newFaces) {
      // Find matching previous face
      const prevFace = this.detectedFaces.find(
        (f) => this.faceOverlap(f.bounds, newFace.bounds) > 0.5
      );

      if (prevFace) {
        // Smooth landmarks
        const smoothedLandmarks = new Map<FaceLandmark, Vector2>();
        for (const [key, newPoint] of newFace.landmarks) {
          const prevPoint = prevFace.landmarks.get(key);
          if (prevPoint) {
            smoothedLandmarks.set(key, {
              x: prevPoint.x * alpha + newPoint.x * (1 - alpha),
              y: prevPoint.y * alpha + newPoint.y * (1 - alpha),
            });
          } else {
            smoothedLandmarks.set(key, newPoint);
          }
        }

        smoothed.push({
          ...newFace,
          landmarks: smoothedLandmarks,
          rotation: prevFace.rotation && newFace.rotation
            ? this.slerpQuaternion(prevFace.rotation, newFace.rotation, 1 - alpha)
            : newFace.rotation,
        });
      } else {
        smoothed.push(newFace);
      }
    }

    return smoothed;
  }

  private faceOverlap(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): number {
    const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
    const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
    const overlapArea = overlapX * overlapY;
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    return overlapArea / Math.min(areaA, areaB);
  }

  /**
   * Update filter animations
   */
  private updateAnimations(deltaTime: number): void {
    for (const [filterId, state] of this.animationStates) {
      const filter = this.activeFilters.get(filterId);
      if (!filter?.animation) continue;

      const anim = filter.animation;

      if (anim.type === 'loop') {
        const duration = anim.duration || 1;
        state.progress = ((Date.now() - state.startTime) / 1000 / duration) % 1;
      } else if (anim.type === 'trigger' && anim.trigger) {
        // Check for expression trigger
        const triggered = this.checkExpressionTrigger(anim.trigger);
        if (triggered && !state.triggered) {
          state.triggered = true;
          state.startTime = Date.now();
        }
        if (state.triggered) {
          const duration = anim.duration || 0.5;
          state.progress = Math.min((Date.now() - state.startTime) / 1000 / duration, 1);
          if (state.progress >= 1) {
            state.triggered = false;
          }
        }
      } else if (anim.type === 'expression') {
        // Expression-driven animation
        state.progress = this.getExpressionValue(anim.trigger || 'smile');
      }
    }
  }

  private checkExpressionTrigger(expression: string): boolean {
    if (this.detectedFaces.length === 0) return false;
    const face = this.detectedFaces[0];
    if (!face.expressions) return false;

    const value = face.expressions.get(expression) || 0;
    return value > 0.7;
  }

  private getExpressionValue(expression: string): number {
    if (this.detectedFaces.length === 0) return 0;
    const face = this.detectedFaces[0];
    if (!face.expressions) return 0;

    return face.expressions.get(expression) || 0;
  }

  // Surface anchor management
  addSurfaceAnchor(anchor: SurfaceAnchor): void {
    this.surfaceAnchors.set(anchor.id, anchor);
  }

  removeSurfaceAnchor(anchorId: string): void {
    this.surfaceAnchors.delete(anchorId);
  }

  // World anchor management
  addWorldAnchor(anchor: WorldAnchor): void {
    this.worldAnchors.set(anchor.id, anchor);
  }

  removeWorldAnchor(anchorId: string): void {
    this.worldAnchors.delete(anchorId);
  }

  // Quaternion utilities
  private multiplyQuaternions(a: Quaternion, b: Quaternion): Quaternion {
    return {
      x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
      y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
      z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
      w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    };
  }

  private slerpQuaternion(a: Quaternion, b: Quaternion, t: number): Quaternion {
    let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;

    if (dot < 0) {
      b = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
      dot = -dot;
    }

    if (dot > 0.9995) {
      return this.normalizeQuaternion({
        x: a.x + t * (b.x - a.x),
        y: a.y + t * (b.y - a.y),
        z: a.z + t * (b.z - a.z),
        w: a.w + t * (b.w - a.w),
      });
    }

    const theta0 = Math.acos(dot);
    const theta = theta0 * t;
    const sinTheta = Math.sin(theta);
    const sinTheta0 = Math.sin(theta0);

    const s0 = Math.cos(theta) - (dot * sinTheta) / sinTheta0;
    const s1 = sinTheta / sinTheta0;

    return {
      x: a.x * s0 + b.x * s1,
      y: a.y * s0 + b.y * s1,
      z: a.z * s0 + b.z * s1,
      w: a.w * s0 + b.w * s1,
    };
  }

  private normalizeQuaternion(q: Quaternion): Quaternion {
    const len = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
    if (len === 0) return { x: 0, y: 0, z: 0, w: 1 };
    return { x: q.x / len, y: q.y / len, z: q.z / len, w: q.w / len };
  }

  // Getters
  getRegisteredFilters(): ARFilter[] {
    return Array.from(this.filters.values());
  }

  getActiveFilterIds(): string[] {
    return Array.from(this.activeFilters.keys());
  }

  isFilterActive(filterId: string): boolean {
    return this.activeFilters.has(filterId);
  }
}

interface AnimationState {
  filterId: string;
  startTime: number;
  progress: number;
  triggered: boolean;
}

export interface AttachmentResult {
  assetId: string;
  transform: Transform;
  visible: boolean;
  animationProgress: number;
}

/**
 * Create preset face filters
 */
export function createPresetFilters(): ARFilter[] {
  return [
    {
      id: 'sunglasses',
      name: 'Sunglasses',
      category: 'face',
      assets: [{ id: 'sunglasses_model', type: 'model', url: '/filters/sunglasses.glb' }],
      attachments: [
        {
          assetId: 'sunglasses_model',
          target: 'nose',
          offset: {
            position: { x: 0, y: 0.02, z: -0.02 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1, y: 1, z: 1 },
          },
          scale: 1,
          tracking: true,
        },
      ],
    },
    {
      id: 'crown',
      name: 'Crown',
      category: 'face',
      assets: [{ id: 'crown_model', type: 'model', url: '/filters/crown.glb' }],
      attachments: [
        {
          assetId: 'crown_model',
          target: 'forehead',
          offset: {
            position: { x: 0, y: 0.08, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1, y: 1, z: 1 },
          },
          scale: 1.2,
          tracking: true,
        },
      ],
    },
    {
      id: 'cat_ears',
      name: 'Cat Ears',
      category: 'face',
      assets: [{ id: 'cat_ears_model', type: 'model', url: '/filters/cat_ears.glb' }],
      attachments: [
        {
          assetId: 'cat_ears_model',
          target: 'head',
          offset: {
            position: { x: 0, y: 0.1, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1, y: 1, z: 1 },
          },
          scale: 1,
          tracking: true,
        },
      ],
    },
    {
      id: 'hologram_overlay',
      name: 'Hologram Effect',
      category: 'hologram',
      assets: [{ id: 'holo_shader', type: 'shader', url: '/filters/hologram.glsl' }],
      attachments: [
        {
          assetId: 'holo_shader',
          target: 'head',
          offset: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1.2, y: 1.2, z: 1.2 },
          },
          scale: 1,
          tracking: true,
        },
      ],
      animation: {
        type: 'loop',
        duration: 2,
      },
    },
  ];
}

/**
 * Create AR filter manager
 */
export function createARFilterManager(config?: Partial<ARFilterManagerConfig>): ARFilterManager {
  const manager = new ARFilterManager(config);

  // Register preset filters
  for (const filter of createPresetFilters()) {
    manager.registerFilter(filter);
  }

  return manager;
}
