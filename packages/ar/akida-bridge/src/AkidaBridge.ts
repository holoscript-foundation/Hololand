/**
 * Akida Bridge WebSocket Client
 *
 * Connects to a BrainChip Akida AKD1500 edge device over WebSocket.
 * Streams LiDAR point clouds for neuromorphic PointNet++ inference
 * at under 300mW power consumption.
 *
 * Features:
 *   - Binary point cloud streaming protocol
 *   - Auto-reconnect with exponential backoff
 *   - Authentication handshake
 *   - Power and latency telemetry
 *   - Graceful degradation to fallback processor
 */

import type {
  AkidaBridgeConfig,
  AkidaBridgeEvents,
  AkidaClientMessage,
  AkidaDeviceMessage,
  AkidaDeviceInfo,
  AkidaConnectionState,
  PointCloudFrame,
  ClassificationResult,
  PowerMetrics,
  StreamConfig,
  ModelConfig,
} from './types';
import { DEFAULT_AKIDA_CONFIG } from './types';
import { serializePointCloud, deserializePointCloud } from './PointCloudProtocol';

export class AkidaBridge {
  private config: AkidaBridgeConfig;
  private events: AkidaBridgeEvents;
  private ws: WebSocket | null = null;
  private state: AkidaConnectionState = 'disconnected';
  private deviceInfo: AkidaDeviceInfo | null = null;
  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private powerMonitorTimer: ReturnType<typeof setInterval> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private lastPingSent: number = 0;
  private latestRoundTripMs: number = 0;
  private isStreaming: boolean = false;

  constructor(config?: Partial<AkidaBridgeConfig>, events?: AkidaBridgeEvents) {
    this.config = { ...DEFAULT_AKIDA_CONFIG, ...config };
    this.events = events ?? {};
  }

  // ===========================================================================
  // CONNECTION LIFECYCLE
  // ===========================================================================

