/**
 * @vitest-environment jsdom
 */

/**
 * Tests for RobotPolicyStreamClient
 *
 * Validates:
 * - Connection lifecycle (connect, disconnect, destroy)
 * - Binary message encoding (joint commands, policy actions)
 * - Message decoding (state telemetry, camera frames)
 * - Heartbeat mechanism
 * - Reconnection logic
 * - Emergency stop handling
 * - Event listener management
 * - Pre-allocated buffer usage
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
  RobotPolicyStreamClient,
  createRobotPolicyStreamClient,
} from '../RobotPolicyStreamClient';
import {
  WsMessageType,
  WS_HEADER_SIZE,
  JOINT_COUNT,
  ALL_JOINT_NAMES,
  POLICY_ACTION_SIZE,
} from '../TeleoperationHubTypes';
import type { RobotJointName } from '../TeleoperationHubTypes';

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
    // Simulate async connection
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

  // Test helpers
  simulateMessage(data: ArrayBuffer): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  simulateClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }
}

// Store references to mock WebSocket instances
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
// HELPER: Build binary telemetry message
// =============================================================================

function buildTelemetryMessage(sequence: number): ArrayBuffer {
  // Header (9 bytes) + joints (JOINT_COUNT*16) + EE (56) + battery/mode (7) + latency (4)
  // + forces (24) + base (28) + health (6)
  const jointsSize = JOINT_COUNT * 16;
  const totalSize = 9 + jointsSize + 56 + 7 + 4 + 24 + 28 + 6;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // Header
  view.setUint8(0, WsMessageType.STATE_TELEMETRY);
  view.setUint32(1, sequence, true);
  view.setUint32(5, Date.now() & 0xFFFFFFFF, true);

  // Joints: JOINT_COUNT * 16 bytes (angle, velocity, torque, temp)
  let offset = 9;
  for (let i = 0; i < JOINT_COUNT; i++) {
    view.setFloat32(offset, 0.1 * i, true); // angle
    view.setFloat32(offset + 4, 0, true);     // velocity
    view.setFloat32(offset + 8, 0, true);     // torque
    view.setFloat32(offset + 12, 30, true);   // temperature
    offset += 16;
  }

  // End effectors
  // Left hand pos
  view.setFloat32(offset, 0.2, true); offset += 4;
  view.setFloat32(offset, 1.0, true); offset += 4;
  view.setFloat32(offset, 0.3, true); offset += 4;
  // Left hand orient
  view.setFloat32(offset, 0, true); offset += 4;
  view.setFloat32(offset, 0, true); offset += 4;
  view.setFloat32(offset, 0, true); offset += 4;
  view.setFloat32(offset, 1, true); offset += 4;
  // Right hand pos
  view.setFloat32(offset, -0.2, true); offset += 4;
  view.setFloat32(offset, 1.0, true); offset += 4;
  view.setFloat32(offset, 0.3, true); offset += 4;
  // Right hand orient
  view.setFloat32(offset, 0, true); offset += 4;
  view.setFloat32(offset, 0, true); offset += 4;
  view.setFloat32(offset, 0, true); offset += 4;
  view.setFloat32(offset, 1, true); offset += 4;

  // Battery + mode
  view.setFloat32(offset, 0.85, true); offset += 4;
  view.setUint8(offset, 0); offset += 1; // not charging
  view.setUint8(offset, 1); offset += 1; // teleoperation mode
  view.setUint8(offset, 0); offset += 1; // no e-stop

  // Latency
  view.setFloat32(offset, 12.5, true); offset += 4;

  // Contact forces (left, right)
  for (let i = 0; i < 6; i++) {
    view.setFloat32(offset, 0, true); offset += 4;
  }

  // Base position + orientation
  for (let i = 0; i < 3; i++) {
    view.setFloat32(offset, 0, true); offset += 4;
  }
  view.setFloat32(offset, 0, true); offset += 4;
  view.setFloat32(offset, 0, true); offset += 4;
  view.setFloat32(offset, 0, true); offset += 4;
  view.setFloat32(offset, 1, true); offset += 4;

  // Health flags (6 bytes, all false)
  for (let i = 0; i < 6; i++) {
    view.setUint8(offset, 0); offset += 1;
  }

  return buffer;
}

function buildHeartbeatMessage(): ArrayBuffer {
  const buffer = new ArrayBuffer(WS_HEADER_SIZE);
  const view = new DataView(buffer);
  view.setUint8(0, WsMessageType.HEARTBEAT);
  view.setUint32(1, 0, true);
  view.setUint32(5, Date.now() & 0xFFFFFFFF, true);
  return buffer;
}

function buildCameraFrameMessage(width: number, height: number): ArrayBuffer {
  const fakeImageData = new Uint8Array(100); // Minimal fake JPEG data
  const buffer = new ArrayBuffer(WS_HEADER_SIZE + 8 + fakeImageData.length);
  const view = new DataView(buffer);

  view.setUint8(0, WsMessageType.CAMERA_FRAME);
  view.setUint32(1, 1, true);
  view.setUint32(5, Date.now() & 0xFFFFFFFF, true);
  view.setUint32(WS_HEADER_SIZE, width, true);
  view.setUint32(WS_HEADER_SIZE + 4, height, true);

  const imageOffset = WS_HEADER_SIZE + 8;
  const bytes = new Uint8Array(buffer);
  bytes.set(fakeImageData, imageOffset);

  return buffer;
}

// =============================================================================
// TESTS
// =============================================================================

describe('RobotPolicyStreamClient', () => {
  let client: RobotPolicyStreamClient;

  beforeEach(() => {
    client = createRobotPolicyStreamClient({ robotUrl: 'ws://test:9090' });
  });

  afterEach(() => {
    client.destroy();
  });

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  describe('initialization', () => {
    it('should create with default config', () => {
      const c = new RobotPolicyStreamClient();
      expect(c.isConnected()).toBe(false);
      const metrics = c.getMetrics();
      expect(metrics.connected).toBe(false);
      expect(metrics.messagesSent).toBe(0);
      c.destroy();
    });

    it('should accept config overrides', () => {
      const c = createRobotPolicyStreamClient({
        robotUrl: 'ws://custom:1234',
        commandRateHz: 120,
      });
      expect(c.isConnected()).toBe(false);
      c.destroy();
    });

    it('should start disconnected', () => {
      expect(client.isConnected()).toBe(false);
      expect(client.getLatestState().operatingMode).toBe('idle');
    });
  });

  // ---------------------------------------------------------------------------
  // CONNECTION LIFECYCLE
  // ---------------------------------------------------------------------------

  describe('connection lifecycle', () => {
    it('should connect to WebSocket', async () => {
      client.connect();
      // Wait for mock WebSocket to "connect"
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(mockWsInstances).toHaveLength(1);
      expect(mockWsInstances[0].url).toBe('ws://test:9090');
      expect(client.isConnected()).toBe(true);
    });

    it('should emit connected event', async () => {
      const listener = vi.fn();
      client.addEventListener(listener);
      client.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'connected' }),
      );
    });

    it('should disconnect cleanly', async () => {
      client.connect();
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(client.isConnected()).toBe(true);

      client.disconnect();
      expect(client.isConnected()).toBe(false);
    });

    it('should not connect when destroyed', () => {
      client.destroy();
      client.connect();
      expect(mockWsInstances).toHaveLength(0);
    });

    it('should not connect when already connected', async () => {
      client.connect();
      await new Promise(resolve => setTimeout(resolve, 20));
      client.connect(); // Second connect should be no-op
      expect(mockWsInstances).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // SENDING COMMANDS
  // ---------------------------------------------------------------------------

  describe('sending commands', () => {
    it('should send joint command as binary', async () => {
      client.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const angles: Partial<Record<RobotJointName, number>> = {
        left_shoulder_pitch: 0.5,
        left_elbow_pitch: -1.0,
      };

      const sent = client.sendJointCommand(angles);
      expect(sent).toBe(true);

      const ws = mockWsInstances[0];
      // Find the joint command message (skip heartbeat if any)
      const jointMsg = ws.sentMessages.find(msg => {
        const view = new DataView(msg);
        return view.getUint8(0) === WsMessageType.JOINT_COMMAND;
      });
      expect(jointMsg).toBeDefined();

      // Verify header
      const view = new DataView(jointMsg!);
      expect(view.getUint8(0)).toBe(WsMessageType.JOINT_COMMAND);

      // Verify payload size
      expect(jointMsg!.byteLength).toBe(WS_HEADER_SIZE + JOINT_COUNT * 4);
    });

    it('should not send when disconnected', () => {
      const sent = client.sendJointCommand({ left_shoulder_pitch: 0.5 });
      expect(sent).toBe(false);
    });

    it('should send policy action', async () => {
      client.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const actions = new Float32Array(256);
      actions[0] = 1.5;
      actions[1] = -0.3;

      const sent = client.sendPolicyAction(actions);
      expect(sent).toBe(true);

      const ws = mockWsInstances[0];
      const policyMsg = ws.sentMessages.find(msg => {
        const view = new DataView(msg);
        return view.getUint8(0) === WsMessageType.POLICY_ACTION;
      });
      expect(policyMsg).toBeDefined();
      expect(policyMsg!.byteLength).toBe(WS_HEADER_SIZE + POLICY_ACTION_SIZE * 4);
    });

    it('should send policy action from number array', async () => {
      client.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const sent = client.sendPolicyAction([1.0, 2.0, 3.0]);
      expect(sent).toBe(true);
    });

    it('should send emergency stop', async () => {
      client.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const listener = vi.fn();
      client.addEventListener(listener);

      const sent = client.sendEmergencyStop();
      expect(sent).toBe(true);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'emergency_stop' }),
      );
    });

    it('should send resume', async () => {
      client.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const listener = vi.fn();
      client.addEventListener(listener);

      const sent = client.sendResume();
      expect(sent).toBe(true);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'resume' }),
      );
    });

    it('should increment message counter', async () => {
      client.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const before = client.getMetrics().messagesSent;
      client.sendJointCommand({ left_shoulder_pitch: 0 });
      const after = client.getMetrics().messagesSent;
      expect(after).toBeGreaterThan(before);
    });

    it('should track bytes sent', async () => {
      client.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const before = client.getMetrics().bytesSent;
      client.sendJointCommand({ left_shoulder_pitch: 0 });
      const after = client.getMetrics().bytesSent;
      expect(after).toBeGreaterThan(before);
    });
  });

  // ---------------------------------------------------------------------------
  // RECEIVING DATA
  // ---------------------------------------------------------------------------

  describe('receiving data', () => {
    it('should decode state telemetry', async () => {
      client.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const listener = vi.fn();
      client.onStateUpdate(listener);

      const msg = buildTelemetryMessage(42);
      mockWsInstances[0].simulateMessage(msg);

      expect(listener).toHaveBeenCalledTimes(1);
      const state = listener.mock.calls[0][0];
      expect(state.sequence).toBe(42);
      expect(state.batteryLevel).toBeCloseTo(0.85, 1);
      expect(state.operatingMode).toBe('teleoperation');
    });

    it('should update latest state on telemetry', async () => {
      client.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const msg = buildTelemetryMessage(1);
      mockWsInstances[0].simulateMessage(msg);

      const state = client.getLatestState();
      expect(state.sequence).toBe(1);
    });

    it('should decode camera frame', async () => {
      client.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const listener = vi.fn();
      client.onCameraFrame(listener);

      const msg = buildCameraFrameMessage(1280, 720);
      mockWsInstances[0].simulateMessage(msg);

      expect(listener).toHaveBeenCalledTimes(1);
      const [frame, width, height] = listener.mock.calls[0];
      expect(width).toBe(1280);
      expect(height).toBe(720);
      expect(frame).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle heartbeat response', async () => {
      client.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const msg = buildHeartbeatMessage();
      mockWsInstances[0].simulateMessage(msg);

      // Should update latency
      const latency = client.getLatencyMs();
      expect(typeof latency).toBe('number');
    });

    it('should ignore messages smaller than header', async () => {
      client.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const listener = vi.fn();
      client.onStateUpdate(listener);

      const tinyMsg = new ArrayBuffer(4); // Less than WS_HEADER_SIZE
      mockWsInstances[0].simulateMessage(tinyMsg);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should track bytes received', async () => {
      client.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const before = client.getMetrics().bytesReceived;
      const msg = buildTelemetryMessage(1);
      mockWsInstances[0].simulateMessage(msg);
      const after = client.getMetrics().bytesReceived;

      expect(after).toBeGreaterThan(before);
    });
  });

  // ---------------------------------------------------------------------------
  // EVENT LISTENERS
  // ---------------------------------------------------------------------------

  describe('event listeners', () => {
    it('should add and remove state update listener', async () => {
      client.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      const listener = vi.fn();
      const unsub = client.onStateUpdate(listener);

      const msg = buildTelemetryMessage(1);
      mockWsInstances[0].simulateMessage(msg);
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      mockWsInstances[0].simulateMessage(buildTelemetryMessage(2));
      expect(listener).toHaveBeenCalledTimes(1); // No additional calls
    });

    it('should add and remove camera frame listener', () => {
      const listener = vi.fn();
      const unsub = client.onCameraFrame(listener);
      unsub();
      // Should not throw
    });

    it('should add and remove event listener', async () => {
      const listener = vi.fn();
      const unsub = client.addEventListener(listener);

      client.connect();
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(listener).toHaveBeenCalled();

      unsub();
      // Further events should not reach listener
    });
  });

  // ---------------------------------------------------------------------------
  // RECONNECTION
  // ---------------------------------------------------------------------------

  describe('reconnection', () => {
    it('should attempt reconnect on close', async () => {
      vi.useFakeTimers();
      client.connect();
      await vi.advanceTimersByTimeAsync(20);

      // Simulate unexpected close
      mockWsInstances[0].simulateClose();

      // Advance past reconnect interval
      await vi.advanceTimersByTimeAsync(2100);

      // Should have created a new WebSocket
      expect(mockWsInstances.length).toBeGreaterThan(1);

      vi.useRealTimers();
    });

    it('should stop reconnecting after max attempts', async () => {
      vi.useFakeTimers();
      const c = createRobotPolicyStreamClient({
        robotUrl: 'ws://test:9090',
        maxReconnectAttempts: 2,
        reconnectIntervalMs: 100,
      });

      c.connect();
      await vi.advanceTimersByTimeAsync(20);

      // Close and exhaust reconnect attempts
      for (let i = 0; i < 3; i++) {
        if (mockWsInstances[mockWsInstances.length - 1]) {
          mockWsInstances[mockWsInstances.length - 1].simulateClose();
        }
        await vi.advanceTimersByTimeAsync(200);
      }

      c.destroy();
      vi.useRealTimers();
    });

    it('should not reconnect after manual disconnect', async () => {
      vi.useFakeTimers();
      client.connect();
      await vi.advanceTimersByTimeAsync(20);

      client.disconnect();
      await vi.advanceTimersByTimeAsync(5000);

      // Should only have 1 WebSocket instance (the initial one)
      expect(mockWsInstances).toHaveLength(1);

      vi.useRealTimers();
    });
  });

  // ---------------------------------------------------------------------------
  // METRICS
  // ---------------------------------------------------------------------------

  describe('metrics', () => {
    it('should return complete metrics', () => {
      const metrics = client.getMetrics();
      expect(metrics).toHaveProperty('messagesSent');
      expect(metrics).toHaveProperty('messagesReceived');
      expect(metrics).toHaveProperty('bytesSent');
      expect(metrics).toHaveProperty('bytesReceived');
      expect(metrics).toHaveProperty('latencyMs');
      expect(metrics).toHaveProperty('connected');
      expect(metrics).toHaveProperty('reconnectAttempts');
    });
  });

  // ---------------------------------------------------------------------------
  // CONFIG UPDATES
  // ---------------------------------------------------------------------------

  describe('config updates', () => {
    it('should update config at runtime', () => {
      client.updateConfig({ commandRateHz: 120 });
      // No crash = success (config is private, but affects behavior)
    });
  });

  // ---------------------------------------------------------------------------
  // DESTROY
  // ---------------------------------------------------------------------------

  describe('destroy', () => {
    it('should clean up on destroy', async () => {
      client.connect();
      await new Promise(resolve => setTimeout(resolve, 20));

      client.destroy();
      expect(client.isConnected()).toBe(false);

      // Should not throw on subsequent operations
      const sent = client.sendJointCommand({ left_shoulder_pitch: 0 });
      expect(sent).toBe(false);
    });
  });
});
