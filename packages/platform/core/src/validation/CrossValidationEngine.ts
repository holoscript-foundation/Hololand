/**
 * CrossValidationEngine
 *
 * The consensus engine for the 3-validator cross-validation protocol.
 * Orchestrates PhysicsValidator, MaterialsValidator, and SchemaValidator
 * to reach 2-of-3 quorum consensus on state deltas proposed by agents
 * during multi-agent world creation.
 *
 * Protocol:
 *   1. Agent proposes a StateDelta
 *   2. Delta is sent to all 3 validators in parallel
 *   3. Each validator produces an independent ValidationResult
 *   4. ConsensusResult is formed: accepted iff >= quorum validators accept
 *   5. If rejected, all violations are returned to the agent
 *
 * The engine maintains running statistics for monitoring and optimization.
 *
 * @module CrossValidationEngine
 * @version 1.0.0
 */

import type {
  Validator,
  ValidatorId,
  StateDelta,
  ValidationResult,
  ValidationViolation,
  ConsensusResult,
  CrossValidationConfig,
  CrossValidationStats,
} from './CrossValidationTypes';

import { createPhysicsValidator } from './PhysicsValidator';
import { createMaterialsValidator } from './MaterialsValidator';
import { createSchemaValidator } from './SchemaValidator';

// =============================================================================
// CROSS-VALIDATION ENGINE
// =============================================================================

/**
 * Orchestrates 3-validator cross-validation for multi-agent world creation.
 *
 * Architecture:
 *   [Agent] --propose(delta)--> [CrossValidationEngine]
 *                                  |
 *                     +-----------+-----------+
 *                     |           |           |
 *              [PhysicsV]  [MaterialsV]  [SchemaV]
 *                     |           |           |
 *                     +-----------+-----------+
 *                                  |
 *                          [Quorum Check]
 *                          2/3 = accept
 *                          <2/3 = reject
 *                                  |
 *                         [ConsensusResult]
 *
 * Each validator is a pure function from StateDelta -> ValidationResult.
 * Validators run synchronously (all validation is O(n) in constraint count).
 * The engine is deterministic: same delta always produces same consensus.
 */
export class CrossValidationEngine {
  private readonly validators: readonly Validator[];
  private readonly config: Required<CrossValidationConfig>;

  // Statistics
  private totalDeltas = 0;
  private totalAccepted = 0;
  private totalRejected = 0;
  private totalValidationTimeMs = 0;
  private perValidatorStats: Record<
    ValidatorId,
    {
      totalValidated: number;
      totalAccepted: number;
      totalRejected: number;
      totalDurationMs: number;
    }
  >;
  private violationCounts: Map<string, number> = new Map();

  constructor(validators?: readonly Validator[], config?: CrossValidationConfig) {
    // Default validators: the 3-validator protocol
    this.validators = validators ?? [
      createPhysicsValidator(),
      createMaterialsValidator(),
      createSchemaValidator(),
    ];

    // Validate we have at least 2 validators for meaningful quorum
    if (this.validators.length < 2) {
      throw new Error(
        `CrossValidationEngine requires at least 2 validators for quorum, got ${this.validators.length}`
      );
    }

    // Default config
    this.config = {
      quorum: config?.quorum ?? 2,
      maxValidationTimeMs: config?.maxValidationTimeMs ?? 100,
      validateAll: config?.validateAll ?? true,
      onValidation: config?.onValidation ?? (() => {}),
      onConsensus: config?.onConsensus ?? (() => {}),
    };

    // Validate quorum
    if (this.config.quorum < 1 || this.config.quorum > this.validators.length) {
      throw new Error(
        `Quorum must be between 1 and ${this.validators.length}, got ${this.config.quorum}`
      );
    }

    // Initialize per-validator stats
    this.perValidatorStats = {} as any;
    for (const v of this.validators) {
      this.perValidatorStats[v.id] = {
        totalValidated: 0,
        totalAccepted: 0,
        totalRejected: 0,
        totalDurationMs: 0,
      };
    }
  }

  // =========================================================================
  // CORE PROTOCOL
  // =========================================================================

