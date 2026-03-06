/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import {
  CrossRealityAnchorSystem,
  createCrossRealityAnchorSystem,
} from '../CrossRealityAnchorSystem';

import {
  compressOperationBatch,
  applyOperationBatch,
  createAuthenticatedCRDTEngine,
} from '../AuthenticatedCRDTEngine';

import type { GeospatialCoordinate } from '../CrossRealityContinuityTypes';
import {
  createCrossRealityHandoffProtocol,
  type HandoffCallbacks,
} from '../CrossRealityHandoffProtocol';
import {
  createEmptyDecisionHistory,
  createEmptyActiveTaskState,
  createDefaultUserPreferences,
  createEmptySpatialContext,
  createEmptyEvidenceTrail,
} from '../CrossRealityContinuityTypes';

// =============================================================================
// HELPERS
// =============================================================================

function sanFranciscoCoord(): GeospatialCoordinate {
  return {
    latitude: 37.7749,
    longitude: -122.4194,
    altitude: 16.0,
    horizontalAccuracy: 3.0,
    verticalAccuracy: 5.0,
    heading: null,
    source: 'gps',
    capturedAt: Date.now(),
  };
}

function createTestSystem(opts?: { withCrdt?: boolean }) {
  return createCrossRealityAnchorSystem({
    anchorManager: {
      localAgentId: 'brittney',
      syncHz: 10,
      defaultMergeStrategy: 'lww',
    },
    geoBridge: {
      defaultHorizontalAccuracy: 5.0,
    },
    crdtEngine: opts?.withCrdt ? {
      identity: {
        did: 'did:key:z6MkBrittney',
        publicKey: 'pubkey-brittney',
        algorithm: 'Ed25519',
        deviceAttestation: null,
      },
      deviceId: 'quest3-001',
      secretKey: 'test-secret',
      capabilityScopes: ['*'],
    } : undefined,
  });
}

function createTestCallbacks(): HandoffCallbacks {
  return {
    gatherDecisionHistory: () => createEmptyDecisionHistory(),
    gatherActiveTask: () => createEmptyActiveTaskState(),
    gatherUserPreferences: () => createDefaultUserPreferences(),
    gatherSpatialContext: () => createEmptySpatialContext('vr-headset'),
    gatherEvidenceTrail: () => createEmptyEvidenceTrail(),
    onEmbodimentChange: vi.fn(),
    onContextLoadStart: vi.fn(),
    onComplete: vi.fn(),
    onError: vi.fn(),
  };
}

// =============================================================================
// CROSS-REALITY ANCHOR SYSTEM
// =============================================================================

