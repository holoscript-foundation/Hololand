/**
 * EventBus - Event system for world events
 */

import { logger } from './logger';

export interface WorldEvent {
  type: string;
  timestamp: number;
  data?: any;
}

type EventHandler = (event: WorldEvent) => void;

export class EventBus {
  private handlers: Map<string, Set<EventHandler>>;

  constructor() {
    this.handlers = new Map();
  }

  /**
   * Subscribe to events
   */
  on(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    this.handlers.get(eventType)!.add(handler);

    logger.debug('[EventBus] Handler registered', { eventType });

    // Return unsubscribe function
    return () => this.off(eventType, handler);
  }

  /**
   * Unsubscribe from events
   */
  off(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  /**
   * Emit an event
   */
  emit(event: WorldEvent): void {
    const handlers = this.handlers.get(event.type);
    if (!handlers || handlers.size === 0) {
      return;
    }

    logger.debug('[EventBus] Event emitted', {
      type: event.type,
      handlerCount: handlers.size,
    });

    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        logger.error('[EventBus] Handler error', {
          eventType: event.type,
          error,
        });
      }
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.handlers.clear();
    logger.debug('[EventBus] All listeners removed');
  }

  /**
   * Get statistics
   */
  getStats() {
    let totalHandlers = 0;
    for (const handlers of this.handlers.values()) {
      totalHandlers += handlers.size;
    }

    return {
      eventTypes: this.handlers.size,
      totalHandlers,
    };
  }
}
