/**
 * DragonMeshBatcher
 *
 * Mesh batching strategy for complex organic creatures like the Inferno Wyrm.
 * Reduces 163 individual meshes to 10-20 batched draw calls through:
 *
 * 1. Static batching: Merge non-animated meshes sharing material+geometry
 * 2. Instanced rendering: Identical geometry (teeth, claws, spines, scales)
 * 3. Dynamic batching: Group animated meshes by skeleton/animation group
 * 4. Volumetric replacement: Replace fire mesh clusters with single shader pass
 *
 * PERFORMANCE TARGET:
 * - Input: 163 meshes = 163 draw calls
 * - Output: 10-20 batched draw calls
 * - Budget: < 0.5ms CPU overhead for batch management
 *
 * @module DragonMeshBatcher
 */

import * as THREE from 'three';
import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Batch group category
 */
export type BatchGroupType =
  | 'static-merge'     // Merge into single geometry
  | 'instanced'        // Use InstancedMesh
  | 'dynamic-group'    // Group animated meshes
  | 'volumetric-fire'  // Replace with volumetric shader
  | 'gpu-particle'     // Replace with GPU particle system
  | 'billboard'        // Convert to billboard sprites
  | 'unbatched';       // Cannot batch (unique animated mesh)

/**
 * Creature body region for semantic grouping
 */
export type CreatureBodyRegion =
  | 'torso'
  | 'neck'
  | 'head'
  | 'jaw'
  | 'wing-left'
  | 'wing-right'
  | 'leg-front-left'
  | 'leg-front-right'
  | 'leg-back-left'
  | 'leg-back-right'
  | 'tail'
  | 'spines'
  | 'fire'
  | 'embers'
  | 'smoke'
  | 'platform'
  | 'lighting';

/**
 * Individual mesh entry for batching analysis
 */
export interface BatchMeshEntry {
  /** Mesh ID from HoloScript */
  id: string;
  /** Three.js mesh reference (null during analysis phase) */
  mesh: THREE.Mesh | null;
  /** Geometry type */
  geometryType: string;
  /** Material type/key */
  materialKey: string;
  /** Body region */
  region: CreatureBodyRegion;
  /** Whether this mesh is animated */
  animated: boolean;
  /** Whether this mesh is transparent */
  transparent: boolean;
  /** Estimated vertex count */
  vertexCount: number;
  /** Whether emissive */
  emissive: boolean;
}

/**
 * Batch group - a set of meshes that will be drawn in a single call
 */
export interface BatchGroup {
  /** Group ID */
  id: string;
  /** Batch type */
  type: BatchGroupType;
  /** Body region */
  region: CreatureBodyRegion;
  /** Mesh entries in this batch */
  entries: BatchMeshEntry[];
  /** Resulting Three.js object (after batching) */
  batchedObject: THREE.Object3D | null;
  /** Number of draw calls this group generates */
  drawCalls: number;
  /** Total vertex count */
  totalVertices: number;
  /** Human-readable description */
  description: string;
}

/**
 * Batching plan result
 */
export interface BatchingPlan {
  /** All batch groups */
  groups: BatchGroup[];
  /** Total input meshes */
  inputMeshes: number;
  /** Total output draw calls */
  outputDrawCalls: number;
  /** Draw call reduction percentage */
  reductionPercent: number;
  /** Estimated CPU overhead for batch management (ms) */
  estimatedOverheadMs: number;
  /** Batch groups by type */
  groupsByType: Record<BatchGroupType, number>;
  /** Batch groups by region */
  groupsByRegion: Record<CreatureBodyRegion, number>;
}

/**
 * Batching configuration
 */
