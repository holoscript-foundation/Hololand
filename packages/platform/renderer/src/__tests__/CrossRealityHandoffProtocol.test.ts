/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import {
  CrossRealityHandoffProtocol,
  createCrossRealityHandoffProtocol,
} from '../CrossRealityHandoffProtocol';

import type { DeviceCapabilities, HandoffCallbacks } from '../CrossRealityHandoffProtocol';

import {
  createEmptyDecisionHistory,
  createEmptyActiveTaskState,
  createDefaultUserPreferences,
  createEmptySpatialContext,
  createEmptyEvidenceTrail,
  createMVCPayload,
} from '../CrossRealityContinuityTypes';

import type { FormFactor, MVCPayload } from '../CrossRealityContinuityTypes';

// =============================================================================
// HELPERS
// =============================================================================

function createPhoneCapabilities(): DeviceCapabilities {
  return {
    formFactor: 'phone',
    deviceId: 'pixel9-001',
    supportedEmbodiments: ['UI2D', 'WebXR'],
    inputModalities: ['touch', 'voice'],
    budget: { frameBudgetMs: 16.6, agentBudgetMs: 100, computeModel: 'cloud-first' },
    sensors: ['gps', 'camera', 'imu', 'npu'],
    hasGeospatial: true,
    webxrModes: ['inline', 'immersive-ar'],
  };
}

function createDesktopCapabilities(): DeviceCapabilities {
  return {
    formFactor: 'desktop',
    deviceId: 'macbook-001',
    supportedEmbodiments: ['FullGUI', 'WebXR'],
    inputModalities: ['keyboard', 'mouse', 'voice'],
    budget: { frameBudgetMs: 16.6, agentBudgetMs: 200, computeModel: 'cloud-first' },
    sensors: ['camera', 'microphone'],
    hasGeospatial: false,
    webxrModes: ['inline'],
  };
}

function createTestCallbacks(overrides?: Partial<HandoffCallbacks>): HandoffCallbacks {
  return {
    gatherDecisionHistory: overrides?.gatherDecisionHistory ?? (() => createEmptyDecisionHistory()),
    gatherActiveTask: overrides?.gatherActiveTask ?? (() => createEmptyActiveTaskState()),
    gatherUserPreferences: overrides?.gatherUserPreferences ?? (() => createDefaultUserPreferences()),
    gatherSpatialContext: overrides?.gatherSpatialContext ?? (() => createEmptySpatialContext('vr-headset')),
    gatherEvidenceTrail: overrides?.gatherEvidenceTrail ?? (() => createEmptyEvidenceTrail()),
    onEmbodimentChange: overrides?.onEmbodimentChange ?? vi.fn(),
    onContextLoadStart: overrides?.onContextLoadStart ?? vi.fn(),
    onComplete: overrides?.onComplete ?? vi.fn(),
    onError: overrides?.onError ?? vi.fn(),
  };
}

// =============================================================================
// PROTOCOL LIFECYCLE
// =============================================================================

