/**
 * DNFPerceptionIntegration
 *
 * Bridge that connects the SNNPerceptionBridge output to the
 * DNFSpatialAttentionField, creating an integrated perception pipeline:
 *
 *   SNN (discrete, per-object) -> DNF (continuous, spatial field)
 *
 * This integration provides:
 *   1. Automatic polling of SNN perception state
 *   2. Object position tracking for world-space projection
 *   3. Configurable DNF simulation frequency (independent of SNN)
 *   4. Visualization snapshot generation for dashboards
 *   5. Unified metrics combining SNN and DNF performance
 *
 * ARCHITECTURE:
 * ```
 *   SNNPerceptionBridge
 *        |  (reads at configurable Hz)
 *        v
 *   DNFPerceptionIntegration (this module)
 *        |  (projects SNN scores -> DNF input)
 *        |  (runs DNF step)
 *        v
 *   DNFSpatialAttentionField
 *        |  (Amari equation dynamics)
 *        v
 *   Continuous saliency field + peaks
 *        |
 *        v
 *   NeuralActivityDashboard (visualization)
 *   HololandRenderer (attention-based rendering)
 * ```
 *
 * USAGE IN HOLOLAND RENDERER:
 * ```typescript
 *   // In HololandRenderer:
 *   const snnBridge = createSNNPerceptionBridge();
 *   await snnBridge.initialize();
 *
 *   const dnfIntegration = createDNFPerceptionIntegration({
 *     snnBridge,
 *     dnfConfig: { fieldConfig: { width: 64, height: 64 } },
 *   });
 *
 *   // Start both pipelines
 *   snnBridge.start();
 *   dnfIntegration.start();
 *
 *   // In render loop (90Hz):
 *   const saliency = dnfIntegration.getSaliencyAt(objectWorldPos);
 *   const topRegions = dnfIntegration.getTopSalientRegions();
 *
 *   // For dashboard (10Hz):
 *   const snapshot = dnfIntegration.createVisualizationSnapshot();
 * ```
 *
 * PERFORMANCE:
 *   SNN poll + DNF input projection: ~0.2ms
 *   DNF step (64x64): ~0.5ms
 *   Visualization snapshot: ~0.3ms
 *   Total per cycle: ~1.0ms at 5-10Hz
 *   Render-loop queries (getSaliencyAt): ~0.01ms
 *
 * @module DNFPerceptionIntegration
 */

import { logger } from './logger';
import type { Vec3 } from './AgentStateBuffer';
import type {
  SpatialAttentionFieldConfig,
  DNFVisualizationSnapshot,
  DNFIntegrationMetrics,
  DNFPeak,
} from './DynamicNeuralFieldTypes';
import { DEFAULT_SPATIAL_ATTENTION_CONFIG } from './DynamicNeuralFieldTypes';
import type { SNNPerceptionState } from './SNNPerceptionTypes';
import { createEmptySNNPerceptionState } from './SNNPerceptionTypes';
import type { SNNPerceptionBridge } from './SNNPerceptionBridge';
import {
  DNFSpatialAttentionField,
  createDNFSpatialAttentionField,
} from './DNFSpatialAttentionField';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Configuration for DNFPerceptionIntegration.
 */
export interface DNFPerceptionIntegrationConfig {
  /** SNN perception bridge to poll (required for automatic integration) */
  snnBridge?: SNNPerceptionBridge;
  /** DNF spatial attention field configuration */
  dnfConfig?: Partial<SpatialAttentionFieldConfig>;
  /** DNF simulation frequency in Hz (default: 5) */
  dnfHz: number;
  /** Minimum DNF frequency in Hz (default: 1) */
  minDnfHz: number;
  /** Maximum DNF frequency in Hz (default: 15) */
  maxDnfHz: number;
  /** Number of DNF timesteps per simulation cycle (default: 3) */
  stepsPerCycle: number;
  /** Callback on each DNF update cycle */
  onUpdate?: (snapshot: DNFVisualizationSnapshot) => void;
  /** Callback when saliency peaks change */
  onPeaksChanged?: (peaks: Array<DNFPeak & { worldPosition: Vec3 }>) => void;
  /** External object position provider (alternative to SNN bridge) */
  objectPositionProvider?: () => Map<string, Vec3>;
}

/**
 * Default configuration.
 */
export const DEFAULT_DNF_INTEGRATION_CONFIG: Required<Omit<DNFPerceptionIntegrationConfig, 'snnBridge' | 'objectPositionProvider'>> = {
  dnfConfig: {},
  dnfHz: 5,
  minDnfHz: 1,
  maxDnfHz: 15,
  stepsPerCycle: 3,
  onUpdate: () => {},
  onPeaksChanged: () => {},
};

