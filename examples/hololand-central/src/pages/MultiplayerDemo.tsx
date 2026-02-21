/**
 * Two-Tab Multiplayer Demo
 * 
 * Demonstrates CRDT synchronization between two browser tabs.
 * Open this page in two tabs and watch state sync in real-time.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { StateSyncNetworkManager, SyncMessage, CRDTOperation } from '@hololand/network';

// Use BroadcastChannel for tab-to-tab communication (same origin)
const CHANNEL_NAME = 'holoscript-crdt-demo';

interface SharedState {
  count: number;
  position: { x: number; y: number };
  messages: string[];
  color: string;
}

const INITIAL_STATE: SharedState = {
  count: 0,
  position: { x: 50, y: 50 },
  messages: [],
  color: '#4ade80',
};

export function useMultiplayerDemo() {
  const [state, setState] = useState<SharedState>(INITIAL_STATE);
  const [peerId] = useState(() => `peer_${Math.random().toString(36).substr(2, 9)}`);
  const [peerCount, setPeerCount] = useState(1);
  
  const channelRef = useRef<BroadcastChannel | null>(null);
  const syncManagerRef = useRef<StateSyncNetworkManager | null>(null);
  
  // Initialize
  useEffect(() => {
    // Create BroadcastChannel for tab-to-tab sync
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;
    
    // Create sync manager
    const syncManager = new StateSyncNetworkManager(peerId);
    syncManagerRef.current = syncManager;
    
    // Wire send callback to BroadcastChannel
    syncManager.setSendCallback((message) => {
      channel.postMessage(message);
    });
    
    // Handle incoming messages
    channel.onmessage = (event) => {
      if (event.data.type === 'state_sync') {
        const ops = syncManager.handleNetworkMessage(event.data);
        applyOperations(ops);
      } else if (event.data.type === 'peer_announce') {
        setPeerCount(prev => prev + 1);
      } else if (event.data.type === 'peer_leave') {
        setPeerCount(prev => Math.max(1, prev - 1));
      }
    };
    
    // Announce presence
    channel.postMessage({ type: 'peer_announce', peerId });
    
    // Cleanup
    return () => {
      channel.postMessage({ type: 'peer_leave', peerId });
      channel.close();
    };
  }, [peerId]);
  
  // Apply received operations to state
  const applyOperations = useCallback((ops: CRDTOperation[]) => {
    setState(prev => {
      let newState = { ...prev };
      
      for (const op of ops) {
        const path = op.path.join('.');
        
        if (op.type === 'set') {
          if (path === 'count') {
            newState.count = op.value as number;
          } else if (path === 'position.x') {
            newState.position = { ...newState.position, x: op.value as number };
          } else if (path === 'position.y') {
            newState.position = { ...newState.position, y: op.value as number };
          } else if (path === 'color') {
            newState.color = op.value as string;
          }
        } else if (op.type === 'increment' && path === 'count') {
          newState.count += (op.value as number) || 1;
        } else if (op.type === 'insert' && path === 'messages') {
          newState.messages = [...newState.messages, op.value as string];
        }
      }
      
      return newState;
    });
  }, []);
  
  // Actions
  const incrementCount = useCallback(() => {
    syncManagerRef.current?.queueOperation({
      type: 'increment',
      path: ['count'],
      value: 1,
    });
    setState(prev => ({ ...prev, count: prev.count + 1 }));
  }, []);
  
  const setPosition = useCallback((x: number, y: number) => {
    syncManagerRef.current?.queueOperation({
      type: 'set',
      path: ['position', 'x'],
      value: x,
    });
    syncManagerRef.current?.queueOperation({
      type: 'set',
      path: ['position', 'y'],
      value: y,
    });
    setState(prev => ({ ...prev, position: { x, y } }));
  }, []);
  
  const setColor = useCallback((color: string) => {
    syncManagerRef.current?.queueOperation({
      type: 'set',
      path: ['color'],
      value: color,
    });
    setState(prev => ({ ...prev, color }));
  }, []);
  
  const addMessage = useCallback((message: string) => {
    syncManagerRef.current?.queueOperation({
      type: 'insert',
      path: ['messages'],
      value: `[${peerId.slice(-4)}] ${message}`,
    });
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, `[${peerId.slice(-4)}] ${message}`],
    }));
  }, [peerId]);
  
  return {
    state,
    peerId,
    peerCount,
    actions: {
      incrementCount,
      setPosition,
      setColor,
      addMessage,
    },
  };
}

/**
 * React Component for the demo UI
 */
export function MultiplayerDemoPage() {
  const { state, peerId, peerCount, actions } = useMultiplayerDemo();
  const [message, setMessage] = useState('');
  
  const handleDrag = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    actions.setPosition(x, y);
  };
  
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    actions.setColor(e.target.value);
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      actions.addMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>🔗 Two-Tab Multiplayer Demo</h1>
      <p>Open this page in another tab to see CRDT sync in action!</p>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <span>🆔 Your ID: <code>{peerId}</code></span>
        <span>👥 Peers: {peerCount}</span>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Counter */}
        <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h2>Counter</h2>
          <p style={{ fontSize: '2rem' }}>{state.count}</p>
          <button onClick={actions.incrementCount}>Increment +1</button>
        </div>
        
        {/* Position */}
        <div 
          style={{ 
            padding: '1rem', 
            border: '1px solid #ccc', 
            borderRadius: '8px',
            height: '200px',
            position: 'relative',
            cursor: 'crosshair',
          }}
          onClick={handleDrag}
        >
          <h2>Position (Click to move)</h2>
          <div 
            style={{
              position: 'absolute',
              left: `${state.position.x}%`,
              top: `${state.position.y}%`,
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: state.color,
              transform: 'translate(-50%, -50%)',
              transition: 'left 0.1s, top 0.1s',
            }}
          />
        </div>
        
        {/* Color Picker */}
        <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h2>Color</h2>
          <input type="color" value={state.color} onChange={handleColorChange} />
        </div>
        
        {/* Messages */}
        <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h2>Messages</h2>
          <div style={{ height: '100px', overflowY: 'auto', border: '1px solid #eee', padding: '0.5rem' }}>
            {state.messages.map((msg, i) => (
              <div key={i}>{msg}</div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} style={{ marginTop: '0.5rem' }}>
            <input 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              placeholder="Type a message..."
              style={{ width: '70%' }}
            />
            <button type="submit">Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default MultiplayerDemoPage;
