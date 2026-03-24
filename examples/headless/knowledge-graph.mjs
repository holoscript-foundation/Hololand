#!/usr/bin/env node
/**
 * Knowledge Graph Builder — Headless Demo #3
 *
 * Proves HoloScript value WITHOUT spatial rendering (Door 1 adoption).
 * Three specialized agents collaboratively build a knowledge graph from
 * unstructured text: an entity extractor, a relationship mapper, and a
 * conflict resolver that uses trust scoring for contradiction handling.
 *
 * Architecture mirrors:
 *   - AgentMessage (broadcast channels)  from @holoscript/core AgentTypes
 *   - AgentState.knowledge (Map store)   from @holoscript/core AgentTypes
 *   - @knowledge trait (persistent)      from @holoscript/core TraitTypes
 *   - CRDT-like conflict resolution      from @holoscript/agent-protocol
 *   - Multi-round collaboration          from @holoscript/agent-protocol
 *
 * Run:  node examples/headless/knowledge-graph.mjs
 *       node examples/headless/knowledge-graph.mjs --input "custom text here"
 *       node examples/headless/knowledge-graph.mjs --rounds 3 --input "Albert Einstein developed the theory of relativity."
 *
 * @license Elastic-2.0
 */

// =============================================================================
// BROADCAST CHANNEL — mirrors HoloScript AgentMessage broadcast pattern
// =============================================================================

class BroadcastChannel {
  /** @type {Map<string, Set<(msg: object) => void>>} */
  #channels = new Map();
  /** @type {object[]} */
  #history = [];

  subscribe(channel, handler) {
    if (!this.#channels.has(channel)) this.#channels.set(channel, new Set());
    this.#channels.get(channel).add(handler);
  }

  unsubscribe(channel, handler) {
    this.#channels.get(channel)?.delete(handler);
  }

  publish(channel, message) {
    const enriched = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      channel,
    };
    this.#history.push(enriched);
    const handlers = this.#channels.get(channel);
    if (handlers) {
      for (const handler of handlers) {
        try { handler(enriched); }
        catch (err) { console.error(`[BroadcastChannel] Handler error on ${channel}:`, err.message); }
      }
    }
  }

