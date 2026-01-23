/**
 * @hololand/network NetworkClient
 *
 * WebSocket client for connecting to Hololand multiplayer servers
 * Handles connection, reconnection, heartbeat, and message routing
 */

import { logger } from './logger';
import type {
  ConnectionConfig,
  ConnectionInfo,
  ConnectionState,
  NetworkMessage,
  NetworkEventMap,
  NetworkEventType,
  NetworkEventHandler,
  MessageCategory,
} from './types';

const DEFAULT_CONFIG: Required<Omit<ConnectionConfig, 'url'>> = {
  reconnect: true,
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  heartbeatInterval: 30000,
  timeout: 10000,
};

export class NetworkClient {
  private socket: WebSocket | null = null;
  private config: Required<ConnectionConfig>;
  private state: ConnectionState = 'disconnected';
  private clientId: string = '';
  private connectedAt: number = 0;
  private latency: number = 0;
  private reconnectCount: number = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pingTimestamp: number = 0;
  private messageSequence: number = 0;

  private eventListeners: Map<
    NetworkEventType,
    Set<NetworkEventHandler<NetworkEventType>>
  > = new Map();
  private messageHandlers: Map<
    string,
    Set<(message: NetworkMessage) => void>
  > = new Map();

  constructor(config: ConnectionConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info('NetworkClient initialized', { url: this.config.url });
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      logger.warn('Already connected or connecting');
      return;
    }

