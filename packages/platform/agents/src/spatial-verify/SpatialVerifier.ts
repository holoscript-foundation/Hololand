/**
 * @hololand/agents SpatialVerifier
 *
 * Multi-agent spatial consistency verification.
 */

import { ActionValidator, type ActionValidationResult } from './ActionValidator';
import { ConsistencyChecker, type ConsistencyReport } from './ConsistencyChecker';

export interface SpatialClaim {
  agentId: string;
  entityId: string;
  position: { x: number; y: number; z: number };
  timestamp: number;
}

export class SpatialVerifier {
  private validator: ActionValidator;
  private checker: ConsistencyChecker;

  constructor(maxSpeed: number = 10, collisionRadius: number = 1) {
    this.validator = new ActionValidator(maxSpeed);
    this.checker = new ConsistencyChecker(collisionRadius);
  }

  verifyClaim(claim: SpatialClaim, previousClaim?: SpatialClaim): ActionValidationResult {
    return this.validator.validate(claim, previousClaim);
  }

  checkConsistency(claims: SpatialClaim[]): ConsistencyReport {
    return this.checker.check(claims);
  }

  getValidator(): ActionValidator { return this.validator; }
  getChecker(): ConsistencyChecker { return this.checker; }
}
