/** XR Agent Configuration Types */
export type InferenceMode = 'local' | 'cloud' | 'hybrid';
export type ThermalPriority = 'performance' | 'balanced' | 'efficiency';
export interface ModelOption { id: string; name: string; sizeMB: number; parameterCount: string; supportedModes: InferenceMode[]; }
export interface XRAgentState { selectedModel: string; inferenceMode: InferenceMode; kvCacheSize: number; maxKvCache: number; thermalPriority: ThermalPriority; temperature: number; maxTemperature: number; tokensPerSecond: number; memoryUsageMB: number; }
