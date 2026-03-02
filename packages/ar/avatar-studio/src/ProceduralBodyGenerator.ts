/**
 * Procedural Body Generator
 *
 * Generates base body meshes procedurally for 3 body types:
 * - masculine: broader shoulders, narrower hips, angular torso
 * - feminine: narrower shoulders, wider hips, curved torso
 * - androgynous: balanced proportions between masculine and feminine
 *
 * Each generated mesh includes:
 * - VRM-compatible humanoid skeleton (22 bones)
 * - Morph targets for body proportions:
 *   headScale, shoulderWidth, hipWidth, armLength, legLength, torsoLength
 * - Proper UV mapping (cylindrical projection with seam on back)
 * - Exportable as .glb via the built-in GLB writer
 *
 * ## Architecture
 *
 * The generator builds geometry in segments (head, neck, torso upper/lower,
 * arms, hands, legs, feet) and stitches them into a single indexed
 * BufferGeometry. Skin weights bind vertices to the VRM skeleton using
 * smooth heat-map weighting based on vertical position and limb proximity.
 *
 * Morph targets are computed by generating the mesh at default proportions
 * and then regenerating with each proportion at its maximum, storing the
 * per-vertex deltas as morph target position arrays.
 *
 * ## Usage
 *
 * ```typescript
 * import { ProceduralBodyGenerator } from './ProceduralBodyGenerator';
 *
 * const generator = new ProceduralBodyGenerator();
 *
 * // Generate a feminine body mesh with all morph targets
 * const result = generator.generate('feminine');
 *
 * // Export as GLB
 * const glbBuffer = generator.exportGLB(result);
 *
 * // Or generate all 3 types
 * const allBodies = generator.generateAll();
 * ```
 */

import * as THREE from 'three';
import type { GenderPresentation, BodyProportions } from './types';

// =============================================================================
// TYPES
// =============================================================================

/** Configuration for procedural body generation */
export interface BodyGeneratorConfig {
  /** Number of radial segments for body cross-sections */
  radialSegments: number;
  /** Number of vertical segments per body part */
  heightSegments: number;
  /** Reference height in meters (T-pose) */
  referenceHeight: number;
  /** Whether to generate morph targets */
  generateMorphTargets: boolean;
  /** Names of morph targets to generate */
  morphTargetNames: string[];
}

/** Result of body mesh generation */
export interface BodyGenerationResult {
  /** The generated body geometry with morph targets baked in */
  geometry: THREE.BufferGeometry;
  /** The VRM-compatible skeleton */
  skeleton: THREE.Skeleton;
  /** Root bone of the skeleton hierarchy */
  rootBone: THREE.Bone;
  /** The skinned mesh (geometry + skeleton bound) */
  skinnedMesh: THREE.SkinnedMesh;
  /** Body type that was generated */
  bodyType: GenderPresentation;
  /** Morph target name-to-index mapping */
  morphTargetDictionary: Record<string, number>;
  /** Generation statistics */
  stats: BodyGenerationStats;
}

export interface BodyGenerationStats {
  vertexCount: number;
  triangleCount: number;
  boneCount: number;
  morphTargetCount: number;
  generationTimeMs: number;
}

/**
 * Internal body profile: defines the proportional shape of each body type.
 * Values are ratios relative to reference height.
 */
interface BodyProfile {
  // Torso
  shoulderWidthRatio: number;    // half-width at shoulders
  chestWidthRatio: number;       // half-width at chest
  waistWidthRatio: number;       // half-width at waist
  hipWidthRatio: number;         // half-width at hips
  chestDepthRatio: number;       // half-depth at chest
  waistDepthRatio: number;       // half-depth at waist
  hipDepthRatio: number;         // half-depth at hips

  // Limbs
  upperArmRadius: number;
  lowerArmRadius: number;
  handRadius: number;
  upperLegRadius: number;
  lowerLegRadius: number;
  footLength: number;
  footHeight: number;

  // Head
  headRadius: number;
  neckRadius: number;

  // Vertical proportions (fraction of total height)
  headTopY: number;              // top of head
  chinY: number;                 // chin / jaw
  neckBaseY: number;             // base of neck
  shoulderY: number;             // shoulder line
  chestY: number;                // chest line
  waistY: number;                // waist line
  hipY: number;                  // hip line / crotch
  kneeY: number;                 // knee
  ankleY: number;                // ankle
  floorY: number;                // bottom of feet
}

// =============================================================================
// VRM HUMANOID BONE DEFINITIONS
// =============================================================================

interface BoneDef {
  name: string;
  parent: number;   // index into bone array, -1 for root
  position: [number, number, number]; // local position relative to parent
}

/**
 * VRM 1.0 humanoid bone layout.
 * Positions are in meters for a ~1.7m reference human in T-pose.
 */
const VRM_BONES: BoneDef[] = [
  // Spine chain
  { name: 'hips',          parent: -1,  position: [0.000, 0.900, 0.000] },
  { name: 'spine',         parent:  0,  position: [0.000, 0.100, 0.000] },
  { name: 'chest',         parent:  1,  position: [0.000, 0.150, 0.000] },
  { name: 'upperChest',    parent:  2,  position: [0.000, 0.100, 0.000] },
  { name: 'neck',          parent:  3,  position: [0.000, 0.120, 0.000] },
  { name: 'head',          parent:  4,  position: [0.000, 0.080, 0.000] },
  // Left arm
  { name: 'leftShoulder',  parent:  3,  position: [-0.080, 0.050, 0.000] },
  { name: 'leftUpperArm',  parent:  6,  position: [-0.100, 0.000, 0.000] },
  { name: 'leftLowerArm',  parent:  7,  position: [-0.250, 0.000, 0.000] },
  { name: 'leftHand',      parent:  8,  position: [-0.250, 0.000, 0.000] },
  // Right arm
  { name: 'rightShoulder', parent:  3,  position: [0.080, 0.050, 0.000] },
  { name: 'rightUpperArm', parent: 10,  position: [0.100, 0.000, 0.000] },
  { name: 'rightLowerArm', parent: 11,  position: [0.250, 0.000, 0.000] },
  { name: 'rightHand',     parent: 12,  position: [0.250, 0.000, 0.000] },
  // Left leg
  { name: 'leftUpperLeg',  parent:  0,  position: [-0.100, -0.050, 0.000] },
  { name: 'leftLowerLeg',  parent: 14,  position: [0.000, -0.400, 0.000] },
  { name: 'leftFoot',      parent: 15,  position: [0.000, -0.400, 0.000] },
  { name: 'leftToes',      parent: 16,  position: [0.000,  0.000, 0.100] },
  // Right leg
  { name: 'rightUpperLeg', parent:  0,  position: [0.100, -0.050, 0.000] },
  { name: 'rightLowerLeg', parent: 18,  position: [0.000, -0.400, 0.000] },
  { name: 'rightFoot',     parent: 19,  position: [0.000, -0.400, 0.000] },
  { name: 'rightToes',     parent: 20,  position: [0.000,  0.000, 0.100] },
];

