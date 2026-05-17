/**
 * IoT Binding Manager
 *
 * Manages the lifecycle of IoT entity bindings:
 *   DISCOVERY -> PAIRING -> BINDING -> ACTIVE -> UPDATING -> UNBOUND
 *
 * Responsibilities:
 *   - Device discovery orchestration (BLE, WiFi, Matter, etc.)
 *   - Binding creation, validation, and persistence
 *   - Spatial anchor association
 *   - Interaction zone management
 *   - State channel lifecycle (connect/disconnect/reconnect)
 *   - Automation rule evaluation
 *   - Backend synchronization (REST API)
 */

import type {
  IoTEntityBinding,
  IoTDevice,
  IoTDeviceState,
  IoTCommand,
  IoTCommandResponse,
  IoTBindingStatus,
  IoTBindingEvent,
  IoTBindingEventType,
  IoTInteractionZone,
  IoTAutomationRule,
  IoTDiscoveryConfig,
  IoTDiscoveryResult,
  IoTProtocol,
  IoTCapability,
} from './types';
import {
  DEFAULT_IOT_BINDING_PERMISSIONS,
  DEFAULT_IOT_VISUALIZATION,
  DEFAULT_IOT_STATE_CHANNEL,
} from './types';
import type { Pose6DoF, SpatialAnchor } from '../types';

// =============================================================================
// MANAGER CONFIGURATION
// =============================================================================

export interface IoTBindingManagerConfig {
  /** HoloLand backend API base URL */
  apiBaseUrl: string;
  /** Authentication token */
  authToken: string;
  /** Current user ID */
  userId: string;
  /** World ID for binding scope */
  worldId: string;
  /** Auto-reconnect state channels on failure. Default: true */
  autoReconnect: boolean;
  /** State channel reconnect interval (ms). Default: 5000 */
  reconnectInterval: number;
  /** Maximum stale time for device state (ms). Default: 30000 */
  staleThreshold: number;
  /** Enable interaction zone evaluation. Default: true */
  interactionZonesEnabled: boolean;
  /** User pose update interval for zone evaluation (ms). Default: 100 */
  zonePollInterval: number;
}

export const DEFAULT_BINDING_MANAGER_CONFIG: IoTBindingManagerConfig = {
  apiBaseUrl: 'http://localhost:3001',
  authToken: '',
  userId: '',
  worldId: '',
  autoReconnect: true,
  reconnectInterval: 5000,
  staleThreshold: 30000,
  interactionZonesEnabled: true,
  zonePollInterval: 100,
};

// =============================================================================
// EVENT TYPES
// =============================================================================

export type BindingManagerEventHandler = (event: IoTBindingEvent) => void;

// =============================================================================
// IOT BINDING MANAGER
// =============================================================================

/**
 * IoT Binding Manager
 *
 * Central manager for all IoT entity bindings within a HoloLand world.
 */
export class IoTBindingManager {
  private config: IoTBindingManagerConfig;

  // Registries
  private bindings: Map<string, IoTEntityBinding> = new Map();
  private devices: Map<string, IoTDevice> = new Map();
  private deviceStates: Map<string, IoTDeviceState> = new Map();

  // Active state channels
  private activeChannels: Map<string, { type: string; close: () => void }> = new Map();

  // Interaction zone state
  private userPose: Pose6DoF | null = null;
  private activeZones: Set<string> = new Set(); // "bindingId:zoneId" keys
  private zonePollTimer: ReturnType<typeof setInterval> | null = null;

  // Events
  private eventHandlers: Set<BindingManagerEventHandler> = new Set();

