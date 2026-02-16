/**
 * Transport Layer Tests
 *
 * Comprehensive tests for WebSocketTransport, WebRTCTransport,
 * SignalingServer, and NetworkManager.
 *
 * All tests run without real WebSocket / WebRTC — mocks simulate
 * the underlying browser APIs so that pure logic is validated.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  WebSocketTransport,
  type WebSocketTransportConfig,
} from '../src/WebSocketTransport';
import {
  WebRTCTransport,
  type WebRTCTransportConfig,
} from '../src/WebRTCTransport';
import {
  SignalingServer,
  createSignalingServer,
  type SignalingServerOptions,
  type SignalingPeer,
} from '../src/SignalingServer';
import {
  NetworkManager,
  createNetworkManager,
} from '../src/NetworkManager';
import type {
  NetworkTransport,
  NetworkConfig,
  EntityState,
  PeerInfo,
  PeerId,
  RoomId,
  NetworkId,
  NetworkMessage,
  NetworkEvents,
} from '../src/types';

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
  binaryType: string = 'arraybuffer';
  onopen: ((e: any) => void) | null = null;
  onclose: ((e: any) => void) | null = null;
  onmessage: ((e: any) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  sentMessages: any[] = [];

  constructor(url: string) {
    this.url = url;
    // Schedule open event
    setTimeout(() => this.simulateOpen(), 0);
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.({ type: 'open' });
  }

  simulateMessage(data: string | object) {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    this.onmessage?.({ data: str });
  }

  simulateClose(code: number = 1000, reason: string = 'normal') {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason, wasClean: code === 1000 });
  }

  simulateError(message: string = 'connection error') {
    this.onerror?.({ type: 'error', message });
  }

  send(data: any) {
    this.sentMessages.push(typeof data === 'string' ? JSON.parse(data) : data);
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => this.simulateClose(code || 1000, reason || 'close'), 0);
  }
}

// Install global mock
(globalThis as any).WebSocket = MockWebSocket;

// Minimal mock for RTCSessionDescription
class MockRTCSessionDescription {
  type: string;
  sdp: string;
  constructor(init: { type: string; sdp: string }) {
    this.type = init.type;
    this.sdp = init.sdp;
  }
}
(globalThis as any).RTCSessionDescription = MockRTCSessionDescription;

// Minimal mock for RTCIceCandidate
class MockRTCIceCandidate {
  candidate: string;
  sdpMLineIndex: number | null;
  sdpMid: string | null;
  constructor(init: any) {
    this.candidate = init.candidate;
    this.sdpMLineIndex = init.sdpMLineIndex ?? null;
    this.sdpMid = init.sdpMid ?? null;
  }
  toJSON() {
    return { candidate: this.candidate, sdpMLineIndex: this.sdpMLineIndex, sdpMid: this.sdpMid };
  }
}
(globalThis as any).RTCIceCandidate = MockRTCIceCandidate;

// Minimal mock for RTCPeerConnection
class MockRTCPeerConnection {
  localDescription: any = null;
  remoteDescription: any = null;
  iceConnectionState: string = 'new';
  connectionState: string = 'new';
  iceGatheringState: string = 'new';
  onicecandidate: ((e: any) => void) | null = null;
  ondatachannel: ((e: any) => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  onicegatheringstatechange: (() => void) | null = null;
  channels: Map<string, MockDataChannel> = new Map();

  async createOffer() {
    return { type: 'offer', sdp: 'mock-sdp-offer' };
  }

  async createAnswer() {
    return { type: 'answer', sdp: 'mock-sdp-answer' };
  }

  async setLocalDescription(desc: any) {
    this.localDescription = desc;
    // Simulate ICE gathering completing immediately
    this.iceGatheringState = 'complete';
    setTimeout(() => {
      this.onicegatheringstatechange?.();
    }, 0);
  }

  async setRemoteDescription(desc: any) {
    this.remoteDescription = desc;
  }

  async addIceCandidate(candidate: any) {
    // no-op
  }

  createDataChannel(label: string, opts?: any): MockDataChannel {
    const ch = new MockDataChannel(label, opts);
    this.channels.set(label, ch);
    return ch;
  }

  close() {
    this.iceConnectionState = 'closed';
    this.connectionState = 'closed';
  }

  simulateDataChannelEvent(label: string, ch: MockDataChannel) {
    this.ondatachannel?.({ channel: ch });
  }

  simulateIceCandidate(candidate: string | null) {
    this.onicecandidate?.({
      candidate: candidate ? { candidate, sdpMLineIndex: 0, sdpMid: '0', toJSON: () => ({ candidate }) } : null,
    });
  }
}

class MockDataChannel {
  label: string;
  readyState: string = 'connecting';
  ordered: boolean;
  maxRetransmits: number | undefined;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((e: any) => void) | null = null;
  sentMessages: any[] = [];

  constructor(label: string, opts?: any) {
    this.label = label;
    this.ordered = opts?.ordered ?? true;
    this.maxRetransmits = opts?.maxRetransmits;
  }

  send(data: any) {
    this.sentMessages.push(typeof data === 'string' ? JSON.parse(data) : data);
  }

  close() {
    this.readyState = 'closed';
    this.onclose?.();
  }

  simulateOpen() {
    this.readyState = 'open';
    this.onopen?.();
  }

  simulateMessage(data: any) {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    this.onmessage?.({ data: str });
  }
}

(globalThis as any).RTCPeerConnection = MockRTCPeerConnection;

// =============================================================================
// HELPERS
// =============================================================================

/** Wait for micro-tasks / setTimeout(0) to flush */
function flush(ms: number = 10): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// =============================================================================
// I. WebSocketTransport
// =============================================================================

