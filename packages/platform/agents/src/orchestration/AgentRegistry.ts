/**
 * Agent Registry Interface & In-Memory Implementation
 */

import { AgentMetadata } from './types.js';

export interface IAgentRegistry {
    register(agent: AgentMetadata): Promise<void>;
    unregister(agentId: string): Promise<void>;
    getAgentMetadata(agentId: string): Promise<AgentMetadata | null>;
    listAgentMetadata(): Promise<AgentMetadata[]>;
    findAgents(criteria: Partial<AgentMetadata>): Promise<AgentMetadata[]>;
    findAgentsByCapability(capability: string): Promise<AgentMetadata[]>;
}

export class InMemoryAgentRegistry implements IAgentRegistry {
    private agents: Map<string, AgentMetadata> = new Map();

    async register(agent: AgentMetadata): Promise<void> {
        this.agents.set(agent.id, agent);
    }

    async unregister(agentId: string): Promise<void> {
        this.agents.delete(agentId);
    }

    async getAgentMetadata(agentId: string): Promise<AgentMetadata | null> {
        return this.agents.get(agentId) || null;
    }

    async listAgentMetadata(): Promise<AgentMetadata[]> {
        return Array.from(this.agents.values());
    }

    async findAgents(criteria: Partial<AgentMetadata>): Promise<AgentMetadata[]> {
        return Array.from(this.agents.values()).filter(agent => {
            return Object.entries(criteria).every(([key, value]) => {
                return (agent as any)[key] === value;
            });
        });
    }

    async findAgentsByCapability(capability: string): Promise<AgentMetadata[]> {
        return Array.from(this.agents.values()).filter(agent => 
            agent.capabilities.some(c => c.toLowerCase() === capability.toLowerCase())
        );
    }
}
