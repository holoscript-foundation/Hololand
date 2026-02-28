/**
 * HoloScript Trait Registry
 *
 * Comprehensive trait system for Hololand implementing 50+ HoloScript traits.
 * Each trait provides behavior, visual effects, physics, or interactivity to objects.
 *
 * @packageDocumentation
 */

import type { Object3D, Material, Mesh, Light } from 'three';
import type { Scene } from 'three';

// ============================================================================
// TRAIT INTERFACE
// ============================================================================

export interface Trait {
  name: string;
  category: TraitCategory;
  description: string;
  dependencies?: string[];
  conflicts?: string[];
  apply(target: Object3D, params?: Record<string, any>): void;
  update?(target: Object3D, deltaTime: number): void;
  remove?(target: Object3D): void;
}

export enum TraitCategory {
  SPATIAL = 'spatial',
  PHYSICS = 'physics',
  ANIMATION = 'animation',
  AUDIO = 'audio',
  VR_INTERACTION = 'vr_interaction',
  NETWORKING = 'networking',
  VISUAL_EFFECTS = 'visual_effects',
  GAMEPLAY = 'gameplay',
  AI = 'ai',
  ENVIRONMENT = 'environment'
}

// ============================================================================
// SPATIAL TRAITS
// ============================================================================

export class SpatialTrait implements Trait {
  name = '@spatial';
  category = TraitCategory.SPATIAL;
  description = 'Basic spatial object with position, rotation, scale';

  apply(target: Object3D) {
    target.userData.trait_spatial = true;
    target.matrixAutoUpdate = true;
  }
}

export class TransformableTrait implements Trait {
  name = '@transformable';
  category = TraitCategory.SPATIAL;
  description = 'Object can be moved, rotated, and scaled in VR';

  apply(target: Object3D) {
    target.userData.trait_transformable = true;
    target.userData.canMove = true;
    target.userData.canRotate = true;
    target.userData.canScale = true;
  }
}

export class AnchoredTrait implements Trait {
  name = '@anchored';
  category = TraitCategory.SPATIAL;
  description = 'Object is anchored to real-world position (AR)';

  apply(target: Object3D, params?: { anchorId?: string }) {
    target.userData.trait_anchored = true;
    target.userData.anchorId = params?.anchorId || `anchor_${Date.now()}`;
  }
}

// ============================================================================
// PHYSICS TRAITS
// ============================================================================

export class PhysicsTrait implements Trait {
  name = '@physics';
  category = TraitCategory.PHYSICS;
  description = 'Enable physics simulation on object';

  apply(target: Object3D) {
    target.userData.trait_physics = true;
    target.userData.physicsEnabled = true;
  }
}

export class RigidbodyTrait implements Trait {
  name = '@rigidbody';
  category = TraitCategory.PHYSICS;
  description = 'Dynamic physics body affected by forces and gravity';
  dependencies = ['@physics'];

  apply(target: Object3D, params?: { mass?: number; restitution?: number; friction?: number }) {
    target.userData.trait_rigidbody = true;
    target.userData.mass = params?.mass || 1;
    target.userData.restitution = params?.restitution || 0.3;
    target.userData.friction = params?.friction || 0.5;
    target.userData.velocity = { x: 0, y: 0, z: 0 };
    target.userData.angularVelocity = { x: 0, y: 0, z: 0 };
  }

  update(target: Object3D, deltaTime: number) {
    // Apply gravity and physics updates
    const velocity = target.userData.velocity;
    if (velocity) {
      target.position.x += velocity.x * deltaTime;
      target.position.y += velocity.y * deltaTime;
      target.position.z += velocity.z * deltaTime;

      // Apply gravity
      velocity.y -= 9.81 * deltaTime;
    }
  }
}

export class KinematicTrait implements Trait {
  name = '@kinematic';
  category = TraitCategory.PHYSICS;
  description = 'Physics body controlled by animation, not forces';
  dependencies = ['@physics'];

  apply(target: Object3D) {
    target.userData.trait_kinematic = true;
    target.userData.isKinematic = true;
  }
}

export class TriggerTrait implements Trait {
  name = '@trigger';
  category = TraitCategory.PHYSICS;
  description = 'Collision detection without physical response';
  dependencies = ['@physics'];

  apply(target: Object3D, params?: { onEnter?: string; onExit?: string }) {
    target.userData.trait_trigger = true;
    target.userData.isTrigger = true;
    target.userData.onTriggerEnter = params?.onEnter;
    target.userData.onTriggerExit = params?.onExit;
    target.userData.triggeredObjects = new Set();
  }
}

export class CollisionTrait implements Trait {
  name = '@collision';
  category = TraitCategory.PHYSICS;
  description = 'Physical collision detection and response';
  dependencies = ['@physics'];

  apply(target: Object3D, params?: { shape?: 'box' | 'sphere' | 'capsule' | 'mesh' }) {
    target.userData.trait_collision = true;
    target.userData.collisionShape = params?.shape || 'box';
  }
}

// ============================================================================
// ANIMATION TRAITS
// ============================================================================

export class AnimateTrait implements Trait {
  name = '@animate';
  category = TraitCategory.ANIMATION;
  description = 'Enable animation system on object';

  apply(target: Object3D) {
    target.userData.trait_animate = true;
    target.userData.animations = [];
  }
}

export class RotateTrait implements Trait {
  name = '@rotate';
  category = TraitCategory.ANIMATION;
  description = 'Continuously rotate object';

  apply(target: Object3D, params?: { speed?: number; axis?: 'x' | 'y' | 'z' }) {
    target.userData.trait_rotate = true;
    target.userData.rotateSpeed = params?.speed || 1;
    target.userData.rotateAxis = params?.axis || 'y';
  }