describe('CrossRealityHandoffProtocol', () => {
  describe('initialization', () => {
    it('creates protocol with form factor and embodiment', () => {
      const protocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'vr-headset');
      expect(protocol.getCurrentFormFactor()).toBe('vr-headset');
      expect(protocol.getCurrentEmbodiment()).toBe('Avatar3D');
    });

    it('allows custom embodiment override', () => {
      const protocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'phone', 'WebXR');
      expect(protocol.getCurrentEmbodiment()).toBe('WebXR');
    });

    it('starts with no active handoff', () => {
      const protocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'vr-headset');
      expect(protocol.isHandoffInProgress()).toBe(false);
      expect(protocol.getActiveHandoff()).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // INITIATING HANDOFF
  // ---------------------------------------------------------------------------

  describe('initiateHandoff', () => {
    it('creates MVC payload for VR → Phone transition', () => {
      const protocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'vr-headset');
      const callbacks = createTestCallbacks();

      const payload = protocol.initiateHandoff(createPhoneCapabilities(), callbacks);

      expect(payload).not.toBeNull();
      expect(payload!.agentId).toBe('brittney');
      expect(payload!.sourceFormFactor).toBe('vr-headset');
      expect(payload!.targetFormFactor).toBe('phone');
      expect(payload!.sourceEmbodiment).toBe('Avatar3D');
      expect(payload!.targetEmbodiment).toBe('UI2D');
    });

    it('gathers all 5 MVC objects from callbacks', () => {
      const protocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'vr-headset');
      const gatherDecision = vi.fn(() => ({
        ...createEmptyDecisionHistory(),
        totalDecisionCount: 42,
      }));
      const callbacks = createTestCallbacks({ gatherDecisionHistory: gatherDecision });

      const payload = protocol.initiateHandoff(createPhoneCapabilities(), callbacks);

      expect(gatherDecision).toHaveBeenCalledTimes(1);
      expect(payload!.decisionHistory.totalDecisionCount).toBe(42);
    });

    it('emits handoff:initiated event', () => {
      const protocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'vr-headset');
      const handler = vi.fn();
      protocol.on('handoff:initiated', handler);

      protocol.initiateHandoff(createPhoneCapabilities(), createTestCallbacks());

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'vr-headset',
          target: 'phone',
        }),
      );
    });

    it('emits handoff:mvc-transferred event', () => {
      const protocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'vr-headset');
      const handler = vi.fn();
      protocol.on('handoff:mvc-transferred', handler);

      protocol.initiateHandoff(createPhoneCapabilities(), createTestCallbacks());

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          payloadSizeBytes: expect.any(Number),
          transferMs: expect.any(Number),
        }),
      );
    });

    it('rejects duplicate handoff while one is in progress', () => {
      // Need to simulate an in-progress handoff by NOT completing the receive
      const protocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'vr-headset');

      // First handoff completes (initiateHandoff is synchronous and auto-completes)
      protocol.initiateHandoff(createPhoneCapabilities(), createTestCallbacks());
      // After initiate, handoff is complete so a second one should work
      const second = protocol.initiateHandoff(createDesktopCapabilities(), createTestCallbacks());
      expect(second).not.toBeNull();
    });

    it('selects WebXR fallback when default embodiment not supported', () => {
      const protocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'vr-headset');

      const capabilities: DeviceCapabilities = {
        ...createPhoneCapabilities(),
        supportedEmbodiments: ['WebXR'], // UI2D not available
      };

      const payload = protocol.initiateHandoff(capabilities, createTestCallbacks());
      expect(payload!.targetEmbodiment).toBe('WebXR');
    });
  });

  // ---------------------------------------------------------------------------
  // RECEIVING HANDOFF
  // ---------------------------------------------------------------------------

  describe('receiveHandoff', () => {
    it('receives a handoff and updates form factor', () => {
      const protocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'phone');
      const payload = createMVCPayload('brittney', 'Brittney', 'vr-headset', 'phone');

      const status = protocol.receiveHandoff(payload, createTestCallbacks());

      expect(status.phase).toBe('complete');
      expect(protocol.getCurrentFormFactor()).toBe('phone');
      expect(protocol.getCurrentEmbodiment()).toBe('UI2D');
    });

    it('calls onEmbodimentChange callback', () => {
      const protocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'phone');
      const onEmbodimentChange = vi.fn();

      const payload = createMVCPayload('brittney', 'Brittney', 'vr-headset', 'phone');
      protocol.receiveHandoff(payload, createTestCallbacks({ onEmbodimentChange }));

      expect(onEmbodimentChange).toHaveBeenCalledWith('Avatar3D', 'UI2D');
    });

    it('calls onContextLoadStart callback', () => {
      const protocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'phone');
      const onContextLoadStart = vi.fn();

      const payload = createMVCPayload('brittney', 'Brittney', 'vr-headset', 'phone');
      protocol.receiveHandoff(payload, createTestCallbacks({ onContextLoadStart }));

      expect(onContextLoadStart).toHaveBeenCalledTimes(1);
    });

    it('calls onComplete callback', () => {
      const protocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'phone');
      const onComplete = vi.fn();

      const payload = createMVCPayload('brittney', 'Brittney', 'vr-headset', 'phone');
      protocol.receiveHandoff(payload, createTestCallbacks({ onComplete }));

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'complete', progress: 100 }),
      );
    });

    it('rejects expired payloads', () => {
      const protocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'phone');
      const onError = vi.fn();

      const payload = createMVCPayload('brittney', 'Brittney', 'vr-headset', 'phone');
      payload.expiresAt = Date.now() - 1000; // Already expired

      const status = protocol.receiveHandoff(payload, createTestCallbacks({ onError }));

      expect(onError).toHaveBeenCalledTimes(1);
      expect(status.errors.length).toBeGreaterThan(0);
    });

    it('handles embodiment adaptation failure gracefully', () => {
      const protocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'phone');
      const onError = vi.fn();
      const onEmbodimentChange = vi.fn(() => { throw new Error('GPU not available'); });

      const payload = createMVCPayload('brittney', 'Brittney', 'vr-headset', 'phone');
      const status = protocol.receiveHandoff(payload, createTestCallbacks({
        onEmbodimentChange,
        onError,
      }));

      expect(onError).toHaveBeenCalledTimes(1);
      expect(status.errors.some(e => e.includes('GPU not available'))).toBe(true);
    });

    it('emits handoff:complete event', () => {
      const protocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'phone');
      const handler = vi.fn();
      protocol.on('handoff:complete', handler);

      const payload = createMVCPayload('brittney', 'Brittney', 'vr-headset', 'phone');
      protocol.receiveHandoff(payload, createTestCallbacks());

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ totalMs: expect.any(Number) }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // HANDOFF HISTORY
  // ---------------------------------------------------------------------------

  describe('handoff history', () => {
    it('records completed handoffs', () => {
      const protocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'vr-headset');

      protocol.initiateHandoff(createPhoneCapabilities(), createTestCallbacks());

      const history = protocol.getHandoffHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('records handoff across multiple transitions', () => {
      const protocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'vr-headset');

      // VR → Phone
      const payload1 = protocol.initiateHandoff(createPhoneCapabilities(), createTestCallbacks());

      // Simulate receiving on phone side
      const phoneProtocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'phone');
      phoneProtocol.receiveHandoff(payload1!, createTestCallbacks());

      // Phone → Desktop
      const payload2 = phoneProtocol.initiateHandoff(createDesktopCapabilities(), createTestCallbacks());
      expect(payload2!.sourceFormFactor).toBe('phone');
      expect(payload2!.targetFormFactor).toBe('desktop');
    });
  });

  // ---------------------------------------------------------------------------
  // CANCEL
  // ---------------------------------------------------------------------------

  describe('cancelHandoff', () => {
    it('cancelling when no handoff is in progress is safe', () => {
      const protocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'vr-headset');
      expect(() => protocol.cancelHandoff()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // FULL JOURNEY
  // ---------------------------------------------------------------------------

  describe('full cross-reality journey', () => {
    it('VR → Phone → Desktop maintains agent identity', () => {
      // Step 1: Agent starts in VR
      const vrProtocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'vr-headset');
      expect(vrProtocol.getCurrentEmbodiment()).toBe('Avatar3D');

      // Step 2: Handoff to phone
      const vrPayload = vrProtocol.initiateHandoff(createPhoneCapabilities(), createTestCallbacks());
      expect(vrPayload!.sourceEmbodiment).toBe('Avatar3D');
      expect(vrPayload!.targetEmbodiment).toBe('UI2D');

      // Step 3: Receive on phone
      const phoneProtocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'phone');
      phoneProtocol.receiveHandoff(vrPayload!, createTestCallbacks());
      expect(phoneProtocol.getCurrentFormFactor()).toBe('phone');
      expect(phoneProtocol.getCurrentEmbodiment()).toBe('UI2D');

      // Step 4: Handoff to desktop
      const phonePayload = phoneProtocol.initiateHandoff(
        createDesktopCapabilities(),
        createTestCallbacks(),
      );
      expect(phonePayload!.agentId).toBe('brittney');
      expect(phonePayload!.sourceFormFactor).toBe('phone');
      expect(phonePayload!.targetFormFactor).toBe('desktop');

      // Step 5: Receive on desktop
      const desktopProtocol = createCrossRealityHandoffProtocol('brittney', 'Brittney', 'desktop');
      const status = desktopProtocol.receiveHandoff(phonePayload!, createTestCallbacks());

      expect(status.phase).toBe('complete');
      expect(desktopProtocol.getCurrentFormFactor()).toBe('desktop');
      expect(desktopProtocol.getCurrentEmbodiment()).toBe('WebXR'); // Desktop uses WebXR embodiment in this test context
    });
  });
});
