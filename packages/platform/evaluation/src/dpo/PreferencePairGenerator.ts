/**
 * @hololand/evaluation PreferencePairGenerator
 *
 * Generates preference pairs for DPO training from scored VR scenes.
 * Implements scene A vs scene B comparison, margin calculation, quality
 * feature extraction, pair validation (rejects too-similar pairs), and
 * configurable sampling strategies.
 */

export interface PreferencePair {
  chosen: { sceneId: string; score: number };
  rejected: { sceneId: string; score: number };
  marginOfPreference: number;
}

export interface SceneFeatures {
  sceneId: string;
  score: number;
  spatialCorrectness: number;
  physicsValidity: number;
  performanceEfficiency: number;
  traitQuality: number;
  comfort: number;
}

export interface DetailedPreferencePair extends PreferencePair {
  /** Feature-level comparisons showing which dimensions differ */
  featureDeltas: Record<string, number>;
  /** Primary differentiating feature */
  primaryDifferentiator: string;
  /** Confidence in the preference (0-1) */
  confidence: number;
  /** Whether this pair was validated as informative */
  isInformative: boolean;
  /** Timestamp of generation */
  timestamp: number;
}

export interface PairGeneratorConfig {
  /** Minimum score margin to accept a pair (default 0.1) */
  minMargin: number;
  /** Maximum score margin — reject if too different (not informative for DPO) */
  maxMargin: number;
  /** Minimum feature delta to be considered a meaningful differentiator */
  minFeatureDelta: number;
  /** Maximum pairs to generate per batch */
  maxPairsPerBatch: number;
  /** Sampling strategy: 'exhaustive' (all valid pairs) or 'stratified' (balanced margins) */
  samplingStrategy: 'exhaustive' | 'stratified';
  /** Number of margin strata for stratified sampling */
  strataCount: number;
}

const DEFAULT_CONFIG: PairGeneratorConfig = {
  minMargin: 0.1,
  maxMargin: 0.8,
  minFeatureDelta: 0.05,
  maxPairsPerBatch: 500,
  samplingStrategy: 'exhaustive',
  strataCount: 5,
};

export class PreferencePairGenerator {
  private pairs: PreferencePair[] = [];
  private detailedPairs: DetailedPreferencePair[] = [];
  private minMargin: number;
  private config: PairGeneratorConfig;

  constructor(minMarginOrConfig?: number | Partial<PairGeneratorConfig>) {
    if (typeof minMarginOrConfig === 'number') {
      this.config = { ...DEFAULT_CONFIG, minMargin: minMarginOrConfig };
    } else {
      this.config = { ...DEFAULT_CONFIG, ...minMarginOrConfig };
    }
    this.minMargin = this.config.minMargin;
  }

  // ── Original API (preserved) ─────────────────────────────────────

