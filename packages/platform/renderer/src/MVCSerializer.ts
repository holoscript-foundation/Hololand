/**
 * MVCSerializer
 *
 * Serializes and deserializes Minimum Viable Continuity (MVC) payloads
 * for cross-device agent handoffs. Enforces the <10KB size budget,
 * handles schema versioning, and provides truncation strategies when
 * payloads exceed the budget.
 *
 * SIZE BUDGET:
 * - Total MVC payload: <10KB (10,240 bytes)
 * - Per-object budgets:
 *   - DecisionHistory:      2KB  (20%)
 *   - ActiveTaskState:      2KB  (20%)
 *   - UserPreferences:      1KB  (10%)
 *   - SpatialContextSummary: 1KB (10%)
 *   - EvidenceTrail:        2KB  (20%)
 *   - Envelope (metadata):  2KB  (20%)
 *
 * @module MVCSerializer
 */

import { logger } from './logger';
import type {
  MVCPayload,
  DecisionHistory,
  ActiveTaskState,
  EvidenceTrail,
  SpatialContextSummary,
} from './CrossRealityContinuityTypes';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum total payload size in bytes */
export const MVC_MAX_SIZE_BYTES = 10_240;

/** Current schema version */
export const MVC_SCHEMA_VERSION = 1;

/** Per-object size budgets in bytes */
export const MVC_OBJECT_BUDGETS = {
  decisionHistory: 2_048,
  activeTask: 2_048,
  userPreferences: 1_024,
  spatialContext: 1_024,
  evidenceTrail: 2_048,
  envelope: 2_048,
} as const;

// =============================================================================
// VALIDATION RESULT
// =============================================================================

export interface MVCValidationResult {
  /** Whether the payload is within budget */
  valid: boolean;
  /** Total serialized size in bytes */
  totalSizeBytes: number;
  /** Size remaining before budget exceeded */
  remainingBytes: number;
  /** Per-object sizes */
  objectSizes: {
    decisionHistory: number;
    activeTask: number;
    userPreferences: number;
    spatialContext: number;
    evidenceTrail: number;
    envelope: number;
  };
  /** Objects that exceed their individual budget */
  overBudget: string[];
  /** Truncation applied (if any) */
  truncations: string[];
}

// =============================================================================
// SERIALIZER
// =============================================================================

export class MVCSerializer {
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  /**
   * Serialize an MVC payload to a Uint8Array.
   * Validates size and applies truncation if needed.
   */
  serialize(payload: MVCPayload, options?: { truncateIfNeeded?: boolean }): {
    data: Uint8Array;
    validation: MVCValidationResult;
  } {
    const truncate = options?.truncateIfNeeded ?? true;
    let workingPayload = payload;

    // First pass: check size
    let validation = this.validate(workingPayload);

    // Apply truncation if over budget and allowed
    if (!validation.valid && truncate) {
      workingPayload = this.truncateToFit(workingPayload);
      validation = this.validate(workingPayload);
    }

    const json = JSON.stringify(workingPayload);
    const data = this.encoder.encode(json);

    if (!validation.valid) {
      logger.warn(`[MVCSerializer] Payload exceeds budget: ${validation.totalSizeBytes} bytes (max: ${MVC_MAX_SIZE_BYTES})`);
    }

    return { data, validation };
  }

  /**
   * Deserialize a Uint8Array back to an MVC payload.
   * Validates schema version for forward compatibility.
   */
  deserialize(data: Uint8Array): {
    payload: MVCPayload | null;
    error: string | null;
    schemaVersion: number;
  } {
    try {
      const json = this.decoder.decode(data);
      const parsed = JSON.parse(json);

      // Check schema version
      const schemaVersion = parsed.version ?? 0;
      if (schemaVersion > MVC_SCHEMA_VERSION) {
        return {
          payload: null,
          error: `Unsupported schema version: ${schemaVersion} (max supported: ${MVC_SCHEMA_VERSION})`,
          schemaVersion,
        };
      }

      // Migrate if needed (future versions)
      const migrated = this.migrate(parsed, schemaVersion);

      return { payload: migrated, error: null, schemaVersion };
    } catch (err) {
      return {
        payload: null,
        error: `Deserialization failed: ${err instanceof Error ? err.message : String(err)}`,
        schemaVersion: 0,
      };
    }
  }