    this.state = 'connecting';
    logger.info('Connecting to server', { url: this.config.url });

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.socket?.close();
        reject(new Error('Connection timeout'));
      }, this.config.timeout);

      try {
        this.socket = new WebSocket(this.config.url);

        this.socket.onopen = () => {
          clearTimeout(timeoutId);
          this.handleOpen();
          resolve();
        };

        this.socket.onclose = (event) => {
          clearTimeout(timeoutId);
          this.handleClose(event);
        };

        this.socket.onerror = (event) => {
          clearTimeout(timeoutId);
          this.handleError(event);
          if (this.state === 'connecting') {
            reject(new Error('Connection failed'));
          }
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event);
        };
      } catch (error) {
        clearTimeout(timeoutId);
        this.state = 'error';
        reject(error);
      }
    });
  }

  disconnect(reason: string = 'client_disconnect'): void {
    logger.info('Disconnecting', { reason });
    this.stopHeartbeat();
    this.reconnectCount = this.config.reconnectAttempts; // Prevent reconnection
    if (this.socket) {
      this.socket.close(1000, reason);
      this.socket = null;
    }
    this.state = 'disconnected';
    this.emit('disconnected', { reason });
  }

  private handleOpen(): void {
    this.state = 'connected';
    this.clientId = this.generateClientId();
    this.connectedAt = Date.now();
    this.reconnectCount = 0;
    logger.info('Connected to server', { clientId: this.clientId });

    // Send handshake
    this.send({
      type: 'handshake',
      category: 'connection',
      payload: { clientId: this.clientId },
      timestamp: Date.now(),
    });

    this.startHeartbeat();
    this.emit('connected', {
      clientId: this.clientId,
      serverUrl: this.config.url,
    });
  }

  private handleClose(event: CloseEvent): void {
    logger.info('Connection closed', { code: event.code, reason: event.reason });
    this.stopHeartbeat();

    if (
      this.config.reconnect &&
      this.reconnectCount < this.config.reconnectAttempts
    ) {
      this.attemptReconnect();
    } else {
      this.state = 'disconnected';
      this.emit('disconnected', {
        reason: event.reason || 'Connection closed',
        code: event.code,
      });
    }
  }

  private handleError(event: Event): void {
    logger.error('WebSocket error', { event: String(event) });
    this.state = 'error';
    this.emit('error', {
      message: 'WebSocket error occurred',
      code: 'WS_ERROR',
    });
  }

  private async attemptReconnect(): Promise<void> {
    this.reconnectCount++;
    this.state = 'reconnecting';

    logger.info('Attempting reconnection', {
      attempt: this.reconnectCount,
      maxAttempts: this.config.reconnectAttempts,
    });

    this.emit('reconnecting', {
      attempt: this.reconnectCount,
      maxAttempts: this.config.reconnectAttempts,
    });

    const delay =
      this.config.reconnectDelay * Math.pow(1.5, this.reconnectCount - 1);

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      await this.connect();
    } catch {
      if (this.reconnectCount >= this.config.reconnectAttempts) {
        this.state = 'disconnected';
        this.emit('disconnected', { reason: 'Max reconnection attempts reached' });
      }
    }
  }

  // ============================================================================
  // Heartbeat
  // ============================================================================

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.state === 'connected') {
        this.pingTimestamp = Date.now();
        this.send({
          type: 'ping',
          category: 'connection',
          payload: { timestamp: this.pingTimestamp },
          timestamp: this.pingTimestamp,
        });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handlePong(timestamp: number): void {
    this.latency = Date.now() - timestamp;
    this.emit('latency', { ms: this.latency });
    logger.debug('Latency measured', { ms: this.latency });
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  private handleMessage(event: MessageEvent): void {
    try {
      const message: NetworkMessage = JSON.parse(event.data);

      // Handle system messages
      if (message.type === 'pong') {
        this.handlePong(message.payload as number);
        return;
      }

      if (message.type === 'handshake_ack') {
        const payload = message.payload as { clientId: string };
        this.clientId = payload.clientId;
        logger.info('Handshake acknowledged', { clientId: this.clientId });
        return;
      }

      // Route to message handlers
      this.routeMessage(message);
    } catch (error) {
      logger.error('Failed to parse message', { error: String(error) });
    }
  }

  private routeMessage(message: NetworkMessage): void {
    // Notify type-specific handlers
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => handler(message));
    }

    // Notify category handlers
    const categoryHandlers = this.messageHandlers.get(`category:${message.category}`);
    if (categoryHandlers) {
      categoryHandlers.forEach((handler) => handler(message));
    }

    // Notify global handlers
    const globalHandlers = this.messageHandlers.get('*');
    if (globalHandlers) {
      globalHandlers.forEach((handler) => handler(message));
    }
  }

  // ============================================================================
  // Sending Messages
  // ============================================================================

  send<T>(message: Omit<NetworkMessage<T>, 'senderId' | 'sequence'>): boolean {
    if (this.state !== 'connected' || !this.socket) {
      logger.warn('Cannot send message: not connected');
      return false;
    }

    const fullMessage: NetworkMessage<T> = {
      ...message,
      senderId: this.clientId,
      sequence: this.messageSequence++,
    };

    try {
      this.socket.send(JSON.stringify(fullMessage));
      logger.debug('Message sent', { type: message.type });
      return true;
    } catch (error) {
      logger.error('Failed to send message', { error: String(error) });
      return false;
    }
  }

  sendToRoom<T>(
    roomId: string,
    type: string,
    payload: T
  ): boolean {
    return this.send({
      type,
      category: 'room',
      payload: { roomId, data: payload },
      timestamp: Date.now(),
    });
  }

  sendRPC<T>(method: string, params?: unknown[]): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      const timeout = setTimeout(() => {
        this.messageHandlers.get(`rpc:${requestId}`)?.clear();
        reject(new Error('RPC timeout'));
      }, 10000);

      this.onMessage(`rpc:${requestId}`, (message) => {
        clearTimeout(timeout);
        const response = message.payload as { result?: T; error?: { message: string } };
        if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.result as T);
        }
        this.messageHandlers.get(`rpc:${requestId}`)?.clear();
      });

      this.send({
        type: 'rpc_request',
        category: 'rpc',
        payload: { id: requestId, method, params },
        timestamp: Date.now(),
      });
    });
  }

  // ============================================================================
  // Event System
  // ============================================================================

  on<T extends NetworkEventType>(
    event: T,
    handler: NetworkEventHandler<T>
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler as NetworkEventHandler<NetworkEventType>);

    return () => this.off(event, handler);
  }

  off<T extends NetworkEventType>(
    event: T,
    handler: NetworkEventHandler<T>
  ): void {
    this.eventListeners.get(event)?.delete(handler as NetworkEventHandler<NetworkEventType>);
  }

  private emit<T extends NetworkEventType>(
    event: T,
    data: NetworkEventMap[T]
  ): void {
    this.eventListeners.get(event)?.forEach((handler) => handler(data));
  }

  onMessage(
    type: string,
    handler: (message: NetworkMessage) => void
  ): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);

    return () => this.messageHandlers.get(type)?.delete(handler);
  }

  onCategory(
    category: MessageCategory,
    handler: (message: NetworkMessage) => void
  ): () => void {
    return this.onMessage(`category:${category}`, handler);
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getConnectionInfo(): ConnectionInfo {
    return {
      clientId: this.clientId,
      state: this.state,
      latency: this.latency,
      connectedAt: this.connectedAt,
      serverUrl: this.config.url,
    };
  }

  getState(): ConnectionState {
    return this.state;
  }

  getClientId(): string {
    return this.clientId;
  }

  getLatency(): number {
    return this.latency;
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
