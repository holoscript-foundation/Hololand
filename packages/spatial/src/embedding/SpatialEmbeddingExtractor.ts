/**
 * Spatial Embedding Extractor
 *
 * Extracts spatial embeddings from code structures for 3D visualization.
 * Maps code relationships to spatial positions.
 *
 * Features:
 * - Code structure → 3D position mapping
 * - Dependency graph → spatial layout
 * - Semantic clustering for code grouping
 * - Multiple layout algorithms
 *
 * @packageDocumentation
 */

import { createLogger, type HololandLogger } from '@hololand/logger';
import type { Vector3 } from '../mental/MentalWorldState';

// ============================================================================
// TYPES
// ============================================================================

export interface SpatialEntity {
  id: string;
  type: CodeEntityType;
  name: string;
  position: Vector3;
  scale: number;
  color: string;
  metadata: EntityMetadata;
  connections: Connection[];
  embedding?: number[];
  cluster?: string;
}

export type CodeEntityType =
  | 'file'
  | 'class'
  | 'function'
  | 'variable'
  | 'module'
  | 'package'
  | 'interface'
  | 'type'
  | 'test'
  | 'config';

export interface EntityMetadata {
  path?: string;
  lineCount?: number;
  complexity?: number;
  imports?: string[];
  exports?: string[];
  lastModified?: number;
  language?: string;
}

export interface Connection {
  targetId: string;
  type: ConnectionType;
  strength: number;
}

export type ConnectionType =
  | 'imports'
  | 'exports'
  | 'calls'
  | 'extends'
  | 'implements'
  | 'contains'
  | 'depends'
  | 'tests';

export type LayoutAlgorithm =
  | 'force-directed'
  | 'hierarchical'
  | 'radial'
  | 'grid'
  | 'clustered';

export interface LayoutOptions {
  algorithm: LayoutAlgorithm;
  spacing: number;
  layerHeight: number;
  centerAttraction: number;
  repulsionStrength: number;
  connectionStrength: number;
  iterations: number;
}

export interface Cluster {
  id: string;
  name: string;
  center: Vector3;
  radius: number;
  entityIds: string[];
  color: string;
}

// ============================================================================
// SPATIAL EMBEDDING EXTRACTOR
// ============================================================================

export class SpatialEmbeddingExtractor {
  private entities: Map<string, SpatialEntity> = new Map();
  private clusters: Map<string, Cluster> = new Map();
  private embeddingCache: Map<string, number[]> = new Map();
  private logger: HololandLogger;

  private defaultOptions: LayoutOptions = {
    algorithm: 'force-directed',
    spacing: 2.0,
    layerHeight: 3.0,
    centerAttraction: 0.1,
    repulsionStrength: 1.0,
    connectionStrength: 0.5,
    iterations: 100,
  };

  constructor() {
    this.logger = createLogger('SpatialEmbedding');
    this.logger.info('Initialized');
  }

  // =========================================================================
  // ENTITY MANAGEMENT
  // =========================================================================

  addEntity(
    id: string,
    type: CodeEntityType,
    name: string,
    metadata: EntityMetadata = {}
  ): SpatialEntity {
    const entity: SpatialEntity = {
      id,
      type,
      name,
      position: [0, 0, 0],
      scale: this.calculateEntityScale(type, metadata),
      color: this.getEntityColor(type),
      metadata,
      connections: [],
    };

    this.entities.set(id, entity);
    this.logger.debug(`Added entity: ${name} (${type})`);
    return entity;
  }

  addConnection(
    sourceId: string,
    targetId: string,
    type: ConnectionType,
    strength: number = 1.0
  ): void {
    const source = this.entities.get(sourceId);
    if (source) {
      source.connections.push({ targetId, type, strength });
    }
  }

  removeEntity(id: string): void {
    this.entities.delete(id);
    this.embeddingCache.delete(id);

    for (const entity of this.entities.values()) {
      entity.connections = entity.connections.filter((c) => c.targetId !== id);
    }
  }

  // =========================================================================
  // EMBEDDING EXTRACTION
  // =========================================================================

  extractEmbedding(entityId: string): number[] {
    const cached = this.embeddingCache.get(entityId);
    if (cached) return cached;

    const entity = this.entities.get(entityId);
    if (!entity) return [];

    const embedding = this.computeEmbedding(entity);
    this.embeddingCache.set(entityId, embedding);
    entity.embedding = embedding;

    return embedding;
  }

