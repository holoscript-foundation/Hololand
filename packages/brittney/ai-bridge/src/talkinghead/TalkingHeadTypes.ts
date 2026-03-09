/**
 * TalkingHead Integration Types
 *
 * Type definitions for the @met4citizen/talkinghead library integration
 * with the HoloLand Brittney avatar system. These types provide a
 * type-safe bridge between TalkingHead's JavaScript API and the
 * TypeScript-first HoloLand ecosystem.
 *
 * Security: No API keys or credentials stored in types.
 * All secrets must flow via environment variables or secure JWT providers.
 *
 * @module TalkingHeadTypes
 */

// =============================================================================
// OCULUS VISEME SYSTEM (15 Standard Visemes)
// =============================================================================

/**
 * Oculus OVR Viseme IDs (0-14).
 * TalkingHead uses these internally for lip-sync blend shape targeting.
 * These map directly to morph targets on compatible GLB avatars.
 */
export type OculusVisemeId =
  | 0   // sil (silence)
  | 1   // PP
  | 2   // FF
  | 3   // TH
  | 4   // DD
  | 5   // kk
  | 6   // CH
  | 7   // SS
  | 8   // nn
  | 9   // RR
  | 10  // aa
  | 11  // E
  | 12  // IH
  | 13  // Oh
  | 14; // OO

/**
 * Oculus viseme code names matching the 15 standard visemes.
 */
export type OculusVisemeCode =
  | 'sil' | 'PP' | 'FF' | 'TH' | 'DD' | 'kk' | 'CH'
  | 'SS' | 'nn' | 'RR' | 'aa' | 'E' | 'IH' | 'Oh' | 'OO';

/**
 * Map from numeric viseme ID to string code.
 */
export const VISEME_ID_TO_CODE: Record<OculusVisemeId, OculusVisemeCode> = {
  0: 'sil',
  1: 'PP',
  2: 'FF',
  3: 'TH',
  4: 'DD',
  5: 'kk',
  6: 'CH',
  7: 'SS',
  8: 'nn',
  9: 'RR',
  10: 'aa',
  11: 'E',
  12: 'IH',
  13: 'Oh',
  14: 'OO',
};

/**
 * Map from string code to numeric viseme ID.
 */
export const VISEME_CODE_TO_ID: Record<OculusVisemeCode, OculusVisemeId> = {
  sil: 0,
  PP: 1,
  FF: 2,
  TH: 3,
  DD: 4,
  kk: 5,
  CH: 6,
  SS: 7,
  nn: 8,
  RR: 9,
  aa: 10,
  E: 11,
  IH: 12,
  Oh: 13,
  OO: 14,
};

// =============================================================================
// MOOD SYSTEM
// =============================================================================

/**
 * TalkingHead supported mood states.
 * These map to blend shape presets on the avatar model.
 */
export type TalkingHeadMood =
  | 'neutral'
  | 'happy'
  | 'angry'
  | 'sad'
  | 'fear'
  | 'disgust'
  | 'love'
  | 'sleep';

// =============================================================================
// CAMERA VIEWS
// =============================================================================

/**
 * Camera framing presets for the TalkingHead avatar.
 */
export type TalkingHeadCameraView = 'full' | 'mid' | 'upper' | 'head';

// =============================================================================
// LIP-SYNC LANGUAGE SUPPORT
// =============================================================================

/**
 * Languages supported by TalkingHead's built-in phoneme-to-viseme engine.
 */
export type TalkingHeadLipSyncLang = 'en' | 'de' | 'fr' | 'fi' | 'lt';

// =============================================================================
// TTS CONFIGURATION
// =============================================================================

/**
 * Text-to-speech configuration for TalkingHead.
 * Uses Google Cloud TTS by default but can integrate with external TTS.
 */
