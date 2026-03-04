/**
 * @vitest-environment jsdom
 */

/**
 * Tests for LightingFidelityManager (Lighting Fidelity Spectrum Levels 0-4)
 *
 * Validates:
 * - Default initialization at Level 2
 * - Manual level setting (setLevel) with clamping
 * - Level presets (0=Unlit, 1=Basic, 2=Standard, 3=Enhanced, 4=Cinematic)
 * - Scene attachment and managed light creation
 * - Scene detachment and cleanup
 * - Shadow settings applied to renderer
 * - Auto-downgrade when FPS below threshold
 * - Auto-upgrade when FPS above threshold
 * - Cooldown prevents oscillation
 * - Consecutive check counting
 * - Callback invocation on level changes
 * - Dynamic light management (add/remove, slot limits)
 * - Device-based factory function
 * - Metrics reporting
 * - Summary string generation
 * - Enable/disable auto-downgrade/upgrade at runtime
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import * as THREE from 'three';
import {
  LightingFidelityManager,
  createLightingFidelityManager,
  createLightingFidelityManagerForDevice,
} from '../LightingFidelityManager';
import {
  LIGHTING_FIDELITY_PRESETS,
  LIGHTING_FIDELITY_NAMES,
} from '../types';
import type {
  LightingFidelityLevel,
  LightingFidelityConfig,
} from '../types';

// =============================================================================
// HELPERS
// =============================================================================

function createTestManager(config?: LightingFidelityConfig): LightingFidelityManager {
  return new LightingFidelityManager({
    autoDowngrade: false,
    autoUpgrade: false,
    ...config,
  });
}

function createTestScene(): THREE.Scene {
  return new THREE.Scene();
}

function createMockRenderer(): { shadowMap: { enabled: boolean; type: THREE.ShadowMapType }; dispose: () => void } {
  return {
    shadowMap: {
      enabled: false,
      type: THREE.PCFShadowMap,
    },
    dispose: vi.fn(),
  };
}

// =============================================================================
// INITIALIZATION
// =============================================================================

describe('LightingFidelityManager', () => {
  describe('initialization', () => {
    it('defaults to Level 2 (Standard)', () => {
      const mgr = createTestManager();
      expect(mgr.getLevel()).toBe(2);
      expect(mgr.getSettings().name).toBe('Standard');
    });

    it('accepts a custom initial level', () => {
      const mgr = createTestManager({ initialLevel: 4 });
      expect(mgr.getLevel()).toBe(4);
      expect(mgr.getSettings().name).toBe('Cinematic');
    });

    it('initializes with correct settings for each level', () => {
      for (let level = 0; level <= 4; level++) {
        const mgr = createTestManager({ initialLevel: level as LightingFidelityLevel });
        const settings = mgr.getSettings();
        const expected = LIGHTING_FIDELITY_PRESETS[level as LightingFidelityLevel];
        expect(settings).toEqual(expected);
      }
    });
  });

  // ===========================================================================
  // LEVEL CONTROL
  // ===========================================================================

  describe('level control', () => {
    it('setLevel changes the current level', () => {
      const mgr = createTestManager({ initialLevel: 2 });
      mgr.setLevel(4);
      expect(mgr.getLevel()).toBe(4);
      expect(mgr.getSettings().name).toBe('Cinematic');
    });

    it('setLevel clamps to minLevel', () => {
      const mgr = createTestManager({ initialLevel: 2, minLevel: 1 });
      mgr.setLevel(0);
      expect(mgr.getLevel()).toBe(1);
    });

    it('setLevel clamps to maxLevel', () => {
      const mgr = createTestManager({ initialLevel: 2, maxLevel: 3 });
      mgr.setLevel(4);
      expect(mgr.getLevel()).toBe(3);
    });

    it('setLevel is a no-op when setting the same level', () => {
      const onLevelChange = vi.fn();
      const mgr = createTestManager({ initialLevel: 2, onLevelChange });
      mgr.setLevel(2);
      expect(onLevelChange).not.toHaveBeenCalled();
    });

    it('setLevel fires onLevelChange callback', () => {
      const onLevelChange = vi.fn();
      const mgr = createTestManager({ initialLevel: 2, onLevelChange });
      mgr.setLevel(3);
      expect(onLevelChange).toHaveBeenCalledWith(2, 3, 'manual');
    });
  });

  // ===========================================================================
  // SCENE ATTACHMENT
  // ===========================================================================

  describe('scene attachment', () => {
    it('attachToScene creates managed lights', () => {
      const scene = createTestScene();
      const mgr = createTestManager({ initialLevel: 2 });

      // Level 2 has ambient + directional
      mgr.attachToScene(scene);

      const ambient = mgr.getAmbientLight();
      const directional = mgr.getDirectionalLight();
      expect(ambient).toBeInstanceOf(THREE.AmbientLight);
      expect(directional).toBeInstanceOf(THREE.DirectionalLight);
    });

    it('Level 0 has ambient only, no directional', () => {
      const scene = createTestScene();
      const mgr = createTestManager({ initialLevel: 0 });
      mgr.attachToScene(scene);

      expect(mgr.getAmbientLight()).toBeInstanceOf(THREE.AmbientLight);
      expect(mgr.getDirectionalLight()).toBeNull();
    });

    it('Level 2 directional light has shadows enabled', () => {
      const scene = createTestScene();
      const mgr = createTestManager({ initialLevel: 2 });
      mgr.attachToScene(scene);

      const dirLight = mgr.getDirectionalLight()!;
      expect(dirLight.castShadow).toBe(true);
      expect(dirLight.shadow.mapSize.width).toBe(1024);
    });

    it('Level 1 directional light has shadows disabled', () => {
      const scene = createTestScene();
      const mgr = createTestManager({ initialLevel: 1 });
      mgr.attachToScene(scene);

      const dirLight = mgr.getDirectionalLight()!;
      expect(dirLight.castShadow).toBe(false);
    });

    it('detachFromScene removes all managed lights', () => {
      const scene = createTestScene();
      const mgr = createTestManager({ initialLevel: 3 });
      mgr.attachToScene(scene);

      const childCountBefore = scene.children.length;
      expect(childCountBefore).toBeGreaterThan(0);

      mgr.detachFromScene();

      expect(mgr.getAmbientLight()).toBeNull();
      expect(mgr.getDirectionalLight()).toBeNull();
      // Scene should have fewer children now
      expect(scene.children.length).toBeLessThan(childCountBefore);
    });

    it('re-attachment cleans up previous scene lights', () => {
      const scene1 = createTestScene();
      const scene2 = createTestScene();
      const mgr = createTestManager({ initialLevel: 2 });

      mgr.attachToScene(scene1);
      const scene1ChildCount = scene1.children.length;

      mgr.attachToScene(scene2);
      // Scene 1 should have its managed lights removed
      expect(scene1.children.length).toBeLessThan(scene1ChildCount);
      // Scene 2 should now have managed lights
      expect(mgr.getAmbientLight()).toBeInstanceOf(THREE.AmbientLight);
    });

    it('setLevel re-creates lights on attached scene', () => {
      const scene = createTestScene();
      const mgr = createTestManager({ initialLevel: 1 });
      mgr.attachToScene(scene);

      // Level 1: no shadows
      expect(mgr.getDirectionalLight()!.castShadow).toBe(false);

      mgr.setLevel(3);

      // Level 3: shadows enabled
      expect(mgr.getDirectionalLight()!.castShadow).toBe(true);
      expect(mgr.getDirectionalLight()!.shadow.mapSize.width).toBe(2048);
    });
  });

  // ===========================================================================
  // SHADOW SETTINGS
  // ===========================================================================

  describe('shadow settings', () => {
    it('getShadowMapType returns null for level 0', () => {
      const mgr = createTestManager({ initialLevel: 0 });
      expect(mgr.getShadowMapType()).toBeNull();
    });

    it('getShadowMapType returns PCFShadowMap for level 2', () => {
      const mgr = createTestManager({ initialLevel: 2 });
      expect(mgr.getShadowMapType()).toBe(THREE.PCFShadowMap);
    });

    it('getShadowMapType returns PCFSoftShadowMap for level 3', () => {
      const mgr = createTestManager({ initialLevel: 3 });
      expect(mgr.getShadowMapType()).toBe(THREE.PCFSoftShadowMap);
    });

    it('applyShadowSettings disables shadows for level 0', () => {
      const renderer = createMockRenderer();
      const mgr = createTestManager({ initialLevel: 0 });
      mgr.applyShadowSettings(renderer as unknown as THREE.WebGLRenderer);
      expect(renderer.shadowMap.enabled).toBe(false);
    });

    it('applyShadowSettings enables shadows for level 2', () => {
      const renderer = createMockRenderer();
      const mgr = createTestManager({ initialLevel: 2 });
      mgr.applyShadowSettings(renderer as unknown as THREE.WebGLRenderer);
      expect(renderer.shadowMap.enabled).toBe(true);
      expect(renderer.shadowMap.type).toBe(THREE.PCFShadowMap);
    });
  });

  // ===========================================================================
  // DYNAMIC LIGHT MANAGEMENT
  // ===========================================================================

  describe('dynamic light management', () => {
    it('addDynamicLight succeeds within slot limit', () => {
      const scene = createTestScene();
      const mgr = createTestManager({ initialLevel: 2 }); // maxAdditionalLights: 2
      mgr.attachToScene(scene);

      const light = new THREE.PointLight(0xff0000, 1.0, 10);
      const result = mgr.addDynamicLight(light);
      expect(result).toBe(light);
      expect(mgr.getAvailableLightSlots()).toBe(1);
    });

    it('addDynamicLight returns null when slot limit reached', () => {
      const scene = createTestScene();
      const mgr = createTestManager({ initialLevel: 2 }); // maxAdditionalLights: 2
      mgr.attachToScene(scene);

      mgr.addDynamicLight(new THREE.PointLight());
      mgr.addDynamicLight(new THREE.PointLight());
      const third = mgr.addDynamicLight(new THREE.PointLight());
      expect(third).toBeNull();
      expect(mgr.getAvailableLightSlots()).toBe(0);
    });

    it('addDynamicLight returns null for level 0 (no additional lights)', () => {
      const scene = createTestScene();
      const mgr = createTestManager({ initialLevel: 0 });
      mgr.attachToScene(scene);

      const light = new THREE.PointLight();
      expect(mgr.addDynamicLight(light)).toBeNull();
    });

    it('addDynamicLight disables shadows if level does not allow', () => {
      const scene = createTestScene();
      const mgr = createTestManager({ initialLevel: 2 }); // additionalLightShadows: false
      mgr.attachToScene(scene);

      const light = new THREE.SpotLight(0xffffff, 1.0);
      light.castShadow = true;
      mgr.addDynamicLight(light);
      expect(light.castShadow).toBe(false);
    });

    it('addDynamicLight preserves shadows if level allows', () => {
      const scene = createTestScene();
      const mgr = createTestManager({ initialLevel: 3 }); // additionalLightShadows: true
      mgr.attachToScene(scene);

      const light = new THREE.SpotLight(0xffffff, 1.0);
      light.castShadow = true;
      mgr.addDynamicLight(light);
      expect(light.castShadow).toBe(true);
    });

    it('removeDynamicLight frees a slot', () => {
      const scene = createTestScene();
      const mgr = createTestManager({ initialLevel: 2 });
      mgr.attachToScene(scene);

      const light = new THREE.PointLight();
      mgr.addDynamicLight(light);
      expect(mgr.getAvailableLightSlots()).toBe(1);

      mgr.removeDynamicLight(light);
      expect(mgr.getAvailableLightSlots()).toBe(2);
    });
  });

  // ===========================================================================
  // AUTO-DOWNGRADE
  // ===========================================================================

  describe('auto-downgrade', () => {
    beforeEach(() => {
      vi.spyOn(performance, 'now').mockReturnValue(10000);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('downgrades after consecutive low FPS checks', () => {
      const onLevelChange = vi.fn();
      const mgr = new LightingFidelityManager({
        initialLevel: 3,
        autoDowngrade: true,
        autoUpgrade: false,
        downgradeConsecutiveChecks: 3,
        changeCooldownMs: 0, // Disable cooldown for test
        onLevelChange,
      });
      mgr.setTargetFPS(72);

      // Target * 0.85 = 61.2, so FPS of 50 should trigger
      mgr.evaluatePerformance(50); // consecutiveLow = 1
      expect(onLevelChange).not.toHaveBeenCalled();

      mgr.evaluatePerformance(50); // consecutiveLow = 2
      expect(onLevelChange).not.toHaveBeenCalled();

      mgr.evaluatePerformance(50); // consecutiveLow = 3 -> downgrade!
      expect(onLevelChange).toHaveBeenCalledTimes(1);
      expect(mgr.getLevel()).toBe(2);
    });

    it('does not downgrade below minLevel', () => {
      const mgr = new LightingFidelityManager({
        initialLevel: 1,
        minLevel: 1,
        autoDowngrade: true,
        autoUpgrade: false,
        downgradeConsecutiveChecks: 1,
        changeCooldownMs: 0,
      });
      mgr.setTargetFPS(72);

      mgr.evaluatePerformance(30);
      expect(mgr.getLevel()).toBe(1); // Should not go below minLevel
    });

    it('resets consecutive counter after downgrade', () => {
      const onLevelChange = vi.fn();
      const mgr = new LightingFidelityManager({
        initialLevel: 4,
        autoDowngrade: true,
        autoUpgrade: false,
        downgradeConsecutiveChecks: 2,
        changeCooldownMs: 0,
        onLevelChange,
      });
      mgr.setTargetFPS(72);

      mgr.evaluatePerformance(30);
      mgr.evaluatePerformance(30); // Downgrade 4 -> 3
      expect(mgr.getLevel()).toBe(3);

      // Counter should be reset, so next two checks needed again
      mgr.evaluatePerformance(30);
      expect(mgr.getLevel()).toBe(3); // Not yet
      mgr.evaluatePerformance(30); // Downgrade 3 -> 2
      expect(mgr.getLevel()).toBe(2);
    });

    it('does not downgrade when autoDowngrade is disabled', () => {
      const mgr = new LightingFidelityManager({
        initialLevel: 3,
        autoDowngrade: false,
        changeCooldownMs: 0,
      });
      mgr.setTargetFPS(72);

      for (let i = 0; i < 10; i++) {
        mgr.evaluatePerformance(10);
      }
      expect(mgr.getLevel()).toBe(3);
    });
  });

  // ===========================================================================
  // AUTO-UPGRADE
  // ===========================================================================

  describe('auto-upgrade', () => {
    beforeEach(() => {
      vi.spyOn(performance, 'now').mockReturnValue(10000);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('upgrades after consecutive high FPS checks', () => {
      const onLevelChange = vi.fn();
      const mgr = new LightingFidelityManager({
        initialLevel: 1,
        autoDowngrade: false,
        autoUpgrade: true,
        upgradeConsecutiveChecks: 3,
        changeCooldownMs: 0,
        onLevelChange,
      });
      mgr.setTargetFPS(72);

      // Target * 1.25 = 90, so FPS of 100 should trigger
      mgr.evaluatePerformance(100); // consecutiveHigh = 1
      mgr.evaluatePerformance(100); // consecutiveHigh = 2
      mgr.evaluatePerformance(100); // consecutiveHigh = 3 -> upgrade!
      expect(onLevelChange).toHaveBeenCalledTimes(1);
      expect(mgr.getLevel()).toBe(2);
    });

    it('does not upgrade above maxLevel', () => {
      const mgr = new LightingFidelityManager({
        initialLevel: 3,
        maxLevel: 3,
        autoDowngrade: false,
        autoUpgrade: true,
        upgradeConsecutiveChecks: 1,
        changeCooldownMs: 0,
      });
      mgr.setTargetFPS(72);

      mgr.evaluatePerformance(200);
      expect(mgr.getLevel()).toBe(3);
    });

    it('does not upgrade when autoUpgrade is disabled', () => {
      const mgr = new LightingFidelityManager({
        initialLevel: 1,
        autoUpgrade: false,
        changeCooldownMs: 0,
      });
      mgr.setTargetFPS(72);

      for (let i = 0; i < 20; i++) {
        mgr.evaluatePerformance(200);
      }
      expect(mgr.getLevel()).toBe(1);
    });
  });

  // ===========================================================================
  // COOLDOWN
  // ===========================================================================

  describe('cooldown', () => {
    it('respects cooldown period after a level change', () => {
      let nowMs = 10000;
      vi.spyOn(performance, 'now').mockImplementation(() => nowMs);

      const mgr = new LightingFidelityManager({
        initialLevel: 3,
        autoDowngrade: true,
        autoUpgrade: false,
        downgradeConsecutiveChecks: 1,
        changeCooldownMs: 4000,
      });
      mgr.setTargetFPS(72);

      // First downgrade at t=10000
      mgr.evaluatePerformance(30);
      expect(mgr.getLevel()).toBe(2);

      // Try again at t=12000 (within cooldown)
      nowMs = 12000;
      mgr.evaluatePerformance(30);
      expect(mgr.getLevel()).toBe(2); // Still 2, cooldown active

      // Try again at t=15000 (cooldown expired)
      nowMs = 15000;
      mgr.evaluatePerformance(30);
      expect(mgr.getLevel()).toBe(1); // Now downgrades

      vi.restoreAllMocks();
    });
  });

  // ===========================================================================
  // STABLE FPS RESETS COUNTERS
  // ===========================================================================

  describe('stable FPS behavior', () => {
    beforeEach(() => {
      vi.spyOn(performance, 'now').mockReturnValue(10000);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('resets low counter when FPS is in acceptable band', () => {
      const mgr = new LightingFidelityManager({
        initialLevel: 3,
        autoDowngrade: true,
        autoUpgrade: true,
        downgradeConsecutiveChecks: 3,
        changeCooldownMs: 0,
      });
      mgr.setTargetFPS(72);

      // Two low FPS checks
      mgr.evaluatePerformance(50);
      mgr.evaluatePerformance(50);
      // Then a good check (between 61.2 and 90)
      mgr.evaluatePerformance(72);
      // Then two more low checks
      mgr.evaluatePerformance(50);
      mgr.evaluatePerformance(50);
      // Should NOT downgrade because counter was reset
      expect(mgr.getLevel()).toBe(3);
    });
  });

  // ===========================================================================
  // METRICS
  // ===========================================================================

  describe('metrics', () => {
    it('reports correct initial metrics', () => {
      const mgr = createTestManager({ initialLevel: 2 });
      const metrics = mgr.getMetrics();

      expect(metrics.currentLevel).toBe(2);
      expect(metrics.currentLevelName).toBe('Standard');
      expect(metrics.totalDowngrades).toBe(0);
      expect(metrics.totalUpgrades).toBe(0);
      expect(metrics.consecutiveLowFrames).toBe(0);
      expect(metrics.consecutiveHighFrames).toBe(0);
    });

    it('tracks downgrade count', () => {
      const mgr = createTestManager({ initialLevel: 3 });
      mgr.setLevel(2);
      mgr.setLevel(1);
      expect(mgr.getMetrics().totalDowngrades).toBe(2);
      expect(mgr.getMetrics().totalUpgrades).toBe(0);
    });

    it('tracks upgrade count', () => {
      const mgr = createTestManager({ initialLevel: 1 });
      mgr.setLevel(2);
      mgr.setLevel(3);
      expect(mgr.getMetrics().totalUpgrades).toBe(2);
      expect(mgr.getMetrics().totalDowngrades).toBe(0);
    });

    it('reports active light count', () => {
      const scene = createTestScene();
      const mgr = createTestManager({ initialLevel: 2 });
      mgr.attachToScene(scene);

      const metrics = mgr.getMetrics();
      expect(metrics.activeLightCount).toBe(2); // ambient + directional
      expect(metrics.activeShadowCasterCount).toBe(1); // directional with shadow
    });

    it('reports light count for level 0', () => {
      const scene = createTestScene();
      const mgr = createTestManager({ initialLevel: 0 });
      mgr.attachToScene(scene);

      const metrics = mgr.getMetrics();
      expect(metrics.activeLightCount).toBe(1); // ambient only
      expect(metrics.activeShadowCasterCount).toBe(0);
    });
  });

  // ===========================================================================
  // SUMMARY
  // ===========================================================================

  describe('summary', () => {
    it('returns human-readable summary', () => {
      const mgr = createTestManager({ initialLevel: 4 });
      const summary = mgr.getSummary();
      expect(summary).toContain('L4');
      expect(summary).toContain('Cinematic');
      expect(summary).toContain('Sun');
      expect(summary).toContain('Shadows');
      expect(summary).toContain('IBL');
      expect(summary).toContain('RTR');
    });

    it('level 0 summary has no shadow or IBL', () => {
      const mgr = createTestManager({ initialLevel: 0 });
      const summary = mgr.getSummary();
      expect(summary).toContain('L0');
      expect(summary).toContain('Unlit');
      expect(summary).not.toContain('Sun');
      expect(summary).not.toContain('Shadows');
    });
  });

  // ===========================================================================
  // RUNTIME CONFIG
  // ===========================================================================

  describe('runtime configuration', () => {
    it('setAutoDowngrade toggles the flag', () => {
      const mgr = createTestManager({ autoDowngrade: true });
      mgr.setAutoDowngrade(false);
      expect(mgr.getMetrics().autoDowngradeEnabled).toBe(false);
      mgr.setAutoDowngrade(true);
      expect(mgr.getMetrics().autoDowngradeEnabled).toBe(true);
    });

    it('setAutoUpgrade toggles the flag', () => {
      const mgr = createTestManager({ autoUpgrade: true });
      mgr.setAutoUpgrade(false);
      expect(mgr.getMetrics().autoUpgradeEnabled).toBe(false);
    });

    it('getConfig returns full resolved configuration', () => {
      const mgr = createTestManager();
      const config = mgr.getConfig();
      expect(config.initialLevel).toBe(2);
      expect(config.changeCooldownMs).toBe(4000);
      expect(config.downgradeConsecutiveChecks).toBe(3);
      expect(config.upgradeConsecutiveChecks).toBe(5);
    });
  });

  // ===========================================================================
  // FACTORY FUNCTIONS
  // ===========================================================================

  describe('factory functions', () => {
    it('createLightingFidelityManager creates with defaults', () => {
      const mgr = createLightingFidelityManager();
      expect(mgr.getLevel()).toBe(2);
    });

    it('createLightingFidelityManager accepts config', () => {
      const mgr = createLightingFidelityManager({ initialLevel: 4 });
      expect(mgr.getLevel()).toBe(4);
    });

    it('createLightingFidelityManagerForDevice returns appropriate level for mobile', () => {
      const mgr = createLightingFidelityManagerForDevice('mobile', 'low');
      expect(mgr.getLevel()).toBe(0);
    });

    it('createLightingFidelityManagerForDevice returns appropriate level for desktop ultra', () => {
      const mgr = createLightingFidelityManagerForDevice('desktop', 'ultra');
      expect(mgr.getLevel()).toBe(4);
    });

    it('createLightingFidelityManagerForDevice returns appropriate level for Quest 3', () => {
      const mgr = createLightingFidelityManagerForDevice('quest3', 'medium');
      expect(mgr.getLevel()).toBe(2);
    });

    it('createLightingFidelityManagerForDevice handles unknown device', () => {
      const mgr = createLightingFidelityManagerForDevice('some-future-device', 'medium');
      expect(mgr.getLevel()).toBe(1); // unknown -> medium -> 1
    });
  });

  // ===========================================================================
  // PRESETS INTEGRITY
  // ===========================================================================

  describe('presets integrity', () => {
    it('all 5 levels are defined', () => {
      expect(Object.keys(LIGHTING_FIDELITY_PRESETS)).toHaveLength(5);
    });

    it('all levels have correct names', () => {
      expect(LIGHTING_FIDELITY_NAMES[0]).toBe('Unlit');
      expect(LIGHTING_FIDELITY_NAMES[1]).toBe('Basic');
      expect(LIGHTING_FIDELITY_NAMES[2]).toBe('Standard');
      expect(LIGHTING_FIDELITY_NAMES[3]).toBe('Enhanced');
      expect(LIGHTING_FIDELITY_NAMES[4]).toBe('Cinematic');
    });

    it('GPU cost multiplier increases with level', () => {
      for (let i = 0; i < 4; i++) {
        const lower = LIGHTING_FIDELITY_PRESETS[i as LightingFidelityLevel].gpuCostMultiplier;
        const higher = LIGHTING_FIDELITY_PRESETS[(i + 1) as LightingFidelityLevel].gpuCostMultiplier;
        expect(higher).toBeGreaterThan(lower);
      }
    });

    it('shadow map size increases with level (when shadows enabled)', () => {
      const l2 = LIGHTING_FIDELITY_PRESETS[2].shadowMapSize;
      const l3 = LIGHTING_FIDELITY_PRESETS[3].shadowMapSize;
      const l4 = LIGHTING_FIDELITY_PRESETS[4].shadowMapSize;
      expect(l3).toBeGreaterThan(l2);
      expect(l4).toBeGreaterThan(l3);
    });

    it('maxAdditionalLights increases with level', () => {
      expect(LIGHTING_FIDELITY_PRESETS[0].maxAdditionalLights).toBe(0);
      expect(LIGHTING_FIDELITY_PRESETS[1].maxAdditionalLights).toBe(0);
      expect(LIGHTING_FIDELITY_PRESETS[2].maxAdditionalLights).toBe(2);
      expect(LIGHTING_FIDELITY_PRESETS[3].maxAdditionalLights).toBe(6);
      expect(LIGHTING_FIDELITY_PRESETS[4].maxAdditionalLights).toBe(12);
    });
  });

  // ===========================================================================
  // DISPOSAL
  // ===========================================================================

  describe('disposal', () => {
    it('dispose cleans up all resources', () => {
      const scene = createTestScene();
      const mgr = createTestManager({ initialLevel: 3 });
      mgr.attachToScene(scene);

      const childCountWithLights = scene.children.length;
      expect(childCountWithLights).toBeGreaterThan(0);

      mgr.dispose();

      expect(mgr.getAmbientLight()).toBeNull();
      expect(mgr.getDirectionalLight()).toBeNull();
    });
  });
});
