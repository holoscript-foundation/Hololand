/** Pipeline Status Types */
export interface QualityPoint { timestamp: number; score: number; label?: string; }
export interface Improvement { id: string; description: string; impact: number; status: 'applied' | 'pending' | 'reverted'; appliedAt?: number; }
export interface CircuitBreaker { name: string; status: 'closed' | 'open' | 'half-open'; failureCount: number; threshold: number; lastTripped?: number; }
export interface QueuedTask { id: string; type: string; priority: number; description: string; status: 'queued' | 'running' | 'complete' | 'failed'; eta?: number; }
export interface PipelineStatusState { qualityHistory: QualityPoint[]; improvements: Improvement[]; circuitBreakers: CircuitBreaker[]; queuedTasks: QueuedTask[]; currentQuality: number; targetQuality: number; }
