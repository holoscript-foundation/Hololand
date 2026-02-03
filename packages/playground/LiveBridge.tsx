/**
 * LiveBridge - Phase 55: UAA2 Spatial Feed Consumer
 * 
 * Connects HoloScript Playground to uaa2-service via WebSocket
 * and renders Ghost Orbs for remote agents in real-time.
 */

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface AgentState {
  id: string;
  nodeId: string;
  position: { x: number; y: number; z: number };
  type: string;
  status: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

interface Mission {
  id: string;
  objective: string;
  status: string;
  timestamp: number;
}

export function useLiveBridge(uaa2Url: string = 'http://localhost:3000') {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);

  useEffect(() => {
    const newSocket = io(uaa2Url, {
      path: '/spatial-feed',
      autoConnect: false,
    });

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('[LiveBridge] Connected to UAA2 spatial feed');
      newSocket.emit('request:state');
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      console.log('[LiveBridge] Disconnected from UAA2');
    });

    // State handlers
    newSocket.on('state:agents', (newAgents: AgentState[]) => {
      setAgents(newAgents);
      console.log(`[LiveBridge] Received ${newAgents.length} agents`);
    });

    newSocket.on('state:missions', (newMissions: Mission[]) => {
      setMissions(newMissions);
      console.log(`[LiveBridge] Received ${newMissions.length} missions`);
    });

    // Real-time updates
    newSocket.on('agent:updated', (agent: AgentState) => {
      setAgents(prev => {
        const index = prev.findIndex(a => a.id === agent.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = agent;
          return updated;
        }
        return [...prev, agent];
      });
    });

    newSocket.on('agent:removed', (agent: AgentState) => {
      setAgents(prev => prev.filter(a => a.id !== agent.id));
    });

    newSocket.on('mission:created', (mission: Mission) => {
      setMissions(prev => [...prev, mission]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [uaa2Url]);

  const connect = () => {
    if (socket && !connected) {
      socket.connect();
    }
  };

  const disconnect = () => {
    if (socket && connected) {
      socket.disconnect();
    }
  };

  return {
    connected,
    agents,
    missions,
    connect,
    disconnect,
  };
}

// React component for "Connect to UAA2" button
export function LiveBridgeConnect({ onAgentsUpdate }: { onAgentsUpdate?: (agents: AgentState[]) => void }) {
  const { connected, agents, missions, connect, disconnect } = useLiveBridge();

  useEffect(() => {
    if (onAgentsUpdate) {
      onAgentsUpdate(agents);
    }
  }, [agents, onAgentsUpdate]);

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-900 border border-gray-700 rounded">
      <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-500'}`} />
      <span className="text-xs text-gray-300">
        UAA2 Feed: {connected ? `${agents.length} agents, ${missions.length} missions` : 'Disconnected'}
      </span>
      <button
        onClick={connected ? disconnect : connect}
        className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
      >
        {connected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
}
