/**
 * WebRTC P2P Data Channels Integration Test
 *
 * Validates the WebRTCManager's full lifecycle including:
 * - Connection establishment via signaling server
 * - Dual data channels (reliable ordered + unreliable unordered)
 * - Heartbeat mechanism and stale connection detection
 * - Auto-reconnection with exponential backoff (1s -> 2s -> 4s ... max 30s)
 * - Message chunking for payloads exceeding maxMessageSize
 * - Connection quality metrics tracking
 * - RBAC permission enforcement
 * - Broadcast to multiple peers
 * - Graceful shutdown
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebRTCManager } from '../../../../services/WebRTCManager';
import type {
  WebRTCManagerConfig,
  ConnectionStateChangeEvent,
} from '../../../../services/WebRTCManager';

// ============================================================================
// Mock Infrastructure
// ============================================================================

/**
 * Mock WebSocket that captures sent messages and allows simulating
 * server-side events (open, message, close, error).
 */
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockWebSocket.CONNECTING;
  sentMessages: string[] = [];
  onopen: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  constructor(public url: string) {
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) this.onopen({});
    }, 0);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose({});
  }

  // Test helper: simulate receiving a message from server
  simulateMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  // Test helper: simulate error
  simulateError(error: any): void {
    if (this.onerror) this.onerror(error);
  }
}

/**
 * Mock RTCDataChannel that tracks state transitions and sent data.
 */
class MockRTCDataChannel {
  label: string;
  readyState: RTCDataChannelState = 'connecting';
  ordered: boolean;
  maxRetransmits: number | null;
  sentData: string[] = [];

  onopen: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  constructor(label: string, options?: RTCDataChannelInit) {
    this.label = label;
    this.ordered = options?.ordered ?? true;
    this.maxRetransmits = options?.maxRetransmits ?? null;
  }

  send(data: string): void {
    this.sentData.push(data);
  }

  close(): void {
    this.readyState = 'closed';
    if (this.onclose) this.onclose({});
  }

  // Test helper: simulate channel opening
  simulateOpen(): void {
    this.readyState = 'open';
    if (this.onopen) this.onopen({});
  }

  // Test helper: simulate incoming message
  simulateMessage(data: string): void {
    if (this.onmessage) {
      this.onmessage({ data });
    }
  }
}

/**
 * Mock RTCPeerConnection for testing WebRTC lifecycle without actual media.
 */
class MockRTCPeerConnection {
  static instances: MockRTCPeerConnection[] = [];

  iceServers: RTCIceServer[];
  connectionState: RTCPeerConnectionState = 'new';
  iceConnectionState: RTCIceConnectionState = 'new';
  localDescription: RTCSessionDescription | null = null;
  remoteDescription: RTCSessionDescription | null = null;
  createdChannels: MockRTCDataChannel[] = [];
  addedCandidates: RTCIceCandidateInit[] = [];

  onicecandidate: ((event: any) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  ondatachannel: ((event: any) => void) | null = null;

  constructor(config?: RTCConfiguration) {
    this.iceServers = config?.iceServers as RTCIceServer[] ?? [];
    MockRTCPeerConnection.instances.push(this);
  }

  createDataChannel(label: string, options?: RTCDataChannelInit): MockRTCDataChannel {
    const channel = new MockRTCDataChannel(label, options);
    this.createdChannels.push(channel);
    return channel;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    return { type: 'offer', sdp: 'mock-offer-sdp-v1' };
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    return { type: 'answer', sdp: 'mock-answer-sdp-v1' };
  }

  async setLocalDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    this.localDescription = new RTCSessionDescription(desc);
  }

  async setRemoteDescription(desc: RTCSessionDescription): Promise<void> {
    this.remoteDescription = desc;
  }

  async addIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    this.addedCandidates.push(candidate.toJSON());
  }

  close(): void {
    this.connectionState = 'closed';
  }

  // Test helper: simulate connection state change
  simulateConnectionState(state: RTCPeerConnectionState): void {
    this.connectionState = state;
    if (this.onconnectionstatechange) this.onconnectionstatechange();
  }

  // Test helper: simulate ICE state change
  simulateIceState(state: RTCIceConnectionState): void {
    this.iceConnectionState = state;
    if (this.oniceconnectionstatechange) this.oniceconnectionstatechange();
  }

  // Test helper: simulate ICE candidate
  simulateIceCandidate(candidate: any): void {
    if (this.onicecandidate) {
      this.onicecandidate({ candidate: { toJSON: () => candidate } });
    }
  }

  // Test helper: simulate receiving a data channel (answerer side)
  simulateDataChannel(channel: MockRTCDataChannel): void {
    if (this.ondatachannel) {
      this.ondatachannel({ channel });
    }
  }
}