  /**
   * Connect to the Akida edge device.
   */
  connect(): void {
    if (this.ws) {
      // Detach event handlers before closing to prevent the old socket's
      // onclose from triggering another reconnect cycle
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }

    this.setState('connecting');

    try {
      this.ws = new WebSocket(this.config.deviceUrl);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setState('connected');
        this.events.onConnected?.();

        // If auth token is provided, authenticate
        if (this.config.authToken) {
          this.sendJSON({ type: 'authenticate', token: this.config.authToken });
        } else {
          // No auth required, go directly to authenticated state
          this.setState('authenticated');
          this.events.onAuthenticated?.();
          this.startPingLoop();
        }
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = (event: CloseEvent) => {
        this.cleanupTimers();
        this.isStreaming = false;
        const reason = event.reason || `Code ${event.code}`;
        this.setState('disconnected');
        this.events.onDisconnected?.(reason);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.events.onError?.(new Error(`WebSocket error connecting to ${this.config.deviceUrl}`));
      };
    } catch (e) {
      this.setState('error');
      this.events.onError?.(
        new Error(`Failed to create WebSocket: ${e instanceof Error ? e.message : String(e)}`)
      );
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the Akida device.
   */
  disconnect(): void {
    this.cleanupTimers();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.isStreaming = false;
    this.setState('disconnected');
  }

  /**
   * Check whether the bridge is currently connected and authenticated.
   */
  get connected(): boolean {
    return this.state === 'authenticated' || this.state === 'streaming';
  }

  /**
   * Check whether point cloud streaming is active.
   */
  get streaming(): boolean {
    return this.isStreaming;
  }

  /**
   * Get current connection state.
   */
  getState(): AkidaConnectionState {
    return this.state;
  }

  /**
   * Get device information (available after connection).
   */
  getDeviceInfo(): AkidaDeviceInfo | null {
    return this.deviceInfo;
  }

  /**
   * Get latest round-trip latency to device in ms.
   */
  getRoundTripLatency(): number {
    return this.latestRoundTripMs;
  }

  // ===========================================================================
  // STREAMING CONTROL
  // ===========================================================================

  /**
   * Start point cloud streaming from the Akida device.
   *
   * @param streamConfig - Optional override for stream parameters
   */
  startStream(streamConfig?: Partial<StreamConfig>): void {
    if (!this.connected) {
      this.events.onError?.(new Error('Cannot start stream: not connected'));
      return;
    }

    const config: StreamConfig = {
      frameRate: this.config.targetFrameRate,
      maxPoints: this.config.maxPointsPerFrame,
      voxelSize: 0,
      ...streamConfig,
    };

    this.sendJSON({ type: 'start_stream', config });
  }

  /**
   * Stop point cloud streaming.
   */
  stopStream(): void {
    if (!this.isStreaming) return;
    this.sendJSON({ type: 'stop_stream' });
  }

  /**
   * Send a point cloud frame to the Akida device for classification.
   * Uses the binary protocol if configured, otherwise JSON.
   *
   * @param frame - The point cloud frame to send
   */
  sendPointCloud(frame: PointCloudFrame): void {
    if (!this.connected) {
      this.events.onError?.(new Error('Cannot send point cloud: not connected'));
      return;
    }

    if (this.config.useBinaryProtocol) {
      const buffer = serializePointCloud(frame);
      this.sendBinary(buffer);
    } else {
      this.sendJSON({
        type: 'start_stream',
        config: {
          frameRate: this.config.targetFrameRate,
          maxPoints: frame.pointCount,
          voxelSize: 0,
        },
      });
    }
  }

  /**
   * Configure the PointNet++ model on the Akida device.
   *
   * @param modelConfig - Model configuration parameters
   */
  configureModel(modelConfig: ModelConfig): void {
    if (!this.connected) {
      this.events.onError?.(new Error('Cannot configure model: not connected'));
      return;
    }

    this.sendJSON({ type: 'configure_model', modelConfig });
  }

  /**
   * Request current power metrics from the device.
   */
  requestPowerMetrics(): void {
    if (!this.connected) return;
    this.sendJSON({ type: 'request_power_metrics' });
  }

  // ===========================================================================
  // MESSAGE HANDLING
  // ===========================================================================

  /**
   * Handle an incoming WebSocket message (binary or text).
   */
  private handleMessage(data: ArrayBuffer | string): void {
    // Binary messages are point cloud frames from the device
    if (data instanceof ArrayBuffer) {
      this.handleBinaryMessage(data);
      return;
    }

    // Text messages are JSON protocol messages
    try {
      const message = JSON.parse(data) as AkidaDeviceMessage;
      this.handleDeviceMessage(message);
    } catch (e) {
      this.events.onError?.(
        new Error(`Failed to parse device message: ${e instanceof Error ? e.message : String(e)}`)
      );
    }
  }

  /**
   * Handle a binary message (point cloud frame from device).
   */
  private handleBinaryMessage(buffer: ArrayBuffer): void {
    try {
      const frame = deserializePointCloud(buffer);
      this.events.onPointCloudReceived?.(frame);
    } catch (e) {
      this.events.onError?.(
        new Error(`Failed to deserialize point cloud: ${e instanceof Error ? e.message : String(e)}`)
      );
    }
  }

  /**
   * Handle a JSON protocol message from the device.
   */
  private handleDeviceMessage(message: AkidaDeviceMessage): void {
    switch (message.type) {
      case 'auth_result':
        if (message.success) {
          this.setState('authenticated');
          this.events.onAuthenticated?.();
          this.startPingLoop();
        } else {
          this.setState('error');
          this.events.onError?.(new Error(`Authentication failed: ${message.error ?? 'unknown'}`));
        }
        break;

      case 'stream_started':
        this.isStreaming = true;
        this.setState('streaming');
        if (this.config.enablePowerMonitoring) {
          this.startPowerMonitoring();
        }
        break;

      case 'stream_stopped':
        this.isStreaming = false;
        this.setState('authenticated');
        this.stopPowerMonitoring();
        break;

      case 'classification_result':
        this.events.onClassificationResult?.(message.result);
        break;

      case 'power_metrics':
        this.events.onPowerUpdate?.(message.metrics);
        break;

      case 'device_info':
        this.deviceInfo = message.info;
        break;

      case 'error':
        this.events.onError?.(new Error(`Akida device error [${message.code}]: ${message.message}`));
        break;

      case 'pong':
        this.latestRoundTripMs = Date.now() - message.clientTimestamp;
        break;
    }
  }

  // ===========================================================================
  // SEND HELPERS
  // ===========================================================================

  /**
   * Send a JSON message to the device.
   */
  private sendJSON(message: AkidaClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send binary data to the device.
   */
  private sendBinary(buffer: ArrayBuffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(buffer);
    }
  }

  // ===========================================================================
  // RECONNECTION
  // ===========================================================================

  /**
   * Schedule a reconnection attempt with exponential backoff.
   */
  private scheduleReconnect(): void {
    if (!this.config.autoReconnect) return;
    if (
      this.config.maxReconnectAttempts > 0 &&
      this.reconnectAttempts >= this.config.maxReconnectAttempts
    ) {
      this.events.onError?.(
        new Error(`Max reconnect attempts (${this.config.maxReconnectAttempts}) reached`)
      );
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // Exponential backoff: base * 2^attempts, capped at 30s
    const delay = Math.min(
      this.config.reconnectIntervalMs * Math.pow(2, this.reconnectAttempts),
      30000
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  // ===========================================================================
  // PING / POWER MONITORING
  // ===========================================================================

  /**
   * Start the ping keepalive loop.
   */
  private startPingLoop(): void {
    this.stopPingLoop();
    this.pingTimer = setInterval(() => {
      if (this.connected) {
        this.lastPingSent = Date.now();
        this.sendJSON({ type: 'ping', timestamp: this.lastPingSent });
      }
    }, 5000);
  }

  private stopPingLoop(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * Start periodic power metrics polling.
   */
  private startPowerMonitoring(): void {
    this.stopPowerMonitoring();
    this.powerMonitorTimer = setInterval(() => {
      this.requestPowerMetrics();
    }, this.config.powerMonitorIntervalMs);
  }

  private stopPowerMonitoring(): void {
    if (this.powerMonitorTimer) {
      clearInterval(this.powerMonitorTimer);
      this.powerMonitorTimer = null;
    }
  }

  // ===========================================================================
  // STATE MANAGEMENT
  // ===========================================================================

  /**
   * Set connection state and notify listeners.
   */
  private setState(newState: AkidaConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.events.onStateChange?.(newState);
    }
  }

  /**
   * Clean up all timers.
   */
  private cleanupTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPingLoop();
    this.stopPowerMonitoring();
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    this.disconnect();
    this.events = {};
    this.deviceInfo = null;
  }
}
