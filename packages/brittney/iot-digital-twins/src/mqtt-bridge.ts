/**
 * MQTT Bridge for Real-Time IoT State Updates
 *
 * Connects to MQTT broker and streams device state changes to HoloScript VR scenes
 */

import { connect, MqttClient } from 'mqtt';
import type { MQTTConfig, StateUpdate } from './types.js';

export type StateUpdateCallback = (update: StateUpdate) => void;

/**
 * MQTT Bridge for IoT → VR state synchronization
 *
 * Implements P.HOLOSCRIPT.11: State Binding Pattern
 * Target latency: <100ms from physical device to VR update
 */
export class MQTTBridge {
  private client: MqttClient | null = null;
  private config: Required<MQTTConfig>;
  private callbacks: Set<StateUpdateCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor(config: MQTTConfig) {
    this.config = {
      url: config.url,
      username: config.username || '',
      password: config.password || '',
      clientId: config.clientId || `clawdbot-${Date.now()}`,
      topics: config.topics || ['homeassistant/#'],
    };
  }

  /**
   * Connect to MQTT broker
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.client = connect(this.config.url, {
          clientId: this.config.clientId,
          username: this.config.username || undefined,
          password: this.config.password || undefined,
          clean: true,
          reconnectPeriod: 1000,
        });

        this.client.on('connect', () => {
          console.log('[MQTT] Connected to broker:', this.config.url);
          this.reconnectAttempts = 0;

          // Subscribe to topics
          for (const topic of this.config.topics) {
            this.client!.subscribe(topic, (err) => {
              if (err) {
                console.error(`[MQTT] Failed to subscribe to ${topic}:`, err);
              } else {
                console.log(`[MQTT] Subscribed to ${topic}`);
              }
            });
          }

          resolve();
        });

        this.client.on('error', (error) => {
          console.error('[MQTT] Connection error:', error);
          reject(error);
        });

        this.client.on('message', (topic, message) => {
          this.handleMessage(topic, message);
        });

        this.client.on('reconnect', () => {
          this.reconnectAttempts++;
          if (this.reconnectAttempts > this.maxReconnectAttempts) {
            console.error('[MQTT] Max reconnect attempts reached, giving up');
            this.client?.end();
          } else {
            console.log(`[MQTT] Reconnecting... (attempt ${this.reconnectAttempts})`);
          }
        });

        this.client.on('close', () => {
          console.log('[MQTT] Connection closed');
        });
      } catch (error) {
        console.error('[MQTT] Failed to initialize connection:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from MQTT broker
   */
  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.client) {
        this.client.end(false, {}, () => {
          console.log('[MQTT] Disconnected from broker');
          this.client = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Subscribe to state updates
   *
   * @param callback - Function to call when state updates arrive
   * @returns Unsubscribe function
   */
  onStateUpdate(callback: StateUpdateCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Publish state update to MQTT broker
   *
   * @param entityId - Entity ID to update
   * @param state - New state value
   * @param attributes - Optional attributes to update
   */
  async publishStateUpdate(
    entityId: string,
    state: string | number | boolean,
    attributes?: Record<string, any>
  ): Promise<void> {
    if (!this.client || !this.client.connected) {
      throw new Error('MQTT client not connected');
    }

    const topic = `homeassistant/${entityId}/set`;
    const payload = JSON.stringify({
      state,
      attributes,
      timestamp: new Date().toISOString(),
    });

    return new Promise((resolve, reject) => {
      this.client!.publish(topic, payload, { qos: 1 }, (error) => {
        if (error) {
          console.error(`[MQTT] Failed to publish to ${topic}:`, error);
          reject(error);
        } else {
          console.log(`[MQTT] Published state update to ${topic}`);
          resolve();
        }
      });
    });
  }

  /**
   * Handle incoming MQTT message
   */
  private handleMessage(topic: string, message: Buffer): void {
    try {
      const payload = JSON.parse(message.toString());

      // Extract entity ID from topic (e.g., "homeassistant/light/living_room" → "light.living_room")
      const entityId = this.extractEntityId(topic);
      if (!entityId) {
        return;
      }

      const update: StateUpdate = {
        entityId,
        state: payload.state,
        attributes: payload.attributes || {},
        timestamp: new Date(payload.timestamp || Date.now()),
      };

      // Notify all callbacks
      for (const callback of this.callbacks) {
        try {
          callback(update);
        } catch (error) {
          console.error('[MQTT] Error in state update callback:', error);
        }
      }
    } catch (error) {
      console.error('[MQTT] Failed to parse message:', error);
    }
  }

  /**
   * Extract entity ID from MQTT topic
   *
   * @param topic - MQTT topic (e.g., "homeassistant/light/living_room/state")
   * @returns Entity ID (e.g., "light.living_room") or null
   */
  private extractEntityId(topic: string): string | null {
    // Parse topic: homeassistant/<domain>/<object_id>/state
    const parts = topic.split('/');
    if (parts.length < 3 || parts[0] !== 'homeassistant') {
      return null;
    }

    const domain = parts[1];
    const objectId = parts[2];
    return `${domain}.${objectId}`;
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.client?.connected || false;
  }

  /**
   * Get broker URL
   */
  getBrokerUrl(): string {
    return this.config.url;
  }

  /**
   * Get subscribed topics
   */
  getTopics(): string[] {
    return this.config.topics;
  }
}

/**
 * Quick helper: Create and connect MQTT bridge
 *
 * @param config - MQTT configuration
 * @returns Connected MQTT bridge instance
 */
export async function createMQTTBridge(config: MQTTConfig): Promise<MQTTBridge> {
  const bridge = new MQTTBridge(config);
  await bridge.connect();
  return bridge;
}
