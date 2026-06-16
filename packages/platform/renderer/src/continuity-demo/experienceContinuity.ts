/**
 * experienceContinuity
 *
 * END-TO-END cross-substrate experience-continuity demo.
 *
 * THESIS BEING PROVEN:
 *   An agent "experiences" something in ONE context (Process A / VR headset),
 *   its memory of that experience serializes to a compact (<10KB) byte payload,
 *   and a SEPARATE context (Process B / phone) that shares ONLY those bytes can
 *   rehydrate the memory and answer a specific question about the experience it
 *   never directly had.
 *
 * HARD BOUNDARY:
 *   `produceExperience` and `consumeExperience` share NOTHING but the returned
 *   `Uint8Array`. `consumeExperience` closes over no producer state, no module
 *   singletons carrying the experience, no globals. The sole channel is `bytes`.
 *
 * MACHINERY USED (all pre-existing in this package):
 *   - `MVCSerializer` (./MVCSerializer)         — serialize/deserialize/validate
 *   - `createMVCPayload` + MVC object factories  (./CrossRealityContinuityTypes)
 *   - `MVC_MAX_SIZE_BYTES = 10_240`             — the <10KB size budget
 *
 * @module continuity-demo/experienceContinuity
 */

import { MVCSerializer, MVC_MAX_SIZE_BYTES } from '../MVCSerializer';
import {
  createMVCPayload,
  type MVCPayload,
  type DecisionHistory,
  type ActiveTaskState,
  type EvidenceTrail,
  type SpatialContextSummary,
} from '../CrossRealityContinuityTypes';

// =============================================================================
// THE EXPERIENCE (the concrete, queryable thing the agent lives through)
// =============================================================================

/**
 * Input describing the concrete experience Process A lives through.
 * Defaults encode the canonical demo: an agent inspects a pet water bowl,
 * finds it low, and decides to alert the owner.
 */
export interface ExperienceInput {
  /** Agent identity */
  agentId: string;
  /** Agent display name */
  agentName: string;
  /** What was physically observed (the percept) */
  observation: string;
  /** Measured water level as a percentage (0-100) */
  waterLevelPercent: number;
  /** Qualitative level label */
  waterLevelLabel: 'EMPTY' | 'LOW' | 'OK' | 'FULL';
  /** What the agent decided to do about it */
  decision: string;
  /** Why it decided that (compressed rationale) */
  rationale: string;
  /** Confidence in the decision (0-1) */
  confidence: number;
  /** Source form factor where the experience happened */
  sourceFormFactor: MVCPayload['sourceFormFactor'];
  /** Target form factor the memory will be rehydrated on */
  targetFormFactor: MVCPayload['targetFormFactor'];
}

/** Canonical demo experience: the pet water bowl inspection. */
export const DEFAULT_EXPERIENCE: ExperienceInput = {
  agentId: 'agent-petcare-01',
  agentName: 'Cody',
  observation: 'Inspected the pet water bowl in the kitchen via the headset camera.',
  waterLevelPercent: 12,
  waterLevelLabel: 'LOW',
  decision: 'Alert the owner that the pet water bowl is running low.',
  rationale:
    'Water level read 12% (LOW), below the 25% refill threshold; alerting the owner avoids dehydration risk.',
  confidence: 0.92,
  sourceFormFactor: 'vr-headset',
  targetFormFactor: 'phone',
};

/**
 * The shape of what `consumeExperience` is able to recall, purely from bytes.
 * This is the queryable surface the receiving context reconstructs.
 */
export interface RecalledExperience {
  /** Agent that had the experience */
  agentId: string;
  agentName: string;
  /** The decision the agent made (its summary) */
  decision: string;
  /** Why it decided that */
  rationale: string;
  /** Confidence the agent had in the decision (0-1) */
  confidence: number;
  /** The observed water level percentage recovered from evidence/task context */
  waterLevelPercent: number | null;
  /** The qualitative water level label */
  waterLevelLabel: string | null;
  /** The raw observation evidence summary */
  observation: string | null;
  /** Where the experience originally happened */
  sourceFormFactor: string;
}

