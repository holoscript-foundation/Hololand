/**
 * Voice Chat Module
 *
 * Provides spatial voice chat with WebRTC, voice activity detection,
 * echo cancellation, and noise suppression.
 */

import type {
  Vector3,
  VoiceChatConfig,
  VoiceParticipant,
  VoiceActivityState,
  AudioEvent,
  AudioEventListener,
  AudioEventType,
} from './types';

const DEFAULT_VOICE_CONFIG: VoiceChatConfig = {
  vadEnabled: true,
  vadThreshold: 0.02,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 24000,
  channelCount: 1,
  spatialVoice: true,
  voiceRange: 15,
  pushToTalk: false,
};

/**
 * Voice Activity Detector
 */
class VoiceActivityDetector {
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private threshold: number;
  private smoothedLevel = 0;
  private smoothingFactor = 0.9;

  constructor(context: AudioContext, threshold: number) {
    this.threshold = threshold;
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
  }

  /**
   * Connect to audio source
   */
  connect(source: AudioNode): void {
    source.connect(this.analyser!);
  }

  /**
   * Check if voice is active
   */
  isActive(): boolean {
    if (!this.analyser || !this.dataArray) return false;

    this.analyser.getByteFrequencyData(this.dataArray);

    // Calculate RMS level
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i] * this.dataArray[i];
    }
    const rms = Math.sqrt(sum / this.dataArray.length) / 255;

    // Smooth the level
    this.smoothedLevel = this.smoothingFactor * this.smoothedLevel +
      (1 - this.smoothingFactor) * rms;

    return this.smoothedLevel > this.threshold;
  }

  /**
   * Get current audio level (0-1)
   */
  getLevel(): number {
    return this.smoothedLevel;
  }

  /**
   * Set detection threshold
   */
  setThreshold(threshold: number): void {
    this.threshold = threshold;
  }

  /**
   * Disconnect and cleanup
   */
  dispose(): void {
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    this.dataArray = null;
  }
}

/**
 * Remote voice participant renderer
 */
class RemoteVoiceRenderer {
  public readonly id: string;
  public position: Vector3;
  public volume = 1.0;
  public muted = false;

  private context: AudioContext;
  private panner: PannerNode;
  private gainNode: GainNode;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  constructor(
    context: AudioContext,
    id: string,
    position: Vector3,
    destination: AudioNode
  ) {
    this.id = id;
    this.context = context;
    this.position = position;

    // Create spatial audio chain
    this.panner = context.createPanner();
    this.panner.panningModel = 'HRTF';
    this.panner.distanceModel = 'inverse';
    this.panner.refDistance = 1;
    this.panner.maxDistance = 100;
    this.panner.rolloffFactor = 1;

    this.gainNode = context.createGain();

    // Set initial position
    this.setPosition(position);

    // Connect chain
    this.panner.connect(this.gainNode);
    this.gainNode.connect(destination);
  }

  /**
   * Set audio stream from remote peer
   */
  setStream(stream: MediaStream): void {
    // Disconnect existing source
    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }

    this.mediaStream = stream;
    this.sourceNode = this.context.createMediaStreamSource(stream);
    this.sourceNode.connect(this.panner);
  }

  /**
   * Update 3D position
   */
  setPosition(position: Vector3): void {
    this.position = position;
    this.panner.positionX.setValueAtTime(position.x, this.context.currentTime);
    this.panner.positionY.setValueAtTime(position.y, this.context.currentTime);
    this.panner.positionZ.setValueAtTime(position.z, this.context.currentTime);
  }

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.gainNode.gain.setValueAtTime(
      this.muted ? 0 : this.volume,
      this.context.currentTime
    );
  }

  /**
   * Mute/unmute
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
    this.gainNode.gain.setValueAtTime(
      muted ? 0 : this.volume,
      this.context.currentTime
    );
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.panner.disconnect();
    this.gainNode.disconnect();
    this.mediaStream = null;
  }
}

/**
 * Voice Chat Manager
 */
