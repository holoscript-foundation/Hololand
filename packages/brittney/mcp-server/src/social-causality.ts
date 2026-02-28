import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface SCMNode {
    id: string; // Already anonymized (e.g. NODE_1)
    type: string;
    do_capable: boolean;
}

export interface SCMEdge {
    source: string;
    target: string;
    relation: string;
    weight: number;
}

export interface SCMDAG {
    metadata: {
        model_name: string;
        generated_at: string;
        agent_id?: string;
    };
    nodes: SCMNode[];
    edges: SCMEdge[];
}

export class SocialCausalEngine {
    private agentTrustLedger: Map<string, number> = new Map();

    public getTrustScore(agentId: string): number {
        return this.agentTrustLedger.get(agentId) ?? 1.0;
    }
    
    /**
     * Iterates over a group of agent-published DAGs and mathematically merges correlation edge weights.
     * Combats subjective dataset drift by requiring > 50% agent consensus to forge a valid structural node natively.
     * Now protected by Byzantine Standard Deviation filters.
     */
    public mergeSocialModels(dags: SCMDAG[]): SCMDAG {
         if (dags.length === 0) throw new Error("No DAGs provided for social merging.");
         if (dags.length === 1) return dags[0];

         // 1. Pre-filter Byzantine Authors (Trust < 0.3)
         const safeDags = dags.filter(dag => {
             const trust = dag.metadata.agent_id ? this.getTrustScore(dag.metadata.agent_id) : 1.0;
             return trust >= 0.3;
         });
         
         if (safeDags.length === 0) throw new Error("All provided DAGs were rejected by the Byzantine Trust Ledger.");

         const agentCount = safeDags.length;
         
         // 1. Map all generic node IDs by exact string match
         // (Because we use deterministic hashing or semantic exact mapping in the cluster)
         const consolidatedNodes = new Map<string, SCMNode & { observationCount: number }>();
         
         const edgeMap = new Map<string, SCMEdge & { observationCount: number, cumulativeWeight: number }>();

         for (const dag of safeDags) {
             // Map unique nodes
             for (const node of dag.nodes) {
                 if (!consolidatedNodes.has(node.id)) {
                     consolidatedNodes.set(node.id, { ...node, observationCount: 1 });
                 } else {
                     consolidatedNodes.get(node.id)!.observationCount++;
                 }
             }

             // Map overlapping edges natively calculating cumulative weight
             for (const edge of dag.edges) {
                 const edgeKey = `${edge.source}->${edge.target}`;
                 if (!edgeMap.has(edgeKey)) {
                     edgeMap.set(edgeKey, { ...edge, observationCount: 1, cumulativeWeight: edge.weight, weights: [{ weight: edge.weight, agentId: dag.metadata.agent_id }] });
                 } else {
                     const existing = edgeMap.get(edgeKey)!;
                     existing.observationCount++;
                     existing.cumulativeWeight += edge.weight;
                     existing.weights.push({ weight: edge.weight, agentId: dag.metadata.agent_id });
                 }
             }
         }

         // 2. Byzantine Standard Deviation Evaluation Loop
         for (const [_, edgeBlock] of edgeMap) {
             if (edgeBlock.weights && edgeBlock.weights.length > 2) { // Need at least 3 points for meaningful stdDev logic
                 const mean = edgeBlock.cumulativeWeight / edgeBlock.observationCount;
                 const variance = edgeBlock.weights.reduce((sq, n) => sq + Math.pow(n.weight - mean, 2), 0) / edgeBlock.observationCount;
                 const stdDev = Math.sqrt(variance);

                 for (const sample of edgeBlock.weights) {
                     if (sample.agentId && Math.abs(sample.weight - mean) > (1.5 * stdDev)) {
                         // Severe deviation detected. Penalize agent.
                         const currentTrust = this.getTrustScore(sample.agentId);
                         this.agentTrustLedger.set(sample.agentId, Math.max(0, currentTrust - 0.1));
                     }
                 }
             }
         }

         // 3. Resolve Consensus Thresholds
         // Heuristic: A structural node or edge must be observed by over 50% of the SWARM natively.
         const consensusThreshold = Math.floor(agentCount / 2);

         const finalNodes: SCMNode[] = [];
         for (const [_, nodeBlock] of consolidatedNodes) {
             if (nodeBlock.observationCount > consensusThreshold) {
                 // Discard tracking matrix natively formatting strictly mapping to standard interface
                 const { observationCount, ...strictNode } = nodeBlock; 
                 finalNodes.push(strictNode);
             }
         }

         const finalEdges: SCMEdge[] = [];
         for (const [_, edgeBlock] of edgeMap) {
             if (edgeBlock.observationCount > consensusThreshold) {
                 // Resolve conflicting weights averaging over the observation count locally ensuring subjective noise is silenced
                 const averagedWeight = parseFloat((edgeBlock.cumulativeWeight / edgeBlock.observationCount).toFixed(2));
                 
                 finalEdges.push({
                     source: edgeBlock.source,
                     target: edgeBlock.target,
                     relation: edgeBlock.relation,
                     weight: averagedWeight
                 });
             }
         }

         return {
             metadata: {
                 model_name: 'Social_Consensus_DAG',
                 generated_at: new Date().toISOString(),
             },
             nodes: finalNodes,
             edges: finalEdges
         };
    }
}

export const socialCausalitySchemas = {
    mergeSocialCausalModels: z.object({
        dags: z.array(z.any()).describe("An array of privacy-preserved SCMDAG JSON objects to merge dynamically.")
    })
};

const Engine = new SocialCausalEngine();

export const socialCausalityTools: Tool[] = [
    {
        name: 'merge_social_causal_models',
        description: 'Merges an array of privacy-preserved SCMDAG matrices evaluating topological node observation counts and merging conflicting edge weights by swarm-majority averages offline.',
        inputSchema: {
            type: 'object',
            properties: {
                dags: { type: 'array', items: { type: 'object' } }
            },
            required: ['dags']
        }
    }
];

export async function handleSocialCausalityTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    if (toolName === 'merge_social_causal_models') {
        const { dags } = args as { dags: SCMDAG[] };
        
        try {
            const consensusDAG = Engine.mergeSocialModels(dags);
            
            return {
                content: [{
                    type: 'text',
                    text: `Successfully resolved ${dags.length} agent graphs into 1 Unified Social Causal DAG.\nNodes Retained: ${consensusDAG.nodes.length}\nEdges Retained: ${consensusDAG.edges.length}\n\n${JSON.stringify(consensusDAG, null, 2)}`
                }]
            };
        } catch (e: any) {
            return { content: [{ type: 'text', text: `Failed to construct Social DAG: ${e.message}`}] };
        }
    }

    throw new Error(`Unknown social tool: ${toolName}`);
}
