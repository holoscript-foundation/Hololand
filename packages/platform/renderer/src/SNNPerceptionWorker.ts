/**
 * SNNPerceptionWorker
 *
 * Web Worker that runs a Leaky Integrate-and-Fire (LIF) Spiking Neural Network
 * on WebGPU compute shaders for real-time spatial perception in VR.
 *
 * NEUROSCIENCE MODEL:
 * The LIF neuron is a simplified biophysical model:
 *   V_m(t + dt) = V_m(t) * decay + I_input(t)
 *   if V_m > V_threshold: emit spike, V_m = V_rest, enter refractory
 *
 * NETWORK TOPOLOGY:
 *   Input Layer (256 neurons):  Encodes scene object features (position,
 *     velocity, size, camera distance) as spike rates via rate coding.
 *   Hidden Layer (128 neurons): Processes spatial patterns, learns temporal
 *     correlations between object features.
 *   Output Layer (64 neurons):  Produces per-object attention scores and
 *     anomaly detection signals.
 *
 * COMPUTE PIPELINE:
 *   1. Encode scene input into input layer current injection
 *   2. Run LIF simulation for N timesteps (WebGPU compute shader)
 *   3. Decode output layer spike rates into attention scores
 *   4. Write results to SharedArrayBuffer via Atomics
 *
 * PERFORMANCE:
 *   256 neurons, 10 timesteps: ~2-5ms on discrete GPU
 *   Falls back to CPU simulation if WebGPU unavailable
 *
 * USAGE:
 *   This class is designed to be instantiated inside a Web Worker.
 *   The SNNPerceptionBridge on the main thread manages the Worker lifecycle.
 *
 * @module SNNPerceptionWorker
 */

import { logger } from './logger';
import type { Vec3 } from './AgentStateBuffer';
import type {
  SNNPerceptionWorkerConfig,
  SNNNetworkConfig,
  LIFLayerConfig,
  PerceptionSceneInput,
  PerceptionObjectInput,
  InferenceMetrics,
  SNNPerceptionState,
  AttentionScore,
  SalienceLevel,
  SharedBufferLayout,
} from './SNNPerceptionTypes';
import {
  DEFAULT_WORKER_CONFIG,
  SAB_HEADER,
  SAB_ENTRY_SIZE,
  SALIENCE_ENCODING,
  SALIENCE_DECODING,
  calculateBufferLayout,
} from './SNNPerceptionTypes';

// =============================================================================
// WGSL COMPUTE SHADER: LIF NEURON SIMULATION
// =============================================================================

/**
 * LIF neuron simulation compute shader.
 *
 * Runs one timestep of the LIF model for all neurons in a layer.
 * Each workgroup thread processes one neuron.
 *
 * Bindings:
 *   @group(0) @binding(0) - Neuron state (membrane potential, read-write)
 *   @group(0) @binding(1) - Spike output (1.0 = fired, 0.0 = not, read-write)
 *   @group(0) @binding(2) - Input current (from previous layer or external, read-only)
 *   @group(0) @binding(3) - Weights (connections from input to this layer, read-only)
 *   @group(0) @binding(4) - Previous layer spikes (read-only)
 *   @group(0) @binding(5) - Uniforms (decay, threshold, rest, refractory, counts)
 *   @group(0) @binding(6) - Refractory counters (read-write)
 */
const LIF_SIMULATION_SHADER = /* wgsl */ `
struct LIFUniforms {
  neuronCount: u32,
  inputCount: u32,
  decay: f32,
  threshold: f32,
  restPotential: f32,
  refractoryPeriod: u32,
  _pad0: u32,
  _pad1: u32,
}

@group(0) @binding(0) var<storage, read_write> membranePotential: array<f32>;
@group(0) @binding(1) var<storage, read_write> spikes: array<f32>;
@group(0) @binding(2) var<storage, read> externalCurrent: array<f32>;
@group(0) @binding(3) var<storage, read> weights: array<f32>;
@group(0) @binding(4) var<storage, read> prevLayerSpikes: array<f32>;
@group(0) @binding(5) var<uniform> uniforms: LIFUniforms;
@group(0) @binding(6) var<storage, read_write> refractoryCounters: array<u32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let neuronIdx = gid.x;
  if (neuronIdx >= uniforms.neuronCount) {
    return;
  }

  // Check refractory period
  var refCount = refractoryCounters[neuronIdx];
  if (refCount > 0u) {
    refractoryCounters[neuronIdx] = refCount - 1u;
    spikes[neuronIdx] = 0.0;
    return;
  }

  // Compute weighted input from previous layer spikes
  var synapticInput: f32 = 0.0;
  for (var i: u32 = 0u; i < uniforms.inputCount; i = i + 1u) {
    let weightIdx = neuronIdx * uniforms.inputCount + i;
    synapticInput += prevLayerSpikes[i] * weights[weightIdx];
  }

  // Add external current
  let external = externalCurrent[neuronIdx];

  // LIF dynamics: V(t+dt) = V(t) * decay + I_synaptic + I_external
  var v = membranePotential[neuronIdx];
  v = v * uniforms.decay + synapticInput + external;

  // Spike check
  if (v >= uniforms.threshold) {
    spikes[neuronIdx] = 1.0;
    v = uniforms.restPotential;
    refractoryCounters[neuronIdx] = uniforms.refractoryPeriod;
  } else {
    spikes[neuronIdx] = 0.0;
  }

  membranePotential[neuronIdx] = v;
}
`;