  constructor(config?: Partial<IoTBindingManagerConfig>) {
    this.config = { ...DEFAULT_BINDING_MANAGER_CONFIG, ...config };
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  /**
   * Initialize the manager: load bindings from backend, start state channels.
   */
  async initialize(): Promise<void> {
    // Load existing bindings from backend
    await this.loadBindingsFromBackend();

    // Connect state channels for active bindings
    for (const binding of this.bindings.values()) {
      if (binding.status === 'active') {
        this.connectStateChannel(binding);
      }
    }

    // Start interaction zone polling
    if (this.config.interactionZonesEnabled) {
      this.startZonePolling();
    }
  }

  /**
   * Shut down the manager: disconnect channels, stop polling.
   */
  async shutdown(): Promise<void> {
    // Stop zone polling
    if (this.zonePollTimer) {
      clearInterval(this.zonePollTimer);
      this.zonePollTimer = null;
    }

    // Disconnect all state channels
    for (const [id, channel] of this.activeChannels) {
      channel.close();
    }
    this.activeChannels.clear();
  }

  // ==========================================================================
  // BINDING CRUD
  // ==========================================================================

  /**
   * Create a new IoT entity binding.
   */
  async createBinding(params: {
    device: IoTDevice;
    anchor: SpatialAnchor;
    spatialOffset?: {
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number; w: number };
      scale: number;
    };
    exposedCapabilities?: string[];
    interactionZones?: IoTInteractionZone[];
  }): Promise<IoTEntityBinding> {
    const { device, anchor, spatialOffset, exposedCapabilities, interactionZones } = params;

    // Generate binding ID (UUID v7 for time-sortable)
    const bindingId = this.generateUUIDv7();
    const now = Date.now();

    const binding: IoTEntityBinding = {
      bindingId,
      schemaVersion: '1.0.0',
      worldId: this.config.worldId,
      device: {
        deviceId: device.deviceId,
        deviceName: device.name,
        category: device.category,
        primaryProtocol: device.protocols[0] ?? 'custom',
        connectionParams: device.connectionParams ?? { protocol: 'custom' as IoTProtocol },
      },
      anchor: {
        anchorId: anchor.id,
        cloudAnchorId: anchor.cloudId,
        anchorType: (anchor.type as string) === 'geospatial' ? 'cloud' : (anchor.type as any),
        lastKnownPose: anchor.pose,
      },
      spatialOffset: spatialOffset ?? {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: 1,
      },
      exposedCapabilities: exposedCapabilities ?? device.capabilities.map((c) => c.id),
      interactionZones: interactionZones ?? [],
      visualization: { ...DEFAULT_IOT_VISUALIZATION },
      stateChannel: { ...DEFAULT_IOT_STATE_CHANNEL },
      automationRules: [],
      permissions: {
        ...DEFAULT_IOT_BINDING_PERMISSIONS,
        ownerId: this.config.userId,
      },
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      createdBy: this.config.userId,
      updatedBy: this.config.userId,
      version: 1,
      ttl: 0,
      tags: [],
      metadata: {},
    };

    // Store locally
    this.bindings.set(bindingId, binding);

    // Persist to backend
    await this.saveBindingToBackend(binding);

    // Emit event
    this.emitEvent({
      type: 'binding_created',
      bindingId,
      deviceId: device.deviceId,
      timestamp: now,
      data: binding,
    });

    return binding;
  }

  /**
   * Activate a pending binding.
   */
  async activateBinding(bindingId: string): Promise<void> {
    const binding = this.bindings.get(bindingId);
    if (!binding) throw new Error(`Binding not found: ${bindingId}`);
    if (binding.status !== 'pending' && binding.status !== 'paused') {
      throw new Error(`Cannot activate binding in '${binding.status}' state`);
    }

    binding.status = 'active';
    binding.updatedAt = Date.now();
    binding.updatedBy = this.config.userId;
    binding.version++;

    // Connect state channel
    this.connectStateChannel(binding);

    // Persist
    await this.saveBindingToBackend(binding);

    this.emitEvent({
      type: 'binding_activated',
      bindingId,
      deviceId: binding.device.deviceId,
      timestamp: Date.now(),
      data: { status: 'active' },
    });
  }

  /**
   * Pause an active binding (temporarily disable).
   */
  async pauseBinding(bindingId: string): Promise<void> {
    const binding = this.bindings.get(bindingId);
    if (!binding) throw new Error(`Binding not found: ${bindingId}`);
    if (binding.status !== 'active') {
      throw new Error(`Cannot pause binding in '${binding.status}' state`);
    }

    binding.status = 'paused';
    binding.updatedAt = Date.now();
    binding.version++;

    // Disconnect state channel
    this.disconnectStateChannel(bindingId);

    await this.saveBindingToBackend(binding);

    this.emitEvent({
      type: 'binding_paused',
      bindingId,
      deviceId: binding.device.deviceId,
      timestamp: Date.now(),
      data: { status: 'paused' },
    });
  }

  /**
   * Remove a binding entirely.
   */
  async removeBinding(bindingId: string): Promise<void> {
    const binding = this.bindings.get(bindingId);
    if (!binding) return;

    // Disconnect state channel
    this.disconnectStateChannel(bindingId);

    // Remove from local registry
    this.bindings.delete(bindingId);

    // Remove from backend
    await this.deleteBindingFromBackend(bindingId);

    this.emitEvent({
      type: 'binding_removed',
      bindingId,
      deviceId: binding.device.deviceId,
      timestamp: Date.now(),
      data: null,
    });
  }

