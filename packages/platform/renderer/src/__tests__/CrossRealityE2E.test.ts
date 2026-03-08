/**
 * Cross-Reality E2E Integration Tests
 *
 * Full VR → Phone → Desktop → Car pipeline testing.
 * Validates that agent state, ECS components, WebXR sessions,
 * and GDPR compliance all work together across handoffs.
 */
import { describe, it, expect, beforeEach } from 'vitest';

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

import {
  WebXRSessionBridge,
  createWebXRSessionBridge,
} from '../WebXRSessionBridge';

import {
  GDPRComplianceManager,
  createGDPRComplianceManager,
} from '../security/GDPRComplianceManager';

// =============================================================================
// HELPERS
// =============================================================================

function createAgentEntity(world: CrossRealityWorld, id: string, formFactor: string): Entity {
  const e = world.createEntity(id);
  e.addComponent({
    type: 'identity', agentId: id, did: `did:example:${id}`,
    displayName: `Agent ${id}`, roles: ['user'],
  } as IdentityComponent);
  e.addComponent({
    type: 'spatial', position: { x: 0, y: 1.6, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    geospatial: { latitude: 40.7128, longitude: -74.006, altitude: 10 },
    anchorId: null,
  } as SpatialComponent);
  e.addComponent({
    type: 'task', taskId: 'task-1', description: 'Navigate to meeting',
    progress: 0.3, currentStep: 'walking', resumeContext: { waypoint: 3 },
  } as TaskComponent);
  e.addComponent({
    type: 'preferences', interactionMode: 'gesture', language: 'en',
    accessibility: { highContrast: false, reducedMotion: false, screenReader: false, fontScale: 1.0 },
  } as PreferencesComponent);
  e.addComponent({
    type: 'embodiment', currentType: formFactor === 'vr-headset' ? 'humanoid' : 'flat',
    avatarConfig: {}, animationState: 'idle', visibility: true,
  } as EmbodimentComponent);
  e.addComponent({
    type: 'conversation', messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }],
    turnCount: 1,
  } as ConversationComponent);
  e.addComponent({
    type: 'network', deviceId: 'device-1', formFactor,
    connectionState: 'connected', latencyMs: 15, lastHeartbeat: Date.now(),
  } as NetworkComponent);
  return e;
}

// =============================================================================
// E2E: FULL HANDOFF PIPELINE
// =============================================================================

