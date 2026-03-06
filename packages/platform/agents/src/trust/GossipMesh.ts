/**
 * @hololand/agents GossipMesh
 *
 * Gossip protocol mesh (fan-out 3, O(log2 n) convergence) for trust propagation.
 */

export interface TrustMessage { fromId: string; aboutId: string; trustScore: number; timestamp: number; ttl: number; }

export class GossipMesh {
  private fanOut: number;
  private peers: Map<string, Set<string>> = new Map(); // nodeId -> connected peers
  private trustScores: Map<string, Map<string, number>> = new Map(); // nodeId -> (aboutId -> score)
  private messageCount: number = 0;

  constructor(fanOut: number = 3) { this.fanOut = fanOut; }

  addNode(nodeId: string): void {
    this.peers.set(nodeId, new Set());
    this.trustScores.set(nodeId, new Map());
  }

  connect(nodeA: string, nodeB: string): void {
    this.peers.get(nodeA)?.add(nodeB);
    this.peers.get(nodeB)?.add(nodeA);
  }

  gossip(message: TrustMessage): string[] {
    if (message.ttl <= 0) return [];
    this.messageCount++;

    const nodeScores = this.trustScores.get(message.fromId);
    if (nodeScores) nodeScores.set(message.aboutId, message.trustScore);

    const peerList = Array.from(this.peers.get(message.fromId) ?? []);
    const targets = this.selectRandom(peerList, this.fanOut);

    for (const target of targets) {
      const targetScores = this.trustScores.get(target);
      if (targetScores) {
        const existing = targetScores.get(message.aboutId) ?? 0;
        targetScores.set(message.aboutId, (existing + message.trustScore) / 2);
      }
    }

    return targets;
  }

  getConvergenceRounds(nodeCount: number): number { return Math.ceil(Math.log2(nodeCount)); }
  getTrustScore(nodeId: string, aboutId: string): number { return this.trustScores.get(nodeId)?.get(aboutId) ?? 0; }
  getNodeCount(): number { return this.peers.size; }
  getMessageCount(): number { return this.messageCount; }

  private selectRandom<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}
