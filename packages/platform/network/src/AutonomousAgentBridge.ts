/**
 * AutonomousAgentBridge (Phase 7)
 *
 * Implements AgentProvider from @hololand/core TraitContextFactory,
 * connecting HoloScript's 10 autonomous agent trait handlers to
 * Hololand's AI/NPC runtime.
 *
 * Wired handlers:
 *   - behaviorTreeHandler    (BT execution engine)
 *   - goalOrientedHandler    (GOAP planner)
 *   - llmAgentHandler        (LLM-driven NPC cognition)
 *   - memoryHandler          (episodic + semantic memory)
 *   - perceptionHandler      (spatial awareness / senses)
 *   - emotionHandler         (emotional state machine)
 *   - dialogueHandler        (conversation tree execution)
 *   - factionHandler         (faction & reputation system)
 *   - patrolHandler          (waypoint patrol routes)
 *   - negotiationHandler     (agent-to-agent negotiation)
 */

import type { AgentProvider } from '@hololand/core';

// ---------------------------------------------------------------------------
// Agent Types
// ---------------------------------------------------------------------------

export interface AgentMemoryEntry {
  timestamp: number;
  type: 'observation' | 'interaction' | 'emotion' | 'goal' | 'dialogue';
  content: string;
  importance: number;
  embedding?: number[];
}

export interface AgentGoal {
  id: string;
  description: string;
  priority: number;
  preconditions: Record<string, unknown>;
  effects: Record<string, unknown>;
  cost: number;
}

export interface BehaviorTreeNode {
  type: 'sequence' | 'selector' | 'parallel' | 'action' | 'condition' | 'decorator';
  name: string;
  children?: BehaviorTreeNode[];
  action?: string;
  condition?: string;
}

export type BehaviorTreeStatus = 'running' | 'success' | 'failure';

export interface PerceptionSense {
  type: 'sight' | 'hearing' | 'proximity';
  range: number;
  fov?: number; // degrees, for sight
  sensitivity: number; // 0-1
}

export interface PerceivedEntity {
  entityId: string;
  position: { x: number; y: number; z: number };
  distance: number;
  sense: PerceptionSense['type'];
  lastSeen: number;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  choices?: Array<{ label: string; next: string; condition?: string }>;
  effects?: Record<string, unknown>;
}

export interface FactionStanding {
  factionId: string;
  reputation: number; // -100 to 100
  disposition: 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'allied';
}

export interface NegotiationOffer {
  offerId: string;
  fromAgent: string;
  toAgent: string;
  items: Array<{ type: string; value: number }>;
  counterOfferAllowed: boolean;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Bridge
// ---------------------------------------------------------------------------

export class AutonomousAgentBridge implements AgentProvider {
  // 1. Memory
  private memories: Map<string, AgentMemoryEntry[]> = new Map();
  private readonly MAX_MEMORIES = 200;

  // 2. Goals / GOAP
  private goals: Map<string, AgentGoal[]> = new Map();

  // 3. Behavior trees
  private behaviorTrees: Map<string, BehaviorTreeNode> = new Map();

  // 4. Emotions
  private emotions: Map<string, { emotion: string; intensity: number; decay: number }> = new Map();

  // 5. Perception
  private senses: Map<string, PerceptionSense[]> = new Map();
  private perceivedEntities: Map<string, PerceivedEntity[]> = new Map();

  // 6. Dialogue
  private dialogueTrees: Map<string, Map<string, DialogueNode>> = new Map();
  private activeDialogues: Map<string, string> = new Map(); // agentId → current nodeId

  // 7. Factions
  private factions: Map<string, FactionStanding[]> = new Map();

  // 8. Patrol
  private patrolRoutes: Map<string, Array<{ x: number; y: number; z: number }>> = new Map();
  private patrolIndices: Map<string, number> = new Map();

  // 9. LLM
  private llmContexts: Map<string, { systemPrompt: string; recentMessages: string[] }> = new Map();

  // 10. Negotiation
  private negotiations: Map<string, NegotiationOffer> = new Map();

