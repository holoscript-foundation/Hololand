import { describe, it, expect, vi } from 'vitest';
import { RewardCurveChart } from '../RewardCurveChart';
import { KLDivergenceGraph } from '../KLDivergenceGraph';
import { GRPODashboard } from '../GRPODashboard';

// ── RewardCurveChart ─────────────────────────────────────────────────────────

describe('RewardCurveChart', () => {
  it('adds and retrieves data points', () => {
    const chart = new RewardCurveChart();
    chart.addPoint(1, 0.5);
    chart.addPoint(2, 0.6);
    const points = chart.getPoints();
    expect(points.length).toBe(2);
    expect(points[0].reward).toBe(0.5);
    expect(points[1].step).toBe(2);
  });

  it('supports multiple groups', () => {
    const chart = new RewardCurveChart();
    chart.addPoint(1, 0.5, 'accuracy');
    chart.addPoint(1, 0.3, 'safety');
    expect(chart.getGroups()).toEqual(['accuracy', 'safety']);
    expect(chart.getPoints('accuracy').length).toBe(1);
    expect(chart.getPoints('safety').length).toBe(1);
  });

  it('computes moving average', () => {
    const chart = new RewardCurveChart(3);
    chart.addPoint(1, 0.1);
    chart.addPoint(2, 0.2);
    chart.addPoint(3, 0.3);
    chart.addPoint(4, 0.4);
    const ma = chart.computeMovingAverage();
    expect(ma.length).toBe(4);
    // Window of 3: last MA = (0.2 + 0.3 + 0.4) / 3 = 0.3
    expect(ma[3]).toBeCloseTo(0.3, 5);
  });

  it('detects improving trend', () => {
    const chart = new RewardCurveChart(5);
    for (let i = 0; i < 100; i++) {
      chart.addPoint(i, i * 0.01);
    }
    expect(chart.detectTrend()).toBe('improving');
  });

  it('detects declining trend', () => {
    const chart = new RewardCurveChart(5);
    for (let i = 0; i < 100; i++) {
      chart.addPoint(i, 1 - i * 0.01);
    }
    expect(chart.detectTrend()).toBe('declining');
  });

  it('gets full snapshot', () => {
    const chart = new RewardCurveChart();
    chart.addPoint(1, 0.5);
    chart.addPoint(2, 0.8);
    chart.addPoint(3, 0.6);
    const snap = chart.getSnapshot();
    expect(snap).not.toBeNull();
    expect(snap!.bestReward).toBe(0.8);
    expect(snap!.bestStep).toBe(2);
    expect(snap!.currentReward).toBe(0.6);
  });

  it('returns null snapshot for empty group', () => {
    const chart = new RewardCurveChart();
    expect(chart.getSnapshot('nonexistent')).toBeNull();
  });

  it('evicts oldest points when over capacity', () => {
    const chart = new RewardCurveChart(5, 3);
    chart.addPoint(1, 0.1);
    chart.addPoint(2, 0.2);
    chart.addPoint(3, 0.3);
    chart.addPoint(4, 0.4); // should evict step 1
    const points = chart.getPoints();
    expect(points.length).toBe(3);
    expect(points[0].step).toBe(2);
  });

  it('computes EMA', () => {
    const chart = new RewardCurveChart();
    chart.addPoint(1, 1.0);
    chart.addPoint(2, 1.0);
    chart.addPoint(3, 1.0);
    const ema = chart.computeEMA('default', 0.5);
    expect(ema.length).toBe(3);
    expect(ema[0]).toBe(1.0);
    expect(ema[2]).toBe(1.0); // all same value
  });

  it('adds batch of points', () => {
    const chart = new RewardCurveChart();
    chart.addBatch([
      { step: 1, reward: 0.1 },
      { step: 2, reward: 0.2, groupId: 'custom' },
    ]);
    expect(chart.getPoints('default').length).toBe(1);
    expect(chart.getPoints('custom').length).toBe(1);
  });

  it('clears data', () => {
    const chart = new RewardCurveChart();
    chart.addPoint(1, 0.5);
    chart.addPoint(1, 0.3, 'other');
    chart.clear('default');
    expect(chart.getPoints('default').length).toBe(0);
    expect(chart.getPoints('other').length).toBe(1);
    chart.clear();
    expect(chart.getTotalPoints()).toBe(0);
  });
});

// ── KLDivergenceGraph ────────────────────────────────────────────────────────

