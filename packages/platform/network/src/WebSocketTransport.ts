/**
 * WebSocketTransport
 *
 * Transport-layer abstraction over a raw WebSocket connection.
 * Implements the NetworkTransport interface for the NetworkManager.
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Heartbeat / keep-alive
 * - Binary (MessagePack-style) and JSON message encoding
 * - Message queue for offline buffering
 * - Sequence numbering for ordering
 */

import { logger } from './logger';
import type {
  NetworkTransport,
  NetworkMessage,
  NetworkEvents,
  NetworkEventCallback,
  PeerId,
  RoomId,
  TransportType,
} from './types';

export interface WebSocketTransportConfig {
  /** Override heartbeat interval in ms (default 30 000). */
  heartbeatInterval?: number;
  /** Connection timeout in ms (default 10 000). */
  timeout?: number;
  /** Automatically reconnect on drop (default true). */
  reconnect?: boolean;
  /** Max reconnection attempts (default 5). */
  reconnectAttempts?: number;
  /** Base delay between reconnection attempts in ms (default 1 000). */
  reconnectDelay?: number;
  /** Max messages to queue while disconnected (default 256). */
  maxQueueSize?: number;
  /** Use binary (ArrayBuffer) encoding when available (default false). */
  binary?: boolean;
}

const DEFAULTS: Required<WebSocketTransportConfig> = {
  heartbeatInterval: 30_000,
  timeout: 10_000,
  reconnect: true,
  reconnectAttempts: 5,
  reconnectDelay: 1_000,
  maxQueueSize: 256,
  binary: false,
};

export class WebSocketTransport implements NetworkTransport {
  readonly type: TransportType = 'websocket';

  private socket: WebSocket | null = null;
  private config: Required<WebSocketTransportConfig>;
  private _connected: boolean = false;
  private _peerId: PeerId = '';
  private _roomId: RoomId = '';
  private _url: string = '';
  private latency: number = 0;
  private pingTimestamp: number = 0;
  private sequence: number = 0;
  private reconnectCount: number = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private messageQueue: NetworkMessage[] = [];

  private listeners: Map<string, Set<Function>> = new Map();

  constructor(config: WebSocketTransportConfig = {}) {
    this.config = { ...DEFAULTS, ...config };
  }

  // ============================================================================
  // NetworkTransport interface
  // ============================================================================

  get connected(): boolean {
    return this._connected;
  }

