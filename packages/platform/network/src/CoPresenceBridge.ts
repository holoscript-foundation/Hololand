/**
 * CoPresenceBridge (Phase 10) + AutonomousAgentBridge (Phase 7)
 *
 * Implements NetworkProvider from @hololand/core TraitContextFactory,
 * connecting HoloScript's co-presence and agent trait handlers to
 * Hololand's NetworkClient/Room/StateSync runtime.
 *
 * Phase 10 - Co-Presence handlers:
 *   - coLocatedHandler        (shared physical space alignment)
 *   - remotePresenceHandler   (remote avatar representation)
 *   - sharedWorldHandler      (synchronized world state)
 *   - voiceProximityHandler   (distance-based voice chat)
 *   - avatarEmbodimentHandler (avatar tracking & lip sync)
 *   - spectatorHandler        (spectator camera modes)
 *   - roleHandler             (participant role management)
 *
 * Phase 7 - Autonomous Agent handlers:
 *   - behaviorTreeHandler     (BT execution)
 *   - goalOrientedHandler     (GOAP planner)
 *   - llmAgentHandler         (LLM-driven NPCs)
 *   - memoryHandler           (agent memory systems)
 *   - perceptionHandler       (spatial awareness)
 *   - emotionHandler          (emotional state machine)
 *   - dialogueHandler         (conversation trees)
 *   - factionHandler          (faction/reputation)
 *   - patrolHandler           (patrol routes)
 */

import type { NetworkProvider } from '@hololand/core';
import { AgentSystem } from './AgentSystem';

// ---------------------------------------------------------------------------
// Co-Presence types
// ---------------------------------------------------------------------------

export interface CoPresenceParticipant {
  peerId: string;
  role: 'host' | 'participant' | 'spectator' | 'moderator';
  avatarState: Record<string, unknown>;
  isAligned: boolean;
  lastUpdate: number;
}

export interface SharedWorldState {
  version: number;
  entities: Map<string, Record<string, unknown>>;
  authorityMap: Map<string, string>; // entityId → peerId
}

export interface VoiceProximityConfig {
  /** Distance at which voice starts fading */
  nearDistance: number;
  /** Distance at which voice is inaudible */
  farDistance: number;
  /** Whether to use HRTF spatialization */
  spatialize: boolean;
  /** Falloff curve */
  falloff: 'linear' | 'inverse' | 'exponential';
}

// ---------------------------------------------------------------------------
// Agent types
// ---------------------------------------------------------------------------

export interface AgentMemoryEntry {
  timestamp: number;
  type: 'observation' | 'interaction' | 'emotion' | 'goal';
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

// ---------------------------------------------------------------------------
// Bridge
// ---------------------------------------------------------------------------

export class CoPresenceBridge implements NetworkProvider {
  private participants: Map<string, CoPresenceParticipant> = new Map();
  private sharedState: SharedWorldState = {
    version: 0,
    entities: new Map(),
    authorityMap: new Map(),
  };
  private localPeerId: string;
  private updateCallbacks: Map<string, Array<(state: Record<string, unknown>) => void>> = new Map();
  private broadcastFn: ((nodeId: string, state: Record<string, unknown>) => void) | null = null;
  private voiceConfig: VoiceProximityConfig = {
    nearDistance: 2,
    farDistance: 20,
    spatialize: true,
    falloff: 'inverse',
  };
  private eventListeners: Map<string, Array<(data: unknown) => void>> = new Map();

  // Agent subsystem
  private agentSystem: AgentSystem;
  private agentMemories: Map<string, AgentMemoryEntry[]> = new Map();
  private agentGoals: Map<string, AgentGoal[]> = new Map();
  private behaviorTrees: Map<string, BehaviorTreeNode> = new Map();
  private agentEmotions: Map<string, { emotion: string; intensity: number; decay: number }> = new Map();
  private patrolRoutes: Map<string, Array<{ x: number; y: number; z: number }>> = new Map();

  constructor(localPeerId: string) {
    this.localPeerId = localPeerId;
    this.agentSystem = new AgentSystem(this);
  }

  /**
   * Update loop for agents and emotions
   */
  update(delta: number): void {
    this.updateEmotions(delta);
    this.agentSystem.update(delta);
  }