describe('Cross-Reality E2E Integration', () => {
  let world: CrossRealityWorld;
  let xrBridge: WebXRSessionBridge;
  let gdpr: GDPRComplianceManager;

  beforeEach(() => {
    world = createCrossRealityWorld();
    xrBridge = createWebXRSessionBridge();
    gdpr = createGDPRComplianceManager();
  });

  // ===== VR → Phone handoff =====

  it('performs VR → Phone handoff preserving all agent state', async () => {
    // 1. Create agent in VR
    const agent = createAgentEntity(world, 'agent-1', 'vr-headset');
    world.switchPlatform('vr');

    // 2. Serialize world state
    const snapshot = world.serializeWorld();
    expect(snapshot['agent-1']).toBeDefined();

    // 3. Store state in GDPR-compliant store
    gdpr.recordConsent('did:example:agent-1', 'state-persistence', true);
    gdpr.storeData('did:example:agent-1', 'spatial', snapshot['agent-1']['spatial']);
    gdpr.storeData('did:example:agent-1', 'preferences', snapshot['agent-1']['preferences']);

    // 4. Prepare XR handoff out
    const handoffOut = await xrBridge.prepareHandoffOut();
    expect(handoffOut.sessionEndReason).toBe('handoff');

    // 5. Deserialize into new world (phone)
    const phoneWorld = createCrossRealityWorld();
    phoneWorld.deserializeWorld(snapshot);
    phoneWorld.switchPlatform('mobile');

    // 6. Verify agent state persisted
    const restored = phoneWorld.getEntity('agent-1');
    expect(restored).toBeDefined();
    expect(restored!.getComponent<TaskComponent>('task')?.progress).toBe(0.3);
    expect(restored!.getComponent<TaskComponent>('task')?.resumeContext).toEqual({ waypoint: 3 });
    expect(restored!.getComponent<PreferencesComponent>('preferences')?.language).toBe('en');
    expect(restored!.getComponent<SpatialComponent>('spatial')?.geospatial?.latitude).toBe(40.7128);
  });

  // ===== Phone → Desktop handoff =====

  it('performs Phone → Desktop handoff with embodiment switch', () => {
    // 1. Create agent on phone
    const agent = createAgentEntity(world, 'agent-2', 'phone');
    world.switchPlatform('mobile');

    // 2. Serialize
    const snapshot = world.serializeWorld();

    // 3. New world for desktop
    const desktopWorld = createCrossRealityWorld();
    desktopWorld.deserializeWorld(snapshot);
    desktopWorld.switchPlatform('desktop');

    // 4. Update embodiment for desktop
    const restored = desktopWorld.getEntity('agent-2');
    restored!.addComponent({
      type: 'embodiment', currentType: 'full-gui',
      avatarConfig: {}, animationState: 'idle', visibility: true,
    } as EmbodimentComponent);

    // 5. Update network component
    restored!.addComponent({
      type: 'network', deviceId: 'device-2', formFactor: 'desktop',
      connectionState: 'connected', latencyMs: 5, lastHeartbeat: Date.now(),
    } as NetworkComponent);

    expect(restored!.getComponent<EmbodimentComponent>('embodiment')?.currentType).toBe('full-gui');
    expect(restored!.getComponent<NetworkComponent>('network')?.formFactor).toBe('desktop');
    // Task still persists
    expect(restored!.getComponent<TaskComponent>('task')?.currentStep).toBe('walking');
  });

  // ===== Desktop → Car handoff =====

  it('performs Desktop → Car handoff with automotive safety', () => {
    const agent = createAgentEntity(world, 'agent-3', 'desktop');
    world.switchPlatform('desktop');

    const snapshot = world.serializeWorld();

    const carWorld = createCrossRealityWorld();
    carWorld.deserializeWorld(snapshot);
    carWorld.switchPlatform('automotive');

    const restored = carWorld.getEntity('agent-3');

    // Switch to voice-only embodiment for safety
    restored!.addComponent({
      type: 'embodiment', currentType: 'voice-hud',
      avatarConfig: {}, animationState: 'listening', visibility: false,
    } as EmbodimentComponent);

    // Switch interaction mode to voice for driving safety
    restored!.addComponent({
      type: 'preferences', interactionMode: 'voice', language: 'en',
      accessibility: { highContrast: true, reducedMotion: true, screenReader: true, fontScale: 2.0 },
    } as PreferencesComponent);

    expect(restored!.getComponent<EmbodimentComponent>('embodiment')?.currentType).toBe('voice-hud');
    expect(restored!.getComponent<PreferencesComponent>('preferences')?.interactionMode).toBe('voice');
    // Task context still persists through all handoffs
    expect(restored!.getComponent<TaskComponent>('task')?.description).toBe('Navigate to meeting');
  });

  // ===== Full 4-device pipeline =====

  it('full VR → Phone → Desktop → Car pipeline preserves task continuity', () => {
    // VR
    createAgentEntity(world, 'pipeline-agent', 'vr-headset');
    world.switchPlatform('vr');
    let snapshot = world.serializeWorld();

    // Phone
    const phoneWorld = createCrossRealityWorld();
    phoneWorld.deserializeWorld(snapshot);
    phoneWorld.switchPlatform('mobile');
    const phoneAgent = phoneWorld.getEntity('pipeline-agent')!;
    phoneAgent.getComponent<TaskComponent>('task')!.progress = 0.5;
    phoneAgent.getComponent<TaskComponent>('task')!.currentStep = 'halfway';
    snapshot = phoneWorld.serializeWorld();

    // Desktop
    const desktopWorld = createCrossRealityWorld();
    desktopWorld.deserializeWorld(snapshot);
    desktopWorld.switchPlatform('desktop');
    const desktopAgent = desktopWorld.getEntity('pipeline-agent')!;
    desktopAgent.getComponent<TaskComponent>('task')!.progress = 0.8;
    desktopAgent.getComponent<ConversationComponent>('conversation')!.messages.push(
      { role: 'assistant', content: 'Almost there', timestamp: Date.now() }
    );
    snapshot = desktopWorld.serializeWorld();

    // Car
    const carWorld = createCrossRealityWorld();
    carWorld.deserializeWorld(snapshot);
    carWorld.switchPlatform('automotive');
    const carAgent = carWorld.getEntity('pipeline-agent')!;

    // Verify full state chain
    expect(carAgent.getComponent<TaskComponent>('task')?.progress).toBe(0.8);
    expect(carAgent.getComponent<TaskComponent>('task')?.currentStep).toBe('halfway');
    expect(carAgent.getComponent<ConversationComponent>('conversation')?.messages).toHaveLength(2);
    expect(carAgent.getComponent<IdentityComponent>('identity')?.did).toBe('did:example:pipeline-agent');
    expect(carAgent.getComponent<SpatialComponent>('spatial')?.geospatial?.latitude).toBe(40.7128);
  });

  // ===== GDPR during handoff =====

  it('GDPR consent gates data persistence during handoff', async () => {
    createAgentEntity(world, 'gdpr-agent', 'vr-headset');
    const snapshot = world.serializeWorld();

    // Without consent, data should NOT be stored
    expect(gdpr.hasValidConsent('did:example:gdpr-agent', 'state-persistence')).toBe(false);

    // Grant consent, then store
    gdpr.recordConsent('did:example:gdpr-agent', 'state-persistence', true);
    expect(gdpr.hasValidConsent('did:example:gdpr-agent', 'state-persistence')).toBe(true);

    gdpr.storeData('did:example:gdpr-agent', 'identity', snapshot['gdpr-agent']['identity']);
    gdpr.storeData('did:example:gdpr-agent', 'spatial', snapshot['gdpr-agent']['spatial']);

    // Export for portability
    const exported = await gdpr.exportData('did:example:gdpr-agent');
    expect(exported.categories).toContain('identity');
    expect(exported.categories).toContain('spatial');
    expect(exported.categories).toContain('consents');
  });

  it('GDPR erasure removes all agent data after handoff', async () => {
    createAgentEntity(world, 'erase-agent', 'vr-headset');
    const snapshot = world.serializeWorld();

    gdpr.recordConsent('did:example:erase-agent', 'state-persistence', true);
    gdpr.storeData('did:example:erase-agent', 'identity', snapshot['erase-agent']['identity']);
    gdpr.storeData('did:example:erase-agent', 'spatial', snapshot['erase-agent']['spatial']);

    // Right to erasure
    const result = await gdpr.requestErasure('did:example:erase-agent');
    expect(result.erasedCategories.length).toBeGreaterThanOrEqual(2);

    // Verify data is gone
    const exported = await gdpr.exportData('did:example:erase-agent');
    expect(exported.categories).toHaveLength(0);
    expect(gdpr.hasValidConsent('did:example:erase-agent', 'state-persistence')).toBe(false);
  });

  // ===== WebXR session lifecycle =====

  it('WebXR bridge handles inline handoff when VR unavailable', async () => {
    // In test environment, VR is not available
    await xrBridge.detectCapabilities();
    const caps = xrBridge.getCapabilities();
    expect(caps?.immersiveVR).toBe(false);

    // Fallback to inline
    const result = await xrBridge.prepareHandoffIn('inline');
    expect(result.ready).toBe(true);
    expect(result.mode).toBe('inline');
  });

  it('WebXR bridge rejects VR handoff when not supported', async () => {
    await xrBridge.detectCapabilities();
    const result = await xrBridge.prepareHandoffIn('immersive-vr');
    expect(result.ready).toBe(false);
    expect(result.reason).toContain('not supported');
  });

  // ===== ECS system swapping on platform switch =====

  it('platform switch activates/deactivates correct systems', () => {
    let vrUpdates = 0;
    let desktopUpdates = 0;
    let universalUpdates = 0;

    world.registerSystem({
      name: 'vr-render',
      requiredComponents: ['spatial'],
      platform: 'vr',
      update() { vrUpdates++; },
      dispose() {},
    });

    world.registerSystem({
      name: 'desktop-render',
      requiredComponents: ['spatial'],
      platform: 'desktop',
      update() { desktopUpdates++; },
      dispose() {},
    });

    world.registerSystem({
      name: 'task-manager',
      requiredComponents: ['task'],
      platform: null, // universal
      update() { universalUpdates++; },
      dispose() {},
    });

    const agent = createAgentEntity(world, 'sys-agent', 'vr-headset');

    // Desktop is default platform
    world.update(16);
    expect(desktopUpdates).toBe(1);
    expect(vrUpdates).toBe(0);
    expect(universalUpdates).toBe(1);

    // Switch to VR
    world.switchPlatform('vr');
    world.update(16);
    expect(vrUpdates).toBe(1);
    expect(desktopUpdates).toBe(1); // no new update
    expect(universalUpdates).toBe(2); // still runs
  });

  // ===== World serialization roundtrip =====

  it('world serialization survives full roundtrip with all 7 components', () => {
    const agent = createAgentEntity(world, 'roundtrip-agent', 'vr-headset');
    const snapshot = world.serializeWorld();
    const json = JSON.stringify(snapshot);
    const parsed = JSON.parse(json);

    const newWorld = createCrossRealityWorld();
    newWorld.deserializeWorld(parsed);

    const restored = newWorld.getEntity('roundtrip-agent')!;
    expect(restored.getAllComponents()).toHaveLength(7);
    expect(restored.getComponent<IdentityComponent>('identity')?.agentId).toBe('roundtrip-agent');
    expect(restored.getComponent<SpatialComponent>('spatial')?.position.y).toBe(1.6);
    expect(restored.getComponent<TaskComponent>('task')?.resumeContext).toEqual({ waypoint: 3 });
    expect(restored.getComponent<ConversationComponent>('conversation')?.turnCount).toBe(1);
    expect(restored.getComponent<NetworkComponent>('network')?.connectionState).toBe('connected');
  });

  // ===== Metrics integration =====

  it('all systems report consistent metrics', () => {
    createAgentEntity(world, 'metrics-agent', 'vr-headset');
    gdpr.recordConsent('did:example:metrics-agent', 'analytics', true);
    gdpr.storeData('did:example:metrics-agent', 'identity', { name: 'Test' });

    const worldMetrics = world.getMetrics();
    const xrMetrics = xrBridge.getMetrics();
    const gdprMetrics = gdpr.getMetrics();

    expect(worldMetrics.entities).toBe(1);
    expect(xrMetrics.isPresenting).toBe(false);
    expect(gdprMetrics.totalSubjects).toBe(1);
    expect(gdprMetrics.totalConsents).toBe(1);
  });

  // ===== Processing log tracks handoff =====

  it('GDPR processing log tracks all operations during handoff', () => {
    const did = 'did:example:log-agent';
    gdpr.recordConsent(did, 'state-persistence', true);
    gdpr.storeData(did, 'identity', { name: 'Test' });
    gdpr.storeData(did, 'spatial', { pos: [0, 0, 0] });
    gdpr.recordTransfer(did, 'identity', 'device-2');

    const log = gdpr.getProcessingLog({ did });
    expect(log.length).toBeGreaterThanOrEqual(4); // consent collect + 2 stores + 1 transfer

    const transfers = gdpr.getProcessingLog({ operation: 'transfer' });
    expect(transfers).toHaveLength(1);
    expect(transfers[0].purpose).toContain('device-2');
  });

  // ===== Multi-agent world =====

  it('supports multiple concurrent agents across platforms', () => {
    createAgentEntity(world, 'vr-user', 'vr-headset');
    createAgentEntity(world, 'phone-user', 'phone');
    createAgentEntity(world, 'desktop-user', 'desktop');

    expect(world.getMetrics().entities).toBe(3);

    const snapshot = world.serializeWorld();
    expect(Object.keys(snapshot)).toHaveLength(3);

    // Each agent maintains independent state
    const vr = world.getEntity('vr-user')!;
    const phone = world.getEntity('phone-user')!;
    expect(vr.getComponent<NetworkComponent>('network')?.formFactor).toBe('vr-headset');
    expect(phone.getComponent<NetworkComponent>('network')?.formFactor).toBe('phone');
  });

  // ===== Retention enforcement =====

  it('retention enforcement works on stored agent data', () => {
    gdpr.storeData('did:example:ret-agent', 'spatial', { pos: [0, 0, 0] });
    gdpr.storeData('did:example:ret-agent', 'identity', { name: 'Test' });

    const result = gdpr.enforceRetention();
    // Fresh data should not be expired
    expect(result.expired).toBe(0);
    expect(result.retained).toBe(2);
  });
});
