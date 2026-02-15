/**
 * Embedding Extractor
 * 
 * Extracts feature embeddings from person crops using ReID models.
 * Supports OSNet, FastReID, and custom models via ONNX or TensorFlow.js.
 */

import type { 
  Embedding, 
  PersonEmbedding, 
  EmbeddingModelConfig, 
  BoundingBox 
} from './types';
import { DEFAULT_MODEL_CONFIG } from './types';
import { ImagePreprocessor } from './ImagePreprocessor';

// ONNX Runtime types
type InferenceSession = any;
type Tensor = any;

// TensorFlow.js types
type GraphModel = any;

/**
 * Embedding Extractor
 * 
 * Extracts feature embeddings from person images for re-identification.
 */
export class EmbeddingExtractor {
  private config: EmbeddingModelConfig;
  private preprocessor: ImagePreprocessor;
  private session: InferenceSession | null = null;
  private tfModel: GraphModel | null = null;
  private isInitialized: boolean = false;
  private lastProcessingTime: number = 0;

  constructor(config?: Partial<EmbeddingModelConfig>) {
    this.config = { ...DEFAULT_MODEL_CONFIG, ...config };
    this.preprocessor = new ImagePreprocessor({
      targetWidth: this.config.inputSize.width,
      targetHeight: this.config.inputSize.height,
      mean: this.config.mean ?? [0.485, 0.456, 0.406],
      std: this.config.std ?? [0.229, 0.224, 0.225],
    });
  }

  /**
   * Initialize the embedding model
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (this.config.backend === 'onnx') {
        await this.initializeONNX();
      } else {
        await this.initializeTFJS();
      }
      this.isInitialized = true;
      console.log(`Embedding extractor initialized (${this.config.model}, ${this.config.backend})`);
    } catch (error: any) {
      throw new Error(`Failed to initialize embedding extractor: ${error.message}`);
    }
  }

  /**
   * Initialize ONNX Runtime session
   */
  private async initializeONNX(): Promise<void> {
    const ort = await import('onnxruntime-web');
    
    // Configure execution providers
    const options: any = {
      executionProviders: ['webgl', 'wasm'],
      graphOptimizationLevel: 'all',
    };

    this.session = await ort.InferenceSession.create(this.config.modelPath, options);
  }

  /**
   * Initialize TensorFlow.js model
   */
  private async initializeTFJS(): Promise<void> {
    const tf = await import('@tensorflow/tfjs');
    this.tfModel = await tf.loadGraphModel(this.config.modelPath);
  }

  /**
   * Extract embedding from a single image crop
   */
  async extract(
    source: ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
    boundingBox?: BoundingBox
  ): Promise<Embedding> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = performance.now();

    // Preprocess image
    const tensor = this.preprocessor.preprocess(source, boundingBox);

    // Run inference
    let embedding: Float32Array;
    
    if (this.config.backend === 'onnx') {
      embedding = await this.runONNX(tensor);
    } else {
      embedding = await this.runTFJS(tensor);
    }

    // L2 normalize if configured
    if (this.config.normalize) {
      this.l2Normalize(embedding);
    }

    this.lastProcessingTime = performance.now() - startTime;

