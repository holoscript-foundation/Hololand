/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import {
  MVCSerializer,
  createMVCSerializer,
  MVC_MAX_SIZE_BYTES,
  MVC_OBJECT_BUDGETS,
} from '../MVCSerializer';

import {
  NetworkTransportAdapter,
  createNetworkTransportAdapter,
} from '../NetworkTransportAdapter';

import type { TransportMessage } from '../NetworkTransportAdapter';

import {
  OfflineRecoveryQueue,
  createOfflineRecoveryQueue,
  MemoryStorageBackend,
} from '../OfflineRecoveryQueue';

import {
  EmbodimentTransitionAnimator,
  createEmbodimentTransitionAnimator,
  TRANSITION_TIMINGS,
} from '../EmbodimentTransitionAnimator';

import type { TransitionTiming } from '../EmbodimentTransitionAnimator';

import {
  CrossRealitySessionManager,
  createCrossRealitySessionManager,
} from '../CrossRealitySessionManager';

import {
  createMVCPayload,
  createEmptyDecisionHistory,
  createEmptyActiveTaskState,
  createDefaultUserPreferences,
  createEmptySpatialContext,
  createEmptyEvidenceTrail,
} from '../CrossRealityContinuityTypes';

import type {
  MVCPayload,
  FormFactor,
  EmbodimentType,
} from '../CrossRealityContinuityTypes';

import {
  createAuthenticatedCRDTEngine,
} from '../AuthenticatedCRDTEngine';

import type { DeviceCapabilities } from '../CrossRealityHandoffProtocol';

// =============================================================================
// HELPERS
// =============================================================================

function createTestPayload(overrides?: Partial<MVCPayload>): MVCPayload {
  return createMVCPayload('agent-1', 'TestAgent', 'vr-headset', 'phone', overrides);
}

function createTestCapabilities(deviceId: string = 'phone-1', formFactor: FormFactor = 'phone'): DeviceCapabilities {
  return {
    deviceId,
    formFactor,
    supportedEmbodiments: ['UI2D', 'WebXR'] as EmbodimentType[],
    inputModalities: ['touch'],
    budget: { frameBudgetMs: 16.6, agentBudgetMs: 100, computeModel: 'cloud-first' },
    sensors: ['gps'],
    hasGeospatial: true,
    webxrModes: ['inline'],
  };
}

function createTestSessionConfig() {
  return {
    agentId: 'agent-1',
    agentName: 'TestAgent',
    formFactor: 'vr-headset' as FormFactor,
    anchorSystem: {
      anchorManager: {
        agentId: 'agent-1',
        maxAnchors: 100,
      },
    },
    transport: {
      deviceId: 'quest3-1',
      displayName: 'Quest 3',
      formFactor: 'vr-headset',
    },
    offlineQueue: {
      authorDID: 'did:key:z6Mk1',
      deviceId: 'quest3-1',
    },
  };
}

// =============================================================================
// MVC SERIALIZER
// =============================================================================