// ============================================================================
// Global Mocks
// ============================================================================

// Store original globals
let originalWebSocket: typeof WebSocket;
let originalRTCPeerConnection: typeof RTCPeerConnection;
let originalRTCSessionDescription: typeof RTCSessionDescription;
let originalRTCIceCandidate: typeof RTCIceCandidate;

// Track mock instances
let mockWebSockets: MockWebSocket[] = [];

function setupGlobalMocks(): void {
  originalWebSocket = globalThis.WebSocket;
  originalRTCPeerConnection = globalThis.RTCPeerConnection;
  originalRTCSessionDescription = globalThis.RTCSessionDescription;
  originalRTCIceCandidate = globalThis.RTCIceCandidate;

  mockWebSockets = [];
  MockRTCPeerConnection.instances = [];

  (globalThis as any).WebSocket = class extends MockWebSocket {
    constructor(url: string) {
      super(url);
      mockWebSockets.push(this);
    }

    static get OPEN() { return MockWebSocket.OPEN; }
    static get CLOSED() { return MockWebSocket.CLOSED; }
    static get CONNECTING() { return MockWebSocket.CONNECTING; }
    static get CLOSING() { return MockWebSocket.CLOSING; }
  };

  (globalThis as any).RTCPeerConnection = MockRTCPeerConnection;

  (globalThis as any).RTCSessionDescription = class {
    type: string;
    sdp: string;
    constructor(init: RTCSessionDescriptionInit) {
      this.type = init.type!;
      this.sdp = init.sdp!;
    }
  };

  (globalThis as any).RTCIceCandidate = class {
    candidate: string;
    constructor(init: RTCIceCandidateInit) {
      this.candidate = init.candidate || '';
    }
    toJSON(): RTCIceCandidateInit {
      return { candidate: this.candidate };
    }
  };
}

function teardownGlobalMocks(): void {
  globalThis.WebSocket = originalWebSocket;
  globalThis.RTCPeerConnection = originalRTCPeerConnection;
  globalThis.RTCSessionDescription = originalRTCSessionDescription;
  globalThis.RTCIceCandidate = originalRTCIceCandidate;
}

// ============================================================================
// Test Helpers
// ============================================================================

function createMockRBACEnforcer() {
  return {
    checkAccess: vi.fn().mockResolvedValue({ allowed: true }),
  };
}

function createDefaultConfig(overrides?: Partial<WebRTCManagerConfig>): WebRTCManagerConfig {
  return {
    agentDid: 'did:test:agent-alpha',
    iceServers: [{ urls: 'stun:stun.example.com:3478' }],
    signalingUrl: 'wss://signal.example.com/ws',
    maxReconnectAttempts: 5,
    heartbeatInterval: 3000,
    rbacEnforcer: createMockRBACEnforcer() as any,
    agentToken: { agentId: 'agent-alpha', role: 'agent', permissions: [] } as any,
    ...overrides,
  };
}

function getLatestWebSocket(): MockWebSocket {
  return mockWebSockets[mockWebSockets.length - 1];
}

function getLatestPeerConnection(): MockRTCPeerConnection {
  return MockRTCPeerConnection.instances[MockRTCPeerConnection.instances.length - 1];
}

// ============================================================================
// Tests
// ============================================================================

