import type {
  ClickEffectOptions,
  ConstantEffectOptions,
  FingerHapticPattern,
  FingerHapticStep,
  FingerPulseOptions,
  HapticFinger,
  HapticHand,
  HapticPattern,
  HapticPatternStep,
  ImpactEffectOptions,
  NotificationEffectOptions,
  PlayPatternOptions,
  TextureEffectOptions,
} from './types';

type HapticPatternPlayer = {
  vibrate(options: { hand: HapticHand; intensity: number; duration: number }): Promise<void> | void;
  playPattern(pattern: HapticPattern, options?: PlayPatternOptions): Promise<void> | void;
};

const FINGERS: HapticFinger[] = ['thumb', 'index', 'middle', 'ring', 'pinky'];

function clamp01(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function normalizeDuration(duration: number): number {
  if (duration === Infinity) {
    return Infinity;
  }
  return Math.max(0, Math.round(duration));
}

function step(type: HapticPatternStep['type'], duration: number, data: Omit<HapticPatternStep, 'type' | 'duration'> = {}): HapticPatternStep {
  return {
    type,
    duration: normalizeDuration(duration),
    ...data,
  };
}

export class WaveformGenerator {
  static pulse(intensity: number, duration: number): HapticPatternStep {
    return step('pulse', duration, { intensity: clamp01(intensity) });
  }

  static wait(duration: number): HapticPatternStep {
    return step('wait', duration, { intensity: 0 });
  }

  static ramp(from: number, to: number, duration: number): HapticPatternStep {
    return step('ramp', duration, { from: clamp01(from), to: clamp01(to) });
  }

  static sine(frequency: number, amplitude: number, duration: number): HapticPatternStep {
    return step('sine', duration, { frequency: Math.max(0, frequency), amplitude: clamp01(amplitude) });
  }

  static square(frequency: number, amplitude: number, duration: number): HapticPatternStep {
    return step('square', duration, { frequency: Math.max(0, frequency), amplitude: clamp01(amplitude) });
  }

  static triangle(frequency: number, amplitude: number, duration: number): HapticPatternStep {
    return step('triangle', duration, { frequency: Math.max(0, frequency), amplitude: clamp01(amplitude) });
  }
}

export class HapticPatternBuilder {
  private readonly steps: HapticPatternStep[] = [];
  private repeatCount = 1;

  pulse(intensity: number, duration: number): this {
    this.steps.push(WaveformGenerator.pulse(intensity, duration));
    return this;
  }

  ramp(from: number, to: number, duration: number): this {
    this.steps.push(WaveformGenerator.ramp(from, to, duration));
    return this;
  }

  sine(frequency: number, amplitude: number, duration: number): this {
    this.steps.push(WaveformGenerator.sine(frequency, amplitude, duration));
    return this;
  }

  square(frequency: number, amplitude: number, duration: number): this {
    this.steps.push(WaveformGenerator.square(frequency, amplitude, duration));
    return this;
  }

  triangle(frequency: number, amplitude: number, duration: number): this {
    this.steps.push(WaveformGenerator.triangle(frequency, amplitude, duration));
    return this;
  }

  wait(duration: number): this {
    this.steps.push(WaveformGenerator.wait(duration));
    return this;
  }

  repeat(times: number): this {
    this.repeatCount = times === Infinity ? Infinity : Math.max(1, Math.floor(times));
    return this;
  }

  build(): HapticPattern {
    return {
      steps: [...this.steps],
      repeat: this.repeatCount,
    };
  }
}

export class FingerHapticPatternBuilder {
  private readonly steps: FingerHapticStep[] = [];
  private repeatCount = 1;

  finger(finger: HapticFinger, options: FingerPulseOptions): this {
    const patternStep = WaveformGenerator.pulse(options.pulse, options.duration);
    this.steps.push({
      fingers: { [finger]: patternStep },
      duration: patternStep.duration,
    });
    return this;
  }

  allFingers(options: FingerPulseOptions): this {
    const patternStep = WaveformGenerator.pulse(options.pulse, options.duration);
    this.steps.push({
      fingers: Object.fromEntries(FINGERS.map((finger) => [finger, patternStep])) as Record<HapticFinger, HapticPatternStep>,
      duration: patternStep.duration,
    });
    return this;
  }

  wait(duration: number): this {
    this.steps.push({
      fingers: {},
      duration: normalizeDuration(duration),
    });
    return this;
  }

  repeat(times: number): this {
    this.repeatCount = times === Infinity ? Infinity : Math.max(1, Math.floor(times));
    return this;
  }

  build(): FingerHapticPattern {
    return {
      steps: this.steps.map((fingerStep) => ({
        fingers: { ...fingerStep.fingers },
        duration: fingerStep.duration,
      })),
      repeat: this.repeatCount,
    };
  }
}

export class HapticEffectPlayer {
  constructor(private readonly haptics: HapticPatternPlayer) {}

  playImpact(options: ImpactEffectOptions): Promise<void> | void {
    const duration = options.duration ?? 50;
    const pattern = createPatternBuilder().pulse(options.force, Math.min(duration, 50)).ramp(options.force * 0.7, 0.1, duration).build();
    return this.haptics.playPattern(pattern, { hand: options.hand });
  }

  playTexture(options: TextureEffectOptions): Promise<void> | void {
    const frequency = 10 + clamp01(options.roughness) * 40;
    const amplitude = 0.15 + clamp01(options.roughness) * 0.55;
    const pattern = createPatternBuilder().square(frequency, amplitude, options.duration).build();
    return this.haptics.playPattern(pattern, { hand: options.hand });
  }

  playConstant(options: ConstantEffectOptions): Promise<void> | void {
    return this.haptics.vibrate({
      hand: options.hand,
      intensity: clamp01(options.intensity),
      duration: normalizeDuration(options.duration),
    });
  }

  playClick(options: ClickEffectOptions): Promise<void> | void {
    return this.haptics.vibrate({
      hand: options.hand,
      intensity: clamp01(options.intensity ?? 0.5),
      duration: 25,
    });
  }

  playNotification(options: NotificationEffectOptions): Promise<void> | void {
    const intensityByUrgency = {
      low: 0.3,
      medium: 0.6,
      high: 0.9,
    };
    const pattern = createPatternBuilder()
      .pulse(intensityByUrgency[options.urgency], 90)
      .wait(60)
      .pulse(intensityByUrgency[options.urgency] * 0.8, 140)
      .build();
    return this.haptics.playPattern(pattern, { hand: options.hand });
  }
}

export function createPatternBuilder(): HapticPatternBuilder {
  return new HapticPatternBuilder();
}

export function createFingerPatternBuilder(): FingerHapticPatternBuilder {
  return new FingerHapticPatternBuilder();
}

export function createEffectPlayer(haptics: HapticPatternPlayer): HapticEffectPlayer {
  return new HapticEffectPlayer(haptics);
}