  /**
   * Get a binding by ID.
   */
  getBinding(bindingId: string): IoTEntityBinding | undefined {
    return this.bindings.get(bindingId);
  }

  /**
   * Get all bindings for the current world.
   */
  getAllBindings(): IoTEntityBinding[] {
    return Array.from(this.bindings.values());
  }

  /**
   * Get bindings by status.
   */
  getBindingsByStatus(status: IoTBindingStatus): IoTEntityBinding[] {
    return Array.from(this.bindings.values()).filter((b) => b.status === status);
  }

  // ==========================================================================
  // DEVICE STATE
  // ==========================================================================

  /**
   * Send a command to a bound device.
   */
  async sendCommand(
    bindingId: string,
    capabilityId: string,
    value: unknown
  ): Promise<IoTCommandResponse> {
    const binding = this.bindings.get(bindingId);
    if (!binding) throw new Error(`Binding not found: ${bindingId}`);
    if (binding.status !== 'active') throw new Error(`Binding is not active`);

    // Validate capability is exposed
    if (!binding.exposedCapabilities.includes(capabilityId)) {
      throw new Error(`Capability '${capabilityId}' is not exposed in this binding`);
    }

    const command: IoTCommand = {
      deviceId: binding.device.deviceId,
      capabilityId,
      type: 'set_property',
      payload: value,
      requestId: this.generateRequestId(),
      timeout: 5000,
      retries: 2,
      source: 'user_interaction',
    };

    // In a real implementation, this would send via the platform channel
    // to the native layer, which communicates with the device
    const response: IoTCommandResponse = {
      requestId: command.requestId,
      success: true,
      latencyMs: 0,
      timestamp: Date.now(),
    };

    return response;
  }

  /**
   * Update user pose for interaction zone evaluation.
   */
  updateUserPose(pose: Pose6DoF): void {
    this.userPose = pose;
  }

  // ==========================================================================
  // INTERACTION ZONES
  // ==========================================================================

  /**
   * Start polling for interaction zone triggers.
   */
  private startZonePolling(): void {
    this.zonePollTimer = setInterval(() => {
      this.evaluateInteractionZones();
    }, this.config.zonePollInterval);
  }

  /**
   * Evaluate all interaction zones against the current user pose.
   */
  private evaluateInteractionZones(): void {
    if (!this.userPose) return;

    for (const binding of this.bindings.values()) {
      if (binding.status !== 'active') continue;

      for (const zone of binding.interactionZones) {
        if (!zone.isActive) continue;

        const zoneKey = `${binding.bindingId}:${zone.zoneId}`;
        const isInZone = this.isUserInZone(binding, zone);
        const wasInZone = this.activeZones.has(zoneKey);

        if (isInZone && !wasInZone) {
          // Entered zone
          this.activeZones.add(zoneKey);
          if (zone.triggerOnEnter) {
            this.executeZoneActions(binding, zone, 'enter');
          }
        } else if (!isInZone && wasInZone) {
          // Exited zone
          this.activeZones.delete(zoneKey);
          if (zone.triggerOnExit) {
            this.executeZoneActions(binding, zone, 'exit');
          }
        }
      }
    }
  }

  /**
   * Check if the user is within an interaction zone.
   */
  private isUserInZone(binding: IoTEntityBinding, zone: IoTInteractionZone): boolean {
    if (!this.userPose) return false;

    // Compute zone world position (anchor + offset + zone offset)
    const anchorPos = binding.anchor.lastKnownPose.position;
    const entityOffset = binding.spatialOffset.position;
    const zoneOffset = zone.offset;

    const zoneWorldPos = {
      x: anchorPos.x + entityOffset.x + zoneOffset.x,
      y: anchorPos.y + entityOffset.y + zoneOffset.y,
      z: anchorPos.z + entityOffset.z + zoneOffset.z,
    };

    // Distance from user to zone center
    const dx = this.userPose.position.x - zoneWorldPos.x;
    const dy = this.userPose.position.y - zoneWorldPos.y;
    const dz = this.userPose.position.z - zoneWorldPos.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Simple sphere check (other shapes would be more complex)
    switch (zone.shape) {
      case 'sphere':
        return distance <= (zone.dimensions.radius ?? 1);
      case 'cylinder':
        const horizontalDist = Math.sqrt(dx * dx + dz * dz);
        const verticalDist = Math.abs(dy);
        return (
          horizontalDist <= (zone.dimensions.radius ?? 1) &&
          verticalDist <= (zone.dimensions.height ?? 2) / 2
        );
      case 'box':
        return (
          Math.abs(dx) <= (zone.dimensions.width ?? 1) / 2 &&
          Math.abs(dy) <= (zone.dimensions.height ?? 2) / 2 &&
          Math.abs(dz) <= (zone.dimensions.depth ?? 1) / 2
        );
      default:
        return distance <= (zone.dimensions.radius ?? 1);
    }
  }

