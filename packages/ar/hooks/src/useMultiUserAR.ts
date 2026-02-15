/**
 * useMultiUserAR — React hook for shared AR sessions
 *
 * Wraps createARRuntime + WebSocket signaling to synchronize anchor
 * positions and user poses across multiple AR headsets in the same space.
 *
 * @module ar-hooks
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Pose } from './useAnchor';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ARUser {
  id: string;
  displayName: string;
  headPose: Pose;
  handPoses?: { left?: Pose; right?: Pose };
  avatarUrl?: string;
  lastSeen: number;
}

export interface SharedAnchor {
  id: string;
  creatorId: string;
  worldPose: Pose;
  confidence: number;
  timestamp: number;
}

export interface MultiUserARConfig {
  /** WebSocket server URL for signaling. */
  signalingUrl: string;
  /** Room/session identifier. */
  roomId: string;
  /** Local user display name. */
  displayName: string;
  /** How often to broadcast local pose (ms). Default 50 (20Hz). */
  broadcastIntervalMs?: number;
  /** Max age before a user is considered disconnected (ms). Default 5000. */
  userTimeoutMs?: number;
}

export type MultiUserAREvent =
  | { type: 'user:joined'; user: ARUser }
  | { type: 'user:left'; userId: string }
  | { type: 'anchor:shared'; anchor: SharedAnchor }
  | { type: 'anchor:removed'; anchorId: string }
  | { type: 'connected' }
  | { type: 'disconnected'; reason: string };

export interface MultiUserARState {
  users: ARUser[];
  sharedAnchors: SharedAnchor[];
  isConnected: boolean;
  localUserId: string | null;
  events: MultiUserAREvent[];
  connect: () => void;
  disconnect: () => void;
  broadcastPose: (headPose: Pose, handPoses?: { left?: Pose; right?: Pose }) => void;
  shareAnchor: (id: string, worldPose: Pose) => void;
  removeSharedAnchor: (id: string) => void;
}

// ─── Message Protocol ───────────────────────────────────────────────────────

interface WSMessage {
  type: string;
  payload: any;
  senderId?: string;
  timestamp?: number;
}

/**
 * React hook for multi-user shared AR sessions.
 *
 * Usage:
 * ```tsx
 * const { users, isConnected, connect, broadcastPose, shareAnchor } = useMultiUserAR({
 *   signalingUrl: 'wss://signal.hololand.dev',
 *   roomId: 'office-demo',
 *   displayName: 'Alice',
 * });
 * ```
 */
