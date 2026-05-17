/**
 * PhysicsSafetyEnvelope
 *
 * Immutable, platform-level physics safety bounds derived from @holoscript/core
 * trait schemas. These hard caps cannot be overridden by any AI-generated value,
 * any agent, or any runtime configuration. They are the absolute outer boundary
 * of physically-safe values in the Hololand VR runtime.
 *
 * Design principles:
 *   1. FROZEN at module load -- Object.freeze() prevents mutation
 *   2. DERIVED from HoloScript source trait defaults (ThrowableTrait, ScalableTrait,
 *      RotatableTrait) with platform-level safety multipliers
 *   3. ENFORCED at the PhysicsProvider boundary, before any trait handler runs
 *   4. LOGGED when clamping occurs -- silent safety is unsafe
 *
 * The envelope is intentionally MORE restrictive than what individual trait
 * schemas allow. A trait may declare max_velocity: 50, but the platform
 * envelope caps at 100 to allow trait-level configuration up to 2x default
 * while still preventing unbounded AI-generated values (e.g., velocity: 999999).
 *
 * Covers:
 *   - Linear velocity magnitude (m/s)
 *   - Angular velocity magnitude (rad/s)
 *   - Applied force magnitude (N)
 *   - Gravity scale multiplier
 *   - Mass bounds (kg)
 *   - Impulse magnitude (N*s)
 *   - Position bounds (m from origin)
 *
 * @module PhysicsSafetyEnvelope
 * @version 1.0.0
 */

// =============================================================================
// SAFETY ENVELOPE INTERFACE
// =============================================================================

/**
 * Immutable physics safety bounds. Every field is a hard maximum or
 * min/max pair. These values are derived from HoloScript trait schemas
 * with a 2x platform safety margin.
 *
 * Derivation rationale:
 *   - ThrowableTrait.max_velocity default = 50 m/s -> platform cap 100 m/s
 *   - RotatableTrait.speed default = 1 -> platform angular cap 4*PI rad/s (~2 rev/s)
 *   - ThrowableTrait.gravityScale default = 1.0 -> platform cap 10.0 (10x Earth)
 *   - ScalableTrait.min/max_scale = 0.1/10 -> mass bounds derived from scale^3
 */
export interface PhysicsSafetyBounds {
  // -- Linear velocity --
  /** Maximum linear velocity magnitude in m/s */
  readonly maxLinearVelocity: number;

  // -- Angular velocity --
  /** Maximum angular velocity magnitude in rad/s */
  readonly maxAngularVelocity: number;

  // -- Force --
  /** Maximum applied force magnitude in Newtons */
  readonly maxForceMagnitude: number;

  // -- Impulse --
  /** Maximum impulse magnitude in N*s */
  readonly maxImpulseMagnitude: number;

  // -- Gravity --
  /** Minimum gravity scale multiplier (0 = zero-g allowed) */
  readonly minGravityScale: number;
  /** Maximum gravity scale multiplier */
  readonly maxGravityScale: number;

  // -- Mass --
  /** Minimum mass in kg (prevents zero/negative mass) */
  readonly minMass: number;
  /** Maximum mass in kg */
  readonly maxMass: number;

  // -- Position --
  /** Maximum distance from world origin in meters */
  readonly maxPositionMagnitude: number;

  // -- Acceleration --
  /** Maximum acceleration magnitude in m/s^2 */
  readonly maxAcceleration: number;
}

/**
 * A single clamping event record for auditing/logging.
 */
export interface ClampEvent {
  /** ISO timestamp */
  readonly timestamp: string;
  /** Which parameter was clamped */
  readonly parameter: keyof PhysicsSafetyBounds;
  /** The raw value that was requested */
  readonly requestedValue: number;
  /** The clamped value that was applied */
  readonly clampedValue: number;
  /** The hard cap that triggered clamping */
  readonly hardCap: number;
  /** Optional: node ID that triggered this */
  readonly nodeId?: string;
  /** Optional: which trait/agent originated the value */
  readonly source?: string;
}

// =============================================================================
// IMMUTABLE SAFETY ENVELOPE
// =============================================================================

