/**
 * Cross-Validation Protocol
 *
 * 3-validator cross-validation for multi-agent world creation.
 * Ground-truth oracles derive from @holoscript/core trait schemas.
 *
 * @module validation
 */

// Types
export type {
  ValidatorId,
  ValidationVerdict,
  StateDeltaCategory,
  StateDelta,
  PhysicsDeltaPayload,
  MaterialDeltaPayload,
  TraitDeltaPayload,
  TransformDeltaPayload,
  WorldDeltaPayload,
  CompositeDeltaPayload,
  StateDeltaPayload,
  ValidationResult,
  ValidationViolation,
  ConsensusResult,
  Validator,
  CrossValidationConfig,
  CrossValidationStats,
} from './CrossValidationTypes';

// Validators
export { PhysicsValidator, createPhysicsValidator } from './PhysicsValidator';
export { MaterialsValidator, createMaterialsValidator } from './MaterialsValidator';
export { SchemaValidator, createSchemaValidator } from './SchemaValidator';

// Engine
export {
  CrossValidationEngine,
  createCrossValidationEngine,
  createCustomCrossValidationEngine,
  createStateDelta,
} from './CrossValidationEngine';