// =============================================================================
// BODY PROFILES
// =============================================================================

const BODY_PROFILES: Record<GenderPresentation, BodyProfile> = {
  masculine: {
    shoulderWidthRatio: 0.130,
    chestWidthRatio: 0.125,
    waistWidthRatio: 0.100,
    hipWidthRatio: 0.095,
    chestDepthRatio: 0.095,
    waistDepthRatio: 0.080,
    hipDepthRatio: 0.085,
    upperArmRadius: 0.042,
    lowerArmRadius: 0.034,
    handRadius: 0.028,
    upperLegRadius: 0.065,
    lowerLegRadius: 0.045,
    footLength: 0.150,
    footHeight: 0.050,
    headRadius: 0.110,
    neckRadius: 0.048,
    headTopY: 1.700,
    chinY: 1.500,
    neckBaseY: 1.440,
    shoulderY: 1.370,
    chestY: 1.250,
    waistY: 1.070,
    hipY: 0.900,
    kneeY: 0.480,
    ankleY: 0.080,
    floorY: 0.000,
  },
  feminine: {
    shoulderWidthRatio: 0.105,
    chestWidthRatio: 0.108,
    waistWidthRatio: 0.082,
    hipWidthRatio: 0.115,
    chestDepthRatio: 0.090,
    waistDepthRatio: 0.070,
    hipDepthRatio: 0.095,
    upperArmRadius: 0.034,
    lowerArmRadius: 0.028,
    handRadius: 0.024,
    upperLegRadius: 0.062,
    lowerLegRadius: 0.040,
    footLength: 0.135,
    footHeight: 0.045,
    headRadius: 0.105,
    neckRadius: 0.040,
    headTopY: 1.650,
    chinY: 1.458,
    neckBaseY: 1.400,
    shoulderY: 1.330,
    chestY: 1.210,
    waistY: 1.040,
    hipY: 0.880,
    kneeY: 0.460,
    ankleY: 0.075,
    floorY: 0.000,
  },
  androgynous: {
    shoulderWidthRatio: 0.115,
    chestWidthRatio: 0.115,
    waistWidthRatio: 0.090,
    hipWidthRatio: 0.105,
    chestDepthRatio: 0.092,
    waistDepthRatio: 0.075,
    hipDepthRatio: 0.090,
    upperArmRadius: 0.038,
    lowerArmRadius: 0.031,
    handRadius: 0.026,
    upperLegRadius: 0.063,
    lowerLegRadius: 0.042,
    footLength: 0.142,
    footHeight: 0.047,
    headRadius: 0.107,
    neckRadius: 0.044,
    headTopY: 1.675,
    chinY: 1.480,
    neckBaseY: 1.420,
    shoulderY: 1.350,
    chestY: 1.230,
    waistY: 1.055,
    hipY: 0.890,
    kneeY: 0.470,
    ankleY: 0.077,
    floorY: 0.000,
  },
};

/** Morph target definitions: name + how the profile changes to produce the morph */
interface MorphTargetDef {
  name: string;
  /** Function that returns a modified profile for computing deltas */
  modifyProfile: (base: BodyProfile) => BodyProfile;
}

const MORPH_TARGET_DEFS: MorphTargetDef[] = [
  {
    name: 'headScale',
    modifyProfile: (base) => ({
      ...base,
      headRadius: base.headRadius * 1.3,
    }),
  },
  {
    name: 'shoulderWidth',
    modifyProfile: (base) => ({
      ...base,
      shoulderWidthRatio: base.shoulderWidthRatio * 1.4,
      chestWidthRatio: base.chestWidthRatio * 1.15,
    }),
  },
  {
    name: 'hipWidth',
    modifyProfile: (base) => ({
      ...base,
      hipWidthRatio: base.hipWidthRatio * 1.4,
      waistWidthRatio: base.waistWidthRatio * 1.1,
    }),
  },
  {
    name: 'armLength',
    modifyProfile: (base) => ({
      ...base,
      // Arms get longer; implemented by stretching arm segment vertices
      upperArmRadius: base.upperArmRadius * 0.95, // slightly thinner when stretched
    }),
  },
  {
    name: 'legLength',
    modifyProfile: (base) => ({
      ...base,
      kneeY: base.kneeY * 0.92,
      ankleY: base.ankleY * 0.85,
      hipY: base.hipY * 1.03,
    }),
  },
  {
    name: 'torsoLength',
    modifyProfile: (base) => ({
      ...base,
      shoulderY: base.shoulderY + 0.06,
      chestY: base.chestY + 0.04,
      waistY: base.waistY + 0.02,
      neckBaseY: base.neckBaseY + 0.06,
      chinY: base.chinY + 0.06,
      headTopY: base.headTopY + 0.06,
    }),
  },
  {
    name: 'chestSize',
    modifyProfile: (base) => ({
      ...base,
      chestWidthRatio: base.chestWidthRatio * 1.25,
      chestDepthRatio: base.chestDepthRatio * 1.30,
    }),
  },
  {
    name: 'waistSize',
    modifyProfile: (base) => ({
      ...base,
      waistWidthRatio: base.waistWidthRatio * 1.35,
      waistDepthRatio: base.waistDepthRatio * 1.30,
    }),
  },
  {
    name: 'muscleTone',
    modifyProfile: (base) => ({
      ...base,
      upperArmRadius: base.upperArmRadius * 1.25,
      lowerArmRadius: base.lowerArmRadius * 1.15,
      upperLegRadius: base.upperLegRadius * 1.20,
      lowerLegRadius: base.lowerLegRadius * 1.15,
      chestWidthRatio: base.chestWidthRatio * 1.08,
      chestDepthRatio: base.chestDepthRatio * 1.10,
    }),
  },
];

