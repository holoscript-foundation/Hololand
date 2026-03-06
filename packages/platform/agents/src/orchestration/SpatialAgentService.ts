/**
 * SpatialAgentService
 *
 * Manages SpatialCognitiveAgent instances within HoloLand worlds.
 * Each spawned agent auto-registers with the platform's IAgentRegistry,
 * enabling discovery, team formation, and capability-based matching.
 *
 * Uses:
 *   @holoscript/vm-bridge — SpatialCognitiveAgent, SceneSnapshot
 *   @holoscript/uaal — UAALVirtualMachine
 *   @holoscript/holo-vm — ECSWorld
 */

import { IAgentRegistry } from './AgentRegistry.js';
import { AgentMetadata } from './types.js';

// ─── Lightweight type stubs for @holoscript packages ───────────────────────
// In production, replace with actual imports from @holoscript/vm-bridge etc.
// These stubs allow HoloLand to compile independently of the HoloScript monorepo.

export interface SpatialCognitiveAgentLike {
    perceive(): unknown;
    decide(task: string): Promise<unknown>;
    mutate(actions: AgentActionLike[]): number[];
    queueAction(action: AgentActionLike): void;
    tick(currentTimeMs: number): Promise<CognitiveTickResultLike>;
    getLastSnapshot(): unknown | null;
    getPendingActionCount(): number;
    getTickCount(): number;
}

export interface AgentActionLike {
    type: 'spawn' | 'despawn' | 'move' | 'setComponent' | 'applyTrait' | 'removeTrait';
    [key: string]: unknown;
}

export interface CognitiveTickResultLike {
    perceived: boolean;
    decided: boolean;
    actionsApplied: number;
}

export interface SpatialAgentConfig {
    /** Agent display name */
    name: string;
    /** Agent role (e.g., 'Builder', 'Guardian', 'Guide') */
    role?: string;
    /** Cognitive cycle frequency in Hz (default: 2) */
    cognitiveHz?: number;
    /** Custom capabilities beyond defaults */
    extraCapabilities?: string[];
    /** Custom tags */
    tags?: string[];
}

// ─── Default capabilities for all spatial-cognitive agents ─────────────────

const DEFAULT_CAPABILITIES = [
    'spatial-perception',
    'scene-mutation',
    'cognitive-cycle',
    '7-phase-protocol',
];

// ─── Spatial Agent Entry ───────────────────────────────────────────────────

export interface SpatialAgentEntry {
    id: string;
    metadata: AgentMetadata;
    agent: SpatialCognitiveAgentLike;
    config: SpatialAgentConfig;
    createdAt: number;
}

// ─── Service ───────────────────────────────────────────────────────────────

let nextAgentId = 1;

export class SpatialAgentService {
    private agents: Map<string, SpatialAgentEntry> = new Map();

    constructor(private registry: IAgentRegistry) {}

    /**
     * Spawn a new spatial-cognitive agent and register it with the platform.
     */
    async spawnAgent(
        agent: SpatialCognitiveAgentLike,
        config: SpatialAgentConfig,
    ): Promise<SpatialAgentEntry> {
        const id = `spatial-agent-${nextAgentId++}`;

        const metadata: AgentMetadata = {
            id,
            name: config.name,
            role: config.role ?? 'SpatialCognitive',
            capabilities: [
                ...DEFAULT_CAPABILITIES,
                ...(config.extraCapabilities ?? []),
            ],
            status: 'active',
            tags: config.tags,
        };

        const entry: SpatialAgentEntry = {
            id,
            metadata,
            agent,
            config,
            createdAt: Date.now(),
        };

        this.agents.set(id, entry);
        await this.registry.register(metadata);

        return entry;
    }

    /**
     * Despawn an agent and unregister from the platform.
     */
    async despawnAgent(agentId: string): Promise<boolean> {
        const entry = this.agents.get(agentId);
        if (!entry) return false;

        this.agents.delete(agentId);
        await this.registry.unregister(agentId);
        entry.metadata.status = 'offline';
        return true;
    }

    /**
     * Run cognitive ticks for all active agents.
     * Called each frame — agents internally throttle to their cognitiveHz.
     */
    async tickAll(currentTimeMs: number): Promise<Map<string, CognitiveTickResultLike>> {
        const results = new Map<string, CognitiveTickResultLike>();

        for (const [id, entry] of this.agents) {
            if (entry.metadata.status !== 'active') continue;

            try {
                const result = await entry.agent.tick(currentTimeMs);
                results.set(id, result);

                // Update status based on tick result
                if (result.decided) {
                    entry.metadata.status = 'busy';
                    entry.metadata.currentTask = `Tick ${entry.agent.getTickCount()}`;
                } else {
                    entry.metadata.status = 'active';
                    entry.metadata.currentTask = undefined;
                }
            } catch (err) {
                entry.metadata.status = 'idle';
                results.set(id, { perceived: false, decided: false, actionsApplied: 0 });
            }
        }

        return results;
    }

    /**
     * Get a specific agent entry.
     */
    getAgent(agentId: string): SpatialAgentEntry | undefined {
        return this.agents.get(agentId);
    }

    /**
     * List all spatial agent entries.
     */
    listAgents(): SpatialAgentEntry[] {
        return Array.from(this.agents.values());
    }

    /**
     * Get count of active agents.
     */
    get activeCount(): number {
        let count = 0;
        for (const entry of this.agents.values()) {
            if (entry.metadata.status === 'active' || entry.metadata.status === 'busy') count++;
        }
        return count;
    }
}
