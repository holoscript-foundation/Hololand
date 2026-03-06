/**
 * @vitest-environment jsdom
 */

/**
 * Tests for TeleoperationHub (Main Orchestrator)
 *
 * Validates:
 * - Initialization and subsystem creation
 * - Connection lifecycle (connect, disconnect)
 * - Start/stop processing loop
 * - Per-frame update flow (IK + safety + commands + overlay + telemetry)
 * - Emergency stop and resume
 * - Policy action forwarding
 * - Metrics tracking
 * - Event handling
 * - Reset and destroy lifecycle
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  TeleoperationHub,
  createTeleoperationHub,
} from '../TeleoperationHub';
import type {
  HandTrackingInput,
  Vec3,
  TeleoperationEvent,
} from '../TeleoperationHubTypes';

// =============================================================================
// MOCK WEBSOCKET
// =============================================================================

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  binaryType: string = 'blob';
  readyState: number = MockWebSocket.CONNECTING;

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: (() => void) | null = null;

  sentMessages: ArrayBuffer[] = [];

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) this.onopen(new Event('open'));
    }, 10);
  }

  send(data: ArrayBuffer): void {
    this.sentMessages.push(data instanceof ArrayBuffer ? data.slice(0) : data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }
}

let mockWsInstances: MockWebSocket[] = [];

beforeEach(() => {
  mockWsInstances = [];
  // @ts-ignore
  global.WebSocket = class extends MockWebSocket {
    constructor(url: string) {
      super(url);
      mockWsInstances.push(this);
    }
  };
  // @ts-ignore
  global.WebSocket.CONNECTING = 0;
  // @ts-ignore
  global.WebSocket.OPEN = 1;
  // @ts-ignore
  global.WebSocket.CLOSING = 2;
  // @ts-ignore
  global.WebSocket.CLOSED = 3;
});

afterEach(() => {
  vi.restoreAllMocks();
  mockWsInstances = [];
});

// =============================================================================
// HELPERS
// =============================================================================

function createTestHandInput(
  hand: 'left' | 'right',
  overrides: Partial<HandTrackingInput> = {},
): HandTrackingInput {
  return {
    hand,
    wristPosition: { x: hand === 'left' ? 0.2 : -0.2, y: 1.0, z: 0.3 },
    wristOrientation: { x: 0, y: 0, z: 0, w: 1 },
    fingerTips: [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
    ],
    fingerCurls: [0, 0, 0, 0, 0],
    pinchStrength: 0,
    gripStrength: 0,
    confidence: 1.0,
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('TeleoperationHub', () => {
  let hub: TeleoperationHub;

  beforeEach(() => {
    hub = createTeleoperationHub({
      policyStream: { robotUrl: 'ws://test:9090' },
    });
  });

  afterEach(() => {
    hub.destroy();
  });

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  describe('initialization', () => {
    it('should create with default config', () => {
      const h = new TeleoperationHub();
      expect(h).toBeDefined();
      expect(h.isRunning()).toBe(false);
      expect(h.isConnected()).toBe(false);
      expect(h.getConnectionState()).toBe('disconnected');
      h.destroy();
    });

    it('should create all subsystems', () => {
      expect(hub.ikSolver).toBeDefined();
      expect(hub.policyStream).toBeDefined();
      expect(hub.cameraOverlay).toBeDefined();
      expect(hub.telemetryDisplay).toBeDefined();
      expect(hub.safetySystem).toBeDefined();
    });

    it('should accept partial config overrides', () => {
      const h = createTeleoperationHub({
        npuModelName: 'custom-model',
        enableNpuInference: false,
        ikSolver: { maxIterations: 20 },
      });
      expect(h.ikSolver.getConfig().maxIterations).toBe(20);
      h.destroy();
    });

    it('should start with empty metrics', () => {
      const metrics = hub.getMetrics();
      expect(metrics.connectionState).toBe('disconnected');
      expect(metrics.totalFrames).toBe(0);
      expect(metrics.latencyMs).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // CONNECTION LIFECYCLE
  // ---------------------------------------------------------------------------

  describe('connection lifecycle', () => {
    it('should connect to robot', async () => {
      hub.connect();
      expect(hub.getConnectionState()).toBe('connecting');

      await new Promise(resolve => setTimeout(resolve, 20));
      expect(hub.getConnectionState()).toBe('connected');
      expect(hub.isConnected()).toBe(true);
    });

    it('should disconnect from robot', async () => {
      hub.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      hub.disconnect();
      expect(hub.getConnectionState()).toBe('disconnected');
      expect(hub.isConnected()).toBe(false);
    });

    it('should not connect when destroyed', () => {
      hub.destroy();
      hub.connect();
      expect(mockWsInstances).toHaveLength(0);
    });

    it('should emit connection events', async () => {
      const listener = vi.fn();
      hub.addEventListener(listener);

      hub.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const connectedEvent = listener.mock.calls.find(
        c => (c[0] as TeleoperationEvent).type === 'connected',
      );
      expect(connectedEvent).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // START / STOP
  // ---------------------------------------------------------------------------

  describe('start and stop', () => {
    it('should start processing', () => {
      hub.start();
      expect(hub.isRunning()).toBe(true);
    });

    it('should stop processing', () => {
      hub.start();
      hub.stop();
      expect(hub.isRunning()).toBe(false);
    });

    it('should not start twice', () => {
      hub.start();
      hub.start(); // Should be no-op
      expect(hub.isRunning()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // PER-FRAME UPDATE
  // ---------------------------------------------------------------------------

  describe('per-frame update', () => {
    it('should not update when not running', () => {
      const headPos: Vec3 = { x: 0, y: 1.6, z: 0 };
      const headFwd: Vec3 = { x: 0, y: 0, z: -1 };

      hub.update(null, null, headPos, headFwd, 0.011);
      expect(hub.getMetrics().totalFrames).toBe(0);
    });

    it('should increment frame count on update', () => {
      hub.start();
      const headPos: Vec3 = { x: 0, y: 1.6, z: 0 };
      const headFwd: Vec3 = { x: 0, y: 0, z: -1 };

      hub.update(null, null, headPos, headFwd, 0.011);
      expect(hub.getMetrics().totalFrames).toBe(1);

      hub.update(null, null, headPos, headFwd, 0.011);
      expect(hub.getMetrics().totalFrames).toBe(2);
    });

    it('should solve IK when hand input is provided', () => {
      hub.start();
      const leftHand = createTestHandInput('left');
      const headPos: Vec3 = { x: 0, y: 1.6, z: 0 };
      const headFwd: Vec3 = { x: 0, y: 0, z: -1 };

      hub.update(leftHand, null, headPos, headFwd, 0.011);

      const ikResults = hub.getIKResults();
      expect(ikResults.left).not.toBeNull();
      expect(ikResults.right).toBeNull();
    });

    it('should solve bimanual IK', () => {
      hub.start();
      const leftHand = createTestHandInput('left');
      const rightHand = createTestHandInput('right');
      const headPos: Vec3 = { x: 0, y: 1.6, z: 0 };
      const headFwd: Vec3 = { x: 0, y: 0, z: -1 };

      hub.update(leftHand, rightHand, headPos, headFwd, 0.011);

      const ikResults = hub.getIKResults();
      expect(ikResults.left).not.toBeNull();
      expect(ikResults.right).not.toBeNull();
    });

    it('should send joint commands when connected', async () => {
      hub.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      hub.start();
      const leftHand = createTestHandInput('left');
      const headPos: Vec3 = { x: 0, y: 1.6, z: 0 };
      const headFwd: Vec3 = { x: 0, y: 0, z: -1 };

      hub.update(leftHand, null, headPos, headFwd, 0.011);

      // Check that a message was sent
      const ws = mockWsInstances[0];
      expect(ws.sentMessages.length).toBeGreaterThan(0);
    });

    it('should update IK solve time in metrics', () => {
      hub.start();
      const leftHand = createTestHandInput('left');
      const headPos: Vec3 = { x: 0, y: 1.6, z: 0 };
      const headFwd: Vec3 = { x: 0, y: 0, z: -1 };

      hub.update(leftHand, null, headPos, headFwd, 0.011);
      expect(hub.getMetrics().ikSolveTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should update uptime metric', () => {
      hub.start();
      const headPos: Vec3 = { x: 0, y: 1.6, z: 0 };
      const headFwd: Vec3 = { x: 0, y: 0, z: -1 };

      hub.update(null, null, headPos, headFwd, 0.011);
      expect(hub.getMetrics().uptimeSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  // ---------------------------------------------------------------------------
  // POLICY ACTION
  // ---------------------------------------------------------------------------

  describe('policy action', () => {
    it('should forward policy actions when connected', async () => {
      hub.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const actions = new Float32Array(256);
      actions[0] = 1.5;
      const sent = hub.sendPolicyAction(actions);
      expect(sent).toBe(true);
    });

    it('should return false when not connected', () => {
      const actions = new Float32Array(256);
      const sent = hub.sendPolicyAction(actions);
      expect(sent).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // EMERGENCY STOP
  // ---------------------------------------------------------------------------

  describe('emergency stop', () => {
    it('should send e-stop and emit event', async () => {
      hub.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const listener = vi.fn();
      hub.addEventListener(listener);

      hub.emergencyStop();

      const estopEvent = listener.mock.calls.find(
        c => (c[0] as TeleoperationEvent).type === 'emergency_stop',
      );
      expect(estopEvent).toBeDefined();
    });

    it('should resume and emit event', async () => {
      hub.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const listener = vi.fn();
      hub.addEventListener(listener);

      hub.emergencyStop();
      hub.resume();

      const resumeEvent = listener.mock.calls.find(
        c => (c[0] as TeleoperationEvent).type === 'resume',
      );
      expect(resumeEvent).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // ROBOT STATE
  // ---------------------------------------------------------------------------

  describe('robot state', () => {
    it('should return latest robot state', () => {
      const state = hub.getRobotState();
      expect(state).toBeDefined();
      expect(state.operatingMode).toBe('idle');
    });
  });

  // ---------------------------------------------------------------------------
  // HAPTIC STATE
  // ---------------------------------------------------------------------------

  describe('haptic state', () => {
    it('should return haptic state', () => {
      const haptics = hub.getHapticState();
      expect(typeof haptics.left).toBe('number');
      expect(typeof haptics.right).toBe('number');
    });
  });

  // ---------------------------------------------------------------------------
  // EVENT HANDLING
  // ---------------------------------------------------------------------------

  describe('event handling', () => {
    it('should add and remove event listener', () => {
      const listener = vi.fn();
      const unsub = hub.addEventListener(listener);

      hub.emergencyStop(); // Will emit event (though not connected)
      // Listener may or may not be called depending on connection state

      unsub();
      // Further events should not reach the listener
    });
  });

  // ---------------------------------------------------------------------------
  // METRICS
  // ---------------------------------------------------------------------------

  describe('metrics', () => {
    it('should track boundary violations', () => {
      hub.start();
      const headPos: Vec3 = { x: 0, y: 1.6, z: 0 };
      const headFwd: Vec3 = { x: 0, y: 0, z: -1 };

      hub.update(null, null, headPos, headFwd, 0.011);
      const metrics = hub.getMetrics();
      expect(typeof metrics.boundaryViolations).toBe('number');
    });

    it('should track command rate', () => {
      hub.start();
      const headPos: Vec3 = { x: 0, y: 1.6, z: 0 };
      const headFwd: Vec3 = { x: 0, y: 0, z: -1 };
      const leftHand = createTestHandInput('left');

      hub.update(leftHand, null, headPos, headFwd, 0.011);
      const metrics = hub.getMetrics();
      expect(typeof metrics.commandRateHz).toBe('number');
    });

    it('should return metrics as copy', () => {
      const m1 = hub.getMetrics();
      const m2 = hub.getMetrics();
      expect(m1).toEqual(m2);
      expect(m1).not.toBe(m2); // Different object
    });
  });

  // ---------------------------------------------------------------------------
  // RESET
  // ---------------------------------------------------------------------------

  describe('reset', () => {
    it('should reset all subsystems', () => {
      hub.start();
      const headPos: Vec3 = { x: 0, y: 1.6, z: 0 };
      const headFwd: Vec3 = { x: 0, y: 0, z: -1 };
      hub.update(null, null, headPos, headFwd, 0.011);

      hub.reset();

      expect(hub.isRunning()).toBe(false);
      expect(hub.getMetrics().totalFrames).toBe(0);
      expect(hub.getIKResults().left).toBeNull();
      expect(hub.getIKResults().right).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // DESTROY
  // ---------------------------------------------------------------------------

  describe('destroy', () => {
    it('should clean up all resources', () => {
      hub.start();
      hub.destroy();

      expect(hub.isRunning()).toBe(false);
      // Double destroy should not throw
      hub.destroy();
    });

    it('should not update after destroy', () => {
      hub.start();
      hub.destroy();

      const headPos: Vec3 = { x: 0, y: 1.6, z: 0 };
      const headFwd: Vec3 = { x: 0, y: 0, z: -1 };
      hub.update(null, null, headPos, headFwd, 0.011);

      // Frame count should not increase
      expect(hub.getMetrics().totalFrames).toBe(0);
    });
  });
});
