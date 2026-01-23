/**
 * Mental World State Service
 *
 * Extends spatial context with mental model capabilities for AI agents.
 * Implements dual Physical + Mental world architecture.
 *
 * Features:
 * - Agent beliefs and mental models
 * - Goal hierarchies and planning
 * - Hidden state inference
 * - Theory of Mind for multi-agent
 * - Spatial reasoning integration
 *
 * @packageDocumentation
 */

import { createLogger, type HololandLogger } from '@hololand/logger';

// ============================================================================
// TYPES
// ============================================================================

export type Vector3 = [number, number, number];

/**
 * Belief about the world state
 */
export interface Belief {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
  timestamp: number;
  source: 'observation' | 'inference' | 'communication' | 'prior';
  spatialContext?: SpatialContext;
}

/**
 * Spatial context for beliefs
 */
export interface SpatialContext {
  position?: Vector3;
  region?: string;
  nearEntities?: string[];
  scale?: 'micro' | 'standard' | 'macro' | 'cosmic';
}

/**
 * Model of another agent's mental state
 */
export interface AgentModel {
  agentId: string;
  name?: string;
  perceivedGoals: Goal[];
  perceivedBeliefs: Belief[];
  predictedActions: string[];
  trustLevel: number;
  lastInteraction: number;
  relationship: 'ally' | 'neutral' | 'competitor' | 'unknown';
}

/**
 * Goal in the hierarchy
 */
export interface Goal {
  id: string;
  description: string;
  priority: number;
  status: 'active' | 'pending' | 'achieved' | 'failed' | 'suspended';
  parentGoalId?: string;
  subgoalIds: string[];
  preconditions: Belief[];
  effects: Belief[];
  deadline?: number;
  progress: number;
  spatialTarget?: Vector3;
}

/**
 * Hidden state that must be inferred
 */
export interface HiddenState {
  id: string;
  variable: string;
  possibleValues: string[];
  probabilities: number[];
  lastUpdated: number;
  evidenceIds: string[];
}

/**
 * Mental action for planning
 */
export interface MentalAction {
  id: string;
  name: string;
  preconditions: Belief[];
  effects: Belief[];
  cost: number;
  duration?: number;
}

/**
 * Mental context interface for trait extension
 */
export interface MentalContext {
  addBelief: (belief: Omit<Belief, 'id' | 'timestamp'>) => Belief;
  removeBelief: (beliefId: string) => void;
  getBeliefs: (filter?: Partial<Belief>) => Belief[];
  queryBeliefs: (subject?: string, predicate?: string, object?: string) => Belief[];
  updateBeliefConfidence: (beliefId: string, delta: number) => void;

  modelAgent: (agentId: string) => AgentModel;
  updateAgentModel: (agentId: string, updates: Partial<AgentModel>) => void;
  predictAgentAction: (agentId: string) => string[];
  inferAgentGoals: (agentId: string, observations: Belief[]) => Goal[];

  addGoal: (goal: Omit<Goal, 'id' | 'status' | 'progress' | 'subgoalIds'>) => Goal;
  updateGoal: (goalId: string, updates: Partial<Goal>) => void;
  decomposeGoal: (goalId: string, subgoals: Omit<Goal, 'id' | 'parentGoalId' | 'status' | 'progress' | 'subgoalIds'>[]) => Goal[];
  getActiveGoals: () => Goal[];
  achieveGoal: (goalId: string) => void;
  failGoal: (goalId: string, reason?: string) => void;

  inferHiddenState: (variable: string, evidence: Belief[]) => HiddenState;
  updateHiddenState: (stateId: string, newEvidence: Belief[]) => void;
  getHiddenState: (variable: string) => HiddenState | undefined;

  planToGoal: (goalId: string, availableActions: MentalAction[]) => MentalAction[];
  simulatePlan: (actions: MentalAction[]) => Belief[];

  spatialQuery: (query: string) => SpatialContext[];
  updateSpatialModel: (entityId: string, position: Vector3) => void;
}

// ============================================================================
// MENTAL WORLD STATE SERVICE
// ============================================================================

