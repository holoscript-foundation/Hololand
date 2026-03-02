/**
 * Avatar Blueprint Manager
 *
 * Core state management for avatar blueprints. Handles creation, modification,
 * serialization, undo/redo, and persistence of avatar configurations.
 *
 * This is the heart of the avatar authoring studio - it manages the
 * declarative data model that describes an avatar's appearance without
 * coupling to any specific rendering implementation.
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
  StudioEvent,
  StudioEventHandler,
  StudioEventType,
  ClothingSlotName,
  AccessorySlotName,
  BodyProportions,
  FaceMorphs,
  EyeConfig,
  NoseConfig,
  MouthConfig,
} from './types';

import {
  DEFAULT_BODY_PROPORTIONS,
  DEFAULT_FACE_MORPHS,
  DEFAULT_VRM_META,
} from './types';

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `avt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Avatar Blueprint Manager
 *
 * Manages the lifecycle of avatar blueprints with full undo/redo support,
 * event emission, and dirty-state tracking.
 */
export class AvatarBlueprintManager {
  private blueprint: AvatarBlueprint;
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private maxUndoDepth: number = 50;
  private isDirty: boolean = false;
  private eventHandlers: Map<StudioEventType, Set<StudioEventHandler>> = new Map();
  private batchDepth: number = 0;
  private pendingEvents: StudioEvent[] = [];

  constructor(blueprint?: Partial<AvatarBlueprint>) {
    this.blueprint = this.createDefaultBlueprint(blueprint);
  }

  // ===========================================================================
  // BLUEPRINT LIFECYCLE
  // ===========================================================================

  /**
   * Create a new default blueprint, optionally seeded with partial config
   */
  private createDefaultBlueprint(partial?: Partial<AvatarBlueprint>): AvatarBlueprint {
    const now = Date.now();
    return {
      id: partial?.id ?? generateId(),
      name: partial?.name ?? 'New Avatar',
      version: partial?.version ?? 1,
      createdAt: partial?.createdAt ?? now,
      updatedAt: now,
      authorId: partial?.authorId,
      body: partial?.body ?? this.createDefaultBody(),
      face: partial?.face ?? this.createDefaultFace(),
      hair: partial?.hair ?? this.createDefaultHair(),
      clothing: partial?.clothing ?? [],
      accessories: partial?.accessories ?? [],
      expressions: partial?.expressions ?? this.createDefaultExpressions(),
      vrmMeta: partial?.vrmMeta ?? { ...DEFAULT_VRM_META },
      thumbnailDataUrl: partial?.thumbnailDataUrl,
    };
  }

  private createDefaultBody(): BodyConfig {
    return {
      preset: 'average',
      genderPresentation: 'androgynous',
      height: 1.7,
      proportions: { ...DEFAULT_BODY_PROPORTIONS },
      skinColor: { hex: '#e0b896' },
    };
  }

  private createDefaultFace(): FaceConfig {
    return {
      shape: 'oval',
      morphs: { ...DEFAULT_FACE_MORPHS },
      eyes: {
        shape: 'almond',
        irisColor: { hex: '#6b4423' },
        pupilSize: 0.5,
        separation: 0.5,
        tilt: 0.5,
        size: 0.5,
        scleraColor: { hex: '#ffffff' },
      },
      nose: {
        shape: 'straight',
        bridgeWidth: 0.5,
        tipHeight: 0.5,
        nostrilWidth: 0.5,
        size: 0.5,
      },
      mouth: {
        shape: 'medium',
        lipColor: { hex: '#c47070' },
        width: 0.5,
        upperFullness: 0.5,
        lowerFullness: 0.5,
      },
      eyebrows: {
        styleId: 'default',
        color: { hex: '#3d2b1f' },
        thickness: 0.5,
        archHeight: 0.5,
        height: 0.5,
      },
      ears: {
        size: 0.5,
        pointedness: 0.0,
        angle: 0.5,
      },
      faceOverlays: [],
    };
  }

