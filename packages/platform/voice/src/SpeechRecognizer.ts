/**
 * @hololand/voice - Speech Recognition
 */

// ============================================================================
// Types
// ============================================================================

export interface RecognitionResult {
  /** Transcribed text */
  transcript: string;
  /** Is this a final result? */
  isFinal: boolean;
  /** Confidence score (0-1) */
  confidence: number;
  /** Alternative transcriptions */
  alternatives?: Array<{ transcript: string; confidence: number }>;
  /** Language code */
  language: string;
  /** Start time offset (ms) */
  startTime: number;
  /** End time offset (ms) */
  endTime: number;
}

export interface SpeechRecognizerConfig {
  /** Language code (e.g., 'en-US') */
  language: string;
  /** Enable continuous recognition */
  continuous: boolean;
  /** Return interim results */
  interimResults: boolean;
  /** Maximum alternatives to return */
  maxAlternatives: number;
  /** Custom vocabulary/phrases to boost */
  hints?: string[];
  /** Enable profanity filter */
  profanityFilter: boolean;
  /** Enable automatic punctuation */
  enablePunctuation: boolean;
  /** Audio sample rate (Hz) */
  sampleRate: number;
  /** Silence timeout before auto-stop (ms) */
  silenceTimeout: number;
}

export type RecognitionEventType =
  | 'start'
  | 'end'
  | 'result'
  | 'error'
  | 'soundstart'
  | 'soundend'
  | 'speechstart'
  | 'speechend';

type RecognitionHandler = (result?: RecognitionResult, error?: Error) => void;

// Web Speech API type declarations
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  grammars?: unknown;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onsoundstart: (() => void) | null;
  onsoundend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare let SpeechRecognition: {
  new (): SpeechRecognition;
};

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: SpeechRecognizerConfig = {
  language: 'en-US',
  continuous: true,
  interimResults: true,
  maxAlternatives: 3,
  profanityFilter: false,
  enablePunctuation: true,
  sampleRate: 16000,
  silenceTimeout: 5000,
};

// ============================================================================
// Speech Recognizer
// ============================================================================

/**
 * Cross-platform speech recognition wrapper
 */
export class SpeechRecognizer {
  private config: SpeechRecognizerConfig;
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private handlers: Map<RecognitionEventType, Set<RecognitionHandler>> = new Map();
  private resultHistory: RecognitionResult[] = [];
  private startTime = 0;

  constructor(config: Partial<SpeechRecognizerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if speech recognition is supported
   */
  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  }

  /**
   * Subscribe to recognition events
   */
  on(event: RecognitionEventType, handler: RecognitionHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  /**
   * Remove event handler
   */
  off(event: RecognitionEventType, handler: RecognitionHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  /**
   * Start listening for speech
   */
  async start(): Promise<void> {
    if (this.isListening) {
      console.warn('[SpeechRecognizer] Already listening');
      return;
    }

    if (!SpeechRecognizer.isSupported()) {
      throw new Error('Speech recognition not supported');
    }

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognitionAPI() as SpeechRecognition;
    recognition.lang = this.config.language;
    recognition.continuous = this.config.continuous;
    recognition.interimResults = this.config.interimResults;
    recognition.maxAlternatives = this.config.maxAlternatives;

    // Apply hints if supported
    if (this.config.hints && (recognition as any).grammars) {
      // Note: Grammar support varies by browser
      console.log('[SpeechRecognizer] Hints configured:', this.config.hints.length);
    }

    this.recognition = recognition;
    this.setupEventHandlers();
    this.startTime = Date.now();
    recognition.start();
    this.isListening = true;
    this.emit('start');
  }

  /**
   * Stop listening
   */
  stop(): void {
    if (!this.isListening || !this.recognition) {
      return;
    }

    this.isListening = false;
    this.recognition.stop();
    this.recognition = null;
    this.emit('end');
  }

  /**
   * Abort recognition (discards pending results)
   */
  abort(): void {
    if (!this.recognition) return;

    this.isListening = false;
    this.recognition.abort();
    this.recognition = null;
    this.emit('end');
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Get result history
   */
  getHistory(): RecognitionResult[] {
    return [...this.resultHistory];
  }

  /**
   * Clear result history
   */
  clearHistory(): void {
    this.resultHistory = [];
  }

  /**
   * Update configuration (requires restart)
   */
  updateConfig(config: Partial<SpeechRecognizerConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.isListening) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): SpeechRecognizerConfig {
    return { ...this.config };
  }

  private setupEventHandlers(): void {
    if (!this.recognition) return;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const isFinal = result.isFinal;
        const confidence = result[0].confidence;

        // Build alternatives array
        const alternatives: Array<{ transcript: string; confidence: number }> = [];
        for (let j = 0; j < result.length; j++) {
          alternatives.push({
            transcript: result[j].transcript,
            confidence: result[j].confidence,
          });
        }

        const recognitionResult: RecognitionResult = {
          transcript,
          isFinal,
          confidence,
          language: this.config.language,
          startTime: this.startTime,
          endTime: Date.now(),
          alternatives,
        };

        if (isFinal) {
          this.resultHistory.push(recognitionResult);
        }

        this.emit('result', recognitionResult);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const error = new Error(`Speech recognition error: ${event.error}`);
      this.emit('error', undefined, error);

      // Handle recoverable errors
      if (event.error === 'no-speech' || event.error === 'aborted') {
        // These are often recoverable
        if (this.config.continuous && this.isListening) {
          try {
            this.recognition?.start();
          } catch (e) {
            // Already started or other issue
          }
        }
      }
    };

    this.recognition.onend = () => {
      // Auto-restart for continuous mode
      if (this.config.continuous && this.isListening) {
        try {
          this.recognition?.start();
        } catch (e) {
          this.isListening = false;
          this.emit('end');
        }
      } else {
        this.isListening = false;
        this.emit('end');
      }
    };

    this.recognition.onsoundstart = () => {
      this.emit('soundstart');
    };

    this.recognition.onsoundend = () => {
      this.emit('soundend');
    };

    this.recognition.onspeechstart = () => {
      this.emit('speechstart');
    };

    this.recognition.onspeechend = () => {
      this.emit('speechend');
    };
  }

  private emit(event: RecognitionEventType, result?: RecognitionResult, error?: Error): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(result, error);
        } catch (e) {
          console.error('[SpeechRecognizer] Handler error:', e);
        }
      }
    }
  }
}