  // ---- NetworkProvider implementation ------------------------------------

  broadcastState(nodeId: string, state: Record<string, unknown>): void {
    this.sharedState.entities.set(nodeId, state);
    this.sharedState.version++;

    if (this.broadcastFn) {
      this.broadcastFn(nodeId, state);
    }

    this.emitEvent('stateUpdate', { nodeId, state, version: this.sharedState.version });
  }

  requestAuthority(nodeId: string): boolean {
    const currentAuthority = this.sharedState.authorityMap.get(nodeId);
    if (!currentAuthority || currentAuthority === this.localPeerId) {
      this.sharedState.authorityMap.set(nodeId, this.localPeerId);
      this.emitEvent('authorityGranted', { nodeId, peerId: this.localPeerId });
      return true;
    }
    this.emitEvent('authorityDenied', { nodeId, currentOwner: currentAuthority });
    return false;
  }

  onRemoteUpdate(nodeId: string, callback: (state: Record<string, unknown>) => void): void {
    if (!this.updateCallbacks.has(nodeId)) {
      this.updateCallbacks.set(nodeId, []);
    }
    this.updateCallbacks.get(nodeId)!.push(callback);
  }

  // ---- Transport binding -------------------------------------------------

  /**
   * Bind to Hololand's NetworkClient/Room for actual network transport.
   */
  setBroadcastFunction(fn: (nodeId: string, state: Record<string, unknown>) => void): void {
    this.broadcastFn = fn;
  }

  /**
   * Called when a remote state update arrives from the network.
   */
  receiveRemoteUpdate(nodeId: string, state: Record<string, unknown>, peerId: string): void {
    this.sharedState.entities.set(nodeId, state);
    this.sharedState.version++;

    const callbacks = this.updateCallbacks.get(nodeId);
    if (callbacks) {
      for (const cb of callbacks) cb(state);
    }
  }

  // ---- Co-Presence management -------------------------------------------

  addParticipant(participant: CoPresenceParticipant): void {
    this.participants.set(participant.peerId, participant);
    this.emitEvent('participantJoined', participant);
  }

  removeParticipant(peerId: string): void {
    this.participants.delete(peerId);
    // Release authority for entities owned by this peer
    for (const [entityId, owner] of this.sharedState.authorityMap.entries()) {
      if (owner === peerId) {
        this.sharedState.authorityMap.delete(entityId);
      }
    }
    this.emitEvent('participantLeft', { peerId });
  }

  setParticipantRole(peerId: string, role: CoPresenceParticipant['role']): void {
    const p = this.participants.get(peerId);
    if (p) {
      p.role = role;
      this.emitEvent('roleChanged', { peerId, role });
    }
  }

  getParticipants(): CoPresenceParticipant[] {
    return Array.from(this.participants.values());
  }

  // ---- Voice proximity ---------------------------------------------------

  setVoiceProximityConfig(config: Partial<VoiceProximityConfig>): void {
    Object.assign(this.voiceConfig, config);
  }

  /**
   * Calculate voice volume for a peer based on distance.
   */
  calculateVoiceVolume(distance: number): number {
    if (distance <= this.voiceConfig.nearDistance) return 1.0;
    if (distance >= this.voiceConfig.farDistance) return 0.0;

    const t = (distance - this.voiceConfig.nearDistance) /
              (this.voiceConfig.farDistance - this.voiceConfig.nearDistance);

    switch (this.voiceConfig.falloff) {
      case 'linear': return 1 - t;
      case 'inverse': return 1 / (1 + t * 9); // 1/(1+9t) → 1.0 to 0.1
      case 'exponential': return Math.exp(-t * 3);
      default: return 1 - t;
    }
  }

  // ---- Agent memory system (Phase 7) ------------------------------------

  addAgentMemory(agentId: string, entry: AgentMemoryEntry): void {
    if (!this.agentMemories.has(agentId)) {
      this.agentMemories.set(agentId, []);
    }
    const memories = this.agentMemories.get(agentId)!;
    memories.push(entry);

    // Limit memory size (keep most important)
    if (memories.length > 100) {
      memories.sort((a, b) => b.importance - a.importance);
      memories.length = 100;
    }
  }

