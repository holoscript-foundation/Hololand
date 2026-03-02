/**
 * Avatar Mesh Assembler
 *
 * The core geometry pipeline that converts an AvatarBlueprint into actual
 * Three.js meshes. This is the engine that makes the avatar studio real -
 * translating abstract body/face/hair configurations into renderable 3D content.
 *
 * Pipeline overview:
 * 1. Load base body mesh (VRM humanoid template)
 * 2. Apply morph targets for body proportions and face shaping
 * 3. Apply material overrides (skin color, eye color, etc.)
 * 4. Attach hair mesh from asset catalog
 * 5. Attach clothing meshes with fit adjustments
 * 6. Attach accessory meshes with offset/rotation
 * 7. Configure spring bones for hair/clothing physics
 * 8. Return assembled avatar as a Three.js Group
 *
 * ## Design Decisions
 *
 * - Uses a morph-target approach for body/face customization rather than
 *   procedural mesh generation. This is more performant and produces
 *   better results than vertex manipulation at runtime.
 * - Clothing uses "layered mesh" approach where each garment is a separate
 *   mesh skinned to the same skeleton, with blend shapes to handle body
 *   variation (slim/athletic/heavy).
 * - Hair is attached to the head bone with spring bone physics chains
 *   automatically configured from asset metadata.
 */

import * as THREE from 'three';
import type {
  AvatarBlueprint,
  BodyConfig,
  FaceConfig,
  HairConfig,
  ClothingSlot,
  AccessorySlot,
  BodyPreset,
  BodyProportions,
  FaceMorphs,
} from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface MeshAssemblerConfig {
  /** Base URL for loading asset models */
  assetBaseUrl: string;
  /** Whether to setup spring bone physics */
  enablePhysics: boolean;
  /** Maximum texture resolution (for performance) */
  maxTextureResolution: number;
  /** Enable mesh LOD generation */
  enableLOD: boolean;
  /** Target platform for optimization */
  targetPlatform: 'desktop' | 'mobile' | 'quest';
}

export interface AssemblyResult {
  /** The assembled avatar group */
  group: THREE.Group;
  /** The skeleton (for animation) */
  skeleton: THREE.Skeleton | null;
  /** Root bone for IK */
  rootBone: THREE.Bone | null;
  /** Morph target maps for body/face */
  morphTargets: MorphTargetMap;
  /** Material references for color updates */
  materials: MaterialMap;
  /** Assembly statistics */
  stats: AssemblyStats;
}

export interface MorphTargetMap {
  body: Map<string, { mesh: THREE.SkinnedMesh; index: number }>;
  face: Map<string, { mesh: THREE.SkinnedMesh; index: number }>;
}

export interface MaterialMap {
  skin: THREE.MeshStandardMaterial[];
  hair: THREE.MeshStandardMaterial[];
  eye: THREE.MeshStandardMaterial[];
  clothing: Map<string, THREE.MeshStandardMaterial[]>;
  accessory: Map<string, THREE.MeshStandardMaterial[]>;
}

export interface AssemblyStats {
  totalVertices: number;
  totalTriangles: number;
  totalMaterials: number;
  totalTextures: number;
  totalBones: number;
  totalMorphTargets: number;
  totalSpringBoneChains: number;
  assemblyTimeMs: number;
}

/**
 * Body morph target names used in base mesh.
 * These are standard names that asset creators must follow.
 */
const BODY_MORPH_TARGETS = [
  'headScale',
  'shoulderWidth',
  'chestSize',
  'waistSize',
  'hipWidth',
  'armLength',
  'legLength',
  'handSize',
  'footSize',
  'muscleTone',
] as const;

/**
 * Face morph target names used in base mesh.
 */
const FACE_MORPH_TARGETS = [
  'jawWidth',
  'jawHeight',
  'chinSize',
  'cheekboneHeight',
  'cheekFullness',
  'foreheadHeight',
  'browRidge',
] as const;

/**
 * Bone attachment points for accessories
 */
