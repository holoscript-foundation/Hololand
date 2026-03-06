/**
 * @hololand/dashboard GRPODashboard
 *
 * VR dashboard for visualizing Group Relative Policy Optimization (GRPO)
 * training metrics. Integrates reward curves and KL divergence graphs into
 * a unified training monitor with real-time updates, alert management,
 * and training health assessment.
 */

import { RewardCurveChart, type RewardCurveSnapshot } from './RewardCurveChart';
import { KLDivergenceGraph, type KLSnapshot, type KLAlert } from './KLDivergenceGraph';

export interface TrainingStep {
  step: number;
  rewards: Record<string, number>;
  klDivergence: number;
  reverseKL?: number;
  loss: number;
  learningRate: number;
  timestamp: number;
}

export interface TrainingHealth {
  status: 'healthy' | 'warning' | 'critical';
  rewardTrend: 'improving' | 'plateaued' | 'declining';
  klStatus: 'within-budget' | 'over-budget';
  criticalAlerts: number;
  warningAlerts: number;
  recommendation: string;
}

export interface DashboardSnapshot {
  trainingStep: number;
  totalSteps: number;
  health: TrainingHealth;
  rewardSnapshots: RewardCurveSnapshot[];
  klSnapshot: KLSnapshot;
  lossHistory: Array<{ step: number; loss: number }>;
  lrHistory: Array<{ step: number; lr: number }>;
}

export class GRPODashboard {
  private rewardChart: RewardCurveChart;
  private klGraph: KLDivergenceGraph;
  private lossHistory: Array<{ step: number; loss: number }> = [];
  private lrHistory: Array<{ step: number; lr: number }> = [];
  private currentStep: number = 0;
  private totalSteps: number;
  private maxHistorySize: number;
  private onAlertCallbacks: Array<(alert: KLAlert) => void> = [];

  constructor(
    totalSteps: number = 10_000,
    klBudget: number = 0.2,
    rewardWindowSize: number = 50,
    maxHistorySize: number = 10_000,
  ) {
    this.totalSteps = totalSteps;
    this.maxHistorySize = maxHistorySize;
    this.rewardChart = new RewardCurveChart(rewardWindowSize, maxHistorySize);
    this.klGraph = new KLDivergenceGraph(klBudget, klBudget * 0.75, klBudget * 1.25, maxHistorySize);
  }

  /** Record a training step with all metrics */
  recordStep(step: TrainingStep): void {
    this.currentStep = step.step;

    // Record rewards per group
    for (const [groupId, reward] of Object.entries(step.rewards)) {
      this.rewardChart.addPoint(step.step, reward, groupId);
    }

    // Record KL divergence
    const prevAlertCount = this.klGraph.getAlerts().length;
    this.klGraph.addPoint(step.step, step.klDivergence, step.reverseKL);

    // Check for new alerts
    const newAlerts = this.klGraph.getAlerts().slice(prevAlertCount);
    for (const alert of newAlerts) {
      for (const cb of this.onAlertCallbacks) {
        cb(alert);
      }
    }

    // Record loss
    this.lossHistory.push({ step: step.step, loss: step.loss });
    if (this.lossHistory.length > this.maxHistorySize) {
      this.lossHistory.shift();
    }

    // Record learning rate
    this.lrHistory.push({ step: step.step, lr: step.learningRate });
    if (this.lrHistory.length > this.maxHistorySize) {
      this.lrHistory.shift();
    }
  }

  /** Record multiple training steps at once */
  recordBatch(steps: TrainingStep[]): void {
    for (const step of steps) {
      this.recordStep(step);
    }
  }

