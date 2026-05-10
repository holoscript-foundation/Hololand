/**
 * VRAvatarAgentProvider
 *
 * React context provider that wires together the AI agent, avatar studio,
 * and HoloLand world into a single reactive context. Child components can
 * use useAvatarAgent() or useAvatarAgentContext() to interact with the
 * VR Brittney avatar agent.
 *
 * This provider handles:
 * - Agent lifecycle (connect, disconnect, cleanup)
 * - Avatar studio connection management
 * - World event routing (HoloScript execution, object creation)
 * - TTS engine initialization
 * - Gesture animation dispatching
 *
 * @example
 * ```tsx
 * import { VRAvatarAgentProvider, useAvatarAgentContext } from '@hololand/ai-bridge/react-agent';
 *
 * function App() {
 *   const canvasRef = useRef<HTMLCanvasElement>(null);
 *
 *   return (
 *     <VRAvatarAgentProvider
 *       config={{ modelId: 'brittney-v4-expert:latest' }}
 *       canvasRef={canvasRef}
 *       autoConnect
 *       onHoloScriptGenerated={(code) => console.log('HoloScript:', code)}
 *     >
 *       <canvas ref={canvasRef} />
 *       <ChatPanel />
 *       <EmotionDisplay />
 *     </VRAvatarAgentProvider>
 *   );
 * }
 *
 * function ChatPanel() {
 *   const { sendMessage, messages, isStreaming, responseText, agentState } = useAvatarAgentContext();
 *
 *   return (
 *     <div>
 *       <div className="messages">
 *         {messages.map((msg) => (
 *           <div key={msg.id} className={msg.role}>
 *             {msg.content}
 *           </div>
 *         ))}
 *         {isStreaming && <div className="assistant">{responseText}</div>}
 *       </div>
 *       <form onSubmit={(e) => {
 *         e.preventDefault();
 *         const input = e.currentTarget.elements.namedItem('message') as HTMLInputElement;
 *         sendMessage(input.value);
 *         input.value = '';
 *       }}>
 *         <input name="message" placeholder="Talk to Brittney..." disabled={isStreaming} />
 *         <button type="submit" disabled={isStreaming}>Send</button>
 *       </form>
 *     </div>
 *   );
 * }
 *
 * function EmotionDisplay() {
 *   const { currentEmotion, agentState } = useAvatarAgentContext();
 *   return <p>State: {agentState} | Emotion: {currentEmotion}</p>;
 * }
 * ```
 */

import { createContext, useContext, useEffect, useRef, useMemo } from 'react';

import type { AvatarStudio } from '@hololand/avatar-studio';

import { useAvatarAgent, type UseAvatarAgentOptions } from './useAvatarAgent';
import type {
  UseAvatarAgentReturn,
  VRAvatarAgentProviderProps,
  AgentState,
  AvatarToolCall,
} from './types';

// =============================================================================
// CONTEXT
// =============================================================================

const AvatarAgentContext = createContext<UseAvatarAgentReturn | null>(null);

/**
 * Hook to access the avatar agent context from child components.
 * Must be used within a VRAvatarAgentProvider.
 */
export function useAvatarAgentContext(): UseAvatarAgentReturn {
  const context = useContext(AvatarAgentContext);
  if (!context) {
    throw new Error(
      'useAvatarAgentContext must be used within a VRAvatarAgentProvider. ' +
      'Wrap your component tree with <VRAvatarAgentProvider>.',
    );
  }
  return context;
}

// =============================================================================
// PROVIDER
// =============================================================================

/**
 * VR Avatar Agent Provider
 *
 * Wraps the application with a context that provides access to the
 * Brittney VR avatar agent. Manages the lifecycle of the AvatarStudio
 * connection and routes agent events to the avatar and world.
 */
export function VRAvatarAgentProvider({
  children,
  config,
  avatarBlueprint,
  canvasRef,
  autoConnect = true,
  onAgentStateChange,
  onAvatarAction,
  onHoloScriptGenerated,
}: VRAvatarAgentProviderProps) {
  // AvatarStudio instance management
  const studioRef = useRef<AvatarStudio | null>(null);

  // Initialize AvatarStudio from canvas ref
  useEffect(() => {
    if (!canvasRef?.current || studioRef.current) return;

    const initStudio = async () => {
      try {
        // Dynamic import to avoid pulling Three.js into non-3D contexts
        const { AvatarStudio } = await import('@hololand/avatar-studio');

        const canvas = canvasRef.current;
        if (!canvas) return;

        const studio = new AvatarStudio({
          canvas,
          width: canvas.clientWidth || 800,
          height: canvas.clientHeight || 600,
          background: 'studio-dark',
          initialBlueprint: avatarBlueprint,
          antialias: true,
          shadows: true,
        });

        await studio.initialize();
        studioRef.current = studio;
      } catch (error) {
        console.error('[VRAvatarAgentProvider] Failed to initialize AvatarStudio:', error);
      }
    };

    initStudio();

    return () => {
      studioRef.current?.dispose();
      studioRef.current = null;
    };
  }, [canvasRef, avatarBlueprint]);

  // Create the hook options
  const hookOptions: UseAvatarAgentOptions = useMemo(
    () => ({
      avatarStudio: studioRef.current,
      config,
      autoConnect,
      onStateChange: (state: AgentState) => {
        onAgentStateChange?.(state);
      },
      onToolCall: (toolCall: AvatarToolCall) => {
        onAvatarAction?.(toolCall);
      },
      onHoloScript: (code: string) => {
        onHoloScriptGenerated?.(code);
      },
    }),
    [config, autoConnect, onAgentStateChange, onAvatarAction, onHoloScriptGenerated],
  );

  // Use the core hook
  const agent = useAvatarAgent(hookOptions);

  return (
    <AvatarAgentContext.Provider value={agent}>
      {children}
    </AvatarAgentContext.Provider>
  );
}

// =============================================================================
// DISPLAY NAME
// =============================================================================

VRAvatarAgentProvider.displayName = 'VRAvatarAgentProvider';
