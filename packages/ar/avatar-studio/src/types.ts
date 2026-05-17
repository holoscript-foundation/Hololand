/**
 * @hololand/avatar-studio - Type Definitions
 *
 * Comprehensive types for the VRM avatar authoring studio.
 * Designed to fill the Ready Player Me vacuum with an open, interoperable
 * avatar creation system built on the VRM standard.
 */

// =============================================================================
// CORE GEOMETRY TYPES
// =============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface ColorHex {
  hex: string;
}

// =============================================================================
// AVATAR BLUEPRINT - The complete avatar definition
// =============================================================================

/**
 * AvatarBlueprint is the central data model for an avatar being authored.
 * It is format-agnostic internally and can be exported to VRM, glTF, or
 * other formats.
 */
export interface AvatarBlueprint {
  /** Unique identifier for this blueprint */
  id: string;
  /** Human-readable name */
  name: string;
  /** Version for revision tracking */
  version: number;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  updatedAt: number;
  /** The author/creator ID */
  authorId?: string;
  /** Body configuration */
  body: BodyConfig;
  /** Face configuration */
  face: FaceConfig;
  /** Hair configuration */
  hair: HairConfig;
  /** Equipped clothing layers */
  clothing: ClothingSlot[];
  /** Equipped accessories */
  accessories: AccessorySlot[];
  /** Expression presets */
  expressions: ExpressionPreset[];
  /** VRM metadata for export */
  vrmMeta: VRMMetadata;
  /** Thumbnail data URL (generated from preview) */
  thumbnailDataUrl?: string;
}

// =============================================================================
// BODY CONFIGURATION
// =============================================================================

export type BodyPreset = 'slim' | 'average' | 'athletic' | 'heavy' | 'custom';
export type GenderPresentation = 'masculine' | 'feminine' | 'androgynous';

export interface BodyConfig {
  /** Body preset starting point */
  preset: BodyPreset;
  /** Gender presentation (affects base mesh proportions) */
  genderPresentation: GenderPresentation;
  /** Height in meters (0.5 - 2.5) */
  height: number;
  /** Body proportion sliders (0.0 - 1.0 each) */
  proportions: BodyProportions;
  /** Skin color */
  skinColor: ColorHex;
  /** Skin texture overlay (freckles, markings, etc.) */
  skinOverlay?: string;
}

export interface BodyProportions {
  /** Head size relative to body */
  headScale: number;
  /** Shoulder width */
  shoulderWidth: number;
  /** Chest size */
  chestSize: number;
  /** Waist size */
  waistSize: number;
  /** Hip width */
  hipWidth: number;
  /** Arm length */
  armLength: number;
  /** Leg length */
  legLength: number;
  /** Hand size */
  handSize: number;
  /** Foot size */
  footSize: number;
  /** Muscle definition (0 = none, 1 = very defined) */
  muscleTone: number;
}

// =============================================================================
// FACE CONFIGURATION
// =============================================================================

export type FaceShape = 'oval' | 'round' | 'square' | 'heart' | 'oblong' | 'diamond';
export type EyeShape = 'almond' | 'round' | 'hooded' | 'monolid' | 'upturned' | 'downturned';
export type NoseShape = 'straight' | 'button' | 'aquiline' | 'wide' | 'narrow';
export type LipShape = 'thin' | 'medium' | 'full' | 'bow';

export interface FaceConfig {
  /** Base face shape */
  shape: FaceShape;
  /** Detailed face morphs (0.0 - 1.0) */
  morphs: FaceMorphs;
  /** Eye configuration */
  eyes: EyeConfig;
  /** Nose configuration */
  nose: NoseConfig;
  /** Mouth configuration */
  mouth: MouthConfig;
  /** Eyebrow configuration */
  eyebrows: EyebrowConfig;
  /** Ear configuration */
  ears: EarConfig;
  /** Facial hair (optional) */
  facialHair?: FacialHairConfig;
  /** Face paint / markings / tattoos */
  faceOverlays: FaceOverlay[];
}

export interface FaceMorphs {
  /** Jaw width */
  jawWidth: number;
  /** Jaw height */
  jawHeight: number;
  /** Chin size */
  chinSize: number;
  /** Cheekbone height */
  cheekboneHeight: number;
  /** Cheek fullness */
  cheekFullness: number;
  /** Forehead height */
  foreheadHeight: number;
  /** Brow ridge prominence */
  browRidge: number;
}

