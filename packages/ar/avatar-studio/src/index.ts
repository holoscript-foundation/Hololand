/**
 * @hololand/avatar-studio
 *
 * VRM Avatar Authoring Studio for HoloLand
 *
 * Create, customize, and export interoperable 3D avatars using the VRM standard.
 * Designed to fill the Ready Player Me market vacuum with an open, creator-driven
 * avatar ecosystem integrated into HoloLand's spatial computing platform.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                          Architecture Overview                              │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │  ┌───────────────────────────────────────────────────────────────────────┐ │
 * │  │                      AvatarStudioSDK (NEW)                           │ │
 * │  │  Embeddable SDK for third-party developers (RPM replacement)         │ │
 * │  │  Popup / Iframe / Inline / API modes                                 │ │
 * │  └──────────────────────────────┬────────────────────────────────────────┘ │
 * │                                 │                                          │
 * │  ┌──────────────────────────────▼────────────────────────────────────────┐ │
 * │  │                         AvatarStudio                                  │ │
 * │  │  Main facade - orchestrates all subsystems                            │ │
 * │  │  Entry point for UI integration                                       │ │
 * │  └──┬──────────┬──────────┬──────────┬──────────┬──────────┬────────────┘ │
 * │     │          │          │          │          │          │               │
 * │     ▼          ▼          ▼          ▼          ▼          ▼               │
 * │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────┐  │
 * │  │Blueprnt│ │Preview │ │ Asset  │ │  VRM   │ │  Mesh  │ │  Cloud     │  │
 * │  │Manager │ │Renderer│ │Catalog │ │Exporter│ │Assemble│ │  Service   │  │
 * │  │        │ │        │ │        │ │        │ │(NEW)   │ │  (NEW)     │  │
 * │  │- State │ │-Three  │ │-Search │ │-Export │ │-Body   │ │- Save/Load │  │
 * │  │- Undo  │ │-Camera │ │-Filter │ │-Optim  │ │-Face   │ │- CDN       │  │
 * │  │- Serial│ │-Light  │ │-Cache  │ │-Valid  │ │-Hair   │ │- Versions  │  │
 * │  │- Events│ │-VRM    │ │-Market │ │-Comprs │ │-Cloth  │ │- Sharing   │  │
 * │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────────┘  │
 * │                                                                             │
 * │  ┌───────────────────────────────────────────────────────────────────────┐ │
 * │  │              HoloScriptAvatarBridge (avatar <-> HoloScript)           │ │
 * │  └───────────────────────────────────────────────────────────────────────┘ │
 * │                                                                             │
 * │  ┌───────────────────────────────────────────────────────────────────────┐ │
 * │  │                    @pixiv/three-vrm + Three.js                        │ │
 * │  │  VRM model loading, rendering, expressions, physics                   │ │
 * │  └───────────────────────────────────────────────────────────────────────┘ │
 * │                                                                             │
 * │  ┌───────────────────────────────────────────────────────────────────────┐ │
 * │  │              @hololand/ar-renderer (existing)                         │ │
 * │  │  ARSceneManager, VRMAvatarManager, IKSolver                          │ │
 * │  └───────────────────────────────────────────────────────────────────────┘ │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ## Quick Start
 *
 * ```typescript
 * import { AvatarStudio } from '@hololand/avatar-studio';
 *
 * const studio = new AvatarStudio({
 *   canvas: document.getElementById('preview') as HTMLCanvasElement,
 *   width: 800,
 *   height: 600,
 *   background: 'studio-light',
 * });
 *
 * await studio.initialize();
 *
 * // Customize the avatar
 * studio.setSkinColor('#e0b896');
 * studio.setHairStyle('hair-curly-01');
 * studio.setHairColor('#654321');
 * studio.setEyeColor('#3d85c6');
 * studio.applyBodyPreset('athletic');
 *
 * // Equip clothing
 * studio.equipClothing({
 *   slot: 'upperBody',
 *   assetId: 'cloth-hoodie-01',
 *   name: 'Hoodie',
 *   fit: 0,
 *   purchased: false,
 * });
 *
 * // Browse asset catalog
 * const hairStyles = await studio.searchAssets({
 *   category: 'hair',
 *   sortBy: 'popularity',
 * });
 *
 * // Export to VRM
 * const result = await studio.exportAndDownload({
 *   quality: 'optimized',
 * }, (progress) => {
 *   console.log(`Export: ${progress.step} (${progress.progress}%)`);
 * });
 *
 * // Save/load blueprints
 * const json = studio.save();
 * studio.load(json);
 *
 * // Undo/redo
 * studio.undo();
 * studio.redo();
 *
 * // Randomize appearance
 * studio.randomize();
 * ```
 *
 * ## Creator Economy Integration
 *
 * The asset catalog supports marketplace assets from the HoloLand Creator Program:
 *
 * ```typescript
 * const studio = new AvatarStudio({
 *   canvas,
 *   width: 800,
 *   height: 600,
 *   catalog: {
 *     apiEndpoint: 'https://api.hololand.io/marketplace',
 *   },
 * });
 *
 * // Search marketplace for creator-made clothing
 * const results = await studio.searchAssets({
 *   category: 'clothing',
 *   search: 'cyberpunk jacket',
 *   priceRange: { min: 0, max: 9.99 },
 * });
 * ```
 */

// Main facade
export { AvatarStudio } from './AvatarStudio';
export type { AvatarStudioConfig } from './AvatarStudio';

// Blueprint management
export { AvatarBlueprintManager } from './AvatarBlueprintManager';

// Preview rendering
export { AvatarPreviewRenderer } from './AvatarPreviewRenderer';
export type { PreviewRendererConfig } from './AvatarPreviewRenderer';

// Asset catalog
export { AssetCatalog } from './AssetCatalog';
export type { AssetFilter, AssetCatalogConfig } from './AssetCatalog';

// VRM export
export { VRMExporter } from './VRMExporter';
export type { ExportResult, ExportStats, ExportProgress, ExportProgressCallback } from './VRMExporter';

// Mesh assembly (geometry pipeline)
export { AvatarMeshAssembler } from './AvatarMeshAssembler';
export type {
  MeshAssemblerConfig,
  AssemblyResult,
  MorphTargetMap,
  MaterialMap,
  AssemblyStats,
} from './AvatarMeshAssembler';

// Embeddable SDK (RPM replacement)
export { AvatarStudioSDK } from './AvatarStudioSDK';
export type {
  AvatarStudioSDKConfig,
  AvatarCreationResult,
  AvatarStudioError,
} from './AvatarStudioSDK';

// Cloud persistence
export { AvatarCloudService } from './AvatarCloudService';
export type {
  CloudServiceConfig,
  CloudAvatar,
  CloudAvatarListResult,
  UploadResult,
  AvatarVersion,
} from './AvatarCloudService';

// HoloScript bridge
export { HoloScriptAvatarBridge } from './HoloScriptAvatarBridge';
export type { HoloScriptAvatarNode } from './HoloScriptAvatarBridge';

// All types
export * from './types';
