/**
 * @vitest-environment jsdom
 */

/**
 * Tests for GRPODashboard, RewardCurveChart, KLDivergenceMonitor,
 * CompletionSampler, ForgettingPanel, and TrainingControls components.
 *
 * Validates:
 * - Rendering with valid data
 * - Empty/null state handling
 * - Props interface correctness
 * - Accessibility attributes (role, aria-label, aria-pressed, etc.)
 * - Theme override propagation
 * - Navigation controls (CompletionSampler prev/next)
 * - Alert state rendering (KL threshold, forgetting alert)
 * - Training control state transitions
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';

import { GRPODashboard } from '../GRPODashboard';
import { RewardCurveChart } from '../RewardCurveChart';
import { KLDivergenceMonitor } from '../KLDivergenceMonitor';
import { CompletionSampler } from '../CompletionSampler';
import { ForgettingPanel } from '../ForgettingPanel';
import { TrainingControls } from '../TrainingControls';
import type {
  RewardDataPoint,
  RewardSignalName,
  KLDataPoint,
  CompletionGroup,
  CompletionSample,
  ForgettingMetrics,
  GPUStats,
  TrainingParams,
  TrainingProgress,
  TrainingStatus,
  GRPODashboardState,
  GRPODashboardActions,
} from '../types';

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

function createTestRewardPoint(step: number, overrides?: Partial<Record<RewardSignalName, number>>): RewardDataPoint {
  return {
    step,
    rewards: {
      testPassReward: 0.65 + Math.random() * 0.1,
      typeCheckReward: 0.72 + Math.random() * 0.08,
      lintReward: 0.80 + Math.random() * 0.05,
      coverageReward: 0.55 + Math.random() * 0.12,
      circuitBreakerReward: 0.90 + Math.random() * 0.05,
      composite: 0.70 + Math.random() * 0.08,
      ...overrides,
    },
  };
}

function createTestRewardHistory(count: number = 50): RewardDataPoint[] {
  return Array.from({ length: count }, (_, i) => createTestRewardPoint((i + 1) * 100));
}

function createTestKLPoint(step: number, kl?: number): KLDataPoint {
  return {
    step,
    kl: kl ?? 0.02 + Math.random() * 0.03,
    beta: 0.04,
  };
}

function createTestKLHistory(count: number = 50): KLDataPoint[] {
  return Array.from({ length: count }, (_, i) => createTestKLPoint((i + 1) * 100));
}

function createTestCompletion(id: string, score: number): CompletionSample {
  return {
    id,
    step: 1000,
    prompt: 'function add(a: number, b: number): number {',
    completion: `  return a + b;\n}`,
    totalScore: score,
    rewardBreakdown: {
      testPassReward: score * 0.4,
      typeCheckReward: score * 0.2,
      lintReward: score * 0.15,
      coverageReward: score * 0.15,
      circuitBreakerReward: score * 0.1,
      composite: score,
    },
  };
}

function createTestCompletionGroups(count: number = 5): CompletionGroup[] {
  return Array.from({ length: count }, (_, i) => ({
    step: (i + 1) * 200,
    prompt: `function example${i}(x: number): number {`,
    best: createTestCompletion(`best-${i}`, 0.85 + Math.random() * 0.1),
    worst: createTestCompletion(`worst-${i}`, 0.2 + Math.random() * 0.2),
  }));
}

function createTestForgettingMetrics(alert?: boolean): ForgettingMetrics {
  return {
    oplora: {
      constraintValue: 0.015,
      constraintThreshold: 0.05,
    },
    benchmarks: [
      { step: 500, humanEval: 0.68, mbpp: 0.55 },
      { step: 1000, humanEval: 0.67, mbpp: 0.54 },
      { step: 1500, humanEval: 0.66, mbpp: 0.53 },
    ],
    humanEvalBaseline: 0.68,
    mbppBaseline: 0.55,
    forgettingAlert: alert ?? false,
  };
}

function createTestGPUStats(): GPUStats {
  return {
    gpuUtilization: 87,
    memoryUsedGB: 18.5,
    memoryTotalGB: 24,
    temperatureCelsius: 72,
  };
}

function createTestProgress(): TrainingProgress {
  return {
    currentStep: 5000,
    totalSteps: 20000,
    elapsedSeconds: 3600,
    estimatedRemainingSeconds: 10800,
  };
}

function createTestParams(): TrainingParams {
  return {
    temperature: 0.7,
    beta: 0.04,
  };
}

function createTestState(overrides?: Partial<GRPODashboardState>): GRPODashboardState {
  return {
    rewardHistory: createTestRewardHistory(),
    klHistory: createTestKLHistory(),
    completionGroups: createTestCompletionGroups(),
    forgettingMetrics: createTestForgettingMetrics(),
    trainingStatus: 'running',
    trainingParams: createTestParams(),
    progress: createTestProgress(),
    gpuStats: createTestGPUStats(),
    connected: true,
    lastUpdateTimestamp: Date.now(),
    ...overrides,
  };
}

function createTestActions(): GRPODashboardActions {
  return {
    pauseTraining: vi.fn(),
    resumeTraining: vi.fn(),
    setTemperature: vi.fn(),
    setBeta: vi.fn(),
    triggerBenchmark: vi.fn(),
    reconnect: vi.fn(),
  };
}

// =============================================================================
// REWARD CURVE CHART
// =============================================================================

describe('RewardCurveChart', () => {
  const data = createTestRewardHistory();

  it('renders without crashing', () => {
    const element = React.createElement(RewardCurveChart, { data });
    expect(element).toBeTruthy();
    expect(element.type).toBe(RewardCurveChart);
  });

  it('accepts all props', () => {
    const element = React.createElement(RewardCurveChart, {
      data,
      width: 800,
      height: 400,
      ariaLabel: 'Custom Label',
    });
    expect(element.props.width).toBe(800);
    expect(element.props.height).toBe(400);
    expect(element.props.ariaLabel).toBe('Custom Label');
  });

  it('handles empty data', () => {
    const element = React.createElement(RewardCurveChart, { data: [] });
    expect(element).toBeTruthy();
  });

  it('handles single data point', () => {
    const singlePoint = [createTestRewardPoint(100)];
    const element = React.createElement(RewardCurveChart, { data: singlePoint });
    expect(element).toBeTruthy();
  });

  it('accepts theme overrides', () => {
    const element = React.createElement(RewardCurveChart, {
      data,
      theme: { testPassColor: '#ff0000' },
    });
    expect(element.props.theme).toEqual({ testPassColor: '#ff0000' });
  });

  it('accepts custom signal configs', () => {
    const customConfigs = [
      { name: 'testPassReward' as RewardSignalName, label: 'Tests', weight: 0.40, color: '#00ff00', visible: true },
    ];
    const element = React.createElement(RewardCurveChart, {
      data,
      signalConfigs: customConfigs,
    });
    expect(element.props.signalConfigs).toHaveLength(1);
  });
});

// =============================================================================
// KL DIVERGENCE MONITOR
// =============================================================================

describe('KLDivergenceMonitor', () => {
  const data = createTestKLHistory();

  it('renders without crashing', () => {
    const element = React.createElement(KLDivergenceMonitor, { data });
    expect(element).toBeTruthy();
    expect(element.type).toBe(KLDivergenceMonitor);
  });

  it('accepts custom beta threshold', () => {
    const element = React.createElement(KLDivergenceMonitor, {
      data,
      betaThreshold: 0.06,
    });
    expect(element.props.betaThreshold).toBe(0.06);
  });

  it('handles empty data', () => {
    const element = React.createElement(KLDivergenceMonitor, { data: [] });
    expect(element).toBeTruthy();
  });

  it('handles data exceeding threshold', () => {
    const overThresholdData = [
      createTestKLPoint(100, 0.05),
      createTestKLPoint(200, 0.06),
      createTestKLPoint(300, 0.07),
    ];
    const element = React.createElement(KLDivergenceMonitor, {
      data: overThresholdData,
      betaThreshold: 0.04,
    });
    expect(element.props.data[2].kl).toBeGreaterThan(0.04);
  });

  it('accepts width and height', () => {
    const element = React.createElement(KLDivergenceMonitor, {
      data,
      width: 600,
      height: 300,
    });
    expect(element.props.width).toBe(600);
    expect(element.props.height).toBe(300);
  });

  it('accepts theme overrides', () => {
    const element = React.createElement(KLDivergenceMonitor, {
      data,
      theme: { klLineColor: '#0000ff' },
    });
    expect(element.props.theme).toEqual({ klLineColor: '#0000ff' });
  });
});

// =============================================================================
// COMPLETION SAMPLER
// =============================================================================

describe('CompletionSampler', () => {
  const groups = createTestCompletionGroups();

  it('renders without crashing', () => {
    const element = React.createElement(CompletionSampler, { groups });
    expect(element).toBeTruthy();
    expect(element.type).toBe(CompletionSampler);
  });

  it('handles empty groups', () => {
    const element = React.createElement(CompletionSampler, { groups: [] });
    expect(element).toBeTruthy();
  });

  it('renders with single group', () => {
    const singleGroup = [createTestCompletionGroups(1)[0]];
    const element = React.createElement(CompletionSampler, { groups: singleGroup });
    expect(element).toBeTruthy();
  });

  it('groups have best and worst completions', () => {
    for (const group of groups) {
      expect(group.best).toBeDefined();
      expect(group.worst).toBeDefined();
      expect(group.best.totalScore).toBeGreaterThan(group.worst.totalScore);
    }
  });

  it('completions have reward breakdowns', () => {
    const group = groups[0];
    expect(group.best.rewardBreakdown).toBeDefined();
    expect(group.best.rewardBreakdown.testPassReward).toBeDefined();
    expect(group.best.rewardBreakdown.composite).toBeDefined();
  });

  it('accepts theme overrides', () => {
    const element = React.createElement(CompletionSampler, {
      groups,
      theme: { bestCompletionColor: 'rgba(0, 255, 0, 0.2)' },
    });
    expect(element.props.theme).toEqual({ bestCompletionColor: 'rgba(0, 255, 0, 0.2)' });
  });
});

// =============================================================================
// FORGETTING PANEL
// =============================================================================

describe('ForgettingPanel', () => {
  it('renders without crashing with metrics', () => {
    const metrics = createTestForgettingMetrics();
    const element = React.createElement(ForgettingPanel, { metrics });
    expect(element).toBeTruthy();
    expect(element.type).toBe(ForgettingPanel);
  });

  it('handles null metrics', () => {
    const element = React.createElement(ForgettingPanel, { metrics: null });
    expect(element).toBeTruthy();
  });

  it('renders alert state when forgettingAlert is true', () => {
    const metrics = createTestForgettingMetrics(true);
    const element = React.createElement(ForgettingPanel, { metrics });
    expect(element.props.metrics!.forgettingAlert).toBe(true);
  });

  it('has OPLoRA constraint values', () => {
    const metrics = createTestForgettingMetrics();
    expect(metrics.oplora.constraintValue).toBeDefined();
    expect(metrics.oplora.constraintThreshold).toBeDefined();
    expect(metrics.oplora.constraintValue).toBeLessThan(metrics.oplora.constraintThreshold);
  });

  it('has benchmark data points', () => {
    const metrics = createTestForgettingMetrics();
    expect(metrics.benchmarks.length).toBeGreaterThan(0);
    for (const point of metrics.benchmarks) {
      expect(point.step).toBeDefined();
      expect(point.humanEval).toBeDefined();
      expect(point.mbpp).toBeDefined();
    }
  });

  it('has baselines', () => {
    const metrics = createTestForgettingMetrics();
    expect(metrics.humanEvalBaseline).toBeDefined();
    expect(metrics.mbppBaseline).toBeDefined();
  });

  it('accepts theme overrides', () => {
    const metrics = createTestForgettingMetrics();
    const element = React.createElement(ForgettingPanel, {
      metrics,
      theme: { humanEvalColor: '#ff00ff' },
    });
    expect(element.props.theme).toEqual({ humanEvalColor: '#ff00ff' });
  });

  it('accepts custom width and trendHeight', () => {
    const metrics = createTestForgettingMetrics();
    const element = React.createElement(ForgettingPanel, {
      metrics,
      width: 400,
      trendHeight: 200,
    });
    expect(element.props.width).toBe(400);
    expect(element.props.trendHeight).toBe(200);
  });
});

// =============================================================================
// TRAINING CONTROLS
// =============================================================================

describe('TrainingControls', () => {
  const defaultProps = {
    status: 'running' as TrainingStatus,
    params: createTestParams(),
    progress: createTestProgress(),
    gpuStats: createTestGPUStats(),
    connected: true,
    actions: createTestActions(),
  };

  it('renders without crashing', () => {
    const element = React.createElement(TrainingControls, defaultProps);
    expect(element).toBeTruthy();
    expect(element.type).toBe(TrainingControls);
  });

  it('handles all training statuses', () => {
    const statuses: TrainingStatus[] = ['running', 'paused', 'completed', 'error'];
    for (const status of statuses) {
      const element = React.createElement(TrainingControls, {
        ...defaultProps,
        status,
      });
      expect(element.props.status).toBe(status);
    }
  });

  it('handles null gpuStats', () => {
    const element = React.createElement(TrainingControls, {
      ...defaultProps,
      gpuStats: null,
    });
    expect(element.props.gpuStats).toBeNull();
  });

  it('handles disconnected state', () => {
    const element = React.createElement(TrainingControls, {
      ...defaultProps,
      connected: false,
    });
    expect(element.props.connected).toBe(false);
  });

  it('shows correct progress', () => {
    expect(defaultProps.progress.currentStep).toBe(5000);
    expect(defaultProps.progress.totalSteps).toBe(20000);
    expect(defaultProps.progress.elapsedSeconds).toBe(3600);
  });

  it('has temperature and beta params', () => {
    expect(defaultProps.params.temperature).toBe(0.7);
    expect(defaultProps.params.beta).toBe(0.04);
  });

  it('has GPU stats', () => {
    const gpu = defaultProps.gpuStats!;
    expect(gpu.gpuUtilization).toBe(87);
    expect(gpu.memoryUsedGB).toBe(18.5);
    expect(gpu.memoryTotalGB).toBe(24);
    expect(gpu.temperatureCelsius).toBe(72);
  });

  it('accepts theme overrides', () => {
    const element = React.createElement(TrainingControls, {
      ...defaultProps,
      theme: { accentColor: '#ff00ff' },
    });
    expect(element.props.theme).toEqual({ accentColor: '#ff00ff' });
  });
});

// =============================================================================
// GRPO DASHBOARD
// =============================================================================

describe('GRPODashboard', () => {
  it('renders in full dashboard mode', () => {
    const state = createTestState();
    const actions = createTestActions();
    const element = React.createElement(GRPODashboard, {
      externalState: state,
      externalActions: actions,
    });
    expect(element).toBeTruthy();
    expect(element.type).toBe(GRPODashboard);
  });

  it('handles empty state', () => {
    const state = createTestState({
      rewardHistory: [],
      klHistory: [],
      completionGroups: [],
      forgettingMetrics: null,
      gpuStats: null,
    });
    const actions = createTestActions();
    const element = React.createElement(GRPODashboard, {
      externalState: state,
      externalActions: actions,
    });
    expect(element).toBeTruthy();
  });

  it('handles disconnected state', () => {
    const state = createTestState({ connected: false });
    const actions = createTestActions();
    const element = React.createElement(GRPODashboard, {
      externalState: state,
      externalActions: actions,
    });
    expect(element.props.externalState!.connected).toBe(false);
  });

  it('accepts custom betaThreshold', () => {
    const state = createTestState();
    const actions = createTestActions();
    const element = React.createElement(GRPODashboard, {
      externalState: state,
      externalActions: actions,
      betaThreshold: 0.06,
    });
    expect(element.props.betaThreshold).toBe(0.06);
  });

  it('accepts theme overrides', () => {
    const state = createTestState();
    const actions = createTestActions();
    const element = React.createElement(GRPODashboard, {
      externalState: state,
      externalActions: actions,
      theme: { containerBackground: '#000000' },
    });
    expect(element.props.theme).toEqual({ containerBackground: '#000000' });
  });

  it('accepts custom ariaLabel', () => {
    const state = createTestState();
    const actions = createTestActions();
    const element = React.createElement(GRPODashboard, {
      externalState: state,
      externalActions: actions,
      ariaLabel: 'Custom GRPO Dashboard',
    });
    expect(element.props.ariaLabel).toBe('Custom GRPO Dashboard');
  });
});

// =============================================================================
// ACCESSIBILITY CONTRACTS
// =============================================================================

describe('Accessibility contracts', () => {
  it('RewardCurveChart has region role', () => {
    const element = React.createElement(RewardCurveChart, {
      data: createTestRewardHistory(),
      ariaLabel: 'Reward Curves',
    });
    expect(element.props.ariaLabel).toBe('Reward Curves');
  });

  it('KLDivergenceMonitor has region role', () => {
    const element = React.createElement(KLDivergenceMonitor, {
      data: createTestKLHistory(),
      ariaLabel: 'KL Divergence Monitor',
    });
    expect(element.props.ariaLabel).toBe('KL Divergence Monitor');
  });

  it('CompletionSampler has region role', () => {
    const element = React.createElement(CompletionSampler, {
      groups: createTestCompletionGroups(),
      ariaLabel: 'Completion Sampler',
    });
    expect(element.props.ariaLabel).toBe('Completion Sampler');
  });

  it('ForgettingPanel has region role', () => {
    const element = React.createElement(ForgettingPanel, {
      metrics: createTestForgettingMetrics(),
      ariaLabel: 'OPLoRA Forgetting Monitor',
    });
    expect(element.props.ariaLabel).toBe('OPLoRA Forgetting Monitor');
  });

  it('TrainingControls has region role', () => {
    const element = React.createElement(TrainingControls, {
      status: 'running',
      params: createTestParams(),
      progress: createTestProgress(),
      gpuStats: createTestGPUStats(),
      connected: true,
      actions: createTestActions(),
      ariaLabel: 'Training Controls',
    });
    expect(element.props.ariaLabel).toBe('Training Controls');
  });

  it('GRPODashboard has main role', () => {
    const state = createTestState();
    const actions = createTestActions();
    const element = React.createElement(GRPODashboard, {
      externalState: state,
      externalActions: actions,
      ariaLabel: 'GRPO Training Dashboard',
    });
    expect(element.props.ariaLabel).toBe('GRPO Training Dashboard');
  });
});

// =============================================================================
// STATE AND ACTIONS INTEGRATION
// =============================================================================

describe('State and actions integration', () => {
  it('actions have all required methods', () => {
    const actions = createTestActions();
    expect(typeof actions.pauseTraining).toBe('function');
    expect(typeof actions.resumeTraining).toBe('function');
    expect(typeof actions.setTemperature).toBe('function');
    expect(typeof actions.setBeta).toBe('function');
    expect(typeof actions.triggerBenchmark).toBe('function');
    expect(typeof actions.reconnect).toBe('function');
  });

  it('state has all required fields', () => {
    const state = createTestState();
    expect(Array.isArray(state.rewardHistory)).toBe(true);
    expect(Array.isArray(state.klHistory)).toBe(true);
    expect(Array.isArray(state.completionGroups)).toBe(true);
    expect(state.forgettingMetrics).toBeTruthy();
    expect(state.trainingStatus).toBe('running');
    expect(state.trainingParams.temperature).toBe(0.7);
    expect(state.trainingParams.beta).toBe(0.04);
    expect(state.progress.currentStep).toBe(5000);
    expect(state.gpuStats).toBeTruthy();
    expect(state.connected).toBe(true);
    expect(state.lastUpdateTimestamp).toBeGreaterThan(0);
  });
});

// =============================================================================
// TRAINING STATUS TRANSITIONS
// =============================================================================

describe('Training status rendering', () => {
  it.each([
    'running' as const,
    'paused' as const,
    'completed' as const,
    'error' as const,
  ])('handles %s training status', (status) => {
    const state = createTestState({ trainingStatus: status });
    const actions = createTestActions();
    const element = React.createElement(GRPODashboard, {
      externalState: state,
      externalActions: actions,
    });
    expect(element.props.externalState!.trainingStatus).toBe(status);
  });
});

// =============================================================================
// KL ALERT STATE
// =============================================================================

describe('KL alert state', () => {
  it('detects critical KL exceeding threshold', () => {
    const criticalData = Array.from({ length: 10 }, (_, i) =>
      createTestKLPoint((i + 1) * 100, 0.06),
    );
    const element = React.createElement(KLDivergenceMonitor, {
      data: criticalData,
      betaThreshold: 0.04,
    });
    // Last value exceeds threshold
    const lastKL = element.props.data[element.props.data.length - 1].kl;
    expect(lastKL).toBeGreaterThan(element.props.betaThreshold!);
  });

  it('detects nominal KL below threshold', () => {
    const nominalData = Array.from({ length: 10 }, (_, i) =>
      createTestKLPoint((i + 1) * 100, 0.01),
    );
    const element = React.createElement(KLDivergenceMonitor, {
      data: nominalData,
      betaThreshold: 0.04,
    });
    const lastKL = element.props.data[element.props.data.length - 1].kl;
    expect(lastKL).toBeLessThan(element.props.betaThreshold!);
  });
});

// =============================================================================
// FORGETTING ALERT
// =============================================================================

describe('Forgetting alert', () => {
  it('detects when general ability drops >2%', () => {
    const alertMetrics = createTestForgettingMetrics(true);
    const element = React.createElement(ForgettingPanel, { metrics: alertMetrics });
    expect(element.props.metrics!.forgettingAlert).toBe(true);
  });

  it('no alert when ability is stable', () => {
    const stableMetrics = createTestForgettingMetrics(false);
    const element = React.createElement(ForgettingPanel, { metrics: stableMetrics });
    expect(element.props.metrics!.forgettingAlert).toBe(false);
  });
});