/**
 * The canonical physics safety envelope for the Hololand VR platform.
 *
 * This object is deeply frozen at module load time. No runtime code,
 * no AI agent, no hot-reload can mutate these values.
 *
 * Derivation from @holoscript/core trait defaults:
 *
 *   maxLinearVelocity:   100 m/s  (ThrowableTrait.max_velocity=50 * 2x safety)
 *   maxAngularVelocity:  4*PI     (~12.57 rad/s, ~2 revolutions/s)
 *   maxForceMagnitude:   10000 N  (reasonable VR interaction force)
 *   maxImpulseMagnitude: 5000 N*s (reasonable VR interaction impulse)
 *   minGravityScale:     0.0      (zero-g is valid for space/void zones)
 *   maxGravityScale:     10.0     (10x Earth gravity)
 *   minMass:             0.001 kg (1 gram minimum, prevents division-by-zero)
 *   maxMass:             100000   (100 tonnes, covers vehicles/structures)
 *   maxPositionMagnitude: 10000 m (10km world radius)
 *   maxAcceleration:     500 m/s^2 (~50g, covers explosive physics)
 */
const _PHYSICS_SAFETY_ENVELOPE: PhysicsSafetyBounds = {
  maxLinearVelocity: 100,
  maxAngularVelocity: 4 * Math.PI,
  maxForceMagnitude: 10000,
  maxImpulseMagnitude: 5000,
  minGravityScale: 0.0,
  maxGravityScale: 10.0,
  minMass: 0.001,
  maxMass: 100000,
  maxPositionMagnitude: 10000,
  maxAcceleration: 500,
};

/**
 * The immutable physics safety envelope.
 * Frozen at module load -- cannot be modified at runtime.
 */
export const PHYSICS_SAFETY_ENVELOPE: Readonly<PhysicsSafetyBounds> =
  Object.freeze(_PHYSICS_SAFETY_ENVELOPE);

// =============================================================================
// CLAMPING FUNCTIONS
// =============================================================================

/**
 * Clamp a scalar value to the range [-max, +max].
 * Returns the clamped value. Pure function, no side effects.
 */
export function clampSymmetric(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-max, Math.min(max, value));
}

/**
 * Clamp a scalar value to the range [min, max].
 * Returns the clamped value. Pure function, no side effects.
 */