describe('WebSocketTransport', () => {
  let transport: WebSocketTransport;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('construction', () => {
    it('creates with default config', () => {
      transport = new WebSocketTransport();
      expect(transport.type).toBe('websocket');
      expect(transport.connected).toBe(false);
    });

    it('accepts custom config', () => {
      transport = new WebSocketTransport({
        heartbeatInterval: 5000,
        reconnect: false,
      });
      expect(transport.type).toBe('websocket');
    });
  });

  describe('connect()', () => {
    it('resolves with a peerId on successful connection', async () => {
      transport = new WebSocketTransport();
      const connectPromise = transport.connect('ws://localhost:8080', 'room1');
      await vi.advanceTimersByTimeAsync(5);

      // MockWebSocket opens immediately; transport resolves connect on open
      const peerId = await connectPromise;
      expect(peerId).toBeTruthy();
      expect(transport.connected).toBe(true);
    });

    it('emits error on connection failure', async () => {
      transport = new WebSocketTransport({ reconnect: false });
      const errors: any[] = [];
      transport.on('error', (e) => errors.push(e));

      // Override WebSocket to fail
      const OrigWS = (globalThis as any).WebSocket;
      (globalThis as any).WebSocket = class FailWS extends MockWebSocket {
        constructor(url: string) {
          super(url);
          setTimeout(() => this.simulateError('fail'), 0);
        }
        simulateOpen() {
          // don't open
        }
      };

      transport.connect('ws://bad', 'room1').catch(() => {});
      await vi.advanceTimersByTimeAsync(100);

      (globalThis as any).WebSocket = OrigWS;
    });
  });

  describe('send()', () => {
    it('returns false when not connected', () => {
      transport = new WebSocketTransport();
      const result = transport.send({
        type: 'test',
        category: 'custom',
        payload: {},
        timestamp: Date.now(),
      });
      expect(result).toBe(false);
    });
  });

  describe('disconnect()', () => {
    it('is safe to call when not connected', () => {
      transport = new WebSocketTransport();
      expect(() => transport.disconnect()).not.toThrow();
    });
  });

  describe('getLatency()', () => {
    it('returns 0 when not connected', () => {
      transport = new WebSocketTransport();
      expect(transport.getLatency()).toBe(0);
    });
  });

  describe('getPeerId()', () => {
    it('returns empty string before connect', () => {
      transport = new WebSocketTransport();
      expect(transport.getPeerId()).toBe('');
    });
  });

  describe('getQueueSize()', () => {
    it('starts at 0', () => {
      transport = new WebSocketTransport();
      expect(transport.getQueueSize()).toBe(0);
    });
  });

  describe('event system', () => {
    it('supports on/off for events', () => {
      transport = new WebSocketTransport();
      const handler = vi.fn();
      const unsub = transport.on('error', handler);
      expect(typeof unsub).toBe('function');
      unsub();
    });

    it('removeAll via off does not throw', () => {
      transport = new WebSocketTransport();
      const handler = vi.fn();
      transport.on('disconnected', handler);
      transport.off('disconnected', handler);
    });
  });
});

// =============================================================================
// II. WebRTCTransport
// =============================================================================

