/** Accessibility DPO Generator Types */
export interface WCAGViolation { criterion: string; level: 'A' | 'AA' | 'AAA'; description: string; element: string; fix: string; }
export interface PreferencePair { id: string; prompt: string; chosen: { code: string; explanation: string; wcagCriteria: string[] }; rejected: { code: string; violations: WCAGViolation[] }; category: string; difficulty: 'easy' | 'medium' | 'hard'; }
export interface DPOGeneratorState { harvestExamples: number; generatedPairs: PreferencePair[]; targetCount: number; categories: Array<{ name: string; count: number }>; isGenerating: boolean; progress: number; }
