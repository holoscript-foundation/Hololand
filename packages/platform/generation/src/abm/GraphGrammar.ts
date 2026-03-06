/**
 * Graph Grammar World Topology Generator
 *
 * Defines world structure via rewriting rules:
 * - Grammars define topology (biome layout, connectivity)
 * - ABMs drive dynamics (ecological simulation fills the structure)
 * - LLMs fill narrative (generating descriptions and quests)
 *
 * The graph grammar produces a topological map of regions and
 * connections that the ABM populates with ecological agents.
 *
 * @module abm/GraphGrammar
 */

import type {
  GraphGrammarRule,
  GraphPattern,
  GraphNode,
  GraphEdge,
  BiomeType,
} from './types';

// =============================================================================
// Seeded RNG (deterministic)
// =============================================================================

class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /** xorshift32 */
  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    this.state = x;
    return (x >>> 0) / 0xffffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// =============================================================================
// Default Grammar Rules
// =============================================================================

/**
 * Start rule: create initial seed graph with a central grassland
 * connected to 3-4 adjacent biomes.
 */
function createStartRule(): GraphGrammarRule {
  return {
    name: 'start',
    lhs: {
      nodes: [{ id: 'seed', type: 'grassland', size: 1, elevation: 0 }],
      edges: [],
    },
    rhs: {
      nodes: [
        { id: 'center', type: 'grassland', size: 3, elevation: 100 },
        { id: 'north', type: 'woodland', size: 2, elevation: 120 },
        { id: 'east', type: 'meadow', size: 2, elevation: 95 },
        { id: 'south', type: 'wetland', size: 2, elevation: 80 },
        { id: 'west', type: 'scrubland', size: 2, elevation: 110 },
      ],
      edges: [
        { from: 'center', to: 'north', type: 'adjacent', weight: 1 },
        { from: 'center', to: 'east', type: 'adjacent', weight: 1 },
        { from: 'center', to: 'south', type: 'adjacent', weight: 1 },
        { from: 'center', to: 'west', type: 'adjacent', weight: 1 },
        { from: 'north', to: 'east', type: 'path', weight: 0.5 },
        { from: 'south', to: 'west', type: 'waterway', weight: 0.7 },
      ],
    },
    probability: 1.0,
    minApplications: 1,
    maxApplications: 1,
  };
}

/**
 * Subdivision rule: split a large grassland into grassland + meadow + path.
 */
function createSubdivisionRule(): GraphGrammarRule {
  return {
    name: 'subdivide-grassland',
    lhs: {
      nodes: [{ id: 'A', type: 'grassland', size: 3, elevation: 0 }],
      edges: [],
    },
    rhs: {
      nodes: [
        { id: 'A1', type: 'grassland', size: 2, elevation: 0 },
        { id: 'A2', type: 'meadow', size: 1, elevation: 0 },
      ],
      edges: [{ from: 'A1', to: 'A2', type: 'path', weight: 1 }],
    },
    probability: 0.6,
    minApplications: 0,
    maxApplications: 3,
  };
}

/**
 * Forest growth rule: woodland adjacent to wetland spawns riparian zone.
 */
function createRiparianRule(): GraphGrammarRule {
  return {
    name: 'riparian-growth',
    lhs: {
      nodes: [
        { id: 'W', type: 'woodland', size: 1, elevation: 0 },
        { id: 'L', type: 'wetland', size: 1, elevation: 0 },
      ],
      edges: [{ from: 'W', to: 'L', type: 'adjacent', weight: 1 }],
    },
    rhs: {
      nodes: [
        { id: 'W', type: 'woodland', size: 1, elevation: 0 },
        { id: 'R', type: 'riparian', size: 1, elevation: 0 },
        { id: 'L', type: 'wetland', size: 1, elevation: 0 },
      ],
      edges: [
        { from: 'W', to: 'R', type: 'elevation-transition', weight: 1 },
        { from: 'R', to: 'L', type: 'waterway', weight: 1 },
      ],
    },
    probability: 0.7,
    minApplications: 0,
    maxApplications: 4,
  };
}

/**
 * Forest deepening: woodland with enough adjacencies becomes forest.
 */
function createForestDeepening(): GraphGrammarRule {
  return {
    name: 'forest-deepening',
    lhs: {
      nodes: [
        { id: 'W1', type: 'woodland', size: 2, elevation: 0 },
      ],
      edges: [],
    },
    rhs: {
      nodes: [
        { id: 'F1', type: 'forest', size: 2, elevation: 0 },
        { id: 'U1', type: 'woodland', size: 1, elevation: 0 },
      ],
      edges: [
        { from: 'F1', to: 'U1', type: 'adjacent', weight: 1 },
      ],
    },
    probability: 0.4,
    minApplications: 0,
    maxApplications: 2,
  };
}