describe('WebRTCTransport', () => {
  let transport: WebRTCTransport;

  describe('construction', () => {
    it('creates with default config', () => {
      transport = new WebRTCTransport();
      expect(transport.type).toBe('webrtc');
      expect(transport.connected).toBe(false);
    });

    it('accepts custom config', () => {
      transport = new WebRTCTransport({
        iceServers: [{ urls: 'stun:stun.test.com:3478' }],
        unreliableChannel: true,
      });
      expect(transport.type).toBe('webrtc');
    });
  });

  describe('createOffer()', () => {
    it('creates an SDP offer for a peer', async () => {
      transport = new WebRTCTransport();
      const offers: any[] = [];
      transport.onSignalOffer((peerId, sdp) => offers.push({ peerId, sdp }));

      await transport.createOffer('peer_a');
      await flush();

      expect(offers.length).toBe(1);
      expect(offers[0].peerId).toBe('peer_a');
      expect(offers[0].sdp).toBe('mock-sdp-offer');
    });
  });

  describe('handleOffer()', () => {
    it('handles an incoming offer and produces an answer', async () => {
      transport = new WebRTCTransport();
      const answers: any[] = [];
      transport.onSignalAnswer((peerId, sdp) => answers.push({ peerId, sdp }));

      await transport.handleOffer('peer_b', 'remote-offer-sdp');
      await flush();

      expect(answers.length).toBe(1);
      expect(answers[0].peerId).toBe('peer_b');
      expect(answers[0].sdp).toBe('mock-sdp-answer');
    });
  });

  describe('handleAnswer()', () => {
    it('applies remote answer to existing peer', async () => {
      transport = new WebRTCTransport();
      transport.onSignalOffer(() => {});

      await transport.createOffer('peer_c');
      await flush();
      await transport.handleAnswer('peer_c', 'answer-sdp');
      // No exception = success
    });

    it('ignores answer for unknown peer', async () => {
      transport = new WebRTCTransport();
      // should not throw
      await transport.handleAnswer('unknown', 'sdp');
    });
  });

  describe('addIceCandidate()', () => {
    it('adds ICE candidate to existing peer', async () => {
      transport = new WebRTCTransport();
      transport.onSignalOffer(() => {});

      await transport.createOffer('peer_d');
      await flush();
      await transport.addIceCandidate('peer_d', JSON.stringify({ candidate: 'candidate-string', sdpMLineIndex: 0, sdpMid: '0' }));
      // success
    });

    it('ignores candidate for unknown peer', async () => {
      transport = new WebRTCTransport();
      await transport.addIceCandidate('ghost', 'candidate');
    });
  });

  describe('send()', () => {
    it('returns false when no peers connected', () => {
      transport = new WebRTCTransport();
      const ok = transport.send({
        type: 'test',
        category: 'custom',
        payload: {},
        timestamp: Date.now(),
      });
      expect(ok).toBe(false);
    });
  });

  describe('sendToPeer()', () => {
    it('returns false for unknown peer', () => {
      transport = new WebRTCTransport();
      const ok = transport.sendToPeer('nobody', {
        type: 'direct',
        category: 'custom',
        payload: {},
        timestamp: Date.now(),
      });
      expect(ok).toBe(false);
    });
  });

  describe('disconnect()', () => {
    it('is safe to call when no peers', () => {
      transport = new WebRTCTransport();
      expect(() => transport.disconnect()).not.toThrow();
    });

    it('closes all peer connections', async () => {
      transport = new WebRTCTransport();
      transport.onSignalOffer(() => {});
      await transport.createOffer('peer_e');
      await flush();
      transport.disconnect();
      expect(transport.getPeerCount()).toBe(0);
    });
  });

  describe('diagnostics', () => {
    it('getPeerCount() returns 0 initially', () => {
      transport = new WebRTCTransport();
      expect(transport.getPeerCount()).toBe(0);
    });

    it('getConnectedPeers() returns empty initially', () => {
      transport = new WebRTCTransport();
      expect(transport.getConnectedPeers()).toEqual([]);
    });

    it('getPeerLatency() returns -1 for unknown peer', () => {
      transport = new WebRTCTransport();
      expect(transport.getPeerLatency('unknown')).toBe(-1);
    });

    it('getLatency() returns 0 when no peers', () => {
      transport = new WebRTCTransport();
      expect(transport.getLatency()).toBe(0);
    });
  });

  describe('event system', () => {
    it('supports on/off', () => {
      transport = new WebRTCTransport();
      const handler = vi.fn();
      const unsub = transport.on('peerJoined', handler);
      unsub();
    });
  });
});

// =============================================================================
// III. SignalingServer
// =============================================================================