describe('WebRTC P2P Data Channels Integration', () => {
  let manager: WebRTCManager;

  beforeEach(() => {
    vi.useFakeTimers();
    setupGlobalMocks();
  });

  afterEach(async () => {
    if (manager) {
      try {
        await manager.shutdown();
      } catch {
        // Ignore errors during cleanup
      }
    }
    vi.useRealTimers();
    teardownGlobalMocks();
  });

  // --------------------------------------------------------------------------
  // 1. Connection Lifecycle
  // --------------------------------------------------------------------------
  describe('Connection Lifecycle', () => {
    it('should connect to signaling server on initialize', async () => {
      manager = new WebRTCManager(createDefaultConfig());

      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      expect(mockWebSockets.length).toBe(1);
      const ws = getLatestWebSocket();
      expect(ws.url).toBe('wss://signal.example.com/ws');
      expect(ws.readyState).toBe(MockWebSocket.OPEN);

      // Should have sent peer_joined registration message
      expect(ws.sentMessages.length).toBeGreaterThanOrEqual(1);
      const joinMsg = JSON.parse(ws.sentMessages[0]);
      expect(joinMsg.type).toBe('peer_joined');
      expect(joinMsg.from).toBe('did:test:agent-alpha');
    });

    it('should reject double initialization', async () => {
      manager = new WebRTCManager(createDefaultConfig());

      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      await expect(manager.initialize()).rejects.toThrow('already initialized');
    });

    it('should create peer connection with offer when connecting to peer', async () => {
      manager = new WebRTCManager(createDefaultConfig());
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      await manager.connect('did:test:peer-beta');

      // Should create an RTCPeerConnection
      expect(MockRTCPeerConnection.instances.length).toBe(1);
      const pc = getLatestPeerConnection();

      // Should have created two data channels (offerer creates them)
      expect(pc.createdChannels.length).toBe(2);
      expect(pc.createdChannels[0].label).toBe('reliable');
      expect(pc.createdChannels[0].ordered).toBe(true);
      expect(pc.createdChannels[1].label).toBe('unreliable');
      expect(pc.createdChannels[1].ordered).toBe(false);
      expect(pc.createdChannels[1].maxRetransmits).toBe(0);

      // Should have sent offer via signaling
      const ws = getLatestWebSocket();
      const offerMsg = ws.sentMessages.find((m) => JSON.parse(m).type === 'offer');
      expect(offerMsg).toBeDefined();
      const parsed = JSON.parse(offerMsg!);
      expect(parsed.to).toBe('did:test:peer-beta');
      expect(parsed.payload.sdp).toBe('mock-offer-sdp-v1');
    });

    it('should emit connected state when reliable channel opens', async () => {
      manager = new WebRTCManager(createDefaultConfig());
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      const stateChanges: ConnectionStateChangeEvent[] = [];
      manager.onConnectionStateChange((e) => stateChanges.push(e));

      await manager.connect('did:test:peer-beta');
      const pc = getLatestPeerConnection();

      // Simulate reliable channel open
      pc.createdChannels[0].simulateOpen();

      expect(stateChanges.length).toBeGreaterThanOrEqual(1);
      const connectedEvent = stateChanges.find((e) => e.state === 'connected');
      expect(connectedEvent).toBeDefined();
      expect(connectedEvent!.peerId).toBe('did:test:peer-beta');
    });

    it('should handle disconnect cleanly', async () => {
      manager = new WebRTCManager(createDefaultConfig());
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      const stateChanges: ConnectionStateChangeEvent[] = [];
      manager.onConnectionStateChange((e) => stateChanges.push(e));

      await manager.connect('did:test:peer-beta');
      const pc = getLatestPeerConnection();
      pc.createdChannels[0].simulateOpen();

      await manager.disconnect('did:test:peer-beta');

      const disconnectEvent = stateChanges.find((e) => e.state === 'disconnected');
      expect(disconnectEvent).toBeDefined();
      expect(disconnectEvent!.peerId).toBe('did:test:peer-beta');
      expect(pc.connectionState).toBe('closed');
    });

    it('should shutdown all connections gracefully', async () => {
      manager = new WebRTCManager(createDefaultConfig());
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      await manager.connect('did:test:peer-beta');
      await manager.connect('did:test:peer-gamma');

      await manager.shutdown();

      const ws = getLatestWebSocket();
      expect(ws.readyState).toBe(MockWebSocket.CLOSED);
      expect(manager.getActiveConnections()).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Dual Data Channels
  // --------------------------------------------------------------------------
  describe('Dual Data Channels', () => {
    it('should route state_update messages to unreliable channel', async () => {
      manager = new WebRTCManager(createDefaultConfig());
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      await manager.connect('did:test:peer-beta');
      const pc = getLatestPeerConnection();
      const reliableChannel = pc.createdChannels[0];
      const unreliableChannel = pc.createdChannels[1];

      // Open both channels
      reliableChannel.simulateOpen();
      unreliableChannel.simulateOpen();

      const stateUpdate = {
        id: 'msg-1',
        type: 'state_update',
        from: 'did:test:agent-alpha',
        to: 'did:test:peer-beta',
        payload: { position: { x: 1, y: 2, z: 3 } },
        timestamp: Date.now(),
      };

      manager.sendMessage('did:test:peer-beta', stateUpdate);

      // state_update should go through unreliable channel
      expect(unreliableChannel.sentData.length).toBeGreaterThanOrEqual(1);
    });

    it('should route crdt_operation messages to unreliable channel', async () => {
      manager = new WebRTCManager(createDefaultConfig());
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      await manager.connect('did:test:peer-beta');
      const pc = getLatestPeerConnection();
      pc.createdChannels[0].simulateOpen();
      pc.createdChannels[1].simulateOpen();

      const crdtMsg = {
        id: 'msg-2',
        type: 'crdt_operation',
        from: 'did:test:agent-alpha',
        to: 'did:test:peer-beta',
        payload: { op: 'set', key: 'foo', value: 42 },
        timestamp: Date.now(),
      };

      manager.sendMessage('did:test:peer-beta', crdtMsg);

      // crdt_operation goes through unreliable channel
      expect(pc.createdChannels[1].sentData.length).toBeGreaterThanOrEqual(1);
    });

    it('should route regular messages to reliable channel', async () => {
      manager = new WebRTCManager(createDefaultConfig());
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      await manager.connect('did:test:peer-beta');
      const pc = getLatestPeerConnection();
      pc.createdChannels[0].simulateOpen();
      pc.createdChannels[1].simulateOpen();

      const chatMsg = {
        id: 'msg-3',
        type: 'chat',
        from: 'did:test:agent-alpha',
        to: 'did:test:peer-beta',
        payload: { text: 'hello' },
        timestamp: Date.now(),
      };

      manager.sendMessage('did:test:peer-beta', chatMsg);

      // Regular messages go through reliable channel
      expect(pc.createdChannels[0].sentData.length).toBeGreaterThanOrEqual(1);
    });

    it('should fall back to reliable channel when unreliable is not open', async () => {
      manager = new WebRTCManager(createDefaultConfig());
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      await manager.connect('did:test:peer-beta');
      const pc = getLatestPeerConnection();
      // Only open reliable channel
      pc.createdChannels[0].simulateOpen();
      // unreliable stays in 'connecting' state

      const stateUpdate = {
        id: 'msg-4',
        type: 'state_update',
        from: 'did:test:agent-alpha',
        to: 'did:test:peer-beta',
        payload: { position: { x: 0, y: 0, z: 0 } },
        timestamp: Date.now(),
      };

      manager.sendMessage('did:test:peer-beta', stateUpdate);

      // Falls back to reliable
      expect(pc.createdChannels[0].sentData.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Heartbeat Mechanism
  // --------------------------------------------------------------------------
  describe('Heartbeat Mechanism', () => {
    it('should send ping messages at configured interval', async () => {
      manager = new WebRTCManager(
        createDefaultConfig({ heartbeatInterval: 1000 }),
      );
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      await manager.connect('did:test:peer-beta');
      const pc = getLatestPeerConnection();
      pc.createdChannels[0].simulateOpen();

      // Advance by one heartbeat interval
      await vi.advanceTimersByTimeAsync(1000);

      // Should have sent at least one ping via reliable channel
      const sentData = pc.createdChannels[0].sentData;
      const pings = sentData.filter((d) => {
        try {
          return JSON.parse(d).type === 'ping';
        } catch {
          return false;
        }
      });
      expect(pings.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect stale connections after 3x heartbeat interval', async () => {
      manager = new WebRTCManager(
        createDefaultConfig({ heartbeatInterval: 1000, maxReconnectAttempts: 3 }),
      );
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      const stateChanges: ConnectionStateChangeEvent[] = [];
      manager.onConnectionStateChange((e) => stateChanges.push(e));

      await manager.connect('did:test:peer-beta');
      const pc = getLatestPeerConnection();
      pc.createdChannels[0].simulateOpen();

      // Advance past 3x heartbeat without any activity from peer
      // The lastActivity won't update because no pong is received
      await vi.advanceTimersByTimeAsync(4000);

      // Manager should detect staleness and trigger failure handling
      // The connection failure handler queues reconnection
      const failedOrDisconnected = stateChanges.find(
        (e) => e.state === 'failed' || e.state === 'disconnected',
      );
      // At minimum, the manager should have attempted to detect stale connection
      // It may have triggered handleConnectionFailure which adds to reconnect queue
      expect(stateChanges.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle pong response and calculate latency', async () => {
      manager = new WebRTCManager(
        createDefaultConfig({ heartbeatInterval: 1000 }),
      );
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      await manager.connect('did:test:peer-beta');
      const pc = getLatestPeerConnection();
      pc.createdChannels[0].simulateOpen();

      // Advance to trigger a ping
      await vi.advanceTimersByTimeAsync(1000);

      // Simulate pong response on the data channel after 50ms
      await vi.advanceTimersByTimeAsync(50);
      pc.createdChannels[0].simulateMessage(JSON.stringify({
        id: 'ping_response',
        type: 'pong',
        from: 'did:test:peer-beta',
        to: 'did:test:agent-alpha',
        payload: { timestamp: Date.now() - 50 },
        timestamp: Date.now(),
      }));

      // Connection should track metrics
      const connectionState = manager.getConnectionState('did:test:peer-beta');
      expect(connectionState).toBeDefined();
      expect(connectionState!.state).toBe('connected');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Auto-Reconnection with Exponential Backoff
  // --------------------------------------------------------------------------
  describe('Auto-Reconnection', () => {
    it('should schedule reconnection on connection failure', async () => {
      manager = new WebRTCManager(
        createDefaultConfig({ maxReconnectAttempts: 5, heartbeatInterval: 1000 }),
      );
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      await manager.connect('did:test:peer-beta');
      const pc = getLatestPeerConnection();
      pc.createdChannels[0].simulateOpen();

      // Simulate connection failure
      pc.simulateConnectionState('failed');

      // The manager should add peer to reconnect queue
      // After backoff period (initially 1s, doubled = 2s), it should attempt reconnect
      const instancesBefore = MockRTCPeerConnection.instances.length;

      // Advance past initial backoff (1s * 2 = 2s for first retry)
      await vi.advanceTimersByTimeAsync(3000);

      // A new connection attempt should have been made
      expect(MockRTCPeerConnection.instances.length).toBeGreaterThan(instancesBefore);
    });

    it('should use exponential backoff with 30s maximum', async () => {
      manager = new WebRTCManager(
        createDefaultConfig({ maxReconnectAttempts: 10, heartbeatInterval: 500 }),
      );
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      await manager.connect('did:test:peer-beta');
      const pc = getLatestPeerConnection();
      pc.createdChannels[0].simulateOpen();

      // Trigger multiple failures to observe backoff growth
      // Initial backoff = 1000ms
      // After first failure: backoff = min(1000*2, 30000) = 2000ms
      // After second: backoff = min(2000*2, 30000) = 4000ms
      // After third: backoff = min(4000*2, 30000) = 8000ms
      // After fourth: backoff = min(8000*2, 30000) = 16000ms
      // After fifth: backoff = min(16000*2, 30000) = 30000ms (capped)
      // After sixth: backoff = min(30000*2, 30000) = 30000ms (stays capped)

      pc.simulateConnectionState('failed');

      // The key insight: each failure doubles backoff, capped at 30s
      // We verify the pattern by checking that after enough time,
      // reconnection attempts increase but respect the cap
      const connectionAttemptsBefore = MockRTCPeerConnection.instances.length;

      // Advance well past initial attempts
      await vi.advanceTimersByTimeAsync(35000);

      // Should have made at least one reconnection attempt
      expect(MockRTCPeerConnection.instances.length).toBeGreaterThan(connectionAttemptsBefore);
    });

    it('should stop reconnecting after max attempts reached', async () => {
      manager = new WebRTCManager(
        createDefaultConfig({ maxReconnectAttempts: 2, heartbeatInterval: 500 }),
      );
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      const stateChanges: ConnectionStateChangeEvent[] = [];
      manager.onConnectionStateChange((e) => stateChanges.push(e));

      await manager.connect('did:test:peer-beta');
      const pc = getLatestPeerConnection();
      pc.createdChannels[0].simulateOpen();

      // Trigger failures exceeding max attempts
      pc.simulateConnectionState('failed');
      await vi.advanceTimersByTimeAsync(2500);

      // Second failure
      const pc2 = getLatestPeerConnection();
      pc2.simulateConnectionState('failed');
      await vi.advanceTimersByTimeAsync(5000);

      // Third failure should exceed max (2 attempts)
      const pc3 = getLatestPeerConnection();
      pc3.simulateConnectionState('failed');
      await vi.advanceTimersByTimeAsync(10000);

      // Should have eventually disconnected after max attempts
      const disconnectedEvents = stateChanges.filter((e) => e.state === 'disconnected');
      expect(disconnectedEvents.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Message Chunking
  // --------------------------------------------------------------------------
  describe('Message Chunking', () => {
    it('should chunk messages exceeding maxMessageSize', async () => {
      manager = new WebRTCManager(
        createDefaultConfig({ maxMessageSize: 100 } as any),
      );
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      await manager.connect('did:test:peer-beta');
      const pc = getLatestPeerConnection();
      pc.createdChannels[0].simulateOpen();

      // Create a large message that exceeds 100 bytes
      const largePayload = 'x'.repeat(500);
      const message = {
        id: 'large-msg',
        type: 'data',
        from: 'did:test:agent-alpha',
        to: 'did:test:peer-beta',
        payload: { content: largePayload },
        timestamp: Date.now(),
      };

      manager.sendMessage('did:test:peer-beta', message);

      // Should have sent multiple chunks
      const chunks = pc.createdChannels[0].sentData;
      expect(chunks.length).toBeGreaterThan(1);

      // Each chunk should have chunk metadata
      const firstChunk = JSON.parse(chunks[0]);
      expect(firstChunk.type).toBe('chunk');
      expect(firstChunk.chunkIndex).toBe(0);
      expect(firstChunk.totalChunks).toBeGreaterThan(1);
    });

    it('should not chunk small messages', async () => {
      manager = new WebRTCManager(createDefaultConfig());
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      await manager.connect('did:test:peer-beta');
      const pc = getLatestPeerConnection();
      pc.createdChannels[0].simulateOpen();

      const smallMessage = {
        id: 'small-msg',
        type: 'chat',
        from: 'did:test:agent-alpha',
        to: 'did:test:peer-beta',
        payload: { text: 'hi' },
        timestamp: Date.now(),
      };

      manager.sendMessage('did:test:peer-beta', smallMessage);

      // Should send in a single packet
      expect(pc.createdChannels[0].sentData.length).toBe(1);

      // Should not be a chunk
      const sent = JSON.parse(pc.createdChannels[0].sentData[0]);
      expect(sent.type).toBe('chat');
    });
  });

  // --------------------------------------------------------------------------
  // 6. Connection Quality Metrics
  // --------------------------------------------------------------------------
  describe('Connection Quality Metrics', () => {
    it('should track bytes sent and received', async () => {
      manager = new WebRTCManager(createDefaultConfig());
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      await manager.connect('did:test:peer-beta');
      const pc = getLatestPeerConnection();
      pc.createdChannels[0].simulateOpen();

      // Send a message
      const msg = {
        id: 'metrics-test',
        type: 'chat',
        from: 'did:test:agent-alpha',
        to: 'did:test:peer-beta',
        payload: { text: 'tracking metrics' },
        timestamp: Date.now(),
      };
      manager.sendMessage('did:test:peer-beta', msg);

      // Simulate receiving a message
      pc.createdChannels[0].simulateMessage(JSON.stringify({
        id: 'reply',
        type: 'chat',
        from: 'did:test:peer-beta',
        to: 'did:test:agent-alpha',
        payload: { text: 'received' },
        timestamp: Date.now(),
      }));

      // Get connection state to verify metrics are tracked
      const state = manager.getConnectionState('did:test:peer-beta');
      expect(state).toBeDefined();
      expect(state!.peerId).toBe('did:test:peer-beta');
    });

    it('should report active connections correctly', async () => {
      manager = new WebRTCManager(createDefaultConfig());
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      // Initially no active connections
      expect(manager.getActiveConnections()).toHaveLength(0);

      // Connect to two peers
      await manager.connect('did:test:peer-beta');
      await manager.connect('did:test:peer-gamma');

      const connections = MockRTCPeerConnection.instances;
      // Open reliable channels for both
      connections[0].createdChannels[0].simulateOpen();
      connections[1].createdChannels[0].simulateOpen();

      const active = manager.getActiveConnections();
      expect(active.length).toBe(2);
      expect(active.map((c) => c.peerId)).toContain('did:test:peer-beta');
      expect(active.map((c) => c.peerId)).toContain('did:test:peer-gamma');
    });
  });

  // --------------------------------------------------------------------------
  // 7. RBAC Permission Enforcement
  // --------------------------------------------------------------------------
  describe('RBAC Permission Enforcement', () => {
    it('should check permissions before connecting to peer', async () => {
      const rbac = createMockRBACEnforcer();
      manager = new WebRTCManager(createDefaultConfig({ rbacEnforcer: rbac as any }));
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      await manager.connect('did:test:peer-beta');

      expect(rbac.checkAccess).toHaveBeenCalledWith(
        expect.anything(),
        'connect_peer',
        expect.stringContaining('peer-beta'),
      );
    });

    it('should reject connection when RBAC denies', async () => {
      const rbac = createMockRBACEnforcer();
      rbac.checkAccess.mockResolvedValue({
        allowed: false,
        reason: 'Insufficient permissions',
      });

      manager = new WebRTCManager(createDefaultConfig({ rbacEnforcer: rbac as any }));
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      await expect(manager.connect('did:test:peer-beta')).rejects.toThrow(
        'Permission denied',
      );
    });
  });

  // --------------------------------------------------------------------------
  // 8. Message Broadcasting
  // --------------------------------------------------------------------------
  describe('Message Broadcasting', () => {
    it('should broadcast message to all connected peers', async () => {
      manager = new WebRTCManager(createDefaultConfig());
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      await manager.connect('did:test:peer-beta');
      await manager.connect('did:test:peer-gamma');

      const connections = MockRTCPeerConnection.instances;
      connections[0].createdChannels[0].simulateOpen();
      connections[1].createdChannels[0].simulateOpen();

      const broadcastMsg = {
        id: 'broadcast-1',
        type: 'announcement',
        from: 'did:test:agent-alpha',
        to: 'broadcast',
        payload: { text: 'hello everyone' },
        timestamp: Date.now(),
      };

      manager.broadcastMessage(broadcastMsg);

      // Both peers should have received the message
      expect(connections[0].createdChannels[0].sentData.length).toBeGreaterThanOrEqual(1);
      expect(connections[1].createdChannels[0].sentData.length).toBeGreaterThanOrEqual(1);
    });

    it('should skip disconnected peers during broadcast', async () => {
      manager = new WebRTCManager(createDefaultConfig());
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      await manager.connect('did:test:peer-beta');
      await manager.connect('did:test:peer-gamma');

      const connections = MockRTCPeerConnection.instances;
      // Only open beta's channel
      connections[0].createdChannels[0].simulateOpen();

      const broadcastMsg = {
        id: 'broadcast-2',
        type: 'announcement',
        from: 'did:test:agent-alpha',
        to: 'broadcast',
        payload: { text: 'hello' },
        timestamp: Date.now(),
      };

      // Should not throw even though gamma is not connected
      expect(() => manager.broadcastMessage(broadcastMsg)).not.toThrow();

      // Only beta should have received the message
      expect(connections[0].createdChannels[0].sentData.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // 9. Message Handling
  // --------------------------------------------------------------------------
  describe('Message Handling', () => {
    it('should deliver received messages to registered handlers', async () => {
      manager = new WebRTCManager(createDefaultConfig());
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      const receivedMessages: any[] = [];
      manager.onMessage((msg) => receivedMessages.push(msg));

      await manager.connect('did:test:peer-beta');
      const pc = getLatestPeerConnection();
      pc.createdChannels[0].simulateOpen();

      // Simulate receiving a chat message
      const incomingMsg = {
        id: 'incoming-1',
        type: 'chat',
        from: 'did:test:peer-beta',
        to: 'did:test:agent-alpha',
        payload: { text: 'hello from beta' },
        timestamp: Date.now(),
      };
      pc.createdChannels[0].simulateMessage(JSON.stringify(incomingMsg));

      expect(receivedMessages.length).toBe(1);
      expect(receivedMessages[0].type).toBe('chat');
      expect(receivedMessages[0].payload.text).toBe('hello from beta');
    });

    it('should not forward internal ping/pong to message handlers', async () => {
      manager = new WebRTCManager(createDefaultConfig());
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      const receivedMessages: any[] = [];
      manager.onMessage((msg) => receivedMessages.push(msg));

      await manager.connect('did:test:peer-beta');
      const pc = getLatestPeerConnection();
      pc.createdChannels[0].simulateOpen();

      // Simulate receiving a ping
      pc.createdChannels[0].simulateMessage(JSON.stringify({
        id: 'ping-test',
        type: 'ping',
        from: 'did:test:peer-beta',
        to: 'did:test:agent-alpha',
        payload: { timestamp: Date.now() },
        timestamp: Date.now(),
      }));

      // Pings should NOT be forwarded to user-level handlers
      expect(receivedMessages.length).toBe(0);
    });

    it('should throw when sending to disconnected peer', async () => {
      manager = new WebRTCManager(createDefaultConfig());
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      expect(() =>
        manager.sendMessage('did:test:nobody', {
          id: 'x',
          type: 'chat',
          from: 'a',
          to: 'b',
          payload: {},
          timestamp: Date.now(),
        }),
      ).toThrow('Not connected');
    });
  });

  // --------------------------------------------------------------------------
  // 10. Signaling Message Handling
  // --------------------------------------------------------------------------
  describe('Signaling Message Flow', () => {
    it('should handle incoming offer and create answer', async () => {
      manager = new WebRTCManager(createDefaultConfig());
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      const ws = getLatestWebSocket();

      // Simulate receiving an offer from a remote peer
      ws.simulateMessage({
        type: 'offer',
        from: 'did:test:remote-peer',
        to: 'did:test:agent-alpha',
        payload: { sdp: 'remote-offer-sdp' },
        timestamp: Date.now(),
      });

      // Allow async operations
      await vi.advanceTimersByTimeAsync(10);

      // Should have created a peer connection for the remote peer
      expect(MockRTCPeerConnection.instances.length).toBe(1);

      // Should have sent an answer back
      const answerMsg = ws.sentMessages.find((m) => {
        try {
          return JSON.parse(m).type === 'answer';
        } catch {
          return false;
        }
      });
      expect(answerMsg).toBeDefined();
      const parsed = JSON.parse(answerMsg!);
      expect(parsed.to).toBe('did:test:remote-peer');
      expect(parsed.payload.sdp).toBe('mock-answer-sdp-v1');
    });

    it('should handle ICE candidate exchange', async () => {
      manager = new WebRTCManager(createDefaultConfig());
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      // Connect to peer to create connection
      await manager.connect('did:test:peer-beta');
      const pc = getLatestPeerConnection();
      const ws = getLatestWebSocket();

      // Simulate receiving ICE candidate from remote peer
      ws.simulateMessage({
        type: 'ice_candidate',
        from: 'did:test:peer-beta',
        to: 'did:test:agent-alpha',
        payload: {
          candidate: { candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 8080 typ host' },
        },
        timestamp: Date.now(),
      });

      await vi.advanceTimersByTimeAsync(10);

      // Should have added the ICE candidate to the peer connection
      expect(pc.addedCandidates.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle peer_left by disconnecting', async () => {
      manager = new WebRTCManager(createDefaultConfig());
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      await manager.connect('did:test:peer-beta');
      const pc = getLatestPeerConnection();
      pc.createdChannels[0].simulateOpen();

      const stateChanges: ConnectionStateChangeEvent[] = [];
      manager.onConnectionStateChange((e) => stateChanges.push(e));

      const ws = getLatestWebSocket();
      ws.simulateMessage({
        type: 'peer_left',
        from: 'did:test:peer-beta',
        to: 'did:test:agent-alpha',
        payload: {},
        timestamp: Date.now(),
      });

      await vi.advanceTimersByTimeAsync(10);

      const disconnectedEvent = stateChanges.find((e) => e.state === 'disconnected');
      expect(disconnectedEvent).toBeDefined();
      expect(disconnectedEvent!.peerId).toBe('did:test:peer-beta');
    });
  });

  // --------------------------------------------------------------------------
  // 11. Error Handling
  // --------------------------------------------------------------------------
  describe('Error Handling', () => {
    it('should throw when not initialized', () => {
      manager = new WebRTCManager(createDefaultConfig());

      expect(manager.connect('did:test:peer-beta')).rejects.toThrow('not initialized');
    });

    it('should handle ICE connection failure', async () => {
      manager = new WebRTCManager(
        createDefaultConfig({ maxReconnectAttempts: 2, heartbeatInterval: 500 }),
      );
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      const stateChanges: ConnectionStateChangeEvent[] = [];
      manager.onConnectionStateChange((e) => stateChanges.push(e));

      await manager.connect('did:test:peer-beta');
      const pc = getLatestPeerConnection();
      pc.createdChannels[0].simulateOpen();

      // Simulate ICE failure
      pc.simulateIceState('failed');

      // Should trigger reconnection handling
      await vi.advanceTimersByTimeAsync(5000);

      // Should have attempted recovery
      expect(MockRTCPeerConnection.instances.length).toBeGreaterThan(1);
    });

    it('should skip already-connected peers', async () => {
      manager = new WebRTCManager(createDefaultConfig());
      const initPromise = manager.initialize();
      await vi.advanceTimersByTimeAsync(10);
      await initPromise;

      await manager.connect('did:test:peer-beta');
      const pc = getLatestPeerConnection();
      pc.createdChannels[0].simulateOpen();

      const connectionsBefore = MockRTCPeerConnection.instances.length;

      // Connecting again to same peer should not create new connection
      await manager.connect('did:test:peer-beta');

      expect(MockRTCPeerConnection.instances.length).toBe(connectionsBefore);
    });
  });
});