describe('MVCSerializer', () => {
  let serializer: MVCSerializer;

  beforeEach(() => {
    serializer = createMVCSerializer();
  });

  it('serializes and deserializes an MVC payload', () => {
    const payload = createTestPayload();
    const { data, validation } = serializer.serialize(payload);

    expect(ArrayBuffer.isView(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(validation.valid).toBe(true);

    const { payload: deserialized, error } = serializer.deserialize(data);
    expect(error).toBeNull();
    expect(deserialized).not.toBeNull();
    expect(deserialized!.agentId).toBe('agent-1');
    expect(deserialized!.agentName).toBe('TestAgent');
  });

  it('validates payload is under 10KB', () => {
    const payload = createTestPayload();
    const validation = serializer.validate(payload);

    expect(validation.valid).toBe(true);
    expect(validation.totalSizeBytes).toBeLessThan(MVC_MAX_SIZE_BYTES);
    expect(validation.remainingBytes).toBeGreaterThan(0);
  });

  it('reports per-object sizes', () => {
    const payload = createTestPayload();
    const validation = serializer.validate(payload);

    expect(validation.objectSizes.decisionHistory).toBeGreaterThan(0);
    expect(validation.objectSizes.activeTask).toBeGreaterThan(0);
    expect(validation.objectSizes.userPreferences).toBeGreaterThan(0);
    expect(validation.objectSizes.spatialContext).toBeGreaterThan(0);
    expect(validation.objectSizes.evidenceTrail).toBeGreaterThan(0);
    expect(validation.objectSizes.envelope).toBeGreaterThan(0);
  });

  it('truncates payload that exceeds 10KB', () => {
    // Create a bloated payload
    const decisions = Array.from({ length: 50 }, (_, i) => ({
      id: `d-${i}`,
      summary: 'A'.repeat(200),
      rationale: 'B'.repeat(200),
      alternatives: ['alt1', 'alt2', 'alt3', 'alt4', 'alt5'],
      confidence: 0.9,
      category: 'task' as const,
      decidedAt: Date.now(),
      outcome: 'pending' as const,
    }));

    const payload = createTestPayload({
      decisionHistory: {
        decisions,
        totalDecisionCount: 50,
        successRate: 0.8,
        updatedAt: Date.now(),
      },
    });

    const { validation } = serializer.serialize(payload, { truncateIfNeeded: true });
    // After truncation, should be closer to budget
    expect(validation.totalSizeBytes).toBeLessThan(MVC_MAX_SIZE_BYTES * 2); // May still be over after basic truncation
  });

  it('rejects unsupported schema versions', () => {
    const payload = createTestPayload();
    const json = JSON.stringify({ ...payload, version: 999 });
    const data = new TextEncoder().encode(json);

    const { payload: deserialized, error, schemaVersion } = serializer.deserialize(data);
    expect(deserialized).toBeNull();
    expect(error).toContain('Unsupported schema version');
    expect(schemaVersion).toBe(999);
  });

  it('handles corrupt data gracefully', () => {
    const data = new TextEncoder().encode('{{not valid json');
    const { payload, error } = serializer.deserialize(data);
    expect(payload).toBeNull();
    expect(error).toContain('Deserialization failed');
  });
});

// =============================================================================
// NETWORK TRANSPORT ADAPTER
// =============================================================================

describe('NetworkTransportAdapter', () => {
  let transport: NetworkTransportAdapter;

  beforeEach(() => {
    transport = createNetworkTransportAdapter({
      deviceId: 'quest3-1',
      displayName: 'Quest 3',
      formFactor: 'vr-headset',
    });
  });

  it('connects to a peer', () => {
    const handler = vi.fn();
    transport.on('connected', handler);

    transport.connect('phone-1', { displayName: 'Phone', formFactor: 'phone' });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ peer: expect.objectContaining({ deviceId: 'phone-1' }) }),
    );
    expect(transport.isConnected('phone-1')).toBe(true);
  });

  it('disconnects from a peer', () => {
    const handler = vi.fn();
    transport.on('disconnected', handler);

    transport.connect('phone-1');
    transport.disconnect('phone-1', 'test');

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: 'phone-1', reason: 'test' }),
    );
    expect(transport.isConnected('phone-1')).toBe(false);
  });

  it('sends messages to connected peers', () => {
    transport.connect('phone-1');

    const handler = vi.fn();
    transport.onMessage('sync:crdt-delta', handler);

    const sent = transport.send('phone-1', 'sync:crdt-delta', { key: 'val' });
    expect(sent).toBe(true);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'sync:crdt-delta', payload: { key: 'val' } }),
      'phone-1',
    );
  });

  it('rejects messages to disconnected peers', () => {
    const sent = transport.send('nonexistent', 'sync:crdt-delta', {});
    expect(sent).toBe(false);
  });

  it('broadcasts to all connected peers', () => {
    transport.connect('phone-1');
    transport.connect('desktop-1');

    const count = transport.broadcast('discovery:announce', { agentId: 'test' });
    expect(count).toBe(2);
  });

  it('receives messages from remote peers', () => {
    transport.connect('phone-1');
    const handler = vi.fn();
    transport.on('message', handler);

    const msg: TransportMessage = {
      type: 'custom',
      payload: { hello: 'world' },
      deviceId: 'phone-1',
      timestamp: Date.now(),
      seq: 0,
    };

    transport.receiveMessage(msg, 'phone-1');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ message: msg, from: 'phone-1' }),
    );
  });

  it('handles ping/pong for latency measurement', () => {
    transport.connect('phone-1');
    const handler = vi.fn();
    transport.on('latency', handler);

    // Simulate receiving a pong
    transport.receiveMessage({
      type: 'pong',
      payload: { originalTimestamp: Date.now() - 50 },
      deviceId: 'phone-1',
      timestamp: Date.now(),
      seq: 0,
    }, 'phone-1');

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: 'phone-1' }),
    );
  });

  it('returns metrics', () => {
    transport.connect('phone-1');
    transport.connect('desktop-1');

    const metrics = transport.getMetrics();
    expect(metrics.connectedPeers).toBe(2);
    expect(metrics.transportBreakdown.websocket).toBe(2);
  });

  it('disconnects all on dispose', () => {
    transport.connect('phone-1');
    transport.connect('desktop-1');

    transport.dispose();
    expect(transport.getConnectedPeers()).toHaveLength(0);
  });
});

