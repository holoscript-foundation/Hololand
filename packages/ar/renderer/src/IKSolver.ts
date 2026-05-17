/**
 * IK Solver
 *
 * Inverse Kinematics solver for retargeting poses to avatars.
 */

import * as THREE from 'three';
import type { Vector3, IKTarget, IKConfig, VRMBoneName } from './types';
import { DEFAULT_IK_CONFIG } from './types';

/**
 * IK Chain definition
 */
interface IKChain {
  name: string;
  bones: string[];
  effector: string;
}

/**
 * Standard IK chains for humanoid
 */
const STANDARD_IK_CHAINS: IKChain[] = [
  {
    name: 'leftArm',
    bones: ['leftShoulder', 'leftUpperArm', 'leftLowerArm'],
    effector: 'leftHand',
  },
  {
    name: 'rightArm',
    bones: ['rightShoulder', 'rightUpperArm', 'rightLowerArm'],
    effector: 'rightHand',
  },
  {
    name: 'leftLeg',
    bones: ['leftUpperLeg', 'leftLowerLeg'],
    effector: 'leftFoot',
  },
  {
    name: 'rightLeg',
    bones: ['rightUpperLeg', 'rightLowerLeg'],
    effector: 'rightFoot',
  },
  {
    name: 'spine',
    bones: ['hips', 'spine', 'chest', 'upperChest'],
    effector: 'neck',
  },
];

/**
 * IK Solver
 *
 * FABRIK-based IK solver for skeletal animation.
 */
export class IKSolver {
  private config: IKConfig;
  private chains: Map<string, IKChain> = new Map();
  private boneNodes: Map<string, THREE.Object3D> = new Map();
  private boneLengths: Map<string, number> = new Map();

  constructor(config?: Partial<IKConfig>) {
    this.config = { ...DEFAULT_IK_CONFIG, ...config };

    // Setup standard chains
    for (const chain of STANDARD_IK_CHAINS) {
      this.chains.set(chain.name, chain);
    }
  }

  /**
   * Initialize solver with skeleton
   */
  initialize(skeleton: THREE.Object3D): void {
    // Clear previous
    this.boneNodes.clear();
    this.boneLengths.clear();

    // Find all bones
    skeleton.traverse((node) => {
      if (node.name) {
        this.boneNodes.set(node.name, node);
      }
    });

    // Calculate bone lengths
    for (const chain of this.chains.values()) {
      for (let i = 0; i < chain.bones.length - 1; i++) {
        const bone = this.boneNodes.get(chain.bones[i]);
        const child = this.boneNodes.get(chain.bones[i + 1]);

        if (bone && child) {
          const length = bone.position.distanceTo(child.position);
          this.boneLengths.set(chain.bones[i], length);
        }
      }
    }
  }

  /**
   * Solve IK for a target
   */
  solve(target: IKTarget): boolean {
    const chain = this.findChainForBone(target.bone);
    if (!chain) return false;

    const bones = chain.bones
      .map((name) => this.boneNodes.get(name))
      .filter(Boolean) as THREE.Object3D[];
    if (bones.length < 2) return false;

    const targetPos = new THREE.Vector3(target.position.x, target.position.y, target.position.z);

    // FABRIK algorithm
    return this.solveFABRIK(bones, targetPos, target.weight ?? 1);
  }

  /**
   * FABRIK (Forward And Backward Reaching Inverse Kinematics)
   */
  private solveFABRIK(bones: THREE.Object3D[], target: THREE.Vector3, weight: number): boolean {
    const positions: THREE.Vector3[] = bones.map((b) => b.getWorldPosition(new THREE.Vector3()));
    const lengths: number[] = [];

    // Calculate segment lengths
    for (let i = 0; i < bones.length - 1; i++) {
      lengths.push(positions[i].distanceTo(positions[i + 1]));
    }

    const rootPos = positions[0].clone();
    const totalLength = lengths.reduce((a, b) => a + b, 0);

    // Check if target is reachable
    const distToTarget = rootPos.distanceTo(target);
    if (distToTarget > totalLength) {
      // Target unreachable - stretch toward it
      const direction = target.clone().sub(rootPos).normalize();
      for (let i = 1; i < positions.length; i++) {
        positions[i] = positions[i - 1]
          .clone()
          .add(direction.clone().multiplyScalar(lengths[i - 1]));
      }
    } else {
      // FABRIK iterations
      for (let iter = 0; iter < this.config.maxIterations; iter++) {
        // Check convergence
        const endEffector = positions[positions.length - 1];
        if (endEffector.distanceTo(target) < this.config.tolerance) {
          break;
        }

        // Forward reaching (from end to root)
        positions[positions.length - 1].copy(target);
        for (let i = positions.length - 2; i >= 0; i--) {
          const direction = positions[i]
            .clone()
            .sub(positions[i + 1])
            .normalize();
          positions[i] = positions[i + 1].clone().add(direction.multiplyScalar(lengths[i]));
        }

        // Backward reaching (from root to end)
        positions[0].copy(rootPos);
        for (let i = 1; i < positions.length; i++) {
          const direction = positions[i]
            .clone()
            .sub(positions[i - 1])
            .normalize();
          positions[i] = positions[i - 1].clone().add(direction.multiplyScalar(lengths[i - 1]));
        }
      }
    }

    // Apply weight blending
    if (weight < 1) {
      for (let i = 0; i < positions.length; i++) {
        const original = bones[i].getWorldPosition(new THREE.Vector3());
        positions[i].lerp(original, 1 - weight);
      }
    }

    // Apply rotations to bones
    this.applyPositionsToRotations(bones, positions);

    return true;
  }