export interface TalkingHeadTTSConfig {
  /** Language code (e.g., "en-US", "fi-FI") */
  ttsLang: string;
  /** Voice identifier (e.g., "en-US-Neural2-F") */
  ttsVoice: string;
  /** Speech rate [0.25 - 4.0] */
  ttsRate: number;
  /** Pitch adjustment [-20.0 to 20.0] */
  ttsPitch: number;
  /** Volume in dB [-96.0 to 16.0] */
  ttsVolume: number;
  /** Viseme sequence start offset in ms */
  ttsTrimStart: number;
  /** Viseme sequence end offset in ms */
  ttsTrimEnd: number;
}

/**
 * Default Brittney TTS configuration.
 * Uses English Neural2 female voice optimized for clarity.
 */
export const DEFAULT_BRITTNEY_TTS_CONFIG: TalkingHeadTTSConfig = {
  ttsLang: 'en-US',
  ttsVoice: 'en-US-Neural2-F',
  ttsRate: 1.0,
  ttsPitch: 0,
  ttsVolume: 0,
  ttsTrimStart: 0,
  ttsTrimEnd: 300,
};

// =============================================================================
// AUDIO DATA STRUCTURES
// =============================================================================

/**
 * Pre-recorded audio with word/viseme timing for speakAudio().
 * This is the primary interface for feeding audio with lip-sync data
 * from external TTS engines (ElevenLabs, Azure, etc.).
 */
export interface TalkingHeadAudioData {
  /** AudioBuffer or array of PCM 16-bit LE chunks */
  audio: AudioBuffer | Int16Array[];
  /** Array of words in the utterance */
  words: string[];
  /** Word starting times in milliseconds */
  wtimes: number[];
  /** Word durations in milliseconds */
  wdurations: number[];
  /** Optional: Oculus viseme IDs (0-14) for each viseme event */
  visemes?: OculusVisemeId[];
  /** Viseme starting times in ms */
  vtimes?: number[];
  /** Viseme durations in ms */
  vdurations?: number[];
  /** Optional timed callback markers */
  markers?: string[];
  /** Marker times in ms */
  mtimes?: number[];
}

/**
 * Streaming audio configuration for real-time TTS playback.
 */
export interface TalkingHeadStreamConfig {
  /** PCM sample rate (default: 22050 Hz) */
  pcmSampleRate: number;
  /** Callbacks for streaming events */
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
  onSubtitles?: (text: string) => void;
  onMetrics?: (metrics: StreamingMetrics) => void;
}

/**
 * Metrics from the streaming audio pipeline.
 */
export interface StreamingMetrics {
  /** Total audio chunks received */
  chunksReceived: number;
  /** Total audio duration in seconds */
  totalDurationSec: number;
  /** Latency from first chunk to first audio output (ms) */
  firstChunkLatencyMs: number;
  /** Average viseme accuracy (0-1) */
  visemeAccuracy: number;
}

// =============================================================================
// AVATAR CONFIGURATION
// =============================================================================

/**
 * Avatar model specification for TalkingHead.showAvatar().
 * The avatar must have ARKit + Oculus viseme blend shapes.
 */
export interface TalkingHeadAvatarSpec {
  /** URL to the GLB avatar file */
  url: string;
  /** Body type: "M" (male) or "F" (female) */
  body: 'M' | 'F';
  /** Initial mood */
  avatarMood?: TalkingHeadMood;
  /** Blend shape baseline adjustments */
  baseline?: Record<string, number>;
  /** Skeleton retargeting adjustments (for non-standard rigs) */
  retarget?: Record<string, { x?: number; y?: number; z?: number }>;
  /** Lip-sync language for this avatar */
  lipsyncLang?: TalkingHeadLipSyncLang;
  /** Per-avatar TTS overrides */
  ttsLang?: string;
  ttsVoice?: string;
  ttsRate?: number;
  ttsPitch?: number;
  ttsVolume?: number;
  /** Eye contact proportion while idle [0-1] */
  avatarIdleEyeContact?: number;
  /** Head movement proportion while idle [0-1] */
  avatarIdleHeadMove?: number;
  /** Eye contact while speaking [0-1] */
  avatarSpeakingEyeContact?: number;
  /** Head movement while speaking [0-1] */
  avatarSpeakingHeadMove?: number;
}

