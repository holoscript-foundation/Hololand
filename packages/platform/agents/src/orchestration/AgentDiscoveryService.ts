/**
 * Agent Discovery Service Interface
 */

import { AgentMetadata } from './types.js';

export interface IAgentDiscoveryService {
    /**
     * Scan sources to find available agents
     */
    discoverAgents(): Promise<AgentMetadata[]>;
    
    /**
     * Watch for new agents coming online (optional)
     */
    watch?(callback: (agent: AgentMetadata) => void): void;
}