export interface BatchingConfig {
  /** Maximum vertices per static batch (65536 for 16-bit indices) */
  maxBatchVertices: number;
  /** Minimum instances for instanced rendering */
  minInstanceCount: number;
  /** Enable volumetric fire replacement */
  enableVolumetricFireReplacement: boolean;
  /** Enable GPU particle replacement for embers */
  enableGPUParticles: boolean;
  /** Enable billboard replacement for smoke/embers */
  enableBillboards: boolean;
  /** Minimum transparency batch size */
  minTransparencyBatch: number;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_BATCHING_CONFIG: BatchingConfig = {
  maxBatchVertices: 65536,
  minInstanceCount: 3,
  enableVolumetricFireReplacement: true,
  enableGPUParticles: true,
  enableBillboards: true,
  minTransparencyBatch: 2,
};

// =============================================================================
// VERTEX ESTIMATES
// =============================================================================

const GEOMETRY_VERTICES: Record<string, number> = {
  sphere: 482,
  cube: 24,
  cylinder: 128,
  cone: 68,
  torus: 512,
  hull: 1024,
  spline: 640,
  membrane: 882,
};

// =============================================================================
// MESH BATCHER
// =============================================================================

/**
 * DragonMeshBatcher creates an optimized batching plan for complex creature
 * compositions. Call `createBatchingPlan()` with mesh entries to get a plan,
 * then `executeBatchingPlan()` to create the actual Three.js batch objects.
 *
 * @example
 * ```typescript
 * const batcher = new DragonMeshBatcher();
 * const entries = batcher.analyzeDragonComposition(compositionNodes);
 * const plan = batcher.createBatchingPlan(entries);
 *
 * console.log(`${plan.inputMeshes} meshes -> ${plan.outputDrawCalls} draw calls`);
 * console.log(`${plan.reductionPercent.toFixed(0)}% reduction`);
 *
 * // Execute the plan to create batched Three.js objects
 * const batchedScene = batcher.executeBatchingPlan(plan);
 * scene.add(batchedScene);
 * ```
 */
export class DragonMeshBatcher {
  private config: BatchingConfig;

  constructor(config?: Partial<BatchingConfig>) {
    this.config = { ...DEFAULT_BATCHING_CONFIG, ...config };
  }

  /**
   * Create a batching plan from mesh entries.
   */
  createBatchingPlan(entries: BatchMeshEntry[]): BatchingPlan {
    const groups: BatchGroup[] = [];
    const processed = new Set<string>();

    // Phase 1: Volumetric fire replacement
    if (this.config.enableVolumetricFireReplacement) {
      const fireGroup = this.groupFireMeshes(entries, processed);
      if (fireGroup) groups.push(fireGroup);
    }

    // Phase 2: GPU particle replacement for embers
    if (this.config.enableGPUParticles) {
      const emberGroup = this.groupEmberMeshes(entries, processed);
      if (emberGroup) groups.push(emberGroup);
    }

    // Phase 3: Billboard replacement for smoke
    if (this.config.enableBillboards) {
      const smokeGroup = this.groupSmokeMeshes(entries, processed);
      if (smokeGroup) groups.push(smokeGroup);
    }

    // Phase 4: Instance groups (teeth, claws, spines, scales)
    const instanceGroups = this.findInstanceGroups(entries, processed);
    groups.push(...instanceGroups);

    // Phase 5: Static merge groups (non-animated, same material)
    const staticGroups = this.findStaticMergeGroups(entries, processed);
    groups.push(...staticGroups);

    // Phase 6: Dynamic groups (animated meshes sharing animation data)
    const dynamicGroups = this.findDynamicGroups(entries, processed);
    groups.push(...dynamicGroups);

    // Phase 7: Remaining unbatched meshes
    const remaining = entries.filter(e => !processed.has(e.id));
    for (const entry of remaining) {
      groups.push({
        id: `unbatched_${entry.id}`,
        type: 'unbatched',
        region: entry.region,
        entries: [entry],
        batchedObject: null,
        drawCalls: 1,
        totalVertices: entry.vertexCount,
        description: `Unbatched: ${entry.id} (${entry.geometryType}, animated=${entry.animated})`,
      });
      processed.add(entry.id);
    }

    // Calculate summary
    const inputMeshes = entries.length;
    const outputDrawCalls = groups.reduce((sum, g) => sum + g.drawCalls, 0);
    const reductionPercent = inputMeshes > 0
      ? ((inputMeshes - outputDrawCalls) / inputMeshes) * 100
      : 0;

    // Count by type
    const groupsByType: Record<BatchGroupType, number> = {
      'static-merge': 0,
      'instanced': 0,
      'dynamic-group': 0,
      'volumetric-fire': 0,
      'gpu-particle': 0,
      'billboard': 0,
      'unbatched': 0,
    };
    for (const g of groups) {
      groupsByType[g.type]++;
    }

    // Count by region
    const groupsByRegion: Record<CreatureBodyRegion, number> = {
      torso: 0, neck: 0, head: 0, jaw: 0,
      'wing-left': 0, 'wing-right': 0,
      'leg-front-left': 0, 'leg-front-right': 0,
      'leg-back-left': 0, 'leg-back-right': 0,
      tail: 0, spines: 0, fire: 0, embers: 0,
      smoke: 0, platform: 0, lighting: 0,
    };
    for (const g of groups) {
      groupsByRegion[g.region]++;
    }

    // Estimate CPU overhead: ~0.01ms per batch group management
    const estimatedOverheadMs = groups.length * 0.01;

    const plan: BatchingPlan = {
      groups,
      inputMeshes,
      outputDrawCalls,
      reductionPercent,
      estimatedOverheadMs,
      groupsByType,
      groupsByRegion,
    };

    logger.info('[DragonMeshBatcher] Batching plan created', {
      inputMeshes,
      outputDrawCalls,
      reductionPercent: reductionPercent.toFixed(1) + '%',
      groupCount: groups.length,
      groupsByType,
    });

    return plan;
  }

