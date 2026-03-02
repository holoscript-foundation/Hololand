/**
 * Avatar Studio
 *
 * Main facade class that orchestrates the entire avatar authoring experience.
 * This is the primary entry point for integrating the avatar studio into
 * HoloLand's frontend applications.
 *
 * The Avatar Studio brings together:
 * - AvatarBlueprintManager: State management for the avatar data model
 * - AvatarPreviewRenderer: Real-time 3D preview
 * - AssetCatalog: Browsing and searching available assets
 * - VRMExporter: Exporting to interoperable VRM format
 *
 * ## Market Context
 *
 * With Ready Player Me acquired by Netflix and shut down (Jan 31, 2026),
 * there is a massive vacuum in the cross-platform avatar creation space.
 * ~25,000 developers relied on RPM. HoloLand's Avatar Studio fills this gap
 * by providing:
 *
 * 1. **VRM-native authoring** - Open standard, not locked to one platform
 * 2. **Creator economy** - Sell custom hair, clothing, accessories
 * 3. **Cross-platform export** - Use avatars in VRChat, HoloLand, any VRM app
 * 4. **AI-assisted creation** - Natural language to avatar configuration
 * 5. **Web-based** - No app download required, runs in browser
 * 6. **Performance budgeted** - Avatars optimized for Quest, desktop, mobile
 *
 * ## Usage
 *
 * ```typescript
 * import { AvatarStudio } from '@hololand/avatar-studio';
 *
 * const studio = new AvatarStudio({
 *   canvas: document.getElementById('preview') as HTMLCanvasElement,
 *   width: 800,
 *   height: 600,
 * });
 *
 * await studio.initialize();
 *
 * // Modify avatar
 * studio.setSkinColor('#e0b896');
 * studio.setHairStyle('hair-curly-01');
 * studio.equipClothing({ slot: 'upperBody', assetId: 'cloth-hoodie-01', ... });
 *
 * // Export to VRM
 * const result = await studio.exportVRM();
 * // result.blob -> downloadable .vrm file
 * ```
 */

import type {
  AvatarBlueprint,
  BodyConfig,
  FaceConfig,
  HairConfig,
  ClothingSlot,
  AccessorySlot,
  ExpressionPreset,
  VRMMetadata,
  ExportConfig,
  StudioViewAngle,
  StudioEventType,
  StudioEventHandler,
  BodyProportions,
  FaceMorphs,
  ClothingSlotName,
  AccessorySlotName,
  AssetFilter,
  CatalogAsset,
  PerformanceBudget,
} from './types';

import { AvatarBlueprintManager } from './AvatarBlueprintManager';
import { AvatarPreviewRenderer, type PreviewRendererConfig } from './AvatarPreviewRenderer';
import { AssetCatalog, type AssetCatalogConfig } from './AssetCatalog';
import { VRMExporter, type ExportResult, type ExportProgressCallback } from './VRMExporter';

// =============================================================================
// TYPES
// =============================================================================

export interface AvatarStudioConfig {
  /** Canvas element for the 3D preview */
  canvas: HTMLCanvasElement;
  /** Preview width */
  width: number;
  /** Preview height */
  height: number;
  /** Preview background style */
  background?: 'studio-light' | 'studio-dark' | 'outdoor' | 'transparent';
  /** Enable antialiasing */
  antialias?: boolean;
  /** Enable shadow rendering */
  shadows?: boolean;
  /** Enable turntable auto-rotation */
  autoRotate?: boolean;
  /** Asset catalog configuration */
  catalog?: AssetCatalogConfig;
  /** Initial blueprint to load */
  initialBlueprint?: Partial<AvatarBlueprint>;
  /** Performance budget */
  performanceBudget?: PerformanceBudget;
  /** Base VRM model URL for preview */
  baseModelUrl?: string;
}

// =============================================================================
// AVATAR STUDIO
// =============================================================================

export class AvatarStudio {
  private config: AvatarStudioConfig;
  private blueprintManager: AvatarBlueprintManager;
  private previewRenderer: AvatarPreviewRenderer;
  private assetCatalog: AssetCatalog;
  private vrmExporter: VRMExporter;
  private isInitialized: boolean = false;

  constructor(config: AvatarStudioConfig) {
    this.config = config;

    // Initialize subsystems
    this.blueprintManager = new AvatarBlueprintManager(config.initialBlueprint);

    this.previewRenderer = new AvatarPreviewRenderer({
      canvas: config.canvas,
      width: config.width,
      height: config.height,
      antialias: config.antialias ?? true,
      background: config.background ?? 'studio-light',
      shadows: config.shadows ?? true,
      autoRotate: config.autoRotate ?? false,
      performanceBudget: config.performanceBudget,
    });

    this.assetCatalog = new AssetCatalog(config.catalog);
    this.vrmExporter = new VRMExporter();
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Initialize the studio (must be called before use)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Connect renderer to blueprint manager for reactive updates
    this.previewRenderer.connectBlueprintManager(this.blueprintManager);

    // Load base model if provided
    if (this.config.baseModelUrl) {
      await this.previewRenderer.loadVRMModel(this.config.baseModelUrl);
    } else {
      // Use placeholder mannequin
      this.previewRenderer.loadPlaceholder();
    }

    // Start rendering
    this.previewRenderer.start();

    this.isInitialized = true;
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.previewRenderer.dispose();
    this.isInitialized = false;
  }