  private computeEmbedding(entity: SpatialEntity): number[] {
    const embedding: number[] = new Array(64).fill(0);

    // Type encoding
    const typeIndex = this.getTypeIndex(entity.type);
    embedding[typeIndex] = 1.0;

    // Complexity
    const complexity = entity.metadata.complexity || 1;
    embedding[10] = Math.min(complexity / 100, 1);

    // Line count
    const lines = entity.metadata.lineCount || 0;
    embedding[20] = Math.min(lines / 1000, 1);

    // Connections
    embedding[30] = Math.min(entity.connections.length / 20, 1);

    // Imports
    const imports = entity.metadata.imports?.length || 0;
    embedding[40] = Math.min(imports / 50, 1);

    // Name hash
    const nameHash = this.hashString(entity.name);
    for (let i = 50; i < 64; i++) {
      embedding[i] = ((nameHash >> (i - 50)) & 1) / 2;
    }

    return embedding;
  }

  private getTypeIndex(type: CodeEntityType): number {
    const typeMap: Record<CodeEntityType, number> = {
      file: 0, class: 1, function: 2, variable: 3, module: 4,
      package: 5, interface: 6, type: 7, test: 8, config: 9,
    };
    return typeMap[type] || 0;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // =========================================================================
  // LAYOUT ALGORITHMS
  // =========================================================================

  computeLayout(options: Partial<LayoutOptions> = {}): void {
    const opts = { ...this.defaultOptions, ...options };

    switch (opts.algorithm) {
      case 'force-directed':
        this.forceDirectedLayout(opts);
        break;
      case 'hierarchical':
        this.hierarchicalLayout(opts);
        break;
      case 'radial':
        this.radialLayout(opts);
        break;
      case 'grid':
        this.gridLayout(opts);
        break;
      case 'clustered':
        this.clusteredLayout(opts);
        break;
    }

    this.logger.info(`Layout computed: ${opts.algorithm}`);
  }

  private forceDirectedLayout(options: LayoutOptions): void {
    const entities = Array.from(this.entities.values());

    // Initialize random positions
    for (const entity of entities) {
      entity.position = [
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
      ];
    }

    // Iterate force simulation
    for (let iter = 0; iter < options.iterations; iter++) {
      const forces = new Map<string, Vector3>();
      for (const entity of entities) {
        forces.set(entity.id, [0, 0, 0]);
      }

      // Repulsion
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const a = entities[i];
          const b = entities[j];

          const dx = b.position[0] - a.position[0];
          const dy = b.position[1] - a.position[1];
          const dz = b.position[2] - a.position[2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1;

          const force = (options.repulsionStrength * options.spacing) / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          const fz = (dz / dist) * force;

          const forceA = forces.get(a.id)!;
          const forceB = forces.get(b.id)!;
          forceA[0] -= fx; forceA[1] -= fy; forceA[2] -= fz;
          forceB[0] += fx; forceB[1] += fy; forceB[2] += fz;
        }
      }

      // Attraction
      for (const entity of entities) {
        for (const conn of entity.connections) {
          const target = this.entities.get(conn.targetId);
          if (!target) continue;

          const dx = target.position[0] - entity.position[0];
          const dy = target.position[1] - entity.position[1];
          const dz = target.position[2] - entity.position[2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          const force = dist * options.connectionStrength * conn.strength;
          const forceE = forces.get(entity.id)!;
          forceE[0] += (dx / dist) * force;
          forceE[1] += (dy / dist) * force;
          forceE[2] += (dz / dist) * force;
        }
      }

      // Center attraction
      for (const entity of entities) {
        const force = forces.get(entity.id)!;
        force[0] -= entity.position[0] * options.centerAttraction;
        force[1] -= entity.position[1] * options.centerAttraction;
        force[2] -= entity.position[2] * options.centerAttraction;
      }

      // Apply forces
      const damping = 0.9;
      for (const entity of entities) {
        const force = forces.get(entity.id)!;
        entity.position[0] += force[0] * damping;
        entity.position[1] += force[1] * damping;
        entity.position[2] += force[2] * damping;
      }
    }
  }

  private hierarchicalLayout(options: LayoutOptions): void {
    const entities = Array.from(this.entities.values());
    const hasIncoming = new Set<string>();

    for (const entity of entities) {
      for (const conn of entity.connections) {
        hasIncoming.add(conn.targetId);
      }
    }

    const roots = entities.filter((e) => !hasIncoming.has(e.id));
    const layers = new Map<string, number>();
    const queue: Array<{ entity: SpatialEntity; layer: number }> = [];

    for (const root of roots) {
      queue.push({ entity: root, layer: 0 });
      layers.set(root.id, 0);
    }

    while (queue.length > 0) {
      const { entity, layer } = queue.shift()!;
      for (const conn of entity.connections) {
        if (!layers.has(conn.targetId)) {
          const target = this.entities.get(conn.targetId);
          if (target) {
            layers.set(conn.targetId, layer + 1);
            queue.push({ entity: target, layer: layer + 1 });
          }
        }
      }
    }

    const layerGroups = new Map<number, SpatialEntity[]>();
    for (const entity of entities) {
      const layer = layers.get(entity.id) ?? 0;
      if (!layerGroups.has(layer)) {
        layerGroups.set(layer, []);
      }
      layerGroups.get(layer)!.push(entity);
    }

    for (const [layer, group] of layerGroups) {
      const y = layer * options.layerHeight;
      const count = group.length;
      const angleStep = (2 * Math.PI) / Math.max(count, 1);
      const radius = count * options.spacing / (2 * Math.PI);

      for (let i = 0; i < group.length; i++) {
        const angle = i * angleStep;
        group[i].position = [
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius,
        ];
      }
    }
  }

  private radialLayout(options: LayoutOptions): void {
    const entities = Array.from(this.entities.values());
    entities.sort((a, b) => b.connections.length - a.connections.length);

    if (entities.length > 0) {
      entities[0].position = [0, 0, 0];
    }

    let ringIndex = 1;
    let entityIndex = 1;
    while (entityIndex < entities.length) {
      const ringRadius = ringIndex * options.spacing;
      const circumference = 2 * Math.PI * ringRadius;
      const entitiesInRing = Math.floor(circumference / options.spacing);
      const angleStep = (2 * Math.PI) / entitiesInRing;

      for (let i = 0; i < entitiesInRing && entityIndex < entities.length; i++) {
        const angle = i * angleStep;
        entities[entityIndex].position = [
          Math.cos(angle) * ringRadius,
          0,
          Math.sin(angle) * ringRadius,
        ];
        entityIndex++;
      }
      ringIndex++;
    }
  }

  private gridLayout(options: LayoutOptions): void {
    const entities = Array.from(this.entities.values());
    const gridSize = Math.ceil(Math.cbrt(entities.length));

    for (let i = 0; i < entities.length; i++) {
      const x = i % gridSize;
      const y = Math.floor(i / gridSize) % gridSize;
      const z = Math.floor(i / (gridSize * gridSize));

      entities[i].position = [
        (x - gridSize / 2) * options.spacing,
        y * options.layerHeight,
        (z - gridSize / 2) * options.spacing,
      ];
    }
  }

  private clusteredLayout(options: LayoutOptions): void {
    this.computeClusters();

    const clusterArray = Array.from(this.clusters.values());
    const clusterAngleStep = (2 * Math.PI) / Math.max(clusterArray.length, 1);

    for (let i = 0; i < clusterArray.length; i++) {
      const angle = i * clusterAngleStep;
      const radius = 10 + clusterArray[i].entityIds.length;
      clusterArray[i].center = [
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius,
      ];
    }

    for (const cluster of clusterArray) {
      const clusterEntities = cluster.entityIds
        .map((id) => this.entities.get(id))
        .filter((e): e is SpatialEntity => e !== undefined);

      const angleStep = (2 * Math.PI) / Math.max(clusterEntities.length, 1);
      const localRadius = Math.sqrt(clusterEntities.length) * options.spacing;

      for (let i = 0; i < clusterEntities.length; i++) {
        const angle = i * angleStep;
        clusterEntities[i].position = [
          cluster.center[0] + Math.cos(angle) * localRadius,
          cluster.center[1] + (Math.random() - 0.5) * options.layerHeight,
          cluster.center[2] + Math.sin(angle) * localRadius,
        ];
        clusterEntities[i].cluster = cluster.id;
      }
    }
  }

  // =========================================================================
  // CLUSTERING
  // =========================================================================

  computeClusters(numClusters: number = 5): void {
    const entities = Array.from(this.entities.values());

    for (const entity of entities) {
      if (!entity.embedding) {
        this.extractEmbedding(entity.id);
      }
    }

    const clusterColors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0'];
    const centers: number[][] = [];

    for (let i = 0; i < numClusters; i++) {
      const randomEntity = entities[Math.floor(Math.random() * entities.length)];
      centers.push([...(randomEntity.embedding || [])]);
    }

    const assignments = new Map<string, number>();

    for (let iter = 0; iter < 10; iter++) {
      for (const entity of entities) {
        if (!entity.embedding) continue;

        let minDist = Infinity;
        let minCluster = 0;

        for (let c = 0; c < numClusters; c++) {
          const dist = this.euclideanDistance(entity.embedding, centers[c]);
          if (dist < minDist) {
            minDist = dist;
            minCluster = c;
          }
        }

        assignments.set(entity.id, minCluster);
      }

      for (let c = 0; c < numClusters; c++) {
        const clusterEntities = entities.filter(
          (e) => assignments.get(e.id) === c && e.embedding
        );

        if (clusterEntities.length > 0) {
          const newCenter = new Array(64).fill(0);
          for (const entity of clusterEntities) {
            for (let d = 0; d < 64; d++) {
              newCenter[d] += (entity.embedding?.[d] || 0) / clusterEntities.length;
            }
          }
          centers[c] = newCenter;
        }
      }
    }

    this.clusters.clear();
    for (let c = 0; c < numClusters; c++) {
      const clusterEntities = entities.filter((e) => assignments.get(e.id) === c);
      if (clusterEntities.length === 0) continue;

      const cluster: Cluster = {
        id: `cluster_${c}`,
        name: `Cluster ${c + 1}`,
        center: [0, 0, 0],
        radius: Math.sqrt(clusterEntities.length) * 2,
        entityIds: clusterEntities.map((e) => e.id),
        color: clusterColors[c % clusterColors.length],
      };

      this.clusters.set(cluster.id, cluster);
    }

    this.logger.info(`Computed ${this.clusters.size} clusters`);
  }

  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================

  private calculateEntityScale(type: CodeEntityType, metadata: EntityMetadata): number {
    const baseScale: Record<CodeEntityType, number> = {
      package: 2.0, module: 1.5, file: 1.0, class: 1.2, interface: 1.0,
      type: 0.8, function: 0.6, variable: 0.4, test: 0.7, config: 0.5,
    };

    let scale = baseScale[type] || 1.0;

    if (metadata.complexity) {
      scale *= 1 + Math.log10(metadata.complexity + 1) * 0.2;
    }

    if (metadata.lineCount) {
      scale *= 1 + Math.log10(metadata.lineCount + 1) * 0.1;
    }

    return scale;
  }

  private getEntityColor(type: CodeEntityType): string {
    const colors: Record<CodeEntityType, string> = {
      package: '#673AB7', module: '#3F51B5', file: '#2196F3', class: '#4CAF50',
      interface: '#009688', type: '#00BCD4', function: '#FFC107', variable: '#FF9800',
      test: '#8BC34A', config: '#607D8B',
    };
    return colors[type] || '#9E9E9E';
  }

  // =========================================================================
  // EXPORT & ACCESS
  // =========================================================================

  exportForRendering(): {
    entities: SpatialEntity[];
    connections: Array<{ source: string; target: string; type: string; strength: number }>;
    clusters: Cluster[];
  } {
    const entities = Array.from(this.entities.values());
    const connections: Array<{ source: string; target: string; type: string; strength: number }> = [];

    for (const entity of entities) {
      for (const conn of entity.connections) {
        connections.push({
          source: entity.id,
          target: conn.targetId,
          type: conn.type,
          strength: conn.strength,
        });
      }
    }

    return {
      entities,
      connections,
      clusters: Array.from(this.clusters.values()),
    };
  }

  getStats(): {
    entityCount: number;
    connectionCount: number;
    clusterCount: number;
    typeDistribution: Record<string, number>;
  } {
    const typeDistribution: Record<string, number> = {};
    let connectionCount = 0;

    for (const entity of this.entities.values()) {
      typeDistribution[entity.type] = (typeDistribution[entity.type] || 0) + 1;
      connectionCount += entity.connections.length;
    }

    return {
      entityCount: this.entities.size,
      connectionCount,
      clusterCount: this.clusters.size,
      typeDistribution,
    };
  }

  getEntity(id: string): SpatialEntity | undefined {
    return this.entities.get(id);
  }

  getAllEntities(): SpatialEntity[] {
    return Array.from(this.entities.values());
  }

  getCluster(id: string): Cluster | undefined {
    return this.clusters.get(id);
  }

  getAllClusters(): Cluster[] {
    return Array.from(this.clusters.values());
  }

  clear(): void {
    this.entities.clear();
    this.clusters.clear();
    this.embeddingCache.clear();
    this.logger.info('Cleared');
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let _spatialEmbeddingExtractor: SpatialEmbeddingExtractor | null = null;

export function getSpatialEmbeddingExtractor(): SpatialEmbeddingExtractor {
  if (!_spatialEmbeddingExtractor) {
    _spatialEmbeddingExtractor = new SpatialEmbeddingExtractor();
  }
  return _spatialEmbeddingExtractor;
}

export function resetSpatialEmbeddingExtractor(): void {
  if (_spatialEmbeddingExtractor) {
    _spatialEmbeddingExtractor.clear();
  }
  _spatialEmbeddingExtractor = null;
}
