/**
 * Voice Input Service for Brittney VR
 * Uses Web Speech API for speech-to-text
 */

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface VoiceServiceConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  wakeWord?: string;
}

type VoiceCallback = (result: VoiceRecognitionResult) => void;
type StatusCallback = (status: 'listening' | 'stopped' | 'error') => void;

const DEFAULT_CONFIG: VoiceServiceConfig = {
  language: 'en-US',
  continuous: true,
  interimResults: true,
  wakeWord: 'brittney',
};

class VoiceService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private config: VoiceServiceConfig;
  private onResultCallbacks: VoiceCallback[] = [];
  private onStatusCallbacks: StatusCallback[] = [];
  private wakeWordActive = false;

  constructor(config: Partial<VoiceServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initRecognition();
  }

  private initRecognition() {
    // Check for browser support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[Voice] Speech recognition not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.config.language;
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;

    // Handle results
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript.trim().toLowerCase();
      const confidence = result[0].confidence;
      const isFinal = result.isFinal;

      // Check for wake word if configured
      if (this.config.wakeWord && !this.wakeWordActive) {
        if (transcript.includes(this.config.wakeWord.toLowerCase())) {
          this.wakeWordActive = true;
          // Remove wake word from transcript
          const command = transcript.replace(this.config.wakeWord.toLowerCase(), '').trim();

          if (command) {
            this.notifyResult({
              transcript: command,
              confidence,
              isFinal,
            });
          }
        }
        return;
      }

      // If wake word was said, process the command
      if (this.wakeWordActive || !this.config.wakeWord) {
        this.notifyResult({
          transcript,
          confidence,
          isFinal,
        });

        // Reset wake word after final result
        if (isFinal) {
          this.wakeWordActive = false;
        }
      }
    };

    // Handle errors
    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[Voice] Recognition error:', event.error);
      this.notifyStatus('error');

      // Restart on recoverable errors
      if (event.error === 'no-speech' || event.error === 'aborted') {
        if (this.isListening) {
          setTimeout(() => this.start(), 100);
        }
      }
    };

    // Handle end
    this.recognition.onend = () => {
      if (this.isListening) {
        // Restart if we should still be listening
        this.recognition?.start();
      } else {
        this.notifyStatus('stopped');
      }
    };
  }

  private notifyResult(result: VoiceRecognitionResult) {
    this.onResultCallbacks.forEach((cb) => cb(result));
  }

  private notifyStatus(status: 'listening' | 'stopped' | 'error') {
    this.onStatusCallbacks.forEach((cb) => cb(status));
  }

  /**
   * Check if voice recognition is supported
   */
  isSupported(): boolean {
    return this.recognition !== null;
  }

  /**
   * Start listening for voice input
   */
  start(): boolean {
    if (!this.recognition) return false;

    try {
      this.isListening = true;
      this.recognition.start();
      this.notifyStatus('listening');
      return true;
    } catch (error) {
      console.error('[Voice] Failed to start:', error);
      return false;
    }
  }

  /**
   * Stop listening
   */
  stop() {
    if (!this.recognition) return;

    this.isListening = false;
    this.wakeWordActive = false;
    this.recognition.stop();
    this.notifyStatus('stopped');
  }

  /**
   * Toggle listening state
   */
  toggle(): boolean {
    if (this.isListening) {
      this.stop();
      return false;
    } else {
      return this.start();
    }
  }

  /**
   * Register callback for voice results
   */
  onResult(callback: VoiceCallback): () => void {
    this.onResultCallbacks.push(callback);
    return () => {
      this.onResultCallbacks = this.onResultCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Register callback for status changes
   */
  onStatus(callback: StatusCallback): () => void {
    this.onStatusCallbacks.push(callback);
    return () => {
      this.onStatusCallbacks = this.onStatusCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Get current listening state
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Disable wake word requirement (always listen)
   */
  disableWakeWord() {
    this.config.wakeWord = undefined;
  }

  /**
   * Enable wake word requirement
   */
  enableWakeWord(word: string = 'brittney') {
    this.config.wakeWord = word;
    this.wakeWordActive = false;
  }
}

// Singleton instance
let voiceServiceInstance: VoiceService | null = null;

export function getVoiceService(config?: Partial<VoiceServiceConfig>): VoiceService {
  if (!voiceServiceInstance) {
    voiceServiceInstance = new VoiceService(config);
  }
  return voiceServiceInstance;
}

export function destroyVoiceService() {
  if (voiceServiceInstance) {
    voiceServiceInstance.stop();
    voiceServiceInstance = null;
  }
}

/**
 * Text-to-speech for Brittney responses
 */
export function speak(text: string, options?: { rate?: number; pitch?: number; voice?: string }) {
  if (!('speechSynthesis' in window)) {
    console.warn('[Voice] Speech synthesis not supported');
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options?.rate ?? 1;
  utterance.pitch = options?.pitch ?? 1;

  // Try to find a female voice for Brittney
  const voices = speechSynthesis.getVoices();
  const preferredVoice = voices.find(
    (v) =>
      v.name.toLowerCase().includes('female') ||
      v.name.toLowerCase().includes('samantha') ||
      v.name.toLowerCase().includes('google us english')
  );

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  speechSynthesis.speak(utterance);
}

/**
 * Cancel any ongoing speech
 */
export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
}
