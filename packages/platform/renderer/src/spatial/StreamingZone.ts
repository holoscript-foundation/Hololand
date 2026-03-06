/**
 * @hololand/renderer StreamingZone
 *
 * Defines streaming zones for progressive asset loading based on viewer proximity.
 * Implements LOD-based streaming priorities, bandwidth estimation, prefetch for
 * predicted movement, unload distance, and a zone state machine
 * (loading/active/dormant/unloaded).
 */

export interface StreamingZoneConfig {
  zoneId: string;
  center: { x: number; y: number; z: number };
  radius: number;
  priority: number;
  assetIds: string[];
}

export type ZoneState = 'unloaded' | 'loading' | 'active' | 'dormant';

export interface ZoneEntry extends StreamingZoneConfig {
  state: ZoneState;
  /** Distance at which zone unloads (beyond radius) */
  unloadDistance: number;
  /** LOD level for this zone's assets (lower = higher detail) */
  lodLevel: number;
  /** Loading progress 0-1 */
  loadProgress: number;
  /** Estimated size in MB */
  sizeMB: number;
  /** Last time this zone was active (for dormancy tracking) */
  lastActiveTimestamp: number;
}

export interface StreamingStats {
  totalZones: number;
  activeZones: number;
  loadingZones: number;
  dormantZones: number;
  unloadedZones: number;
  loadedAssetCount: number;
  totalAssetsNeeded: number;
  estimatedBandwidthMBps: number;
  estimatedLoadTimeMs: number;
}

export interface PrefetchPrediction {
  zoneId: string;
  probability: number;     // 0-1 probability of entering this zone
  estimatedTimeMs: number;  // estimated time until entry
}

export interface StreamingZoneManagerConfig {
  /** Bandwidth available for streaming (MB/s) */
  bandwidthMBps: number;
  /** Multiplier on zone radius for prefetch trigger distance */
  prefetchRadiusMultiplier: number;
  /** Time in ms before a dormant zone is unloaded */
  dormantTimeoutMs: number;
  /** Maximum concurrent zone loads */
  maxConcurrentLoads: number;
  /** LOD distance thresholds (meters). Index 0 = closest */
  lodDistances: number[];
}

const DEFAULT_STREAMING_CONFIG: StreamingZoneManagerConfig = {
  bandwidthMBps: 50,
  prefetchRadiusMultiplier: 1.5,
  dormantTimeoutMs: 30_000,
  maxConcurrentLoads: 3,
  lodDistances: [25, 75, 150, 300],
};

export class StreamingZone {
  private zones: Map<string, ZoneEntry> = new Map();
  private loadedAssets: Set<string> = new Set();
  private config: StreamingZoneManagerConfig;

  // Movement prediction
  private positionHistory: Array<{ x: number; y: number; z: number; timestamp: number }> = [];
  private maxPositionHistory: number = 30;

  constructor(config?: Partial<StreamingZoneManagerConfig>) {
    this.config = { ...DEFAULT_STREAMING_CONFIG, ...config };
  }

  // ── Original API (preserved) ─────────────────────────────────────

  addZone(config: StreamingZoneConfig): void {
    this.zones.set(config.zoneId, {
      ...config,
      state: 'unloaded',
      unloadDistance: config.radius * 2,
      lodLevel: this.config.lodDistances.length,
      loadProgress: 0,
      sizeMB: config.assetIds.length * 5, // estimate 5MB per asset
      lastActiveTimestamp: 0,
    });
  }

  removeZone(zoneId: string): void {
    this.zones.delete(zoneId);
  }

  getActiveZones(viewerPos: { x: number; y: number; z: number }): StreamingZoneConfig[] {
    const active: StreamingZoneConfig[] = [];
    for (const zone of this.zones.values()) {
      const dist = this.distanceTo(viewerPos, zone.center);
      if (dist <= zone.radius) active.push(zone);
    }
    return active.sort((a, b) => b.priority - a.priority);
  }

