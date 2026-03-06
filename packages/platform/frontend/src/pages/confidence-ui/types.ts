/** Confidence-Aware UI Types */
export type AgentState = 'local' | 'cloud' | 'degraded';
export interface ConfidenceMetrics { agentState: AgentState; confidence: number; latencyMs: number; tokensPerSecond: number; fallbackReason?: string; voiceFeedbackEnabled: boolean; lastTransition: number; }