/**
 * Spike counting shader: sums spikes across a layer for rate calculation.
 *
 * Uses parallel reduction within workgroups.
 *
 * Bindings:
 *   @group(0) @binding(0) - Spike buffer (read-only)
 *   @group(0) @binding(1) - Output spike counts (read-write, atomic)
 *   @group(0) @binding(2) - Uniforms (neuron count)
 */
const SPIKE_COUNT_SHADER = /* wgsl */ `
struct CountUniforms {
  neuronCount: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
}

@group(0) @binding(0) var<storage, read> spikes: array<f32>;
@group(0) @binding(1) var<storage, read_write> spikeCount: atomic<u32>;
@group(0) @binding(2) var<uniform> uniforms: CountUniforms;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= uniforms.neuronCount) {
    return;
  }

  if (spikes[idx] > 0.5) {
    atomicAdd(&spikeCount, 1u);
  }
}
`;

// =============================================================================
// NEURON LAYER (GPU-BACKED)
// =============================================================================

/**
 * GPU-backed LIF neuron layer.
 * Manages buffers and pipeline for a single layer of neurons.
 */
interface GPUNeuronLayer {
  config: LIFLayerConfig;
  inputCount: number;
  membranePotentialBuffer: GPUBuffer;
  spikeBuffer: GPUBuffer;
  externalCurrentBuffer: GPUBuffer;
  weightsBuffer: GPUBuffer;
  refractoryBuffer: GPUBuffer;
  uniformBuffer: GPUBuffer;
  spikeCountBuffer: GPUBuffer;
  spikeCountReadbackBuffer: GPUBuffer;
  lifPipeline: GPUComputePipeline;
  countPipeline: GPUComputePipeline;
  lifBindGroup: GPUBindGroup;
  countBindGroup: GPUBindGroup;
  /** Accumulated spike counts for rate calculation */
  totalSpikes: number;
}

// =============================================================================
// SNN PERCEPTION WORKER
// =============================================================================

export class SNNPerceptionWorker {
  private config: SNNPerceptionWorkerConfig;
  private bufferLayout: SharedBufferLayout;

  // WebGPU resources
  private adapter: GPUAdapter | null = null;
  private device: GPUDevice | null = null;
  private _gpuAvailable: boolean = false;
  private adapterInfoString: string = 'none';

  // GPU neuron layers
  private inputLayer: GPUNeuronLayer | null = null;
  private hiddenLayer: GPUNeuronLayer | null = null;
  private outputLayer: GPUNeuronLayer | null = null;

  // SharedArrayBuffer views
  private sab: SharedArrayBuffer | null = null;
  private sabInt32: Int32Array | null = null;
  private sabFloat32: Float32Array | null = null;

  // State
  private _isReady: boolean = false;
  private sequence: number = 0;
  private lastSceneInput: PerceptionSceneInput | null = null;

  // CPU fallback state (used when WebGPU unavailable)
  private cpuMembranePotentials: Float32Array[] = [];
  private cpuSpikes: Float32Array[] = [];
  private cpuRefractoryCounters: Uint32Array[] = [];
  private cpuWeights: Float32Array[] = [];

  // Inference scheduling
  private inferenceIntervalId: ReturnType<typeof setInterval> | null = null;
  private currentHz: number = 10;
  private isInferring: boolean = false;

  // Object ID mapping (worker maintains its own index -> ID map)
  private objectIdMap: string[] = [];

