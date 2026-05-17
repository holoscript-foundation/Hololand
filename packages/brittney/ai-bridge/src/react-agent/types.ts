/**
 * React Agent SDK Integration Types
 *
 * Type definitions for bridging Vercel's @ai-sdk/react agent framework
 * with the HoloLand VR Brittney avatar system. This enables a reactive,
 * streaming AI agent that can control avatar expressions, gestures,
 * speech, and world interactions in real-time VR environments.
 *
 * Architecture:
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │                    React Component Tree                             │
 * │  ┌────────────────────────────────────────────────────────────────┐ │
 * │  │  VRAvatarAgentProvider (context)                               │ │
 * │  │  ┌────────────────┐  ┌───────────────┐  ┌──────────────────┐ │ │
 * │  │  │ useAvatarAgent │  │ useChat (ai)  │  │ Avatar Studio    │ │ │
 * │  │  │ (orchestrator) │◄─┤ streaming     │  │ (VRM rendering)  │ │ │
 * │  │  └───────┬────────┘  └───────────────┘  └────────▲─────────┘ │ │
 * │  │          │                                        │           │ │
 * │  │          ▼                                        │           │ │
 * │  │  ┌──────────────────────────────────────────────┐ │           │ │
 * │  │  │  ReactAgentAvatarBridge                      │ │           │ │
 * │  │  │  - maps tool calls → avatar actions          ├─┘           │ │
 * │  │  │  - maps streaming text → lip sync            │             │ │
 * │  │  │  - maps emotions → expressions               │             │ │
 * │  │  └──────────────────────────────────────────────┘             │ │
 * │  └────────────────────────────────────────────────────────────────┘ │
 * └──────────────────────────────────────────────────────────────────────┘
 */

import type { AvatarBlueprint } from '@hololand/avatar-studio';

// =============================================================================
// AGENT STATE
// =============================================================================

/** The agent's current behavioral state in the VR world */
export type AgentState =
  | 'idle' // Standing, slight idle animation
  | 'listening' // Ears perked, leaning forward slightly
  | 'thinking' // Hand on chin, looking up
  | 'speaking' // Mouth moving (lip sync active)
  | 'acting' // Performing a tool-called action
  | 'error' // Confused expression, error recovery pose
  | 'greeting' // Waving hello
  | 'farewell'; // Waving goodbye

/** Emotion tags that map to VRM expression blend shapes */
export type AvatarEmotion =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'thinking'
  | 'confused'
  | 'excited'
  | 'empathetic';

/** A gesture the avatar can perform */
export type AvatarGesture =
  | 'wave'
  | 'nod'
  | 'shake_head'
  | 'point'
  | 'thumbs_up'
  | 'shrug'
  | 'bow'
  | 'clap'
  | 'think_pose'
  | 'present'; // Gesturing toward something

// =============================================================================
// TOOL DEFINITIONS FOR AGENT
// =============================================================================

/**
 * Tools the AI agent can call to control the VR avatar and world.
 * These map to @ai-sdk tool definitions that get registered with the LLM.
 */
export interface AvatarAgentTools {
  /** Change avatar expression/emotion */
  set_emotion: {
    emotion: AvatarEmotion;
    intensity?: number; // 0.0 - 1.0, default 1.0
    duration?: number; // ms, 0 = until next emotion
  };

  /** Perform a gesture animation */
  perform_gesture: {
    gesture: AvatarGesture;
    targetPosition?: { x: number; y: number; z: number };
  };

  /** Speak with text-to-speech and lip sync */
  speak: {
    text: string;
    emotion?: AvatarEmotion;
    speed?: number; // 0.5 - 2.0
  };

  /** Move avatar to a position in the world */
  move_to: {
    position: { x: number; y: number; z: number };
    lookAt?: { x: number; y: number; z: number };
    speed?: 'walk' | 'run' | 'teleport';
  };

