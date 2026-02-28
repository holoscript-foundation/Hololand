import { describe, it, expect } from 'vitest';
import { SpatialBridgeService, CasualTraitIntent } from '../src/services/SpatialBridgeService';

describe('SpatialBridgeService - Intent to Trait Translation', () => {
  it('correctly maps a simple cosmetic intent on a generic primitive', () => {
    const intent: CasualTraitIntent = {
      targetId: 'obj_sphere_123',
      type: 'sphere',
      modifiers: {
        color: '#ff0000',
        scale: 2.0
      }
    };

    const payload = SpatialBridgeService.compileIntentToTraits(intent);

    expect(payload.nodeId).toBe('obj_sphere_123');
    expect(payload.engine).toBe('holoscript-core');
    expect(payload.traits).toHaveLength(2); // Rendering + Physics
    
    const renderingTrait = payload.traits.find(t => t.namespace === '@rendering/material-standard');
    expect(renderingTrait).toBeDefined();
    expect(renderingTrait?.properties.albedo).toBe('#ff0000');
    expect(renderingTrait?.properties.scale).toBe(2.0);

    const physicsTrait = payload.traits.find(t => t.namespace === '@physics/collider-sphere');
    expect(physicsTrait).toBeDefined();
  });

  it('correctly escalates combat modifiers into complex particle and weapon traits', () => {
    const intent: CasualTraitIntent = {
      targetId: 'obj_sword_456',
      type: 'sword',
      modifiers: {
        damage: 85
      }
    };

    const payload = SpatialBridgeService.compileIntentToTraits(intent);

    // Should generate Rendering, Physics, Combat, and VFX traits
    expect(payload.traits.length).toBeGreaterThanOrEqual(3);

    const combatTrait = payload.traits.find(t => t.namespace === '@combat/melee-weapon');
    expect(combatTrait).toBeDefined();
    expect(combatTrait?.properties.baseDamage).toBe(85);

    // VFX Should trigger since damage > 50
    const vfxTrait = payload.traits.find(t => t.namespace === '@vfx/particle-emitter');
    expect(vfxTrait).toBeDefined();
    expect(vfxTrait?.properties.preset).toBe('fire');
    expect(vfxTrait?.properties.intensity).toBeGreaterThan(1.0);
  });
});
