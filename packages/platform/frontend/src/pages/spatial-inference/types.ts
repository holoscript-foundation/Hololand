/** Spatial Inference Types */

export type InferenceStatus = 'idle' | 'initializing' | 'cold-start' | 'compiling-shaders' | 'loading-model' | 'ready' | 'running' | 'error';

export interface WebGPUCapabilities {
  supported: boolean;
  adapterName: string;
  maxBufferSize: number;
  maxComputeWorkgroupSize: [number, number, number];
  shaderF16: boolean;
}

export interface InferenceMetrics {
  tokensPerSecond: number;
  latencyMs: number;
  memoryUsageMB: number;
  gpuUtilization: number;
  shaderCompileTimeMs: number;
  modelLoadTimeMs: number;
}

export interface ColdStartStage {
  name: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  progress: number;
  durationMs?: number;
}

export interface SpatialInferenceState {
  status: InferenceStatus;
  capabilities: WebGPUCapabilities | null;
  metrics: InferenceMetrics;
  coldStartStages: ColdStartStage[];
  modelName: string;
  modelSizeMB: number;
  error?: string;
}
