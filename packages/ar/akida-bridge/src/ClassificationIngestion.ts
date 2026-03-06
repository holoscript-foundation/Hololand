/**
 * Classification Result Ingestion
 *
 * Ingests PointNet++ classification results from the Akida AKD1500
 * into HoloLand's spatial state. Manages spatial entities with:
 *   - Temporal smoothing to avoid flickering classifications
 *   - Entity merging for overlapping segments across frames
 *   - Visibility tracking with configurable timeout
 *   - Event-driven notifications for entity lifecycle
 */

import type {
  ClassificationResult,
  ClassifiedSegment,
  SpatialEntity,
  SpatialStateEvents,
  Vector3,
  BoundingBox3D,
  SemanticClass,
} from './types';
import { SEMANTIC_CLASS_NAMES } from './types';

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface IngestionConfig {
  /** Minimum confidence to accept a segment */
  minConfidence: number;
  /** Maximum distance (meters) to consider two centroids as the same entity */
  mergeDistanceThreshold: number;
  /** Seconds before an unobserved entity is marked not visible */
  visibilityTimeoutMs: number;
  /** Seconds before an invisible entity is removed entirely */
  removalTimeoutMs: number;
  /** Temporal smoothing alpha for position (0=no update, 1=instant) */
  positionSmoothingAlpha: number;
  /** Temporal smoothing alpha for confidence */
  confidenceSmoothingAlpha: number;
  /** Maximum number of tracked entities */
  maxEntities: number;
}

export const DEFAULT_INGESTION_CONFIG: IngestionConfig = {
  minConfidence: 0.5,
  mergeDistanceThreshold: 0.5,
  visibilityTimeoutMs: 2000,
  removalTimeoutMs: 10000,
  positionSmoothingAlpha: 0.3,
  confidenceSmoothingAlpha: 0.4,
  maxEntities: 256,
};

// =============================================================================
// CLASSIFICATION INGESTION ENGINE
// =============================================================================

export class ClassificationIngestion {
  private config: IngestionConfig;
  private events: SpatialStateEvents;
  private entities: Map<string, SpatialEntity> = new Map();
  private nextEntityId: number = 1;

  constructor(config?: Partial<IngestionConfig>, events?: SpatialStateEvents) {
    this.config = { ...DEFAULT_INGESTION_CONFIG, ...config };
    this.events = events ?? {};
  }

  // ===========================================================================
  // PRIMARY API
  // ===========================================================================

  /**
   * Ingest a classification result from Akida (or fallback).
   * Updates the spatial state by creating, updating, or removing entities.
   *
   * @param result - Classification result to ingest
   */
  ingest(result: ClassificationResult): void {
    const now = result.timestamp;

    // 1. Process each classified segment
    for (const segment of result.segments) {
      if (segment.averageConfidence < this.config.minConfidence) {
        continue;
      }

      // 2. Try to match to existing entity
      const matchedEntity = this.findMatchingEntity(segment);

      if (matchedEntity) {
        // Update existing entity
        this.updateEntity(matchedEntity, segment, result.source, now);
      } else if (this.entities.size < this.config.maxEntities) {
        // Create new entity
        this.createEntity(segment, result.source, now);
      }
    }

    // 3. Age out old entities
    this.pruneEntities(now);
  }

  /**
   * Get all currently tracked spatial entities.
   */
  getEntities(): SpatialEntity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Get entities filtered by semantic class.
   */
  getEntitiesByClass(semanticClass: SemanticClass): SpatialEntity[] {
    return this.getEntities().filter(e => e.semanticClass === semanticClass);
  }

  /**
   * Get only currently visible entities.
   */
  getVisibleEntities(): SpatialEntity[] {
    return this.getEntities().filter(e => e.isVisible);
  }

  /**
   * Get a specific entity by ID.
   */
  getEntity(entityId: string): SpatialEntity | undefined {
    return this.entities.get(entityId);
  }

  /**
   * Get the total count of tracked entities.
   */
  get entityCount(): number {
    return this.entities.size;
  }

  /**
   * Get entity counts grouped by semantic class.
   */
  getEntityCountsByClass(): Partial<Record<SemanticClass, number>> {
    const counts: Partial<Record<SemanticClass, number>> = {};
    for (const entity of this.entities.values()) {
      counts[entity.semanticClass] = (counts[entity.semanticClass] ?? 0) + 1;
    }
    return counts;
  }