  /**
   * Execute the batching plan to create Three.js batch objects.
   * Returns a parent group containing all batched objects.
   */
  executeBatchingPlan(plan: BatchingPlan): THREE.Group {
    const root = new THREE.Group();
    root.name = 'DragonBatchRoot';

    for (const group of plan.groups) {
      switch (group.type) {
        case 'static-merge':
          group.batchedObject = this.createStaticBatch(group);
          break;
        case 'instanced':
          group.batchedObject = this.createInstancedBatch(group);
          break;
        case 'dynamic-group':
          group.batchedObject = this.createDynamicGroup(group);
          break;
        case 'volumetric-fire':
          group.batchedObject = this.createVolumetricFirePlaceholder(group);
          break;
        case 'gpu-particle':
          group.batchedObject = this.createGPUParticlePlaceholder(group);
          break;
        case 'billboard':
          group.batchedObject = this.createBillboardGroup(group);
          break;
        case 'unbatched':
          group.batchedObject = group.entries[0]?.mesh || new THREE.Group();
          break;
      }

      if (group.batchedObject) {
        group.batchedObject.name = group.id;
        root.add(group.batchedObject);
      }
    }

    logger.info('[DragonMeshBatcher] Batching plan executed', {
      childCount: root.children.length,
    });

    return root;
  }

  // ===========================================================================
  // PHASE 1: VOLUMETRIC FIRE
  // ===========================================================================

  private groupFireMeshes(
    entries: BatchMeshEntry[],
    processed: Set<string>
  ): BatchGroup | null {
    const fireEntries = entries.filter(
      e => !processed.has(e.id) && e.region === 'fire'
    );

    if (fireEntries.length < 3) return null;

    for (const e of fireEntries) processed.add(e.id);

    return {
      id: 'volumetric_fire_breath',
      type: 'volumetric-fire',
      region: 'fire',
      entries: fireEntries,
      batchedObject: null,
      drawCalls: 1, // Single fullscreen volumetric pass
      totalVertices: 6, // Fullscreen quad
      description: `Replace ${fireEntries.length} fire meshes with VolumetricFireRenderer (1 draw call)`,
    };
  }

  // ===========================================================================
  // PHASE 2: GPU PARTICLES
  // ===========================================================================

  private groupEmberMeshes(
    entries: BatchMeshEntry[],
    processed: Set<string>
  ): BatchGroup | null {
    const emberEntries = entries.filter(
      e => !processed.has(e.id) && e.region === 'embers'
    );

    if (emberEntries.length < 2) return null;

    for (const e of emberEntries) processed.add(e.id);

    return {
      id: 'gpu_particle_embers',
      type: 'gpu-particle',
      region: 'embers',
      entries: emberEntries,
      batchedObject: null,
      drawCalls: 1, // Single GPU particle draw
      totalVertices: emberEntries.length * 4, // 4 verts per billboard particle
      description: `Replace ${emberEntries.length} ember spheres with GPU particle system (1 draw call)`,
    };
  }

  // ===========================================================================
  // PHASE 3: BILLBOARDS
  // ===========================================================================

  private groupSmokeMeshes(
    entries: BatchMeshEntry[],
    processed: Set<string>
  ): BatchGroup | null {
    const smokeEntries = entries.filter(
      e => !processed.has(e.id) && e.region === 'smoke'
    );

    if (smokeEntries.length < 2) return null;

    for (const e of smokeEntries) processed.add(e.id);

    return {
      id: 'billboard_smoke',
      type: 'billboard',
      region: 'smoke',
      entries: smokeEntries,
      batchedObject: null,
      drawCalls: 1, // Single instanced billboard draw
      totalVertices: smokeEntries.length * 4,
      description: `Replace ${smokeEntries.length} smoke spheres with billboard sprites (1 draw call)`,
    };
  }

