/**
 * @hololand/evaluation SceneScorer
 *
 * Multi-dimensional VR scene scoring for DPO training data generation.
 * Evaluates spatial correctness, physics validity, performance efficiency,
 * and trait composition quality. Each dimension returns a 0-1 sub-score.
 */

export interface SceneObject {
  id: string;
  position: { x: number; y: number; z: number };
  boundingRadius: number;
  mass: number;
  isGrounded: boolean;
  traits: string[];
}

export interface SceneMetrics {
  fps: number;
  splatCount: number;
  interactionLatencyMs: number;
  comfortScore: number;
  drawCalls: number;
  polygonCount: number;
  gpuMemoryMB: number;
}

export interface TraitRule {
  /** Trait combinations that are valid together */
  validCombinations: string[][];
  /** Trait combinations that are incompatible */
  incompatible: [string, string][];
  /** Required traits that must always be present */
  required: string[];
}

export interface SceneScoreResult {
  overall: number;
  spatial_correctness: number;
  physics_validity: number;
  performance_efficiency: number;
  trait_composition_quality: number;
  /** Legacy dimensions preserved */
  visual_fidelity: number;
  interactivity: number;
  comfort: number;
  details: {
    overlappingPairs: number;
    floatingObjects: number;
    drawCallBudgetUsage: number;
    polygonBudgetUsage: number;
    traitViolations: number;
  };
}

export class SceneScorer {
  private polygonBudget: number;
  private drawCallBudget: number;
  private gpuMemoryBudgetMB: number;
  private traitRules: TraitRule;

  constructor(config?: {
    polygonBudget?: number;
    drawCallBudget?: number;
    gpuMemoryBudgetMB?: number;
    traitRules?: TraitRule;
  }) {
    this.polygonBudget = config?.polygonBudget ?? 2_000_000;
    this.drawCallBudget = config?.drawCallBudget ?? 200;
    this.gpuMemoryBudgetMB = config?.gpuMemoryBudgetMB ?? 3000;
    this.traitRules = config?.traitRules ?? {
      validCombinations: [],
      incompatible: [],
      required: [],
    };
  }

  // ── Legacy score method (preserved) ──────────────────────────────

  score(
    fps: number,
    splatCount: number,
    interactionLatencyMs: number,
    comfortScore: number,
  ): Record<string, number> {
    return {
      'Visual Fidelity': Math.min(1, splatCount / 100_000),
      'Spatial Coherence': 0.8,
      'Interactivity': Math.max(0, 1 - interactionLatencyMs / 200),
      'Performance': Math.min(1, fps / 90),
      'Comfort': comfortScore,
      'Creativity': 0.7,
    };
  }

  // ── Full multi-dimensional scoring ───────────────────────────────

  /**
   * Score a complete VR scene across all dimensions.
   */
  scoreScene(objects: SceneObject[], metrics: SceneMetrics): SceneScoreResult {
    const spatial = this.scoreSpatialCorrectness(objects);
    const physics = this.scorePhysicsValidity(objects);
    const performance = this.scorePerformanceEfficiency(metrics);
    const traits = this.scoreTraitComposition(objects);

    // Legacy sub-scores
    const visualFidelity = Math.min(1, metrics.splatCount / 100_000);
    const interactivity = Math.max(0, 1 - metrics.interactionLatencyMs / 200);
    const comfort = metrics.comfortScore;

    // Weighted overall (performance and spatial most critical for VR)
    const overall =
      spatial.score * 0.25 +
      physics.score * 0.20 +
      performance.score * 0.30 +
      traits.score * 0.10 +
      visualFidelity * 0.05 +
      interactivity * 0.05 +
      comfort * 0.05;

    return {
      overall: Math.max(0, Math.min(1, overall)),
      spatial_correctness: spatial.score,
      physics_validity: physics.score,
      performance_efficiency: performance.score,
      trait_composition_quality: traits.score,
      visual_fidelity: visualFidelity,
      interactivity,
      comfort,
      details: {
        overlappingPairs: spatial.overlappingPairs,
        floatingObjects: physics.floatingCount,
        drawCallBudgetUsage: performance.drawCallUsage,
        polygonBudgetUsage: performance.polygonUsage,
        traitViolations: traits.violations,
      },
    };
  }

  // ── Spatial Correctness ──────────────────────────────────────────

