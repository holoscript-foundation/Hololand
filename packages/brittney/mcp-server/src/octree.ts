export interface BoundingBox3D {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export interface SpatialItem3D extends BoundingBox3D {
  id: string;
  type: string;
  metadata?: any;
}

export class OctreeNode {
  bounds: BoundingBox3D;
  items: SpatialItem3D[] = [];
  children: OctreeNode[] | null = null;
  MAX_ITEMS = 8;
  MAX_DEPTH = 5;
  depth: number;

  constructor(bounds: BoundingBox3D, depth: number = 0) {
    this.bounds = bounds;
    this.depth = depth;
  }

  intersects(a: BoundingBox3D, b: BoundingBox3D): boolean {
    return (a.minX <= b.maxX && a.maxX >= b.minX) &&
           (a.minY <= b.maxY && a.maxY >= b.minY) &&
           (a.minZ <= b.maxZ && a.maxZ >= b.minZ);
  }

  subdivide() {
    const { minX, minY, minZ, maxX, maxY, maxZ } = this.bounds;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const midZ = (minZ + maxZ) / 2;

    this.children = [
      new OctreeNode({ minX, minY, minZ, maxX: midX, maxY: midY, maxZ: midZ }, this.depth + 1),
      new OctreeNode({ minX: midX, minY, minZ, maxX, maxY: midY, maxZ: midZ }, this.depth + 1),
      new OctreeNode({ minX, minY: midY, minZ, maxX: midX, maxY, maxZ: midZ }, this.depth + 1),
      new OctreeNode({ minX: midX, minY: midY, minZ, maxX, maxY, maxZ: midZ }, this.depth + 1),
      new OctreeNode({ minX, minY, minZ: midZ, maxX: midX, maxY: midY, maxZ }, this.depth + 1),
      new OctreeNode({ minX: midX, minY, minZ: midZ, maxX, maxY: midY, maxZ }, this.depth + 1),
      new OctreeNode({ minX, minY: midY, minZ: midZ, maxX: midX, maxY, maxZ }, this.depth + 1),
      new OctreeNode({ minX: midX, minY: midY, minZ: midZ, maxX, maxY, maxZ }, this.depth + 1),
    ];
  }

  insert(item: SpatialItem3D): boolean {
    if (!this.intersects(this.bounds, item)) return false;

    if (this.children === null) {
      this.items.push(item);
      if (this.items.length > this.MAX_ITEMS && this.depth < this.MAX_DEPTH) {
        this.subdivide();
        const oldItems = this.items;
        this.items = [];
        for (const i of oldItems) {
          this.insertIntoChildren(i);
        }
      }
      return true;
    }

    return this.insertIntoChildren(item);
  }

  private insertIntoChildren(item: SpatialItem3D): boolean {
    if (!this.children) return false;
    let inserted = false;
    for (const child of this.children) {
      if (child.insert(item)) inserted = true;
    }
    return inserted;
  }

  search(box: BoundingBox3D, results: SpatialItem3D[] = []): SpatialItem3D[] {
    if (!this.intersects(this.bounds, box)) return results;

    for (const item of this.items) {
      if (this.intersects(item, box)) {
        if (!results.find(i => i.id === item.id)) {
            results.push(item);
        }
      }
    }

    if (this.children) {
      for (const child of this.children) {
        child.search(box, results);
      }
    }

    return results;
  }

  remove(id: string): boolean {
    const idx = this.items.findIndex(i => i.id === id);
    if (idx !== -1) {
      this.items.splice(idx, 1);
      return true;
    }

    if (this.children) {
      for (const child of this.children) {
        if (child.remove(id)) return true;
      }
    }
    return false;
  }

  all(results: SpatialItem3D[] = []): SpatialItem3D[] {
    results.push(...this.items);
    if (this.children) {
      for (const child of this.children) {
        child.all(results);
      }
    }
    return results;
  }
}

export class Octree {
  root: OctreeNode;

  constructor(worldBounds: BoundingBox3D) {
    this.root = new OctreeNode(worldBounds);
  }

  insert(item: SpatialItem3D) {
    this.remove(item.id); // Deduplicate
    this.root.insert(item);
  }

  remove(id: string) {
    this.root.remove(id);
  }

  search(box: BoundingBox3D): SpatialItem3D[] {
    return this.root.search(box);
  }

  all(): SpatialItem3D[] {
    const results: SpatialItem3D[] = [];
    return this.root.all(results);
  }
}