  // ===========================================================================
  // PHASE 4: INSTANCED RENDERING
  // ===========================================================================

  private findInstanceGroups(
    entries: BatchMeshEntry[],
    processed: Set<string>
  ): BatchGroup[] {
    const groups: BatchGroup[] = [];

    // Group by geometry + material key (non-animated, non-transparent)
    const candidates = entries.filter(
      e => !processed.has(e.id) && !e.animated && !e.transparent
    );

    const instanceMap = new Map<string, BatchMeshEntry[]>();
    for (const e of candidates) {
      const key = `${e.geometryType}|${e.materialKey}`;
      if (!instanceMap.has(key)) instanceMap.set(key, []);
      instanceMap.get(key)!.push(e);
    }

    for (const [key, meshEntries] of instanceMap) {
      if (meshEntries.length >= this.config.minInstanceCount) {
        for (const e of meshEntries) processed.add(e.id);

        const [geoType, matKey] = key.split('|');
        const region = meshEntries[0].region;
        const totalVertices = meshEntries[0].vertexCount; // Shared geometry

        groups.push({
          id: `instanced_${geoType}_${matKey}`,
          type: 'instanced',
          region,
          entries: meshEntries,
          batchedObject: null,
          drawCalls: 1, // Single instanced draw call
          totalVertices,
          description: `InstancedMesh: ${meshEntries.length}x ${geoType} (${matKey}) = 1 draw call`,
        });
      }
    }

    return groups;
  }

  // ===========================================================================
  // PHASE 5: STATIC MERGE
  // ===========================================================================

  private findStaticMergeGroups(
    entries: BatchMeshEntry[],
    processed: Set<string>
  ): BatchGroup[] {
    const groups: BatchGroup[] = [];

    // Group non-animated, non-transparent meshes by material key
    const candidates = entries.filter(
      e => !processed.has(e.id) && !e.animated && !e.transparent
    );

    const mergeMap = new Map<string, BatchMeshEntry[]>();
    for (const e of candidates) {
      const key = e.materialKey;
      if (!mergeMap.has(key)) mergeMap.set(key, []);
      mergeMap.get(key)!.push(e);
    }

    for (const [matKey, meshEntries] of mergeMap) {
      if (meshEntries.length >= 2) {
        // Check vertex limit
        const totalVertices = meshEntries.reduce((sum, e) => sum + e.vertexCount, 0);

        // Split into batches if exceeding vertex limit
        const batchCount = Math.max(1, Math.ceil(totalVertices / this.config.maxBatchVertices));

        for (const e of meshEntries) processed.add(e.id);

        const region = meshEntries[0].region;

        groups.push({
          id: `static_merge_${matKey}`,
          type: 'static-merge',
          region,
          entries: meshEntries,
          batchedObject: null,
          drawCalls: batchCount,
          totalVertices,
          description: `Static merge: ${meshEntries.length} meshes (${matKey}) -> ${batchCount} draw call(s)`,
        });
      }
    }

    return groups;
  }

  // ===========================================================================
  // PHASE 6: DYNAMIC GROUPS
  // ===========================================================================

  private findDynamicGroups(
    entries: BatchMeshEntry[],
    processed: Set<string>
  ): BatchGroup[] {
    const groups: BatchGroup[] = [];

    // Group animated meshes by region
    const animated = entries.filter(
      e => !processed.has(e.id) && e.animated
    );

    const regionMap = new Map<CreatureBodyRegion, BatchMeshEntry[]>();
    for (const e of animated) {
      if (!regionMap.has(e.region)) regionMap.set(e.region, []);
      regionMap.get(e.region)!.push(e);
    }

    for (const [region, meshEntries] of regionMap) {
      if (meshEntries.length >= 2) {
        for (const e of meshEntries) processed.add(e.id);
        const totalVertices = meshEntries.reduce((sum, e) => sum + e.vertexCount, 0);

        groups.push({
          id: `dynamic_${region}`,
          type: 'dynamic-group',
          region,
          entries: meshEntries,
          batchedObject: null,
          drawCalls: meshEntries.length, // Each animated mesh = separate draw call
          totalVertices,
          description: `Dynamic group: ${meshEntries.length} animated meshes in ${region}`,
        });
      }
    }

    return groups;
  }

  // ===========================================================================
  // BATCH OBJECT CREATION
  // ===========================================================================

