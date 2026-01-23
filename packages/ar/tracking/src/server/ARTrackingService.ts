/**
 * AR Tracking WebSocket Service
 * 
 * Handles real-time communication between headsets and the tracking server.
 * - Receives detection updates from multiple headsets
 * - Fuses detections into global tracking state
 * - Broadcasts stable person IDs back to all clients
 */

import { MultiTargetTracker } from './MultiTargetTracker';
import type {
  ClientMessage,
  ServerMessage,
  TrackingBroadcast,
  PersonDetectedEvent,
  PersonLost,
  PersonIdentified,
  DetectionUpdate,
  HeadsetRegistration,
  AnchorAlignment,
  TrackedPerson,
  TrackingConfig,
} from '../types';

export interface ConnectedHeadset {
  id: string;
  userId: string;
  deviceType: string;
  hasDepthSensor: boolean;
  isAligned: boolean;
  lastUpdate: number;
}

export interface TrackingServiceEvents {
  onPersonDetected?: (event: PersonDetectedEvent) => void;
  onPersonLost?: (event: PersonLost) => void;
  onPersonIdentified?: (event: PersonIdentified) => void;
  onBroadcast?: (broadcast: TrackingBroadcast) => void;
}

/**
 * AR Tracking Service (Server-side)
 * 
 * Aggregates detections from multiple headsets and maintains
 * globally consistent person tracking.
 */
export class ARTrackingService {
  private tracker: MultiTargetTracker;
  private headsets: Map<string, ConnectedHeadset> = new Map();
  private pendingDetections: Map<string, DetectionUpdate[]> = new Map();
  private broadcastInterval: NodeJS.Timeout | null = null;
  private lastTrackedPersons: TrackedPerson[] = [];
  private events: TrackingServiceEvents;

  constructor(config?: Partial<TrackingConfig>, events?: TrackingServiceEvents) {
    this.tracker = new MultiTargetTracker(config);
    this.events = events ?? {};
  }

  /**
   * Handle incoming client message
   */
  handleMessage(message: ClientMessage): ServerMessage | null {
    switch (message.type) {
      case 'register':
        return this.handleRegistration(message);
      case 'detections':
        return this.handleDetections(message);
      case 'anchor_aligned':
        return this.handleAnchorAlignment(message);
      default:
        return null;
    }
  }

  /**
   * Handle headset registration
   */
  private handleRegistration(msg: HeadsetRegistration): ServerMessage | null {
    const headset: ConnectedHeadset = {
      id: msg.headsetId,
      userId: msg.userId,
      deviceType: msg.deviceType,
      hasDepthSensor: msg.hasDepthSensor,
      isAligned: false,
      lastUpdate: Date.now(),
    };

    this.headsets.set(msg.headsetId, headset);
    this.pendingDetections.set(msg.headsetId, []);

    // Return current state
    return this.createBroadcast();
  }

  /**
   * Handle detection update from a headset
   */
  private handleDetections(msg: DetectionUpdate): ServerMessage | null {
    const headset = this.headsets.get(msg.headsetId);
    if (!headset) return null;

    // Only process if aligned
    if (!headset.isAligned) {
      return null;
    }

    headset.lastUpdate = Date.now();

    // Store detections for fusion
    const queue = this.pendingDetections.get(msg.headsetId) ?? [];
    queue.push(msg);
    
    // Keep only recent detections
    while (queue.length > 3) {
      queue.shift();
    }
    this.pendingDetections.set(msg.headsetId, queue);

    return null; // Responses sent via broadcast
  }

  /**
   * Handle anchor alignment confirmation
   */
  private handleAnchorAlignment(msg: AnchorAlignment): ServerMessage | null {
    const headset = this.headsets.get(msg.headsetId);
    if (!headset) return null;

    headset.isAligned = true;
    headset.lastUpdate = Date.now();

    // Return current state after alignment
    return this.createBroadcast();
  }