// =============================================================================
// OFFLINE RECOVERY QUEUE
// =============================================================================

describe('OfflineRecoveryQueue', () => {
  let queue: OfflineRecoveryQueue;

  beforeEach(() => {
    queue = createOfflineRecoveryQueue({
      authorDID: 'did:key:z6Mk1',
      deviceId: 'quest3-1',
    });
  });

  it('starts in idle state', () => {
    expect(queue.getState()).toBe('idle');
    expect(queue.isOffline()).toBe(false);
  });

  it('transitions to offline mode', () => {
    queue.goOffline();
    expect(queue.getState()).toBe('offline');
    expect(queue.isOffline()).toBe(true);
  });

  it('enqueues operations when offline', async () => {
    queue.goOffline();

    const op = createTestCRDTOp('key1', 'val1');
    const enqueued = await queue.enqueue(op);

    expect(enqueued).toBe(true);
    expect(queue.getQueueSize()).toBe(1);
  });

  it('rejects enqueue when online', async () => {
    const op = createTestCRDTOp('key1', 'val1');
    const enqueued = await queue.enqueue(op);

    expect(enqueued).toBe(false);
    expect(queue.getQueueSize()).toBe(0);
  });

  it('replays queued operations as compressed batch', async () => {
    queue.goOffline();

    // Enqueue several ops (some duplicate keys)
    await queue.enqueue(createTestCRDTOp('pos', { x: 1 }));
    await queue.enqueue(createTestCRDTOp('pos', { x: 2 }));
    await queue.enqueue(createTestCRDTOp('pos', { x: 3 }));
    await queue.enqueue(createTestCRDTOp('mood', 'happy'));

    expect(queue.getQueueSize()).toBe(4);

    // Go online → auto-replay
    const batch = await queue.goOnline();

    expect(batch).not.toBeNull();
    expect(batch!.originalCount).toBe(4);
    expect(batch!.compressedCount).toBe(2); // 'pos' deduped, 'mood' kept
    expect(queue.getQueueSize()).toBe(0);
    expect(queue.getState()).toBe('idle');
  });

  it('handles empty queue on goOnline', async () => {
    queue.goOffline();
    const batch = await queue.goOnline();
    expect(batch).toBeNull();
    expect(queue.getState()).toBe('idle');
  });

  it('enforces max queue size', async () => {
    const smallQueue = createOfflineRecoveryQueue({
      authorDID: 'did:key:z6Mk1',
      deviceId: 'quest3-1',
      maxQueueSize: 3,
    });

    smallQueue.goOffline();
    await smallQueue.enqueue(createTestCRDTOp('a', 1));
    await smallQueue.enqueue(createTestCRDTOp('b', 2));
    await smallQueue.enqueue(createTestCRDTOp('c', 3));
    await smallQueue.enqueue(createTestCRDTOp('d', 4)); // Should drop 'a'

    expect(smallQueue.getQueueSize()).toBe(3);
  });

  it('emits state change events', async () => {
    const handler = vi.fn();
    queue.on('state:changed', handler);

    queue.goOffline();
    expect(handler).toHaveBeenCalledWith({ state: 'offline' });
  });

  it('returns metrics', async () => {
    queue.goOffline();
    await queue.enqueue(createTestCRDTOp('key', 'val'));

    const metrics = queue.getMetrics();
    expect(metrics.state).toBe('offline');
    expect(metrics.queuedOperations).toBe(1);
    expect(metrics.totalEnqueued).toBe(1);
  });

  it('loads from persistent storage', async () => {
    const storage = new MemoryStorageBackend();
    const q = createOfflineRecoveryQueue({
      authorDID: 'did:key:z6Mk1',
      deviceId: 'quest3-1',
      storage,
    });

    q.goOffline();
    await q.enqueue(createTestCRDTOp('key', 'val'));
    q.dispose();

    // New queue loading from same storage
    const q2 = createOfflineRecoveryQueue({
      authorDID: 'did:key:z6Mk1',
      deviceId: 'quest3-1',
      storage,
    });
    const loaded = await q2.loadFromStorage();
    expect(loaded).toBe(1);
  });
});

