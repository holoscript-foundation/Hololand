/**
 * SNNPerceptionTypes
 *
 * Type definitions for the Spiking Neural Network (SNN) perception architecture.
 *
 * ARCHITECTURE OVERVIEW:
 * SNN inference simulates Leaky Integrate-and-Fire (LIF) neurons on a WebGPU
 * compute shader running inside a Web Worker. The main VR render thread never
 * blocks on inference. Results flow through a SharedArrayBuffer with atomic
 * operations for lock-free double-buffered communication.
 *
 * DATA FLOW:
 * ```
 *   Scene Graph (Three.js) ─────────── 90Hz ──────────────────────────────
 *        |
 *        v
 *   SNNPerceptionBridge.captureInput()    <-- Extract object positions/velocities
 *        |
 *        v  (postMessage to Worker)
 *   SNNPerceptionWorker                   <-- 1-30Hz, OFF render loop
 *        |
 *        v  (WebGPU compute shader)
 *   LIF Neuron Simulation                 <-- WGSL: V(t+dt) = V*decay + I
 *        |
 *        v  (Atomics.store to SAB)
 *   SharedPerceptionBuffer                <-- Double-buffered, lock-free
 *        |
 *        v  (Atomics.load on main)
 *   SNNPerceptionBridge.readPerception()  <-- 90Hz, < 0.1ms
 *        |
 *        v
 *   HololandRenderer                     <-- Apply attention, salience, anomaly
 * ```
 *
 * PERFORMANCE:
 *   Worker inference (256 neurons): ~2-8ms on WebGPU
 *   SharedArrayBuffer read:         < 0.01ms (Atomics.load)
 *   Total render-loop impact:       < 0.1ms (well within 11.1ms VR budget)
 *
 * @module SNNPerceptionTypes
 */

import type { Vec3 } from './AgentStateBuffer';

// =============================================================================
// LIF NEURON MODEL TYPES
// =============================================================================

/**
 * Configuration for a Leaky Integrate-and-Fire (LIF) neuron layer.
 *
 * The LIF model is defined by:
 *   V(t+dt) = V(t) * decay + sum(w_i * spike_i) + I_external
 *   if V(t+dt) > threshold then emit spike, reset V to restPotential
 */
export interface LIFLayerConfig {
  /** Number of neurons in this layer */
  neuronCount: number;
  /** Membrane potential decay factor per timestep (0-1, e.g., 0.9 = 10% leak) */
  decay: number;
  /** Firing threshold voltage */
  threshold: number;
  /** Reset potential after spike */
  restPotential: number;
  /** Refractory period in timesteps (neuron cannot fire during this period) */
  refractoryPeriod: number;
}

/**
 * Configuration for the entire SNN network topology.
 */
export interface SNNNetworkConfig {
  /** Input layer: encodes scene features into spike trains */
  inputLayer: LIFLayerConfig;
  /** Hidden processing layer: extracts spatial patterns */
  hiddenLayer: LIFLayerConfig;
  /** Output layer: produces perception results */
  outputLayer: LIFLayerConfig;
  /** Number of simulation timesteps per inference pass */
  timestepsPerInference: number;
  /** Simulation timestep in milliseconds */
  timestepMs: number;
}

// =============================================================================
// PERCEPTION RESULT TYPES
// =============================================================================

/**
 * Attention score for a scene object.
 * Higher values indicate the SNN considers this object more salient.
 */
export interface AttentionScore {
  /** Object ID from the scene */
  objectId: string;
  /** Attention level (0-1, normalized spike rate of output neuron) */
  attention: number;
  /** Salience classification */
  salience: SalienceLevel;
  /** Whether this object triggered anomaly detection neurons */
  isAnomalous: boolean;
  /** Spike rate of the corresponding output neuron (spikes/second) */
  spikeRate: number;
}

/**
 * Salience levels determined by SNN output spike patterns.
 */
export type SalienceLevel =
  | 'background'  // Low spike rate, minimal attention
  | 'ambient'     // Moderate activity, passive attention
  | 'focus'       // High spike rate, active attention target
  | 'alert';      // Anomalous burst, immediate attention required

/**
 * Spatial attention field: a 3D heatmap of perceptual attention.
 * Derived from population-coded SNN output layer activity.
 */