export class MentalWorldStateService {
  private beliefs: Map<string, Belief> = new Map();
  private agentModels: Map<string, AgentModel> = new Map();
  private goals: Map<string, Goal> = new Map();
  private hiddenStates: Map<string, HiddenState> = new Map();
  private spatialModel: Map<string, Vector3> = new Map();
  private logger: HololandLogger;

  private beliefIdCounter: number = 0;
  private goalIdCounter: number = 0;

  constructor() {
    this.logger = createLogger('MentalWorldState');
    this.logger.info('Initialized');
  }

  // =========================================================================
  // BELIEF MANAGEMENT
  // =========================================================================

  addBelief(belief: Omit<Belief, 'id' | 'timestamp'>): Belief {
    const id = `belief_${++this.beliefIdCounter}`;
    const fullBelief: Belief = {
      ...belief,
      id,
      timestamp: Date.now(),
    };

    // Check for contradicting beliefs
    const existing = this.queryBeliefs(belief.subject, belief.predicate);
    for (const existingBelief of existing) {
      if (existingBelief.object !== belief.object) {
        if (existingBelief.confidence < belief.confidence) {
          this.updateBeliefConfidence(existingBelief.id, -0.2);
        } else {
          fullBelief.confidence *= 0.8;
        }
      }
    }

    this.beliefs.set(id, fullBelief);
    this.logger.debug(`Added belief: ${belief.subject} ${belief.predicate} ${belief.object}`);
    return fullBelief;
  }

  removeBelief(beliefId: string): void {
    this.beliefs.delete(beliefId);
  }

  getBeliefs(filter?: Partial<Belief>): Belief[] {
    const results: Belief[] = [];
    for (const belief of this.beliefs.values()) {
      if (!filter) {
        results.push(belief);
        continue;
      }

      let matches = true;
      for (const [key, value] of Object.entries(filter)) {
        if (belief[key as keyof Belief] !== value) {
          matches = false;
          break;
        }
      }
      if (matches) results.push(belief);
    }
    return results;
  }

