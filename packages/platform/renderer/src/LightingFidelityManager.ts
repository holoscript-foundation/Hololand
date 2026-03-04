/**
 * LightingFidelityManager
 *
 * Manages a 5-level lighting fidelity spectrum (0-4) with automatic
 * performance-based downgrade and upgrade. Integrates with the existing
 * QualityManager's frame-time history to make adaptive decisions.
 *
 * Architecture:
 * - Each level defines ambient, directional, shadow, additional-light, and IBL settings.
 * - Auto-downgrade triggers when FPS stays below threshold for N consecutive checks.
 * - Auto-upgrade triggers when FPS stays above a higher threshold for M consecutive checks.
 * - A cooldown prevents oscillation between adjacent levels.
 * - Three.js scene lights are created/removed/updated to match the active level.
 *
 * IMPORTANT: This system operates within the VR 11.1ms frame budget constraint.
 * Light updates are batched and only applied on level transitions, not per-frame.
 */

import * as THREE from 'three';
import type {
  LightingFidelityLevel,
  LightingFidelitySettings,
  LightingFidelityConfig,
} from './types';
import {
  LIGHTING_FIDELITY_PRESETS,
  LIGHTING_FIDELITY_NAMES,
} from './types';
import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

/** Metrics exposed for debugging and UI display. */
export interface LightingFidelityMetrics {
  currentLevel: LightingFidelityLevel;
  currentLevelName: string;
  autoDowngradeEnabled: boolean;
  autoUpgradeEnabled: boolean;
  consecutiveLowFrames: number;
  consecutiveHighFrames: number;
  lastChangeTimestamp: number;
  totalDowngrades: number;
  totalUpgrades: number;
  activeLightCount: number;
  activeShadowCasterCount: number;
}

// =============================================================================
// MANAGED LIGHT REFERENCES
// =============================================================================

interface ManagedLights {
  ambient: THREE.AmbientLight | null;
  directional: THREE.DirectionalLight | null;
  additional: THREE.Light[];
}

// =============================================================================
// LIGHTING FIDELITY MANAGER
// =============================================================================

export class LightingFidelityManager {
  // --- Configuration ---
  private config: Required<LightingFidelityConfig>;

  // --- State ---
  private currentLevel: LightingFidelityLevel;
  private currentSettings: Readonly<LightingFidelitySettings>;

  // --- Three.js references ---
  private scene: THREE.Scene | null = null;
  private managedLights: ManagedLights = {
    ambient: null,
    directional: null,
    additional: [],
  };

  // --- Adaptive tracking ---
  private consecutiveLowFrames: number = 0;
  private consecutiveHighFrames: number = 0;
  private lastChangeTimestamp: number = 0;
  private totalDowngrades: number = 0;
  private totalUpgrades: number = 0;

  // --- Target FPS (injected from QualityManager) ---
  private targetFPS: number = 72;

