/**
 * @hololand/agents TrustFrameBudget
 *
 * Frame budget allocation based on trust phase.
 */

import type { Phase } from './HandshakePhase';

const PHASE_BUDGETS: Record<Phase, number> = { GENESIS: 0, JOIN: 500, INTERACT: 2000, REFRESH: 5000, EXIT: 0 };

export class TrustFrameBudget {
  getBudget(phase: Phase): number { return PHASE_BUDGETS[phase]; }
  getAllBudgets(): Record<Phase, number> { return { ...PHASE_BUDGETS }; }
}
