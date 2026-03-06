/**
 * Agent Orchestration Types
 */

export interface AgentMetadata {
    id: string;
    name: string;
    role: string; // e.g., 'Analyst', 'Builder', 'Manager'
    capabilities: string[];
    status: 'active' | 'idle' | 'busy' | 'offline';
    currentTask?: string;
    description?: string;
    tags?: string[];
}

export interface AgentCapability {
    name: string;
    description: string;
    parameters?: Record<string, any>;
}

export interface AgentTeam {
    id: string;
    name: string;
    goal: string;
    leaderId: string;
    members: string[]; // Agent IDs
    status: 'forming' | 'working' | 'completed' | 'dissolved';
    createdAt: number;
}
