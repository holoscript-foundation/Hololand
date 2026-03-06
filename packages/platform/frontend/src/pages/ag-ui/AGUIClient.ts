/**
 * AGUIClient - Server-Sent Events Client for the AG-UI Protocol
 *
 * Implements a full SSE client that connects to an AG-UI compliant endpoint,
 * parses the event stream, and dispatches typed events to registered listeners.
 *
 * Features:
 *   - Standard EventSource-based SSE connection
 *   - Automatic reconnection with exponential backoff
 *   - Typed event parsing and validation
 *   - Event listener registration with cleanup
 *   - Connection lifecycle management
 *   - Metrics tracking (events/sec, total events)
 *
 * Transport:
 *   AG-UI uses HTTP Server-Sent Events (SSE) as its primary transport.
 *   Each SSE message contains a JSON-encoded AG-UI event. The `event` field
 *   in the SSE frame maps to the AG-UI event type, and the `data` field
 *   contains the full JSON event object.
 *
 * Usage:
 * ```typescript
 * const client = new AGUIClient({
 *   url: 'http://localhost:5567/ag-ui/events',
 *   autoReconnect: true,
 * });
 *
 * client.on('TextMessageContent', (event) => {
 *   console.log('Streaming text:', event.delta);
 * });
 *
 * client.on('*', (event) => {
 *   console.log('Any event:', event.type);
 * });
 *
 * client.connect();
 * // ...
 * client.disconnect();
 * ```
 *
 * @module ag-ui/AGUIClient
 */

import type {
  AGUIEvent,
  AGUIEventType,
  AGUIClientConfig,
  AGUIConnectionStatus,
} from './types';
import { DEFAULT_CLIENT_CONFIG } from './types';

// =============================================================================
// EVENT VALIDATION
// =============================================================================

const VALID_EVENT_TYPES: Set<string> = new Set<AGUIEventType>([
  'RunStarted',
  'RunFinished',
  'RunError',
  'StepStarted',
  'StepFinished',
  'TextMessageStart',
  'TextMessageContent',
  'TextMessageEnd',
  'ToolCallStart',
  'ToolCallArgs',
  'ToolCallEnd',
  'ToolCallResult',
  'StateSnapshot',
  'StateDelta',
  'MessagesSnapshot',
  'Custom',
  'Raw',
]);

/**
 * Validate and parse a raw SSE data string into an AGUIEvent.
 * Returns null if the data is not a valid AG-UI event.
 */
export function parseAGUIEvent(data: string): AGUIEvent | null {
  try {
    const parsed = JSON.parse(data);

    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    if (typeof parsed.type !== 'string' || !VALID_EVENT_TYPES.has(parsed.type)) {
      return null;
    }

    // Ensure timestamp is set
    if (!parsed.timestamp) {
      parsed.timestamp = new Date().toISOString();
    }

    return parsed as AGUIEvent;
  } catch {
    return null;
  }
}

// =============================================================================
// LISTENER TYPES
// =============================================================================

type EventListener = (event: AGUIEvent) => void;
type StatusListener = (status: AGUIConnectionStatus) => void;
type ErrorListener = (error: Error) => void;

// =============================================================================
// AGUI CLIENT
// =============================================================================

export class AGUIClient {
  private config: Required<AGUIClientConfig>;
  private eventSource: EventSource | null = null;
  private status: AGUIConnectionStatus = 'disconnected';
  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed: boolean = false;

  // Listeners
  private eventListeners: Map<string, Set<EventListener>> = new Map();
  private statusListeners: Set<StatusListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();

  // Metrics
  private totalEvents: number = 0;
  private eventTimestamps: number[] = [];
  private readonly MAX_TIMESTAMP_HISTORY = 100;

  constructor(config?: Partial<AGUIClientConfig>) {
    this.config = { ...DEFAULT_CLIENT_CONFIG, ...config };
  }

  // ===========================================================================
  // CONNECTION LIFECYCLE
  // ===========================================================================