/**
 * Rocky outcrop: scrubland can develop rocky terrain.
 */
function createRockyOutcrop(): GraphGrammarRule {
  return {
    name: 'rocky-outcrop',
    lhs: {
      nodes: [{ id: 'S', type: 'scrubland', size: 2, elevation: 0 }],
      edges: [],
    },
    rhs: {
      nodes: [
        { id: 'S1', type: 'scrubland', size: 1, elevation: 0 },
        { id: 'R1', type: 'rocky', size: 1, elevation: 0, metadata: { hasCliffs: true } },
      ],
      edges: [
        { from: 'S1', to: 'R1', type: 'elevation-transition', weight: 1 },
      ],
    },
    probability: 0.3,
    minApplications: 0,
    maxApplications: 2,
  };
}

export function getDefaultGrammarRules(): GraphGrammarRule[] {
  return [
    createStartRule(),
    createSubdivisionRule(),
    createRiparianRule(),
    createForestDeepening(),
    createRockyOutcrop(),
  ];
}

// =============================================================================
// Graph Grammar Engine
// =============================================================================

export class GraphGrammarEngine {
  private rules: GraphGrammarRule[];
  private rng: SeededRNG;
  private nodeCounter = 0;

  constructor(rules: GraphGrammarRule[], seed: number) {
    this.rules = [...rules].sort((a, b) => {
      // Start rules always first
      if (a.name === 'start') return -1;
      if (b.name === 'start') return 1;
      return 0;
    });
    this.rng = new SeededRNG(seed);
  }

  /**
   * Generate world topology by iteratively applying grammar rules.
   * Returns the final graph structure.
   */
  generate(maxIterations: number = 10): GraphPattern {
    let graph: GraphPattern = {
      nodes: [{ id: 'seed', type: 'grassland', size: 1, elevation: 0 }],
      edges: [],
    };

    // Track rule application counts
    const applicationCounts = new Map<string, number>();
    for (const rule of this.rules) {
      applicationCounts.set(rule.name, 0);
    }

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let anyApplied = false;

      for (const rule of this.rules) {
        const count = applicationCounts.get(rule.name) ?? 0;
        if (count >= rule.maxApplications) continue;
        if (count < rule.minApplications || this.rng.next() < rule.probability) {
          const match = this.findMatch(graph, rule.lhs);
          if (match) {
            graph = this.applyRule(graph, rule, match);
            applicationCounts.set(rule.name, count + 1);
            anyApplied = true;
          }
        }
      }

      if (!anyApplied && iteration > 0) break;
    }

