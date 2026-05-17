/**
 * Tests for AvatarBlueprintManager
 *
 * Validates core state management, undo/redo, events, and serialization.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AvatarBlueprintManager } from '../AvatarBlueprintManager';

describe('AvatarBlueprintManager', () => {
  let manager: AvatarBlueprintManager;

  beforeEach(() => {
    manager = new AvatarBlueprintManager();
  });

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  describe('initialization', () => {
    it('creates a default blueprint with all required fields', () => {
      const bp = manager.getBlueprint();

      expect(bp.id).toBeTruthy();
      expect(bp.name).toBe('New Avatar');
      expect(bp.version).toBe(1);
      expect(bp.createdAt).toBeGreaterThan(0);
      expect(bp.updatedAt).toBeGreaterThan(0);

      // Body
      expect(bp.body.preset).toBe('average');
      expect(bp.body.genderPresentation).toBe('androgynous');
      expect(bp.body.height).toBe(1.7);
      expect(bp.body.skinColor.hex).toBe('#e0b896');

      // Face
      expect(bp.face.shape).toBe('oval');
      expect(bp.face.eyes.shape).toBe('almond');

      // Hair
      expect(bp.hair.styleId).toBe('default-medium');
      expect(bp.hair.physics).toBe('simple');

      // Clothing & accessories
      expect(bp.clothing).toEqual([]);
      expect(bp.accessories).toEqual([]);

      // Expressions
      expect(bp.expressions.length).toBeGreaterThan(0);
      expect(bp.expressions.find((e) => e.name === 'happy')).toBeDefined();

      // VRM meta
      expect(bp.vrmMeta.version).toBe('1.0');
      expect(bp.vrmMeta.license).toBe('CC_BY');
    });

    it('accepts partial initial blueprint', () => {
      const custom = new AvatarBlueprintManager({
        name: 'My Custom Avatar',
        body: {
          preset: 'athletic',
          genderPresentation: 'masculine',
          height: 1.85,
          proportions: {
            headScale: 0.5,
            shoulderWidth: 0.7,
            chestSize: 0.6,
            waistSize: 0.4,
            hipWidth: 0.45,
            armLength: 0.5,
            legLength: 0.5,
            handSize: 0.5,
            footSize: 0.5,
            muscleTone: 0.8,
          },
          skinColor: { hex: '#8d5524' },
        },
      });

      const bp = custom.getBlueprint();
      expect(bp.name).toBe('My Custom Avatar');
      expect(bp.body.preset).toBe('athletic');
      expect(bp.body.height).toBe(1.85);
      expect(bp.body.skinColor.hex).toBe('#8d5524');
    });
  });

  // ===========================================================================
  // BODY MODIFICATIONS
  // ===========================================================================

  describe('body modifications', () => {
    it('sets skin color', () => {
      manager.setSkinColor('#654321');
      expect(manager.getBlueprint().body.skinColor.hex).toBe('#654321');
    });

    it('sets height with clamping', () => {
      manager.setHeight(1.9);
      expect(manager.getBlueprint().body.height).toBe(1.9);

      manager.setHeight(0.1); // Below minimum
      expect(manager.getBlueprint().body.height).toBe(0.5);

      manager.setHeight(5.0); // Above maximum
      expect(manager.getBlueprint().body.height).toBe(2.5);
    });

    it('sets body proportions', () => {
      manager.setBodyProportions({ shoulderWidth: 0.8, muscleTone: 0.9 });
      const bp = manager.getBlueprint();
      expect(bp.body.proportions.shoulderWidth).toBe(0.8);
      expect(bp.body.proportions.muscleTone).toBe(0.9);
      // Other values remain default
      expect(bp.body.proportions.headScale).toBe(0.5);
    });

    it('applies body presets', () => {
      manager.applyBodyPreset('athletic');
      const bp = manager.getBlueprint();
      expect(bp.body.preset).toBe('athletic');
      expect(bp.body.proportions.shoulderWidth).toBe(0.65);
      expect(bp.body.proportions.muscleTone).toBe(0.75);
    });
  });

  // ===========================================================================
  // FACE MODIFICATIONS
  // ===========================================================================

  describe('face modifications', () => {
    it('sets eye color', () => {
      manager.setEyeColor('#3d85c6');
      expect(manager.getBlueprint().face.eyes.irisColor.hex).toBe('#3d85c6');
    });

    it('sets face morphs', () => {
      manager.setFaceMorphs({ jawWidth: 0.8, chinSize: 0.3 });
      const bp = manager.getBlueprint();
      expect(bp.face.morphs.jawWidth).toBe(0.8);
      expect(bp.face.morphs.chinSize).toBe(0.3);
    });
  });

  // ===========================================================================
  // HAIR MODIFICATIONS
  // ===========================================================================

  describe('hair modifications', () => {
    it('sets hair color', () => {
      manager.setHairColor('#c41e3a', '#d2691e');
      const bp = manager.getBlueprint();
      expect(bp.hair.primaryColor.hex).toBe('#c41e3a');
      expect(bp.hair.secondaryColor?.hex).toBe('#d2691e');
    });

    it('sets hair style', () => {
      manager.setHairStyle('hair-mohawk-01');
      expect(manager.getBlueprint().hair.styleId).toBe('hair-mohawk-01');
    });
  });

  // ===========================================================================
  // CLOTHING
  // ===========================================================================

  describe('clothing management', () => {
    it('equips clothing', () => {
      manager.equipClothing({
        slot: 'upperBody',
        assetId: 'cloth-hoodie-01',
        name: 'Hoodie',
        fit: 0,
        purchased: false,
      });

      const bp = manager.getBlueprint();
      expect(bp.clothing.length).toBe(1);
      expect(bp.clothing[0].slot).toBe('upperBody');
      expect(bp.clothing[0].assetId).toBe('cloth-hoodie-01');
    });

    it('replaces clothing in same slot', () => {
      manager.equipClothing({
        slot: 'upperBody',
        assetId: 'cloth-tshirt-01',
        name: 'T-Shirt',
        fit: 0,
        purchased: false,
      });

      manager.equipClothing({
        slot: 'upperBody',
        assetId: 'cloth-hoodie-01',
        name: 'Hoodie',
        fit: 0,
        purchased: false,
      });

      const bp = manager.getBlueprint();
      expect(bp.clothing.length).toBe(1);
      expect(bp.clothing[0].assetId).toBe('cloth-hoodie-01');
    });

    it('full-body clears upper and lower body', () => {
      manager.equipClothing({
        slot: 'upperBody',
        assetId: 'cloth-tshirt-01',
        name: 'T-Shirt',
        fit: 0,
        purchased: false,
      });

      manager.equipClothing({
        slot: 'lowerBody',
        assetId: 'cloth-jeans-01',
        name: 'Jeans',
        fit: 0,
        purchased: false,
      });

      manager.equipClothing({
        slot: 'fullBody',
        assetId: 'cloth-dress-01',
        name: 'Dress',
        fit: 0,
        purchased: false,
      });

      const bp = manager.getBlueprint();
      expect(bp.clothing.length).toBe(1);
      expect(bp.clothing[0].slot).toBe('fullBody');
    });

    it('unequips clothing', () => {
      manager.equipClothing({
        slot: 'upperBody',
        assetId: 'cloth-hoodie-01',
        name: 'Hoodie',
        fit: 0,
        purchased: false,
      });

      manager.unequipClothing('upperBody');
      expect(manager.getBlueprint().clothing.length).toBe(0);
    });
  });

  // ===========================================================================
  // ACCESSORIES
  // ===========================================================================

  describe('accessory management', () => {
    it('equips and unequips accessories', () => {
      manager.equipAccessory({
        slot: 'glasses',
        assetId: 'acc-glasses-01',
        name: 'Round Glasses',
        scale: 1.0,
        offset: { x: 0, y: 0, z: 0 },
        rotationOffset: { x: 0, y: 0, z: 0 },
        purchased: false,
      });

      expect(manager.getBlueprint().accessories.length).toBe(1);

      manager.unequipAccessory('glasses');
      expect(manager.getBlueprint().accessories.length).toBe(0);
    });
  });

  // ===========================================================================
  // UNDO / REDO
  // ===========================================================================

  describe('undo/redo', () => {
    it('undoes a single change', () => {
      const originalColor = manager.getBlueprint().body.skinColor.hex;
      manager.setSkinColor('#000000');
      expect(manager.getBlueprint().body.skinColor.hex).toBe('#000000');

      const success = manager.undo();
      expect(success).toBe(true);
      expect(manager.getBlueprint().body.skinColor.hex).toBe(originalColor);
    });

    it('redoes an undone change', () => {
      manager.setSkinColor('#ff0000');
      manager.undo();
      expect(manager.getBlueprint().body.skinColor.hex).not.toBe('#ff0000');

      const success = manager.redo();
      expect(success).toBe(true);
      expect(manager.getBlueprint().body.skinColor.hex).toBe('#ff0000');
    });

    it('clears redo stack on new change', () => {
      manager.setSkinColor('#ff0000');
      manager.undo();
      expect(manager.getRedoCount()).toBe(1);

      manager.setSkinColor('#00ff00'); // New change
      expect(manager.getRedoCount()).toBe(0);
    });

    it('returns false when nothing to undo', () => {
      expect(manager.undo()).toBe(false);
    });

    it('returns false when nothing to redo', () => {
      expect(manager.redo()).toBe(false);
    });

    it('handles multiple undo steps', () => {
      manager.setSkinColor('#111111');
      manager.setSkinColor('#222222');
      manager.setSkinColor('#333333');

      expect(manager.getUndoCount()).toBe(3);

      manager.undo();
      expect(manager.getBlueprint().body.skinColor.hex).toBe('#222222');

      manager.undo();
      expect(manager.getBlueprint().body.skinColor.hex).toBe('#111111');
    });
  });

  // ===========================================================================
  // BATCH OPERATIONS
  // ===========================================================================

  describe('batch operations', () => {
    it('groups batch changes into one undo step', () => {
      manager.beginBatch();
      manager.setSkinColor('#111111');
      manager.setHairColor('#222222');
      manager.setHeight(1.9);
      manager.endBatch();

      // Should only need one undo to revert all three changes
      expect(manager.getUndoCount()).toBe(1);

      manager.undo();
      expect(manager.getBlueprint().body.skinColor.hex).toBe('#e0b896'); // default
      expect(manager.getBlueprint().body.height).toBe(1.7); // default
    });
  });

  // ===========================================================================
  // EVENTS
  // ===========================================================================

  describe('events', () => {
    it('fires blueprint:changed on modifications', () => {
      const handler = vi.fn();
      manager.on('blueprint:changed', handler);

      manager.setSkinColor('#ff0000');
      expect(handler).toHaveBeenCalled();
    });

    it('fires color:changed on color changes', () => {
      const handler = vi.fn();
      manager.on('color:changed', handler);

      manager.setSkinColor('#ff0000');
      expect(handler).toHaveBeenCalledTimes(1);

      manager.setHairColor('#00ff00');
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('fires asset:equipped when equipping', () => {
      const handler = vi.fn();
      manager.on('asset:equipped', handler);

      manager.equipClothing({
        slot: 'upperBody',
        assetId: 'test',
        name: 'Test',
        fit: 0,
        purchased: false,
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('allows unsubscribing', () => {
      const handler = vi.fn();
      const unsubscribe = manager.on('blueprint:changed', handler);

      manager.setSkinColor('#ff0000');
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      manager.setSkinColor('#00ff00');
      expect(handler).toHaveBeenCalledTimes(1); // Not called again
    });
  });

  // ===========================================================================
  // SERIALIZATION
  // ===========================================================================

  describe('serialization', () => {
    it('serializes to JSON and deserializes back', () => {
      manager.setSkinColor('#123456');
      manager.setHeight(1.85);
      manager.setHairStyle('hair-mohawk-01');

      const json = manager.serialize();
      expect(json).toBeTruthy();

      const newManager = new AvatarBlueprintManager();
      newManager.deserialize(json);

      const bp = newManager.getBlueprint();
      expect(bp.body.skinColor.hex).toBe('#123456');
      expect(bp.body.height).toBe(1.85);
      expect(bp.hair.styleId).toBe('hair-mohawk-01');
    });

    it('resets undo/redo stacks on deserialize', () => {
      manager.setSkinColor('#111111');
      expect(manager.getUndoCount()).toBe(1);

      manager.deserialize(manager.serialize());
      expect(manager.getUndoCount()).toBe(0);
      expect(manager.getRedoCount()).toBe(0);
    });

    it('marks as clean after save', () => {
      manager.setSkinColor('#111111');
      expect(manager.getIsDirty()).toBe(true);

      manager.markSaved();
      expect(manager.getIsDirty()).toBe(false);
    });
  });

  // ===========================================================================
  // RANDOMIZATION
  // ===========================================================================

  describe('randomization', () => {
    it('produces a different blueprint than default', () => {
      const defaultSkin = manager.getBlueprint().body.skinColor.hex;
      const defaultHeight = manager.getBlueprint().body.height;

      // Randomize multiple times - at least one should differ
      let changed = false;
      for (let i = 0; i < 10; i++) {
        manager.randomize();
        const bp = manager.getBlueprint();
        if (bp.body.skinColor.hex !== defaultSkin || bp.body.height !== defaultHeight) {
          changed = true;
          break;
        }
      }

      expect(changed).toBe(true);
    });

    it('randomize is a single undo step (batch)', () => {
      manager.randomize();
      // Randomize changes skin, hair, height, eyes, morphs - but as one undo step
      expect(manager.getUndoCount()).toBe(1);
    });
  });

  // ===========================================================================
  // PERFORMANCE ESTIMATION
  // ===========================================================================

  describe('performance estimation', () => {
    it('estimates base avatar performance', () => {
      const perf = manager.estimatePerformance();
      expect(perf.estimatedPolyCount).toBeGreaterThan(0);
      expect(perf.estimatedDrawCalls).toBeGreaterThan(0);
    });

    it('increases estimates with more equipped items', () => {
      const basePerfY = manager.estimatePerformance();

      manager.equipClothing({
        slot: 'upperBody',
        assetId: 'test',
        name: 'Test',
        fit: 0,
        purchased: false,
      });
      manager.equipClothing({
        slot: 'lowerBody',
        assetId: 'test2',
        name: 'Test2',
        fit: 0,
        purchased: false,
      });
      manager.equipAccessory({
        slot: 'glasses',
        assetId: 'test3',
        name: 'Test3',
        scale: 1,
        offset: { x: 0, y: 0, z: 0 },
        rotationOffset: { x: 0, y: 0, z: 0 },
        purchased: false,
      });

      const loadedPerf = manager.estimatePerformance();
      expect(loadedPerf.estimatedPolyCount).toBeGreaterThan(basePerfY.estimatedPolyCount);
      expect(loadedPerf.estimatedDrawCalls).toBeGreaterThan(basePerfY.estimatedDrawCalls);
    });
  });

  // ===========================================================================
  // DIRTY STATE
  // ===========================================================================

  describe('dirty state tracking', () => {
    it('starts clean', () => {
      expect(manager.getIsDirty()).toBe(false);
    });

    it('becomes dirty on modification', () => {
      manager.setSkinColor('#ff0000');
      expect(manager.getIsDirty()).toBe(true);
    });

    it('becomes clean after reset', () => {
      manager.setSkinColor('#ff0000');
      manager.reset();
      expect(manager.getIsDirty()).toBe(false);
    });
  });
});