describe('SignalingServer', () => {
  let server: SignalingServer;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    server?.stop();
    vi.useRealTimers();
  });

  function makePeer(
    id: string,
    roomId: string = '',
  ): { peer: SignalingPeer; sent: any[] } {
    const sent: any[] = [];
    return {
      peer: {
        peerId: id,
        roomId,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        send: (msg: any) => {
          try {
            sent.push(typeof msg === 'string' ? JSON.parse(msg) : msg);
          } catch {
            sent.push(msg);
          }
        },
      },
      sent,
    };
  }

  describe('creation', () => {
    it('creates with factory function', () => {
      server = createSignalingServer();
      expect(server).toBeInstanceOf(SignalingServer);
    });

    it('creates with options', () => {
      server = new SignalingServer({ maxPeersPerRoom: 4, peerTimeout: 5000 });
      expect(server.getTotalPeers()).toBe(0);
    });
  });

  describe('peer management', () => {
    it('handles join message', () => {
      server = createSignalingServer();
      const { peer, sent } = makePeer('peer1');

      server.handleMessage(peer, { type: 'join', roomId: 'arena' });

      // Should receive peer_list
      expect(sent.length).toBeGreaterThanOrEqual(1);
      const peerListMsg = sent.find((m: any) => m.type === 'peer_list');
      expect(peerListMsg).toBeDefined();
      expect(peerListMsg.peers).toEqual([]);
    });

    it('notifies existing peers when new peer joins', () => {
      server = createSignalingServer();
      const p1 = makePeer('peer1');
      const p2 = makePeer('peer2');

      server.handleMessage(p1.peer, { type: 'join', roomId: 'arena' });
      server.handleMessage(p2.peer, { type: 'join', roomId: 'arena' });

      // p1 should get peer_joined for p2
      const p1Joined = p1.sent.find(
        (m: any) => m.type === 'peer_joined' && m.peerId === 'peer2',
      );
      expect(p1Joined).toBeDefined();

      // p2 should get peer_list with p1
      const p2List = p2.sent.find((m: any) => m.type === 'peer_list');
      expect(p2List).toBeDefined();
      expect(p2List.peers).toContain('peer1');
    });

    it('enforces maxPeersPerRoom', () => {
      server = new SignalingServer({ maxPeersPerRoom: 2 });

      const p1 = makePeer('p1');
      const p2 = makePeer('p2');
      const p3 = makePeer('p3');

      server.handleMessage(p1.peer, { type: 'join', roomId: 'small' });
      server.handleMessage(p2.peer, { type: 'join', roomId: 'small' });
      server.handleMessage(p3.peer, { type: 'join', roomId: 'small' });

      // p3 should get error
      const errMsg = p3.sent.find((m: any) => m.type === 'error');
      expect(errMsg).toBeDefined();
      expect(errMsg.error).toContain('full');
    });

    it('handles leave message', () => {
      server = createSignalingServer();
      const p1 = makePeer('peer1');
      const p2 = makePeer('peer2');

      server.handleMessage(p1.peer, { type: 'join', roomId: 'arena' });
      server.handleMessage(p2.peer, { type: 'join', roomId: 'arena' });

      p1.sent.length = 0;
      server.handleMessage(p2.peer, { type: 'leave' });

      // p1 should get peer_left
      const leftMsg = p1.sent.find((m: any) => m.type === 'peer_left');
      expect(leftMsg).toBeDefined();
      expect(leftMsg.peerId).toBe('peer2');
    });
  });

  describe('signaling relay', () => {
    it('relays offer from one peer to another', () => {
      server = createSignalingServer();
      const p1 = makePeer('peer1');
      const p2 = makePeer('peer2');

      server.handleMessage(p1.peer, { type: 'join', roomId: 'arena' });
      server.handleMessage(p2.peer, { type: 'join', roomId: 'arena' });

      p2.sent.length = 0;
      server.handleMessage(p1.peer, {
        type: 'offer',
        targetPeerId: 'peer2',
        sdp: 'offer-sdp-data',
      });

      const relayed = p2.sent.find((m: any) => m.type === 'offer');
      expect(relayed).toBeDefined();
      expect(relayed.sdp).toBe('offer-sdp-data');
      expect(relayed.fromPeerId).toBe('peer1');
    });

    it('relays answer from one peer to another', () => {
      server = createSignalingServer();
      const p1 = makePeer('peer1');
      const p2 = makePeer('peer2');

      server.handleMessage(p1.peer, { type: 'join', roomId: 'arena' });
      server.handleMessage(p2.peer, { type: 'join', roomId: 'arena' });

      p1.sent.length = 0;
      server.handleMessage(p2.peer, {
        type: 'answer',
        targetPeerId: 'peer1',
        sdp: 'answer-sdp-data',
      });

      const relayed = p1.sent.find((m: any) => m.type === 'answer');
      expect(relayed).toBeDefined();
      expect(relayed.sdp).toBe('answer-sdp-data');
      expect(relayed.fromPeerId).toBe('peer2');
    });

    it('relays ICE candidates', () => {
      server = createSignalingServer();
      const p1 = makePeer('peer1');
      const p2 = makePeer('peer2');

      server.handleMessage(p1.peer, { type: 'join', roomId: 'arena' });
      server.handleMessage(p2.peer, { type: 'join', roomId: 'arena' });

      p2.sent.length = 0;
      server.handleMessage(p1.peer, {
        type: 'candidate',
        targetPeerId: 'peer2',
        candidate: 'ice-candidate-data',
      });

      const relayed = p2.sent.find((m: any) => m.type === 'candidate');
      expect(relayed).toBeDefined();
      expect(relayed.candidate).toBe('ice-candidate-data');
      expect(relayed.fromPeerId).toBe('peer1');
    });

    it('returns error when target peer not found', () => {
      server = createSignalingServer();
      const p1 = makePeer('peer1');

      server.handleMessage(p1.peer, { type: 'join', roomId: 'arena' });

      p1.sent.length = 0;
      server.handleMessage(p1.peer, {
        type: 'offer',
        targetPeerId: 'ghost',
        sdp: 'data',
      });

      const err = p1.sent.find((m: any) => m.type === 'error');
      expect(err).toBeDefined();
    });
  });

  describe('rooms', () => {
    it('tracks room sizes correctly', () => {
      server = createSignalingServer();
      const p1 = makePeer('p1');
      const p2 = makePeer('p2');

      expect(server.getRooms().length).toBe(0);

      server.handleMessage(p1.peer, { type: 'join', roomId: 'lobby' });
      expect(server.getRoomSize('lobby')).toBe(1);

      server.handleMessage(p2.peer, { type: 'join', roomId: 'lobby' });
      expect(server.getRoomSize('lobby')).toBe(2);

      server.handleMessage(p1.peer, { type: 'leave' });
      expect(server.getRoomSize('lobby')).toBe(1);
    });

    it('removes empty rooms', () => {
      server = createSignalingServer();
      const p1 = makePeer('p1');

      server.handleMessage(p1.peer, { type: 'join', roomId: 'temp' });
      expect(server.getRooms()).toContain('temp');

      server.handleMessage(p1.peer, { type: 'leave' });
      expect(server.getRooms()).not.toContain('temp');
    });

    it('getPeersInRoom returns correct peers', () => {
      server = createSignalingServer();
      const p1 = makePeer('p1');
      const p2 = makePeer('p2');

      server.handleMessage(p1.peer, { type: 'join', roomId: 'game' });
      server.handleMessage(p2.peer, { type: 'join', roomId: 'game' });

      const peers = server.getPeersInRoom('game');
      expect(peers.sort()).toEqual(['p1', 'p2']);
    });

    it('getTotalPeers counts across rooms', () => {
      server = createSignalingServer();
      const p1 = makePeer('p1');
      const p2 = makePeer('p2');
      const p3 = makePeer('p3');

      server.handleMessage(p1.peer, { type: 'join', roomId: 'a' });
      server.handleMessage(p2.peer, { type: 'join', roomId: 'a' });
      server.handleMessage(p3.peer, { type: 'join', roomId: 'b' });

      expect(server.getTotalPeers()).toBe(3);
    });

    it('separates peers in different rooms', () => {
      server = createSignalingServer();
      const p1 = makePeer('p1');
      const p2 = makePeer('p2');

      server.handleMessage(p1.peer, { type: 'join', roomId: 'room_a' });
      server.handleMessage(p2.peer, { type: 'join', roomId: 'room_b' });

      // p1 should NOT get peer_joined for p2 (different room)
      const p1Joined = p1.sent.find(
        (m: any) => m.type === 'peer_joined' && m.peerId === 'p2',
      );
      expect(p1Joined).toBeUndefined();
    });
  });

  describe('events', () => {
    it('fires peerJoined event', () => {
      server = createSignalingServer();
      const events: any[] = [];
      server.onPeerJoined = (peerId, roomId) =>
        events.push({ peerId, roomId });

      const p = makePeer('p1');
      server.handleMessage(p.peer, { type: 'join', roomId: 'lobby' });

      expect(events.length).toBe(1);
      expect(events[0]).toEqual({ peerId: 'p1', roomId: 'lobby' });
    });

    it('fires peerLeft event', () => {
      server = createSignalingServer();
      const events: any[] = [];
      server.onPeerLeft = (peerId, roomId) =>
        events.push({ peerId, roomId });

      const p = makePeer('p1');
      server.handleMessage(p.peer, { type: 'join', roomId: 'lobby' });
      server.handleMessage(p.peer, { type: 'leave' });

      expect(events.length).toBe(1);
      expect(events[0]).toEqual({ peerId: 'p1', roomId: 'lobby' });
    });

    it('fires roomCreated event on first join', () => {
      server = createSignalingServer();
      const rooms: string[] = [];
      server.onRoomCreated = (roomId) => rooms.push(roomId);

      const p = makePeer('p1');
      server.handleMessage(p.peer, { type: 'join', roomId: 'newRoom' });

      expect(rooms).toContain('newRoom');
    });

    it('fires roomEmpty event when last peer leaves', () => {
      server = createSignalingServer();
      const emptyRooms: string[] = [];
      server.onRoomEmpty = (roomId) => emptyRooms.push(roomId);

      const p = makePeer('p1');
      server.handleMessage(p.peer, { type: 'join', roomId: 'temp' });
      server.handleMessage(p.peer, { type: 'leave' });

      expect(emptyRooms).toContain('temp');
    });
  });

  describe('heartbeat / cleanup', () => {
    it('handles heartbeat messages', () => {
      server = createSignalingServer();
      const p = makePeer('p1');
      server.handleMessage(p.peer, { type: 'join', roomId: 'lobby' });

      // heartbeat should be accepted without error
      expect(() =>
        server.handleMessage(p.peer, { type: 'heartbeat' }),
      ).not.toThrow();
    });
  });

  describe('stop()', () => {
    it('cleans up timers and rooms', () => {
      server = createSignalingServer({
        heartbeatInterval: 1000,
        peerTimeout: 2000,
      });
      const p = makePeer('p1');
      server.handleMessage(p.peer, { type: 'join', roomId: 'lobby' });

      server.stop();
      expect(server.getTotalPeers()).toBe(0);
    });
  });
});

