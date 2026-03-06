/**
 * @hololand/agents SCM_DAG
 *
 * Structural Causal Model as a Directed Acyclic Graph.
 */

export interface CausalNode {
  id: string;
  name: string;
  value: unknown;
  mechanism: (parentValues: unknown) => unknown;
}

export interface CausalEdge {
  fromId: string;
  toId: string;
  strength: number;
  label: string;
}

export class SCM_DAG {
  private nodes: Map<string, CausalNode> = new Map();
  private edges: CausalEdge[] = [];
  private adjacency: Map<string, string[]> = new Map();
  private reverseAdj: Map<string, string[]> = new Map();

  addNode(node: CausalNode): void {
    this.nodes.set(node.id, { ...node });
    if (!this.adjacency.has(node.id)) this.adjacency.set(node.id, []);
    if (!this.reverseAdj.has(node.id)) this.reverseAdj.set(node.id, []);
  }

  addEdge(edge: CausalEdge): boolean {
    if (!this.nodes.has(edge.fromId) || !this.nodes.has(edge.toId)) return false;
    // Check for cycles
    if (this.wouldCreateCycle(edge.fromId, edge.toId)) return false;

    this.edges.push({ ...edge });
    this.adjacency.get(edge.fromId)!.push(edge.toId);
    this.reverseAdj.get(edge.toId)!.push(edge.fromId);
    return true;
  }

  hasNode(id: string): boolean { return this.nodes.has(id); }

  getNode(id: string): CausalNode | undefined {
    const n = this.nodes.get(id);
    return n ? { ...n } : undefined;
  }

  getParents(nodeId: string): string[] {
    return this.reverseAdj.get(nodeId) ?? [];
  }

  getChildren(nodeId: string): string[] {
    return this.adjacency.get(nodeId) ?? [];
  }

  /**
   * Propagate values through the DAG in topological order.
   */
  propagate(): void {
    const order = this.topologicalSort();
    for (const nodeId of order) {
      const node = this.nodes.get(nodeId)!;
      const parents = this.getParents(nodeId);
      if (parents.length > 0) {
        const parentValues = parents.map((p) => this.nodes.get(p)!.value);
        node.value = node.mechanism(parentValues);
      }
    }
  }

  setValue(nodeId: string, value: unknown): void {
    const node = this.nodes.get(nodeId);
    if (node) node.value = value;
  }

  getValue(nodeId: string): unknown {
    return this.nodes.get(nodeId)?.value;
  }

  topologicalSort(): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      for (const parent of this.getParents(id)) visit(parent);
      result.push(id);
    };
    for (const id of this.nodes.keys()) visit(id);
    return result;
  }

  getNodeCount(): number { return this.nodes.size; }
  getEdgeCount(): number { return this.edges.length; }

  private wouldCreateCycle(from: string, to: string): boolean {
    // DFS from 'to' to see if we can reach 'from'
    const visited = new Set<string>();
    const stack = [to];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === from) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const child of this.adjacency.get(current) ?? []) {
        stack.push(child);
      }
    }
    return false;
  }
}