  private createStaticBatch(group: BatchGroup): THREE.Group {
    const batchGroup = new THREE.Group();
    batchGroup.name = group.id;

    // In production: use BufferGeometryUtils.mergeBufferGeometries()
    // For now, create placeholder
    for (const entry of group.entries) {
      if (entry.mesh) {
        batchGroup.add(entry.mesh.clone());
      }
    }

    batchGroup.userData.batchType = 'static-merge';
    batchGroup.userData.meshCount = group.entries.length;

    return batchGroup;
  }

  private createInstancedBatch(group: BatchGroup): THREE.Group {
    const instanceGroup = new THREE.Group();
    instanceGroup.name = group.id;

    if (group.entries.length > 0 && group.entries[0].mesh) {
      const templateMesh = group.entries[0].mesh;
      const geometry = templateMesh.geometry;
      const material = templateMesh.material;

      const instancedMesh = new THREE.InstancedMesh(
        geometry,
        material as THREE.Material,
        group.entries.length
      );
      instancedMesh.name = `${group.id}_instances`;

      // Set instance transforms
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < group.entries.length; i++) {
        const entry = group.entries[i];
        if (entry.mesh) {
          entry.mesh.updateMatrixWorld();
          matrix.copy(entry.mesh.matrixWorld);
          instancedMesh.setMatrixAt(i, matrix);
        }
      }
      instancedMesh.instanceMatrix.needsUpdate = true;

      instanceGroup.add(instancedMesh);
    }

    instanceGroup.userData.batchType = 'instanced';
    instanceGroup.userData.instanceCount = group.entries.length;

    return instanceGroup;
  }

  private createDynamicGroup(group: BatchGroup): THREE.Group {
    const dynamicGroup = new THREE.Group();
    dynamicGroup.name = group.id;

    // Dynamic meshes keep individual draw calls but are grouped for LOD management
    for (const entry of group.entries) {
      if (entry.mesh) {
        dynamicGroup.add(entry.mesh);
      }
    }

    dynamicGroup.userData.batchType = 'dynamic-group';
    dynamicGroup.userData.meshCount = group.entries.length;

    return dynamicGroup;
  }

  private createVolumetricFirePlaceholder(group: BatchGroup): THREE.Group {
    const fireGroup = new THREE.Group();
    fireGroup.name = 'volumetric_fire_placeholder';

    // Compute the centroid and bounding box from replaced fire meshes.
    // This data is used by VolumetricFireRenderer.setFireOrigin() to
    // position the compute shader density field in world space.
    let centerX = 0, centerY = 0, centerZ = 0;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const entry of group.entries) {
      if (entry.mesh) {
        const pos = entry.mesh.position;
        centerX += pos.x;
        centerY += pos.y;
        centerZ += pos.z;
        minX = Math.min(minX, pos.x - 1);
        minY = Math.min(minY, pos.y - 1);
        minZ = Math.min(minZ, pos.z - 1);
        maxX = Math.max(maxX, pos.x + 1);
        maxY = Math.max(maxY, pos.y + 1);
        maxZ = Math.max(maxZ, pos.z + 1);
      }
    }

    const n = Math.max(group.entries.length, 1);
    centerX /= n;
    centerY /= n;
    centerZ /= n;

    // Fallback to hardcoded dragon fire origin if no mesh data
    if (!isFinite(centerX)) {
      centerX = 0; centerY = 4.35; centerZ = 6.0;
      minX = -1; minY = 2.35; minZ = 4.0;
      maxX = 1; maxY = 6.35; maxZ = 8.0;
    }

