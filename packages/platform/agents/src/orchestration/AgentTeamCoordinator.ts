/**
 * Agent Team Coordinator
 * 
 * Manages the formation and lifecycle of agent teams for complex tasks.
 */

import { IAgentRegistry } from './AgentRegistry.js';
import { AgentTeam, AgentMetadata } from './types.js';
import { logger } from '../../../logger/dist/index.js';
import { v4 as uuidv4 } from 'uuid';

export class AgentTeamCoordinator {
    private teams: Map<string, AgentTeam> = new Map();

    constructor(private registry: IAgentRegistry) {}

    /**
     * Create a new team with a specific goal
     */
    async createTeam(name: string, goal: string, leaderId: string): Promise<AgentTeam> {
        const team: AgentTeam = {
            id: uuidv4(),
            name,
            goal,
            leaderId,
            members: [leaderId],
            status: 'forming',
            createdAt: Date.now()
        };
        
        this.teams.set(team.id, team);
        logger.info(`[TeamCoordinator] Created team: ${name} (${team.id})`);
        return team;
    }

    /**
     * Recruit agents to a team based on required capabilities
     */
    async recruitAgents(teamId: string, requiredCapabilities: string[]): Promise<AgentMetadata[]> {
        const team = this.teams.get(teamId);
        if (!team) throw new Error(`Team ${teamId} not found`);

        const recruited: AgentMetadata[] = [];
        
        for (const cap of requiredCapabilities) {
            const candidates = await this.registry.findAgentsByCapability(cap);
            const available = candidates.find(c => c.status === 'active' && !team.members.includes(c.id));
            
            if (available) {
                team.members.push(available.id);
                recruited.push(available);
                logger.info(`[TeamCoordinator] Recruited ${available.name} to team ${team.name} for capability: ${cap}`);
            } else {
                logger.warn(`[TeamCoordinator] Could not find available agent for capability: ${cap}`);
            }
        }

        if (team.members.length > 1) {
            team.status = 'working';
        }

        return recruited;
    }

    /**
     * Dissolve a team
     */
    async dissolveTeam(teamId: string): Promise<void> {
        if (this.teams.has(teamId)) {
            this.teams.delete(teamId);
            logger.info(`[TeamCoordinator] Dissolved team: ${teamId}`);
        }
    }

    /**
     * Get a team by ID
     */
    getTeam(teamId: string): AgentTeam | undefined {
        return this.teams.get(teamId);
    }

    /**
     * List all active teams
     */
    listTeams(): AgentTeam[] {
        return Array.from(this.teams.values());
    }
}