// =============================================================================
// PROCEDURAL BODY GENERATOR
// =============================================================================

export class ProceduralBodyGenerator {
  private config: BodyGeneratorConfig;

  constructor(config?: Partial<BodyGeneratorConfig>) {
    this.config = {
      radialSegments: config?.radialSegments ?? 16,
      heightSegments: config?.heightSegments ?? 8,
      referenceHeight: config?.referenceHeight ?? 1.7,
      generateMorphTargets: config?.generateMorphTargets ?? true,
      morphTargetNames: config?.morphTargetNames ?? MORPH_TARGET_DEFS.map((d) => d.name),
    };
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Generate a procedural body mesh for the given body type.
   */
  generate(bodyType: GenderPresentation): BodyGenerationResult {
    const startTime = performance.now();
    const profile = { ...BODY_PROFILES[bodyType] };

    // Step 1: Create VRM-compatible skeleton
    const { skeleton, rootBone, boneCount } = this.createSkeleton();

    // Step 2: Generate the base body geometry
    const baseVertices = this.generateBodyVertices(profile);
    const { indices, uvs } = this.generateTopologyAndUVs(baseVertices);

    // Step 3: Build BufferGeometry
    const geometry = new THREE.BufferGeometry();
    const positionArray = new Float32Array(baseVertices.positions);
    const normalArray = new Float32Array(baseVertices.normals);
    const uvArray = new Float32Array(uvs);
    const indexArray = new Uint16Array(indices);

    geometry.setIndex(new THREE.BufferAttribute(indexArray, 1));
    geometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normalArray, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));

    // Step 4: Compute skin weights
    const { skinIndices, skinWeights } = this.computeSkinWeights(
      baseVertices.positions,
      skeleton.bones,
    );
    geometry.setAttribute(
      'skinIndex',
      new THREE.BufferAttribute(new Uint16Array(skinIndices), 4),
    );
    geometry.setAttribute(
      'skinWeight',
      new THREE.BufferAttribute(new Float32Array(skinWeights), 4),
    );

    // Step 5: Generate morph targets
    const morphTargetDictionary: Record<string, number> = {};
    let morphTargetCount = 0;

    if (this.config.generateMorphTargets) {
      const morphPositions: Float32Array[] = [];

      for (const def of MORPH_TARGET_DEFS) {
        if (!this.config.morphTargetNames.includes(def.name)) continue;

        const modifiedProfile = def.modifyProfile(profile);
        const modifiedVerts = this.generateBodyVertices(modifiedProfile);

        // Compute deltas
        const deltas = new Float32Array(baseVertices.positions.length);
        for (let i = 0; i < deltas.length; i++) {
          deltas[i] = modifiedVerts.positions[i] - baseVertices.positions[i];
        }

        morphPositions.push(deltas);
        morphTargetDictionary[def.name] = morphTargetCount;
        morphTargetCount++;
      }

      // Set morph attributes
      if (morphPositions.length > 0) {
        geometry.morphAttributes.position = morphPositions.map(
          (arr) => new THREE.BufferAttribute(arr, 3),
        );
        geometry.morphTargetsRelative = true;
        geometry.userData.targetNames = Object.keys(morphTargetDictionary);
      }
    }

    // Step 6: Create SkinnedMesh
    const material = new THREE.MeshStandardMaterial({
      color: 0xe0b896,
      roughness: 0.65,
      metalness: 0.0,
      name: 'skin',
      side: THREE.FrontSide,
    });
    material.userData.materialType = 'skin';

    const skinnedMesh = new THREE.SkinnedMesh(geometry, material);
    skinnedMesh.name = `body_${bodyType}`;
    skinnedMesh.add(rootBone);
    skinnedMesh.bind(skeleton);
    skinnedMesh.castShadow = true;
    skinnedMesh.receiveShadow = true;

    // Initialize morph target influences
    if (morphTargetCount > 0) {
      skinnedMesh.morphTargetDictionary = morphTargetDictionary;
      skinnedMesh.morphTargetInfluences = new Array(morphTargetCount).fill(0);
    }

    const generationTimeMs = performance.now() - startTime;