  update(target: Object3D, deltaTime: number) {
    const speed = target.userData.rotateSpeed || 1;
    const axis = target.userData.rotateAxis || 'y';

    switch (axis) {
      case 'x':
        target.rotation.x += speed * deltaTime;
        break;
      case 'y':
        target.rotation.y += speed * deltaTime;
        break;
      case 'z':
        target.rotation.z += speed * deltaTime;
        break;
    }
  }
}

export class FloatTrait implements Trait {
  name = '@float';
  category = TraitCategory.ANIMATION;
  description = 'Object floats up and down with sine wave';

  apply(target: Object3D, params?: { amplitude?: number; frequency?: number }) {
    target.userData.trait_float = true;
    target.userData.floatAmplitude = params?.amplitude || 0.5;
    target.userData.floatFrequency = params?.frequency || 1;
    target.userData.floatTime = 0;
    target.userData.floatStartY = target.position.y;
  }

  update(target: Object3D, deltaTime: number) {
    target.userData.floatTime += deltaTime;
    const amplitude = target.userData.floatAmplitude || 0.5;
    const frequency = target.userData.floatFrequency || 1;
    const startY = target.userData.floatStartY || 0;

    target.position.y = startY + Math.sin(target.userData.floatTime * frequency) * amplitude;
  }
}

export class PulseTrait implements Trait {
  name = '@pulse';
  category = TraitCategory.ANIMATION;
  description = 'Object pulses in scale';

  apply(target: Object3D, params?: { scale?: number; frequency?: number }) {
    target.userData.trait_pulse = true;
    target.userData.pulseScale = params?.scale || 0.1;
    target.userData.pulseFrequency = params?.frequency || 2;
    target.userData.pulseTime = 0;
    target.userData.pulseBaseScale = { ...target.scale };
  }

  update(target: Object3D, deltaTime: number) {
    target.userData.pulseTime += deltaTime;
    const pulseScale = target.userData.pulseScale || 0.1;
    const frequency = target.userData.pulseFrequency || 2;
    const baseScale = target.userData.pulseBaseScale;

    const pulse = 1 + Math.sin(target.userData.pulseTime * frequency) * pulseScale;
    target.scale.set(
      baseScale.x * pulse,
      baseScale.y * pulse,
      baseScale.z * pulse
    );
  }
}

export class LerpTrait implements Trait {
  name = '@lerp';
  category = TraitCategory.ANIMATION;
  description = 'Smoothly interpolate to target position';

  apply(target: Object3D, params?: { target?: { x: number; y: number; z: number }; speed?: number }) {
    target.userData.trait_lerp = true;
    target.userData.lerpTarget = params?.target || { x: 0, y: 0, z: 0 };
    target.userData.lerpSpeed = params?.speed || 2;
  }

  update(target: Object3D, deltaTime: number) {
    const lerpTarget = target.userData.lerpTarget;
    const speed = target.userData.lerpSpeed || 2;

    if (lerpTarget) {
      const t = Math.min(1, speed * deltaTime);
      target.position.lerp(lerpTarget, t);
    }
  }
}

export class TweenTrait implements Trait {
  name = '@tween';
  category = TraitCategory.ANIMATION;
  description = 'Animation with easing functions';

  apply(target: Object3D, params?: { duration?: number; easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' }) {
    target.userData.trait_tween = true;
    target.userData.tweenDuration = params?.duration || 1;
    target.userData.tweenEasing = params?.easing || 'easeInOut';
    target.userData.tweenProgress = 0;
  }
}

export class SpringTrait implements Trait {
  name = '@spring';
  category = TraitCategory.ANIMATION;
  description = 'Physics-based spring animation';

  apply(target: Object3D, params?: { stiffness?: number; damping?: number }) {
    target.userData.trait_spring = true;
    target.userData.springStiffness = params?.stiffness || 100;
    target.userData.springDamping = params?.damping || 10;
    target.userData.springVelocity = { x: 0, y: 0, z: 0 };
  }
}

// ============================================================================
// AUDIO TRAITS
// ============================================================================

export class AudioTrait implements Trait {
  name = '@audio';
  category = TraitCategory.AUDIO;
  description = 'Enable audio on object';

  apply(target: Object3D) {
    target.userData.trait_audio = true;
    target.userData.audioEnabled = true;
  }
}

export class AudioSourceTrait implements Trait {
  name = '@audioSource';
  category = TraitCategory.AUDIO;
  description = 'Object emits audio';
  dependencies = ['@audio'];

  apply(target: Object3D, params?: { url?: string; loop?: boolean; volume?: number }) {
    target.userData.trait_audioSource = true;
    target.userData.audioUrl = params?.url;
    target.userData.audioLoop = params?.loop !== false;
    target.userData.audioVolume = params?.volume || 1;
  }
}

export class SpatialAudioTrait implements Trait {
  name = '@spatialAudio';
  category = TraitCategory.AUDIO;
  description = '3D positional audio with distance falloff';
  dependencies = ['@audioSource'];

  apply(target: Object3D, params?: { maxDistance?: number; refDistance?: number; rolloff?: number }) {
    target.userData.trait_spatialAudio = true;
    target.userData.audioMaxDistance = params?.maxDistance || 50;
    target.userData.audioRefDistance = params?.refDistance || 1;
    target.userData.audioRolloff = params?.rolloff || 1;
  }
}

export class AudioZoneTrait implements Trait {
  name = '@audioZone';
  category = TraitCategory.AUDIO;
  description = 'Trigger audio when entering zone';
  dependencies = ['@trigger'];

  apply(target: Object3D, params?: { enterSound?: string; exitSound?: string; ambientSound?: string }) {
    target.userData.trait_audioZone = true;
    target.userData.audioEnterSound = params?.enterSound;
    target.userData.audioExitSound = params?.exitSound;
    target.userData.audioAmbientSound = params?.ambientSound;
  }
}

// ============================================================================
// VR INTERACTION TRAITS
// ============================================================================

export class GrabbableTrait implements Trait {
  name = '@grabbable';
  category = TraitCategory.VR_INTERACTION;
  description = 'Object can be grabbed with VR controllers';