  constructor(config: LightingFidelityConfig = {}) {
    const initialLevel = config.initialLevel ?? 2;

    this.config = {
      initialLevel,
      autoDowngrade: config.autoDowngrade ?? true,
      autoUpgrade: config.autoUpgrade ?? true,
      minLevel: config.minLevel ?? 0,
      maxLevel: config.maxLevel ?? 4,
      downgradeThresholdFactor: config.downgradeThresholdFactor ?? 0.85,
      upgradeThresholdFactor: config.upgradeThresholdFactor ?? 1.25,
      downgradeConsecutiveChecks: config.downgradeConsecutiveChecks ?? 3,
      upgradeConsecutiveChecks: config.upgradeConsecutiveChecks ?? 5,
      changeCooldownMs: config.changeCooldownMs ?? 4000,
      onLevelChange: config.onLevelChange ?? (() => {}),
    };

    this.currentLevel = initialLevel;
    this.currentSettings = LIGHTING_FIDELITY_PRESETS[initialLevel];

    logger.info('[LightingFidelityManager] Created', {
      level: initialLevel,
      name: this.currentSettings.name,
    });
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  /**
   * Attach the manager to a Three.js scene.
   * Creates the managed lights for the current fidelity level.
   */
  attachToScene(scene: THREE.Scene): void {
    if (this.scene) {
      this.detachFromScene();
    }

    this.scene = scene;
    this.applyCurrentLevel();

    logger.info('[LightingFidelityManager] Attached to scene', {
      level: this.currentLevel,
    });
  }

  /**
   * Detach from the current scene, removing all managed lights.
   */
  detachFromScene(): void {
    if (!this.scene) return;
    this.removeManagedLights();
    this.scene = null;

    logger.info('[LightingFidelityManager] Detached from scene');
  }

  // ===========================================================================
  // LEVEL CONTROL
  // ===========================================================================

  /**
   * Get the current lighting fidelity level.
   */
  getLevel(): LightingFidelityLevel {
    return this.currentLevel;
  }

  /**
   * Get the current lighting fidelity settings (read-only).
   */
  getSettings(): Readonly<LightingFidelitySettings> {
    return this.currentSettings;
  }

  /**
   * Manually set the lighting fidelity level.
   * Respects min/max bounds.
   */
  setLevel(level: LightingFidelityLevel): void {
    const clamped = Math.max(this.config.minLevel, Math.min(this.config.maxLevel, level)) as LightingFidelityLevel;

    if (clamped === this.currentLevel) return;

    const oldLevel = this.currentLevel;
    this.currentLevel = clamped;
    this.currentSettings = LIGHTING_FIDELITY_PRESETS[clamped];

    // Reset adaptive counters
    this.consecutiveLowFrames = 0;
    this.consecutiveHighFrames = 0;
    this.lastChangeTimestamp = performance.now();

    // Track direction
    if (clamped < oldLevel) {
      this.totalDowngrades++;
    } else {
      this.totalUpgrades++;
    }

    // Apply to scene
    if (this.scene) {
      this.applyCurrentLevel();
    }

    logger.info('[LightingFidelityManager] Level changed', {
      from: oldLevel,
      to: clamped,
      fromName: LIGHTING_FIDELITY_NAMES[oldLevel],
      toName: this.currentSettings.name,
    });

    this.config.onLevelChange(oldLevel, clamped, 'manual');
  }

  /**
   * Set the target FPS used for adaptive threshold calculation.
   * Typically called when the QualityManager changes presets.
   */
  setTargetFPS(fps: number): void {
    this.targetFPS = fps;
  }

  // ===========================================================================
  // ADAPTIVE PERFORMANCE MONITORING
  // ===========================================================================

  /**
   * Called periodically (typically every 2 seconds from QualityManager) with
   * the current average FPS. Evaluates whether to step down or up.
   *
   * This method is intentionally lightweight: it does not touch the scene
   * graph. Scene updates only happen on actual level transitions.
   *
   * @param averageFPS - Current rolling average FPS
   */
  evaluatePerformance(averageFPS: number): void {
    const now = performance.now();

    // Respect cooldown
    if (now - this.lastChangeTimestamp < this.config.changeCooldownMs) {
      return;
    }

    const downgradeThreshold = this.targetFPS * this.config.downgradeThresholdFactor;
    const upgradeThreshold = this.targetFPS * this.config.upgradeThresholdFactor;

    // --- Downgrade check ---
    if (this.config.autoDowngrade && averageFPS < downgradeThreshold) {
      this.consecutiveLowFrames++;
      this.consecutiveHighFrames = 0;

      if (
        this.consecutiveLowFrames >= this.config.downgradeConsecutiveChecks &&
        this.currentLevel > this.config.minLevel
      ) {
        const newLevel = (this.currentLevel - 1) as LightingFidelityLevel;
        const oldLevel = this.currentLevel;

        this.currentLevel = newLevel;
        this.currentSettings = LIGHTING_FIDELITY_PRESETS[newLevel];
        this.consecutiveLowFrames = 0;
        this.consecutiveHighFrames = 0;
        this.lastChangeTimestamp = now;
        this.totalDowngrades++;

        if (this.scene) {
          this.applyCurrentLevel();
        }

        logger.info('[LightingFidelityManager] Auto-downgrade', {
          from: oldLevel,
          to: newLevel,
          averageFPS: Math.round(averageFPS),
          threshold: Math.round(downgradeThreshold),
        });

        this.config.onLevelChange(oldLevel, newLevel, `auto-downgrade (FPS: ${Math.round(averageFPS)} < ${Math.round(downgradeThreshold)})`);
      }
    }
    // --- Upgrade check ---
    else if (this.config.autoUpgrade && averageFPS > upgradeThreshold) {
      this.consecutiveHighFrames++;
      this.consecutiveLowFrames = 0;

      if (
        this.consecutiveHighFrames >= this.config.upgradeConsecutiveChecks &&
        this.currentLevel < this.config.maxLevel
      ) {
        const newLevel = (this.currentLevel + 1) as LightingFidelityLevel;
        const oldLevel = this.currentLevel;

        this.currentLevel = newLevel;
        this.currentSettings = LIGHTING_FIDELITY_PRESETS[newLevel];
        this.consecutiveHighFrames = 0;
        this.consecutiveLowFrames = 0;
        this.lastChangeTimestamp = now;
        this.totalUpgrades++;

        if (this.scene) {
          this.applyCurrentLevel();
        }

        logger.info('[LightingFidelityManager] Auto-upgrade', {
          from: oldLevel,
          to: newLevel,
          averageFPS: Math.round(averageFPS),
          threshold: Math.round(upgradeThreshold),
        });

        this.config.onLevelChange(oldLevel, newLevel, `auto-upgrade (FPS: ${Math.round(averageFPS)} > ${Math.round(upgradeThreshold)})`);
      }
    }
    // --- Stable ---
    else {
      // Reset both counters when in the acceptable band
      this.consecutiveLowFrames = 0;
      this.consecutiveHighFrames = 0;
    }
  }

  // ===========================================================================
  // SCENE LIGHT MANAGEMENT
  // ===========================================================================

  /**
   * Apply the current fidelity level to the scene.
   * Removes old managed lights and creates new ones matching the level.
   */
  private applyCurrentLevel(): void {
    if (!this.scene) return;

    const settings = this.currentSettings;

    // Remove all previously managed lights
    this.removeManagedLights();

    // --- Ambient Light ---
    if (settings.ambientEnabled) {
      this.managedLights.ambient = new THREE.AmbientLight(0xffffff, settings.ambientIntensity);
      this.managedLights.ambient.name = '__hololand_lfm_ambient__';
      this.scene.add(this.managedLights.ambient);
    }

    // --- Directional Light (Sun) ---
    if (settings.directionalEnabled) {
      const dirLight = new THREE.DirectionalLight(0xffffff, settings.directionalIntensity);
      dirLight.name = '__hololand_lfm_directional__';
      dirLight.position.set(10, 20, 10);

      if (settings.directionalShadow) {
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = settings.shadowMapSize;
        dirLight.shadow.mapSize.height = settings.shadowMapSize;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 500;
        dirLight.shadow.camera.left = -50;
        dirLight.shadow.camera.right = 50;
        dirLight.shadow.camera.top = 50;
        dirLight.shadow.camera.bottom = -50;

        // Shadow map type is applied to the renderer, not individual lights.
        // The shadow type from settings is returned via getSettings() for the
        // renderer to apply globally.
      } else {
        dirLight.castShadow = false;
      }

      this.managedLights.directional = dirLight;
      this.scene.add(dirLight);
    }

    logger.debug('[LightingFidelityManager] Applied level', {
      level: settings.level,
      name: settings.name,
      ambientIntensity: settings.ambientIntensity,
      directionalIntensity: settings.directionalIntensity,
      shadowMapSize: settings.shadowMapSize,
      maxAdditionalLights: settings.maxAdditionalLights,
    });
  }

  /**
   * Remove all lights that this manager has created from the scene.
   */
  private removeManagedLights(): void {
    if (!this.scene) return;

    if (this.managedLights.ambient) {
      this.scene.remove(this.managedLights.ambient);
      this.managedLights.ambient.dispose();
      this.managedLights.ambient = null;
    }

    if (this.managedLights.directional) {
      // Dispose shadow map if it exists
      if (this.managedLights.directional.shadow.map) {
        this.managedLights.directional.shadow.map.dispose();
      }
      this.scene.remove(this.managedLights.directional);
      this.managedLights.directional.dispose();
      this.managedLights.directional = null;
    }

    for (const light of this.managedLights.additional) {
      this.scene.remove(light);
      light.dispose();
    }
    this.managedLights.additional = [];
  }

  // ===========================================================================
  // ADDITIONAL LIGHT MANAGEMENT
  // ===========================================================================

  /**
   * Add a dynamic light to the managed set.
   * Respects the current level's maxAdditionalLights limit.
   * Returns the light if added, or null if the limit is reached.
   */
  addDynamicLight(light: THREE.PointLight | THREE.SpotLight): THREE.Light | null {
    if (!this.scene) return null;

    if (this.managedLights.additional.length >= this.currentSettings.maxAdditionalLights) {
      logger.debug('[LightingFidelityManager] Additional light limit reached', {
        max: this.currentSettings.maxAdditionalLights,
        current: this.managedLights.additional.length,
      });
      return null;
    }

    // Enforce shadow policy
    if (!this.currentSettings.additionalLightShadows) {
      light.castShadow = false;
    }

    light.name = `__hololand_lfm_additional_${this.managedLights.additional.length}__`;
    this.managedLights.additional.push(light);
    this.scene.add(light);

    return light;
  }

  /**
   * Remove a dynamic light from the managed set.
   */
  removeDynamicLight(light: THREE.Light): void {
    if (!this.scene) return;

    const index = this.managedLights.additional.indexOf(light);
    if (index !== -1) {
      this.managedLights.additional.splice(index, 1);
      this.scene.remove(light);
      light.dispose();
    }
  }

  /**
   * Get the number of additional light slots available at the current level.
   */
  getAvailableLightSlots(): number {
    return Math.max(0, this.currentSettings.maxAdditionalLights - this.managedLights.additional.length);
  }

  // ===========================================================================
  // SHADOW TYPE HELPERS
  // ===========================================================================

  /**
   * Get the Three.js shadow map type corresponding to the current level.
   * Returns null if shadows are disabled at this level.
   */
  getShadowMapType(): THREE.ShadowMapType | null {
    switch (this.currentSettings.shadowType) {
      case 'none': return null;
      case 'basic': return THREE.BasicShadowMap;
      case 'pcf': return THREE.PCFShadowMap;
      case 'pcfsoft': return THREE.PCFSoftShadowMap;
      case 'vsm': return THREE.VSMShadowMap;
      default: return null;
    }
  }

  /**
   * Apply the current level's shadow settings to a Three.js renderer.
   */
  applyShadowSettings(renderer: THREE.WebGLRenderer): void {
    const shadowType = this.getShadowMapType();

    if (shadowType !== null) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = shadowType;
    } else {
      renderer.shadowMap.enabled = false;
    }
  }