  getAssetsToLoad(viewerPos: { x: number; y: number; z: number }): string[] {
    const zones = this.getActiveZones(viewerPos);
    const needed: string[] = [];
    for (const zone of zones) {
      for (const assetId of zone.assetIds) {
        if (!this.loadedAssets.has(assetId)) needed.push(assetId);
      }
    }
    return needed;
  }

  markLoaded(assetId: string): void {
    this.loadedAssets.add(assetId);
  }

  getZoneCount(): number {
    return this.zones.size;
  }

  // ── Zone state machine ───────────────────────────────────────────

  /**
   * Update all zone states based on viewer position.
   * Handles state transitions: unloaded -> loading -> active -> dormant -> unloaded
   */
  updateZoneStates(viewerPos: { x: number; y: number; z: number }, now: number = Date.now()): void {
    // Record position for movement prediction
    this.recordPosition(viewerPos, now);

    let currentlyLoading = 0;
    for (const zone of this.zones.values()) {
      if (zone.state === 'loading') currentlyLoading++;
    }

    for (const zone of this.zones.values()) {
      const dist = this.distanceTo(viewerPos, zone.center);

      // Update LOD based on distance
      zone.lodLevel = this.computeLODLevel(dist);

      switch (zone.state) {
        case 'unloaded': {
          // Transition to loading if within prefetch range and we have load capacity
          const prefetchDist = zone.radius * this.config.prefetchRadiusMultiplier;
          if (dist <= prefetchDist && currentlyLoading < this.config.maxConcurrentLoads) {
            zone.state = 'loading';
            zone.loadProgress = 0;
            currentlyLoading++;
          }
          break;
        }

        case 'loading': {
          // Simulate progressive loading based on bandwidth
          const loadRatePerFrame = this.config.bandwidthMBps * 0.016; // ~16ms per update
          zone.loadProgress = Math.min(1, zone.loadProgress + loadRatePerFrame / Math.max(0.1, zone.sizeMB));

          if (zone.loadProgress >= 1) {
            // All assets loaded: transition to active
            for (const assetId of zone.assetIds) {
              this.loadedAssets.add(assetId);
            }
            zone.state = 'active';
            zone.lastActiveTimestamp = now;
          }
          break;
        }

        case 'active': {
          zone.lastActiveTimestamp = now;

          if (dist > zone.radius) {
            // Viewer left the zone: go dormant
            zone.state = 'dormant';
          }
          break;
        }

        case 'dormant': {
          if (dist <= zone.radius) {
            // Viewer re-entered: reactivate
            zone.state = 'active';
            zone.lastActiveTimestamp = now;
          } else if (dist > zone.unloadDistance) {
            // Too far: unload
            this.unloadZoneAssets(zone);
            zone.state = 'unloaded';
            zone.loadProgress = 0;
          } else if (now - zone.lastActiveTimestamp > this.config.dormantTimeoutMs) {
            // Dormant timeout: unload
            this.unloadZoneAssets(zone);
            zone.state = 'unloaded';
            zone.loadProgress = 0;
          }
          break;
        }
      }
    }
  }

  private unloadZoneAssets(zone: ZoneEntry): void {
    // Only unload assets not needed by other active/loading zones
    for (const assetId of zone.assetIds) {
      let neededElsewhere = false;
      for (const other of this.zones.values()) {
        if (other.zoneId === zone.zoneId) continue;
        if ((other.state === 'active' || other.state === 'loading') &&
            other.assetIds.includes(assetId)) {
          neededElsewhere = true;
          break;
        }
      }
      if (!neededElsewhere) {
        this.loadedAssets.delete(assetId);
      }
    }
  }

  getZoneState(zoneId: string): ZoneState | undefined {
    return this.zones.get(zoneId)?.state;
  }

  // ── LOD management ───────────────────────────────────────────────

  private computeLODLevel(distance: number): number {
    for (let i = 0; i < this.config.lodDistances.length; i++) {
      if (distance <= this.config.lodDistances[i]) return i;
    }
    return this.config.lodDistances.length;
  }

  getZoneLOD(zoneId: string): number | undefined {
    return this.zones.get(zoneId)?.lodLevel;
  }

  // ── Movement prediction & prefetch ───────────────────────────────

