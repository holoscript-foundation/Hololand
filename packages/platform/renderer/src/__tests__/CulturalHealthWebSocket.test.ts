/**
 * @vitest-environment jsdom
 */

/**
 * Tests for CulturalHealthWebSocket
 *
 * Validates the WebSocket server for cultural health dashboard consumption:
 * - Client connection and disconnection
 * - Snapshot broadcasting
 * - Subsystem-specific subscriptions
 * - Alert broadcasting
 * - Backpressure handling
 * - Client management and metrics
 * - Ping/pong keep-alive
 * - Factory function
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
  CulturalHealthWebSocket,
  createCulturalHealthWebSocket,
  ALL_SUBSYSTEMS,
  type WebSocketConnection,
  type WebSocketServerAdapter,
  type CulturalHealthSubsystem,
} from '../CulturalHealthWebSocket';

import { CulturalHealthMonitor } from '../CulturalHealthMonitor';
import type { CulturalHealthSnapshot, CulturalHealthAlert } from '../CulturalHealthTypes';
import { createEmptyCulturalHealthState, stateToSnapshot, createEmptyCooperationIndex } from '../CulturalHealthTypes';

// =============================================================================
// MOCK HELPERS
// =============================================================================

/**
 * Create a mock WebSocket connection.
 */
function createMockConnection(): WebSocketConnection & {
  sentMessages: string[];
  messageHandler: ((data: string) => void) | null;
  closeHandler: (() => void) | null;
  errorHandler: ((error: Error) => void) | null;
  _isOpen: boolean;
  _bufferedAmount: number;
} {
  const mock = {
    sentMessages: [] as string[],
    messageHandler: null as ((data: string) => void) | null,
    closeHandler: null as (() => void) | null,
    errorHandler: null as ((error: Error) => void) | null,
    _isOpen: true,
    _bufferedAmount: 0,

    send(data: string): void {
      mock.sentMessages.push(data);
    },
    close(_code?: number, _reason?: string): void {
      mock._isOpen = false;
      if (mock.closeHandler) mock.closeHandler();
    },
    onMessage(handler: (data: string) => void): void {
      mock.messageHandler = handler;
    },
    onClose(handler: () => void): void {
      mock.closeHandler = handler;
    },
    onError(handler: (error: Error) => void): void {
      mock.errorHandler = handler;
    },
    isOpen(): boolean {
      return mock._isOpen;
    },
    getBufferedAmount(): number {
      return mock._bufferedAmount;
    },
  };

  return mock;
}

/**
 * Create a mock WebSocket server adapter.
 */
function createMockServerAdapter(): WebSocketServerAdapter & {
  connectionHandler: ((conn: WebSocketConnection) => void) | null;
  _isListening: boolean;
  simulateConnection: (conn: WebSocketConnection) => void;
} {
  const mock = {
    connectionHandler: null as ((conn: WebSocketConnection) => void) | null,
    _isListening: false,

    start(): void {
      mock._isListening = true;
    },
    stop(): void {
      mock._isListening = false;
    },
    onConnection(handler: (connection: WebSocketConnection) => void): void {
      mock.connectionHandler = handler;
    },
    isListening(): boolean {
      return mock._isListening;
    },
    simulateConnection(conn: WebSocketConnection): void {
      if (mock.connectionHandler) {
        mock.connectionHandler(conn);
      }
    },
  };

  return mock;
}

/**
 * Create a simple mock CulturalHealthMonitor.
 */
function createMockMonitor(): CulturalHealthMonitor {
  return new CulturalHealthMonitor({ autoStart: false });
}

/**
 * Create a test snapshot.
 */
function createTestSnapshot(overrides?: Partial<CulturalHealthSnapshot>): CulturalHealthSnapshot {
  const state = createEmptyCulturalHealthState();
  const snapshot = stateToSnapshot(state);
  return { ...snapshot, ...overrides };
}

// =============================================================================
// TESTS
// =============================================================================