  apply(target: Object3D, params?: { twoHanded?: boolean }) {
    target.userData.trait_grabbable = true;
    target.userData.isGrabbable = true;
    target.userData.twoHandedGrab = params?.twoHanded || false;
    target.userData.isGrabbed = false;
    target.userData.grabbedBy = null;
  }
}

export class InteractiveTrait implements Trait {
  name = '@interactive';
  category = TraitCategory.VR_INTERACTION;
  description = 'Object responds to clicks and hover events';

  apply(target: Object3D, params?: { onClick?: string; onHover?: string; cursor?: string }) {
    target.userData.trait_interactive = true;
    target.userData.isInteractive = true;
    target.userData.onClick = params?.onClick;
    target.userData.onHover = params?.onHover;
    target.userData.cursor = params?.cursor || 'pointer';
  }
}

export class TeleportableTrait implements Trait {
  name = '@teleportable';
  category = TraitCategory.VR_INTERACTION;
  description = 'Valid teleportation target for VR locomotion';

  apply(target: Object3D) {
    target.userData.trait_teleportable = true;
    target.userData.canTeleportTo = true;
  }
}

export class ScalableTrait implements Trait {
  name = '@scalable';
  category = TraitCategory.VR_INTERACTION;
  description = 'Object can be resized with VR pinch gesture';

  apply(target: Object3D, params?: { minScale?: number; maxScale?: number }) {
    target.userData.trait_scalable = true;
    target.userData.isScalable = true;
    target.userData.minScale = params?.minScale || 0.1;
    target.userData.maxScale = params?.maxScale || 10;
  }
}

export class RotatableTrait implements Trait {
  name = '@rotatable';
  category = TraitCategory.VR_INTERACTION;
  description = 'Object can be rotated with VR gesture';

  apply(target: Object3D, params?: { axis?: 'x' | 'y' | 'z' | 'all' }) {
    target.userData.trait_rotatable = true;
    target.userData.isRotatable = true;
    target.userData.rotationAxis = params?.axis || 'all';
  }
}

export class CloneableTrait implements Trait {
  name = '@cloneable';
  category = TraitCategory.VR_INTERACTION;
  description = 'Object can be duplicated in VR';

  apply(target: Object3D, params?: { maxClones?: number }) {
    target.userData.trait_cloneable = true;
    target.userData.isCloneable = true;
    target.userData.maxClones = params?.maxClones || Infinity;
    target.userData.cloneCount = 0;
  }
}

export class SittableTrait implements Trait {
  name = '@sittable';
  category = TraitCategory.VR_INTERACTION;
  description = 'Object is a seat that player can sit on';

  apply(target: Object3D, params?: { seatHeight?: number; seatOffset?: { x: number; y: number; z: number } }) {
    target.userData.trait_sittable = true;
    target.userData.isSittable = true;
    target.userData.seatHeight = params?.seatHeight || 0.5;
    target.userData.seatOffset = params?.seatOffset || { x: 0, y: 0, z: 0 };
    target.userData.occupied = false;
  }
}

export class LookAtPlayerTrait implements Trait {
  name = '@lookAtPlayer';
  category = TraitCategory.VR_INTERACTION;
  description = 'Object always faces the player camera';

  apply(target: Object3D) {
    target.userData.trait_lookAtPlayer = true;
    target.userData.shouldLookAtPlayer = true;
  }

  update(target: Object3D) {
    // Will be implemented by renderer with camera reference
  }
}

// ============================================================================
// NETWORKING TRAITS
// ============================================================================

export class NetworkedTrait implements Trait {
  name = '@networked';
  category = TraitCategory.NETWORKING;
  description = 'Synchronized across network for multiplayer';

  apply(target: Object3D, params?: { owner?: string; syncRate?: number }) {
    target.userData.trait_networked = true;
    target.userData.isNetworked = true;
    target.userData.networkOwner = params?.owner || 'server';
    target.userData.networkSyncRate = params?.syncRate || 20; // 20 Hz default
    target.userData.networkId = `net_${Date.now()}_${Math.random()}`;
  }
}

export class SyncedTrait implements Trait {
  name = '@synced';
  category = TraitCategory.NETWORKING;
  description = 'Specific properties synchronized';
  dependencies = ['@networked'];

  apply(target: Object3D, params?: { properties?: string[] }) {
    target.userData.trait_synced = true;
    target.userData.syncedProperties = params?.properties || ['position', 'rotation', 'scale'];
  }
}

// ============================================================================
// VISUAL EFFECTS TRAITS
// ============================================================================

export class EmissiveTrait implements Trait {
  name = '@emissive';
  category = TraitCategory.VISUAL_EFFECTS;
  description = 'Object emits light from material';

  apply(target: Object3D, params?: { color?: string; intensity?: number }) {
    target.userData.trait_emissive = true;
    target.userData.emissiveColor = params?.color || '#ffffff';
    target.userData.emissiveIntensity = params?.intensity || 1;

    // Apply to material if it's a mesh
    if ((target as Mesh).isMesh) {
      const mesh = target as Mesh;
      const material = mesh.material as Material & { emissive?: any; emissiveIntensity?: number };
      if (material.emissive) {
        material.emissive.set(params?.color || '#ffffff');
        material.emissiveIntensity = params?.intensity || 1;
      }
    }
  }
}

export class ParticleTrait implements Trait {
  name = '@particle';
  category = TraitCategory.VISUAL_EFFECTS;
  description = 'Particle system emitter';

  apply(target: Object3D, params?: { count?: number; lifetime?: number; size?: number }) {
    target.userData.trait_particle = true;
    target.userData.particleCount = params?.count || 100;
    target.userData.particleLifetime = params?.lifetime || 2;
    target.userData.particleSize = params?.size || 0.1;
  }
}

export class ShaderTrait implements Trait {
  name = '@shader';
  category = TraitCategory.VISUAL_EFFECTS;
  description = 'Custom shader material';

