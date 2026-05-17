/**
 * Cross-Validation Protocol Types
 *
 * Defines the type system for the 3-validator cross-validation protocol
 * used in multi-agent world creation. Each state delta proposed by an agent
 * must pass through 3 independent validators, with a 2-of-3 quorum required
 * for acceptance.
 *
 * Ground-truth oracles derive from @holoscript/core trait schemas:
 *   - PhysicsValidator: PhysicsSafetyEnvelope bounds
 *   - MaterialsValidator: MaterialTrait + PBRMaterial + VolumetricMaterial schemas
 *   - SchemaValidator: BUILTIN_CONSTRAINTS (trait requires/conflicts/oneof)
 *
 * @module CrossValidationTypes
 * @version 1.0.0
 */

// =============================================================================
// VALIDATOR IDENTITY
// =============================================================================

/**
 * Unique identifier for each validator in the 3-validator protocol.
 */
export type ValidatorId = 'physics' | 'materials' | 'schema';

/**
 * Validation verdict for a single validator.
 */
export type ValidationVerdict = 'accept' | 'reject';

// =============================================================================
// STATE DELTA — THE UNIT OF VALIDATION
// =============================================================================

/**
 * Categories of state deltas that agents can propose.
 * Each category routes to specific validators with domain knowledge.
 */
export type StateDeltaCategory =
  | 'physics' // Velocity, force, mass, position, gravity changes
  | 'material' // Material properties, textures, shader configuration
  | 'trait' // Trait attachment/detachment, configuration changes
  | 'transform' // Position, rotation, scale changes
  | 'world' // World-level settings (environment, lighting, fog)
  | 'composite'; // Multiple categories in one delta

/**
 * A state delta proposed by an agent for validation.
 * This is the atomic unit that passes through the cross-validation protocol.
 */
export interface StateDelta {
  /** Unique identifier for this delta */
  readonly id: string;
  /** ISO timestamp of proposal */
  readonly timestamp: string;
  /** Agent that proposed this delta */
  readonly agentId: string;
  /** World this delta targets */
  readonly worldId: string;
  /** Node/entity this delta targets */
  readonly nodeId: string;
  /** Category of the delta (routes validation logic) */
  readonly category: StateDeltaCategory;
  /** The proposed changes — schema depends on category */
  readonly payload: StateDeltaPayload;
  /** Optional: priority level (higher = validated first) */
  readonly priority?: number;
}

/**
 * Physics delta payload — changes to physics properties.
 */
export interface PhysicsDeltaPayload {
  readonly type: 'physics';
  readonly velocity?: readonly [number, number, number];
  readonly angularVelocity?: readonly [number, number, number];
  readonly force?: readonly [number, number, number];
  readonly impulse?: readonly [number, number, number];
  readonly mass?: number;
  readonly gravityScale?: number;
  readonly position?: readonly [number, number, number];
  readonly acceleration?: readonly [number, number, number];
}

/**
 * Material delta payload — changes to material properties.
 */
export interface MaterialDeltaPayload {
  readonly type: 'material';
  readonly materialType?: string;
  readonly baseColor?: { r: number; g: number; b: number; a?: number };
  readonly metallic?: number;
  readonly roughness?: number;
  readonly emission?: { color: { r: number; g: number; b: number }; intensity: number };
  readonly ior?: number;
  readonly transmission?: number;
  readonly opacity?: number;
  readonly blendMode?: string;
  readonly textures?: ReadonlyArray<{
    channel: string;
    path: string;
  }>;
  /** Volumetric material properties */
  readonly volumetric?: {
    readonly volumeType?: string;
    readonly density?: number;
    readonly scattering?: number;
    readonly absorption?: number;
  };
  /** Advanced PBR */
  readonly subsurface?: {
    readonly thickness?: number;
    readonly attenuationDistance?: number;
  };
  readonly sheen?: {
    readonly intensity?: number;
    readonly roughness?: number;
  };
  readonly clearcoat?: {
    readonly intensity?: number;
    readonly roughness?: number;
  };
  readonly iridescence?: {
    readonly intensity?: number;
    readonly ior?: number;
  };
}

/**
 * Trait delta payload — changes to trait configuration.
 */
export interface TraitDeltaPayload {
  readonly type: 'trait';
  /** Traits being added */
  readonly attach?: readonly string[];
  /** Traits being removed */
  readonly detach?: readonly string[];
  /** Existing traits on the node (for conflict/requires checking) */
  readonly existingTraits: readonly string[];
  /** Trait configuration changes */
  readonly configure?: Record<string, unknown>;
}

/**
 * Transform delta payload — changes to spatial properties.
 */
export interface TransformDeltaPayload {
  readonly type: 'transform';
  readonly position?: readonly [number, number, number];
  readonly rotation?: readonly [number, number, number];
  readonly scale?: readonly [number, number, number];
}