  generatePairs(scenes: Array<{ sceneId: string; score: number }>): PreferencePair[] {
    const newPairs: PreferencePair[] = [];
    const sorted = [...scenes].sort((a, b) => b.score - a.score);

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const margin = sorted[i].score - sorted[j].score;
        if (margin >= this.minMargin) {
          const pair: PreferencePair = {
            chosen: sorted[i],
            rejected: sorted[j],
            marginOfPreference: margin,
          };
          newPairs.push(pair);
          this.pairs.push(pair);
        }
      }
    }
    return newPairs;
  }

  getTotalPairs(): number {
    return this.pairs.length;
  }

  getAllPairs(): PreferencePair[] {
    return [...this.pairs];
  }

  // ── Feature-rich DPO pair generation ─────────────────────────────

  /**
   * Generate detailed preference pairs with per-feature comparison,
   * confidence scoring, and informativeness validation.
   */
  generateDetailedPairs(scenes: SceneFeatures[]): DetailedPreferencePair[] {
    const newPairs: DetailedPreferencePair[] = [];
    const sorted = [...scenes].sort((a, b) => b.score - a.score);

    for (let i = 0; i < sorted.length && newPairs.length < this.config.maxPairsPerBatch; i++) {
      for (let j = i + 1; j < sorted.length && newPairs.length < this.config.maxPairsPerBatch; j++) {
        const margin = sorted[i].score - sorted[j].score;

        // Reject pairs outside margin bounds
        if (margin < this.config.minMargin || margin > this.config.maxMargin) {
          continue;
        }

        const pair = this.buildDetailedPair(sorted[i], sorted[j], margin);

        // Validate informativeness
        if (pair.isInformative) {
          newPairs.push(pair);
          this.detailedPairs.push(pair);
          // Also add to legacy pairs for backward compat
          this.pairs.push({
            chosen: { sceneId: pair.chosen.sceneId, score: pair.chosen.score },
            rejected: { sceneId: pair.rejected.sceneId, score: pair.rejected.score },
            marginOfPreference: pair.marginOfPreference,
          });
        }
      }
    }

    // Apply stratified sampling if configured
    if (this.config.samplingStrategy === 'stratified' && newPairs.length > this.config.strataCount) {
      return this.stratifiedSample(newPairs);
    }

    return newPairs;
  }

  private buildDetailedPair(
    chosen: SceneFeatures,
    rejected: SceneFeatures,
    margin: number,
  ): DetailedPreferencePair {
    // Compute per-feature deltas
    const featureDeltas: Record<string, number> = {
      spatialCorrectness: chosen.spatialCorrectness - rejected.spatialCorrectness,
      physicsValidity: chosen.physicsValidity - rejected.physicsValidity,
      performanceEfficiency: chosen.performanceEfficiency - rejected.performanceEfficiency,
      traitQuality: chosen.traitQuality - rejected.traitQuality,
      comfort: chosen.comfort - rejected.comfort,
    };

    // Find primary differentiator (largest positive delta)
    let primaryDifferentiator = 'overall';
    let maxDelta = 0;
    for (const [feature, delta] of Object.entries(featureDeltas)) {
      if (Math.abs(delta) > maxDelta) {
        maxDelta = Math.abs(delta);
        primaryDifferentiator = feature;
      }
    }

    // Confidence: higher when margin is clear and multiple features agree
    const agreeingFeatures = Object.values(featureDeltas).filter((d) => d > this.config.minFeatureDelta).length;
    const totalFeatures = Object.keys(featureDeltas).length;
    const agreementRatio = agreeingFeatures / totalFeatures;
    const marginConfidence = Math.min(1, margin / this.config.maxMargin);
    const confidence = agreementRatio * 0.6 + marginConfidence * 0.4;

    // Informativeness check: reject pairs where no single feature differs meaningfully
    const hasSignificantDelta = Object.values(featureDeltas).some(
      (d) => Math.abs(d) >= this.config.minFeatureDelta,
    );
    const isInformative = hasSignificantDelta && margin >= this.config.minMargin;

    return {
      chosen: { sceneId: chosen.sceneId, score: chosen.score },
      rejected: { sceneId: rejected.sceneId, score: rejected.score },
      marginOfPreference: margin,
      featureDeltas,
      primaryDifferentiator,
      confidence,
      isInformative,
      timestamp: Date.now(),
    };
  }

  // ── Stratified sampling ──────────────────────────────────────────

  /**
   * Sample pairs evenly across margin strata for balanced DPO training.
   */
  private stratifiedSample(pairs: DetailedPreferencePair[]): DetailedPreferencePair[] {
    const marginRange = this.config.maxMargin - this.config.minMargin;
    const strataWidth = marginRange / this.config.strataCount;
    const strata: DetailedPreferencePair[][] = Array.from(
      { length: this.config.strataCount },
      () => [],
    );

    // Assign pairs to strata
    for (const pair of pairs) {
      const strataIdx = Math.min(
        this.config.strataCount - 1,
        Math.floor((pair.marginOfPreference - this.config.minMargin) / strataWidth),
      );
      strata[strataIdx].push(pair);
    }

    // Sample evenly from each stratum
    const perStrata = Math.ceil(this.config.maxPairsPerBatch / this.config.strataCount);
    const sampled: DetailedPreferencePair[] = [];

    for (const stratum of strata) {
      // Sort by confidence descending and take top N
      const sorted = stratum.sort((a, b) => b.confidence - a.confidence);
      sampled.push(...sorted.slice(0, perStrata));
    }

    return sampled.slice(0, this.config.maxPairsPerBatch);
  }

  // ── Statistics ───────────────────────────────────────────────────

  /**
   * Get distribution of pairs across margin ranges.
   */
  getMarginDistribution(bins: number = 10): Array<{ rangeStart: number; rangeEnd: number; count: number }> {
    const minM = this.config.minMargin;
    const maxM = this.config.maxMargin;
    const binWidth = (maxM - minM) / bins;
    const distribution: Array<{ rangeStart: number; rangeEnd: number; count: number }> = [];

    for (let i = 0; i < bins; i++) {
      const rangeStart = minM + i * binWidth;
      const rangeEnd = rangeStart + binWidth;
      const count = this.pairs.filter(
        (p) => p.marginOfPreference >= rangeStart && p.marginOfPreference < rangeEnd,
      ).length;
      distribution.push({ rangeStart: Math.round(rangeStart * 1000) / 1000, rangeEnd: Math.round(rangeEnd * 1000) / 1000, count });
    }

    return distribution;
  }

  /**
   * Get average confidence of detailed pairs.
   */
  getAverageConfidence(): number {
    if (this.detailedPairs.length === 0) return 0;
    return this.detailedPairs.reduce((sum, p) => sum + p.confidence, 0) / this.detailedPairs.length;
  }

  /**
   * Get the most common primary differentiator across all detailed pairs.
   */
  getTopDifferentiators(): Array<{ feature: string; count: number }> {
    const counts = new Map<string, number>();
    for (const pair of this.detailedPairs) {
      counts.set(pair.primaryDifferentiator, (counts.get(pair.primaryDifferentiator) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count);
  }

  getDetailedPairCount(): number {
    return this.detailedPairs.length;
  }

  reset(): void {
    this.pairs = [];
    this.detailedPairs = [];
  }
}
