/**
 * MeshDiscoveryAdapter
 *
 * Bridges @holoscript/agent-sdk's MeshDiscovery (P2P peer registry)
 * to HoloLand's IAgentDiscoveryService interface.
 *
 * This enables cross-scene agent discovery using the open-source
 * gossip protocol and mesh networking.
 */

import { IAgentDiscoveryService } from './AgentDiscoveryService.js';
import { AgentMetadata } from './types.js';

// ─── Lightweight type stubs for @holoscript/agent-sdk ──────────────────────

export interface MeshPeerLike {
    id: string;
    endpoint: string;
    capabilities: string[];
    lastSeen: number;
}

export interface MeshDiscoveryLike {
    registerPeer(peer: MeshPeerLike): void;
    removePeer(peerId: string): void;
    getPeers(): MeshPeerLike[];
    pruneStale(maxAgeMs: number): string[];
    on(event: 'peer-discovered' | 'peer-lost', handler: (peer: MeshPeerLike) => void): void;
}

// ─── Adapter ───────────────────────────────────────────────────────────────

export class MeshDiscoveryAdapter implements IAgentDiscoveryService {
    constructor(private mesh: MeshDiscoveryLike) {}

    /**
     * Convert mesh peers into platform AgentMetadata.
     */
    async discoverAgents(): Promise<AgentMetadata[]> {
        // Prune stale peers first (5 minute TTL)
        this.mesh.pruneStale(5 * 60 * 1000);

        return this.mesh.getPeers().map(peer => this.peerToMetadata(peer));
    }

    /**
     * Watch for new agents discovered via mesh gossip.
     */
    watch(callback: (agent: AgentMetadata) => void): void {
        this.mesh.on('peer-discovered', (peer) => {
            callback(this.peerToMetadata(peer));
        });
    }

    /**
     * Register a HoloLand agent as a mesh peer so other instances can discover it.
     */
    registerLocalAgent(agent: AgentMetadata, endpoint: string): void {
        this.mesh.registerPeer({
            id: agent.id,
            endpoint,
            capabilities: agent.capabilities,
            lastSeen: Date.now(),
        });
    }

    /**
     * Unregister a local agent from the mesh.
     */
    unregisterLocalAgent(agentId: string): void {
        this.mesh.removePeer(agentId);
    }

    // ── Internal ────────────────────────────────────────────────────────────

    private peerToMetadata(peer: MeshPeerLike): AgentMetadata {
        return {
            id: peer.id,
            name: `mesh-agent-${peer.id.slice(0, 8)}`,
            role: 'MeshPeer',
            capabilities: peer.capabilities,
            status: 'active',
            description: `Discovered via mesh at ${peer.endpoint}`,
            tags: ['mesh-discovered'],
        };
    }
}