  apply(target: Object3D, params?: { vertexShader?: string; fragmentShader?: string }) {
    target.userData.trait_shader = true;
    target.userData.vertexShader = params?.vertexShader;
    target.userData.fragmentShader = params?.fragmentShader;
  }
}

export class GlowTrait implements Trait {
  name = '@glow';
  category = TraitCategory.VISUAL_EFFECTS;
  description = 'Bloom/glow effect around object';

  apply(target: Object3D, params?: { strength?: number; radius?: number; threshold?: number }) {
    target.userData.trait_glow = true;
    target.userData.glowStrength = params?.strength || 1;
    target.userData.glowRadius = params?.radius || 0.5;
    target.userData.glowThreshold = params?.threshold || 0.5;
  }
}

export class OutlineTrait implements Trait {
  name = '@outline';
  category = TraitCategory.VISUAL_EFFECTS;
  description = 'Outline effect around object';

  apply(target: Object3D, params?: { color?: string; thickness?: number }) {
    target.userData.trait_outline = true;
    target.userData.outlineColor = params?.color || '#ffffff';
    target.userData.outlineThickness = params?.thickness || 0.05;
  }
}

// ============================================================================
// GAMEPLAY TRAITS
// ============================================================================

export class HealthTrait implements Trait {
  name = '@health';
  category = TraitCategory.GAMEPLAY;
  description = 'Object has health points';

  apply(target: Object3D, params?: { max?: number; current?: number; regen?: number }) {
    target.userData.trait_health = true;
    target.userData.healthMax = params?.max || 100;
    target.userData.healthCurrent = params?.current || params?.max || 100;
    target.userData.healthRegen = params?.regen || 0;
  }

  update(target: Object3D, deltaTime: number) {
    const regen = target.userData.healthRegen || 0;
    if (regen > 0) {
      target.userData.healthCurrent = Math.min(
        target.userData.healthMax,
        target.userData.healthCurrent + regen * deltaTime
      );
    }
  }
}

export class DamageableTrait implements Trait {
  name = '@damageable';
  category = TraitCategory.GAMEPLAY;
  description = 'Object can take damage';
  dependencies = ['@health'];

  apply(target: Object3D, params?: { armor?: number; onDeath?: string }) {
    target.userData.trait_damageable = true;
    target.userData.armor = params?.armor || 0;
    target.userData.onDeath = params?.onDeath;
  }
}

export class CollectibleTrait implements Trait {
  name = '@collectible';
  category = TraitCategory.GAMEPLAY;
  description = 'Object can be collected by player';

  apply(target: Object3D, params?: { value?: number; category?: string; respawn?: boolean }) {
    target.userData.trait_collectible = true;
    target.userData.isCollectible = true;
    target.userData.collectValue = params?.value || 1;
    target.userData.collectCategory = params?.category || 'item';
    target.userData.collectRespawn = params?.respawn || false;
  }
}

export class SpawnerTrait implements Trait {
  name = '@spawner';
  category = TraitCategory.GAMEPLAY;
  description = 'Spawns objects at intervals';

  apply(target: Object3D, params?: { interval?: number; max?: number; template?: string }) {
    target.userData.trait_spawner = true;
    target.userData.spawnInterval = params?.interval || 5;
    target.userData.spawnMax = params?.max || 10;
    target.userData.spawnTemplate = params?.template;
    target.userData.spawnCount = 0;
    target.userData.spawnTimer = 0;
  }

  update(target: Object3D, deltaTime: number) {
    target.userData.spawnTimer += deltaTime;

    if (target.userData.spawnTimer >= target.userData.spawnInterval) {
      if (target.userData.spawnCount < target.userData.spawnMax) {
        // Trigger spawn event
        target.userData.spawnTimer = 0;
        target.userData.spawnCount++;
      }
    }
  }
}

export class DialogueTrait implements Trait {
  name = '@dialogue';
  category = TraitCategory.GAMEPLAY;
  description = 'Object has dialogue/conversation system';

  apply(target: Object3D, params?: { dialogueId?: string; autoStart?: boolean }) {
    target.userData.trait_dialogue = true;
    target.userData.dialogueId = params?.dialogueId;
    target.userData.dialogueAutoStart = params?.autoStart || false;
  }
}

// ============================================================================
// AI TRAITS
// ============================================================================

export class AITrait implements Trait {
  name = '@ai';
  category = TraitCategory.AI;
  description = 'AI-controlled entity';

  apply(target: Object3D) {
    target.userData.trait_ai = true;
    target.userData.aiEnabled = true;
  }
}

export class PatrolTrait implements Trait {
  name = '@patrol';
  category = TraitCategory.AI;
  description = 'AI patrols between waypoints';
  dependencies = ['@ai'];

  apply(target: Object3D, params?: { waypoints?: { x: number; y: number; z: number }[]; speed?: number }) {
    target.userData.trait_patrol = true;
    target.userData.patrolWaypoints = params?.waypoints || [];
    target.userData.patrolSpeed = params?.speed || 2;
    target.userData.patrolCurrentIndex = 0;
  }
}

export class SeekTrait implements Trait {
  name = '@seek';
  category = TraitCategory.AI;
  description = 'AI seeks toward target';
  dependencies = ['@ai'];

  apply(target: Object3D, params?: { target?: string; speed?: number; range?: number }) {
    target.userData.trait_seek = true;
    target.userData.seekTarget = params?.target;
    target.userData.seekSpeed = params?.speed || 3;
    target.userData.seekRange = params?.range || 50;
  }
}

export class FleeTrait implements Trait {
  name = '@flee';
  category = TraitCategory.AI;
  description = 'AI flees from target';
  dependencies = ['@ai'];

