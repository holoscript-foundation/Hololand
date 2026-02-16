import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LobbyServer } from '../src/services/LobbyServer';
import type {
  LobbySession,
  LobbyMessage,
  LobbyResponse,
  LobbyEvent,
  AuthenticateFn,
} from '../src/services/LobbyServer';

// ============================================================================
// Helpers
// ============================================================================

function makeSend(): { send: (msg: LobbyMessage) => void; messages: LobbyMessage[] } {
  const messages: LobbyMessage[] = [];
  return { send: (msg: LobbyMessage) => messages.push(msg), messages };
}

function msg(type: string, payload?: Record<string, unknown>, requestId?: string): LobbyMessage {
  return { type, payload, requestId, timestamp: Date.now() };
}

function lastResponse(messages: LobbyMessage[]): LobbyResponse {
  return messages[messages.length - 1] as LobbyResponse;
}

// ============================================================================
// Tests
// ============================================================================

describe('LobbyServer', () => {
  let lobby: LobbyServer;

  beforeEach(() => {
    lobby = new LobbyServer({
      maxSessions: 100,
      requireAuth: false,
      presence: {
        heartbeatTimeout: 5000,
        reaperInterval: 100_000, // long so reaper doesn't fire during tests
      },
      rooms: {
        maxRooms: 50,
        autoDeleteEmpty: true,
        emptyGracePeriod: 0,
      },
    });
    lobby.start();
  });

  afterEach(() => {
    lobby.destroy();
  });

  // ==========================================================================
  // Construction & Lifecycle
  // ==========================================================================

  describe('lifecycle', () => {
    it('creates with defaults', () => {
      const l = new LobbyServer();
      expect(l.getStats().running).toBe(false);
      l.destroy();
    });

    it('start / stop', () => {
      expect(lobby.getStats().running).toBe(true);
      lobby.stop();
      expect(lobby.getStats().running).toBe(false);
      lobby.start();
      expect(lobby.getStats().running).toBe(true);
    });

    it('double start is idempotent', () => {
      lobby.start();
      expect(lobby.getStats().running).toBe(true);
    });

    it('destroy clears all state', () => {
      const { send } = makeSend();
      lobby.createSession('peer1', send);
      lobby.destroy();
      expect(lobby.getStats().sessions).toBe(0);
      expect(lobby.getStats().rooms).toBe(0);
    });
  });

  // ==========================================================================
  // Session Management
  // ==========================================================================

  describe('session management', () => {
    it('creates a session and sends welcome', () => {
      const { send, messages } = makeSend();
      const session = lobby.createSession('peer1', send);

      expect(session.peerId).toBe('peer1');
      expect(session.authenticated).toBe(true); // requireAuth=false
      expect(lobby.getSessionCount()).toBe(1);

      // Welcome message
      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('welcome');
      expect((messages[0].payload as Record<string, unknown>).peerId).toBe('peer1');
    });

    it('creates session with display name', () => {
      const { send } = makeSend();
      const session = lobby.createSession('peer1', send, { displayName: 'Alice' });
      expect(session.displayName).toBe('Alice');
    });

    it('creates session with metadata', () => {
      const { send } = makeSend();
      const session = lobby.createSession('peer1', send, { metadata: { level: 5 } });
      expect(session.metadata).toEqual({ level: 5 });
    });

    it('reconnect destroys old session', () => {
      const s1 = makeSend();
      const s2 = makeSend();

      const session1 = lobby.createSession('peer1', s1.send);
      const session2 = lobby.createSession('peer1', s2.send);

      expect(lobby.getSessionCount()).toBe(1);
      expect(lobby.getSession(session1.id)).toBeUndefined();
      expect(lobby.getSession(session2.id)).toBeDefined();
    });

    it('destroy session cleans up presence and rooms', () => {
      const { send } = makeSend();
      const session = lobby.createSession('peer1', send);

      lobby.destroySession(session.id);
      expect(lobby.getSessionCount()).toBe(0);
      expect(lobby.presence.isOnline('peer1')).toBe(false);
    });

    it('destroy session no-ops for unknown id', () => {
      lobby.destroySession('nonexistent');
      expect(lobby.getSessionCount()).toBe(0);
    });

    it('getSession and getSessionByPeer', () => {
      const { send } = makeSend();
      const session = lobby.createSession('peer1', send);

      expect(lobby.getSession(session.id)?.peerId).toBe('peer1');
      expect(lobby.getSessionByPeer('peer1')?.id).toBe(session.id);
      expect(lobby.getSessionByPeer('unknown')).toBeUndefined();
    });

    it('throws when max sessions reached', () => {
      const small = new LobbyServer({ maxSessions: 2 });
      small.start();
      small.createSession('p1', makeSend().send);
      small.createSession('p2', makeSend().send);
      expect(() => small.createSession('p3', makeSend().send)).toThrow('Maximum session limit');
      small.destroy();
    });

    it('emits session_created event', () => {
      const events: LobbyEvent[] = [];
      lobby.onEvent((e) => events.push(e));

      const { send } = makeSend();
      lobby.createSession('peer1', send);

      const created = events.find((e) => e.type === 'session_created');
      expect(created).toBeDefined();
      expect(created!.data.peerId).toBe('peer1');
    });

    it('emits session_destroyed event', () => {
      const events: LobbyEvent[] = [];
      lobby.onEvent((e) => events.push(e));

      const { send } = makeSend();
      const session = lobby.createSession('peer1', send);
      lobby.destroySession(session.id, 'test');

      const destroyed = events.find((e) => e.type === 'session_destroyed');
      expect(destroyed).toBeDefined();
      expect(destroyed!.data.reason).toBe('test');
    });
  });

  // ==========================================================================
  // Authentication
  // ==========================================================================

  describe('authentication', () => {
    let authLobby: LobbyServer;

    beforeEach(() => {
      authLobby = new LobbyServer({
        maxSessions: 100,
        requireAuth: true,
        rooms: { autoDeleteEmpty: true, emptyGracePeriod: 0 },
      });
      authLobby.start();
    });

    afterEach(() => {
      authLobby.destroy();
    });

    it('session starts unauthenticated when requireAuth=true', () => {
      const { send, messages } = makeSend();
      const session = authLobby.createSession('peer1', send);
      expect(session.authenticated).toBe(false);
      expect((messages[0].payload as Record<string, unknown>).authenticated).toBe(false);
    });

    it('auto-authenticates when no authenticator set', async () => {
      const { send, messages } = makeSend();
      const session = authLobby.createSession('peer1', send);

      await authLobby.handleMessage(session.id, msg('authenticate', { token: 'any' }));
      const resp = lastResponse(messages);
      expect(resp.success).toBe(true);
      expect(session.authenticated).toBe(true);
    });

    it('authenticates with valid token', async () => {
      const authenticator: AuthenticateFn = (token) => (token === 'valid' ? 'peer1' : null);
      authLobby.setAuthenticator(authenticator);

      const { send, messages } = makeSend();
      const session = authLobby.createSession('peer1', send);

      await authLobby.handleMessage(session.id, msg('authenticate', { token: 'valid' }));
      const resp = lastResponse(messages);
      expect(resp.success).toBe(true);
      expect(session.authenticated).toBe(true);
    });

    it('rejects invalid token', async () => {
      const authenticator: AuthenticateFn = (token) => (token === 'valid' ? 'peer1' : null);
      authLobby.setAuthenticator(authenticator);

      const { send, messages } = makeSend();
      const session = authLobby.createSession('peer1', send);

      await authLobby.handleMessage(session.id, msg('authenticate', { token: 'bad' }));
      const resp = lastResponse(messages);
      expect(resp.success).toBe(false);
      expect(session.authenticated).toBe(false);
    });

    it('rejects missing token', async () => {
      authLobby.setAuthenticator(() => null);

      const { send, messages } = makeSend();
      const session = authLobby.createSession('peer1', send);

      await authLobby.handleMessage(session.id, msg('authenticate', {}));
      const resp = lastResponse(messages);
      expect(resp.success).toBe(false);
      expect(resp.error).toBe('Token required');
    });

    it('blocks room operations when unauthenticated', async () => {
      const { send, messages } = makeSend();
      const session = authLobby.createSession('peer1', send);

      await authLobby.handleMessage(
        session.id,
        msg('create_room', { name: 'Test' })
      );
      const resp = lastResponse(messages);
      expect(resp.success).toBe(false);
      expect(resp.error).toBe('Authentication required');
    });
  });

  // ==========================================================================
  // Message Handlers — Room Operations
  // ==========================================================================

  describe('room operations', () => {
    let s1: { send: (msg: LobbyMessage) => void; messages: LobbyMessage[] };
    let s2: { send: (msg: LobbyMessage) => void; messages: LobbyMessage[] };
    let session1: LobbySession;
    let session2: LobbySession;

    beforeEach(() => {
      s1 = makeSend();
      s2 = makeSend();
      session1 = lobby.createSession('peer1', s1.send, { displayName: 'Alice' });
      session2 = lobby.createSession('peer2', s2.send, { displayName: 'Bob' });
    });

    it('create_room creates and responds', async () => {
      await lobby.handleMessage(
        session1.id,
        msg('create_room', { name: 'Arena', category: 'pvp' }, 'req-1')
      );
      const resp = lastResponse(s1.messages);
      expect(resp.success).toBe(true);
      expect(resp.requestId).toBe('req-1');
      expect((resp.payload as Record<string, unknown>).room).toBeDefined();
      expect(lobby.getStats().rooms).toBe(1);
    });

    it('create_room requires name', async () => {
      await lobby.handleMessage(session1.id, msg('create_room', {}));
      const resp = lastResponse(s1.messages);
      expect(resp.success).toBe(false);
      expect(resp.error).toBe('Room name required');
    });

    it('join_room joins and broadcasts', async () => {
      // Create room first
      await lobby.handleMessage(
        session1.id,
        msg('create_room', { name: 'Arena' })
      );
      const createResp = lastResponse(s1.messages);
      const roomId = (
        (createResp.payload as Record<string, unknown>).room as Record<string, unknown>
      ).id as string;

      // Join
      const s2CountBefore = s2.messages.length;
      await lobby.handleMessage(
        session2.id,
        msg('join_room', { roomId })
      );

      const joinResp = lastResponse(s2.messages);
      expect(joinResp.success).toBe(true);

      // Alice should get a player_joined broadcast
      const broadcast = s1.messages.find(
        (m, i) => i > 0 && m.type === 'player_joined'
      );
      expect(broadcast).toBeDefined();
      expect((broadcast!.payload as Record<string, unknown>).peerId).toBe('peer2');
    });

    it('join_room requires roomId', async () => {
      await lobby.handleMessage(session1.id, msg('join_room', {}));
      const resp = lastResponse(s1.messages);
      expect(resp.success).toBe(false);
    });

    it('leave_room leaves and broadcasts', async () => {
      // Create and join
      await lobby.handleMessage(session1.id, msg('create_room', { name: 'Test' }));
      const createResp = lastResponse(s1.messages);
      const roomId = (
        (createResp.payload as Record<string, unknown>).room as Record<string, unknown>
      ).id as string;

      await lobby.handleMessage(session2.id, msg('join_room', { roomId }));

      // Leave
      const s1CountBefore = s1.messages.length;
      await lobby.handleMessage(session2.id, msg('leave_room'));

      const leaveResp = lastResponse(s2.messages);
      expect(leaveResp.success).toBe(true);

      // Alice should get player_left broadcast
      const broadcast = s1.messages.slice(s1CountBefore).find((m) => m.type === 'player_left');
      expect(broadcast).toBeDefined();
    });

    it('leave_room errors when not in a room', async () => {
      await lobby.handleMessage(session1.id, msg('leave_room'));
      const resp = lastResponse(s1.messages);
      expect(resp.success).toBe(false);
      expect(resp.error).toBe('Not in a room');
    });

    it('list_rooms returns public rooms', async () => {
      await lobby.handleMessage(session1.id, msg('create_room', { name: 'Public Room' }));

      await lobby.handleMessage(session2.id, msg('list_rooms'));
      const resp = lastResponse(s2.messages);
      expect(resp.success).toBe(true);
      expect((resp.payload as Record<string, unknown>).total).toBe(1);
    });

    it('search_rooms supports filters', async () => {
      await lobby.handleMessage(
        session1.id,
        msg('create_room', { name: 'PVP Arena', category: 'pvp' })
      );

      await lobby.handleMessage(
        session2.id,
        msg('search_rooms', { category: 'pvp', openOnly: false })
      );
      const resp = lastResponse(s2.messages);
      expect(resp.success).toBe(true);
      expect((resp.payload as Record<string, unknown>).total).toBe(1);
    });

    it('room_info returns room details', async () => {
      await lobby.handleMessage(session1.id, msg('create_room', { name: 'Arena' }));
      const createResp = lastResponse(s1.messages);
      const roomId = (
        (createResp.payload as Record<string, unknown>).room as Record<string, unknown>
      ).id as string;

      await lobby.handleMessage(session2.id, msg('room_info', { roomId }));
      const resp = lastResponse(s2.messages);
      expect(resp.success).toBe(true);
      expect((resp.payload as Record<string, unknown>).room).toBeDefined();
      expect((resp.payload as Record<string, unknown>).players).toBeDefined();
    });

    it('room_info errors for missing roomId', async () => {
      await lobby.handleMessage(session1.id, msg('room_info', {}));
      expect(lastResponse(s1.messages).success).toBe(false);
    });

    it('room_info errors for nonexistent room', async () => {
      await lobby.handleMessage(session1.id, msg('room_info', { roomId: 'bogus' }));
      expect(lastResponse(s1.messages).success).toBe(false);
    });
  });

  // ==========================================================================
  // Message Handlers — Room Admin
  // ==========================================================================

  describe('room admin', () => {
    let s1: ReturnType<typeof makeSend>;
    let s2: ReturnType<typeof makeSend>;
    let session1: LobbySession;
    let session2: LobbySession;
    let roomId: string;

    beforeEach(async () => {
      s1 = makeSend();
      s2 = makeSend();
      session1 = lobby.createSession('host', s1.send);
      session2 = lobby.createSession('player', s2.send);

      await lobby.handleMessage(session1.id, msg('create_room', { name: 'Admin Test' }));
      const resp = lastResponse(s1.messages);
      roomId = ((resp.payload as Record<string, unknown>).room as Record<string, unknown>).id as string;

      await lobby.handleMessage(session2.id, msg('join_room', { roomId }));
    });

    it('kick_player kicks and notifies', async () => {
      const s2Before = s2.messages.length;
      await lobby.handleMessage(
        session1.id,
        msg('kick_player', { roomId, playerId: 'player', reason: 'Testing' })
      );

      const resp = lastResponse(s1.messages);
      expect(resp.success).toBe(true);

      // Kicked player should receive a kicked message
      const kickMsg = s2.messages.slice(s2Before).find((m) => m.type === 'kicked');
      expect(kickMsg).toBeDefined();
      expect((kickMsg!.payload as Record<string, unknown>).reason).toBe('Testing');
    });

    it('kick_player requires roomId and playerId', async () => {
      await lobby.handleMessage(session1.id, msg('kick_player', {}));
      expect(lastResponse(s1.messages).success).toBe(false);
    });

    it('kick_player fails for non-host', async () => {
      await lobby.handleMessage(
        session2.id,
        msg('kick_player', { roomId, playerId: 'host' })
      );
      expect(lastResponse(s2.messages).success).toBe(false);
    });

    it('lock_room locks and broadcasts', async () => {
      const s2Before = s2.messages.length;
      await lobby.handleMessage(session1.id, msg('lock_room', { roomId }));

      expect(lastResponse(s1.messages).success).toBe(true);

      const lockBroadcast = s2.messages.slice(s2Before).find((m) => m.type === 'room_locked');
      expect(lockBroadcast).toBeDefined();
    });

    it('lock_room requires roomId', async () => {
      await lobby.handleMessage(session1.id, msg('lock_room', {}));
      expect(lastResponse(s1.messages).success).toBe(false);
    });

    it('unlock_room unlocks and broadcasts', async () => {
      await lobby.handleMessage(session1.id, msg('lock_room', { roomId }));

      const s2Before = s2.messages.length;
      await lobby.handleMessage(session1.id, msg('unlock_room', { roomId }));

      expect(lastResponse(s1.messages).success).toBe(true);

      const unlockBroadcast = s2.messages.slice(s2Before).find((m) => m.type === 'room_unlocked');
      expect(unlockBroadcast).toBeDefined();
    });

    it('close_room closes and broadcasts', async () => {
      const s2Before = s2.messages.length;
      await lobby.handleMessage(session1.id, msg('close_room', { roomId }));

      expect(lastResponse(s1.messages).success).toBe(true);

      const closeBroadcast = s2.messages.slice(s2Before).find((m) => m.type === 'room_closed');
      expect(closeBroadcast).toBeDefined();
    });

    it('update_room updates and responds', async () => {
      await lobby.handleMessage(
        session1.id,
        msg('update_room', { roomId, name: 'Renamed', category: 'pvp' })
      );

      const resp = lastResponse(s1.messages);
      expect(resp.success).toBe(true);
      const room = (resp.payload as Record<string, unknown>).room as Record<string, unknown>;
      expect(room.name).toBe('Renamed');
    });

    it('update_room requires roomId', async () => {
      await lobby.handleMessage(session1.id, msg('update_room', { name: 'X' }));
      expect(lastResponse(s1.messages).success).toBe(false);
    });

    it('update_room rejects non-host', async () => {
      await lobby.handleMessage(
        session2.id,
        msg('update_room', { roomId, name: 'Hacked' })
      );
      expect(lastResponse(s2.messages).success).toBe(false);
    });
  });

  // ==========================================================================
  // Message Handlers — Presence
  // ==========================================================================

  describe('presence messages', () => {
    let s1: ReturnType<typeof makeSend>;
    let session1: LobbySession;

    beforeEach(() => {
      s1 = makeSend();
      session1 = lobby.createSession('peer1', s1.send);
    });

    it('heartbeat updates presence', async () => {
      await lobby.handleMessage(session1.id, msg('heartbeat'));
      const resp = lastResponse(s1.messages);
      expect(resp.success).toBe(true);
      expect((resp.payload as Record<string, unknown>).serverTime).toBeDefined();
    });

    it('get_presence returns snapshot', async () => {
      await lobby.handleMessage(session1.id, msg('get_presence'));
      const resp = lastResponse(s1.messages);
      expect(resp.success).toBe(true);
      expect((resp.payload as Record<string, unknown>).totalOnline).toBeDefined();
    });

    it('get_presence returns single peer', async () => {
      await lobby.handleMessage(
        session1.id,
        msg('get_presence', { peerId: 'peer1' })
      );
      const resp = lastResponse(s1.messages);
      expect(resp.success).toBe(true);
      expect((resp.payload as Record<string, unknown>).peer).toBeDefined();
    });

    it('get_room_presence returns peers in room', async () => {
      // Create room first
      await lobby.handleMessage(session1.id, msg('create_room', { name: 'Test' }));
      const createResp = lastResponse(s1.messages);
      const roomId = (
        (createResp.payload as Record<string, unknown>).room as Record<string, unknown>
      ).id as string;

      await lobby.handleMessage(
        session1.id,
        msg('get_room_presence', { roomId })
      );
      const resp = lastResponse(s1.messages);
      expect(resp.success).toBe(true);
      expect((resp.payload as Record<string, unknown>).count).toBe(1);
    });

    it('get_room_presence requires roomId', async () => {
      await lobby.handleMessage(session1.id, msg('get_room_presence', {}));
      expect(lastResponse(s1.messages).success).toBe(false);
    });
  });

  // ==========================================================================
  // Display Name
  // ==========================================================================

  describe('set_display_name', () => {
    it('updates display name', async () => {
      const { send, messages } = makeSend();
      const session = lobby.createSession('peer1', send);

      await lobby.handleMessage(
        session.id,
        msg('set_display_name', { displayName: 'NewName' })
      );
      const resp = lastResponse(messages);
      expect(resp.success).toBe(true);
      expect(session.displayName).toBe('NewName');
    });

    it('trims whitespace', async () => {
      const { send, messages } = makeSend();
      const session = lobby.createSession('peer1', send);

      await lobby.handleMessage(
        session.id,
        msg('set_display_name', { displayName: '  Spaced  ' })
      );
      expect(session.displayName).toBe('Spaced');
    });

    it('rejects empty display name', async () => {
      const { send, messages } = makeSend();
      const session = lobby.createSession('peer1', send);

      await lobby.handleMessage(
        session.id,
        msg('set_display_name', { displayName: '' })
      );
      expect(lastResponse(messages).success).toBe(false);
    });

    it('rejects missing display name', async () => {
      const { send, messages } = makeSend();
      const session = lobby.createSession('peer1', send);

      await lobby.handleMessage(session.id, msg('set_display_name', {}));
      expect(lastResponse(messages).success).toBe(false);
    });
  });

  // ==========================================================================
  // Broadcasting
  // ==========================================================================

  describe('broadcasting', () => {
    it('broadcastToRoom sends to all in room except excluded', async () => {
      const s1 = makeSend();
      const s2 = makeSend();
      const s3 = makeSend();

      const session1 = lobby.createSession('host', s1.send);
      const session2 = lobby.createSession('p2', s2.send);
      const session3 = lobby.createSession('p3', s3.send);

      await lobby.handleMessage(session1.id, msg('create_room', { name: 'Test' }));
      const createResp = lastResponse(s1.messages);
      const roomId = (
        (createResp.payload as Record<string, unknown>).room as Record<string, unknown>
      ).id as string;

      await lobby.handleMessage(session2.id, msg('join_room', { roomId }));

      const s1Before = s1.messages.length;
      const s2Before = s2.messages.length;
      const s3Before = s3.messages.length;

      lobby.broadcastToRoom(
        roomId,
        { type: 'custom', payload: { test: true }, timestamp: Date.now() },
        'host' // exclude host
      );

      // p2 should get the message (in room, not excluded)
      const p2New = s2.messages.slice(s2Before);
      expect(p2New.some((m) => m.type === 'custom')).toBe(true);

      // host excluded
      const s1New = s1.messages.slice(s1Before);
      expect(s1New.some((m) => m.type === 'custom')).toBe(false);

      // p3 not in room
      const s3New = s3.messages.slice(s3Before);
      expect(s3New.some((m) => m.type === 'custom')).toBe(false);
    });

    it('broadcast sends to all sessions', () => {
      const s1 = makeSend();
      const s2 = makeSend();
      lobby.createSession('p1', s1.send);
      lobby.createSession('p2', s2.send);

      const s1Before = s1.messages.length;
      const s2Before = s2.messages.length;

      lobby.broadcast({ type: 'announcement', payload: { text: 'hi' }, timestamp: Date.now() });

      expect(s1.messages.slice(s1Before).some((m) => m.type === 'announcement')).toBe(true);
      expect(s2.messages.slice(s2Before).some((m) => m.type === 'announcement')).toBe(true);
    });
  });

  // ==========================================================================
  // Unknown Message Type
  // ==========================================================================

  describe('unknown message type', () => {
    it('sends error for unknown type', async () => {
      const { send, messages } = makeSend();
      const session = lobby.createSession('peer1', send);

      await lobby.handleMessage(session.id, msg('totally_bogus'));
      const resp = lastResponse(messages);
      expect(resp.success).toBe(false);
      expect(resp.error).toContain('Unknown message type');
    });
  });

  // ==========================================================================
  // Internal Wiring
  // ==========================================================================

  describe('internal wiring', () => {
    it('session destroyed on disconnect cleans up rooms', async () => {
      const s1 = makeSend();
      const s2 = makeSend();
      const session1 = lobby.createSession('host', s1.send);
      lobby.createSession('peer2', s2.send);

      // Host creates room, peer2 joins
      await lobby.handleMessage(session1.id, msg('create_room', { name: 'Test' }));
      const createResp = lastResponse(s1.messages);
      const roomId = (
        (createResp.payload as Record<string, unknown>).room as Record<string, unknown>
      ).id as string;

      // Destroy host session — should clean up room
      lobby.destroySession(session1.id);
      // Room should be auto-deleted because it's empty (only host was in it)
      // or host migrated if someone else was present
      expect(lobby.getStats().sessions).toBe(1);
    });

    it('handleMessage no-ops for unknown session', async () => {
      await lobby.handleMessage('bogus', msg('heartbeat'));
      // should not throw
    });
  });

  // ==========================================================================
  // Events
  // ==========================================================================

  describe('events', () => {
    it('subscribe and unsubscribe', () => {
      const events: LobbyEvent[] = [];
      const unsub = lobby.onEvent((e) => events.push(e));

      const { send } = makeSend();
      lobby.createSession('p1', send);
      expect(events.length).toBeGreaterThan(0);

      const count = events.length;
      unsub();
      lobby.createSession('p2', makeSend().send);
      expect(events.length).toBe(count);
    });

    it('listener errors are swallowed', () => {
      lobby.onEvent(() => { throw new Error('boom'); });
      const { send } = makeSend();
      expect(() => lobby.createSession('p1', send)).not.toThrow();
    });
  });

  // ==========================================================================
  // Stats
  // ==========================================================================

  describe('stats', () => {
    it('returns accurate counts', async () => {
      const s1 = makeSend();
      const s2 = makeSend();
      const session1 = lobby.createSession('p1', s1.send);
      lobby.createSession('p2', s2.send);

      await lobby.handleMessage(session1.id, msg('create_room', { name: 'Test' }));

      const stats = lobby.getStats();
      expect(stats.sessions).toBe(2);
      expect(stats.rooms).toBe(1);
      expect(stats.onlinePeers).toBe(2);
      expect(stats.running).toBe(true);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('handler exceptions return error response', async () => {
      const { send, messages } = makeSend();
      const session = lobby.createSession('peer1', send);

      // join_room with invalid roomId triggers a throw from RoomService
      await lobby.handleMessage(
        session.id,
        msg('join_room', { roomId: 'nonexistent' })
      );
      const resp = lastResponse(messages);
      expect(resp.success).toBe(false);
    });

    it('full room flow: create → join → leave → delete', async () => {
      const s1 = makeSend();
      const s2 = makeSend();
      const session1 = lobby.createSession('host', s1.send);
      const session2 = lobby.createSession('player', s2.send);

      // Create
      await lobby.handleMessage(session1.id, msg('create_room', { name: 'Flow Test' }));
      expect(lobby.getStats().rooms).toBe(1);
      const createResp = lastResponse(s1.messages);
      const roomId = (
        (createResp.payload as Record<string, unknown>).room as Record<string, unknown>
      ).id as string;

      // Join
      await lobby.handleMessage(session2.id, msg('join_room', { roomId }));
      expect(lobby.rooms.getPlayers(roomId)).toHaveLength(2);

      // Leave player
      await lobby.handleMessage(session2.id, msg('leave_room'));
      expect(lobby.rooms.getPlayers(roomId)).toHaveLength(1);

      // Leave host → auto-delete empty
      await lobby.handleMessage(session1.id, msg('leave_room'));
      expect(lobby.getStats().rooms).toBe(0);
    });
  });
});
