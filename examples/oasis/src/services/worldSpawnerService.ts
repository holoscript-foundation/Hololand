/**
 * World Spawner Service
 * Simplified browser-compatible version for HoloScript parsing
 */

import * as THREE from 'three';

// Simplified R3F node type for browser compatibility
interface R3FNode {
  type: string;
  props?: {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number | [number, number, number];
    color?: string;
    args?: number[];
    material?: string;
    roughness?: number;
    metalness?: number;
    castShadow?: boolean;
    receiveShadow?: boolean;
    name?: string;
    traits?: string[];
  };
  children?: R3FNode[];
}

// Material presets
const MATERIAL_PRESETS: Record<string, { roughness?: number; metalness?: number; transparent?: boolean; opacity?: number }> = {
  default: { roughness: 0.7, metalness: 0 },
  metal: { roughness: 0.2, metalness: 0.9 },
  glass: { roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.5 },
  wood: { roughness: 0.9, metalness: 0 },
  plastic: { roughness: 0.4, metalness: 0.1 },
};

// Entity types supported
export type EntityType =
  | 'box'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'plane'
  | 'torus'
  | 'tree'
  | 'rock'
  | 'fountain'
  | 'bench'
  | 'lamp'
  | 'building'
  | 'custom';

export interface SpawnedEntity {
  id: string;
  type: EntityType;
  name: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  color: string;
  mesh: THREE.Object3D;
  traits: string[];
  r3fNode?: R3FNode;
  metadata: Record<string, any>;
}

export interface ParseResult {
  success: boolean;
  r3fNodes?: R3FNode[];
  errors?: string[];
  warnings?: string[];
}

// Meadow color palette for random entity colors
const MEADOW_COLORS = [
  '#FFF8E7', // cream
  '#5DADE2', // sky
  '#7CB342', // grass
  '#D2691E', // terracotta
  '#FFD54F', // sunlight
  '#E8A87C', // terracotta light
  '#558B2F', // grass dark
];

/**
 * Parse HoloScript code using simplified browser-compatible parser
 */
export function parseHoloScript(code: string): ParseResult {
  try {
    const r3fNodes: R3FNode[] = [];
    const warnings: string[] = [];

    // Simple regex-based parser for basic HoloScript
    const objectRegex = /object\s+"([^"]+)"\s*\{([^}]+)\}/g;
    let match;

    while ((match = objectRegex.exec(code)) !== null) {
      const name = match[1];
      const body = match[2];

      const node: R3FNode = {
        type: 'box',
        props: { name, traits: [] },
      };

      // Parse mesh type
      const meshMatch = body.match(/mesh:\s*"(\w+)"/);
      if (meshMatch) {
        node.type = meshMatch[1];
      }

      // Parse position
      const posMatch = body.match(/position:\s*\[([^\]]+)\]/);
      if (posMatch) {
        const coords = posMatch[1].split(',').map((n) => parseFloat(n.trim()));
        node.props!.position = [coords[0] || 0, coords[1] || 0, coords[2] || 0];
      }

      // Parse rotation
      const rotMatch = body.match(/rotation:\s*\[([^\]]+)\]/);
      if (rotMatch) {
        const coords = rotMatch[1].split(',').map((n) => parseFloat(n.trim()));
        node.props!.rotation = [coords[0] || 0, coords[1] || 0, coords[2] || 0];
      }

      // Parse color
      const colorMatch = body.match(/color:\s*"([^"]+)"/);
      if (colorMatch) {
        node.props!.color = colorMatch[1];
      }

      // Parse radius
      const radiusMatch = body.match(/radius:\s*([\d.]+)/);
      if (radiusMatch) {
        node.props!.args = [parseFloat(radiusMatch[1])];
      }

      // Parse traits
      const traitMatches = body.match(/@(\w+)/g);
      if (traitMatches) {
        node.props!.traits = traitMatches.map((t) => t.substring(1));
      }

      r3fNodes.push(node);
    }

    if (r3fNodes.length === 0 && code.trim().length > 0) {
      warnings.push('No objects found in HoloScript');
    }

    return {
      success: true,
      r3fNodes,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      success: false,
      errors: [(error as Error).message],
    };
  }
}

