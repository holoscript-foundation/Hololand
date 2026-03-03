/**
 * ReactAgentAvatarBridge
 *
 * The core bridge that connects an AI agent's streaming responses and tool
 * calls to the VR Brittney avatar's expressions, gestures, lip sync, and
 * world interactions. This is the "nervous system" that translates LLM
 * output into embodied avatar behavior.
 *
 * Integration with @ai-sdk/react:
 * - Consumes streaming text deltas from useChat/useCompletion
 * - Maps tool calls to avatar actions via AvatarStudio + HoloScriptAvatarBridge
 * - Provides real-time lip sync pacing from token stream
 * - Detects emotional tone from response text for expression changes
 *
 * Usage:
 * ```typescript
 * const bridge = new ReactAgentAvatarBridge(config);
 * bridge.connectAvatarStudio(studioInstance);
 *
 * // Feed streaming chunks from @ai-sdk/react
 * bridge.onStreamChunk({ textDelta: 'Hello! ' });
 * bridge.onStreamChunk({ textDelta: 'Welcome to ' });
 * bridge.onStreamChunk({ toolCall: { name: 'set_emotion', args: { emotion: 'happy' } } });
 * bridge.onStreamChunk({ textDelta: 'HoloLand!' });
 * bridge.onStreamComplete();
 * ```
 */

import type { AvatarStudio } from '@hololand/avatar-studio';
import type { HoloScriptAvatarBridge } from '@hololand/avatar-studio';

import type {
  AgentState,
  AvatarEmotion,
  AvatarGesture,
  AvatarToolCall,
  AvatarToolName,
  AgentStreamChunk,
  AgentAvatarBridgeConfig,
  StreamToAvatarConfig,
  AgentMessage,
} from './types';

import {
  DEFAULT_AGENT_CONFIG,
  DEFAULT_STREAM_CONFIG,
} from './types';

import { logger } from '../logger';

// =============================================================================
// EMOTION DETECTION
// =============================================================================

/** Simple keyword-based emotion detection for streaming text */
const EMOTION_KEYWORDS: Record<AvatarEmotion, string[]> = {
  neutral: [],
  happy: ['great', 'awesome', 'wonderful', 'love', 'excited', 'amazing', 'fantastic', 'glad', 'happy', 'nice', 'perfect', 'excellent'],
  sad: ['sorry', 'unfortunately', 'sad', 'cannot', "can't", 'regret', 'miss', 'disappoint'],
  angry: ['error', 'wrong', 'broken', 'fail', 'crash', 'frustrat'],
  surprised: ['wow', 'whoa', 'incredible', 'unexpected', 'really', 'seriously', 'no way'],
  thinking: ['hmm', 'let me think', 'consider', 'perhaps', 'maybe', 'wondering', 'interesting'],
  confused: ['unclear', 'confusing', "don't understand", 'what do you mean', 'strange', 'odd'],
  excited: ['amazing', 'incredible', "let's go", 'absolutely', 'brilliant', 'genius', 'breakthrough'],
  empathetic: ['understand', 'feel', 'hear you', 'that sounds', 'must be', 'i get it'],
};

/** Map AvatarEmotion to VRM expression preset names */
const EMOTION_TO_VRM_EXPRESSION: Record<AvatarEmotion, string> = {
  neutral: 'neutral',
  happy: 'happy',
  sad: 'sad',
  angry: 'angry',
  surprised: 'surprised',
  thinking: 'relaxed',    // VRM doesn't have 'thinking', use relaxed as base
  confused: 'surprised',  // Mild surprise works for confusion
  excited: 'happy',       // Amplified happy
  empathetic: 'relaxed',  // Soft, open expression
};

// =============================================================================
// BRIDGE CLASS
// =============================================================================

export class ReactAgentAvatarBridge {
  private config: AgentAvatarBridgeConfig;
  private streamConfig: StreamToAvatarConfig;
  private avatarStudio: AvatarStudio | null = null;
  private holoScriptBridge: HoloScriptAvatarBridge | null = null;

  // State
  private _state: AgentState = 'idle';
  private _emotion: AvatarEmotion = 'neutral';
  private _isStreaming = false;
  private _activeToolCall: AvatarToolCall | null = null;
  private _messages: AgentMessage[] = [];
  private _responseBuffer = '';

