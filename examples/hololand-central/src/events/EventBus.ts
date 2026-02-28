/**
 * Event Bus System
 *
 * Type-safe event emitter for StoryWeaver Protocol
 * Handles portal activation, quest triggers, skill increases, etc.
 */

// ==========================================
// EVENT TYPE DEFINITIONS
// ==========================================

export interface PortalActivatedEvent {
  portalId: string;
  genre: string;
  timestamp: number;
}

export interface QuestTriggeredEvent {
  questId: string;
  genre: string;
  difficulty: string;
}

export interface QuestCompletedEvent {
  questId: string;
  rewards: {
    skills?: Record<string, number>;
    badges?: string[];
    unlocks?: string[];
  };
  completionTime: number;
}

export interface SkillIncreasedEvent {
  skill: string;
  oldValue: number;
  newValue: number;
  source: string; // Which quest/action caused increase
}

export interface PortalUnlockedEvent {
  portalId: string;
  genre: string;
  unlockedBy: string; // Quest that unlocked it
}

export interface NPCInteractionEvent {
  npcId: string;
  npcName: string;
  interactionType: 'talk' | 'quest_give' | 'hint' | 'celebrate';
  timestamp: number;
}

export interface QuestStageCompletedEvent {
  questId: string;
  stageId: string;
  stageName: string;
}

// Map of event names to their payload types
export interface HololandEvents {
  PortalActivated: PortalActivatedEvent;
  QuestTriggered: QuestTriggeredEvent;
  QuestCompleted: QuestCompletedEvent;
  SkillIncreased: SkillIncreasedEvent;
  PortalUnlocked: PortalUnlockedEvent;
  NPCInteraction: NPCInteractionEvent;
  QuestStageCompleted: QuestStageCompletedEvent;
}

// ==========================================
// EVENT BUS IMPLEMENTATION
// ==========================================

type EventHandler<T> = (payload: T) => void;
type EventName = keyof HololandEvents;

class EventBus {
  private listeners: Map<EventName, Set<EventHandler<any>>> = new Map();
  private anyListeners: Set<(eventName: EventName, payload: any) => void> = new Set();
  private eventHistory: Array<{ event: EventName; payload: any; timestamp: number }> = [];
  private maxHistorySize = 100;

  /**
   * Subscribe to a specific event
   */
  on<E extends EventName>(
    event: E,
    handler: EventHandler<HololandEvents[E]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  /**
   * Subscribe to a specific event (once only)
   */
  once<E extends EventName>(
    event: E,
    handler: EventHandler<HololandEvents[E]>
  ): () => void {
    const wrappedHandler = (payload: HololandEvents[E]) => {
      handler(payload);
      unsubscribe();
    };

    const unsubscribe = this.on(event, wrappedHandler);
    return unsubscribe;
  }

  /**
   * Subscribe to all events
   */
  onAny(handler: (eventName: EventName, payload: any) => void): () => void {
    this.anyListeners.add(handler);

    return () => {
      this.anyListeners.delete(handler);
    };
  }

  /**
   * Emit an event
   */
  emit<E extends EventName>(event: E, payload: HololandEvents[E]): void {
    console.log(`[EventBus] ${event}:`, payload);

    // Add to history
    this.eventHistory.push({
      event,
      payload,
      timestamp: Date.now()
    });

    // Trim history if too long
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Call specific listeners
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }

    // Call "any" listeners
    this.anyListeners.forEach(handler => {
      try {
        handler(event, payload);
      } catch (error) {
        console.error(`Error in "any" handler for ${event}:`, error);
      }
    });
  }

  /**
   * Get event history
   */
  getHistory(eventName?: EventName): Array<{ event: EventName; payload: any; timestamp: number }> {
    if (eventName) {
      return this.eventHistory.filter(entry => entry.event === eventName);
    }
    return [...this.eventHistory];
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners.clear();
    this.anyListeners.clear();
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: EventName): number {
    return this.listeners.get(event)?.size || 0;
  }
}

// ==========================================
// SINGLETON INSTANCE
// ==========================================

export const events = new EventBus();

// ==========================================
// REACT HOOKS
// ==========================================

import { useEffect } from 'react';

/**
 * React hook to subscribe to events
 */
export function useEvent<E extends EventName>(
  event: E,
  handler: EventHandler<HololandEvents[E]>,
  dependencies: any[] = []
): void {
  useEffect(() => {
    const unsubscribe = events.on(event, handler);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}

/**
 * React hook to subscribe to events (once only)
 */
export function useEventOnce<E extends EventName>(
  event: E,
  handler: EventHandler<HololandEvents[E]>,
  dependencies: any[] = []
): void {
  useEffect(() => {
    const unsubscribe = events.once(event, handler);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}

/**
 * React hook to subscribe to all events
 */
export function useAnyEvent(
  handler: (eventName: EventName, payload: any) => void,
  dependencies: any[] = []
): void {
  useEffect(() => {
    const unsubscribe = events.onAny(handler);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}

// ==========================================
// ANALYTICS INTEGRATION
// ==========================================

/**
 * Setup analytics tracking for all events
 */
export function setupAnalytics() {
  events.onAny((eventName, payload) => {
    // Send to analytics service
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track(eventName, payload);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`📊 Analytics: ${eventName}`);
      console.log('Payload:', payload);
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }
  });
}

// ==========================================
// DEBUGGING UTILITIES
// ==========================================

if (typeof window !== 'undefined') {
  (window as any).hololandEvents = {
    emit: events.emit.bind(events),
    history: () => events.getHistory(),
    clear: events.clear.bind(events),
    listenerCount: events.listenerCount.bind(events)
  };
}