/**
 * World delta payload — changes to world-level settings.
 */
export interface WorldDeltaPayload {
  readonly type: 'world';
  readonly environment?: string;
  readonly lighting?: Record<string, unknown>;
  readonly fog?: Record<string, unknown>;
  readonly gravity?: readonly [number, number, number];
}

/**
 * Composite delta — bundles multiple payloads.
 */
export interface CompositeDeltaPayload {
  readonly type: 'composite';
  readonly deltas: readonly StateDeltaPayload[];
}

/**
 * Union of all delta payload types.
 */
export type StateDeltaPayload =
  | PhysicsDeltaPayload
  | MaterialDeltaPayload
  | TraitDeltaPayload
  | TransformDeltaPayload
  | WorldDeltaPayload
  | CompositeDeltaPayload;

// =============================================================================
// VALIDATION RESULT
// =============================================================================

/**
 * Result from a single validator examining a state delta.
 */
export interface ValidationResult {
  /** Which validator produced this result */
  readonly validatorId: ValidatorId;
  /** Accept or reject */
  readonly verdict: ValidationVerdict;
  /** Human-readable explanation of the verdict */
  readonly reason: string;
  /** Specific violations found (empty array = no violations) */
  readonly violations: readonly ValidationViolation[];
  /** Time taken to validate in milliseconds */
  readonly durationMs: number;
  /** The delta that was validated */
  readonly deltaId: string;
}

/**
 * A specific violation found during validation.
 */
export interface ValidationViolation {
  /** Which property violated a constraint */
  readonly property: string;
  /** The value that was proposed */
  readonly proposedValue: unknown;
  /** The constraint that was violated */
  readonly constraint: string;
  /** The maximum/minimum/expected value */
  readonly bound?: unknown;
  /** Severity: error = hard reject, warning = advisory */
  readonly severity: 'error' | 'warning';
  /** Suggested fix, if available */
  readonly suggestion?: string;
}

// =============================================================================
// CONSENSUS RESULT
// =============================================================================

/**
 * The final consensus result after all 3 validators have voted.
 */
export interface ConsensusResult {
  /** The delta that was validated */
  readonly deltaId: string;
  /** Overall consensus: accepted if 2+ validators approve */
  readonly accepted: boolean;
  /** Number of validators that accepted */
  readonly acceptCount: number;
  /** Number of validators that rejected */
  readonly rejectCount: number;
  /** Required quorum (default: 2) */
  readonly quorum: number;
  /** Individual results from each validator */
  readonly results: readonly ValidationResult[];
  /** Combined violations from all validators */
  readonly allViolations: readonly ValidationViolation[];
  /** ISO timestamp of consensus */
  readonly timestamp: string;
  /** Total time for cross-validation in milliseconds */
  readonly totalDurationMs: number;
}

// =============================================================================
// VALIDATOR INTERFACE
// =============================================================================

/**
 * Interface that all 3 validators must implement.
 * Each validator is a pure function from StateDelta -> ValidationResult.
 * Validators MUST be deterministic and side-effect free.
 */
export interface Validator {
  /** Unique identifier */
  readonly id: ValidatorId;
  /** Human-readable name */
  readonly name: string;
  /** Validate a state delta against this validator's ground-truth oracle */
  validate(delta: StateDelta): ValidationResult;
}

// =============================================================================
// CROSS-VALIDATION ENGINE INTERFACE
// =============================================================================

/**
 * Configuration for the CrossValidationEngine.
 */
export interface CrossValidationConfig {
  /** Quorum required for acceptance (default: 2 out of 3) */
  readonly quorum?: number;
  /** Maximum validation time per validator in ms (default: 100) */
  readonly maxValidationTimeMs?: number;
  /** Whether to continue validating after quorum is reached (default: true) */
  readonly validateAll?: boolean;
  /** Callback for each individual validation result */
  readonly onValidation?: (result: ValidationResult) => void;
  /** Callback for consensus result */
  readonly onConsensus?: (result: ConsensusResult) => void;
}

/**
 * Statistics about the cross-validation engine's operation.
 */
export interface CrossValidationStats {
  /** Total deltas processed */
  readonly totalDeltas: number;
  /** Total accepted */
  readonly totalAccepted: number;
  /** Total rejected */
  readonly totalRejected: number;
  /** Acceptance rate */
  readonly acceptanceRate: number;
  /** Average validation time in ms */
  readonly avgValidationTimeMs: number;
  /** Per-validator stats */
  readonly perValidator: Record<
    ValidatorId,
    {
      readonly totalValidated: number;
      readonly totalAccepted: number;
      readonly totalRejected: number;
      readonly avgDurationMs: number;
    }
  >;
  /** Most common violation types */
  readonly topViolations: readonly { property: string; count: number }[];
}
