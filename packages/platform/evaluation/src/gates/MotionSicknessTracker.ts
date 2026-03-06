/**
 * @hololand/evaluation MotionSicknessTracker
 *
 * Tracks factors that contribute to VR motion sickness.
 */

export interface MotionSicknessFactors { frameDropRate: number; rotationVelocityDegS: number; artificialLocomotion: boolean; fovReduction: number; }
export interface SicknessAssessment { riskLevel: 'low' | 'moderate' | 'high' | 'critical'; score: number; recommendations: string[]; }

export class MotionSicknessTracker {
  private readings: MotionSicknessFactors[] = [];
  private maxReadings: number = 300;

  record(factors: MotionSicknessFactors): SicknessAssessment {
    this.readings.push(factors);
    if (this.readings.length > this.maxReadings) this.readings.shift();

    let score = 0;
    score += factors.frameDropRate * 3;
    score += Math.min(1, factors.rotationVelocityDegS / 180) * 2;
    score += factors.artificialLocomotion ? 1.5 : 0;
    score -= factors.fovReduction * 0.5;
    score = Math.max(0, Math.min(10, score));

    const recommendations: string[] = [];
    if (factors.frameDropRate > 0.05) recommendations.push('Reduce scene complexity to avoid frame drops');
    if (factors.rotationVelocityDegS > 90) recommendations.push('Limit rotation speed');
    if (factors.artificialLocomotion) recommendations.push('Consider teleportation instead');

    const riskLevel: SicknessAssessment['riskLevel'] = score < 2 ? 'low' : score < 4 ? 'moderate' : score < 7 ? 'high' : 'critical';
    return { riskLevel, score, recommendations };
  }

  getAverageScore(): number {
    if (this.readings.length === 0) return 0;
    return this.readings.reduce((sum, r) => {
      let s = r.frameDropRate * 3 + Math.min(1, r.rotationVelocityDegS / 180) * 2;
      s += r.artificialLocomotion ? 1.5 : 0;
      return sum + Math.max(0, Math.min(10, s));
    }, 0) / this.readings.length;
  }
}