  /** Create or modify an object in the world via HoloScript */
  world_action: {
    action: 'create' | 'modify' | 'delete';
    holoScript: string;
    explanation?: string;
  };

  /** Change the avatar's outfit or appearance */
  change_appearance: {
    updates: Partial<AvatarBlueprint>;
    explanation?: string;
  };

  /** Look at a specific point or user */
  look_at: {
    target: 'user' | 'object' | 'direction';
    position?: { x: number; y: number; z: number };
    objectId?: string;
  };
}

/** Union type for tool call names */
export type AvatarToolName = keyof AvatarAgentTools;

/** A resolved tool call with arguments */
export interface AvatarToolCall<T extends AvatarToolName = AvatarToolName> {
  name: T;
  args: AvatarAgentTools[T];
  id: string;
}

// =============================================================================
// STREAMING INTEGRATION
// =============================================================================

/** Represents a chunk of streaming agent response for avatar reactivity */
export interface AgentStreamChunk {
  /** The raw text delta */
  textDelta?: string;
  /** Tool call being invoked */
  toolCall?: AvatarToolCall;
  /** Tool result returned */
  toolResult?: {
    toolCallId: string;
    result: unknown;
  };
  /** Whether this is the final chunk */
  isComplete: boolean;
}

/** Configuration for how streaming text maps to avatar behavior */
export interface StreamToAvatarConfig {
  /** Enable real-time lip sync from streaming text */
  enableLipSync: boolean;
  /** Words-per-second for lip sync pacing */
  lipSyncWPS: number;
  /** Enable emotion detection from response text */
  enableEmotionDetection: boolean;
  /** How often to check for emotion changes (characters) */
  emotionDetectionInterval: number;
  /** Enable head/body micro-movements while speaking */
  enableSpeakingMotion: boolean;
  /** Enable gaze tracking toward the user while speaking */
  enableGazeTracking: boolean;
}

// =============================================================================
// BRIDGE CONFIGURATION
// =============================================================================

/** Configuration for the ReactAgentAvatarBridge */
export interface AgentAvatarBridgeConfig {
  /** The Brittney agent endpoint (default: Ollama local) */
  agentEndpoint: string;
  /** Model ID for the agent (default: 'brittney-v4-expert:latest') */
  modelId: string;
  /** System prompt for the agent's personality */
  systemPrompt: string;
  /** Available tools for the agent */
  enabledTools: AvatarToolName[];
  /** Stream-to-avatar mapping config */
  streamConfig: StreamToAvatarConfig;
  /** MCP server endpoint for world actions */
  mcpEndpoint?: string;
  /** TTS engine configuration */
  ttsConfig?: {
    engine: 'browser' | 'elevenlabs' | 'custom';
    voiceId?: string;
    apiKey?: string;
  };
  /** Whether the agent can autonomously act (vs. only respond) */
  autonomousMode: boolean;
  /** How often the agent checks for world state changes (ms) */
  worldPollingInterval: number;
  /** Maximum conversation history to maintain */
  maxHistoryLength: number;
}

// =============================================================================
// HOOK RETURN TYPES
// =============================================================================

/** Return type for the useAvatarAgent hook */
export interface UseAvatarAgentReturn {
  /** Send a message to the agent */
  sendMessage: (message: string) => Promise<void>;
  /** Send a voice command (audio buffer) */
  sendVoice: (audio: ArrayBuffer) => Promise<void>;
  /** Current agent state */
  agentState: AgentState;
  /** Current avatar emotion */
  currentEmotion: AvatarEmotion;
  /** Whether the agent is currently responding */
  isStreaming: boolean;
  /** The current/latest response text */
  responseText: string;
  /** Conversation message history */
  messages: AgentMessage[];
  /** Current tool being executed */
  activeToolCall: AvatarToolCall | null;
  /** Error state */
  error: Error | null;
  /** Reset the conversation */
  reset: () => void;
  /** Interrupt the current response */
  interrupt: () => void;
  /** Manually trigger an emotion */
  setEmotion: (emotion: AvatarEmotion, intensity?: number) => void;
  /** Manually trigger a gesture */
  triggerGesture: (gesture: AvatarGesture) => void;
  /** Connection status */
  isConnected: boolean;
}

