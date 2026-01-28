/**
 * @hololand/animation
 *
 * Skeletal animation system for VR/AR - keyframes, blend trees, IK, and procedural animation.
 *
 * @example
 * ```typescript
 * import { AnimationSystem, AnimationClip, Skeleton } from '@hololand/animation';
 *
 * const system = new AnimationSystem();
 * const skeleton = system.createSkeleton(bones);
 * const clip = AnimationClip.fromGLTF(gltfAnimation);
 * system.playClip(skeleton, clip, { loop: true });
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Transform {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}

export interface Bone {
  id: string;
  name: string;
  parentId: string | null;
  localTransform: Transform;
  worldTransform: Transform;
  bindPose: Transform;
  children: string[];
}

export interface Keyframe<T> {
  time: number;
  value: T;
  inTangent?: T;
  outTangent?: T;
  interpolation: 'linear' | 'step' | 'cubic';
}

export interface AnimationTrack<T> {
  targetBoneId: string;
  property: 'position' | 'rotation' | 'scale';
  keyframes: Keyframe<T>[];
}

export interface AnimationClipData {
  name: string;
  duration: number;
  tracks: AnimationTrack<Vector3 | Quaternion>[];
}

export type BlendMode = 'override' | 'additive';

export interface PlaybackOptions {
  loop: boolean;
  speed: number;
  blendMode: BlendMode;
  weight: number;
  startTime: number;
}

export interface IKTarget {
  boneId: string;
  targetPosition: Vector3;
  targetRotation?: Quaternion;
  weight: number;
  chainLength: number;
}

// =============================================================================
// SKELETON
// =============================================================================

/**
 * Skeletal hierarchy for animation
 */
export class Skeleton {
  public readonly id: string;
  public readonly bones: Map<string, Bone> = new Map();
  public readonly rootBoneIds: string[] = [];

  constructor(id: string, boneData: Bone[]) {
    this.id = id;

    for (const bone of boneData) {
      this.bones.set(bone.id, { ...bone });
      if (!bone.parentId) {
        this.rootBoneIds.push(bone.id);
      }
    }
  }

  /**
   * Get bone by ID
   */
  getBone(id: string): Bone | undefined {
    return this.bones.get(id);
  }

  /**
   * Get bone by name
   */
  getBoneByName(name: string): Bone | undefined {
    for (const bone of this.bones.values()) {
      if (bone.name === name) return bone;
    }
    return undefined;
  }

  /**
   * Update world transforms from local transforms
   */
  updateWorldTransforms(): void {
    for (const rootId of this.rootBoneIds) {
      this.updateBoneWorldTransform(rootId, null);
    }
  }

  private updateBoneWorldTransform(boneId: string, parentWorld: Transform | null): void {
    const bone = this.bones.get(boneId);
    if (!bone) return;

    if (parentWorld) {
      bone.worldTransform = this.multiplyTransforms(parentWorld, bone.localTransform);
    } else {
      bone.worldTransform = { ...bone.localTransform };
    }

    for (const childId of bone.children) {
      this.updateBoneWorldTransform(childId, bone.worldTransform);
    }
  }

  private multiplyTransforms(parent: Transform, local: Transform): Transform {
    return {
      position: this.addVectors(parent.position, this.rotateVector(local.position, parent.rotation)),
      rotation: this.multiplyQuaternions(parent.rotation, local.rotation),
      scale: this.multiplyVectors(parent.scale, local.scale),
    };
  }

  private addVectors(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }

  private multiplyVectors(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x * b.x, y: a.y * b.y, z: a.z * b.z };
  }

  private rotateVector(v: Vector3, q: Quaternion): Vector3 {
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    const ix = qw * v.x + qy * v.z - qz * v.y;
    const iy = qw * v.y + qz * v.x - qx * v.z;
    const iz = qw * v.z + qx * v.y - qy * v.x;
    const iw = -qx * v.x - qy * v.y - qz * v.z;
    return {
      x: ix * qw + iw * -qx + iy * -qz - iz * -qy,
      y: iy * qw + iw * -qy + iz * -qx - ix * -qz,
      z: iz * qw + iw * -qz + ix * -qy - iy * -qx,
    };
  }

  private multiplyQuaternions(a: Quaternion, b: Quaternion): Quaternion {
    return {
      x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
      y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
      z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
      w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    };
  }

  /**
   * Reset to bind pose
   */
  resetToBindPose(): void {
    for (const bone of this.bones.values()) {
      bone.localTransform = { ...bone.bindPose };
    }
    this.updateWorldTransforms();
  }

  /**
   * Clone skeleton
   */
  clone(newId: string): Skeleton {
    const boneData = Array.from(this.bones.values()).map(b => ({
      ...b,
      localTransform: { ...b.localTransform },
      worldTransform: { ...b.worldTransform },
      bindPose: { ...b.bindPose },
      children: [...b.children],
    }));
    return new Skeleton(newId, boneData);
  }
}

