/**
 * VRM Avatar Manager
 *
 * Loads and manages VRM avatars for AR.
 */

import * as THREE from 'three';
import type {
  AvatarConfig,
  AvatarState,
  Transform,
  SkeletonPose,
  VRMBoneName,
  Vector3,
} from './types';

// VRM types from @pixiv/three-vrm
type VRM = any;

/**
 * Managed avatar instance
 */
interface ManagedAvatar {
  id: string;
  vrm: VRM;
  config: AvatarConfig;
  state: AvatarState;
  mixer?: THREE.AnimationMixer;
}

/**
 * VRM Avatar Manager
 *
 * Handles VRM avatar loading, animation, and IK.
 */
export class VRMAvatarManager {
  private avatars: Map<string, ManagedAvatar> = new Map();
  private scene: THREE.Scene;
  private loader: any = null;
  private clock: THREE.Clock = new THREE.Clock();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Initialize the loader
   */
  async initialize(): Promise<void> {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    this.loader = new GLTFLoader();

    // Try to load VRM plugin
    try {
      const { VRMLoaderPlugin } = await import('@pixiv/three-vrm');
      this.loader.register((parser: any) => new VRMLoaderPlugin(parser));
      console.log('VRM support enabled');
    } catch {
      console.warn('VRM plugin not available, loading as standard GLTF');
    }
  }

  /**
   * Load avatar from URL
   */
  async loadAvatar(id: string, config: AvatarConfig): Promise<AvatarState> {
    if (!this.loader) {
      await this.initialize();
    }

    // Check if already loaded
    if (this.avatars.has(id)) {
      throw new Error(`Avatar ${id} already exists`);
    }

    // Load GLTF/VRM
    const gltf = await this.loader!.loadAsync(config.vrmUrl);
    const vrm = gltf.userData.vrm as VRM | undefined;

    if (!vrm) {
      console.warn('Loaded as standard GLTF (no VRM data)');
    }

    // Setup model
    const model = gltf.scene;
    model.scale.setScalar(config.scale ?? 1);

    // Setup shadows
    model.traverse((object: THREE.Object3D) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    // Create mixer for animations
    const mixer = new THREE.AnimationMixer(model);

    // Add to scene
    this.scene.add(model);

    // Create state
    const state: AvatarState = {
      id,
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: config.scale ?? 1, y: config.scale ?? 1, z: config.scale ?? 1 },
      },
      visible: true,
    };

    // Store avatar
    this.avatars.set(id, {
      id,
      vrm,
      config,
      state,
      mixer,
    });