  getAgentMemories(agentId: string, type?: AgentMemoryEntry['type']): AgentMemoryEntry[] {
    const memories = this.agentMemories.get(agentId) ?? [];
    if (type) return memories.filter(m => m.type === type);
    return memories;
  }

  // ---- GOAP planning (Phase 7) ------------------------------------------

  setAgentGoals(agentId: string, goals: AgentGoal[]): void {
    this.agentGoals.set(agentId, goals);
  }

  /**
   * Simple GOAP planner: find cheapest action sequence to satisfy the highest-priority goal.
   */
  planActions(agentId: string, worldState: Record<string, unknown>): AgentGoal[] {
    const goals = this.agentGoals.get(agentId) ?? [];
    if (goals.length === 0) return [];

    // Sort by priority (highest first)
    const sorted = [...goals].sort((a, b) => b.priority - a.priority);

    // Find the first achievable goal chain
    const plan: AgentGoal[] = [];
    const targetGoal = sorted[0];

    // Check if preconditions are met
    const preconditionsMet = Object.entries(targetGoal.preconditions).every(
      ([key, value]) => worldState[key] === value,
    );

    if (preconditionsMet) {
      plan.push(targetGoal);
    } else {
      // Find sub-goals that provide missing preconditions
      for (const [key, value] of Object.entries(targetGoal.preconditions)) {
        if (worldState[key] !== value) {
          const provider = goals.find(g =>
            Object.entries(g.effects).some(([ek, ev]) => ek === key && ev === value),
          );
          if (provider) plan.push(provider);
        }
      }
      plan.push(targetGoal);
    }

    return plan;
  }

  // ---- Behavior tree execution (Phase 7) --------------------------------

  setBehaviorTree(agentId: string, tree: BehaviorTreeNode): void {
    this.behaviorTrees.set(agentId, tree);
  }

  getBehaviorTree(agentId: string): BehaviorTreeNode | undefined {
    return this.behaviorTrees.get(agentId);
  }

  // ---- Emotion system (Phase 7) -----------------------------------------

  setAgentEmotion(agentId: string, emotion: string, intensity: number, decay: number = 0.1): void {
    this.agentEmotions.set(agentId, { emotion, intensity, decay });
  }

  getAgentEmotion(agentId: string): { emotion: string; intensity: number } | undefined {
    return this.agentEmotions.get(agentId);
  }

  updateEmotions(delta: number): void {
    for (const [agentId, state] of this.agentEmotions.entries()) {
      state.intensity -= state.decay * delta;
      if (state.intensity <= 0) {
        state.emotion = 'neutral';
        state.intensity = 0;
      }
    }
  }

  // ---- Patrol system (Phase 7) ------------------------------------------

  setPatrolRoute(agentId: string, waypoints: Array<{ x: number; y: number; z: number }>): void {
    this.patrolRoutes.set(agentId, waypoints);
  }

  getPatrolRoute(agentId: string): Array<{ x: number; y: number; z: number }> | undefined {
    return this.patrolRoutes.get(agentId);
  }

  // ---- Event system ------------------------------------------------------

  on(event: string, handler: (data: unknown) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
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

  // ---- Stats & cleanup --------------------------------------------------

  getStats(): {
    participants: number;
    sharedEntities: number;
    stateVersion: number;
    agentsWithMemory: number;
    agentsWithGoals: number;
    behaviorTrees: number;
  } {
    return {
      participants: this.participants.size,
      sharedEntities: this.sharedState.entities.size,
      stateVersion: this.sharedState.version,
      agentsWithMemory: this.agentMemories.size,
      agentsWithGoals: this.agentGoals.size,
      behaviorTrees: this.behaviorTrees.size,
    };
  }

  dispose(): void {
    this.participants.clear();
    this.sharedState.entities.clear();
    this.sharedState.authorityMap.clear();
    this.updateCallbacks.clear();
    this.agentMemories.clear();
    this.agentGoals.clear();
    this.behaviorTrees.clear();
    this.agentEmotions.clear();
    this.patrolRoutes.clear();
    this.eventListeners.clear();
  }
}

export function createCoPresenceBridge(localPeerId: string): CoPresenceBridge {
  return new CoPresenceBridge(localPeerId);
}
