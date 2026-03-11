/**
 * PhysicsValidator
 *
 * Validator #1 of the 3-validator cross-validation protocol.
 * Ground-truth oracle: @holoscript/core PhysicsSafetyEnvelope.
 *
 * Validates all physics-related state deltas against the immutable
 * PHYSICS_SAFETY_ENVELOPE bounds derived from HoloScript trait schemas:
 *   - Linear velocity magnitude (ThrowableTrait.max_velocity * 2x)
 *   - Angular velocity magnitude (RotatableTrait.speed * 4*PI)
 *   - Force magnitude
 *   - Impulse magnitude
 *   - Gravity scale bounds
 *   - Mass bounds
 *   - Position bounds (world radius)
 *   - Acceleration bounds
 *
 * The validator also enforces physics constraints on transforms
 * (position bounds) and world settings (gravity vectors).
 *
 * @module PhysicsValidator
 * @version 1.0.0
 */

import {
  PHYSICS_SAFETY_ENVELOPE,
  vectorMagnitude,
  type PhysicsSafetyBounds,
} from '../PhysicsSafetyEnvelope';

import type {
  Validator,
  ValidatorId,
  ValidationResult,
  ValidationViolation,
  StateDelta,
  PhysicsDeltaPayload,
  TransformDeltaPayload,
  WorldDeltaPayload,
  CompositeDeltaPayload,
} from './CrossValidationTypes';

// =============================================================================
// PHYSICS VALIDATOR
// =============================================================================

/**
 * Validates state deltas against the immutable physics safety envelope.
 *
 * This validator uses the same PHYSICS_SAFETY_ENVELOPE that the
 * PhysicsSafetyEnforcer uses at runtime. The difference is:
 *   - PhysicsSafetyEnforcer CLAMPS values (lossy, for real-time safety)
 *   - PhysicsValidator REJECTS deltas (lossless, for consensus protocol)
 *
 * A delta that would require clamping at runtime is rejected here,
 * forcing agents to propose values within safe bounds.
 */
export class PhysicsValidator implements Validator {
  readonly id: ValidatorId = 'physics';
  readonly name = 'Physics Safety Oracle';

  private readonly envelope: Readonly<PhysicsSafetyBounds>;

  constructor(envelope?: Readonly<PhysicsSafetyBounds>) {
    this.envelope = envelope ?? PHYSICS_SAFETY_ENVELOPE;
  }

  /**
   * Validate a state delta against physics safety bounds.
   *
   * Routes validation based on delta category:
   *   - physics: Full physics property validation
   *   - transform: Position bounds validation
   *   - world: Gravity vector validation
   *   - composite: Validates each sub-delta
   *   - material/trait: Accepted (not physics domain)
   */
  validate(delta: StateDelta): ValidationResult {
    const start = performance.now();
    const violations: ValidationViolation[] = [];

    switch (delta.payload.type) {
      case 'physics':
        this.validatePhysicsPayload(delta.payload, violations);
        break;

      case 'transform':
        this.validateTransformPayload(delta.payload, violations);
        break;

      case 'world':
        this.validateWorldPayload(delta.payload, violations);
        break;

      case 'composite':
        this.validateCompositePayload(delta.payload, violations);
        break;

      case 'material':
      case 'trait':
        // Not in physics domain — accept by default
        break;
    }

    const durationMs = performance.now() - start;
    const hasErrors = violations.some(v => v.severity === 'error');

    return {
      validatorId: this.id,
      verdict: hasErrors ? 'reject' : 'accept',
      reason: hasErrors
        ? `Physics safety violation: ${violations.filter(v => v.severity === 'error').length} constraint(s) exceeded`
        : 'All physics properties within safety envelope',
      violations,
      durationMs,
      deltaId: delta.id,
    };
  }

  // ---- Physics payload validation ------------------------------------------

