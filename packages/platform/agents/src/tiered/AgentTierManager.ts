/**
 * @hololand/agents AgentTierManager
 *
 * Tiered agent architecture manager:
 * Layer 0: Perception (Sentis) - sensor processing
 * Layer 1: Reactive (MobileLLM 125M) - fast responses
 * Layer 2: Reasoning (Llama 3.2 3B Q4) - deep reasoning
 * Layer 3: Cloud Escalation - complex multi-step reasoning
 */

export enum AgentTier {
  Perception = 0,
  Reactive = 1,
  Reasoning = 2,
  CloudEscalation = 3,
}

export interface TierConfig {
  tier: AgentTier;
  name: string;
  modelId: string;
  maxLatencyMs: number;
  memoryBudgetBytes: number;
  canEscalate: boolean;
  escalationThreshold: number;
}

const DEFAULT_TIERS: Record<AgentTier, TierConfig> = {
  [AgentTier.Perception]: { tier: AgentTier.Perception, name: 'Perception (Sentis)', modelId: 'sentis-perception', maxLatencyMs: 5, memoryBudgetBytes: 50 * 1024 * 1024, canEscalate: true, escalationThreshold: 0.3 },
  [AgentTier.Reactive]: { tier: AgentTier.Reactive, name: 'Reactive (MobileLLM 125M)', modelId: 'mobilellm-125m', maxLatencyMs: 50, memoryBudgetBytes: 200 * 1024 * 1024, canEscalate: true, escalationThreshold: 0.6 },
  [AgentTier.Reasoning]: { tier: AgentTier.Reasoning, name: 'Reasoning (Llama 3.2 3B Q4)', modelId: 'llama-3.2-3b-q4', maxLatencyMs: 500, memoryBudgetBytes: 1024 * 1024 * 1024, canEscalate: true, escalationThreshold: 0.8 },
  [AgentTier.CloudEscalation]: { tier: AgentTier.CloudEscalation, name: 'Cloud Escalation', modelId: 'cloud-llm', maxLatencyMs: 5000, memoryBudgetBytes: 0, canEscalate: false, escalationThreshold: 1.0 },
};

export interface AgentState {
  agentId: string;
  currentTier: AgentTier;
  complexity: number;
  lastEscalation: number;
}

export class AgentTierManager {
  private tiers: Map<AgentTier, TierConfig> = new Map();
  private agents: Map<string, AgentState> = new Map();
  private escalationCount: number = 0;

  constructor() {
    for (const [tier, config] of Object.entries(DEFAULT_TIERS)) {
      this.tiers.set(Number(tier) as AgentTier, { ...config });
    }
  }

  registerAgent(agentId: string, initialTier: AgentTier = AgentTier.Reactive): void {
    this.agents.set(agentId, { agentId, currentTier: initialTier, complexity: 0, lastEscalation: 0 });
  }

  evaluateEscalation(agentId: string, complexity: number): AgentTier {
    const agent = this.agents.get(agentId);
    if (!agent) return AgentTier.Reactive;

    agent.complexity = complexity;

    for (let tier = AgentTier.Perception; tier <= AgentTier.CloudEscalation; tier++) {
      const config = this.tiers.get(tier)!;
      if (complexity <= config.escalationThreshold) {
        if (tier !== agent.currentTier) {
          agent.currentTier = tier;
          if (tier > agent.currentTier) this.escalationCount++;
          agent.lastEscalation = Date.now();
        }
        return tier;
      }
    }

    agent.currentTier = AgentTier.CloudEscalation;
    return AgentTier.CloudEscalation;
  }

  getTierConfig(tier: AgentTier): TierConfig { return this.tiers.get(tier)!; }
  getAgentTier(agentId: string): AgentTier { return this.agents.get(agentId)?.currentTier ?? AgentTier.Reactive; }
  getAgentCount(): number { return this.agents.size; }
  getEscalationCount(): number { return this.escalationCount; }

  removeAgent(agentId: string): void { this.agents.delete(agentId); }
}
