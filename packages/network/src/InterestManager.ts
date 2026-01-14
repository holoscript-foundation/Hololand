/**
 * @hololand/network InterestManager
 *
 * Spatial interest management for network optimization
 * Only synchronizes objects within player's area of interest
 */

import { logger } from './logger';
import type { InterestConfig, InterestZone, Vector3, SyncState } from './types';

const DEFAULT_CONFIG: Required<InterestConfig> = {
  viewDistance: 100,
  updateRate: 10, // Updates per second
  priorityLevels: 3,
};

interface TrackedObject {
  id: string;
  position: Vector3;
  priority: number;
  lastUpdate: number;
  zone: InterestZone | null;
}

export class InterestManager {
  private config: Required<InterestConfig>;
  private viewerPosition: Vector3 = { x: 0, y: 0, z: 0 };
  private trackedObjects: Map<string, TrackedObject> = new Map();
  private zones: Map<string, InterestZone> = new Map();
  private objectsInView: Set<string> = new Set();

  constructor(config: InterestConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info('InterestManager initialized', { config: this.config });
  }

  // ============================================================================
  // Viewer Management
  // ============================================================================

  updateViewerPosition(position: Vector3): void {
    this.viewerPosition = position;
    this.recalculateInterest();
  }

  setViewDistance(distance: number): void {
    this.config.viewDistance = distance;
    this.recalculateInterest();
  }

  getViewerPosition(): Vector3 {
    return { ...this.viewerPosition };
  }

  // ============================================================================
  // Object Tracking
  // ============================================================================

  trackObject(id: string, position: Vector3): void {
    const distance = this.calculateDistance(this.viewerPosition, position);
    const priority = this.calculatePriority(distance);

    this.trackedObjects.set(id, {
      id,
      position,
      priority,
      lastUpdate: Date.now(),
      zone: this.getZoneForPosition(position),
    });

    if (distance <= this.config.viewDistance) {
      this.objectsInView.add(id);
    }
  }

  updateObjectPosition(id: string, position: Vector3): void {
    const obj = this.trackedObjects.get(id);
    if (!obj) {
      this.trackObject(id, position);
      return;
    }

    const distance = this.calculateDistance(this.viewerPosition, position);
    const wasInView = this.objectsInView.has(id);
    const isInView = distance <= this.config.viewDistance;

    obj.position = position;
    obj.priority = this.calculatePriority(distance);
    obj.lastUpdate = Date.now();
    obj.zone = this.getZoneForPosition(position);

    if (isInView) {
      this.objectsInView.add(id);
    } else {
      this.objectsInView.delete(id);
    }
  }

  untrackObject(id: string): void {
    this.trackedObjects.delete(id);
    this.objectsInView.delete(id);
  }

  // ============================================================================
  // Zone Management
  // ============================================================================

  addZone(zone: InterestZone): void {
    this.zones.set(zone.id, zone);
    logger.debug('Zone added', { zoneId: zone.id });
  }

  removeZone(zoneId: string): void {
    this.zones.delete(zoneId);
  }

  getZone(zoneId: string): InterestZone | undefined {
    return this.zones.get(zoneId);
  }

  private getZoneForPosition(position: Vector3): InterestZone | null {
    for (const zone of this.zones.values()) {
      const distance = this.calculateDistance(zone.center, position);
      if (distance <= zone.radius) {
        return zone;
      }
    }
    return null;
  }

  // ============================================================================
  // Interest Calculation
  // ============================================================================

  private recalculateInterest(): void {
    this.objectsInView.clear();

    this.trackedObjects.forEach((obj) => {
      const distance = this.calculateDistance(this.viewerPosition, obj.position);
      obj.priority = this.calculatePriority(distance);

      if (distance <= this.config.viewDistance) {
        this.objectsInView.add(obj.id);
      }
    });
  }

  private calculateDistance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private calculatePriority(distance: number): number {
    if (distance <= this.config.viewDistance * 0.33) {
      return 0; // High priority (close)
    } else if (distance <= this.config.viewDistance * 0.66) {
      return 1; // Medium priority
    } else if (distance <= this.config.viewDistance) {
      return 2; // Low priority (far)
    }
    return -1; // Out of range
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  isInView(objectId: string): boolean {
    return this.objectsInView.has(objectId);
  }

  getObjectsInView(): string[] {
    return Array.from(this.objectsInView);
  }

  getObjectsByPriority(priority: number): string[] {
    const result: string[] = [];

    this.trackedObjects.forEach((obj) => {
      if (obj.priority === priority && this.objectsInView.has(obj.id)) {
        result.push(obj.id);
      }
    });

    return result;
  }

  getHighPriorityObjects(): string[] {
    return this.getObjectsByPriority(0);
  }

  getMediumPriorityObjects(): string[] {
    return this.getObjectsByPriority(1);
  }

  getLowPriorityObjects(): string[] {
    return this.getObjectsByPriority(2);
  }

  getSortedByPriority(): string[] {
    const inView = Array.from(this.objectsInView);

    return inView.sort((a, b) => {
      const objA = this.trackedObjects.get(a);
      const objB = this.trackedObjects.get(b);

      if (!objA || !objB) return 0;

      return objA.priority - objB.priority;
    });
  }

  // ============================================================================
  // Update Rate Calculation
  // ============================================================================

  getUpdateInterval(objectId: string): number {
    const obj = this.trackedObjects.get(objectId);
    if (!obj || !this.objectsInView.has(objectId)) {
      return -1; // Don't update
    }

    // Higher priority = more frequent updates
    const baseInterval = 1000 / this.config.updateRate;

    switch (obj.priority) {
      case 0: // High priority
        return baseInterval;
      case 1: // Medium priority
        return baseInterval * 2;
      case 2: // Low priority
        return baseInterval * 4;
      default:
        return -1;
    }
  }

  shouldUpdate(objectId: string): boolean {
    const obj = this.trackedObjects.get(objectId);
    if (!obj) return false;

    const interval = this.getUpdateInterval(objectId);
    if (interval < 0) return false;

    return Date.now() - obj.lastUpdate >= interval;
  }

  // ============================================================================
  // Filtering for Network
  // ============================================================================

  filterStatesForClient(
    states: SyncState[],
    clientPosition: Vector3
  ): SyncState[] {
    return states.filter((state) => {
      if (!state.position) return true; // Always include states without position

      const distance = this.calculateDistance(clientPosition, state.position);
      return distance <= this.config.viewDistance;
    });
  }

  filterStatesForViewer(states: SyncState[]): SyncState[] {
    return this.filterStatesForClient(states, this.viewerPosition);
  }

  // ============================================================================
  // Stats
  // ============================================================================

  getStats(): {
    totalTracked: number;
    inView: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    zones: number;
  } {
    return {
      totalTracked: this.trackedObjects.size,
      inView: this.objectsInView.size,
      highPriority: this.getObjectsByPriority(0).length,
      mediumPriority: this.getObjectsByPriority(1).length,
      lowPriority: this.getObjectsByPriority(2).length,
      zones: this.zones.size,
    };
  }

  clear(): void {
    this.trackedObjects.clear();
    this.objectsInView.clear();
    this.zones.clear();
  }
}