export function clampRange(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute the magnitude of a 3D vector [x, y, z] or {x, y, z}.
 */
export function vectorMagnitude(
  v: readonly number[] | { x: number; y: number; z: number }
): number {
  if (Array.isArray(v)) {
    const x = v[0] ?? 0;
    const y = v[1] ?? 0;
    const z = v[2] ?? 0;
    return Math.sqrt(x * x + y * y + z * z);
  }
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * Clamp a 3D vector's magnitude to a maximum value.
 * If the vector's magnitude exceeds `max`, it is scaled down to `max` magnitude.
 * Returns a new array (never mutates input).
 *
 * Works with both array [x,y,z] and object {x,y,z} forms.
 * Always returns array form [x,y,z] for consistency.
 */
export function clampVectorMagnitude(
  v: readonly number[] | { x: number; y: number; z: number },
  max: number
): [number, number, number] {
  let x: number, y: number, z: number;

  if (Array.isArray(v)) {
    x = v[0] ?? 0;
    y = v[1] ?? 0;
    z = v[2] ?? 0;
  } else {
    x = v.x;
    y = v.y;
    z = v.z;
  }

  // Handle NaN/Infinity
  if (!Number.isFinite(x)) x = 0;
  if (!Number.isFinite(y)) y = 0;
  if (!Number.isFinite(z)) z = 0;

  const magnitude = Math.sqrt(x * x + y * y + z * z);

  if (magnitude <= max || magnitude === 0) {
    return [x, y, z];
  }

  const scale = max / magnitude;
  return [x * scale, y * scale, z * scale];
}

// =============================================================================
// SAFETY ENFORCEMENT API
// =============================================================================

/**
 * Enforce physics safety bounds on a linear velocity vector.
 * Returns [clampedVelocity, clampEvent?].
 */
export function enforceLinearVelocity(
  velocity: readonly number[] | { x: number; y: number; z: number },
  envelope: Readonly<PhysicsSafetyBounds> = PHYSICS_SAFETY_ENVELOPE,
  nodeId?: string,
  source?: string
): { value: [number, number, number]; clamped: boolean; event?: ClampEvent } {
  const mag = vectorMagnitude(velocity);
  const value = clampVectorMagnitude(velocity, envelope.maxLinearVelocity);
  const clamped = mag > envelope.maxLinearVelocity;

  return {
    value,
    clamped,
    event: clamped
      ? {
          timestamp: new Date().toISOString(),
          parameter: 'maxLinearVelocity',
          requestedValue: mag,
          clampedValue: envelope.maxLinearVelocity,
          hardCap: envelope.maxLinearVelocity,
          nodeId,
          source,
        }
      : undefined,
  };
}

/**
 * Enforce physics safety bounds on an angular velocity vector.
 * Returns [clampedAngularVelocity, clampEvent?].
 */
export function enforceAngularVelocity(
  angularVelocity: readonly number[] | { x: number; y: number; z: number },
  envelope: Readonly<PhysicsSafetyBounds> = PHYSICS_SAFETY_ENVELOPE,
  nodeId?: string,
  source?: string
): { value: [number, number, number]; clamped: boolean; event?: ClampEvent } {
  const mag = vectorMagnitude(angularVelocity);
  const value = clampVectorMagnitude(angularVelocity, envelope.maxAngularVelocity);
  const clamped = mag > envelope.maxAngularVelocity;

  return {
    value,
    clamped,
    event: clamped
      ? {
          timestamp: new Date().toISOString(),
          parameter: 'maxAngularVelocity',
          requestedValue: mag,
          clampedValue: envelope.maxAngularVelocity,
          hardCap: envelope.maxAngularVelocity,
          nodeId,
          source,
        }
      : undefined,
  };
}

/**
 * Enforce physics safety bounds on an applied force vector.
 */
export function enforceForce(
  force: readonly number[] | { x: number; y: number; z: number },
  envelope: Readonly<PhysicsSafetyBounds> = PHYSICS_SAFETY_ENVELOPE,
  nodeId?: string,
  source?: string
): { value: [number, number, number]; clamped: boolean; event?: ClampEvent } {
  const mag = vectorMagnitude(force);
  const value = clampVectorMagnitude(force, envelope.maxForceMagnitude);
  const clamped = mag > envelope.maxForceMagnitude;

  return {
    value,
    clamped,
    event: clamped
      ? {
          timestamp: new Date().toISOString(),
          parameter: 'maxForceMagnitude',
          requestedValue: mag,
          clampedValue: envelope.maxForceMagnitude,
          hardCap: envelope.maxForceMagnitude,
          nodeId,
          source,
        }
      : undefined,
  };
}

/**
 * Enforce physics safety bounds on an impulse vector.
 */
export function enforceImpulse(
  impulse: readonly number[] | { x: number; y: number; z: number },
  envelope: Readonly<PhysicsSafetyBounds> = PHYSICS_SAFETY_ENVELOPE,
  nodeId?: string,
  source?: string
): { value: [number, number, number]; clamped: boolean; event?: ClampEvent } {
  const mag = vectorMagnitude(impulse);
  const value = clampVectorMagnitude(impulse, envelope.maxImpulseMagnitude);
  const clamped = mag > envelope.maxImpulseMagnitude;

  return {
    value,
    clamped,
    event: clamped
      ? {
          timestamp: new Date().toISOString(),
          parameter: 'maxImpulseMagnitude',
          requestedValue: mag,
          clampedValue: envelope.maxImpulseMagnitude,
          hardCap: envelope.maxImpulseMagnitude,
          nodeId,
          source,
        }
      : undefined,
  };
}

/**
 * Enforce gravity scale bounds.
 */
export function enforceGravityScale(
  gravityScale: number,
  envelope: Readonly<PhysicsSafetyBounds> = PHYSICS_SAFETY_ENVELOPE,
  nodeId?: string,
  source?: string
): { value: number; clamped: boolean; event?: ClampEvent } {
  const value = clampRange(gravityScale, envelope.minGravityScale, envelope.maxGravityScale);
  const clamped = value !== gravityScale || !Number.isFinite(gravityScale);

  return {
    value,
    clamped,
    event: clamped
      ? {
          timestamp: new Date().toISOString(),
          parameter:
            gravityScale < envelope.minGravityScale ? 'minGravityScale' : 'maxGravityScale',
          requestedValue: gravityScale,
          clampedValue: value,
          hardCap:
            gravityScale < envelope.minGravityScale
              ? envelope.minGravityScale
              : envelope.maxGravityScale,
          nodeId,
          source,
        }
      : undefined,
  };
}

/**
 * Enforce mass bounds.
 */
export function enforceMass(
  mass: number,
  envelope: Readonly<PhysicsSafetyBounds> = PHYSICS_SAFETY_ENVELOPE,
  nodeId?: string,
  source?: string
): { value: number; clamped: boolean; event?: ClampEvent } {
  const value = clampRange(mass, envelope.minMass, envelope.maxMass);
  const clamped = value !== mass || !Number.isFinite(mass);

  return {
    value,
    clamped,
    event: clamped
      ? {
          timestamp: new Date().toISOString(),
          parameter: mass < envelope.minMass ? 'minMass' : 'maxMass',
          requestedValue: mass,
          clampedValue: value,
          hardCap: mass < envelope.minMass ? envelope.minMass : envelope.maxMass,
          nodeId,
          source,
        }
      : undefined,
  };
}

/**
 * Enforce position bounds (distance from origin).
 */
export function enforcePosition(
  position: readonly number[] | { x: number; y: number; z: number },
  envelope: Readonly<PhysicsSafetyBounds> = PHYSICS_SAFETY_ENVELOPE,
  nodeId?: string,
  source?: string
): { value: [number, number, number]; clamped: boolean; event?: ClampEvent } {
  const mag = vectorMagnitude(position);
  const value = clampVectorMagnitude(position, envelope.maxPositionMagnitude);
  const clamped = mag > envelope.maxPositionMagnitude;

  return {
    value,
    clamped,
    event: clamped
      ? {
          timestamp: new Date().toISOString(),
          parameter: 'maxPositionMagnitude',
          requestedValue: mag,
          clampedValue: envelope.maxPositionMagnitude,
          hardCap: envelope.maxPositionMagnitude,
          nodeId,
          source,
        }
      : undefined,
  };
}

// =============================================================================
// ENVELOPE VALIDATION
// =============================================================================

/**
 * Validate that the safety envelope itself is internally consistent.
 * Called at module load to catch configuration errors immediately.
 * Returns array of error messages (empty = valid).
 */
export function validateEnvelope(envelope: Readonly<PhysicsSafetyBounds>): string[] {
  const errors: string[] = [];

  if (envelope.maxLinearVelocity <= 0) {
    errors.push('maxLinearVelocity must be positive');
  }
  if (envelope.maxAngularVelocity <= 0) {
    errors.push('maxAngularVelocity must be positive');
  }
  if (envelope.maxForceMagnitude <= 0) {
    errors.push('maxForceMagnitude must be positive');
  }
  if (envelope.maxImpulseMagnitude <= 0) {
    errors.push('maxImpulseMagnitude must be positive');
  }
  if (envelope.minGravityScale < 0) {
    errors.push('minGravityScale must be non-negative');
  }
  if (envelope.maxGravityScale <= envelope.minGravityScale) {
    errors.push('maxGravityScale must exceed minGravityScale');
  }
  if (envelope.minMass <= 0) {
    errors.push('minMass must be positive');
  }
  if (envelope.maxMass <= envelope.minMass) {
    errors.push('maxMass must exceed minMass');
  }
  if (envelope.maxPositionMagnitude <= 0) {
    errors.push('maxPositionMagnitude must be positive');
  }
  if (envelope.maxAcceleration <= 0) {
    errors.push('maxAcceleration must be positive');
  }

  return errors;
}

// Self-validate on module load
const _envelopeErrors = validateEnvelope(PHYSICS_SAFETY_ENVELOPE);
if (_envelopeErrors.length > 0) {
  throw new Error(
    `[PhysicsSafetyEnvelope] CRITICAL: Built-in envelope is invalid:\n${_envelopeErrors.join('\n')}`
  );
}
