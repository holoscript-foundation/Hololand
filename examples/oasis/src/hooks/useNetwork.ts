import { useState, useEffect, useCallback } from 'react';
import { Room } from '@hololand/network';
import {
  initNetwork,
  getNetworkClient,
  joinWorldRoom,
  leaveCurrentRoom,
  getCurrentRoom,
  sendPlayerMove,
  sendChatMessage,
  getConnectionInfo,
  disconnect,
} from '@/services/networkService';
import { useAuthStore } from '@/stores/authStore';

interface NetworkState {
  connected: boolean;
  connecting: boolean;
  room: Room | null;
  latency: number;
  error: string | null;
}

/**
 * Hook for managing network connection and room state
 */
export function useNetwork() {
  const { isAuthenticated, user } = useAuthStore();
  const [state, setState] = useState<NetworkState>({
    connected: false,
    connecting: false,
    room: null,
    latency: 0,
    error: null,
  });

  // Connect to network when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
    } else {
      disconnect();
      setState((s) => ({ ...s, connected: false, room: null }));
    }
  }, [isAuthenticated, user]);

  const connect = useCallback(async () => {
    setState((s) => ({ ...s, connecting: true, error: null }));
    try {
      await initNetwork({
        url: import.meta.env.VITE_WS_URL || 'wss://api.hololand.io',
      });
      setState((s) => ({ ...s, connected: true, connecting: false }));
    } catch (error) {
      setState((s) => ({
        ...s,
        connected: false,
        connecting: false,
        error: (error as Error).message,
      }));
    }
  }, []);

  const joinRoom = useCallback(async (worldId: string) => {
    if (!getNetworkClient()?.isConnected()) {
      throw new Error('Not connected to network');
    }
    const room = await joinWorldRoom(worldId);
    setState((s) => ({ ...s, room }));
    return room;
  }, []);

  const leaveRoom = useCallback(async () => {
    await leaveCurrentRoom();
    setState((s) => ({ ...s, room: null }));
  }, []);

  // Update latency periodically
  useEffect(() => {
    if (!state.connected) return;

    const interval = setInterval(() => {
      const info = getConnectionInfo();
      if (info) {
        setState((s) => ({ ...s, latency: info.latency }));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [state.connected]);

  return {
    ...state,
    connect,
    joinRoom,
    leaveRoom,
    sendPlayerMove,
    sendChatMessage,
    getCurrentRoom,
    getConnectionInfo,
  };
}

/**
 * Hook for room-specific functionality
 */
export function useRoom(worldId?: string) {
  const { joinRoom, leaveRoom, room, connected } = useNetwork();
  const [players, setPlayers] = useState<Map<string, unknown>>(new Map());
  const [messages, setMessages] = useState<Array<{ from: string; message: string; time: number }>>(
    []
  );

  // Join room when worldId is provided
  useEffect(() => {
    if (worldId && connected && !room) {
      joinRoom(worldId);
    }

    return () => {
      if (room) {
        leaveRoom();
      }
    };
  }, [worldId, connected, room, joinRoom, leaveRoom]);

  // Set up room event listeners
  useEffect(() => {
    if (!room) return;

    const handlePlayerJoin = (player: unknown) => {
      setPlayers((p) => {
        const newPlayers = new Map(p);
        newPlayers.set((player as { id: string }).id, player);
        return newPlayers;
      });
    };

    const handlePlayerLeave = (player: unknown) => {
      setPlayers((p) => {
        const newPlayers = new Map(p);
        newPlayers.delete((player as { id: string }).id);
        return newPlayers;
      });
    };

    const handlePlayerMove = (data: unknown, playerId: string) => {
      setPlayers((p) => {
        const newPlayers = new Map(p);
        const existing = newPlayers.get(playerId) || {};
        newPlayers.set(playerId, { ...(existing as object), ...(data as object) });
        return newPlayers;
      });
    };

    const handleChatMessage = (data: { message: string; timestamp: number }, playerId: string) => {
      setMessages((m) =>
        [...m, { from: playerId, message: data.message, time: data.timestamp }].slice(-100)
      ); // Keep last 100 messages
    };

    room.on('player:join', handlePlayerJoin);
    room.on('player:leave', handlePlayerLeave);
    room.on('player:move', handlePlayerMove);
    room.on('chat:message', handleChatMessage);

    return () => {
      room.off('player:join', handlePlayerJoin);
      room.off('player:leave', handlePlayerLeave);
      room.off('player:move', handlePlayerMove);
      room.off('chat:message', handleChatMessage);
    };
  }, [room]);

  return {
    room,
    players: Array.from(players.values()),
    messages,
    sendMove: sendPlayerMove,
    sendMessage: sendChatMessage,
  };
}