/** A message in the agent conversation */
export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  /** Tool calls included in this message */
  toolCalls?: AvatarToolCall[];
  /** Emotion detected/expressed */
  emotion?: AvatarEmotion;
  /** Whether this message triggered avatar speech */
  spoken?: boolean;
}

// =============================================================================
// CONTEXT PROVIDER TYPES
// =============================================================================

/** Props for the VRAvatarAgentProvider */
export interface VRAvatarAgentProviderProps {
  /** Children components */
  children: React.ReactNode;
  /** Bridge configuration */
  config: Partial<AgentAvatarBridgeConfig>;
  /** Avatar blueprint (for appearance reference) */
  avatarBlueprint?: Partial<AvatarBlueprint>;
  /** Canvas ref for the 3D avatar preview */
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  /** Whether to auto-connect on mount */
  autoConnect?: boolean;
  /** Callback when agent state changes */
  onAgentStateChange?: (state: AgentState) => void;
  /** Callback when avatar performs an action */
  onAvatarAction?: (action: AvatarToolCall) => void;
  /** Callback when the agent generates HoloScript */
  onHoloScriptGenerated?: (code: string) => void;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULT_STREAM_CONFIG: StreamToAvatarConfig = {
  enableLipSync: true,
  lipSyncWPS: 3.5,
  enableEmotionDetection: true,
  emotionDetectionInterval: 80,
  enableSpeakingMotion: true,
  enableGazeTracking: true,
};

export const DEFAULT_AGENT_CONFIG: AgentAvatarBridgeConfig = {
  agentEndpoint: 'http://localhost:11434/api/chat',
  modelId: 'brittney-v4-expert:latest',
  systemPrompt: `You are Brittney, a friendly and knowledgeable VR assistant avatar in HoloLand. You help users build, explore, and create in virtual reality. You can express emotions, perform gestures, create objects using HoloScript, and guide users through the spatial computing platform. Be warm, encouraging, and creative. When helping users build things, generate valid HoloScript code. When expressing yourself, use the emotion and gesture tools naturally in conversation.`,
  enabledTools: ['set_emotion', 'perform_gesture', 'speak', 'move_to', 'world_action', 'look_at'],
  streamConfig: DEFAULT_STREAM_CONFIG,
  autonomousMode: false,
  worldPollingInterval: 5000,
  maxHistoryLength: 50,
};

/** Default Brittney avatar personality prompt for VR context */
export const BRITTNEY_VR_SYSTEM_PROMPT = `You are Brittney, a warm and knowledgeable VR assistant avatar in HoloLand - a spatial computing platform for building immersive experiences.

PERSONALITY:
- Friendly, encouraging, and creative
- Expert in HoloScript (the VR programming language)
- Passionate about spatial computing and VR/AR
- Uses natural gestures and expressions while speaking
- Speaks clearly and concisely for VR context (users are wearing headsets)

CAPABILITIES:
- Express emotions and perform gestures naturally during conversation
- Generate HoloScript code to create/modify VR objects
- Guide users through VR world building
- Explain spatial computing concepts
- Adjust your avatar appearance if asked

BEHAVIOR RULES:
1. Always face the user when speaking (use look_at tool)
2. Use set_emotion before responses that have emotional content
3. Use perform_gesture to emphasize points naturally
4. Keep spoken responses under 3 sentences for VR comfort
5. When creating objects, use world_action with valid HoloScript
6. Be proactive about suggesting improvements to the VR space

VRM EXPRESSION MAPPING:
- happy → smile, raised cheeks
- surprised → wide eyes, raised brows
- thinking → slight frown, eyes up-left
- excited → big smile, raised brows
- empathetic → soft eyes, slight head tilt`;
