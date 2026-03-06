/**
 * @hololand/evaluation GateReport
 *
 * Aggregated gate report across environments.
 * Generates detailed per-metric pass/fail reports, trend tracking
 * (improving/declining), historical comparison, remediation suggestions,
 * and exportable format.
 */

import { PerformanceGates, type GateResult, type Environment } from './PerformanceGates';

export interface AggregatedReport {
  worldId: string;
  timestamp: number;
  gates: GateResult[];
  readyForProd: boolean;
  blockers: string[];
}

export type TrendDirection = 'improving' | 'stable' | 'declining';

export interface MetricDetail {
  name: string;
  value: number;
  threshold: number;
  passed: boolean;
  headroom: number;       // positive = margin, negative = over budget
  percentOfBudget: number;
}

export interface TrendEntry {
  metric: string;
  direction: TrendDirection;
  currentValue: number;
  previousValue: number;
  changePercent: number;
}

export interface RemediationSuggestion {
  metric: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion: string;
  estimatedImpact: string;
}

export interface DetailedGateReport extends AggregatedReport {
  metricDetails: MetricDetail[];
  trends: TrendEntry[];
  remediations: RemediationSuggestion[];
  overallScore: number;
  summary: string;
}

export interface ExportableReport {
  version: string;
  generatedAt: string;
  worldId: string;
  readyForProd: boolean;
  overallScore: number;
  summary: string;
  environments: Array<{
    environment: string;
    passed: boolean;
    failures: string[];
    metrics: Record<string, number>;
  }>;
  metricDetails: MetricDetail[];
  trends: TrendEntry[];
  remediations: RemediationSuggestion[];
}

export class GateReport {
  private gates: PerformanceGates;
  private history: Map<string, DetailedGateReport[]> = new Map(); // worldId -> past reports

  constructor() {
    this.gates = new PerformanceGates();
  }

  // ── Original API (preserved) ─────────────────────────────────────

  generate(
    worldId: string,
    fps: number,
    frameTimeMs: number,
    memoryMB: number,
    drawCalls: number,
  ): AggregatedReport {
    const envs: Environment[] = ['dev', 'staging', 'prod'];
    const results = envs.map((env) =>
      this.gates.evaluate(env, fps, frameTimeMs, memoryMB, drawCalls),
    );
    const prodResult = results.find((r) => r.environment === 'prod')!;

    return {
      worldId,
      timestamp: Date.now(),
      gates: results,
      readyForProd: prodResult.passed,
      blockers: prodResult.failures,
    };
  }

  // ── Detailed report generation ───────────────────────────────────

  /**
   * Generate a comprehensive detailed report with per-metric analysis,
   * trend tracking, and remediation suggestions.
   */
  generateDetailed(
    worldId: string,
    fps: number,
    frameTimeMs: number,
    memoryMB: number,
    drawCalls: number,
  ): DetailedGateReport {
    const base = this.generate(worldId, fps, frameTimeMs, memoryMB, drawCalls);
    const prodConfig = this.gates.getConfig('prod');

    // Per-metric detail for prod thresholds
    const metricDetails: MetricDetail[] = [
      {
        name: 'fps',
        value: fps,
        threshold: prodConfig.minFps,
        passed: fps >= prodConfig.minFps,
        headroom: fps - prodConfig.minFps,
        percentOfBudget: (fps / prodConfig.minFps) * 100,
      },
      {
        name: 'frameTime',
        value: frameTimeMs,
        threshold: prodConfig.maxFrameTimeMs,
        passed: frameTimeMs <= prodConfig.maxFrameTimeMs,
        headroom: prodConfig.maxFrameTimeMs - frameTimeMs,
        percentOfBudget: (frameTimeMs / prodConfig.maxFrameTimeMs) * 100,
      },
      {
        name: 'memory',
        value: memoryMB,
        threshold: prodConfig.maxMemoryMB,
        passed: memoryMB <= prodConfig.maxMemoryMB,
        headroom: prodConfig.maxMemoryMB - memoryMB,
        percentOfBudget: (memoryMB / prodConfig.maxMemoryMB) * 100,
      },
      {
        name: 'drawCalls',
        value: drawCalls,
        threshold: prodConfig.maxDrawCalls,
        passed: drawCalls <= prodConfig.maxDrawCalls,
        headroom: prodConfig.maxDrawCalls - drawCalls,
        percentOfBudget: (drawCalls / prodConfig.maxDrawCalls) * 100,
      },
    ];

    // Compute trends from history
    const trends = this.computeTrends(worldId, fps, frameTimeMs, memoryMB, drawCalls);

    // Generate remediation suggestions
    const remediations = this.generateRemediations(metricDetails, trends);

    // Overall score: weighted average of metric pass ratios
    const metricScores = metricDetails.map((m) => {
      if (m.name === 'fps') return Math.min(1, m.value / m.threshold);
      return Math.min(1, m.threshold / Math.max(0.01, m.value));
    });
    const overallScore = metricScores.reduce((a, b) => a + b, 0) / metricScores.length;

    // Summary
    const failedMetrics = metricDetails.filter((m) => !m.passed).map((m) => m.name);
    const summary = failedMetrics.length === 0
      ? `World '${worldId}' passes all production gates. Overall score: ${(overallScore * 100).toFixed(1)}%.`
      : `World '${worldId}' fails on: ${failedMetrics.join(', ')}. Overall score: ${(overallScore * 100).toFixed(1)}%. ${remediations.length} remediation(s) suggested.`;

    const report: DetailedGateReport = {
      ...base,
      metricDetails,
      trends,
      remediations,
      overallScore,
      summary,
    };

    // Store in history
    this.addToHistory(worldId, report);

    return report;
  }