  /**
   * Process all pending detections and update tracker
   * Call this at regular intervals (e.g., 30 Hz)
   */
  tick(dt: number = 1/30): TrackingBroadcast {
    // Collect all detections from all headsets
    const allDetections: DetectionUpdate['detections'][0][] = [];

    for (const [headsetId, queue] of this.pendingDetections) {
      const headset = this.headsets.get(headsetId);
      if (!headset?.isAligned) continue;

      // Take latest detections
      const latest = queue[queue.length - 1];
      if (latest) {
        allDetections.push(...latest.detections);
      }
    }

    // Update tracker
    const previousPersons = new Set(this.lastTrackedPersons.map(p => p.globalId));
    const trackedPersons = this.tracker.update(allDetections, dt);
    const currentPersons = new Set(trackedPersons.map(p => p.globalId));

    // Detect new persons
    for (const person of trackedPersons) {
      if (!previousPersons.has(person.globalId) && person.state !== 'tentative') {
        const event: PersonDetectedEvent = {
          type: 'person_detected',
          globalId: person.globalId,
          position: person.position,
          isNewPerson: true,
        };
        this.events.onPersonDetected?.(event);
      }
    }

    // Detect lost persons
    for (const prevPerson of this.lastTrackedPersons) {
      if (!currentPersons.has(prevPerson.globalId)) {
        const event: PersonLost = {
          type: 'person_lost',
          globalId: prevPerson.globalId,
          lastPosition: prevPerson.position,
          reason: 'left_scene',
        };
        this.events.onPersonLost?.(event);
      }
    }

    this.lastTrackedPersons = trackedPersons;

    return this.createBroadcast();
  }

  /**
   * Start automatic broadcast loop
   */
  startBroadcastLoop(intervalMs: number = 33): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
    }

    this.broadcastInterval = setInterval(() => {
      const broadcast = this.tick(intervalMs / 1000);
      this.events.onBroadcast?.(broadcast);
    }, intervalMs);
  }

  /**
   * Stop broadcast loop
   */
  stopBroadcastLoop(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
  }

  /**
   * Create tracking broadcast message
   */
  private createBroadcast(): TrackingBroadcast {
    return {
      type: 'tracking_update',
      trackedPersons: this.tracker.getTrackedPersons(),
      userBindings: this.tracker.getUserBindings(),
      characterBindings: this.tracker.getCharacterBindings(),
      timestamp: Date.now(),
      frameNumber: this.tracker.getFrameNumber(),
    };
  }

  /**
   * Bind a user to a tracked person
   */
  bindUserToPerson(globalId: string, userId: string, characterId?: string): PersonIdentified | null {
    const success = this.tracker.bindUser(globalId, userId, characterId);
    if (!success) return null;

    const event: PersonIdentified = {
      type: 'person_identified',
      globalId,
      userId,
      characterId: characterId ?? userId,
      confidence: 1.0,
    };

    this.events.onPersonIdentified?.(event);
    return event;
  }

  /**
   * Get all connected headsets
   */
  getConnectedHeadsets(): ConnectedHeadset[] {
    return Array.from(this.headsets.values());
  }

  /**
   * Get current tracked persons
   */
  getTrackedPersons(): TrackedPerson[] {
    return this.tracker.getTrackedPersons();
  }

  /**
   * Get tracking statistics
   */
  getStats() {
    return {
      connectedHeadsets: this.headsets.size,
      alignedHeadsets: Array.from(this.headsets.values()).filter(h => h.isAligned).length,
      ...this.tracker.getStats(),
    };
  }

  /**
   * Remove disconnected headset
   */
  removeHeadset(headsetId: string): void {
    this.headsets.delete(headsetId);
    this.pendingDetections.delete(headsetId);
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.tracker.reset();
    this.headsets.clear();
    this.pendingDetections.clear();
    this.lastTrackedPersons = [];
    this.stopBroadcastLoop();
  }
}