// =============================================================================
// CONSTANTS — keys used to thread the structured facts through the payload
// =============================================================================

/** resumeContext key under which the structured water reading is stored. */
const WATER_READING_KEY = 'waterReading';
/** Stable id of the single decision recorded for this experience. */
const DECISION_ID = 'dec-water-bowl-low';
/** Stable id of the single evidence item recorded for this experience. */
const EVIDENCE_ID = 'ev-water-bowl-observation';

// =============================================================================
// PROCESS A — produceExperience
// =============================================================================

/**
 * Simulate a concrete experience in Process A and serialize the agent's memory
 * of it to a compact byte payload.
 *
 * Steps:
 *   1. Record the experience as a real `DecisionHistory` entry, an
 *      `EvidenceTrail` item, and an `ActiveTaskState`.
 *   2. Build a valid `MVCPayload` via `createMVCPayload`.
 *   3. Serialize via `MVCSerializer`.
 *   4. Assert validation passed and bytes < `MVC_MAX_SIZE_BYTES`.
 *   5. Return the bytes — the ONLY channel to Process B.
 *
 * @throws if validation fails or the payload exceeds the size budget.
 */
export function produceExperience(input: ExperienceInput = DEFAULT_EXPERIENCE): Uint8Array {
  const now = Date.now();

  // --- MVC Object 1: DecisionHistory — the decision the agent made ---------
  const decisionHistory: DecisionHistory = {
    decisions: [
      {
        id: DECISION_ID,
        summary: input.decision,
        rationale: input.rationale,
        alternatives: [
          'Refill the bowl autonomously',
          'Wait and re-check in 30 minutes',
          'Take no action',
        ],
        confidence: input.confidence,
        category: 'task',
        decidedAt: now,
        outcome: 'pending',
      },
    ],
    totalDecisionCount: 1,
    successRate: 1,
    updatedAt: now,
  };

  // --- MVC Object 5: EvidenceTrail — the raw observation supporting it -----
  const evidenceTrail: EvidenceTrail = {
    items: [
      {
        id: EVIDENCE_ID,
        summary: input.observation,
        sourceType: 'observation',
        sourceRef: 'headset-camera://kitchen/pet-water-bowl',
        confidence: input.confidence,
        gatheredAt: now,
        stale: false,
      },
    ],
    totalItemCount: 1,
    aggregateConfidence: input.confidence,
    updatedAt: now,
    newestItemAt: now,
    oldestItemAt: now,
  };

  // --- MVC Object 2: ActiveTaskState — what the agent is doing about it -----
  const activeTask: ActiveTaskState = {
    taskId: 'task-petcare-monitor',
    description: 'Monitor pet wellbeing and alert the owner about supply issues.',
    priority: 1,
    initiator: 'agent',
    progress: 50,
    currentStep: 'Alerting owner about low water level',
    steps: [
      { description: 'Inspect water bowl', status: 'completed', progress: 100 },
      { description: 'Assess water level', status: 'completed', progress: 100 },
      { description: 'Notify owner', status: 'in_progress', progress: 50 },
    ],
    // Structured facts threaded through so the receiver can answer numerically.
    resumeContext: {
      [WATER_READING_KEY]: {
        levelPercent: input.waterLevelPercent,
        levelLabel: input.waterLevelLabel,
        location: 'kitchen',
      },
    },
    startedAt: now,
    estimatedCompletionAt: null,
    pausable: true,
  };

  // --- MVC Object 4: SpatialContextSummary — keep minimal but valid ---------
  const spatialContext: SpatialContextSummary = {
    geospatial: null,
    localPosition: { x: 1.2, y: 0, z: -0.8 },
    facingDirection: { x: 0, y: 0, z: -1 },
    upVector: { x: 0, y: 1, z: 0 },
    nearestAnchorId: 'anchor-kitchen-01',
    nearbyLandmarks: [{ label: 'Pet water bowl', type: 'object', relativeDirection: 'ahead', distanceMeters: 0.6 }],
    activeZoneId: 'zone-kitchen',
    previousFormFactor: input.sourceFormFactor,
    capturedAt: now,
  };

  // --- Assemble the full MVC payload ---------------------------------------
  const payload: MVCPayload = createMVCPayload(
    input.agentId,
    input.agentName,
    input.sourceFormFactor,
    input.targetFormFactor,
    { decisionHistory, evidenceTrail, activeTask, spatialContext },
  );

  // --- Serialize + assert the contract -------------------------------------
  const serializer = new MVCSerializer();
  const { data, validation } = serializer.serialize(payload, { truncateIfNeeded: false });

  if (!validation.valid) {
    throw new Error(
      `produceExperience: payload failed validation (${validation.totalSizeBytes} bytes, over: ${validation.overBudget.join(', ')})`,
    );
  }
  if (data.length >= MVC_MAX_SIZE_BYTES) {
    throw new Error(
      `produceExperience: payload ${data.length} bytes is not < MVC_MAX_SIZE_BYTES (${MVC_MAX_SIZE_BYTES})`,
    );
  }

  return data;
}

