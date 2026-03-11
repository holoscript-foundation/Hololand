/**
 * SchemaValidator
 *
 * Validator #3 of the 3-validator cross-validation protocol.
 * Ground-truth oracle: @holoscript/core BUILTIN_CONSTRAINTS (traitConstraints.ts).
 *
 * Validates trait-level structural rules for multi-agent world creation:
 *   - requires: Trait A requires traits B, C, ... to be present
 *   - conflicts: Trait A conflicts with traits B, C, ... (cannot coexist)
 *   - oneof: Only one trait from a group can be active at a time
 *
 * This validator ensures that when agents attach/detach traits or modify
 * trait configurations, the resulting entity state is structurally valid
 * according to the HoloScript language specification.
 *
 * The 37 built-in constraints cover:
 *   - Physics & interaction requirements (6 rules)
 *   - Conflict rules (3 rules)
 *   - Platform exclusivity (2 rules)
 *   - Material & mesh dependencies (3 rules)
 *   - Audio requirements (2 rules)
 *   - Interaction exclusivity (1 rule)
 *   - Animation requirements (1 rule)
 *   - Networking requirements (2 rules)
 *   - UI trait constraints (5 rules)
 *   - Spatial constraint requirements (5 rules)
 *   - Spatiotemporal constraint requirements (5 rules)
 *   - Robotics/URDF constraints (2 rules)
 *   - Cultural profile constraints (3 rules)
 *
 * @module SchemaValidator
 * @version 1.0.0
 */

import type {
  Validator,
  ValidatorId,
  ValidationResult,
  ValidationViolation,
  StateDelta,
  TraitDeltaPayload,
  CompositeDeltaPayload,
} from './CrossValidationTypes';

// =============================================================================
// TRAIT CONSTRAINT TYPES (mirroring @holoscript/core TraitConstraint)
// =============================================================================

/**
 * Local representation of a trait constraint from @holoscript/core.
 * Kept local so this module can be tested independently.
 */
interface TraitConstraint {
  type: 'requires' | 'conflicts' | 'oneof';
  source: string;
  targets: string[];
  message: string;
  suggestion?: string;
}

// =============================================================================
// BUILT-IN CONSTRAINTS (from @holoscript/core traitConstraints.ts)
// =============================================================================

/**
 * The complete set of built-in trait constraints from @holoscript/core.
 * This is the ground-truth oracle for structural validation.
 *
 * IMPORTANT: This list must be kept in sync with
 * @holoscript/core/src/traits/traitConstraints.ts BUILTIN_CONSTRAINTS.
 * Any mismatch between the two is a schema drift bug.
 */