  apply(target: Object3D, params?: { threat?: string; speed?: number; range?: number }) {
    target.userData.trait_flee = true;
    target.userData.fleeThreat = params?.threat;
    target.userData.fleeSpeed = params?.speed || 4;
    target.userData.fleeRange = params?.range || 20;
  }
}

// ============================================================================
// ENVIRONMENT TRAITS
// ============================================================================

export class PortalTrait implements Trait {
  name = '@portal';
  category = TraitCategory.ENVIRONMENT;
  description = 'Portal to another location or zone';

  apply(target: Object3D, params?: { destination?: string; label?: string; effect?: string }) {
    target.userData.trait_portal = true;
    target.userData.isPortal = true;
    target.userData.portalDestination = params?.destination;
    target.userData.portalLabel = params?.label;
    target.userData.portalEffect = params?.effect || 'fade';
  }
}

export class LightTrait implements Trait {
  name = '@light';
  category = TraitCategory.ENVIRONMENT;
  description = 'Light source';

  apply(target: Object3D, params?: { type?: 'point' | 'directional' | 'spot'; color?: string; intensity?: number }) {
    target.userData.trait_light = true;
    target.userData.lightType = params?.type || 'point';
    target.userData.lightColor = params?.color || '#ffffff';
    target.userData.lightIntensity = params?.intensity || 1;
  }
}

export class ShadowCasterTrait implements Trait {
  name = '@shadowCaster';
  category = TraitCategory.ENVIRONMENT;
  description = 'Object casts shadows';

  apply(target: Object3D) {
    target.userData.trait_shadowCaster = true;
    target.castShadow = true;
  }
}

export class ShadowReceiverTrait implements Trait {
  name = '@shadowReceiver';
  category = TraitCategory.ENVIRONMENT;
  description = 'Object receives shadows';

  apply(target: Object3D) {
    target.userData.trait_shadowReceiver = true;
    target.receiveShadow = true;
  }
}

// ============================================================================
// ADVANCED ANIMATION TRAITS
// ============================================================================

export class BobTrait implements Trait {
  name = '@bob';
  category = TraitCategory.ANIMATION;
  description = 'Bob up and down (subtle float)';

  apply(target: Object3D, params?: { speed?: number; amount?: number }) {
    target.userData.trait_bob = true;
    target.userData.bobSpeed = params?.speed || 0.5;
    target.userData.bobAmount = params?.amount || 0.05;
    target.userData.bobOriginalY = target.position.y;
  }

  update(target: Object3D, deltaTime: number) {
    const speed = target.userData.bobSpeed || 0.5;
    const amount = target.userData.bobAmount || 0.05;
    const originalY = target.userData.bobOriginalY || target.position.y;
    const elapsed = (target.userData.elapsedTime || 0) + deltaTime;
    target.userData.elapsedTime = elapsed;
    target.position.y = originalY + Math.sin(elapsed * speed) * amount;
  }
}

export class SwayTrait implements Trait {
  name = '@sway';
  category = TraitCategory.ANIMATION;
  description = 'Gentle swaying motion';

  apply(target: Object3D, params?: { speed?: number; amount?: number }) {
    target.userData.trait_sway = true;
    target.userData.swaySpeed = params?.speed || 0.3;
    target.userData.swayAmount = params?.amount || 0.1;
  }

  update(target: Object3D, deltaTime: number) {
    const speed = target.userData.swaySpeed || 0.3;
    const amount = target.userData.swayAmount || 0.1;
    const elapsed = (target.userData.elapsedTime || 0) + deltaTime;
    target.userData.elapsedTime = elapsed;
    target.rotation.z = Math.sin(elapsed * speed) * amount;
    target.rotation.x = Math.cos(elapsed * speed * 0.7) * amount * 0.5;
  }
}

export class BounceTrait implements Trait {
  name = '@bounce';
  category = TraitCategory.ANIMATION;
  description = 'Bouncing animation with easing';

  apply(target: Object3D, params?: { height?: number; speed?: number }) {
    target.userData.trait_bounce = true;
    target.userData.bounceHeight = params?.height || 1;
    target.userData.bounceSpeed = params?.speed || 2;
    target.userData.bounceOriginalY = target.position.y;
  }

  update(target: Object3D, deltaTime: number) {
    const height = target.userData.bounceHeight || 1;
    const speed = target.userData.bounceSpeed || 2;
    const originalY = target.userData.bounceOriginalY || target.position.y;
    const elapsed = (target.userData.elapsedTime || 0) + deltaTime;
    target.userData.elapsedTime = elapsed;
    const bounce = Math.abs(Math.sin(elapsed * speed));
    target.position.y = originalY + bounce * height;
  }
}

export class OrbitTrait implements Trait {
  name = '@orbit';
  category = TraitCategory.ANIMATION;
  description = 'Orbit around a center point';

  apply(target: Object3D, params?: { radius?: number; speed?: number; axis?: 'x' | 'y' | 'z' }) {
    target.userData.trait_orbit = true;
    target.userData.orbitRadius = params?.radius || 5;
    target.userData.orbitSpeed = params?.speed || 1;
    target.userData.orbitAxis = params?.axis || 'y';
    target.userData.orbitCenter = target.position.clone();
  }

  update(target: Object3D, deltaTime: number) {
    const radius = target.userData.orbitRadius || 5;
    const speed = target.userData.orbitSpeed || 1;
    const axis = target.userData.orbitAxis || 'y';
    const elapsed = (target.userData.elapsedTime || 0) + deltaTime;
    target.userData.elapsedTime = elapsed;
    const angle = elapsed * speed;

    if (axis === 'y') {
      target.position.x = Math.cos(angle) * radius;
      target.position.z = Math.sin(angle) * radius;
    } else if (axis === 'x') {
      target.position.y = Math.cos(angle) * radius;
      target.position.z = Math.sin(angle) * radius;
    } else {
      target.position.x = Math.cos(angle) * radius;
      target.position.y = Math.sin(angle) * radius;
    }
  }
}

export class WobbleTrait implements Trait {
  name = '@wobble';
  category = TraitCategory.ANIMATION;
  description = 'Wobble with chaotic motion';