  // ── Trend tracking ───────────────────────────────────────────────

  private computeTrends(
    worldId: string,
    fps: number,
    frameTimeMs: number,
    memoryMB: number,
    drawCalls: number,
  ): TrendEntry[] {
    const past = this.history.get(worldId);
    if (!past || past.length === 0) return [];

    const lastReport = past[past.length - 1];
    const prevMetrics: Record<string, number> = {};
    for (const m of lastReport.metricDetails) {
      prevMetrics[m.name] = m.value;
    }

    const currentMetrics: Record<string, number> = {
      fps,
      frameTime: frameTimeMs,
      memory: memoryMB,
      drawCalls,
    };

    const trends: TrendEntry[] = [];
    for (const [metric, current] of Object.entries(currentMetrics)) {
      const prev = prevMetrics[metric];
      if (prev === undefined) continue;

      const change = prev !== 0 ? ((current - prev) / Math.abs(prev)) * 100 : 0;
      let direction: TrendDirection;

      // For fps: higher is better. For others: lower is better.
      if (metric === 'fps') {
        direction = change > 2 ? 'improving' : change < -2 ? 'declining' : 'stable';
      } else {
        direction = change < -2 ? 'improving' : change > 2 ? 'declining' : 'stable';
      }

      trends.push({
        metric,
        direction,
        currentValue: current,
        previousValue: prev,
        changePercent: Math.round(change * 100) / 100,
      });
    }

    return trends;
  }

  // ── Remediation suggestions ──────────────────────────────────────

  private generateRemediations(
    metrics: MetricDetail[],
    trends: TrendEntry[],
  ): RemediationSuggestion[] {
    const remediations: RemediationSuggestion[] = [];

    for (const m of metrics) {
      if (m.passed) continue;

      const trend = trends.find((t) => t.metric === m.name);
      const declining = trend?.direction === 'declining';

      switch (m.name) {
        case 'fps':
          remediations.push({
            metric: 'fps',
            severity: m.value < m.threshold * 0.5 ? 'critical' : declining ? 'high' : 'medium',
            suggestion: m.value < m.threshold * 0.7
              ? 'Significant FPS deficit. Consider reducing polygon count, implementing LOD, or enabling foveated rendering.'
              : 'FPS slightly below target. Try reducing draw calls or enabling instanced rendering.',
            estimatedImpact: `Need +${Math.ceil(m.threshold - m.value)} FPS to pass`,
          });
          break;

        case 'frameTime':
          remediations.push({
            metric: 'frameTime',
            severity: m.value > m.threshold * 2 ? 'critical' : declining ? 'high' : 'medium',
            suggestion: m.value > m.threshold * 1.5
              ? 'Frame time critically over budget. Profile GPU/CPU bottlenecks. Consider async compute or reducing shader complexity.'
              : 'Frame time marginally over budget. Optimize hot path render calls.',
            estimatedImpact: `Need -${(m.value - m.threshold).toFixed(1)}ms to pass`,
          });
          break;

        case 'memory':
          remediations.push({
            metric: 'memory',
            severity: m.value > m.threshold * 1.5 ? 'critical' : 'medium',
            suggestion: 'Reduce GPU memory usage: compress textures, implement streaming, or reduce atlas sizes.',
            estimatedImpact: `Need -${Math.ceil(m.value - m.threshold)}MB to pass`,
          });
          break;

        case 'drawCalls':
          remediations.push({
            metric: 'drawCalls',
            severity: m.value > m.threshold * 2 ? 'critical' : declining ? 'high' : 'medium',
            suggestion: 'Reduce draw calls via batching, instancing, or merging static geometry. Consider GPU-driven rendering.',
            estimatedImpact: `Need -${Math.ceil(m.value - m.threshold)} draw calls to pass`,
          });
          break;
      }
    }

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    remediations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return remediations;
  }

  // ── History management ───────────────────────────────────────────

  private addToHistory(worldId: string, report: DetailedGateReport): void {
    if (!this.history.has(worldId)) {
      this.history.set(worldId, []);
    }
    const entries = this.history.get(worldId)!;
    entries.push(report);
    // Keep last 100 reports per world
    if (entries.length > 100) {
      entries.splice(0, entries.length - 100);
    }
  }

  getHistory(worldId: string): DetailedGateReport[] {
    return [...(this.history.get(worldId) ?? [])];
  }

  getHistoryLength(worldId: string): number {
    return this.history.get(worldId)?.length ?? 0;
  }

  // ── Export ───────────────────────────────────────────────────────

  /**
   * Export a detailed report to a JSON-serializable format.
   */
  exportReport(report: DetailedGateReport): ExportableReport {
    return {
      version: '1.0.0',
      generatedAt: new Date(report.timestamp).toISOString(),
      worldId: report.worldId,
      readyForProd: report.readyForProd,
      overallScore: Math.round(report.overallScore * 1000) / 1000,
      summary: report.summary,
      environments: report.gates.map((g) => ({
        environment: g.environment,
        passed: g.passed,
        failures: g.failures,
        metrics: g.metrics,
      })),
      metricDetails: report.metricDetails,
      trends: report.trends,
      remediations: report.remediations,
    };
  }

  /**
   * Export report as formatted JSON string.
   */
  exportReportJSON(report: DetailedGateReport): string {
    return JSON.stringify(this.exportReport(report), null, 2);
  }
}