  // Event system
  private eventListeners: Map<string, Array<(data: unknown) => void>> = new Map();

  // ---- 1. Memory (memoryHandler) ------------------------------------------

  addMemory(agentId: string, entry: AgentMemoryEntry): void {
    if (!this.memories.has(agentId)) this.memories.set(agentId, []);
    const mem = this.memories.get(agentId)!;
    mem.push(entry);

    // Prune: keep highest importance entries
    if (mem.length > this.MAX_MEMORIES) {
      mem.sort((a, b) => b.importance - a.importance);
      mem.length = this.MAX_MEMORIES;
    }
  }

  getMemories(agentId: string, type?: AgentMemoryEntry['type']): AgentMemoryEntry[] {
    const all = this.memories.get(agentId) ?? [];
    return type ? all.filter(m => m.type === type) : all;
  }

  recallRelevant(agentId: string, query: string, limit: number = 5): AgentMemoryEntry[] {
    const all = this.memories.get(agentId) ?? [];
    // Simple relevance: keyword match + recency + importance
    const lowerQuery = query.toLowerCase();
    return all
      .map(m => ({ m, score: (m.content.toLowerCase().includes(lowerQuery) ? 10 : 0) + m.importance + (1 - (Date.now() - m.timestamp) / 86400000) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(x => x.m);
  }

  // ---- 2. GOAP Planning (goalOrientedHandler) -----------------------------

  setGoals(agentId: string, goals: AgentGoal[]): void {
    this.goals.set(agentId, goals);
  }

  planActions(agentId: string, worldState: Record<string, unknown>): AgentGoal[] {
    const goals = this.goals.get(agentId) ?? [];
    if (goals.length === 0) return [];

    const sorted = [...goals].sort((a, b) => b.priority - a.priority);
    const plan: AgentGoal[] = [];
    const target = sorted[0];

    // Check preconditions; resolve sub-goals if needed
    for (const [key, value] of Object.entries(target.preconditions)) {
      if (worldState[key] !== value) {
        const provider = goals.find(g =>
          Object.entries(g.effects).some(([ek, ev]) => ek === key && ev === value),
        );
        if (provider) plan.push(provider);
      }
    }
    plan.push(target);
    return plan;
  }

  // ---- 3. Behavior Tree (behaviorTreeHandler) -----------------------------

  setBehaviorTree(agentId: string, tree: BehaviorTreeNode): void {
    this.behaviorTrees.set(agentId, tree);
  }

  getBehaviorTree(agentId: string): BehaviorTreeNode | undefined {
    return this.behaviorTrees.get(agentId);
  }

  tickBehaviorTree(agentId: string, worldState: Record<string, unknown>): BehaviorTreeStatus {
    const tree = this.behaviorTrees.get(agentId);
    if (!tree) return 'failure';
    return this.evaluateNode(tree, worldState);
  }

  private evaluateNode(node: BehaviorTreeNode, worldState: Record<string, unknown>): BehaviorTreeStatus {
    switch (node.type) {
      case 'sequence': {
        for (const child of node.children ?? []) {
          const result = this.evaluateNode(child, worldState);
          if (result !== 'success') return result;
        }
        return 'success';
      }
      case 'selector': {
        for (const child of node.children ?? []) {
          const result = this.evaluateNode(child, worldState);
          if (result !== 'failure') return result;
        }
        return 'failure';
      }
      case 'condition':
        return node.condition && worldState[node.condition] ? 'success' : 'failure';
      case 'action':
        this.emitEvent('agent:action', { action: node.action });
        return 'success';
      default:
        return 'success';
    }
  }

  // ---- 4. Emotion (emotionHandler) ----------------------------------------

  setEmotion(agentId: string, emotion: string, intensity: number, decay: number = 0.1): void {
    this.emotions.set(agentId, { emotion, intensity, decay });
    this.emitEvent('agent:emotion', { agentId, emotion, intensity });
  }

  getEmotion(agentId: string): { emotion: string; intensity: number } | undefined {
    return this.emotions.get(agentId);
  }

  updateEmotions(delta: number): void {
    for (const [agentId, state] of this.emotions.entries()) {
      state.intensity -= state.decay * delta;
      if (state.intensity <= 0) {
        state.emotion = 'neutral';
        state.intensity = 0;
      }
    }
  }

  // ---- 5. Perception (perceptionHandler) ----------------------------------

  setSenses(agentId: string, senses: PerceptionSense[]): void {
    this.senses.set(agentId, senses);
  }

  perceive(agentId: string, entities: PerceivedEntity[]): void {
    this.perceivedEntities.set(agentId, entities);
    // Store important observations in memory
    for (const e of entities) {
      if (e.distance < 5) {
        this.addMemory(agentId, {
          timestamp: Date.now(),
          type: 'observation',
          content: `Perceived ${e.entityId} at distance ${e.distance.toFixed(1)} via ${e.sense}`,
          importance: Math.max(0, 1 - e.distance / 10),
        });
      }
    }
  }

  getPerceivedEntities(agentId: string): PerceivedEntity[] {
    return this.perceivedEntities.get(agentId) ?? [];
  }

  // ---- 6. Dialogue (dialogueHandler) --------------------------------------

  setDialogueTree(agentId: string, nodes: DialogueNode[]): void {
    const nodeMap = new Map<string, DialogueNode>();
    for (const n of nodes) nodeMap.set(n.id, n);
    this.dialogueTrees.set(agentId, nodeMap);
  }

  startDialogue(agentId: string, startNodeId: string): DialogueNode | undefined {
    this.activeDialogues.set(agentId, startNodeId);
    return this.dialogueTrees.get(agentId)?.get(startNodeId);
  }

  advanceDialogue(agentId: string, choiceIndex: number): DialogueNode | undefined {
    const currentId = this.activeDialogues.get(agentId);
    const tree = this.dialogueTrees.get(agentId);
    if (!currentId || !tree) return undefined;

    const current = tree.get(currentId);
    if (!current?.choices?.[choiceIndex]) return undefined;

    const nextId = current.choices[choiceIndex].next;
    this.activeDialogues.set(agentId, nextId);

    // Store in memory
    this.addMemory(agentId, {
      timestamp: Date.now(),
      type: 'dialogue',
      content: `Dialogue: "${current.text}" → choice ${choiceIndex}`,
      importance: 0.5,
    });

    return tree.get(nextId);
  }

  endDialogue(agentId: string): void {
    this.activeDialogues.delete(agentId);
  }

  // ---- 7. Faction (factionHandler) ----------------------------------------

  setFactionStandings(agentId: string, standings: FactionStanding[]): void {
    this.factions.set(agentId, standings);
  }

  getFactionStandings(agentId: string): FactionStanding[] {
    return this.factions.get(agentId) ?? [];
  }

  adjustReputation(agentId: string, factionId: string, delta: number): void {
    const standings = this.factions.get(agentId) ?? [];
    const faction = standings.find(f => f.factionId === factionId);
    if (faction) {
      faction.reputation = Math.max(-100, Math.min(100, faction.reputation + delta));
      faction.disposition = this.reputationToDisposition(faction.reputation);
    }
  }

  private reputationToDisposition(rep: number): FactionStanding['disposition'] {
    if (rep >= 75) return 'allied';
    if (rep >= 25) return 'friendly';
    if (rep >= -25) return 'neutral';
    if (rep >= -75) return 'unfriendly';
    return 'hostile';
  }

  // ---- 8. Patrol (patrolHandler) ------------------------------------------

  setPatrolRoute(agentId: string, waypoints: Array<{ x: number; y: number; z: number }>): void {
    this.patrolRoutes.set(agentId, waypoints);
    this.patrolIndices.set(agentId, 0);
  }

  getNextWaypoint(agentId: string): { x: number; y: number; z: number } | undefined {
    const route = this.patrolRoutes.get(agentId);
    const idx = this.patrolIndices.get(agentId) ?? 0;
    if (!route || route.length === 0) return undefined;
    return route[idx % route.length];
  }

  advancePatrol(agentId: string): void {
    const route = this.patrolRoutes.get(agentId);
    if (!route) return;
    const idx = (this.patrolIndices.get(agentId) ?? 0) + 1;
    this.patrolIndices.set(agentId, idx % route.length);
  }

  // ---- 9. LLM Agent (llmAgentHandler) ------------------------------------

  setLLMContext(agentId: string, systemPrompt: string): void {
    this.llmContexts.set(agentId, { systemPrompt, recentMessages: [] });
  }

  appendLLMMessage(agentId: string, message: string): void {
    const ctx = this.llmContexts.get(agentId);
    if (!ctx) return;
    ctx.recentMessages.push(message);
    // Keep context window manageable
    if (ctx.recentMessages.length > 20) ctx.recentMessages.shift();
  }

  getLLMContext(agentId: string): { systemPrompt: string; recentMessages: string[] } | undefined {
    return this.llmContexts.get(agentId);
  }

  // ---- 10. Negotiation (negotiationHandler) --------------------------------

  submitOffer(offer: NegotiationOffer): void {
    this.negotiations.set(offer.offerId, offer);
    this.emitEvent('agent:negotiation:offer', offer);
  }

  respondToOffer(offerId: string, response: 'accept' | 'reject' | 'counter', counterOffer?: NegotiationOffer): void {
    const offer = this.negotiations.get(offerId);
    if (!offer) return;

    if (response === 'accept') {
      this.emitEvent('agent:negotiation:accepted', offer);
      this.negotiations.delete(offerId);
    } else if (response === 'reject') {
      this.emitEvent('agent:negotiation:rejected', offer);
      this.negotiations.delete(offerId);
    } else if (response === 'counter' && counterOffer && offer.counterOfferAllowed) {
      this.negotiations.set(counterOffer.offerId, counterOffer);
      this.emitEvent('agent:negotiation:counter', counterOffer);
    }
  }

  getActiveOffers(agentId: string): NegotiationOffer[] {
    return Array.from(this.negotiations.values()).filter(
      o => o.toAgent === agentId && o.expiresAt > Date.now(),
    );
  }

  // ---- Event system -------------------------------------------------------

  on(event: string, handler: (data: unknown) => void): void {
    if (!this.eventListeners.has(event)) this.eventListeners.set(event, []);
    this.eventListeners.get(event)!.push(handler);
  }

  off(event: string, handler: (data: unknown) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    }
  }

  private emitEvent(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const fn of listeners) fn(data);
    }
  }