/**
 * Default Brittney avatar specification.
 * Uses female body type with high eye contact for customer service persona.
 */
export const DEFAULT_BRITTNEY_AVATAR_SPEC: TalkingHeadAvatarSpec = {
  url: '/avatars/brittney.glb',
  body: 'F',
  avatarMood: 'happy',
  lipsyncLang: 'en',
  avatarIdleEyeContact: 0.6,
  avatarIdleHeadMove: 0.4,
  avatarSpeakingEyeContact: 0.7,
  avatarSpeakingHeadMove: 0.5,
};

// =============================================================================
// CONSTRUCTOR OPTIONS
// =============================================================================

/**
 * Complete configuration for the TalkingHead class constructor.
 * Only essential fields are required; all others have sensible defaults.
 */
export interface TalkingHeadConstructorOptions {
  /** JWT provider function for TTS authentication (recommended) */
  jwtGet?: () => Promise<string>;
  /** TTS proxy endpoint URL (preferred over direct API key) */
  ttsEndpoint?: string;
  /** TTS API key (NOT recommended for production - use jwtGet instead) */
  ttsApikey?: string;

  // TTS defaults
  ttsLang?: string;
  ttsVoice?: string;
  ttsRate?: number;
  ttsPitch?: number;
  ttsVolume?: number;
  ttsTrimStart?: number;
  ttsTrimEnd?: number;

  // Lip-sync
  lipsyncModules?: TalkingHeadLipSyncLang[];
  lipsyncLang?: TalkingHeadLipSyncLang;
  pcmSampleRate?: number;

  // Audio mixer
  mixerGainSpeech?: number;
  mixerGainBackground?: number;
  audioCtx?: AudioContext;

  // 3D model
  modelRoot?: string;
  modelPixelRatio?: number;
  modelFPS?: number;
  modelMovementFactor?: number;

  // Camera
  cameraView?: TalkingHeadCameraView;
  cameraDistance?: number;
  cameraX?: number;
  cameraY?: number;
  cameraRotateX?: number;
  cameraRotateY?: number;
  cameraRotateEnable?: boolean;
  cameraPanEnable?: boolean;
  cameraZoomEnable?: boolean;

  // Lighting
  lightAmbientColor?: number | string;
  lightAmbientIntensity?: number;
  lightDirectColor?: number | string;
  lightDirectIntensity?: number;
  lightDirectPhi?: number;
  lightDirectTheta?: number;
  lightSpotColor?: number | string;
  lightSpotIntensity?: number;

  // Avatar behavior
  avatarMood?: TalkingHeadMood;
  avatarMute?: boolean;
  avatarIdleEyeContact?: number;
  avatarIdleHeadMove?: number;
  avatarSpeakingEyeContact?: number;
  avatarSpeakingHeadMove?: number;
  avatarIgnoreCamera?: boolean;