  private createDefaultHair(): HairConfig {
    return {
      styleId: 'default-medium',
      primaryColor: { hex: '#3d2b1f' },
      gradientPosition: 1.0,
      physics: 'simple',
      lengthFactor: 0.5,
      volume: 0.5,
    };
  }

  private createDefaultExpressions(): ExpressionPreset[] {
    return [
      {
        name: 'happy',
        isStandard: true,
        blendShapeWeights: { happy: 1.0 },
      },
      {
        name: 'sad',
        isStandard: true,
        blendShapeWeights: { sad: 1.0 },
      },
      {
        name: 'angry',
        isStandard: true,
        blendShapeWeights: { angry: 1.0 },
      },
      {
        name: 'surprised',
        isStandard: true,
        blendShapeWeights: { surprised: 1.0 },
      },
      {
        name: 'neutral',
        isStandard: true,
        blendShapeWeights: { neutral: 1.0 },
      },
      {
        name: 'blink',
        isStandard: true,
        blendShapeWeights: { blink: 1.0 },
      },
    ];
  }

  // ===========================================================================
  // STATE ACCESS
  // ===========================================================================

  /**
   * Get current blueprint (read-only snapshot)
   */
  getBlueprint(): Readonly<AvatarBlueprint> {
    return this.blueprint;
  }

  /**
   * Get whether there are unsaved changes
   */
  getIsDirty(): boolean {
    return this.isDirty;
  }

  /**
   * Get the number of available undo steps
   */
  getUndoCount(): number {
    return this.undoStack.length;
  }

  /**
   * Get the number of available redo steps
   */
  getRedoCount(): number {
    return this.redoStack.length;
  }

  // ===========================================================================
  // UNDO / REDO
  // ===========================================================================