  /** Assess overall training health */
  getTrainingHealth(): TrainingHealth {
    const rewardSnapshots = this.rewardChart.getAllSnapshots();
    const klSnapshot = this.klGraph.getSnapshot();
    const criticalAlerts = this.klGraph.getCriticalAlerts().length;
    const warningAlerts = this.klGraph.getWarningAlerts().length;

    // Determine reward trend (use first group if available)
    let rewardTrend: 'improving' | 'plateaued' | 'declining' = 'plateaued';
    if (rewardSnapshots.length > 0) {
      rewardTrend = rewardSnapshots[0].trend;
    }

    const klStatus = klSnapshot.withinBudget ? 'within-budget' : 'over-budget';

    // Determine overall health
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let recommendation = 'Training is progressing normally.';

    if (criticalAlerts > 0 || (rewardTrend === 'declining' && !klSnapshot.withinBudget)) {
      status = 'critical';
      recommendation = 'Training is unstable. Consider reducing learning rate or increasing KL penalty coefficient.';
    } else if (warningAlerts > 0 || rewardTrend === 'declining' || !klSnapshot.withinBudget) {
      status = 'warning';
      if (rewardTrend === 'declining') {
        recommendation = 'Reward is declining. Consider adjusting reward shaping or checking for reward hacking.';
      } else if (!klSnapshot.withinBudget) {
        recommendation = 'KL divergence exceeds budget. Consider increasing KL penalty coefficient.';
      } else {
        recommendation = 'Minor warnings detected. Monitor closely.';
      }
    } else if (rewardTrend === 'plateaued' && this.currentStep > this.totalSteps * 0.5) {
      status = 'warning';
      recommendation = 'Reward plateaued past 50% of training. Consider adjusting learning rate or reward function.';
    }

    return {
      status,
      rewardTrend,
      klStatus,
      criticalAlerts,
      warningAlerts,
      recommendation,
    };
  }

  /** Get full dashboard snapshot for VR rendering */
  getSnapshot(): DashboardSnapshot {
    return {
      trainingStep: this.currentStep,
      totalSteps: this.totalSteps,
      health: this.getTrainingHealth(),
      rewardSnapshots: this.rewardChart.getAllSnapshots(),
      klSnapshot: this.klGraph.getSnapshot(),
      lossHistory: [...this.lossHistory],
      lrHistory: [...this.lrHistory],
    };
  }

  /** Get training progress as percentage */
  getProgress(): number {
    return Math.min(1, this.currentStep / this.totalSteps);
  }

  /** Get estimated time remaining based on step rate */
  getEstimatedTimeRemainingMs(): number | null {
    if (this.lossHistory.length < 2) return null;
    const first = this.lossHistory[0];
    const last = this.lossHistory[this.lossHistory.length - 1];
    const stepsCompleted = last.step - first.step;
    if (stepsCompleted <= 0) return null;

    const timePerStep = (Date.now() - (this.lossHistory[0] as { step: number; loss: number } & { _ts?: number })._ts ?? 0);
    // Use loss history timestamps for estimation
    const stepsDone = this.currentStep;
    const stepsRemaining = this.totalSteps - stepsDone;
    if (stepsRemaining <= 0) return 0;

    // Rough estimate: average time between recorded steps
    const avgInterval = this.lossHistory.length > 1
      ? (this.lrHistory.length * 100) // placeholder; real impl would use actual timestamps
      : 1000;

    return stepsRemaining * avgInterval;
  }

  /** Register callback for KL alerts */
  onAlert(callback: (alert: KLAlert) => void): void {
    this.onAlertCallbacks.push(callback);
  }

  /** Get KL coefficient suggestion */
  getKLCoefficientSuggestion(): { suggestion: string; reason: string } {
    const result = this.klGraph.suggestKLCoefficient();
    return { suggestion: result.suggestion, reason: result.reason };
  }

  getRewardChart(): RewardCurveChart {
    return this.rewardChart;
  }

  getKLGraph(): KLDivergenceGraph {
    return this.klGraph;
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  getTotalSteps(): number {
    return this.totalSteps;
  }

  getLossHistory(): Array<{ step: number; loss: number }> {
    return [...this.lossHistory];
  }

  getLearningRateHistory(): Array<{ step: number; lr: number }> {
    return [...this.lrHistory];
  }
}
