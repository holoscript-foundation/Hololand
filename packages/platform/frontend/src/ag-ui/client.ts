/**
 * AG-UI Protocol Client
 *
 * Core client for connecting to AG-UI compliant agent backends.
 * Handles HTTP streaming (SSE), event parsing, state synchronization,
 * and connection lifecycle management.
 *
 * Architecture:
 * - Uses Server-Sent Events (SSE) for real-time event streaming
 * - Maintains shared state via snapshot/delta pattern
 * - Supports cancellation and reconnection
 * - Thread-safe for use alongside VR render loops (no blocking I/O)
 *
 * @module ag-ui/client
 */

import type {
  AGUIEvent,
  AGUIEventType,
  AGUIRunConfig,
  AGUIConnectionConfig,
  AGUIConnectionStatus,
  AGUIRunStatus,
  AGUIMessage,
  JSONPatchOperation,
  VRDashboardAgentState,
} from './types';

// =============================================================================
// EVENT EMITTER
// =============================================================================

type AGUIEventHandler = (event: AGUIEvent) => void;
type AGUIStatusHandler = (status: AGUIConnectionStatus) => void;
type AGUIRunStatusHandler = (status: AGUIRunStatus) => void;
type AGUIStateHandler = (state: Record<string, unknown>) => void;
type AGUIMessageHandler = (messages: AGUIMessage[]) => void;
type AGUIErrorHandler = (error: Error) => void;

interface AGUIClientListeners {
  event: AGUIEventHandler[];
  connectionStatus: AGUIStatusHandler[];
  runStatus: AGUIRunStatusHandler[];
  stateChange: AGUIStateHandler[];
  messagesChange: AGUIMessageHandler[];
  error: AGUIErrorHandler[];
}

// =============================================================================
// JSON PATCH IMPLEMENTATION (RFC 6902)
// =============================================================================

/**
 * Apply JSON Patch operations to a target object.
 * Minimal implementation of RFC 6902 for AG-UI state deltas.
 */
function applyJSONPatch(
  target: Record<string, unknown>,
  operations: JSONPatchOperation[],
): Record<string, unknown> {
  const result = structuredClone(target);

  for (const op of operations) {
    const pathParts = op.path
      .split('/')
      .filter(Boolean)
      .map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));

    switch (op.op) {
      case 'add':
      case 'replace': {
        setNestedValue(result, pathParts, op.value);
        break;
      }
      case 'remove': {
        removeNestedValue(result, pathParts);
        break;
      }
      case 'move': {
        if (op.from) {
          const fromParts = op.from
            .split('/')
            .filter(Boolean)
            .map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
          const value = getNestedValue(result, fromParts);
          removeNestedValue(result, fromParts);
          setNestedValue(result, pathParts, value);
        }
        break;
      }
      case 'copy': {
        if (op.from) {
          const fromParts = op.from
            .split('/')
            .filter(Boolean)
            .map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
          const value = structuredClone(getNestedValue(result, fromParts));
          setNestedValue(result, pathParts, value);
        }
        break;
      }
      case 'test': {
        const current = getNestedValue(result, pathParts);
        if (JSON.stringify(current) !== JSON.stringify(op.value)) {
          throw new Error(`JSON Patch test failed at ${op.path}`);
        }
        break;
      }
    }
  }

  return result;
}

function getNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown): void {
  if (path.length === 0) return;
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (current[key] == null || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = value;
}

function removeNestedValue(obj: Record<string, unknown>, path: string[]): void {
  if (path.length === 0) return;
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (current[key] == null || typeof current[key] !== 'object') return;
    current = current[key] as Record<string, unknown>;
  }
  delete current[path[path.length - 1]];
}

// =============================================================================
// AG-UI CLIENT
// =============================================================================

/**
 * AG-UI Protocol Client
 *
 * Connects to an AG-UI compliant agent backend and manages the
 * bidirectional event stream, shared state, and message history.
 *
 * Usage:
 * ```typescript
 * const client = new AGUIClient({
 *   url: 'https://agent.example.com/ag-ui',
 *   token: 'bearer-token',
 * });
 *
 * client.on('event', (event) => console.log(event));
 * client.on('stateChange', (state) => updateUI(state));
 *
 * await client.startRun({
 *   threadId: 'thread-123',
 *   state: { currentPanel: 'analytics' },
 *   messages: [{ id: '1', role: 'user', content: 'Show me VR metrics' }],
 * });
 * ```
 */