// =============================================================================
// IV. NetworkManager
// =============================================================================

describe('NetworkManager', () => {
  let manager: NetworkManager;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    try { manager?.disconnect(); } catch {}
    vi.useRealTimers();
  });

  describe('creation', () => {
    it('creates with factory function', () => {
      manager = createNetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });
      expect(manager).toBeInstanceOf(NetworkManager);
      expect(manager.connected).toBe(false);
    });

    it('has default config values', () => {
      manager = new NetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });
      expect(manager.transportType).toBe('websocket');
      expect(manager.peerId).toBe('');
      expect(manager.roomId).toBe('');
    });
  });

  describe('entity management (offline)', () => {
    it('registers entities and returns unique IDs', () => {
      manager = createNetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });

      const id1 = manager.registerEntity('player');
      const id2 = manager.registerEntity('npc');

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });

    it('getLocalEntities returns registered IDs', () => {
      manager = createNetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });

      manager.registerEntity('cube');
      manager.registerEntity('sphere');

      expect(manager.getLocalEntities().length).toBe(2);
    });

    it('updateEntity marks entity dirty', () => {
      manager = createNetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });

      const id = manager.registerEntity('player');
      manager.updateEntity(id, {
        position: { x: 1, y: 2, z: 3 },
      });

      const state = manager.getEntityState(id);
      expect(state).toBeTruthy();
      expect(state?.position).toEqual({ x: 1, y: 2, z: 3 });
    });

    it('unregisterEntity removes the entity', () => {
      manager = createNetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });

      const id = manager.registerEntity('item');
      expect(manager.getLocalEntities().length).toBe(1);

      manager.unregisterEntity(id);
      expect(manager.getLocalEntities().length).toBe(0);
      expect(manager.getEntityState(id)).toBeNull();
    });

    it('updateEntity ignores unknown entity', () => {
      manager = createNetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });

      // Should not throw
      manager.updateEntity('non_existent', {
        position: { x: 0, y: 0, z: 0 },
      });
    });
  });

  describe('events', () => {
    it('supports on/off for typed events', () => {
      manager = createNetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });

      const handler = vi.fn();
      const unsub = manager.on('entitySpawned', handler);
      expect(typeof unsub).toBe('function');
      unsub();
    });

    it('emits entitySpawned when registering', () => {
      manager = createNetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });

      const spawned: any[] = [];
      manager.on('entitySpawned', (e) => spawned.push(e));
      manager.registerEntity('player');

      expect(spawned.length).toBe(1);
      expect(spawned[0].entity.type).toBe('player');
    });

    it('emits entityDespawned when unregistering', () => {
      manager = createNetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });

      const despawned: any[] = [];
      manager.on('entityDespawned', (e) => despawned.push(e));

      const id = manager.registerEntity('item');
      manager.unregisterEntity(id);

      expect(despawned.length).toBe(1);
      expect(despawned[0].networkId).toBe(id);
    });
  });

  describe('RPC', () => {
    it('registers RPC handlers', () => {
      manager = createNetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });

      expect(() =>
        manager.registerRPC('greet', (params) => `Hello ${params[0]}`),
      ).not.toThrow();
    });
  });

  describe('stats', () => {
    it('returns initial stats', () => {
      manager = createNetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });

      const stats = manager.getStats();
      expect(stats.connected).toBe(false);
      expect(stats.transport).toBe('websocket');
      expect(stats.localEntities).toBe(0);
      expect(stats.remoteEntities).toBe(0);
      expect(stats.peers).toBe(0);
      expect(stats.tickCount).toBe(0);
      expect(stats.latency).toBe(0);
    });

    it('stats reflect entity count', () => {
      manager = createNetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });

      manager.registerEntity('a');
      manager.registerEntity('b');
      manager.registerEntity('c');

      expect(manager.getStats().localEntities).toBe(3);
    });
  });

  describe('peers', () => {
    it('getPeers returns empty initially', () => {
      manager = createNetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });

      expect(manager.getPeers()).toEqual([]);
      expect(manager.getPeerCount()).toBe(0);
    });
  });

  describe('getRemoteEntities()', () => {
    it('returns empty initially', () => {
      manager = createNetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });

      expect(manager.getRemoteEntities()).toEqual([]);
    });
  });

  describe('disconnect()', () => {
    it('clears all state', () => {
      manager = createNetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });

      manager.registerEntity('player');
      manager.registerEntity('weapon');

      const disconnected: any[] = [];
      manager.on('disconnected', (e) => disconnected.push(e));

      manager.disconnect('test');

      expect(manager.connected).toBe(false);
      expect(manager.getLocalEntities().length).toBe(0);
      expect(manager.getRemoteEntities().length).toBe(0);
      expect(disconnected.length).toBe(1);
      expect(disconnected[0].reason).toBe('test');
    });

    it('is safe to call multiple times', () => {
      manager = createNetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });

      expect(() => {
        manager.disconnect();
        manager.disconnect();
        manager.disconnect();
      }).not.toThrow();
    });
  });

  describe('entity sync mode', () => {
    it('defaults to owner sync mode', () => {
      manager = createNetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });

      const id = manager.registerEntity('player');
      const state = manager.getEntityState(id);
      expect(state?.syncMode).toBe('owner');
    });

    it('accepts custom sync mode', () => {
      manager = createNetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });

      const id = manager.registerEntity('shared_obj', {
        syncMode: 'shared',
        properties: ['position', 'rotation', 'color'],
      });
      const state = manager.getEntityState(id);
      expect(state?.syncMode).toBe('shared');
    });
  });

  describe('entity position updates', () => {
    it('tracks position, rotation, scale, velocity', () => {
      manager = createNetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });

      const id = manager.registerEntity('ball');

      manager.updateEntity(id, {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0, y: 90, z: 0 },
        scale: { x: 2, y: 2, z: 2 },
        velocity: { x: 0, y: 5, z: 0 },
      });

      const state = manager.getEntityState(id);
      expect(state?.position).toEqual({ x: 1, y: 2, z: 3 });
      expect(state?.rotation).toEqual({ x: 0, y: 90, z: 0 });
      expect(state?.scale).toEqual({ x: 2, y: 2, z: 2 });
      expect(state?.velocity).toEqual({ x: 0, y: 5, z: 0 });
    });

    it('supports metadata on entities', () => {
      manager = createNetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });

      const id = manager.registerEntity('player');
      manager.updateEntity(id, {
        metadata: { health: 100, name: 'Hero' },
      });

      const state = manager.getEntityState(id);
      expect(state?.metadata).toEqual({ health: 100, name: 'Hero' });
    });
  });

  describe('multiple entities', () => {
    it('manages many entities independently', () => {
      manager = createNetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });

      const ids: NetworkId[] = [];
      for (let i = 0; i < 50; i++) {
        ids.push(manager.registerEntity(`obj_${i}`));
      }

      expect(manager.getLocalEntities().length).toBe(50);

      // Update even-numbered entities
      for (let i = 0; i < 50; i += 2) {
        manager.updateEntity(ids[i], {
          position: { x: i, y: 0, z: 0 },
        });
      }

      // Verify updates
      const state10 = manager.getEntityState(ids[10]);
      expect(state10?.position).toEqual({ x: 10, y: 0, z: 0 });

      const state11 = manager.getEntityState(ids[11]);
      expect(state11?.position).toBeUndefined(); // odd, never updated position

      // Remove half
      for (let i = 0; i < 25; i++) {
        manager.unregisterEntity(ids[i]);
      }

      expect(manager.getLocalEntities().length).toBe(25);
    });
  });

  describe('latency', () => {
    it('returns 0 when not connected', () => {
      manager = createNetworkManager({
        serverUrl: 'ws://localhost:8080',
        transport: 'websocket',
      });

      expect(manager.getLatency()).toBe(0);
    });
  });
});