  /**
   * Resize the preview renderer
   */
  resize(width: number, height: number): void {
    this.previewRenderer.resize(width, height);
  }

  // ===========================================================================
  // BLUEPRINT ACCESS
  // ===========================================================================

  /**
   * Get the current avatar blueprint
   */
  getBlueprint(): Readonly<AvatarBlueprint> {
    return this.blueprintManager.getBlueprint();
  }

  /**
   * Check if there are unsaved changes
   */
  isDirty(): boolean {
    return this.blueprintManager.getIsDirty();
  }

  // ===========================================================================
  // BODY
  // ===========================================================================

  setBody(body: Partial<BodyConfig>): void {
    this.blueprintManager.setBody(body);
  }

  setBodyProportions(proportions: Partial<BodyProportions>): void {
    this.blueprintManager.setBodyProportions(proportions);
  }

  setSkinColor(hex: string): void {
    this.blueprintManager.setSkinColor(hex);
  }

  setHeight(height: number): void {
    this.blueprintManager.setHeight(height);
  }

  applyBodyPreset(preset: 'slim' | 'average' | 'athletic' | 'heavy'): void {
    this.blueprintManager.applyBodyPreset(preset);
  }

  // ===========================================================================
  // FACE
  // ===========================================================================

  setFace(face: Partial<FaceConfig>): void {
    this.blueprintManager.setFace(face);
  }

  setFaceMorphs(morphs: Partial<FaceMorphs>): void {
    this.blueprintManager.setFaceMorphs(morphs);
  }

  setEyeColor(hex: string): void {
    this.blueprintManager.setEyeColor(hex);
  }

  // ===========================================================================
  // HAIR
  // ===========================================================================

  setHair(hair: Partial<HairConfig>): void {
    this.blueprintManager.setHair(hair);
  }

  setHairColor(primaryHex: string, secondaryHex?: string): void {
    this.blueprintManager.setHairColor(primaryHex, secondaryHex);
  }

  setHairStyle(styleId: string): void {
    this.blueprintManager.setHairStyle(styleId);
  }

  // ===========================================================================
  // CLOTHING
  // ===========================================================================

  equipClothing(slot: ClothingSlot): void {
    this.blueprintManager.equipClothing(slot);
  }

  unequipClothing(slotName: ClothingSlotName): void {
    this.blueprintManager.unequipClothing(slotName);
  }

  updateClothing(slotName: ClothingSlotName, updates: Partial<ClothingSlot>): void {
    this.blueprintManager.updateClothing(slotName, updates);
  }

  // ===========================================================================
  // ACCESSORIES
  // ===========================================================================

  equipAccessory(slot: AccessorySlot): void {
    this.blueprintManager.equipAccessory(slot);
  }

  unequipAccessory(slotName: AccessorySlotName): void {
    this.blueprintManager.unequipAccessory(slotName);
  }

  updateAccessory(slotName: AccessorySlotName, updates: Partial<AccessorySlot>): void {
    this.blueprintManager.updateAccessory(slotName, updates);
  }

  // ===========================================================================
  // EXPRESSIONS
  // ===========================================================================

  setExpression(expression: ExpressionPreset): void {
    this.blueprintManager.setExpression(expression);
  }

  removeExpression(name: string): void {
    this.blueprintManager.removeExpression(name);
  }

  /**
   * Preview an expression on the 3D model
   */
  previewExpression(expression: ExpressionPreset): void {
    this.previewRenderer.previewExpression(expression);
  }

  /**
   * Clear the expression preview
   */
  clearExpressionPreview(): void {
    this.previewRenderer.clearExpression();
  }

  // ===========================================================================
  // VRM METADATA
  // ===========================================================================

  setVRMMeta(meta: Partial<VRMMetadata>): void {
    this.blueprintManager.setVRMMeta(meta);
  }

  // ===========================================================================
  // CAMERA & VIEW
  // ===========================================================================

  setViewAngle(angle: StudioViewAngle): void {
    this.previewRenderer.setViewAngle(angle);
  }

  setAutoRotate(enabled: boolean, speed?: number): void {
    this.previewRenderer.setAutoRotate(enabled, speed);
  }

  setBackground(style: 'studio-light' | 'studio-dark' | 'outdoor' | 'transparent'): void {
    this.previewRenderer.setBackground(style);
  }

  // ===========================================================================
  // UNDO / REDO
  // ===========================================================================

  undo(): boolean {
    return this.blueprintManager.undo();
  }

  redo(): boolean {
    return this.blueprintManager.redo();
  }

  get undoAvailable(): boolean {
    return this.blueprintManager.getUndoCount() > 0;
  }

  get redoAvailable(): boolean {
    return this.blueprintManager.getRedoCount() > 0;
  }