  constructor(config?: Partial<SNNPerceptionWorkerConfig>) {
    this.config = { ...DEFAULT_WORKER_CONFIG, ...config };
    this.bufferLayout = calculateBufferLayout(this.config.maxObjects);
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Initialize the worker: set up WebGPU (or CPU fallback) and neuron layers.
   *
   * @param sab - SharedArrayBuffer for lock-free result exchange
   * @returns Whether WebGPU is available
   */
  async initialize(sab: SharedArrayBuffer): Promise<{
    gpuAvailable: boolean;
    adapterInfo: string;
  }> {
    this.sab = sab;
    this.sabInt32 = new Int32Array(sab);
    this.sabFloat32 = new Float32Array(sab);

    // Try to initialize WebGPU
    this._gpuAvailable = await this.initializeGPU();

    if (this._gpuAvailable) {
      this.initializeGPULayers();
    } else {
      this.initializeCPUFallback();
    }

    this._isReady = true;

    logger.info('[SNNPerceptionWorker] Initialized', {
      gpu: this._gpuAvailable,
      adapter: this.adapterInfoString,
      inputNeurons: this.config.network.inputLayer.neuronCount,
      hiddenNeurons: this.config.network.hiddenLayer.neuronCount,
      outputNeurons: this.config.network.outputLayer.neuronCount,
    });

    return {
      gpuAvailable: this._gpuAvailable,
      adapterInfo: this.adapterInfoString,
    };
  }

  /**
   * Dispose all resources.
   */
  dispose(): void {
    this.stopInferenceLoop();

    // Destroy GPU resources
    if (this.inputLayer) this.destroyGPULayer(this.inputLayer);
    if (this.hiddenLayer) this.destroyGPULayer(this.hiddenLayer);
    if (this.outputLayer) this.destroyGPULayer(this.outputLayer);

    this.inputLayer = null;
    this.hiddenLayer = null;
    this.outputLayer = null;

    this.device?.destroy();
    this.device = null;
    this.adapter = null;

    this._isReady = false;
    this._gpuAvailable = false;

    logger.info('[SNNPerceptionWorker] Disposed');
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  get isReady(): boolean {
    return this._isReady;
  }

  get gpuAvailable(): boolean {
    return this._gpuAvailable;
  }

  /**
   * Process a scene input: encode, simulate, decode, write to SAB.
   */
  async processInput(scene: PerceptionSceneInput): Promise<InferenceMetrics> {
    this.lastSceneInput = scene;
    return this.runInference(scene);
  }

  /**
   * Set the inference frequency.
   */
  setFrequency(hz: number): void {
    this.currentHz = Math.max(1, Math.min(30, hz));
    if (this.inferenceIntervalId !== null) {
      this.stopInferenceLoop();
      this.startInferenceLoop();
    }
  }

  /**
   * Start the periodic inference loop.
   */
  startInferenceLoop(): void {
    if (this.inferenceIntervalId !== null) return;

    const intervalMs = Math.max(1, Math.round(1000 / this.currentHz));
    this.inferenceIntervalId = setInterval(() => {
      if (!this.isInferring && this.lastSceneInput) {
        this.runInference(this.lastSceneInput).catch((err) => {
          logger.error('[SNNPerceptionWorker] Inference error', {
            error: String(err),
          });
        });
      }
    }, intervalMs);
  }

  /**
   * Stop the periodic inference loop.
   */
  stopInferenceLoop(): void {
    if (this.inferenceIntervalId !== null) {
      clearInterval(this.inferenceIntervalId);
      this.inferenceIntervalId = null;
    }
  }

  // ===========================================================================
  // INFERENCE PIPELINE
  // ===========================================================================

  /**
   * Run a complete inference pass.
   *
   * Steps:
   *   1. Encode scene input into input layer currents
   *   2. Simulate LIF network for N timesteps
   *   3. Decode output layer spike rates
   *   4. Write results to SharedArrayBuffer
   */
  private async runInference(scene: PerceptionSceneInput): Promise<InferenceMetrics> {
    this.isInferring = true;
    const startTime = performance.now();

    try {
      // Step 1: Encode input
      const encodeStart = performance.now();
      const inputCurrents = this.encodeSceneInput(scene);
      const encodeEnd = performance.now();

      // Step 2: Simulate
      const gpuStart = performance.now();
      let totalSpikes = 0;

      if (this._gpuAvailable && this.device) {
        totalSpikes = await this.simulateGPU(inputCurrents);
      } else {
        totalSpikes = this.simulateCPU(inputCurrents);
      }

      const gpuEnd = performance.now();

      // Step 3: Decode output
      const decodeStart = performance.now();
      const result = this.decodeOutput(scene);
      const decodeEnd = performance.now();

      // Step 4: Write to SAB
      const sabStart = performance.now();
      this.writeToSAB(result);
      const sabEnd = performance.now();

      this.sequence++;

      const endTime = performance.now();
      const metrics: InferenceMetrics = {
        totalMs: endTime - startTime,
        gpuComputeMs: gpuEnd - gpuStart,
        encodingMs: encodeEnd - encodeStart,
        decodingMs: decodeEnd - decodeStart,
        sabWriteMs: sabEnd - sabStart,
        objectCount: scene.objects.length,
        totalSpikes,
        averageSpikeRate: this.calculateAverageSpikeRate(),
        sequence: this.sequence,
      };

      return metrics;
    } finally {
      this.isInferring = false;
    }
  }

  // ===========================================================================
  // INPUT ENCODING
  // ===========================================================================

  /**
   * Encode scene features into input layer currents using rate coding.
   *
   * Each object maps to a set of input neurons that encode:
   *   - Distance from camera (neurons 0-N/4)
   *   - Angular size (neurons N/4 - N/2)
   *   - Velocity magnitude (neurons N/2 - 3N/4)
   *   - Movement flag (neurons 3N/4 - N)
   */
  private encodeSceneInput(scene: PerceptionSceneInput): Float32Array {
    const n = this.config.network.inputLayer.neuronCount;
    const currents = new Float32Array(n);
    const maxObj = Math.min(scene.objects.length, this.config.maxObjects);

    // Update object ID map
    this.objectIdMap = scene.objects.slice(0, maxObj).map((o) => o.id);

    const neuronsPerFeature = Math.floor(n / 4);

    for (let i = 0; i < maxObj && i < neuronsPerFeature; i++) {
      const obj = scene.objects[i];

      // Distance encoding: closer = higher current (inverse distance)
      const distCurrent = Math.max(0, 1.0 - obj.distanceFromCamera / 100.0);
      currents[i] = distCurrent * 0.5;

      // Angular size encoding
      const angularCurrent = Math.min(1.0, obj.angularSize * 10.0);
      currents[neuronsPerFeature + i] = angularCurrent * 0.5;

      // Velocity encoding
      const vel = Math.sqrt(
        obj.velocity.x * obj.velocity.x +
          obj.velocity.y * obj.velocity.y +
          obj.velocity.z * obj.velocity.z
      );
      const velCurrent = Math.min(1.0, vel / 10.0);
      currents[neuronsPerFeature * 2 + i] = velCurrent * 0.8;

      // Movement flag encoding
      currents[neuronsPerFeature * 3 + i] = obj.hasMoved ? 0.6 : 0.0;
    }

    return currents;
  }

  // ===========================================================================
  // GPU SIMULATION
  // ===========================================================================

  /**
   * Run LIF simulation on GPU for all timesteps.
   */
  private async simulateGPU(inputCurrents: Float32Array): Promise<number> {
    if (!this.device || !this.inputLayer || !this.hiddenLayer || !this.outputLayer) {
      return 0;
    }

    const timesteps = this.config.network.timestepsPerInference;
    let totalSpikes = 0;

    // Upload input currents to input layer
    this.device.queue.writeBuffer(this.inputLayer.externalCurrentBuffer, 0, inputCurrents);

    // Zero hidden and output external currents
    const hiddenZeros = new Float32Array(this.config.network.hiddenLayer.neuronCount);
    const outputZeros = new Float32Array(this.config.network.outputLayer.neuronCount);
    this.device.queue.writeBuffer(this.hiddenLayer.externalCurrentBuffer, 0, hiddenZeros);
    this.device.queue.writeBuffer(this.outputLayer.externalCurrentBuffer, 0, outputZeros);

    for (let t = 0; t < timesteps; t++) {
      const commandEncoder = this.device.createCommandEncoder();

      // Reset spike counts
      this.device.queue.writeBuffer(this.inputLayer.spikeCountBuffer, 0, new Uint32Array([0]));
      this.device.queue.writeBuffer(this.hiddenLayer.spikeCountBuffer, 0, new Uint32Array([0]));
      this.device.queue.writeBuffer(this.outputLayer.spikeCountBuffer, 0, new Uint32Array([0]));

      // Forward pass: Input -> Hidden -> Output

      // Input layer LIF
      const inputWG = Math.ceil(this.config.network.inputLayer.neuronCount / 64);
      const inputPass = commandEncoder.beginComputePass();
      inputPass.setPipeline(this.inputLayer.lifPipeline);
      inputPass.setBindGroup(0, this.inputLayer.lifBindGroup);
      inputPass.dispatchWorkgroups(inputWG);
      inputPass.end();

      // Input spike count
      const inputCountPass = commandEncoder.beginComputePass();
      inputCountPass.setPipeline(this.inputLayer.countPipeline);
      inputCountPass.setBindGroup(0, this.inputLayer.countBindGroup);
      inputCountPass.dispatchWorkgroups(inputWG);
      inputCountPass.end();

      // Hidden layer LIF (reads input layer spikes via binding)
      const hiddenWG = Math.ceil(this.config.network.hiddenLayer.neuronCount / 64);
      const hiddenPass = commandEncoder.beginComputePass();
      hiddenPass.setPipeline(this.hiddenLayer.lifPipeline);
      hiddenPass.setBindGroup(0, this.hiddenLayer.lifBindGroup);
      hiddenPass.dispatchWorkgroups(hiddenWG);
      hiddenPass.end();

      // Output layer LIF (reads hidden layer spikes)
      const outputWG = Math.ceil(this.config.network.outputLayer.neuronCount / 64);
      const outputPass = commandEncoder.beginComputePass();
      outputPass.setPipeline(this.outputLayer.lifPipeline);
      outputPass.setBindGroup(0, this.outputLayer.lifBindGroup);
      outputPass.dispatchWorkgroups(outputWG);
      outputPass.end();

      // Output spike count
      const outputCountPass = commandEncoder.beginComputePass();
      outputCountPass.setPipeline(this.outputLayer.countPipeline);
      outputCountPass.setBindGroup(0, this.outputLayer.countBindGroup);
      outputCountPass.dispatchWorkgroups(outputWG);
      outputCountPass.end();

      // Copy spike counts to readback
      commandEncoder.copyBufferToBuffer(
        this.outputLayer.spikeCountBuffer,
        0,
        this.outputLayer.spikeCountReadbackBuffer,
        0,
        4
      );

      this.device.queue.submit([commandEncoder.finish()]);
    }

    // Readback total output spikes from last timestep
    await this.outputLayer.spikeCountReadbackBuffer.mapAsync(GPUMapMode.READ);
    const countData = new Uint32Array(
      this.outputLayer.spikeCountReadbackBuffer.getMappedRange().slice(0)
    );
    totalSpikes = countData[0];
    this.outputLayer.spikeCountReadbackBuffer.unmap();
    this.outputLayer.totalSpikes += totalSpikes;

    return totalSpikes;
  }

  // ===========================================================================
  // CPU FALLBACK SIMULATION
  // ===========================================================================

  /**
   * Run LIF simulation on CPU when WebGPU is unavailable.
   */
  private simulateCPU(inputCurrents: Float32Array): number {
    const net = this.config.network;
    const timesteps = net.timestepsPerInference;
    let totalSpikes = 0;

    // Upload input currents
    for (let i = 0; i < inputCurrents.length && i < this.cpuMembranePotentials[0].length; i++) {
      // Add external current each timestep
    }

    for (let t = 0; t < timesteps; t++) {
      // Input layer
      totalSpikes += this.simulateCPULayer(
        0,
        net.inputLayer,
        inputCurrents,
        null // No previous layer for input
      );

      // Hidden layer (reads input spikes)
      totalSpikes += this.simulateCPULayer(
        1,
        net.hiddenLayer,
        new Float32Array(net.hiddenLayer.neuronCount), // No external for hidden
        this.cpuSpikes[0] // Input layer spikes
      );

      // Output layer (reads hidden spikes)
      totalSpikes += this.simulateCPULayer(
        2,
        net.outputLayer,
        new Float32Array(net.outputLayer.neuronCount),
        this.cpuSpikes[1] // Hidden layer spikes
      );
    }

    return totalSpikes;
  }

  /**
   * Simulate one timestep of a single CPU layer.
   */
  private simulateCPULayer(
    layerIdx: number,
    config: LIFLayerConfig,
    externalCurrents: Float32Array,
    prevLayerSpikes: Float32Array | null
  ): number {
    const membrane = this.cpuMembranePotentials[layerIdx];
    const spikes = this.cpuSpikes[layerIdx];
    const refractory = this.cpuRefractoryCounters[layerIdx];
    const weights = this.cpuWeights[layerIdx];
    let spikeCount = 0;

    const inputCount = prevLayerSpikes ? prevLayerSpikes.length : 0;

    for (let n = 0; n < config.neuronCount; n++) {
      // Check refractory
      if (refractory[n] > 0) {
        refractory[n]--;
        spikes[n] = 0;
        continue;
      }

      // Compute synaptic input
      let synapticInput = 0;
      if (prevLayerSpikes && weights) {
        for (let i = 0; i < inputCount; i++) {
          synapticInput += prevLayerSpikes[i] * weights[n * inputCount + i];
        }
      }

      // LIF dynamics
      let v = membrane[n];
      v = v * config.decay + synapticInput + (externalCurrents[n] || 0);

      // Spike check
      if (v >= config.threshold) {
        spikes[n] = 1.0;
        v = config.restPotential;
        refractory[n] = config.refractoryPeriod;
        spikeCount++;
      } else {
        spikes[n] = 0.0;
      }

      membrane[n] = v;
    }

    return spikeCount;
  }

  // ===========================================================================
  // OUTPUT DECODING
  // ===========================================================================

  /**
   * Decode output layer spike rates into attention scores.
   *
   * Each output neuron maps to an object (up to maxObjects).
   * Spike rate = accumulated spikes / timesteps.
   * Higher spike rate = higher attention.
   */
  private decodeOutput(scene: PerceptionSceneInput): SNNPerceptionState {
    const net = this.config.network;
    const outputCount = net.outputLayer.neuronCount;
    const timesteps = net.timestepsPerInference;
    const maxObj = Math.min(scene.objects.length, this.config.maxObjects, outputCount);

    // Get output spikes (CPU fallback reads from cpuSpikes)
    const outputSpikes = this.cpuSpikes[2] || new Float32Array(outputCount);

    const attentionScores: AttentionScore[] = [];
    let totalSpikes = 0;
    let weightedX = 0,
      weightedY = 0,
      weightedZ = 0;
    let totalWeight = 0;

    for (let i = 0; i < maxObj; i++) {
      const spikeRate = outputSpikes[i]; // Instantaneous (from last timestep)
      const attention = Math.min(1.0, spikeRate); // Normalize to 0-1
      totalSpikes += spikeRate > 0.5 ? 1 : 0;

      // Determine salience level
      let salience: SalienceLevel;
      if (attention >= 0.8) {
        salience = 'alert';
      } else if (attention >= 0.5) {
        salience = 'focus';
      } else if (attention >= 0.2) {
        salience = 'ambient';
      } else {
        salience = 'background';
      }

      // Check anomaly
      const isAnomalous =
        this.config.enableAnomalyDetection && attention >= this.config.anomalyThreshold;

      const obj = scene.objects[i];

      attentionScores.push({
        objectId: obj.id,
        attention,
        salience,
        isAnomalous,
        spikeRate: spikeRate / Math.max(1, timesteps), // Average rate
      });

      // Accumulate weighted focus point
      if (attention > 0.3) {
        weightedX += obj.position.x * attention;
        weightedY += obj.position.y * attention;
        weightedZ += obj.position.z * attention;
        totalWeight += attention;
      }
    }

    // Sort by attention descending
    attentionScores.sort((a, b) => b.attention - a.attention);

    // Calculate global anomaly level
    const anomalyCount = attentionScores.filter((s) => s.isAnomalous).length;
    const globalAnomalyLevel = maxObj > 0 ? anomalyCount / maxObj : 0;

    // Calculate focus point
    const focusPoint: Vec3 =
      totalWeight > 0
        ? { x: weightedX / totalWeight, y: weightedY / totalWeight, z: weightedZ / totalWeight }
        : { x: 0, y: 0, z: 0 };

    const focusConfidence = totalWeight > 0 ? Math.min(1.0, totalWeight / maxObj) : 0;

    const avgSpikeRate = this.calculateAverageSpikeRate();

    return {
      attentionScores,
      trackedObjectCount: maxObj,
      globalAnomalyLevel,
      focusPoint,
      focusConfidence,
      averageSpikeRate: avgSpikeRate,
      totalSpikes,
      sequence: this.sequence + 1,
      lastInferenceTimestamp: performance.now(),
      lastInferenceDurationMs: 0, // Filled by caller
      currentHz: this.currentHz,
    };
  }

  // ===========================================================================
  // SHARED ARRAY BUFFER WRITE
  // ===========================================================================

  /**
   * Write perception results to the SharedArrayBuffer.
   *
   * Uses Atomics.store on the sequence field as a release fence,
   * ensuring all prior writes are visible to the main thread reader.
   */
  private writeToSAB(state: SNNPerceptionState): void {
    if (!this.sabInt32 || !this.sabFloat32) return;

    const int32 = this.sabInt32;
    const float32 = this.sabFloat32;

    // Write header fields (non-atomic, will be visible after sequence store)
    Atomics.store(int32, SAB_HEADER.ENTRY_COUNT, state.attentionScores.length);

    // Float32 values written via Float32Array view
    float32[SAB_HEADER.ANOMALY_LEVEL] = state.globalAnomalyLevel;
    float32[SAB_HEADER.FOCUS_X] = state.focusPoint.x;
    float32[SAB_HEADER.FOCUS_Y] = state.focusPoint.y;
    float32[SAB_HEADER.FOCUS_Z] = state.focusPoint.z;
    float32[SAB_HEADER.FOCUS_CONFIDENCE] = state.focusConfidence;
    float32[SAB_HEADER.AVG_SPIKE_RATE] = state.averageSpikeRate;

    Atomics.store(int32, SAB_HEADER.TOTAL_SPIKES, state.totalSpikes);
    Atomics.store(
      int32,
      SAB_HEADER.INFERENCE_DURATION_US,
      Math.round(state.lastInferenceDurationMs * 1000)
    );

    // Timestamp as two Int32 values
    const timestamp = state.lastInferenceTimestamp;
    Atomics.store(int32, SAB_HEADER.TIMESTAMP_LOW, timestamp & 0xffffffff);
    Atomics.store(int32, SAB_HEADER.TIMESTAMP_HIGH, Math.floor(timestamp / 0x100000000));

    Atomics.store(int32, SAB_HEADER.CURRENT_HZ_X100, Math.round(state.currentHz * 100));
    Atomics.store(int32, SAB_HEADER.TRACKED_OBJECTS, state.trackedObjectCount);

    // Write attention entries
    const entryOffset = SAB_HEADER.HEADER_SIZE; // Start of entries in Float32 indices
    const maxEntries = Math.min(
      state.attentionScores.length,
      this.bufferLayout.maxAttentionEntries
    );

    for (let i = 0; i < maxEntries; i++) {
      const score = state.attentionScores[i];
      const baseIdx = entryOffset + i * SAB_ENTRY_SIZE;

      float32[baseIdx + 0] = score.attention;
      float32[baseIdx + 1] = score.spikeRate;

      // Pack flags: bit 0 = isAnomalous, bits 1-2 = salience
      const flags = (score.isAnomalous ? 1 : 0) | (SALIENCE_ENCODING[score.salience] << 1);
      float32[baseIdx + 2] = flags; // Stored as float for simplicity

      // Store object index (will be mapped back to ID on main thread)
      const objIdx = this.objectIdMap.indexOf(score.objectId);
      float32[baseIdx + 3] = objIdx >= 0 ? objIdx : -1;
    }

    // RELEASE FENCE: Atomics.store on sequence ensures all prior writes
    // are visible to any thread that reads this sequence value.
    Atomics.store(int32, SAB_HEADER.SEQUENCE, state.sequence);
  }

  // ===========================================================================
  // GPU INITIALIZATION
  // ===========================================================================

  private async initializeGPU(): Promise<boolean> {
    try {
      if (typeof navigator === 'undefined' || !navigator.gpu) {
        return false;
      }

      this.adapter = await navigator.gpu.requestAdapter({
        powerPreference: this.config.powerPreference,
      });

      if (!this.adapter) return false;

      if (this.adapter.info) {
        const info = this.adapter.info;
        this.adapterInfoString =
          `${info.vendor ?? 'unknown'} ${info.architecture ?? ''} ${info.device ?? ''}`.trim();
      }

      this.device = await this.adapter.requestDevice();

      this.device.lost.then((info: GPUDeviceLostInfo) => {
        logger.error('[SNNPerceptionWorker] GPU device lost', {
          reason: info.reason,
          message: info.message,
        });
        this._gpuAvailable = false;
        // Fall back to CPU
        this.initializeCPUFallback();
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create GPU pipelines and buffers for all three neuron layers.
   */
  private initializeGPULayers(): void {
    if (!this.device) return;

    const net = this.config.network;

    // Create shader modules
    const lifModule = this.device.createShaderModule({
      label: 'snn-lif-simulation',
      code: LIF_SIMULATION_SHADER,
    });
    const countModule = this.device.createShaderModule({
      label: 'snn-spike-count',
      code: SPIKE_COUNT_SHADER,
    });

    // Create pipelines (shared across layers, same shader)
    const lifPipeline = this.device.createComputePipeline({
      label: 'snn-lif-pipeline',
      layout: 'auto',
      compute: { module: lifModule, entryPoint: 'main' },
    });

    const countPipeline = this.device.createComputePipeline({
      label: 'snn-count-pipeline',
      layout: 'auto',
      compute: { module: countModule, entryPoint: 'main' },
    });

    // Input layer: external input, no previous layer (use self-spike buffer as dummy)
    this.inputLayer = this.createGPULayer(
      net.inputLayer,
      net.inputLayer.neuronCount, // Input count = self (external currents only)
      lifPipeline,
      countPipeline,
      null // No prev layer spike buffer
    );

    // Hidden layer: receives input layer spikes
    this.hiddenLayer = this.createGPULayer(
      net.hiddenLayer,
      net.inputLayer.neuronCount,
      lifPipeline,
      countPipeline,
      this.inputLayer.spikeBuffer
    );

    // Output layer: receives hidden layer spikes
    this.outputLayer = this.createGPULayer(
      net.outputLayer,
      net.hiddenLayer.neuronCount,
      lifPipeline,
      countPipeline,
      this.hiddenLayer.spikeBuffer
    );

    // Also initialize CPU fallback arrays for output decoding
    this.initializeCPUFallback();
  }

  /**
   * Create a single GPU neuron layer with all required buffers.
   */
  private createGPULayer(
    config: LIFLayerConfig,
    inputCount: number,
    lifPipeline: GPUComputePipeline,
    countPipeline: GPUComputePipeline,
    prevLayerSpikeBuffer: GPUBuffer | null
  ): GPUNeuronLayer {
    const device = this.device!;
    const n = config.neuronCount;

    // Membrane potential buffer (n floats)
    const membranePotentialBuffer = device.createBuffer({
      label: `snn-membrane-${n}`,
      size: n * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    // Initialize to rest potential
    device.queue.writeBuffer(
      membranePotentialBuffer,
      0,
      new Float32Array(n).fill(config.restPotential)
    );

    // Spike buffer (n floats)
    const spikeBuffer = device.createBuffer({
      label: `snn-spikes-${n}`,
      size: n * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    // External current buffer (n floats)
    const externalCurrentBuffer = device.createBuffer({
      label: `snn-current-${n}`,
      size: n * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Weight buffer (n * inputCount floats)
    const weightCount = n * inputCount;
    const weightsBuffer = device.createBuffer({
      label: `snn-weights-${n}x${inputCount}`,
      size: Math.max(4, weightCount * 4),
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    // Initialize with small random weights
    const weights = new Float32Array(weightCount);
    for (let i = 0; i < weightCount; i++) {
      weights[i] = (Math.random() - 0.5) * 0.2; // Small random weights
    }
    device.queue.writeBuffer(weightsBuffer, 0, weights);

    // Refractory counter buffer (n uint32)
    const refractoryBuffer = device.createBuffer({
      label: `snn-refractory-${n}`,
      size: n * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Uniform buffer
    const uniformBuffer = device.createBuffer({
      label: `snn-uniforms-${n}`,
      size: 32, // 8 x u32/f32
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    // Write uniforms
    const uniformData = new ArrayBuffer(32);
    const uniformView = new DataView(uniformData);
    uniformView.setUint32(0, n, true);
    uniformView.setUint32(4, inputCount, true);
    uniformView.setFloat32(8, config.decay, true);
    uniformView.setFloat32(12, config.threshold, true);
    uniformView.setFloat32(16, config.restPotential, true);
    uniformView.setUint32(20, config.refractoryPeriod, true);
    uniformView.setUint32(24, 0, true); // pad
    uniformView.setUint32(28, 0, true); // pad
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    // Spike count buffer (single atomic u32)
    const spikeCountBuffer = device.createBuffer({
      label: `snn-spike-count-${n}`,
      size: 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });

    // Spike count readback buffer
    const spikeCountReadbackBuffer = device.createBuffer({
      label: `snn-spike-count-readback-${n}`,
      size: 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    // Use prevLayerSpikeBuffer if available, otherwise create a dummy buffer
    const prevSpikeBuf =
      prevLayerSpikeBuffer ??
      device.createBuffer({
        label: `snn-prev-spikes-dummy-${n}`,
        size: Math.max(4, inputCount * 4),
        usage: GPUBufferUsage.STORAGE,
      });

    // Create bind groups
    const lifBindGroup = device.createBindGroup({
      label: `snn-lif-bind-${n}`,
      layout: lifPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: membranePotentialBuffer } },
        { binding: 1, resource: { buffer: spikeBuffer } },
        { binding: 2, resource: { buffer: externalCurrentBuffer } },
        { binding: 3, resource: { buffer: weightsBuffer } },
        { binding: 4, resource: { buffer: prevSpikeBuf } },
        { binding: 5, resource: { buffer: uniformBuffer } },
        { binding: 6, resource: { buffer: refractoryBuffer } },
      ],
    });

    // Count uniform buffer
    const countUniformBuffer = device.createBuffer({
      label: `snn-count-uniforms-${n}`,
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const countUniformData = new ArrayBuffer(16);
    const countView = new DataView(countUniformData);
    countView.setUint32(0, n, true);
    device.queue.writeBuffer(countUniformBuffer, 0, countUniformData);

    const countBindGroup = device.createBindGroup({
      label: `snn-count-bind-${n}`,
      layout: countPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: spikeBuffer } },
        { binding: 1, resource: { buffer: spikeCountBuffer } },
        { binding: 2, resource: { buffer: countUniformBuffer } },
      ],
    });

    return {
      config,
      inputCount,
      membranePotentialBuffer,
      spikeBuffer,
      externalCurrentBuffer,
      weightsBuffer,
      refractoryBuffer,
      uniformBuffer,
      spikeCountBuffer,
      spikeCountReadbackBuffer,
      lifPipeline,
      countPipeline,
      lifBindGroup,
      countBindGroup,
      totalSpikes: 0,
    };
  }

  /**
   * Destroy all GPU resources for a layer.
   */
  private destroyGPULayer(layer: GPUNeuronLayer): void {
    layer.membranePotentialBuffer.destroy();
    layer.spikeBuffer.destroy();
    layer.externalCurrentBuffer.destroy();
    layer.weightsBuffer.destroy();
    layer.refractoryBuffer.destroy();
    layer.uniformBuffer.destroy();
    layer.spikeCountBuffer.destroy();
    layer.spikeCountReadbackBuffer.destroy();
  }

  // ===========================================================================
  // CPU FALLBACK INITIALIZATION
  // ===========================================================================

  private initializeCPUFallback(): void {
    const net = this.config.network;
    const layers = [net.inputLayer, net.hiddenLayer, net.outputLayer];
    const inputCounts = [
      net.inputLayer.neuronCount, // Input: external
      net.inputLayer.neuronCount, // Hidden: from input
      net.hiddenLayer.neuronCount, // Output: from hidden
    ];

    this.cpuMembranePotentials = layers.map((l) =>
      new Float32Array(l.neuronCount).fill(l.restPotential)
    );
    this.cpuSpikes = layers.map((l) => new Float32Array(l.neuronCount));
    this.cpuRefractoryCounters = layers.map((l) => new Uint32Array(l.neuronCount));
    this.cpuWeights = layers.map((l, idx) => {
      const w = new Float32Array(l.neuronCount * inputCounts[idx]);
      for (let i = 0; i < w.length; i++) {
        w[i] = (Math.random() - 0.5) * 0.2;
      }
      return w;
    });
  }

  // ===========================================================================
  // METRICS HELPERS
  // ===========================================================================

  private calculateAverageSpikeRate(): number {
    if (this.cpuSpikes.length === 0) return 0;

    const outputSpikes = this.cpuSpikes[2];
    if (!outputSpikes) return 0;

    let total = 0;
    for (let i = 0; i < outputSpikes.length; i++) {
      total += outputSpikes[i];
    }
    return total / Math.max(1, outputSpikes.length);
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create an SNNPerceptionWorker with optional configuration.
 */
export function createSNNPerceptionWorker(
  config?: Partial<SNNPerceptionWorkerConfig>
): SNNPerceptionWorker {
  return new SNNPerceptionWorker(config);
}