  // ===========================================================================
  // METRICS & INSPECTION
  // ===========================================================================

  /**
   * Get current metrics for debugging, UI display, or telemetry.
   */
  getMetrics(): LightingFidelityMetrics {
    let activeLightCount = 0;
    let activeShadowCasterCount = 0;

    if (this.managedLights.ambient) activeLightCount++;
    if (this.managedLights.directional) {
      activeLightCount++;
      if (this.managedLights.directional.castShadow) activeShadowCasterCount++;
    }
    activeLightCount += this.managedLights.additional.length;
    activeShadowCasterCount += this.managedLights.additional.filter(l => l.castShadow).length;

    return {
      currentLevel: this.currentLevel,
      currentLevelName: this.currentSettings.name,
      autoDowngradeEnabled: this.config.autoDowngrade,
      autoUpgradeEnabled: this.config.autoUpgrade,
      consecutiveLowFrames: this.consecutiveLowFrames,
      consecutiveHighFrames: this.consecutiveHighFrames,
      lastChangeTimestamp: this.lastChangeTimestamp,
      totalDowngrades: this.totalDowngrades,
      totalUpgrades: this.totalUpgrades,
      activeLightCount,
      activeShadowCasterCount,
    };
  }

  /**
   * Get a human-readable summary string suitable for UI display.
   */
  getSummary(): string {
    const s = this.currentSettings;
    const parts: string[] = [`L${s.level} ${s.name}`];

    if (s.directionalEnabled) parts.push('Sun');
    if (s.directionalShadow) parts.push(`Shadows(${s.shadowMapSize})`);
    if (s.maxAdditionalLights > 0) parts.push(`+${s.maxAdditionalLights} lights`);
    if (s.iblEnabled) parts.push('IBL');
    if (s.realTimeReflections) parts.push('RTR');

    return parts.join(' | ');
  }

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  /**
   * Enable or disable auto-downgrade at runtime.
   */
  setAutoDowngrade(enabled: boolean): void {
    this.config.autoDowngrade = enabled;
    if (!enabled) {
      this.consecutiveLowFrames = 0;
    }
    logger.info('[LightingFidelityManager] Auto-downgrade', { enabled });
  }

