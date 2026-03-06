/**
 * VR Scene Generator
 *
 * Generates synthetic VR scenes adapted from:
 *   - ProcTHOR: Procedural 3D environments (8K examples)
 *   - ScanNet: Real-world 3D scan annotations (2K examples)
 *
 * Each scene includes objects with spatial relationships, rooms,
 * floor plans, and lighting conditions in HoloLand VR format.
 *
 * @module spatial-dataset/SceneGenerator
 */

import type {
  VRScene,
  SceneObject,
  SceneRoom,
  FloorPlan,
  LightingCondition,
  Transform,
  BoundingBox3D,
  Quaternion,
  Vector3,
  SpatialRelationship,
  SpatialRelationType,
  ObjectAttribute,
} from './types';

// =============================================================================
// Seeded RNG
// =============================================================================

class RNG {
  private state: number;
  constructor(seed: number) { this.state = seed; }
  next(): number {
    let x = this.state;
    x ^= x << 13; x ^= x >> 17; x ^= x << 5;
    this.state = x;
    return (x >>> 0) / 0xffffffff;
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(arr: T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
  shuffle<T>(arr: T[]): T[] {
    const r = [...arr];
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }
  nextGaussian(): number {
    return Math.sqrt(-2 * Math.log(this.next() || 0.001)) *
      Math.cos(2 * Math.PI * this.next());
  }
}

// =============================================================================
// Object Templates
// =============================================================================

interface ObjectTemplate {
  category: string;
  types: string[];
  sizeRange: { min: Vector3; max: Vector3 };
  placementRule: 'floor' | 'wall' | 'ceiling' | 'surface' | 'floating';
  interactable: boolean;
  materials: string[];
  commonAttributes: ObjectAttribute[];
}

const OBJECT_TEMPLATES: ObjectTemplate[] = [
  {
    category: 'chair',
    types: ['office_chair', 'dining_chair', 'armchair', 'stool', 'bean_bag'],
    sizeRange: { min: { x: 0.4, y: 0.7, z: 0.4 }, max: { x: 0.7, y: 1.2, z: 0.7 } },
    placementRule: 'floor',
    interactable: true,
    materials: ['wood', 'leather', 'fabric', 'plastic', 'metal'],
    commonAttributes: [{ name: 'sittable', value: true }],
  },
  {
    category: 'table',
    types: ['dining_table', 'desk', 'coffee_table', 'side_table', 'workbench'],
    sizeRange: { min: { x: 0.5, y: 0.4, z: 0.5 }, max: { x: 2.0, y: 1.0, z: 1.2 } },
    placementRule: 'floor',
    interactable: true,
    materials: ['wood', 'glass', 'metal', 'marble'],
    commonAttributes: [{ name: 'has_surface', value: true }],
  },
  {
    category: 'shelf',
    types: ['bookshelf', 'wall_shelf', 'cabinet', 'display_shelf'],
    sizeRange: { min: { x: 0.3, y: 0.5, z: 0.2 }, max: { x: 2.0, y: 2.5, z: 0.5 } },
    placementRule: 'wall',
    interactable: true,
    materials: ['wood', 'metal', 'composite'],
    commonAttributes: [{ name: 'storage', value: true }],
  },
  {
    category: 'light',
    types: ['ceiling_light', 'floor_lamp', 'desk_lamp', 'wall_sconce'],
    sizeRange: { min: { x: 0.1, y: 0.1, z: 0.1 }, max: { x: 0.5, y: 1.8, z: 0.5 } },
    placementRule: 'ceiling',
    interactable: true,
    materials: ['metal', 'glass', 'plastic'],
    commonAttributes: [{ name: 'emits_light', value: true }],
  },
  {
    category: 'decoration',
    types: ['painting', 'vase', 'plant', 'sculpture', 'clock', 'mirror', 'rug'],
    sizeRange: { min: { x: 0.1, y: 0.1, z: 0.05 }, max: { x: 1.0, y: 1.5, z: 1.0 } },
    placementRule: 'surface',
    interactable: false,
    materials: ['ceramic', 'glass', 'fabric', 'metal', 'canvas'],
    commonAttributes: [],
  },
  {
    category: 'appliance',
    types: ['monitor', 'laptop', 'phone', 'speaker', 'projector', 'TV'],
    sizeRange: { min: { x: 0.1, y: 0.1, z: 0.05 }, max: { x: 1.5, y: 1.0, z: 0.3 } },
    placementRule: 'surface',
    interactable: true,
    materials: ['plastic', 'metal', 'glass'],
    commonAttributes: [{ name: 'electronic', value: true }],
  },
  {
    category: 'door',
    types: ['single_door', 'double_door', 'sliding_door'],
    sizeRange: { min: { x: 0.7, y: 2.0, z: 0.05 }, max: { x: 1.8, y: 2.4, z: 0.1 } },
    placementRule: 'wall',
    interactable: true,
    materials: ['wood', 'metal', 'glass'],
    commonAttributes: [{ name: 'portal', value: true }],
  },
  {
    category: 'window',
    types: ['single_window', 'panoramic_window', 'skylight'],
    sizeRange: { min: { x: 0.5, y: 0.5, z: 0.05 }, max: { x: 3.0, y: 2.0, z: 0.1 } },
    placementRule: 'wall',
    interactable: false,
    materials: ['glass', 'plastic'],
    commonAttributes: [{ name: 'transparent', value: true }],
  },
];

// =============================================================================
// Room Templates
// =============================================================================

interface RoomTemplate {
  type: string;
  name: string;
  sizeRange: { min: Vector3; max: Vector3 };
  objectDistribution: Array<{
    category: string;
    min: number;
    max: number;
  }>;
}

const ROOM_TEMPLATES: RoomTemplate[] = [
  {
    type: 'living_room',
    name: 'Living Room',
    sizeRange: { min: { x: 4, y: 2.8, z: 4 }, max: { x: 8, y: 3.5, z: 6 } },
    objectDistribution: [
      { category: 'chair', min: 2, max: 5 },
      { category: 'table', min: 1, max: 3 },
      { category: 'shelf', min: 0, max: 2 },
      { category: 'light', min: 1, max: 3 },
      { category: 'decoration', min: 2, max: 6 },
      { category: 'appliance', min: 1, max: 2 },
    ],
  },
  {
    type: 'office',
    name: 'Office',
    sizeRange: { min: { x: 3, y: 2.8, z: 3 }, max: { x: 6, y: 3.2, z: 5 } },
    objectDistribution: [
      { category: 'chair', min: 1, max: 3 },
      { category: 'table', min: 1, max: 2 },
      { category: 'shelf', min: 1, max: 3 },
      { category: 'light', min: 1, max: 2 },
      { category: 'appliance', min: 2, max: 4 },
    ],
  },
  {
    type: 'bedroom',
    name: 'Bedroom',
    sizeRange: { min: { x: 3, y: 2.8, z: 3 }, max: { x: 5, y: 3.0, z: 5 } },
    objectDistribution: [
      { category: 'table', min: 1, max: 2 },
      { category: 'shelf', min: 0, max: 2 },
      { category: 'light', min: 1, max: 3 },
      { category: 'decoration', min: 1, max: 4 },
    ],
  },
  {
    type: 'kitchen',
    name: 'Kitchen',
    sizeRange: { min: { x: 3, y: 2.8, z: 2.5 }, max: { x: 5, y: 3.0, z: 4 } },
    objectDistribution: [
      { category: 'table', min: 1, max: 1 },
      { category: 'chair', min: 0, max: 4 },
      { category: 'shelf', min: 1, max: 3 },
      { category: 'light', min: 1, max: 2 },
      { category: 'appliance', min: 1, max: 3 },
    ],
  },
  {
    type: 'hallway',
    name: 'Hallway',
    sizeRange: { min: { x: 1.5, y: 2.8, z: 3 }, max: { x: 2.5, y: 3.0, z: 8 } },
    objectDistribution: [
      { category: 'light', min: 1, max: 2 },
      { category: 'decoration', min: 0, max: 3 },
      { category: 'door', min: 2, max: 4 },
    ],
  },
];

// =============================================================================
// Scene Generator
// =============================================================================

export class SceneGenerator {
  private rng: RNG;
  private sceneCounter = 0;

  constructor(seed: number) {
    this.rng = new RNG(seed);
  }

  /**
   * Generate a ProcTHOR-style procedural VR scene.
   */
  generateProcTHORScene(): VRScene {
    const sceneId = `procthor-scene-${++this.sceneCounter}`;

    // Decide room count and layout
    const roomCount = this.rng.nextInt(2, 5);
    const roomTemplates = this.rng.shuffle(ROOM_TEMPLATES).slice(0, roomCount);

    // Generate rooms
    const rooms: SceneRoom[] = [];
    const allObjects: SceneObject[] = [];
    let objectCounter = 0;

    let currentX = 0;
    for (const template of roomTemplates) {
      const roomWidth = this.lerp(template.sizeRange.min.x, template.sizeRange.max.x, this.rng.next());
      const roomHeight = this.lerp(template.sizeRange.min.y, template.sizeRange.max.y, this.rng.next());
      const roomDepth = this.lerp(template.sizeRange.min.z, template.sizeRange.max.z, this.rng.next());

      const roomId = `room-${rooms.length}`;
      const room: SceneRoom = {
        id: roomId,
        name: `${template.name} ${rooms.length + 1}`,
        type: template.type,
        bounds: {
          center: { x: currentX + roomWidth / 2, y: roomHeight / 2, z: roomDepth / 2 },
          extents: { x: roomWidth / 2, y: roomHeight / 2, z: roomDepth / 2 },
          rotation: identityQuat(),
        },
        floorY: 0,
        ceilingY: roomHeight,
        connectedRooms: [],
      };
      rooms.push(room);

      // Generate objects for this room
      for (const dist of template.objectDistribution) {
        const count = this.rng.nextInt(dist.min, dist.max);
        const template_ = OBJECT_TEMPLATES.find((t) => t.category === dist.category);
        if (!template_) continue;

        for (let i = 0; i < count; i++) {
          const obj = this.generateObject(
            `obj-${++objectCounter}`,
            template_,
            roomId,
            room.bounds,
          );
          allObjects.push(obj);
        }
      }

      // Add doors between rooms
      if (rooms.length > 1) {
        rooms[rooms.length - 2].connectedRooms.push(roomId);
        room.connectedRooms.push(rooms[rooms.length - 2].id);

        const doorTemplate = OBJECT_TEMPLATES.find((t) => t.category === 'door')!;
        allObjects.push(
          this.generateObject(
            `obj-${++objectCounter}`,
            doorTemplate,
            roomId,
            {
              center: { x: currentX, y: 1.1, z: roomDepth / 2 },
              extents: { x: 0.5, y: 1.1, z: 0.05 },
              rotation: identityQuat(),
            },
          ),
        );
      }

      // Add windows
      const windowTemplate = OBJECT_TEMPLATES.find((t) => t.category === 'window')!;
      const windowCount = this.rng.nextInt(0, 2);
      for (let w = 0; w < windowCount; w++) {
        allObjects.push(
          this.generateObject(
            `obj-${++objectCounter}`,
            windowTemplate,
            roomId,
            room.bounds,
          ),
        );
      }

      currentX += roomWidth + 0.15; // Wall thickness
    }

    // Compute spatial relationships between all objects
    this.computeSpatialRelationships(allObjects);

    // Generate floor plan
    const totalWidth = currentX;
    const maxDepth = Math.max(...rooms.map((r) => r.bounds.extents.z * 2));
    const floorPlan = this.generateFloorPlan(totalWidth, maxDepth, allObjects);

    const scene: VRScene = {
      id: sceneId,
      name: `ProcTHOR Scene ${this.sceneCounter}`,
      source: 'procthor',
      objects: allObjects,
      rooms,
      floorPlan,
      lighting: this.generateLighting(),
      metadata: {
        roomCount: rooms.length,
        objectCount: allObjects.length,
        generatedAt: new Date().toISOString(),
      },
    };

    return scene;
  }

  /**
   * Generate a ScanNet-style scene from real-world annotations.
   * Simulates mapping real-world 3D scan data to VR coordinates.
   */
  generateScanNetScene(): VRScene {
    const sceneId = `scannet-scene-${++this.sceneCounter}`;

    // ScanNet scenes tend to be single-room or open-plan
    const roomTemplate = this.rng.pick(ROOM_TEMPLATES);
    const roomWidth = this.lerp(roomTemplate.sizeRange.min.x, roomTemplate.sizeRange.max.x, this.rng.next()) * 1.3;
    const roomHeight = this.lerp(roomTemplate.sizeRange.min.y, roomTemplate.sizeRange.max.y, this.rng.next());
    const roomDepth = this.lerp(roomTemplate.sizeRange.min.z, roomTemplate.sizeRange.max.z, this.rng.next()) * 1.3;

    const roomId = 'room-0';
    const room: SceneRoom = {
      id: roomId,
      name: roomTemplate.name,
      type: roomTemplate.type,
      bounds: {
        center: { x: roomWidth / 2, y: roomHeight / 2, z: roomDepth / 2 },
        extents: { x: roomWidth / 2, y: roomHeight / 2, z: roomDepth / 2 },
        rotation: identityQuat(),
      },
      floorY: 0,
      ceilingY: roomHeight,
      connectedRooms: [],
    };

    // ScanNet objects are noisier (simulating real-world scan artifacts)
    const allObjects: SceneObject[] = [];
    let objectCounter = 0;

    for (const dist of roomTemplate.objectDistribution) {
      const count = this.rng.nextInt(dist.min, dist.max);
      const template_ = OBJECT_TEMPLATES.find((t) => t.category === dist.category);
      if (!template_) continue;

      for (let i = 0; i < count; i++) {
        const obj = this.generateObject(
          `obj-${++objectCounter}`,
          template_,
          roomId,
          room.bounds,
        );
        // Add scan noise to positions
        obj.transform.position.x += this.rng.nextGaussian() * 0.05;
        obj.transform.position.z += this.rng.nextGaussian() * 0.05;
        // Add scan annotation metadata
        obj.attributes.push(
          { name: 'scan_confidence', value: 0.7 + this.rng.next() * 0.3 },
          { name: 'point_density', value: this.rng.nextInt(100, 5000) },
        );
        allObjects.push(obj);
      }
    }

    this.computeSpatialRelationships(allObjects);

    const floorPlan = this.generateFloorPlan(roomWidth, roomDepth, allObjects);

    return {
      id: sceneId,
      name: `ScanNet Scene ${this.sceneCounter}`,
      source: 'scannet',
      objects: allObjects,
      rooms: [room],
      floorPlan,
      lighting: this.generateLighting(),
      metadata: {
        roomCount: 1,
        objectCount: allObjects.length,
        scanQuality: 0.7 + this.rng.next() * 0.3,
        pointCloudDensity: this.rng.nextInt(1000, 10000),
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // ===========================================================================
  // Object Generation
  // ===========================================================================

  private generateObject(
    id: string,
    template: ObjectTemplate,
    roomId: string,
    roomBounds: BoundingBox3D,
  ): SceneObject {
    const sizeX = this.lerp(template.sizeRange.min.x, template.sizeRange.max.x, this.rng.next());
    const sizeY = this.lerp(template.sizeRange.min.y, template.sizeRange.max.y, this.rng.next());
    const sizeZ = this.lerp(template.sizeRange.min.z, template.sizeRange.max.z, this.rng.next());

    // Place within room bounds
    const minX = roomBounds.center.x - roomBounds.extents.x + sizeX / 2 + 0.1;
    const maxX = roomBounds.center.x + roomBounds.extents.x - sizeX / 2 - 0.1;
    const minZ = roomBounds.center.z - roomBounds.extents.z + sizeZ / 2 + 0.1;
    const maxZ = roomBounds.center.z + roomBounds.extents.z - sizeZ / 2 - 0.1;

    let posY = sizeY / 2;
    switch (template.placementRule) {
      case 'floor':
        posY = sizeY / 2;
        break;
      case 'wall':
        posY = this.lerp(0.5, roomBounds.extents.y * 2 - sizeY / 2, this.rng.next());
        break;
      case 'ceiling':
        posY = roomBounds.extents.y * 2 - sizeY / 2;
        break;
      case 'surface':
        posY = this.lerp(0.4, 1.2, this.rng.next()) + sizeY / 2;
        break;
      case 'floating':
        posY = this.lerp(1.0, roomBounds.extents.y * 1.5, this.rng.next());
        break;
    }

    const position: Vector3 = {
      x: this.lerp(minX, maxX, this.rng.next()),
      y: posY,
      z: this.lerp(minZ, maxZ, this.rng.next()),
    };

    // Random Y-axis rotation
    const yaw = this.rng.next() * Math.PI * 2;
    const rotation = yawToQuaternion(yaw);

    const transform: Transform = {
      position,
      rotation,
      scale: { x: 1, y: 1, z: 1 },
    };

    const aabb: BoundingBox3D = {
      center: position,
      extents: { x: sizeX / 2, y: sizeY / 2, z: sizeZ / 2 },
      rotation: identityQuat(),
    };

    return {
      id,
      category: template.category,
      type: this.rng.pick(template.types),
      transform,
      aabb,
      roomId,
      material: this.rng.pick(template.materials),
      interactable: template.interactable,
      attributes: [...template.commonAttributes],
      relationships: [],
    };
  }

  // ===========================================================================
  // Spatial Relationship Computation
  // ===========================================================================

  private computeSpatialRelationships(objects: SceneObject[]): void {
    for (let i = 0; i < objects.length; i++) {
      const a = objects[i];
      a.relationships = [];

      for (let j = 0; j < objects.length; j++) {
        if (i === j) continue;
        const b = objects[j];

        const dx = b.transform.position.x - a.transform.position.x;
        const dy = b.transform.position.y - a.transform.position.y;
        const dz = b.transform.position.z - a.transform.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Only compute relationships for nearby objects
        if (dist > 5.0) continue;

        const relations = this.inferRelations(a, b, dx, dy, dz, dist);
        for (const rel of relations) {
          a.relationships.push(rel);
        }
      }
    }
  }

  private inferRelations(
    a: SceneObject,
    b: SceneObject,
    dx: number,
    dy: number,
    dz: number,
    dist: number,
  ): SpatialRelationship[] {
    const relations: SpatialRelationship[] = [];
    const targetId = b.id;

    // Vertical relationships
    if (dy > 0.3 && Math.abs(dx) < 0.5 && Math.abs(dz) < 0.5) {
      relations.push({ type: 'above', targetId, confidence: 0.9 });
      // Check for "on-top-of" (close vertical contact)
      if (dy < a.aabb.extents.y + b.aabb.extents.y + 0.15) {
        relations.push({ type: 'on-top-of', targetId, confidence: 0.85 });
      }
    }
    if (dy < -0.3 && Math.abs(dx) < 0.5 && Math.abs(dz) < 0.5) {
      relations.push({ type: 'below', targetId, confidence: 0.9 });
      if (Math.abs(dy) < a.aabb.extents.y + b.aabb.extents.y + 0.15) {
        relations.push({ type: 'under', targetId, confidence: 0.85 });
      }
    }

    // Horizontal relationships
    if (dist < 2.0) {
      relations.push({
        type: 'near',
        targetId,
        confidence: 1.0 - dist / 2.0,
        data: { distance: dist },
      });

      if (dist < 0.5) {
        relations.push({ type: 'adjacent', targetId, confidence: 0.9 });
      }
    }

    // Directional (relative to scene axes)
    if (Math.abs(dz) > Math.abs(dx) * 1.5) {
      relations.push({
        type: dz > 0 ? 'in-front-of' : 'behind',
        targetId,
        confidence: 0.7,
      });
    }
    if (Math.abs(dx) > Math.abs(dz) * 1.5) {
      relations.push({
        type: dx > 0 ? 'right-of' : 'left-of',
        targetId,
        confidence: 0.7,
      });
    }

    // Containment (b's bbox inside a's bbox)
    if (
      Math.abs(dx) < a.aabb.extents.x &&
      Math.abs(dy) < a.aabb.extents.y &&
      Math.abs(dz) < a.aabb.extents.z
    ) {
      relations.push({ type: 'contains', targetId, confidence: 0.8 });
    }

    return relations;
  }

  // ===========================================================================
  // Floor Plan Generation
  // ===========================================================================

  private generateFloorPlan(
    width: number,
    depth: number,
    objects: SceneObject[],
  ): FloorPlan {
    const resolution = 0.1; // 10cm per cell
    const gridW = Math.ceil(width / resolution);
    const gridH = Math.ceil(depth / resolution);
    const grid: number[][] = [];

    for (let y = 0; y < gridH; y++) {
      grid[y] = new Array(gridW).fill(0);
    }

    // Mark occupied cells
    for (const obj of objects) {
      if (obj.transform.position.y > 1.5) continue; // Skip overhead objects
      const cx = Math.round(obj.transform.position.x / resolution);
      const cz = Math.round(obj.transform.position.z / resolution);
      const ex = Math.ceil(obj.aabb.extents.x / resolution);
      const ez = Math.ceil(obj.aabb.extents.z / resolution);

      for (let dy = -ez; dy <= ez; dy++) {
        for (let dx = -ex; dx <= ex; dx++) {
          const gx = cx + dx;
          const gy = cz + dy;
          if (gx >= 0 && gx < gridW && gy >= 0 && gy < gridH) {
            grid[gy][gx] = 1;
          }
        }
      }
    }

    return {
      width: gridW,
      height: gridH,
      grid,
      resolution,
      origin: { x: 0, y: 0, z: 0 },
    };
  }

  // ===========================================================================
  // Lighting
  // ===========================================================================

  private generateLighting(): LightingCondition {
    const types: LightingCondition['type'][] = ['natural', 'artificial', 'mixed'];
    return {
      type: this.rng.pick(types),
      intensity: 0.5 + this.rng.next() * 0.5,
      direction: normalize({ x: -0.3, y: -1, z: -0.5 }),
      ambientColor: {
        r: 0.8 + this.rng.next() * 0.2,
        g: 0.8 + this.rng.next() * 0.2,
        b: 0.75 + this.rng.next() * 0.25,
      },
    };
  }

  // ===========================================================================
  // Utilities
  // ===========================================================================

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
}

// =============================================================================
// Quaternion Helpers
// =============================================================================

function identityQuat(): Quaternion {
  return { x: 0, y: 0, z: 0, w: 1 };
}

function yawToQuaternion(yaw: number): Quaternion {
  const halfYaw = yaw / 2;
  return {
    x: 0,
    y: Math.sin(halfYaw),
    z: 0,
    w: Math.cos(halfYaw),
  };
}

function normalize(v: Vector3): Vector3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}
