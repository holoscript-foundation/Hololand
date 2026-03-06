/**
 * PlatformRuntime
 *
 * The unified entry point for "Activating" the Hololand Platform.
 * Wires all domain-specific bridges (Audio, Physics, Network, Renderer)
 * into a single TraitContextFactory that powers the HoloScript engine.
 */

import { createTraitContextFactory, TraitContextFactory } from './TraitContextFactory';
import { createSpatialAudioBridge, SpatialAudioBridgeConfig } from '@hololand/audio';
import { createPhysicsExpansionBridge } from '@hololand/world';
import { createAccessibilityBridge, AccessibilityBridgeConfig } from '@hololand/accessibility';
import { createHololandNetwork, NetworkSystem } from '@hololand/network';
import { createVolumetricBridge, VolumetricBridgeConfig } from '@hololand/renderer';

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
}

export class PlatformRuntime {
  public traitFactory: TraitContextFactory;
  public network: NetworkSystem | undefined;

  constructor(config: RuntimeConfig) {
    // 1. Create Physics Bridge (Phase 13)
    const physicsBridge = createPhysicsExpansionBridge(config.physicsEngine);
    
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
      ...config.volumetric
    });

    // 5. Create Network Bridge (Phase 10 & 7)
    let networkBridge = undefined;
    if (config.network) {
      this.network = createHololandNetwork({ url: config.network.url });
      networkBridge = this.network.bridge;
      
      // Auto-connect if needed, or leave to app
      // console.log('[PlatformRuntime] Network initialized');
    }

    // 6. Create the Unified Trait Context Factory
    // This is what VRTraitRegistry needs to breathe life into traits
    this.traitFactory = createTraitContextFactory({
      physics: physicsBridge,
      audio: audioBridge,
      accessibility: accessibilityBridge,
      renderer: volumetricBridge,
      network: networkBridge,
      
      // VR Provider is typically derived from the Renderer's XR session
      // For now, we leave it as default/noop or user can inject later via setter
      // vr: ... 
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
}

export function createPlatformRuntime(config: RuntimeConfig): PlatformRuntime {
  return new PlatformRuntime(config);
}