  private recordPosition(
    pos: { x: number; y: number; z: number },
    timestamp: number,
  ): void {
    this.positionHistory.push({ ...pos, timestamp });
    if (this.positionHistory.length > this.maxPositionHistory) {
      this.positionHistory.shift();
    }
  }

  /**
   * Predict which zones the viewer is likely to enter based on movement direction.
   */
  predictPrefetch(viewerPos: { x: number; y: number; z: number }): PrefetchPrediction[] {
    if (this.positionHistory.length < 3) return [];

    // Compute velocity vector from recent positions
    const recent = this.positionHistory.slice(-5);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const dt = (last.timestamp - first.timestamp) / 1000;
    if (dt <= 0) return [];

    const velocity = {
      x: (last.x - first.x) / dt,
      y: (last.y - first.y) / dt,
      z: (last.z - first.z) / dt,
    };

    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
    if (speed < 0.1) return []; // barely moving

    const predictions: PrefetchPrediction[] = [];

    for (const zone of this.zones.values()) {
      if (zone.state === 'active' || zone.state === 'loading') continue;

      // Project position forward and check if we'd enter this zone
      const toZone = {
        x: zone.center.x - viewerPos.x,
        y: zone.center.y - viewerPos.y,
        z: zone.center.z - viewerPos.z,
      };

      const distToZone = Math.sqrt(toZone.x ** 2 + toZone.y ** 2 + toZone.z ** 2);

      // Dot product: how aligned is velocity with direction to zone?
      const dot = (velocity.x * toZone.x + velocity.y * toZone.y + velocity.z * toZone.z) / (speed * distToZone);

      if (dot > 0.3) { // heading roughly toward zone
        const timeToReach = (distToZone - zone.radius) / speed;
        const probability = Math.max(0, Math.min(1, dot * (1 - Math.min(1, distToZone / (zone.radius * 5)))));

        if (timeToReach > 0 && probability > 0.1) {
          predictions.push({
            zoneId: zone.zoneId,
            probability,
            estimatedTimeMs: timeToReach * 1000,
          });
        }
      }
    }

    return predictions.sort((a, b) => b.probability - a.probability);
  }

  // ── Bandwidth estimation ─────────────────────────────────────────

  /**
   * Estimate how long it would take to load all needed assets at current bandwidth.
   */
  estimateLoadTime(viewerPos: { x: number; y: number; z: number }): number {
    let totalMB = 0;
    for (const zone of this.zones.values()) {
      const dist = this.distanceTo(viewerPos, zone.center);
      if (dist <= zone.radius * this.config.prefetchRadiusMultiplier && zone.state === 'unloaded') {
        totalMB += zone.sizeMB;
      }
    }
    return totalMB > 0 ? (totalMB / this.config.bandwidthMBps) * 1000 : 0;
  }

  // ── Stats ────────────────────────────────────────────────────────

  getStreamingStats(viewerPos: { x: number; y: number; z: number }): StreamingStats {
    let active = 0, loading = 0, dormant = 0, unloaded = 0;
    let totalAssetsNeeded = 0;

    for (const zone of this.zones.values()) {
      switch (zone.state) {
        case 'active': active++; break;
        case 'loading': loading++; break;
        case 'dormant': dormant++; break;
        case 'unloaded': unloaded++; break;
      }
      totalAssetsNeeded += zone.assetIds.length;
    }

    return {
      totalZones: this.zones.size,
      activeZones: active,
      loadingZones: loading,
      dormantZones: dormant,
      unloadedZones: unloaded,
      loadedAssetCount: this.loadedAssets.size,
      totalAssetsNeeded,
      estimatedBandwidthMBps: this.config.bandwidthMBps,
      estimatedLoadTimeMs: this.estimateLoadTime(viewerPos),
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private distanceTo(
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number },
  ): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
  }

  getZone(zoneId: string): ZoneEntry | undefined {
    const zone = this.zones.get(zoneId);
    return zone ? { ...zone } : undefined;
  }

  getAllZones(): ZoneEntry[] {
    return [...this.zones.values()].map((z) => ({ ...z }));
  }
}
