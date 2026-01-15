/**
 * Spatial Audio Engine
 *
 * 3D positional audio with HRTF support for immersive VR/AR experiences.
 * Manages audio sources, listener position, and environmental audio.
 */

import type {
  Vector3,
  AudioSourceConfig,
  ListenerConfig,
  SpatialAudioEngineConfig,
  AudioEvent,
  AudioEventListener,
  AudioEventType,
  ReverbConfig,
  DEFAULT_ENGINE_CONFIG,
  DEFAULT_AUDIO_SOURCE_CONFIG,
} from './types';

/**
 * Represents a single spatial audio source
 */
export class SpatialAudioSource {
  public readonly id: string;
  public config: AudioSourceConfig;

  private context: AudioContext;
  private source: AudioBufferSourceNode | MediaElementAudioSourceNode | null = null;
  private panner: PannerNode;
  private gainNode: GainNode;
  private buffer: AudioBuffer | null = null;
  private mediaElement: HTMLAudioElement | null = null;
  private isPlaying = false;
  private isPaused = false;

  constructor(
    context: AudioContext,
    config: AudioSourceConfig,
    destination: AudioNode
  ) {
    this.id = config.id;
    this.config = config;
    this.context = context;

    // Create gain node for volume control
    this.gainNode = context.createGain();
    this.gainNode.gain.value = config.volume;

    // Create panner for 3D spatialization
    this.panner = context.createPanner();
    this.panner.panningModel = 'HRTF';
    this.panner.distanceModel = config.distanceModel;
    this.panner.refDistance = config.refDistance;
    this.panner.maxDistance = config.maxDistance;
    this.panner.rolloffFactor = config.rolloffFactor;

    // Configure cone (for directional sources)
    if (config.type === 'cone' || config.type === 'directional') {
      this.panner.coneInnerAngle = config.coneInnerAngle ?? 360;
      this.panner.coneOuterAngle = config.coneOuterAngle ?? 360;
      this.panner.coneOuterGain = config.coneOuterGain ?? 0;
    }

    // Set position
    this.setPosition(config.position);

    // Set orientation
    if (config.orientation) {
      this.setOrientation(config.orientation);
    }

    // Connect: panner -> gain -> destination
    this.panner.connect(this.gainNode);
    this.gainNode.connect(destination);
  }

  /**
   * Load audio from URL
   */
  async loadFromURL(url: string): Promise<void> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this.buffer = await this.context.decodeAudioData(arrayBuffer);
  }

  /**
   * Load audio from ArrayBuffer
   */
  async loadFromBuffer(data: ArrayBuffer): Promise<void> {
    this.buffer = await this.context.decodeAudioData(data);
  }

  /**
   * Load from media element (for streaming)
   */
  loadFromMediaElement(element: HTMLAudioElement): void {
    this.mediaElement = element;
  }

  /**
   * Play the audio source
   */
  play(): void {
    if (this.isPlaying && !this.isPaused) return;

    if (this.isPaused && this.source) {
      this.context.resume();
      this.isPaused = false;
      return;
    }

    if (this.buffer) {
      this.source = this.context.createBufferSource();
      this.source.buffer = this.buffer;
      this.source.loop = this.config.loop;
      this.source.playbackRate.value = this.config.playbackRate;
      this.source.connect(this.panner);
      this.source.onended = () => {
        this.isPlaying = false;
      };
      this.source.start();
      this.isPlaying = true;
    } else if (this.mediaElement) {
      this.source = this.context.createMediaElementSource(this.mediaElement);
      this.source.connect(this.panner);
      this.mediaElement.play();
      this.isPlaying = true;
    }
  }

  /**
   * Pause the audio source
   */
  pause(): void {
    if (!this.isPlaying) return;

    if (this.mediaElement) {
      this.mediaElement.pause();
    }

    this.isPaused = true;
  }

  /**
   * Stop the audio source
   */
  stop(): void {
    if (this.source && 'stop' in this.source) {
      try {
        this.source.stop();
      } catch {
        // Already stopped
      }
    }

    if (this.mediaElement) {
      this.mediaElement.pause();
      this.mediaElement.currentTime = 0;
    }

    this.isPlaying = false;
    this.isPaused = false;
    this.source = null;
  }

  /**
   * Set 3D position
   */
  setPosition(position: Vector3): void {
    this.config.position = position;
    this.panner.positionX.setValueAtTime(position.x, this.context.currentTime);
    this.panner.positionY.setValueAtTime(position.y, this.context.currentTime);
    this.panner.positionZ.setValueAtTime(position.z, this.context.currentTime);
  }

  /**
   * Set orientation (for directional/cone sources)
   */
  setOrientation(direction: Vector3): void {
    this.config.orientation = direction;
    this.panner.orientationX.setValueAtTime(direction.x, this.context.currentTime);
    this.panner.orientationY.setValueAtTime(direction.y, this.context.currentTime);
    this.panner.orientationZ.setValueAtTime(direction.z, this.context.currentTime);
  }

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
    this.gainNode.gain.setValueAtTime(this.config.volume, this.context.currentTime);
  }

  /**
   * Get current state
   */
  getState(): { playing: boolean; paused: boolean } {
    return { playing: this.isPlaying, paused: this.isPaused };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stop();
    this.panner.disconnect();
    this.gainNode.disconnect();
  }
}