// =============================================================================
// V. Cross-module integration
// =============================================================================

describe('Transport Layer Integration', () => {
  it('SignalingServer can coordinate offer/answer relay', () => {
    // Simulate two peers exchanging SDP via signaling server
    const server = createSignalingServer();

    const p1Sent: any[] = [];
    const p2Sent: any[] = [];

    const peer1: SignalingPeer = {
      peerId: 'p1', roomId: '', joinedAt: Date.now(), lastSeen: Date.now(),
      send: (m: any) => { try { p1Sent.push(typeof m === 'string' ? JSON.parse(m) : m); } catch { p1Sent.push(m); } },
    };
    const peer2: SignalingPeer = {
      peerId: 'p2', roomId: '', joinedAt: Date.now(), lastSeen: Date.now(),
      send: (m: any) => { try { p2Sent.push(typeof m === 'string' ? JSON.parse(m) : m); } catch { p2Sent.push(m); } },
    };

    // Both join
    server.handleMessage(peer1, { type: 'join', roomId: 'game' });
    server.handleMessage(peer2, { type: 'join', roomId: 'game' });

    // p1 sends offer to p2
    p2Sent.length = 0;
    server.handleMessage(peer1, {
      type: 'offer',
      targetPeerId: 'p2',
      sdp: 'sdp-from-p1',
    });

    const offer = p2Sent.find((m: any) => m.type === 'offer');
    expect(offer).toBeDefined();
    expect(offer.fromPeerId).toBe('p1');
    expect(offer.sdp).toBe('sdp-from-p1');

    // p2 sends answer to p1
    p1Sent.length = 0;
    server.handleMessage(peer2, {
      type: 'answer',
      targetPeerId: 'p1',
      sdp: 'answer-from-p2',
    });

    const answer = p1Sent.find((m: any) => m.type === 'answer');
    expect(answer).toBeDefined();
    expect(answer.fromPeerId).toBe('p2');
    expect(answer.sdp).toBe('answer-from-p2');

    // ICE candidates
    p2Sent.length = 0;
    server.handleMessage(peer1, {
      type: 'candidate',
      targetPeerId: 'p2',
      candidate: 'candidate-from-p1',
    });

    const ice = p2Sent.find((m: any) => m.type === 'candidate');
    expect(ice).toBeDefined();
    expect(ice.candidate).toBe('candidate-from-p1');

    server.stop();
  });

  it('NetworkManager entity lifecycle is consistent', () => {
    const manager = createNetworkManager({
      serverUrl: 'ws://test',
      transport: 'websocket',
    });

    const events: string[] = [];
    manager.on('entitySpawned', () => events.push('spawn'));
    manager.on('entityDespawned', () => events.push('despawn'));

    const id1 = manager.registerEntity('player');
    const id2 = manager.registerEntity('weapon');

    manager.updateEntity(id1, { position: { x: 1, y: 0, z: 0 } });
    manager.unregisterEntity(id2);
    manager.unregisterEntity(id1);

    expect(events).toEqual(['spawn', 'spawn', 'despawn', 'despawn']);
    expect(manager.getLocalEntities().length).toBe(0);
  });

  it('WebRTCTransport manages multiple peer connections', async () => {
    const transport = new WebRTCTransport();
    const offers: any[] = [];
    transport.onSignalOffer((peerId, sdp) => offers.push({ peerId, sdp }));

    // Create connections to multiple peers
    await transport.createOffer('alice');
    await transport.createOffer('bob');
    await transport.createOffer('charlie');

    expect(offers.length).toBe(3);
    expect(offers.map((o) => o.peerId).sort()).toEqual(['alice', 'bob', 'charlie']);

    // Disconnect cleans all
    transport.disconnect();
    expect(transport.getPeerCount()).toBe(0);
  });

  it('WebSocketTransport implements NetworkTransport interface', () => {
    const transport: NetworkTransport = new WebSocketTransport();
    expect(transport.type).toBe('websocket');
    expect(transport.connected).toBe(false);
    expect(typeof transport.connect).toBe('function');
    expect(typeof transport.disconnect).toBe('function');
    expect(typeof transport.send).toBe('function');
    expect(typeof transport.on).toBe('function');
    expect(typeof transport.off).toBe('function');
    expect(typeof transport.getLatency).toBe('function');
    expect(typeof transport.getPeerId).toBe('function');
  });

  it('WebRTCTransport peers are isolated per transport instance', async () => {
    const t1 = new WebRTCTransport();
    const t2 = new WebRTCTransport();
    const t1Offers: string[] = [];
    const t2Offers: string[] = [];
    t1.onSignalOffer((peerId) => t1Offers.push(peerId));
    t2.onSignalOffer((peerId) => t2Offers.push(peerId));

    await t1.createOffer('peer_x');
    await t2.createOffer('peer_y');

    // Each transport tracks its own offer independently
    expect(t1Offers).toEqual(['peer_x']);
    expect(t2Offers).toEqual(['peer_y']);

    // Disconnect clears independently
    t1.disconnect();
    expect(t1.getPeerCount()).toBe(0);
    // t2 can still make offers
    await t2.createOffer('peer_z');
    expect(t2Offers).toEqual(['peer_y', 'peer_z']);

    t2.disconnect();
  });

  it('multiple SignalingServer rooms are independent', () => {
    const server = createSignalingServer();

    const sentA: any[] = [];
    const sentB: any[] = [];
    const sentC: any[] = [];

    const pA: SignalingPeer = {
      peerId: 'a', roomId: '', joinedAt: Date.now(), lastSeen: Date.now(),
      send: (m: any) => { try { sentA.push(typeof m === 'string' ? JSON.parse(m) : m); } catch { sentA.push(m); } },
    };
    const pB: SignalingPeer = {
      peerId: 'b', roomId: '', joinedAt: Date.now(), lastSeen: Date.now(),
      send: (m: any) => { try { sentB.push(typeof m === 'string' ? JSON.parse(m) : m); } catch { sentB.push(m); } },
    };
    const pC: SignalingPeer = {
      peerId: 'c', roomId: '', joinedAt: Date.now(), lastSeen: Date.now(),
      send: (m: any) => { try { sentC.push(typeof m === 'string' ? JSON.parse(m) : m); } catch { sentC.push(m); } },
    };

    server.handleMessage(pA, { type: 'join', roomId: 'room1' });
    server.handleMessage(pB, { type: 'join', roomId: 'room2' });
    server.handleMessage(pC, { type: 'join', roomId: 'room1' });

    // A should see C join room1, not B
    const aJoinedMsgs = sentA.filter((m: any) => m.type === 'peer_joined');
    expect(aJoinedMsgs.length).toBe(1);
    expect(aJoinedMsgs[0].peerId).toBe('c');

    // B should NOT see A or C
    const bJoinedMsgs = sentB.filter((m: any) => m.type === 'peer_joined');
    expect(bJoinedMsgs.length).toBe(0);

    expect(server.getRooms().sort()).toEqual(['room1', 'room2']);
    expect(server.getRoomSize('room1')).toBe(2);
    expect(server.getRoomSize('room2')).toBe(1);

    server.stop();
  });
});