// =============================================================================
// DNF PERCEPTION INTEGRATION
// =============================================================================

export class DNFPerceptionIntegration {
  private readonly config: DNFPerceptionIntegrationConfig;
  private readonly attentionField: DNFSpatialAttentionField;

  // SNN bridge reference
  private snnBridge: SNNPerceptionBridge | null;
  private objectPositionProvider: (() => Map<string, Vec3>) | null;

  // Simulation loop
  private updateIntervalId: ReturnType<typeof setInterval> | null = null;
  private _isActive: boolean = false;
  private currentHz: number;

  // Object position tracking
  // When no external position provider is given, we maintain an internal map
  // fed from SNN data (object positions from scene input)
  private trackedObjectPositions: Map<string, Vec3> = new Map();

  // Metrics
  private totalCycles: number = 0;
  private cycleTimesHistory: number[] = [];
  private readonly MAX_METRICS_HISTORY = 30;
  private lastPeakCount: number = 0;

  constructor(config: DNFPerceptionIntegrationConfig) {
    this.config = {
      ...DEFAULT_DNF_INTEGRATION_CONFIG,
      ...config,
    };

    this.snnBridge = config.snnBridge ?? null;
    this.objectPositionProvider = config.objectPositionProvider ?? null;
    this.currentHz = this.config.dnfHz;

    // Create spatial attention field
    this.attentionField = createDNFSpatialAttentionField(this.config.dnfConfig);

    logger.info('[DNFPerceptionIntegration] Initialized', {
      hasSnnBridge: !!this.snnBridge,
      hasPositionProvider: !!this.objectPositionProvider,
      dnfHz: this.currentHz,
      stepsPerCycle: this.config.stepsPerCycle,
    });
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Start the DNF simulation loop.
   *
   * Begins polling SNN perception and running DNF steps at the configured frequency.
   */
  start(): void {
    if (this._isActive) {
      logger.warn('[DNFPerceptionIntegration] Already active');
      return;
    }

    this._isActive = true;
    this.scheduleUpdateLoop();

    logger.info('[DNFPerceptionIntegration] Started', { hz: this.currentHz });
  }

  /**
   * Stop the DNF simulation loop.
   */
  stop(): void {
    if (!this._isActive) return;

    this._isActive = false;
    this.clearUpdateInterval();

    logger.info('[DNFPerceptionIntegration] Stopped');
  }

  /**
   * Dispose all resources.
   */
  dispose(): void {
    this.stop();
    this.attentionField.reset();
    this.snnBridge = null;
    this.objectPositionProvider = null;
    this.trackedObjectPositions.clear();

    logger.info('[DNFPerceptionIntegration] Disposed');
  }

  // ===========================================================================
  // PUBLIC API: MANUAL UPDATES
  // ===========================================================================

  /**
   * Manually feed SNN perception state and object positions.
   *
   * Use this when not using the automatic SNN bridge polling,
   * e.g., when testing or using a custom perception source.
   */
  feedPerception(
    snnState: SNNPerceptionState,
    objectPositions: Map<string, Vec3>,
  ): void {
    this.attentionField.ingestSNNPerception(snnState, objectPositions);
  }

  /**
   * Manually run one DNF simulation cycle.
   */
  runCycle(): void {
    const startTime = performance.now();

    // Poll SNN if bridge is available
    if (this.snnBridge && this.snnBridge.isActive()) {
      const snnState = this.snnBridge.readPerception();
      const positions = this.objectPositionProvider
        ? this.objectPositionProvider()
        : this.trackedObjectPositions;

      this.attentionField.ingestSNNPerception(snnState, positions);
    }

    // Run DNF steps
    this.attentionField.stepMultiple(this.config.stepsPerCycle);
    this.totalCycles++;

    // Track cycle time
    const cycleTime = performance.now() - startTime;
    this.cycleTimesHistory.push(cycleTime);
    if (this.cycleTimesHistory.length > this.MAX_METRICS_HISTORY) {
      this.cycleTimesHistory.shift();
    }

    // Check for peak changes
    const peaks = this.attentionField.getTopSalientRegions();
    if (peaks.length !== this.lastPeakCount && this.config.onPeaksChanged) {
      this.config.onPeaksChanged(peaks);
    }
    this.lastPeakCount = peaks.length;

    // Notify update callback
    if (this.config.onUpdate) {
      const snapshot = this.attentionField.createVisualizationSnapshot();
      snapshot.performance.currentHz = this.currentHz;
      this.config.onUpdate(snapshot);
    }
  }

  // ===========================================================================
  // PUBLIC API: SALIENCY QUERIES (RENDER-LOOP SAFE)
  // ===========================================================================

  /**
   * Get saliency at a world-space position.
   *
   * Safe to call at 90Hz from the render loop (< 0.01ms).
   */
  getSaliencyAt(worldPos: Vec3): number {
    return this.attentionField.getSaliencyAt(worldPos);
  }

  /**
   * Get the top salient regions with world positions.
   */
  getTopSalientRegions(maxPeaks: number = 10): Array<DNFPeak & { worldPosition: Vec3 }> {
    return this.attentionField.getTopSalientRegions(maxPeaks);
  }

  /**
   * Get the single most salient position.
   */
  getMostSalientPosition(): { position: Vec3; amplitude: number } | null {
    return this.attentionField.getMostSalientPosition();
  }

  /**
   * Check if a position has active attention.
   */
  isAttentionActive(worldPos: Vec3, threshold: number = 0.3): boolean {
    return this.attentionField.isAttentionActive(worldPos, threshold);
  }

  // ===========================================================================
  // PUBLIC API: OBJECT POSITION TRACKING
  // ===========================================================================

  /**
   * Update tracked object position (when no external provider is used).
   */
  updateObjectPosition(objectId: string, position: Vec3): void {
    this.trackedObjectPositions.set(objectId, { ...position });
  }

  /**
   * Remove a tracked object.
   */
  removeObjectPosition(objectId: string): void {
    this.trackedObjectPositions.delete(objectId);
  }

  /**
   * Clear all tracked positions.
   */
  clearObjectPositions(): void {
    this.trackedObjectPositions.clear();
  }

  // ===========================================================================
  // PUBLIC API: VISUALIZATION
  // ===========================================================================

  /**
   * Create a visualization snapshot for the NeuralActivityDashboard.
   */
  createVisualizationSnapshot(): DNFVisualizationSnapshot {
    const snapshot = this.attentionField.createVisualizationSnapshot();
    snapshot.performance.currentHz = this.currentHz;
    return snapshot;
  }

  // ===========================================================================
  // PUBLIC API: METRICS
  // ===========================================================================

  /**
   * Get integration metrics.
   */
  getMetrics(): DNFIntegrationMetrics {
    const avgCycleTime = this.cycleTimesHistory.length > 0
      ? this.cycleTimesHistory.reduce((a, b) => a + b, 0) / this.cycleTimesHistory.length
      : 0;
    const peakCycleTime = this.cycleTimesHistory.length > 0
      ? Math.max(...this.cycleTimesHistory)
      : 0;

    const stats = this.attentionField.getStatistics();
    const snnBridgeActive = this.snnBridge?.isActive() ?? false;

    return {
      isActive: this._isActive,
      snnConnected: snnBridgeActive,
      projectedObjectCount: this.trackedObjectPositions.size,
      dnfHz: this.currentHz,
      snnHz: this.snnBridge?.getCurrentHz() ?? 0,
      avgStepTimeMs: Math.round(avgCycleTime * 100) / 100,
      peakStepTimeMs: Math.round(peakCycleTime * 100) / 100,
      totalTimesteps: this.totalCycles,
      stablePeakCount: stats.peaks.filter(p => p.isStable).length,
      globalSaliency: stats.meanOutput,
    };
  }

  /**
   * Check if the integration is active.
   */
  isActive(): boolean {
    return this._isActive;
  }

  /**
   * Get the current DNF Hz.
   */
  getCurrentHz(): number {
    return this.currentHz;
  }

  /**
   * Set the DNF simulation frequency.
   */
  setDnfHz(hz: number): void {
    const clamped = Math.max(
      this.config.minDnfHz,
      Math.min(this.config.maxDnfHz, hz),
    );
    if (clamped !== this.currentHz) {
      this.currentHz = clamped;
      if (this._isActive) {
        this.scheduleUpdateLoop();
      }
    }
  }

  /**
   * Get the spatial attention field (for direct access).
   */
  getAttentionField(): DNFSpatialAttentionField {
    return this.attentionField;
  }

  // ===========================================================================
  // INTERNAL: UPDATE LOOP
  // ===========================================================================

  private scheduleUpdateLoop(): void {
    this.clearUpdateInterval();

    const intervalMs = Math.max(1, Math.round(1000 / this.currentHz));
    this.updateIntervalId = setInterval(() => {
      if (this._isActive) {
        this.runCycle();
      }
    }, intervalMs);
  }

  private clearUpdateInterval(): void {
    if (this.updateIntervalId !== null) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = null;
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a DNFPerceptionIntegration with configuration.
 */
export function createDNFPerceptionIntegration(
  config: DNFPerceptionIntegrationConfig,
): DNFPerceptionIntegration {
  return new DNFPerceptionIntegration(config);
}
