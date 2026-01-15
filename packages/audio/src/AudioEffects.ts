/**
 * Audio Effects Module
 *
 * Provides audio processing effects: filters, compressor, delay, distortion,
 * chorus, phaser, and more.
 */

import type {
  EffectNode,
  FilterConfig,
  CompressorConfig,
  DelayConfig,
} from './types';

/**
 * Base class for audio effects
 */
abstract class AudioEffect {
  public readonly id: string;
  public readonly type: EffectNode['type'];
  public enabled = true;

  protected context: AudioContext;
  protected inputNode: GainNode;
  protected outputNode: GainNode;

  constructor(context: AudioContext, id: string, type: EffectNode['type']) {
    this.context = context;
    this.id = id;
    this.type = type;

    this.inputNode = context.createGain();
    this.outputNode = context.createGain();
  }

  /**
   * Get input node for connecting sources
   */
  getInput(): AudioNode {
    return this.inputNode;
  }

  /**
   * Get output node for connecting to destination
   */
  getOutput(): AudioNode {
    return this.outputNode;
  }

  /**
   * Enable/disable effect
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    // Subclasses should implement bypass logic
  }

  /**
   * Abstract method to update parameters
   */
  abstract setParameters(params: Record<string, number>): void;

  /**
   * Get current parameters
   */
  abstract getParameters(): Record<string, number>;

  /**
   * Dispose resources
   */
  dispose(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
  }
}

/**
 * Biquad Filter Effect
 */
export class FilterEffect extends AudioEffect {
  private filter: BiquadFilterNode;

  constructor(context: AudioContext, id: string, config?: Partial<FilterConfig>) {
    super(context, id, 'filter');

    this.filter = context.createBiquadFilter();
    this.filter.type = config?.type ?? 'lowpass';
    this.filter.frequency.value = config?.frequency ?? 1000;
    this.filter.Q.value = config?.Q ?? 1;
    this.filter.gain.value = config?.gain ?? 0;

    // Connect chain
    this.inputNode.connect(this.filter);
    this.filter.connect(this.outputNode);
  }

  setParameters(params: Record<string, number>): void {
    if ('frequency' in params) {
      this.filter.frequency.setValueAtTime(params.frequency, this.context.currentTime);
    }
    if ('Q' in params) {
      this.filter.Q.setValueAtTime(params.Q, this.context.currentTime);
    }
    if ('gain' in params) {
      this.filter.gain.setValueAtTime(params.gain, this.context.currentTime);
    }
  }

  getParameters(): Record<string, number> {
    return {
      frequency: this.filter.frequency.value,
      Q: this.filter.Q.value,
      gain: this.filter.gain.value,
    };
  }

  setFilterType(type: BiquadFilterType): void {
    this.filter.type = type;
  }

  override dispose(): void {
    this.filter.disconnect();
    super.dispose();
  }
}

/**
 * Dynamics Compressor Effect
 */
export class CompressorEffect extends AudioEffect {
  private compressor: DynamicsCompressorNode;

  constructor(context: AudioContext, id: string, config?: Partial<CompressorConfig>) {
    super(context, id, 'compressor');

    this.compressor = context.createDynamicsCompressor();
    this.compressor.threshold.value = config?.threshold ?? -24;
    this.compressor.knee.value = config?.knee ?? 30;
    this.compressor.ratio.value = config?.ratio ?? 12;
    this.compressor.attack.value = config?.attack ?? 0.003;
    this.compressor.release.value = config?.release ?? 0.25;

    // Connect chain
    this.inputNode.connect(this.compressor);
    this.compressor.connect(this.outputNode);
  }

  setParameters(params: Record<string, number>): void {
    if ('threshold' in params) {
      this.compressor.threshold.setValueAtTime(params.threshold, this.context.currentTime);
    }
    if ('knee' in params) {
      this.compressor.knee.setValueAtTime(params.knee, this.context.currentTime);
    }
    if ('ratio' in params) {
      this.compressor.ratio.setValueAtTime(params.ratio, this.context.currentTime);
    }
    if ('attack' in params) {
      this.compressor.attack.setValueAtTime(params.attack, this.context.currentTime);
    }
    if ('release' in params) {
      this.compressor.release.setValueAtTime(params.release, this.context.currentTime);
    }
  }

  getParameters(): Record<string, number> {
    return {
      threshold: this.compressor.threshold.value,
      knee: this.compressor.knee.value,
      ratio: this.compressor.ratio.value,
      attack: this.compressor.attack.value,
      release: this.compressor.release.value,
    };
  }

  /**
   * Get current gain reduction in dB
   */
  getReduction(): number {
    return this.compressor.reduction;
  }

  override dispose(): void {
    this.compressor.disconnect();
    super.dispose();
  }
}

/**
 * Delay Effect with feedback
 */