export class VoiceChat {
  private config: VoiceChatConfig;
  private context: AudioContext | null = null;
  private localStream: MediaStream | null = null;
  private localGain: GainNode | null = null;
  private vad: VoiceActivityDetector | null = null;
  private remoteRenderers: Map<string, RemoteVoiceRenderer> = new Map();
  private participants: Map<string, VoiceParticipant> = new Map();
  private listeners: Map<AudioEventType, Set<AudioEventListener>> = new Map();

  private localMuted = false;
  private localState: VoiceActivityState = 'silent';
  private vadIntervalId: number | null = null;
  private pttActive = false;

  private listenerPosition: Vector3 = { x: 0, y: 0, z: 0 };

  constructor(config?: Partial<VoiceChatConfig>) {
    this.config = { ...DEFAULT_VOICE_CONFIG, ...config };
  }

  /**
   * Initialize voice chat
   */
  async initialize(): Promise<boolean> {
    try {
      this.context = new AudioContext({
        sampleRate: this.config.sampleRate,
      });

      return true;
    } catch (error) {
      console.error('[VoiceChat] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Start local voice capture
   */
  async startCapture(): Promise<boolean> {
    if (!this.context) {
      throw new Error('VoiceChat not initialized');
    }

    try {
      // Request microphone access
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl,
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channelCount,
        },
      });

      // Create local audio chain
      const sourceNode = this.context.createMediaStreamSource(this.localStream);
      this.localGain = this.context.createGain();

      sourceNode.connect(this.localGain);

      // Setup VAD
      if (this.config.vadEnabled) {
        this.vad = new VoiceActivityDetector(this.context, this.config.vadThreshold);
        this.vad.connect(sourceNode);
        this.startVADMonitoring();
      }

      this.emit({
        type: 'voice-started',
        timestamp: Date.now(),
      });

      return true;
    } catch (error) {
      console.error('[VoiceChat] Failed to start capture:', error);
      return false;
    }
  }

  /**
   * Stop local voice capture
   */
  stopCapture(): void {
    if (this.vadIntervalId) {
      clearInterval(this.vadIntervalId);
      this.vadIntervalId = null;
    }

    if (this.vad) {
      this.vad.dispose();
      this.vad = null;
    }

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
      this.localStream = null;
    }

    this.localGain = null;

