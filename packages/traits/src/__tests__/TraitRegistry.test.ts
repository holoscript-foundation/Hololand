import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TraitRegistry,
  TraitCategory,
  SpatialTrait,
  PhysicsTrait,
  RigidbodyTrait,
  RotateTrait,
  FloatTrait,
  PulseTrait,
  GrabbableTrait,
  InteractiveTrait,
  HealthTrait,
  DamageableTrait,
  CollectibleTrait,
  SpawnerTrait,
  NetworkedTrait,
  SyncedTrait,
  EmissiveTrait,
  GlowTrait,
  AITrait,
  PatrolTrait,
  PortalTrait,
  LightTrait,
  ShadowCasterTrait,
  AudioTrait,
  AudioSourceTrait,
  SpatialAudioTrait,
  AudioZoneTrait,
  TriggerTrait,
  ScalableTrait,
  CloneableTrait,
  SittableTrait,
  BobTrait,
  BounceTrait,
  OrbitTrait,
  WindTrait,
  WeatherTrait,
  ALL_TRAITS,
} from '../TraitRegistry';

// Minimal Object3D mock
function createMockObject3D(): any {
  return {
    userData: {},
    position: { x: 0, y: 0, z: 0, lerp: vi.fn(), clone: () => ({ x: 0, y: 0, z: 0 }) },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1, set: vi.fn() },
    matrixAutoUpdate: false,
    castShadow: false,
    receiveShadow: false,
  };
}

