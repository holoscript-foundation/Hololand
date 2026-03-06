/**
 * AgentSystem (Phase 7)
 *
 * Runtime execution engine for Autonomous Agents.
 * Handles Behavior Tree ticking, GOAP planning updates, and perception loops.
 */

import type { AgentGoal, BehaviorTreeNode, CoPresenceBridge } from './CoPresenceBridge';

export class AgentSystem {
  private bridge: CoPresenceBridge;
  private runningPlans: Map<string, { plan: AgentGoal[]; currentAction: AgentGoal | null; startTime: number }> = new Map();
  private btStates: Map<string, { currentNode: BehaviorTreeNode | null; status: 'running' | 'success' | 'failure' }> = new Map();

  constructor(bridge: CoPresenceBridge) {
    this.bridge = bridge;
  }

  update(delta: number): void {
    const stats = this.bridge.getStats();
    // In a real system, we'd iterate over all "local authority" agents
    // For now, we assume bridge manages the data and we process any agent that has a BT or Goal active
    // This is a simplification; normally we'd have a list of activeAgentIds

    // 1. Update GOAP Plans
    this.updateGOAP(delta);

    // 2. Tick Behavior Trees
    this.updateBT(delta);
    
    // 3. Update Emotions (handled in bridge)
    this.bridge.updateEmotions(delta);
  }

  // ---- GOAP Execution ---------------------------------------------------

  private updateGOAP(delta: number): void {
    // Iterate potentially active agents (mock iteration for now)
    // In real impl: this.bridge.getLocalAgents().forEach(...)
  }

  startPlan(agentId: string, plan: AgentGoal[]): void {
    if (plan.length === 0) return;
    this.runningPlans.set(agentId, {
      plan,
      currentAction: plan[0],
      startTime: Date.now()
    });
    console.log(`[AgentSystem] Agent ${agentId} starting plan: ${plan.map(g => g.description).join(' -> ')}`);
  }

  // ---- BT Execution -----------------------------------------------------

  private updateBT(delta: number): void {
    // Mock iteration
  }

  tickBT(agentId: string, node: BehaviorTreeNode): 'running' | 'success' | 'failure' {
    switch (node.type) {
      case 'sequence':
        if (!node.children) return 'success';
        for (const child of node.children) {
          const status = this.tickBT(agentId, child);
          if (status === 'failure') return 'failure';
          if (status === 'running') return 'running';
        }
        return 'success';

      case 'selector':
        if (!node.children) return 'failure';
        for (const child of node.children) {
          const status = this.tickBT(agentId, child);
          if (status === 'success') return 'success';
          if (status === 'running') return 'running';
        }
        return 'failure';

      case 'action':
        // Execute action logic (would delegate to specific action handlers)
        // console.log(`[AgentSystem] Tick action ${node.name}`);
        return 'success'; // Instant success for now

      default:
        return 'success';
    }
  }
}
