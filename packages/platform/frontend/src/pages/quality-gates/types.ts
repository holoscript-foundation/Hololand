/** Quality Gates Types */
export type GateStatus = 'pass' | 'fail' | 'warn' | 'skip' | 'pending';
export interface QualityGate { id: string; name: string; category: string; status: GateStatus; score: number; threshold: number; details: string; required: boolean; }
export interface ComplianceItem { criterion: string; status: GateStatus; evidence: string; }