describe('CrossRealityAnchorSystem', () => {
  describe('initialization', () => {
    it('creates system without CRDT engine', () => {
      const system = createTestSystem();
      expect(system.anchorManager).toBeDefined();
      expect(system.geoBridge).toBeDefined();
      expect(system.crdtEngine).toBeNull();
    });

    it('creates system with CRDT engine', () => {
      const system = createTestSystem({ withCrdt: true });
      expect(system.crdtEngine).not.toBeNull();
      expect(system.crdtEngine!.getIdentity().did).toBe('did:key:z6MkBrittney');
    });
  });

  describe('geospatial enrichment', () => {
    it('creates anchor without geospatial when not calibrated', () => {
      const system = createTestSystem();
      const { anchor, geospatial } = system.createAnchor('test:anchor', 'Test', {
        spatial: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, extent: null },
      });
      expect(anchor).not.toBeNull();
      expect(geospatial).not.toBeNull();
      expect(geospatial!.geospatial).toBeNull(); // No origin = no geo coords
    });

    it('creates anchor with geospatial when calibrated', () => {
      const system = createTestSystem();
      system.calibrateOrigin(sanFranciscoCoord());

      const { anchor, geospatial } = system.createAnchor('test:anchor', 'Test', {
        spatial: { position: { x: 10, y: 0, z: 5 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, extent: null },
      });

      expect(anchor).not.toBeNull();
      expect(geospatial).not.toBeNull();
      expect(geospatial!.geospatial).not.toBeNull();
      expect(geospatial!.geospatial!.latitude).toBeCloseTo(37.7749, 2);
    });

    it('updates anchor position with geospatial re-computation', () => {
      const system = createTestSystem();
      system.calibrateOrigin(sanFranciscoCoord());

      system.createAnchor('test:anchor', 'Test', {
        spatial: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, extent: null },
      });

      const updated = system.updateAnchorPosition('test:anchor', { x: 100, y: 0, z: 0 });
      expect(updated).toBe(true);

      const geoAnchor = system.getGeospatialAnchor('test:anchor');
      expect(geoAnchor).toBeDefined();
      expect(geoAnchor!.geospatial!.longitude).toBeGreaterThan(-122.4194); // East
    });

    it('imports anchor from geospatial coordinates', () => {
      const system = createTestSystem();
      system.calibrateOrigin(sanFranciscoCoord());

      const remoteCoord: GeospatialCoordinate = {
        ...sanFranciscoCoord(),
        latitude: 37.7759, // ~111m north
      };

      const { anchor, geospatial } = system.importGeospatialAnchor(
        'remote:anchor',
        'Remote Anchor',
        remoteCoord,
      );

      expect(anchor).not.toBeNull();
      expect(geospatial.geospatial).not.toBeNull();

      // The local position should be non-zero (converted from geo)
      const dist = Math.sqrt(
        geospatial.localPosition.x ** 2 +
        geospatial.localPosition.y ** 2 +
        geospatial.localPosition.z ** 2,
      );
      expect(dist).toBeGreaterThan(50);
    });
  });

  describe('VPS calibration', () => {
    it('calibrates from VPS with higher quality than GPS', () => {
      const system = createTestSystem();

      // First calibrate with GPS
      system.calibrateOrigin(sanFranciscoCoord());
      const gpsQuality = system.getOrigin()!.quality;

      // Then calibrate with VPS (higher confidence)
      system.calibrateFromVPS(
        { ...sanFranciscoCoord(), horizontalAccuracy: 0.5 },
        0,
        0.95,
        'google-vps',
      );
      const vpsQuality = system.getOrigin()!.quality;

      expect(vpsQuality).toBeGreaterThan(gpsQuality);
    });

    it('emits vps:calibrated event', () => {
      const system = createTestSystem();
      const handler = vi.fn();
      system.on('vps:calibrated', handler);

      system.calibrateFromVPS(sanFranciscoCoord(), 0, 0.9, 'niantic-vps');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          confidence: 0.9,
          provider: 'niantic-vps',
        }),
      );
    });
  });

  describe('authenticated deltas', () => {
    it('signs outbound deltas when CRDT engine is configured', () => {
      const system = createTestSystem({ withCrdt: true });
      system.calibrateOrigin(sanFranciscoCoord());

      system.createAnchor('test:signed', 'Signed Anchor', {
        spatial: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, extent: null },
      });

      const signedDeltas = system.drainSignedDeltas();
      expect(signedDeltas.length).toBeGreaterThan(0);
      expect(signedDeltas[0].signature).not.toBeNull();
      expect(signedDeltas[0].authorDID).toBe('did:key:z6MkBrittney');
      expect(signedDeltas[0].geospatial).not.toBeNull();
    });

    it('produces unsigned deltas when no CRDT engine', () => {
      const system = createTestSystem();
      system.createAnchor('test:unsigned', 'Unsigned', {
        spatial: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, extent: null },
      });

      const deltas = system.drainSignedDeltas();
      expect(deltas.length).toBeGreaterThan(0);
      expect(deltas[0].signature).toBeNull();
      expect(deltas[0].authorDID).toBeNull();
    });
  });

  describe('DID revocation', () => {
    it('revokes a DID and emits event', () => {
      const system = createTestSystem({ withCrdt: true });
      const handler = vi.fn();
      system.on('did:revoked', handler);

      system.revokeDID('did:key:z6MkEvil');

      expect(handler).toHaveBeenCalledWith({ did: 'did:key:z6MkEvil' });
    });
  });

  describe('metrics', () => {
    it('returns comprehensive cross-reality metrics', () => {
      const system = createTestSystem({ withCrdt: true });
      system.calibrateOrigin(sanFranciscoCoord());
      system.createAnchor('test:metrics', 'Metrics', {
        spatial: { position: { x: 1, y: 2, z: 3 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, extent: null },
      });

      const metrics = system.getMetrics();

      expect(metrics.geospatial.calibrated).toBe(true);
      expect(metrics.geospatial.originQuality).toBeGreaterThan(0);
      expect(metrics.geospatial.totalGeoAnchors).toBe(1);
      expect(metrics.crdt).not.toBeNull();
      expect(metrics.crdt!.identity).toBe('did:key:z6MkBrittney');
    });
  });
});