export function useMultiUserAR(config: MultiUserARConfig): MultiUserARState {
  const [users, setUsers] = useState<ARUser[]>([]);
  const [sharedAnchors, setSharedAnchors] = useState<SharedAnchor[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [localUserId, setLocalUserId] = useState<string | null>(null);
  const [events, setEvents] = useState<MultiUserAREvent[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const broadcastIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const localPoseRef = useRef<{ head: Pose; hands?: { left?: Pose; right?: Pose } } | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const pushEvent = useCallback((event: MultiUserAREvent) => {
    setEvents((prev) => [...prev.slice(-49), event]);
  }, []);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        ...msg,
        senderId: localUserId,
        timestamp: Date.now(),
      }));
    }
  }, [localUserId]);

  const connect = useCallback(() => {
    if (wsRef.current) return;

    const ws = new WebSocket(configRef.current.signalingUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setLocalUserId(userId);
      setIsConnected(true);
      pushEvent({ type: 'connected' });

      // Join room
      ws.send(JSON.stringify({
        type: 'join',
        payload: {
          roomId: configRef.current.roomId,
          userId,
          displayName: configRef.current.displayName,
        },
        senderId: userId,
        timestamp: Date.now(),
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        handleMessage(msg);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      wsRef.current = null;
      pushEvent({ type: 'disconnected', reason: event.reason || 'Connection closed' });
    };

    ws.onerror = () => {
      // onclose will fire after onerror
    };
  }, [pushEvent]);

  const handleMessage = useCallback((msg: WSMessage) => {
    switch (msg.type) {
      case 'user:joined': {
        const user: ARUser = msg.payload;
        setUsers((prev) => [...prev.filter((u) => u.id !== user.id), user]);
        pushEvent({ type: 'user:joined', user });
        break;
      }

      case 'user:left': {
        setUsers((prev) => prev.filter((u) => u.id !== msg.payload.userId));
        pushEvent({ type: 'user:left', userId: msg.payload.userId });
        break;
      }

      case 'pose:update': {
        const { userId, headPose, handPoses } = msg.payload;
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, headPose, handPoses, lastSeen: Date.now() }
              : u,
          ),
        );
        break;
      }

      case 'anchor:shared': {
        const anchor: SharedAnchor = msg.payload;
        setSharedAnchors((prev) => [...prev.filter((a) => a.id !== anchor.id), anchor]);
        pushEvent({ type: 'anchor:shared', anchor });
        break;
      }

      case 'anchor:removed': {
        setSharedAnchors((prev) => prev.filter((a) => a.id !== msg.payload.anchorId));
        pushEvent({ type: 'anchor:removed', anchorId: msg.payload.anchorId });
        break;
      }

      case 'room:state': {
        // Full state sync on join
        if (msg.payload.users) setUsers(msg.payload.users);
        if (msg.payload.anchors) setSharedAnchors(msg.payload.anchors);
        break;
      }
    }
  }, [pushEvent]);

  const disconnect = useCallback(() => {
    if (broadcastIntervalRef.current) {
      clearInterval(broadcastIntervalRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
    setUsers([]);
    setSharedAnchors([]);
  }, []);

  const broadcastPose = useCallback((headPose: Pose, handPoses?: { left?: Pose; right?: Pose }) => {
    localPoseRef.current = { head: headPose, hands: handPoses };
  }, []);

  // Periodic pose broadcasting
  useEffect(() => {
    if (!isConnected) return;

    broadcastIntervalRef.current = setInterval(() => {
      if (localPoseRef.current) {
        send({
          type: 'pose:update',
          payload: {
            userId: localUserId,
            headPose: localPoseRef.current.head,
            handPoses: localPoseRef.current.hands,
          },
        });
      }
    }, config.broadcastIntervalMs ?? 50);

    return () => clearInterval(broadcastIntervalRef.current);
  }, [isConnected, localUserId, config.broadcastIntervalMs, send]);

  // Prune timed-out users
  useEffect(() => {
    if (!isConnected) return;

    const timeout = config.userTimeoutMs ?? 5000;
    const interval = setInterval(() => {
      const now = Date.now();
      setUsers((prev) => prev.filter((u) => now - u.lastSeen < timeout));
    }, timeout / 2);

    return () => clearInterval(interval);
  }, [isConnected, config.userTimeoutMs]);

  const shareAnchor = useCallback((id: string, worldPose: Pose) => {
    const anchor: SharedAnchor = {
      id,
      creatorId: localUserId || '',
      worldPose,
      confidence: 1,
      timestamp: Date.now(),
    };
    setSharedAnchors((prev) => [...prev.filter((a) => a.id !== id), anchor]);
    send({ type: 'anchor:shared', payload: anchor });
  }, [localUserId, send]);

  const removeSharedAnchor = useCallback((id: string) => {
    setSharedAnchors((prev) => prev.filter((a) => a.id !== id));
    send({ type: 'anchor:removed', payload: { anchorId: id } });
  }, [send]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearInterval(broadcastIntervalRef.current);
      wsRef.current?.close();
    };
  }, []);

  return {
    users, sharedAnchors, isConnected, localUserId, events,
    connect, disconnect, broadcastPose, shareAnchor, removeSharedAnchor,
  };
}
