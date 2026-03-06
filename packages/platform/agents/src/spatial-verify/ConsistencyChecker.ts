/**
 * @hololand/agents ConsistencyChecker
 *
 * Checks spatial consistency across multiple agents.
 */

export interface ConsistencyReport {
  consistent: boolean;
  collisions: Array<{ agentA: string; agentB: string; distance: number }>;
  outliers: Array<{ agentId: string; reason: string }>;
  totalChecks: number;
}

export class ConsistencyChecker {
  private collisionRadius: number;

  constructor(collisionRadius: number = 1) { this.collisionRadius = collisionRadius; }

  check(claims: Array<{ agentId: string; entityId: string; position: { x: number; y: number; z: number }; timestamp: number }>): ConsistencyReport {
    const collisions: ConsistencyReport['collisions'] = [];
    const outliers: ConsistencyReport['outliers'] = [];
    let totalChecks = 0;

    // Pairwise collision check
    for (let i = 0; i < claims.length; i++) {
      for (let j = i + 1; j < claims.length; j++) {
        totalChecks++;
        const dist = this.distance(claims[i].position, claims[j].position);
        if (dist < this.collisionRadius) {
          collisions.push({ agentA: claims[i].agentId, agentB: claims[j].agentId, distance: dist });
        }
      }
    }

    // Outlier detection (position > 3 std from mean)
    if (claims.length > 2) {
      const positions = claims.map((c) => c.position);
      const mean = { x: 0, y: 0, z: 0 };
      for (const p of positions) { mean.x += p.x; mean.y += p.y; mean.z += p.z; }
      mean.x /= positions.length; mean.y /= positions.length; mean.z /= positions.length;

      const distances = claims.map((c) => this.distance(c.position, mean));
      const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
      const stdDist = Math.sqrt(distances.reduce((sum, d) => sum + (d - avgDist) ** 2, 0) / distances.length);

      for (let i = 0; i < claims.length; i++) {
        if (distances[i] > avgDist + 3 * stdDist) {
          outliers.push({ agentId: claims[i].agentId, reason: `Position ${distances[i].toFixed(1)} from mean (>3 std)` });
        }
      }
    }

    return { consistent: collisions.length === 0 && outliers.length === 0, collisions, outliers, totalChecks };
  }

  private distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
  }
}
