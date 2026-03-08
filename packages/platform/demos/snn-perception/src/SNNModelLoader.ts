/**
 * SNNModelLoader
 *
 * Loads trained SNN model weights and configures the SNNPerceptionWorker
 * for inference with Norse/snnTorch-compatible LIF network topology.
 *
 * ARCHITECTURE:
 * - Loads warehouse-snn-v1.json model configuration
 * - Initializes LIF neuron layers (input, hidden, output)
 * - Configures WebGPU compute shaders for spike propagation
 * - Provides rate-coded input encoding for object features
 * - Decodes output spike trains into class probabilities
 *
 * INTEGRATION:
 * ```typescript
 *   const loader = new SNNModelLoader();
 *   const model = await loader.loadModel('/models/warehouse-snn-v1.json');
 *   const bridge = createSNNPerceptionBridge({
 *     workerConfig: model.networkConfig
 *   });
 * ```
 *
 * @module SNNModelLoader
 */

export interface SNNModelMetadata {
  model_name: string;
  framework: string;
  architecture: string;
  training_dataset: string;
  training_epochs: number;
  training_accuracy: number;
  inference_latency_ms: number;
  energy_per_inference_mj: number;
  date_trained: string;
  input_features: number;
  output_classes: number;
  timesteps: number;
  description: string;
}

export interface LIFLayerConfig {
  neuron_count: number;
  decay: number;
  threshold: number;
  rest_potential: number;
  refractory_period: number;
}

export interface SNNNetworkConfig {
  input_layer: LIFLayerConfig;
  hidden_layer: LIFLayerConfig;
  output_layer: LIFLayerConfig;
  timesteps_per_inference: number;
  timestep_ms: number;
}

export interface WeightMatrix {
  shape: [number, number];
  format: string;
  sparsity: number;
  comment: string;
  data_placeholder: string;
}

export interface SNNWeights {
  input_to_hidden: WeightMatrix;
  hidden_to_output: WeightMatrix;
}

export interface PreprocessingConfig {
  input_encoding: string;
  max_spike_rate: number;
  normalization: string;
  feature_extraction: string;
}

export interface BenchmarkResults {
  quest3_webgpu: {
    inference_time_ms: number;
    energy_per_inference_mj: number;
    fps_sustained: number;
    power_consumption_w: number;
  };
  comparison_mobilenetv3: {
    inference_time_ms: number;
    energy_per_inference_mj: number;
    fps_sustained: number;
    power_consumption_w: number;
  };
  energy_savings_pct: number;
  latency_improvement_pct: number;
}

export interface SNNModel {
  metadata: SNNModelMetadata;
  network_config: SNNNetworkConfig;
  weights: SNNWeights;
  class_labels: string[];
  preprocessing: PreprocessingConfig;
  benchmark_results: BenchmarkResults;
  version: string;
  license: string;
  citation: string;
}

/**
 * Object detection result from SNN inference.
 */
export interface SNNDetectionResult {
  class_id: number;
  class_label: string;
  confidence: number;
  spike_count: number;
  avg_spike_rate: number;
}

/**
 * Loads and manages SNN model weights for warehouse object detection.
 */
export class SNNModelLoader {
  private model: SNNModel | null = null;

  /**
   * Load SNN model from JSON file.
   *
   * @param modelPath - Path to model JSON file
   * @returns Loaded model configuration
   */
  async loadModel(modelPath: string): Promise<SNNModel> {
    try {
      const response = await fetch(modelPath);
      if (!response.ok) {
        throw new Error(`Failed to load model: HTTP ${response.status}`);
      }

      this.model = await response.json();
      console.log(`[SNNModelLoader] Loaded model: ${this.model!.metadata.model_name}`);
      console.log(`[SNNModelLoader] Architecture: ${this.model!.metadata.architecture}`);
      console.log(`[SNNModelLoader] Classes: ${this.model!.class_labels.join(', ')}`);
      console.log(`[SNNModelLoader] Accuracy: ${(this.model!.metadata.training_accuracy * 100).toFixed(1)}%`);

      return this.model!;
    } catch (error) {
      throw new Error(`SNNModelLoader: Failed to load model from ${modelPath}: ${error}`);
    }
  }

  /**
   * Get the loaded model.
   */
  getModel(): SNNModel | null {
    return this.model;
  }

  /**
   * Encode object features into spike rates (rate coding).
   *
   * Converts normalized feature values (0-1) to spike rates (0-max_spike_rate).
   * This is the input encoding strategy used by the trained model.
   *
   * @param features - Normalized feature vector (length = input_features)
   * @returns Spike rates for each input neuron
   */
  encodeFeatures(features: number[]): number[] {
    if (!this.model) {
      throw new Error('SNNModelLoader: No model loaded');
    }

    const { max_spike_rate } = this.model.preprocessing;
    const { input_features } = this.model.metadata;

    if (features.length !== input_features) {
      throw new Error(
        `SNNModelLoader: Expected ${input_features} features, got ${features.length}`,
      );
    }

    // Rate coding: spike_rate = feature_value * max_spike_rate
    return features.map((f) => f * max_spike_rate);
  }