  // ===========================================================================
  // RANDOMIZE
  // ===========================================================================

  /**
   * Randomize all avatar appearance settings
   */
  randomize(): void {
    this.blueprintManager.randomize();
  }

  // ===========================================================================
  // ASSET CATALOG
  // ===========================================================================

  /**
   * Search the asset catalog
   */
  async searchAssets(filter?: AssetFilter): Promise<{
    assets: CatalogAsset[];
    total: number;
    hasMore: boolean;
  }> {
    return this.assetCatalog.getAssets(filter);
  }

  /**
   * Get a single asset by ID
   */
  async getAsset(id: string): Promise<CatalogAsset | null> {
    return this.assetCatalog.getAsset(id);
  }

  /**
   * Get featured assets for the landing page
   */
  async getFeaturedAssets(): Promise<CatalogAsset[]> {
    return this.assetCatalog.getFeaturedAssets();
  }

  /**
   * Get assets by category
   */
  async getAssetsByCategory(category: import('./types').AssetCategory): Promise<CatalogAsset[]> {
    return this.assetCatalog.getByCategory(category);
  }

  // ===========================================================================
  // EXPORT
  // ===========================================================================

  /**
   * Export avatar to VRM format
   */
  async exportVRM(
    config?: Partial<ExportConfig>,
    onProgress?: ExportProgressCallback,
  ): Promise<ExportResult> {
    const blueprint = this.blueprintManager.getBlueprint();
    const scene = this.previewRenderer['scene']; // Access internal scene

    return this.vrmExporter.export(blueprint, scene, {
      format: 'vrm',
      ...config,
    }, onProgress);
  }

  /**
   * Export avatar and trigger browser download
   */
  async exportAndDownload(
    config?: Partial<ExportConfig>,
    onProgress?: ExportProgressCallback,
  ): Promise<ExportResult> {
    const blueprint = this.blueprintManager.getBlueprint();
    const scene = this.previewRenderer['scene'];

    return this.vrmExporter.exportAndDownload(blueprint, scene, {
      format: 'vrm',
      ...config,
    }, onProgress);
  }

  /**
   * Validate the current blueprint for export
   */
  validateForExport(): {
    valid: boolean;
    warnings: string[];
    errors: string[];
  } {
    return this.vrmExporter.validate(this.blueprintManager.getBlueprint());
  }

  // ===========================================================================
  // SCREENSHOTS
  // ===========================================================================

  /**
   * Capture a screenshot of the current preview
   */
  captureScreenshot(width?: number, height?: number): string {
    return this.previewRenderer.captureScreenshot(width, height);
  }

  /**
   * Capture a thumbnail and set it on the blueprint
   */
  captureThumbnail(): string {
    return this.previewRenderer.captureThumbnail();
  }

  // ===========================================================================
  // PERFORMANCE
  // ===========================================================================

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): {
    fps: number;
    triangles: number;
    drawCalls: number;
    textureMemoryMB: number;
    withinBudget: boolean;
  } {
    return this.previewRenderer.getPerformanceMetrics();
  }

  /**
   * Get estimated performance for the current blueprint
   */
  estimateExportPerformance(): {
    estimatedPolyCount: number;
    estimatedTextureMemoryMB: number;
    estimatedDrawCalls: number;
  } {
    return this.blueprintManager.estimatePerformance();
  }

  // ===========================================================================
  // SERIALIZATION
  // ===========================================================================

  /**
   * Save the current blueprint as JSON
   */
  save(): string {
    const json = this.blueprintManager.serialize();
    this.blueprintManager.markSaved();
    return json;
  }

  /**
   * Load a blueprint from JSON
   */
  load(json: string): void {
    this.blueprintManager.deserialize(json);
  }

  /**
   * Reset to a new default blueprint
   */
  reset(initial?: Partial<AvatarBlueprint>): void {
    this.blueprintManager.reset(initial);
  }

  // ===========================================================================
  // EVENTS
  // ===========================================================================

  /**
   * Subscribe to studio events
   */
  on(type: StudioEventType, handler: StudioEventHandler): () => void {
    return this.blueprintManager.on(type, handler);
  }

  /**
   * Unsubscribe from studio events
   */
  off(type: StudioEventType, handler: StudioEventHandler): void {
    this.blueprintManager.off(type, handler);
  }

  // ===========================================================================
  // SUBSYSTEM ACCESS (for advanced usage)
  // ===========================================================================

  /**
   * Get the blueprint manager (for advanced state management)
   */
  getBlueprintManager(): AvatarBlueprintManager {
    return this.blueprintManager;
  }

  /**
   * Get the preview renderer (for advanced rendering control)
   */
  getPreviewRenderer(): AvatarPreviewRenderer {
    return this.previewRenderer;
  }

  /**
   * Get the asset catalog (for advanced asset management)
   */
  getAssetCatalog(): AssetCatalog {
    return this.assetCatalog;
  }

  /**
   * Get the VRM exporter (for advanced export configuration)
   */
  getVRMExporter(): VRMExporter {
    return this.vrmExporter;
  }
}