// =============================================================================
// PROCESS B — consumeExperience
// =============================================================================

/**
 * The question Process B is asked to answer about an experience it never had.
 */
export const CONTINUITY_QUESTION =
  'What did you observe about the water, and what did you decide to do?';

/**
 * Rehydrate the agent's memory from bytes ALONE and answer the continuity
 * question. Closes over NOTHING from `produceExperience`.
 *
 * On a corrupt/truncated/garbage buffer it does NOT throw: it reports
 * "no memory" and an empty recall, so a tamper case degrades gracefully.
 */
export function consumeExperience(bytes: Uint8Array): {
  answer: string;
  recalled: RecalledExperience | null;
  error: string | null;
} {
  const serializer = new MVCSerializer();
  const { payload, error } = serializer.deserialize(bytes);

  if (error !== null || payload === null) {
    return {
      answer: 'I have no memory of that experience — the continuity payload could not be read.',
      recalled: null,
      error: error ?? 'empty payload',
    };
  }

  // Defensive: a syntactically-valid-but-empty payload carries no experience.
  const decision = payload.decisionHistory?.decisions?.[0];
  const evidence = payload.evidenceTrail?.items?.find((i) => i.id === EVIDENCE_ID)
    ?? payload.evidenceTrail?.items?.[0];

  if (!decision) {
    return {
      answer: 'I have no memory of that experience — the payload contained no recorded decision.',
      recalled: null,
      error: 'no decision in payload',
    };
  }

  // Recover the structured water reading from the resume context.
  const reading = payload.activeTask?.resumeContext?.[WATER_READING_KEY];
  let waterLevelPercent: number | null = null;
  let waterLevelLabel: string | null = null;
  if (reading !== null && typeof reading === 'object') {
    const r = reading as Record<string, unknown>;
    if (typeof r.levelPercent === 'number') waterLevelPercent = r.levelPercent;
    if (typeof r.levelLabel === 'string') waterLevelLabel = r.levelLabel;
  }

  const recalled: RecalledExperience = {
    agentId: payload.agentId,
    agentName: payload.agentName,
    decision: decision.summary,
    rationale: decision.rationale,
    confidence: decision.confidence,
    waterLevelPercent,
    waterLevelLabel,
    observation: evidence?.summary ?? null,
    sourceFormFactor: payload.sourceFormFactor,
  };

  const levelClause =
    waterLevelPercent !== null
      ? `the water level was ${waterLevelLabel ?? 'measured'} at ${waterLevelPercent}%`
      : 'the water level was below the refill threshold';

  const answer =
    `On the ${recalled.sourceFormFactor}, I observed that ${levelClause}. ` +
    `I decided to ${lowerFirst(recalled.decision)} ` +
    `(confidence ${recalled.confidence.toFixed(2)}). Rationale: ${recalled.rationale}`;

  return { answer, recalled, error: null };
}

/** Lowercase the first character of a sentence for grammatical splicing. */
function lowerFirst(s: string): string {
  return s.length > 0 ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}