  /**
   * Validate an MVC payload's size without serializing.
   */
  validate(payload: MVCPayload): MVCValidationResult {
    const sizes = {
      decisionHistory: this.measureObject(payload.decisionHistory),
      activeTask: this.measureObject(payload.activeTask),
      userPreferences: this.measureObject(payload.userPreferences),
      spatialContext: this.measureObject(payload.spatialContext),
      evidenceTrail: this.measureObject(payload.evidenceTrail),
      envelope: this.measureObject({
        version: payload.version,
        handoffId: payload.handoffId,
        agentId: payload.agentId,
        agentName: payload.agentName,
        sourceFormFactor: payload.sourceFormFactor,
        targetFormFactor: payload.targetFormFactor,
        sourceEmbodiment: payload.sourceEmbodiment,
        targetEmbodiment: payload.targetEmbodiment,
        createdAt: payload.createdAt,
        expiresAt: payload.expiresAt,
      }),
    };

    const totalSizeBytes = this.measureObject(payload);

    const overBudget: string[] = [];
    if (sizes.decisionHistory > MVC_OBJECT_BUDGETS.decisionHistory) overBudget.push('decisionHistory');
    if (sizes.activeTask > MVC_OBJECT_BUDGETS.activeTask) overBudget.push('activeTask');
    if (sizes.userPreferences > MVC_OBJECT_BUDGETS.userPreferences) overBudget.push('userPreferences');
    if (sizes.spatialContext > MVC_OBJECT_BUDGETS.spatialContext) overBudget.push('spatialContext');
    if (sizes.evidenceTrail > MVC_OBJECT_BUDGETS.evidenceTrail) overBudget.push('evidenceTrail');
    if (sizes.envelope > MVC_OBJECT_BUDGETS.envelope) overBudget.push('envelope');

    return {
      valid: totalSizeBytes <= MVC_MAX_SIZE_BYTES,
      totalSizeBytes,
      remainingBytes: MVC_MAX_SIZE_BYTES - totalSizeBytes,
      objectSizes: sizes,
      overBudget,
      truncations: [],
    };
  }

  // ---------------------------------------------------------------------------
  // TRUNCATION STRATEGIES
  // ---------------------------------------------------------------------------

  /**
   * Truncate a payload to fit within the 10KB budget.
   *
   * Strategy (in order of priority):
   * 1. Trim decision history to last 5 decisions (from 10-20)
   * 2. Trim evidence trail to last 5 items (from 20)
   * 3. Trim task steps to last 3
   * 4. Remove spatial landmarks beyond 3
   * 5. Trim decision alternatives to 1 per decision
   * 6. Truncate long strings (rationale, description) to 100 chars
   */
  truncateToFit(payload: MVCPayload): MVCPayload {
    const truncations: string[] = [];
    const result: MVCPayload = JSON.parse(JSON.stringify(payload)); // Deep clone

    // 1. Trim decisions
    if (result.decisionHistory.decisions.length > 5) {
      result.decisionHistory.decisions = result.decisionHistory.decisions.slice(0, 5);
      truncations.push(`decisions: ${payload.decisionHistory.decisions.length} → 5`);
    }

    // 2. Trim evidence
    if (result.evidenceTrail.items.length > 5) {
      result.evidenceTrail.items = result.evidenceTrail.items.slice(0, 5);
      truncations.push(`evidence: ${payload.evidenceTrail.items.length} → 5`);
    }

    // 3. Trim task steps
    if (result.activeTask.steps.length > 3) {
      result.activeTask.steps = result.activeTask.steps.slice(0, 3);
      truncations.push(`steps: ${payload.activeTask.steps.length} → 3`);
    }

    // 4. Trim landmarks
    if (result.spatialContext.nearbyLandmarks.length > 3) {
      result.spatialContext.nearbyLandmarks = result.spatialContext.nearbyLandmarks.slice(0, 3);
      truncations.push(`landmarks: ${payload.spatialContext.nearbyLandmarks.length} → 3`);
    }

    // Still over budget? More aggressive truncation
    if (this.measureObject(result) > MVC_MAX_SIZE_BYTES) {
      // 5. Trim alternatives
      for (const decision of result.decisionHistory.decisions) {
        if (decision.alternatives.length > 1) {
          decision.alternatives = decision.alternatives.slice(0, 1);
        }
      }
      truncations.push('alternatives trimmed to 1');

      // 6. Truncate long strings
      if (this.measureObject(result) > MVC_MAX_SIZE_BYTES) {
        for (const decision of result.decisionHistory.decisions) {
          decision.rationale = this.truncateString(decision.rationale, 100);
        }
        result.activeTask.description = this.truncateString(result.activeTask.description, 100);
        for (const item of result.evidenceTrail.items) {
          item.summary = this.truncateString(item.summary, 100);
        }
        truncations.push('strings truncated to 100 chars');
      }
    }

    if (truncations.length > 0) {
      logger.info(`[MVCSerializer] Truncations applied: ${truncations.join(', ')}`);
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // INTERNAL
  // ---------------------------------------------------------------------------

  private measureObject(obj: unknown): number {
    return this.encoder.encode(JSON.stringify(obj)).length;
  }

  private truncateString(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen - 3) + '...';
  }

  /**
   * Migrate an older schema version to the current version.
   * Currently only version 1 exists, so this is a no-op.
   */
  private migrate(parsed: any, fromVersion: number): MVCPayload {
    // Version 1 → 1: no migration needed
    if (fromVersion === 1) return parsed as MVCPayload;

    // Future migrations would go here:
    // if (fromVersion === 1) { parsed = migrateV1ToV2(parsed); fromVersion = 2; }
    // if (fromVersion === 2) { parsed = migrateV2ToV3(parsed); fromVersion = 3; }

    return parsed as MVCPayload;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createMVCSerializer(): MVCSerializer {
  return new MVCSerializer();
}