// =============================================================================
// ANIMATION CLIP
// =============================================================================

/**
 * Animation clip containing keyframe data
 */
export class AnimationClip {
  public readonly name: string;
  public readonly duration: number;
  public readonly tracks: Map<string, AnimationTrack<Vector3 | Quaternion>[]> = new Map();

  constructor(data: AnimationClipData) {
    this.name = data.name;
    this.duration = data.duration;

    for (const track of data.tracks) {
      const boneId = track.targetBoneId;
      if (!this.tracks.has(boneId)) {
        this.tracks.set(boneId, []);
      }
      this.tracks.get(boneId)!.push(track);
    }
  }

  /**
   * Sample animation at a specific time
   */
  sample(time: number): Map<string, Partial<Transform>> {
    const result = new Map<string, Partial<Transform>>();

    for (const [boneId, tracks] of this.tracks) {
      const transform: Partial<Transform> = {};

      for (const track of tracks) {
        const value = this.sampleTrack(track, time);
        if (track.property === 'position') {
          transform.position = value as Vector3;
        } else if (track.property === 'rotation') {
          transform.rotation = value as Quaternion;
        } else if (track.property === 'scale') {
          transform.scale = value as Vector3;
        }
      }

      result.set(boneId, transform);
    }

    return result;
  }

  private sampleTrack<T extends Vector3 | Quaternion>(
    track: AnimationTrack<T>,
    time: number
  ): T {
    const keyframes = track.keyframes;
    if (keyframes.length === 0) {
      return (track.property === 'rotation'
        ? { x: 0, y: 0, z: 0, w: 1 }
        : { x: 0, y: 0, z: 0 }) as T;
    }

    if (keyframes.length === 1 || time <= keyframes[0].time) {
      return keyframes[0].value;
    }

    if (time >= keyframes[keyframes.length - 1].time) {
      return keyframes[keyframes.length - 1].value;
    }

    // Find surrounding keyframes
    let i = 0;
    while (i < keyframes.length - 1 && keyframes[i + 1].time < time) {
      i++;
    }

    const k0 = keyframes[i];
    const k1 = keyframes[i + 1];
    const t = (time - k0.time) / (k1.time - k0.time);

    return this.interpolate(k0.value, k1.value, t, k0.interpolation, track.property === 'rotation') as T;
  }

  private interpolate(
    a: Vector3 | Quaternion,
    b: Vector3 | Quaternion,
    t: number,
    mode: 'linear' | 'step' | 'cubic',
    isQuaternion: boolean
  ): Vector3 | Quaternion {
    if (mode === 'step') {
      return t < 1 ? a : b;
    }

    if (isQuaternion) {
      return this.slerpQuaternion(a as Quaternion, b as Quaternion, t);
    }

    return this.lerpVector(a as Vector3, b as Vector3, t);
  }

  private lerpVector(a: Vector3, b: Vector3, t: number): Vector3 {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
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
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
        w: a.w + (b.w - a.w) * t,
      });
    }

    const theta0 = Math.acos(dot);
    const theta = theta0 * t;
    const sinTheta = Math.sin(theta);
    const sinTheta0 = Math.sin(theta0);
    const s0 = Math.cos(theta) - dot * sinTheta / sinTheta0;
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
    return { x: q.x / len, y: q.y / len, z: q.z / len, w: q.w / len };
  }

  /**
   * Create clip from GLTF animation data
   */
  static fromGLTF(gltfAnimation: { name?: string; channels: unknown[]; samplers: unknown[] }): AnimationClip {
    // Simplified GLTF parser - would be expanded in production
    return new AnimationClip({
      name: gltfAnimation.name ?? 'animation',
      duration: 1.0,
      tracks: [],
    });
  }
}

// =============================================================================
// ANIMATION STATE
// =============================================================================

interface AnimationState {
  clip: AnimationClip;
  time: number;
  weight: number;
  speed: number;
  loop: boolean;
  blendMode: BlendMode;
  finished: boolean;
}

// =============================================================================
// IK SOLVER
// =============================================================================