  async connect(url: string, roomId: RoomId): Promise<PeerId> {
    if (this._connected) {
      logger.warn('WebSocketTransport: already connected');
      return this._peerId;
    }

    this._url = url;
    this._roomId = roomId;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.socket?.close();
        reject(new Error('WebSocketTransport: connection timeout'));
      }, this.config.timeout);

      try {
        this.socket = new WebSocket(url);
        if (this.config.binary) {
          this.socket.binaryType = 'arraybuffer';
        }

        this.socket.onopen = () => {
          clearTimeout(timeout);
          this._connected = true;
          this.reconnectCount = 0;
          this._peerId = this.generatePeerId();

          // Send join message
          this.sendRaw({
            type: 'transport:join',
            category: 'connection',
            payload: { peerId: this._peerId, roomId },
            timestamp: Date.now(),
          });

          this.startHeartbeat();
          this.flushQueue();
          this.emit('connected', { peerId: this._peerId, roomId });
          logger.info('WebSocketTransport: connected', { peerId: this._peerId, url });
          resolve(this._peerId);
        };

        this.socket.onclose = (event) => {
          clearTimeout(timeout);
          this.handleClose(event);
        };

        this.socket.onerror = () => {
          clearTimeout(timeout);
          this._connected = false;
          this.emit('error', { message: 'WebSocket error', code: 'WS_ERROR' });
          if (!this._connected) {
            reject(new Error('WebSocketTransport: connection failed'));
          }
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event);
        };
      } catch (err) {
        clearTimeout(timeout);
        reject(err);
      }
    });
  }

  disconnect(reason: string = 'client_disconnect'): void {
    this.stopHeartbeat();
    this.reconnectCount = this.config.reconnectAttempts; // prevent auto-reconnect
    if (this.socket) {
      this.socket.close(1000, reason);
      this.socket = null;
    }
    this._connected = false;
    this.emit('disconnected', { reason });
    logger.info('WebSocketTransport: disconnected', { reason });
  }

  send(message: NetworkMessage): boolean {
    if (!this._connected || !this.socket) {
      if (this.messageQueue.length < this.config.maxQueueSize) {
        this.messageQueue.push(message);
      }
      return false;
    }
    return this.sendRaw(message);
  }

  on<K extends keyof NetworkEvents>(
    event: K,
    handler: NetworkEventCallback<K>,
  ): () => void {
    const key = event as string;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(handler);
    return () => this.off(event, handler);
  }

  off<K extends keyof NetworkEvents>(
    event: K,
    handler: NetworkEventCallback<K>,
  ): void {
    this.listeners.get(event as string)?.delete(handler);
  }

  getLatency(): number {
    return this.latency;
  }

  getPeerId(): PeerId {
    return this._peerId;
  }

  // ============================================================================
  // Internal
  // ============================================================================

  private sendRaw(message: NetworkMessage): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      const fullMsg = {
        ...message,
        senderId: this._peerId,
        sequence: this.sequence++,
      };

      if (this.config.binary) {
        // Simple binary encoding: length-prefixed JSON (for now)
        const json = JSON.stringify(fullMsg);
        const encoder = new TextEncoder();
        this.socket.send(encoder.encode(json));
      } else {
        this.socket.send(JSON.stringify(fullMsg));
      }
      return true;
    } catch {
      logger.error('WebSocketTransport: send failed');
      return false;
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      let data: string;
      if (event.data instanceof ArrayBuffer) {
        const decoder = new TextDecoder();
        data = decoder.decode(event.data);
      } else {
        data = event.data;
      }
      const message = JSON.parse(data) as NetworkMessage;

      // Handle pong
      if (message.type === 'transport:pong') {
        const payload = message.payload as { timestamp: number };
        this.latency = Date.now() - payload.timestamp;
        return;
      }

      // Handle join acknowledgement
      if (message.type === 'transport:join_ack') {
        const payload = message.payload as { peerId: PeerId };
        if (payload.peerId) {
          this._peerId = payload.peerId;
        }
        return;
      }

      // Handle peer events
      if (message.type === 'transport:peer_joined') {
        const payload = message.payload as any;
        this.emit('peerJoined', {
          peer: {
            peerId: payload.peerId,
            displayName: payload.displayName || payload.peerId,
            joinedAt: Date.now(),
            latency: 0,
            transport: 'websocket',
          },
        });
        return;
      }

      if (message.type === 'transport:peer_left') {
        const payload = message.payload as any;
        this.emit('peerLeft', { peerId: payload.peerId, reason: payload.reason || 'left' });
        return;
      }

      // Handle entity events
      if (message.type === 'transport:entity_spawned') {
        this.emit('entitySpawned', { entity: message.payload as any });
        return;
      }

      if (message.type === 'transport:entity_updated') {
        this.emit('entityUpdated', { entity: message.payload as any });
        return;
      }

      if (message.type === 'transport:entity_despawned') {
        this.emit('entityDespawned', { networkId: (message.payload as any).networkId });
        return;
      }

      // Generic message
      this.emit('message', {
        type: message.type,
        data: message.payload,
        senderId: message.senderId || '',
      });
    } catch (err) {
      logger.error('WebSocketTransport: failed to parse message', { error: String(err) });
    }
  }

  private handleClose(event: CloseEvent): void {
    this.stopHeartbeat();
    this._connected = false;

    if (this.config.reconnect && this.reconnectCount < this.config.reconnectAttempts) {
      this.attemptReconnect();
    } else {
      this.emit('disconnected', { reason: event.reason || 'Connection closed' });
    }
  }

  private async attemptReconnect(): Promise<void> {
    this.reconnectCount++;
    this.emit('reconnecting', { attempt: this.reconnectCount });

    const delay = this.config.reconnectDelay * Math.pow(1.5, this.reconnectCount - 1);
    await new Promise((r) => setTimeout(r, delay));

    try {
      await this.connect(this._url, this._roomId);
    } catch {
      if (this.reconnectCount >= this.config.reconnectAttempts) {
        this.emit('disconnected', { reason: 'Max reconnection attempts reached' });
      }
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this._connected) {
        this.pingTimestamp = Date.now();
        this.sendRaw({
          type: 'transport:ping',
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

  private flushQueue(): void {
    const queued = [...this.messageQueue];
    this.messageQueue = [];
    for (const msg of queued) {
      this.send(msg);
    }
  }

  private emit<K extends keyof NetworkEvents>(event: K, data: NetworkEvents[K]): void {
    const handlers = this.listeners.get(event as string);
    if (handlers) {
      handlers.forEach((h) => (h as NetworkEventCallback<K>)(data));
    }
  }

  private generatePeerId(): PeerId {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // Debug / Metrics
  // ============================================================================

  /** Current number of queued messages waiting to be sent. */
  getQueueSize(): number {
    return this.messageQueue.length;
  }

  /** Total messages sent so far. */
  getSequence(): number {
    return this.sequence;
  }

  /** Number of reconnection attempts made. */
  getReconnectCount(): number {
    return this.reconnectCount;
  }
}