const BUILTIN_CONSTRAINTS: readonly TraitConstraint[] = [
  // Physics & Interaction Requirements
  { type: 'requires', source: 'physics', targets: ['collidable'], message: 'Physics enabled objects must be collidable.' },
  { type: 'requires', source: 'grabbable', targets: ['physics'], message: 'Grabbable objects require physics to handle movement and collisions.' },
  { type: 'requires', source: 'throwable', targets: ['grabbable'], message: 'Throwable objects must be grabbable first.' },
  { type: 'requires', source: 'stackable', targets: ['physics', 'collidable'], message: 'Stackable objects require physics and collision detection.' },
  { type: 'requires', source: 'breakable', targets: ['physics', 'collidable'], message: 'Breakable objects require physics and collision to detect impacts.' },
  { type: 'requires', source: 'snappable', targets: ['grabbable'], message: 'Snappable objects must be grabbable to snap to positions.' },

  // Conflict Rules
  { type: 'conflicts', source: 'static', targets: ['physics', 'grabbable', 'throwable', 'scalable', 'rotatable'], message: 'Static objects cannot have physics or be interactive.' },
  { type: 'conflicts', source: 'kinematic', targets: ['physics'], message: 'Kinematic objects handle their own motion and conflict with physics simulation.' },
  { type: 'conflicts', source: 'invisible', targets: ['hoverable', 'pointable'], message: 'Invisible objects cannot have hover or pointer visual feedback.' },

  // Platform Exclusivity
  { type: 'conflicts', source: 'vr_only', targets: ['ar_only'], message: 'An object cannot be marked as both VR-only and AR-only.' },
  { type: 'conflicts', source: 'desktop_only', targets: ['vr_only', 'ar_only'], message: 'Desktop-only objects cannot also be VR-only or AR-only.' },

  // Material & Mesh Dependencies
  { type: 'requires', source: 'cloth', targets: ['mesh'], message: 'Cloth physics requires a mesh to deform.' },
  { type: 'requires', source: 'soft_body', targets: ['mesh'], message: 'Soft body physics requires a mesh.' },
  { type: 'requires', source: 'particle_emitter', targets: ['visible'], message: 'Particle emitters must be visible to render particles.' },

  // Audio Requirements
  { type: 'requires', source: 'spatial_audio', targets: ['audio'], message: 'Spatial audio requires an audio source.' },
  { type: 'requires', source: 'audio_zone', targets: ['collidable'], message: 'Audio zones require collision bounds to detect entry/exit.' },

  // Interaction Exclusivity
  { type: 'oneof', source: 'interaction_mode', targets: ['grabbable', 'clickable', 'draggable'], message: 'Objects should have one primary interaction mode.' },

  // Animation Requirements
  { type: 'requires', source: 'animated', targets: ['mesh'], message: 'Animated trait requires a mesh with animation data.' },

  // Networking Requirements
  { type: 'requires', source: 'networked', targets: ['physics'], message: 'Networked objects require physics for state synchronization.' },
  { type: 'conflicts', source: 'local_only', targets: ['networked'], message: 'Local-only objects cannot be networked.' },

  // UI Trait Constraints
  { type: 'conflicts', source: 'ui_floating', targets: ['ui_anchored', 'ui_docked'], message: 'UI panels cannot be both floating and anchored/docked.' },
  { type: 'conflicts', source: 'ui_anchored', targets: ['ui_floating', 'ui_docked'], message: 'UI panels cannot be both anchored and floating/docked.' },
  { type: 'conflicts', source: 'ui_hand_menu', targets: ['ui_anchored', 'ui_docked'], message: 'Hand menus cannot be anchored to world or docked.' },
  { type: 'requires', source: 'ui_keyboard', targets: ['ui_input'], message: 'Keyboard trait requires an input element to target.' },
  { type: 'oneof', source: 'ui_position_mode', targets: ['ui_floating', 'ui_anchored', 'ui_docked', 'ui_hand_menu'], message: 'UI element can only have one positioning mode.' },

  // Spatial Constraint Requirements
  { type: 'requires', source: 'spatial_adjacent', targets: ['collidable'], message: 'spatial_adjacent requires collidable bounds.' },
  { type: 'requires', source: 'spatial_contains', targets: ['collidable'], message: 'spatial_contains requires collidable bounds.' },
  { type: 'requires', source: 'spatial_reachable', targets: ['spatial_awareness'], message: 'spatial_reachable requires spatial_awareness.' },
  { type: 'conflicts', source: 'spatial_contains', targets: ['invisible'], message: 'spatial_contains containers cannot be invisible.' },
  { type: 'oneof', source: 'spatial_constraint_mode', targets: ['spatial_adjacent', 'spatial_contains'], message: 'Choose either spatial_adjacent or spatial_contains.' },

  // Spatiotemporal Constraints
  { type: 'requires', source: 'spatial_temporal_adjacent', targets: ['collidable'], message: 'spatial_temporal_adjacent requires collidable bounds.' },
  { type: 'conflicts', source: 'spatial_temporal_adjacent', targets: ['spatial_adjacent'], message: 'spatial_temporal_adjacent supersedes spatial_adjacent.' },
  { type: 'requires', source: 'spatial_temporal_reachable', targets: ['spatial_awareness'], message: 'spatial_temporal_reachable requires spatial_awareness.' },
  { type: 'conflicts', source: 'spatial_temporal_reachable', targets: ['spatial_reachable'], message: 'spatial_temporal_reachable supersedes spatial_reachable.' },
  { type: 'requires', source: 'spatial_trajectory', targets: ['physics'], message: 'spatial_trajectory requires physics.' },
  { type: 'requires', source: 'spatial_trajectory', targets: ['collidable'], message: 'spatial_trajectory requires collidable bounds.' },

  // Robotics/URDF Constraints
  { type: 'conflicts', source: 'urdf_robot', targets: ['cloth', 'soft_body', 'fluid'], message: 'URDF robot models cannot have cloth, soft body, or fluid physics.' },
  { type: 'conflicts', source: 'urdf_robot', targets: ['particle_emitter'], message: 'URDF robot models conflict with particle emitters.' },

  // Cultural Profile Constraints
  { type: 'requires', source: 'norm_compliant', targets: ['cultural_profile'], message: 'Norm compliance requires a cultural_profile.' },
  { type: 'requires', source: 'cultural_memory', targets: ['cultural_profile'], message: 'Cultural memory requires a cultural_profile.' },
  { type: 'conflicts', source: 'cultural_trace', targets: ['invisible'], message: 'Cultural traces must be visible for other agents to perceive them.' },
];

// =============================================================================
// SCHEMA VALIDATOR
// =============================================================================

/**
 * Validates trait-level structural rules for multi-agent world creation.
 *
 * Given a trait delta (attach/detach traits on a node), computes the
 * resulting trait set and checks it against all BUILTIN_CONSTRAINTS.
 *
 * Three constraint types:
 *   1. requires: If trait A is present, all of its target traits must also be present
 *   2. conflicts: If trait A is present, none of its target traits can be present
 *   3. oneof: At most one trait from the target group can be present
 */
export class SchemaValidator implements Validator {
  readonly id: ValidatorId = 'schema';
  readonly name = 'Trait Schema Oracle';

  private readonly constraints: readonly TraitConstraint[];

  constructor(constraints?: readonly TraitConstraint[]) {
    this.constraints = constraints ?? BUILTIN_CONSTRAINTS;
  }

