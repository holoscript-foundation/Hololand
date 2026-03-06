/** Hybrid Evaluation Types */
export type CheckStatus = 'pass' | 'fail' | 'warn' | 'pending';
export interface AutomatedCheck { id: string; name: string; category: string; status: CheckStatus; score: number; maxScore: number; automated: true; runtime_ms: number; }
export interface HumanReviewItem { id: string; criterion: string; category: string; status: 'reviewed' | 'pending' | 'skipped'; score?: number; reviewer?: string; notes?: string; }
export interface HybridEvalState { automatedChecks: AutomatedCheck[]; humanReviews: HumanReviewItem[]; automatedScore: number; humanScore: number; combinedScore: number; automatedWeight: number; humanWeight: number; }