export interface EyeConfig {
  shape: EyeShape;
  /** Iris color */
  irisColor: ColorHex;
  /** Pupil size */
  pupilSize: number;
  /** Eye separation distance */
  separation: number;
  /** Eye tilt angle */
  tilt: number;
  /** Eye size */
  size: number;
  /** Sclera (white) color */
  scleraColor: ColorHex;
  /** Heterochromia: different color for right eye */
  rightIrisColor?: ColorHex;
}

export interface NoseConfig {
  shape: NoseShape;
  /** Bridge width */
  bridgeWidth: number;
  /** Tip height */
  tipHeight: number;
  /** Nostril width */
  nostrilWidth: number;
  /** Overall size */
  size: number;
}

export interface MouthConfig {
  shape: LipShape;
  /** Lip color */
  lipColor: ColorHex;
  /** Width */
  width: number;
  /** Upper lip fullness */
  upperFullness: number;
  /** Lower lip fullness */
  lowerFullness: number;
}

export interface EyebrowConfig {
  /** Eyebrow style ID */
  styleId: string;
  /** Eyebrow color */
  color: ColorHex;
  /** Thickness */
  thickness: number;
  /** Arch height */
  archHeight: number;
  /** Separation from eyes */
  height: number;
}

export interface EarConfig {
  /** Ear size */
  size: number;
  /** Ear shape (0 = round, 1 = pointed) */
  pointedness: number;
  /** Ear attachment angle */
  angle: number;
}

export interface FacialHairConfig {
  /** Style ID from asset catalog */
  styleId: string;
  /** Color */
  color: ColorHex;
  /** Density (0 = light stubble, 1 = full) */
  density: number;
  /** Length (0 = short, 1 = long) */
  length: number;
}

export interface FaceOverlay {
  /** Overlay type */
  type: 'tattoo' | 'paint' | 'scar' | 'freckles' | 'blush' | 'custom';
  /** Asset ID */
  assetId: string;
  /** Position offset */
  offset: { x: number; y: number };
  /** Scale */
  scale: number;
  /** Rotation in degrees */
  rotation: number;
  /** Opacity */
  opacity: number;
  /** Tint color */
  tintColor?: ColorHex;
}

// =============================================================================
// HAIR CONFIGURATION
// =============================================================================

export type HairPhysicsMode = 'none' | 'simple' | 'full';

export interface HairConfig {
  /** Hair style ID from asset catalog */
  styleId: string;
  /** Primary hair color */
  primaryColor: ColorHex;
  /** Secondary/highlight color */
  secondaryColor?: ColorHex;
  /** Gradient position (0 = roots, 1 = tips) */
  gradientPosition: number;
  /** Hair physics simulation mode */
  physics: HairPhysicsMode;
  /** Hair length override (0.0 - 1.0, relative to style max) */
  lengthFactor: number;
  /** Hair volume/fluffiness */
  volume: number;
}

// =============================================================================
// CLOTHING & ACCESSORIES
// =============================================================================

export type ClothingSlotName =
  | 'head'
  | 'face'
  | 'neck'
  | 'upperBody'
  | 'lowerBody'
  | 'feet'
  | 'hands'
  | 'fullBody'
  | 'outerwear';

export type AccessorySlotName =
  | 'hat'
  | 'glasses'
  | 'earrings'
  | 'necklace'
  | 'braceletLeft'
  | 'braceletRight'
  | 'ringLeft'
  | 'ringRight'
  | 'backpack'
  | 'wings'
  | 'tail'
  | 'custom';