    console.log(`Avatar ${id} loaded from ${config.vrmUrl}`);
    return state;
  }

  /**
   * Update avatar transform
   */
  setTransform(id: string, transform: Transform): void {
    const avatar = this.avatars.get(id);
    if (!avatar) return;

    const model = this.getModel(id);
    if (!model) return;

    // Update position
    model.position.set(transform.position.x, transform.position.y, transform.position.z);

    // Update rotation
    model.quaternion.set(
      transform.rotation.x,
      transform.rotation.y,
      transform.rotation.z,
      transform.rotation.w
    );

    // Update scale
    if (transform.scale) {
      model.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
    }

    avatar.state.transform = transform;
  }

  /**
   * Apply skeleton pose to avatar
   */
  applyPose(id: string, pose: SkeletonPose): void {
    const avatar = this.avatars.get(id);
    if (!avatar || !avatar.vrm) return;

    const humanoid = avatar.vrm.humanoid;
    if (!humanoid) return;

    // Apply root transform
    this.setTransform(id, {
      position: pose.rootTransform.position,
      rotation: pose.rootTransform.rotation,
      scale: pose.rootTransform.scale,
    });

    // Apply bone rotations
    for (const bone of pose.bones) {
      const boneName = this.mapBoneName(bone.name);
      if (!boneName) continue;

      const boneNode = humanoid.getNormalizedBoneNode(boneName);
      if (!boneNode) continue;

      // Apply rotation
      boneNode.quaternion.set(bone.rotation.x, bone.rotation.y, bone.rotation.z, bone.rotation.w);
    }

    avatar.state.pose = pose;
  }

  /**
   * Set avatar expression
   */
  setExpression(id: string, name: string, weight: number = 1): void {
    const avatar = this.avatars.get(id);
    if (!avatar || !avatar.vrm) return;

    const expressionManager = avatar.vrm.expressionManager;
    if (!expressionManager) return;

    expressionManager.setValue(name, weight);
    avatar.state.expression = name;
    avatar.state.expressionWeight = weight;
  }

  /**
   * Set look-at target
   */
  setLookAt(id: string, target: Vector3): void {
    const avatar = this.avatars.get(id);
    if (!avatar || !avatar.vrm) return;

    const lookAt = avatar.vrm.lookAt;
    if (!lookAt) return;

    lookAt.target = new THREE.Vector3(target.x, target.y, target.z);
    avatar.state.lookAtTarget = target;
  }

  /**
   * Set avatar visibility
   */
  setVisible(id: string, visible: boolean): void {
    const avatar = this.avatars.get(id);
    if (!avatar) return;

    const model = this.getModel(id);
    if (model) {
      model.visible = visible;
    }

    avatar.state.visible = visible;
  }

  /**
   * Update all avatars (call in animation loop)
   */
  update(): void {
    const delta = this.clock.getDelta();

    for (const avatar of this.avatars.values()) {
      // Update VRM
      if (avatar.vrm) {
        avatar.vrm.update(delta);
      }

      // Update mixer
      if (avatar.mixer) {
        avatar.mixer.update(delta);
      }
    }
  }

  /**
   * Get avatar state
   */
  getState(id: string): AvatarState | undefined {
    return this.avatars.get(id)?.state;
  }

  /**
   * Get avatar model
   */
  getModel(id: string): THREE.Object3D | undefined {
    const avatar = this.avatars.get(id);
    if (!avatar || !avatar.vrm) return undefined;
    return avatar.vrm.scene;
  }

  /**
   * Get all avatar IDs
   */
  getAvatarIds(): string[] {
    return Array.from(this.avatars.keys());
  }

  /**
   * Remove avatar
   */
  removeAvatar(id: string): void {
    const avatar = this.avatars.get(id);
    if (!avatar) return;

    // Remove from scene
    const model = this.getModel(id);
    if (model) {
      this.scene.remove(model);
    }

    // Dispose VRM
    if (avatar.vrm) {
      avatar.vrm.dispose?.();
    }

    this.avatars.delete(id);
  }

  /**
   * Map detection bone name to VRM bone name
   */
  private mapBoneName(name: string): VRMBoneName | null {
    // Map common detection bone names to VRM
    const mapping: Record<string, VRMBoneName> = {
      // Torso
      pelvis: 'hips',
      spine: 'spine',
      spine1: 'chest',
      spine2: 'upperChest',
      neck: 'neck',
      head: 'head',

      // Left arm
      left_shoulder: 'leftShoulder',
      left_upper_arm: 'leftUpperArm',
      left_lower_arm: 'leftLowerArm',
      left_hand: 'leftHand',

      // Right arm
      right_shoulder: 'rightShoulder',
      right_upper_arm: 'rightUpperArm',
      right_lower_arm: 'rightLowerArm',
      right_hand: 'rightHand',

      // Left leg
      left_upper_leg: 'leftUpperLeg',
      left_lower_leg: 'leftLowerLeg',
      left_foot: 'leftFoot',
      left_toes: 'leftToes',

      // Right leg
      right_upper_leg: 'rightUpperLeg',
      right_lower_leg: 'rightLowerLeg',
      right_foot: 'rightFoot',
      right_toes: 'rightToes',
    };

    return mapping[name.toLowerCase()] ?? null;
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    for (const id of this.avatars.keys()) {
      this.removeAvatar(id);
    }
    this.avatars.clear();
  }
}