  /**
   * Validate a state delta against trait schema constraints.
   *
   * Routes:
   *   - trait: Full constraint checking
   *   - composite: Validates each sub-delta
   *   - physics/material/transform/world: Accepted (not schema domain)
   */
  validate(delta: StateDelta): ValidationResult {
    const start = performance.now();
    const violations: ValidationViolation[] = [];

    switch (delta.payload.type) {
      case 'trait':
        this.validateTraitPayload(delta.payload, violations);
        break;

      case 'composite':
        this.validateCompositePayload(delta.payload, violations);
        break;

      case 'physics':
      case 'material':
      case 'transform':
      case 'world':
        // Not in schema domain — accept by default
        break;
    }

    const durationMs = performance.now() - start;
    const hasErrors = violations.some(v => v.severity === 'error');

    return {
      validatorId: this.id,
      verdict: hasErrors ? 'reject' : 'accept',
      reason: hasErrors
        ? `Trait schema violation: ${violations.filter(v => v.severity === 'error').length} constraint(s) violated`
        : 'All trait constraints satisfied per @holoscript/core BUILTIN_CONSTRAINTS',
      violations,
      durationMs,
      deltaId: delta.id,
    };
  }

  // ---- Trait payload validation --------------------------------------------

  private validateTraitPayload(
    payload: TraitDeltaPayload,
    violations: ValidationViolation[],
  ): void {
    // Compute the resulting trait set after applying the delta
    const resultingTraits = new Set(payload.existingTraits);

    // Apply attachments
    if (payload.attach) {
      for (const trait of payload.attach) {
        resultingTraits.add(trait);
      }
    }

    // Apply detachments
    if (payload.detach) {
      for (const trait of payload.detach) {
        resultingTraits.delete(trait);
      }
    }

    // Check all constraints against the resulting trait set
    for (const constraint of this.constraints) {
      switch (constraint.type) {
        case 'requires':
          this.checkRequires(constraint, resultingTraits, violations);
          break;
        case 'conflicts':
          this.checkConflicts(constraint, resultingTraits, violations);
          break;
        case 'oneof':
          this.checkOneOf(constraint, resultingTraits, violations);
          break;
      }
    }
  }

  /**
   * Check a 'requires' constraint: if source trait is present,
   * all target traits must also be present.
   */
  private checkRequires(
    constraint: TraitConstraint,
    traits: Set<string>,
    violations: ValidationViolation[],
  ): void {
    if (!traits.has(constraint.source)) return;

    for (const target of constraint.targets) {
      if (!traits.has(target)) {
        violations.push({
          property: `trait:${constraint.source}`,
          proposedValue: [...traits],
          constraint: `requires:${target}`,
          severity: 'error',
          suggestion: `${constraint.message} Add @${target} trait.`,
        });
      }
    }
  }

  /**
   * Check a 'conflicts' constraint: if source trait is present,
   * none of the target traits can be present.
   */
  private checkConflicts(
    constraint: TraitConstraint,
    traits: Set<string>,
    violations: ValidationViolation[],
  ): void {
    if (!traits.has(constraint.source)) return;

    for (const target of constraint.targets) {
      if (traits.has(target)) {
        violations.push({
          property: `trait:${constraint.source}`,
          proposedValue: [...traits],
          constraint: `conflicts:${target}`,
          severity: 'error',
          suggestion: `${constraint.message} Remove @${constraint.source} or @${target}.`,
        });
      }
    }
  }

  /**
   * Check a 'oneof' constraint: at most one trait from the target
   * group can be present.
   */
  private checkOneOf(
    constraint: TraitConstraint,
    traits: Set<string>,
    violations: ValidationViolation[],
  ): void {
    const activeFromGroup = constraint.targets.filter(t => traits.has(t));

    if (activeFromGroup.length > 1) {
      violations.push({
        property: `trait_group:${constraint.source}`,
        proposedValue: activeFromGroup,
        constraint: `oneof:${constraint.targets.join(',')}`,
        severity: 'error',
        suggestion: `${constraint.message} Active: [${activeFromGroup.join(', ')}]. Keep only one.`,
      });
    }
  }

  // ---- Composite payload validation ----------------------------------------

  private validateCompositePayload(
    payload: CompositeDeltaPayload,
    violations: ValidationViolation[],
  ): void {
    for (const subPayload of payload.deltas) {
      if (subPayload.type === 'trait') {
        this.validateTraitPayload(subPayload, violations);
      } else if (subPayload.type === 'composite') {
        this.validateCompositePayload(subPayload, violations);
      }
    }
  }

  /**
   * Get the constraint set this validator uses (read-only).
   */
  getConstraints(): readonly TraitConstraint[] {
    return this.constraints;
  }

  /**
   * Get the count of constraints by type.
   */
  getConstraintCounts(): Record<string, number> {
    const counts: Record<string, number> = { requires: 0, conflicts: 0, oneof: 0 };
    for (const c of this.constraints) {
      counts[c.type] = (counts[c.type] ?? 0) + 1;
    }
    return counts;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a SchemaValidator with the built-in or custom constraints.
 */
export function createSchemaValidator(
  constraints?: readonly TraitConstraint[],
): SchemaValidator {
  return new SchemaValidator(constraints);
}
