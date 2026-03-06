import { describe, it, expect, beforeEach } from 'vitest';
import { SCM_DAG } from '../SCM_DAG';
import { CounterfactualEngine } from '../CounterfactualEngine';
import { CausalWorldModel } from '../CausalWorldModel';

describe('SCM_DAG', () => {
  let dag: SCM_DAG;
  beforeEach(() => { dag = new SCM_DAG(); });

  it('adds nodes and edges', () => {
    dag.addNode({ id: 'A', name: 'A', value: 10, mechanism: (x) => x });
    dag.addNode({ id: 'B', name: 'B', value: null, mechanism: (parents: unknown) => (parents as number[])[0] * 2 });
    expect(dag.addEdge({ fromId: 'A', toId: 'B', strength: 1, label: 'A->B' })).toBe(true);
    expect(dag.getNodeCount()).toBe(2);
    expect(dag.getEdgeCount()).toBe(1);
  });

  it('prevents cycles', () => {
    dag.addNode({ id: 'A', name: 'A', value: 0, mechanism: (x) => x });
    dag.addNode({ id: 'B', name: 'B', value: 0, mechanism: (x) => x });
    dag.addEdge({ fromId: 'A', toId: 'B', strength: 1, label: '' });
    expect(dag.addEdge({ fromId: 'B', toId: 'A', strength: 1, label: '' })).toBe(false);
  });

  it('propagates values', () => {
    dag.addNode({ id: 'A', name: 'A', value: 5, mechanism: (x) => x });
    dag.addNode({ id: 'B', name: 'B', value: null, mechanism: (parents: unknown) => (parents as number[])[0] * 3 });
    dag.addEdge({ fromId: 'A', toId: 'B', strength: 1, label: '' });
    dag.propagate();
    expect(dag.getValue('B')).toBe(15);
  });

  it('produces topological sort', () => {
    dag.addNode({ id: 'A', name: 'A', value: 0, mechanism: (x) => x });
    dag.addNode({ id: 'B', name: 'B', value: 0, mechanism: (x) => x });
    dag.addNode({ id: 'C', name: 'C', value: 0, mechanism: (x) => x });
    dag.addEdge({ fromId: 'A', toId: 'B', strength: 1, label: '' });
    dag.addEdge({ fromId: 'B', toId: 'C', strength: 1, label: '' });
    const order = dag.topologicalSort();
    expect(order.indexOf('A')).toBeLessThan(order.indexOf('B'));
    expect(order.indexOf('B')).toBeLessThan(order.indexOf('C'));
  });
});

describe('CounterfactualEngine', () => {
  it('evaluates what-if queries', () => {
    const dag = new SCM_DAG();
    dag.addNode({ id: 'rain', name: 'Rain', value: false, mechanism: (x) => x });
    dag.addNode({ id: 'wet', name: 'Wet Ground', value: false, mechanism: (parents: unknown) => (parents as boolean[])[0] });
    dag.addEdge({ fromId: 'rain', toId: 'wet', strength: 1, label: '' });

    const engine = new CounterfactualEngine(dag);
    const result = engine.evaluate({
      interventions: [{ nodeId: 'rain', value: true }],
      observeNodes: ['wet'],
    });
    expect(result.observations.wet).toBe(true);
  });
});

describe('CausalWorldModel', () => {
  let model: CausalWorldModel;
  beforeEach(() => { model = new CausalWorldModel(); });

  it('tracks entity state', () => {
    model.setEntityState('player', { health: 100, position: { x: 0, y: 0, z: 0 } });
    expect(model.getEntityState('player')).toBeDefined();
    expect(model.getHistoryLength()).toBe(1);
  });

  it('integrates causal reasoning with entity state', () => {
    model.addCause('damage', 'health', 0.8, (parents: unknown) => 100 - ((parents as number[])[0] ?? 0));
    model.getDAG().setValue('damage', 30);
    const result = model.whatIf({
      interventions: [{ nodeId: 'damage', value: 30 }],
      observeNodes: ['health'],
    });
    expect(result.observations.health).toBe(70);
  });
});