export class DelayEffect extends AudioEffect {
  private delay: DelayNode;
  private feedbackGain: GainNode;
  private wetGain: GainNode;
  private dryGain: GainNode;

  constructor(context: AudioContext, id: string, config?: Partial<DelayConfig>) {
    super(context, id, 'delay');

    this.delay = context.createDelay(5.0);
    this.delay.delayTime.value = config?.delayTime ?? 0.3;

    this.feedbackGain = context.createGain();
    this.feedbackGain.gain.value = config?.feedback ?? 0.3;

    this.wetGain = context.createGain();
    this.wetGain.gain.value = config?.wetMix ?? 0.5;

    this.dryGain = context.createGain();
    this.dryGain.gain.value = 1 - (config?.wetMix ?? 0.5);

    // Connect chain:
    // input -> dry -> output
    // input -> delay -> wet -> output
    //          ^      |
    //          +------+ (feedback)
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    this.inputNode.connect(this.delay);
    this.delay.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);

    this.delay.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delay);
  }

  setParameters(params: Record<string, number>): void {
    if ('delayTime' in params) {
      this.delay.delayTime.setValueAtTime(params.delayTime, this.context.currentTime);
    }
    if ('feedback' in params) {
      this.feedbackGain.gain.setValueAtTime(
        Math.min(0.95, params.feedback),
        this.context.currentTime
      );
    }
    if ('wetMix' in params) {
      this.wetGain.gain.setValueAtTime(params.wetMix, this.context.currentTime);
      this.dryGain.gain.setValueAtTime(1 - params.wetMix, this.context.currentTime);
    }
  }

  getParameters(): Record<string, number> {
    return {
      delayTime: this.delay.delayTime.value,
      feedback: this.feedbackGain.gain.value,
      wetMix: this.wetGain.gain.value,
    };
  }

  override dispose(): void {
    this.delay.disconnect();
    this.feedbackGain.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
    super.dispose();
  }
}

/**
 * Distortion Effect using waveshaper
 */
export class DistortionEffect extends AudioEffect {
  private waveshaper: WaveShaperNode;
  private preGain: GainNode;
  private postGain: GainNode;
  private amount = 50;

  constructor(context: AudioContext, id: string, amount = 50) {
    super(context, id, 'distortion');

    this.waveshaper = context.createWaveShaper();
    this.preGain = context.createGain();
    this.postGain = context.createGain();

    this.setAmount(amount);

    // Connect chain
    this.inputNode.connect(this.preGain);
    this.preGain.connect(this.waveshaper);
    this.waveshaper.connect(this.postGain);
    this.postGain.connect(this.outputNode);
  }

  /**
   * Set distortion amount (0-100)
   */
  setAmount(amount: number): void {
    this.amount = Math.max(0, Math.min(100, amount));
    this.waveshaper.curve = this.makeDistortionCurve(this.amount);

    // Compensate for volume increase
    this.postGain.gain.value = 1 / (1 + this.amount / 50);
  }

  /**
   * Generate distortion curve
   */
  private makeDistortionCurve(amount: number): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    const k = amount;

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }

    return curve;
  }

  setParameters(params: Record<string, number>): void {
    if ('amount' in params) {
      this.setAmount(params.amount);
    }
  }

  getParameters(): Record<string, number> {
    return { amount: this.amount };
  }

  override dispose(): void {
    this.waveshaper.disconnect();
    this.preGain.disconnect();
    this.postGain.disconnect();
    super.dispose();
  }
}

/**
 * Chorus Effect
 */
export class ChorusEffect extends AudioEffect {
  private delay: DelayNode;
  private lfo: OscillatorNode;
  private lfoGain: GainNode;
  private wetGain: GainNode;
  private dryGain: GainNode;

  private rate = 1.5;
  private depth = 0.002;
  private wetMix = 0.5;

  constructor(
    context: AudioContext,
    id: string,
    rate = 1.5,
    depth = 0.002,
    wetMix = 0.5
  ) {
    super(context, id, 'chorus');

    this.rate = rate;
    this.depth = depth;
    this.wetMix = wetMix;

    // Create nodes
    this.delay = context.createDelay(0.1);
    this.delay.delayTime.value = 0.02;

    this.lfo = context.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = rate;

    this.lfoGain = context.createGain();
    this.lfoGain.gain.value = depth;

    this.wetGain = context.createGain();
    this.wetGain.gain.value = wetMix;

    this.dryGain = context.createGain();
    this.dryGain.gain.value = 1 - wetMix;

    // Connect LFO to delay time
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.delay.delayTime);