/**
 * Main Spatial Audio Engine
 */
export class SpatialAudioEngine {
  private context: AudioContext | null = null;
  private config: SpatialAudioEngineConfig;
  private sources: Map<string, SpatialAudioSource> = new Map();
  private masterGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private convolverGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private listeners: Map<AudioEventType, Set<AudioEventListener>> = new Map();
  private listenerPosition: Vector3 = { x: 0, y: 0, z: 0 };
  private listenerForward: Vector3 = { x: 0, y: 0, z: -1 };
  private listenerUp: Vector3 = { x: 0, y: 1, z: 0 };

  constructor(config?: Partial<SpatialAudioEngineConfig>) {
    this.config = { ...getDefaultEngineConfig(), ...config };
  }

  /**
   * Initialize the audio engine
   */
  async initialize(): Promise<boolean> {
    try {
      this.context = new AudioContext({
        sampleRate: this.config.sampleRate,
      });

      // Create master gain
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.config.masterVolume;

      // Create reverb chain (convolver for impulse response)
      if (this.config.reverb.preset !== 'none') {
        this.setupReverb();
      }

      // Connect master gain to destination
      this.masterGain.connect(this.context.destination);

      // Setup listener
      this.updateListener({
        position: this.listenerPosition,
        forward: this.listenerForward,
        up: this.listenerUp,
      });

      this.emit({
        type: 'context-state-change',
        timestamp: Date.now(),
        data: { state: this.context.state },
      });

      return true;
    } catch (error) {
      console.error('[SpatialAudioEngine] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Setup convolution reverb
   */
  private async setupReverb(): Promise<void> {
    if (!this.context || !this.masterGain) return;

    // Create nodes
    this.convolver = this.context.createConvolver();
    this.convolverGain = this.context.createGain();
    this.dryGain = this.context.createGain();

    // Set wet/dry mix
    this.convolverGain.gain.value = this.config.reverb.wetMix;
    this.dryGain.gain.value = 1 - this.config.reverb.wetMix;

    // Generate impulse response
    const impulseResponse = this.generateImpulseResponse(this.config.reverb);
    this.convolver.buffer = impulseResponse;

    // Reconnect: sources -> [dry + wet] -> master
    // We'll connect sources to both paths when created
  }

  /**
   * Generate impulse response for reverb
   */
  private generateImpulseResponse(config: ReverbConfig): AudioBuffer {
    if (!this.context) throw new Error('Context not initialized');

    const sampleRate = this.context.sampleRate;
    const length = Math.floor(config.decayTime * sampleRate);
    const impulse = this.context.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);

      for (let i = 0; i < length; i++) {
        // Exponential decay with noise
        const t = i / sampleRate;
        const decay = Math.exp(-3 * t / config.decayTime);
        const noise = Math.random() * 2 - 1;

        // Apply high frequency damping
        const hfDamping = Math.exp(-config.highFrequencyDamping * t * 10);

        channelData[i] = noise * decay * hfDamping * config.roomSize;
      }
    }

    return impulse;
  }

  /**
   * Resume audio context (required after user interaction)
   */
  async resume(): Promise<void> {
    if (this.context?.state === 'suspended') {
      await this.context.resume();
      this.emit({
        type: 'context-state-change',
        timestamp: Date.now(),
        data: { state: this.context.state },
      });
    }
  }

  /**
   * Suspend audio context
   */
  async suspend(): Promise<void> {
    if (this.context?.state === 'running') {
      await this.context.suspend();
      this.emit({
        type: 'context-state-change',
        timestamp: Date.now(),
        data: { state: this.context.state },
      });
    }
  }

  /**
   * Create a new audio source
   */
  createSource(config: Partial<AudioSourceConfig> & { id: string }): SpatialAudioSource {
    if (!this.context || !this.masterGain) {
      throw new Error('Engine not initialized');
    }

    if (this.sources.size >= this.config.maxSources) {
      throw new Error(`Maximum sources (${this.config.maxSources}) reached`);
    }

    const fullConfig: AudioSourceConfig = {
      ...getDefaultSourceConfig(),
      ...config,
    };

    const source = new SpatialAudioSource(this.context, fullConfig, this.masterGain);
    this.sources.set(config.id, source);

    return source;
  }

  /**
   * Get an existing source
   */
  getSource(id: string): SpatialAudioSource | undefined {
    return this.sources.get(id);
  }

  /**
   * Remove a source
   */
  removeSource(id: string): boolean {
    const source = this.sources.get(id);
    if (source) {
      source.dispose();
      this.sources.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Update listener position and orientation
   */
  updateListener(config: Partial<ListenerConfig>): void {
    if (!this.context) return;

    const listener = this.context.listener;

    if (config.position) {
      this.listenerPosition = config.position;
      listener.positionX.setValueAtTime(config.position.x, this.context.currentTime);
      listener.positionY.setValueAtTime(config.position.y, this.context.currentTime);
      listener.positionZ.setValueAtTime(config.position.z, this.context.currentTime);
    }

    if (config.forward) {
      this.listenerForward = config.forward;
      listener.forwardX.setValueAtTime(config.forward.x, this.context.currentTime);
      listener.forwardY.setValueAtTime(config.forward.y, this.context.currentTime);
      listener.forwardZ.setValueAtTime(config.forward.z, this.context.currentTime);
    }

    if (config.up) {
      this.listenerUp = config.up;
      listener.upX.setValueAtTime(config.up.x, this.context.currentTime);
      listener.upY.setValueAtTime(config.up.y, this.context.currentTime);
      listener.upZ.setValueAtTime(config.up.z, this.context.currentTime);
    }
  }

  /**
   * Get listener position
   */
  getListenerPosition(): Vector3 {
    return { ...this.listenerPosition };
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.config.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(
        this.config.masterVolume,
        this.context?.currentTime ?? 0
      );
    }
  }

  /**
   * Get master volume
   */
  getMasterVolume(): number {
    return this.config.masterVolume;
  }

  /**
   * Update reverb settings
   */
  updateReverb(config: Partial<ReverbConfig>): void {
    this.config.reverb = { ...this.config.reverb, ...config };

    if (this.context && this.convolver) {
      const impulseResponse = this.generateImpulseResponse(this.config.reverb);
      this.convolver.buffer = impulseResponse;
    }

    if (this.convolverGain) {
      this.convolverGain.gain.value = this.config.reverb.wetMix;
    }
    if (this.dryGain) {
      this.dryGain.gain.value = 1 - this.config.reverb.wetMix;
    }
  }

  /**
   * Play a one-shot sound at a position
   */
  async playOneShot(url: string, position: Vector3, volume = 1.0): Promise<void> {
    const id = `oneshot_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const source = this.createSource({
      id,
      position,
      volume,
      loop: false,
      autoPlay: true,
    });

    await source.loadFromURL(url);
    source.play();

    // Auto-cleanup after playback
    // Note: In a real implementation, we'd track the buffer duration
    setTimeout(() => {
      this.removeSource(id);
    }, 30000);
  }

  /**
   * Get audio context state
   */
  getState(): AudioContextState | 'uninitialized' {
    return this.context?.state ?? 'uninitialized';
  }

  /**
   * Get number of active sources
   */
  getSourceCount(): number {
    return this.sources.size;
  }

  /**
   * Get all source IDs
   */
  getSourceIds(): string[] {
    return Array.from(this.sources.keys());
  }

  /**
   * Add event listener
   */
  addEventListener(type: AudioEventType, listener: AudioEventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(type: AudioEventType, listener: AudioEventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  /**
   * Emit event
   */
  private emit(event: AudioEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error('[SpatialAudioEngine] Event listener error:', error);
        }
      }
    }
  }

  /**
   * Dispose and cleanup all resources
   */
  async dispose(): Promise<void> {
    // Stop and remove all sources
    for (const [id] of this.sources) {
      this.removeSource(id);
    }

    // Close audio context
    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    this.masterGain = null;
    this.convolver = null;
    this.convolverGain = null;
    this.dryGain = null;
    this.listeners.clear();
  }
}

// Helper functions to get default configs
function getDefaultEngineConfig(): SpatialAudioEngineConfig {
  return {
    sampleRate: 48000,
    maxSources: 32,
    hrtfEnabled: true,
    hrtf: {
      model: 'default',
      enabled: true,
    },
    reverb: {
      preset: 'medium-room',
      decayTime: 1.5,
      preDelay: 20,
      wetMix: 0.3,
      highFrequencyDamping: 0.5,
      roomSize: 1.0,
    },
    autoListenerUpdate: true,
    distanceAttenuation: true,
    masterVolume: 1.0,
    dopplerEnabled: false,
    dopplerFactor: 1.0,
    speedOfSound: 343,
  };
}

function getDefaultSourceConfig(): Omit<AudioSourceConfig, 'id'> {
  return {
    type: 'point',
    position: { x: 0, y: 0, z: 0 },
    volume: 1.0,
    playbackRate: 1.0,
    loop: false,
    autoPlay: false,
    distanceModel: 'inverse',
    refDistance: 1,
    maxDistance: 10000,
    rolloffFactor: 1,
  };
}

// Singleton instance
let engineInstance: SpatialAudioEngine | null = null;

/**
 * Get or create the spatial audio engine singleton
 */
export function getSpatialAudioEngine(
  config?: Partial<SpatialAudioEngineConfig>
): SpatialAudioEngine {
  if (!engineInstance) {
    engineInstance = new SpatialAudioEngine(config);
  }
  return engineInstance;
}

/**
 * Create a new spatial audio engine instance
 */
export function createSpatialAudioEngine(
  config?: Partial<SpatialAudioEngineConfig>
): SpatialAudioEngine {
  return new SpatialAudioEngine(config);
}