  private scoreSpatialCorrectness(objects: SceneObject[]): {
    score: number;
    overlappingPairs: number;
  } {
    let overlappingPairs = 0;

    // O(n^2) overlap detection — acceptable for scene evaluation (not real-time)
    for (let i = 0; i < objects.length; i++) {
      for (let j = i + 1; j < objects.length; j++) {
        const a = objects[i];
        const b = objects[j];
        const dx = a.position.x - b.position.x;
        const dy = a.position.y - b.position.y;
        const dz = a.position.z - b.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const minSeparation = a.boundingRadius + b.boundingRadius;

        if (dist < minSeparation * 0.9) {
          overlappingPairs++;
        }
      }
    }

    // Score: 1.0 if no overlaps, degrades with each overlap relative to object count
    const maxPairs = Math.max(1, (objects.length * (objects.length - 1)) / 2);
    const overlapRatio = overlappingPairs / maxPairs;
    const score = Math.max(0, 1 - overlapRatio * 10); // 10% overlap pairs = score 0

    return { score, overlappingPairs };
  }

  // ── Physics Validity ─────────────────────────────────────────────

  private scorePhysicsValidity(objects: SceneObject[]): {
    score: number;
    floatingCount: number;
  } {
    if (objects.length === 0) return { score: 1, floatingCount: 0 };

    let floatingCount = 0;
    let negativeYCount = 0;
    let zeroMassCount = 0;

    for (const obj of objects) {
      // Objects not grounded with positive Y and mass > 0 should be suspect
      if (!obj.isGrounded && obj.position.y > 1.0 && obj.mass > 0) {
        floatingCount++;
      }
      // Objects below ground plane
      if (obj.position.y < -1.0) {
        negativeYCount++;
      }
      // Zero/negative mass is unphysical for non-static objects
      if (obj.mass <= 0 && !obj.isGrounded) {
        zeroMassCount++;
      }
    }

    const totalIssues = floatingCount + negativeYCount + zeroMassCount;
    const issueRatio = totalIssues / objects.length;
    const score = Math.max(0, 1 - issueRatio * 3); // 33% issues = score 0

    return { score, floatingCount };
  }

  // ── Performance Efficiency ───────────────────────────────────────

  private scorePerformanceEfficiency(metrics: SceneMetrics): {
    score: number;
    drawCallUsage: number;
    polygonUsage: number;
  } {
    const fpsScore = Math.min(1, metrics.fps / 90);
    const drawCallUsage = metrics.drawCalls / this.drawCallBudget;
    const drawCallScore = drawCallUsage <= 1.0
      ? 1.0
      : Math.max(0, 1 - (drawCallUsage - 1) * 2);
    const polygonUsage = metrics.polygonCount / this.polygonBudget;
    const polygonScore = polygonUsage <= 1.0
      ? 1.0
      : Math.max(0, 1 - (polygonUsage - 1) * 2);
    const memoryUsage = metrics.gpuMemoryMB / this.gpuMemoryBudgetMB;
    const memoryScore = memoryUsage <= 1.0
      ? 1.0
      : Math.max(0, 1 - (memoryUsage - 1) * 2);

    const score = fpsScore * 0.4 + drawCallScore * 0.2 + polygonScore * 0.2 + memoryScore * 0.2;

    return {
      score: Math.max(0, Math.min(1, score)),
      drawCallUsage,
      polygonUsage,
    };
  }

  // ── Trait Composition Quality ────────────────────────────────────

  private scoreTraitComposition(objects: SceneObject[]): {
    score: number;
    violations: number;
  } {
    if (objects.length === 0) return { score: 1, violations: 0 };

    let violations = 0;

    for (const obj of objects) {
      // Check incompatible trait pairs
      for (const [traitA, traitB] of this.traitRules.incompatible) {
        if (obj.traits.includes(traitA) && obj.traits.includes(traitB)) {
          violations++;
        }
      }

      // Check required traits
      for (const required of this.traitRules.required) {
        if (obj.traits.length > 0 && !obj.traits.includes(required)) {
          violations++;
        }
      }
    }

    // Check valid combinations if defined
    if (this.traitRules.validCombinations.length > 0) {
      for (const obj of objects) {
        if (obj.traits.length === 0) continue;
        const isValid = this.traitRules.validCombinations.some((combo) =>
          obj.traits.every((t) => combo.includes(t)),
        );
        if (!isValid) violations++;
      }
    }

    const maxViolations = Math.max(1, objects.length * 2);
    const score = Math.max(0, 1 - violations / maxViolations);

    return { score, violations };
  }
}