    // Connect audio chain
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    this.inputNode.connect(this.delay);
    this.delay.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);

    // Start LFO
    this.lfo.start();
  }

  setParameters(params: Record<string, number>): void {
    if ('rate' in params) {
      this.rate = params.rate;
      this.lfo.frequency.setValueAtTime(params.rate, this.context.currentTime);
    }
    if ('depth' in params) {
      this.depth = params.depth;
      this.lfoGain.gain.setValueAtTime(params.depth, this.context.currentTime);
    }
    if ('wetMix' in params) {
      this.wetMix = params.wetMix;
      this.wetGain.gain.setValueAtTime(params.wetMix, this.context.currentTime);
      this.dryGain.gain.setValueAtTime(1 - params.wetMix, this.context.currentTime);
    }
  }

  getParameters(): Record<string, number> {
    return {
      rate: this.rate,
      depth: this.depth,
      wetMix: this.wetMix,
    };
  }

  override dispose(): void {
    this.lfo.stop();
    this.lfo.disconnect();
    this.lfoGain.disconnect();
    this.delay.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
    super.dispose();
  }
}

/**
 * Audio Effects Chain Manager
 */
export class EffectsChain {
  private context: AudioContext;
  private effects: Map<string, AudioEffect> = new Map();
  private chain: AudioEffect[] = [];
  private inputNode: GainNode;
  private outputNode: GainNode;

  constructor(context: AudioContext) {
    this.context = context;
    this.inputNode = context.createGain();
    this.outputNode = context.createGain();

    // Direct connection when no effects
    this.inputNode.connect(this.outputNode);
  }

  /**
   * Get input node
   */
  getInput(): AudioNode {
    return this.inputNode;
  }

  /**
   * Get output node
   */
  getOutput(): AudioNode {
    return this.outputNode;
  }

  /**
   * Add filter effect
   */
  addFilter(id: string, config?: Partial<FilterConfig>): FilterEffect {
    const effect = new FilterEffect(this.context, id, config);
    this.addEffect(effect);
    return effect;
  }

  /**
   * Add compressor effect
   */
  addCompressor(id: string, config?: Partial<CompressorConfig>): CompressorEffect {
    const effect = new CompressorEffect(this.context, id, config);
    this.addEffect(effect);
    return effect;
  }

  /**
   * Add delay effect
   */
  addDelay(id: string, config?: Partial<DelayConfig>): DelayEffect {
    const effect = new DelayEffect(this.context, id, config);
    this.addEffect(effect);
    return effect;
  }

  /**
   * Add distortion effect
   */
  addDistortion(id: string, amount = 50): DistortionEffect {
    const effect = new DistortionEffect(this.context, id, amount);
    this.addEffect(effect);
    return effect;
  }

  /**
   * Add chorus effect
   */
  addChorus(id: string, rate = 1.5, depth = 0.002, wetMix = 0.5): ChorusEffect {
    const effect = new ChorusEffect(this.context, id, rate, depth, wetMix);
    this.addEffect(effect);
    return effect;
  }

  /**
   * Add effect to chain
   */
  private addEffect(effect: AudioEffect): void {
    this.effects.set(effect.id, effect);
    this.chain.push(effect);
    this.rebuildChain();
  }

  /**
   * Remove effect from chain
   */
  removeEffect(id: string): boolean {
    const effect = this.effects.get(id);
    if (!effect) return false;

    effect.dispose();
    this.effects.delete(id);
    this.chain = this.chain.filter(e => e.id !== id);
    this.rebuildChain();

    return true;
  }

  /**
   * Get effect by ID
   */
  getEffect(id: string): AudioEffect | undefined {
    return this.effects.get(id);
  }

  /**
   * Reorder effects in chain
   */
  reorder(ids: string[]): void {
    const newChain: AudioEffect[] = [];

    for (const id of ids) {
      const effect = this.effects.get(id);
      if (effect) {
        newChain.push(effect);
      }
    }

    this.chain = newChain;
    this.rebuildChain();
  }

  /**
   * Rebuild audio connections
   */
  private rebuildChain(): void {
    // Disconnect everything
    this.inputNode.disconnect();

    if (this.chain.length === 0) {
      // Direct connection
      this.inputNode.connect(this.outputNode);
      return;
    }

    // Connect chain
    this.inputNode.connect(this.chain[0].getInput());

    for (let i = 0; i < this.chain.length - 1; i++) {
      this.chain[i].getOutput().disconnect();
      this.chain[i].getOutput().connect(this.chain[i + 1].getInput());
    }

    this.chain[this.chain.length - 1].getOutput().disconnect();
    this.chain[this.chain.length - 1].getOutput().connect(this.outputNode);
  }

  /**
   * Get all effect IDs in order
   */
  getEffectIds(): string[] {
    return this.chain.map(e => e.id);
  }

  /**
   * Dispose all effects
   */
  dispose(): void {
    for (const effect of this.chain) {
      effect.dispose();
    }
    this.effects.clear();
    this.chain = [];
    this.inputNode.disconnect();
    this.outputNode.disconnect();
  }
}

/**
 * Create an effects chain
 */
export function createEffectsChain(context: AudioContext): EffectsChain {
  return new EffectsChain(context);
}
