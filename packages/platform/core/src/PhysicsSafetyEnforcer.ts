/**
 * PhysicsSafetyEnforcer
 *
 * Runtime enforcement layer that wraps any PhysicsProvider with immutable
 * safety envelope clamping. This is the platform-level firewall between
 * AI-generated physics values and the actual physics engine.
 *
 * Architecture:
 *   [AI Agent / Trait Handler] -> applyVelocity(node, [999, 0, 0])
 *                                    |
 *                     [PhysicsSafetyEnforcer] clamps to [100, 0, 0]
 *                                    |
 *                     [Real PhysicsProvider] receives safe value
 *
 * The enforcer:
 *   1. Intercepts every physics mutation call (velocity, angular velocity, force)
 *   2. Clamps vector magnitudes against PHYSICS_SAFETY_ENVELOPE
 *   3. Logs every clamping event (never silently drops energy)
 *   4. Forwards clamped values to the underlying PhysicsProvider
 *   5. Emits 'physics_safety_clamp' events for monitoring/dashboards
 *
 * Integration: Used in PlatformRuntime to wrap the physics bridge before
 * it reaches the TraitContextFactory, ensuring ALL trait handlers (all 121+)
 * are constrained regardless of what values they compute.
 *
 * @module PhysicsSafetyEnforcer
 * @version 1.0.0
 */

import type { PhysicsProvider } from '@holoscript/core';

import {
  PHYSICS_SAFETY_ENVELOPE,
  enforceLinearVelocity,
  enforceAngularVelocity,
  enforceForce,
  enforceImpulse,
  type PhysicsSafetyBounds,
  type ClampEvent,
} from './PhysicsSafetyEnvelope';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Callback invoked whenever a physics value is clamped.
 * Platforms can use this for logging, monitoring, or UI alerts.
 */
export type ClampEventHandler = (event: ClampEvent) => void;

/**
 * Configuration for the PhysicsSafetyEnforcer.
 */
export interface PhysicsSafetyEnforcerConfig {
  /** The underlying physics provider to wrap */
  provider: PhysicsProvider;
  /** Optional: custom envelope (defaults to PHYSICS_SAFETY_ENVELOPE) */
  envelope?: Readonly<PhysicsSafetyBounds>;
  /** Optional: callback on every clamp event */
  onClamp?: ClampEventHandler;
  /** Optional: maximum clamp events to retain in history (default 1000) */
  maxHistory?: number;
  /** Optional: enable console warnings on clamp (default true) */
  warnOnClamp?: boolean;
}

/**
 * Statistics about safety envelope enforcement.
 */
export interface SafetyEnforcerStats {
  /** Total number of physics calls processed */
  totalCalls: number;
  /** Total number of values that were clamped */
  totalClamped: number;
  /** Breakdown by parameter type */
  clampsByParameter: Record<string, number>;
  /** Most recent clamp events */
  recentClamps: readonly ClampEvent[];
  /** Clamp rate (clamped / total) */
  clampRate: number;
}

// =============================================================================
// ENFORCER IMPLEMENTATION
// =============================================================================

/**
 * Wraps a PhysicsProvider with immutable safety envelope enforcement.
 *
 * Every method that accepts physics values (velocity, angular velocity, etc.)
 * clamps the values before forwarding to the underlying provider.
 * Methods that don't involve physics magnitudes (setKinematic, raycast) are
 * passed through unchanged.
 */
export class PhysicsSafetyEnforcer implements PhysicsProvider {
  private readonly inner: PhysicsProvider;
  private readonly envelope: Readonly<PhysicsSafetyBounds>;
  private readonly onClamp: ClampEventHandler | undefined;
  private readonly maxHistory: number;
  private readonly warnOnClamp: boolean;

  private clampHistory: ClampEvent[] = [];
  private totalCalls: number = 0;
  private totalClamped: number = 0;
  private clampsByParameter: Record<string, number> = {};

  constructor(config: PhysicsSafetyEnforcerConfig) {
    this.inner = config.provider;
    this.envelope = config.envelope ?? PHYSICS_SAFETY_ENVELOPE;
    this.onClamp = config.onClamp;
    this.maxHistory = config.maxHistory ?? 1000;
    this.warnOnClamp = config.warnOnClamp ?? true;
  }

  // ---- PhysicsProvider interface (with enforcement) -----------------------

  /**
   * Apply linear velocity with safety clamping.
   * Clamps velocity magnitude to PHYSICS_SAFETY_ENVELOPE.maxLinearVelocity.
   */
  applyVelocity(
    nodeId: string,
    velocity: [number, number, number] | { x: number; y: number; z: number }
  ): void {
    this.totalCalls++;

    const result = enforceLinearVelocity(
      velocity as readonly number[],
      this.envelope,
      nodeId,
      'applyVelocity'
    );

    if (result.clamped && result.event) {
      this.recordClamp(result.event);
    }

    this.inner.applyVelocity(nodeId, result.value);
  }