describe('KLDivergenceGraph', () => {
  it('adds and retrieves KL data points', () => {
    const graph = new KLDivergenceGraph();
    graph.addPoint(1, 0.05);
    graph.addPoint(2, 0.08);
    expect(graph.getPoints().length).toBe(2);
  });

  it('detects warning threshold breach', () => {
    const graph = new KLDivergenceGraph(0.2, 0.15, 0.25);
    graph.addPoint(1, 0.16); // above warning (0.15)
    const alerts = graph.getWarningAlerts();
    expect(alerts.length).toBe(1);
    expect(alerts[0].severity).toBe('warning');
  });

  it('detects critical threshold breach', () => {
    const graph = new KLDivergenceGraph(0.2, 0.15, 0.25);
    graph.addPoint(1, 0.30); // above critical (0.25)
    const alerts = graph.getCriticalAlerts();
    expect(alerts.length).toBe(1);
    expect(alerts[0].severity).toBe('critical');
  });

  it('checks within budget', () => {
    const graph = new KLDivergenceGraph(0.2);
    graph.addPoint(1, 0.1);
    expect(graph.isWithinBudget()).toBe(true);
    graph.addPoint(2, 0.25);
    expect(graph.isWithinBudget()).toBe(false);
  });

  it('computes statistics', () => {
    const graph = new KLDivergenceGraph();
    graph.addPoint(1, 0.1);
    graph.addPoint(2, 0.2);
    graph.addPoint(3, 0.3);
    const stats = graph.getStatistics();
    expect(stats.mean).toBeCloseTo(0.2, 5);
    expect(stats.min).toBeCloseTo(0.1, 5);
    expect(stats.max).toBeCloseTo(0.3, 5);
    expect(stats.median).toBeCloseTo(0.2, 5);
  });

  it('returns zero stats for empty graph', () => {
    const graph = new KLDivergenceGraph();
    const stats = graph.getStatistics();
    expect(stats.mean).toBe(0);
  });

  it('computes moving average', () => {
    const graph = new KLDivergenceGraph();
    graph.addPoint(1, 0.1);
    graph.addPoint(2, 0.2);
    graph.addPoint(3, 0.3);
    const ma = graph.computeMovingAverage(2);
    expect(ma.length).toBe(3);
    expect(ma[2]).toBeCloseTo(0.25, 5); // (0.2 + 0.3) / 2
  });

  it('gets full snapshot', () => {
    const graph = new KLDivergenceGraph(0.2);
    graph.addPoint(1, 0.05);
    graph.addPoint(2, 0.10);
    const snap = graph.getSnapshot();
    expect(snap.currentKL).toBe(0.10);
    expect(snap.withinBudget).toBe(true);
    expect(snap.klBudget).toBe(0.2);
  });

  it('suggests KL coefficient adjustment - increase', () => {
    const graph = new KLDivergenceGraph(0.1);
    for (let i = 0; i < 20; i++) {
      graph.addPoint(i, 0.5); // Way over budget
    }
    const suggestion = graph.suggestKLCoefficient();
    expect(suggestion.suggestion).toBe('increase');
  });

  it('suggests KL coefficient adjustment - decrease', () => {
    const graph = new KLDivergenceGraph(0.5);
    for (let i = 0; i < 20; i++) {
      graph.addPoint(i, 0.01); // Way under budget
    }
    const suggestion = graph.suggestKLCoefficient();
    expect(suggestion.suggestion).toBe('decrease');
  });

  it('suggests maintain for insufficient data', () => {
    const graph = new KLDivergenceGraph();
    graph.addPoint(1, 0.1);
    expect(graph.suggestKLCoefficient().suggestion).toBe('maintain');
  });

  it('estimates reverse KL', () => {
    const graph = new KLDivergenceGraph();
    graph.addPoint(1, 0.1);
    const point = graph.getPoints()[0];
    expect(point.reverseKL).toBeCloseTo(0.12, 5); // 0.1 * 1.2
  });

  it('adds batch', () => {
    const graph = new KLDivergenceGraph();
    graph.addBatch([
      { step: 1, klDivergence: 0.05 },
      { step: 2, klDivergence: 0.08 },
    ]);
    expect(graph.getTotalPoints()).toBe(2);
  });

  it('clears data', () => {
    const graph = new KLDivergenceGraph();
    graph.addPoint(1, 0.1);
    graph.clear();
    expect(graph.getTotalPoints()).toBe(0);
    expect(graph.getAlerts().length).toBe(0);
  });

  it('updates KL budget', () => {
    const graph = new KLDivergenceGraph(0.2);
    expect(graph.getKLBudget()).toBe(0.2);
    graph.setKLBudget(0.3);
    expect(graph.getKLBudget()).toBe(0.3);
  });
});

// ── GRPODashboard ────────────────────────────────────────────────────────────