/**
 * FABRIK IK Solver
 */
export class FABRIKSolver {
  private tolerance = 0.001;
  private maxIterations = 10;

  /**
   * Solve IK chain
   */
  solve(
    skeleton: Skeleton,
    target: IKTarget
  ): void {
    const chain = this.getChain(skeleton, target.boneId, target.chainLength);
    if (chain.length < 2) return;

    const positions = chain.map(b => ({ ...b.worldTransform.position }));
    const lengths: number[] = [];

    for (let i = 0; i < chain.length - 1; i++) {
      lengths.push(this.distance(positions[i], positions[i + 1]));
    }

    const targetPos = target.targetPosition;

    for (let iter = 0; iter < this.maxIterations; iter++) {
      // Forward reaching
      positions[positions.length - 1] = { ...targetPos };
      for (let i = positions.length - 2; i >= 0; i--) {
        const dir = this.normalize(this.subtract(positions[i], positions[i + 1]));
        positions[i] = this.add(positions[i + 1], this.scale(dir, lengths[i]));
      }

      // Backward reaching
      const root = chain[0].worldTransform.position;
      positions[0] = { ...root };
      for (let i = 0; i < positions.length - 1; i++) {
        const dir = this.normalize(this.subtract(positions[i + 1], positions[i]));
        positions[i + 1] = this.add(positions[i], this.scale(dir, lengths[i]));
      }

      // Check convergence
      if (this.distance(positions[positions.length - 1], targetPos) < this.tolerance) {
        break;
      }
    }

    // Apply results with weight
    for (let i = 0; i < chain.length; i++) {
      const bone = chain[i];
      bone.worldTransform.position = this.lerp(
        bone.worldTransform.position,
        positions[i],
        target.weight
      );
    }
  }

  private getChain(skeleton: Skeleton, endBoneId: string, length: number): Bone[] {
    const chain: Bone[] = [];
    let current = skeleton.getBone(endBoneId);

    while (current && chain.length < length) {
      chain.unshift(current);
      if (current.parentId) {
        current = skeleton.getBone(current.parentId);
      } else {
        break;
      }
    }

    return chain;
  }

  private distance(a: Vector3, b: Vector3): number {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private subtract(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  private add(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }

  private scale(v: Vector3, s: number): Vector3 {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
  }

  private normalize(v: Vector3): Vector3 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    return len > 0 ? { x: v.x / len, y: v.y / len, z: v.z / len } : { x: 0, y: 0, z: 0 };
  }

  private lerp(a: Vector3, b: Vector3, t: number): Vector3 {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    };
  }
}

// =============================================================================
// ANIMATION SYSTEM
// =============================================================================

/**
 * Main animation system
 */
export class AnimationSystem {
  private skeletons: Map<string, Skeleton> = new Map();
  private states: Map<string, AnimationState[]> = new Map();
  private ikSolver = new FABRIKSolver();
  private ikTargets: Map<string, IKTarget[]> = new Map();

  /**
   * Create skeleton from bone data
   */
  createSkeleton(id: string, bones: Bone[]): Skeleton {
    const skeleton = new Skeleton(id, bones);
    this.skeletons.set(id, skeleton);
    this.states.set(id, []);
    return skeleton;
  }

  /**
   * Get skeleton by ID
   */
  getSkeleton(id: string): Skeleton | undefined {
    return this.skeletons.get(id);
  }

  /**
   * Remove skeleton
   */
  removeSkeleton(id: string): void {
    this.skeletons.delete(id);
    this.states.delete(id);
    this.ikTargets.delete(id);
  }

  /**
   * Play animation clip on skeleton
   */
  playClip(
    skeletonId: string,
    clip: AnimationClip,
    options?: Partial<PlaybackOptions>
  ): void {
    const states = this.states.get(skeletonId);
    if (!states) return;

    const state: AnimationState = {
      clip,
      time: options?.startTime ?? 0,
      weight: options?.weight ?? 1,
      speed: options?.speed ?? 1,
      loop: options?.loop ?? false,
      blendMode: options?.blendMode ?? 'override',
      finished: false,
    };

    states.push(state);
  }

  /**
   * Stop animation clip
   */
  stopClip(skeletonId: string, clipName: string): void {
    const states = this.states.get(skeletonId);
    if (!states) return;

    const idx = states.findIndex(s => s.clip.name === clipName);
    if (idx >= 0) {
      states.splice(idx, 1);
    }
  }