  apply(target: Object3D, params?: { intensity?: number }) {
    target.userData.trait_wobble = true;
    target.userData.wobbleIntensity = params?.intensity || 0.1;
  }

  update(target: Object3D, deltaTime: number) {
    const intensity = target.userData.wobbleIntensity || 0.1;
    const elapsed = (target.userData.elapsedTime || 0) + deltaTime;
    target.userData.elapsedTime = elapsed;
    target.rotation.x += Math.sin(elapsed * 3) * intensity * deltaTime;
    target.rotation.y += Math.cos(elapsed * 2) * intensity * deltaTime;
    target.rotation.z += Math.sin(elapsed * 4) * intensity * deltaTime;
  }
}

// ============================================================================
// ADVANCED VR INTERACTION TRAITS
// ============================================================================

export class PushableTrait implements Trait {
  name = '@pushable';
  category = TraitCategory.VR_INTERACTION;
  description = 'Can be pushed with controllers';

  apply(target: Object3D, params?: { force?: number }) {
    target.userData.trait_pushable = true;
    target.userData.pushForce = params?.force || 10;
  }
}

export class ThrowableTrait implements Trait {
  name = '@throwable';
  category = TraitCategory.VR_INTERACTION;
  description = 'Can be thrown in VR';
  dependencies = ['@grabbable'];

  apply(target: Object3D, params?: { maxVelocity?: number }) {
    target.userData.trait_throwable = true;
    target.userData.maxThrowVelocity = params?.maxVelocity || 20;
  }
}

export class SnapTrait implements Trait {
  name = '@snap';
  category = TraitCategory.VR_INTERACTION;
  description = 'Snaps to snap points when released';

  apply(target: Object3D, params?: { snapDistance?: number }) {
    target.userData.trait_snap = true;
    target.userData.snapDistance = params?.snapDistance || 0.5;
  }
}

// ============================================================================
// ADVANCED GAMEPLAY TRAITS
// ============================================================================

export class InventoryTrait implements Trait {
  name = '@inventory';
  category = TraitCategory.GAMEPLAY;
  description = 'Object has inventory system';

  apply(target: Object3D, params?: { slots?: number }) {
    target.userData.trait_inventory = true;
    target.userData.inventorySlots = params?.slots || 10;
    target.userData.inventoryItems = [];
  }
}

export class CraftingTrait implements Trait {
  name = '@crafting';
  category = TraitCategory.GAMEPLAY;
  description = 'Crafting station or object';

  apply(target: Object3D, params?: { recipes?: any[] }) {
    target.userData.trait_crafting = true;
    target.userData.craftingRecipes = params?.recipes || [];
  }
}

export class QuestGiverTrait implements Trait {
  name = '@questGiver';
  category = TraitCategory.GAMEPLAY;
  description = 'NPC gives quests';
  dependencies = ['@dialogue'];

  apply(target: Object3D, params?: { quests?: any[] }) {
    target.userData.trait_questGiver = true;
    target.userData.availableQuests = params?.quests || [];
  }
}

export class ShopTrait implements Trait {
  name = '@shop';
  category = TraitCategory.GAMEPLAY;
  description = 'Shop or vendor';

  apply(target: Object3D, params?: { items?: any[]; currency?: string }) {
    target.userData.trait_shop = true;
    target.userData.shopItems = params?.items || [];
    target.userData.shopCurrency = params?.currency || 'coins';
  }
}

// ============================================================================
// USER INTERFACE TRAITS
// ============================================================================

export class LabelTrait implements Trait {
  name = '@label';
  category = TraitCategory.VR_INTERACTION;
  description = 'Shows text label above object';

  apply(target: Object3D, params?: { text?: string; color?: string; size?: number }) {
    target.userData.trait_label = true;
    target.userData.labelText = params?.text || 'Label';
    target.userData.labelColor = params?.color || '#ffffff';
    target.userData.labelSize = params?.size || 0.5;
  }
}

export class TooltipTrait implements Trait {
  name = '@tooltip';
  category = TraitCategory.VR_INTERACTION;
  description = 'Shows tooltip on hover';
  dependencies = ['@interactive'];

  apply(target: Object3D, params?: { text?: string; delay?: number }) {
    target.userData.trait_tooltip = true;
    target.userData.tooltipText = params?.text || 'Tooltip';
    target.userData.tooltipDelay = params?.delay || 0.5;
  }
}

export class HealthBarTrait implements Trait {
  name = '@healthBar';
  category = TraitCategory.VR_INTERACTION;
  description = 'Shows health bar above object';
  dependencies = ['@health'];

  apply(target: Object3D, params?: { width?: number; height?: number }) {
    target.userData.trait_healthBar = true;
    target.userData.healthBarWidth = params?.width || 1;
    target.userData.healthBarHeight = params?.height || 0.1;
  }
}

export class ProgressBarTrait implements Trait {
  name = '@progressBar';
  category = TraitCategory.VR_INTERACTION;
  description = 'Shows progress bar';

  apply(target: Object3D, params?: { max?: number; current?: number }) {
    target.userData.trait_progressBar = true;
    target.userData.progressMax = params?.max || 100;
    target.userData.progressCurrent = params?.current || 0;
  }
}

export class MinimapTrait implements Trait {
  name = '@minimap';
  category = TraitCategory.VR_INTERACTION;
  description = 'Shows on minimap';

  apply(target: Object3D, params?: { icon?: string; color?: string }) {
    target.userData.trait_minimap = true;
    target.userData.minimapIcon = params?.icon || 'dot';
    target.userData.minimapColor = params?.color || '#00ff00';
  }
}

// ============================================================================
// PERFORMANCE TRAITS
// ============================================================================

export class LODTrait implements Trait {
  name = '@lod';
  category = TraitCategory.SPATIAL;
  description = 'Level of detail optimization';

