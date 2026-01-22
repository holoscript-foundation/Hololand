/**
 * @hololand/network RelayService
 * 
 * Specialized relay for HoloScript+ state snapshots.
 * Optimized for low-latency JSON broadcasting.
 */

import { logger } from './logger';
import type { SyncState, StateSnapshot } from './types';

export interface RelayConfig {
  port?: number;
  maxClientsPerRoom?: number;
  snapshotInterval?: number; // ms
  enableAIAutonomy?: boolean;
}

export interface AutonomousAgent {
  id: string;
  type: string;
  processThought(snapshot: StateSnapshot): Promise<void>;
}

export class RelayService {
  private rooms: Map<string, Set<string>> = new Map(); // room -> clientIds
  private agents: Map<string, Set<AutonomousAgent>> = new Map(); // room -> agents
  private stateSnapshots: Map<string, StateSnapshot> = new Map(); // room -> latestSnapshot

  constructor(private config: RelayConfig = {}) {
    logger.info('RelayService initialized', { config });
  }

  /**
   * Handle incoming state snapshot from an authoritative client
   */
  handleIncomingSnapshot(roomId: string, snapshot: StateSnapshot): void {
    const previousSnapshot = this.stateSnapshots.get(roomId);
    
    // Calculate differential state
    const diff = this.calculateDiff(previousSnapshot, snapshot);
    
    // Update central room state
    this.stateSnapshots.set(roomId, snapshot);
    
    // Broadcast only if there are changes
    if (diff.length > 0) {
      this.broadcastToRoom(roomId, {
        type: 'differential_update',
        roomId,
        states: diff,
        timestamp: snapshot.timestamp,
        sequence: snapshot.sequence,
      });
    }

    // Trigger AI thoughts
    if (this.config.enableAIAutonomy) {
      this.triggerAgentThoughts(roomId, snapshot);
    }
  }

  /**
   * Calculate differences between two snapshots
   */
  private calculateDiff(oldSnapshot: StateSnapshot | undefined, newSnapshot: StateSnapshot): SyncState[] {
    if (!oldSnapshot) return newSnapshot.states;

    const oldStates = new Map(oldSnapshot.states.map(s => [s.objectId, s]));
    const diff: SyncState[] = [];

    for (const state of newSnapshot.states) {
      const prevState = oldStates.get(state.objectId);
      
      if (!prevState || this.hasStateChanged(prevState, state)) {
        diff.push(state);
      }
    }

    return diff;
  }

  /**
   * Check if state has meaningfully changed
   */
  private hasStateChanged(s1: SyncState, s2: SyncState): boolean {
    // Position change check (with small epsilon for noise)
    if (s1.position && s2.position) {
      const distSq = 
        Math.pow(s1.position.x - s2.position.x, 2) +
        Math.pow(s1.position.y - s2.position.y, 2) +
        Math.pow(s1.position.z - s2.position.z, 2);
      if (distSq > 0.0001) return true;
    } else if (s1.position !== s2.position) return true;

    // Rotation change check
    if (s1.rotation && s2.rotation) {
      const rotDiff = 
        Math.abs(s1.rotation.x - s2.rotation.x) +
        Math.abs(s1.rotation.y - s2.rotation.y) +
        Math.abs(s1.rotation.z - s2.rotation.z);
      if (rotDiff > 0.01) return true;
    } else if (s1.rotation !== s2.rotation) return true;

    // Metadata change check
    if (JSON.stringify(s1.metadata) !== JSON.stringify(s2.metadata)) return true;

    return false;
  }

  /**
   * Migrate an agent from this relay to another node
   */
  async migrateAgent(roomId: string, agentId: string, targetNodeUrl: string): Promise<boolean> {
    const agents = this.agents.get(roomId);
    if (!agents) return false;

    const agent = Array.from(agents).find(a => a.id === agentId);
    if (!agent) return false;

    logger.info(`Migrating agent ${agentId} from room ${roomId} to ${targetNodeUrl}`);
    
    // In a real MESH, we would serialize the agent's consciousness state 
    // and send it via an authenticated cross-node RPC.
    const migrationPacket = {
      agentId,
      roomId,
      timestamp: Date.now()
    };

    // Simulate handoff success
    this.agents.get(roomId)!.delete(agent);
    return true;
  }

  /**
   * Handle incoming migration from another node
   */
  handleIncomingMigration(roomId: string, agent: AutonomousAgent): void {
    this.registerAgent(roomId, agent);
    logger.info(`Received migration for agent ${agent.id} in room ${roomId}`);
  }

  /**
   * Register an autonomous agent to a room
   */
  registerAgent(roomId: string, agent: AutonomousAgent): void {
    if (!this.agents.has(roomId)) {
      this.agents.set(roomId, new Set());
    }
    this.agents.get(roomId)!.add(agent);
    logger.info(`Autonomous agent ${agent.id} (${agent.type}) registered to room ${roomId}`);
  }

  /**
   * Trigger thoughts for all agents in a room
   */
  private async triggerAgentThoughts(roomId: string, snapshot: StateSnapshot): Promise<void> {
    const agents = this.agents.get(roomId);
    if (!agents) return;

    for (const agent of agents) {
      try {
        await agent.processThought(snapshot);
      } catch (err) {
        logger.error(`Agent ${agent.id} failed to process thought`, { error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  /**
   * Broadcast a message to all clients in a room
   */
  /**
   * Broadcast a message to all clients in a room
   */
  private broadcastToRoom(roomId: string, data: any): void {
    const clients = this.rooms.get(roomId);
    if (!clients) return;

    // Binary Compression: Try to pack data if it's large (snapshot updates)
    let payload: string | Buffer = JSON.stringify(data);
    let isBinary = false;

    if (data.type === 'snapshot' || data.type === 'differential_update') {
      try {
        const { pack } = require('msgpackr');
        payload = pack(data);
        isBinary = true;
      } catch (e) {
        logger.warn('Failed to compress payload', e);
      }
    }

    // Logic for sending to connected WebSockets would go here
    // For now, we simulate the relay behavior and log the optimization
    if (isBinary) {
      logger.debug(`Relaying BINARY snapshot (${(payload as Buffer).length} bytes) to ${clients.size} clients in room ${roomId}`);
    } else {
      logger.debug(`Relaying JSON snapshot (${payload.length} chars) to ${clients.size} clients in room ${roomId}`);
    }
  }

  /**
   * Join a room
   */
  joinRoom(roomId: string, clientId: string): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)!.add(clientId);
    logger.info(`Client ${clientId} joined room ${roomId}`);
  }

  /**
   * Leave a room
   */
  leaveRoom(roomId: string, clientId: string): void {
    const clients = this.rooms.get(roomId);
    if (clients) {
      clients.delete(clientId);
      if (clients.size === 0) {
        this.rooms.delete(roomId);
        this.stateSnapshots.delete(roomId);
      }
    }
    logger.info(`Client ${clientId} left room ${roomId}`);
  }
}
