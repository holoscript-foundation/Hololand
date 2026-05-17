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
import { createAccessibilityBridge } from '@hololand/accessibility';
import { createHololandNetwork } from '@hololand/network';
import { createVolumetricBridge } from '@hololand/renderer';

// Physics Safety Envelope -- immutable platform-level bounds
import {
  PhysicsSafetyEnforcer,
  wrapWithSafetyEnvelope,
  type ClampEventHandler,
  type SafetyEnforcerStats,
} from './PhysicsSafetyEnforcer';
import type { PhysicsSafetyBounds } from './PhysicsSafetyEnvelope';
import type { NetworkProvider, PhysicsProvider, Vector3 as HoloVector3 } from '@holoscript/core';

type AccessibilityBridgeConfig = Parameters<typeof createAccessibilityBridge>[0];
type HololandRenderer = Parameters<typeof createVolumetricBridge>[0]['renderer'];
type NetworkSystem = ReturnType<typeof createHololandNetwork>;
type PhysicsEngine = Parameters<typeof createPhysicsExpansionBridge>[0];
type SpatialAudioEngine = Parameters<typeof createSpatialAudioBridge>[0]['engine'];
type VolumetricBridgeConfig = Omit<Parameters<typeof createVolumetricBridge>[0], 'renderer'>;

interface WorldVector3 {
  x: number;
  y: number;
  z: number;
}

interface WorldPhysicsBridge {
  applyVelocity(nodeId: string, velocity: WorldVector3): void;
  applyAngularVelocity(nodeId: string, angularVelocity: WorldVector3): void;
  setKinematic(nodeId: string, kinematic: boolean): void;
  raycast(
    origin: WorldVector3,
    direction: WorldVector3,
    maxDistance: number
  ): { point: WorldVector3; normal: WorldVector3; distance: number; nodeId: string } | null;
}

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
    const safePhysicsTarget = adaptWorldPhysicsBridge(rawPhysicsBridge);

    // 1b. Wrap with Physics Safety Envelope (immutable hard caps)
    // This is the platform-level firewall that prevents any AI-generated
    // value from exceeding safe physics bounds.
    let physicsBridge: PhysicsProvider = safePhysicsTarget;
    if (!config.disablePhysicsSafety) {
      this.physicsSafetyEnforcer = wrapWithSafetyEnvelope(safePhysicsTarget, config.onPhysicsClamp);
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
    let networkBridge: NetworkProvider | undefined = undefined;
    if (config.network) {
      this.network = createHololandNetwork({ url: config.network.url });
      networkBridge = adaptNetworkSystem(this.network);
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

function toWorldVector3(vector: HoloVector3): WorldVector3 {
  return {
    x: vector[0],
    y: vector[1],
    z: vector[2],
  };
}

function toHoloVector3(vector: WorldVector3): HoloVector3 {
  return [vector.x, vector.y, vector.z];
}

function adaptWorldPhysicsBridge(provider: WorldPhysicsBridge): PhysicsProvider {
  return {
    applyVelocity(nodeId, velocity) {
      provider.applyVelocity(nodeId, toWorldVector3(velocity));
    },
    applyAngularVelocity(nodeId, angularVelocity) {
      provider.applyAngularVelocity(nodeId, toWorldVector3(angularVelocity));
    },
    setKinematic(nodeId, kinematic) {
      provider.setKinematic(nodeId, kinematic);
    },
    raycast(origin, direction, maxDistance) {
      const hit = provider.raycast(toWorldVector3(origin), toWorldVector3(direction), maxDistance);
      if (!hit) return null;
      return {
        point: toHoloVector3(hit.point),
        normal: toHoloVector3(hit.normal),
        distance: hit.distance,
        bodyId: hit.nodeId,
      };
    },
  };
}

function adaptNetworkSystem(system: NetworkSystem): NetworkProvider {
  return {
    broadcastState(nodeId, state) {
      system.bridge.send({
        type: 'state:broadcast',
        payload: { nodeId, state },
        timestamp: Date.now(),
      });
    },
    requestAuthority(nodeId) {
      return system.bridge.send({
        type: 'authority:request',
        payload: { nodeId },
        timestamp: Date.now(),
      });
    },
    onRemoteUpdate(nodeId, callback) {
      system.bridge.onMessage('state:remote', (message) => {
        const payload = message.payload as
          | { nodeId?: string; state?: Record<string, unknown> }
          | undefined;
        if (payload?.nodeId === nodeId && payload.state) {
          callback(payload.state);
        }
      });
    },
  };
}