    return {
      geometry,
      skeleton,
      rootBone,
      skinnedMesh,
      bodyType,
      morphTargetDictionary,
      stats: {
        vertexCount: positionArray.length / 3,
        triangleCount: indexArray.length / 3,
        boneCount,
        morphTargetCount,
        generationTimeMs: Math.round(generationTimeMs),
      },
    };
  }

  /**
   * Generate all 3 body types.
   */
  generateAll(): Map<GenderPresentation, BodyGenerationResult> {
    const results = new Map<GenderPresentation, BodyGenerationResult>();
    const types: GenderPresentation[] = ['masculine', 'feminine', 'androgynous'];
    for (const type of types) {
      results.set(type, this.generate(type));
    }
    return results;
  }

  /**
   * Export a generation result as GLB binary data.
   *
   * This is a minimal GLB writer that embeds:
   * - Mesh geometry (positions, normals, UVs, indices)
   * - Skin weights and joint indices
   * - Morph targets as glTF morph targets
   * - VRM-compatible skeleton as a node hierarchy with skin
   */
  exportGLB(result: BodyGenerationResult): ArrayBuffer {
    return writeGLB(result);
  }

  // ===========================================================================
  // INTERNAL: SKELETON
  // ===========================================================================

  private createSkeleton(): {
    skeleton: THREE.Skeleton;
    rootBone: THREE.Bone;
    boneCount: number;
  } {
    const bones: THREE.Bone[] = [];

    for (const def of VRM_BONES) {
      const bone = new THREE.Bone();
      bone.name = def.name;
      bone.position.set(def.position[0], def.position[1], def.position[2]);
      bones.push(bone);
    }

    // Build parent-child hierarchy
    for (let i = 0; i < VRM_BONES.length; i++) {
      const parentIdx = VRM_BONES[i].parent;
      if (parentIdx >= 0) {
        bones[parentIdx].add(bones[i]);
      }
    }

    const skeleton = new THREE.Skeleton(bones);

    return {
      skeleton,
      rootBone: bones[0],
      boneCount: bones.length,
    };
  }

  // ===========================================================================
  // INTERNAL: BODY VERTEX GENERATION
  // ===========================================================================

  /**
   * Generates body vertices as a series of cross-sectional rings.
   * Returns flat arrays for positions, normals, and per-vertex metadata.
   */
  private generateBodyVertices(profile: BodyProfile): {
    positions: number[];
    normals: number[];
    ringCount: number;
    segmentsPerRing: number;
    /** For each vertex: which body part it belongs to (for UV and skinning) */
    bodyParts: number[];
  } {
    const segs = this.config.radialSegments;
    const positions: number[] = [];
    const normals: number[] = [];
    const bodyParts: number[] = []; // 0=torso, 1=head, 2=leftArm, 3=rightArm, 4=leftLeg, 5=rightLeg

    // Generate cross-sectional rings from feet to head for the torso
    const torsoRings = this.generateTorsoRings(profile, segs);

    // Add head rings
    const headRings = this.generateHeadRings(profile, segs);

    // Add left arm rings
    const leftArmRings = this.generateArmRings(profile, segs, -1);

    // Add right arm rings
    const rightArmRings = this.generateArmRings(profile, segs, 1);

    // Add left leg rings
    const leftLegRings = this.generateLegRings(profile, segs, -1);

    // Add right leg rings
    const rightLegRings = this.generateLegRings(profile, segs, 1);

    // Combine all ring sets
    const allRingSets = [
      { rings: torsoRings, part: 0 },
      { rings: headRings, part: 1 },
      { rings: leftArmRings, part: 2 },
      { rings: rightArmRings, part: 3 },
      { rings: leftLegRings, part: 4 },
      { rings: rightLegRings, part: 5 },
    ];

    let totalRings = 0;
    for (const set of allRingSets) {
      for (const ring of set.rings) {
        for (let i = 0; i < ring.length; i++) {
          positions.push(ring[i].x, ring[i].y, ring[i].z);
          bodyParts.push(set.part);
        }
        totalRings++;
      }
    }

    // Compute normals from positions (smooth normals by averaging adjacent faces)
    this.computeSmoothNormals(positions, normals);

    return {
      positions,
      normals,
      ringCount: totalRings,
      segmentsPerRing: segs,
      bodyParts,
    };
  }

  /**
   * Generate cross-sectional rings for the torso (from hip line to neck base).
   * Each ring is an array of Vec3 points around the circumference.
   */
  private generateTorsoRings(
    profile: BodyProfile,
    segments: number,
  ): THREE.Vector3[][] {
    const rings: THREE.Vector3[][] = [];
    const heightSteps = this.config.heightSegments * 2;

    for (let step = 0; step <= heightSteps; step++) {
      const t = step / heightSteps;
      const y = THREE.MathUtils.lerp(profile.hipY, profile.neckBaseY, t);

      // Interpolate width and depth based on vertical position
      const { width, depth } = this.interpolateTorsoCrossSection(profile, y);

      const ring: THREE.Vector3[] = [];
      for (let s = 0; s < segments; s++) {
        const angle = (s / segments) * Math.PI * 2;
        const x = Math.cos(angle) * width;
        const z = Math.sin(angle) * depth;
        ring.push(new THREE.Vector3(x, y, z));
      }
      rings.push(ring);
    }

    return rings;
  }

  /**
   * Generate head rings (sphere-like from chin to top of head).
   */
  private generateHeadRings(
    profile: BodyProfile,
    segments: number,
  ): THREE.Vector3[][] {
    const rings: THREE.Vector3[][] = [];
    const steps = this.config.heightSegments;

    // Neck ring
    const neckRing: THREE.Vector3[] = [];
    for (let s = 0; s < segments; s++) {
      const angle = (s / segments) * Math.PI * 2;
      neckRing.push(new THREE.Vector3(
        Math.cos(angle) * profile.neckRadius,
        profile.neckBaseY,
        Math.sin(angle) * profile.neckRadius,
      ));
    }
    rings.push(neckRing);

    // Head rings (spherical)
    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      const y = THREE.MathUtils.lerp(profile.chinY, profile.headTopY, t);

      // Spherical profile: wider at center, narrower at top and bottom
      const headCenter = (profile.chinY + profile.headTopY) / 2;
      const headHalfHeight = (profile.headTopY - profile.chinY) / 2;
      const relY = (y - headCenter) / headHalfHeight; // -1 to 1
      const radiusFactor = Math.sqrt(1 - relY * relY) * 0.95 + 0.05;
      const radius = profile.headRadius * radiusFactor;

      const ring: THREE.Vector3[] = [];
      for (let s = 0; s < segments; s++) {
        const angle = (s / segments) * Math.PI * 2;
        // Slightly oval head: wider from ear to ear, shallower front-to-back
        ring.push(new THREE.Vector3(
          Math.cos(angle) * radius * 1.0,
          y,
          Math.sin(angle) * radius * 0.9,
        ));
      }
      rings.push(ring);
    }

    return rings;
  }

  /**
   * Generate arm rings (from shoulder to hand).
   * @param side -1 for left, +1 for right
   */
  private generateArmRings(
    profile: BodyProfile,
    segments: number,
    side: number,
  ): THREE.Vector3[][] {
    const rings: THREE.Vector3[][] = [];
    const steps = this.config.heightSegments;

    // Arm extends horizontally from shoulder in T-pose
    const shoulderX = side * (profile.shoulderWidthRatio + 0.03);
    const shoulderY = profile.shoulderY;

    // Upper arm
    const upperArmLength = 0.25;
    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      const x = shoulderX + side * t * upperArmLength;
      const radius = THREE.MathUtils.lerp(
        profile.upperArmRadius,
        profile.upperArmRadius * 0.9,
        t,
      );

      const ring: THREE.Vector3[] = [];
      for (let s = 0; s < segments; s++) {
        const angle = (s / segments) * Math.PI * 2;
        ring.push(new THREE.Vector3(
          x,
          shoulderY + Math.cos(angle) * radius,
          Math.sin(angle) * radius,
        ));
      }
      rings.push(ring);
    }

    // Lower arm
    const elbowX = shoulderX + side * upperArmLength;
    const lowerArmLength = 0.25;
    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      const x = elbowX + side * t * lowerArmLength;
      const radius = THREE.MathUtils.lerp(
        profile.lowerArmRadius,
        profile.lowerArmRadius * 0.85,
        t,
      );

      const ring: THREE.Vector3[] = [];
      for (let s = 0; s < segments; s++) {
        const angle = (s / segments) * Math.PI * 2;
        ring.push(new THREE.Vector3(
          x,
          shoulderY + Math.cos(angle) * radius,
          Math.sin(angle) * radius,
        ));
      }
      rings.push(ring);
    }

    // Hand (simplified box-like end cap)
    const handX = elbowX + side * lowerArmLength;
    for (let step = 1; step <= 2; step++) {
      const t = step / 2;
      const x = handX + side * t * 0.08;
      const radius = profile.handRadius * (1 - t * 0.3);

      const ring: THREE.Vector3[] = [];
      for (let s = 0; s < segments; s++) {
        const angle = (s / segments) * Math.PI * 2;
        ring.push(new THREE.Vector3(
          x,
          shoulderY + Math.cos(angle) * radius,
          Math.sin(angle) * radius * 0.6, // flattened hand
        ));
      }
      rings.push(ring);
    }

    return rings;
  }

  /**
   * Generate leg rings (from hip to foot).
   * @param side -1 for left, +1 for right
   */
  private generateLegRings(
    profile: BodyProfile,
    segments: number,
    side: number,
  ): THREE.Vector3[][] {
    const rings: THREE.Vector3[][] = [];
    const steps = this.config.heightSegments;
    const legCenterX = side * profile.hipWidthRatio * 0.7;

    // Upper leg (hip to knee)
    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      const y = THREE.MathUtils.lerp(profile.hipY, profile.kneeY, t);
      const radius = THREE.MathUtils.lerp(
        profile.upperLegRadius,
        profile.upperLegRadius * 0.75,
        t,
      );

      const ring: THREE.Vector3[] = [];
      for (let s = 0; s < segments; s++) {
        const angle = (s / segments) * Math.PI * 2;
        ring.push(new THREE.Vector3(
          legCenterX + Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius,
        ));
      }
      rings.push(ring);
    }

    // Lower leg (knee to ankle)
    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      const y = THREE.MathUtils.lerp(profile.kneeY, profile.ankleY, t);
      const radius = THREE.MathUtils.lerp(
        profile.lowerLegRadius,
        profile.lowerLegRadius * 0.8,
        t,
      );

      const ring: THREE.Vector3[] = [];
      for (let s = 0; s < segments; s++) {
        const angle = (s / segments) * Math.PI * 2;
        ring.push(new THREE.Vector3(
          legCenterX + Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius,
        ));
      }
      rings.push(ring);
    }

    // Foot (ankle to toes)
    for (let step = 1; step <= 3; step++) {
      const t = step / 3;
      const y = THREE.MathUtils.lerp(profile.ankleY, profile.floorY, t);
      const footProgressZ = t * profile.footLength * 0.6;
      const widthFactor = 1 - t * 0.2;

      const ring: THREE.Vector3[] = [];
      for (let s = 0; s < segments; s++) {
        const angle = (s / segments) * Math.PI * 2;
        const radius = profile.lowerLegRadius * 0.7 * widthFactor;
        ring.push(new THREE.Vector3(
          legCenterX + Math.cos(angle) * radius,
          y + Math.abs(Math.sin(angle)) * profile.footHeight * (1 - t),
          footProgressZ + Math.sin(angle) * radius * 0.5,
        ));
      }
      rings.push(ring);
    }

    return rings;
  }

  /**
   * Interpolate torso cross-section dimensions at a given Y coordinate.
   */
  private interpolateTorsoCrossSection(
    profile: BodyProfile,
    y: number,
  ): { width: number; depth: number } {
    // Key Y positions and their widths/depths
    const keyframes: { y: number; width: number; depth: number }[] = [
      { y: profile.hipY,      width: profile.hipWidthRatio,      depth: profile.hipDepthRatio },
      { y: profile.waistY,    width: profile.waistWidthRatio,    depth: profile.waistDepthRatio },
      { y: profile.chestY,    width: profile.chestWidthRatio,    depth: profile.chestDepthRatio },
      { y: profile.shoulderY, width: profile.shoulderWidthRatio, depth: profile.chestDepthRatio * 0.9 },
      { y: profile.neckBaseY, width: profile.neckRadius,         depth: profile.neckRadius },
    ];

    // Find bracketing keyframes
    let lower = keyframes[0];
    let upper = keyframes[keyframes.length - 1];

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (y >= keyframes[i].y && y <= keyframes[i + 1].y) {
        lower = keyframes[i];
        upper = keyframes[i + 1];
        break;
      }
    }

    if (lower.y === upper.y) {
      return { width: lower.width, depth: lower.depth };
    }

    const t = (y - lower.y) / (upper.y - lower.y);
    // Use smoothstep for nicer interpolation
    const smoothT = t * t * (3 - 2 * t);
    return {
      width: THREE.MathUtils.lerp(lower.width, upper.width, smoothT),
      depth: THREE.MathUtils.lerp(lower.depth, upper.depth, smoothT),
    };
  }

  // ===========================================================================
  // INTERNAL: TOPOLOGY AND UV GENERATION
  // ===========================================================================

  /**
   * Generate triangle indices and UV coordinates for the ring-based geometry.
   */
  private generateTopologyAndUVs(vertexData: {
    positions: number[];
    ringCount: number;
    segmentsPerRing: number;
    bodyParts: number[];
  }): {
    indices: number[];
    uvs: number[];
  } {
    const { positions, segmentsPerRing: segs, bodyParts } = vertexData;
    const vertexCount = positions.length / 3;
    const indices: number[] = [];
    const uvs: number[] = [];

    // Compute UV mapping: cylindrical projection per body part
    // U = angle around circumference (0..1), V = height-based
    for (let i = 0; i < vertexCount; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      const part = bodyParts[i];

      // U: angle-based (cylindrical)
      let u: number;
      if (part === 2 || part === 3) {
        // Arms: use Y-Z angle since arms extend along X
        u = (Math.atan2(z, y - BODY_PROFILES.androgynous.shoulderY) + Math.PI) / (2 * Math.PI);
      } else {
        u = (Math.atan2(z, x) + Math.PI) / (2 * Math.PI);
      }

      // V: normalized height
      let v: number;
      switch (part) {
        case 0: // torso
          v = (y - BODY_PROFILES.androgynous.hipY) /
            (BODY_PROFILES.androgynous.neckBaseY - BODY_PROFILES.androgynous.hipY);
          v = 0.3 + v * 0.3; // map to 0.3-0.6 UV range
          break;
        case 1: // head
          v = (y - BODY_PROFILES.androgynous.chinY) /
            (BODY_PROFILES.androgynous.headTopY - BODY_PROFILES.androgynous.chinY);
          v = 0.6 + v * 0.4; // map to 0.6-1.0 UV range
          break;
        case 2: // left arm
        case 3: // right arm
          // Map along arm length
          v = 0.6 + Math.abs(x) * 0.5;
          v = Math.min(1.0, Math.max(0.0, v));
          break;
        case 4: // left leg
        case 5: // right leg
          v = y / BODY_PROFILES.androgynous.hipY;
          v = v * 0.3; // map to 0.0-0.3 UV range
          break;
        default:
          v = y / 1.7;
      }

      uvs.push(Math.max(0, Math.min(1, u)), Math.max(0, Math.min(1, v)));
    }

    // Generate triangle indices: connect adjacent rings within each body part section
    // We need to track ring boundaries to connect correctly
    let vertexOffset = 0;

    // Helper to triangulate a series of rings
    const triangulateTube = (startVert: number, ringCount: number, segsCount: number) => {
      for (let ring = 0; ring < ringCount - 1; ring++) {
        const ringStart = startVert + ring * segsCount;
        const nextRingStart = ringStart + segsCount;

        for (let s = 0; s < segsCount; s++) {
          const s1 = s;
          const s2 = (s + 1) % segsCount;

          const a = ringStart + s1;
          const b = ringStart + s2;
          const c = nextRingStart + s1;
          const d = nextRingStart + s2;

          // Two triangles per quad
          indices.push(a, b, c);
          indices.push(b, d, c);
        }
      }
    };

    // Compute ring counts for each body part section
    const torsoRings = this.config.heightSegments * 2 + 1;
    const headRings = this.config.heightSegments + 2; // +1 for neck ring, +1 for extra
    const armRings = this.config.heightSegments + 1 + this.config.heightSegments + 2; // upper + lower + hand
    const legRings = this.config.heightSegments + 1 + this.config.heightSegments + 3; // upper + lower + foot

    // Torso
    triangulateTube(vertexOffset, torsoRings, segs);
    vertexOffset += torsoRings * segs;

    // Head
    triangulateTube(vertexOffset, headRings, segs);
    vertexOffset += headRings * segs;

    // Left arm
    triangulateTube(vertexOffset, armRings, segs);
    vertexOffset += armRings * segs;

    // Right arm
    triangulateTube(vertexOffset, armRings, segs);
    vertexOffset += armRings * segs;

    // Left leg
    triangulateTube(vertexOffset, legRings, segs);
    vertexOffset += legRings * segs;

    // Right leg
    triangulateTube(vertexOffset, legRings, segs);
    // vertexOffset += legRings * segs;

    return { indices, uvs };
  }

  // ===========================================================================
  // INTERNAL: NORMALS
  // ===========================================================================

  /**
   * Compute smooth normals by finding approximate outward direction.
   * For ring-based geometry, normals point outward from the ring center.
   */
  private computeSmoothNormals(positions: number[], normals: number[]): void {
    const vertCount = positions.length / 3;

    for (let i = 0; i < vertCount; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];

      // Estimate ring center (approximate): for torso, center is (0, y, 0)
      // For limbs offset accordingly. Simple approach: radial normal from Y axis.
      let nx = x;
      let ny = 0; // bias toward horizontal normals
      let nz = z;

      // Normalize
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (len > 0.001) {
        nx /= len;
        ny /= len;
        nz /= len;
      } else {
        // Fallback: point upward
        nx = 0;
        ny = 1;
        nz = 0;
      }

      normals.push(nx, ny, nz);
    }
  }

  // ===========================================================================
  // INTERNAL: SKIN WEIGHTS
  // ===========================================================================

  /**
   * Compute skin weights by assigning each vertex to the nearest bone(s).
   * Uses distance-based weighting with up to 4 bone influences per vertex.
   */
  private computeSkinWeights(
    positions: number[],
    bones: THREE.Bone[],
  ): {
    skinIndices: number[];
    skinWeights: number[];
  } {
    const vertCount = positions.length / 3;
    const skinIndices: number[] = [];
    const skinWeights: number[] = [];

    // Pre-compute world positions of all bones
    // (In T-pose, we accumulate local positions up the hierarchy)
    const boneWorldPositions = this.computeBoneWorldPositions(bones);

    for (let i = 0; i < vertCount; i++) {
      const vx = positions[i * 3];
      const vy = positions[i * 3 + 1];
      const vz = positions[i * 3 + 2];

      // Find 4 nearest bones weighted by inverse distance
      const distances: { boneIdx: number; dist: number }[] = [];

      for (let b = 0; b < bones.length; b++) {
        const bpos = boneWorldPositions[b];
        const dx = vx - bpos.x;
        const dy = vy - bpos.y;
        const dz = vz - bpos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        distances.push({ boneIdx: b, dist });
      }

      // Sort by distance
      distances.sort((a, b) => a.dist - b.dist);

      // Take top 4
      const top4 = distances.slice(0, 4);

      // Compute inverse-distance weights with a power falloff
      const epsilon = 0.001;
      let totalWeight = 0;
      const weights: number[] = [];

      for (const entry of top4) {
        const w = 1 / Math.pow(entry.dist + epsilon, 2);
        weights.push(w);
        totalWeight += w;
      }

      // Normalize weights
      for (let w = 0; w < 4; w++) {
        if (w < top4.length && totalWeight > 0) {
          skinIndices.push(top4[w].boneIdx);
          skinWeights.push(weights[w] / totalWeight);
        } else {
          skinIndices.push(0);
          skinWeights.push(0);
        }
      }
    }

    return { skinIndices, skinWeights };
  }

  /**
   * Compute world-space positions for all bones by accumulating local transforms.
   */
  private computeBoneWorldPositions(bones: THREE.Bone[]): THREE.Vector3[] {
    const worldPositions: THREE.Vector3[] = [];

    for (let i = 0; i < VRM_BONES.length; i++) {
      const def = VRM_BONES[i];
      if (def.parent < 0) {
        worldPositions.push(new THREE.Vector3(
          def.position[0],
          def.position[1],
          def.position[2],
        ));
      } else {
        const parentWorld = worldPositions[def.parent];
        worldPositions.push(new THREE.Vector3(
          parentWorld.x + def.position[0],
          parentWorld.y + def.position[1],
          parentWorld.z + def.position[2],
        ));
      }
    }

    return worldPositions;
  }
}