  /**
   * Execute actions when an interaction zone triggers.
   */
  private executeZoneActions(
    binding: IoTEntityBinding,
    zone: IoTInteractionZone,
    triggerType: 'enter' | 'exit' | 'gaze'
  ): void {
    this.emitEvent({
      type: 'interaction_triggered',
      bindingId: binding.bindingId,
      deviceId: binding.device.deviceId,
      timestamp: Date.now(),
      data: { zoneId: zone.zoneId, triggerType },
    });

    for (const action of zone.actions) {
      switch (action.type) {
        case 'device_command':
          if (action.deviceCommand) {
            this.sendCommand(
              binding.bindingId,
              action.deviceCommand.capabilityId,
              action.deviceCommand.value
            ).catch((err) => console.error('Zone action failed:', err));
          }
          break;
        case 'show_ui':
          // Delegated to Flutter UI layer
          break;
        case 'haptic':
          // Delegated to Flutter/native layer
          break;
        case 'play_sound':
          // Delegated to Flutter/native layer
          break;
        case 'holoscript':
          // Delegated to HoloScript runtime
          break;
        case 'webhook':
          if (action.webhook) {
            // Fire-and-forget webhook
            fetch(action.webhook.url, {
              method: action.webhook.method,
              headers: action.webhook.headers,
              body: action.webhook.body ? JSON.stringify(action.webhook.body) : undefined,
            }).catch((err) => console.error('Webhook failed:', err));
          }
          break;
      }
    }
  }

  // ==========================================================================
  // STATE CHANNELS
  // ==========================================================================

  /**
   * Connect a state channel for a binding.
   */
  private connectStateChannel(binding: IoTEntityBinding): void {
    const channelConfig = binding.stateChannel;

    switch (channelConfig.type) {
      case 'websocket':
        // In a real implementation, open WebSocket connection
        this.activeChannels.set(binding.bindingId, {
          type: 'websocket',
          close: () => {
            /* close ws */
          },
        });
        break;
      case 'mqtt':
        // In a real implementation, subscribe to MQTT topic
        this.activeChannels.set(binding.bindingId, {
          type: 'mqtt',
          close: () => {
            /* unsubscribe */
          },
        });
        break;
      case 'polling':
        // In a real implementation, start polling timer
        this.activeChannels.set(binding.bindingId, {
          type: 'polling',
          close: () => {
            /* stop timer */
          },
        });
        break;
      case 'ble_notify':
        // Delegated to native BLE layer
        this.activeChannels.set(binding.bindingId, {
          type: 'ble_notify',
          close: () => {
            /* unsubscribe characteristic */
          },
        });
        break;
    }
  }

  /**
   * Disconnect a state channel.
   */
  private disconnectStateChannel(bindingId: string): void {
    const channel = this.activeChannels.get(bindingId);
    if (channel) {
      channel.close();
      this.activeChannels.delete(bindingId);
    }
  }

  // ==========================================================================
  // BACKEND PERSISTENCE
  // ==========================================================================

  private async loadBindingsFromBackend(): Promise<void> {
    // In a real implementation:
    // GET ${apiBaseUrl}/api/iot/bindings?worldId=${worldId}
    // Parse response and populate this.bindings
  }

  private async saveBindingToBackend(binding: IoTEntityBinding): Promise<void> {
    // In a real implementation:
    // PUT ${apiBaseUrl}/api/iot/bindings/${bindingId}
    // Body: JSON.stringify(binding)
  }

  private async deleteBindingFromBackend(bindingId: string): Promise<void> {
    // In a real implementation:
    // DELETE ${apiBaseUrl}/api/iot/bindings/${bindingId}
  }

  // ==========================================================================
  // EVENTS
  // ==========================================================================

  /**
   * Subscribe to binding manager events.
   */
  on(handler: BindingManagerEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emitEvent(event: IoTBindingEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Binding manager event handler error:', error);
      }
    }
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  private generateUUIDv7(): string {
    // UUID v7: time-sortable, 48-bit timestamp + 74-bit random
    const timestamp = Date.now();
    const hex = timestamp.toString(16).padStart(12, '0');
    const random = Array.from({ length: 20 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-7${random.slice(0, 3)}-${random.slice(3, 7)}-${random.slice(7, 19)}`;
  }

  private generateRequestId(): string {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 8);
    return `iot_${ts}_${rand}`;
  }
}
