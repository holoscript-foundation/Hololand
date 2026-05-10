export type HapticHand = 'left' | 'right' | 'both';

export type HapticWaveform = 'pulse' | 'ramp' | 'sine' | 'square' | 'triangle' | 'wait';

export type HapticFinger = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

export interface VibrateOptions {
  hand: HapticHand;
  intensity: number;
  duration: number;
}

export interface PlayPatternOptions {
  hand?: HapticHand;
  loop?: boolean;
  speed?: number;
}

export interface HapticPatternStep {
  type: HapticWaveform;
  duration: number;
  intensity?: number;
  from?: number;
  to?: number;
  frequency?: number;
  amplitude?: number;
}

export interface HapticPattern {
  steps: HapticPatternStep[];
  repeat?: number;
}

export type FingerPulseOptions = {
  pulse: number;
  duration: number;
};

export interface FingerHapticStep {
  fingers: Partial<Record<HapticFinger, HapticPatternStep>>;
  duration: number;
}

export interface FingerHapticPattern {
  steps: FingerHapticStep[];
  repeat?: number;
}

export interface FingerHapticOptions extends PlayPatternOptions {
  hand?: Exclude<HapticHand, 'both'>;
}

export interface HapticDevice {
  readonly id: string;
  readonly name: string;
  isSupported(): boolean | Promise<boolean>;
  vibrate(hand: HapticHand, intensity: number, duration: number): Promise<void>;
  stop?(hand?: HapticHand): Promise<void> | void;
}

export interface HapticPlaybackDevice extends HapticDevice {
  playPattern?(pattern: HapticPattern, options?: PlayPatternOptions): Promise<void>;
  playFingerPattern?(pattern: FingerHapticPattern, options?: FingerHapticOptions): Promise<void>;
}

export interface ImpactEffectOptions {
  hand: HapticHand;
  force: number;
  duration?: number;
}

export interface TextureEffectOptions {
  hand: HapticHand;
  roughness: number;
  duration: number;
}

export interface ConstantEffectOptions {
  hand: HapticHand;
  intensity: number;
  duration: number;
}

export interface ClickEffectOptions {
  hand: HapticHand;
  intensity?: number;
}

export interface NotificationEffectOptions {
  hand: HapticHand;
  urgency: 'low' | 'medium' | 'high';
}
