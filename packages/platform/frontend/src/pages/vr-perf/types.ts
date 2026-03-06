/** VR Performance Dashboard Types */
export interface GaussianBudget { totalBudget: number; used: number; perUserBudgets: Array<{ userId: string; budget: number; used: number }>; }
export interface LightingFidelity { level: 'low' | 'medium' | 'high' | 'ultra'; activeProbes: number; shadowCasters: number; reflectionQuality: number; }
export interface FrameTimeEntry { timestamp: number; cpuMs: number; gpuMs: number; totalMs: number; phase: string; }
export interface VRPerfState { gaussianBudget: GaussianBudget; lightingFidelity: LightingFidelity; frameTimeline: FrameTimeEntry[]; fps: number; targetFps: number; droppedFrames: number; reprojectionRate: number; }