  /**
   * Push current state to undo stack before making changes
   */
  private pushUndo(): void {
    const snapshot = JSON.stringify(this.blueprint);
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxUndoDepth) {
      this.undoStack.shift();
    }
    // Clear redo stack on new change
    this.redoStack = [];
  }

  /**
   * Undo last change
   */
  undo(): boolean {
    if (this.undoStack.length === 0) return false;

    const currentSnapshot = JSON.stringify(this.blueprint);
    this.redoStack.push(currentSnapshot);

    const previousSnapshot = this.undoStack.pop()!;
    this.blueprint = JSON.parse(previousSnapshot);
    this.isDirty = true;

    this.emit({ type: 'undo', timestamp: Date.now() });
    this.emit({ type: 'blueprint:changed', timestamp: Date.now(), data: this.blueprint });

    return true;
  }

  /**
   * Redo last undone change
   */
  redo(): boolean {
    if (this.redoStack.length === 0) return false;

    const currentSnapshot = JSON.stringify(this.blueprint);
    this.undoStack.push(currentSnapshot);

    const nextSnapshot = this.redoStack.pop()!;
    this.blueprint = JSON.parse(nextSnapshot);
    this.isDirty = true;

    this.emit({ type: 'redo', timestamp: Date.now() });
    this.emit({ type: 'blueprint:changed', timestamp: Date.now(), data: this.blueprint });

    return true;
  }

  // ===========================================================================
  // BATCH OPERATIONS (group multiple changes into one undo step)
  // ===========================================================================

  /**
   * Begin a batch operation. All changes until endBatch() are grouped
   * into a single undo step.
   */
  beginBatch(): void {
    if (this.batchDepth === 0) {
      this.pushUndo();
    }
    this.batchDepth++;
  }

  /**
   * End a batch operation. Fires all pending events.
   */
  endBatch(): void {
    this.batchDepth--;
    if (this.batchDepth === 0) {
      // Fire all pending events
      for (const event of this.pendingEvents) {
        this.emitImmediate(event);
      }
      this.pendingEvents = [];
      this.emitImmediate({ type: 'blueprint:changed', timestamp: Date.now(), data: this.blueprint });
    }
  }

  // ===========================================================================
  // BODY MODIFICATIONS
  // ===========================================================================

  /**
   * Set body configuration
   */
  setBody(body: Partial<BodyConfig>): void {
    this.applyChange(() => {
      this.blueprint.body = { ...this.blueprint.body, ...body };
    }, 'blueprint:changed');
  }

  /**
   * Set body proportions
   */
  setBodyProportions(proportions: Partial<BodyProportions>): void {
    this.applyChange(() => {
      this.blueprint.body.proportions = {
        ...this.blueprint.body.proportions,
        ...proportions,
      };
    }, 'morph:changed');
  }

  /**
   * Set skin color
   */
  setSkinColor(hex: string): void {
    this.applyChange(() => {
      this.blueprint.body.skinColor = { hex };
    }, 'color:changed');
  }

  /**
   * Set height
   */
  setHeight(height: number): void {
    const clamped = Math.max(0.5, Math.min(2.5, height));
    this.applyChange(() => {
      this.blueprint.body.height = clamped;
    }, 'morph:changed');
  }

  // ===========================================================================
  // FACE MODIFICATIONS
  // ===========================================================================

  /**
   * Set face configuration
   */
  setFace(face: Partial<FaceConfig>): void {
    this.applyChange(() => {
      this.blueprint.face = { ...this.blueprint.face, ...face };
    }, 'blueprint:changed');
  }

  /**
   * Set face morphs
   */
  setFaceMorphs(morphs: Partial<FaceMorphs>): void {
    this.applyChange(() => {
      this.blueprint.face.morphs = {
        ...this.blueprint.face.morphs,
        ...morphs,
      };
    }, 'morph:changed');
  }

  /**
   * Set eye configuration
   */
  setEyes(eyes: Partial<EyeConfig>): void {
    this.applyChange(() => {
      this.blueprint.face.eyes = { ...this.blueprint.face.eyes, ...eyes };
    }, 'morph:changed');
  }

  /**
   * Set eye color
   */
  setEyeColor(hex: string): void {
    this.applyChange(() => {
      this.blueprint.face.eyes.irisColor = { hex };
    }, 'color:changed');
  }

  /**
   * Set nose configuration
   */
  setNose(nose: Partial<NoseConfig>): void {
    this.applyChange(() => {
      this.blueprint.face.nose = { ...this.blueprint.face.nose, ...nose };
    }, 'morph:changed');
  }

  /**
   * Set mouth configuration
   */
  setMouth(mouth: Partial<MouthConfig>): void {
    this.applyChange(() => {
      this.blueprint.face.mouth = { ...this.blueprint.face.mouth, ...mouth };
    }, 'morph:changed');
  }

  // ===========================================================================
  // HAIR MODIFICATIONS
  // ===========================================================================

  /**
   * Set hair configuration
   */
  setHair(hair: Partial<HairConfig>): void {
    this.applyChange(() => {
      this.blueprint.hair = { ...this.blueprint.hair, ...hair };
    }, 'blueprint:changed');
  }

  /**
   * Set hair color
   */
  setHairColor(primaryHex: string, secondaryHex?: string): void {
    this.applyChange(() => {
      this.blueprint.hair.primaryColor = { hex: primaryHex };
      if (secondaryHex !== undefined) {
        this.blueprint.hair.secondaryColor = { hex: secondaryHex };
      }
    }, 'color:changed');
  }

  /**
   * Set hair style
   */
  setHairStyle(styleId: string): void {
    this.applyChange(() => {
      this.blueprint.hair.styleId = styleId;
    }, 'blueprint:changed');
  }

  // ===========================================================================
  // CLOTHING MODIFICATIONS
  // ===========================================================================

  /**
   * Equip a clothing item
   */
  equipClothing(slot: ClothingSlot): void {
    this.applyChange(() => {
      // Remove any existing item in the same slot
      this.blueprint.clothing = this.blueprint.clothing.filter(
        (c) => c.slot !== slot.slot
      );
      // Full-body items clear upper+lower
      if (slot.slot === 'fullBody') {
        this.blueprint.clothing = this.blueprint.clothing.filter(
          (c) => c.slot !== 'upperBody' && c.slot !== 'lowerBody'
        );
      }
      // Upper/lower body items clear full-body
      if (slot.slot === 'upperBody' || slot.slot === 'lowerBody') {
        this.blueprint.clothing = this.blueprint.clothing.filter(
          (c) => c.slot !== 'fullBody'
        );
      }
      this.blueprint.clothing.push(slot);
    }, 'asset:equipped');
  }

  /**
   * Unequip clothing from a slot
   */
  unequipClothing(slotName: ClothingSlotName): void {
    this.applyChange(() => {
      this.blueprint.clothing = this.blueprint.clothing.filter(
        (c) => c.slot !== slotName
      );
    }, 'asset:unequipped');
  }

  /**
   * Update clothing item properties (color, fit, etc.)
   */
  updateClothing(slotName: ClothingSlotName, updates: Partial<ClothingSlot>): void {
    this.applyChange(() => {
      const item = this.blueprint.clothing.find((c) => c.slot === slotName);
      if (item) {
        Object.assign(item, updates);
      }
    }, 'blueprint:changed');
  }

  // ===========================================================================
  // ACCESSORY MODIFICATIONS
  // ===========================================================================

  /**
   * Equip an accessory
   */
  equipAccessory(slot: AccessorySlot): void {
    this.applyChange(() => {
      this.blueprint.accessories = this.blueprint.accessories.filter(
        (a) => a.slot !== slot.slot
      );
      this.blueprint.accessories.push(slot);
    }, 'asset:equipped');
  }

  /**
   * Unequip an accessory
   */
  unequipAccessory(slotName: AccessorySlotName): void {
    this.applyChange(() => {
      this.blueprint.accessories = this.blueprint.accessories.filter(
        (a) => a.slot !== slotName
      );
    }, 'asset:unequipped');
  }

  /**
   * Update accessory properties
   */
  updateAccessory(slotName: AccessorySlotName, updates: Partial<AccessorySlot>): void {
    this.applyChange(() => {
      const item = this.blueprint.accessories.find((a) => a.slot === slotName);
      if (item) {
        Object.assign(item, updates);
      }
    }, 'blueprint:changed');
  }

  // ===========================================================================
  // EXPRESSION MODIFICATIONS
  // ===========================================================================

  /**
   * Add or update an expression preset
   */
  setExpression(expression: ExpressionPreset): void {
    this.applyChange(() => {
      const existing = this.blueprint.expressions.findIndex(
        (e) => e.name === expression.name
      );
      if (existing >= 0) {
        this.blueprint.expressions[existing] = expression;
      } else {
        this.blueprint.expressions.push(expression);
      }
    }, 'expression:changed');
  }

  /**
   * Remove an expression preset
   */
  removeExpression(name: string): void {
    this.applyChange(() => {
      this.blueprint.expressions = this.blueprint.expressions.filter(
        (e) => e.name !== name
      );
    }, 'expression:changed');
  }

  // ===========================================================================
  // VRM METADATA
  // ===========================================================================

  /**
   * Set VRM metadata for export
   */
  setVRMMeta(meta: Partial<VRMMetadata>): void {
    this.applyChange(() => {
      this.blueprint.vrmMeta = { ...this.blueprint.vrmMeta, ...meta };
    }, 'blueprint:changed');
  }

  // ===========================================================================
  // BLUEPRINT NAME & IDENTITY
  // ===========================================================================

  /**
   * Set blueprint name
   */
  setName(name: string): void {
    this.applyChange(() => {
      this.blueprint.name = name;
    }, 'blueprint:changed');
  }

  /**
   * Set thumbnail
   */
  setThumbnail(dataUrl: string): void {
    this.blueprint.thumbnailDataUrl = dataUrl;
    // Thumbnail updates do not create undo history
  }

  // ===========================================================================
  // SERIALIZATION
  // ===========================================================================

  /**
   * Serialize blueprint to JSON string
   */
  serialize(): string {
    return JSON.stringify(this.blueprint, null, 2);
  }

  /**
   * Deserialize blueprint from JSON string
   */
  deserialize(json: string): void {
    const parsed = JSON.parse(json) as AvatarBlueprint;
    this.undoStack = [];
    this.redoStack = [];
    this.blueprint = this.createDefaultBlueprint(parsed);
    this.isDirty = false;
    this.emit({ type: 'blueprint:loaded', timestamp: Date.now(), data: this.blueprint });
  }

  /**
   * Mark current state as saved
   */
  markSaved(): void {
    this.isDirty = false;
    this.blueprint.updatedAt = Date.now();
    this.blueprint.version++;
    this.emit({ type: 'blueprint:saved', timestamp: Date.now() });
  }

  /**
   * Reset to a new default blueprint
   */
  reset(partial?: Partial<AvatarBlueprint>): void {
    this.undoStack = [];
    this.redoStack = [];
    this.blueprint = this.createDefaultBlueprint(partial);
    this.isDirty = false;
    this.emit({ type: 'blueprint:loaded', timestamp: Date.now(), data: this.blueprint });
  }

  // ===========================================================================
  // RANDOMIZATION (for "Randomize" button in UI)
  // ===========================================================================

  /**
   * Randomize all appearance settings
   */
  randomize(): void {
    this.beginBatch();

    // Random skin color from a diverse palette
    const skinTones = [
      '#f5d6b8', '#e0b896', '#c69573', '#a67b5b', '#8d5524',
      '#6b3a1f', '#4a2511', '#f5d0a9', '#d4a574', '#b38553',
    ];
    this.setSkinColor(skinTones[Math.floor(Math.random() * skinTones.length)]);

    // Random body proportions
    this.setBodyProportions({
      headScale: 0.4 + Math.random() * 0.2,
      shoulderWidth: 0.3 + Math.random() * 0.4,
      chestSize: 0.3 + Math.random() * 0.4,
      waistSize: 0.3 + Math.random() * 0.4,
      hipWidth: 0.3 + Math.random() * 0.4,
      armLength: 0.4 + Math.random() * 0.2,
      legLength: 0.4 + Math.random() * 0.2,
      handSize: 0.4 + Math.random() * 0.2,
      footSize: 0.4 + Math.random() * 0.2,
      muscleTone: Math.random() * 0.7,
    });

    // Random height
    this.setHeight(1.5 + Math.random() * 0.4);

    // Random hair color
    const hairColors = [
      '#1a1a1a', '#3d2b1f', '#654321', '#8b4513', '#d2691e',
      '#daa520', '#f5deb3', '#c41e3a', '#4a0080', '#006994',
    ];
    this.setHairColor(hairColors[Math.floor(Math.random() * hairColors.length)]);

    // Random eye color
    const eyeColors = [
      '#6b4423', '#3d85c6', '#2e7d32', '#757575', '#4a148c',
      '#1a237e', '#00838f', '#bf360c',
    ];
    this.setEyeColor(eyeColors[Math.floor(Math.random() * eyeColors.length)]);

    // Random face morphs
    this.setFaceMorphs({
      jawWidth: 0.3 + Math.random() * 0.4,
      jawHeight: 0.3 + Math.random() * 0.4,
      chinSize: 0.3 + Math.random() * 0.4,
      cheekboneHeight: 0.3 + Math.random() * 0.4,
      cheekFullness: 0.3 + Math.random() * 0.4,
      foreheadHeight: 0.3 + Math.random() * 0.4,
      browRidge: Math.random() * 0.5,
    });

    this.endBatch();
  }

  // ===========================================================================
  // PRESETS
  // ===========================================================================

  /**
   * Apply a named body preset
   */
  applyBodyPreset(preset: 'slim' | 'average' | 'athletic' | 'heavy'): void {
    const presets: Record<string, Partial<BodyProportions>> = {
      slim: {
        shoulderWidth: 0.35,
        chestSize: 0.35,
        waistSize: 0.3,
        hipWidth: 0.35,
        muscleTone: 0.15,
      },
      average: {
        shoulderWidth: 0.5,
        chestSize: 0.5,
        waistSize: 0.5,
        hipWidth: 0.5,
        muscleTone: 0.3,
      },
      athletic: {
        shoulderWidth: 0.65,
        chestSize: 0.6,
        waistSize: 0.4,
        hipWidth: 0.45,
        muscleTone: 0.75,
      },
      heavy: {
        shoulderWidth: 0.6,
        chestSize: 0.7,
        waistSize: 0.7,
        hipWidth: 0.65,
        muscleTone: 0.2,
      },
    };

    this.beginBatch();
    this.setBody({ preset });
    this.setBodyProportions(presets[preset] ?? presets.average);
    this.endBatch();
  }

  // ===========================================================================
  // PERFORMANCE ANALYSIS
  // ===========================================================================

  /**
   * Calculate estimated performance metrics for the current blueprint
   */
  estimatePerformance(): {
    estimatedPolyCount: number;
    estimatedTextureMemoryMB: number;
    estimatedDrawCalls: number;
  } {
    // Base body mesh: ~15,000 polys
    let polyCount = 15000;
    let textureMemory = 8; // MB for base textures
    let drawCalls = 2; // body + face

    // Hair
    polyCount += 5000; // typical hair
    textureMemory += 2;
    drawCalls += 1;

    // Clothing
    for (const _item of this.blueprint.clothing) {
      polyCount += 8000;
      textureMemory += 4;
      drawCalls += 1;
    }

    // Accessories
    for (const _item of this.blueprint.accessories) {
      polyCount += 3000;
      textureMemory += 2;
      drawCalls += 1;
    }

    return {
      estimatedPolyCount: polyCount,
      estimatedTextureMemoryMB: textureMemory,
      estimatedDrawCalls: drawCalls,
    };
  }

  // ===========================================================================
  // EVENT SYSTEM
  // ===========================================================================

  /**
   * Subscribe to studio events
   */
  on(type: StudioEventType, handler: StudioEventHandler): () => void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set());
    }
    this.eventHandlers.get(type)!.add(handler);

    return () => {
      this.eventHandlers.get(type)?.delete(handler);
    };
  }

  /**
   * Unsubscribe from studio events
   */
  off(type: StudioEventType, handler: StudioEventHandler): void {
    this.eventHandlers.get(type)?.delete(handler);
  }

  // ===========================================================================
  // INTERNAL HELPERS
  // ===========================================================================

  /**
   * Apply a change with undo support and event emission
   */
  private applyChange(mutator: () => void, eventType: StudioEventType): void {
    if (this.batchDepth === 0) {
      this.pushUndo();
    }

    mutator();
    this.blueprint.updatedAt = Date.now();
    this.isDirty = true;

    const event: StudioEvent = {
      type: eventType,
      timestamp: Date.now(),
      data: this.blueprint,
    };

    if (this.batchDepth > 0) {
      this.pendingEvents.push(event);
    } else {
      this.emit(event);
      this.emit({ type: 'blueprint:changed', timestamp: Date.now(), data: this.blueprint });
    }
  }

  /**
   * Emit an event (respects batch mode)
   */
  private emit(event: StudioEvent): void {
    if (this.batchDepth > 0) {
      this.pendingEvents.push(event);
    } else {
      this.emitImmediate(event);
    }
  }

  /**
   * Emit an event immediately (bypasses batch check)
   */
  private emitImmediate(event: StudioEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
        }
      }
    }
  }
}