  /**
   * Set IK target
   */
  setIKTarget(skeletonId: string, target: IKTarget): void {
    if (!this.ikTargets.has(skeletonId)) {
      this.ikTargets.set(skeletonId, []);
    }
    const targets = this.ikTargets.get(skeletonId)!;
    const existing = targets.findIndex(t => t.boneId === target.boneId);
    if (existing >= 0) {
      targets[existing] = target;
    } else {
      targets.push(target);
    }
  }

  /**
   * Remove IK target
   */
  removeIKTarget(skeletonId: string, boneId: string): void {
    const targets = this.ikTargets.get(skeletonId);
    if (!targets) return;
    const idx = targets.findIndex(t => t.boneId === boneId);
    if (idx >= 0) {
      targets.splice(idx, 1);
    }
  }

  /**
   * Update animation system
   */
  update(deltaTime: number): void {
    for (const [skeletonId, skeleton] of this.skeletons) {
      const states = this.states.get(skeletonId) ?? [];

      // Reset to bind pose
      skeleton.resetToBindPose();

      // Apply animations
      for (const state of states) {
        state.time += deltaTime * state.speed;

        if (state.loop) {
          state.time %= state.clip.duration;
        } else if (state.time >= state.clip.duration) {
          state.time = state.clip.duration;
          state.finished = true;
        }

        const sample = state.clip.sample(state.time);
        this.applyPose(skeleton, sample, state.weight, state.blendMode);
      }

      // Remove finished animations
      this.states.set(
        skeletonId,
        states.filter(s => !s.finished || s.loop)
      );

      // Apply IK
      const targets = this.ikTargets.get(skeletonId);
      if (targets) {
        for (const target of targets) {
          this.ikSolver.solve(skeleton, target);
        }
      }

      // Update world transforms
      skeleton.updateWorldTransforms();
    }
  }

  private applyPose(
    skeleton: Skeleton,
    pose: Map<string, Partial<Transform>>,
    weight: number,
    blendMode: BlendMode
  ): void {
    for (const [boneId, transform] of pose) {
      const bone = skeleton.getBone(boneId);
      if (!bone) continue;

      if (transform.position) {
        bone.localTransform.position = this.lerpVector(
          bone.localTransform.position,
          transform.position,
          weight
        );
      }
      if (transform.rotation) {
        bone.localTransform.rotation = this.slerpQuat(
          bone.localTransform.rotation,
          transform.rotation,
          weight
        );
      }
      if (transform.scale) {
        bone.localTransform.scale = this.lerpVector(
          bone.localTransform.scale,
          transform.scale,
          weight
        );
      }
    }
  }

  private lerpVector(a: Vector3, b: Vector3, t: number): Vector3 {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    };
  }

  private slerpQuat(a: Quaternion, b: Quaternion, t: number): Quaternion {
    let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
    if (dot < 0) {
      b = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
      dot = -dot;
    }
    if (dot > 0.9995) {
      const result = {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
        w: a.w + (b.w - a.w) * t,
      };
      const len = Math.sqrt(result.x ** 2 + result.y ** 2 + result.z ** 2 + result.w ** 2);
      return { x: result.x / len, y: result.y / len, z: result.z / len, w: result.w / len };
    }
    const theta0 = Math.acos(dot);
    const theta = theta0 * t;
    const sinTheta = Math.sin(theta);
    const sinTheta0 = Math.sin(theta0);
    const s0 = Math.cos(theta) - dot * sinTheta / sinTheta0;
    const s1 = sinTheta / sinTheta0;
    return {
      x: a.x * s0 + b.x * s1,
      y: a.y * s0 + b.y * s1,
      z: a.z * s0 + b.z * s1,
      w: a.w * s0 + b.w * s1,
    };
  }
}

// =============================================================================
// EMOTION DIRECTIVE PROCESSOR
// =============================================================================

export {
  EmotionDirectiveProcessor,
  createEmotionDirectiveProcessor,
} from './EmotionDirectiveProcessor';

export type {
  MorphTargetApplicator,
  AnimationClipResolver,
  EmotionDirectiveProcessorConfig,
  EmotionDirectiveProcessorState,
} from './EmotionDirectiveProcessor';

// =============================================================================
// EXPORTS
// =============================================================================

export const VERSION = '1.0.0';

/**
 * Create a new animation system
 */
export function createAnimationSystem(): AnimationSystem {
  return new AnimationSystem();
}

/**
 * Create a FABRIK IK solver
 */
export function createIKSolver(): FABRIKSolver {
  return new FABRIKSolver();
}
