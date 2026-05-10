/**
 * CrossRealitySessionManager
 *
 * Top-level orchestrator for cross-reality agent continuity. Composes:
 *
 * 1. CrossRealityAnchorSystem  — Spatial anchors + geospatial + CRDT
 * 2. CrossRealityHandoffProtocol — 5-phase device handoff
 * 3. NetworkTransportAdapter   — WebRTC / WebSocket transport
 * 4. MVCSerializer             — <10KB payload serialization
 * 5. OfflineRecoveryQueue      — Airplane mode resilience
 * 6. EmbodimentTransitionAnimator — Visual crossfade
 *
 * SESSION LIFECYCLE:
 *   idle → discovering → pairing → connected → syncing → handing-off → complete
 *
 * This is the single entry point for applications. Everything else is
 * composed internally and only exposed via the session manager's API.
 *
 * @module CrossRealitySessionManager
 */

import { logger } from './logger';
import {
  CrossRealityAnchorSystem,
  type CrossRealityAnchorSystemConfig,
} from './CrossRealityAnchorSystem';
import {
  CrossRealityHandoffProtocol,
  type DeviceCapabilities,
  type HandoffCallbacks,
} from './CrossRealityHandoffProtocol';
import {
  NetworkTransportAdapter,
  type NetworkTransportConfig,
  type TransportMessage,
  type PeerInfo,
} from './NetworkTransportAdapter';
import { MVCSerializer, type MVCValidationResult, MVC_MAX_SIZE_BYTES } from './MVCSerializer';
import {
  OfflineRecoveryQueue,
  type OfflineRecoveryQueueConfig,
  type QueueState,
} from './OfflineRecoveryQueue';
import {
  EmbodimentTransitionAnimator,
  type EmbodimentTransitionAnimatorConfig,
  type TransitionState,
} from './EmbodimentTransitionAnimator';
import {
  GeospatialAnchorProvider,
  createGeospatialAnchorProvider,
} from './GeospatialAnchorProvider';
import type {
  FormFactor,
  EmbodimentType,
  MVCPayload,
  HandoffStatus,
  GeospatialCoordinate,
  GeospatialSource,
} from './CrossRealityContinuityTypes';

// =============================================================================
// SESSION STATE
// =============================================================================

export type SessionState =
  | 'idle' // No active cross-reality session
  | 'discovering' // Scanning for nearby devices
  | 'pairing' // Negotiating with a specific device
  | 'connected' // Connected and syncing anchors
  | 'handing-off' // Handoff in progress
  | 'receiving' // Receiving a handoff
  | 'complete'; // Handoff complete, agent on new device

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface CrossRealitySessionConfig {
  /** Agent identity */
  agentId: string;
  /** Agent display name */
  agentName: string;
  /** Current device form factor */
  formFactor: FormFactor;
  /** Current device embodiment (auto-selected if not specified) */
  embodiment?: EmbodimentType;
  /** Anchor system configuration */
  anchorSystem: CrossRealityAnchorSystemConfig;
  /** Network transport configuration */
  transport: NetworkTransportConfig;
  /** Offline recovery queue configuration */
  offlineQueue: Omit<OfflineRecoveryQueueConfig, 'storage'> & { storage?: any };
  /** Embodiment transition animator configuration */
  transitionAnimator?: EmbodimentTransitionAnimatorConfig;
  /** Discovery timeout in ms (default: 10000) */
  discoveryTimeoutMs?: number;
}

// =============================================================================
// SESSION MANAGER
// =============================================================================

export class CrossRealitySessionManager {
  readonly anchorSystem: CrossRealityAnchorSystem;
  readonly handoffProtocol: CrossRealityHandoffProtocol;
  readonly transport: NetworkTransportAdapter;
  readonly serializer: MVCSerializer;
  readonly offlineQueue: OfflineRecoveryQueue;
  readonly transitionAnimator: EmbodimentTransitionAnimator;
  readonly geospatialProvider: GeospatialAnchorProvider;