describe('TraitRegistry', () => {
  let registry: TraitRegistry;

  beforeEach(() => {
    // Reset singleton for clean tests
    (TraitRegistry as any).instance = undefined;
    registry = TraitRegistry.getInstance();
  });

  describe('singleton', () => {
    it('returns same instance', () => {
      const a = TraitRegistry.getInstance();
      const b = TraitRegistry.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('registration', () => {
    it('has default traits registered', () => {
      const all = registry.getAllTraits();
      expect(all.length).toBeGreaterThan(30);
    });

    it('can retrieve trait by name', () => {
      expect(registry.getTrait('@spatial')).toBeDefined();
      expect(registry.getTrait('@physics')).toBeDefined();
      expect(registry.getTrait('@grabbable')).toBeDefined();
    });

    it('returns undefined for unknown trait', () => {
      expect(registry.getTrait('@nonexistent')).toBeUndefined();
    });

    it('can register custom trait', () => {
      const custom = { name: '@custom', category: TraitCategory.GAMEPLAY, description: 'test', apply: vi.fn() };
      registry.register(custom);
      expect(registry.getTrait('@custom')).toBe(custom);
    });
  });

  describe('getTraitsByCategory', () => {
    it('filters spatial traits', () => {
      const spatial = registry.getTraitsByCategory(TraitCategory.SPATIAL);
      expect(spatial.length).toBeGreaterThan(0);
      spatial.forEach(t => expect(t.category).toBe(TraitCategory.SPATIAL));
    });

    it('filters physics traits', () => {
      const physics = registry.getTraitsByCategory(TraitCategory.PHYSICS);
      expect(physics.length).toBeGreaterThanOrEqual(4);
    });

    it('filters animation traits', () => {
      const anim = registry.getTraitsByCategory(TraitCategory.ANIMATION);
      expect(anim.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('apply', () => {
    it('applies a simple trait', () => {
      const obj = createMockObject3D();
      const result = registry.apply(obj, '@spatial');
      expect(result).toBe(true);
      expect(obj.userData.trait_spatial).toBe(true);
    });

    it('returns false for unknown trait', () => {
      const obj = createMockObject3D();
      expect(registry.apply(obj, '@nonexistent')).toBe(false);
    });

    it('checks dependencies before applying', () => {
      const obj = createMockObject3D();
      // @rigidbody requires @physics
      const result = registry.apply(obj, '@rigidbody');
      expect(result).toBe(false);
    });

    it('succeeds when dependencies are met', () => {
      const obj = createMockObject3D();
      registry.apply(obj, '@physics');
      const result = registry.apply(obj, '@rigidbody');
      expect(result).toBe(true);
      expect(obj.userData.trait_rigidbody).toBe(true);
    });

    it('passes params to trait', () => {
      const obj = createMockObject3D();
      registry.apply(obj, '@physics');
      registry.apply(obj, '@rigidbody', { mass: 5, restitution: 0.8 });
      expect(obj.userData.mass).toBe(5);
      expect(obj.userData.restitution).toBe(0.8);
    });
  });

  describe('update', () => {
    it('calls update on active traits', () => {
      const obj = createMockObject3D();
      registry.apply(obj, '@rotate', { speed: 2, axis: 'y' });
      const prevRotation = obj.rotation.y;
      registry.update(0.016);
      expect(obj.rotation.y).not.toBe(prevRotation);
    });
  });

  describe('remove', () => {
    it('removes a trait from active set', () => {
      const obj = createMockObject3D();
      registry.apply(obj, '@spatial');
      registry.remove(obj, '@spatial');
      // After removing, update should not process it
      registry.update(0.016); // should not throw
    });
  });

  describe('removeAll', () => {
    it('removes all traits from object', () => {
      const obj = createMockObject3D();
      registry.apply(obj, '@spatial');
      registry.apply(obj, '@grabbable');
      registry.removeAll(obj);
      registry.update(0.016); // should not throw
    });
  });
});

describe('Individual Traits', () => {
  describe('@spatial', () => {
    it('sets matrixAutoUpdate', () => {
      const obj = createMockObject3D();
      new SpatialTrait().apply(obj);
      expect(obj.matrixAutoUpdate).toBe(true);
      expect(obj.userData.trait_spatial).toBe(true);
    });
  });

  describe('@rigidbody', () => {
    it('sets physics properties with defaults', () => {
      const obj = createMockObject3D();
      new RigidbodyTrait().apply(obj);
      expect(obj.userData.mass).toBe(1);
      expect(obj.userData.restitution).toBe(0.3);
      expect(obj.userData.friction).toBe(0.5);
      expect(obj.userData.velocity).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('applies gravity in update', () => {
      const obj = createMockObject3D();
      new RigidbodyTrait().apply(obj);
      new RigidbodyTrait().update!(obj, 1);
      expect(obj.userData.velocity.y).toBeCloseTo(-9.81);
    });
  });

  describe('@rotate', () => {
    it('rotates on specified axis', () => {
      const obj = createMockObject3D();
      new RotateTrait().apply(obj, { speed: 1, axis: 'x' });
      new RotateTrait().update!(obj, 1);
      expect(obj.rotation.x).toBeCloseTo(1);
    });
  });

  describe('@float', () => {
    it('oscillates Y position', () => {
      const obj = createMockObject3D();
      obj.position.y = 5;
      new FloatTrait().apply(obj, { amplitude: 1, frequency: 1 });
      new FloatTrait().update!(obj, Math.PI / 2);
      expect(obj.position.y).toBeCloseTo(6, 0);
    });
  });

  describe('@pulse', () => {
    it('modulates scale', () => {
      const obj = createMockObject3D();
      new PulseTrait().apply(obj);
      new PulseTrait().update!(obj, 0.5);
      expect(obj.scale.set).toHaveBeenCalled();
    });
  });

  describe('@grabbable', () => {
    it('sets grab properties', () => {
      const obj = createMockObject3D();
      new GrabbableTrait().apply(obj, { twoHanded: true });
      expect(obj.userData.isGrabbable).toBe(true);
      expect(obj.userData.twoHandedGrab).toBe(true);
      expect(obj.userData.isGrabbed).toBe(false);
    });
  });

  describe('@health', () => {
    it('sets health with defaults', () => {
      const obj = createMockObject3D();
      new HealthTrait().apply(obj);
      expect(obj.userData.healthMax).toBe(100);
      expect(obj.userData.healthCurrent).toBe(100);
    });

    it('regenerates health over time', () => {
      const obj = createMockObject3D();
      new HealthTrait().apply(obj, { max: 100, current: 50, regen: 10 });
      new HealthTrait().update!(obj, 1);
      expect(obj.userData.healthCurrent).toBe(60);
    });

    it('caps regen at max health', () => {
      const obj = createMockObject3D();
      new HealthTrait().apply(obj, { max: 100, current: 95, regen: 10 });
      new HealthTrait().update!(obj, 1);
      expect(obj.userData.healthCurrent).toBe(100);
    });
  });

  describe('@spawner', () => {
    it('spawns on interval', () => {
      const obj = createMockObject3D();
      new SpawnerTrait().apply(obj, { interval: 1, max: 5 });
      expect(obj.userData.spawnCount).toBe(0);
      new SpawnerTrait().update!(obj, 1.1);
      expect(obj.userData.spawnCount).toBe(1);
    });

    it('respects max spawn count', () => {
      const obj = createMockObject3D();
      new SpawnerTrait().apply(obj, { interval: 1, max: 1 });
      new SpawnerTrait().update!(obj, 1.1);
      expect(obj.userData.spawnCount).toBe(1);
      obj.userData.spawnTimer = 0;
      new SpawnerTrait().update!(obj, 1.1);
      expect(obj.userData.spawnCount).toBe(1); // capped
    });
  });

  describe('@networked', () => {
    it('generates network ID', () => {
      const obj = createMockObject3D();
      new NetworkedTrait().apply(obj);
      expect(obj.userData.networkId).toMatch(/^net_/);
      expect(obj.userData.networkSyncRate).toBe(20);
    });
  });

  describe('@portal', () => {
    it('sets portal properties', () => {
      const obj = createMockObject3D();
      new PortalTrait().apply(obj, { destination: 'lobby', label: 'Go to Lobby' });
      expect(obj.userData.portalDestination).toBe('lobby');
      expect(obj.userData.portalLabel).toBe('Go to Lobby');
      expect(obj.userData.portalEffect).toBe('fade');
    });
  });

  describe('@shadowCaster', () => {
    it('enables castShadow', () => {
      const obj = createMockObject3D();
      new ShadowCasterTrait().apply(obj);
      expect(obj.castShadow).toBe(true);
    });
  });

  describe('@orbit', () => {
    it('moves in circular path', () => {
      const obj = createMockObject3D();
      new OrbitTrait().apply(obj, { radius: 10, speed: 1 });
      new OrbitTrait().update!(obj, Math.PI / 2);
      expect(Math.abs(obj.position.x)).toBeLessThan(11);
      expect(Math.abs(obj.position.z)).toBeLessThan(11);
    });
  });

  describe('@wind', () => {
    it('applies wind sway', () => {
      const obj = createMockObject3D();
      new WindTrait().apply(obj, { strength: 2 });
      new WindTrait().update!(obj, 1);
      expect(obj.rotation.z).not.toBe(0);
    });
  });

  describe('@scalable', () => {
    it('sets scale bounds', () => {
      const obj = createMockObject3D();
      new ScalableTrait().apply(obj, { minScale: 0.5, maxScale: 5 });
      expect(obj.userData.minScale).toBe(0.5);
      expect(obj.userData.maxScale).toBe(5);
    });
  });

  describe('@collectible', () => {
    it('sets collectible properties', () => {
      const obj = createMockObject3D();
      new CollectibleTrait().apply(obj, { value: 10, category: 'gold' });
      expect(obj.userData.collectValue).toBe(10);
      expect(obj.userData.collectCategory).toBe('gold');
    });
  });
});

describe('ALL_TRAITS export', () => {
  it('exports all trait classes', () => {
    expect(ALL_TRAITS.length).toBeGreaterThanOrEqual(50);
  });

  it('each entry is a constructor', () => {
    ALL_TRAITS.forEach(TraitClass => {
      const instance = new TraitClass();
      expect(instance.name).toBeTruthy();
      expect(instance.category).toBeTruthy();
      expect(typeof instance.apply).toBe('function');
    });
  });
});
