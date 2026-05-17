/**
 * Types for the VRM Avatar Editor components.
 *
 * These types define the data structures used across the VRM editor
 * panel suite: blend shapes, skeleton bones, morph targets, RPM
 * integration, triangle budgets, and material quality settings.
 */

// ---------------------------------------------------------------------------
// Blend Shapes
// ---------------------------------------------------------------------------

export type BlendShapeCategory = 'eye' | 'mouth' | 'expression' | 'custom';

export interface BlendShapeDefinition {
  name: string;
  category: BlendShapeCategory;
  label: string;
  defaultValue: number;
}

export interface BlendShapeValues {
  [shapeName: string]: number;
}

// ---------------------------------------------------------------------------
// Skeleton / Bones
// ---------------------------------------------------------------------------

export type HumanoidBoneGroup =
  | 'spine'
  | 'head'
  | 'leftArm'
  | 'rightArm'
  | 'leftLeg'
  | 'rightLeg'
  | 'leftHand'
  | 'rightHand';

export interface BoneNode {
  name: string;
  humanoidName: string;
  group: HumanoidBoneGroup;
  position: [number, number, number];
  rotation: [number, number, number, number];
  children: string[];
}

export interface IKChain {
  name: string;
  bones: string[];
  color: string;
}

// ---------------------------------------------------------------------------
// Morph Targets
// ---------------------------------------------------------------------------

export type ExpressionPresetName = 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral';

export interface MorphTargetWeight {
  name: string;
  weight: number;
}

export interface ExpressionPresetConfig {
  name: ExpressionPresetName;
  label: string;
  icon: string;
  weights: MorphTargetWeight[];
}

// ---------------------------------------------------------------------------
// Ready Player Me
// ---------------------------------------------------------------------------

export type RPMImportStatus =
  | 'idle'
  | 'validating'
  | 'downloading'
  | 'converting'
  | 'complete'
  | 'error';

export interface RPMAvatarMetadata {
  id: string;
  gender: string;
  bodyType: string;
  createdAt: string;
  assets: string[];
  polyCount: number;
  textureCount: number;
}

// ---------------------------------------------------------------------------
// Triangle Budget
// ---------------------------------------------------------------------------

export type PlatformTarget = 'quest' | 'desktopVR' | 'mobileAR';

export interface TriangleBudget {
  platform: PlatformTarget;
  label: string;
  budget: number;
  current: number;
  color: string;
  warningThreshold: number;
}

// ---------------------------------------------------------------------------
// Material Quality
// ---------------------------------------------------------------------------

export type TextureResolution = 256 | 512 | 1024 | 2048 | 4096;

export type LODLevel = 0 | 1 | 2 | 3;

export interface MaterialQualitySettings {
  textureResolution: TextureResolution;
  enablePBR: boolean;
  enableNormalMap: boolean;
  enableEmissive: boolean;
  enableAO: boolean;
  enableMetallicRoughness: boolean;
  lodLevel: LODLevel;
  enableMipmaps: boolean;
  textureCompression: 'none' | 'basis' | 'ktx2';
}

// ---------------------------------------------------------------------------
// VRM File Info
// ---------------------------------------------------------------------------

export interface VRMFileInfo {
  fileName: string;
  fileSize: number;
  version: string;
  triangleCount: number;
  materialCount: number;
  textureCount: number;
  boneCount: number;
  blendShapeCount: number;
  thumbnailUrl?: string;
}

// ---------------------------------------------------------------------------
// Avatar Editor State
// ---------------------------------------------------------------------------

export interface AvatarEditorState {
  vrmFile: VRMFileInfo | null;
  blendShapes: BlendShapeValues;
  bones: BoneNode[];
  ikChains: IKChain[];
  materialSettings: MaterialQualitySettings;
  triangleBudgets: TriangleBudget[];
  rpmStatus: RPMImportStatus;
  rpmMetadata: RPMAvatarMetadata | null;
  activePanel: AvatarEditorPanelId;
}

export type AvatarEditorPanelId =
  | 'blendShapes'
  | 'skeleton'
  | 'morphTargets'
  | 'rpm'
  | 'triangleBudget'
  | 'materials';