// =============================================================================
// CRDT OPERATION BATCHING
// =============================================================================

describe('CRDT Operation Batching', () => {
  it('compresses redundant operations (keep latest per key)', () => {
    const engine = createAuthenticatedCRDTEngine({
      identity: { did: 'did:key:z6Mk1', publicKey: 'pub1', algorithm: 'Ed25519', deviceAttestation: null },
      deviceId: 'dev-1',
      secretKey: 'secret',
      capabilityScopes: ['*'],
    });

    // Simulate 10 position updates (only the last should survive)
    const ops = [];
    for (let i = 0; i < 10; i++) {
      ops.push(engine.set('agent.position', { x: i, y: 0, z: 0 }));
    }

    const batch = compressOperationBatch(ops, 'did:key:z6Mk1', 'dev-1');

    expect(batch.originalCount).toBe(10);
    expect(batch.compressedCount).toBe(1); // Only 1 unique key
    expect(batch.operations[0].value).toEqual({ x: 9, y: 0, z: 0 }); // Last value
  });

  it('preserves distinct keys', () => {
    const engine = createAuthenticatedCRDTEngine({
      identity: { did: 'did:key:z6Mk1', publicKey: 'pub1', algorithm: 'Ed25519', deviceAttestation: null },
      deviceId: 'dev-1',
      secretKey: 'secret',
      capabilityScopes: ['*'],
    });

    const ops = [
      engine.set('agent.name', 'Brittney'),
      engine.set('agent.mood', 'curious'),
      engine.set('agent.position', { x: 1, y: 2, z: 3 }),
    ];

    const batch = compressOperationBatch(ops, 'did:key:z6Mk1', 'dev-1');

    expect(batch.originalCount).toBe(3);
    expect(batch.compressedCount).toBe(3); // All unique keys
  });

  it('achieves >50% compression for chatty updates', () => {
    const engine = createAuthenticatedCRDTEngine({
      identity: { did: 'did:key:z6Mk1', publicKey: 'pub1', algorithm: 'Ed25519', deviceAttestation: null },
      deviceId: 'dev-1',
      secretKey: 'secret',
      capabilityScopes: ['*'],
    });

    const ops = [];
    // Simulate 60Hz position + 10Hz mood updates
    for (let i = 0; i < 60; i++) {
      ops.push(engine.set('agent.position', { x: i, y: 0, z: 0 }));
    }
    for (let i = 0; i < 10; i++) {
      ops.push(engine.set('agent.mood', `state-${i}`));
    }

    const batch = compressOperationBatch(ops, 'did:key:z6Mk1', 'dev-1');

    expect(batch.originalCount).toBe(70);
    expect(batch.compressedCount).toBe(2); // Only 2 unique keys
    expect(batch.compressedCount / batch.originalCount).toBeLessThan(0.5);
  });

  it('applies compressed batch to a remote engine', () => {
    const engine1 = createAuthenticatedCRDTEngine({
      identity: { did: 'did:key:z6Mk1', publicKey: 'pub1', algorithm: 'Ed25519', deviceAttestation: null },
      deviceId: 'quest3',
      secretKey: 'secret1',
      capabilityScopes: ['*'],
    });

    const ops = [
      engine1.set('agent.name', 'Brittney'),
      engine1.set('agent.mood', 'curious'),
    ];

    const batch = compressOperationBatch(ops, 'did:key:z6Mk1', 'quest3');

    const engine2 = createAuthenticatedCRDTEngine({
      identity: { did: 'did:key:z6Mk2', publicKey: 'pub2', algorithm: 'Ed25519', deviceAttestation: null },
      deviceId: 'phone',
      secretKey: 'secret2',
      capabilityScopes: ['*'],
    });

    const result = applyOperationBatch(engine2, batch);
    expect(result.applied).toBe(2);
    expect(result.rejected).toBe(0);
    expect(engine2.get('agent.name')).toBe('Brittney');
    expect(engine2.get('agent.mood')).toBe('curious');
  });

  it('includes valid batch metadata', () => {
    const engine = createAuthenticatedCRDTEngine({
      identity: { did: 'did:key:z6Mk1', publicKey: 'pub1', algorithm: 'Ed25519', deviceAttestation: null },
      deviceId: 'dev-1',
      secretKey: 'secret',
      capabilityScopes: ['*'],
    });

    const ops = [engine.set('key', 'value')];
    const batch = compressOperationBatch(ops, 'did:key:z6Mk1', 'dev-1');

    expect(batch.batchId).toContain('batch:dev-1:');
    expect(batch.authorDID).toBe('did:key:z6Mk1');
    expect(batch.deviceId).toBe('dev-1');
    expect(batch.estimatedSizeBytes).toBeGreaterThan(0);
    expect(batch.createdAt).toBeGreaterThan(0);
    expect(batch.vectorClock).toBeDefined();
  });
});

