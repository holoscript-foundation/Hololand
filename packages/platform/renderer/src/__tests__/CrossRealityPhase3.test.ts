/**
 * Cross-Reality Phase 3 Tests
 *
 * Tests CRDT bridge, identity continuity, WebSocket backend,
 * and stress scenarios for rapid handoffs, concurrent sessions,
 * and offline recovery under load.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Phase 3 new modules
import {
  CrossRealityCRDTBridge,
  createCrossRealityCRDTBridge,
} from '../CrossRealityCRDTBridge';
import {
  WebSocketTransportBackend,
  createWebSocketTransportBackend,
} from '../WebSocketTransportBackend';
import {
  AgentIdentityContinuity,
  createAgentIdentityContinuity,
} from '../AgentIdentityContinuity';

// Existing modules
import { createAuthenticatedCRDTEngine } from '../AuthenticatedCRDTEngine';
import { createNetworkTransportAdapter } from '../NetworkTransportAdapter';
import { createCrossRealityAgent } from '../CrossRealityAgent';
import { createHandoffNormEnforcer } from '../HandoffNormEnforcer';
import { createMVCPayloadCompressor } from '../MVCPayloadCompressor';
import { OfflineRecoveryQueue } from '../OfflineRecoveryQueue';
import type { MVCPayload, DIDIdentity, FormFactor, EmbodimentType } from '../CrossRealityContinuityTypes';
import { FORM_FACTOR_BUDGETS, DEFAULT_EMBODIMENT } from '../CrossRealityContinuityTypes';

// ============================================================================
// TEST HELPERS
// ============================================================================

function createTestDID(name: string): DIDIdentity {
  return {
    did: `did:test:${name}`,
    publicKey: `pk-${name}`,
    algorithm: 'Ed25519',
    displayName: name,
    roles: ['agent'],
  };
}

function createTestPayload(overrides?: Partial<MVCPayload>): MVCPayload {
  const now = Date.now();
  return {
    version: 1,
    handoffId: `handoff:agent-1:${now}:test`,
    agentId: 'agent-1',
    agentName: 'TestAgent',
    sourceFormFactor: 'vr-headset' as FormFactor,
    targetFormFactor: 'phone' as FormFactor,
    sourceEmbodiment: 'FullAvatar' as EmbodimentType,
    targetEmbodiment: 'UI2D' as EmbodimentType,
    decisionHistory: {
      decisions: [{ id: 'd1', description: 'Navigate to gallery', outcome: 'success', confidence: 0.9, timestamp: now, context: {} }],
      totalDecisionCount: 1,
      successRate: 1.0,
      updatedAt: now,
    } as any,
    activeTask: {
      taskId: 'museum-tour',
      description: 'Museum guided tour',
      priority: 1,
      initiator: 'user' as const,
      progress: 50,
      currentStep: 'gallery-a',
      steps: [],
      resumeContext: {},
      startedAt: now,
      estimatedCompletionAt: now + 300000,
    } as any,
    userPreferences: {
      interactionMode: { 'vr-headset': 'gesture', 'phone': 'touch' },
      accessibility: { highContrast: false, reducedMotion: false, screenReader: false, fontScale: 1.0, hapticFeedback: true },
      privacyLevel: 'standard',
      language: 'en',
      timezone: 'UTC',
      updatedAt: now,
    } as any,
    spatialContext: {
      geospatial: null,
      localPosition: { x: 1, y: 0, z: 2 },
      facingDirection: { x: 0, y: 0, z: 1 },
      upVector: { x: 0, y: 1, z: 0 },
      nearestAnchorId: null,
      nearbyLandmarks: [],
      activeZoneId: null,
      previousFormFactor: 'vr-headset',
      updatedAt: now,
    } as any,
    evidenceTrail: {
      items: [],
      totalItemCount: 0,
      aggregateConfidence: 0,
      updatedAt: now,
    } as any,
    createdAt: now,
    expiresAt: now + 300000,
    ...overrides,
  };
}

function createBridgeConfig(deviceId: string = 'device-1') {
  return {
    crdtConfig: {
      identity: createTestDID('agent-1'),
      deviceId,
      secretKey: 'test-secret-key',
      capabilityScopes: ['*'],
    },
    realtimeSync: false, // No transport in most tests
    syncIntervalMs: 0,
    maxPendingOps: 50,
  };
}

// ============================================================================
// 1. CRDT BRIDGE TESTS
// ============================================================================

describe('CrossRealityCRDTBridge', () => {
  let bridge: CrossRealityCRDTBridge;

  beforeEach(() => {
    bridge = createCrossRealityCRDTBridge(createBridgeConfig());
  });

  it('initializes with an authenticated CRDT engine', () => {
    expect(bridge.engine).toBeDefined();
    expect(bridge.engine.getIdentity().did).toBe('did:test:agent-1');
  });

  it('sets and gets MVC fields via CRDT', () => {
    bridge.setMVCField('activeTask', 'taskId', 'museum-tour');
    bridge.setMVCField('userPreferences', 'language', 'en');
    bridge.setMVCField('decisionHistory', 'totalDecisionCount', 5);

    expect(bridge.getMVCField('activeTask', 'taskId')).toBe('museum-tour');
    expect(bridge.getMVCField('userPreferences', 'language')).toBe('en');
    expect(bridge.getMVCField('decisionHistory', 'totalDecisionCount')).toBe(5);
  });

  it('snapshots CRDT state into MVCPayload for handoff', () => {
    bridge.setMVCField('activeTask', 'taskId', 'museum-tour');
    bridge.setMVCField('activeTask', 'description', 'Museum guided tour');
    bridge.setMVCField('userPreferences', 'language', 'en');

    const snapshot = bridge.snapshotForHandoff(
      'agent-1', 'TestAgent',
      'vr-headset' as FormFactor, 'phone' as FormFactor,
      'FullAvatar' as EmbodimentType, 'UI2D' as EmbodimentType,
    );

    expect(snapshot.payload.agentId).toBe('agent-1');
    expect(snapshot.payload.activeTask.taskId).toBe('museum-tour');
    expect(snapshot.payload.activeTask.description).toBe('Museum guided tour');
    expect(snapshot.payload.userPreferences.language).toBe('en');
    expect(snapshot.vectorClock).toBeDefined();
    expect(snapshot.stateSize).toBeGreaterThan(0);
  });

  it('applies received MVCPayload into CRDT state', () => {
    const payload = createTestPayload();
    const result = bridge.applyHandoffPayload(payload);

    expect(result.applied).toBeGreaterThan(0);
    expect(bridge.getMVCField('activeTask', 'taskId')).toBe('museum-tour');
    expect(bridge.getMVCField('userPreferences', 'language')).toBe('en');
  });

  it('detects conflicts when applying over existing state', () => {
    bridge.setMVCField('activeTask', 'taskId', 'local-task');
    const payload = createTestPayload(); // payload has taskId='museum-tour'
    const result = bridge.applyHandoffPayload(payload);

    expect(result.conflicts).toBeGreaterThan(0);
    expect(bridge.getConflicts().length).toBeGreaterThan(0);
    expect(bridge.getConflicts()[0].resolvedTo).toBe('remote');
  });

  it('attaches transport for real-time delta sync', () => {
    const transport = createNetworkTransportAdapter({
      deviceId: 'device-1', displayName: 'Test', formFactor: 'vr',
    });
    bridge.attachTransport(transport);
    // Set a field — should queue for sync
    bridge.setMVCField('activeTask', 'taskId', 'test');
    expect(bridge.getMetrics().pendingOperations).toBe(0); // Flushed immediately (syncIntervalMs=0)
  });

  it('reports metrics', () => {
    bridge.setMVCField('identity', 'name', 'Agent');
    bridge.snapshotForHandoff('a', 'b', 'vr-headset' as FormFactor, 'phone' as FormFactor, 'FullAvatar' as EmbodimentType, 'UI2D' as EmbodimentType);
    const metrics = bridge.getMetrics();
    expect(metrics.snapshotsTaken).toBe(1);
  });
});

// ============================================================================
// 2. WEBSOCKET TRANSPORT BACKEND TESTS
// ============================================================================

describe('WebSocketTransportBackend', () => {
  it('instantiates with config', () => {
    const backend = createWebSocketTransportBackend({
      relayUrl: 'wss://example.com/signal',
      roomId: 'test-room',
      deviceId: 'device-1',
      displayName: 'Test Device',
      formFactor: 'vr',
    });
    expect(backend).toBeDefined();
  });

  it('returns empty peers before connection', () => {
    const backend = createWebSocketTransportBackend({
      relayUrl: 'wss://example.com/signal',
      roomId: 'test-room',
      deviceId: 'device-1',
      displayName: 'Test',
      formFactor: 'vr',
    });
    expect(backend.getConnectedPeers()).toHaveLength(0);
    expect(backend.isConnected('other')).toBe(false);
  });

  it('reports initial metrics', () => {
    const backend = createWebSocketTransportBackend({
      relayUrl: 'wss://example.com/signal',
      roomId: 'room-1',
      deviceId: 'dev-1',
      displayName: 'Dev',
      formFactor: 'phone',
    });
    const metrics = backend.getMetrics();
    expect(metrics.signalingState).toBe('disconnected');
    expect(metrics.connectedPeers).toBe(0);
    expect(metrics.messagesSent).toBe(0);
  });

  it('disposes cleanly', () => {
    const backend = createWebSocketTransportBackend({
      relayUrl: 'wss://example.com/signal',
      roomId: 'room-1',
      deviceId: 'dev-1',
      displayName: 'Dev',
      formFactor: 'phone',
    });
    expect(() => backend.dispose()).not.toThrow();
  });
});

// ============================================================================
// 3. AGENT IDENTITY CONTINUITY TESTS
// ============================================================================

describe('AgentIdentityContinuity', () => {
  let sourceIdentity: AgentIdentityContinuity;
  let targetIdentity: AgentIdentityContinuity;

  beforeEach(() => {
    sourceIdentity = createAgentIdentityContinuity({
      identity: createTestDID('agent-1'),
      agentIdentity: { id: 'agent-1', name: 'TestAgent', domain: 'museum', version: '1.0', capabilities: ['spatial', 'voice', 'vision'] },
      signingSecret: 'shared-secret-key',
    });
    targetIdentity = createAgentIdentityContinuity({
      identity: createTestDID('agent-1'), // Same DID (same agent)
      agentIdentity: { id: 'agent-1', name: 'TestAgent', domain: 'museum', version: '1.0', capabilities: ['spatial', 'voice'] }, // Phone lacks 'vision'
      signingSecret: 'shared-secret-key', // Same signing secret
    });
  });

  it('issues a handoff identity claim', () => {
    const claim = sourceIdentity.issueClaim('device-target', 'device-source');
    expect(claim.agentDID).toBe('did:test:agent-1');
    expect(claim.sourceDeviceId).toBe('device-source');
    expect(claim.targetDeviceId).toBe('device-target');
    expect(claim.sessionToken).toBeDefined();
    expect(claim.signature).toBeDefined();
    expect(claim.capabilities).toEqual(['spatial', 'voice', 'vision']);
  });

  it('verifies a valid claim on the target device', () => {
    const claim = sourceIdentity.issueClaim('device-target', 'device-source');
    const result = targetIdentity.verifyClaim(claim, 'device-target');

    expect(result.valid).toBe(true);
    expect(result.agentDID).toBe('did:test:agent-1');
    expect(result.grantedCapabilities).toContain('spatial');
    expect(result.grantedCapabilities).toContain('voice');
    expect(result.droppedCapabilities).toContain('vision');
  });

  it('rejects expired claims', () => {
    const claim = sourceIdentity.issueClaim('device-target', 'device-source');
    // Manually expire it
    claim.expiresAt = Date.now() - 100000;
    const result = targetIdentity.verifyClaim(claim, 'device-target');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('expired');
  });

  it('rejects claims for wrong target device', () => {
    const claim = sourceIdentity.issueClaim('device-target', 'device-source');
    const result = targetIdentity.verifyClaim(claim, 'wrong-device');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Target mismatch');
  });

  it('rejects replay attacks (single-use tokens)', () => {
    const claim = sourceIdentity.issueClaim('device-target', 'device-source');
    const first = targetIdentity.verifyClaim(claim, 'device-target');
    expect(first.valid).toBe(true);
    const second = targetIdentity.verifyClaim(claim, 'device-target');
    expect(second.valid).toBe(false);
    expect(second.error).toContain('revoked');
  });

  it('rejects tampered claims', () => {
    const claim = sourceIdentity.issueClaim('device-target', 'device-source');
    claim.capabilities = ['admin', 'root']; // Tamper
    const result = targetIdentity.verifyClaim(claim, 'device-target');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid signature');
  });

  it('revokes session tokens manually', () => {
    const claim = sourceIdentity.issueClaim('device-target', 'device-source');
    targetIdentity.revokeSessionToken(claim.sessionToken);
    const result = targetIdentity.verifyClaim(claim, 'device-target');
    expect(result.valid).toBe(false);
  });

  it('reports metrics', () => {
    const claim = sourceIdentity.issueClaim('device-target', 'device-source');
    targetIdentity.verifyClaim(claim, 'device-target');
    const metrics = targetIdentity.getMetrics();
    expect(metrics.claimsVerified).toBe(1);
    expect(metrics.handoffsCompleted).toBe(1);
    expect(metrics.capabilitiesDropped).toBe(1); // 'vision' dropped
  });

  it('verifies within 1ms', () => {
    const claim = sourceIdentity.issueClaim('device-target', 'device-source');
    const start = performance.now();
    targetIdentity.verifyClaim(claim, 'device-target');
    expect(performance.now() - start).toBeLessThan(1);
  });
});

// ============================================================================
// 4. STRESS: RAPID HANDOFF CHAINS
// ============================================================================

describe('Stress: Rapid Handoff Chains', () => {
  it('survives 20 rapid VR→phone→desktop→phone→VR handoffs', () => {
    const bridge = createCrossRealityCRDTBridge(createBridgeConfig());
    const identity = createAgentIdentityContinuity({
      identity: createTestDID('agent-1'),
      agentIdentity: { id: 'agent-1', name: 'StressAgent', domain: 'test', version: '1.0', capabilities: ['spatial', 'voice'] },
      signingSecret: 'stress-secret',
    });

    // Seed initial state
    bridge.setMVCField('context', 'task', 'stress-test');
    bridge.setMVCField('identity', 'name', 'StressAgent');

    const chain: Array<[FormFactor, EmbodimentType]> = [
      ['vr-headset' as FormFactor, 'FullAvatar' as EmbodimentType],
      ['phone' as FormFactor, 'UI2D' as EmbodimentType],
      ['desktop' as FormFactor, 'UI2D' as EmbodimentType],
      ['phone' as FormFactor, 'UI2D' as EmbodimentType],
      ['vr-headset' as FormFactor, 'FullAvatar' as EmbodimentType],
    ];

    const start = performance.now();
    for (let round = 0; round < 4; round++) {
      for (let i = 0; i < chain.length - 1; i++) {
        const [srcFF, srcEmb] = chain[i];
        const [tgtFF, tgtEmb] = chain[i + 1];
        // Snapshot
        const snapshot = bridge.snapshotForHandoff('agent-1', 'StressAgent', srcFF, tgtFF, srcEmb, tgtEmb);
        expect(snapshot.payload).toBeDefined();
        // Issue + verify identity
        const claim = identity.issueClaim(`device-${i + 1}`, `device-${i}`);
        // Create new identity instance for target (simulates different device)
        const targetId = createAgentIdentityContinuity({
          identity: createTestDID('agent-1'),
          agentIdentity: { id: 'agent-1', name: 'StressAgent', domain: 'test', version: '1.0', capabilities: ['spatial', 'voice'] },
          signingSecret: 'stress-secret',
        });
        const verified = targetId.verifyClaim(claim, `device-${i + 1}`);
        expect(verified.valid).toBe(true);
        // Apply payload on target
        const result = bridge.applyHandoffPayload(snapshot.payload);
        expect(result.applied).toBeGreaterThan(0);
      }
    }
    const elapsed = performance.now() - start;
    // 20 handoffs should complete in under 100ms
    expect(elapsed).toBeLessThan(100);
  });

  it('maintains data integrity through 50 handoffs', () => {
    const bridge = createCrossRealityCRDTBridge(createBridgeConfig());
    bridge.setMVCField('identity', 'counter', 0);

    for (let i = 0; i < 50; i++) {
      bridge.setMVCField('identity', 'counter', i);
      const snapshot = bridge.snapshotForHandoff(
        'agent-1', 'Agent', 'phone' as FormFactor, 'desktop' as FormFactor,
        'UI2D' as EmbodimentType, 'UI2D' as EmbodimentType,
      );
      bridge.applyHandoffPayload(snapshot.payload);
    }

    expect(bridge.getMVCField('identity', 'counter')).toBe(49);
    expect(bridge.getMetrics().snapshotsTaken).toBe(50);
  });
});

// ============================================================================
// 5. STRESS: CONCURRENT MULTI-DEVICE SESSIONS
// ============================================================================

describe('Stress: Concurrent Multi-Device Sessions', () => {
  it('handles 10 concurrent CRDT engines merging state', () => {
    const engines = Array.from({ length: 10 }, (_, i) =>
      createAuthenticatedCRDTEngine({
        identity: createTestDID(`agent-${i}`),
        deviceId: `device-${i}`,
        secretKey: 'shared-secret',
        capabilityScopes: ['*'],
      }),
    );

    // Each engine sets its own key
    const ops = engines.map((engine, i) => engine.set(`position.device-${i}`, { x: i * 10, y: 0, z: 0 }));

    // Cross-apply all operations to all engines
    for (const engine of engines) {
      for (const op of ops) {
        engine.applyRemote(op);
      }
    }

    // All engines should have all 10 positions
    for (const engine of engines) {
      for (let i = 0; i < 10; i++) {
        const pos = engine.get<{ x: number; y: number; z: number }>(`position.device-${i}`);
        expect(pos).toBeDefined();
        expect(pos!.x).toBe(i * 10);
      }
    }
  });

  it('resolves LWW conflicts across concurrent writes', () => {
    const engine1 = createAuthenticatedCRDTEngine({
      identity: createTestDID('agent-1'), deviceId: 'dev-1', secretKey: 'secret', capabilityScopes: ['*'],
    });
    const engine2 = createAuthenticatedCRDTEngine({
      identity: createTestDID('agent-2'), deviceId: 'dev-2', secretKey: 'secret', capabilityScopes: ['*'],
    });

    // Both write to same key
    const op1 = engine1.set('shared.value', 'from-device-1');
    const op2 = engine2.set('shared.value', 'from-device-2');

    // Cross-apply (op2 has later timestamp since it was created after op1)
    engine1.applyRemote(op2);
    engine2.applyRemote(op1);

    // Both should converge to the same value (LWW)
    expect(engine1.get('shared.value')).toBe(engine2.get('shared.value'));
  });
});

// ============================================================================
// 6. STRESS: OFFLINE PARTITION RECOVERY
// ============================================================================

describe('Stress: Offline Partition Recovery', () => {
  it('queues 100 operations offline and replays them all', async () => {
    const queue = new OfflineRecoveryQueue({
      maxQueueSize: 200,
      authorDID: 'did:test:agent-1',
      deviceId: 'device-1',
    });
    const engine = createAuthenticatedCRDTEngine({
      identity: createTestDID('agent-1'), deviceId: 'dev-1', secretKey: 'secret', capabilityScopes: ['*'],
    });

    queue.goOffline();

    // Queue 100 operations
    for (let i = 0; i < 100; i++) {
      const op = engine.set(`offline.key-${i}`, `value-${i}`);
      queue.enqueue(op);
    }

    expect(queue.getMetrics().queuedOperations).toBe(100);

    // Go online and replay
    const batch = await queue.goOnline();
    expect(batch).not.toBeNull();
    expect(batch!.compressedCount).toBeLessThanOrEqual(100); // Deduplication may reduce
    expect(batch!.originalCount).toBe(100);
  });

  it('handles offline→online→offline→online cycles', async () => {
    const queue = new OfflineRecoveryQueue({
      maxQueueSize: 200,
      authorDID: 'did:test:agent-1',
      deviceId: 'device-1',
    });
    const engine = createAuthenticatedCRDTEngine({
      identity: createTestDID('agent-1'), deviceId: 'dev-1', secretKey: 'secret', capabilityScopes: ['*'],
    });

    for (let cycle = 0; cycle < 5; cycle++) {
      queue.goOffline();
      for (let i = 0; i < 10; i++) {
        queue.enqueue(engine.set(`cycle-${cycle}.key-${i}`, `value-${i}`));
      }
      const batch = await queue.goOnline();
      expect(batch).not.toBeNull();
      expect(batch!.originalCount).toBe(10);
    }
  });

  it('deduplicates repeated writes to same key', async () => {
    const queue = new OfflineRecoveryQueue({
      maxQueueSize: 200,
      authorDID: 'did:test:agent-1',
      deviceId: 'device-1',
    });
    const engine = createAuthenticatedCRDTEngine({
      identity: createTestDID('agent-1'), deviceId: 'dev-1', secretKey: 'secret', capabilityScopes: ['*'],
    });

    queue.goOffline();

    // Write same key 50 times
    for (let i = 0; i < 50; i++) {
      queue.enqueue(engine.set('position', { x: i, y: 0, z: 0 }));
    }

    const batch = await queue.goOnline();
    expect(batch).not.toBeNull();
    expect(batch!.originalCount).toBe(50);
    expect(batch!.compressedCount).toBe(1); // Only latest write survives
  });

  it('full pipeline: offline → queue → replay → CRDT merge in under 50ms', async () => {
    const queue = new OfflineRecoveryQueue({
      maxQueueSize: 500,
      authorDID: 'did:test:agent-1',
      deviceId: 'device-1',
    });
    const sourceEngine = createAuthenticatedCRDTEngine({
      identity: createTestDID('source'), deviceId: 'source', secretKey: 'key', capabilityScopes: ['*'],
    });
    const targetEngine = createAuthenticatedCRDTEngine({
      identity: createTestDID('target'), deviceId: 'target', secretKey: 'key', capabilityScopes: ['*'],
    });

    queue.goOffline();
    const start = performance.now();

    // Simulate 200 offline operations
    for (let i = 0; i < 200; i++) {
      queue.enqueue(sourceEngine.set(`state.${i % 20}`, { value: i, updated: true }));
    }

    // Replay
    const batch = await queue.goOnline();
    expect(batch).not.toBeNull();

    // Apply to target engine
    const { applyOperationBatch } = await import('../AuthenticatedCRDTEngine');
    const result = applyOperationBatch(targetEngine, batch!);

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
    expect(result.applied).toBeGreaterThan(0);
    // 200 ops on 20 keys → 20 unique after dedup
    expect(batch!.compressedCount).toBe(20);
  });
});
