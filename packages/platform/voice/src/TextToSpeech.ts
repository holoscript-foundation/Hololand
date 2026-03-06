/**
 * @hololand/voice - Text-to-Speech
 */

// ============================================================================
// Types
// ============================================================================

export interface TextToSpeechConfig {
  /** Voice identifier */
  voice: string;
  /** Language code */
  language: string;
  /** Speaking rate (0.5-2.0) */
  rate: number;
  /** Pitch adjustment (-20 to 20 semitones, or 0-2 for Web Speech API) */
  pitch: number;
  /** Volume (0-1) */
  volume: number;
  /** Audio encoding for external APIs */
  encoding: 'mp3' | 'wav' | 'ogg' | 'pcm';
  /** Output sample rate */
  sampleRate: number;
}

export interface SpeechOptions extends Partial<TextToSpeechConfig> {
  /** Cancel any current speech */
  cancelPrevious?: boolean;
  /** Priority (higher = more urgent) */
  priority?: number;
  /** Use SSML markup */
  ssml?: boolean;
  /** Callback when speech starts */
  onStart?: () => void;
  /** Callback when speech ends */
  onEnd?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface VoiceInfo {
  /** Voice identifier */
  id: string;
  /** Display name */
  name: string;
  /** Language code */
  language: string;
  /** Gender */
  gender: 'male' | 'female' | 'neutral';
  /** Is local (offline) voice */
  isLocal: boolean;
  /** Is neural/natural voice */
  isNeural: boolean;
  /** Voice provider */
  provider: 'browser' | 'azure' | 'google' | 'amazon' | 'elevenlabs' | 'openai';
}

type TTSEventType = 'start' | 'end' | 'pause' | 'resume' | 'word' | 'error';
type TTSHandler = (event?: { word?: string; charIndex?: number }, error?: Error) => void;

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: TextToSpeechConfig = {
  voice: 'default',
  language: 'en-US',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  encoding: 'mp3',
  sampleRate: 22050,
};

// ============================================================================
// Text to Speech
// ============================================================================

interface QueueItem {
  text: string;
  options: SpeechOptions;
  resolve: () => void;
  reject: (error: Error) => void;
}

/**
 * Cross-platform text-to-speech wrapper
 */
export class TextToSpeech {
  private config: TextToSpeechConfig;
  private queue: QueueItem[] = [];
  private isSpeaking = false;
  private isPaused = false;
  private handlers: Map<TTSEventType, Set<TTSHandler>> = new Map();
  private voiceCache: VoiceInfo[] | null = null;

  constructor(config: Partial<TextToSpeechConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Pre-load voices
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.voiceCache = null;
      };
    }
  }

  /**
   * Check if TTS is supported
   */
  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /**
   * Subscribe to TTS events
   */
  on(event: TTSEventType, handler: TTSHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  /**
   * Remove event handler
   */
  off(event: TTSEventType, handler: TTSHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  /**
   * Speak text
   */
  async speak(text: string, options: SpeechOptions = {}): Promise<void> {
    if (options.cancelPrevious) {
      this.cancel();
    }

    return new Promise<void>((resolve, reject) => {
      const priority = options.priority ?? 0;

      // Insert based on priority
      let insertIndex = this.queue.length;
      for (let i = 0; i < this.queue.length; i++) {
        if ((this.queue[i].options.priority ?? 0) < priority) {
          insertIndex = i;
          break;
        }
      }

      this.queue.splice(insertIndex, 0, { text, options, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Cancel all speech
   */
  cancel(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Reject all queued items
    for (const item of this.queue) {
      item.reject(new Error('Cancelled'));
    }
    this.queue = [];
    this.isSpeaking = false;
    this.isPaused = false;
    // Utterance completed
  }

  /**
   * Pause speech
   */
  pause(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause();
      this.isPaused = true;
      this.emit('pause');
    }
  }

  /**
   * Resume speech
   */
  resume(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume();
      this.isPaused = false;
      this.emit('resume');
    }
  }

  /**
   * Check if speaking
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Check if paused
   */
  getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Get available voices
   */
  getVoices(): VoiceInfo[] {
    if (this.voiceCache) {
      return this.voiceCache;
    }

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return [];
    }

    const voices = window.speechSynthesis.getVoices();
    this.voiceCache = voices.map((voice) => ({
      id: voice.voiceURI,
      name: voice.name,
      language: voice.lang,
      gender: this.inferGender(voice.name),
      isLocal: voice.localService,
      isNeural: voice.name.toLowerCase().includes('neural') || voice.name.toLowerCase().includes('natural'),
      provider: 'browser' as const,
    }));

    return this.voiceCache;
  }

  /**
   * Find voice by criteria
   */
  findVoice(criteria: {
    language?: string;
    gender?: 'male' | 'female' | 'neutral';
    isNeural?: boolean;
    name?: string;
  }): VoiceInfo | undefined {
    const voices = this.getVoices();

    return voices.find((v) => {
      if (criteria.language && !v.language.startsWith(criteria.language.split('-')[0])) {
        return false;
      }
      if (criteria.gender && v.gender !== criteria.gender) {
        return false;
      }
      if (criteria.isNeural !== undefined && v.isNeural !== criteria.isNeural) {
        return false;
      }
      if (criteria.name && !v.name.toLowerCase().includes(criteria.name.toLowerCase())) {
        return false;
      }
      return true;
    });
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TextToSpeechConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): TextToSpeechConfig {
    return { ...this.config };
  }

  private processQueue(): void {
    if (this.isSpeaking || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.isSpeaking = true;
    const mergedConfig = { ...this.config, ...item.options };

    if (!TextToSpeech.isSupported()) {
      console.warn('[TextToSpeech] Not supported in this environment');
      this.isSpeaking = false;
      item.resolve();
      this.processQueue();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(item.text);
    utterance.lang = mergedConfig.language;
    utterance.rate = mergedConfig.rate;
    utterance.pitch = mergedConfig.pitch;
    utterance.volume = mergedConfig.volume;

    // Find and set voice
    if (mergedConfig.voice !== 'default') {
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(
        (v) => v.name === mergedConfig.voice || v.voiceURI === mergedConfig.voice
      );
      if (voice) {
        utterance.voice = voice;
      }
    }

    utterance.onstart = () => {
      this.emit('start');
      item.options.onStart?.();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      // Utterance completed
      this.emit('end');
      item.options.onEnd?.();
      item.resolve();
      this.processQueue();
    };

    utterance.onerror = (event) => {
      this.isSpeaking = false;
      // Utterance completed
      const error = new Error(`TTS error: ${event.error}`);
      this.emit('error', undefined, error);
      item.options.onError?.(error);
      item.reject(error);
      this.processQueue();
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        this.emit('word', { charIndex: event.charIndex });
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  private emit(event: TTSEventType, data?: { word?: string; charIndex?: number }, error?: Error): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data, error);
        } catch (e) {
          console.error('[TextToSpeech] Handler error:', e);
        }
      }
    }
  }

  private inferGender(name: string): 'male' | 'female' | 'neutral' {
    const lower = name.toLowerCase();
    const femaleIndicators = ['female', 'woman', 'girl', 'zira', 'helena', 'samantha', 'karen', 'moira'];
    const maleIndicators = ['male', 'man', 'boy', 'david', 'mark', 'alex', 'daniel'];

    for (const indicator of femaleIndicators) {
      if (lower.includes(indicator)) return 'female';
    }
    for (const indicator of maleIndicators) {
      if (lower.includes(indicator)) return 'male';
    }
    return 'neutral';
  }
}