  // Lip sync
  private lipSyncQueue: string[] = [];
  private lipSyncTimer: ReturnType<typeof setInterval> | null = null;
  private currentWordIndex = 0;

  // Emotion detection
  private emotionDetectionBuffer = '';
  private lastEmotionCheck = 0;

  // Event listeners
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  constructor(config?: Partial<AgentAvatarBridgeConfig>) {
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
    this.streamConfig = { ...DEFAULT_STREAM_CONFIG, ...config?.streamConfig };

    logger.info('[ReactAgentAvatarBridge] Initialized', {
      model: this.config.modelId,
      tools: this.config.enabledTools,
      lipSync: this.streamConfig.enableLipSync,
    });
  }

  // ===========================================================================
  // CONNECTION
  // ===========================================================================

  /**
   * Connect the bridge to an AvatarStudio instance for expression/gesture control.
   * This enables the bridge to directly manipulate the 3D avatar.
   */
  connectAvatarStudio(studio: AvatarStudio): void {
    this.avatarStudio = studio;
    logger.info('[ReactAgentAvatarBridge] Connected to AvatarStudio');
  }

  /**
   * Connect the HoloScript bridge for generating avatar declarations
   */
  connectHoloScriptBridge(bridge: HoloScriptAvatarBridge): void {
    this.holoScriptBridge = bridge;
    logger.info('[ReactAgentAvatarBridge] Connected to HoloScriptAvatarBridge');
  }

  /**
   * Disconnect from all connected systems
   */
  disconnect(): void {
    this.stopLipSync();
    this.avatarStudio = null;
    this.holoScriptBridge = null;
    this.setState('idle');
    logger.info('[ReactAgentAvatarBridge] Disconnected');
  }

  // ===========================================================================
  // STREAMING INTERFACE (fed by @ai-sdk/react hooks)
  // ===========================================================================

  /**
   * Process a streaming chunk from the AI SDK.
   * This is the primary ingestion point - called for every token/tool event.
   */
  onStreamChunk(chunk: AgentStreamChunk): void {
    if (!this._isStreaming) {
      this._isStreaming = true;
      this.setState('speaking');
      this.emit('stream:start');
    }

    // Handle text delta
    if (chunk.textDelta) {
      this._responseBuffer += chunk.textDelta;

      // Queue words for lip sync
      if (this.streamConfig.enableLipSync) {
        this.queueForLipSync(chunk.textDelta);
      }

      // Check for emotion changes
      if (this.streamConfig.enableEmotionDetection) {
        this.detectEmotionFromStream(chunk.textDelta);
      }

      this.emit('text:delta', chunk.textDelta);
    }

    // Handle tool calls
    if (chunk.toolCall) {
      this.handleToolCall(chunk.toolCall);
    }

    // Handle tool results
    if (chunk.toolResult) {
      this.emit('tool:result', chunk.toolResult);
    }

    // Handle stream completion
    if (chunk.isComplete) {
      this.onStreamComplete();
    }
  }

  /**
   * Signal that the stream has completed
   */
  onStreamComplete(): void {
    this._isStreaming = false;

    // Flush remaining lip sync
    if (this.lipSyncQueue.length > 0) {
      // Let lip sync finish naturally
      setTimeout(() => {
        this.stopLipSync();
        this.setState('idle');
      }, (this.lipSyncQueue.length / this.streamConfig.lipSyncWPS) * 1000);
    } else {
      this.setState('idle');
    }

    // Store the complete message
    const message: AgentMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'assistant',
      content: this._responseBuffer,
      timestamp: Date.now(),
      emotion: this._emotion,
      spoken: this.streamConfig.enableLipSync,
    };

    this._messages.push(message);
    this._responseBuffer = '';
    this.emotionDetectionBuffer = '';

    // Trim history if needed
    if (this._messages.length > this.config.maxHistoryLength) {
      this._messages = this._messages.slice(-this.config.maxHistoryLength);
    }

