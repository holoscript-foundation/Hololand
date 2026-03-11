/**
 * TraitRuntimeIntegration
 *
 * Re-exported from @holoscript/core (canonical source).
 * See: packages/core/src/runtime/TraitRuntimeIntegration.ts
 *
 * Usage:
 *   const factory = createTraitContextFactory({ physics, audio, haptics });
 *   const integration = new TraitRuntimeIntegration(factory);
 *   integration.attachTraitsFromAST(parsedNodes);
 *   integration.update(deltaTime);
 */

export {
  TraitRuntimeIntegration,
  createTraitRuntime,
} from '@holoscript/core';

export type {
  TrackedNode,
  TraitRuntimeStats,
} from '@holoscript/core';