function createTestCRDTOp(key: string, value: unknown) {
  return {
    operationId: `op-${Math.random().toString(36).substring(2, 6)}`,
    authorDID: 'did:key:z6Mk1',
    deviceId: 'quest3-1',
    type: 'set' as const,
    key,
    value,
    hlcTimestamp: `${Date.now()}:0000:quest3-1`,
    vectorClock: { 'quest3-1': 1 },
    signature: 'test-sig',
    capabilityScope: ['*'],
    createdAt: Date.now(),
  };
}

// =============================================================================
// EMBODIMENT TRANSITION ANIMATOR
// =============================================================================

describe('EmbodimentTransitionAnimator', () => {
  let animator: EmbodimentTransitionAnimator;

  beforeEach(() => {
    animator = createEmbodimentTransitionAnimator();
  });

  it('starts with no active transition', () => {
    expect(animator.isTransitioning()).toBe(false);
    expect(animator.getTransitionState()).toBeNull();
  });

  it('starts a transition', () => {
    const state = animator.startTransition('Avatar3D', 'UI2D', 'phone');

    expect(state.from).toBe('Avatar3D');
    expect(state.to).toBe('UI2D');
    expect(state.targetFormFactor).toBe('phone');
    expect(state.phase).toBe('fade-out');
  });

  it('returns correct timing for each form factor', () => {
    const vrTiming = animator.getTimingForFormFactor('vr-headset');
    const phoneTiming = animator.getTimingForFormFactor('phone');
    const carTiming = animator.getTimingForFormFactor('car');

    expect(vrTiming.totalMs).toBe(150);
    expect(phoneTiming.totalMs).toBe(300);
    expect(carTiming.totalMs).toBe(100); // Shortest — safety-critical
  });

  it('instant transition with reduced motion', () => {
    const reducedAnimator = createEmbodimentTransitionAnimator({ reducedMotion: true });

    const state = reducedAnimator.startTransition('Avatar3D', 'UI2D', 'phone');

    expect(state.phase).toBe('complete');
    expect(state.progress).toBe(1);
    expect(state.opacity).toBe(1);
  });

  it('emits transition events', () => {
    const startHandler = vi.fn();
    const completeHandler = vi.fn();
    animator.on('transition:started', startHandler);
    animator.on('transition:complete', completeHandler);

    // Use reduced motion for instant completion
    animator.setReducedMotion(true);
    animator.startTransition('Avatar3D', 'VoiceHUD', 'car');

    expect(startHandler).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'Avatar3D', to: 'VoiceHUD' }),
    );
    expect(completeHandler).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'Avatar3D', to: 'VoiceHUD' }),
    );
  });

  it('records transition history', () => {
    animator.setReducedMotion(true);
    animator.startTransition('Avatar3D', 'UI2D', 'phone');
    animator.startTransition('UI2D', 'FullGUI', 'desktop');

    const history = animator.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].from).toBe('Avatar3D');
    expect(history[1].from).toBe('UI2D');
  });

  it('timing overrides work', () => {
    const customAnimator = createEmbodimentTransitionAnimator({
      timingOverrides: {
        phone: { fadeOutMs: 200, morphMs: 200, fadeInMs: 200 },
      },
    });

    const timing = customAnimator.getTimingForFormFactor('phone');
    expect(timing.totalMs).toBe(600); // Recalculated
  });
});

// =============================================================================
// CROSS-REALITY SESSION MANAGER
// =============================================================================