    return {
      vector: embedding,
      dimensions: this.config.outputDimensions,
      normalized: this.config.normalize,
      timestamp: Date.now(),
    };
  }

  /**
   * Extract embedding with quality metadata
   */
  async extractWithMetadata(
    source: ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
    boundingBox: BoundingBox,
    detectionId: number
  ): Promise<PersonEmbedding> {
    const embedding = await this.extract(source, boundingBox);

    // Calculate quality metrics
    let quality = 0.8; // Default
    let occlusion = 0;

    if (source instanceof ImageData) {
      quality = this.preprocessor.calculateQuality(source);
      occlusion = this.preprocessor.estimateOcclusion(
        source, 
        boundingBox, 
        source.width, 
        source.height
      );
    }

    return {
      ...embedding,
      detectionId,
      boundingBox,
      quality,
      occlusion,
    };
  }

  /**
   * Extract embeddings for multiple crops (batched)
   */
  async extractBatch(
    crops: Array<{
      source: ImageData;
      boundingBox: BoundingBox;
      detectionId: number;
    }>
  ): Promise<PersonEmbedding[]> {
    if (crops.length === 0) return [];
    if (crops.length === 1) {
      return [await this.extractWithMetadata(crops[0].source, crops[0].boundingBox, crops[0].detectionId)];
    }
    if (!this.isInitialized) await this.initialize();

    const N = crops.length;
    const H = this.config.inputSize.height;
    const W = this.config.inputSize.width;
    const C = 3;

    // Preprocess all crops and stack into a single batch tensor (NCHW)
    const batchTensor = new Float32Array(N * C * H * W);
    const qualityMetrics: Array<{ quality: number; occlusion: number }> = [];

    for (let i = 0; i < N; i++) {
      const tensor = this.preprocessor.preprocess(crops[i].source, crops[i].boundingBox);
      batchTensor.set(tensor, i * C * H * W);
      const quality = this.preprocessor.calculateQuality(crops[i].source);
      const occlusion = this.preprocessor.estimateOcclusion(
        crops[i].source, crops[i].boundingBox, crops[i].source.width, crops[i].source.height
      );
      qualityMetrics.push({ quality, occlusion });
    }

    // Run batched inference
    let batchOutput: Float32Array;
    if (this.config.backend === 'onnx') {
      batchOutput = await this.runONNXBatch(batchTensor, N);
    } else {
      batchOutput = await this.runTFJSBatch(batchTensor, N);
    }

    // Split output into individual embeddings
    const dim = this.config.outputDimensions;
    const results: PersonEmbedding[] = [];
    for (let i = 0; i < N; i++) {
      const vector = batchOutput.slice(i * dim, (i + 1) * dim);
      if (this.config.normalize) this.l2Normalize(vector);
      results.push({
        vector,
        dimensions: dim,
        normalized: this.config.normalize,
        timestamp: Date.now(),
        detectionId: crops[i].detectionId,
        boundingBox: crops[i].boundingBox,
        quality: qualityMetrics[i].quality,
        occlusion: qualityMetrics[i].occlusion,
      });
    }
    return results;
  }

  /**
   * Run batched ONNX inference (N crops in one GPU dispatch)
   */
  private async runONNXBatch(batchTensor: Float32Array, batchSize: number): Promise<Float32Array> {
    const ort = await import('onnxruntime-web');
    const inputTensor = new ort.Tensor(
      'float32',
      batchTensor,
      [batchSize, 3, this.config.inputSize.height, this.config.inputSize.width]
    );
    const feeds: Record<string, typeof inputTensor> = {};
    feeds[this.session!.inputNames[0]] = inputTensor;
    const results = await this.session!.run(feeds);
    return new Float32Array(results[this.session!.outputNames[0]].data);
  }

  /**
   * Run batched TensorFlow.js inference
   */
  private async runTFJSBatch(batchTensor: Float32Array, batchSize: number): Promise<Float32Array> {
    const tf = await import('@tensorflow/tfjs');
    const input = tf.tensor4d(
      batchTensor,
      [batchSize, this.config.inputSize.height, this.config.inputSize.width, 3]
    );
    const output = this.tfModel!.predict(input) as any;
    const data = await output.data();
    input.dispose();
    output.dispose();
    return new Float32Array(data);
  }

  /**
   * Run ONNX inference
   */
  private async runONNX(tensor: Float32Array): Promise<Float32Array> {
    const ort = await import('onnxruntime-web');
    
    // Create input tensor (NCHW format)
    const inputTensor = new ort.Tensor(
      'float32',
      tensor,
      [1, 3, this.config.inputSize.height, this.config.inputSize.width]
    );

    // Run inference
    const feeds: Record<string, typeof inputTensor> = {};
    const inputName = this.session!.inputNames[0];
    feeds[inputName] = inputTensor;

    const results = await this.session!.run(feeds);
    
    // Get output
    const outputName = this.session!.outputNames[0];
    return new Float32Array(results[outputName].data);
  }

  /**
   * Run TensorFlow.js inference
   */
  private async runTFJS(tensor: Float32Array): Promise<Float32Array> {
    const tf = await import('@tensorflow/tfjs');
    
    // Create input tensor (NHWC format for TF.js)
    // Need to transpose from CHW to HWC
    const hwc = this.chwToHwc(
      tensor,
      this.config.inputSize.height,
      this.config.inputSize.width
    );
    
    const inputTensor = tf.tensor4d(
      hwc,
      [1, this.config.inputSize.height, this.config.inputSize.width, 3]
    );

    // Run inference
    const output = this.tfModel!.predict(inputTensor) as any;
    const embedding = await output.data();

    // Clean up
    inputTensor.dispose();
    output.dispose();

    return new Float32Array(embedding);
  }

  /**
   * Convert CHW to HWC format
   */
  private chwToHwc(chw: Float32Array, height: number, width: number): Float32Array {
    const hwc = new Float32Array(height * width * 3);
    const planeSize = height * width;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const chwIdx = y * width + x;
        const hwcIdx = (y * width + x) * 3;
        
        hwc[hwcIdx] = chw[chwIdx];                    // R
        hwc[hwcIdx + 1] = chw[planeSize + chwIdx];   // G
        hwc[hwcIdx + 2] = chw[2 * planeSize + chwIdx]; // B
      }
    }
    
    return hwc;
  }

  /**
   * L2 normalize embedding in-place
   */
  private l2Normalize(embedding: Float32Array): void {
    let norm = 0;
    for (let i = 0; i < embedding.length; i++) {
      norm += embedding[i] * embedding[i];
    }
    norm = Math.sqrt(norm);
    
    if (norm > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= norm;
      }
    }
  }

  /**
   * Get last processing time
   */
  getProcessingTime(): number {
    return this.lastProcessingTime;
  }

  /**
   * Check if extractor is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get model configuration
   */
  getConfig(): EmbeddingModelConfig {
    return { ...this.config };
  }

  /**
   * Dispose resources
   */
  async dispose(): Promise<void> {
    if (this.session) {
      // ONNX Runtime cleanup
      this.session = null;
    }
    if (this.tfModel) {
      this.tfModel.dispose();
      this.tfModel = null;
    }
    this.isInitialized = false;
  }
}