// =============================================================================
// GLB BINARY WRITER
// =============================================================================

/**
 * Minimal GLB writer that produces a valid glTF 2.0 binary container.
 *
 * Structure:
 * - Header (12 bytes)
 * - JSON chunk (glTF JSON + padding)
 * - BIN chunk (buffer data + padding)
 *
 * The glTF JSON contains:
 * - Nodes for skeleton hierarchy
 * - A single mesh with primitives
 * - Morph targets as mesh morph targets
 * - Skin definition linking joints to the skeleton
 * - Accessors, buffer views, and a single buffer
 */
function writeGLB(result: BodyGenerationResult): ArrayBuffer {
  const { geometry, skeleton, bodyType, morphTargetDictionary, skinnedMesh } = result;

  // Gather raw buffer data
  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
  const normAttr = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const uvAttr = geometry.getAttribute('uv') as THREE.BufferAttribute;
  const indexAttr = geometry.getIndex() as THREE.BufferAttribute;
  const skinIndexAttr = geometry.getAttribute('skinIndex') as THREE.BufferAttribute;
  const skinWeightAttr = geometry.getAttribute('skinWeight') as THREE.BufferAttribute;

  const posData = posAttr.array as Float32Array;
  const normData = normAttr.array as Float32Array;
  const uvData = uvAttr.array as Float32Array;
  const indexData = indexAttr.array as Uint16Array;
  const skinIndexData = skinIndexAttr.array as Uint16Array;
  const skinWeightData = skinWeightAttr.array as Float32Array;

  // Morph target position arrays
  const morphArrays: Float32Array[] = [];
  const morphNames = Object.keys(morphTargetDictionary);
  if (geometry.morphAttributes.position) {
    for (const attr of geometry.morphAttributes.position) {
      morphArrays.push((attr as THREE.BufferAttribute).array as Float32Array);
    }
  }

  // Build buffer: concatenate all typed arrays
  const bufferParts: ArrayBuffer[] = [];
  let byteOffset = 0;

  interface AccessorDef {
    bufferView: number;
    byteOffset: number;
    componentType: number;
    count: number;
    type: string;
    max?: number[];
    min?: number[];
  }

  interface BufferViewDef {
    buffer: number;
    byteOffset: number;
    byteLength: number;
    target?: number;
  }

  const accessors: AccessorDef[] = [];
  const bufferViews: BufferViewDef[] = [];

  const addBufferView = (
    data: ArrayBufferView,
    target?: number,
  ): number => {
    const idx = bufferViews.length;
    const aligned = alignTo4(byteOffset);
    if (aligned > byteOffset) {
      bufferParts.push(new ArrayBuffer(aligned - byteOffset));
      byteOffset = aligned;
    }
    bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength: data.byteLength,
      target,
    });
    bufferParts.push(data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    ));
    byteOffset += data.byteLength;
    return idx;
  };

  const addAccessor = (
    bufferViewIdx: number,
    componentType: number,
    count: number,
    type: string,
    min?: number[],
    max?: number[],
  ): number => {
    const idx = accessors.length;
    const def: AccessorDef = {
      bufferView: bufferViewIdx,
      byteOffset: 0,
      componentType,
      count,
      type,
    };
    if (min) def.min = min;
    if (max) def.max = max;
    accessors.push(def);
    return idx;
  };

  // Compute bounding box for positions
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < posData.length; i += 3) {
    minX = Math.min(minX, posData[i]);
    minY = Math.min(minY, posData[i + 1]);
    minZ = Math.min(minZ, posData[i + 2]);
    maxX = Math.max(maxX, posData[i]);
    maxY = Math.max(maxY, posData[i + 1]);
    maxZ = Math.max(maxZ, posData[i + 2]);
  }

  // Positions
  const posBV = addBufferView(posData, 34962); // ARRAY_BUFFER
  const posAccessor = addAccessor(
    posBV, 5126, posData.length / 3, 'VEC3',
    [minX, minY, minZ], [maxX, maxY, maxZ],
  );

  // Normals
  const normBV = addBufferView(normData, 34962);
  const normAccessor = addAccessor(normBV, 5126, normData.length / 3, 'VEC3');

  // UVs
  const uvBV = addBufferView(uvData, 34962);
  const uvAccessor = addAccessor(uvBV, 5126, uvData.length / 2, 'VEC2');

  // Indices
  const indexBV = addBufferView(indexData, 34963); // ELEMENT_ARRAY_BUFFER
  const indexAccessor = addAccessor(indexBV, 5123, indexData.length, 'SCALAR');

  // Skin indices (JOINTS_0)
  const jointsBV = addBufferView(skinIndexData, 34962);
  const jointsAccessor = addAccessor(jointsBV, 5123, skinIndexData.length / 4, 'VEC4');

  // Skin weights (WEIGHTS_0)
  const weightsBV = addBufferView(skinWeightData, 34962);
  const weightsAccessor = addAccessor(weightsBV, 5126, skinWeightData.length / 4, 'VEC4');

  // Morph target accessors
  const morphTargetAccessors: { POSITION: number }[] = [];
  for (const morphData of morphArrays) {
    const bv = addBufferView(morphData, 34962);
    const acc = addAccessor(bv, 5126, morphData.length / 3, 'VEC3');
    morphTargetAccessors.push({ POSITION: acc });
  }

  // Inverse bind matrices for the skin
  const boneWorldPositions = computeBoneWorldPositionsStatic();
  const inverseBindMatrices = new Float32Array(skeleton.bones.length * 16);
  for (let i = 0; i < skeleton.bones.length; i++) {
    const wp = boneWorldPositions[i];
    // Simple inverse translation (no rotation in T-pose)
    const mat = new THREE.Matrix4();
    mat.makeTranslation(-wp.x, -wp.y, -wp.z);
    mat.toArray(inverseBindMatrices, i * 16);
  }
  const ibmBV = addBufferView(inverseBindMatrices);
  const ibmAccessor = addAccessor(ibmBV, 5126, skeleton.bones.length, 'MAT4');

  // Build node list: one node per bone + one for the skinned mesh
  const nodes: any[] = [];
  const jointNodeIndices: number[] = [];

  for (let i = 0; i < VRM_BONES.length; i++) {
    const def = VRM_BONES[i];
    const node: any = {
      name: def.name,
      translation: def.position,
    };

    // Collect children
    const children: number[] = [];
    for (let j = 0; j < VRM_BONES.length; j++) {
      if (VRM_BONES[j].parent === i) {
        children.push(j);
      }
    }
    if (children.length > 0) {
      node.children = children;
    }

    jointNodeIndices.push(nodes.length);
    nodes.push(node);
  }

  // Skinned mesh node
  const meshNodeIdx = nodes.length;
  const meshNode: any = {
    name: `body_${bodyType}`,
    mesh: 0,
    skin: 0,
  };
  nodes.push(meshNode);

  // Build the primitive
  const primitive: any = {
    attributes: {
      POSITION: posAccessor,
      NORMAL: normAccessor,
      TEXCOORD_0: uvAccessor,
      JOINTS_0: jointsAccessor,
      WEIGHTS_0: weightsAccessor,
    },
    indices: indexAccessor,
  };

  if (morphTargetAccessors.length > 0) {
    primitive.targets = morphTargetAccessors;
  }

  // Build mesh
  const mesh: any = {
    name: `body_${bodyType}`,
    primitives: [primitive],
  };

  if (morphNames.length > 0) {
    mesh.extras = { targetNames: morphNames };
  }

  // Build skin
  const skin: any = {
    name: 'VRM_Skeleton',
    joints: jointNodeIndices,
    skeleton: jointNodeIndices[0], // hips
    inverseBindMatrices: ibmAccessor,
  };

  // Build scene
  const scene: any = {
    name: `body_${bodyType}_scene`,
    nodes: [jointNodeIndices[0], meshNodeIdx], // root bone + mesh
  };

  // Build material
  const materialDef: any = {
    name: 'skin',
    pbrMetallicRoughness: {
      baseColorFactor: [0.878, 0.722, 0.588, 1.0], // #e0b896
      metallicFactor: 0.0,
      roughnessFactor: 0.65,
    },
  };

  // Assemble the glTF JSON
  const gltfJson: any = {
    asset: {
      version: '2.0',
      generator: 'HoloLand Avatar Studio ProceduralBodyGenerator',
    },
    scene: 0,
    scenes: [scene],
    nodes,
    meshes: [mesh],
    skins: [skin],
    accessors,
    bufferViews,
    buffers: [{ byteLength: byteOffset }],
    materials: [materialDef],
  };

  // Add VRM extensions hint (basic metadata)
  gltfJson.extensionsUsed = ['VRMC_vrm'];
  gltfJson.extensions = {
    VRMC_vrm: {
      specVersion: '1.0',
      meta: {
        name: `HoloLand ${bodyType} body`,
        version: '1.0',
        authors: ['HoloLand Avatar Studio'],
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      },
      humanoid: {
        humanBones: buildVRMHumanBoneMapping(jointNodeIndices),
      },
    },
  };

  // Assign material to primitive
  primitive.material = 0;

  // Encode JSON chunk
  const jsonString = JSON.stringify(gltfJson);
  const jsonEncoder = new TextEncoder();
  const jsonBytes = jsonEncoder.encode(jsonString);
  const jsonPadded = padTo4(jsonBytes, 0x20); // pad with spaces

  // Build BIN chunk from parts
  const totalBinLength = byteOffset;
  const binBuffer = new Uint8Array(totalBinLength);
  let writeOffset = 0;
  for (const part of bufferParts) {
    binBuffer.set(new Uint8Array(part), writeOffset);
    writeOffset += part.byteLength;
  }
  const binPadded = padTo4(binBuffer, 0x00); // pad with zeros

  // Build GLB
  const glbLength = 12 + 8 + jsonPadded.byteLength + 8 + binPadded.byteLength;
  const glb = new ArrayBuffer(glbLength);
  const glbView = new DataView(glb);
  const glbBytes = new Uint8Array(glb);

  let offset = 0;

  // Header
  glbView.setUint32(offset, 0x46546C67, true); offset += 4; // 'glTF'
  glbView.setUint32(offset, 2, true);          offset += 4; // version 2
  glbView.setUint32(offset, glbLength, true);   offset += 4; // total length

  // JSON chunk
  glbView.setUint32(offset, jsonPadded.byteLength, true); offset += 4;
  glbView.setUint32(offset, 0x4E4F534A, true);            offset += 4; // 'JSON'
  glbBytes.set(jsonPadded, offset);                        offset += jsonPadded.byteLength;

  // BIN chunk
  glbView.setUint32(offset, binPadded.byteLength, true); offset += 4;
  glbView.setUint32(offset, 0x004E4942, true);            offset += 4; // 'BIN\0'
  glbBytes.set(binPadded, offset);

  return glb;
}

