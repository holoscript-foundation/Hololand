/**
 * useLiveBridge — React hook connecting to UAA2 spatial feed
 *
 * Provides real-time agent positions and mission state from the
 * uaa2-service via Socket.IO. Each agent maps to a GhostOrb in the scene.
 *
 * Moved from packages/playground/LiveBridge.tsx to proper package.
 *
 * @module ar-hooks
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgentState {
  id: string;
  nodeId: string;
  position: { x: number; y: number; z: number };
  type: string;
  status: string;
  phase?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface Mission {
  id: string;
  objective: string;
  status: string;
  timestamp: number;
}

export interface LiveBridgeConfig {
  /** UAA2 service URL. Default: http://localhost:3000 */
  url?: string;
  /** Socket.IO path. Default: /spatial-feed */
  path?: string;
  /** Auto-connect on mount. Default: false */
  autoConnect?: boolean;
  /** Reconnection attempts. Default: 3 */
  maxRetries?: number;
}

export interface LiveBridgeState {
  connected: boolean;
  agents: AgentState[];
  missions: Mission[];
  connectionError: string | null;
  connect: () => void;
  disconnect: () => void;
}

/**
 * React hook for consuming the UAA2 spatial feed via Socket.IO.
 *
 * Usage:
 * ```tsx
 * const { connected, agents, missions, connect } = useLiveBridge({
 *   url: 'http://localhost:3000',
 *   autoConnect: true,
 * });
 * ```
 */
export function useLiveBridge(config?: LiveBridgeConfig): LiveBridgeState {
  const [connected, setConnected] = useState(false);
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const socketRef = useRef<any>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const initSocket = useCallback(async () => {
    if (socketRef.current) return;

    try {
      // Dynamic import — socket.io-client is optional peer dep
      const { io } = await import('socket.io-client');

      const url = configRef.current?.url ?? 'http://localhost:3000';
      const path = configRef.current?.path ?? '/spatial-feed';

      const socket = io(url, {
        path,
        autoConnect: false,
        reconnectionAttempts: configRef.current?.maxRetries ?? 3,
      });

      socket.on('connect', () => {
        setConnected(true);
        setConnectionError(null);
        socket.emit('request:state');
      });

      socket.on('disconnect', () => {
        setConnected(false);
      });

      socket.on('connect_error', (err: Error) => {
        setConnectionError(err.message);
      });

      // Bulk state updates
      socket.on('state:agents', (newAgents: AgentState[]) => {
        setAgents(newAgents);
      });

      socket.on('state:missions', (newMissions: Mission[]) => {
        setMissions(newMissions);
      });

      // Incremental updates
      socket.on('agent:updated', (agent: AgentState) => {
        setAgents((prev) => {
          const idx = prev.findIndex((a) => a.id === agent.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = agent;
            return updated;
          }
          return [...prev, agent];
        });
      });

      socket.on('agent:removed', (agent: AgentState) => {
        setAgents((prev) => prev.filter((a) => a.id !== agent.id));
      });

      socket.on('mission:created', (mission: Mission) => {
        setMissions((prev) => [...prev, mission]);
      });

      socket.on('mission:updated', (mission: Mission) => {
        setMissions((prev) =>
          prev.map((m) => (m.id === mission.id ? mission : m)),
        );
      });

      socketRef.current = socket;
    } catch {
      setConnectionError('socket.io-client not available');
    }
  }, []);

  const connect = useCallback(async () => {
    await initSocket();
    socketRef.current?.connect();
  }, [initSocket]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
  }, []);

  // Auto-connect if configured
  useEffect(() => {
    if (config?.autoConnect) {
      connect();
    }
  }, [config?.autoConnect, connect]);

  // Cleanup
  useEffect(() => {
    return () => {
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  return { connected, agents, missions, connectionError, connect, disconnect };
}