  /**
   * Apply angular velocity with safety clamping.
   * Clamps angular velocity magnitude to PHYSICS_SAFETY_ENVELOPE.maxAngularVelocity.
   */
  applyAngularVelocity(
    nodeId: string,
    angularVelocity: [number, number, number] | { x: number; y: number; z: number }
  ): void {
    this.totalCalls++;

    const result = enforceAngularVelocity(
      angularVelocity as readonly number[],
      this.envelope,
      nodeId,
      'applyAngularVelocity'
    );

    if (result.clamped && result.event) {
      this.recordClamp(result.event);
    }

    this.inner.applyAngularVelocity(nodeId, result.value);
  }

  /**
   * Set kinematic state -- pass-through, no clamping needed.
   */
  setKinematic(nodeId: string, kinematic: boolean): void {
    this.inner.setKinematic(nodeId, kinematic);
  }

  /**
   * Raycast -- pass-through, no clamping needed.
   */
  raycast(
    origin: [number, number, number] | { x: number; y: number; z: number },
    direction: [number, number, number] | { x: number; y: number; z: number },
    maxDistance: number
  ): {
    point: [number, number, number] | { x: number; y: number; z: number };
    normal: [number, number, number] | { x: number; y: number; z: number };
    distance: number;
    nodeId: string;
  } | null {
    return this.inner.raycast(origin, direction, maxDistance);
  }

  // ---- Extended enforcement methods (for direct platform usage) -----------

  /**
   * Apply force with safety clamping.
   * Not part of base PhysicsProvider but exposed for platform-level code
   * that may call forces directly.
   */
  enforceAndApplyForce(
    nodeId: string,
    force: readonly number[] | { x: number; y: number; z: number }
  ): [number, number, number] {
    this.totalCalls++;

    const result = enforceForce(force, this.envelope, nodeId, 'applyForce');

    if (result.clamped && result.event) {
      this.recordClamp(result.event);
    }

    return result.value;
  }

  /**
   * Apply impulse with safety clamping.
   */
  enforceAndApplyImpulse(
    nodeId: string,
    impulse: readonly number[] | { x: number; y: number; z: number }
  ): [number, number, number] {
    this.totalCalls++;

    const result = enforceImpulse(impulse, this.envelope, nodeId, 'applyImpulse');

    if (result.clamped && result.event) {
      this.recordClamp(result.event);
    }

    return result.value;
  }

  // ---- Monitoring ---------------------------------------------------------

  /**
   * Get enforcement statistics.
   */
  getStats(): SafetyEnforcerStats {
    return {
      totalCalls: this.totalCalls,
      totalClamped: this.totalClamped,
      clampsByParameter: { ...this.clampsByParameter },
      recentClamps: [...this.clampHistory],
      clampRate: this.totalCalls > 0 ? this.totalClamped / this.totalCalls : 0,
    };
  }

  /**
   * Get the safety envelope being enforced (read-only).
   */
  getEnvelope(): Readonly<PhysicsSafetyBounds> {
    return this.envelope;
  }

  /**
   * Clear enforcement history and counters.
   */
  resetStats(): void {
    this.clampHistory = [];
    this.totalCalls = 0;
    this.totalClamped = 0;
    this.clampsByParameter = {};
  }

  // ---- Internal -----------------------------------------------------------

  private recordClamp(event: ClampEvent): void {
    this.totalClamped++;

    // Track by parameter
    const param = event.parameter;
    this.clampsByParameter[param] = (this.clampsByParameter[param] ?? 0) + 1;

    // Add to history (bounded)
    this.clampHistory.push(event);
    if (this.clampHistory.length > this.maxHistory) {
      this.clampHistory.shift();
    }

    // Console warning
    if (this.warnOnClamp) {
      console.warn(
        `[PhysicsSafety] Clamped ${event.parameter}: ` +
          `requested=${event.requestedValue.toFixed(2)}, ` +
          `capped=${event.clampedValue.toFixed(2)}, ` +
          `node=${event.nodeId ?? 'unknown'}, ` +
          `source=${event.source ?? 'unknown'}`
      );
    }

    // External handler
    if (this.onClamp) {
      this.onClamp(event);
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a PhysicsSafetyEnforcer wrapping the given PhysicsProvider.
 *
 * Usage in PlatformRuntime:
 * ```ts
 * const safePhysics = createPhysicsSafetyEnforcer({
 *   provider: rawPhysicsBridge,
 *   onClamp: (event) => telemetry.record('physics_clamp', event),
 * });
 * ```
 */
export function createPhysicsSafetyEnforcer(
  config: PhysicsSafetyEnforcerConfig
): PhysicsSafetyEnforcer {
  return new PhysicsSafetyEnforcer(config);
}

/**
 * Convenience: wrap a PhysicsProvider with default safety envelope.
 * Returns a PhysicsProvider-compatible object.
 */
export function wrapWithSafetyEnvelope(
  provider: PhysicsProvider,
  onClamp?: ClampEventHandler
): PhysicsSafetyEnforcer {
  return new PhysicsSafetyEnforcer({
    provider,
    onClamp,
  });
}
