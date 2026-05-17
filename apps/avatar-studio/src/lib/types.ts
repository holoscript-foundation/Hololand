/**
 * Web app types for the hosted avatar studio.
 *
 * Re-exports core types from @hololand/avatar-studio and adds
 * web-app-specific types for the Next.js frontend.
 */

// Re-export core types used by UI components
export type {
  AvatarBlueprint,
  BodyConfig,
  BodyPreset,
  BodyProportions,
  GenderPresentation,
  FaceConfig,
  FaceShape,
  FaceMorphs,
  EyeConfig,
  EyeShape,
  NoseConfig,
  NoseShape,
  MouthConfig,
  LipShape,
  EyebrowConfig,
  EarConfig,
  FacialHairConfig,
  FaceOverlay,
  HairConfig,
  HairPhysicsMode,
  ClothingSlot,
  ClothingSlotName,
  AccessorySlot,
  AccessorySlotName,
  ExpressionPreset,
  StandardExpressionName,
  VRMMetadata,
  ExportConfig,
  ExportFormat,
  ExportQuality,
  StudioTab,
  StudioViewAngle,
  CatalogAsset,
  AssetCategory,
  ColorHex,
  PerformanceBudget,
  DEFAULT_BODY_PROPORTIONS,
  DEFAULT_FACE_MORPHS,
  DEFAULT_PERFORMANCE_BUDGET,
  DEFAULT_EXPORT_CONFIG,
  DEFAULT_VRM_META,
} from '@hololand/avatar-studio';

// Re-export SDK types
export type { AvatarCreationResult, AvatarStudioError } from '@hololand/avatar-studio';

// Re-export cloud types
export type { CloudAvatar, CloudAvatarListResult } from '@hololand/avatar-studio';

/** Query parameters passed by the SDK when opening in iframe/popup mode */
export interface EmbedParams {
  appId: string;
  mode: 'iframe' | 'popup';
  quality: string;
  upload: string;
  theme: 'light' | 'dark' | 'auto';
  locale: string;
  showExport?: string;
  bodyPresets?: string;
  clothingCategories?: string;
  userToken?: string;
  blueprint?: string; // base64-encoded initial blueprint JSON
}

/** postMessage event types sent from the studio to the parent */
export type StudioMessageType =
  | 'avatar:created'
  | 'avatar:cancelled'
  | 'avatar:error'
  | 'studio:ready'
  | 'studio:resize';

export interface StudioMessage {
  source: 'hololand-avatar-studio';
  type: StudioMessageType;
  payload?: unknown;
}

/** API response wrapper */
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

/** API error response */
export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}
