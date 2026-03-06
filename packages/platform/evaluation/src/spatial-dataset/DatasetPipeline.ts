/**
 * XR Spatial Reasoning Dataset Pipeline
 *
 * Orchestrates the full pipeline for generating 10K HoloLand-specific
 * XR spatial reasoning training examples:
 *   - 8K from ProcTHOR procedural scenes
 *   - 2K from ScanNet real-world annotations
 *
 * Pipeline stages:
 *   1. Scene generation (ProcTHOR + ScanNet adapters)
 *   2. Egocentric trajectory synthesis
 *   3. Semantic segmentation + depth generation (stubs for GPU pipeline)
 *   4. Spatial QA generation
 *   5. Quality filtering and validation
 *   6. Dataset export (JSON-L, HuggingFace format)
 *
 * @module spatial-dataset/DatasetPipeline
 */

import type {
  DatasetPipelineConfig,
  SpatialQAExample,
  VRScene,
  EgocentricTrajectory,
  EgocentricFrame,
  CameraPose,
  CameraIntrinsics,
  Quaternion,
  DatasetStats,
  PipelineEventMap,
  PipelineEventType,
  PipelineEventHandler,
} from './types';
import { SceneGenerator } from './SceneGenerator';
import { SpatialQAGenerator } from './SpatialQAGenerator';

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: DatasetPipelineConfig = {
  totalExamples: 10000,
  procthorCount: 8000,
  scannetCount: 2000,
  outputDir: './output/spatial-dataset',
  imageResolution: { width: 640, height: 480 },
  framesPerTrajectory: 30,
  questionTypes: [
    'object-localization',
    'spatial-relation',
    'counting',
    'navigation',
    'scene-understanding',
    'object-comparison',
    'occlusion-reasoning',
    'distance-estimation',
    'room-classification',
    'functional-reasoning',
    'trajectory-reasoning',
    'viewpoint-reasoning',
  ],
  difficultyDistribution: { easy: 0.4, medium: 0.35, hard: 0.25 },
  qualityThreshold: 0.5,
  seed: 42,
  generateSegmentation: true,
  generateDepth: true,
  workers: 4,
};

// =============================================================================
// RNG
// =============================================================================

class RNG {
  private state: number;
  constructor(seed: number) { this.state = seed; }
  next(): number {
    let x = this.state;
    x ^= x << 13; x ^= x >> 17; x ^= x << 5;
    this.state = x;
    return (x >>> 0) / 0xffffffff;
  }
}

// =============================================================================
// Dataset Pipeline
// =============================================================================

export class DatasetPipeline {
  private config: DatasetPipelineConfig;
  private sceneGenerator: SceneGenerator;
  private qaGenerator: SpatialQAGenerator;
  private rng: RNG;
  private eventHandlers = new Map<string, Array<(...args: any[]) => void>>();

  /** Generated data */
  private scenes: VRScene[] = [];
  private trajectories: EgocentricTrajectory[] = [];
  private examples: SpatialQAExample[] = [];
  private rejectedCount = 0;

  constructor(config?: Partial<DatasetPipelineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sceneGenerator = new SceneGenerator(this.config.seed);
    this.qaGenerator = new SpatialQAGenerator(this.config.seed + 1);
    this.rng = new RNG(this.config.seed + 2);
  }

  // ===========================================================================
  // Pipeline Execution
  // ===========================================================================

  /**
   * Run the full pipeline to generate the dataset.
   */
  async run(): Promise<DatasetStats> {
    const startTime = performance.now();

    // Phase 1: Generate ProcTHOR scenes and examples
    this.emit('pipeline:progress', {
      phase: 'procthor-scenes',
      progress: 0,
      total: this.config.procthorCount,
    });
    await this.generateProcTHORExamples();

    // Phase 2: Generate ScanNet scenes and examples
    this.emit('pipeline:progress', {
      phase: 'scannet-scenes',
      progress: 0,
      total: this.config.scannetCount,
    });
    await this.generateScanNetExamples();

    // Phase 3: Generate egocentric trajectories for subset of scenes
    this.emit('pipeline:progress', {
      phase: 'trajectories',
      progress: 0,
      total: Math.min(this.scenes.length, 100),
    });
    this.generateTrajectories();

    // Phase 4: Quality filtering
    this.emit('pipeline:progress', {
      phase: 'quality-filter',
      progress: 0,
      total: this.examples.length,
    });
    this.filterExamples();

    // Phase 5: Compute statistics
    const durationMs = performance.now() - startTime;
    const stats = this.computeStats(durationMs);

    this.emit('pipeline:complete', {
      totalExamples: this.examples.length,
      durationMs,
      stats,
    });

    return stats;
  }