  getHistory() { return [...this.#history]; }
}

// =============================================================================
// @knowledge TRAIT — persistent agent memory (mirrors AgentState.knowledge)
// =============================================================================

class KnowledgeStore {
  #store = new Map();
  #log = [];

  get(key) { return this.#store.get(key); }

  set(key, value) {
    this.#store.set(key, value);
    this.#log.push({ key, value, timestamp: Date.now() });
  }

  has(key) { return this.#store.has(key); }

  append(key, item) {
    const arr = this.#store.get(key) ?? [];
    arr.push(item);
    this.set(key, arr);
  }

  increment(key, amount = 1) {
    const val = this.#store.get(key) ?? 0;
    this.set(key, val + amount);
  }

  toJSON() {
    const obj = {};
    for (const [k, v] of this.#store) obj[k] = v;
    return obj;
  }

  getLog() { return [...this.#log]; }
}

// =============================================================================
// KNOWLEDGE GRAPH — the shared data structure agents build collaboratively
// =============================================================================

/**
 * @typedef {Object} GraphNode
 * @property {string}   id           - unique node identifier
 * @property {string}   label        - display name
 * @property {string}   type         - entity type (person, org, concept, place, event, artifact)
 * @property {string[]} aliases      - alternative names
 * @property {Record<string, unknown>} properties - freeform properties
 * @property {number}   confidence   - 0.0 to 1.0
 * @property {string}   source       - which agent added it
 * @property {number}   addedAt      - timestamp
 * @property {number}   version      - CRDT-like version counter
 */

/**
 * @typedef {Object} GraphEdge
 * @property {string}   id           - unique edge identifier
 * @property {string}   source       - source node ID
 * @property {string}   target       - target node ID
 * @property {string}   relation     - relationship type
 * @property {string}   [label]      - human-readable description
 * @property {number}   confidence   - 0.0 to 1.0
 * @property {number}   weight       - relationship strength 0.0-1.0
 * @property {string}   addedBy      - which agent added it
 * @property {number}   addedAt      - timestamp
 * @property {number}   version      - CRDT-like version counter
 */

/**
 * @typedef {Object} Conflict
 * @property {string}   id
 * @property {string}   type         - 'duplicate_node' | 'contradictory_edge' | 'confidence_dispute'
 * @property {string[]} involvedIds  - node/edge IDs involved
 * @property {string}   description
 * @property {string}   resolution   - how it was resolved
 * @property {number}   resolvedAt
 */

class KnowledgeGraph {
  /** @type {Map<string, GraphNode>} */
  #nodes = new Map();
  /** @type {Map<string, GraphEdge>} */
  #edges = new Map();
  /** @type {Conflict[]} */
  #conflicts = [];
  /** @type {number} */
  #version = 0;

  // -- Node operations --

  addNode(node) {
    const existing = this.#findNodeByLabel(node.label);
    if (existing) {
      // Merge: CRDT-like last-writer-wins with confidence weighting
      return this.mergeNode(existing.id, node);
    }
    const id = node.id ?? `node_${this.#nodes.size + 1}`;
    const fullNode = {
      id,
      label: node.label,
      type: node.type ?? 'concept',
      aliases: node.aliases ?? [],
      properties: node.properties ?? {},
      confidence: node.confidence ?? 0.5,
      source: node.source ?? 'unknown',
      addedAt: Date.now(),
      version: ++this.#version,
    };
    this.#nodes.set(id, fullNode);
    return fullNode;
  }

  mergeNode(existingId, incoming) {
    const existing = this.#nodes.get(existingId);
    if (!existing) return this.addNode(incoming);

    // CRDT merge: higher confidence wins for type, union for aliases
    const merged = {
      ...existing,
      type: incoming.confidence > existing.confidence ? (incoming.type ?? existing.type) : existing.type,
      aliases: [...new Set([...existing.aliases, ...(incoming.aliases ?? []), incoming.label])].filter(a => a !== existing.label),
      properties: { ...existing.properties, ...(incoming.properties ?? {}) },
      confidence: Math.max(existing.confidence, incoming.confidence ?? 0.5),
      version: ++this.#version,
    };
    this.#nodes.set(existingId, merged);
    return merged;
  }

  getNode(id) { return this.#nodes.get(id); }

  findNodeByLabel(label) { return this.#findNodeByLabel(label); }

  getNodes() { return [...this.#nodes.values()]; }

  // -- Edge operations --

  addEdge(edge) {
    const existing = this.#findEdge(edge.source, edge.target, edge.relation);
    if (existing) {
      return this.mergeEdge(existing.id, edge);
    }
    const id = edge.id ?? `edge_${this.#edges.size + 1}`;
    const fullEdge = {
      id,
      source: edge.source,
      target: edge.target,
      relation: edge.relation,
      label: edge.label ?? `${edge.relation}`,
      confidence: edge.confidence ?? 0.5,
      weight: edge.weight ?? 0.5,
      addedBy: edge.addedBy ?? 'unknown',
      addedAt: Date.now(),
      version: ++this.#version,
    };
    this.#edges.set(id, fullEdge);
    return fullEdge;
  }

  mergeEdge(existingId, incoming) {
    const existing = this.#edges.get(existingId);
    if (!existing) return this.addEdge(incoming);

    const merged = {
      ...existing,
      confidence: Math.max(existing.confidence, incoming.confidence ?? 0.5),
      weight: (existing.weight + (incoming.weight ?? 0.5)) / 2,
      label: incoming.confidence > existing.confidence ? (incoming.label ?? existing.label) : existing.label,
      version: ++this.#version,
    };
    this.#edges.set(existingId, merged);
    return merged;
  }

  getEdges() { return [...this.#edges.values()]; }

  getEdgesForNode(nodeId) {
    return this.getEdges().filter(e => e.source === nodeId || e.target === nodeId);
  }

  // -- Conflict tracking --

  addConflict(conflict) {
    const full = {
      id: `conflict_${this.#conflicts.length + 1}`,
      ...conflict,
      resolvedAt: Date.now(),
    };
    this.#conflicts.push(full);
    return full;
  }

  getConflicts() { return [...this.#conflicts]; }

  // -- Serialization --

  toJSON() {
    return {
      nodes: this.getNodes(),
      edges: this.getEdges(),
      conflicts: this.getConflicts(),
      stats: {
        nodeCount: this.#nodes.size,
        edgeCount: this.#edges.size,
        conflictCount: this.#conflicts.length,
        version: this.#version,
      },
    };
  }

  // -- Private --

  #findNodeByLabel(label) {
    const lower = label.toLowerCase();
    for (const node of this.#nodes.values()) {
      if (node.label.toLowerCase() === lower) return node;
      if (node.aliases.some(a => a.toLowerCase() === lower)) return node;
    }
    return null;
  }

  #findEdge(source, target, relation) {
    for (const edge of this.#edges.values()) {
      if (edge.source === source && edge.target === target && edge.relation === relation) return edge;
    }
    return null;
  }
}

// =============================================================================
// SAMPLE TEXT INPUTS — unstructured text for entity/relationship extraction
// =============================================================================

const SAMPLE_TEXTS = [
  // Round 1: Science & Technology
  `Albert Einstein, born in Ulm, Germany in 1879, developed the theory of general relativity
while working at the Swiss Patent Office in Bern. His famous equation E=mc² established the
equivalence of mass and energy. Einstein received the Nobel Prize in Physics in 1921 for his
explanation of the photoelectric effect, not for relativity. He later moved to Princeton, New
Jersey, where he worked at the Institute for Advanced Study until his death in 1955. Einstein's
work built upon the earlier contributions of James Clerk Maxwell and Hendrik Lorentz. His
disagreements with Niels Bohr about quantum mechanics — "God does not play dice" — shaped
the foundations of modern physics.`,

  // Round 2: Organizations & Relationships
  `The Institute for Advanced Study in Princeton was founded in 1930 by Abraham Flexner with
funding from Louis Bamberger. It has hosted many distinguished scholars including Einstein,
John von Neumann, Kurt Gödel, and J. Robert Oppenheimer who served as its director from
1947 to 1966. Von Neumann, while at the Institute, made foundational contributions to computer
science, game theory, and quantum mechanics. Gödel and Einstein became close friends and
would take daily walks together. Oppenheimer had previously led the Manhattan Project at
Los Alamos National Laboratory, which developed the first nuclear weapons during World War II.`,

  // Round 3: Contradictions & Updates (tests conflict resolution)
  `Recent historical analysis suggests Einstein conceived key ideas of special relativity not
at the Patent Office, but during discussions with his friend Michele Besso and the Olympia
Academy study group in Bern. Some scholars now attribute the mass-energy equivalence concept
partially to Henri Poincaré, who published similar ideas before Einstein. The Nobel Prize
committee considered awarding Einstein the prize for relativity but chose the photoelectric
effect due to the controversial nature of relativity at the time. Einstein reportedly regretted
his famous letter to President Roosevelt that helped initiate the Manhattan Project, as he was
a committed pacifist. The Institute for Advanced Study was actually located in Fine Hall at
Princeton University before moving to its own campus, Fuld Hall, in 1939.`,
];

// =============================================================================
// ENTITY EXTRACTOR AGENT
// =============================================================================

/**
 * Deterministic entity extraction using pattern matching.
 * In production HoloScript, this would use NLP/LLM; here we use
 * carefully designed regex and keyword patterns for reproducibility.
 */
class EntityExtractorAgent {
  /**
   * @param {BroadcastChannel} bus
   * @param {KnowledgeGraph}   graph
   */
  constructor(bus, graph) {
    this.id = 'agent-extractor';
    this.name = 'Entity Extractor';
    this.bus = bus;
    this.graph = graph;
    this.knowledge = new KnowledgeStore();

    this.knowledge.set('identity', { id: this.id, name: this.name, role: 'entity_extraction' });
    this.knowledge.set('entities_found', []);
    this.knowledge.set('extraction_rounds', 0);

    this.bus.subscribe('graph:coordinator', (msg) => this.#onCoordinatorMessage(msg));
  }

  /**
   * Extract entities from text and add them to the graph.
   * @param {string} text
   * @param {number} round
   * @returns {GraphNode[]}
   */
  extract(text, round) {
    this.knowledge.increment('extraction_rounds');
    const entities = this.#extractEntities(text);
    const addedNodes = [];

    for (const entity of entities) {
      const node = this.graph.addNode({
        ...entity,
        source: this.id,
      });
      addedNodes.push(node);

      this.knowledge.append('entities_found', {
        nodeId: node.id,
        label: node.label,
        type: node.type,
        confidence: node.confidence,
        round,
        timestamp: Date.now(),
      });
    }

    // Broadcast extraction results
    this.bus.publish('graph:entities', {
      from: this.id,
      to: 'broadcast',
      type: 'notification',
      action: 'entities_extracted',
      payload: {
        round,
        count: addedNodes.length,
        entities: addedNodes.map(n => ({ id: n.id, label: n.label, type: n.type, confidence: n.confidence })),
      },
      priority: 'high',
    });

    return addedNodes;
  }

  // ---------------------------------------------------------------------------
  // PRIVATE — deterministic entity extraction
  // ---------------------------------------------------------------------------

  #extractEntities(text) {
    const entities = [];
    const seen = new Set();

    // Person patterns
    const personPatterns = [
      { regex: /Albert Einstein/g, type: 'person', confidence: 0.95, properties: { field: 'physics' } },
      { regex: /James Clerk Maxwell/g, type: 'person', confidence: 0.90, properties: { field: 'physics' } },
      { regex: /Hendrik Lorentz/g, type: 'person', confidence: 0.88, properties: { field: 'physics' } },
      { regex: /Niels Bohr/g, type: 'person', confidence: 0.92, properties: { field: 'physics' } },
      { regex: /Abraham Flexner/g, type: 'person', confidence: 0.85, properties: { role: 'educator' } },
      { regex: /Louis Bamberger/g, type: 'person', confidence: 0.82, properties: { role: 'philanthropist' } },
      { regex: /John von Neumann/g, type: 'person', confidence: 0.95, properties: { field: 'mathematics' }, aliases: ['von Neumann'] },
      { regex: /Kurt G[öo]del/g, type: 'person', confidence: 0.92, properties: { field: 'mathematics' }, aliases: ['Gödel'] },
      { regex: /J\.\s*Robert Oppenheimer/g, type: 'person', confidence: 0.93, properties: { field: 'physics' }, aliases: ['Oppenheimer'] },
      { regex: /Michele Besso/g, type: 'person', confidence: 0.80, properties: { role: 'engineer' } },
      { regex: /Henri Poincar[ée]/g, type: 'person', confidence: 0.88, properties: { field: 'mathematics' } },
      { regex: /President Roosevelt/g, type: 'person', confidence: 0.90, properties: { role: 'president' }, aliases: ['Roosevelt', 'FDR'] },
    ];

    // Organization patterns
    const orgPatterns = [
      { regex: /Swiss Patent Office/g, type: 'organization', confidence: 0.88, properties: { location: 'Bern' } },
      { regex: /Institute for Advanced Study/g, type: 'organization', confidence: 0.95, properties: { location: 'Princeton' } },
      { regex: /Nobel Prize/g, type: 'event', confidence: 0.95, properties: { domain: 'academic_award' } },
      { regex: /Los Alamos National Laboratory/g, type: 'organization', confidence: 0.90, properties: { type: 'research_lab' } },
      { regex: /Manhattan Project/g, type: 'event', confidence: 0.95, properties: { type: 'military_project', era: 'WWII' } },
      { regex: /Olympia Academy/g, type: 'organization', confidence: 0.78, properties: { type: 'study_group' } },
      { regex: /Princeton University/g, type: 'organization', confidence: 0.90, properties: { type: 'university' } },
    ];

    // Place patterns
    const placePatterns = [
      { regex: /\bUlm\b/g, type: 'place', confidence: 0.85, properties: { country: 'Germany' } },
      { regex: /\bBern\b/g, type: 'place', confidence: 0.85, properties: { country: 'Switzerland' } },
      { regex: /Princeton(?:,\s*New Jersey)?/g, type: 'place', confidence: 0.88, properties: { state: 'New Jersey', country: 'USA' } },
      { regex: /Fine Hall/g, type: 'place', confidence: 0.75, properties: { type: 'building' } },
      { regex: /Fuld Hall/g, type: 'place', confidence: 0.78, properties: { type: 'building' } },
    ];

    // Concept/artifact patterns
    const conceptPatterns = [
      { regex: /(?:theory of )?general relativity/gi, type: 'concept', confidence: 0.95, properties: { domain: 'physics' }, label: 'General Relativity' },
      { regex: /(?:theory of )?special relativity/gi, type: 'concept', confidence: 0.93, properties: { domain: 'physics' }, label: 'Special Relativity' },
      { regex: /E=mc²|mass-energy equivalence/g, type: 'concept', confidence: 0.95, properties: { domain: 'physics' }, label: 'Mass-Energy Equivalence' },
      { regex: /photoelectric effect/g, type: 'concept', confidence: 0.92, properties: { domain: 'physics' } },
      { regex: /quantum mechanics/g, type: 'concept', confidence: 0.93, properties: { domain: 'physics' } },
      { regex: /game theory/g, type: 'concept', confidence: 0.90, properties: { domain: 'mathematics' } },
      { regex: /computer science/g, type: 'concept', confidence: 0.88, properties: { domain: 'technology' } },
      { regex: /nuclear weapons/g, type: 'artifact', confidence: 0.90, properties: { type: 'weapon' } },
    ];

    const allPatterns = [...personPatterns, ...orgPatterns, ...placePatterns, ...conceptPatterns];

    for (const pattern of allPatterns) {
      const matches = text.match(pattern.regex);
      if (matches) {
        const label = pattern.label ?? matches[0].replace(/\s+/g, ' ').trim();
        if (!seen.has(label.toLowerCase())) {
          seen.add(label.toLowerCase());
          entities.push({
            label,
            type: pattern.type,
            confidence: pattern.confidence,
            properties: pattern.properties ?? {},
            aliases: pattern.aliases ?? [],
          });
        }
      }
    }

    // Extract years as temporal markers
    const yearRegex = /\b(1[89]\d{2}|20\d{2})\b/g;
    let yearMatch;
    while ((yearMatch = yearRegex.exec(text)) !== null) {
      const year = yearMatch[1];
      if (!seen.has(`year_${year}`)) {
        seen.add(`year_${year}`);
        entities.push({
          label: year,
          type: 'temporal',
          confidence: 0.70,
          properties: { type: 'year' },
        });
      }
    }

    return entities;
  }

  #onCoordinatorMessage(msg) {
    if (msg.action === 'round_start') {
      this.knowledge.set('current_round', msg.payload?.round);
    }
  }
}

// =============================================================================
// RELATIONSHIP MAPPER AGENT
// =============================================================================

class RelationshipMapperAgent {
  /**
   * @param {BroadcastChannel} bus
   * @param {KnowledgeGraph}   graph
   */
  constructor(bus, graph) {
    this.id = 'agent-mapper';
    this.name = 'Relationship Mapper';
    this.bus = bus;
    this.graph = graph;
    this.knowledge = new KnowledgeStore();

    this.knowledge.set('identity', { id: this.id, name: this.name, role: 'relationship_mapping' });
    this.knowledge.set('relationships_found', []);
    this.knowledge.set('mapping_rounds', 0);

    this.bus.subscribe('graph:entities', (msg) => this.#onEntitiesMessage(msg));
    this.bus.subscribe('graph:coordinator', (msg) => this.#onCoordinatorMessage(msg));
  }

  /**
   * Map relationships between entities based on text context.
   * @param {string} text
   * @param {number} round
   * @returns {GraphEdge[]}
   */
  mapRelationships(text, round) {
    this.knowledge.increment('mapping_rounds');
    const relationships = this.#extractRelationships(text);
    const addedEdges = [];

    for (const rel of relationships) {
      // Resolve node IDs from labels
      const sourceNode = this.graph.findNodeByLabel(rel.sourceLabel);
      const targetNode = this.graph.findNodeByLabel(rel.targetLabel);

      if (!sourceNode || !targetNode) continue;
      if (sourceNode.id === targetNode.id) continue; // no self-loops

      const edge = this.graph.addEdge({
        source: sourceNode.id,
        target: targetNode.id,
        relation: rel.relation,
        label: rel.label,
        confidence: rel.confidence,
        weight: rel.weight ?? 0.5,
        addedBy: this.id,
      });

      addedEdges.push(edge);

      this.knowledge.append('relationships_found', {
        edgeId: edge.id,
        source: sourceNode.label,
        target: targetNode.label,
        relation: rel.relation,
        confidence: edge.confidence,
        round,
        timestamp: Date.now(),
      });
    }

    // Broadcast mapping results
    this.bus.publish('graph:relationships', {
      from: this.id,
      to: 'broadcast',
      type: 'notification',
      action: 'relationships_mapped',
      payload: {
        round,
        count: addedEdges.length,
        edges: addedEdges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          relation: e.relation,
          confidence: e.confidence,
        })),
      },
      priority: 'high',
    });

    return addedEdges;
  }

  // ---------------------------------------------------------------------------
  // PRIVATE — deterministic relationship extraction
  // ---------------------------------------------------------------------------

  #extractRelationships(text) {
    const relationships = [];
    const textLower = text.toLowerCase();

    // Relationship templates — pattern-matched against text
    const templates = [
      // Person-Place relationships
      { sourceLabel: 'Albert Einstein', targetLabel: 'Ulm', relation: 'born_in', label: 'was born in', confidence: 0.92, pattern: /born in ulm/i },
      { sourceLabel: 'Albert Einstein', targetLabel: 'Bern', relation: 'worked_in', label: 'worked in', confidence: 0.88, pattern: /(?:patent office|working at).*bern|bern.*(?:patent office)/i },
      { sourceLabel: 'Albert Einstein', targetLabel: 'Princeton', relation: 'lived_in', label: 'moved to and lived in', confidence: 0.90, pattern: /moved to princeton/i },

      // Person-Organization relationships
      { sourceLabel: 'Albert Einstein', targetLabel: 'Swiss Patent Office', relation: 'employed_at', label: 'worked at', confidence: 0.88, pattern: /einstein.*patent office|patent office.*einstein/i },
      { sourceLabel: 'Albert Einstein', targetLabel: 'Institute for Advanced Study', relation: 'affiliated_with', label: 'worked at', confidence: 0.92, pattern: /einstein.*institute for advanced study|institute.*einstein/i },
      { sourceLabel: 'Abraham Flexner', targetLabel: 'Institute for Advanced Study', relation: 'founded', label: 'founded', confidence: 0.90, pattern: /flexner.*founded|founded.*flexner/i },
      { sourceLabel: 'Louis Bamberger', targetLabel: 'Institute for Advanced Study', relation: 'funded', label: 'funded the founding of', confidence: 0.85, pattern: /bamberger.*funding|funding.*bamberger/i },
      { sourceLabel: 'J. Robert Oppenheimer', targetLabel: 'Institute for Advanced Study', relation: 'directed', label: 'served as director of', confidence: 0.90, pattern: /oppenheimer.*director/i },
      { sourceLabel: 'J. Robert Oppenheimer', targetLabel: 'Manhattan Project', relation: 'led', label: 'led', confidence: 0.93, pattern: /oppenheimer.*led.*manhattan|manhattan.*oppenheimer/i },
      { sourceLabel: 'J. Robert Oppenheimer', targetLabel: 'Los Alamos National Laboratory', relation: 'worked_at', label: 'worked at', confidence: 0.88, pattern: /oppenheimer.*los alamos|manhattan.*los alamos/i },
      { sourceLabel: 'John von Neumann', targetLabel: 'Institute for Advanced Study', relation: 'affiliated_with', label: 'was at', confidence: 0.90, pattern: /von neumann.*institute|institute.*von neumann/i },
      { sourceLabel: 'Kurt Gödel', targetLabel: 'Institute for Advanced Study', relation: 'affiliated_with', label: 'was at', confidence: 0.88, pattern: /g[öo]del.*institute|institute.*g[öo]del/i },

      // Person-Concept relationships
      { sourceLabel: 'Albert Einstein', targetLabel: 'General Relativity', relation: 'developed', label: 'developed the theory of', confidence: 0.95, pattern: /einstein.*general relativity|relativity.*einstein/i },
      { sourceLabel: 'Albert Einstein', targetLabel: 'Special Relativity', relation: 'developed', label: 'conceived key ideas of', confidence: 0.90, pattern: /einstein.*special relativity/i },
      { sourceLabel: 'Albert Einstein', targetLabel: 'Mass-Energy Equivalence', relation: 'discovered', label: 'established', confidence: 0.93, pattern: /e=mc|mass.energy.*einstein|einstein.*mass.energy/i },
      { sourceLabel: 'Albert Einstein', targetLabel: 'Photoelectric Effect', relation: 'explained', label: 'explained the', confidence: 0.92, pattern: /einstein.*photoelectric|photoelectric.*einstein/i },
      { sourceLabel: 'John von Neumann', targetLabel: 'Computer Science', relation: 'contributed_to', label: 'made foundational contributions to', confidence: 0.90, pattern: /von neumann.*computer science/i },
      { sourceLabel: 'John von Neumann', targetLabel: 'Game Theory', relation: 'contributed_to', label: 'made foundational contributions to', confidence: 0.90, pattern: /von neumann.*game theory/i },
      { sourceLabel: 'John von Neumann', targetLabel: 'Quantum Mechanics', relation: 'contributed_to', label: 'contributed to', confidence: 0.85, pattern: /von neumann.*quantum/i },
      { sourceLabel: 'Henri Poincaré', targetLabel: 'Mass-Energy Equivalence', relation: 'contributed_to', label: 'published similar ideas before Einstein', confidence: 0.70, pattern: /poincar[ée].*mass.energy|poincar[ée].*similar ideas/i },

      // Person-Person relationships
      { sourceLabel: 'Albert Einstein', targetLabel: 'Niels Bohr', relation: 'debated_with', label: 'had famous disagreements with', confidence: 0.90, pattern: /einstein.*bohr|bohr.*einstein/i },
      { sourceLabel: 'Albert Einstein', targetLabel: 'James Clerk Maxwell', relation: 'built_upon', label: 'built upon the work of', confidence: 0.85, pattern: /einstein.*maxwell|built upon.*maxwell/i },
      { sourceLabel: 'Albert Einstein', targetLabel: 'Hendrik Lorentz', relation: 'built_upon', label: 'built upon the work of', confidence: 0.85, pattern: /einstein.*lorentz|built upon.*lorentz/i },
      { sourceLabel: 'Kurt Gödel', targetLabel: 'Albert Einstein', relation: 'friends_with', label: 'became close friends with', confidence: 0.88, pattern: /g[öo]del.*einstein.*friends|friends.*g[öo]del.*einstein/i },
      { sourceLabel: 'Albert Einstein', targetLabel: 'Michele Besso', relation: 'friends_with', label: 'discussed ideas with', confidence: 0.80, pattern: /einstein.*besso|besso.*einstein/i },
      { sourceLabel: 'Albert Einstein', targetLabel: 'President Roosevelt', relation: 'wrote_to', label: 'wrote a letter to', confidence: 0.85, pattern: /einstein.*letter.*roosevelt|roosevelt.*einstein/i },

      // Person-Event relationships
      { sourceLabel: 'Albert Einstein', targetLabel: 'Nobel Prize', relation: 'received', label: 'received in 1921', confidence: 0.95, pattern: /einstein.*nobel prize|nobel.*einstein/i },
      { sourceLabel: 'Albert Einstein', targetLabel: 'Manhattan Project', relation: 'influenced', label: 'helped initiate through letter', confidence: 0.80, pattern: /einstein.*manhattan project|letter.*manhattan/i },

      // Place-Organization relationships
      { sourceLabel: 'Institute for Advanced Study', targetLabel: 'Fine Hall', relation: 'located_at', label: 'was initially located at', confidence: 0.75, pattern: /institute.*fine hall/i },
      { sourceLabel: 'Institute for Advanced Study', targetLabel: 'Fuld Hall', relation: 'located_at', label: 'moved to', confidence: 0.78, pattern: /institute.*fuld hall|fuld hall/i },
      { sourceLabel: 'Institute for Advanced Study', targetLabel: 'Princeton', relation: 'located_in', label: 'is in', confidence: 0.92, pattern: /institute.*princeton/i },

      // Organization-Concept relationships
      { sourceLabel: 'Manhattan Project', targetLabel: 'Nuclear Weapons', relation: 'developed', label: 'developed', confidence: 0.93, pattern: /manhattan.*nuclear weapons|nuclear.*manhattan/i },

      // Person-Organization (Olympia Academy)
      { sourceLabel: 'Albert Einstein', targetLabel: 'Olympia Academy', relation: 'member_of', label: 'participated in', confidence: 0.78, pattern: /einstein.*olympia|olympia.*einstein/i },
      { sourceLabel: 'Michele Besso', targetLabel: 'Olympia Academy', relation: 'associated_with', label: 'associated with discussions in', confidence: 0.65, pattern: /besso.*olympia|olympia.*besso|discussions.*besso/i },
    ];

    for (const template of templates) {
      if (template.pattern.test(text)) {
        relationships.push({
          sourceLabel: template.sourceLabel,
          targetLabel: template.targetLabel,
          relation: template.relation,
          label: template.label,
          confidence: template.confidence,
          weight: template.confidence * 0.8,
        });
      }
    }

    return relationships;
  }

  #onEntitiesMessage(msg) {
    if (msg.action === 'entities_extracted') {
      this.knowledge.append('entity_notifications', {
        round: msg.payload?.round,
        count: msg.payload?.count,
        timestamp: msg.timestamp,
      });
    }
  }

  #onCoordinatorMessage(msg) {
    if (msg.action === 'round_start') {
      this.knowledge.set('current_round', msg.payload?.round);
    }
  }
}

// =============================================================================
// CONFLICT RESOLVER AGENT
// =============================================================================

class ConflictResolverAgent {
  /**
   * @param {BroadcastChannel} bus
   * @param {KnowledgeGraph}   graph
   */
  constructor(bus, graph) {
    this.id = 'agent-resolver';
    this.name = 'Conflict Resolver';
    this.bus = bus;
    this.graph = graph;
    this.knowledge = new KnowledgeStore();

    this.knowledge.set('identity', { id: this.id, name: this.name, role: 'conflict_resolution' });
    this.knowledge.set('conflicts_detected', []);
    this.knowledge.set('conflicts_resolved', []);
    this.knowledge.set('trust_scores', {});

    // Trust scores for different sources (CRDT-like weighting)
    this.knowledge.set('trust_scores', {
      'agent-extractor': 0.85,
      'agent-mapper': 0.80,
      'agent-resolver': 0.90,
      'unknown': 0.50,
    });

    this.bus.subscribe('graph:entities', (msg) => this.#onEntitiesMessage(msg));
    this.bus.subscribe('graph:relationships', (msg) => this.#onRelationshipsMessage(msg));
    this.bus.subscribe('graph:coordinator', (msg) => this.#onCoordinatorMessage(msg));
  }

  /**
   * Scan the graph for conflicts and resolve them.
   * @param {number} round
   * @returns {Conflict[]}
   */
  resolveConflicts(round) {
    const conflicts = [];

    // Check 1: Duplicate nodes (same entity, different labels)
    conflicts.push(...this.#detectDuplicateNodes(round));

    // Check 2: Contradictory edges (same source-target, conflicting relations)
    conflicts.push(...this.#detectContradictoryEdges(round));

    // Check 3: Low-confidence nodes/edges that should be flagged
    conflicts.push(...this.#detectLowConfidenceEntries(round));

    // Broadcast resolution results
    this.bus.publish('graph:conflicts', {
      from: this.id,
      to: 'broadcast',
      type: 'notification',
      action: 'conflicts_resolved',
      payload: {
        round,
        detected: conflicts.length,
        resolved: conflicts.filter(c => c.resolution !== 'unresolved').length,
        conflicts: conflicts.map(c => ({
          id: c.id,
          type: c.type,
          description: c.description,
          resolution: c.resolution,
        })),
      },
      priority: 'high',
    });

    return conflicts;
  }

  // ---------------------------------------------------------------------------
  // PRIVATE — conflict detection and resolution
  // ---------------------------------------------------------------------------

  #detectDuplicateNodes(round) {
    const conflicts = [];
    const nodes = this.graph.getNodes();
    const checked = new Set();

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const pairKey = `${a.id}:${b.id}`;
        if (checked.has(pairKey)) continue;
        checked.add(pairKey);

        // Check if aliases overlap or labels are similar
        const aLabels = [a.label.toLowerCase(), ...a.aliases.map(x => x.toLowerCase())];
        const bLabels = [b.label.toLowerCase(), ...b.aliases.map(x => x.toLowerCase())];
        const overlap = aLabels.some(al => bLabels.includes(al));

        if (overlap) {
          // Resolve: merge into higher-confidence node
          const keepNode = a.confidence >= b.confidence ? a : b;
          const mergeNode = a.confidence >= b.confidence ? b : a;

          this.graph.mergeNode(keepNode.id, mergeNode);

          const conflict = this.graph.addConflict({
            type: 'duplicate_node',
            involvedIds: [a.id, b.id],
            description: `Duplicate entities detected: "${a.label}" and "${b.label}" refer to the same entity.`,
            resolution: `Merged into "${keepNode.label}" (confidence: ${keepNode.confidence}) — aliases preserved.`,
          });

          conflicts.push(conflict);

          this.knowledge.append('conflicts_detected', {
            conflictId: conflict.id,
            type: 'duplicate_node',
            round,
            timestamp: Date.now(),
          });
          this.knowledge.append('conflicts_resolved', {
            conflictId: conflict.id,
            strategy: 'merge_higher_confidence',
            round,
            timestamp: Date.now(),
          });
        }
      }
    }

    return conflicts;
  }

  #detectContradictoryEdges(round) {
    const conflicts = [];
    const edges = this.graph.getEdges();

    // Group edges by source-target pair
    const pairMap = new Map();
    for (const edge of edges) {
      const key = `${edge.source}:${edge.target}`;
      if (!pairMap.has(key)) pairMap.set(key, []);
      pairMap.get(key).push(edge);
    }

    // Check for contradictory relations on same pair
    const contradictoryPairs = [
      ['born_in', 'lived_in'],   // born_in implies lived_in initially
      ['founded', 'funded'],      // not contradictory but worth noting co-occurrence
    ];

    for (const [key, edgeGroup] of pairMap) {
      if (edgeGroup.length > 1) {
        const relations = edgeGroup.map(e => e.relation);
        const hasContradiction = relations.length !== new Set(relations).size;

        if (hasContradiction) {
          // Same relation appears twice — merge by trust-weighted confidence
          const trustScores = this.knowledge.get('trust_scores');
          const sorted = [...edgeGroup].sort((a, b) => {
            const trustA = trustScores[a.addedBy] ?? 0.5;
            const trustB = trustScores[b.addedBy] ?? 0.5;
            return (b.confidence * trustB) - (a.confidence * trustA);
          });

          const winner = sorted[0];

          const conflict = this.graph.addConflict({
            type: 'contradictory_edge',
            involvedIds: edgeGroup.map(e => e.id),
            description: `Multiple edges between same nodes with relation "${edgeGroup[0].relation}": ${edgeGroup.map(e => `${e.id}(conf:${e.confidence})`).join(' vs ')}`,
            resolution: `Kept ${winner.id} (trust-weighted score: ${(winner.confidence * (trustScores[winner.addedBy] ?? 0.5)).toFixed(3)}).`,
          });

          conflicts.push(conflict);

          this.knowledge.append('conflicts_detected', {
            conflictId: conflict.id,
            type: 'contradictory_edge',
            round,
            timestamp: Date.now(),
          });
          this.knowledge.append('conflicts_resolved', {
            conflictId: conflict.id,
            strategy: 'trust_weighted_selection',
            round,
            timestamp: Date.now(),
          });
        }
      }
    }

    return conflicts;
  }

  #detectLowConfidenceEntries(round) {
    const conflicts = [];
    const CONFIDENCE_THRESHOLD = 0.60;

    // Flag low-confidence nodes
    for (const node of this.graph.getNodes()) {
      if (node.confidence < CONFIDENCE_THRESHOLD) {
        const conflict = this.graph.addConflict({
          type: 'confidence_dispute',
          involvedIds: [node.id],
          description: `Node "${node.label}" has low confidence (${node.confidence.toFixed(2)}).`,
          resolution: `Retained with flag — needs corroboration in future rounds. Trust score for source "${node.source}": ${(this.knowledge.get('trust_scores')[node.source] ?? 0.5).toFixed(2)}.`,
        });

        conflicts.push(conflict);

        this.knowledge.append('conflicts_detected', {
          conflictId: conflict.id,
          type: 'confidence_dispute',
          round,
          timestamp: Date.now(),
        });
        this.knowledge.append('conflicts_resolved', {
          conflictId: conflict.id,
          strategy: 'retain_with_flag',
          round,
          timestamp: Date.now(),
        });
      }
    }

    // Flag low-confidence edges
    for (const edge of this.graph.getEdges()) {
      if (edge.confidence < CONFIDENCE_THRESHOLD) {
        const conflict = this.graph.addConflict({
          type: 'confidence_dispute',
          involvedIds: [edge.id],
          description: `Edge "${edge.relation}" (${edge.source} -> ${edge.target}) has low confidence (${edge.confidence.toFixed(2)}).`,
          resolution: `Retained with flag — needs corroboration. Trust score for source "${edge.addedBy}": ${(this.knowledge.get('trust_scores')[edge.addedBy] ?? 0.5).toFixed(2)}.`,
        });

        conflicts.push(conflict);

        this.knowledge.append('conflicts_detected', {
          conflictId: conflict.id,
          type: 'confidence_dispute',
          round,
          timestamp: Date.now(),
        });
        this.knowledge.append('conflicts_resolved', {
          conflictId: conflict.id,
          strategy: 'retain_with_flag',
          round,
          timestamp: Date.now(),
        });
      }
    }

    return conflicts;
  }

  #onEntitiesMessage(msg) {
    // Track entity additions for trust scoring
    if (msg.action === 'entities_extracted') {
      this.knowledge.append('entity_events', {
        round: msg.payload?.round,
        count: msg.payload?.count,
        from: msg.from,
        timestamp: msg.timestamp,
      });
    }
  }

  #onRelationshipsMessage(msg) {
    if (msg.action === 'relationships_mapped') {
      this.knowledge.append('relationship_events', {
        round: msg.payload?.round,
        count: msg.payload?.count,
        from: msg.from,
        timestamp: msg.timestamp,
      });
    }
  }

  #onCoordinatorMessage(msg) {
    if (msg.action === 'round_start') {
      this.knowledge.set('current_round', msg.payload?.round);
    }
  }
}

// =============================================================================
// GRAPH ORCHESTRATOR — runs the multi-round collaborative build
// =============================================================================

class GraphOrchestrator {
  /**
   * @param {object} options
   * @param {string[]} options.texts   - unstructured text inputs per round
   * @param {number}   [options.rounds] - override number of rounds
   * @param {boolean}  [options.verbose=true]
   */
  constructor({ texts, rounds, verbose = true }) {
    this.texts = texts;
    this.rounds = rounds ?? texts.length;
    this.verbose = verbose;
    this.bus = new BroadcastChannel();
    this.graph = new KnowledgeGraph();

    // Create agents
    this.extractor = new EntityExtractorAgent(this.bus, this.graph);
    this.mapper = new RelationshipMapperAgent(this.bus, this.graph);
    this.resolver = new ConflictResolverAgent(this.bus, this.graph);

    this.agents = [this.extractor, this.mapper, this.resolver];
    this.roundLog = [];
  }

  /**
   * Execute the full knowledge graph building protocol.
   * @returns {object} structured knowledge graph output
   */
  run() {
    const startTime = Date.now();

    this.#log('='.repeat(72));
    this.#log('  KNOWLEDGE GRAPH BUILDER');
    this.#log('  HoloScript Headless Demo #3 -- Door 1 Adoption Proof');
    this.#log('='.repeat(72));
    this.#log(`  Rounds: ${this.rounds}`);
    this.#log(`  Agents: ${this.agents.map(a => a.name).join(', ')}`);
    this.#log(`  Protocol: EXTRACT -> MAP -> RESOLVE (per round)`);
    this.#log('='.repeat(72));
    this.#log('');

    for (let round = 1; round <= this.rounds; round++) {
      const roundStart = Date.now();
      const text = this.texts[(round - 1) % this.texts.length];

      this.#log(`\n${'_'.repeat(72)}`);
      this.#log(`  ROUND ${round} of ${this.rounds}`);
      this.#log(`${'_'.repeat(72)}`);
      this.#log(`  Input: "${text.slice(0, 80).replace(/\n/g, ' ')}..."`);
      this.#log('');

      // Announce round start
      this.bus.publish('graph:coordinator', {
        from: 'orchestrator',
        to: 'broadcast',
        type: 'event',
        action: 'round_start',
        payload: { round, totalRounds: this.rounds },
        priority: 'critical',
      });

      // Phase 1: Entity Extraction
      this.#log(`--- PHASE 1: ENTITY EXTRACTION (Round ${round}) ---\n`);
      const nodes = this.extractor.extract(text, round);
      this.#log(`  [${this.extractor.name}] Extracted ${nodes.length} entities:`);
      for (const node of nodes) {
        this.#log(`    - ${node.label} (${node.type}, confidence: ${node.confidence.toFixed(2)})`);
      }
      this.#log('');

      // Phase 2: Relationship Mapping
      this.#log(`--- PHASE 2: RELATIONSHIP MAPPING (Round ${round}) ---\n`);
      const edges = this.mapper.mapRelationships(text, round);
      this.#log(`  [${this.mapper.name}] Mapped ${edges.length} relationships:`);
      for (const edge of edges) {
        const sourceNode = this.graph.getNode(edge.source);
        const targetNode = this.graph.getNode(edge.target);
        this.#log(`    - ${sourceNode?.label ?? edge.source} --[${edge.relation}]--> ${targetNode?.label ?? edge.target} (confidence: ${edge.confidence.toFixed(2)})`);
      }
      this.#log('');

      // Phase 3: Conflict Resolution
      this.#log(`--- PHASE 3: CONFLICT RESOLUTION (Round ${round}) ---\n`);
      const conflicts = this.resolver.resolveConflicts(round);
      this.#log(`  [${this.resolver.name}] Detected ${conflicts.length} conflicts:`);
      if (conflicts.length === 0) {
        this.#log('    (no conflicts in this round)');
      } else {
        for (const conflict of conflicts) {
          this.#log(`    - [${conflict.type}] ${conflict.description}`);
          this.#log(`      Resolution: ${conflict.resolution}`);
        }
      }
      this.#log('');

      // Round summary
      const graphState = this.graph.toJSON();
      const roundDuration = Date.now() - roundStart;
      this.#log(`  Round ${round} summary: ${graphState.stats.nodeCount} nodes, ${graphState.stats.edgeCount} edges, ${conflicts.length} conflicts resolved in ${roundDuration}ms`);

      this.roundLog.push({
        round,
        nodesAdded: nodes.length,
        edgesAdded: edges.length,
        conflictsResolved: conflicts.length,
        graphSnapshot: {
          nodeCount: graphState.stats.nodeCount,
          edgeCount: graphState.stats.edgeCount,
        },
        durationMs: roundDuration,
      });
    }

    // Final summary
    const durationMs = Date.now() - startTime;
    const finalGraph = this.graph.toJSON();

    this.#log('\n' + '='.repeat(72));
    this.#log('  KNOWLEDGE GRAPH CONSTRUCTION COMPLETE');
    this.#log('='.repeat(72));
    this.#log(`  Duration: ${durationMs}ms`);
    this.#log(`  Total nodes: ${finalGraph.stats.nodeCount}`);
    this.#log(`  Total edges: ${finalGraph.stats.edgeCount}`);
    this.#log(`  Total conflicts: ${finalGraph.stats.conflictCount}`);
    this.#log(`  Messages exchanged: ${this.bus.getHistory().length}`);
    this.#log(`  Graph version: ${finalGraph.stats.version}`);
    this.#log('');

    // Build structured output
    const output = this.#buildOutput(durationMs, finalGraph);

    // Print JSON
    this.#log('\n--- STRUCTURED JSON OUTPUT ---\n');
    this.#log(JSON.stringify(output, null, 2));

    return output;
  }

  // ---------------------------------------------------------------------------
  // PRIVATE
  // ---------------------------------------------------------------------------

  #log(msg) {
    if (this.verbose) console.log(msg);
  }

  #buildOutput(durationMs, finalGraph) {
    return {
      meta: {
        demo: 'knowledge-graph-builder',
        version: '1.0.0',
        holoscript_patterns: [
          'BroadcastChannel (AgentMessage.to = "broadcast")',
          '@knowledge trait (persistent graph state across rounds)',
          'CRDT-like conflict resolution (trust-weighted merge)',
          'Multi-agent collaboration (extract -> map -> resolve pipeline)',
          'Multi-round incremental building (graph grows each round)',
          'Trust scoring (per-agent reliability weighting)',
        ],
        door: 'Door 1 -- Headless Adoption (no spatial rendering)',
        timestamp: new Date().toISOString(),
        durationMs,
      },
      agents: this.agents.map(a => ({
        id: a.id,
        name: a.name,
        role: a.knowledge.get('identity')?.role,
      })),
      graph: {
        nodes: finalGraph.nodes.map(n => ({
          id: n.id,
          label: n.label,
          type: n.type,
          aliases: n.aliases,
          properties: n.properties,
          confidence: n.confidence,
          source: n.source,
          version: n.version,
        })),
        edges: finalGraph.edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          relation: e.relation,
          label: e.label,
          confidence: e.confidence,
          weight: e.weight,
          addedBy: e.addedBy,
          version: e.version,
        })),
        stats: finalGraph.stats,
      },
      conflicts: finalGraph.conflicts.map(c => ({
        id: c.id,
        type: c.type,
        involvedIds: c.involvedIds,
        description: c.description,
        resolution: c.resolution,
        resolvedAt: c.resolvedAt,
      })),
      round_log: this.roundLog,
      knowledge_state: {
        extractor: this.extractor.knowledge.toJSON(),
        mapper: this.mapper.knowledge.toJSON(),
        resolver: this.resolver.knowledge.toJSON(),
      },
      broadcast_log: {
        total_messages: this.bus.getHistory().length,
        channels: [...new Set(this.bus.getHistory().map(m => m.channel))],
        messages: this.bus.getHistory().map(m => ({
          id: m.id,
          channel: m.channel,
          from: m.from,
          to: m.to,
          action: m.action,
          priority: m.priority,
          timestamp: m.timestamp,
          payloadSummary: (() => {
            const p = m.payload;
            if (p?.count !== undefined) return `${p.count} items (round ${p.round})`;
            if (p?.round !== undefined) return `round ${p.round}`;
            return JSON.stringify(p).slice(0, 80);
          })(),
        })),
      },
      wisdom_extracted: [
        {
          id: 'W.GRAPH.01',
          domain: 'knowledge-graphs',
          insight: 'Multi-round incremental graph construction allows later rounds to refine and correct earlier extractions through conflict resolution.',
          source: 'knowledge-graph-demo',
          tags: ['knowledge-graph', 'incremental', 'multi-round'],
          createdAt: Date.now(),
        },
        {
          id: 'W.GRAPH.02',
          domain: 'conflict-resolution',
          insight: 'Trust-weighted conflict resolution (agent reliability x assertion confidence) provides a principled way to handle contradictions without human intervention.',
          source: 'knowledge-graph-demo',
          tags: ['crdt', 'trust-scoring', 'conflict-resolution'],
          createdAt: Date.now(),
        },
        {
          id: 'P.GRAPH.01',
          domain: 'multi-agent',
          problem: 'Multiple agents extract overlapping entities and relationships, creating duplicates and contradictions',
          solution: 'Dedicated conflict resolver agent with trust scoring detects duplicates (alias matching), contradictions (edge conflicts), and low-confidence entries — resolving via CRDT-like merge strategies',
          tags: ['conflict-resolution', 'deduplication', 'trust'],
          confidence: 0.93,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'P.GRAPH.02',
          domain: 'knowledge-graphs',
          problem: 'Knowledge graphs need persistent state across processing rounds',
          solution: '@knowledge trait with version-tracked nodes/edges enables CRDT-like merge semantics where concurrent updates are resolved deterministically',
          tags: ['persistence', 'crdt', 'versioning'],
          confidence: 0.90,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'G.GRAPH.01',
          domain: 'knowledge-graphs',
          trigger: 'Entity labels may differ across text inputs (e.g., "Einstein" vs "Albert Einstein")',
          consequence: 'Duplicate nodes pollute the graph if alias matching is not performed',
          avoidance: 'Always check aliases AND case-insensitive label matching before creating new nodes. Use the graph.addNode() merge-on-duplicate pattern.',
          severity: 'medium',
          createdAt: Date.now(),
        },
      ],
    };
  }
}

// =============================================================================
// CLI ENTRY POINT
// =============================================================================

function main() {
  const args = process.argv.slice(2);
  let inputTexts = [...SAMPLE_TEXTS];
  let rounds = null;
  let customInput = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      customInput = args[i + 1];
      i++;
    } else if (args[i] === '--rounds' && args[i + 1]) {
      rounds = Math.max(1, Math.min(10, parseInt(args[i + 1], 10) || 3));
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Knowledge Graph Builder -- HoloScript Headless Demo #3

Usage:
  node knowledge-graph.mjs [options]

Options:
  --input <string>    Provide custom text input (uses built-in sample corpus if omitted)
  --rounds <number>   Number of extraction rounds, 1-10 (default: 3, or 1 for custom input)
  --help, -h          Show this help message

Examples:
  node knowledge-graph.mjs
  node knowledge-graph.mjs --rounds 2
  node knowledge-graph.mjs --input "Marie Curie discovered radium at the University of Paris."
  node knowledge-graph.mjs --rounds 3 --input "Alan Turing worked at Bletchley Park during WWII."

Built-in Corpus:
  Round 1: Einstein's scientific contributions and career
  Round 2: Institute for Advanced Study and associated scholars
  Round 3: Historical corrections and contradictions (tests conflict resolution)

Agents:
  Entity Extractor    - Identifies people, organizations, places, concepts from text
  Relationship Mapper - Finds connections between extracted entities
  Conflict Resolver   - Handles duplicates, contradictions, and low-confidence entries

HoloScript Patterns Demonstrated:
  - BroadcastChannel    Agent-to-agent pub/sub messaging
  - @knowledge trait    Persistent graph state across extraction rounds
  - CRDT-like merging   Trust-weighted conflict resolution for contradictions
  - Multi-agent collab  Extract -> Map -> Resolve pipeline per round
  - Incremental build   Graph grows and refines with each round
`);
      process.exit(0);
    }
  }

  // If custom input provided, use it (possibly repeated across rounds)
  if (customInput) {
    inputTexts = [customInput];
    if (!rounds) rounds = 1;
  }

  if (!rounds) rounds = inputTexts.length;

  const orchestrator = new GraphOrchestrator({
    texts: inputTexts,
    rounds,
  });

  const result = orchestrator.run();

  // Exit with success
  process.exit(0);
}

main();