  private validatePhysicsPayload(
    payload: PhysicsDeltaPayload,
    violations: ValidationViolation[],
  ): void {
    // Linear velocity
    if (payload.velocity) {
      const mag = vectorMagnitude(payload.velocity as number[]);
      if (mag > this.envelope.maxLinearVelocity) {
        violations.push({
          property: 'velocity',
          proposedValue: mag,
          constraint: 'maxLinearVelocity',
          bound: this.envelope.maxLinearVelocity,
          severity: 'error',
          suggestion: `Reduce velocity magnitude from ${mag.toFixed(2)} to <= ${this.envelope.maxLinearVelocity} m/s`,
        });
      }
      this.checkFiniteVector('velocity', payload.velocity, violations);
    }

    // Angular velocity
    if (payload.angularVelocity) {
      const mag = vectorMagnitude(payload.angularVelocity as number[]);
      if (mag > this.envelope.maxAngularVelocity) {
        violations.push({
          property: 'angularVelocity',
          proposedValue: mag,
          constraint: 'maxAngularVelocity',
          bound: this.envelope.maxAngularVelocity,
          severity: 'error',
          suggestion: `Reduce angular velocity from ${mag.toFixed(2)} to <= ${this.envelope.maxAngularVelocity.toFixed(2)} rad/s`,
        });
      }
      this.checkFiniteVector('angularVelocity', payload.angularVelocity, violations);
    }

    // Force
    if (payload.force) {
      const mag = vectorMagnitude(payload.force as number[]);
      if (mag > this.envelope.maxForceMagnitude) {
        violations.push({
          property: 'force',
          proposedValue: mag,
          constraint: 'maxForceMagnitude',
          bound: this.envelope.maxForceMagnitude,
          severity: 'error',
          suggestion: `Reduce force from ${mag.toFixed(2)} to <= ${this.envelope.maxForceMagnitude} N`,
        });
      }
      this.checkFiniteVector('force', payload.force, violations);
    }

    // Impulse
    if (payload.impulse) {
      const mag = vectorMagnitude(payload.impulse as number[]);
      if (mag > this.envelope.maxImpulseMagnitude) {
        violations.push({
          property: 'impulse',
          proposedValue: mag,
          constraint: 'maxImpulseMagnitude',
          bound: this.envelope.maxImpulseMagnitude,
          severity: 'error',
          suggestion: `Reduce impulse from ${mag.toFixed(2)} to <= ${this.envelope.maxImpulseMagnitude} N*s`,
        });
      }
      this.checkFiniteVector('impulse', payload.impulse, violations);
    }

    // Mass
    if (payload.mass !== undefined) {
      if (!Number.isFinite(payload.mass)) {
        violations.push({
          property: 'mass',
          proposedValue: payload.mass,
          constraint: 'finite',
          severity: 'error',
          suggestion: 'Mass must be a finite number',
        });
      } else if (payload.mass < this.envelope.minMass) {
        violations.push({
          property: 'mass',
          proposedValue: payload.mass,
          constraint: 'minMass',
          bound: this.envelope.minMass,
          severity: 'error',
          suggestion: `Increase mass from ${payload.mass} to >= ${this.envelope.minMass} kg`,
        });
      } else if (payload.mass > this.envelope.maxMass) {
        violations.push({
          property: 'mass',
          proposedValue: payload.mass,
          constraint: 'maxMass',
          bound: this.envelope.maxMass,
          severity: 'error',
          suggestion: `Reduce mass from ${payload.mass} to <= ${this.envelope.maxMass} kg`,
        });
      }
    }

    // Gravity scale
    if (payload.gravityScale !== undefined) {
      if (!Number.isFinite(payload.gravityScale)) {
        violations.push({
          property: 'gravityScale',
          proposedValue: payload.gravityScale,
          constraint: 'finite',
          severity: 'error',
          suggestion: 'Gravity scale must be a finite number',
        });
      } else if (payload.gravityScale < this.envelope.minGravityScale) {
        violations.push({
          property: 'gravityScale',
          proposedValue: payload.gravityScale,
          constraint: 'minGravityScale',
          bound: this.envelope.minGravityScale,
          severity: 'error',
          suggestion: `Increase gravity scale from ${payload.gravityScale} to >= ${this.envelope.minGravityScale}`,
        });
      } else if (payload.gravityScale > this.envelope.maxGravityScale) {
        violations.push({
          property: 'gravityScale',
          proposedValue: payload.gravityScale,
          constraint: 'maxGravityScale',
          bound: this.envelope.maxGravityScale,
          severity: 'error',
          suggestion: `Reduce gravity scale from ${payload.gravityScale} to <= ${this.envelope.maxGravityScale}`,
        });
      }
    }

    // Position
    if (payload.position) {
      const mag = vectorMagnitude(payload.position as number[]);
      if (mag > this.envelope.maxPositionMagnitude) {
        violations.push({
          property: 'position',
          proposedValue: mag,
          constraint: 'maxPositionMagnitude',
          bound: this.envelope.maxPositionMagnitude,
          severity: 'error',
          suggestion: `Position ${mag.toFixed(2)}m from origin exceeds world radius of ${this.envelope.maxPositionMagnitude}m`,
        });
      }
      this.checkFiniteVector('position', payload.position, violations);
    }

    // Acceleration
    if (payload.acceleration) {
      const mag = vectorMagnitude(payload.acceleration as number[]);
      if (mag > this.envelope.maxAcceleration) {
        violations.push({
          property: 'acceleration',
          proposedValue: mag,
          constraint: 'maxAcceleration',
          bound: this.envelope.maxAcceleration,
          severity: 'error',
          suggestion: `Reduce acceleration from ${mag.toFixed(2)} to <= ${this.envelope.maxAcceleration} m/s^2`,
        });
      }
      this.checkFiniteVector('acceleration', payload.acceleration, violations);
    }
  }

