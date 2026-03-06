/**
 * HololandNetwork
 *
 * High-level factory and manager for Hololand Networking.
 * Wires the WebSocket NetworkClient to the CoPresenceBridge (Traits).
 */

import { NetworkClient } from './NetworkClient';
import { CoPresenceBridge } from './CoPresenceBridge';
import { StateSync } from './StateSync';
import { LatencyTracker } from './LatencyTracker';
import { JitterBuffer } from './JitterBuffer';
import { CorrectionBudget } from './CorrectionBudget';
import type { ConnectionConfig, SyncConfig } from './types';

export interface NetworkSystem {
  client: NetworkClient;
  bridge: CoPresenceBridge;
  stateSync: StateSync;
  latencyTracker: LatencyTracker;
  connect(url: string, roomId?: string): Promise<void>;
  disconnect(): void;
  update(delta: number): void;
}

export function createHololandNetwork(
  config: ConnectionConfig,
  syncConfig?: SyncConfig,
): NetworkSystem {
  // 1. Create Client
  const client = new NetworkClient(config);

  // 2. Create latency compensation subsystems
  const latencyTracker = new LatencyTracker(60);
  const jitterBuffer = new JitterBuffer(syncConfig?.jitterBufferSize ?? 32);
  const correctionBudget = new CorrectionBudget(syncConfig?.correctionBudgetPerFrame ?? 0.05);

  // 3. Create StateSync and wire subsystems
  const stateSync = new StateSync(syncConfig);
  stateSync.setLatencyTracker(latencyTracker);
  stateSync.setJitterBuffer(jitterBuffer);
  stateSync.setCorrectionBudget(correctionBudget);

  // 4. Wire LatencyTracker into NetworkClient heartbeat
  client.setLatencyTracker(latencyTracker);

  // 5. Create Bridge
  const bridge = new CoPresenceBridge('pending_peer_id');

  // 6. Wire: Bridge -> Client (Broadcasting)
  bridge.setBroadcastFunction((nodeId, state) => {
    client.send({
      type: 'state_update',
      category: 'world',
      payload: { nodeId, state },
      timestamp: Date.now()
    });
  });

  // 7. Wire: Client -> Bridge (Receiving)
  client.on('message', (msg: any) => {
    if (msg.type === 'state_update' as any && msg.payload?.nodeId) {
      bridge.receiveRemoteUpdate(
        msg.payload.nodeId,
        msg.payload.state,
        msg.senderId || 'unknown'
      );
    }
  });

  client.on('connected', (data) => {
    if (bridge['localPeerId']) {
       // bridge.setLocalPeerId(data.clientId);
    }
  });

  // 8. Enable burst mode on reconnection
  client.on('reconnecting', () => {
    correctionBudget.enableBurst();
  });

  return {
    client,
    bridge,
    stateSync,
    latencyTracker,

    async connect(url: string, roomId?: string) {
      await client.connect();
      if (roomId) {
        await client.sendRPC('join_room', [roomId]);
      }
    },

    disconnect() {
      client.disconnect();
    },

    update(delta: number) {
      bridge.update(delta);
      // Flush jitter buffer + process correction budget
      stateSync.update(delta * 1000); // convert seconds to ms
    }
  };
}