export class AGUIClient {
  private config: Required<AGUIConnectionConfig>;
  private connectionStatus: AGUIConnectionStatus = 'disconnected';
  private runStatus: AGUIRunStatus = 'idle';
  private abortController: AbortController | null = null;
  private reconnectAttempts: number = 0;

  // State management
  private sharedState: Record<string, unknown> = {};
  private messages: AGUIMessage[] = [];
  private currentRunId: string | null = null;
  private currentThreadId: string | null = null;

  // Streaming text accumulation
  private streamingMessages: Map<string, string> = new Map();
  private streamingToolArgs: Map<string, string> = new Map();
  private streamingReasoning: Map<string, string> = new Map();

  // Event listeners
  private listeners: AGUIClientListeners = {
    event: [],
    connectionStatus: [],
    runStatus: [],
    stateChange: [],
    messagesChange: [],
    error: [],
  };

  constructor(config: AGUIConnectionConfig) {
    this.config = {
      url: config.url,
      token: config.token ?? '',
      headers: config.headers ?? {},
      timeout: config.timeout ?? 30000,
      autoReconnect: config.autoReconnect ?? true,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      reconnectDelay: config.reconnectDelay ?? 1000,
    };
  }

  // ===========================================================================
  // EVENT SUBSCRIPTION
  // ===========================================================================

  on(event: 'event', handler: AGUIEventHandler): () => void;
  on(event: 'connectionStatus', handler: AGUIStatusHandler): () => void;
  on(event: 'runStatus', handler: AGUIRunStatusHandler): () => void;
  on(event: 'stateChange', handler: AGUIStateHandler): () => void;
  on(event: 'messagesChange', handler: AGUIMessageHandler): () => void;
  on(event: 'error', handler: AGUIErrorHandler): () => void;
  on(event: string, handler: (...args: unknown[]) => void): () => void {
    const key = event as keyof AGUIClientListeners;
    if (this.listeners[key]) {
      (this.listeners[key] as Array<(...args: unknown[]) => void>).push(handler);
    }

    // Return unsubscribe function
    return () => {
      const arr = this.listeners[key] as Array<(...args: unknown[]) => void>;
      if (arr) {
        const idx = arr.indexOf(handler);
        if (idx >= 0) arr.splice(idx, 1);
      }
    };
  }

  // ===========================================================================
  // RUN MANAGEMENT
  // ===========================================================================