  /**
   * Validate a state delta through the 3-validator cross-validation protocol.
   *
   * All validators run and their results are collected.
   * Consensus is reached when >= quorum validators accept the delta.
   *
   * @param delta The state delta to validate
   * @returns ConsensusResult with accept/reject verdict and all violations
   */
  validate(delta: StateDelta): ConsensusResult {
    const start = performance.now();
    const results: ValidationResult[] = [];
    let acceptCount = 0;
    let rejectCount = 0;

    // Run all validators
    for (const validator of this.validators) {
      const result = validator.validate(delta);
      results.push(result);

      // Update per-validator stats
      const stats = this.perValidatorStats[validator.id];
      if (stats) {
        stats.totalValidated++;
        stats.totalDurationMs += result.durationMs;
        if (result.verdict === 'accept') {
          stats.totalAccepted++;
          acceptCount++;
        } else {
          stats.totalRejected++;
          rejectCount++;
        }
      }

      // Notify callback
      this.config.onValidation(result);

      // Track violations
      for (const violation of result.violations) {
        const key = violation.property;
        this.violationCounts.set(key, (this.violationCounts.get(key) ?? 0) + 1);
      }

      // Early exit if quorum already impossible (optimization)
      if (!this.config.validateAll) {
        const remaining = this.validators.length - results.length;
        if (acceptCount >= this.config.quorum) break; // Already accepted
        if (acceptCount + remaining < this.config.quorum) break; // Can't reach quorum
      }
    }

    const totalDurationMs = performance.now() - start;
    const accepted = acceptCount >= this.config.quorum;

    // Collect all violations
    const allViolations: ValidationViolation[] = [];
    for (const result of results) {
      allViolations.push(...result.violations);
    }

    // Update global stats
    this.totalDeltas++;
    this.totalValidationTimeMs += totalDurationMs;
    if (accepted) {
      this.totalAccepted++;
    } else {
      this.totalRejected++;
    }

    const consensus: ConsensusResult = {
      deltaId: delta.id,
      accepted,
      acceptCount,
      rejectCount,
      quorum: this.config.quorum,
      results,
      allViolations,
      timestamp: new Date().toISOString(),
      totalDurationMs,
    };

    // Notify consensus callback
    this.config.onConsensus(consensus);

    return consensus;
  }

  /**
   * Validate multiple deltas in batch.
   * Returns results in the same order as input.
   */
  validateBatch(deltas: readonly StateDelta[]): ConsensusResult[] {
    return deltas.map((delta) => this.validate(delta));
  }

  // =========================================================================
  // STATISTICS
  // =========================================================================

  /**
   * Get cross-validation statistics.
   */
  getStats(): CrossValidationStats {
    // Compute top violations
    const sortedViolations = [...this.violationCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([property, count]) => ({ property, count }));

    // Compute per-validator averages
    const perValidator: Record<
      ValidatorId,
      {
        totalValidated: number;
        totalAccepted: number;
        totalRejected: number;
        avgDurationMs: number;
      }
    > = {} as any;

    for (const [id, stats] of Object.entries(this.perValidatorStats)) {
      perValidator[id as ValidatorId] = {
        totalValidated: stats.totalValidated,
        totalAccepted: stats.totalAccepted,
        totalRejected: stats.totalRejected,
        avgDurationMs: stats.totalValidated > 0 ? stats.totalDurationMs / stats.totalValidated : 0,
      };
    }

    return {
      totalDeltas: this.totalDeltas,
      totalAccepted: this.totalAccepted,
      totalRejected: this.totalRejected,
      acceptanceRate: this.totalDeltas > 0 ? this.totalAccepted / this.totalDeltas : 0,
      avgValidationTimeMs: this.totalDeltas > 0 ? this.totalValidationTimeMs / this.totalDeltas : 0,
      perValidator,
      topViolations: sortedViolations,
    };
  }

  /**
   * Reset all statistics.
   */
  resetStats(): void {
    this.totalDeltas = 0;
    this.totalAccepted = 0;
    this.totalRejected = 0;
    this.totalValidationTimeMs = 0;
    this.violationCounts.clear();
    for (const stats of Object.values(this.perValidatorStats)) {
      stats.totalValidated = 0;
      stats.totalAccepted = 0;
      stats.totalRejected = 0;
      stats.totalDurationMs = 0;
    }
  }

  // =========================================================================
  // INTROSPECTION
  // =========================================================================

  /**
   * Get the list of validators.
   */
  getValidators(): readonly Validator[] {
    return this.validators;
  }

  /**
   * Get the quorum requirement.
   */
  getQuorum(): number {
    return this.config.quorum;
  }

  /**
   * Get the number of validators.
   */
  getValidatorCount(): number {
    return this.validators.length;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a CrossValidationEngine with the default 3-validator protocol
 * and 2-of-3 quorum.
 */
export function createCrossValidationEngine(config?: CrossValidationConfig): CrossValidationEngine {
  return new CrossValidationEngine(undefined, config);
}

/**
 * Create a CrossValidationEngine with custom validators.
 */
export function createCustomCrossValidationEngine(
  validators: readonly Validator[],
  config?: CrossValidationConfig
): CrossValidationEngine {
  return new CrossValidationEngine(validators, config);
}

// =============================================================================
// UTILITY: DELTA BUILDER
// =============================================================================

let deltaCounter = 0;

/**
 * Create a StateDelta with auto-generated ID and timestamp.
 * Convenience function for agents proposing state changes.
 */
export function createStateDelta(params: Omit<StateDelta, 'id' | 'timestamp'>): StateDelta {
  return {
    id: `delta_${++deltaCounter}_${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    ...params,
  };
}