  // ---- Stats & cleanup ---------------------------------------------------

  getStats(): {
    agentsWithMemory: number;
    agentsWithGoals: number;
    behaviorTrees: number;
    activeDialogues: number;
    agentsWithFactions: number;
    patrolRoutes: number;
    llmContexts: number;
    activeNegotiations: number;
  } {
    return {
      agentsWithMemory: this.memories.size,
      agentsWithGoals: this.goals.size,
      behaviorTrees: this.behaviorTrees.size,
      activeDialogues: this.activeDialogues.size,
      agentsWithFactions: this.factions.size,
      patrolRoutes: this.patrolRoutes.size,
      llmContexts: this.llmContexts.size,
      activeNegotiations: this.negotiations.size,
    };
  }

  dispose(): void {
    this.memories.clear();
    this.goals.clear();
    this.behaviorTrees.clear();
    this.emotions.clear();
    this.senses.clear();
    this.perceivedEntities.clear();
    this.dialogueTrees.clear();
    this.activeDialogues.clear();
    this.factions.clear();
    this.patrolRoutes.clear();
    this.patrolIndices.clear();
    this.llmContexts.clear();
    this.negotiations.clear();
    this.eventListeners.clear();
  }
}

export function createAutonomousAgentBridge(): AutonomousAgentBridge {
  return new AutonomousAgentBridge();
}