    return this.assignPositions(graph);
  }

  /**
   * Find a subgraph matching the LHS pattern.
   */
  private findMatch(
    graph: GraphPattern,
    pattern: GraphPattern,
  ): Map<string, string> | null {
    if (pattern.nodes.length === 0) return null;

    // Simple matching: find first node matching the pattern type
    for (const patternNode of pattern.nodes) {
      const candidates = graph.nodes.filter(
        (n) =>
          n.type === patternNode.type &&
          (patternNode.size === 0 || n.size >= patternNode.size),
      );

      if (candidates.length > 0) {
        const chosen = this.rng.pick(candidates);
        const mapping = new Map<string, string>();
        mapping.set(patternNode.id, chosen.id);

        // Try to match remaining nodes via edges
        if (pattern.edges.length > 0 && pattern.nodes.length > 1) {
          let allMatched = true;
          for (const pNode of pattern.nodes) {
            if (mapping.has(pNode.id)) continue;
            // Find a connected node of the right type
            const connectedEdges = graph.edges.filter(
              (e) =>
                e.from === chosen.id || e.to === chosen.id,
            );
            const neighborIds = connectedEdges.map((e) =>
              e.from === chosen.id ? e.to : e.from,
            );
            const neighbor = graph.nodes.find(
              (n) =>
                neighborIds.includes(n.id) &&
                n.type === pNode.type &&
                !Array.from(mapping.values()).includes(n.id),
            );
            if (neighbor) {
              mapping.set(pNode.id, neighbor.id);
            } else {
              allMatched = false;
            }
          }
          if (!allMatched) continue;
        }

        return mapping;
      }
    }

    return null;
  }

  /**
   * Apply a grammar rule to the graph, replacing matched subgraph with RHS.
   */
  private applyRule(
    graph: GraphPattern,
    rule: GraphGrammarRule,
    match: Map<string, string>,
  ): GraphPattern {
    const newNodes = [...graph.nodes];
    const newEdges = [...graph.edges];

    // Remove matched nodes
    const matchedIds = new Set(match.values());
    const survivingNodes = newNodes.filter((n) => !matchedIds.has(n.id));
    const survivingEdges = newEdges.filter(
      (e) => !matchedIds.has(e.from) && !matchedIds.has(e.to),
    );

    // Collect edges that connected to removed nodes (for reconnection)
    const danglingEdges = newEdges.filter(
      (e) =>
        (matchedIds.has(e.from) && !matchedIds.has(e.to)) ||
        (!matchedIds.has(e.from) && matchedIds.has(e.to)),
    );

    // Create RHS nodes with unique IDs
    const rhsIdMap = new Map<string, string>();
    for (const rhsNode of rule.rhs.nodes) {
      const newId = `${rhsNode.id}-${++this.nodeCounter}`;
      rhsIdMap.set(rhsNode.id, newId);

      // Inherit elevation from matched node if specified as 0
      const matchedNode = graph.nodes.find(
        (n) => match.get(rhsNode.id) === n.id,
      );
      survivingNodes.push({
        ...rhsNode,
        id: newId,
        elevation:
          rhsNode.elevation === 0 && matchedNode
            ? matchedNode.elevation + (this.rng.next() - 0.5) * 20
            : rhsNode.elevation,
      });
    }

    // Create RHS edges with remapped IDs
    for (const rhsEdge of rule.rhs.edges) {
      const from = rhsIdMap.get(rhsEdge.from);
      const to = rhsIdMap.get(rhsEdge.to);
      if (from && to) {
        survivingEdges.push({ ...rhsEdge, from, to });
      }
    }

    // Reconnect dangling edges to the first RHS node
    const firstRhsId = rhsIdMap.values().next().value;
    if (firstRhsId) {
      for (const edge of danglingEdges) {
        if (matchedIds.has(edge.from)) {
          survivingEdges.push({ ...edge, from: firstRhsId });
        } else {
          survivingEdges.push({ ...edge, to: firstRhsId });
        }
      }
    }

    return { nodes: survivingNodes, edges: survivingEdges };
  }

  /**
   * Assign 2D positions to nodes using force-directed layout.
   */
  private assignPositions(graph: GraphPattern): GraphPattern {
    // Initialize random positions
    const positions = new Map<string, { x: number; y: number }>();
    for (const node of graph.nodes) {
      positions.set(node.id, {
        x: this.rng.next() * 100 - 50,
        y: this.rng.next() * 100 - 50,
      });
    }

    // Simple force-directed iteration
    const iterations = 50;
    const repulsionStrength = 500;
    const attractionStrength = 0.1;
    const damping = 0.9;

    const velocities = new Map<string, { x: number; y: number }>();
    for (const node of graph.nodes) {
      velocities.set(node.id, { x: 0, y: 0 });
    }

    for (let iter = 0; iter < iterations; iter++) {
      // Repulsive forces between all node pairs
      for (let i = 0; i < graph.nodes.length; i++) {
        for (let j = i + 1; j < graph.nodes.length; j++) {
          const a = positions.get(graph.nodes[i].id)!;
          const b = positions.get(graph.nodes[j].id)!;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsionStrength / (dist * dist);

          const va = velocities.get(graph.nodes[i].id)!;
          const vb = velocities.get(graph.nodes[j].id)!;
          va.x += (dx / dist) * force;
          va.y += (dy / dist) * force;
          vb.x -= (dx / dist) * force;
          vb.y -= (dy / dist) * force;
        }
      }

      // Attractive forces along edges
      for (const edge of graph.edges) {
        const a = positions.get(edge.from);
        const b = positions.get(edge.to);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = dist * attractionStrength;

        const va = velocities.get(edge.from)!;
        const vb = velocities.get(edge.to)!;
        va.x += (dx / dist) * force;
        va.y += (dy / dist) * force;
        vb.x -= (dx / dist) * force;
        vb.y -= (dy / dist) * force;
      }

      // Apply velocities with damping
      for (const node of graph.nodes) {
        const pos = positions.get(node.id)!;
        const vel = velocities.get(node.id)!;
        pos.x += vel.x * 0.1;
        pos.y += vel.y * 0.1;
        vel.x *= damping;
        vel.y *= damping;
      }
    }

    // Store positions in node metadata
    return {
      nodes: graph.nodes.map((n) => ({
        ...n,
        metadata: {
          ...n.metadata,
          layoutPosition: positions.get(n.id),
        },
      })),
      edges: graph.edges,
    };
  }
}