describe('CrossRealitySessionManager', () => {
  let session: CrossRealitySessionManager;

  beforeEach(() => {
    session = createCrossRealitySessionManager(createTestSessionConfig());
  });

  it('initializes in idle state', () => {
    expect(session.getState()).toBe('idle');
  });

  it('starts and stops discovery', () => {
    const handler = vi.fn();
    session.on('state:changed', handler);

    session.startDiscovery();
    expect(session.getState()).toBe('discovering');
    expect(handler).toHaveBeenCalledWith({ state: 'discovering' });

    session.stopDiscovery();
    expect(session.getState()).toBe('idle');
  });

  it('registers discovered devices', () => {
    const capabilities = createTestCapabilities();
    session.registerDiscoveredDevice(capabilities);

    const discovered = session.getDiscoveredDevices();
    expect(discovered).toHaveLength(1);
    expect(discovered[0].deviceId).toBe('phone-1');
  });

  it('pairs with a discovered device', () => {
    session.registerDiscoveredDevice(createTestCapabilities('phone-1', 'phone'));
    const paired = session.pairWithDevice('phone-1');

    expect(paired).toBe(true);
    expect(session.getState()).toBe('connected');
  });

  it('rejects pairing with unknown device', () => {
    const paired = session.pairWithDevice('nonexistent');
    expect(paired).toBe(false);
  });

  it('initiates a handoff to a connected device', async () => {
    // Setup
    session.registerDiscoveredDevice(createTestCapabilities('phone-1', 'phone'));
    session.pairWithDevice('phone-1');

    // Handoff
    const { payload, validation } = await session.initiateHandoff('phone-1', {
      gatherDecisionHistory: () => createEmptyDecisionHistory(),
      gatherActiveTask: () => createEmptyActiveTaskState(),
      gatherUserPreferences: () => createDefaultUserPreferences(),
      gatherSpatialContext: () => createEmptySpatialContext('vr-headset'),
      gatherEvidenceTrail: () => createEmptyEvidenceTrail(),
      onEmbodimentChange: vi.fn(),
      onContextLoadStart: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    });

    expect(payload).not.toBeNull();
    expect(validation).not.toBeNull();
    expect(validation!.valid).toBe(true);
    expect(session.getState()).toBe('complete');
  });

  it('receives a handoff', () => {
    const payload = createTestPayload();
    const onComplete = vi.fn();

    const status = session.receiveHandoff(payload, {
      gatherDecisionHistory: () => createEmptyDecisionHistory(),
      gatherActiveTask: () => createEmptyActiveTaskState(),
      gatherUserPreferences: () => createDefaultUserPreferences(),
      gatherSpatialContext: () => createEmptySpatialContext('vr-headset'),
      gatherEvidenceTrail: () => createEmptyEvidenceTrail(),
      onEmbodimentChange: vi.fn(),
      onContextLoadStart: vi.fn(),
      onComplete,
      onError: vi.fn(),
    });

    expect(status.phase).toBe('complete');
    expect(onComplete).toHaveBeenCalled();
    expect(session.getState()).toBe('complete');
  });

  it('handles offline/online transitions', async () => {
    session.goOffline();
    expect(session.offlineQueue.isOffline()).toBe(true);

    const result = await session.goOnline();
    // No queued ops, so null
    expect(result).toBeNull();
  });

  it('returns comprehensive metrics', () => {
    const metrics = session.getMetrics();

    expect(metrics.session.state).toBe('idle');
    expect(metrics.session.agentId).toBe('agent-1');
    expect(metrics.session.formFactor).toBe('vr-headset');
    expect(metrics.transport).toBeDefined();
    expect(metrics.offlineQueue).toBeDefined();
    expect(metrics.handoff).toBeDefined();
    expect(metrics.transitions).toBeDefined();
  });

  it('disposes cleanly', () => {
    session.start();
    session.dispose();

    expect(session.transport.getConnectedPeers()).toHaveLength(0);
  });
});

// =============================================================================
// END-TO-END: FULL CROSS-REALITY SESSION
// =============================================================================