    this.emit('stream:complete', message);
  }

  /**
   * Add a user message to the conversation
   */
  addUserMessage(content: string): AgentMessage {
    const message: AgentMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    this._messages.push(message);
    this.setState('listening');

    // Transition to thinking after a brief listening pose
    setTimeout(() => {
      if (this._state === 'listening') {
        this.setState('thinking');
      }
    }, 500);

    this.emit('message:user', message);
    return message;
  }

  // ===========================================================================
  // TOOL CALL HANDLING
  // ===========================================================================

  /**
   * Handle a tool call from the agent. Maps AI tool calls to avatar actions.
   */
  private async handleToolCall(toolCall: AvatarToolCall): Promise<void> {
    this._activeToolCall = toolCall;
    this.emit('tool:call', toolCall);

    logger.info('[ReactAgentAvatarBridge] Tool call', {
      name: toolCall.name,
      args: toolCall.args,
    });

    try {
      switch (toolCall.name) {
        case 'set_emotion':
          await this.executeSetEmotion(toolCall.args as any);
          break;

        case 'perform_gesture':
          await this.executeGesture(toolCall.args as any);
          break;

        case 'speak':
          await this.executeSpeak(toolCall.args as any);
          break;

        case 'move_to':
          await this.executeMoveTo(toolCall.args as any);
          break;

        case 'world_action':
          await this.executeWorldAction(toolCall.args as any);
          break;

        case 'change_appearance':
          await this.executeChangeAppearance(toolCall.args as any);
          break;

        case 'look_at':
          await this.executeLookAt(toolCall.args as any);
          break;

        default:
          logger.warn('[ReactAgentAvatarBridge] Unknown tool', { name: toolCall.name });
      }
    } catch (error) {
      logger.error('[ReactAgentAvatarBridge] Tool execution failed', {
        tool: toolCall.name,
        error,
      });
      this.emit('tool:error', { toolCall, error });
    } finally {
      this._activeToolCall = null;
    }
  }

  // ===========================================================================
  // TOOL IMPLEMENTATIONS
  // ===========================================================================

  private async executeSetEmotion(args: {
    emotion: AvatarEmotion;
    intensity?: number;
    duration?: number;
  }): Promise<void> {
    const { emotion, intensity = 1.0, duration = 0 } = args;

    this._emotion = emotion;
    this.applyExpressionToAvatar(emotion, intensity);

    this.emit('emotion:change', { emotion, intensity });

    // Auto-reset after duration if specified
    if (duration > 0) {
      setTimeout(() => {
        this._emotion = 'neutral';
        this.applyExpressionToAvatar('neutral', 1.0);
        this.emit('emotion:change', { emotion: 'neutral', intensity: 1.0 });
      }, duration);
    }
  }

  private async executeGesture(args: {
    gesture: AvatarGesture;
    targetPosition?: { x: number; y: number; z: number };
  }): Promise<void> {
    const { gesture, targetPosition } = args;

    // Emit gesture event for the renderer to animate
    this.emit('gesture:perform', { gesture, targetPosition });

    logger.info('[ReactAgentAvatarBridge] Gesture performed', { gesture });
  }

  private async executeSpeak(args: {
    text: string;
    emotion?: AvatarEmotion;
    speed?: number;
  }): Promise<void> {
    const { text, emotion, speed = 1.0 } = args;

    // Set emotion before speaking
    if (emotion) {
      await this.executeSetEmotion({ emotion });
    }

    this.setState('speaking');

    // Emit for TTS engine to pick up
    this.emit('speech:start', { text, speed });

    // Start lip sync from the text
    if (this.streamConfig.enableLipSync) {
      const words = text.split(/\s+/);
      this.lipSyncQueue.push(...words);
      this.startLipSync();
    }
  }

  private async executeMoveTo(args: {
    position: { x: number; y: number; z: number };
    lookAt?: { x: number; y: number; z: number };
    speed?: 'walk' | 'run' | 'teleport';
  }): Promise<void> {
    this.setState('acting');
    this.emit('movement:start', args);

    logger.info('[ReactAgentAvatarBridge] Moving to', args.position);
  }

  private async executeWorldAction(args: {
    action: 'create' | 'modify' | 'delete';
    holoScript: string;
    explanation?: string;
  }): Promise<void> {
    this.setState('acting');

    // Emit HoloScript for execution
    this.emit('holoscript:execute', {
      action: args.action,
      code: args.holoScript,
      explanation: args.explanation,
    });

    logger.info('[ReactAgentAvatarBridge] World action', {
      action: args.action,
      codeLength: args.holoScript.length,
    });
  }

  private async executeChangeAppearance(args: {
    updates: Record<string, any>;
    explanation?: string;
  }): Promise<void> {
    if (!this.avatarStudio) {
      logger.warn('[ReactAgentAvatarBridge] No AvatarStudio connected for appearance change');
      return;
    }

    // Apply updates through the studio
    const { updates } = args;

    if (updates.body) {
      this.avatarStudio.setBody(updates.body);
    }
    if (updates.face) {
      this.avatarStudio.setFace(updates.face);
    }
    if (updates.hair) {
      this.avatarStudio.setHair(updates.hair);
    }

    this.emit('appearance:change', { updates, explanation: args.explanation });

    logger.info('[ReactAgentAvatarBridge] Appearance changed', {
      keys: Object.keys(updates),
    });
  }

  private async executeLookAt(args: {
    target: 'user' | 'object' | 'direction';
    position?: { x: number; y: number; z: number };
    objectId?: string;
  }): Promise<void> {
    this.emit('gaze:target', args);
    logger.info('[ReactAgentAvatarBridge] Look at', args);
  }

  // ===========================================================================
  // LIP SYNC ENGINE
  // ===========================================================================

  /**
   * Queue text for lip sync processing.
   * Splits streaming text into words and schedules viseme transitions.
   */
  private queueForLipSync(textDelta: string): void {
    // Split on whitespace but preserve partial words
    const parts = textDelta.split(/(\s+)/);

    for (const part of parts) {
      if (part.trim().length > 0) {
        this.lipSyncQueue.push(part.trim());
      }
    }

    // Start the lip sync timer if not already running
    if (!this.lipSyncTimer && this.lipSyncQueue.length > 0) {
      this.startLipSync();
    }
  }

  /**
   * Start the lip sync timer that processes queued words
   */
  private startLipSync(): void {
    if (this.lipSyncTimer) return;

    const intervalMs = 1000 / this.streamConfig.lipSyncWPS;

    this.lipSyncTimer = setInterval(() => {
      if (this.lipSyncQueue.length === 0) {
        this.stopLipSync();
        return;
      }

      const word = this.lipSyncQueue.shift()!;
      const visemes = this.wordToVisemes(word);

      this.emit('lipsync:viseme', {
        word,
        visemes,
        index: this.currentWordIndex++,
      });

      // Apply visemes to VRM expression blend shapes
      this.applyVisemes(visemes);
    }, intervalMs);
  }

  /**
   * Stop the lip sync timer
   */
  private stopLipSync(): void {
    if (this.lipSyncTimer) {
      clearInterval(this.lipSyncTimer);
      this.lipSyncTimer = null;
    }
    this.lipSyncQueue = [];
    this.currentWordIndex = 0;

    // Reset mouth to closed
    this.applyVisemes(['neutral']);
  }

  /**
   * Convert a word to a sequence of viseme codes.
   * This is a simplified phoneme-to-viseme mapping for VRM.
   * A production implementation would use a proper phoneme dictionary.
   */
  private wordToVisemes(word: string): string[] {
    const visemes: string[] = [];
    const lower = word.toLowerCase();

    for (let i = 0; i < lower.length; i++) {
      const char = lower[i];
      switch (char) {
        case 'a':
          visemes.push('aa');
          break;
        case 'e':
          visemes.push('ee');
          break;
        case 'i':
          visemes.push('ih');
          break;
        case 'o':
          visemes.push('oh');
          break;
        case 'u':
          visemes.push('ou');
          break;
        case 'b':
        case 'p':
        case 'm':
          visemes.push('neutral'); // Lips together
          break;
        case 'f':
        case 'v':
          visemes.push('ih'); // Lower lip on upper teeth
          break;
        default:
          // Skip consonants that don't require distinct mouth shapes
          break;
      }
    }

    return visemes.length > 0 ? visemes : ['neutral'];
  }

  /**
   * Apply viseme blend shapes to the VRM avatar via AvatarStudio
   */
  private applyVisemes(visemes: string[]): void {
    if (!this.avatarStudio) return;

    // Apply the first viseme in the sequence (simplified)
    // A production implementation would interpolate between visemes
    const viseme = visemes[0] || 'neutral';

    // Map to VRM expression blend shape weights
    const blendShapeWeights: Record<string, number> = {
      aa: 0,
      ih: 0,
      ou: 0,
      ee: 0,
      oh: 0,
    };

    if (viseme in blendShapeWeights) {
      blendShapeWeights[viseme] = 0.8;
    }

    // Apply through the preview expression API
    this.avatarStudio.previewExpression({
      name: `lipsync-${viseme}`,
      isStandard: false,
      blendShapeWeights,
    });
  }

  // ===========================================================================
  // EMOTION DETECTION
  // ===========================================================================

  /**
   * Analyze streaming text for emotional tone and update avatar expression
   */
  private detectEmotionFromStream(textDelta: string): void {
    this.emotionDetectionBuffer += textDelta;

    // Check at configured intervals
    if (
      this.emotionDetectionBuffer.length - this.lastEmotionCheck
      < this.streamConfig.emotionDetectionInterval
    ) {
      return;
    }

    this.lastEmotionCheck = this.emotionDetectionBuffer.length;

    // Score each emotion based on keyword matches
    const scores: Partial<Record<AvatarEmotion, number>> = {};
    const lowerBuffer = this.emotionDetectionBuffer.toLowerCase();

    for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        if (lowerBuffer.includes(keyword)) {
          score++;
        }
      }
      if (score > 0) {
        scores[emotion as AvatarEmotion] = score;
      }
    }

    // Find the dominant emotion
    let maxScore = 0;
    let detectedEmotion: AvatarEmotion = this._emotion;

    for (const [emotion, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedEmotion = emotion as AvatarEmotion;
      }
    }

    // Only change if significantly different
    if (detectedEmotion !== this._emotion && maxScore >= 2) {
      this._emotion = detectedEmotion;
      this.applyExpressionToAvatar(detectedEmotion, 0.7);
      this.emit('emotion:detected', { emotion: detectedEmotion, confidence: maxScore });
    }
  }

  // ===========================================================================
  // AVATAR EXPRESSION MAPPING
  // ===========================================================================

  /**
   * Apply an emotion as a VRM expression on the avatar
   */
  private applyExpressionToAvatar(emotion: AvatarEmotion, intensity: number): void {
    if (!this.avatarStudio) return;

    const expressionName = EMOTION_TO_VRM_EXPRESSION[emotion];

    // Build blend shape weights for this expression
    const blendShapeWeights: Record<string, number> = {};
    blendShapeWeights[expressionName] = intensity;

    this.avatarStudio.previewExpression({
      name: `agent-${emotion}`,
      isStandard: true,
      blendShapeWeights,
    });
  }

  // ===========================================================================
  // STATE MANAGEMENT
  // ===========================================================================

  private setState(state: AgentState): void {
    const previous = this._state;
    this._state = state;

    if (previous !== state) {
      this.emit('state:change', { previous, current: state });
      logger.debug('[ReactAgentAvatarBridge] State changed', { from: previous, to: state });
    }
  }

  // ===========================================================================
  // PUBLIC GETTERS
  // ===========================================================================

  get state(): AgentState {
    return this._state;
  }

  get emotion(): AvatarEmotion {
    return this._emotion;
  }

  get isStreaming(): boolean {
    return this._isStreaming;
  }

  get activeToolCall(): AvatarToolCall | null {
    return this._activeToolCall;
  }

  get messages(): AgentMessage[] {
    return [...this._messages];
  }

  get responseText(): string {
    return this._responseBuffer;
  }

  // ===========================================================================
  // PUBLIC ACTIONS
  // ===========================================================================

  /**
   * Manually set an emotion on the avatar
   */
  setEmotion(emotion: AvatarEmotion, intensity = 1.0): void {
    this.executeSetEmotion({ emotion, intensity });
  }

  /**
   * Manually trigger a gesture
   */
  triggerGesture(gesture: AvatarGesture): void {
    this.executeGesture({ gesture });
  }

  /**
   * Reset the conversation and avatar state
   */
  reset(): void {
    this.stopLipSync();
    this._messages = [];
    this._responseBuffer = '';
    this._emotion = 'neutral';
    this._isStreaming = false;
    this._activeToolCall = null;
    this.emotionDetectionBuffer = '';
    this.lastEmotionCheck = 0;
    this.setState('idle');
    this.applyExpressionToAvatar('neutral', 1.0);
    this.emit('reset');
  }

  /**
   * Interrupt the current response stream
   */
  interrupt(): void {
    this.stopLipSync();
    this._isStreaming = false;
    this._activeToolCall = null;
    this.setState('idle');
    this.emit('interrupt');
  }

  // ===========================================================================
  // EVENT SYSTEM
  // ===========================================================================

  on(event: string, handler: (...args: any[]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  off(event: string, handler: (...args: any[]) => void): void {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: string, data?: unknown): void {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        logger.error('[ReactAgentAvatarBridge] Event handler error', { event, error });
      }
    });
  }

  // ===========================================================================
  // AI SDK TOOL DEFINITIONS
  // ===========================================================================

  /**
   * Generate the tool definitions object compatible with @ai-sdk/react.
   * These are passed to the useChat/useAgent hook's `tools` parameter.
   *
   * @example
   * ```typescript
   * import { useChat } from '@ai-sdk/react';
   *
   * const bridge = new ReactAgentAvatarBridge(config);
   * const { messages, input, handleSubmit } = useChat({
   *   api: '/api/brittney',
   *   body: { tools: bridge.getToolDefinitions() },
   * });
   * ```
   */
  getToolDefinitions(): Record<string, object> {
    return {
      set_emotion: {
        description: 'Change your avatar facial expression and emotional state',
        parameters: {
          type: 'object',
          properties: {
            emotion: {
              type: 'string',
              enum: ['neutral', 'happy', 'sad', 'angry', 'surprised', 'thinking', 'confused', 'excited', 'empathetic'],
              description: 'The emotion to express',
            },
            intensity: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Intensity of the expression (0.0 to 1.0)',
            },
            duration: {
              type: 'number',
              description: 'Duration in milliseconds (0 = until next emotion)',
            },
          },
          required: ['emotion'],
        },
      },

      perform_gesture: {
        description: 'Perform a physical gesture or body animation',
        parameters: {
          type: 'object',
          properties: {
            gesture: {
              type: 'string',
              enum: ['wave', 'nod', 'shake_head', 'point', 'thumbs_up', 'shrug', 'bow', 'clap', 'think_pose', 'present'],
              description: 'The gesture to perform',
            },
            targetPosition: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                z: { type: 'number' },
              },
              description: 'Optional position to gesture toward',
            },
          },
          required: ['gesture'],
        },
      },

      speak: {
        description: 'Speak text aloud with text-to-speech and lip sync animation',
        parameters: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The text to speak',
            },
            emotion: {
              type: 'string',
              enum: ['neutral', 'happy', 'sad', 'angry', 'surprised', 'thinking', 'excited', 'empathetic'],
              description: 'Emotion to convey while speaking',
            },
            speed: {
              type: 'number',
              minimum: 0.5,
              maximum: 2.0,
              description: 'Speaking speed multiplier',
            },
          },
          required: ['text'],
        },
      },

      move_to: {
        description: 'Move your avatar to a position in the VR world',
        parameters: {
          type: 'object',
          properties: {
            position: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                z: { type: 'number' },
              },
              required: ['x', 'y', 'z'],
              description: 'Target position',
            },
            lookAt: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                z: { type: 'number' },
              },
              description: 'Point to look at after moving',
            },
            speed: {
              type: 'string',
              enum: ['walk', 'run', 'teleport'],
              description: 'Movement speed',
            },
          },
          required: ['position'],
        },
      },

      world_action: {
        description: 'Create, modify, or delete objects in the VR world using HoloScript code',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['create', 'modify', 'delete'],
              description: 'Type of world action',
            },
            holoScript: {
              type: 'string',
              description: 'HoloScript code to execute',
            },
            explanation: {
              type: 'string',
              description: 'Brief explanation of what the code does',
            },
          },
          required: ['action', 'holoScript'],
        },
      },

      look_at: {
        description: 'Direct your gaze toward the user, an object, or a direction',
        parameters: {
          type: 'object',
          properties: {
            target: {
              type: 'string',
              enum: ['user', 'object', 'direction'],
              description: 'What to look at',
            },
            position: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                z: { type: 'number' },
              },
              description: 'Position to look at (for direction/object)',
            },
            objectId: {
              type: 'string',
              description: 'ID of the object to look at',
            },
          },
          required: ['target'],
        },
      },
    };
  }

  /**
   * Build the messages array for the AI SDK, including system prompt.
   * This is used to initialize or seed the useChat hook.
   */
  buildInitialMessages(): Array<{ role: string; content: string }> {
    return [
      {
        role: 'system',
        content: this.config.systemPrompt,
      },
      ...this._messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];
  }
}
