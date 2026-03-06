/**
 * @hololand/protocol HapticFeedback
 *
 * Maps protocol phases to haptic patterns for VR controllers and body suits.
 * Each phase has a distinct haptic signature so agents and users can "feel"
 * the protocol progression.
 */

export interface HapticPattern {
  name: string;
  frequency: number;       // Hz (0-500)
  amplitude: number;       // 0.0 - 1.0
  durationMs: number;
  waveform: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'burst';
  repeatCount: number;     // 0 = infinite until stopped
  channels: HapticChannel[];
}

export type HapticChannel = 'left-hand' | 'right-hand' | 'chest' | 'back' | 'head' | 'feet';

export interface HapticEvent {
  patternName: string;
  triggeredAt: number;
  agentId: string;
  phase: string;
}

const BUILTIN_PATTERNS: Map<string, HapticPattern> = new Map([
  ['gentle-pulse', {
    name: 'gentle-pulse',
    frequency: 20,
    amplitude: 0.3,
    durationMs: 500,
    waveform: 'sine',
    repeatCount: 0,
    channels: ['left-hand', 'right-hand'],
  }],
  ['tight-squeeze', {
    name: 'tight-squeeze',
    frequency: 80,
    amplitude: 0.7,
    durationMs: 200,
    waveform: 'square',
    repeatCount: 5,
    channels: ['left-hand', 'right-hand', 'chest'],
  }],
  ['directional-flow', {
    name: 'directional-flow',
    frequency: 40,
    amplitude: 0.5,
    durationMs: 1000,
    waveform: 'sawtooth',
    repeatCount: 0,
    channels: ['left-hand', 'right-hand', 'back'],
  }],
  ['deep-resonance', {
    name: 'deep-resonance',
    frequency: 10,
    amplitude: 0.4,
    durationMs: 2000,
    waveform: 'sine',
    repeatCount: 0,
    channels: ['chest', 'back', 'feet'],
  }],
  ['power-surge', {
    name: 'power-surge',
    frequency: 150,
    amplitude: 0.9,
    durationMs: 300,
    waveform: 'burst',
    repeatCount: 3,
    channels: ['left-hand', 'right-hand', 'chest', 'back'],
  }],
  ['organic-growth', {
    name: 'organic-growth',
    frequency: 5,
    amplitude: 0.2,
    durationMs: 3000,
    waveform: 'triangle',
    repeatCount: 0,
    channels: ['feet', 'back', 'chest'],
  }],
  ['precision-scan', {
    name: 'precision-scan',
    frequency: 200,
    amplitude: 0.6,
    durationMs: 100,
    waveform: 'square',
    repeatCount: 10,
    channels: ['left-hand', 'right-hand', 'head'],
  }],
  ['exponential-wave', {
    name: 'exponential-wave',
    frequency: 300,
    amplitude: 1.0,
    durationMs: 150,
    waveform: 'burst',
    repeatCount: 0,
    channels: ['left-hand', 'right-hand', 'chest', 'back', 'head', 'feet'],
  }],
]);

export class HapticFeedbackManager {
  private patterns: Map<string, HapticPattern>;
  private activePatterns: Map<string, { pattern: HapticPattern; startedAt: number }> = new Map();
  private eventLog: HapticEvent[] = [];

  constructor(customPatterns?: Map<string, HapticPattern>) {
    this.patterns = new Map(BUILTIN_PATTERNS);
    if (customPatterns) {
      for (const [name, pattern] of customPatterns) {
        this.patterns.set(name, pattern);
      }
    }
  }

  getPattern(name: string): HapticPattern | undefined {
    return this.patterns.get(name);
  }

  getAllPatterns(): HapticPattern[] {
    return [...this.patterns.values()];
  }

  registerPattern(pattern: HapticPattern): void {
    this.patterns.set(pattern.name, pattern);
  }

  trigger(patternName: string, agentId: string, phase: string): { success: boolean; pattern?: HapticPattern; error?: string } {
    const pattern = this.patterns.get(patternName);
    if (!pattern) {
      return { success: false, error: `Unknown haptic pattern: ${patternName}` };
    }

    // Validate pattern parameters
    if (pattern.frequency < 0 || pattern.frequency > 500) {
      return { success: false, error: `Frequency out of range (0-500Hz): ${pattern.frequency}` };
    }
    if (pattern.amplitude < 0 || pattern.amplitude > 1) {
      return { success: false, error: `Amplitude out of range (0-1): ${pattern.amplitude}` };
    }

    const key = `${agentId}:${patternName}`;
    this.activePatterns.set(key, { pattern, startedAt: Date.now() });

    this.eventLog.push({
      patternName,
      triggeredAt: Date.now(),
      agentId,
      phase,
    });

    return { success: true, pattern };
  }

  stop(patternName: string, agentId: string): boolean {
    const key = `${agentId}:${patternName}`;
    return this.activePatterns.delete(key);
  }

  stopAll(agentId: string): number {
    let removed = 0;
    for (const key of [...this.activePatterns.keys()]) {
      if (key.startsWith(`${agentId}:`)) {
        this.activePatterns.delete(key);
        removed++;
      }
    }
    return removed;
  }

  getActivePatterns(agentId: string): HapticPattern[] {
    const result: HapticPattern[] = [];
    for (const [key, entry] of this.activePatterns) {
      if (key.startsWith(`${agentId}:`)) {
        result.push(entry.pattern);
      }
    }
    return result;
  }

  isExpired(patternName: string, agentId: string): boolean {
    const key = `${agentId}:${patternName}`;
    const entry = this.activePatterns.get(key);
    if (!entry) return true;
    if (entry.pattern.repeatCount === 0) return false; // infinite
    const totalDuration = entry.pattern.durationMs * entry.pattern.repeatCount;
    return (Date.now() - entry.startedAt) > totalDuration;
  }

  /** Compute blended amplitude for all active patterns on an agent */
  getBlendedAmplitude(agentId: string): number {
    const active = this.getActivePatterns(agentId);
    if (active.length === 0) return 0;
    // RMS blend to avoid clipping
    const sumSq = active.reduce((acc, p) => acc + p.amplitude * p.amplitude, 0);
    return Math.min(1, Math.sqrt(sumSq / active.length));
  }

  getEventLog(): HapticEvent[] {
    return [...this.eventLog];
  }

  getEventCount(): number {
    return this.eventLog.length;
  }
}
