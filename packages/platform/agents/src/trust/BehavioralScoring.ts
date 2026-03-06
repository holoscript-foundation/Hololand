/**
 * @hololand/agents BehavioralScoring
 *
 * Behavioral trust scoring for VR avatars.
 */

import { SpatialCompliance } from './SpatialCompliance';
import { PhysicsAdherence } from './PhysicsAdherence';

export interface BehavioralScore { agentId: string; overallScore: number; spatialCompliance: number; physicsAdherence: number; interactionQuality: number; timestamp: number; }

export class BehavioralScoring {
  private spatialComp: SpatialCompliance;
  private physicsAdh: PhysicsAdherence;
  private scores: Map<string, BehavioralScore[]> = new Map();

  constructor() { this.spatialComp = new SpatialCompliance(); this.physicsAdh = new PhysicsAdherence(); }

  score(agentId: string, spatialViolations: number, physicsViolations: number, interactionQuality: number): BehavioralScore {
    const spatial = this.spatialComp.evaluate(spatialViolations);
    const physics = this.physicsAdh.evaluate(physicsViolations);
    const overall = spatial * 0.35 + physics * 0.35 + interactionQuality * 0.3;

    const entry: BehavioralScore = { agentId, overallScore: overall, spatialCompliance: spatial, physicsAdherence: physics, interactionQuality, timestamp: Date.now() };
    if (!this.scores.has(agentId)) this.scores.set(agentId, []);
    this.scores.get(agentId)!.push(entry);
    return entry;
  }

  getHistory(agentId: string): BehavioralScore[] { return this.scores.get(agentId) ?? []; }
  getAverageScore(agentId: string): number {
    const history = this.scores.get(agentId) ?? [];
    if (history.length === 0) return 0;
    return history.reduce((sum, s) => sum + s.overallScore, 0) / history.length;
  }
}
