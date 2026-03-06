/**
 * @hololand/renderer RenderLocalityManager
 *
 * 50m render locality radius using octree spatial partitioning.
 */

import { OctreePartition, type OctreeNode } from './OctreePartition';

export interface RenderEntity { id: string; position: { x: number; y: number; z: number }; renderPriority: number; }
export interface LocalityResult { visibleEntities: string[]; streamingZones: string[]; totalInOctree: number; }

export class RenderLocalityManager {
  private octree: OctreePartition;
  private localityRadius: number;
  private entities: Map<string, RenderEntity> = new Map();

  constructor(worldSize: number = 1000, localityRadius: number = 50) {
    this.octree = new OctreePartition(worldSize);
    this.localityRadius = localityRadius;
  }

  addEntity(entity: RenderEntity): void {
    this.entities.set(entity.id, entity);
    this.octree.insert(entity.id, entity.position);
  }

  removeEntity(id: string): void { this.entities.delete(id); this.octree.remove(id); }

  queryLocality(viewerPos: { x: number; y: number; z: number }): LocalityResult {
    const nearby = this.octree.queryRadius(viewerPos, this.localityRadius);
    return { visibleEntities: nearby, streamingZones: [], totalInOctree: this.octree.getEntityCount() };
  }

  getEntityCount(): number { return this.entities.size; }
  getLocalityRadius(): number { return this.localityRadius; }
}
