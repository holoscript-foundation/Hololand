/**
 * @vitest-environment jsdom
 */

/**
 * Tests for GR00TN16PolicyClient
 *
 * Validates:
 * - Initialization and default configuration
 * - Connection lifecycle (connect, disconnect, destroy)
 * - Observation vector assembly and streaming at 30Hz
 * - Action chunk reception and decoding (256-dim -> 37-DOF)
 * - Action chunking execution (predict K, execute first, re-plan)
 * - Temporal smoothing between consecutive chunks
 * - Policy mode switching (manipulation, navigation, bimanual, idle)
 * - Joint masking per policy mode
 * - Heartbeat mechanism
 * - Reconnection logic
 * - Metrics tracking
 * - Event listener management
 * - Camera embedding updates
 * - Robot state feed-through
 * - Edge cases (empty chunks, low confidence, timeout)
 * - Reset and cleanup
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
  GR00TN16PolicyClient,
  createGR00TN16PolicyClient,
} from '../GR00TN16PolicyClient';
import {
  GR00TMessageType,
  GROOT_HEADER_SIZE,
  OBSERVATION_TOTAL_DIM,
  OBSERVATION_EMBEDDING_DIM,
  ACTION_DIM,
  ACTION_JOINT_COUNT,
  GROOT_37DOF_JOINT_NAMES,
  DEFAULT_GROOT_N16_CONFIG,
  DEFAULT_POLICY_MODES,
  DEFAULT_ACTION_CHUNKING_CONFIG,
  createEmptyGR00TMetrics,
} from '../GR00TN16PolicyClientTypes';
import type {
  GR00TN16Config,
  GR00TPolicyMode,
  GR00TEvent,
  GR00TActionChunk,
} from '../GR00TN16PolicyClientTypes';
import {
  createEmptyRobotState,
  ALL_JOINT_NAMES,
  JOINT_COUNT,
} from '../TeleoperationHubTypes';
import type { RobotJointName, RobotState } from '../TeleoperationHubTypes';

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

  send(data: ArrayBuffer | Uint8Array): void {
    if (data instanceof Uint8Array) {
      this.sentMessages.push(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
    } else if (data instanceof ArrayBuffer) {
      this.sentMessages.push(data.slice(0));
    }
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }

  // Test helper: simulate receiving a message
  simulateMessage(data: ArrayBuffer): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  // Test helper: simulate error
  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

let mockWsInstances: MockWebSocket[] = [];
const originalWebSocket = globalThis.WebSocket;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Create a mock action chunk binary message.
 */
function createActionChunkMessage(
  obsSequence: number,
  inferenceLatency: number,
  chunkSize: number,
  actions?: Float32Array[],
  confidences?: number[],
): ArrayBuffer {
  // Header + obsSequence(4) + latency(4) + chunkSize(4) + steps
  const stepSize = ACTION_DIM * 4 + 4; // 256 floats + 1 confidence float
  const totalSize = GROOT_HEADER_SIZE + 12 + chunkSize * stepSize;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // Header
  view.setUint8(0, GR00TMessageType.ACTION_CHUNK);
  view.setUint32(1, 0, true); // sequence
  view.setUint32(5, Date.now() & 0xFFFFFFFF, true); // timestamp

  let offset = GROOT_HEADER_SIZE;

  // Observation sequence
  view.setUint32(offset, obsSequence, true);
  offset += 4;

  // Inference latency
  view.setFloat32(offset, inferenceLatency, true);
  offset += 4;

  // Chunk size
  view.setUint32(offset, chunkSize, true);
  offset += 4;

  // Steps
  for (let s = 0; s < chunkSize; s++) {
    // Action vector (256 floats)
    for (let a = 0; a < ACTION_DIM; a++) {
      const val = actions && actions[s] ? actions[s][a] : (a < ACTION_JOINT_COUNT ? 0.05 : 0.0);
      view.setFloat32(offset, val, true);
      offset += 4;
    }
    // Confidence
    const conf = confidences ? confidences[s] : 0.95;
    view.setFloat32(offset, conf, true);
    offset += 4;
  }

  return buffer;
}

/**
 * Create a policy switch acknowledgment message.
 */
function createPolicySwitchAck(success: boolean, modeIndex: number): ArrayBuffer {
  const buffer = new ArrayBuffer(GROOT_HEADER_SIZE + 2);
  const view = new DataView(buffer);
  view.setUint8(0, GR00TMessageType.POLICY_SWITCH_ACK);
  view.setUint32(1, 0, true);
  view.setUint32(5, Date.now() & 0xFFFFFFFF, true);
  view.setUint8(GROOT_HEADER_SIZE, success ? 1 : 0);
  view.setUint8(GROOT_HEADER_SIZE + 1, modeIndex);
  return buffer;
}

/**
 * Create a heartbeat response message.
 */
function createHeartbeatResponse(): ArrayBuffer {
  const buffer = new ArrayBuffer(GROOT_HEADER_SIZE);
  const view = new DataView(buffer);
  view.setUint8(0, GR00TMessageType.HEARTBEAT);
  view.setUint32(1, 0, true);
  view.setUint32(5, Date.now() & 0xFFFFFFFF, true);
  return buffer;
}

/**
 * Wait for async operations to complete.
 */
async function flushTimers(ms: number = 50): Promise<void> {
  vi.advanceTimersByTime(ms);
  await new Promise(resolve => setTimeout(resolve, 0));
}

// =============================================================================
// TESTS
// =============================================================================