describe('GRPODashboard', () => {
  function makeStep(step: number, reward: number = 0.5, kl: number = 0.1): {
    step: number; rewards: Record<string, number>; klDivergence: number; loss: number; learningRate: number; timestamp: number;
  } {
    return {
      step,
      rewards: { accuracy: reward, safety: reward * 0.9 },
      klDivergence: kl,
      loss: 1.0 - reward * 0.5,
      learningRate: 2e-4,
      timestamp: Date.now(),
    };
  }

  it('records training steps', () => {
    const dashboard = new GRPODashboard();
    dashboard.recordStep(makeStep(1));
    dashboard.recordStep(makeStep(2));
    expect(dashboard.getCurrentStep()).toBe(2);
  });

  it('tracks loss history', () => {
    const dashboard = new GRPODashboard();
    dashboard.recordStep(makeStep(1, 0.5));
    dashboard.recordStep(makeStep(2, 0.8));
    const loss = dashboard.getLossHistory();
    expect(loss.length).toBe(2);
    expect(loss[0].loss).toBe(0.75); // 1.0 - 0.5 * 0.5
    expect(loss[1].loss).toBe(0.6);  // 1.0 - 0.8 * 0.5
  });

  it('tracks learning rate history', () => {
    const dashboard = new GRPODashboard();
    dashboard.recordStep(makeStep(1));
    const lr = dashboard.getLearningRateHistory();
    expect(lr.length).toBe(1);
    expect(lr[0].lr).toBe(2e-4);
  });

  it('computes training progress', () => {
    const dashboard = new GRPODashboard(100);
    dashboard.recordStep(makeStep(50));
    expect(dashboard.getProgress()).toBe(0.5);
  });

  it('clamps progress at 1.0', () => {
    const dashboard = new GRPODashboard(100);
    dashboard.recordStep(makeStep(150));
    expect(dashboard.getProgress()).toBe(1);
  });

  it('assesses healthy training', () => {
    const dashboard = new GRPODashboard(1000, 0.5);
    for (let i = 0; i < 50; i++) {
      dashboard.recordStep(makeStep(i, 0.5 + i * 0.005, 0.1));
    }
    const health = dashboard.getTrainingHealth();
    expect(health.status).toBe('healthy');
    expect(health.klStatus).toBe('within-budget');
  });

  it('detects critical health when KL exceeds budget with alerts', () => {
    const dashboard = new GRPODashboard(1000, 0.1); // klBudget = 0.1
    for (let i = 0; i < 50; i++) {
      dashboard.recordStep(makeStep(i, 1 - i * 0.01, 0.5)); // KL way over budget, declining reward
    }
    const health = dashboard.getTrainingHealth();
    expect(health.status).toBe('critical');
    expect(health.criticalAlerts).toBeGreaterThan(0);
  });

  it('fires alert callbacks', () => {
    const callback = vi.fn();
    const dashboard = new GRPODashboard(1000, 0.1);
    dashboard.onAlert(callback);
    dashboard.recordStep(makeStep(1, 0.5, 0.5)); // KL way above critical threshold
    expect(callback).toHaveBeenCalled();
  });

  it('gets full dashboard snapshot', () => {
    const dashboard = new GRPODashboard(100);
    dashboard.recordStep(makeStep(1, 0.5, 0.05));
    dashboard.recordStep(makeStep(2, 0.6, 0.06));
    const snap = dashboard.getSnapshot();
    expect(snap.trainingStep).toBe(2);
    expect(snap.totalSteps).toBe(100);
    expect(snap.health).toBeDefined();
    expect(snap.rewardSnapshots.length).toBeGreaterThan(0);
    expect(snap.klSnapshot).toBeDefined();
    expect(snap.lossHistory.length).toBe(2);
    expect(snap.lrHistory.length).toBe(2);
  });

  it('records batch of steps', () => {
    const dashboard = new GRPODashboard();
    dashboard.recordBatch([makeStep(1), makeStep(2), makeStep(3)]);
    expect(dashboard.getCurrentStep()).toBe(3);
  });

  it('provides KL coefficient suggestion', () => {
    const dashboard = new GRPODashboard(1000, 0.1);
    for (let i = 0; i < 20; i++) {
      dashboard.recordStep(makeStep(i, 0.5, 0.5)); // KL way over budget
    }
    const suggestion = dashboard.getKLCoefficientSuggestion();
    expect(suggestion.suggestion).toBe('increase');
  });

  it('exposes sub-components', () => {
    const dashboard = new GRPODashboard();
    expect(dashboard.getRewardChart()).toBeInstanceOf(RewardCurveChart);
    expect(dashboard.getKLGraph()).toBeInstanceOf(KLDivergenceGraph);
    expect(dashboard.getTotalSteps()).toBeGreaterThan(0);
  });
});
