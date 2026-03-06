/**
 * @hololand/renderer OctreePartition
 *
 * Octree spatial partitioning for render locality.
 */

export interface OctreeNode { center: { x: number; y: number; z: number }; halfSize: number; entities: string[]; children: (OctreeNode | null)[]; }

export class OctreePartition {
  private root: OctreeNode;
  private entityPositions: Map<string, { x: number; y: number; z: number }> = new Map();
  private maxDepth: number;
  private maxEntitiesPerNode: number;

  constructor(worldSize: number = 1000, maxDepth: number = 6, maxEntitiesPerNode: number = 8) {
    this.maxDepth = maxDepth;
    this.maxEntitiesPerNode = maxEntitiesPerNode;
    this.root = { center: { x: 0, y: 0, z: 0 }, halfSize: worldSize / 2, entities: [], children: new Array(8).fill(null) };
  }

  insert(entityId: string, position: { x: number; y: number; z: number }): void {
    this.entityPositions.set(entityId, { ...position });
    this.insertIntoNode(this.root, entityId, position, 0);
  }

  remove(entityId: string): void {
    this.removeFromNode(this.root, entityId);
    this.entityPositions.delete(entityId);
  }

  queryRadius(center: { x: number; y: number; z: number }, radius: number): string[] {
    const results: string[] = [];
    this.queryNode(this.root, center, radius, results);
    return results;
  }

  getEntityCount(): number { return this.entityPositions.size; }

  private insertIntoNode(node: OctreeNode, entityId: string, pos: { x: number; y: number; z: number }, depth: number): void {
    if (depth >= this.maxDepth || node.entities.length < this.maxEntitiesPerNode) {
      node.entities.push(entityId);
      return;
    }
    const octant = this.getOctant(node, pos);
    if (!node.children[octant]) {
      const childHalf = node.halfSize / 2;
      const offsets = [[-1,-1,-1],[-1,-1,1],[-1,1,-1],[-1,1,1],[1,-1,-1],[1,-1,1],[1,1,-1],[1,1,1]];
      const o = offsets[octant];
      node.children[octant] = { center: { x: node.center.x + o[0] * childHalf, y: node.center.y + o[1] * childHalf, z: node.center.z + o[2] * childHalf }, halfSize: childHalf, entities: [], children: new Array(8).fill(null) };
    }
    this.insertIntoNode(node.children[octant]!, entityId, pos, depth + 1);
  }

  private removeFromNode(node: OctreeNode, entityId: string): boolean {
    const idx = node.entities.indexOf(entityId);
    if (idx !== -1) { node.entities.splice(idx, 1); return true; }
    for (const child of node.children) {
      if (child && this.removeFromNode(child, entityId)) return true;
    }
    return false;
  }

  private queryNode(node: OctreeNode, center: { x: number; y: number; z: number }, radius: number, results: string[]): void {
    // AABB-sphere intersection test
    const dx = Math.max(0, Math.abs(center.x - node.center.x) - node.halfSize);
    const dy = Math.max(0, Math.abs(center.y - node.center.y) - node.halfSize);
    const dz = Math.max(0, Math.abs(center.z - node.center.z) - node.halfSize);
    if (dx * dx + dy * dy + dz * dz > radius * radius) return;

    for (const entityId of node.entities) {
      const pos = this.entityPositions.get(entityId);
      if (pos) {
        const d = Math.sqrt((pos.x - center.x) ** 2 + (pos.y - center.y) ** 2 + (pos.z - center.z) ** 2);
        if (d <= radius) results.push(entityId);
      }
    }
    for (const child of node.children) {
      if (child) this.queryNode(child, center, radius, results);
    }
  }

  private getOctant(node: OctreeNode, pos: { x: number; y: number; z: number }): number {
    let octant = 0;
    if (pos.x >= node.center.x) octant |= 4;
    if (pos.y >= node.center.y) octant |= 2;
    if (pos.z >= node.center.z) octant |= 1;
    return octant;
  }
}
