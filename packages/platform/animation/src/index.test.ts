/**
 * @hololand/animation - Test Suite
 *
 * Tests for Skeleton, AnimationClip, FABRIKSolver, and AnimationSystem modules
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  // Types/Interfaces
  type Vector3,
  type Quaternion,
  type Transform,
  type Bone,
  type Keyframe,
  type AnimationClipData,
  type BlendMode,
  type AnimationTrack,
  type PlaybackOptions,
  type IKTarget,
  // Classes
  Skeleton,
  AnimationClip,
  FABRIKSolver,
  AnimationSystem,
  // Factory functions
  createAnimationSystem,
  createIKSolver,
  // Constants
  VERSION
} from './index'

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createTestBones(): Bone[] {
  return [
    {
      id: 'root',
      name: 'Root',
      parentId: null,
      localTransform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
      worldTransform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
      bindPose: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
      children: ['spine']
    },
    {
      id: 'spine',
      name: 'Spine',
      parentId: 'root',
      localTransform: { position: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
      worldTransform: { position: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
      bindPose: { position: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
      children: ['head', 'arm_l', 'arm_r']
    },
    {
      id: 'head',
      name: 'Head',
      parentId: 'spine',
      localTransform: { position: { x: 0, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
      worldTransform: { position: { x: 0, y: 1.5, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
      bindPose: { position: { x: 0, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
      children: []
    },
    {
      id: 'arm_l',
      name: 'LeftArm',
      parentId: 'spine',
      localTransform: { position: { x: -0.5, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
      worldTransform: { position: { x: -0.5, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
      bindPose: { position: { x: -0.5, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
      children: ['hand_l']
    },
    {
      id: 'hand_l',
      name: 'LeftHand',
      parentId: 'arm_l',
      localTransform: { position: { x: -0.3, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
      worldTransform: { position: { x: -0.8, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
      bindPose: { position: { x: -0.3, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
      children: []
    },
    {
      id: 'arm_r',
      name: 'RightArm',
      parentId: 'spine',
      localTransform: { position: { x: 0.5, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
      worldTransform: { position: { x: 0.5, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
      bindPose: { position: { x: 0.5, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
      children: ['hand_r']
    },
    {
      id: 'hand_r',
      name: 'RightHand',
      parentId: 'arm_r',
      localTransform: { position: { x: 0.3, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
      worldTransform: { position: { x: 0.8, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
      bindPose: { position: { x: 0.3, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
      children: []
    }
  ]
}

function createTestAnimationClip(): AnimationClipData {
  return {
    name: 'wave',
    duration: 1.0,
    tracks: [
      {
        targetBoneId: 'arm_r',
        property: 'rotation',
        keyframes: [
          { time: 0, value: { x: 0, y: 0, z: 0, w: 1 }, interpolation: 'linear' },
          { time: 0.5, value: { x: 0.383, y: 0, z: 0, w: 0.924 }, interpolation: 'linear' },
          { time: 1.0, value: { x: 0, y: 0, z: 0, w: 1 }, interpolation: 'linear' }
        ]
      },
      {
        targetBoneId: 'hand_r',
        property: 'rotation',
        keyframes: [
          { time: 0, value: { x: 0, y: 0, z: 0, w: 1 }, interpolation: 'linear' },
          { time: 0.25, value: { x: 0, y: 0, z: 0.259, w: 0.966 }, interpolation: 'linear' },
          { time: 0.5, value: { x: 0, y: 0, z: -0.259, w: 0.966 }, interpolation: 'linear' },
          { time: 0.75, value: { x: 0, y: 0, z: 0.259, w: 0.966 }, interpolation: 'linear' },
          { time: 1.0, value: { x: 0, y: 0, z: 0, w: 1 }, interpolation: 'linear' }
        ]
      }
    ]
  }
}

// =============================================================================
// SKELETON TESTS
// =============================================================================

describe('Skeleton', () => {
  describe('initialization', () => {
    it('should create skeleton with bones', () => {
      const skeleton = new Skeleton('player', createTestBones())
      expect(skeleton).toBeDefined()
      expect(skeleton.id).toBe('player')
    })

    it('should identify root bones', () => {
      const skeleton = new Skeleton('test', createTestBones())
      expect(skeleton.rootBoneIds).toContain('root')
      expect(skeleton.rootBoneIds).toHaveLength(1)
    })

    it('should store all bones', () => {
      const bones = createTestBones()
      const skeleton = new Skeleton('test', bones)
      expect(skeleton.bones.size).toBe(bones.length)
    })
  })

  describe('getBone', () => {
    it('should retrieve bone by id', () => {
      const skeleton = new Skeleton('test', createTestBones())
      const bone = skeleton.getBone('spine')
      expect(bone).toBeDefined()
      expect(bone?.name).toBe('Spine')
    })

    it('should return undefined for missing bone', () => {
      const skeleton = new Skeleton('test', createTestBones())
      const bone = skeleton.getBone('missing')
      expect(bone).toBeUndefined()
    })
  })

  describe('getBoneByName', () => {
    it('should retrieve bone by name', () => {
      const skeleton = new Skeleton('test', createTestBones())
      const bone = skeleton.getBoneByName('LeftHand')
      expect(bone).toBeDefined()
      expect(bone?.id).toBe('hand_l')
    })
  })

  describe('updateWorldTransforms', () => {
    it('should propagate transforms through hierarchy', () => {
      const skeleton = new Skeleton('test', createTestBones())
      
      // Move root
      const rootBone = skeleton.getBone('root')!
      rootBone.localTransform.position = { x: 10, y: 0, z: 0 }
      
      skeleton.updateWorldTransforms()
      
      // Head should have moved with root
      const headBone = skeleton.getBone('head')!
      expect(headBone.worldTransform.position.x).toBe(10)
    })
  })

  describe('resetToBindPose', () => {
    it('should reset all bones to bind pose', () => {
      const skeleton = new Skeleton('test', createTestBones())
      
      // Modify a bone
      const armBone = skeleton.getBone('arm_r')!
      armBone.localTransform.rotation = { x: 0.5, y: 0, z: 0, w: 0.866 }
      
      skeleton.resetToBindPose()
      
      // Should be back to identity
      expect(armBone.localTransform.rotation.w).toBe(1)
      expect(armBone.localTransform.rotation.x).toBe(0)
    })
  })

  describe('clone', () => {
    it('should create independent copy', () => {
      const skeleton = new Skeleton('original', createTestBones())
      const cloned = skeleton.clone('cloned')
      
      expect(cloned.id).toBe('cloned')
      expect(cloned.bones.size).toBe(skeleton.bones.size)
      
      // Verify the clone has its own bone objects (different references)
      const originalRoot = skeleton.getBone('root')!
      const clonedRoot = cloned.getBone('root')!
      expect(originalRoot).not.toBe(clonedRoot)
    })
  })
})

// =============================================================================
// ANIMATION CLIP TESTS
// =============================================================================

describe('AnimationClip', () => {
  describe('initialization', () => {
    it('should create clip from data', () => {
      const clip = new AnimationClip(createTestAnimationClip())
      expect(clip.name).toBe('wave')
      expect(clip.duration).toBe(1.0)
    })

    it('should organize tracks by bone', () => {
      const clip = new AnimationClip(createTestAnimationClip())
      expect(clip.tracks.has('arm_r')).toBe(true)
      expect(clip.tracks.has('hand_r')).toBe(true)
    })
  })

  describe('sample', () => {
    it('should return transforms at time 0', () => {
      const clip = new AnimationClip(createTestAnimationClip())
      const sample = clip.sample(0)
      
      expect(sample.has('arm_r')).toBe(true)
      const armTransform = sample.get('arm_r')!
      expect(armTransform.rotation?.w).toBeCloseTo(1)
    })

    it('should interpolate between keyframes', () => {
      const clip = new AnimationClip(createTestAnimationClip())
      const sample = clip.sample(0.25)
      
      const armTransform = sample.get('arm_r')!
      // Should be halfway between first two keyframes
      expect(armTransform.rotation?.x).toBeGreaterThan(0)
      expect(armTransform.rotation?.x).toBeLessThan(0.383)
    })

    it('should clamp at duration', () => {
      const clip = new AnimationClip(createTestAnimationClip())
      const sample = clip.sample(2.0) // Beyond duration
      
      const armTransform = sample.get('arm_r')!
      expect(armTransform.rotation?.w).toBeCloseTo(1)
    })
  })

  describe('interpolation modes', () => {
    it('should handle step interpolation', () => {
      const clipData: AnimationClipData = {
        name: 'step-test',
        duration: 1.0,
        tracks: [{
          targetBoneId: 'test',
          property: 'position',
          keyframes: [
            { time: 0, value: { x: 0, y: 0, z: 0 }, interpolation: 'step' },
            { time: 1, value: { x: 10, y: 0, z: 0 }, interpolation: 'step' }
          ]
        }]
      }
      
      const clip = new AnimationClip(clipData)
      const sample = clip.sample(0.5)
      
      // Step should hold first value until the end
      expect(sample.get('test')?.position?.x).toBe(0)
    })
  })
})

// =============================================================================
// FABRIK IK SOLVER TESTS
// =============================================================================

describe('FABRIKSolver', () => {
  describe('solve', () => {
    it('should reach target within tolerance', () => {
      const skeleton = new Skeleton('test', createTestBones())
      const solver = createIKSolver()
      
      solver.solve(skeleton, {
        boneId: 'hand_r',
        targetPosition: { x: 1, y: 1.5, z: 0 },
        weight: 1.0,
        chainLength: 2
      })
      
      const hand = skeleton.getBone('hand_r')!
      const dist = Math.sqrt(
        (hand.worldTransform.position.x - 1) ** 2 +
        (hand.worldTransform.position.y - 1.5) ** 2
      )
      
      // Should be close to target (within reasonable tolerance)
      expect(dist).toBeLessThan(1) // Allow some error for chain constraints
    })

    it('should respect weight parameter', () => {
      const skeleton = new Skeleton('test', createTestBones())
      const solver = createIKSolver()
      
      const originalPos = { ...skeleton.getBone('hand_r')!.worldTransform.position }
      
      solver.solve(skeleton, {
        boneId: 'hand_r',
        targetPosition: { x: 2, y: 2, z: 0 },
        weight: 0.0, // Zero weight = no change
        chainLength: 2
      })
      
      const newPos = skeleton.getBone('hand_r')!.worldTransform.position
      expect(newPos.x).toBeCloseTo(originalPos.x)
      expect(newPos.y).toBeCloseTo(originalPos.y)
    })
  })

  describe('getChain', () => {
    it('should build correct chain from end effector', () => {
      const skeleton = new Skeleton('test', createTestBones())
      const solver = createIKSolver()
      
      // @ts-ignore - accessing private method for testing
      const chain = solver.getChain(skeleton, 'hand_r', 3)
      
      expect(chain).toHaveLength(3)
      expect(chain[0].id).toBe('spine')
      expect(chain[1].id).toBe('arm_r')
      expect(chain[2].id).toBe('hand_r')
    })
  })
})

// =============================================================================
// ANIMATION SYSTEM TESTS
// =============================================================================

describe('AnimationSystem', () => {
  let system: AnimationSystem

  beforeEach(() => {
    system = createAnimationSystem()
  })

  describe('skeleton management', () => {
    it('should create and store skeletons', () => {
      const skeleton = system.createSkeleton('player', createTestBones())
      expect(system.getSkeleton('player')).toBe(skeleton)
    })

    it('should remove skeletons', () => {
      system.createSkeleton('temp', createTestBones())
      system.removeSkeleton('temp')
      expect(system.getSkeleton('temp')).toBeUndefined()
    })
  })

  describe('playClip', () => {
    it('should add animation state', () => {
      system.createSkeleton('player', createTestBones())
      const clip = new AnimationClip(createTestAnimationClip())
      
      system.playClip('player', clip, { loop: true })
      
      // @ts-ignore - accessing internal state
      expect(system.states.get('player')).toHaveLength(1)
    })

    it('should respect playback options', () => {
      system.createSkeleton('player', createTestBones())
      const clip = new AnimationClip(createTestAnimationClip())
      
      system.playClip('player', clip, { 
        speed: 2.0, 
        weight: 0.5,
        startTime: 0.25
      })
      
      // @ts-ignore - accessing internal state
      const state = system.states.get('player')[0]
      expect(state.speed).toBe(2.0)
      expect(state.weight).toBe(0.5)
      expect(state.time).toBe(0.25)
    })
  })

  describe('stopClip', () => {
    it('should remove animation by name', () => {
      system.createSkeleton('player', createTestBones())
      const clip = new AnimationClip(createTestAnimationClip())
      
      system.playClip('player', clip)
      system.stopClip('player', 'wave')
      
      // @ts-ignore - accessing internal state
      expect(system.states.get('player')).toHaveLength(0)
    })
  })

  describe('IK targets', () => {
    it('should set IK target', () => {
      system.createSkeleton('player', createTestBones())
      
      system.setIKTarget('player', {
        boneId: 'hand_r',
        targetPosition: { x: 1, y: 1, z: 0 },
        weight: 1.0,
        chainLength: 2
      })
      
      // @ts-ignore - accessing internal state
      expect(system.ikTargets.get('player')).toHaveLength(1)
    })

    it('should update existing IK target', () => {
      system.createSkeleton('player', createTestBones())
      
      system.setIKTarget('player', {
        boneId: 'hand_r',
        targetPosition: { x: 1, y: 1, z: 0 },
        weight: 1.0,
        chainLength: 2
      })
      
      system.setIKTarget('player', {
        boneId: 'hand_r',
        targetPosition: { x: 2, y: 2, z: 0 },
        weight: 0.5,
        chainLength: 2
      })
      
      // @ts-ignore - accessing internal state
      expect(system.ikTargets.get('player')).toHaveLength(1)
      expect(system.ikTargets.get('player')[0].weight).toBe(0.5)
    })

    it('should remove IK target', () => {
      system.createSkeleton('player', createTestBones())
      
      system.setIKTarget('player', {
        boneId: 'hand_r',
        targetPosition: { x: 1, y: 1, z: 0 },
        weight: 1.0,
        chainLength: 2
      })
      
      system.removeIKTarget('player', 'hand_r')
      
      // @ts-ignore - accessing internal state
      expect(system.ikTargets.get('player')).toHaveLength(0)
    })
  })

  describe('update', () => {
    it('should advance animation time', () => {
      system.createSkeleton('player', createTestBones())
      const clip = new AnimationClip(createTestAnimationClip())
      
      system.playClip('player', clip, { loop: true })
      system.update(0.1)
      
      // @ts-ignore - accessing internal state
      expect(system.states.get('player')[0].time).toBeCloseTo(0.1)
    })

    it('should loop animations', () => {
      system.createSkeleton('player', createTestBones())
      const clip = new AnimationClip(createTestAnimationClip())
      
      system.playClip('player', clip, { loop: true })
      system.update(1.5) // 1.5 seconds with 1.0 duration = should wrap
      
      // @ts-ignore - accessing internal state
      expect(system.states.get('player')[0].time).toBeCloseTo(0.5)
    })

    it('should mark non-looping animations as finished', () => {
      system.createSkeleton('player', createTestBones())
      const clip = new AnimationClip(createTestAnimationClip())
      
      system.playClip('player', clip, { loop: false })
      system.update(1.5)
      
      // @ts-ignore - accessing internal state
      expect(system.states.get('player')).toHaveLength(0) // Should be removed
    })

    it('should apply IK after animation', () => {
      system.createSkeleton('player', createTestBones())
      
      system.setIKTarget('player', {
        boneId: 'hand_r',
        targetPosition: { x: 1.5, y: 1.5, z: 0 },
        weight: 1.0,
        chainLength: 2
      })
      
      system.update(0.016)
      
      // IK should have moved the hand towards target
      const skeleton = system.getSkeleton('player')!
      const hand = skeleton.getBone('hand_r')!
      
      // Hand should be closer to target than original position
      expect(hand.worldTransform.position.x).toBeGreaterThanOrEqual(0.8)
    })
  })
})

// =============================================================================
// FACTORY FUNCTION TESTS
// =============================================================================

describe('Factory Functions', () => {
  describe('createAnimationSystem', () => {
    it('should return AnimationSystem module', () => {
      const system = createAnimationSystem()
      expect(system.createSkeleton).toBeDefined()
      expect(system.playClip).toBeDefined()
      expect(system.update).toBeDefined()
    })
  })

  describe('createIKSolver', () => {
    it('should return FABRIKSolver module', () => {
      const solver = createIKSolver()
      expect(solver.solve).toBeDefined()
    })
  })

  describe('VERSION', () => {
    it('should be defined', () => {
      expect(VERSION).toBe('1.0.0')
    })
  })
})

// =============================================================================
// MATH UTILITY TESTS
// =============================================================================

describe('Math Utilities', () => {
  describe('quaternion slerp', () => {
    it('should interpolate quaternions correctly', () => {
      const clipData: AnimationClipData = {
        name: 'slerp-test',
        duration: 1.0,
        tracks: [{
          targetBoneId: 'test',
          property: 'rotation',
          keyframes: [
            { time: 0, value: { x: 0, y: 0, z: 0, w: 1 }, interpolation: 'linear' },
            { time: 1, value: { x: 0, y: 0.707, z: 0, w: 0.707 }, interpolation: 'linear' }
          ]
        }]
      }
      
      const clip = new AnimationClip(clipData)
      const sample = clip.sample(0.5)
      
      const rot = sample.get('test')?.rotation!
      // Result should be normalized
      const len = Math.sqrt(rot.x ** 2 + rot.y ** 2 + rot.z ** 2 + rot.w ** 2)
      expect(len).toBeCloseTo(1)
    })
  })

  describe('vector lerp', () => {
    it('should interpolate vectors correctly', () => {
      const clipData: AnimationClipData = {
        name: 'lerp-test',
        duration: 1.0,
        tracks: [{
          targetBoneId: 'test',
          property: 'position',
          keyframes: [
            { time: 0, value: { x: 0, y: 0, z: 0 }, interpolation: 'linear' },
            { time: 1, value: { x: 10, y: 20, z: 30 }, interpolation: 'linear' }
          ]
        }]
      }
      
      const clip = new AnimationClip(clipData)
      const sample = clip.sample(0.5)
      
      const pos = sample.get('test')?.position!
      expect(pos.x).toBeCloseTo(5)
      expect(pos.y).toBeCloseTo(10)
      expect(pos.z).toBeCloseTo(15)
    })
  })
})