  // ---- Transform payload validation ----------------------------------------

  private validateTransformPayload(
    payload: TransformDeltaPayload,
    violations: ValidationViolation[],
  ): void {
    // Validate position is within world bounds
    if (payload.position) {
      const mag = vectorMagnitude(payload.position as number[]);
      if (mag > this.envelope.maxPositionMagnitude) {
        violations.push({
          property: 'transform.position',
          proposedValue: mag,
          constraint: 'maxPositionMagnitude',
          bound: this.envelope.maxPositionMagnitude,
          severity: 'error',
          suggestion: `Position ${mag.toFixed(2)}m from origin exceeds world radius of ${this.envelope.maxPositionMagnitude}m`,
        });
      }
      this.checkFiniteVector('transform.position', payload.position, violations);
    }

    // Validate scale is within reasonable bounds (advisory)
    if (payload.scale) {
      for (let i = 0; i < 3; i++) {
        const val = payload.scale[i];
        if (!Number.isFinite(val)) {
          violations.push({
            property: `transform.scale[${i}]`,
            proposedValue: val,
            constraint: 'finite',
            severity: 'error',
            suggestion: 'Scale components must be finite numbers',
          });
        } else if (val <= 0) {
          violations.push({
            property: `transform.scale[${i}]`,
            proposedValue: val,
            constraint: 'positive',
            severity: 'error',
            suggestion: 'Scale components must be positive',
          });
        } else if (val > 1000) {
          violations.push({
            property: `transform.scale[${i}]`,
            proposedValue: val,
            constraint: 'maxScale',
            bound: 1000,
            severity: 'warning',
            suggestion: 'Scale exceeds 1000x — may cause rendering issues',
          });
        }
      }
    }

    // Validate rotation components are finite
    if (payload.rotation) {
      this.checkFiniteVector('transform.rotation', payload.rotation, violations);
    }
  }

  // ---- World payload validation --------------------------------------------

  private validateWorldPayload(
    payload: WorldDeltaPayload,
    violations: ValidationViolation[],
  ): void {
    // Validate world gravity vector
    if (payload.gravity) {
      const mag = vectorMagnitude(payload.gravity as number[]);
      // World gravity: allow up to maxAcceleration (in m/s^2)
      if (mag > this.envelope.maxAcceleration) {
        violations.push({
          property: 'world.gravity',
          proposedValue: mag,
          constraint: 'maxAcceleration',
          bound: this.envelope.maxAcceleration,
          severity: 'error',
          suggestion: `World gravity magnitude ${mag.toFixed(2)} exceeds max acceleration of ${this.envelope.maxAcceleration} m/s^2`,
        });
      }
      this.checkFiniteVector('world.gravity', payload.gravity, violations);
    }
  }

  // ---- Composite payload validation ----------------------------------------

  private validateCompositePayload(
    payload: CompositeDeltaPayload,
    violations: ValidationViolation[],
  ): void {
    for (const subPayload of payload.deltas) {
      switch (subPayload.type) {
        case 'physics':
          this.validatePhysicsPayload(subPayload, violations);
          break;
        case 'transform':
          this.validateTransformPayload(subPayload, violations);
          break;
        case 'world':
          this.validateWorldPayload(subPayload, violations);
          break;
        case 'composite':
          this.validateCompositePayload(subPayload, violations);
          break;
      }
    }
  }

  // ---- Utility -------------------------------------------------------------

  /**
   * Check that all components of a vector are finite numbers.
   * NaN/Infinity injection is a common AI attack vector.
   */
  private checkFiniteVector(
    property: string,
    vector: readonly [number, number, number] | readonly number[],
    violations: ValidationViolation[],
  ): void {
    for (let i = 0; i < vector.length; i++) {
      if (!Number.isFinite(vector[i])) {
        violations.push({
          property: `${property}[${i}]`,
          proposedValue: vector[i],
          constraint: 'finite',
          severity: 'error',
          suggestion: `Component ${property}[${i}] must be a finite number, got ${vector[i]}`,
        });
      }
    }
  }

  /**
   * Get the safety envelope this validator uses (read-only).
   */
  getEnvelope(): Readonly<PhysicsSafetyBounds> {
    return this.envelope;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a PhysicsValidator with the default or custom safety envelope.
 */
export function createPhysicsValidator(
  envelope?: Readonly<PhysicsSafetyBounds>,
): PhysicsValidator {
  return new PhysicsValidator(envelope);
}
