/**
 * React Agent SDK Integration for VR Brittney Avatar
 *
 * Bridges @ai-sdk/react's streaming agent framework with HoloLand's
 * VR avatar system, enabling an embodied AI assistant that can:
 *
 * - Express emotions via VRM facial expressions
 * - Perform gestures (wave, nod, point, etc.)
 * - Lip sync to streaming text responses
 * - Create/modify VR objects via HoloScript
 * - Navigate the VR world
 * - Change its own appearance
 *
 * ## Quick Start
 *
 * ```tsx
 * import {
 *   VRAvatarAgentProvider,
 *   useAvatarAgentContext,
 * } from '@hololand/ai-bridge/react-agent';
 *
 * function App() {
 *   const canvasRef = useRef<HTMLCanvasElement>(null);
 *   return (
 *     <VRAvatarAgentProvider
 *       config={{ modelId: 'brittney-v4-expert:latest' }}
 *       canvasRef={canvasRef}
 *     >
 *       <canvas ref={canvasRef} width={800} height={600} />
 *       <BrittneyChat />
 *     </VRAvatarAgentProvider>
 *   );
 * }
 *
 * function BrittneyChat() {
 *   const { sendMessage, messages, isStreaming, responseText } = useAvatarAgentContext();
 *   // ... render chat UI
 * }
 * ```
 *
 * ## Standalone Hook (without provider)
 *
 * ```tsx
 * import { useAvatarAgent } from '@hololand/ai-bridge/react-agent';
 *
 * function BrittneyVR({ studio }: { studio: AvatarStudio }) {
 *   const agent = useAvatarAgent({
 *     avatarStudio: studio,
 *     config: { modelId: 'brittney-v4-expert:latest' },
 *     onEmotionChange: (emotion) => console.log('Emotion:', emotion),
 *     onHoloScript: (code) => executeInWorld(code),
 *   });
 *
 *   return <ChatUI agent={agent} />;
 * }
 * ```
 *
 * ## Bridge Only (for custom integrations)
 *
 * ```typescript
 * import { ReactAgentAvatarBridge } from '@hololand/ai-bridge/react-agent';
 *
 * const bridge = new ReactAgentAvatarBridge({
 *   modelId: 'brittney-v4-expert:latest',
 *   enabledTools: ['set_emotion', 'perform_gesture', 'speak', 'world_action'],
 * });
 *
 * bridge.connectAvatarStudio(studio);
 *
 * // Feed chunks from any streaming source
 * bridge.onStreamChunk({ textDelta: 'Hello!' });
 * bridge.onStreamChunk({ toolCall: { name: 'set_emotion', args: { emotion: 'happy' }, id: '1' } });
 * bridge.onStreamComplete();
 *
 * // Get tool definitions for AI SDK
 * const tools = bridge.getToolDefinitions();
 * ```
 */

// Core bridge
export { ReactAgentAvatarBridge } from './ReactAgentAvatarBridge';

// React hook
export { useAvatarAgent } from './useAvatarAgent';
export type { UseAvatarAgentOptions } from './useAvatarAgent';

// React context provider
export { VRAvatarAgentProvider, useAvatarAgentContext } from './VRAvatarAgentProvider';

// Types
export type {
  // State types
  AgentState,
  AvatarEmotion,
  AvatarGesture,

  // Tool types
  AvatarAgentTools,
  AvatarToolName,
  AvatarToolCall,

  // Streaming types
  AgentStreamChunk,
  StreamToAvatarConfig,

  // Configuration types
  AgentAvatarBridgeConfig,

  // Hook return types
  UseAvatarAgentReturn,
  AgentMessage,

  // Provider types
  VRAvatarAgentProviderProps,
} from './types';

// Default values
export { DEFAULT_STREAM_CONFIG, DEFAULT_AGENT_CONFIG, BRITTNEY_VR_SYSTEM_PROMPT } from './types';