  apply(target: Object3D, params?: { distances?: number[]; levels?: number }) {
    target.userData.trait_lod = true;
    target.userData.lodDistances = params?.distances || [10, 20, 50];
    target.userData.lodLevels = params?.levels || 3;
  }
}

export class OcclusionTrait implements Trait {
  name = '@occlusion';
  category = TraitCategory.SPATIAL;
  description = 'Occlusion culling optimization';

  apply(target: Object3D) {
    target.userData.trait_occlusion = true;
    target.userData.frustumCulled = true;
  }
}

export class PooledTrait implements Trait {
  name = '@pooled';
  category = TraitCategory.SPATIAL;
  description = 'Object pooling for performance';

  apply(target: Object3D, params?: { poolSize?: number }) {
    target.userData.trait_pooled = true;
    target.userData.poolSize = params?.poolSize || 10;
  }
}

// ============================================================================
// WEATHER & ENVIRONMENT EFFECTS
// ============================================================================

export class WeatherTrait implements Trait {
  name = '@weather';
  category = TraitCategory.ENVIRONMENT;
  description = 'Weather effects zone';

  apply(target: Object3D, params?: { type?: 'rain' | 'snow' | 'fog' | 'wind'; intensity?: number }) {
    target.userData.trait_weather = true;
    target.userData.weatherType = params?.type || 'rain';
    target.userData.weatherIntensity = params?.intensity || 0.5;
  }
}

export class FogTrait implements Trait {
  name = '@fog';
  category = TraitCategory.ENVIRONMENT;
  description = 'Fog effect';

  apply(target: Object3D, params?: { density?: number; color?: string }) {
    target.userData.trait_fog = true;
    target.userData.fogDensity = params?.density || 0.1;
    target.userData.fogColor = params?.color || '#ffffff';
  }
}

export class WindTrait implements Trait {
  name = '@wind';
  category = TraitCategory.ENVIRONMENT;
  description = 'Wind effect on object';

  apply(target: Object3D, params?: { strength?: number; direction?: [number, number, number] }) {
    target.userData.trait_wind = true;
    target.userData.windStrength = params?.strength || 1;
    target.userData.windDirection = params?.direction || [1, 0, 0];
  }

  update(target: Object3D, deltaTime: number) {
    const strength = target.userData.windStrength || 1;
    const elapsed = (target.userData.elapsedTime || 0) + deltaTime;
    target.userData.elapsedTime = elapsed;
    const windWave = Math.sin(elapsed * 2) * strength * 0.05;
    target.rotation.z = windWave;
  }
}

export class ReflectionTrait implements Trait {
  name = '@reflection';
  category = TraitCategory.VISUAL_EFFECTS;
  description = 'Reflective surface';

  apply(target: Object3D, params?: { quality?: 'low' | 'medium' | 'high'; metalness?: number }) {
    target.userData.trait_reflection = true;
    target.userData.reflectionQuality = params?.quality || 'medium';
    target.userData.reflectionMetalness = params?.metalness || 0.8;
  }
}

// ============================================================================
// SOCIAL TRAITS
// ============================================================================

export class ShareableTrait implements Trait {
  name = '@shareable';
  category = TraitCategory.NETWORKING;
  description = 'Object can be shared with other players';

  apply(target: Object3D) {
    target.userData.trait_shareable = true;
    target.userData.isShareable = true;
  }
}

export class OwnershipTrait implements Trait {
  name = '@ownership';
  category = TraitCategory.NETWORKING;
  description = 'Object has ownership system';

  apply(target: Object3D, params?: { transferable?: boolean }) {
    target.userData.trait_ownership = true;
    target.userData.ownershipTransferable = params?.transferable !== false;
    target.userData.ownerId = null;
  }
}

export class FollowTrait implements Trait {
  name = '@follow';
  category = TraitCategory.AI;
  description = 'Follows a target';

  apply(target: Object3D, params?: { target?: string; distance?: number; speed?: number }) {
    target.userData.trait_follow = true;
    target.userData.followTarget = params?.target;
    target.userData.followDistance = params?.distance || 2;
    target.userData.followSpeed = params?.speed || 2;
  }
}

export class VoiceChatTrait implements Trait {
  name = '@voiceChat';
  category = TraitCategory.NETWORKING;
  description = 'Spatial voice chat zone';

  apply(target: Object3D, params?: { range?: number; falloff?: number }) {
    target.userData.trait_voiceChat = true;
    target.userData.voiceChatRange = params?.range || 10;
    target.userData.voiceChatFalloff = params?.falloff || 0.5;
  }
}

// ============================================================================
// TRAIT REGISTRY
// ============================================================================

export class TraitRegistry {
  private static instance: TraitRegistry;
  private traits: Map<string, Trait> = new Map();
  private activeTraits: Map<Object3D, Set<Trait>> = new Map();

  private constructor() {
    this.registerDefaultTraits();
  }

  static getInstance(): TraitRegistry {
    if (!TraitRegistry.instance) {
      TraitRegistry.instance = new TraitRegistry();
    }
    return TraitRegistry.instance;
  }