    this.emit({
      type: 'voice-ended',
      timestamp: Date.now(),
    });
  }

  /**
   * Get local media stream for WebRTC
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Start VAD monitoring loop
   */
  private startVADMonitoring(): void {
    if (this.vadIntervalId) return;

    this.vadIntervalId = window.setInterval(() => {
      if (!this.vad) return;

      const wasActive = this.localState === 'speaking';
      const isActive = this.config.pushToTalk
        ? this.pttActive
        : this.vad.isActive();

      const newState: VoiceActivityState = this.localMuted
        ? 'muted'
        : isActive
          ? 'speaking'
          : 'silent';

      if (newState !== this.localState) {
        this.localState = newState;
        this.emit({
          type: 'voice-activity',
          timestamp: Date.now(),
          data: { state: newState, level: this.vad.getLevel() },
        });
      }
    }, 50);
  }

  /**
   * Set push-to-talk state
   */
  setPTTActive(active: boolean): void {
    this.pttActive = active;
  }

  /**
   * Add remote participant
   */
  addParticipant(
    id: string,
    displayName: string,
    position: Vector3,
    stream?: MediaStream
  ): void {
    if (!this.context) {
      throw new Error('VoiceChat not initialized');
    }

    // Create participant entry
    const participant: VoiceParticipant = {
      id,
      displayName,
      position,
      state: 'silent',
      volume: 1.0,
      muted: false,
      localMuted: false,
    };
    this.participants.set(id, participant);

    // Create spatial renderer if spatial voice enabled
    if (this.config.spatialVoice) {
      const renderer = new RemoteVoiceRenderer(
        this.context,
        id,
        position,
        this.context.destination
      );

      if (stream) {
        renderer.setStream(stream);
      }

      this.remoteRenderers.set(id, renderer);
    }

    this.emit({
      type: 'participant-joined',
      participantId: id,
      timestamp: Date.now(),
      data: { displayName },
    });
  }

  /**
   * Remove participant
   */
  removeParticipant(id: string): void {
    const renderer = this.remoteRenderers.get(id);
    if (renderer) {
      renderer.dispose();
      this.remoteRenderers.delete(id);
    }

    this.participants.delete(id);

    this.emit({
      type: 'participant-left',
      participantId: id,
      timestamp: Date.now(),
    });
  }

  /**
   * Update participant stream
   */
  updateParticipantStream(id: string, stream: MediaStream): void {
    const renderer = this.remoteRenderers.get(id);
    if (renderer) {
      renderer.setStream(stream);
    }
  }

  /**
   * Update participant position
   */
  updateParticipantPosition(id: string, position: Vector3): void {
    const participant = this.participants.get(id);
    if (participant) {
      participant.position = position;
    }

    const renderer = this.remoteRenderers.get(id);
    if (renderer) {
      renderer.setPosition(position);
    }
  }

  /**
   * Set participant volume
   */
  setParticipantVolume(id: string, volume: number): void {
    const participant = this.participants.get(id);
    if (participant) {
      participant.volume = volume;
    }

    const renderer = this.remoteRenderers.get(id);
    if (renderer) {
      renderer.setVolume(volume);
    }
  }

  /**
   * Mute/unmute participant locally
   */
  setParticipantLocalMuted(id: string, muted: boolean): void {
    const participant = this.participants.get(id);
    if (participant) {
      participant.localMuted = muted;
    }

    const renderer = this.remoteRenderers.get(id);
    if (renderer) {
      renderer.setMuted(muted);
    }
  }

  /**
   * Update listener position (for spatial audio)
   */
  updateListenerPosition(position: Vector3): void {
    this.listenerPosition = position;

    if (this.context) {
      const listener = this.context.listener;
      listener.positionX.setValueAtTime(position.x, this.context.currentTime);
      listener.positionY.setValueAtTime(position.y, this.context.currentTime);
      listener.positionZ.setValueAtTime(position.z, this.context.currentTime);
    }
  }

  /**
   * Mute/unmute local microphone
   */
  setLocalMuted(muted: boolean): void {
    this.localMuted = muted;

    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        track.enabled = !muted;
      }
    }
  }

  /**
   * Get local muted state
   */
  isLocalMuted(): boolean {
    return this.localMuted;
  }

  /**
   * Get local voice activity state
   */
  getLocalState(): VoiceActivityState {
    return this.localState;
  }

  /**
   * Get current voice level (0-1)
   */
  getVoiceLevel(): number {
    return this.vad?.getLevel() ?? 0;
  }

  /**
   * Get all participants
   */
  getParticipants(): VoiceParticipant[] {
    return Array.from(this.participants.values());
  }

  /**
   * Get participant by ID
   */
  getParticipant(id: string): VoiceParticipant | undefined {
    return this.participants.get(id);
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
          console.error('[VoiceChat] Event listener error:', error);
        }
      }
    }
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.stopCapture();

    for (const [id] of this.remoteRenderers) {
      this.removeParticipant(id);
    }

    if (this.context) {
      this.context.close();
      this.context = null;
    }

    this.listeners.clear();
  }
}

// Singleton instance
let voiceChatInstance: VoiceChat | null = null;

/**
 * Get or create voice chat singleton
 */
export function getVoiceChat(config?: Partial<VoiceChatConfig>): VoiceChat {
  if (!voiceChatInstance) {
    voiceChatInstance = new VoiceChat(config);
  }
  return voiceChatInstance;
}

/**
 * Create a new voice chat instance
 */
export function createVoiceChat(config?: Partial<VoiceChatConfig>): VoiceChat {
  return new VoiceChat(config);
}