  /**
   * Start a new agent run.
   *
   * Opens an SSE connection to the agent backend and begins
   * streaming events. The run continues until a RUN_FINISHED
   * or RUN_ERROR event is received, or until cancelled.
   */
  async startRun(runConfig: AGUIRunConfig): Promise<void> {
    if (this.runStatus === 'running' || this.runStatus === 'streaming') {
      await this.cancelRun();
    }

    this.currentThreadId = runConfig.threadId;
    this.currentRunId = runConfig.runId ?? `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.reconnectAttempts = 0;

    // Initialize shared state
    if (runConfig.state) {
      this.sharedState = structuredClone(runConfig.state);
    }
    if (runConfig.messages) {
      this.messages = structuredClone(runConfig.messages);
    }

    this.setRunStatus('starting');
    await this.connect(runConfig);
  }

  /**
   * Cancel the current run.
   */
  async cancelRun(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.setRunStatus('cancelled');
    this.setConnectionStatus('disconnected');
    this.streamingMessages.clear();
    this.streamingToolArgs.clear();
    this.streamingReasoning.clear();
  }

  /**
   * Send a user message to the agent during an active run.
   */
  async sendMessage(content: string): Promise<void> {
    if (!this.currentThreadId) {
      throw new Error('No active run. Call startRun() first.');
    }

    const message: AGUIMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'user',
      content,
    };

    this.messages.push(message);
    this.emit('messagesChange', this.messages);

    // Start a new run with the updated messages
    await this.startRun({
      threadId: this.currentThreadId,
      state: this.sharedState,
      messages: this.messages,
    });
  }

  /**
   * Update shared state from the frontend side.
   * Sends a state snapshot to the agent on the next run.
   */
  updateState(updates: Record<string, unknown>): void {
    this.sharedState = { ...this.sharedState, ...updates };
    this.emit('stateChange', this.sharedState);
  }

  // ===========================================================================
  // QUERY API
  // ===========================================================================

  getConnectionStatus(): AGUIConnectionStatus {
    return this.connectionStatus;
  }

  getRunStatus(): AGUIRunStatus {
    return this.runStatus;
  }

  getSharedState(): Readonly<Record<string, unknown>> {
    return this.sharedState;
  }

  getMessages(): readonly AGUIMessage[] {
    return this.messages;
  }

  getCurrentRunId(): string | null {
    return this.currentRunId;
  }

  getCurrentThreadId(): string | null {
    return this.currentThreadId;
  }

  /**
   * Get VR dashboard-specific agent state from the shared state.
   */
  getVRDashboardState(): VRDashboardAgentState {
    return (this.sharedState.__vrDashboard as VRDashboardAgentState) ?? {};
  }

  // ===========================================================================
  // CONNECTION (SSE)
  // ===========================================================================

  private async connect(runConfig: AGUIRunConfig): Promise<void> {
    this.setConnectionStatus('connecting');

    try {
      this.abortController = new AbortController();
      const signal = this.abortController.signal;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...this.config.headers,
      };

      if (this.config.token) {
        headers['Authorization'] = `Bearer ${this.config.token}`;
      }

      const response = await fetch(this.config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          threadId: runConfig.threadId,
          runId: this.currentRunId,
          state: runConfig.state ?? this.sharedState,
          messages: runConfig.messages ?? this.messages,
          tools: runConfig.tools,
          config: runConfig.config,
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`AG-UI connection failed: ${response.status} ${response.statusText}`);
      }

      this.setConnectionStatus('connected');
      this.reconnectAttempts = 0;

      await this.processEventStream(response);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Intentional cancellation
        return;
      }

      this.setConnectionStatus('error');
      this.emit('error', error instanceof Error ? error : new Error(String(error)));

      // Attempt reconnection
      if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        this.setConnectionStatus('reconnecting');

        await new Promise((resolve) => setTimeout(resolve, delay));

        if (this.connectionStatus === 'reconnecting') {
          await this.connect(runConfig);
        }
      } else {
        this.setRunStatus('error');
      }
    }
  }

  private async processEventStream(response: Response): Promise<void> {
    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let eventType = '';
        let eventData = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            eventData += line.slice(5).trim();
          } else if (line === '') {
            // End of event
            if (eventData) {
              try {
                const event = JSON.parse(eventData) as AGUIEvent;
                if (eventType && !event.type) {
                  (event as Record<string, unknown>).type = eventType;
                }
                this.handleEvent(event);
              } catch {
                // Try as raw data line
                if (eventData.trim()) {
                  try {
                    const event = JSON.parse(eventData) as AGUIEvent;
                    this.handleEvent(event);
                  } catch {
                    // Not valid JSON, skip
                  }
                }
              }
              eventType = '';
              eventData = '';
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        throw error;
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ===========================================================================
  // EVENT HANDLING
  // ===========================================================================

  private handleEvent(event: AGUIEvent): void {
    // Emit the raw event to all listeners
    this.emit('event', event);

    switch (event.type) {
      // Lifecycle
      case 'RUN_STARTED':
        this.setRunStatus('running');
        break;

      case 'RUN_FINISHED':
        this.setRunStatus('completed');
        this.setConnectionStatus('disconnected');
        break;

      case 'RUN_ERROR':
        this.setRunStatus('error');
        this.emit('error', new Error(event.message));
        break;

      // Text messages
      case 'TEXT_MESSAGE_START':
        this.setRunStatus('streaming');
        this.streamingMessages.set(event.messageId, '');
        break;

      case 'TEXT_MESSAGE_CONTENT':
        if (this.streamingMessages.has(event.messageId)) {
          const current = this.streamingMessages.get(event.messageId) ?? '';
          this.streamingMessages.set(event.messageId, current + event.delta);
        }
        break;

      case 'TEXT_MESSAGE_END':
        if (this.streamingMessages.has(event.messageId)) {
          const content = this.streamingMessages.get(event.messageId) ?? '';
          this.messages.push({
            id: event.messageId,
            role: 'assistant',
            content,
          });
          this.streamingMessages.delete(event.messageId);
          this.emit('messagesChange', this.messages);
        }
        this.setRunStatus('running');
        break;

      // Tool calls
      case 'TOOL_CALL_START':
        this.streamingToolArgs.set(event.toolCallId, '');
        break;

      case 'TOOL_CALL_ARGS':
        if (this.streamingToolArgs.has(event.toolCallId)) {
          const current = this.streamingToolArgs.get(event.toolCallId) ?? '';
          this.streamingToolArgs.set(event.toolCallId, current + event.delta);
        }
        break;

      case 'TOOL_CALL_END':
        this.streamingToolArgs.delete(event.toolCallId);
        break;

      case 'TOOL_CALL_RESULT': {
        this.messages.push({
          id: event.messageId,
          role: 'tool',
          content: event.content,
          toolCallId: event.toolCallId,
        });
        this.emit('messagesChange', this.messages);
        break;
      }

      // State management
      case 'STATE_SNAPSHOT':
        this.sharedState = structuredClone(event.snapshot);
        this.emit('stateChange', this.sharedState);
        break;

      case 'STATE_DELTA':
        try {
          this.sharedState = applyJSONPatch(this.sharedState, event.delta);
          this.emit('stateChange', this.sharedState);
        } catch (err) {
          this.emit('error', err instanceof Error ? err : new Error(String(err)));
        }
        break;

      case 'MESSAGES_SNAPSHOT':
        this.messages = structuredClone(event.messages);
        this.emit('messagesChange', this.messages);
        break;

      // Reasoning
      case 'REASONING_MESSAGE_START':
        this.streamingReasoning.set(event.messageId, '');
        break;

      case 'REASONING_MESSAGE_CONTENT':
        if (this.streamingReasoning.has(event.messageId)) {
          const current = this.streamingReasoning.get(event.messageId) ?? '';
          this.streamingReasoning.set(event.messageId, current + event.delta);
        }
        break;

      case 'REASONING_MESSAGE_END':
        if (this.streamingReasoning.has(event.messageId)) {
          const content = this.streamingReasoning.get(event.messageId) ?? '';
          this.messages.push({
            id: event.messageId,
            role: 'reasoning',
            content,
          });
          this.streamingReasoning.delete(event.messageId);
          this.emit('messagesChange', this.messages);
        }
        break;

      // Custom events pass through
      case 'RAW':
      case 'CUSTOM':
        break;

      default:
        // Unknown event types are silently ignored per AG-UI spec
        break;
    }
  }

  // ===========================================================================
  // INTERNAL HELPERS
  // ===========================================================================

  private setConnectionStatus(status: AGUIConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.emit('connectionStatus', status);
    }
  }

  private setRunStatus(status: AGUIRunStatus): void {
    if (this.runStatus !== status) {
      this.runStatus = status;
      this.emit('runStatus', status);
    }
  }

  private emit(event: 'event', data: AGUIEvent): void;
  private emit(event: 'connectionStatus', data: AGUIConnectionStatus): void;
  private emit(event: 'runStatus', data: AGUIRunStatus): void;
  private emit(event: 'stateChange', data: Record<string, unknown>): void;
  private emit(event: 'messagesChange', data: AGUIMessage[]): void;
  private emit(event: 'error', data: Error): void;
  private emit(event: string, data: unknown): void {
    const handlers = this.listeners[event as keyof AGUIClientListeners];
    if (handlers) {
      for (const handler of handlers) {
        try {
          (handler as (data: unknown) => void)(data);
        } catch (err) {
          console.error(`[AG-UI] Error in ${event} handler:`, err);
        }
      }
    }
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Dispose the client. Cancels any active run and clears all listeners.
   */
  dispose(): void {
    this.cancelRun();
    this.listeners = {
      event: [],
      connectionStatus: [],
      runStatus: [],
      stateChange: [],
      messagesChange: [],
      error: [],
    };
    this.sharedState = {};
    this.messages = [];
    this.streamingMessages.clear();
    this.streamingToolArgs.clear();
    this.streamingReasoning.clear();
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create an AG-UI client instance.
 */
export function createAGUIClient(config: AGUIConnectionConfig): AGUIClient {
  return new AGUIClient(config);
}
