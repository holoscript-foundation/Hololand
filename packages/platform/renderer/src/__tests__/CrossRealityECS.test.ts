import { describe, it, expect } from 'vitest';
import {
  Entity,
  CrossRealityWorld,
  createCrossRealityWorld,
  type IdentityComponent,
  type SpatialComponent,
  type TaskComponent,
  type PreferencesComponent,
  type EmbodimentComponent,
  type ConversationComponent,
  type NetworkComponent,
  type ECSSystem,
} from '../CrossRealityECS';

// ===== ENTITY =====

describe('Entity', () => {
  it('adds and retrieves a component', () => {
    const e = new Entity('agent-1');
    const identity: IdentityComponent = { type: 'identity', agentId: 'a1', did: 'did:example:1', displayName: 'Agent 1', roles: ['user'] };
    e.addComponent(identity);
    expect(e.getComponent<IdentityComponent>('identity')).toEqual(identity);
    expect(e.hasComponent('identity')).toBe(true);
  });

  it('removes a component', () => {
    const e = new Entity('agent-2');
    e.addComponent({ type: 'spatial', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, geospatial: null, anchorId: null } as SpatialComponent);
    expect(e.removeComponent('spatial')).toBe(true);
    expect(e.hasComponent('spatial')).toBe(false);
  });

  it('returns undefined for missing component', () => {
    const e = new Entity('agent-3');
    expect(e.getComponent<TaskComponent>('task')).toBeUndefined();
  });

  it('getAllComponents returns all added components', () => {
    const e = new Entity('agent-4');
    e.addComponent({ type: 'identity', agentId: 'a4', did: 'did:example:4', displayName: 'Agent 4', roles: [] } as IdentityComponent);
    e.addComponent({ type: 'spatial', position: { x: 1, y: 2, z: 3 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, geospatial: null, anchorId: null } as SpatialComponent);
    expect(e.getAllComponents()).toHaveLength(2);
  });

  it('serializes and deserializes', () => {
    const e = new Entity('agent-5');
    const prefs: PreferencesComponent = { type: 'preferences', interactionMode: 'voice', language: 'en', accessibility: { highContrast: false, reducedMotion: false, screenReader: false, fontScale: 1.0 } };
    e.addComponent(prefs);
    const data = e.serialize();
    expect(data['preferences']).toBeDefined();

    const e2 = new Entity('agent-5-clone');
    e2.deserialize(data);
    expect(e2.getComponent<PreferencesComponent>('preferences')?.interactionMode).toBe('voice');
  });

  it('later addComponent overwrites same type', () => {
    const e = new Entity('agent-6');
    e.addComponent({ type: 'embodiment', currentType: 'humanoid', avatarConfig: {}, animationState: 'idle', visibility: true } as EmbodimentComponent);
    e.addComponent({ type: 'embodiment', currentType: 'orb', avatarConfig: {}, animationState: 'float', visibility: true } as EmbodimentComponent);
    expect(e.getComponent<EmbodimentComponent>('embodiment')?.currentType).toBe('orb');
  });
});

// ===== WORLD =====

describe('CrossRealityWorld', () => {
  it('creates and retrieves entities', () => {
    const world = createCrossRealityWorld();
    const e = world.createEntity('e1');
    expect(world.getEntity('e1')).toBe(e);
  });

  it('removes entities', () => {
    const world = createCrossRealityWorld();
    world.createEntity('e1');
    expect(world.removeEntity('e1')).toBe(true);
    expect(world.getEntity('e1')).toBeUndefined();
  });

  it('getAllEntities returns all created entities', () => {
    const world = createCrossRealityWorld();
    world.createEntity('e1');
    world.createEntity('e2');
    world.createEntity('e3');
    expect(world.getAllEntities()).toHaveLength(3);
  });

  it('registers and runs universal system', () => {
    const world = createCrossRealityWorld();
    const e = world.createEntity('e1');
    e.addComponent({ type: 'spatial', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, geospatial: null, anchorId: null } as SpatialComponent);

    let updated = false;
    const system: ECSSystem = {
      name: 'movement',
      requiredComponents: ['spatial'],
      platform: null, // universal
      update(entities, dt) { updated = true; },
      dispose() {},
    };
    world.registerSystem(system);
    world.update(16);
    expect(updated).toBe(true);
  });

  it('skips system when entity lacks required components', () => {
    const world = createCrossRealityWorld();
    world.createEntity('e1'); // no components

    let called = false;
    const system: ECSSystem = {
      name: 'spatial-only',
      requiredComponents: ['spatial'],
      platform: null,
      update() { called = true; },
      dispose() {},
    };
    world.registerSystem(system);
    world.update(16);
    expect(called).toBe(false);
  });

  it('only runs platform-specific system on matching platform', () => {
    const world = createCrossRealityWorld();
    const e = world.createEntity('e1');
    e.addComponent({ type: 'spatial', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, geospatial: null, anchorId: null } as SpatialComponent);

    let vrRan = false;
    let mobileRan = false;
    world.registerSystem({ name: 'vr-render', requiredComponents: ['spatial'], platform: 'vr', update() { vrRan = true; }, dispose() {} });
    world.registerSystem({ name: 'mobile-render', requiredComponents: ['spatial'], platform: 'mobile', update() { mobileRan = true; }, dispose() {} });

    // default platform is 'desktop', neither should run
    world.update(16);
    expect(vrRan).toBe(false);
    expect(mobileRan).toBe(false);
  });

  it('switchPlatform activates and deactivates systems', () => {
    const world = createCrossRealityWorld();
    world.registerSystem({ name: 'vr-sys', requiredComponents: [], platform: 'vr', update() {}, dispose() {} });
    world.registerSystem({ name: 'desktop-sys', requiredComponents: [], platform: 'desktop', update() {}, dispose() {} });

    const result = world.switchPlatform('vr');
    expect(result.activated).toContain('vr-sys');
    expect(result.deactivated).toContain('desktop-sys');
  });

  it('unregisters system and calls dispose', () => {
    const world = createCrossRealityWorld();
    let disposed = false;
    world.registerSystem({ name: 'temp-sys', requiredComponents: [], platform: null, update() {}, dispose() { disposed = true; } });
    world.unregisterSystem('temp-sys');
    expect(disposed).toBe(true);
  });

  it('serializes and deserializes full world', () => {
    const world = createCrossRealityWorld();
    const e = world.createEntity('agent-1');
    e.addComponent({ type: 'identity', agentId: 'a1', did: 'did:example:1', displayName: 'Agent 1', roles: ['user'] } as IdentityComponent);
    e.addComponent({ type: 'task', taskId: 't1', description: 'Test task', progress: 0.5, currentStep: 'step2', resumeContext: {} } as TaskComponent);

    const snapshot = world.serializeWorld();

    const world2 = createCrossRealityWorld();
    world2.deserializeWorld(snapshot);
    const restored = world2.getEntity('agent-1');
    expect(restored).toBeDefined();
    expect(restored!.getComponent<IdentityComponent>('identity')?.did).toBe('did:example:1');
    expect(restored!.getComponent<TaskComponent>('task')?.progress).toBe(0.5);
  });

  it('getMetrics returns correct counts', () => {
    const world = createCrossRealityWorld();
    world.createEntity('e1');
    world.createEntity('e2');
    world.registerSystem({ name: 's1', requiredComponents: [], platform: null, update() {}, dispose() {} });
    world.registerSystem({ name: 's2', requiredComponents: [], platform: 'vr', update() {}, dispose() {} });

    const m = world.getMetrics();
    expect(m.entities).toBe(2);
    expect(m.systems).toBe(2);
    expect(m.activePlatform).toBe('desktop');
    expect(m.activeSystems).toBe(1); // only universal s1
  });

  it('getActivePlatform returns current platform', () => {
    const world = createCrossRealityWorld();
    expect(world.getActivePlatform()).toBe('desktop');
    world.switchPlatform('vr');
    expect(world.getActivePlatform()).toBe('vr');
  });

  // ===== ALL 7 COMPONENT TYPES =====

  it('supports all 7 component types on a single entity', () => {
    const e = new Entity('full-agent');
    e.addComponent({ type: 'identity', agentId: 'a1', did: 'did:example:1', displayName: 'Full', roles: ['admin'] } as IdentityComponent);
    e.addComponent({ type: 'spatial', position: { x: 1, y: 2, z: 3 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, geospatial: { latitude: 40.7, longitude: -74.0, altitude: 10 }, anchorId: 'anchor-1' } as SpatialComponent);
    e.addComponent({ type: 'task', taskId: 't1', description: 'Demo', progress: 1, currentStep: 'done', resumeContext: { key: 'val' } } as TaskComponent);
    e.addComponent({ type: 'preferences', interactionMode: 'gesture', language: 'es', accessibility: { highContrast: true, reducedMotion: true, screenReader: false, fontScale: 1.5 } } as PreferencesComponent);
    e.addComponent({ type: 'embodiment', currentType: 'humanoid', avatarConfig: { skin: 'blue' }, animationState: 'wave', visibility: true } as EmbodimentComponent);
    e.addComponent({ type: 'conversation', messages: [{ role: 'user', content: 'hello', timestamp: 1000 }], turnCount: 1 } as ConversationComponent);
    e.addComponent({ type: 'network', deviceId: 'd1', formFactor: 'vr-headset', connectionState: 'connected', latencyMs: 12, lastHeartbeat: Date.now() } as NetworkComponent);

    expect(e.getAllComponents()).toHaveLength(7);
    expect(e.getComponent<NetworkComponent>('network')?.formFactor).toBe('vr-headset');
    expect(e.getComponent<ConversationComponent>('conversation')?.turnCount).toBe(1);
  });
});