  /**
   * Connect to the AG-UI SSE endpoint.
   * If already connected, disconnects first and reconnects.
   */
  connect(configOverride?: Partial<AGUIClientConfig>): void {
    if (this.disposed) {
      throw new Error('AGUIClient has been disposed');
    }

    if (configOverride) {
      this.config = { ...this.config, ...configOverride };
    }

    // Disconnect any existing connection
    this.closeEventSource();
    this.clearReconnectTimer();

    this.setStatus('connecting');

    try {
      // EventSource does not support custom headers natively.
      // For header-based auth, the URL should include query params,
      // or a polyfill EventSource that supports headers should be used.
      this.eventSource = new EventSource(this.config.url);

      this.eventSource.onopen = () => {
        this.setStatus('connected');
        this.reconnectAttempts = 0;
      };

      // Listen for the generic 'message' event (default SSE event type)
      this.eventSource.onmessage = (sseEvent: MessageEvent) => {
        this.handleSSEMessage(sseEvent.data);
      };

      // Also listen for named AG-UI event types as SSE event names
      for (const eventType of VALID_EVENT_TYPES) {
        this.eventSource.addEventListener(eventType, ((sseEvent: MessageEvent) => {
          this.handleSSEMessage(sseEvent.data);
        }) as EventListenerOrEventListenerObject);
      }

      this.eventSource.onerror = () => {
        if (this.disposed) return;

        // EventSource automatically reconnects, but we want to track status
        if (this.eventSource?.readyState === EventSource.CONNECTING) {
          this.setStatus('reconnecting');
          this.reconnectAttempts++;
        } else if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.setStatus('disconnected');
          if (this.config.autoReconnect) {
            this.scheduleReconnect();
          }
        }
      };
    } catch (err) {
      this.setStatus('error');
      this.emitError(err instanceof Error ? err : new Error(String(err)));
      if (this.config.autoReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Disconnect from the AG-UI SSE endpoint.
   */
  disconnect(): void {
    this.closeEventSource();
    this.clearReconnectTimer();
    this.setStatus('disconnected');
    this.reconnectAttempts = 0;
  }

  /**
   * Dispose the client. Cannot be used after this call.
   */
  dispose(): void {
    this.disconnect();
    this.eventListeners.clear();
    this.statusListeners.clear();
    this.errorListeners.clear();
    this.disposed = true;
  }

  // ===========================================================================
  // EVENT LISTENERS
  // ===========================================================================

  /**
   * Register a listener for a specific AG-UI event type.
   * Use '*' to listen to all events.
   *
   * @returns Unsubscribe function
   */
  on(eventType: AGUIEventType | '*', listener: EventListener): () => void {
    const key = eventType;
    if (!this.eventListeners.has(key)) {
      this.eventListeners.set(key, new Set());
    }
    this.eventListeners.get(key)!.add(listener);

    return () => {
      const set = this.eventListeners.get(key);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.eventListeners.delete(key);
        }
      }
    };
  }

  /**
   * Register a listener for connection status changes.
   *
   * @returns Unsubscribe function
   */
  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  /**
   * Register a listener for connection errors.
   *
   * @returns Unsubscribe function
   */
  onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  // ===========================================================================
  // QUERIES
  // ===========================================================================

  /**
   * Get the current connection status.
   */
  getStatus(): AGUIConnectionStatus {
    return this.status;
  }

  /**
   * Get the total number of events received.
   */
  getTotalEvents(): number {
    return this.totalEvents;
  }

  /**
   * Get the current events per second rate.
   */
  getEventsPerSecond(): number {
    if (this.eventTimestamps.length < 2) return 0;
    const timeSpan =
      this.eventTimestamps[this.eventTimestamps.length - 1] -
      this.eventTimestamps[0];
    if (timeSpan <= 0) return 0;
    return Math.round((this.eventTimestamps.length / (timeSpan / 1000)) * 100) / 100;
  }

  /**
   * Get the number of reconnection attempts.
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * Get the current configuration.
   */
  getConfig(): Readonly<Required<AGUIClientConfig>> {
    return this.config;
  }

  // ===========================================================================
  // INTERNAL
  // ===========================================================================

  /**
   * Handle a raw SSE message data string.
   */
  private handleSSEMessage(data: string): void {
    if (this.disposed) return;

    const event = parseAGUIEvent(data);
    if (!event) return;

    // Update metrics
    this.totalEvents++;
    const now = Date.now();
    this.eventTimestamps.push(now);
    if (this.eventTimestamps.length > this.MAX_TIMESTAMP_HISTORY) {
      this.eventTimestamps.shift();
    }

    // Emit to specific type listeners
    const typeListeners = this.eventListeners.get(event.type);
    if (typeListeners) {
      for (const listener of typeListeners) {
        try {
          listener(event);
        } catch (err) {
          console.error(`[AGUIClient] Error in event listener for ${event.type}:`, err);
        }
      }
    }

    // Emit to wildcard listeners
    const wildcardListeners = this.eventListeners.get('*');
    if (wildcardListeners) {
      for (const listener of wildcardListeners) {
        try {
          listener(event);
        } catch (err) {
          console.error('[AGUIClient] Error in wildcard event listener:', err);
        }
      }
    }
  }

  /**
   * Update the connection status and notify listeners.
   */
  private setStatus(status: AGUIConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.statusListeners) {
      try {
        listener(status);
      } catch (err) {
        console.error('[AGUIClient] Error in status listener:', err);
      }
    }
  }

  /**
   * Emit an error to error listeners.
   */
  private emitError(error: Error): void {
    for (const listener of this.errorListeners) {
      try {
        listener(error);
      } catch (err) {
        console.error('[AGUIClient] Error in error listener:', err);
      }
    }
  }

  /**
   * Close the current EventSource if open.
   */
  private closeEventSource(): void {
    if (this.eventSource) {
      this.eventSource.onopen = null;
      this.eventSource.onmessage = null;
      this.eventSource.onerror = null;
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Schedule a reconnection with exponential backoff.
   */
  private scheduleReconnect(): void {
    if (this.disposed) return;

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.setStatus('error');
      this.emitError(
        new Error(`Max reconnection attempts (${this.config.maxReconnectAttempts}) exceeded`),
      );
      return;
    }

    this.clearReconnectTimer();
    this.setStatus('reconnecting');

    const delay = Math.min(
      this.config.initialReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.config.maxReconnectDelay,
    );

    this.reconnectTimer = setTimeout(() => {
      if (!this.disposed) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Clear the reconnection timer.
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create an AGUIClient instance.
 */
export function createAGUIClient(config?: Partial<AGUIClientConfig>): AGUIClient {
  return new AGUIClient(config);
}