// =============================================================================
// END-TO-END CROSS-REALITY JOURNEY
// =============================================================================

describe('End-to-End Cross-Reality Journey', () => {
  it('VR → Phone → Desktop: anchor + handoff + geospatial continuity', () => {
    // =========================================================================
    // STEP 1: Agent starts in VR with calibrated geospatial origin
    // =========================================================================
    const vrSystem = createTestSystem({ withCrdt: true });
    vrSystem.calibrateOrigin(sanFranciscoCoord());

    const vrProtocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'vr-headset');

    // Create anchors in VR
    const { geospatial: vrAnchor1 } = vrSystem.createAnchor('session:whiteboard', 'Whiteboard', {
      spatial: { position: { x: 0, y: 1.5, z: -2 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, extent: null },
    });
    const { geospatial: vrAnchor2 } = vrSystem.createAnchor('session:table', 'Meeting Table', {
      spatial: { position: { x: 2, y: 0.8, z: -1 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, extent: null },
    });

    expect(vrAnchor1!.geospatial).not.toBeNull();
    expect(vrAnchor2!.geospatial).not.toBeNull();

    // =========================================================================
    // STEP 2: Initiate handoff to phone
    // =========================================================================
    const phoneCapabilities = {
      formFactor: 'phone' as const,
      deviceId: 'pixel9-001',
      supportedEmbodiments: ['UI2D' as const, 'WebXR' as const],
      inputModalities: ['touch', 'voice'],
      budget: { frameBudgetMs: 16.6, agentBudgetMs: 100, computeModel: 'cloud-first' as const },
      sensors: ['gps', 'camera', 'imu'],
      hasGeospatial: true,
      webxrModes: ['inline', 'immersive-ar'],
    };

    const mvcPayload = vrProtocol.initiateHandoff(phoneCapabilities, createTestCallbacks());
    expect(mvcPayload).not.toBeNull();
    expect(mvcPayload!.sourceFormFactor).toBe('vr-headset');
    expect(mvcPayload!.targetFormFactor).toBe('phone');
    expect(mvcPayload!.sourceEmbodiment).toBe('Avatar3D');
    expect(mvcPayload!.targetEmbodiment).toBe('UI2D');

    // Create compressed batch of VR state for phone
    const vrDeltas = vrSystem.drainSignedDeltas();
    expect(vrDeltas.length).toBeGreaterThan(0);

    // =========================================================================
    // STEP 3: Phone receives handoff + anchor state
    // =========================================================================
    const phoneProtocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'phone');
    const phoneStatus = phoneProtocol.receiveHandoff(mvcPayload!, createTestCallbacks());
    expect(phoneStatus.phase).toBe('complete');
    expect(phoneProtocol.getCurrentFormFactor()).toBe('phone');
    expect(phoneProtocol.getCurrentEmbodiment()).toBe('UI2D');

    // Phone creates its own system and imports geospatial anchors
    const phoneSystem = createTestSystem({ withCrdt: true });
    phoneSystem.calibrateOrigin(sanFranciscoCoord()); // Phone has GPS too

    // Import VR anchors via geospatial coordinates
    for (const delta of vrDeltas) {
      if (delta.geospatial && delta.anchorState) {
        phoneSystem.importGeospatialAnchor(
          delta.anchorId,
          delta.anchorState.name,
          delta.geospatial,
        );
      }
    }

    // Verify phone has the anchors
    const phoneAnchors = phoneSystem.getAllGeospatialAnchors();
    expect(phoneAnchors.length).toBeGreaterThan(0);

    // =========================================================================
    // STEP 4: Handoff from phone to desktop
    // =========================================================================
    const desktopCapabilities = {
      formFactor: 'desktop' as const,
      deviceId: 'macbook-001',
      supportedEmbodiments: ['FullGUI' as const, 'WebXR' as const],
      inputModalities: ['keyboard', 'mouse', 'voice'],
      budget: { frameBudgetMs: 16.6, agentBudgetMs: 200, computeModel: 'cloud-first' as const },
      sensors: ['camera', 'microphone'],
      hasGeospatial: false,
      webxrModes: ['inline'],
    };

    const phonePayload = phoneProtocol.initiateHandoff(desktopCapabilities, createTestCallbacks());
    expect(phonePayload).not.toBeNull();
    expect(phonePayload!.sourceFormFactor).toBe('phone');
    expect(phonePayload!.targetFormFactor).toBe('desktop');

    // =========================================================================
    // STEP 5: Desktop receives handoff
    // =========================================================================
    const desktopProtocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'desktop');
    const desktopStatus = desktopProtocol.receiveHandoff(phonePayload!, createTestCallbacks());
    expect(desktopStatus.phase).toBe('complete');
    expect(desktopProtocol.getCurrentFormFactor()).toBe('desktop');
    expect(desktopProtocol.getCurrentEmbodiment()).toBe('FullGUI');

    // =========================================================================
    // VERIFY: Agent identity maintained across all 3 devices
    // =========================================================================
    expect(mvcPayload!.agentId).toBe('brittney');
    expect(phonePayload!.agentId).toBe('brittney');
  });

  it('authenticated CRDT batch survives cross-device transfer', () => {
    // Device 1: Create operations
    const engine1 = createAuthenticatedCRDTEngine({
      identity: { did: 'did:key:z6MkQuest', publicKey: 'pub-quest', algorithm: 'Ed25519', deviceAttestation: null },
      deviceId: 'quest3',
      secretKey: 'secret-quest',
      capabilityScopes: ['*'],
    });

    const ops = [
      engine1.set('agent.name', 'Brittney'),
      engine1.set('agent.mood', 'curious'),
      engine1.set('agent.position', { x: 1, y: 1.6, z: -2 }),
      engine1.set('agent.task', 'analyzing whiteboard'),
      engine1.set('agent.position', { x: 1.1, y: 1.6, z: -2 }), // Updated position
      engine1.set('agent.position', { x: 1.2, y: 1.6, z: -2 }), // Updated again
    ];

    // Compress
    const batch = compressOperationBatch(ops, 'did:key:z6MkQuest', 'quest3');
    expect(batch.originalCount).toBe(6);
    expect(batch.compressedCount).toBe(4); // 4 unique keys

    // Device 2: Receive and apply
    const engine2 = createAuthenticatedCRDTEngine({
      identity: { did: 'did:key:z6MkPhone', publicKey: 'pub-phone', algorithm: 'Ed25519', deviceAttestation: null },
      deviceId: 'phone',
      secretKey: 'secret-phone',
      capabilityScopes: ['*'],
    });

    const result = applyOperationBatch(engine2, batch);
    expect(result.applied).toBe(4);
    expect(result.rejected).toBe(0);

    // Verify state
    expect(engine2.get('agent.name')).toBe('Brittney');
    expect(engine2.get('agent.mood')).toBe('curious');
    expect(engine2.get('agent.position')).toEqual({ x: 1.2, y: 1.6, z: -2 }); // Latest
    expect(engine2.get('agent.task')).toBe('analyzing whiteboard');
  });
});
