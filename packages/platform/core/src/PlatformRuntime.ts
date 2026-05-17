/**
 * PlatformRuntime
 *
 * The unified entry point for "Activating" the Hololand Platform.
 * Wires all domain-specific bridges (Audio, Physics, Network, Renderer)
 * into a single TraitContextFactory that powers the HoloScript engine.
 *
 * SAFETY: All physics values pass through the PhysicsSafetyEnforcer before
 * reaching the real physics engine. This enforces immutable hard caps on
 * velocity, angular velocity, force, and impulse magnitudes -- preventing
 * any AI-generated value from any agent from exceeding safe platform bounds.
 */

import { createTraitContextFactory, TraitContextFactory } from './TraitContextFactory';
import { createSpatialAudioBridge } from '@hololand/audio';
import { createPhysicsExpansionBridge } from '@hololand/world';
import { createAccessibilityBridge, AccessibilityBridgeConfig } from '@hololand/accessibility';
import { createHololandNetwork, NetworkSystem } from '@hololand/network';
import { createVolumetricBridge, VolumetricBridgeConfig } from '@hololand/renderer';

// Physics Safety Envelope -- immutable platform-level bounds
import {
  PhysicsSafetyEnforcer,
  wrapWithSafetyEnvelope,
  type ClampEventHandler,
  type SafetyEnforcerStats,
} from './PhysicsSafetyEnforcer';
import type { PhysicsSafetyBounds } from './PhysicsSafetyEnvelope';

// Import Runtime Types from Packages
import type { HololandRenderer } from '@hololand/renderer';
import type { PhysicsEngine } from '@hololand/world';
import type { SpatialAudioEngine } from '@hololand/audio';

export interface RuntimeConfig {
  renderer: HololandRenderer;
  physicsEngine: PhysicsEngine;
  audioEngine: SpatialAudioEngine;

  // Bridge Configurations
  accessibility?: AccessibilityBridgeConfig;
  network?: {
    url: string;
    roomId?: string;
    localPeerId?: string; // Optional override
  };
  volumetric?: Partial<VolumetricBridgeConfig>;

  // Physics Safety Configuration
  /** Optional: custom physics safety envelope (defaults to built-in PHYSICS_SAFETY_ENVELOPE) */
  physicsSafetyEnvelope?: Readonly<PhysicsSafetyBounds>;
  /** Optional: callback invoked whenever a physics value is clamped by the safety envelope */
  onPhysicsClamp?: ClampEventHandler;
  /** Optional: disable safety envelope (NOT recommended -- only for debugging) */
  disablePhysicsSafety?: boolean;
}

export class PlatformRuntime {
  public traitFactory: TraitContextFactory;
  public network: NetworkSystem | undefined;
  /** The physics safety enforcer wrapping the raw physics bridge */
  public physicsSafetyEnforcer: PhysicsSafetyEnforcer | undefined;

  constructor(config: RuntimeConfig) {
    // 1. Create Physics Bridge (Phase 13)
    const rawPhysicsBridge = createPhysicsExpansionBridge(config.physicsEngine);

    // 1b. Wrap with Physics Safety Envelope (immutable hard caps)
    // This is the platform-level firewall that prevents any AI-generated
    // value from exceeding safe physics bounds.
    let physicsBridge = rawPhysicsBridge;
    if (!config.disablePhysicsSafety) {
      this.physicsSafetyEnforcer = wrapWithSafetyEnvelope(rawPhysicsBridge, config.onPhysicsClamp);
      physicsBridge = this.physicsSafetyEnforcer;
    }

    // 2. Create Audio Bridge (Phase 8)
    const audioBridge = createSpatialAudioBridge({
      engine: config.audioEngine,
    });

    // 3. Create Accessibility Bridge (Phase 3)
    const accessibilityBridge = createAccessibilityBridge(config.accessibility);

    // 4. Create Volumetric/Renderer Bridge (Phase 4 & 5)
    // Note: VolumetricBridge requires Renderer which is passed in config
    const volumetricBridge = createVolumetricBridge({
      renderer: config.renderer,
      ...config.volumetric,
    });

    // 5. Create Network Bridge (Phase 10 & 7)
    let networkBridge = undefined;
    if (config.network) {
      this.network = createHololandNetwork({ url: config.network.url });
      networkBridge = this.network.bridge;
    }

    // 6. Create the Unified Trait Context Factory
    // Physics goes through the safety enforcer, so ALL 121+ trait handlers
    // are automatically constrained by the immutable safety envelope.
    this.traitFactory = createTraitContextFactory({
      physics: physicsBridge,
      audio: audioBridge,
      accessibility: accessibilityBridge,
      renderer: volumetricBridge,
      network: networkBridge,
    });
  }

  /**
   * Start the runtime loops (e.g. network update)
   */
  update(delta: number): void {
    if (this.network) {
      this.network.update(delta);
    }
  }

  getTraitFactory(): TraitContextFactory {
    return this.traitFactory;
  }

  /**
   * Get physics safety enforcement statistics.
   * Returns undefined if safety envelope is disabled.
   */
  getPhysicsSafetyStats(): SafetyEnforcerStats | undefined {
    return this.physicsSafetyEnforcer?.getStats();
  }

  /**
   * Check if physics safety envelope is active.
   */
  isPhysicsSafetyEnabled(): boolean {
    return this.physicsSafetyEnforcer !== undefined;
  }
}

export function createPlatformRuntime(config: RuntimeConfig): PlatformRuntime {
  return new PlatformRuntime(config);
}