  private registerDefaultTraits() {
    // Spatial
    this.register(new SpatialTrait());
    this.register(new TransformableTrait());
    this.register(new AnchoredTrait());

    // Physics
    this.register(new PhysicsTrait());
    this.register(new RigidbodyTrait());
    this.register(new KinematicTrait());
    this.register(new TriggerTrait());
    this.register(new CollisionTrait());

    // Animation
    this.register(new AnimateTrait());
    this.register(new RotateTrait());
    this.register(new FloatTrait());
    this.register(new PulseTrait());
    this.register(new LerpTrait());
    this.register(new TweenTrait());
    this.register(new SpringTrait());

    // Audio
    this.register(new AudioTrait());
    this.register(new AudioSourceTrait());
    this.register(new SpatialAudioTrait());
    this.register(new AudioZoneTrait());

    // VR Interaction
    this.register(new GrabbableTrait());
    this.register(new InteractiveTrait());
    this.register(new TeleportableTrait());
    this.register(new ScalableTrait());
    this.register(new RotatableTrait());
    this.register(new CloneableTrait());
    this.register(new SittableTrait());
    this.register(new LookAtPlayerTrait());

    // Networking
    this.register(new NetworkedTrait());
    this.register(new SyncedTrait());

    // Visual Effects
    this.register(new EmissiveTrait());
    this.register(new ParticleTrait());
    this.register(new ShaderTrait());
    this.register(new GlowTrait());
    this.register(new OutlineTrait());

    // Gameplay
    this.register(new HealthTrait());
    this.register(new DamageableTrait());
    this.register(new CollectibleTrait());
    this.register(new SpawnerTrait());
    this.register(new DialogueTrait());

    // AI
    this.register(new AITrait());
    this.register(new PatrolTrait());
    this.register(new SeekTrait());
    this.register(new FleeTrait());

    // Environment
    this.register(new PortalTrait());
    this.register(new LightTrait());
    this.register(new ShadowCasterTrait());
    this.register(new ShadowReceiverTrait());
  }

  register(trait: Trait) {
    this.traits.set(trait.name, trait);
  }

  getTrait(name: string): Trait | undefined {
    return this.traits.get(name);
  }

  getAllTraits(): Trait[] {
    return Array.from(this.traits.values());
  }

  getTraitsByCategory(category: TraitCategory): Trait[] {
    return this.getAllTraits().filter(t => t.category === category);
  }

  apply(target: Object3D, traitName: string, params?: Record<string, any>): boolean {
    const trait = this.traits.get(traitName);
    if (!trait) {
      console.warn(`Trait ${traitName} not found`);
      return false;
    }

    // Check dependencies
    if (trait.dependencies) {
      for (const dep of trait.dependencies) {
        if (!target.userData[`trait_${dep.replace('@', '')}`]) {
          console.warn(`Trait ${traitName} requires dependency ${dep}`);
          return false;
        }
      }
    }

    // Check conflicts
    if (trait.conflicts) {
      for (const conflict of trait.conflicts) {
        if (target.userData[`trait_${conflict.replace('@', '')}`]) {
          console.warn(`Trait ${traitName} conflicts with ${conflict}`);
          return false;
        }
      }
    }

    // Apply trait
    trait.apply(target, params);

    // Track active trait
    if (!this.activeTraits.has(target)) {
      this.activeTraits.set(target, new Set());
    }
    this.activeTraits.get(target)!.add(trait);

    return true;
  }

  update(deltaTime: number) {
    for (const [target, traits] of this.activeTraits) {
      for (const trait of traits) {
        if (trait.update) {
          trait.update(target, deltaTime);
        }
      }
    }
  }

  remove(target: Object3D, traitName: string) {
    const trait = this.traits.get(traitName);
    if (!trait) return;

    if (trait.remove) {
      trait.remove(target);
    }

    const activeSet = this.activeTraits.get(target);
    if (activeSet) {
      activeSet.delete(trait);
    }
  }

  removeAll(target: Object3D) {
    const activeSet = this.activeTraits.get(target);
    if (activeSet) {
      for (const trait of activeSet) {
        if (trait.remove) {
          trait.remove(target);
        }
      }
      this.activeTraits.delete(target);
    }
  }
}

// Export singleton instance
export const traitRegistry = TraitRegistry.getInstance();

// Export all trait classes for documentation and testing
export const ALL_TRAITS = [
  // Spatial (6 total)
  SpatialTrait,
  TransformableTrait,
  AnchoredTrait,
  LODTrait,
  OcclusionTrait,
  PooledTrait,
  // Physics (5)
  PhysicsTrait,
  RigidbodyTrait,
  KinematicTrait,
  TriggerTrait,
  CollisionTrait,
  // Animation (12)
  AnimateTrait,
  RotateTrait,
  FloatTrait,
  PulseTrait,
  LerpTrait,
  TweenTrait,
  SpringTrait,
  BobTrait,
  SwayTrait,
  BounceTrait,
  OrbitTrait,
  WobbleTrait,
  // Audio (4)
  AudioTrait,
  AudioSourceTrait,
  SpatialAudioTrait,
  AudioZoneTrait,
  // VR Interaction (16)
  GrabbableTrait,
  InteractiveTrait,
  TeleportableTrait,
  ScalableTrait,
  RotatableTrait,
  CloneableTrait,
  SittableTrait,
  LookAtPlayerTrait,
  PushableTrait,
  ThrowableTrait,
  SnapTrait,
  LabelTrait,
  TooltipTrait,
  HealthBarTrait,
  ProgressBarTrait,
  MinimapTrait,
  // Networking (5)
  NetworkedTrait,
  SyncedTrait,
  ShareableTrait,
  OwnershipTrait,
  VoiceChatTrait,
  // Visual Effects (6)
  EmissiveTrait,
  ParticleTrait,
  ShaderTrait,
  GlowTrait,
  OutlineTrait,
  ReflectionTrait,
  // Gameplay (9)
  HealthTrait,
  DamageableTrait,
  CollectibleTrait,
  SpawnerTrait,
  DialogueTrait,
  InventoryTrait,
  CraftingTrait,
  QuestGiverTrait,
  ShopTrait,
  // AI (5)
  AITrait,
  PatrolTrait,
  SeekTrait,
  FleeTrait,
  FollowTrait,
  // Environment (8)
  PortalTrait,
  LightTrait,
  ShadowCasterTrait,
  ShadowReceiverTrait,
  WeatherTrait,
  FogTrait,
  WindTrait,
];

console.log(`✅ TraitRegistry initialized with ${traitRegistry.getAllTraits().length} traits`);