/**
 * Convert R3F node to Three.js mesh
 */
export function r3fNodeToMesh(node: R3FNode): THREE.Object3D {
  const group = new THREE.Group();
  const color = node.props?.color || MEADOW_COLORS[Math.floor(Math.random() * MEADOW_COLORS.length)];

  // Get geometry based on node type
  let geometry: THREE.BufferGeometry;
  let material: THREE.Material;

  switch (node.type) {
    case 'box':
    case 'Box':
      geometry = new THREE.BoxGeometry(
        node.props?.args?.[0] || 1,
        node.props?.args?.[1] || 1,
        node.props?.args?.[2] || 1
      );
      break;

    case 'sphere':
    case 'Sphere':
      geometry = new THREE.SphereGeometry(
        node.props?.args?.[0] || 0.5,
        node.props?.args?.[1] || 32,
        node.props?.args?.[2] || 32
      );
      break;

    case 'cylinder':
    case 'Cylinder':
      geometry = new THREE.CylinderGeometry(
        node.props?.args?.[0] || 0.5,
        node.props?.args?.[1] || 0.5,
        node.props?.args?.[2] || 1,
        node.props?.args?.[3] || 32
      );
      break;

    case 'cone':
    case 'Cone':
      geometry = new THREE.ConeGeometry(
        node.props?.args?.[0] || 0.5,
        node.props?.args?.[1] || 1,
        node.props?.args?.[2] || 32
      );
      break;

    case 'plane':
    case 'Plane':
      geometry = new THREE.PlaneGeometry(
        node.props?.args?.[0] || 1,
        node.props?.args?.[1] || 1
      );
      break;

    case 'torus':
    case 'Torus':
      geometry = new THREE.TorusGeometry(
        node.props?.args?.[0] || 0.5,
        node.props?.args?.[1] || 0.2,
        node.props?.args?.[2] || 16,
        node.props?.args?.[3] || 100
      );
      break;

    default:
      // Default to box
      geometry = new THREE.BoxGeometry(1, 1, 1);
  }

  // Apply material preset if specified
  const materialPreset = node.props?.material ? MATERIAL_PRESETS[node.props.material] : null;

  if (materialPreset) {
    material = new THREE.MeshStandardMaterial({
      color,
      roughness: materialPreset.roughness ?? 0.7,
      metalness: materialPreset.metalness ?? 0,
      transparent: materialPreset.transparent ?? false,
      opacity: materialPreset.opacity ?? 1,
    });
  } else {
    material = new THREE.MeshStandardMaterial({
      color,
      roughness: node.props?.roughness ?? 0.7,
      metalness: node.props?.metalness ?? 0,
    });
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = node.props?.castShadow ?? true;
  mesh.receiveShadow = node.props?.receiveShadow ?? true;

  group.add(mesh);

  // Apply transforms
  if (node.props?.position) {
    group.position.set(
      node.props.position[0] || 0,
      node.props.position[1] || 0,
      node.props.position[2] || 0
    );
  }

  if (node.props?.rotation) {
    group.rotation.set(
      THREE.MathUtils.degToRad(node.props.rotation[0] || 0),
      THREE.MathUtils.degToRad(node.props.rotation[1] || 0),
      THREE.MathUtils.degToRad(node.props.rotation[2] || 0)
    );
  }

  if (node.props?.scale !== undefined) {
    if (Array.isArray(node.props.scale)) {
      group.scale.set(
        node.props.scale[0] || 1,
        node.props.scale[1] || 1,
        node.props.scale[2] || 1
      );
    } else {
      group.scale.setScalar(node.props.scale);
    }
  }

  // Recursively add children
  if (node.children) {
    node.children.forEach((child: R3FNode) => {
      group.add(r3fNodeToMesh(child));
    });
  }

  return group;
}

/**
 * Create a prefab mesh for quick spawning
 */
export function createPrefabMesh(type: EntityType, color?: string): THREE.Object3D {
  const entityColor = color || MEADOW_COLORS[Math.floor(Math.random() * MEADOW_COLORS.length)];
  const group = new THREE.Group();

  switch (type) {
    case 'box': {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ color: entityColor, roughness: 0.7 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      break;
    }

    case 'sphere': {
      const geometry = new THREE.SphereGeometry(0.5, 32, 32);
      const material = new THREE.MeshStandardMaterial({ color: entityColor, roughness: 0.5 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      group.add(mesh);
      break;
    }

    case 'cylinder': {
      const geometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 32);
      const material = new THREE.MeshStandardMaterial({ color: entityColor, roughness: 0.7 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      group.add(mesh);
      break;
    }

    case 'cone': {
      const geometry = new THREE.ConeGeometry(0.5, 1, 32);
      const material = new THREE.MeshStandardMaterial({ color: entityColor, roughness: 0.7 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      group.add(mesh);
      break;
    }

    case 'tree': {
      // Trunk
      const trunkGeom = new THREE.CylinderGeometry(0.15, 0.2, 2, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ color: '#8B4513', roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeom, trunkMat);
      trunk.position.y = 1;
      trunk.castShadow = true;
      group.add(trunk);

      // Foliage
      const foliageGeom = new THREE.SphereGeometry(1.2, 16, 16);
      const foliageMat = new THREE.MeshStandardMaterial({ color: '#558B2F', roughness: 0.85 });
      const foliage = new THREE.Mesh(foliageGeom, foliageMat);
      foliage.position.y = 2.5;
      foliage.castShadow = true;
      group.add(foliage);
      break;
    }

    case 'rock': {
      const geometry = new THREE.DodecahedronGeometry(0.5, 0);
      const material = new THREE.MeshStandardMaterial({ color: '#888888', roughness: 0.95 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.set(Math.random(), Math.random(), Math.random());
      mesh.castShadow = true;
      group.add(mesh);
      break;
    }

    case 'fountain': {
      // Base
      const baseGeom = new THREE.CylinderGeometry(1.5, 1.8, 0.4, 32);
      const baseMat = new THREE.MeshStandardMaterial({ color: '#C9B8A0', roughness: 0.7 });
      const base = new THREE.Mesh(baseGeom, baseMat);
      base.position.y = 0.2;
      base.castShadow = true;
      group.add(base);

      // Water
      const waterGeom = new THREE.CylinderGeometry(1.2, 1.2, 0.2, 32);
      const waterMat = new THREE.MeshStandardMaterial({
        color: '#5DADE2',
        roughness: 0.2,
        metalness: 0.3,
        transparent: true,
        opacity: 0.8,
      });
      const water = new THREE.Mesh(waterGeom, waterMat);
      water.position.y = 0.3;
      group.add(water);

      // Center pillar
      const pillarGeom = new THREE.CylinderGeometry(0.15, 0.2, 1.5, 16);
      const pillar = new THREE.Mesh(pillarGeom, baseMat);
      pillar.position.y = 1;
      pillar.castShadow = true;
      group.add(pillar);
      break;
    }

    case 'bench': {
      const woodMat = new THREE.MeshStandardMaterial({ color: '#8B4513', roughness: 0.9 });

      // Seat
      const seatGeom = new THREE.BoxGeometry(2, 0.1, 0.5);
      const seat = new THREE.Mesh(seatGeom, woodMat);
      seat.position.y = 0.5;
      seat.castShadow = true;
      group.add(seat);

      // Legs
      const legGeom = new THREE.BoxGeometry(0.1, 0.5, 0.4);
      const leg1 = new THREE.Mesh(legGeom, woodMat);
      leg1.position.set(-0.8, 0.25, 0);
      leg1.castShadow = true;
      group.add(leg1);

      const leg2 = new THREE.Mesh(legGeom, woodMat);
      leg2.position.set(0.8, 0.25, 0);
      leg2.castShadow = true;
      group.add(leg2);
      break;
    }

    case 'lamp': {
      const poleMat = new THREE.MeshStandardMaterial({ color: '#333333', roughness: 0.3, metalness: 0.8 });

      // Pole
      const poleGeom = new THREE.CylinderGeometry(0.05, 0.08, 3, 8);
      const pole = new THREE.Mesh(poleGeom, poleMat);
      pole.position.y = 1.5;
      pole.castShadow = true;
      group.add(pole);

      // Lamp head
      const lampGeom = new THREE.SphereGeometry(0.2, 16, 16);
      const lampMat = new THREE.MeshStandardMaterial({
        color: '#FFD54F',
        emissive: '#FFD54F',
        emissiveIntensity: 0.5,
      });
      const lamp = new THREE.Mesh(lampGeom, lampMat);
      lamp.position.y = 3.2;
      group.add(lamp);

      // Point light
      const light = new THREE.PointLight('#FFD54F', 1, 10);
      light.position.y = 3.2;
      light.castShadow = true;
      group.add(light);
      break;
    }

    case 'building': {
      // Main building
      const buildingGeom = new THREE.BoxGeometry(4, 3, 4);
      const buildingMat = new THREE.MeshStandardMaterial({ color: entityColor || '#FFF8E7', roughness: 0.8 });
      const building = new THREE.Mesh(buildingGeom, buildingMat);
      building.position.y = 1.5;
      building.castShadow = true;
      building.receiveShadow = true;
      group.add(building);

      // Roof
      const roofGeom = new THREE.ConeGeometry(3.2, 1.5, 4);
      const roofMat = new THREE.MeshStandardMaterial({ color: '#D2691E', roughness: 0.9 });
      const roof = new THREE.Mesh(roofGeom, roofMat);
      roof.position.y = 3.75;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      group.add(roof);

      // Door
      const doorGeom = new THREE.PlaneGeometry(0.8, 1.5);
      const doorMat = new THREE.MeshStandardMaterial({ color: '#654321', roughness: 0.9 });
      const door = new THREE.Mesh(doorGeom, doorMat);
      door.position.set(0, 0.75, 2.01);
      group.add(door);
      break;
    }

    default: {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ color: entityColor, roughness: 0.7 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      group.add(mesh);
    }
  }

  return group;
}

/**
 * World Spawner class for managing spawned entities
 */
class WorldSpawner {
  private entities: Map<string, SpawnedEntity> = new Map();
  private scene: THREE.Scene | null = null;
  private runtime: any = null;
  private idCounter = 0;

  /**
   * Set the scene to spawn into
   */
  setScene(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Spawn entities from HoloScript code using official parser
   */
  spawnFromHoloScript(code: string): SpawnedEntity[] {
    const parseResult = parseHoloScript(code);

    if (!parseResult.success || !parseResult.r3fNodes) {
      console.error('[Spawner] Parse errors:', parseResult.errors);
      return [];
    }

    const spawned: SpawnedEntity[] = [];

    for (const r3fNode of parseResult.r3fNodes) {
      const entity = this.spawnFromR3FNode(r3fNode);
      if (entity) {
        spawned.push(entity);
      }
    }

    return spawned;
  }

  /**
   * Spawn a single entity from R3F node
   */
  spawnFromR3FNode(r3fNode: R3FNode): SpawnedEntity | null {
    if (!this.scene) {
      console.error('[Spawner] No scene set');
      return null;
    }

    const mesh = r3fNodeToMesh(r3fNode);
    const id = `entity_${++this.idCounter}`;
    mesh.name = id;

    const entity: SpawnedEntity = {
      id,
      type: (r3fNode.type?.toLowerCase() || 'custom') as EntityType,
      name: r3fNode.props?.name || r3fNode.type || 'entity',
      position: mesh.position.clone(),
      rotation: mesh.rotation.clone(),
      scale: mesh.scale.clone(),
      color: r3fNode.props?.color || '#FFFFFF',
      mesh,
      traits: r3fNode.props?.traits || [],
      r3fNode,
      metadata: r3fNode.props || {},
    };

    this.scene.add(mesh);
    this.entities.set(id, entity);

    console.log(`[Spawner] Spawned ${entity.type} "${entity.name}" at`, mesh.position.toArray());

    return entity;
  }

  /**
   * Spawn a simple prefab entity
   */
  spawnSimple(type: EntityType, position: THREE.Vector3, color?: string): SpawnedEntity | null {
    if (!this.scene) {
      console.error('[Spawner] No scene set');
      return null;
    }

    const mesh = createPrefabMesh(type, color);
    mesh.position.copy(position);

    const id = `entity_${++this.idCounter}`;
    mesh.name = id;

    const entity: SpawnedEntity = {
      id,
      type,
      name: type,
      position: mesh.position.clone(),
      rotation: mesh.rotation.clone(),
      scale: mesh.scale.clone(),
      color: color || '#FFFFFF',
      mesh,
      traits: [],
      metadata: {},
    };

    this.scene.add(mesh);
    this.entities.set(id, entity);

    console.log(`[Spawner] Spawned prefab ${type} at`, position.toArray());

    return entity;
  }

  /**
   * Delete an entity by ID
   */
  delete(id: string): boolean {
    const entity = this.entities.get(id);
    if (!entity || !this.scene) return false;

    this.scene.remove(entity.mesh);

    // Dispose geometry and materials
    entity.mesh.traverse((child) => {
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
      if ((child as THREE.Mesh).material) {
        const material = (child as THREE.Mesh).material;
        if (Array.isArray(material)) {
          material.forEach((m) => m.dispose());
        } else {
          material.dispose();
        }
      }
    });

    this.entities.delete(id);
    return true;
  }

  /**
   * Clear all entities
   */
  clear() {
    this.entities.forEach((entity) => {
      if (this.scene) {
        this.scene.remove(entity.mesh);
      }
    });
    this.entities.clear();
  }

  /**
   * Get all spawned entities
   */
  getAll(): SpawnedEntity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Get entity by ID
   */
  get(id: string): SpawnedEntity | undefined {
    return this.entities.get(id);
  }

  /**
   * Move entity
   */
  move(id: string, position: THREE.Vector3): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;

    entity.mesh.position.copy(position);
    entity.position.copy(position);
    return true;
  }

  /**
   * Scale entity
   */
  scale(id: string, scale: number | THREE.Vector3): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;

    if (typeof scale === 'number') {
      entity.mesh.scale.setScalar(scale);
      entity.scale.setScalar(scale);
    } else {
      entity.mesh.scale.copy(scale);
      entity.scale.copy(scale);
    }
    return true;
  }

  /**
   * Rotate entity
   */
  rotate(id: string, rotation: THREE.Euler): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;

    entity.mesh.rotation.copy(rotation);
    entity.rotation.copy(rotation);
    return true;
  }

  /**
   * Export all entities as HoloScript
   */
  exportAsHoloScript(): string {
    const lines: string[] = ['world VRBuilderScene {'];

    this.entities.forEach((entity) => {
      const pos = entity.position;
      const rot = entity.rotation;
      const scale = entity.scale;

      lines.push(`  entity ${entity.name}_${entity.id.split('_')[1]} {`);
      lines.push(`    type: "${entity.type}"`);
      lines.push(`    position: [${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}]`);

      if (rot.x !== 0 || rot.y !== 0 || rot.z !== 0) {
        lines.push(`    rotation: [${THREE.MathUtils.radToDeg(rot.x).toFixed(0)}, ${THREE.MathUtils.radToDeg(rot.y).toFixed(0)}, ${THREE.MathUtils.radToDeg(rot.z).toFixed(0)}]`);
      }

      if (scale.x !== 1 || scale.y !== 1 || scale.z !== 1) {
        if (scale.x === scale.y && scale.y === scale.z) {
          lines.push(`    scale: ${scale.x.toFixed(2)}`);
        } else {
          lines.push(`    scale: [${scale.x.toFixed(2)}, ${scale.y.toFixed(2)}, ${scale.z.toFixed(2)}]`);
        }
      }

      if (entity.color && entity.color !== '#FFFFFF') {
        lines.push(`    color: "${entity.color}"`);
      }

      entity.traits.forEach((trait) => {
        lines.push(`    @${trait}`);
      });

      lines.push('  }');
      lines.push('');
    });

    lines.push('}');
    return lines.join('\n');
  }
}

// Singleton instance
let spawnerInstance: WorldSpawner | null = null;

export function getWorldSpawner(): WorldSpawner {
  if (!spawnerInstance) {
    spawnerInstance = new WorldSpawner();
  }
  return spawnerInstance;
}

export { WorldSpawner };