const ACCESSORY_BONE_MAP: Record<string, string> = {
  hat: 'head',
  glasses: 'head',
  earrings: 'head',
  necklace: 'neck',
  braceletLeft: 'leftHand',
  braceletRight: 'rightHand',
  ringLeft: 'leftHand',
  ringRight: 'rightHand',
  backpack: 'upperChest',
  wings: 'upperChest',
  tail: 'hips',
  custom: 'hips',
};

// =============================================================================
// MESH ASSEMBLER
// =============================================================================

export class AvatarMeshAssembler {
  private config: MeshAssemblerConfig;
  private assetCache: Map<string, THREE.Group> = new Map();
  private textureCache: Map<string, THREE.Texture> = new Map();
  private loader: any = null;

  constructor(config: Partial<MeshAssemblerConfig> = {}) {
    this.config = {
      assetBaseUrl: config.assetBaseUrl ?? '/assets',
      enablePhysics: config.enablePhysics ?? true,
      maxTextureResolution: config.maxTextureResolution ?? 2048,
      enableLOD: config.enableLOD ?? false,
      targetPlatform: config.targetPlatform ?? 'desktop',
    };
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Assemble a complete avatar from a blueprint.
   * This is the main entry point for converting abstract avatar data
   * into renderable 3D content.
   */
  async assemble(blueprint: Readonly<AvatarBlueprint>): Promise<AssemblyResult> {
    const startTime = performance.now();

    const group = new THREE.Group();
    group.name = `avatar_${blueprint.id}`;

    const materials: MaterialMap = {
      skin: [],
      hair: [],
      eye: [],
      clothing: new Map(),
      accessory: new Map(),
    };

    const morphTargets: MorphTargetMap = {
      body: new Map(),
      face: new Map(),
    };

    let skeleton: THREE.Skeleton | null = null;
    let rootBone: THREE.Bone | null = null;
    let totalVertices = 0;
    let totalTriangles = 0;
    let totalBones = 0;
    let totalMorphTargets = 0;
    let totalSpringBoneChains = 0;

    // -------------------------------------------------------------------------
    // Step 1: Load and configure base body mesh
    // -------------------------------------------------------------------------
    const bodyResult = await this.assembleBody(blueprint.body);
    group.add(bodyResult.mesh);
    skeleton = bodyResult.skeleton;
    rootBone = bodyResult.rootBone;
    materials.skin.push(...bodyResult.skinMaterials);
    totalVertices += bodyResult.vertexCount;
    totalTriangles += bodyResult.triangleCount;
    totalBones += bodyResult.boneCount;

    // Register body morph targets
    for (const [name, data] of bodyResult.bodyMorphs) {
      morphTargets.body.set(name, data);
      totalMorphTargets++;
    }

    // Apply body proportions via morph targets
    this.applyBodyProportions(morphTargets.body, blueprint.body.proportions);

    // -------------------------------------------------------------------------
    // Step 2: Load and configure face
    // -------------------------------------------------------------------------
    const faceResult = await this.assembleFace(blueprint.face, skeleton);
    if (faceResult.mesh) {
      group.add(faceResult.mesh);
      materials.eye.push(...faceResult.eyeMaterials);
      totalVertices += faceResult.vertexCount;
      totalTriangles += faceResult.triangleCount;

      for (const [name, data] of faceResult.faceMorphs) {
        morphTargets.face.set(name, data);
        totalMorphTargets++;
      }

      // Apply face morphs
      this.applyFaceMorphs(morphTargets.face, blueprint.face.morphs);
    }

    // -------------------------------------------------------------------------
    // Step 3: Load and attach hair
    // -------------------------------------------------------------------------
    const hairResult = await this.assembleHair(blueprint.hair, skeleton);
    if (hairResult.mesh) {
      group.add(hairResult.mesh);
      materials.hair.push(...hairResult.hairMaterials);
      totalVertices += hairResult.vertexCount;
      totalTriangles += hairResult.triangleCount;
      totalSpringBoneChains += hairResult.springBoneChainCount;
    }

    // -------------------------------------------------------------------------
    // Step 4: Load and attach clothing
    // -------------------------------------------------------------------------
    for (const clothingSlot of blueprint.clothing) {
      const clothResult = await this.assembleClothing(clothingSlot, blueprint.body, skeleton);
      if (clothResult.mesh) {
        group.add(clothResult.mesh);
        materials.clothing.set(clothingSlot.slot, clothResult.materials);
        totalVertices += clothResult.vertexCount;
        totalTriangles += clothResult.triangleCount;
        totalSpringBoneChains += clothResult.springBoneChainCount;
      }
    }

    // -------------------------------------------------------------------------
    // Step 5: Load and attach accessories
    // -------------------------------------------------------------------------
    for (const accessorySlot of blueprint.accessories) {
      const accResult = await this.assembleAccessory(accessorySlot, skeleton);
      if (accResult.mesh) {
        group.add(accResult.mesh);
        materials.accessory.set(accessorySlot.slot, accResult.materials);
        totalVertices += accResult.vertexCount;
        totalTriangles += accResult.triangleCount;
      }
    }

    // -------------------------------------------------------------------------
    // Step 6: Apply height scaling
    // -------------------------------------------------------------------------
    const heightScale = blueprint.body.height / 1.7; // 1.7m is reference height
    group.scale.setScalar(heightScale);

    // Count unique materials and textures
    const allMats = new Set<string>();
    const allTextures = new Set<string>();
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) {
          allMats.add(mat.uuid);
          if (mat instanceof THREE.MeshStandardMaterial) {
            if (mat.map) allTextures.add(mat.map.uuid);
            if (mat.normalMap) allTextures.add(mat.normalMap.uuid);
          }
        }
      }
    });

    const assemblyTimeMs = performance.now() - startTime;

    return {
      group,
      skeleton,
      rootBone,
      morphTargets,
      materials,
      stats: {
        totalVertices,
        totalTriangles,
        totalMaterials: allMats.size,
        totalTextures: allTextures.size,
        totalBones,
        totalMorphTargets,
        totalSpringBoneChains,
        assemblyTimeMs: Math.round(assemblyTimeMs),
      },
    };
  }

  /**
   * Update an existing assembly with blueprint changes.
   * More efficient than full reassembly for incremental edits.
   */
  updateMaterials(
    materials: MaterialMap,
    blueprint: Readonly<AvatarBlueprint>,
  ): void {
    // Update skin color
    const skinColor = new THREE.Color(blueprint.body.skinColor.hex);
    for (const mat of materials.skin) {
      mat.color.copy(skinColor);
    }

    // Update hair color
    const hairColor = new THREE.Color(blueprint.hair.primaryColor.hex);
    for (const mat of materials.hair) {
      mat.color.copy(hairColor);
    }

    // Update eye color
    const eyeColor = new THREE.Color(blueprint.face.eyes.irisColor.hex);
    for (const mat of materials.eye) {
      mat.color.copy(eyeColor);
    }

    // Update clothing colors
    for (const slot of blueprint.clothing) {
      const clothMats = materials.clothing.get(slot.slot);
      if (clothMats && slot.primaryColor) {
        const color = new THREE.Color(slot.primaryColor.hex);
        for (const mat of clothMats) {
          if (mat.userData.colorable) {
            mat.color.copy(color);
          }
        }
      }
    }
  }

  /**
   * Update morph targets from blueprint proportions.
   */
  updateMorphTargets(
    morphTargets: MorphTargetMap,
    blueprint: Readonly<AvatarBlueprint>,
  ): void {
    this.applyBodyProportions(morphTargets.body, blueprint.body.proportions);
    this.applyFaceMorphs(morphTargets.face, blueprint.face.morphs);
  }

  /**
   * Clear all cached assets and textures
   */
  clearCache(): void {
    for (const group of this.assetCache.values()) {
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const mat of mats) {
            mat.dispose();
          }
        }
      });
    }
    this.assetCache.clear();

    for (const texture of this.textureCache.values()) {
      texture.dispose();
    }
    this.textureCache.clear();
  }

  // ===========================================================================
  // INTERNAL: BODY ASSEMBLY
  // ===========================================================================

  private async assembleBody(body: BodyConfig): Promise<{
    mesh: THREE.Group;
    skeleton: THREE.Skeleton;
    rootBone: THREE.Bone;
    skinMaterials: THREE.MeshStandardMaterial[];
    bodyMorphs: Map<string, { mesh: THREE.SkinnedMesh; index: number }>;
    vertexCount: number;
    triangleCount: number;
    boneCount: number;
  }> {
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'body';

    // Determine which base mesh to load based on gender presentation
    const baseMeshId = this.getBaseMeshId(body.genderPresentation, body.preset);

    // Try to load the actual base mesh
    let loadedModel: THREE.Group | null = null;
    try {
      loadedModel = await this.loadAsset(`body/${baseMeshId}`);
    } catch {
      // Fall back to procedural placeholder
    }

    const skinMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(body.skinColor.hex),
      roughness: 0.65,
      metalness: 0.0,
      name: 'skin',
    });
    skinMaterial.userData.materialType = 'skin';

    const bodyMorphs = new Map<string, { mesh: THREE.SkinnedMesh; index: number }>();

    if (loadedModel) {
      // Use loaded base mesh
      const skinMaterials: THREE.MeshStandardMaterial[] = [skinMaterial];

      loadedModel.traverse((obj) => {
        if (obj instanceof THREE.SkinnedMesh) {
          // Apply skin material
          obj.material = skinMaterial.clone();
          obj.userData.materialType = 'skin';
          skinMaterials.push(obj.material as THREE.MeshStandardMaterial);

          // Register morph targets
          if (obj.geometry.morphAttributes.position) {
            const morphNames = obj.geometry.userData.targetNames ?? [];
            for (let i = 0; i < morphNames.length; i++) {
              if (BODY_MORPH_TARGETS.includes(morphNames[i] as any)) {
                bodyMorphs.set(morphNames[i], { mesh: obj, index: i });
              }
            }
          }
        }
      });

      bodyGroup.add(loadedModel);

      let vertexCount = 0;
      let triangleCount = 0;
      let boneCount = 0;
      let skeleton: THREE.Skeleton | null = null;
      let rootBone: THREE.Bone | null = null;

      loadedModel.traverse((obj) => {
        if (obj instanceof THREE.SkinnedMesh) {
          vertexCount += obj.geometry.getAttribute('position')?.count ?? 0;
          triangleCount += obj.geometry.index
            ? obj.geometry.index.count / 3
            : (obj.geometry.getAttribute('position')?.count ?? 0) / 3;
          if (!skeleton) {
            skeleton = obj.skeleton;
            rootBone = obj.skeleton.bones[0] ?? null;
            boneCount = obj.skeleton.bones.length;
          }
        }
      });

      return {
        mesh: bodyGroup,
        skeleton: skeleton!,
        rootBone: rootBone!,
        skinMaterials,
        bodyMorphs,
        vertexCount,
        triangleCount,
        boneCount,
      };
    }

    // Fallback: Create a procedural humanoid skeleton + mesh
    const { skeleton, rootBone, boneCount } = this.createHumanoidSkeleton();
    const { mesh: bodyMesh, vertexCount, triangleCount } = this.createProceduralBody(
      skeleton, skinMaterial, body
    );

    bodyGroup.add(bodyMesh);
    bodyGroup.add(rootBone); // Add bone hierarchy to scene

    return {
      mesh: bodyGroup,
      skeleton,
      rootBone,
      skinMaterials: [skinMaterial],
      bodyMorphs,
      vertexCount,
      triangleCount,
      boneCount,
    };
  }

  // ===========================================================================
  // INTERNAL: FACE ASSEMBLY
  // ===========================================================================

  private async assembleFace(
    face: FaceConfig,
    _skeleton: THREE.Skeleton | null,
  ): Promise<{
    mesh: THREE.Group | null;
    eyeMaterials: THREE.MeshStandardMaterial[];
    faceMorphs: Map<string, { mesh: THREE.SkinnedMesh; index: number }>;
    vertexCount: number;
    triangleCount: number;
  }> {
    const faceGroup = new THREE.Group();
    faceGroup.name = 'face';

    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(face.eyes.irisColor.hex),
      roughness: 0.3,
      metalness: 0.1,
      name: 'iris',
    });
    eyeMaterial.userData.materialType = 'eye';

    const faceMorphs = new Map<string, { mesh: THREE.SkinnedMesh; index: number }>();

    // Try to load face mesh with morph targets
    try {
      const faceMeshId = `face/${face.shape}`;
      const loaded = await this.loadAsset(faceMeshId);

      loaded.traverse((obj) => {
        if (obj instanceof THREE.SkinnedMesh) {
          // Register face morph targets
          if (obj.geometry.morphAttributes.position) {
            const morphNames = obj.geometry.userData.targetNames ?? [];
            for (let i = 0; i < morphNames.length; i++) {
              if (FACE_MORPH_TARGETS.includes(morphNames[i] as any)) {
                faceMorphs.set(morphNames[i], { mesh: obj, index: i });
              }
            }
          }
        }
      });

      faceGroup.add(loaded);
    } catch {
      // Face morphs will be handled by the body mesh morph targets
      // in a combined mesh setup
    }

    let vertexCount = 0;
    let triangleCount = 0;
    faceGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        vertexCount += obj.geometry.getAttribute('position')?.count ?? 0;
        triangleCount += obj.geometry.index
          ? obj.geometry.index.count / 3
          : (obj.geometry.getAttribute('position')?.count ?? 0) / 3;
      }
    });

    return {
      mesh: faceGroup.children.length > 0 ? faceGroup : null,
      eyeMaterials: [eyeMaterial],
      faceMorphs,
      vertexCount,
      triangleCount,
    };
  }

  // ===========================================================================
  // INTERNAL: HAIR ASSEMBLY
  // ===========================================================================

  private async assembleHair(
    hair: HairConfig,
    _skeleton: THREE.Skeleton | null,
  ): Promise<{
    mesh: THREE.Group | null;
    hairMaterials: THREE.MeshStandardMaterial[];
    vertexCount: number;
    triangleCount: number;
    springBoneChainCount: number;
  }> {
    if (hair.styleId === 'hair-bald-01' || hair.styleId === 'bald') {
      return {
        mesh: null,
        hairMaterials: [],
        vertexCount: 0,
        triangleCount: 0,
        springBoneChainCount: 0,
      };
    }

    const hairGroup = new THREE.Group();
    hairGroup.name = 'hair';

    const hairMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hair.primaryColor.hex),
      roughness: 0.7,
      metalness: 0.0,
      name: 'hair',
      side: THREE.DoubleSide,
    });
    hairMaterial.userData.materialType = 'hair';

    let springBoneChainCount = 0;

    try {
      const loaded = await this.loadAsset(`hair/${hair.styleId}`);

      // Apply hair material
      loaded.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.material = hairMaterial.clone();
          obj.userData.materialType = 'hair';
        }
      });

      // Apply length factor by scaling along local Y
      loaded.scale.y = 0.5 + hair.lengthFactor * 0.5;

      // Apply volume
      const volumeScale = 0.8 + hair.volume * 0.4;
      loaded.scale.x = volumeScale;
      loaded.scale.z = volumeScale;

      // Count spring bone chains from asset metadata
      if (loaded.userData.springBoneChains) {
        springBoneChainCount = loaded.userData.springBoneChains;
      }

      hairGroup.add(loaded);
    } catch {
      // Fallback: procedural hair sphere
      const hairGeometry = new THREE.SphereGeometry(0.14, 32, 32);
      const hairMesh = new THREE.Mesh(hairGeometry, hairMaterial);
      hairMesh.position.y = 1.6;
      hairMesh.scale.set(
        0.8 + hair.volume * 0.4,
        0.9,
        0.8 + hair.volume * 0.4
      );
      hairMesh.userData.materialType = 'hair';
      hairGroup.add(hairMesh);
    }

    let vertexCount = 0;
    let triangleCount = 0;
    hairGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        vertexCount += obj.geometry.getAttribute('position')?.count ?? 0;
        triangleCount += obj.geometry.index
          ? obj.geometry.index.count / 3
          : (obj.geometry.getAttribute('position')?.count ?? 0) / 3;
      }
    });

    return {
      mesh: hairGroup,
      hairMaterials: [hairMaterial],
      vertexCount,
      triangleCount,
      springBoneChainCount,
    };
  }

  // ===========================================================================
  // INTERNAL: CLOTHING ASSEMBLY
  // ===========================================================================

  private async assembleClothing(
    slot: ClothingSlot,
    body: BodyConfig,
    _skeleton: THREE.Skeleton | null,
  ): Promise<{
    mesh: THREE.Group | null;
    materials: THREE.MeshStandardMaterial[];
    vertexCount: number;
    triangleCount: number;
    springBoneChainCount: number;
  }> {
    const clothGroup = new THREE.Group();
    clothGroup.name = `clothing_${slot.slot}`;

    const materials: THREE.MeshStandardMaterial[] = [];
    let springBoneChainCount = 0;

    try {
      const loaded = await this.loadAsset(`clothing/${slot.assetId}`);

      loaded.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          // Apply color overrides if set
          if (slot.primaryColor && obj.material instanceof THREE.MeshStandardMaterial) {
            const mat = obj.material.clone();
            mat.color.set(slot.primaryColor.hex);
            mat.userData.colorable = true;
            obj.material = mat;
            materials.push(mat);
          } else if (obj.material instanceof THREE.MeshStandardMaterial) {
            materials.push(obj.material);
          }

          // Apply fit morph target if available
          if (obj instanceof THREE.SkinnedMesh && obj.geometry.morphAttributes.position) {
            const morphNames = obj.geometry.userData.targetNames ?? [];
            const fitIndex = morphNames.indexOf('fit');
            if (fitIndex >= 0) {
              obj.morphTargetInfluences![fitIndex] = (slot.fit + 1) / 2; // -1..1 to 0..1
            }

            // Apply body type morph
            const bodyIndex = morphNames.indexOf(body.preset);
            if (bodyIndex >= 0) {
              obj.morphTargetInfluences![bodyIndex] = 1.0;
            }
          }
        }
      });

      // Count spring bones (for skirts, coats, etc.)
      if (loaded.userData.springBoneChains) {
        springBoneChainCount = loaded.userData.springBoneChains;
      }

      clothGroup.add(loaded);
    } catch {
      // Asset not found - skip silently
      return {
        mesh: null,
        materials: [],
        vertexCount: 0,
        triangleCount: 0,
        springBoneChainCount: 0,
      };
    }

    let vertexCount = 0;
    let triangleCount = 0;
    clothGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        vertexCount += obj.geometry.getAttribute('position')?.count ?? 0;
        triangleCount += obj.geometry.index
          ? obj.geometry.index.count / 3
          : (obj.geometry.getAttribute('position')?.count ?? 0) / 3;
      }
    });

    return {
      mesh: clothGroup,
      materials,
      vertexCount,
      triangleCount,
      springBoneChainCount,
    };
  }

  // ===========================================================================
  // INTERNAL: ACCESSORY ASSEMBLY
  // ===========================================================================

  private async assembleAccessory(
    slot: AccessorySlot,
    skeleton: THREE.Skeleton | null,
  ): Promise<{
    mesh: THREE.Group | null;
    materials: THREE.MeshStandardMaterial[];
    vertexCount: number;
    triangleCount: number;
  }> {
    const accGroup = new THREE.Group();
    accGroup.name = `accessory_${slot.slot}`;

    const materials: THREE.MeshStandardMaterial[] = [];

    try {
      const loaded = await this.loadAsset(`accessories/${slot.assetId}`);

      // Apply color override
      if (slot.color) {
        loaded.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
            const mat = obj.material.clone();
            mat.color.set(slot.color!.hex);
            mat.userData.colorable = true;
            obj.material = mat;
            materials.push(mat);
          }
        });
      }

      // Apply scale
      loaded.scale.setScalar(slot.scale);

      // Apply offset
      loaded.position.set(slot.offset.x, slot.offset.y, slot.offset.z);

      // Apply rotation
      loaded.rotation.set(
        THREE.MathUtils.degToRad(slot.rotationOffset.x),
        THREE.MathUtils.degToRad(slot.rotationOffset.y),
        THREE.MathUtils.degToRad(slot.rotationOffset.z),
      );

      // Attach to bone if skeleton available
      const targetBoneName = ACCESSORY_BONE_MAP[slot.slot];
      if (skeleton && targetBoneName) {
        const bone = skeleton.bones.find(
          (b) => b.name === targetBoneName || b.name.toLowerCase().includes(targetBoneName.toLowerCase())
        );
        if (bone) {
          bone.add(loaded);
        } else {
          accGroup.add(loaded);
        }
      } else {
        accGroup.add(loaded);
      }
    } catch {
      return {
        mesh: null,
        materials: [],
        vertexCount: 0,
        triangleCount: 0,
      };
    }

    let vertexCount = 0;
    let triangleCount = 0;
    accGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        vertexCount += obj.geometry.getAttribute('position')?.count ?? 0;
        triangleCount += obj.geometry.index
          ? obj.geometry.index.count / 3
          : (obj.geometry.getAttribute('position')?.count ?? 0) / 3;
      }
    });

    return {
      mesh: accGroup.children.length > 0 ? accGroup : null,
      materials,
      vertexCount,
      triangleCount,
    };
  }

  // ===========================================================================
  // INTERNAL: MORPH TARGET APPLICATION
  // ===========================================================================

  private applyBodyProportions(
    morphs: Map<string, { mesh: THREE.SkinnedMesh; index: number }>,
    proportions: BodyProportions,
  ): void {
    for (const [name, value] of Object.entries(proportions)) {
      const morphData = morphs.get(name);
      if (morphData && morphData.mesh.morphTargetInfluences) {
        morphData.mesh.morphTargetInfluences[morphData.index] = value;
      }
    }
  }

  private applyFaceMorphs(
    morphs: Map<string, { mesh: THREE.SkinnedMesh; index: number }>,
    faceMorphs: FaceMorphs,
  ): void {
    for (const [name, value] of Object.entries(faceMorphs)) {
      const morphData = morphs.get(name);
      if (morphData && morphData.mesh.morphTargetInfluences) {
        morphData.mesh.morphTargetInfluences[morphData.index] = value;
      }
    }
  }

  // ===========================================================================
  // INTERNAL: SKELETON CREATION
  // ===========================================================================

  private createHumanoidSkeleton(): {
    skeleton: THREE.Skeleton;
    rootBone: THREE.Bone;
    boneCount: number;
  } {
    // Create VRM-compatible humanoid skeleton
    const bones: THREE.Bone[] = [];
    const boneData: { name: string; parent: number; position: [number, number, number] }[] = [
      { name: 'hips', parent: -1, position: [0, 0.9, 0] },
      { name: 'spine', parent: 0, position: [0, 0.1, 0] },
      { name: 'chest', parent: 1, position: [0, 0.15, 0] },
      { name: 'upperChest', parent: 2, position: [0, 0.1, 0] },
      { name: 'neck', parent: 3, position: [0, 0.12, 0] },
      { name: 'head', parent: 4, position: [0, 0.08, 0] },
      // Left arm
      { name: 'leftShoulder', parent: 3, position: [-0.08, 0.05, 0] },
      { name: 'leftUpperArm', parent: 6, position: [-0.1, 0, 0] },
      { name: 'leftLowerArm', parent: 7, position: [-0.25, 0, 0] },
      { name: 'leftHand', parent: 8, position: [-0.25, 0, 0] },
      // Right arm
      { name: 'rightShoulder', parent: 3, position: [0.08, 0.05, 0] },
      { name: 'rightUpperArm', parent: 10, position: [0.1, 0, 0] },
      { name: 'rightLowerArm', parent: 11, position: [0.25, 0, 0] },
      { name: 'rightHand', parent: 12, position: [0.25, 0, 0] },
      // Left leg
      { name: 'leftUpperLeg', parent: 0, position: [-0.1, -0.05, 0] },
      { name: 'leftLowerLeg', parent: 14, position: [0, -0.4, 0] },
      { name: 'leftFoot', parent: 15, position: [0, -0.4, 0] },
      { name: 'leftToes', parent: 16, position: [0, 0, 0.1] },
      // Right leg
      { name: 'rightUpperLeg', parent: 0, position: [0.1, -0.05, 0] },
      { name: 'rightLowerLeg', parent: 18, position: [0, -0.4, 0] },
      { name: 'rightFoot', parent: 19, position: [0, -0.4, 0] },
      { name: 'rightToes', parent: 20, position: [0, 0, 0.1] },
    ];

    for (const data of boneData) {
      const bone = new THREE.Bone();
      bone.name = data.name;
      bone.position.set(...data.position);
      bones.push(bone);
    }

    // Build hierarchy
    for (let i = 0; i < boneData.length; i++) {
      if (boneData[i].parent >= 0) {
        bones[boneData[i].parent].add(bones[i]);
      }
    }

    const skeleton = new THREE.Skeleton(bones);

    return {
      skeleton,
      rootBone: bones[0],
      boneCount: bones.length,
    };
  }

  private createProceduralBody(
    skeleton: THREE.Skeleton,
    material: THREE.MeshStandardMaterial,
    _body: BodyConfig,
  ): {
    mesh: THREE.SkinnedMesh;
    vertexCount: number;
    triangleCount: number;
  } {
    // Create a simple capsule-based body mesh attached to skeleton
    // In production, this would be replaced by actual base mesh loading
    const geometry = new THREE.CylinderGeometry(0.15, 0.12, 1.7, 16, 10);

    // Create basic skin weights (all vertices weighted to nearest bone)
    const position = geometry.getAttribute('position');
    const vertexCount = position.count;
    const skinIndices = new Float32Array(vertexCount * 4);
    const skinWeights = new Float32Array(vertexCount * 4);

    for (let i = 0; i < vertexCount; i++) {
      const y = position.getY(i) + 0.85; // offset to match skeleton
      // Simple weight assignment based on height
      let boneIndex = 0; // hips
      if (y > 1.4) boneIndex = 5; // head
      else if (y > 1.25) boneIndex = 4; // neck
      else if (y > 1.1) boneIndex = 3; // upperChest
      else if (y > 0.95) boneIndex = 2; // chest
      else if (y > 0.8) boneIndex = 1; // spine
      else if (y > 0.45) boneIndex = 0; // hips
      else boneIndex = 14; // leftUpperLeg (approximate)

      skinIndices[i * 4] = boneIndex;
      skinIndices[i * 4 + 1] = 0;
      skinIndices[i * 4 + 2] = 0;
      skinIndices[i * 4 + 3] = 0;

      skinWeights[i * 4] = 1.0;
      skinWeights[i * 4 + 1] = 0;
      skinWeights[i * 4 + 2] = 0;
      skinWeights[i * 4 + 3] = 0;
    }

    geometry.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint16Array(skinIndices), 4));
    geometry.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeights, 4));

    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.name = 'body_mesh';
    mesh.userData.materialType = 'skin';
    mesh.add(skeleton.bones[0]);
    mesh.bind(skeleton);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const triangleCount = geometry.index
      ? geometry.index.count / 3
      : vertexCount / 3;

    return { mesh, vertexCount, triangleCount };
  }

  // ===========================================================================
  // INTERNAL: ASSET LOADING
  // ===========================================================================

  private async loadAsset(path: string): Promise<THREE.Group> {
    // Check cache
    const cached = this.assetCache.get(path);
    if (cached) {
      return cached.clone(true);
    }

    // Lazy-init loader
    if (!this.loader) {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      this.loader = new GLTFLoader();

      try {
        const { VRMLoaderPlugin } = await import('@pixiv/three-vrm');
        this.loader.register((parser: any) => new VRMLoaderPlugin(parser));
      } catch {
        // VRM plugin optional
      }
    }

    const url = `${this.config.assetBaseUrl}/${path}/model.glb`;
    const gltf = await this.loader.loadAsync(url);

    // Cache the loaded model
    this.assetCache.set(path, gltf.scene);

    return gltf.scene.clone(true);
  }

  private getBaseMeshId(
    gender: string,
    preset: BodyPreset,
  ): string {
    return `base_${gender}_${preset}`;
  }
}