  // Advanced: headless/embedded mode
  avatarOnly?: boolean;
  avatarOnlyScene?: unknown;
  avatarOnlyCamera?: unknown;
  update?: (timestamp: number) => void;
  statsNode?: HTMLElement;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Events emitted by TalkingHead during operation.
 */
export type TalkingHeadEventType =
  | 'ttsstart'       // TTS audio starts playing
  | 'ttsend'         // TTS audio ends
  | 'ttsword'        // New word being spoken
  | 'ttsviseme'      // Viseme change during speech
  | 'ttsmarker'      // Custom marker reached
  | 'animstart'      // Animation started
  | 'animend'        // Animation ended
  | 'silencestart'   // Silence detected (listening mode)
  | 'silenceend'     // Silence ended
  | 'maxsilence'     // Maximum silence reached
  | 'activestart'    // Active speech detected
  | 'activeend'      // Active speech ended
  | 'maxactive';     // Maximum active duration reached

/**
 * Event data payloads for TalkingHead events.
 */
export interface TalkingHeadEventMap {
  ttsstart: void;
  ttsend: void;
  ttsword: { word: string; time: number };
  ttsviseme: { visemeId: OculusVisemeId; time: number; duration: number };
  ttsmarker: { marker: string };
  animstart: void;
  animend: void;
  silencestart: void;
  silenceend: void;
  maxsilence: void;
  activestart: void;
  activeend: void;
  maxactive: void;
}

// =============================================================================
// SPEAK OPTIONS
// =============================================================================

/**
 * Options for speakText() per-call overrides.
 */
export interface TalkingHeadSpeakOptions {
  ttsLang?: string;
  ttsVoice?: string;
  ttsRate?: number;
  ttsPitch?: number;
  ttsVolume?: number;
  avatarMood?: TalkingHeadMood;
  avatarMute?: boolean;
  lipsyncLang?: TalkingHeadLipSyncLang;
}

// =============================================================================
// VISEME-TO-VRM BLEND SHAPE MAPPING
// =============================================================================

/**
 * Maps Oculus viseme codes to VRM-compatible blend shape names and weights.
 * Used to translate TalkingHead's Oculus visemes into HoloLand's VRM
 * expression system (used by AvatarStudio.previewExpression()).
 */
export interface VisemeBlendShapeMapping {
  /** Primary blend shape name */
  primary: string;
  /** Primary blend shape weight (0-1) */
  primaryWeight: number;
  /** Optional secondary blend shape for more natural transitions */
  secondary?: string;
  /** Secondary weight (0-1) */
  secondaryWeight?: number;
}

/**
 * Default mapping from Oculus visemes to VRM jaw/mouth blend shapes.
 * These target the standard VRM blend shape proxy names.
 */
export const VISEME_TO_VRM_BLEND_SHAPES: Record<OculusVisemeCode, VisemeBlendShapeMapping> = {
  sil:  { primary: 'viseme_sil', primaryWeight: 0.0 },
  PP:   { primary: 'viseme_PP', primaryWeight: 0.9, secondary: 'viseme_sil', secondaryWeight: 0.1 },
  FF:   { primary: 'viseme_FF', primaryWeight: 0.85 },
  TH:   { primary: 'viseme_TH', primaryWeight: 0.8 },
  DD:   { primary: 'viseme_DD', primaryWeight: 0.75, secondary: 'viseme_nn', secondaryWeight: 0.2 },
  kk:   { primary: 'viseme_kk', primaryWeight: 0.7 },
  CH:   { primary: 'viseme_CH', primaryWeight: 0.8 },
  SS:   { primary: 'viseme_SS', primaryWeight: 0.75 },
  nn:   { primary: 'viseme_nn', primaryWeight: 0.65 },
  RR:   { primary: 'viseme_RR', primaryWeight: 0.7 },
  aa:   { primary: 'viseme_aa', primaryWeight: 0.9 },
  E:    { primary: 'viseme_E', primaryWeight: 0.85 },
  IH:   { primary: 'viseme_I', primaryWeight: 0.75 },
  Oh:   { primary: 'viseme_O', primaryWeight: 0.85 },
  OO:   { primary: 'viseme_U', primaryWeight: 0.9 },
};

/**
 * Simplified mapping for avatars that use the basic VRM
 * vowel set (aa, ih, ou, ee, oh) instead of full Oculus visemes.
 * Falls back to nearest vowel approximation.
 */
export const VISEME_TO_SIMPLE_VRM: Record<OculusVisemeCode, { shape: string; weight: number }> = {
  sil:  { shape: 'neutral', weight: 0.0 },
  PP:   { shape: 'neutral', weight: 0.1 },  // Lips together
  FF:   { shape: 'ih', weight: 0.5 },       // Lower lip on teeth
  TH:   { shape: 'ee', weight: 0.4 },       // Tongue between teeth
  DD:   { shape: 'aa', weight: 0.3 },       // Tongue on alveolar ridge
  kk:   { shape: 'aa', weight: 0.2 },       // Back of tongue raised
  CH:   { shape: 'ee', weight: 0.5 },       // Tongue near palate
  SS:   { shape: 'ee', weight: 0.3 },       // Teeth nearly closed
  nn:   { shape: 'aa', weight: 0.2 },       // Tongue on alveolar ridge
  RR:   { shape: 'oh', weight: 0.4 },       // Lips slightly rounded
  aa:   { shape: 'aa', weight: 0.9 },       // Wide open
  E:    { shape: 'ee', weight: 0.8 },       // Mid front
  IH:   { shape: 'ih', weight: 0.7 },       // High front
  Oh:   { shape: 'oh', weight: 0.8 },       // Mid back rounded
  OO:   { shape: 'ou', weight: 0.9 },       // High back rounded
};

// =============================================================================
// INTEGRATION CONFIGURATION
// =============================================================================

/**
 * Configuration for the TalkingHead-to-HoloLand integration adapter.
 */
export interface TalkingHeadIntegrationConfig {
  /** Whether to use TalkingHead's built-in Three.js scene or embed in HoloLand's */
  renderMode: 'standalone' | 'embedded';
  /** Use full Oculus viseme set or simplified VRM vowels */
  visemeMode: 'oculus' | 'simple';
  /** Enable TalkingHead's built-in TTS or use external TTS pipeline */
  ttsMode: 'builtin' | 'external';
  /** Enable audio streaming for real-time responses */
  enableStreaming: boolean;
  /** Maximum queue depth for speech requests (prevents memory bloat) */
  maxSpeechQueueDepth: number;
  /** Whether to enable emotion-to-mood mapping */
  enableMoodSync: boolean;
  /** Frame budget for viseme updates (ms). Must be < 11.1ms for 90Hz VR */
  visemeUpdateBudgetMs: number;
  /** Smoothing factor for viseme transitions [0-1]. Higher = smoother but laggier */
  visemeSmoothingFactor: number;
  /** Whether to use the HeadAudio worklet for real-time viseme detection */
  useHeadAudioWorklet: boolean;
}

/**
 * Default integration configuration optimized for VR at 90Hz.
 */
export const DEFAULT_INTEGRATION_CONFIG: TalkingHeadIntegrationConfig = {
  renderMode: 'embedded',
  visemeMode: 'oculus',
  ttsMode: 'external',
  enableStreaming: true,
  maxSpeechQueueDepth: 16,
  enableMoodSync: true,
  visemeUpdateBudgetMs: 2.0, // Well within 11.1ms frame budget
  visemeSmoothingFactor: 0.3,
  useHeadAudioWorklet: false,
};

// =============================================================================
// ADAPTER STATE
// =============================================================================

/**
 * Internal state of the TalkingHead adapter.
 */
export interface TalkingHeadAdapterState {
  /** Whether the TalkingHead instance is initialized */
  initialized: boolean;
  /** Whether an avatar is currently loaded */
  avatarLoaded: boolean;
  /** Whether the avatar is currently speaking */
  isSpeaking: boolean;
  /** Whether audio is being streamed */
  isStreaming: boolean;
  /** Current mood of the avatar */
  currentMood: TalkingHeadMood;
  /** Current active viseme */
  currentViseme: OculusVisemeCode;
  /** Number of queued speech items */
  speechQueueDepth: number;
  /** Timestamp of last viseme update */
  lastVisemeUpdateMs: number;
}

/**
 * Metrics for monitoring TalkingHead adapter performance.
 */
export interface TalkingHeadAdapterMetrics {
  /** Total speech requests processed */
  totalSpeechRequests: number;
  /** Total viseme updates applied */
  totalVisemeUpdates: number;
  /** Average viseme update latency (ms) */
  avgVisemeLatencyMs: number;
  /** Peak viseme update latency (ms) */
  peakVisemeLatencyMs: number;
  /** Number of dropped viseme updates (budget exceeded) */
  droppedVisemeUpdates: number;
  /** Total audio duration played (seconds) */
  totalAudioDurationSec: number;
  /** Number of mood changes */
  totalMoodChanges: number;
  /** Average speech queue depth */
  avgSpeechQueueDepth: number;
}
