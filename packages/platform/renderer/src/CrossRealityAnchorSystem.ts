/**
 * CrossRealityAnchorSystem
 *
 * Composes SharedSpatialAnchorManager + GeospatialAnchorBridge +
 * AuthenticatedCRDTEngine into a unified cross-reality anchor system.
 *
 * This is the integration layer that wires the three subsystems together:
 *
 * 1. SharedSpatialAnchorManager: Double-buffered anchor CRUD + CRDT sync loop
 * 2. GeospatialAnchorBridge: WGS84 ↔ local Vec3 coordinate conversion
 * 3. AuthenticatedCRDTEngine: DID-signed operations with audit trails
 *
 * INTEGRATION POINTS:
 * - Anchor creation/update automatically enriches with geospatial coordinates
 * - Outbound deltas are signed via the CRDT engine's DID identity
 * - Inbound deltas are verified before being applied to the anchor manager
 * - Geospatial origin changes automatically refresh all stale anchor coords
 *
 * @module CrossRealityAnchorSystem
 */

import { logger } from './logger';
import { SharedSpatialAnchorManager } from './SharedSpatialAnchorManager';
import type { AnchorDelta } from './SharedSpatialAnchorManager';
import type { SharedSpatialAnchorManagerConfig, SharedSpatialAnchor, AnchorId } from './SharedSpatialAnchorTypes';
import { GeospatialAnchorBridge } from './GeospatialAnchorBridge';
import type { GeospatialAnchorBridgeConfig, GeospatialAnchor } from './GeospatialAnchorBridge';
import { AuthenticatedCRDTEngine } from './AuthenticatedCRDTEngine';
import type { AuthenticatedCRDTEngineConfig } from './AuthenticatedCRDTEngine';
import type { GeospatialCoordinate, CRDTValidationResult } from './CrossRealityContinuityTypes';
import type { Vec3 } from './AgentStateBuffer';

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface CrossRealityAnchorSystemConfig {
  /** SharedSpatialAnchorManager configuration */
  anchorManager: SharedSpatialAnchorManagerConfig;
  /** GeospatialAnchorBridge configuration (optional — system works without geospatial) */
  geoBridge?: GeospatialAnchorBridgeConfig;
  /** AuthenticatedCRDTEngine configuration (optional — system works without authentication) */
  crdtEngine?: AuthenticatedCRDTEngineConfig;
  /** Auto-refresh geospatial coordinates when origin changes (default: true) */
  autoRefreshOnOriginChange?: boolean;
  /** Verify inbound delta signatures when CRDT engine is configured (default: true) */
  verifyInboundSignatures?: boolean;
}

// =============================================================================
// SIGNED DELTA
// =============================================================================

/**
 * An AnchorDelta enriched with DID signature and geospatial metadata.
 */
export interface SignedAnchorDelta extends AnchorDelta {
  /** DID signature of the delta (null if no CRDT engine configured) */
  signature: string | null;
  /** Author DID */
  authorDID: string | null;
  /** Geospatial coordinate of the anchor at time of delta (null if no geo bridge) */
  geospatial: GeospatialCoordinate | null;
}

// =============================================================================
// CROSS-REALITY ANCHOR SYSTEM
// =============================================================================

export class CrossRealityAnchorSystem {
  readonly anchorManager: SharedSpatialAnchorManager;
  readonly geoBridge: GeospatialAnchorBridge;
  readonly crdtEngine: AuthenticatedCRDTEngine | null;

  private config: Required<Pick<CrossRealityAnchorSystemConfig, 'autoRefreshOnOriginChange' | 'verifyInboundSignatures'>>;
  private listeners: Map<string, Set<(event: any) => void>> = new Map();

