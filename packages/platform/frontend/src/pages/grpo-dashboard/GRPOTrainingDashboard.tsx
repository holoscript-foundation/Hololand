import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GRPORewardChart } from './GRPORewardChart';
import { GRPOControlPanel } from './GRPOControlPanel';
import type { GRPOTrainingState, GRPOWebSocketMessage, GRPOControlConfig, CompletionPair } from './types';

interface GRPOTrainingDashboardProps {
  wsUrl?: string;
}

/**
 * GRPOTrainingDashboard -- Real-time GRPO training monitoring dashboard.
 *
 * Connects via WebSocket to display:
 * - Per-reward-function training curves
 * - KL divergence over time
 * - Best/worst completion pairs for inspection
 * - Training control panel (start/stop, hyperparameters)
 */
export function GRPOTrainingDashboard({ wsUrl = 'ws://localhost:8080/grpo' }: GRPOTrainingDashboardProps) {
  const [state, setState] = useState<GRPOTrainingState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [completionPairs, setCompletionPairs] = useState<CompletionPair[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setConnectionStatus('connecting');

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnectionStatus('connected');
    ws.onclose = () => {
      setConnectionStatus('disconnected');
      setTimeout(connect, 3000);
    };
    ws.onerror = () => setConnectionStatus('disconnected');
    ws.onmessage = (event) => {
      try {
        const msg: GRPOWebSocketMessage = JSON.parse(event.data);
        switch (msg.type) {
          case 'state':
            setState(msg.payload);
            break;
          case 'completion_pair':
            setCompletionPairs((prev) => [msg.payload, ...prev].slice(0, 50));
            break;
          case 'reward_update':
          case 'kl_update':
            // Handled by state updates
            break;
          case 'error':
            console.error('[GRPO WS]', msg.payload.message);
            break;
        }
      } catch {
        // Ignore malformed messages
      }
    };
  }, [wsUrl]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  const sendCommand = useCallback((type: string, payload?: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const handleStart = useCallback((config: GRPOControlConfig) => sendCommand('start', config), [sendCommand]);
  const handleStop = useCallback(() => sendCommand('stop'), [sendCommand]);
  const handlePause = useCallback(() => sendCommand('pause'), [sendCommand]);

  const statusColor = connectionStatus === 'connected' ? '#4ade80' : connectionStatus === 'connecting' ? '#fbbf24' : '#f87171';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #08090f 0%, #0d1020 100%)',
        padding: 24,
        color: '#d0d0e8',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8e8f8', marginBottom: 4 }}>
            GRPO Training Dashboard
          </h1>
          <p style={{ fontSize: 12, color: '#667788' }}>
            Group Relative Policy Optimization -- Real-time monitoring
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: '#667788', textTransform: 'capitalize' }}>{connectionStatus}</span>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, maxWidth: 1200 }}>
        {/* Left: Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Reward curves */}
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
            <GRPORewardChart rewardFunctions={state?.rewardFunctions ?? []} width={680} height={280} />
          </div>

          {/* Best/Worst completion pairs */}
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e8e8f8', marginBottom: 12 }}>
              Completion Pairs (Best vs Worst)
            </h3>
            {completionPairs.length === 0 ? (
              <p style={{ fontSize: 12, color: '#556677', textAlign: 'center', padding: 20 }}>
                No completion pairs yet. Training must be running.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
                {completionPairs.slice(0, 5).map((pair, i) => (
                  <div key={`${pair.step}-${i}`} style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', fontSize: 11, color: '#889' }}>
                      <strong>Prompt (Step {pair.step}):</strong> {pair.prompt.slice(0, 100)}...
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                      <div style={{ padding: 12, borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ fontSize: 10, color: '#4ade80', fontWeight: 600, marginBottom: 4 }}>
                          BEST (reward: {pair.best.reward.toFixed(3)})
                        </div>
                        <p style={{ fontSize: 11, color: '#b0b0c8', lineHeight: 1.4, margin: 0 }}>
                          {pair.best.text.slice(0, 200)}
                        </p>
                      </div>
                      <div style={{ padding: 12 }}>
                        <div style={{ fontSize: 10, color: '#f87171', fontWeight: 600, marginBottom: 4 }}>
                          WORST (reward: {pair.worst.reward.toFixed(3)})
                        </div>
                        <p style={{ fontSize: 11, color: '#b0b0c8', lineHeight: 1.4, margin: 0 }}>
                          {pair.worst.text.slice(0, 200)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Control panel */}
        <div>
          <GRPOControlPanel
            state={state}
            onStart={handleStart}
            onStop={handleStop}
            onPause={handlePause}
          />
        </div>
      </div>
    </div>
  );
}

export default GRPOTrainingDashboard;
