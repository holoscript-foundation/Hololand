/**
 * GRPO Event Parser
 *
 * Validates and parses incoming WebSocket events for the GRPO training
 * dashboard. Separated from the React hook to enable testing without
 * React as a dependency.
 *
 * @module grpo-training-dashboard/parseGRPOEvent
 */

import type { GRPOEventType } from './GRPOEventEmitter';

// =============================================================================
// VALID VALUES
// =============================================================================

/** All valid GRPO event types. */
const VALID_EVENT_TYPES: Set<GRPOEventType> = new Set([
  'reward', 'kl', 'completion', 'forgetting',
  'status', 'params', 'progress', 'gpu', 'snapshot',
]);

/** Valid training status values. */
const VALID_STATUSES: Set<string> = new Set([
  'running', 'paused', 'completed', 'error',
]);

// =============================================================================
// PARSER
// =============================================================================

/**
 * Validate and parse an incoming WebSocket event.
 * Returns null if the event is malformed or has an unknown type.
 *
 * Validation rules:
 *   - Must be a non-null object
 *   - Must have a string `type` field
 *   - `type` must be one of the 9 known event types
 *   - Each event type has type-specific payload requirements:
 *     - reward:     requires `point` object
 *     - kl:         requires `point` object
 *     - completion: requires `group` object
 *     - forgetting: requires `metrics` object
 *     - status:     requires `status` string in ['running','paused','completed','error']
 *     - params:     requires `params` object
 *     - progress:   requires `progress` object
 *     - gpu:        requires `stats` object
 *     - snapshot:   no required fields (all optional)
 */
export function parseGRPOEvent(raw: unknown): Record<string, unknown> | null {
  if (raw === null || typeof raw !== 'object') return null;

  const data = raw as Record<string, unknown>;
  if (typeof data.type !== 'string') return null;
  if (!VALID_EVENT_TYPES.has(data.type as GRPOEventType)) return null;

  // Type-specific validation
  switch (data.type) {
    case 'reward':
      if (!data.point || typeof data.point !== 'object') return null;
      break;
    case 'kl':
      if (!data.point || typeof data.point !== 'object') return null;
      break;
    case 'completion':
      if (!data.group || typeof data.group !== 'object') return null;
      break;
    case 'forgetting':
      if (!data.metrics || typeof data.metrics !== 'object') return null;
      break;
    case 'status':
      if (typeof data.status !== 'string' || !VALID_STATUSES.has(data.status)) return null;
      break;
    case 'params':
      if (!data.params || typeof data.params !== 'object') return null;
      break;
    case 'progress':
      if (!data.progress || typeof data.progress !== 'object') return null;
      break;
    case 'gpu':
      if (!data.stats || typeof data.stats !== 'object') return null;
      break;
    case 'snapshot':
      // Snapshot is a bulk payload; fields are optional
      break;
  }

  return data;
}