export interface SpatialAttentionField {
  /** Grid resolution (cells per axis) */
  resolution: number;
  /** World-space origin of the attention grid */
  origin: Vec3;
  /** World-space extent of the attention grid */
  extent: Vec3;
  /** Flattened 3D grid of attention values (resolution^3 entries, 0-1) */
  values: Float32Array;
}

/**
 * Complete SNN perception state, exchanged via SharedArrayBuffer.
 *
 * This is the output of each inference pass, read by the render thread.
 */
export interface SNNPerceptionState {
  /** Per-object attention scores (sorted by attention descending) */
  attentionScores: AttentionScore[];
  /** Number of objects currently tracked */
  trackedObjectCount: number;
  /** Global anomaly level (0-1, fraction of anomaly neurons firing) */
  globalAnomalyLevel: number;
  /** Dominant focus point in world space (weighted centroid of high-attention objects) */
  focusPoint: Vec3;
  /** Focus confidence (0-1) */
  focusConfidence: number;
  /** Network-wide average spike rate (spikes/second/neuron) */
  averageSpikeRate: number;
  /** Total spikes emitted in last inference pass */
  totalSpikes: number;
  /** Sequence number (incremented each inference pass) */
  sequence: number;
  /** Timestamp of last inference completion */
  lastInferenceTimestamp: number;
  /** Duration of last inference pass in ms */
  lastInferenceDurationMs: number;
  /** Current inference frequency in Hz */
  currentHz: number;
}

// =============================================================================
// SCENE INPUT TYPES (Main Thread -> Worker)
// =============================================================================

/**
 * Lightweight snapshot of a scene object for SNN input encoding.
 * Extracted from the Three.js scene graph on the main thread.
 */
export interface PerceptionObjectInput {
  /** Object ID */
  id: string;
  /** World-space position */
  position: Vec3;
  /** World-space velocity (delta from last frame, or zero) */
  velocity: Vec3;
  /** Object size (bounding sphere radius) */
  size: number;
  /** Distance from camera */
  distanceFromCamera: number;
  /** Angular size as seen from camera (radians) */
  angularSize: number;
  /** Whether the object moved since last input */
  hasMoved: boolean;
}

/**
 * Complete scene input snapshot sent to the worker.
 */
export interface PerceptionSceneInput {
  /** Objects to process */
  objects: PerceptionObjectInput[];
  /** Camera position */
  cameraPosition: Vec3;
  /** Camera forward direction */
  cameraForward: Vec3;
  /** Frame timestamp */
  timestamp: number;
  /** Frame sequence number */
  frameSequence: number;
}

// =============================================================================
// WORKER MESSAGE TYPES
// =============================================================================

/**
 * Messages sent from main thread to SNNPerceptionWorker.
 */
export type WorkerInMessage =
  | { type: 'init'; config: SNNPerceptionWorkerConfig; sab: SharedArrayBuffer }
  | { type: 'input'; scene: PerceptionSceneInput }
  | { type: 'set-frequency'; hz: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'dispose' };

/**
 * Messages sent from SNNPerceptionWorker to main thread.
 */
export type WorkerOutMessage =
  | { type: 'ready'; gpuAvailable: boolean; adapterInfo: string }
  | { type: 'inference-complete'; metrics: InferenceMetrics }
  | { type: 'error'; message: string; stack?: string }
  | { type: 'disposed' };

/**
 * Metrics from a single inference pass.
 */