describe('CulturalHealthWebSocket', () => {
  let wsServer: CulturalHealthWebSocket;
  let mockMonitor: CulturalHealthMonitor;
  let mockAdapter: ReturnType<typeof createMockServerAdapter>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockMonitor = createMockMonitor();
    mockAdapter = createMockServerAdapter();

    wsServer = new CulturalHealthWebSocket({
      monitor: mockMonitor,
      serverAdapter: mockAdapter,
    });
  });

  afterEach(() => {
    wsServer.dispose();
    mockMonitor.dispose();
    vi.useRealTimers();
  });

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  describe('initialization', () => {
    it('should create with default configuration', () => {
      const ws = createCulturalHealthWebSocket({
        monitor: mockMonitor,
        serverAdapter: mockAdapter,
      });
      expect(ws.getClientCount()).toBe(0);
      ws.dispose();
    });

    it('should not start without server adapter', () => {
      const ws = new CulturalHealthWebSocket({
        monitor: mockMonitor,
        // No server adapter
      });
      ws.start(); // Should warn but not throw
      expect(ws.getMetrics().isListening).toBe(false);
      ws.dispose();
    });
  });

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  describe('lifecycle', () => {
    it('should start the server', () => {
      wsServer.start();
      expect(mockAdapter._isListening).toBe(true);
    });

    it('should stop the server', () => {
      wsServer.start();
      wsServer.stop();
      expect(mockAdapter._isListening).toBe(false);
    });

    it('should disconnect all clients on stop', () => {
      wsServer.start();

      const conn = createMockConnection();
      mockAdapter.simulateConnection(conn);

      expect(wsServer.getClientCount()).toBe(1);

      wsServer.stop();
      expect(wsServer.getClientCount()).toBe(0);
    });
  });

  // ===========================================================================
  // CLIENT CONNECTION
  // ===========================================================================

  describe('client connection', () => {
    it('should accept new client connections', () => {
      wsServer.start();

      const conn = createMockConnection();
      mockAdapter.simulateConnection(conn);

      expect(wsServer.getClientCount()).toBe(1);
    });

    it('should assign unique client IDs', () => {
      wsServer.start();

      const conn1 = createMockConnection();
      const conn2 = createMockConnection();
      mockAdapter.simulateConnection(conn1);
      mockAdapter.simulateConnection(conn2);

      const ids = wsServer.getClientIds();
      expect(ids.length).toBe(2);
      expect(ids[0]).not.toBe(ids[1]);
    });

    it('should send initial snapshot on connection', () => {
      wsServer.start();

      const conn = createMockConnection();
      mockAdapter.simulateConnection(conn);

      // Should have received at least one message (initial snapshot)
      expect(conn.sentMessages.length).toBeGreaterThanOrEqual(1);
      const firstMessage = JSON.parse(conn.sentMessages[0]);
      expect(firstMessage.type).toBe('snapshot');
    });

    it('should reject connections when max clients reached', () => {
      const ws = new CulturalHealthWebSocket({
        monitor: mockMonitor,
        serverAdapter: mockAdapter,
        maxClients: 2,
      });
      ws.start();

      const conn1 = createMockConnection();
      const conn2 = createMockConnection();
      const conn3 = createMockConnection();

      mockAdapter.simulateConnection(conn1);
      mockAdapter.simulateConnection(conn2);
      mockAdapter.simulateConnection(conn3); // Should be rejected

      expect(ws.getClientCount()).toBe(2);
      expect(conn3._isOpen).toBe(false); // Connection was closed
      ws.dispose();
    });

    it('should fire onClientConnected callback', () => {
      const onClientConnected = vi.fn();
      const ws = new CulturalHealthWebSocket({
        monitor: mockMonitor,
        serverAdapter: mockAdapter,
        onClientConnected,
      });
      ws.start();

      const conn = createMockConnection();
      mockAdapter.simulateConnection(conn);

      expect(onClientConnected).toHaveBeenCalledTimes(1);
      expect(typeof onClientConnected.mock.calls[0][0]).toBe('string');
      ws.dispose();
    });

    it('should handle client disconnection', () => {
      wsServer.start();

      const conn = createMockConnection();
      mockAdapter.simulateConnection(conn);
      expect(wsServer.getClientCount()).toBe(1);

      // Simulate disconnect
      conn.close();
      expect(wsServer.getClientCount()).toBe(0);
    });

    it('should fire onClientDisconnected callback', () => {
      const onClientDisconnected = vi.fn();
      const ws = new CulturalHealthWebSocket({
        monitor: mockMonitor,
        serverAdapter: mockAdapter,
        onClientDisconnected,
      });
      ws.start();

      const conn = createMockConnection();
      mockAdapter.simulateConnection(conn);

      // Disconnect
      conn.close();

      expect(onClientDisconnected).toHaveBeenCalledTimes(1);
      ws.dispose();
    });
  });

  // ===========================================================================
  // SNAPSHOT BROADCASTING
  // ===========================================================================

  describe('snapshot broadcasting', () => {
    it('should broadcast snapshot to all connected clients', () => {
      wsServer.start();

      const conn1 = createMockConnection();
      const conn2 = createMockConnection();
      mockAdapter.simulateConnection(conn1);
      mockAdapter.simulateConnection(conn2);

      // Clear initial snapshot messages
      conn1.sentMessages.length = 0;
      conn2.sentMessages.length = 0;

      const snapshot = createTestSnapshot({ populationSize: 42 });
      wsServer.broadcastSnapshot(snapshot);

      expect(conn1.sentMessages.length).toBeGreaterThanOrEqual(1);
      expect(conn2.sentMessages.length).toBeGreaterThanOrEqual(1);

      // Verify snapshot content
      const msg1 = JSON.parse(conn1.sentMessages[0]);
      expect(msg1.type).toBe('snapshot');
      expect(msg1.payload.populationSize).toBe(42);
    });

    it('should not broadcast to disconnected clients', () => {
      wsServer.start();

      const conn = createMockConnection();
      mockAdapter.simulateConnection(conn);
      conn.sentMessages.length = 0;

      // Disconnect
      conn._isOpen = false;

      wsServer.broadcastSnapshot(createTestSnapshot());

      // No new messages should be sent (canSend returns false)
      expect(conn.sentMessages.length).toBe(0);
    });

    it('should increment sequence number on each broadcast', () => {
      wsServer.start();

      const conn = createMockConnection();
      mockAdapter.simulateConnection(conn);
      conn.sentMessages.length = 0;

      wsServer.broadcastSnapshot(createTestSnapshot());
      wsServer.broadcastSnapshot(createTestSnapshot());

      const msg1 = JSON.parse(conn.sentMessages[0]);
      const msg2 = JSON.parse(conn.sentMessages[1]);

      expect(msg2.sequence).toBeGreaterThan(msg1.sequence);
    });

    it('should skip broadcast when no clients connected', () => {
      wsServer.start();

      // Should not throw
      wsServer.broadcastSnapshot(createTestSnapshot());

      expect(wsServer.getMetrics().totalMessagesSent).toBe(0);
    });
  });

  // ===========================================================================
  // SUBSYSTEM SUBSCRIPTIONS
  // ===========================================================================

  describe('subscriptions', () => {
    it('should handle subscribe messages from clients', () => {
      wsServer.start();

      const conn = createMockConnection();
      mockAdapter.simulateConnection(conn);

      const clientId = wsServer.getClientIds()[0];

      // Send subscribe message
      conn.messageHandler!(JSON.stringify({
        type: 'subscribe',
        payload: { subsystems: ['norm_adoption', 'cooperation'] },
      }));

      const sub = wsServer.getClientSubscription(clientId);
      expect(sub).toBeDefined();
      expect(sub!.subsystems.has('norm_adoption')).toBe(true);
      expect(sub!.subsystems.has('cooperation')).toBe(true);
    });

    it('should handle unsubscribe messages from clients', () => {
      wsServer.start();

      const conn = createMockConnection();
      mockAdapter.simulateConnection(conn);

      const clientId = wsServer.getClientIds()[0];

      // Subscribe first
      conn.messageHandler!(JSON.stringify({
        type: 'subscribe',
        payload: { subsystems: ['norm_adoption', 'cooperation'] },
      }));

      // Unsubscribe from one
      conn.messageHandler!(JSON.stringify({
        type: 'unsubscribe',
        payload: { subsystems: ['cooperation'] },
      }));

      const sub = wsServer.getClientSubscription(clientId);
      expect(sub!.subsystems.has('norm_adoption')).toBe(true);
      expect(sub!.subsystems.has('cooperation')).toBe(false);
    });

    it('should send subsystem-specific updates to subscribed clients', () => {
      wsServer.start();

      const conn1 = createMockConnection();
      const conn2 = createMockConnection();
      mockAdapter.simulateConnection(conn1);
      mockAdapter.simulateConnection(conn2);

      // conn1 subscribes to norm_adoption only
      conn1.messageHandler!(JSON.stringify({
        type: 'subscribe',
        payload: { subsystems: ['norm_adoption'] },
      }));

      // conn2 subscribes to cooperation only
      conn2.messageHandler!(JSON.stringify({
        type: 'subscribe',
        payload: { subsystems: ['cooperation'] },
      }));

      // Clear messages
      conn1.sentMessages.length = 0;
      conn2.sentMessages.length = 0;

      // Broadcast
      wsServer.broadcastSnapshot(createTestSnapshot());

      // Both should receive full snapshot (receiveFullSnapshots defaults to true)
      const conn1Messages = conn1.sentMessages.map(m => JSON.parse(m));
      const conn2Messages = conn2.sentMessages.map(m => JSON.parse(m));

      // conn1 should receive norm_update
      const conn1NormUpdates = conn1Messages.filter(m => m.type === 'norm_update');
      expect(conn1NormUpdates.length).toBe(1);

      // conn2 should receive cooperation_update
      const conn2CoopUpdates = conn2Messages.filter(m => m.type === 'cooperation_update');
      expect(conn2CoopUpdates.length).toBe(1);

      // conn1 should NOT receive cooperation_update
      const conn1CoopUpdates = conn1Messages.filter(m => m.type === 'cooperation_update');
      expect(conn1CoopUpdates.length).toBe(0);

      // conn2 should NOT receive norm_update
      const conn2NormUpdates = conn2Messages.filter(m => m.type === 'norm_update');
      expect(conn2NormUpdates.length).toBe(0);
    });

    it('should ignore invalid subsystem names in subscribe', () => {
      wsServer.start();

      const conn = createMockConnection();
      mockAdapter.simulateConnection(conn);

      const clientId = wsServer.getClientIds()[0];

      conn.messageHandler!(JSON.stringify({
        type: 'subscribe',
        payload: { subsystems: ['invalid_subsystem', 'norm_adoption'] },
      }));

      const sub = wsServer.getClientSubscription(clientId);
      expect(sub!.subsystems.has('norm_adoption')).toBe(true);
      expect(sub!.subsystems.size).toBe(1); // Only valid one
    });
  });

  // ===========================================================================
  // ALERT BROADCASTING
  // ===========================================================================

  describe('alert broadcasting', () => {
    it('should broadcast alerts to all clients', () => {
      wsServer.start();

      const conn = createMockConnection();
      mockAdapter.simulateConnection(conn);
      conn.sentMessages.length = 0;

      const alert: CulturalHealthAlert = {
        id: 'test-alert-1',
        severity: 'warning',
        subsystem: 'cooperation',
        message: 'Cooperation declining',
        timestamp: Date.now(),
        relatedIds: [],
        acknowledged: false,
      };

      wsServer.broadcastAlert(alert);

      const messages = conn.sentMessages.map(m => JSON.parse(m));
      const alertMessages = messages.filter(m => m.type === 'alert');
      expect(alertMessages.length).toBe(1);
      expect(alertMessages[0].payload.id).toBe('test-alert-1');
      expect(alertMessages[0].payload.severity).toBe('warning');
    });

    it('should only send alerts to clients subscribed to alerts subsystem', () => {
      wsServer.start();

      const conn1 = createMockConnection();
      const conn2 = createMockConnection();
      mockAdapter.simulateConnection(conn1);
      mockAdapter.simulateConnection(conn2);

      // conn1 subscribes to alerts
      conn1.messageHandler!(JSON.stringify({
        type: 'subscribe',
        payload: { subsystems: ['alerts'] },
      }));

      // conn2 subscribes to norm_adoption (not alerts)
      conn2.messageHandler!(JSON.stringify({
        type: 'subscribe',
        payload: { subsystems: ['norm_adoption'] },
      }));

      conn1.sentMessages.length = 0;
      conn2.sentMessages.length = 0;

      const alert: CulturalHealthAlert = {
        id: 'test-alert-2',
        severity: 'critical',
        subsystem: 'drift',
        message: 'Cultural transition detected',
        timestamp: Date.now(),
        relatedIds: [],
        acknowledged: false,
      };

      wsServer.broadcastAlert(alert);

      const conn1Alerts = conn1.sentMessages.filter(m => JSON.parse(m).type === 'alert');
      const conn2Alerts = conn2.sentMessages.filter(m => JSON.parse(m).type === 'alert');

      expect(conn1Alerts.length).toBe(1);
      expect(conn2Alerts.length).toBe(0);
    });
  });

  // ===========================================================================
  // BACKPRESSURE
  // ===========================================================================

  describe('backpressure', () => {
    it('should skip sends to clients with high buffered amount', () => {
      wsServer.start();

      const conn = createMockConnection();
      mockAdapter.simulateConnection(conn);
      conn.sentMessages.length = 0;

      // Simulate backpressure
      conn._bufferedAmount = 100_000; // Above default 65536 threshold

      wsServer.broadcastSnapshot(createTestSnapshot());

      // No messages should have been sent
      expect(conn.sentMessages.length).toBe(0);
    });

    it('should track dropped messages', () => {
      wsServer.start();

      const conn = createMockConnection();
      mockAdapter.simulateConnection(conn);
      conn.sentMessages.length = 0;

      // Simulate backpressure
      conn._bufferedAmount = 100_000;

      wsServer.broadcastSnapshot(createTestSnapshot());

      expect(wsServer.getMetrics().messagesDropped).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // PING/PONG
  // ===========================================================================

  describe('ping/pong', () => {
    it('should respond to client ping with pong', () => {
      wsServer.start();

      const conn = createMockConnection();
      mockAdapter.simulateConnection(conn);
      conn.sentMessages.length = 0;

      // Send ping from client
      conn.messageHandler!(JSON.stringify({ type: 'ping' }));

      const messages = conn.sentMessages.map(m => JSON.parse(m));
      const pongs = messages.filter(m => m.type === 'pong');
      expect(pongs.length).toBe(1);
    });

    it('should handle invalid JSON from clients gracefully', () => {
      wsServer.start();

      const conn = createMockConnection();
      mockAdapter.simulateConnection(conn);

      // Should not throw
      conn.messageHandler!('not valid json');
      conn.messageHandler!('');
      conn.messageHandler!('{}');

      expect(wsServer.getClientCount()).toBe(1); // Client still connected
    });
  });

  // ===========================================================================
  // METRICS
  // ===========================================================================

  describe('metrics', () => {
    it('should track connected clients', () => {
      wsServer.start();

      expect(wsServer.getMetrics().connectedClients).toBe(0);

      const conn = createMockConnection();
      mockAdapter.simulateConnection(conn);

      expect(wsServer.getMetrics().connectedClients).toBe(1);
    });

    it('should track total messages sent', () => {
      wsServer.start();

      const conn = createMockConnection();
      mockAdapter.simulateConnection(conn);

      const initialSent = wsServer.getMetrics().totalMessagesSent;

      wsServer.broadcastSnapshot(createTestSnapshot());

      expect(wsServer.getMetrics().totalMessagesSent).toBeGreaterThan(initialSent);
    });

    it('should track total messages received', () => {
      wsServer.start();

      const conn = createMockConnection();
      mockAdapter.simulateConnection(conn);

      conn.messageHandler!(JSON.stringify({ type: 'ping' }));
      conn.messageHandler!(JSON.stringify({ type: 'ping' }));

      expect(wsServer.getMetrics().totalMessagesReceived).toBe(2);
    });

    it('should track total broadcasts', () => {
      wsServer.start();

      const conn = createMockConnection();
      mockAdapter.simulateConnection(conn);

      wsServer.broadcastSnapshot(createTestSnapshot());
      wsServer.broadcastSnapshot(createTestSnapshot());

      expect(wsServer.getMetrics().totalBroadcasts).toBe(2);
    });

    it('should track total bytes sent', () => {
      wsServer.start();

      const conn = createMockConnection();
      mockAdapter.simulateConnection(conn);
      conn.sentMessages.length = 0;

      wsServer.broadcastSnapshot(createTestSnapshot());

      expect(wsServer.getMetrics().totalBytesSent).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // ALL_SUBSYSTEMS CONSTANT
  // ===========================================================================

  describe('ALL_SUBSYSTEMS', () => {
    it('should contain all six subsystems', () => {
      expect(ALL_SUBSYSTEMS).toHaveLength(6);
      expect(ALL_SUBSYSTEMS).toContain('norm_adoption');
      expect(ALL_SUBSYSTEMS).toContain('cooperation');
      expect(ALL_SUBSYSTEMS).toContain('drift');
      expect(ALL_SUBSYSTEMS).toContain('boundary');
      expect(ALL_SUBSYSTEMS).toContain('metanorm');
      expect(ALL_SUBSYSTEMS).toContain('alerts');
    });
  });

  // ===========================================================================
  // FACTORY FUNCTION
  // ===========================================================================

  describe('factory function', () => {
    it('should create instance via factory', () => {
      const ws = createCulturalHealthWebSocket({
        monitor: mockMonitor,
        serverAdapter: mockAdapter,
      });
      expect(ws).toBeInstanceOf(CulturalHealthWebSocket);
      expect(ws.getClientCount()).toBe(0);
      ws.dispose();
    });
  });
});