  /**
   * Reset all spatial state, removing all entities.
   */
  reset(): void {
    this.entities.clear();
    this.nextEntityId = 1;
    this.events.onStateReset?.();
  }

  // ===========================================================================
  // ENTITY MATCHING
  // ===========================================================================

  /**
   * Find an existing entity that matches a classified segment.
   * Matching criteria: same semantic class + centroid within merge distance.
   */
  private findMatchingEntity(segment: ClassifiedSegment): SpatialEntity | null {
    let bestMatch: SpatialEntity | null = null;
    let bestDistance = Infinity;

    for (const entity of this.entities.values()) {
      // Must be same semantic class
      if (entity.semanticClass !== segment.semanticClass) continue;

      const dist = this.distance3D(entity.position, segment.centroid);
      if (dist < this.config.mergeDistanceThreshold && dist < bestDistance) {
        bestMatch = entity;
        bestDistance = dist;
      }
    }

    return bestMatch;
  }

  // ===========================================================================
  // ENTITY LIFECYCLE
  // ===========================================================================

  /**
   * Create a new spatial entity from a classified segment.
   */
  private createEntity(
    segment: ClassifiedSegment,
    source: 'akida' | 'cpu' | 'webgpu',
    timestamp: number
  ): void {
    const entityId = `akida_entity_${this.nextEntityId++}`;
    const entity: SpatialEntity = {
      entityId,
      semanticClass: segment.semanticClass,
      label: SEMANTIC_CLASS_NAMES[segment.semanticClass] ?? 'unknown',
      position: { ...segment.centroid },
      boundingBox: this.cloneBoundingBox(segment.boundingBox),
      confidence: segment.averageConfidence,
      lastUpdated: timestamp,
      observationCount: 1,
      isVisible: true,
      source,
    };

    this.entities.set(entityId, entity);
    this.events.onEntityAdded?.(entity);
  }

  /**
   * Update an existing entity with new segment data, applying temporal smoothing.
   */
  private updateEntity(
    entity: SpatialEntity,
    segment: ClassifiedSegment,
    source: 'akida' | 'cpu' | 'webgpu',
    timestamp: number
  ): void {
    const alpha = this.config.positionSmoothingAlpha;
    const confAlpha = this.config.confidenceSmoothingAlpha;

    // Smooth position
    entity.position.x = entity.position.x * (1 - alpha) + segment.centroid.x * alpha;
    entity.position.y = entity.position.y * (1 - alpha) + segment.centroid.y * alpha;
    entity.position.z = entity.position.z * (1 - alpha) + segment.centroid.z * alpha;

    // Smooth confidence
    entity.confidence =
      entity.confidence * (1 - confAlpha) + segment.averageConfidence * confAlpha;

    // Update bounding box (no smoothing, direct replacement)
    entity.boundingBox = this.cloneBoundingBox(segment.boundingBox);

    // Update metadata
    entity.lastUpdated = timestamp;
    entity.observationCount += 1;
    entity.isVisible = true;
    entity.source = source;

    this.events.onEntityUpdated?.(entity);
  }

  /**
   * Prune entities that have not been observed recently.
   */
  private pruneEntities(now: number): void {
    const toRemove: string[] = [];

    for (const entity of this.entities.values()) {
      const age = now - entity.lastUpdated;

      if (age > this.config.removalTimeoutMs) {
        toRemove.push(entity.entityId);
      } else if (age > this.config.visibilityTimeoutMs && entity.isVisible) {
        entity.isVisible = false;
        this.events.onEntityUpdated?.(entity);
      }
    }

    for (const id of toRemove) {
      this.entities.delete(id);
      this.events.onEntityRemoved?.(id);
    }
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  /**
   * Euclidean distance between two 3D points.
   */
  private distance3D(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Deep-clone a bounding box.
   */
  private cloneBoundingBox(bb: BoundingBox3D): BoundingBox3D {
    return {
      center: { ...bb.center },
      size: { ...bb.size },
      rotation: bb.rotation ? { ...bb.rotation } : undefined,
    };
  }
}