  constructor(config: CrossRealityAnchorSystemConfig) {
    this.anchorManager = new SharedSpatialAnchorManager(config.anchorManager);
    this.geoBridge = new GeospatialAnchorBridge(config.geoBridge);
    this.crdtEngine = config.crdtEngine ? new AuthenticatedCRDTEngine(config.crdtEngine) : null;

    this.config = {
      autoRefreshOnOriginChange: config.autoRefreshOnOriginChange ?? true,
      verifyInboundSignatures: config.verifyInboundSignatures ?? true,
    };

    this.wireEventHandlers();
    logger.info('[CrossRealityAnchorSystem] Initialized', {
      hasGeoBridge: true,
      hasCrdtEngine: !!this.crdtEngine,
    });
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------------------------------

  start(): void {
    this.anchorManager.start();
  }

  stop(): void {
    this.anchorManager.stop();
  }

  dispose(): void {
    this.anchorManager.dispose();
    this.listeners.clear();
  }

  // ---------------------------------------------------------------------------
  // GEOSPATIAL ORIGIN
  // ---------------------------------------------------------------------------

  /**
   * Calibrate the geospatial origin. All anchors will be enriched with WGS84 coords.
   */
  calibrateOrigin(coordinate: GeospatialCoordinate, headingOffsetDeg: number = 0): void {
    this.geoBridge.calibrateOrigin(coordinate, headingOffsetDeg);
    logger.info('[CrossRealityAnchorSystem] Origin calibrated');
  }

  /**
   * Calibrate origin from a VPS (Visual Positioning System) result.
   * VPS provides higher accuracy than GPS by matching camera images against
   * a pre-mapped 3D point cloud.
   */
  calibrateFromVPS(
    coordinate: GeospatialCoordinate,
    headingOffsetDeg: number,
    confidence: number,
    vpsProvider: string = 'unknown',
  ): void {
    const vpsCoordinate: GeospatialCoordinate = {
      ...coordinate,
      source: 'vps',
      horizontalAccuracy: Math.max(0.1, coordinate.horizontalAccuracy * (1 - confidence)),
    };
    this.geoBridge.calibrateOrigin(vpsCoordinate, headingOffsetDeg);
    this.emit('vps:calibrated', { coordinate: vpsCoordinate, confidence, provider: vpsProvider });
    logger.info(`[CrossRealityAnchorSystem] VPS calibration from ${vpsProvider} (confidence: ${(confidence * 100).toFixed(1)}%)`);
  }

  /**
   * Get the current geospatial origin (null if not calibrated).
   */
  getOrigin() {
    return this.geoBridge.getOrigin();
  }

  /**
   * Check if a geospatial origin is calibrated.
   */
  isCalibrated(): boolean {
    return this.geoBridge.isCalibrated();
  }

  // ---------------------------------------------------------------------------
  // ANCHOR CREATION WITH GEOSPATIAL ENRICHMENT
  // ---------------------------------------------------------------------------

  /**
   * Create an anchor with automatic geospatial enrichment.
   * If a geospatial origin is calibrated, the anchor's local position is
   * automatically converted to WGS84 coordinates.
   */
  createAnchor(
    id: AnchorId,
    name: string,
    options?: Partial<SharedSpatialAnchor>,
  ): { anchor: SharedSpatialAnchor | null; geospatial: GeospatialAnchor | null } {
    const anchor = this.anchorManager.createAnchor(id, name, options);
    if (!anchor) return { anchor: null, geospatial: null };

    // Enrich with geospatial coordinates
    const geoAnchor = this.geoBridge.registerAnchor(id, anchor.spatial.position);

    // Sign the creation if CRDT engine is available
    if (this.crdtEngine) {
      this.crdtEngine.set(`anchor:${id}:created`, {
        anchorId: id,
        position: anchor.spatial.position,
        geospatial: geoAnchor.geospatial,
        timestamp: Date.now(),
      });
    }

    return { anchor, geospatial: geoAnchor };
  }

  /**
   * Update an anchor's position with automatic geospatial re-computation.
   */
  updateAnchorPosition(id: AnchorId, position: Vec3): boolean {
    const updated = this.anchorManager.updateAnchorSpatial(id, { position });
    if (!updated) return false;

    // Update geospatial coordinates
    this.geoBridge.updateAnchorPosition(id, position);

    // Sign the update if CRDT engine is available
    if (this.crdtEngine) {
      const geoCoord = this.geoBridge.localToGeospatial(position);
      this.crdtEngine.set(`anchor:${id}:position`, {
        position,
        geospatial: geoCoord,
        timestamp: Date.now(),
      });
    }

    return true;
  }

  /**
   * Import an anchor from a remote device using geospatial coordinates.
   * Converts the WGS84 coordinate to local space and creates the anchor.
   */
  importGeospatialAnchor(
    id: AnchorId,
    name: string,
    geospatial: GeospatialCoordinate,
    options?: Partial<SharedSpatialAnchor>,
  ): { anchor: SharedSpatialAnchor | null; geospatial: GeospatialAnchor } {
    // Convert geospatial to local space
    const geoAnchor = this.geoBridge.importRemoteAnchor(id, geospatial);

    // Create the anchor with local position
    const anchor = this.anchorManager.createAnchor(id, name, {
      ...options,
      spatial: {
        position: geoAnchor.localPosition,
        rotation: options?.spatial?.rotation ?? { x: 0, y: 0, z: 0, w: 1 },
        extent: options?.spatial?.extent ?? null,
      },
    });

    return { anchor, geospatial: geoAnchor };
  }

  /**
   * Get an anchor's geospatial coordinates.
   */
  getGeospatialAnchor(id: AnchorId): GeospatialAnchor | undefined {
    return this.geoBridge.getAnchor(id);
  }

  /**
   * Get all anchors with their geospatial coordinates.
   */
  getAllGeospatialAnchors(): GeospatialAnchor[] {
    return this.geoBridge.getAllAnchors();
  }

  // ---------------------------------------------------------------------------
  // AUTHENTICATED DELTA SIGNING & VERIFICATION
  // ---------------------------------------------------------------------------

  /**
   * Sign outbound deltas with the CRDT engine's DID identity.
   * Returns signed deltas enriched with geospatial metadata.
   */
  drainSignedDeltas(): SignedAnchorDelta[] {
    const deltas = this.anchorManager.drainPendingDeltas();

    return deltas.map(delta => {
      let signature: string | null = null;
      let authorDID: string | null = null;

      if (this.crdtEngine) {
        const op = this.crdtEngine.set(`delta:${delta.anchorId}:${delta.timestamp}`, delta);
        signature = op.signature;
        authorDID = op.authorDID;
      }

      // Attach geospatial metadata
      const geoAnchor = this.geoBridge.getAnchor(delta.anchorId);

      return {
        ...delta,
        signature,
        authorDID,
        geospatial: geoAnchor?.geospatial ?? null,
      };
    });
  }

  /**
   * Apply a signed remote delta with optional signature verification.
   */
  applySignedRemoteDelta(delta: SignedAnchorDelta): CRDTValidationResult & { applied: boolean } {
    // Verify signature if CRDT engine is configured and verification is enabled
    if (this.crdtEngine && this.config.verifyInboundSignatures && delta.signature) {
      const op = {
        operationId: `delta:${delta.anchorId}:${delta.timestamp}`,
        authorDID: delta.authorDID ?? '',
        deviceId: delta.sourceAgentId,
        type: 'set' as const,
        key: `delta:${delta.anchorId}:${delta.timestamp}`,
        value: delta,
        hlcTimestamp: `${delta.timestamp}:0000:${delta.sourceAgentId}`,
        vectorClock: delta.vectorClock,
        signature: delta.signature,
        capabilityScope: ['*'],
        createdAt: delta.timestamp,
      };

      const result = this.crdtEngine.applyRemote(op);
      if (!result.valid) {
        this.emit('delta:rejected', {
          anchorId: delta.anchorId,
          reason: result.rejectionReason ?? 'unknown',
          sourceAgentId: delta.sourceAgentId,
        });
        return { ...result, applied: false };
      }
    }

    // Apply to anchor manager
    this.anchorManager.applyRemoteDelta(delta);

    // Import geospatial coordinate if available
    if (delta.geospatial && delta.anchorState) {
      this.geoBridge.importRemoteAnchor(delta.anchorId, delta.geospatial);
    }

    return { valid: true, validationMs: 0, applied: true };
  }

  // ---------------------------------------------------------------------------
  // CRDT AUDIT
  // ---------------------------------------------------------------------------

  /**
   * Get the GDPR audit log from the CRDT engine.
   */
  getAuditLog() {
    return this.crdtEngine?.getAuditLog() ?? [];
  }

  /**
   * Clear the audit log.
   */
  clearAuditLog(): void {
    this.crdtEngine?.clearAuditLog();
  }

  /**
   * Revoke a DID. All future operations from this DID will be rejected.
   */
  revokeDID(did: string): void {
    this.crdtEngine?.revokeDID(did);
    this.emit('did:revoked', { did });
  }

  // ---------------------------------------------------------------------------
  // METRICS
  // ---------------------------------------------------------------------------

  /**
   * Get comprehensive metrics across all subsystems.
   */
  getMetrics() {
    const anchorMetrics = this.anchorManager.getMetrics();
    const geoOrigin = this.geoBridge.getOrigin();

    return {
      ...anchorMetrics,
      geospatial: {
        calibrated: this.geoBridge.isCalibrated(),
        originQuality: geoOrigin?.quality ?? 0,
        totalGeoAnchors: this.geoBridge.getAllAnchors().filter(a => a.geospatial !== null).length,
        staleAnchors: this.geoBridge.getAllAnchors().filter(a => a.stale).length,
      },
      crdt: this.crdtEngine ? {
        identity: this.crdtEngine.getIdentity().did,
        stateSize: this.crdtEngine.size,
        auditLogSize: this.crdtEngine.getAuditLog().length,
      } : null,
    };
  }

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------

  on(event: string, handler: (event: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: (event: any) => void): void {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: string, data: unknown): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // INTERNAL WIRING
  // ---------------------------------------------------------------------------

  private wireEventHandlers(): void {
    // When geospatial origin changes, refresh all stale anchors
    if (this.config.autoRefreshOnOriginChange) {
      this.geoBridge.on('origin:calibrated', () => {
        const refreshed = this.geoBridge.refreshStaleAnchors();
        if (refreshed > 0) {
          logger.info(`[CrossRealityAnchorSystem] Refreshed ${refreshed} stale anchor(s) after origin change`);
        }
      });
    }

    // Forward anchor manager events with geospatial enrichment
    this.anchorManager.on('anchor:created', (event) => {
      this.emit('anchor:created', {
        ...event,
        geospatial: this.geoBridge.getAnchor(event.anchor.id)?.geospatial ?? null,
      });
    });

    this.anchorManager.on('anchor:updated', (event) => {
      this.emit('anchor:updated', {
        ...event,
        geospatial: this.geoBridge.getAnchor(event.anchor.id)?.geospatial ?? null,
      });
    });
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createCrossRealityAnchorSystem(
  config: CrossRealityAnchorSystemConfig,
): CrossRealityAnchorSystem {
  return new CrossRealityAnchorSystem(config);
}
