/**
 * AG-UI React Provider
 *
 * Context provider that makes the AG-UI client and its state
 * available to all descendant dashboard components.
 *
 * Architecture:
 * - Creates and manages the AG-UI client lifecycle
 * - Syncs client events to React state
 * - Provides stable references to avoid unnecessary re-renders
 * - Integrates with the VR renderer's AgentCommunicationManager
 *   via the bridge callback for render-loop-safe state propagation
 *
 * @module ag-ui/provider
 */

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AGUIClient, createAGUIClient } from './client';
import type {
  AGUIConnectionConfig,
  AGUIConnectionStatus,
  AGUIRunStatus,
  AGUIEvent,
  AGUIMessage,
} from './types';

// =============================================================================
// CONTEXT TYPE
// =============================================================================

export interface AGUIContextValue {
  /** The AG-UI client instance */
  client: AGUIClient | null;
  /** Current connection status */
  connectionStatus: AGUIConnectionStatus;
  /** Current run status */
  runStatus: AGUIRunStatus;
  /** Shared state between agent and frontend */
  state: Record<string, unknown>;
  /** Message history */
  messages: readonly AGUIMessage[];
  /** Update shared state from the frontend */
  updateState: (updates: Record<string, unknown>) => void;
  /** Whether the AG-UI client is configured and available */
  isConfigured: boolean;
}

/** Default context value when no provider is present */
const DEFAULT_CONTEXT: AGUIContextValue = {
  client: null,
  connectionStatus: 'disconnected',
  runStatus: 'idle',
  state: {},
  messages: [],
  updateState: () => {},
  isConfigured: false,
};

export const AGUIContext = createContext<AGUIContextValue>(DEFAULT_CONTEXT);
AGUIContext.displayName = 'AGUIContext';

// =============================================================================
// PROVIDER PROPS
// =============================================================================

export interface AGUIProviderProps {
  /** AG-UI connection configuration. If null, provider runs in offline/mock mode. */
  config: AGUIConnectionConfig | null;
  /** Initial shared state */
  initialState?: Record<string, unknown>;
  /** Callback when the agent emits an event (for bridging to renderer) */
  onEvent?: (event: AGUIEvent) => void;
  /** Callback when shared state changes (for bridging to renderer) */
  onStateChange?: (state: Record<string, unknown>) => void;
  /** Callback when messages change */
  onMessagesChange?: (messages: readonly AGUIMessage[]) => void;
  /** React children */
  children: React.ReactNode;
}

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

/**
 * AG-UI Context Provider
 *
 * Wraps dashboard components to provide AG-UI protocol capabilities.
 * Manages the client lifecycle, syncs events to React state, and
 * provides callback bridges for integration with the VR renderer.
 *
 * Usage:
 * ```tsx
 * function App() {
 *   return (
 *     <AGUIProvider
 *       config={{
 *         url: 'https://agent.example.com/ag-ui',
 *         token: userToken,
 *       }}
 *       initialState={{ currentPanel: 'home' }}
 *       onStateChange={(state) => {
 *         // Bridge to VR renderer AgentCommunicationManager
 *         agentCommManager.updateAgentState('dashboard-agent', {
 *           metadata: state,
 *         });
 *       }}
 *     >
 *       <AdminDashboard />
 *     </AGUIProvider>
 *   );
 * }
 * ```
 *
 * For offline/development mode, pass `config={null}`:
 * ```tsx
 * <AGUIProvider config={null}>
 *   <Dashboard /> {/* Works without an agent backend *}
 * </AGUIProvider>
 * ```
 */
export function AGUIProvider({
  config,
  initialState = {},
  onEvent,
  onStateChange,
  onMessagesChange,
  children,
}: AGUIProviderProps) {
  const [connectionStatus, setConnectionStatus] = useState<AGUIConnectionStatus>('disconnected');
  const [runStatus, setRunStatus] = useState<AGUIRunStatus>('idle');
  const [state, setState] = useState<Record<string, unknown>>(initialState);
  const [messages, setMessages] = useState<readonly AGUIMessage[]>([]);

  // Stable refs for callbacks to avoid effect re-triggers
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  const onMessagesChangeRef = useRef(onMessagesChange);
  onMessagesChangeRef.current = onMessagesChange;

  // Client ref
  const clientRef = useRef<AGUIClient | null>(null);

  // Create/dispose client when config changes
  useEffect(() => {
    if (!config) {
      if (clientRef.current) {
        clientRef.current.dispose();
        clientRef.current = null;
      }
      setConnectionStatus('disconnected');
      setRunStatus('idle');
      return;
    }

    const client = createAGUIClient(config);
    clientRef.current = client;

    // Subscribe to client events
    const unsubs: Array<() => void> = [];

    unsubs.push(
      client.on('connectionStatus', (status) => {
        setConnectionStatus(status);
      }),
    );

    unsubs.push(
      client.on('runStatus', (status) => {
        setRunStatus(status);
      }),
    );

    unsubs.push(
      client.on('stateChange', (newState) => {
        setState(newState);
        onStateChangeRef.current?.(newState);
      }),
    );

    unsubs.push(
      client.on('messagesChange', (newMessages) => {
        setMessages(newMessages);
        onMessagesChangeRef.current?.(newMessages);
      }),
    );

    unsubs.push(
      client.on('event', (event) => {
        onEventRef.current?.(event);
      }),
    );

    return () => {
      unsubs.forEach((fn) => fn());
      client.dispose();
      clientRef.current = null;
    };
  }, [config?.url, config?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update state function
  const updateState = useCallback(
    (updates: Record<string, unknown>) => {
      setState((prev) => {
        const next = { ...prev, ...updates };
        clientRef.current?.updateState(updates);
        onStateChangeRef.current?.(next);
        return next;
      });
    },
    [],
  );

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<AGUIContextValue>(
    () => ({
      client: clientRef.current,
      connectionStatus,
      runStatus,
      state,
      messages,
      updateState,
      isConfigured: config !== null,
    }),
    [connectionStatus, runStatus, state, messages, updateState, config],
  );

  return (
    <AGUIContext.Provider value={contextValue}>
      {children}
    </AGUIContext.Provider>
  );
}