export interface InferenceMetrics {
  /** Total inference duration in ms */
  totalMs: number;
  /** GPU compute time in ms */
  gpuComputeMs: number;
  /** Input encoding time in ms */
  encodingMs: number;
  /** Output decoding time in ms */
  decodingMs: number;
  /** SharedArrayBuffer write time in ms */
  sabWriteMs: number;
  /** Number of objects processed */
  objectCount: number;
  /** Total neuron spikes */
  totalSpikes: number;
  /** Network-wide average spike rate */
  averageSpikeRate: number;
  /** Sequence number */
  sequence: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Configuration for the SNNPerceptionWorker.
 */
export interface SNNPerceptionWorkerConfig {
  /** SNN network topology configuration */
  network: SNNNetworkConfig;
  /** Maximum number of objects the network can track (default: 256) */
  maxObjects: number;
  /** GPU power preference (default: 'high-performance') */
  powerPreference: GPUPowerPreference;
  /** Whether to enable anomaly detection output neurons (default: true) */
  enableAnomalyDetection: boolean;
  /** Anomaly threshold: spike rate above this is flagged (default: 0.8) */
  anomalyThreshold: number;
}

/**
 * Configuration for the SNNPerceptionBridge.
 */
export interface SNNPerceptionBridgeConfig {
  /** Worker configuration */
  workerConfig?: Partial<SNNPerceptionWorkerConfig>;
  /** Initial inference frequency in Hz (default: 10) */
  initialHz?: number;
  /** Minimum inference frequency in Hz (default: 1) */
  minHz?: number;
  /** Maximum inference frequency in Hz (default: 30) */
  maxHz?: number;
  /** Enable adaptive frequency based on scene complexity (default: true) */
  adaptiveFrequency?: boolean;
  /** Maximum number of objects to feed to the SNN (default: 256) */
  maxInputObjects?: number;
  /** Whether to sort input objects by distance before encoding (default: true) */
  distanceSortInput?: boolean;
  /** Callback when inference frequency changes */
  onFrequencyChange?: (oldHz: number, newHz: number, reason: string) => void;
  /** Callback when perception state updates */
  onPerceptionUpdate?: (state: Readonly<SNNPerceptionState>) => void;
}

/**
 * Metrics for the SNNPerceptionBridge.
 */
export interface SNNPerceptionBridgeMetrics {
  /** Whether the bridge is active */
  isActive: boolean;
  /** Whether the worker is initialized */
  isWorkerReady: boolean;
  /** Whether WebGPU is available in the worker */
  gpuAvailable: boolean;
  /** GPU adapter info string */
  gpuAdapterInfo: string;
  /** Current inference frequency in Hz */
  currentHz: number;
  /** Target inference frequency in Hz */
  targetHz: number;
  /** Total inference passes completed */
  totalInferences: number;
  /** Average inference duration in ms */
  averageInferenceDurationMs: number;
  /** Peak inference duration in ms */
  peakInferenceDurationMs: number;
  /** Average GPU compute time in ms */
  averageGpuComputeMs: number;
  /** Total objects currently tracked */
  trackedObjectCount: number;
  /** Current global anomaly level */
  globalAnomalyLevel: number;
  /** Average spike rate across network */
  averageSpikeRate: number;
  /** SharedArrayBuffer size in bytes */
  sabSizeBytes: number;
}

// =============================================================================
// SHARED ARRAY BUFFER LAYOUT
// =============================================================================

/**
 * Layout of the SharedArrayBuffer for lock-free state exchange.
 *
 * The buffer is organized as:
 *   [Header] [AttentionScores] [FocusPoint] [Metadata]
 *
 * All multi-byte values use Float32/Int32 views.
 * Atomic operations on the sequence field provide acquire/release semantics.
 *
 * DOUBLE-BUFFER PROTOCOL:
 *   Writer (Worker):
 *     1. Write all fields to the buffer
 *     2. Atomics.store(sequence, newSequence) -- release fence
 *
 *   Reader (Main Thread):
 *     1. prevSeq = lastReadSequence
 *     2. newSeq = Atomics.load(sequence) -- acquire fence
 *     3. If newSeq > prevSeq: read all fields (consistent snapshot)
 *     4. lastReadSequence = newSeq
 */
export interface SharedBufferLayout {
  /** Total size of the SharedArrayBuffer in bytes */
  totalBytes: number;
  /** Byte offset of the header section */
  headerOffset: number;
  /** Byte offset of the attention scores section */
  attentionOffset: number;
  /** Byte offset of the focus/metadata section */
  metadataOffset: number;
  /** Maximum number of attention scores that fit in the buffer */
  maxAttentionEntries: number;
}

/**
 * Header field offsets within the SharedArrayBuffer (Int32 indices).
 *
 * All values are indices into an Int32Array view of the SAB.
 */
export const SAB_HEADER = {
  /** Sequence number (atomic, acquire/release sync point) */
  SEQUENCE: 0,
  /** Number of valid attention entries */
  ENTRY_COUNT: 1,
  /** Global anomaly level (Float32 reinterpreted as Int32) */
  ANOMALY_LEVEL: 2,
  /** Focus point X (Float32) */
  FOCUS_X: 3,
  /** Focus point Y (Float32) */
  FOCUS_Y: 4,
  /** Focus point Z (Float32) */
  FOCUS_Z: 5,
  /** Focus confidence (Float32) */
  FOCUS_CONFIDENCE: 6,
  /** Average spike rate (Float32) */
  AVG_SPIKE_RATE: 7,
  /** Total spikes (Int32) */
  TOTAL_SPIKES: 8,
  /** Inference duration in microseconds (Int32) */
  INFERENCE_DURATION_US: 9,
  /** Inference timestamp low 32 bits */
  TIMESTAMP_LOW: 10,
  /** Inference timestamp high 32 bits */
  TIMESTAMP_HIGH: 11,
  /** Current Hz * 100 (fixed-point, Int32) */
  CURRENT_HZ_X100: 12,
  /** Tracked object count */
  TRACKED_OBJECTS: 13,
  /** Total header Int32 entries */
  HEADER_SIZE: 14,
} as const;

/**
 * Per-attention-entry field layout.
 * Each entry uses 4 Float32 values (16 bytes):
 *   [attention, spikeRate, flags, objectIndex]
 *
 * flags: bit 0 = isAnomalous, bits 1-2 = salienceLevel (0-3)
 */
export const SAB_ENTRY_SIZE = 4; // 4 Float32 values per entry

/**
 * Salience level encoding in the flags field.
 */
export const SALIENCE_ENCODING: Record<SalienceLevel, number> = {
  background: 0,
  ambient: 1,
  focus: 2,
  alert: 3,
};

export const SALIENCE_DECODING: SalienceLevel[] = [
  'background',
  'ambient',
  'focus',
  'alert',
];

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

/**
 * Default SNN network configuration optimized for VR perception.
 */
export const DEFAULT_SNN_NETWORK_CONFIG: SNNNetworkConfig = {
  inputLayer: {
    neuronCount: 256,
    decay: 0.85,
    threshold: 1.0,
    restPotential: 0.0,
    refractoryPeriod: 2,
  },
  hiddenLayer: {
    neuronCount: 128,
    decay: 0.9,
    threshold: 0.8,
    restPotential: 0.0,
    refractoryPeriod: 3,
  },
  outputLayer: {
    neuronCount: 64,
    decay: 0.95,
    threshold: 0.6,
    restPotential: 0.0,
    refractoryPeriod: 1,
  },
  timestepsPerInference: 10,
  timestepMs: 1.0,
};

/**
 * Default worker configuration.
 */
export const DEFAULT_WORKER_CONFIG: SNNPerceptionWorkerConfig = {
  network: DEFAULT_SNN_NETWORK_CONFIG,
  maxObjects: 256,
  powerPreference: 'high-performance',
  enableAnomalyDetection: true,
  anomalyThreshold: 0.8,
};

/**
 * Default bridge configuration.
 */
export const DEFAULT_BRIDGE_CONFIG: Required<SNNPerceptionBridgeConfig> = {
  workerConfig: {},
  initialHz: 10,
  minHz: 1,
  maxHz: 30,
  adaptiveFrequency: true,
  maxInputObjects: 256,
  distanceSortInput: true,
  onFrequencyChange: () => {},
  onPerceptionUpdate: () => {},
};

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Calculate the SharedArrayBuffer layout for a given max object count.
 */
export function calculateBufferLayout(maxObjects: number): SharedBufferLayout {
  const headerBytes = SAB_HEADER.HEADER_SIZE * 4; // Int32 = 4 bytes each
  const attentionBytes = maxObjects * SAB_ENTRY_SIZE * 4; // Float32 = 4 bytes
  const totalBytes = headerBytes + attentionBytes;

  // Align to 8 bytes for clean Float64 access if needed
  const alignedTotal = Math.ceil(totalBytes / 8) * 8;

  return {
    totalBytes: alignedTotal,
    headerOffset: 0,
    attentionOffset: headerBytes,
    metadataOffset: headerBytes + attentionBytes,
    maxAttentionEntries: maxObjects,
  };
}

/**
 * Create an empty SNNPerceptionState with default values.
 */
export function createEmptySNNPerceptionState(): SNNPerceptionState {
  return {
    attentionScores: [],
    trackedObjectCount: 0,
    globalAnomalyLevel: 0,
    focusPoint: { x: 0, y: 0, z: 0 },
    focusConfidence: 0,
    averageSpikeRate: 0,
    totalSpikes: 0,
    sequence: 0,
    lastInferenceTimestamp: 0,
    lastInferenceDurationMs: 0,
    currentHz: 0,
  };
}