  /**
   * Enable or disable auto-upgrade at runtime.
   */
  setAutoUpgrade(enabled: boolean): void {
    this.config.autoUpgrade = enabled;
    if (!enabled) {
      this.consecutiveHighFrames = 0;
    }
    logger.info('[LightingFidelityManager] Auto-upgrade', { enabled });
  }

  /**
   * Get the current configuration (read-only snapshot).
   */
  getConfig(): Readonly<Required<LightingFidelityConfig>> {
    return { ...this.config };
  }

  // ===========================================================================
  // DIRECTIONAL LIGHT ACCESS
  // ===========================================================================

  /**
   * Get the managed directional light for external positioning or color changes.
   * Returns null if the current level does not include a directional light.
   */
  getDirectionalLight(): THREE.DirectionalLight | null {
    return this.managedLights.directional;
  }

  /**
   * Get the managed ambient light for external intensity or color tweaks.
   */
  getAmbientLight(): THREE.AmbientLight | null {
    return this.managedLights.ambient;
  }

  // ===========================================================================
  // DISPOSAL
  // ===========================================================================

  /**
   * Dispose all resources and detach from the scene.
   */
  dispose(): void {
    this.detachFromScene();
    logger.info('[LightingFidelityManager] Disposed');
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a new LightingFidelityManager.
 */
export function createLightingFidelityManager(
  config?: LightingFidelityConfig,
): LightingFidelityManager {
  return new LightingFidelityManager(config);
}

/**
 * Create a LightingFidelityManager with device-appropriate defaults.
 *
 * @param deviceType - The detected device type
 * @param gpuTier - The detected GPU tier
 */
export function createLightingFidelityManagerForDevice(
  deviceType: string,
  gpuTier: 'low' | 'medium' | 'high' | 'ultra',
): LightingFidelityManager {
  const levelMap: Record<string, Record<string, LightingFidelityLevel>> = {
    mobile:   { low: 0, medium: 1, high: 1, ultra: 2 },
    tablet:   { low: 0, medium: 1, high: 2, ultra: 2 },
    quest2:   { low: 0, medium: 1, high: 1, ultra: 2 },
    quest3:   { low: 1, medium: 2, high: 2, ultra: 3 },
    questPro: { low: 1, medium: 2, high: 2, ultra: 3 },
    pcvr:     { low: 1, medium: 2, high: 3, ultra: 4 },
    desktop:  { low: 1, medium: 2, high: 3, ultra: 4 },
    unknown:  { low: 0, medium: 1, high: 2, ultra: 2 },
  };

  const deviceMap = levelMap[deviceType] ?? levelMap.unknown;
  const level = deviceMap[gpuTier] ?? 2;

  return new LightingFidelityManager({ initialLevel: level });
}