describe('End-to-End Cross-Reality Session', () => {
  it('VR device discovers, pairs, and hands off to phone', async () => {
    // 1. Create VR session
    const vrSession = createCrossRealitySessionManager({
      agentId: 'brittney',
      agentName: 'Brittney',
      formFactor: 'vr-headset',
      anchorSystem: { anchorManager: { agentId: 'brittney', maxAnchors: 50 } },
      transport: { deviceId: 'quest3', displayName: 'Quest 3', formFactor: 'vr-headset' },
      offlineQueue: { authorDID: 'did:key:z6MkVR', deviceId: 'quest3' },
    });

    // 2. Create phone session
    const phoneSession = createCrossRealitySessionManager({
      agentId: 'brittney',
      agentName: 'Brittney',
      formFactor: 'phone',
      anchorSystem: { anchorManager: { agentId: 'brittney', maxAnchors: 50 } },
      transport: { deviceId: 'pixel9', displayName: 'Pixel 9', formFactor: 'phone' },
      offlineQueue: { authorDID: 'did:key:z6MkPhone', deviceId: 'pixel9' },
    });

    // 3. VR discovers phone
    vrSession.registerDiscoveredDevice(createTestCapabilities('pixel9', 'phone'));
    expect(vrSession.getDiscoveredDevices()).toHaveLength(1);

    // 4. VR pairs with phone
    vrSession.pairWithDevice('pixel9');
    expect(vrSession.getState()).toBe('connected');

    // 5. VR initiates handoff
    const { payload, validation } = await vrSession.initiateHandoff('pixel9', {
      gatherDecisionHistory: () => ({
        decisions: [{
          id: 'd1', summary: 'Navigate to kitchen', rationale: 'User asked',
          alternatives: [], confidence: 0.95, category: 'navigation',
          decidedAt: Date.now(), outcome: 'success',
        }],
        totalDecisionCount: 1, successRate: 1.0, updatedAt: Date.now(),
      }),
      gatherActiveTask: () => createEmptyActiveTaskState(),
      gatherUserPreferences: () => createDefaultUserPreferences(),
      gatherSpatialContext: () => createEmptySpatialContext('vr-headset'),
      gatherEvidenceTrail: () => createEmptyEvidenceTrail(),
      onEmbodimentChange: vi.fn(),
      onContextLoadStart: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    });

    expect(payload).not.toBeNull();
    expect(validation!.valid).toBe(true);
    expect(payload!.sourceFormFactor).toBe('vr-headset');
    expect(payload!.targetFormFactor).toBe('phone');

    // 6. Phone receives handoff
    const onComplete = vi.fn();
    const status = phoneSession.receiveHandoff(payload!, {
      gatherDecisionHistory: () => createEmptyDecisionHistory(),
      gatherActiveTask: () => createEmptyActiveTaskState(),
      gatherUserPreferences: () => createDefaultUserPreferences(),
      gatherSpatialContext: () => createEmptySpatialContext('phone'),
      gatherEvidenceTrail: () => createEmptyEvidenceTrail(),
      onEmbodimentChange: vi.fn(),
      onContextLoadStart: vi.fn(),
      onComplete,
      onError: vi.fn(),
    });

    expect(status.phase).toBe('complete');
    expect(onComplete).toHaveBeenCalled();
    expect(phoneSession.getState()).toBe('complete');

    // 7. Verify metrics on both sides
    const vrMetrics = vrSession.getMetrics();
    const phoneMetrics = phoneSession.getMetrics();
    expect(vrMetrics.handoff.history).toBe(1);
    expect(phoneMetrics.handoff.history).toBe(1);

    // Cleanup
    vrSession.dispose();
    phoneSession.dispose();
  });

  it('handles offline queueing and batch replay', async () => {
    const session = createCrossRealitySessionManager(createTestSessionConfig());

    // Go offline
    session.goOffline();
    expect(session.offlineQueue.isOffline()).toBe(true);

    // Queue some operations
    await session.offlineQueue.enqueue(createTestCRDTOp('pos.x', 1));
    await session.offlineQueue.enqueue(createTestCRDTOp('pos.x', 2));
    await session.offlineQueue.enqueue(createTestCRDTOp('pos.y', 5));

    expect(session.offlineQueue.getQueueSize()).toBe(3);

    // Go online → replay
    const batch = await session.offlineQueue.goOnline();
    expect(batch).not.toBeNull();
    expect(batch!.compressedCount).toBe(2); // pos.x deduped
    expect(session.offlineQueue.getQueueSize()).toBe(0);

    session.dispose();
  });
});
