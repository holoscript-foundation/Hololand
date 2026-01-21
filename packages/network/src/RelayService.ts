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
}

export class RelayService {
  private rooms: Map<string, Set<string>> = new Map(); // room -> clientIds
  private stateSnapshots: Map<string, StateSnapshot> = new Map(); // room -> latestSnapshot

  constructor(private config: RelayConfig = {}) {
    logger.info('RelayService initialized', { config });
  }

  /**
   * Handle incoming state snapshot from an authoritative client
   */
  handleIncomingSnapshot(roomId: string, snapshot: StateSnapshot): void {
    // Update central room state
    this.stateSnapshots.set(roomId, snapshot);
    
    // Broadcast to all other clients in the room
    this.broadcastToRoom(roomId, snapshot);
  }

  /**
   * Broadcast a message to all clients in a room
   */
  private broadcastToRoom(roomId: string, data: any): void {
    const clients = this.rooms.get(roomId);
    if (!clients) return;

    // Logic for sending to connected WebSockets would go here
    // For now, we simulate the relay behavior
    logger.debug(`Relaying snapshot to ${clients.size} clients in room ${roomId}`);
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