    // Bounding volume visualization (wireframe, debug only)
    const boundingGeometry = new THREE.SphereGeometry(2, 8, 8);
    const boundingMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    });
    const boundingSphere = new THREE.Mesh(boundingGeometry, boundingMaterial);
    boundingSphere.name = 'fire_bounding_volume';
    boundingSphere.position.set(centerX, centerY, centerZ);

    fireGroup.add(boundingSphere);

    // Store metadata for VolumetricFireRenderer integration
    fireGroup.userData.batchType = 'volumetric-fire';
    fireGroup.userData.replacedMeshes = group.entries.length;
    fireGroup.userData.requiresVolumetricFireRenderer = true;

    // Fire origin and volume bounds for the compute shader
    fireGroup.userData.fireOrigin = { x: centerX, y: centerY, z: centerZ };
    fireGroup.userData.volumeMin = { x: minX, y: minY, z: minZ };
    fireGroup.userData.volumeMax = { x: maxX, y: maxY, z: maxZ };

    // Recommended quality step (based on replaced mesh count):
    // 9 fire meshes in fire-dragon.holo -> quest3 preset (24 steps)
    fireGroup.userData.recommendedQualityPreset =
      group.entries.length >= 9 ? 'quest3' : 'quest2';

    return fireGroup;
  }

  private createGPUParticlePlaceholder(group: BatchGroup): THREE.Group {
    const particleGroup = new THREE.Group();
    particleGroup.name = 'gpu_particle_embers';

    // Placeholder for GPU particle system
    particleGroup.userData.batchType = 'gpu-particle';
    particleGroup.userData.particleCount = group.entries.length;
    particleGroup.userData.requiresGPUParticleSystem = true;

    return particleGroup;
  }

  private createBillboardGroup(group: BatchGroup): THREE.Group {
    const billboardGroup = new THREE.Group();
    billboardGroup.name = 'billboard_smoke';

    billboardGroup.userData.batchType = 'billboard';
    billboardGroup.userData.billboardCount = group.entries.length;

    return billboardGroup;
  }

  // ===========================================================================
  // CONVENIENCE: DRAGON COMPOSITION ANALYSIS
  // ===========================================================================

  /**
   * Classify a mesh ID into a body region based on naming conventions.
   */
  classifyRegion(meshId: string): CreatureBodyRegion {
    const id = meshId.toLowerCase();

    if (id.includes('fire') || id.includes('flame') || id.includes('tendril') || id.includes('heathaze') || id.includes('haze')) return 'fire';
    if (id.includes('ember')) return 'embers';
    if (id.includes('smoke')) return 'smoke';
    if (id.includes('platform') || id.includes('rim')) return 'platform';
    if (id.includes('light') || id.includes('ambient')) return 'lighting';
    if (id.includes('tail')) return 'tail';
    if (id.includes('backspine') || id.includes('neckspine') || id.includes('tailspine')) return 'spines';
    if (id.includes('leftwing') || id.includes('leftsubmem') || id.includes('leftwingclaw')) return 'wing-left';
    if (id.includes('rightwing') || id.includes('rightsubmem') || id.includes('rightwingclaw')) return 'wing-right';
    if (id.includes('frontleft') || id.includes('flpaw') || id.includes('fltoe') || id.includes('flclaw') || id.includes('fldewclaw')) return 'leg-front-left';
    if (id.includes('frontright') || id.includes('frpaw') || id.includes('frtoe') || id.includes('frclaw') || id.includes('frdewclaw')) return 'leg-front-right';
    if (id.includes('backleft') || id.includes('blpaw') || id.includes('bltoe') || id.includes('blclaw') || id.includes('bldewclaw')) return 'leg-back-left';
    if (id.includes('backright') || id.includes('brpaw') || id.includes('brtoe') || id.includes('brclaw') || id.includes('brdewclaw')) return 'leg-back-right';
    if (id.includes('jaw') || id.includes('lowertooth') || id.includes('lowerfang') || id.includes('tongue')) return 'jaw';
    if (id.includes('skull') || id.includes('eye') || id.includes('horn') || id.includes('crown') || id.includes('earfin') || id.includes('nostril') || id.includes('uppertooth') || id.includes('upperfang')) return 'head';
    if (id.includes('neck')) return 'neck';
    if (id.includes('torso') || id.includes('chest') || id.includes('rib') || id.includes('belly') || id.includes('shoulder')) return 'torso';

    return 'torso'; // Default fallback
  }

  /**
   * Create batch mesh entries from HoloScript mesh descriptors.
   */
  createBatchEntries(
    meshDescriptors: Array<{
      id: string;
      geometryType: string;
      materialType: string;
      animated?: boolean;
      transparent?: boolean;
      opacity?: number;
      emissiveIntensity?: number;
    }>
  ): BatchMeshEntry[] {
    return meshDescriptors.map(desc => ({
      id: desc.id,
      mesh: null,
      geometryType: desc.geometryType,
      materialKey: desc.materialType,
      region: this.classifyRegion(desc.id),
      animated: desc.animated || false,
      transparent: desc.transparent || (desc.opacity !== undefined && desc.opacity < 1.0),
      vertexCount: GEOMETRY_VERTICES[desc.geometryType] || 200,
      emissive: (desc.emissiveIntensity || 0) > 0,
    }));
  }
}

/**
 * Factory function
 */
export function createDragonMeshBatcher(
  config?: Partial<BatchingConfig>
): DragonMeshBatcher {
  return new DragonMeshBatcher(config);
}