export interface ClothingSlot {
  /** Which body slot this occupies */
  slot: ClothingSlotName;
  /** Asset ID from the catalog or marketplace */
  assetId: string;
  /** Asset display name */
  name: string;
  /** Primary color override */
  primaryColor?: ColorHex;
  /** Secondary color override */
  secondaryColor?: ColorHex;
  /** Pattern/texture override ID */
  patternId?: string;
  /** Pattern tint */
  patternColor?: ColorHex;
  /** Fit adjustment (-1 to 1, tight to loose) */
  fit: number;
  /** Creator ID (for marketplace attribution) */
  creatorId?: string;
  /** Whether this item was purchased */
  purchased: boolean;
  /** Item rarity for marketplace */
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface AccessorySlot {
  /** Which accessory slot this occupies */
  slot: AccessorySlotName;
  /** Asset ID */
  assetId: string;
  /** Asset display name */
  name: string;
  /** Color override */
  color?: ColorHex;
  /** Scale factor */
  scale: number;
  /** Position offset from default slot position */
  offset: Vector3;
  /** Rotation offset */
  rotationOffset: Vector3;
  /** Creator ID */
  creatorId?: string;
  /** Whether this item was purchased */
  purchased: boolean;
  /** Item rarity */
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

// =============================================================================
// EXPRESSIONS
// =============================================================================

/**
 * VRM standard expression names plus custom ones
 */
export type StandardExpressionName =
  | 'happy'
  | 'angry'
  | 'sad'
  | 'relaxed'
  | 'surprised'
  | 'neutral'
  | 'aa'
  | 'ih'
  | 'ou'
  | 'ee'
  | 'oh'
  | 'blink'
  | 'blinkLeft'
  | 'blinkRight'
  | 'lookUp'
  | 'lookDown'
  | 'lookLeft'
  | 'lookRight';

export interface ExpressionPreset {
  /** Expression name */
  name: string;
  /** Whether this is a standard VRM expression */
  isStandard: boolean;
  /** Blend shape weights keyed by morph target name */
  blendShapeWeights: Record<string, number>;
  /** Texture overrides for this expression (e.g., mouth texture swap) */
  textureOverrides?: Record<string, string>;
  /** Preview icon URL */
  iconUrl?: string;
}

// =============================================================================
// VRM METADATA (for VRM export)
// =============================================================================

export type VRMAllowedUser = 'OnlyAuthor' | 'ExplicitlyLicensedPerson' | 'Everyone';
export type VRMLicenseType =
  | 'Redistribution_Prohibited'
  | 'CC0'
  | 'CC_BY'
  | 'CC_BY_NC'
  | 'CC_BY_SA'
  | 'CC_BY_NC_SA'
  | 'CC_BY_ND'
  | 'CC_BY_NC_ND'
  | 'Other';

export interface VRMMetadata {
  /** Avatar title */
  title: string;
  /** Avatar description */
  description: string;
  /** Author name */
  author: string;
  /** Contact information */
  contactInformation?: string;
  /** Reference URL */
  reference?: string;
  /** VRM version */
  version: '1.0';
  /** Allowed users */
  allowedUser: VRMAllowedUser;
  /** Allow violent usage */
  violentUsage: boolean;
  /** Allow sexual usage */
  sexualUsage: boolean;
  /** Commercial usage allowed */
  commercialUsage: boolean;
  /** License type */
  license: VRMLicenseType;
  /** Other license URL */
  otherLicenseUrl?: string;
}

// =============================================================================
// ASSET CATALOG TYPES
// =============================================================================

export type AssetCategory =
  | 'hair'
  | 'clothing'
  | 'accessory'
  | 'faceOverlay'
  | 'eyebrow'
  | 'facialHair'
  | 'animation'
  | 'expression';

export interface CatalogAsset {
  /** Unique asset ID */
  id: string;
  /** Display name */
  name: string;
  /** Category */
  category: AssetCategory;
  /** Sub-category for filtering */
  subcategory?: string;
  /** Tags for search */
  tags: string[];
  /** Thumbnail URL */
  thumbnailUrl: string;
  /** 3D model URL (glTF/GLB) */
  modelUrl: string;
  /** Compatible body types */
  compatibleBodies: BodyPreset[];
  /** Compatible gender presentations */
  compatibleGenders: GenderPresentation[];
  /** Creator ID */
  creatorId: string;
  /** Creator display name */
  creatorName: string;
  /** Price in platform currency (0 = free) */
  price: number;
  /** Rarity tier */
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  /** Whether this is a default/built-in asset */
  isDefault: boolean;
  /** Colorable regions */
  colorableRegions?: string[];
  /** Polygon count for performance budgeting */
  polyCount: number;
  /** Texture resolution */
  textureResolution: number;
  /** Download count */
  downloads: number;
  /** Average rating */
  rating: number;
  /** Review count */
  reviewCount: number;
}

// =============================================================================
// STUDIO SESSION STATE
// =============================================================================

export type StudioTab =
  | 'body'
  | 'face'
  | 'hair'
  | 'clothing'
  | 'accessories'
  | 'expressions'
  | 'export';

export type StudioViewAngle = 'front' | 'side' | 'back' | 'face-closeup' | 'full-body' | 'free';

export interface StudioSession {
  /** Current blueprint being edited */
  blueprint: AvatarBlueprint;
  /** Current active tab */
  activeTab: StudioTab;
  /** Camera view angle */
  viewAngle: StudioViewAngle;
  /** Undo history (serialized blueprint snapshots) */
  undoStack: string[];
  /** Redo history */
  redoStack: string[];
  /** Maximum undo depth */
  maxUndoDepth: number;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Session start time */
  startedAt: number;
  /** Background scene for preview */
  backgroundScene: 'studio-light' | 'studio-dark' | 'outdoor' | 'custom';
  /** Animation playing in preview */
  previewAnimation?: string;
  /** Performance budget */
  performanceBudget: PerformanceBudget;
}

export interface PerformanceBudget {
  /** Maximum total polygon count */
  maxPolyCount: number;
  /** Maximum texture memory in MB */
  maxTextureMemoryMB: number;
  /** Maximum draw calls */
  maxDrawCalls: number;
  /** Target platforms */
  targetPlatforms: ('desktop' | 'mobile' | 'quest' | 'visionpro')[];
}

// =============================================================================
// EXPORT CONFIGURATION
// =============================================================================

export type ExportFormat = 'vrm' | 'glb' | 'gltf' | 'fbx';
export type ExportQuality = 'full' | 'optimized' | 'mobile';

export interface ExportConfig {
  /** Output format */
  format: ExportFormat;
  /** Quality level */
  quality: ExportQuality;
  /** Include physics (spring bones, cloth) */
  includePhysics: boolean;
  /** Include expressions/blend shapes */
  includeExpressions: boolean;
  /** Texture resolution override */
  textureResolution?: 256 | 512 | 1024 | 2048 | 4096;
  /** Enable mesh optimization (merging, decimation) */
  optimizeMeshes: boolean;
  /** Target polygon count (for decimation) */
  targetPolyCount?: number;
  /** Compress textures (KTX2/Basis) */
  compressTextures: boolean;
  /** Include VRM metadata */
  includeVRMMeta: boolean;
  /** Include animation clips */
  includeAnimations: boolean;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

export type StudioEventType =
  | 'blueprint:changed'
  | 'blueprint:saved'
  | 'blueprint:loaded'
  | 'tab:changed'
  | 'view:changed'
  | 'asset:equipped'
  | 'asset:unequipped'
  | 'color:changed'
  | 'morph:changed'
  | 'expression:changed'
  | 'export:started'
  | 'export:completed'
  | 'export:failed'
  | 'undo'
  | 'redo'
  | 'preview:animation:changed'
  | 'performance:budget:exceeded';

export interface StudioEvent {
  type: StudioEventType;
  timestamp: number;
  data?: unknown;
}

export type StudioEventHandler = (event: StudioEvent) => void;

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULT_BODY_PROPORTIONS: BodyProportions = {
  headScale: 0.5,
  shoulderWidth: 0.5,
  chestSize: 0.5,
  waistSize: 0.5,
  hipWidth: 0.5,
  armLength: 0.5,
  legLength: 0.5,
  handSize: 0.5,
  footSize: 0.5,
  muscleTone: 0.3,
};

export const DEFAULT_FACE_MORPHS: FaceMorphs = {
  jawWidth: 0.5,
  jawHeight: 0.5,
  chinSize: 0.5,
  cheekboneHeight: 0.5,
  cheekFullness: 0.5,
  foreheadHeight: 0.5,
  browRidge: 0.3,
};

export const DEFAULT_PERFORMANCE_BUDGET: PerformanceBudget = {
  maxPolyCount: 70000,
  maxTextureMemoryMB: 75,
  maxDrawCalls: 32,
  targetPlatforms: ['desktop', 'quest'],
};

export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  format: 'vrm',
  quality: 'optimized',
  includePhysics: true,
  includeExpressions: true,
  optimizeMeshes: true,
  compressTextures: true,
  includeVRMMeta: true,
  includeAnimations: false,
};

export const DEFAULT_VRM_META: VRMMetadata = {
  title: 'HoloLand Avatar',
  description: 'Avatar created with HoloLand Avatar Studio',
  author: 'HoloLand User',
  version: '1.0',
  allowedUser: 'Everyone',
  violentUsage: false,
  sexualUsage: false,
  commercialUsage: true,
  license: 'CC_BY',
};