  queryBeliefs(subject?: string, predicate?: string, object?: string): Belief[] {
    const results: Belief[] = [];
    for (const belief of this.beliefs.values()) {
      if (subject && belief.subject !== subject) continue;
      if (predicate && belief.predicate !== predicate) continue;
      if (object && belief.object !== object) continue;
      results.push(belief);
    }
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  updateBeliefConfidence(beliefId: string, delta: number): void {
    const belief = this.beliefs.get(beliefId);
    if (belief) {
      belief.confidence = Math.max(0, Math.min(1, belief.confidence + delta));
      if (belief.confidence < 0.1) {
        this.removeBelief(beliefId);
        this.logger.debug(`Removed low-confidence belief: ${beliefId}`);
      }
    }
  }

  // =========================================================================
  // AGENT MODELING (Theory of Mind)
  // =========================================================================

  modelAgent(agentId: string): AgentModel {
    let model = this.agentModels.get(agentId);
    if (!model) {
      model = {
        agentId,
        perceivedGoals: [],
        perceivedBeliefs: [],
        predictedActions: [],
        trustLevel: 0.5,
        lastInteraction: Date.now(),
        relationship: 'unknown',
      };
      this.agentModels.set(agentId, model);
    }
    return model;
  }

  updateAgentModel(agentId: string, updates: Partial<AgentModel>): void {
    const model = this.modelAgent(agentId);
    Object.assign(model, updates);
    model.lastInteraction = Date.now();
  }

  predictAgentAction(agentId: string): string[] {
    const model = this.agentModels.get(agentId);
    if (!model) return [];

    const predictions: string[] = [];
    for (const goal of model.perceivedGoals) {
      if (goal.status === 'active') {
        predictions.push(`pursue:${goal.description}`);
      }
    }

    return predictions;
  }

  inferAgentGoals(agentId: string, observations: Belief[]): Goal[] {
    const model = this.modelAgent(agentId);
    const inferredGoals: Goal[] = [];

    const actionBeliefs = observations.filter(
      (b) => b.subject === agentId && b.predicate === 'performed'
    );

    const actionCounts = new Map<string, number>();
    for (const action of actionBeliefs) {
      const count = actionCounts.get(action.object) || 0;
      actionCounts.set(action.object, count + 1);
    }

    for (const [action, count] of actionCounts) {
      if (count >= 2) {
        const goal: Goal = {
          id: `inferred_${agentId}_${++this.goalIdCounter}`,
          description: `Inferred goal from repeated: ${action}`,
          priority: count / actionBeliefs.length,
          status: 'active',
          subgoalIds: [],
          preconditions: [],
          effects: [],
          progress: 0,
        };
        inferredGoals.push(goal);
      }
    }

    model.perceivedGoals = inferredGoals;
    return inferredGoals;
  }

  // =========================================================================
  // GOAL MANAGEMENT
  // =========================================================================

  addGoal(goal: Omit<Goal, 'id' | 'status' | 'progress' | 'subgoalIds'>): Goal {
    const id = `goal_${++this.goalIdCounter}`;
    const fullGoal: Goal = {
      ...goal,
      id,
      status: 'active',
      progress: 0,
      subgoalIds: [],
    };

    this.goals.set(id, fullGoal);
    this.logger.debug(`Added goal: ${goal.description}`);
    return fullGoal;
  }

  updateGoal(goalId: string, updates: Partial<Goal>): void {
    const goal = this.goals.get(goalId);
    if (goal) {
      Object.assign(goal, updates);
    }
  }

  decomposeGoal(
    goalId: string,
    subgoals: Omit<Goal, 'id' | 'parentGoalId' | 'status' | 'progress' | 'subgoalIds'>[]
  ): Goal[] {
    const parentGoal = this.goals.get(goalId);
    if (!parentGoal) return [];

    const createdSubgoals: Goal[] = [];
    for (const subgoal of subgoals) {
      const fullSubgoal = this.addGoal(subgoal);
      fullSubgoal.parentGoalId = goalId;
      parentGoal.subgoalIds.push(fullSubgoal.id);
      createdSubgoals.push(fullSubgoal);
    }

    this.logger.debug(`Decomposed goal ${goalId} into ${createdSubgoals.length} subgoals`);
    return createdSubgoals;
  }

  getActiveGoals(): Goal[] {
    return Array.from(this.goals.values()).filter((g) => g.status === 'active');
  }

  achieveGoal(goalId: string): void {
    const goal = this.goals.get(goalId);
    if (goal) {
      goal.status = 'achieved';
      goal.progress = 1;

      if (goal.parentGoalId) {
        this.updateParentProgress(goal.parentGoalId);
      }

      this.logger.info(`Goal achieved: ${goal.description}`);
    }
  }

  failGoal(goalId: string, reason?: string): void {
    const goal = this.goals.get(goalId);
    if (goal) {
      goal.status = 'failed';
      this.logger.warn(`Goal failed: ${goal.description}. Reason: ${reason || 'unknown'}`);
    }
  }

  private updateParentProgress(parentId: string): void {
    const parent = this.goals.get(parentId);
    if (!parent) return;

    const subgoals = parent.subgoalIds
      .map((id) => this.goals.get(id))
      .filter(Boolean) as Goal[];
    if (subgoals.length === 0) return;

    const completedCount = subgoals.filter((g) => g.status === 'achieved').length;
    parent.progress = completedCount / subgoals.length;

    if (completedCount === subgoals.length) {
      this.achieveGoal(parentId);
    }
  }

  // =========================================================================
  // HIDDEN STATE INFERENCE
  // =========================================================================

  inferHiddenState(variable: string, evidence: Belief[]): HiddenState {
    const existingState = this.hiddenStates.get(variable);
    const evidenceIds = evidence.map((e) => e.id);

    if (existingState) {
      this.updateHiddenState(existingState.id, evidence);
      return existingState;
    }

    const possibleValues = this.inferPossibleValues(variable, evidence);
    const probabilities = possibleValues.map(() => 1 / possibleValues.length);

    const state: HiddenState = {
      id: `hidden_${variable}`,
      variable,
      possibleValues,
      probabilities,
      lastUpdated: Date.now(),
      evidenceIds,
    };

    this.hiddenStates.set(variable, state);
    return state;
  }

  private inferPossibleValues(variable: string, evidence: Belief[]): string[] {
    const values = new Set<string>();

    for (const belief of evidence) {
      if (belief.subject === variable || belief.object === variable) {
        values.add(belief.object);
      }
    }

    if (values.size === 0) {
      return ['true', 'false', 'unknown'];
    }

    return Array.from(values);
  }

  updateHiddenState(stateId: string, newEvidence: Belief[]): void {
    const state = this.hiddenStates.get(stateId.replace('hidden_', ''));
    if (!state) return;

    for (const evidence of newEvidence) {
      const idx = state.possibleValues.findIndex((v) => v === evidence.object);
      if (idx >= 0) {
        state.probabilities[idx] *= 1 + evidence.confidence;
      }
    }

    const sum = state.probabilities.reduce((a, b) => a + b, 0);
    state.probabilities = state.probabilities.map((p) => p / sum);
    state.lastUpdated = Date.now();
    state.evidenceIds.push(...newEvidence.map((e) => e.id));
  }

  getHiddenState(variable: string): HiddenState | undefined {
    return this.hiddenStates.get(variable);
  }

  // =========================================================================
  // PLANNING
  // =========================================================================

  planToGoal(goalId: string, availableActions: MentalAction[]): MentalAction[] {
    const goal = this.goals.get(goalId);
    if (!goal) return [];

    const plan: MentalAction[] = [];
    const currentBeliefs = new Set(
      this.getBeliefs().map((b) => `${b.subject}:${b.predicate}:${b.object}`)
    );

    const neededEffects = new Set(
      goal.preconditions.map((b) => `${b.subject}:${b.predicate}:${b.object}`)
    );

    let iterations = 0;
    const maxIterations = 100;

    while (neededEffects.size > 0 && iterations < maxIterations) {
      iterations++;

      for (const action of availableActions) {
        const achieves = action.effects.some((e) =>
          neededEffects.has(`${e.subject}:${e.predicate}:${e.object}`)
        );

        if (achieves) {
          const preconsMet = action.preconditions.every((p) =>
            currentBeliefs.has(`${p.subject}:${p.predicate}:${p.object}`)
          );

          if (preconsMet) {
            plan.push(action);

            for (const effect of action.effects) {
              const key = `${effect.subject}:${effect.predicate}:${effect.object}`;
              currentBeliefs.add(key);
              neededEffects.delete(key);
            }
          } else {
            for (const precon of action.preconditions) {
              const key = `${precon.subject}:${precon.predicate}:${precon.object}`;
              if (!currentBeliefs.has(key)) {
                neededEffects.add(key);
              }
            }
          }
        }
      }
    }

    this.logger.debug(`Generated plan with ${plan.length} actions for goal ${goalId}`);
    return plan;
  }

  simulatePlan(actions: MentalAction[]): Belief[] {
    const simulatedBeliefs: Belief[] = [...this.getBeliefs()];

    for (const action of actions) {
      for (const effect of action.effects) {
        simulatedBeliefs.push({
          ...effect,
          id: `sim_${Date.now()}_${Math.random()}`,
          timestamp: Date.now(),
          source: 'inference',
        });
      }
    }

    return simulatedBeliefs;
  }

  // =========================================================================
  // SPATIAL REASONING
  // =========================================================================

  spatialQuery(query: string): SpatialContext[] {
    const results: SpatialContext[] = [];

    const nearMatch = query.match(/near\s+(\w+)/i);
    if (nearMatch) {
      const targetId = nearMatch[1];
      const targetPos = this.spatialModel.get(targetId);

      if (targetPos) {
        const nearEntities: string[] = [];
        for (const [entityId, pos] of this.spatialModel) {
          if (entityId === targetId) continue;
          const distance = Math.sqrt(
            Math.pow(pos[0] - targetPos[0], 2) +
            Math.pow(pos[1] - targetPos[1], 2) +
            Math.pow(pos[2] - targetPos[2], 2)
          );
          if (distance < 5) {
            nearEntities.push(entityId);
          }
        }

        results.push({
          position: targetPos,
          nearEntities,
          scale: 'standard',
        });
      }
    }

    return results;
  }

  updateSpatialModel(entityId: string, position: Vector3): void {
    this.spatialModel.set(entityId, position);
  }

  // =========================================================================
  // CONTEXT CREATION
  // =========================================================================

  /**
   * Create MentalContext for trait extension
   */
  createMentalContext(): MentalContext {
    return {
      addBelief: this.addBelief.bind(this),
      removeBelief: this.removeBelief.bind(this),
      getBeliefs: this.getBeliefs.bind(this),
      queryBeliefs: this.queryBeliefs.bind(this),
      updateBeliefConfidence: this.updateBeliefConfidence.bind(this),

      modelAgent: this.modelAgent.bind(this),
      updateAgentModel: this.updateAgentModel.bind(this),
      predictAgentAction: this.predictAgentAction.bind(this),
      inferAgentGoals: this.inferAgentGoals.bind(this),

      addGoal: this.addGoal.bind(this),
      updateGoal: this.updateGoal.bind(this),
      decomposeGoal: this.decomposeGoal.bind(this),
      getActiveGoals: this.getActiveGoals.bind(this),
      achieveGoal: this.achieveGoal.bind(this),
      failGoal: this.failGoal.bind(this),

      inferHiddenState: this.inferHiddenState.bind(this),
      updateHiddenState: this.updateHiddenState.bind(this),
      getHiddenState: this.getHiddenState.bind(this),

      planToGoal: this.planToGoal.bind(this),
      simulatePlan: this.simulatePlan.bind(this),

      spatialQuery: this.spatialQuery.bind(this),
      updateSpatialModel: this.updateSpatialModel.bind(this),
    };
  }

  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================

  getStats(): {
    beliefCount: number;
    agentModelCount: number;
    activeGoalCount: number;
    hiddenStateCount: number;
    spatialEntityCount: number;
  } {
    return {
      beliefCount: this.beliefs.size,
      agentModelCount: this.agentModels.size,
      activeGoalCount: this.getActiveGoals().length,
      hiddenStateCount: this.hiddenStates.size,
      spatialEntityCount: this.spatialModel.size,
    };
  }

  clear(): void {
    this.beliefs.clear();
    this.agentModels.clear();
    this.goals.clear();
    this.hiddenStates.clear();
    this.spatialModel.clear();
    this.beliefIdCounter = 0;
    this.goalIdCounter = 0;
    this.logger.info('State cleared');
  }

  /**
   * Export state for persistence
   */
  exportState(): {
    beliefs: Belief[];
    agentModels: AgentModel[];
    goals: Goal[];
    hiddenStates: HiddenState[];
  } {
    return {
      beliefs: Array.from(this.beliefs.values()),
      agentModels: Array.from(this.agentModels.values()),
      goals: Array.from(this.goals.values()),
      hiddenStates: Array.from(this.hiddenStates.values()),
    };
  }

  /**
   * Import state from persistence
   */
  importState(state: {
    beliefs?: Belief[];
    agentModels?: AgentModel[];
    goals?: Goal[];
    hiddenStates?: HiddenState[];
  }): void {
    if (state.beliefs) {
      for (const belief of state.beliefs) {
        this.beliefs.set(belief.id, belief);
      }
    }
    if (state.agentModels) {
      for (const model of state.agentModels) {
        this.agentModels.set(model.agentId, model);
      }
    }
    if (state.goals) {
      for (const goal of state.goals) {
        this.goals.set(goal.id, goal);
      }
    }
    if (state.hiddenStates) {
      for (const hidden of state.hiddenStates) {
        this.hiddenStates.set(hidden.variable, hidden);
      }
    }
    this.logger.info('State imported');
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let _mentalWorldState: MentalWorldStateService | null = null;

export function getMentalWorldStateService(): MentalWorldStateService {
  if (!_mentalWorldState) {
    _mentalWorldState = new MentalWorldStateService();
  }
  return _mentalWorldState;
}

export function resetMentalWorldState(): void {
  if (_mentalWorldState) {
    _mentalWorldState.clear();
  }
  _mentalWorldState = null;
}