  // ===========================================================================
  // ProcTHOR Pipeline (8K examples)
  // ===========================================================================

  private async generateProcTHORExamples(): Promise<void> {
    const examplesPerScene = 5;
    const scenesNeeded = Math.ceil(this.config.procthorCount / examplesPerScene);

    for (let i = 0; i < scenesNeeded; i++) {
      const scene = this.sceneGenerator.generateProcTHORScene();
      this.scenes.push(scene);
      this.emit('scene:generated', { scene, source: 'procthor' });

      const examples = this.qaGenerator.generateExamples(
        scene,
        examplesPerScene,
        this.config.difficultyDistribution,
      );

      for (const example of examples) {
        if (this.examples.length < this.config.procthorCount) {
          this.examples.push(example);
          this.emit('example:generated', { example });
        }
      }

      if ((i + 1) % 100 === 0) {
        this.emit('pipeline:progress', {
          phase: 'procthor-scenes',
          progress: Math.min(this.examples.length, this.config.procthorCount),
          total: this.config.procthorCount,
        });

        // Yield to event loop periodically
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    this.emit('batch:complete', {
      count: Math.min(this.examples.length, this.config.procthorCount),
      total: this.config.procthorCount,
      source: 'procthor',
    });
  }

  // ===========================================================================
  // ScanNet Pipeline (2K examples)
  // ===========================================================================

  private async generateScanNetExamples(): Promise<void> {
    const examplesPerScene = 4;
    const scenesNeeded = Math.ceil(this.config.scannetCount / examplesPerScene);
    const procthorCount = this.examples.length;

    for (let i = 0; i < scenesNeeded; i++) {
      const scene = this.sceneGenerator.generateScanNetScene();
      this.scenes.push(scene);
      this.emit('scene:generated', { scene, source: 'scannet' });

      const examples = this.qaGenerator.generateExamples(
        scene,
        examplesPerScene,
        this.config.difficultyDistribution,
      );

      for (const example of examples) {
        if (this.examples.length - procthorCount < this.config.scannetCount) {
          this.examples.push(example);
          this.emit('example:generated', { example });
        }
      }

      if ((i + 1) % 50 === 0) {
        this.emit('pipeline:progress', {
          phase: 'scannet-scenes',
          progress: Math.min(
            this.examples.length - procthorCount,
            this.config.scannetCount,
          ),
          total: this.config.scannetCount,
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    this.emit('batch:complete', {
      count: Math.min(
        this.examples.length - procthorCount,
        this.config.scannetCount,
      ),
      total: this.config.scannetCount,
      source: 'scannet',
    });
  }

  // ===========================================================================
  // Trajectory Synthesis
  // ===========================================================================

  private generateTrajectories(): void {
    // Generate trajectories for a subset of scenes (for egocentric examples)
    const trajectoryScenes = this.scenes.slice(0, 100);

    for (let i = 0; i < trajectoryScenes.length; i++) {
      const scene = trajectoryScenes[i];
      const trajectory = this.synthesizeTrajectory(scene);
      this.trajectories.push(trajectory);
      this.emit('trajectory:generated', { trajectory });

      if ((i + 1) % 10 === 0) {
        this.emit('pipeline:progress', {
          phase: 'trajectories',
          progress: i + 1,
          total: trajectoryScenes.length,
        });
      }
    }
  }

  private synthesizeTrajectory(scene: VRScene): EgocentricTrajectory {
    const frames: EgocentricFrame[] = [];
    const fps = 10;
    const frameCount = this.config.framesPerTrajectory;

    // Camera intrinsics (standard VR headset)
    const intrinsics: CameraIntrinsics = {
      focalLengthX: 500,
      focalLengthY: 500,
      principalPointX: this.config.imageResolution.width / 2,
      principalPointY: this.config.imageResolution.height / 2,
      width: this.config.imageResolution.width,
      height: this.config.imageResolution.height,
    };

    // Generate exploration path through the scene
    const room = scene.rooms[0];
    const startX = room.bounds.center.x - room.bounds.extents.x * 0.5;
    const endX = room.bounds.center.x + room.bounds.extents.x * 0.5;
    const centerZ = room.bounds.center.z;

    for (let f = 0; f < frameCount; f++) {
      const t = f / (frameCount - 1);
      const x = startX + (endX - startX) * t;
      const z = centerZ + Math.sin(t * Math.PI * 2) * room.bounds.extents.z * 0.3;
      const yaw = Math.atan2(
        (endX - startX) * 0.01,
        Math.cos(t * Math.PI * 2) * room.bounds.extents.z * 0.3,
      );

      const pose: CameraPose = {
        position: { x, y: 1.6, z },
        rotation: yawToQuaternion(yaw),
        timestamp: f / fps,
        intrinsics,
      };

      // Determine visible objects (simplified raycast)
      const visibleObjects: string[] = [];
      const objectVisibility = new Map<string, number>();
      for (const obj of scene.objects) {
        const dist = Math.sqrt(
          (obj.transform.position.x - x) ** 2 +
          (obj.transform.position.z - z) ** 2,
        );
        if (dist < 6) {
          visibleObjects.push(obj.id);
          objectVisibility.set(obj.id, Math.max(0, 1 - dist / 6));
        }
      }

      const basePath = `${this.config.outputDir}/${scene.id}/frame_${String(f).padStart(4, '0')}`;

      frames.push({
        index: f,
        pose,
        rgbPath: `${basePath}_rgb.png`,
        segmentationPath: `${basePath}_seg.png`,
        depthPath: `${basePath}_depth.exr`,
        visibleObjects,
        objectVisibility,
      });
    }

    return {
      id: `trajectory-${scene.id}`,
      sceneId: scene.id,
      frames,
      durationSeconds: frameCount / fps,
      fps,
      type: 'exploration',
    };
  }

  // ===========================================================================
  // Quality Filtering
  // ===========================================================================

  private filterExamples(): void {
    const before = this.examples.length;
    this.examples = this.examples.filter((example) => {
      if (example.qualityScore < this.config.qualityThreshold) {
        this.rejectedCount++;
        this.emit('example:rejected', {
          reason: `Quality score ${example.qualityScore.toFixed(2)} below threshold ${this.config.qualityThreshold}`,
          data: { id: example.id, questionType: example.questionType },
        });
        return false;
      }
      if (!example.question || example.question.length < 10) {
        this.rejectedCount++;
        this.emit('example:rejected', {
          reason: 'Question too short',
          data: { id: example.id },
        });
        return false;
      }
      if (!example.answer || example.answer.length < 10) {
        this.rejectedCount++;
        this.emit('example:rejected', {
          reason: 'Answer too short',
          data: { id: example.id },
        });
        return false;
      }
      return true;
    });

    this.emit('pipeline:progress', {
      phase: 'quality-filter',
      progress: this.examples.length,
      total: before,
    });
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  private computeStats(durationMs: number): DatasetStats {
    const examplesBySource: Record<string, number> = {};
    const examplesByType: Record<string, number> = {};
    const examplesByDifficulty: Record<string, number> = {};
    const spatialRelationCoverage: Record<string, number> = {};
    const uniqueScenes = new Set<string>();
    const uniqueCategories = new Set<string>();
    let qualitySum = 0;

    for (const example of this.examples) {
      examplesBySource[example.source] =
        (examplesBySource[example.source] ?? 0) + 1;
      examplesByType[example.questionType] =
        (examplesByType[example.questionType] ?? 0) + 1;
      examplesByDifficulty[example.difficulty] =
        (examplesByDifficulty[example.difficulty] ?? 0) + 1;
      qualitySum += example.qualityScore;
      uniqueScenes.add(example.sceneId);

      for (const rel of example.testedRelations) {
        spatialRelationCoverage[rel] =
          (spatialRelationCoverage[rel] ?? 0) + 1;
      }
    }

    // Count unique object categories across all scenes
    for (const scene of this.scenes) {
      for (const obj of scene.objects) {
        uniqueCategories.add(obj.category);
      }
    }

    return {
      totalExamples: this.examples.length,
      examplesBySource,
      examplesByType,
      examplesByDifficulty,
      averageQualityScore:
        this.examples.length > 0 ? qualitySum / this.examples.length : 0,
      rejectedCount: this.rejectedCount,
      uniqueScenes: uniqueScenes.size,
      uniqueObjectCategories: uniqueCategories.size,
      spatialRelationCoverage,
      generationTimeMs: durationMs,
    };
  }

  // ===========================================================================
  // Export
  // ===========================================================================

  /**
   * Export dataset in JSON-L format (one example per line).
   */
  exportJSONL(): string {
    return this.examples
      .map((example) => JSON.stringify({
        id: example.id,
        scene_id: example.sceneId,
        source: example.source,
        question_type: example.questionType,
        question: example.question,
        answer: example.answer,
        answer_type: example.answerType,
        difficulty: example.difficulty,
        reasoning_steps: example.reasoningSteps,
        involved_objects: example.involvedObjectIds,
        tested_relations: example.testedRelations,
        viewpoint_dependent: example.viewpointDependent,
        quality_score: example.qualityScore,
      }))
      .join('\n');
  }

  /**
   * Export dataset in HuggingFace datasets format.
   */
  exportHuggingFace(): {
    dataset_info: Record<string, unknown>;
    data: Array<Record<string, unknown>>;
  } {
    return {
      dataset_info: {
        name: 'hololand-spatial-reasoning',
        description: 'HoloLand XR Spatial Reasoning Dataset',
        version: '1.0.0',
        features: {
          id: 'string',
          question: 'string',
          answer: 'string',
          question_type: 'string',
          difficulty: 'string',
          source: 'string',
        },
        splits: {
          train: { num_examples: Math.floor(this.examples.length * 0.8) },
          validation: { num_examples: Math.floor(this.examples.length * 0.1) },
          test: { num_examples: Math.floor(this.examples.length * 0.1) },
        },
      },
      data: this.examples.map((e) => ({
        id: e.id,
        scene_id: e.sceneId,
        source: e.source,
        question_type: e.questionType,
        question: e.question,
        answer: e.answer,
        difficulty: e.difficulty,
        quality_score: e.qualityScore,
        reasoning_steps: e.reasoningSteps,
      })),
    };
  }

  // ===========================================================================
  // Event System
  // ===========================================================================

  on<K extends PipelineEventType>(
    event: K,
    handler: PipelineEventHandler<K>,
  ): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx >= 0) handlers.splice(idx, 1);
      }
    };
  }

  private emit<K extends PipelineEventType>(
    event: K,
    data: PipelineEventMap[K],
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        (handler as PipelineEventHandler<K>)(data);
      }
    }
  }

  // ===========================================================================
  // Accessors
  // ===========================================================================

  getExamples(): readonly SpatialQAExample[] {
    return this.examples;
  }

  getScenes(): readonly VRScene[] {
    return this.scenes;
  }

  getTrajectories(): readonly EgocentricTrajectory[] {
    return this.trajectories;
  }
}

// =============================================================================
// Helpers
// =============================================================================

function yawToQuaternion(yaw: number): Quaternion {
  const halfYaw = yaw / 2;
  return { x: 0, y: Math.sin(halfYaw), z: 0, w: Math.cos(halfYaw) };
}

// =============================================================================
// Factory
// =============================================================================

export function createDatasetPipeline(
  config?: Partial<DatasetPipelineConfig>,
): DatasetPipeline {
  return new DatasetPipeline(config);
}