  /**
   * Decode output spike trains into class probabilities.
   *
   * Converts spike counts from output neurons into normalized probabilities.
   * Higher spike count = higher confidence for that class.
   *
   * @param outputSpikes - Spike counts for each output neuron (length = output_classes)
   * @returns Detection results sorted by confidence descending
   */
  decodeOutput(outputSpikes: number[]): SNNDetectionResult[] {
    if (!this.model) {
      throw new Error('SNNModelLoader: No model loaded');
    }

    const { output_classes, timesteps } = this.model.metadata;
    const { class_labels } = this.model;

    if (outputSpikes.length !== output_classes) {
      throw new Error(
        `SNNModelLoader: Expected ${output_classes} output spikes, got ${outputSpikes.length}`,
      );
    }

    // Normalize spike counts to probabilities
    const totalSpikes = outputSpikes.reduce((sum, s) => sum + s, 0);

    const results: SNNDetectionResult[] = outputSpikes.map((spikes, idx) => ({
      class_id: idx,
      class_label: class_labels[idx],
      confidence: totalSpikes > 0 ? spikes / totalSpikes : 0,
      spike_count: spikes,
      avg_spike_rate: spikes / timesteps,
    }));

    // Sort by confidence descending
    results.sort((a, b) => b.confidence - a.confidence);

    return results;
  }

  /**
   * Extract feature vector from object input.
   *
   * Converts PerceptionObjectInput to a 64-dimensional feature vector
   * compatible with the warehouse SNN model.
   *
   * Feature encoding:
   * - [0-2]:   Position (x, y, z) normalized to [-1, 1]
   * - [3-5]:   Velocity (vx, vy, vz) normalized to [0, 1]
   * - [6]:     Size normalized to [0, 1]
   * - [7]:     Distance from camera normalized to [0, 1]
   * - [8]:     Angular size normalized to [0, 1]
   * - [9]:     Has moved (binary 0 or 1)
   * - [10-63]: Reserved for future feature expansion (set to 0)
   *
   * @param obj - Object input from scene
   * @returns Normalized 64-dimensional feature vector
   */
  extractFeatures(obj: {
    position: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
    size: number;
    distanceFromCamera: number;
    angularSize: number;
    hasMoved: boolean;
  }): number[] {
    if (!this.model) {
      throw new Error('SNNModelLoader: No model loaded');
    }

    const features = new Array(this.model.metadata.input_features).fill(0);

    // Position (normalized to [-1, 1])
    features[0] = Math.max(-1, Math.min(1, obj.position.x / 10));
    features[1] = Math.max(-1, Math.min(1, obj.position.y / 10));
    features[2] = Math.max(-1, Math.min(1, obj.position.z / 10));

    // Velocity (normalized to [0, 1])
    const velocityMag = Math.sqrt(
      obj.velocity.x ** 2 + obj.velocity.y ** 2 + obj.velocity.z ** 2,
    );
    features[3] = Math.min(1, Math.abs(obj.velocity.x) / 5);
    features[4] = Math.min(1, Math.abs(obj.velocity.y) / 5);
    features[5] = Math.min(1, Math.abs(obj.velocity.z) / 5);

    // Size (normalized to [0, 1], assume max size = 5 meters)
    features[6] = Math.min(1, obj.size / 5);

    // Distance (normalized to [0, 1], assume max distance = 50 meters)
    features[7] = Math.min(1, obj.distanceFromCamera / 50);

    // Angular size (already in radians, normalize to [0, 1])
    features[8] = Math.min(1, obj.angularSize / Math.PI);

    // Movement flag (binary)
    features[9] = obj.hasMoved ? 1 : 0;

    // Features 10-63 reserved (all zeros)

    return features;
  }

  /**
   * Get benchmark comparison data for visualization.
   */
  getBenchmarkData(): BenchmarkResults | null {
    return this.model?.benchmark_results ?? null;
  }

  /**
   * Get model metadata for display.
   */
  getMetadata(): SNNModelMetadata | null {
    return this.model?.metadata ?? null;
  }

  /**
   * Get class labels.
   */
  getClassLabels(): string[] {
    return this.model?.class_labels ?? [];
  }
}

/**
 * Create and load an SNN model.
 *
 * @param modelPath - Path to model JSON file
 * @returns Initialized SNNModelLoader with loaded model
 */
export async function loadSNNModel(modelPath: string): Promise<SNNModelLoader> {
  const loader = new SNNModelLoader();
  await loader.loadModel(modelPath);
  return loader;
}
