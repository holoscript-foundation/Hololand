/**
 * @hololand/agents CounterfactualEngine
 *
 * Evaluates "what-if" counterfactual queries on the SCM-DAG.
 */

import { SCM_DAG } from './SCM_DAG';

export interface CounterfactualQuery {
  interventions: Array<{ nodeId: string; value: unknown }>;
  observeNodes: string[];
}

export interface CounterfactualResult {
  observations: Record<string, unknown>;
  interventionsApplied: number;
  propagationSteps: number;
}

export class CounterfactualEngine {
  private dag: SCM_DAG;
  private queryCount: number = 0;

  constructor(dag: SCM_DAG) {
    this.dag = dag;
  }

  evaluate(query: CounterfactualQuery): CounterfactualResult {
    this.queryCount++;

    // Apply interventions (do-calculus: replace mechanism with constant)
    for (const intervention of query.interventions) {
      this.dag.setValue(intervention.nodeId, intervention.value);
    }

    // Propagate effects
    this.dag.propagate();

    // Observe results
    const observations: Record<string, unknown> = {};
    for (const nodeId of query.observeNodes) {
      observations[nodeId] = this.dag.getValue(nodeId);
    }

    return {
      observations,
      interventionsApplied: query.interventions.length,
      propagationSteps: this.dag.getNodeCount(),
    };
  }

  getQueryCount(): number { return this.queryCount; }
}
