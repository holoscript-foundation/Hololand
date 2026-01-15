/**
 * @hololand/ar-tracking - Client Module
 * 
 * Client-side tracking integration for headsets/phones.
 * Handles:
 * - Sending detections to server
 * - Receiving global tracking state
 * - Rendering character bindings
 */

import type {
  ClientMessage,
  ServerMessage,
  TrackingBroadcast,
  PersonDetection,
  HeadsetRegistration,
  DetectionUpdate,
  AnchorAlignment,
  TrackedPerson,
  Vector3,
  Quaternion,
  Pose,
} from '../types';

export interface ARTrackingClientConfig {
  /** Server WebSocket URL */
  serverUrl: string;
  /** This headset's ID */
  headsetId: string;
  /** User ID */
  userId: string;
  /** Device type */
  deviceType: HeadsetRegistration['deviceType'];
  /** Whether device has depth sensor */
  hasDepthSensor: boolean;
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;
  /** Reconnect interval (ms) */
  reconnectInterval?: number;
}

export interface ARTrackingClientEvents {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onTrackingUpdate?: (broadcast: TrackingBroadcast) => void;
  onPersonDetected?: (globalId: string, position: Vector3) => void;
  onPersonLost?: (globalId: string) => void;
  onPersonIdentified?: (globalId: string, userId: string, characterId: string) => void;
  onError?: (error: Error) => void;
}

/**
 * AR Tracking Client
 * 
 * Runs on each headset/phone to:
 * 1. Send local detections to server
 * 2. Receive globally consistent tracking state
 * 3. Render characters at tracked person positions
 */
export class ARTrackingClient {
  private config: ARTrackingClientConfig;
  private events: ARTrackingClientEvents;
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private isAligned: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private currentPose: Pose = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    timestamp: 0,
  };
  private trackedPersons: TrackedPerson[] = [];
  private userBindings: Record<string, string> = {};
  private characterBindings: Record<string, string> = {};

  constructor(config: ARTrackingClientConfig, events?: ARTrackingClientEvents) {
    this.config = {
      autoReconnect: true,
      reconnectInterval: 3000,
      ...config,
    };
    this.events = events ?? {};
  }

  /**
   * Connect to tracking server
   */
  connect(): void {
    if (this.ws) {
      this.ws.close();
    }

    try {
      this.ws = new WebSocket(this.config.serverUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.events.onConnected?.();
        this.sendRegistration();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ServerMessage;
          this.handleServerMessage(message);
        } catch (e) {
          this.events.onError?.(new Error(`Failed to parse server message: ${e}`));
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.events.onDisconnected?.();
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        this.events.onError?.(new Error(`WebSocket error: ${error}`));
      };
    } catch (e) {
      this.events.onError?.(new Error(`Failed to connect: ${e}`));
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.isAligned = false;
  }

  /**
   * Send headset registration
   */
  private sendRegistration(): void {
    const msg: HeadsetRegistration = {
      type: 'register',
      headsetId: this.config.headsetId,
      userId: this.config.userId,
      deviceType: this.config.deviceType,
      hasDepthSensor: this.config.hasDepthSensor,
      initialPose: this.currentPose,
    };

    this.send(msg);
  }

  /**
   * Send anchor alignment confirmation
   */
  alignToAnchor(
    anchorId: string,
    anchorType: AnchorAlignment['anchorType'],
    localToWorldTransform: AnchorAlignment['localToWorldTransform']
  ): void {
    const msg: AnchorAlignment = {
      type: 'anchor_aligned',
      headsetId: this.config.headsetId,
      anchorId,
      anchorType,
      localToWorldTransform,
    };

    this.send(msg);
    this.isAligned = true;
  }

  /**
   * Send person detections
   */
  sendDetections(detections: PersonDetection[], frameNumber: number): void {
    if (!this.isConnected || !this.isAligned) return;

    const msg: DetectionUpdate = {
      type: 'detections',
      headsetId: this.config.headsetId,
      headsetPose: this.currentPose,
      detections,
      timestamp: Date.now(),
      frameNumber,
    };

    this.send(msg);
  }

  /**
   * Update current headset pose
   */
  updatePose(position: Vector3, rotation: Quaternion): void {
    this.currentPose = {
      position,
      rotation,
      timestamp: Date.now(),
    };
  }

  /**
   * Handle server message
   */
  private handleServerMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'tracking_update':
        this.handleTrackingUpdate(message);
        break;
      case 'person_detected':
        this.events.onPersonDetected?.(message.globalId, message.position);
        break;
      case 'person_lost':
        this.events.onPersonLost?.(message.globalId);
        break;
      case 'person_identified':
        this.events.onPersonIdentified?.(
          message.globalId, 
          message.userId, 
          message.characterId
        );
        break;
    }
  }

  /**
   * Handle tracking update broadcast
   */
  private handleTrackingUpdate(broadcast: TrackingBroadcast): void {
    this.trackedPersons = broadcast.trackedPersons;
    this.userBindings = broadcast.userBindings;
    this.characterBindings = broadcast.characterBindings;
    this.events.onTrackingUpdate?.(broadcast);
  }

  /**
   * Send message to server
   */
  private send(message: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (!this.config.autoReconnect) return;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.config.reconnectInterval);
  }

  // ==========================================================================
  // Public getters
  // ==========================================================================

  /**
   * Get all currently tracked persons
   */
  getTrackedPersons(): TrackedPerson[] {
    return this.trackedPersons;
  }

  /**
   * Get character ID for a tracked person
   */
  getCharacterId(globalId: string): string | undefined {
    return this.characterBindings[globalId];
  }

  /**
   * Get user ID for a tracked person
   */
  getUserId(globalId: string): string | undefined {
    return this.userBindings[globalId];
  }

  /**
   * Check if connected to server
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Check if anchor-aligned
   */
  get aligned(): boolean {
    return this.isAligned;
  }
}