  /**
   * Convert positions to bone rotations
   */
  private applyPositionsToRotations(bones: THREE.Object3D[], positions: THREE.Vector3[]): void {
    for (let i = 0; i < bones.length - 1; i++) {
      const bone = bones[i];
      const currentDir = new THREE.Vector3();
      bone.getWorldDirection(currentDir);

      const targetDir = positions[i + 1].clone().sub(positions[i]).normalize();

      // Calculate rotation to align with target direction
      const quaternion = new THREE.Quaternion().setFromUnitVectors(currentDir, targetDir);

      // Apply rotation (in local space)
      if (bone.parent) {
        const parentQuaternion = new THREE.Quaternion();
        bone.parent.getWorldQuaternion(parentQuaternion);

        const worldQuaternion = new THREE.Quaternion();
        bone.getWorldQuaternion(worldQuaternion);

        worldQuaternion.premultiply(quaternion);

        const localQuaternion = worldQuaternion.premultiply(parentQuaternion.invert());
        bone.quaternion.copy(localQuaternion);
      }
    }
  }

  /**
   * Find IK chain for a bone
   */
  private findChainForBone(bone: VRMBoneName): IKChain | null {
    for (const chain of this.chains.values()) {
      if (chain.effector === bone || chain.bones.includes(bone)) {
        return chain;
      }
    }
    return null;
  }

  /**
   * Add custom IK chain
   */
  addChain(chain: IKChain): void {
    this.chains.set(chain.name, chain);
  }

  /**
   * Remove IK chain
   */
  removeChain(name: string): void {
    this.chains.delete(name);
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<IKConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Pose Retargeter
 *
 * Retargets poses from detection to avatar skeleton.
 */
export class PoseRetargeter {
  private ikSolver: IKSolver;
  private sourceToTargetMap: Map<string, VRMBoneName> = new Map();

  constructor(ikSolver?: IKSolver) {
    this.ikSolver = ikSolver ?? new IKSolver();
    this.setupDefaultMapping();
  }

  /**
   * Setup default bone mapping (detection → VRM)
   */
  private setupDefaultMapping(): void {
    // BlazePose/MediaPipe to VRM mapping
    const mapping: [string, VRMBoneName][] = [
      // Core
      ['NOSE', 'head'],
      ['LEFT_SHOULDER', 'leftShoulder'],
      ['RIGHT_SHOULDER', 'rightShoulder'],
      ['LEFT_ELBOW', 'leftLowerArm'],
      ['RIGHT_ELBOW', 'rightLowerArm'],
      ['LEFT_WRIST', 'leftHand'],
      ['RIGHT_WRIST', 'rightHand'],
      ['LEFT_HIP', 'leftUpperLeg'],
      ['RIGHT_HIP', 'rightUpperLeg'],
      ['LEFT_KNEE', 'leftLowerLeg'],
      ['RIGHT_KNEE', 'rightLowerLeg'],
      ['LEFT_ANKLE', 'leftFoot'],
      ['RIGHT_ANKLE', 'rightFoot'],
    ];

    for (const [source, target] of mapping) {
      this.sourceToTargetMap.set(source, target);
    }
  }

  /**
   * Retarget pose to avatar
   */
  retarget(keypoints: Map<string, Vector3>, avatar: THREE.Object3D): IKTarget[] {
    const targets: IKTarget[] = [];

    // Convert keypoints to IK targets
    for (const [name, position] of keypoints) {
      const boneName = this.sourceToTargetMap.get(name);
      if (!boneName) continue;

      targets.push({
        bone: boneName,
        position,
        weight: 1,
      });
    }

    // Apply IK
    this.ikSolver.initialize(avatar);
    for (const target of targets) {
      this.ikSolver.solve(target);
    }

    return targets;
  }

  /**
   * Set custom bone mapping
   */
  setMapping(source: string, target: VRMBoneName): void {
    this.sourceToTargetMap.set(source, target);
  }

  /**
   * Get IK solver
   */
  getIKSolver(): IKSolver {
    return this.ikSolver;
  }
}