  private state: SessionState = 'idle';
  private config: CrossRealitySessionConfig;
  private discoveredDevices: Map<string, DeviceCapabilities> = new Map();
  private listeners: Map<string, Set<(event: any) => void>> = new Map();
  private discoveryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: CrossRealitySessionConfig) {
    this.config = config;

    // Compose subsystems
    this.anchorSystem = new CrossRealityAnchorSystem(config.anchorSystem);
    this.handoffProtocol = new CrossRealityHandoffProtocol(
      config.agentId,
      config.agentName,
      config.formFactor,
      config.embodiment
    );
    this.transport = new NetworkTransportAdapter(config.transport);
    this.serializer = new MVCSerializer();
    this.offlineQueue = new OfflineRecoveryQueue(config.offlineQueue);
    this.transitionAnimator = new EmbodimentTransitionAnimator(config.transitionAnimator);
    this.geospatialProvider = createGeospatialAnchorProvider();

    this.wireTransportHandlers();

    logger.info('[CrossRealitySessionManager] Initialized', {
      agentId: config.agentId,
      formFactor: config.formFactor,
    });
  }

  // ---------------------------------------------------------------------------
  // SESSION LIFECYCLE
  // ---------------------------------------------------------------------------

  /**
   * Get the current session state.
   */
  getState(): SessionState {
    return this.state;
  }

  /**
   * Start device discovery. Broadcasts presence to nearby devices.
   */
  startDiscovery(): void {
    this.state = 'discovering';
    this.discoveredDevices.clear();
    this.emit('state:changed', { state: 'discovering' });

    this.transport.broadcast('discovery:announce', {
      agentId: this.config.agentId,
      formFactor: this.config.formFactor,
      agentName: this.config.agentName,
    });

    // Auto-timeout discovery
    const timeout = this.config.discoveryTimeoutMs ?? 10_000;
    this.discoveryTimer = setTimeout(() => {
      if (this.state === 'discovering') {
        this.emit('discovery:timeout', { devicesFound: this.discoveredDevices.size });
        logger.info(
          `[Session] Discovery timed out. Found ${this.discoveredDevices.size} device(s).`
        );
      }
    }, timeout);

    logger.info('[Session] Discovery started');
  }

  /**
   * Stop device discovery.
   */
  stopDiscovery(): void {
    if (this.discoveryTimer) {
      clearTimeout(this.discoveryTimer);
      this.discoveryTimer = null;
    }
    if (this.state === 'discovering') {
      this.state = 'idle';
      this.emit('state:changed', { state: 'idle' });
    }
  }

  /**
   * Get discovered devices.
   */
  getDiscoveredDevices(): DeviceCapabilities[] {
    return [...this.discoveredDevices.values()];
  }

  /**
   * Register a device as discovered (e.g., from a discovery broadcast response).
   */
  registerDiscoveredDevice(capabilities: DeviceCapabilities): void {
    this.discoveredDevices.set(capabilities.deviceId, capabilities);
    this.emit('device:discovered', { capabilities });
  }

  // ---------------------------------------------------------------------------
  // PAIRING
  // ---------------------------------------------------------------------------

  /**
   * Pair with a discovered device.
   */
  pairWithDevice(deviceId: string): boolean {
    const capabilities = this.discoveredDevices.get(deviceId);
    if (!capabilities) {
      logger.warn(`[Session] Cannot pair: device ${deviceId} not discovered`);
      return false;
    }

    this.state = 'pairing';
    this.emit('state:changed', { state: 'pairing' });

    // Connect via transport
    this.transport.connect(deviceId, {
      displayName: capabilities.deviceId,
      formFactor: capabilities.formFactor,
    });

    this.state = 'connected';
    this.emit('state:changed', { state: 'connected' });
    this.emit('paired', { deviceId, formFactor: capabilities.formFactor });

    logger.info(`[Session] Paired with ${deviceId} (${capabilities.formFactor})`);
    return true;
  }

  // ---------------------------------------------------------------------------
  // HANDOFF (INITIATOR)
  // ---------------------------------------------------------------------------

  /**
   * Initiate a handoff to a connected device.
   */
  async initiateHandoff(
    targetDeviceId: string,
    callbacks: HandoffCallbacks
  ): Promise<{ payload: MVCPayload | null; validation: MVCValidationResult | null }> {
    const capabilities = this.discoveredDevices.get(targetDeviceId);
    if (!capabilities) {
      logger.warn(`[Session] Cannot handoff: device ${targetDeviceId} not found`);
      return { payload: null, validation: null };
    }

    if (!this.transport.isConnected(targetDeviceId)) {
      logger.warn(`[Session] Cannot handoff: not connected to ${targetDeviceId}`);
      return { payload: null, validation: null };
    }

    this.state = 'handing-off';
    this.emit('state:changed', { state: 'handing-off' });

    // Initiate handoff protocol
    const payload = this.handoffProtocol.initiateHandoff(capabilities, callbacks);
    if (!payload) {
      this.state = 'connected';
      this.emit('state:changed', { state: 'connected' });
      return { payload: null, validation: null };
    }

    // Enrich with real geospatial data
    await this.enrichWithGeospatialData(payload);

    // Serialize and validate
    const { data, validation } = this.serializer.serialize(payload);

    // Send via transport
    this.transport.send(targetDeviceId, 'handoff:mvc-payload', {
      payload,
      sizeBytes: data.length,
    });

    // Start transition animation
    this.transitionAnimator.startTransition(
      payload.sourceEmbodiment,
      payload.targetEmbodiment,
      payload.targetFormFactor
    );

    this.state = 'complete';
    this.emit('state:changed', { state: 'complete' });
    this.emit('handoff:sent', {
      targetDeviceId,
      sizeBytes: data.length,
      validation,
    });

    logger.info(`[Session] Handoff sent to ${targetDeviceId} (${data.length} bytes)`);
    return { payload, validation };
  }

  // ---------------------------------------------------------------------------
  // HANDOFF (RECEIVER)
  // ---------------------------------------------------------------------------

  /**
   * Receive a handoff from a remote device.
   */
  receiveHandoff(payload: MVCPayload, callbacks: HandoffCallbacks): HandoffStatus {
    this.state = 'receiving';
    this.emit('state:changed', { state: 'receiving' });

    // Start transition animation
    this.transitionAnimator.startTransition(
      payload.sourceEmbodiment,
      payload.targetEmbodiment,
      payload.targetFormFactor
    );

    // Apply handoff
    const status = this.handoffProtocol.receiveHandoff(payload, callbacks);

    this.state = 'complete';
    this.emit('state:changed', { state: 'complete' });
    this.emit('handoff:received', {
      sourceFormFactor: payload.sourceFormFactor,
      status,
    });

    return status;
  }

  // ---------------------------------------------------------------------------
  // OFFLINE RECOVERY
  // ---------------------------------------------------------------------------

  /**
   * Go offline. CRDT operations will be queued for later replay.
   */
  goOffline(): void {
    this.offlineQueue.goOffline();
    this.emit('connectivity:offline', {});
  }

  /**
   * Go back online. Replays queued operations.
   */
  async goOnline(): Promise<{ applied: number; rejected: number } | null> {
    const batch = await this.offlineQueue.goOnline();
    this.emit('connectivity:online', {});

    if (!batch) return null;

    // Apply batch to CRDT engine
    const engine = this.anchorSystem.crdtEngine;
    if (!engine) return { applied: batch.compressedCount, rejected: 0 };

    const { applyOperationBatch } = await import('./AuthenticatedCRDTEngine');
    const result = applyOperationBatch(engine, batch);

    this.emit('offline:replayed', {
      applied: result.applied,
      rejected: result.rejected,
      originalCount: batch.originalCount,
      compressedCount: batch.compressedCount,
    });

    return { applied: result.applied, rejected: result.rejected };
  }

  // ---------------------------------------------------------------------------
  // GEOSPATIAL
  // ---------------------------------------------------------------------------

  /**
   * Calibrate the geospatial origin.
   */
  calibrateOrigin(coordinate: GeospatialCoordinate, headingOffsetDeg: number = 0): void {
    this.anchorSystem.calibrateOrigin(coordinate, headingOffsetDeg);
  }

  /**
   * Calibrate from VPS.
   */
  calibrateFromVPS(
    coordinate: GeospatialCoordinate,
    headingOffsetDeg: number,
    confidence: number,
    provider?: string
  ): void {
    this.anchorSystem.calibrateFromVPS(coordinate, headingOffsetDeg, confidence, provider);
  }

  // ---------------------------------------------------------------------------
  // METRICS
  // ---------------------------------------------------------------------------

  /**
   * Get comprehensive cross-reality session metrics.
   */
  getMetrics() {
    return {
      session: {
        state: this.state,
        agentId: this.config.agentId,
        formFactor: this.config.formFactor,
        discoveredDevices: this.discoveredDevices.size,
        connectedPeers: this.transport.getConnectedPeers().length,
      },
      anchors: this.anchorSystem.getMetrics(),
      transport: this.transport.getMetrics(),
      offlineQueue: this.offlineQueue.getMetrics(),
      geospatial: this.geospatialProvider.getMetrics(),
      handoff: {
        history: this.handoffProtocol.getHandoffHistory().length,
        active: this.handoffProtocol.isHandoffInProgress(),
        currentFormFactor: this.handoffProtocol.getCurrentFormFactor(),
        currentEmbodiment: this.handoffProtocol.getCurrentEmbodiment(),
      },
      transitions: {
        active: this.transitionAnimator.isTransitioning(),
        history: this.transitionAnimator.getHistory().length,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // GEOSPATIAL ENRICHMENT
  // ---------------------------------------------------------------------------

  /**
   * Enrich MVC payload with real geospatial position data.
   * Populates spatialContext.geospatial from GPS/Wi-Fi RTT/IP geolocation.
   */
  private async enrichWithGeospatialData(payload: MVCPayload): Promise<void> {
    try {
      const position = await this.geospatialProvider.getCurrentPosition();
      const source: GeospatialSource =
        position.source === 'wifi-rtt'
          ? 'wifi-fingerprint'
          : position.source === 'arkit-arcore'
            ? 'vps'
            : position.source === 'uwb'
              ? 'ble-beacon'
              : position.source;
      const coordinate: GeospatialCoordinate = {
        latitude: position.latitude,
        longitude: position.longitude,
        altitude: position.altitude,
        horizontalAccuracy: position.accuracy,
        verticalAccuracy: null,
        heading: null,
        source,
        capturedAt: position.timestamp,
      };
      payload.spatialContext.geospatial = coordinate;

      logger.info('[Session] Enriched handoff with geospatial data', {
        source: position.source,
        horizontalAccuracy: position.accuracy,
      });
    } catch (error) {
      logger.warn('[Session] Failed to acquire geospatial position for handoff', { error });
      // Continue without geospatial data (spatialContext.geospatial remains null)
    }
  }

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------

  on(event: string, handler: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: (data: any) => void): void {
    this.listeners.get(event)?.delete(handler);
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------------------------------

  /**
   * Start the session manager (starts anchor sync loop).
   */
  start(): void {
    this.anchorSystem.start();
  }

  /**
   * Stop the session manager.
   */
  stop(): void {
    this.stopDiscovery();
    this.anchorSystem.stop();
  }

  /**
   * Dispose all resources.
   */
  dispose(): void {
    this.stop();
    this.transport.dispose();
    this.anchorSystem.dispose();
    this.offlineQueue.dispose();
    this.listeners.clear();
  }

  // ---------------------------------------------------------------------------
  // INTERNAL WIRING
  // ---------------------------------------------------------------------------

  private wireTransportHandlers(): void {
    // Handle discovery announcements
    this.transport.onMessage('discovery:announce', (msg) => {
      const payload = msg.payload as { agentId: string; formFactor: string; agentName: string };
      logger.info(`[Session] Discovered device: ${msg.deviceId} (${payload.formFactor})`);

      this.registerDiscoveredDevice({
        deviceId: msg.deviceId,
        formFactor: payload.formFactor as FormFactor,
        displayName: payload.agentName,
        supportedEmbodiments: [],
        inputModalities: [],
        budget: { frameBudgetMs: 16.6, agentBudgetMs: 100, computeModel: 'cloud-first' },
        sensors: [],
        hasGeospatial: false,
        webxrModes: [],
      });
    });

    // Handle MVC payload reception
    this.transport.onMessage('handoff:mvc-payload', (msg) => {
      const data = msg.payload as { payload: MVCPayload; sizeBytes: number };
      this.emit('handoff:payload-received', {
        from: msg.deviceId,
        payload: data.payload,
        sizeBytes: data.sizeBytes,
      });
    });

    // Handle CRDT delta sync
    this.transport.onMessage('sync:crdt-delta', (msg) => {
      const delta = msg.payload as any;
      this.anchorSystem.applySignedRemoteDelta(delta);
    });

    // Forward transport events
    this.transport.on('connected', (data) => {
      this.emit('transport:connected', data);
    });

    this.transport.on('disconnected', (data) => {
      this.emit('transport:disconnected', data);
    });
  }

  private emit(event: string, data: unknown): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createCrossRealitySessionManager(
  config: CrossRealitySessionConfig
): CrossRealitySessionManager {
  return new CrossRealitySessionManager(config);
}