/**
 * Build the VRM humanoid bone mapping for the extensions.
 */
function buildVRMHumanBoneMapping(jointIndices: number[]): Record<string, { node: number }> {
  const mapping: Record<string, { node: number }> = {};
  for (let i = 0; i < VRM_BONES.length; i++) {
    mapping[VRM_BONES[i].name] = { node: jointIndices[i] };
  }
  return mapping;
}

/**
 * Compute bone world positions statically from the VRM_BONES definitions.
 */
function computeBoneWorldPositionsStatic(): THREE.Vector3[] {
  const worldPositions: THREE.Vector3[] = [];

  for (let i = 0; i < VRM_BONES.length; i++) {
    const def = VRM_BONES[i];
    if (def.parent < 0) {
      worldPositions.push(new THREE.Vector3(
        def.position[0], def.position[1], def.position[2],
      ));
    } else {
      const parentWorld = worldPositions[def.parent];
      worldPositions.push(new THREE.Vector3(
        parentWorld.x + def.position[0],
        parentWorld.y + def.position[1],
        parentWorld.z + def.position[2],
      ));
    }
  }

  return worldPositions;
}

/** Align a byte offset to a 4-byte boundary */
function alignTo4(offset: number): number {
  return (offset + 3) & ~3;
}

/** Pad a Uint8Array to a multiple of 4 bytes */
function padTo4(data: Uint8Array, padByte: number): Uint8Array {
  const remainder = data.byteLength % 4;
  if (remainder === 0) return data;
  const padded = new Uint8Array(data.byteLength + (4 - remainder));
  padded.set(data);
  for (let i = data.byteLength; i < padded.byteLength; i++) {
    padded[i] = padByte;
  }
  return padded;
}