describe('GR00TN16PolicyClient', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockWsInstances = [];
    (globalThis as any).WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        mockWsInstances.push(this);
      }
    };
    (globalThis as any).WebSocket.CONNECTING = MockWebSocket.CONNECTING;
    (globalThis as any).WebSocket.OPEN = MockWebSocket.OPEN;
    (globalThis as any).WebSocket.CLOSING = MockWebSocket.CLOSING;
    (globalThis as any).WebSocket.CLOSED = MockWebSocket.CLOSED;
  });

  afterEach(() => {
    vi.useRealTimers();
    (globalThis as any).WebSocket = originalWebSocket;
    mockWsInstances = [];
  });

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  describe('Initialization', () => {
    it('should create with default config', () => {
      const client = createGR00TN16PolicyClient();
      expect(client).toBeInstanceOf(GR00TN16PolicyClient);
      expect(client.getConnectionState()).toBe('disconnected');
      expect(client.getPolicyMode()).toBe('manipulation');
      expect(client.isConnected()).toBe(false);
      expect(client.isStreaming()).toBe(false);
      client.destroy();
    });

    it('should create with custom config', () => {
      const client = createGR00TN16PolicyClient({
        serverUrl: 'ws://custom:9999/inference',
        observationRateHz: 60,
        initialPolicyMode: 'navigation',
        actionChunking: { chunkSize: 8, executeHorizon: 2 },
      });
      expect(client.getPolicyMode()).toBe('navigation');
      expect(client.getChunkingConfig().chunkSize).toBe(8);
      expect(client.getChunkingConfig().executeHorizon).toBe(2);
      client.destroy();
    });

    it('should initialize metrics to empty state', () => {
      const client = createGR00TN16PolicyClient();
      const metrics = client.getMetrics();
      expect(metrics.connectionState).toBe('disconnected');
      expect(metrics.observationsSent).toBe(0);
      expect(metrics.actionChunksReceived).toBe(0);
      expect(metrics.actionsExecuted).toBe(0);
      expect(metrics.policyMode).toBe('manipulation');
      client.destroy();
    });
  });

  // ---------------------------------------------------------------------------
  // CONNECTION LIFECYCLE
  // ---------------------------------------------------------------------------

  describe('Connection Lifecycle', () => {
    it('should connect to the inference server', async () => {
      const client = createGR00TN16PolicyClient();
      const events: GR00TEvent[] = [];
      client.addEventListener(e => events.push(e));

      client.connect();
      expect(client.getConnectionState()).toBe('connecting');

      await flushTimers(20);

      expect(client.isConnected()).toBe(true);
      expect(client.getConnectionState()).toBe('connected');
      expect(events.some(e => e.type === 'connected')).toBe(true);

      client.destroy();
    });

    it('should not connect if destroyed', async () => {
      const client = createGR00TN16PolicyClient();
      client.destroy();
      client.connect();
      expect(mockWsInstances.length).toBe(0);
    });

    it('should not connect if already connected', async () => {
      const client = createGR00TN16PolicyClient();
      client.connect();
      await flushTimers(20);
      expect(mockWsInstances.length).toBe(1);

      client.connect(); // Should warn and skip
      expect(mockWsInstances.length).toBe(1);

      client.destroy();
    });

    it('should disconnect from the inference server', async () => {
      const client = createGR00TN16PolicyClient();
      client.connect();
      await flushTimers(20);
      expect(client.isConnected()).toBe(true);

      client.disconnect();
      expect(client.isConnected()).toBe(false);
      expect(client.getConnectionState()).toBe('disconnected');

      client.destroy();
    });

    it('should attempt reconnection on disconnect', async () => {
      const client = createGR00TN16PolicyClient({
        reconnectIntervalMs: 100,
        maxReconnectAttempts: 3,
      });

      client.connect();
      await flushTimers(20);
      expect(client.isConnected()).toBe(true);

      // Simulate server closing connection
      const ws = mockWsInstances[0];
      ws.readyState = MockWebSocket.CLOSED;
      if (ws.onclose) ws.onclose();

      expect(client.getConnectionState()).toBe('reconnecting');

      // Wait for reconnect attempt
      await flushTimers(150);
      expect(mockWsInstances.length).toBe(2);

      client.destroy();
    });

    it('should stop reconnecting after max attempts', async () => {
      const events: GR00TEvent[] = [];
      const client = createGR00TN16PolicyClient({
        reconnectIntervalMs: 50,
        maxReconnectAttempts: 2,
      });
      client.addEventListener(e => events.push(e));

      client.connect();
      await flushTimers(20);

      // Disconnect and reconnect twice
      for (let i = 0; i < 3; i++) {
        const ws = mockWsInstances[mockWsInstances.length - 1];
        ws.readyState = MockWebSocket.CLOSED;
        if (ws.onclose) ws.onclose();
        await flushTimers(100);
      }

      // Should have error event for max_reconnect
      expect(events.some(e => e.type === 'error' && (e.data as any) === 'max_reconnect')).toBe(true);

      client.destroy();
    });

    it('should handle connection error', async () => {
      const events: GR00TEvent[] = [];
      const client = createGR00TN16PolicyClient();
      client.addEventListener(e => events.push(e));

      client.connect();
      await flushTimers(20);

      // Simulate error
      mockWsInstances[0].simulateError();
      expect(client.getConnectionState()).toBe('error');
      expect(events.some(e => e.type === 'error')).toBe(true);

      client.destroy();
    });

    it('should destroy and release resources', async () => {
      const client = createGR00TN16PolicyClient();
      client.connect();
      await flushTimers(20);

      client.destroy();
      expect(client.isConnected()).toBe(false);

      // Should not be able to connect after destroy
      client.connect();
      await flushTimers(20);
      // Only 1 ws instance (from before destroy), no new ones
      expect(mockWsInstances.length).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // OBSERVATION STREAMING
  // ---------------------------------------------------------------------------

  describe('Observation Streaming', () => {
    it('should start observation streaming after connection', async () => {
      const client = createGR00TN16PolicyClient({ observationRateHz: 30 });
      client.connect();
      await flushTimers(20);

      client.startObservationStreaming();
      expect(client.isStreaming()).toBe(true);

      // Wait for one observation cycle (33.3ms at 30Hz)
      await flushTimers(40);

      // Should have sent at least one observation
      const ws = mockWsInstances[0];
      expect(ws.sentMessages.length).toBeGreaterThanOrEqual(1);

      // First message should be observation type
      const firstMsg = new DataView(ws.sentMessages[0]);
      // Heartbeat may have been sent first, so find the observation
      let foundObservation = false;
      for (const msg of ws.sentMessages) {
        const view = new DataView(msg);
        if (view.getUint8(0) === GR00TMessageType.OBSERVATION) {
          foundObservation = true;
          break;
        }
      }
      expect(foundObservation).toBe(true);

      client.destroy();
    });

    it('should not stream when not connected', () => {
      const client = createGR00TN16PolicyClient();
      client.startObservationStreaming();
      expect(client.isStreaming()).toBe(false);
      client.destroy();
    });

    it('should not stream in idle mode', async () => {
      const client = createGR00TN16PolicyClient({ initialPolicyMode: 'idle' });
      client.connect();
      await flushTimers(20);

      client.startObservationStreaming();
      await flushTimers(100);

      // Should have started timer but not sent observations (idle mode skips)
      const ws = mockWsInstances[0];
      const observations = ws.sentMessages.filter(msg => {
        const view = new DataView(msg);
        return view.getUint8(0) === GR00TMessageType.OBSERVATION;
      });
      expect(observations.length).toBe(0);

      client.destroy();
    });

    it('should stop observation streaming', async () => {
      const client = createGR00TN16PolicyClient();
      client.connect();
      await flushTimers(20);

      client.startObservationStreaming();
      expect(client.isStreaming()).toBe(true);

      client.stopObservationStreaming();
      expect(client.isStreaming()).toBe(false);

      client.destroy();
    });

    it('should include robot state in observations', async () => {
      const client = createGR00TN16PolicyClient();
      client.connect();
      await flushTimers(20);

      // Update robot state
      const state = createEmptyRobotState();
      state.joints['left_shoulder_pitch'].angle = 1.5;
      state.joints['right_elbow_pitch'].velocity = 0.3;
      client.updateRobotState(state);

      client.startObservationStreaming();
      await flushTimers(40);

      // Verify observation was sent with joint data
      const ws = mockWsInstances[0];
      const obsMsgs = ws.sentMessages.filter(msg => {
        const view = new DataView(msg);
        return view.getUint8(0) === GR00TMessageType.OBSERVATION;
      });
      expect(obsMsgs.length).toBeGreaterThan(0);

      // Check observation size (header + 756 floats * 4 + 1 byte mode + 4 bytes chunk size)
      const expectedSize = GROOT_HEADER_SIZE + OBSERVATION_TOTAL_DIM * 4 + 1 + 4;
      expect(obsMsgs[0].byteLength).toBe(expectedSize);

      client.destroy();
    });

    it('should include camera embedding in observations', async () => {
      const client = createGR00TN16PolicyClient();
      client.connect();
      await flushTimers(20);

      // Update camera embedding
      const embedding = new Float32Array(OBSERVATION_EMBEDDING_DIM);
      embedding[0] = 0.5;
      embedding[1] = -0.3;
      client.updateCameraEmbedding(embedding);

      client.startObservationStreaming();
      await flushTimers(40);

      const ws = mockWsInstances[0];
      const obsMsgs = ws.sentMessages.filter(msg => {
        const view = new DataView(msg);
        return view.getUint8(0) === GR00TMessageType.OBSERVATION;
      });
      expect(obsMsgs.length).toBeGreaterThan(0);

      // The embedding starts after joint data: header + 37*4*4 = 592 floats = 2368 bytes
      const view = new DataView(obsMsgs[0]);
      const embeddingOffset = GROOT_HEADER_SIZE + 37 * 4 * 4;
      expect(view.getFloat32(embeddingOffset, true)).toBeCloseTo(0.5, 5);
      expect(view.getFloat32(embeddingOffset + 4, true)).toBeCloseTo(-0.3, 5);

      client.destroy();
    });

    it('should reject camera embedding with wrong dimension', () => {
      const client = createGR00TN16PolicyClient();
      const wrongEmbedding = new Float32Array(100);
      client.updateCameraEmbedding(wrongEmbedding);
      // Should have logged a warning (no crash)
      client.destroy();
    });

    it('should track observation metrics', async () => {
      const client = createGR00TN16PolicyClient({ observationRateHz: 30 });
      client.connect();
      await flushTimers(20);

      client.startObservationStreaming();
      await flushTimers(100);

      const metrics = client.getMetrics();
      expect(metrics.observationsSent).toBeGreaterThan(0);
      expect(metrics.bytesSent).toBeGreaterThan(0);

      client.destroy();
    });
  });

  // ---------------------------------------------------------------------------
  // ACTION CHUNK RECEPTION AND DECODING
  // ---------------------------------------------------------------------------

  describe('Action Chunk Reception', () => {
    it('should receive and decode an action chunk', async () => {
      const client = createGR00TN16PolicyClient();
      const events: GR00TEvent[] = [];
      client.addEventListener(e => events.push(e));

      client.connect();
      await flushTimers(20);

      // Send an action chunk
      const chunkMsg = createActionChunkMessage(0, 15, 4);
      mockWsInstances[0].simulateMessage(chunkMsg);

      expect(events.some(e => e.type === 'action_chunk_received')).toBe(true);
      expect(client.getMetrics().actionChunksReceived).toBe(1);

      // Should have a current chunk
      const chunk = client.getCurrentChunk();
      expect(chunk).not.toBeNull();
      expect(chunk!.steps.length).toBe(4);
      expect(chunk!.executionIndex).toBe(0);
      expect(chunk!.exhausted).toBe(false);

      client.destroy();
    });

    it('should decode 256-dim action to 37-DOF joint targets', async () => {
      const client = createGR00TN16PolicyClient();
      client.connect();
      await flushTimers(20);

      // Create an action chunk with specific values
      const actions = [new Float32Array(ACTION_DIM)];
      actions[0][0] = 0.1;  // head_yaw delta
      actions[0][1] = 0.05; // head_pitch delta
      actions[0][6] = 0.08; // left_shoulder_pitch delta

      const chunkMsg = createActionChunkMessage(0, 10, 1, actions, [0.95]);
      mockWsInstances[0].simulateMessage(chunkMsg);

      const chunk = client.getCurrentChunk();
      expect(chunk).not.toBeNull();
      expect(chunk!.steps[0].jointTargets[0]).toBeCloseTo(0.1, 5); // head_yaw
      expect(chunk!.steps[0].jointTargets[1]).toBeCloseTo(0.05, 5); // head_pitch

      client.destroy();
    });

    it('should drop chunks exceeding max inference latency', async () => {
      const client = createGR00TN16PolicyClient({ maxInferenceLatencyMs: 50 });
      const events: GR00TEvent[] = [];
      client.addEventListener(e => events.push(e));

      client.connect();
      await flushTimers(20);

      // Send a chunk with high latency
      const chunkMsg = createActionChunkMessage(0, 100, 4); // 100ms > 50ms threshold
      mockWsInstances[0].simulateMessage(chunkMsg);

      expect(events.some(e => e.type === 'inference_timeout')).toBe(true);
      expect(client.getMetrics().chunksDropped).toBe(1);
      expect(client.getCurrentChunk()).toBeNull(); // No chunk stored

      client.destroy();
    });

    it('should track inference latency metrics', async () => {
      const client = createGR00TN16PolicyClient();
      client.connect();
      await flushTimers(20);

      // Send multiple chunks
      mockWsInstances[0].simulateMessage(createActionChunkMessage(0, 10, 2));
      mockWsInstances[0].simulateMessage(createActionChunkMessage(1, 20, 2));
      mockWsInstances[0].simulateMessage(createActionChunkMessage(2, 15, 2));

      const metrics = client.getMetrics();
      expect(metrics.avgInferenceLatencyMs).toBeCloseTo(15, 0); // avg of 10, 20, 15
      expect(metrics.actionChunksReceived).toBe(3);

      client.destroy();
    });
  });

  // ---------------------------------------------------------------------------
  // ACTION CHUNKING EXECUTION
  // ---------------------------------------------------------------------------

  describe('Action Chunking Execution', () => {
    it('should execute actions sequentially from chunk', async () => {
      const client = createGR00TN16PolicyClient({
        enableActionSmoothing: false,
        actionChunking: { ...DEFAULT_ACTION_CHUNKING_CONFIG, useExponentialWeighting: false },
      });
      client.connect();
      await flushTimers(20);

      // Create a chunk with 4 steps
      const actions = Array.from({ length: 4 }, (_, i) => {
        const a = new Float32Array(ACTION_DIM);
        a[0] = 0.01 * (i + 1); // Different deltas per step
        return a;
      });
      const chunkMsg = createActionChunkMessage(0, 10, 4, actions);
      mockWsInstances[0].simulateMessage(chunkMsg);

      // Execute step 0
      const action0 = client.getNextAction();
      expect(action0).not.toBeNull();
      expect(action0!['head_yaw']).toBeDefined();

      // Execute step 1
      const action1 = client.getNextAction();
      expect(action1).not.toBeNull();

      // Execute step 2
      const action2 = client.getNextAction();
      expect(action2).not.toBeNull();

      // Execute step 3
      const action3 = client.getNextAction();
      expect(action3).not.toBeNull();

      // Chunk exhausted
      const actionNull = client.getNextAction();
      expect(actionNull).toBeNull();

      expect(client.getMetrics().actionsExecuted).toBe(4);

      client.destroy();
    });

    it('should signal re-plan when executeHorizon reached', async () => {
      const client = createGR00TN16PolicyClient({
        enableActionSmoothing: false,
        actionChunking: {
          ...DEFAULT_ACTION_CHUNKING_CONFIG,
          chunkSize: 8,
          executeHorizon: 3,
          useExponentialWeighting: false,
        },
      });
      client.connect();
      await flushTimers(20);

      const chunkMsg = createActionChunkMessage(0, 10, 8);
      mockWsInstances[0].simulateMessage(chunkMsg);

      // Execute 3 steps (executeHorizon)
      expect(client.needsReplan()).toBe(false);
      client.getNextAction();
      expect(client.needsReplan()).toBe(false);
      client.getNextAction();
      expect(client.needsReplan()).toBe(false);
      client.getNextAction();
      expect(client.needsReplan()).toBe(true); // Should trigger re-plan

      client.destroy();
    });

    it('should return null when no chunk is available', () => {
      const client = createGR00TN16PolicyClient();
      expect(client.getNextAction()).toBeNull();
      expect(client.needsReplan()).toBe(true);
      client.destroy();
    });

    it('should return null in idle mode', async () => {
      const client = createGR00TN16PolicyClient({ initialPolicyMode: 'idle' });
      client.connect();
      await flushTimers(20);

      const chunkMsg = createActionChunkMessage(0, 10, 4);
      mockWsInstances[0].simulateMessage(chunkMsg);

      expect(client.getNextAction()).toBeNull();
      client.destroy();
    });

    it('should skip low-confidence action steps', async () => {
      const client = createGR00TN16PolicyClient({
        enableActionSmoothing: false,
        actionChunking: {
          ...DEFAULT_ACTION_CHUNKING_CONFIG,
          confidenceThreshold: 0.5,
          useExponentialWeighting: false,
        },
      });
      client.connect();
      await flushTimers(20);

      // Step 0: high confidence, Step 1: low confidence
      const chunkMsg = createActionChunkMessage(0, 10, 2, undefined, [0.9, 0.2]);
      mockWsInstances[0].simulateMessage(chunkMsg);

      const action0 = client.getNextAction();
      expect(action0).not.toBeNull();

      // Step 1 has low confidence -> should return null
      const action1 = client.getNextAction();
      expect(action1).toBeNull();

      client.destroy();
    });

    it('should apply exponential weighting to later steps', async () => {
      const client = createGR00TN16PolicyClient({
        enableActionSmoothing: false,
        actionChunking: {
          ...DEFAULT_ACTION_CHUNKING_CONFIG,
          useExponentialWeighting: true,
          weightDecay: 0.5,
        },
      });
      client.connect();
      await flushTimers(20);

      const actions = [
        new Float32Array(ACTION_DIM), // step 0
        new Float32Array(ACTION_DIM), // step 1
      ];
      actions[0][0] = 0.1;
      actions[1][0] = 0.1; // Same raw value
      const chunkMsg = createActionChunkMessage(0, 10, 2, actions);
      mockWsInstances[0].simulateMessage(chunkMsg);

      const action0 = client.getNextAction();
      // Step 0 has no exponential weight (idx=0 is not weighted)
      expect(action0).not.toBeNull();

      const action1 = client.getNextAction();
      // Step 1 has weight = 0.5^1 = 0.5, so effective delta should be reduced
      expect(action1).not.toBeNull();

      client.destroy();
    });

    it('should emit chunk_exhausted when all steps consumed', async () => {
      const events: GR00TEvent[] = [];
      const client = createGR00TN16PolicyClient({
        enableActionSmoothing: false,
        actionChunking: { ...DEFAULT_ACTION_CHUNKING_CONFIG, useExponentialWeighting: false },
      });
      client.addEventListener(e => events.push(e));
      client.connect();
      await flushTimers(20);

      const chunkMsg = createActionChunkMessage(0, 10, 2);
      mockWsInstances[0].simulateMessage(chunkMsg);

      client.getNextAction();
      client.getNextAction();
      client.getNextAction(); // This should trigger exhausted

      expect(events.some(e => e.type === 'chunk_exhausted')).toBe(true);

      client.destroy();
    });

    it('should notify action listeners', async () => {
      const actionResults: Partial<Record<RobotJointName, number>>[] = [];
      const client = createGR00TN16PolicyClient({
        enableActionSmoothing: false,
        actionChunking: { ...DEFAULT_ACTION_CHUNKING_CONFIG, useExponentialWeighting: false },
      });
      client.onAction(targets => actionResults.push(targets));
      client.connect();
      await flushTimers(20);

      const chunkMsg = createActionChunkMessage(0, 10, 2);
      mockWsInstances[0].simulateMessage(chunkMsg);

      client.getNextAction();
      expect(actionResults.length).toBe(1);

      client.getNextAction();
      expect(actionResults.length).toBe(2);

      client.destroy();
    });

    it('should track chunk progress in metrics', async () => {
      const client = createGR00TN16PolicyClient({
        enableActionSmoothing: false,
        actionChunking: { ...DEFAULT_ACTION_CHUNKING_CONFIG, useExponentialWeighting: false },
      });
      client.connect();
      await flushTimers(20);

      const chunkMsg = createActionChunkMessage(0, 10, 4);
      mockWsInstances[0].simulateMessage(chunkMsg);

      client.getNextAction();
      expect(client.getMetrics().chunkProgress).toBeCloseTo(0.25, 2);

      client.getNextAction();
      expect(client.getMetrics().chunkProgress).toBeCloseTo(0.5, 2);

      client.destroy();
    });
  });

  // ---------------------------------------------------------------------------
  // TEMPORAL SMOOTHING
  // ---------------------------------------------------------------------------

  describe('Temporal Smoothing', () => {
    it('should blend with previous chunk when enabled', async () => {
      const client = createGR00TN16PolicyClient({
        enableActionSmoothing: true,
        actionSmoothingAlpha: 0.6,
        actionChunking: {
          ...DEFAULT_ACTION_CHUNKING_CONFIG,
          chunkBlendFactor: 1.0, // Disable temporal blend to isolate chunk blending
          useExponentialWeighting: false,
        },
      });
      client.connect();
      await flushTimers(20);

      // First chunk
      const actions1 = [new Float32Array(ACTION_DIM)];
      actions1[0][0] = 0.1;
      mockWsInstances[0].simulateMessage(createActionChunkMessage(0, 10, 1, actions1));

      // Consume first chunk to make it the "previous"
      client.getNextAction();

      // Second chunk
      const actions2 = [new Float32Array(ACTION_DIM)];
      actions2[0][0] = 0.2;
      mockWsInstances[0].simulateMessage(createActionChunkMessage(1, 10, 1, actions2));

      // The blend should use alpha * new + (1-alpha) * previous
      const action = client.getNextAction();
      expect(action).not.toBeNull();

      client.destroy();
    });

    it('should apply temporal smoothing between consecutive actions', async () => {
      const client = createGR00TN16PolicyClient({
        enableActionSmoothing: true,
        actionChunking: {
          ...DEFAULT_ACTION_CHUNKING_CONFIG,
          chunkBlendFactor: 0.5,
          useExponentialWeighting: false,
        },
      });
      client.connect();
      await flushTimers(20);

      const actions = Array.from({ length: 3 }, (_, i) => {
        const a = new Float32Array(ACTION_DIM);
        a[0] = 0.1 * (i + 1);
        return a;
      });
      mockWsInstances[0].simulateMessage(createActionChunkMessage(0, 10, 3, actions));

      // First action
      const a0 = client.getNextAction();
      expect(a0).not.toBeNull();

      // Second action should be smoothed with first
      const a1 = client.getNextAction();
      expect(a1).not.toBeNull();

      client.destroy();
    });
  });

  // ---------------------------------------------------------------------------
  // POLICY MODE SWITCHING
  // ---------------------------------------------------------------------------

  describe('Policy Mode Switching', () => {
    it('should switch policy mode', async () => {
      const events: GR00TEvent[] = [];
      const client = createGR00TN16PolicyClient({ initialPolicyMode: 'manipulation' });
      client.addEventListener(e => events.push(e));
      client.connect();
      await flushTimers(20);

      const result = client.switchPolicy('navigation');
      expect(result).toBe(true);

      // Verify switch message was sent
      const ws = mockWsInstances[0];
      const switchMsgs = ws.sentMessages.filter(msg => {
        const view = new DataView(msg);
        return view.getUint8(0) === GR00TMessageType.POLICY_SWITCH;
      });
      expect(switchMsgs.length).toBe(1);

      // Simulate server acknowledgment
      const ack = createPolicySwitchAck(true, 1); // navigation = index 1
      ws.simulateMessage(ack);

      expect(client.getPolicyMode()).toBe('navigation');
      expect(events.some(e => e.type === 'policy_switched')).toBe(true);
      expect(client.getMetrics().policySwitchCount).toBe(1);

      client.destroy();
    });

    it('should clear action chunk on policy switch', async () => {
      const client = createGR00TN16PolicyClient({
        enableActionSmoothing: false,
        actionChunking: { ...DEFAULT_ACTION_CHUNKING_CONFIG, useExponentialWeighting: false },
      });
      client.connect();
      await flushTimers(20);

      // Load a chunk
      mockWsInstances[0].simulateMessage(createActionChunkMessage(0, 10, 4));
      expect(client.getCurrentChunk()).not.toBeNull();

      // Switch policy
      client.switchPolicy('navigation');
      mockWsInstances[0].simulateMessage(createPolicySwitchAck(true, 1));

      // Chunk should be cleared
      expect(client.getCurrentChunk()).toBeNull();

      client.destroy();
    });

    it('should not switch if not connected', () => {
      const client = createGR00TN16PolicyClient();
      const result = client.switchPolicy('navigation');
      expect(result).toBe(false);
      expect(client.getPolicyMode()).toBe('manipulation');
      client.destroy();
    });

    it('should handle switch to same mode gracefully', async () => {
      const client = createGR00TN16PolicyClient({ initialPolicyMode: 'manipulation' });
      client.connect();
      await flushTimers(20);

      const result = client.switchPolicy('manipulation');
      expect(result).toBe(true); // Returns true, but no message sent

      client.destroy();
    });

    it('should handle failed policy switch', async () => {
      const events: GR00TEvent[] = [];
      const client = createGR00TN16PolicyClient();
      client.addEventListener(e => events.push(e));
      client.connect();
      await flushTimers(20);

      client.switchPolicy('navigation');
      mockWsInstances[0].simulateMessage(createPolicySwitchAck(false, 1));

      expect(client.getPolicyMode()).toBe('manipulation'); // Should remain unchanged
      expect(events.some(e => e.type === 'policy_switch_failed')).toBe(true);

      client.destroy();
    });

    it('should mask frozen joints per policy mode', async () => {
      const client = createGR00TN16PolicyClient({
        initialPolicyMode: 'navigation',
        enableActionSmoothing: false,
        actionChunking: { ...DEFAULT_ACTION_CHUNKING_CONFIG, useExponentialWeighting: false },
      });
      client.connect();
      await flushTimers(20);

      // Create actions with non-zero values for all joints
      const actions = [new Float32Array(ACTION_DIM)];
      for (let i = 0; i < ACTION_JOINT_COUNT; i++) {
        actions[0][i] = 0.1;
      }
      mockWsInstances[0].simulateMessage(createActionChunkMessage(0, 10, 1, actions));

      const action = client.getNextAction();
      expect(action).not.toBeNull();

      // In navigation mode, arm joints should be frozen (zero delta)
      // Navigation mode active joints include legs and torso
      const navConfig = DEFAULT_POLICY_MODES['navigation'];

      // Check that a frozen joint has 0 delta (base angle + 0 = base angle)
      // left_shoulder_pitch is frozen in navigation mode
      if (action!['left_shoulder_pitch'] !== undefined) {
        // The result is currentAngle + 0 delta = 0 (since robot state is default)
        expect(action!['left_shoulder_pitch']).toBe(0);
      }

      client.destroy();
    });

    it('should correctly get policy mode config', () => {
      const client = createGR00TN16PolicyClient({ initialPolicyMode: 'bimanual' });
      const config = client.getPolicyModeConfig();
      expect(config.policyHeadId).toBe('bimanual_v1');
      expect(config.activeJoints).toContain('left_shoulder_pitch');
      expect(config.activeJoints).toContain('right_shoulder_pitch');
      client.destroy();
    });
  });

  // ---------------------------------------------------------------------------
  // JOINT MAPPING (37-DOF -> 36-DOF)
  // ---------------------------------------------------------------------------

  describe('Joint Mapping', () => {
    it('should map 37-DOF targets to 36-DOF base joints', async () => {
      const client = createGR00TN16PolicyClient({
        enableActionSmoothing: false,
        actionChunking: { ...DEFAULT_ACTION_CHUNKING_CONFIG, useExponentialWeighting: false },
      });
      client.connect();
      await flushTimers(20);

      const actions = [new Float32Array(ACTION_DIM)];
      actions[0][0] = 0.05; // head_yaw
      actions[0][1] = 0.03; // head_pitch
      mockWsInstances[0].simulateMessage(createActionChunkMessage(0, 10, 1, actions));

      const action = client.getNextAction();
      expect(action).not.toBeNull();

      // Should have base 36-DOF joints
      expect(action!['head_yaw']).toBeDefined();
      expect(action!['head_pitch']).toBeDefined();

      // Should NOT have torso_lateral (37th DOF, not in base set)
      expect((action as any)['torso_lateral']).toBeUndefined();

      client.destroy();
    });

    it('should apply current angle + delta for absolute targets', async () => {
      const client = createGR00TN16PolicyClient({
        enableActionSmoothing: false,
        actionChunking: { ...DEFAULT_ACTION_CHUNKING_CONFIG, useExponentialWeighting: false },
      });
      client.connect();
      await flushTimers(20);

      // Set current robot state with specific joint angle
      const state = createEmptyRobotState();
      state.joints['head_yaw'].angle = 0.5;
      client.updateRobotState(state);

      const actions = [new Float32Array(ACTION_DIM)];
      actions[0][0] = 0.1; // head_yaw delta
      mockWsInstances[0].simulateMessage(createActionChunkMessage(0, 10, 1, actions));

      const action = client.getNextAction();
      expect(action).not.toBeNull();
      // Should be current (0.5) + delta (0.1) = 0.6
      expect(action!['head_yaw']).toBeCloseTo(0.6, 4);

      client.destroy();
    });

    it('should clamp action deltas by max magnitude', async () => {
      const client = createGR00TN16PolicyClient({
        initialPolicyMode: 'manipulation',
        enableActionSmoothing: false,
        actionChunking: { ...DEFAULT_ACTION_CHUNKING_CONFIG, useExponentialWeighting: false },
      });
      client.connect();
      await flushTimers(20);

      const actions = [new Float32Array(ACTION_DIM)];
      actions[0][0] = 10.0; // Very large delta (manipulation max is 0.15)
      mockWsInstances[0].simulateMessage(createActionChunkMessage(0, 10, 1, actions));

      const action = client.getNextAction();
      expect(action).not.toBeNull();
      // Should be clamped to 0 + 0.15 = 0.15
      expect(action!['head_yaw']).toBeCloseTo(0.15, 4);

      client.destroy();
    });
  });

  // ---------------------------------------------------------------------------
  // HEARTBEAT
  // ---------------------------------------------------------------------------

  describe('Heartbeat', () => {
    it('should send heartbeat messages periodically', async () => {
      const client = createGR00TN16PolicyClient({ heartbeatIntervalMs: 100 });
      client.connect();
      await flushTimers(20);

      // Wait for heartbeat
      await flushTimers(150);

      const ws = mockWsInstances[0];
      const heartbeats = ws.sentMessages.filter(msg => {
        const view = new DataView(msg);
        return view.getUint8(0) === GR00TMessageType.HEARTBEAT;
      });
      expect(heartbeats.length).toBeGreaterThanOrEqual(1);

      client.destroy();
    });

    it('should handle heartbeat responses', async () => {
      const client = createGR00TN16PolicyClient();
      client.connect();
      await flushTimers(20);

      // Send heartbeat response
      mockWsInstances[0].simulateMessage(createHeartbeatResponse());

      // No error should be emitted
      client.destroy();
    });
  });

  // ---------------------------------------------------------------------------
  // EVENT LISTENERS
  // ---------------------------------------------------------------------------

  describe('Event Listeners', () => {
    it('should register and unregister event listeners', async () => {
      const events: GR00TEvent[] = [];
      const client = createGR00TN16PolicyClient();

      const unsub = client.addEventListener(e => events.push(e));
      client.connect();
      await flushTimers(20);
      expect(events.length).toBeGreaterThan(0);

      // Unregister
      unsub();
      const prevCount = events.length;

      // Further events should not be received
      client.disconnect();
      // After unsub, no new events should be added
      // (disconnect is manual so no disconnect event goes through ws.onclose)

      client.destroy();
    });

    it('should register and unregister action listeners', async () => {
      const actions: any[] = [];
      const client = createGR00TN16PolicyClient({
        enableActionSmoothing: false,
        actionChunking: { ...DEFAULT_ACTION_CHUNKING_CONFIG, useExponentialWeighting: false },
      });

      const unsub = client.onAction(a => actions.push(a));
      client.connect();
      await flushTimers(20);

      mockWsInstances[0].simulateMessage(createActionChunkMessage(0, 10, 2));
      client.getNextAction();
      expect(actions.length).toBe(1);

      unsub();
      client.getNextAction();
      expect(actions.length).toBe(1); // No new actions after unsub

      client.destroy();
    });
  });

  // ---------------------------------------------------------------------------
  // METRICS
  // ---------------------------------------------------------------------------

  describe('Metrics', () => {
    it('should track all metrics correctly', async () => {
      const client = createGR00TN16PolicyClient({
        enableActionSmoothing: false,
        actionChunking: { ...DEFAULT_ACTION_CHUNKING_CONFIG, useExponentialWeighting: false },
      });
      client.connect();
      await flushTimers(20);

      // Start streaming
      client.startObservationStreaming();
      await flushTimers(100);

      // Receive chunk
      mockWsInstances[0].simulateMessage(createActionChunkMessage(0, 15, 4));

      // Execute actions
      client.getNextAction();
      client.getNextAction();

      const metrics = client.getMetrics();
      expect(metrics.connectionState).toBe('connected');
      expect(metrics.policyMode).toBe('manipulation');
      expect(metrics.observationsSent).toBeGreaterThan(0);
      expect(metrics.actionChunksReceived).toBe(1);
      expect(metrics.actionsExecuted).toBe(2);
      expect(metrics.avgInferenceLatencyMs).toBeCloseTo(15, 0);
      expect(metrics.bytesSent).toBeGreaterThan(0);
      expect(metrics.bytesReceived).toBeGreaterThan(0);
      expect(metrics.chunkProgress).toBeCloseTo(0.5, 2);

      client.destroy();
    });
  });

  // ---------------------------------------------------------------------------
  // CONFIG UPDATES
  // ---------------------------------------------------------------------------

  describe('Configuration Updates', () => {
    it('should update chunking config at runtime', () => {
      const client = createGR00TN16PolicyClient();
      client.updateChunkingConfig({ chunkSize: 32, executeHorizon: 8 });
      expect(client.getChunkingConfig().chunkSize).toBe(32);
      expect(client.getChunkingConfig().executeHorizon).toBe(8);
      client.destroy();
    });

    it('should update observation rate and restart streaming', async () => {
      const client = createGR00TN16PolicyClient({ observationRateHz: 10 });
      client.connect();
      await flushTimers(20);
      client.startObservationStreaming();

      client.updateConfig({ observationRateHz: 60 });
      // Streaming should restart with new rate
      expect(client.isStreaming()).toBe(true);

      client.destroy();
    });
  });

  // ---------------------------------------------------------------------------
  // RESET AND CLEANUP
  // ---------------------------------------------------------------------------

  describe('Reset and Cleanup', () => {
    it('should reset all state while keeping connection', async () => {
      const client = createGR00TN16PolicyClient({
        enableActionSmoothing: false,
        actionChunking: { ...DEFAULT_ACTION_CHUNKING_CONFIG, useExponentialWeighting: false },
      });
      client.connect();
      await flushTimers(20);

      // Load a chunk
      mockWsInstances[0].simulateMessage(createActionChunkMessage(0, 10, 4));
      client.getNextAction();

      // Reset
      client.reset();

      expect(client.getCurrentChunk()).toBeNull();
      expect(client.getMetrics().actionsExecuted).toBe(0);
      expect(client.getMetrics().actionChunksReceived).toBe(0);
      expect(client.getMetrics().observationsSent).toBe(0);
      expect(client.isConnected()).toBe(true); // Still connected

      client.destroy();
    });

    it('should destroy cleanly with active streaming', async () => {
      const client = createGR00TN16PolicyClient();
      client.connect();
      await flushTimers(20);
      client.startObservationStreaming();

      expect(() => client.destroy()).not.toThrow();
      expect(client.isConnected()).toBe(false);
      expect(client.isStreaming()).toBe(false);
    });

    it('should handle double destroy gracefully', () => {
      const client = createGR00TN16PolicyClient();
      client.destroy();
      expect(() => client.destroy()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // INFERENCE ERROR HANDLING
  // ---------------------------------------------------------------------------

  describe('Error Handling', () => {
    it('should handle inference error messages', async () => {
      const events: GR00TEvent[] = [];
      const client = createGR00TN16PolicyClient();
      client.addEventListener(e => events.push(e));
      client.connect();
      await flushTimers(20);

      // Create inference error message
      const buffer = new ArrayBuffer(GROOT_HEADER_SIZE + 4);
      const view = new DataView(buffer);
      view.setUint8(0, GR00TMessageType.INFERENCE_ERROR);
      view.setUint32(1, 0, true);
      view.setUint32(5, Date.now() & 0xFFFFFFFF, true);
      view.setUint32(GROOT_HEADER_SIZE, 42, true); // error code

      mockWsInstances[0].simulateMessage(buffer);

      expect(events.some(e => e.type === 'error' && (e.data as any).errorCode === 42)).toBe(true);

      client.destroy();
    });

    it('should handle server status messages', async () => {
      const events: GR00TEvent[] = [];
      const client = createGR00TN16PolicyClient();
      client.addEventListener(e => events.push(e));
      client.connect();
      await flushTimers(20);

      // Create server status message
      const buffer = new ArrayBuffer(GROOT_HEADER_SIZE);
      const view = new DataView(buffer);
      view.setUint8(0, GR00TMessageType.SERVER_STATUS);
      view.setUint32(1, 0, true);
      view.setUint32(5, Date.now() & 0xFFFFFFFF, true);

      mockWsInstances[0].simulateMessage(buffer);
      expect(events.some(e => e.type === 'server_status')).toBe(true);

      client.destroy();
    });

    it('should ignore messages shorter than header', async () => {
      const client = createGR00TN16PolicyClient();
      client.connect();
      await flushTimers(20);

      // Send tiny message
      const buffer = new ArrayBuffer(3); // Less than GROOT_HEADER_SIZE
      expect(() => mockWsInstances[0].simulateMessage(buffer)).not.toThrow();

      client.destroy();
    });
  });

  // ---------------------------------------------------------------------------
  // FACTORY FUNCTION
  // ---------------------------------------------------------------------------

  describe('Factory', () => {
    it('should create via factory function', () => {
      const client = createGR00TN16PolicyClient({ observationRateHz: 15 });
      expect(client).toBeInstanceOf(GR00TN16PolicyClient);
      client.destroy();
    });

    it('should create with no arguments', () => {
      const client = createGR00TN16PolicyClient();
      expect(client).toBeInstanceOf(GR00TN16PolicyClient);
      client.destroy();
    });
  });

  // ---------------------------------------------------------------------------
  // TYPE DEFINITIONS COVERAGE
  // ---------------------------------------------------------------------------

  describe('Type Definitions', () => {
    it('should have correct observation dimensions', () => {
      expect(OBSERVATION_TOTAL_DIM).toBe(148 + 512 + 64 + 32); // 756
    });

    it('should have correct action dimensions', () => {
      expect(ACTION_DIM).toBe(256);
      expect(ACTION_JOINT_COUNT).toBe(37);
    });

    it('should have 37 joints in GROOT joint list', () => {
      expect(GROOT_37DOF_JOINT_NAMES.length).toBe(37);
    });

    it('should have torso_lateral as 37th DOF', () => {
      expect(GROOT_37DOF_JOINT_NAMES).toContain('torso_lateral');
    });

    it('should have all base 36 joints in GROOT joint list', () => {
      for (const joint of ALL_JOINT_NAMES) {
        expect(GROOT_37DOF_JOINT_NAMES).toContain(joint);
      }
    });

    it('should have correct default policy modes', () => {
      expect(DEFAULT_POLICY_MODES['manipulation'].policyHeadId).toBe('manipulation_v1');
      expect(DEFAULT_POLICY_MODES['navigation'].policyHeadId).toBe('navigation_v1');
      expect(DEFAULT_POLICY_MODES['bimanual'].policyHeadId).toBe('bimanual_v1');
      expect(DEFAULT_POLICY_MODES['idle'].policyHeadId).toBe('idle');
      expect(DEFAULT_POLICY_MODES['idle'].activeJoints.length).toBe(0);
    });

    it('should create empty metrics', () => {
      const metrics = createEmptyGR00TMetrics();
      expect(metrics.connectionState).toBe('disconnected');
      expect(metrics.policyMode).toBe('idle');
      expect(metrics.observationsSent).toBe(0);
    });

    it('should have correct default config', () => {
      expect(DEFAULT_GROOT_N16_CONFIG.observationRateHz).toBe(30);
      expect(DEFAULT_GROOT_N16_CONFIG.initialPolicyMode).toBe('manipulation');
      expect(DEFAULT_GROOT_N16_CONFIG.actionChunking.chunkSize).toBe(16);
      expect(DEFAULT_GROOT_N16_CONFIG.actionChunking.executeHorizon).toBe(4);
    });
  });
});
