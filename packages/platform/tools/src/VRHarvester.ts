/**
 * @hololand/tools VRHarvester
 *
 * Harvests VR interaction data, scene quality metrics, and agent behavior
 * traces from the HoloLand platform for self-improvement training data.
 * Supports configurable filters, quality thresholds, and output formats.
 */

export interface HarvestConfig {
  minQualityScore: number;
  maxSamples: number;
  includeAgentTraces: boolean;
  includeSceneMetrics: boolean;
  includeInteractionLogs: boolean;
  deduplicationThreshold: number;
  outputFormat: 'jsonl' | 'parquet' | 'csv';
}

export interface HarvestedSample {
  id: string;
  type: 'scene-metric' | 'agent-trace' | 'interaction-log';
  qualityScore: number;
  data: Record<string, unknown>;
  timestamp: number;
  sourceWorldId: string;
}

export interface HarvestResult {
  totalScanned: number;
  totalHarvested: number;
  duplicatesRemoved: number;
  belowThreshold: number;
  samples: HarvestedSample[];
  harvestDurationMs: number;
  qualityDistribution: { bucket: string; count: number }[];
}

const DEFAULT_CONFIG: HarvestConfig = {
  minQualityScore: 0.6,
  maxSamples: 10_000,
  includeAgentTraces: true,
  includeSceneMetrics: true,
  includeInteractionLogs: true,
  deduplicationThreshold: 0.95,
  outputFormat: 'jsonl',
};

export class VRHarvester {
  private config: HarvestConfig;
  private sources: Map<string, HarvestedSample[]> = new Map();
  private harvestHistory: HarvestResult[] = [];

  constructor(config?: Partial<HarvestConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Register a data source (world) with samples */
  registerSource(worldId: string, samples: HarvestedSample[]): void {
    this.sources.set(worldId, samples);
  }

  /** Add individual samples to a source */
  addSample(worldId: string, sample: HarvestedSample): void {
    if (!this.sources.has(worldId)) {
      this.sources.set(worldId, []);
    }
    this.sources.get(worldId)!.push(sample);
  }

  /** Run harvest across all registered sources */
  harvest(): HarvestResult {
    const startTime = Date.now();
    let totalScanned = 0;
    let belowThreshold = 0;
    let duplicatesRemoved = 0;
    const harvested: HarvestedSample[] = [];

    // Collect all eligible samples
    for (const [_worldId, samples] of this.sources) {
      for (const sample of samples) {
        totalScanned++;

        // Filter by type
        if (sample.type === 'agent-trace' && !this.config.includeAgentTraces) continue;
        if (sample.type === 'scene-metric' && !this.config.includeSceneMetrics) continue;
        if (sample.type === 'interaction-log' && !this.config.includeInteractionLogs) continue;

        // Quality threshold
        if (sample.qualityScore < this.config.minQualityScore) {
          belowThreshold++;
          continue;
        }

        harvested.push(sample);
      }
    }

    // Sort by quality descending
    harvested.sort((a, b) => b.qualityScore - a.qualityScore);

    // Deduplication via simple fingerprinting
    const deduplicated: HarvestedSample[] = [];
    const seen = new Set<string>();

    for (const sample of harvested) {
      const fingerprint = this.computeFingerprint(sample);
      if (seen.has(fingerprint)) {
        duplicatesRemoved++;
        continue;
      }
      seen.add(fingerprint);
      deduplicated.push(sample);

      if (deduplicated.length >= this.config.maxSamples) break;
    }

    // Compute quality distribution
    const qualityDistribution = this.computeQualityDistribution(deduplicated);

    const result: HarvestResult = {
      totalScanned,
      totalHarvested: deduplicated.length,
      duplicatesRemoved,
      belowThreshold,
      samples: deduplicated,
      harvestDurationMs: Date.now() - startTime,
      qualityDistribution,
    };

    this.harvestHistory.push(result);
    return result;
  }

  /** Compute a fingerprint for deduplication */
  private computeFingerprint(sample: HarvestedSample): string {
    const keys = Object.keys(sample.data).sort().join(':');
    const values = Object.values(sample.data).map(v => String(v)).join(':');
    return `${sample.type}|${sample.sourceWorldId}|${keys}|${values}`;
  }

  /** Bucket quality scores into distribution */
  private computeQualityDistribution(samples: HarvestedSample[]): { bucket: string; count: number }[] {
    const buckets = new Map<string, number>();
    const bucketNames = ['0.0-0.2', '0.2-0.4', '0.4-0.6', '0.6-0.8', '0.8-1.0'];

    for (const name of bucketNames) {
      buckets.set(name, 0);
    }

    for (const sample of samples) {
      const idx = Math.min(4, Math.floor(sample.qualityScore * 5));
      const name = bucketNames[idx];
      buckets.set(name, (buckets.get(name) ?? 0) + 1);
    }

    return [...buckets.entries()].map(([bucket, count]) => ({ bucket, count }));
  }

  /** Export harvested data in configured format */
  exportToFormat(samples: HarvestedSample[]): string {
    switch (this.config.outputFormat) {
      case 'jsonl':
        return samples.map(s => JSON.stringify(s)).join('\n');
      case 'csv': {
        const header = 'id,type,qualityScore,sourceWorldId,timestamp';
        const rows = samples.map(s =>
          `${s.id},${s.type},${s.qualityScore},${s.sourceWorldId},${s.timestamp}`
        );
        return [header, ...rows].join('\n');
      }
      case 'parquet':
        // Parquet requires binary format; return metadata placeholder
        return JSON.stringify({
          format: 'parquet',
          schema: ['id', 'type', 'qualityScore', 'data', 'timestamp', 'sourceWorldId'],
          rowCount: samples.length,
          note: 'Binary parquet output requires external library',
        });
      default:
        return samples.map(s => JSON.stringify(s)).join('\n');
    }
  }

  getConfig(): HarvestConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<HarvestConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  getSourceCount(): number {
    return this.sources.size;
  }

  getTotalSampleCount(): number {
    let total = 0;
    for (const samples of this.sources.values()) {
      total += samples.length;
    }
    return total;
  }

  getHarvestHistory(): HarvestResult[] {
    return [...this.harvestHistory];
  }

  clearSources(): void {
    this.sources.clear();
  }
}
