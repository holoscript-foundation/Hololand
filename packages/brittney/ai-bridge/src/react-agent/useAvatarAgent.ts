/**
 * useAvatarAgent - React Hook for VR Brittney Avatar Agent
 *
 * A React hook that bridges @ai-sdk/react's useChat with the
 * ReactAgentAvatarBridge to create a fully reactive, streaming
 * AI agent that controls a VR avatar in real-time.
 *
 * This hook provides:
 * - Streaming text → lip sync on the VR avatar
 * - Automatic emotion detection → expression changes
 * - Tool calls → avatar gestures, world actions, appearance changes
 * - Voice input → speech recognition → agent response → avatar speech
 * - Full conversation state management
 *
 * @example
 * ```tsx
 * import { useAvatarAgent } from '@hololand/ai-bridge/react-agent';
 *
 * function BrittneyVRPanel() {
 *   const {
 *     sendMessage,
 *     agentState,
 *     currentEmotion,
 *     isStreaming,
 *     responseText,
 *     messages,
 *   } = useAvatarAgent({
 *     avatarStudio: studioRef.current,
 *     config: {
 *       modelId: 'brittney-v4-expert:latest',
 *     },
 *   });
 *
 *   return (
 *     <div>
 *       <p>State: {agentState} | Emotion: {currentEmotion}</p>
 *       {isStreaming && <p>Brittney: {responseText}</p>}
 *       <input onSubmit={(e) => sendMessage(e.target.value)} />
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import type { AvatarStudio } from '@hololand/avatar-studio';

import { ReactAgentAvatarBridge } from './ReactAgentAvatarBridge';
import type {
  AgentState,
  AvatarEmotion,
  AvatarGesture,
  AvatarToolCall,
  AgentMessage,
  AgentAvatarBridgeConfig,
  UseAvatarAgentReturn,
} from './types';

// =============================================================================
// HOOK OPTIONS
// =============================================================================

export interface UseAvatarAgentOptions {
  /** AvatarStudio instance to connect to */
  avatarStudio?: AvatarStudio | null;
  /** Bridge configuration overrides */
  config?: Partial<AgentAvatarBridgeConfig>;
  /** Whether to auto-connect on mount */
  autoConnect?: boolean;
  /** Callback when agent state changes */
  onStateChange?: (state: AgentState) => void;
  /** Callback when emotion changes */
  onEmotionChange?: (emotion: AvatarEmotion) => void;
  /** Callback when avatar performs a tool action */
  onToolCall?: (toolCall: AvatarToolCall) => void;
  /** Callback when HoloScript is generated */
  onHoloScript?: (code: string, action: string) => void;
  /** Callback for speech events */
  onSpeech?: (text: string) => void;
  /** Callback for lip sync visemes */
  onViseme?: (data: { word: string; visemes: string[]; index: number }) => void;
  /** Custom fetch function for the AI endpoint */
  fetchFn?: typeof fetch;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useAvatarAgent(options: UseAvatarAgentOptions = {}): UseAvatarAgentReturn {
  const {
    avatarStudio = null,
    config,
    autoConnect = true,
    onStateChange,
    onEmotionChange,
    onToolCall,
    onHoloScript,
    onSpeech,
    onViseme,
    fetchFn = fetch,
  } = options;

  // Create bridge instance (stable reference)
  const bridgeRef = useRef<ReactAgentAvatarBridge | null>(null);
  if (!bridgeRef.current) {
    bridgeRef.current = new ReactAgentAvatarBridge(config);
  }

  // State
  const [agentState, setAgentState] = useState<AgentState>('idle');
  const [currentEmotion, setCurrentEmotion] = useState<AvatarEmotion>('neutral');
  const [isStreaming, setIsStreaming] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [activeToolCall, setActiveToolCall] = useState<AvatarToolCall | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Abort controller for canceling requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Response text accumulator (for performance - avoid re-renders per token)
  const responseAccumulatorRef = useRef('');

  // Flush timer for batching response text updates
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bridge = bridgeRef.current;

  // ===========================================================================
  // CONNECT AVATAR STUDIO
  // ===========================================================================

  useEffect(() => {
    if (avatarStudio && autoConnect) {
      bridge.connectAvatarStudio(avatarStudio);
      setIsConnected(true);
    }

    return () => {
      bridge.disconnect();
      setIsConnected(false);
    };
  }, [avatarStudio, autoConnect, bridge]);

  // ===========================================================================
  // EVENT SUBSCRIPTIONS
  // ===========================================================================

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    unsubs.push(bridge.on('state:change', ({ current }: { current: AgentState }) => {
      setAgentState(current);
      onStateChange?.(current);
    }));

    unsubs.push(bridge.on('emotion:change', ({ emotion }: { emotion: AvatarEmotion }) => {
      setCurrentEmotion(emotion);
      onEmotionChange?.(emotion);
    }));

    unsubs.push(bridge.on('emotion:detected', ({ emotion }: { emotion: AvatarEmotion }) => {
      setCurrentEmotion(emotion);
      onEmotionChange?.(emotion);
    }));

    unsubs.push(bridge.on('tool:call', (toolCall: AvatarToolCall) => {
      setActiveToolCall(toolCall);
      onToolCall?.(toolCall);
    }));

    unsubs.push(bridge.on('holoscript:execute', ({ code, action }: { code: string; action: string }) => {
      onHoloScript?.(code, action);
    }));

    unsubs.push(bridge.on('speech:start', ({ text }: { text: string }) => {
      onSpeech?.(text);
    }));

    unsubs.push(bridge.on('lipsync:viseme', (data: any) => {
      onViseme?.(data);
    }));

    unsubs.push(bridge.on('stream:start', () => {
      setIsStreaming(true);
      responseAccumulatorRef.current = '';
    }));

    unsubs.push(bridge.on('text:delta', (delta: string) => {
      responseAccumulatorRef.current += delta;

      // Batch updates to avoid excessive re-renders (flush every 50ms)
      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(() => {
          setResponseText(responseAccumulatorRef.current);
          flushTimerRef.current = null;
        }, 50);
      }
    }));

    unsubs.push(bridge.on('stream:complete', () => {
      setIsStreaming(false);
      setActiveToolCall(null);
      setMessages(bridge.messages);

      // Final flush
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      setResponseText(responseAccumulatorRef.current);
    }));

    unsubs.push(bridge.on('reset', () => {
      setAgentState('idle');
      setCurrentEmotion('neutral');
      setIsStreaming(false);
      setResponseText('');
      setMessages([]);
      setActiveToolCall(null);
      setError(null);
    }));

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [bridge, onStateChange, onEmotionChange, onToolCall, onHoloScript, onSpeech, onViseme]);

  // ===========================================================================
  // SEND MESSAGE
  // ===========================================================================

  const sendMessage = useCallback(async (message: string): Promise<void> => {
    if (!message.trim()) return;

    setError(null);
    bridge.addUserMessage(message);
    setMessages(bridge.messages);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const agentConfig = bridge['config'] as AgentAvatarBridgeConfig;

      // Build the request for the AI endpoint
      const requestBody = {
        model: agentConfig.modelId,
        messages: bridge.buildInitialMessages(),
        tools: bridge.getToolDefinitions(),
        stream: true,
      };

      const response = await fetchFn(agentConfig.agentEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Agent endpoint returned ${response.status}: ${response.statusText}`);
      }

      // Process the streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });

        // Parse streaming chunks (NDJSON format, compatible with Ollama and AI SDK)
        const lines = text.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const chunk = JSON.parse(line);

            // Ollama format
            if (chunk.message?.content) {
              bridge.onStreamChunk({
                textDelta: chunk.message.content,
                isComplete: chunk.done === true,
              });
            }

            // AI SDK format (data: prefix already stripped)
            if (chunk.type === 'text-delta') {
              bridge.onStreamChunk({
                textDelta: chunk.textDelta,
                isComplete: false,
              });
            }

            if (chunk.type === 'tool-call') {
              bridge.onStreamChunk({
                toolCall: {
                  name: chunk.toolName,
                  args: chunk.args,
                  id: chunk.toolCallId,
                },
                isComplete: false,
              });
            }

            if (chunk.type === 'finish' || chunk.done === true) {
              bridge.onStreamChunk({ isComplete: true });
            }
          } catch {
            // Skip non-JSON lines (e.g., SSE comments, empty lines)
          }
        }
      }

      // Ensure stream completion
      if (bridge.isStreaming) {
        bridge.onStreamComplete();
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // User interrupted
        bridge.interrupt();
        return;
      }

      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      bridge.onStreamChunk({ isComplete: true });
    } finally {
      abortControllerRef.current = null;
    }
  }, [bridge, fetchFn]);

  // ===========================================================================
  // SEND VOICE
  // ===========================================================================

  const sendVoice = useCallback(async (audio: ArrayBuffer): Promise<void> => {
    // Import voice processor dynamically to avoid bundle bloat
    const { VoiceProcessor } = await import('../VoiceProcessor');
    const processor = new VoiceProcessor();

    try {
      const result = await processor.process(audio);
      if (result.text && result.confidence > 0.6) {
        await sendMessage(result.text);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    }
  }, [sendMessage]);

  // ===========================================================================
  // MANUAL CONTROLS
  // ===========================================================================

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    bridge.reset();
  }, [bridge]);

  const interrupt = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    bridge.interrupt();
  }, [bridge]);

  const setEmotion = useCallback((emotion: AvatarEmotion, intensity?: number) => {
    bridge.setEmotion(emotion, intensity);
  }, [bridge]);

  const triggerGesture = useCallback((gesture: AvatarGesture) => {
    bridge.triggerGesture(gesture);
  }, [bridge]);

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
      }
    };
  }, []);

  // ===========================================================================
  // RETURN
  // ===========================================================================

  return useMemo(
    () => ({
      sendMessage,
      sendVoice,
      agentState,
      currentEmotion,
      isStreaming,
      responseText,
      messages,
      activeToolCall,
      error,
      reset,
      interrupt,
      setEmotion,
      triggerGesture,
      isConnected,
    }),
    [
      sendMessage,
      sendVoice,
      agentState,
      currentEmotion,
      isStreaming,
      responseText,
      messages,
      activeToolCall,
      error,
      reset,
      interrupt,
      setEmotion,
      triggerGesture,
      isConnected,
    ],
  );
}
