/**
 * @hololand/agents CausalWorldModel
 *
 * Causal world model using SCM-DAG for VR physics.
 * Supports counterfactual "what-if" simulation.
 */

import { SCM_DAG, type CausalNode, type CausalEdge } from './SCM_DAG';
import { CounterfactualEngine, type CounterfactualQuery, type CounterfactualResult } from './CounterfactualEngine';

export interface WorldState {
  entities: Map<string, Record<string, unknown>>;
  timestamp: number;
}

export class CausalWorldModel {
  private dag: SCM_DAG;
  private engine: CounterfactualEngine;
  private worldState: WorldState;
  private history: WorldState[] = [];
  private maxHistory: number;

  constructor(maxHistory: number = 100) {
    this.dag = new SCM_DAG();
    this.engine = new CounterfactualEngine(this.dag);
    this.worldState = { entities: new Map(), timestamp: Date.now() };
    this.maxHistory = maxHistory;
  }

  addCause(causeId: string, effectId: string, strength: number, mechanism: (input: unknown) => unknown): void {
    if (!this.dag.hasNode(causeId)) this.dag.addNode({ id: causeId, name: causeId, value: null, mechanism: (x: unknown) => x });
    if (!this.dag.hasNode(effectId)) this.dag.addNode({ id: effectId, name: effectId, value: null, mechanism });
    this.dag.addEdge({ fromId: causeId, toId: effectId, strength, label: `${causeId}->${effectId}` });
  }

  setEntityState(entityId: string, state: Record<string, unknown>): void {
    this.worldState.entities.set(entityId, { ...state });
    this.worldState.timestamp = Date.now();
    this.history.push({ entities: new Map(this.worldState.entities), timestamp: this.worldState.timestamp });
    if (this.history.length > this.maxHistory) this.history.shift();
  }

  whatIf(query: CounterfactualQuery): CounterfactualResult {
    return this.engine.evaluate(query);
  }

  getEntityState(entityId: string): Record<string, unknown> | undefined {
    return this.worldState.entities.get(entityId);
  }

  getDAG(): SCM_DAG { return this.dag; }
  getEngine(): CounterfactualEngine { return this.engine; }
  getHistoryLength(): number { return this.history.length; }
}
