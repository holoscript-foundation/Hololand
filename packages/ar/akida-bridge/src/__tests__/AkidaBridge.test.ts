import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AkidaBridge } from '../AkidaBridge';
import type {
  AkidaBridgeEvents,
  AkidaDeviceMessage,
  AkidaConnectionState,
} from '../types';

// =============================================================================
// MOCK WEBSOCKET
// =============================================================================

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  binaryType: string = 'blob';
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  sentMessages: (string | ArrayBuffer)[] = [];

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 0);
  }

  send(data: string | ArrayBuffer): void {
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({
      code: code ?? 1000,
      reason: reason ?? '',
      wasClean: true,
    } as CloseEvent);
  }

  // Test helper: simulate receiving a message
  simulateMessage(data: string | ArrayBuffer): void {
    this.onmessage?.({ data } as MessageEvent);
  }

  // Test helper: simulate error
  simulateError(): void {
    this.onerror?.(new Event('error'));
  }
}

// =============================================================================
// SETUP
// =============================================================================

let mockWsInstance: MockWebSocket | null = null;

beforeEach(() => {
  mockWsInstance = null;
  // @ts-expect-error - mocking global WebSocket
  globalThis.WebSocket = vi.fn((url: string) => {
    mockWsInstance = new MockWebSocket(url);
    return mockWsInstance;
  });
  // Copy static properties
  // @ts-expect-error - mocking
  globalThis.WebSocket.OPEN = MockWebSocket.OPEN;
  // @ts-expect-error - mocking
  globalThis.WebSocket.CLOSED = MockWebSocket.CLOSED;

  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// =============================================================================
// TESTS
// =============================================================================

describe('AkidaBridge', () => {
  describe('constructor', () => {
    it('creates with default config', () => {
      const bridge = new AkidaBridge();
      expect(bridge.getState()).toBe('disconnected');
      expect(bridge.connected).toBe(false);
      expect(bridge.streaming).toBe(false);
    });

    it('accepts custom config', () => {
      const bridge = new AkidaBridge({
        deviceUrl: 'ws://192.168.1.50:8765',
        autoReconnect: false,
      });
      expect(bridge.getState()).toBe('disconnected');
    });
  });

  describe('connect', () => {
    it('transitions to connecting state', () => {
      const onStateChange = vi.fn();
      const bridge = new AkidaBridge({}, { onStateChange });

      bridge.connect();

      expect(onStateChange).toHaveBeenCalledWith('connecting');
    });

    it('transitions to connected then authenticated on open (no auth)', async () => {
      const onConnected = vi.fn();
      const onAuthenticated = vi.fn();
      const states: AkidaConnectionState[] = [];

      const bridge = new AkidaBridge(
        { authToken: undefined },
        {
          onConnected,
          onAuthenticated,
          onStateChange: (s) => states.push(s),
        }
      );

      bridge.connect();
      await vi.advanceTimersByTimeAsync(10);

      expect(onConnected).toHaveBeenCalledTimes(1);
      expect(onAuthenticated).toHaveBeenCalledTimes(1);
      expect(states).toContain('connecting');
      expect(states).toContain('connected');
      expect(states).toContain('authenticated');
      expect(bridge.connected).toBe(true);
    });

    it('sends authenticate message when authToken is provided', async () => {
      const bridge = new AkidaBridge({ authToken: 'secret-token' });

      bridge.connect();
      await vi.advanceTimersByTimeAsync(10);

      expect(mockWsInstance).not.toBeNull();
      const sent = mockWsInstance!.sentMessages;
      expect(sent).toHaveLength(1);
      const msg = JSON.parse(sent[0] as string);
      expect(msg.type).toBe('authenticate');
      expect(msg.token).toBe('secret-token');
    });

    it('handles auth success', async () => {
      const onAuthenticated = vi.fn();
      const bridge = new AkidaBridge(
        { authToken: 'token' },
        { onAuthenticated }
      );

      bridge.connect();
      await vi.advanceTimersByTimeAsync(10);

      // Simulate auth success response
      const response: AkidaDeviceMessage = {
        type: 'auth_result',
        success: true,
      };
      mockWsInstance!.simulateMessage(JSON.stringify(response));

      expect(onAuthenticated).toHaveBeenCalledTimes(1);
      expect(bridge.connected).toBe(true);
    });

    it('handles auth failure', async () => {
      const onError = vi.fn();
      const bridge = new AkidaBridge(
        { authToken: 'bad-token' },
        { onError }
      );

      bridge.connect();
      await vi.advanceTimersByTimeAsync(10);

      const response: AkidaDeviceMessage = {
        type: 'auth_result',
        success: false,
        error: 'Invalid token',
      };
      mockWsInstance!.simulateMessage(JSON.stringify(response));

      expect(onError).toHaveBeenCalledTimes(1);
      expect(bridge.getState()).toBe('error');
    });
  });

  describe('disconnect', () => {
    it('closes the WebSocket and resets state', async () => {
      const bridge = new AkidaBridge();
      bridge.connect();
      await vi.advanceTimersByTimeAsync(10);

      expect(bridge.connected).toBe(true);

      bridge.disconnect();

      expect(bridge.connected).toBe(false);
      expect(bridge.getState()).toBe('disconnected');
    });

    it('can be called when already disconnected', () => {
      const bridge = new AkidaBridge();
      expect(() => bridge.disconnect()).not.toThrow();
    });
  });

  describe('streaming', () => {
    it('sends start_stream command', async () => {
      const bridge = new AkidaBridge();
      bridge.connect();
      await vi.advanceTimersByTimeAsync(10);

      bridge.startStream({ frameRate: 15, maxPoints: 1024, voxelSize: 0.05 });

      const sent = mockWsInstance!.sentMessages;
      // First message is ping (from ping loop), or the start_stream
      const streamMsg = sent.find(s => {
        if (typeof s !== 'string') return false;
        const parsed = JSON.parse(s);
        return parsed.type === 'start_stream';
      });
      expect(streamMsg).toBeDefined();
    });

    it('rejects stream start when not connected', () => {
      const onError = vi.fn();
      const bridge = new AkidaBridge({}, { onError });

      bridge.startStream();
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('handles stream_started message', async () => {
      const bridge = new AkidaBridge();
      bridge.connect();
      await vi.advanceTimersByTimeAsync(10);

      const response: AkidaDeviceMessage = {
        type: 'stream_started',
        actualFrameRate: 30,
      };
      mockWsInstance!.simulateMessage(JSON.stringify(response));

      expect(bridge.streaming).toBe(true);
      expect(bridge.getState()).toBe('streaming');
    });

    it('handles stream_stopped message', async () => {
      const bridge = new AkidaBridge();
      bridge.connect();
      await vi.advanceTimersByTimeAsync(10);

      // Start stream
      mockWsInstance!.simulateMessage(
        JSON.stringify({ type: 'stream_started', actualFrameRate: 30 })
      );
      expect(bridge.streaming).toBe(true);

      // Stop stream
      mockWsInstance!.simulateMessage(
        JSON.stringify({ type: 'stream_stopped' })
      );
      expect(bridge.streaming).toBe(false);
    });
  });

  describe('classification results', () => {
    it('emits classification results from device', async () => {
      const onClassificationResult = vi.fn();
      const bridge = new AkidaBridge({}, { onClassificationResult });
      bridge.connect();
      await vi.advanceTimersByTimeAsync(10);

      const response: AkidaDeviceMessage = {
        type: 'classification_result',
        result: {
          frameId: 1,
          timestamp: Date.now(),
          pointClassifications: [],
          segments: [],
          akidaLatencyMs: 5,
          totalLatencyMs: 8,
          source: 'akida',
        },
      };
      mockWsInstance!.simulateMessage(JSON.stringify(response));

      expect(onClassificationResult).toHaveBeenCalledTimes(1);
      expect(onClassificationResult.mock.calls[0][0].frameId).toBe(1);
    });
  });

  describe('power metrics', () => {
    it('emits power metrics from device', async () => {
      const onPowerUpdate = vi.fn();
      const bridge = new AkidaBridge({}, { onPowerUpdate });
      bridge.connect();
      await vi.advanceTimersByTimeAsync(10);

      const response: AkidaDeviceMessage = {
        type: 'power_metrics',
        metrics: {
          timestamp: Date.now(),
          powerMw: 250,
          npuPowerMw: 200,
          ioPowerMw: 50,
          temperatureC: 45,
          inferenceLatencyMs: 8,
          framesPerSecond: 30,
          totalFramesProcessed: 1000,
          utilizationPercent: 75,
          availableSramBytes: 1024 * 1024,
          modelLoaded: true,
        },
      };
      mockWsInstance!.simulateMessage(JSON.stringify(response));

      expect(onPowerUpdate).toHaveBeenCalledTimes(1);
      expect(onPowerUpdate.mock.calls[0][0].powerMw).toBe(250);
    });
  });

  describe('device info', () => {
    it('stores device info from device_info message', async () => {
      const bridge = new AkidaBridge();
      bridge.connect();
      await vi.advanceTimersByTimeAsync(10);

      expect(bridge.getDeviceInfo()).toBeNull();

      const response: AkidaDeviceMessage = {
        type: 'device_info',
        info: {
          model: 'AKD1500',
          firmwareVersion: '1.2.3',
          numNPEs: 80,
          totalSramBytes: 4 * 1024 * 1024,
          supportedModels: ['pointnet2_ssg', 'pointnet2_msg'],
          maxPointsPerInference: 65536,
          serialNumber: 'AK-12345',
        },
      };
      mockWsInstance!.simulateMessage(JSON.stringify(response));

      expect(bridge.getDeviceInfo()).not.toBeNull();
      expect(bridge.getDeviceInfo()!.model).toBe('AKD1500');
    });
  });

  describe('ping/pong', () => {
    it('calculates round-trip latency from pong', async () => {
      const bridge = new AkidaBridge();
      bridge.connect();
      await vi.advanceTimersByTimeAsync(10);

      const clientTimestamp = Date.now();
      const response: AkidaDeviceMessage = {
        type: 'pong',
        clientTimestamp,
        serverTimestamp: clientTimestamp + 5,
      };
      mockWsInstance!.simulateMessage(JSON.stringify(response));

      // RTT should be approximately 0 since we use fakeTimers
      expect(bridge.getRoundTripLatency()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('emits error on device error message', async () => {
      const onError = vi.fn();
      const bridge = new AkidaBridge({}, { onError });
      bridge.connect();
      await vi.advanceTimersByTimeAsync(10);

      const response: AkidaDeviceMessage = {
        type: 'error',
        code: 'MODEL_NOT_LOADED',
        message: 'No model is currently loaded',
      };
      mockWsInstance!.simulateMessage(JSON.stringify(response));

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0].message).toContain('MODEL_NOT_LOADED');
    });

    it('emits error on unparseable JSON', async () => {
      const onError = vi.fn();
      const bridge = new AkidaBridge({}, { onError });
      bridge.connect();
      await vi.advanceTimersByTimeAsync(10);

      mockWsInstance!.simulateMessage('not valid json {{{');
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe('reconnection', () => {
    it('schedules reconnect on disconnect with autoReconnect', async () => {
      const bridge = new AkidaBridge({
        autoReconnect: true,
        reconnectIntervalMs: 1000,
      });
      bridge.connect();
      await vi.advanceTimersByTimeAsync(10);

      // Simulate close
      mockWsInstance!.close();

      // Should schedule reconnect
      expect(bridge.getState()).toBe('disconnected');

      // Advance past reconnect delay
      await vi.advanceTimersByTimeAsync(1100);

      // Should have attempted reconnect (new WebSocket created)
      expect(globalThis.WebSocket).toHaveBeenCalledTimes(2);
    });

    it('does not reconnect when autoReconnect is false', async () => {
      const bridge = new AkidaBridge({ autoReconnect: false });
      bridge.connect();
      await vi.advanceTimersByTimeAsync(10);

      mockWsInstance!.close();
      await vi.advanceTimersByTimeAsync(10000);

      // Only the initial connection
      expect(globalThis.WebSocket).toHaveBeenCalledTimes(1);
    });

    it('limits reconnection attempts when maxReconnectAttempts is set', async () => {
      // Verify that the reconnection counter is bounded by maxReconnectAttempts.
      // We create a minimal WebSocket mock that fails all connections without
      // the MockWebSocket auto-open behavior.
      let wsCreations = 0;

      // @ts-expect-error - mocking
      globalThis.WebSocket = vi.fn((_url: string) => {
        wsCreations++;
        const ws = {
          readyState: 0,
          binaryType: 'blob',
          onopen: null as any,
          onmessage: null as any,
          onclose: null as any,
          onerror: null as any,
          send: vi.fn(),
          close: vi.fn(function(this: any) {
            this.readyState = 3; // CLOSED
          }),
        };

        // Connection fails after 50ms (only fires close, never open)
        setTimeout(() => {
          if (ws.readyState !== 3) {
            ws.readyState = 3;
            ws.onclose?.({
              code: 1006,
              reason: 'Connection refused',
              wasClean: false,
            } as CloseEvent);
          }
        }, 50);

        return ws;
      });
      // @ts-expect-error - mocking
      globalThis.WebSocket.OPEN = 1;
      // @ts-expect-error - mocking
      globalThis.WebSocket.CLOSED = 3;

      const bridge = new AkidaBridge({
        autoReconnect: true,
        maxReconnectAttempts: 3,
        reconnectIntervalMs: 1000,
      });

      bridge.connect();

      // Step through time incrementally:
      // t=50:    initial connection fails, scheduleReconnect (attempt 0 < 3)
      // t=1050:  reconnect #1 fires, connect() called (attempts=1)
      // t=1100:  connection fails, scheduleReconnect (attempt 1 < 3)
      // t=3100:  reconnect #2 fires (1000*2^1=2000ms), connect() (attempts=2)
      // t=3150:  connection fails, scheduleReconnect (attempt 2 < 3)
      // t=7150:  reconnect #3 fires (1000*2^2=4000ms), connect() (attempts=3)
      // t=7200:  connection fails, scheduleReconnect (attempt 3 >= 3) -> error, no more
      for (let i = 0; i < 100; i++) {
        await vi.advanceTimersByTimeAsync(100);
      }

      // Should be bounded: 1 initial + 3 reconnects = 4
      expect(wsCreations).toBe(4);
    });
  });

  describe('dispose', () => {
    it('cleans up everything', async () => {
      const bridge = new AkidaBridge();
      bridge.connect();
      await vi.advanceTimersByTimeAsync(10);

      bridge.dispose();

      expect(bridge.connected).toBe(false);
      expect(bridge.getState()).toBe('disconnected');
      expect(bridge.getDeviceInfo()).toBeNull();
    });
  });
});
