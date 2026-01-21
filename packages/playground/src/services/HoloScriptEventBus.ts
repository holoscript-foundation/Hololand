/**
 * HoloScript Event Bus System
 * 
 * Central event management for all 10 systems with event replay,
 * filtering, logging, and multi-listener support.
 */

import { EventEmitter } from 'events'

export enum SystemEventType {
  // Networking events
  NETWORKING_OBJECT_UPDATED = 'networking:objectUpdated',
  NETWORKING_OBJECT_CREATED = 'networking:objectCreated',
  NETWORKING_OBJECT_DELETED = 'networking:objectDeleted',
  NETWORKING_SYNC_FAILED = 'networking:syncFailed',
  
  // Physics events
  PHYSICS_CONSTRAINT_APPLIED = 'physics:constraintApplied',
  PHYSICS_SOLVER_TICK = 'physics:solverTick',
  PHYSICS_COLLISION = 'physics:collision',
  
  // Generation events
  GENERATION_START = 'generation:generationStart',
  GENERATION_PROGRESS = 'generation:generationProgress',
  GENERATION_COMPLETE = 'generation:generationComplete',
  GENERATION_FAILED = 'generation:generationFailed',
  
  // Marketplace events
  MARKETPLACE_ITEMS_LOADED = 'marketplace:itemsLoaded',
  MARKETPLACE_PUBLISH_SUCCESS = 'marketplace:publishSuccess',
  MARKETPLACE_DOWNLOAD_START = 'marketplace:downloadStart',
  MARKETPLACE_DOWNLOAD_COMPLETE = 'marketplace:downloadComplete',
  MARKETPLACE_RATING_SUBMITTED = 'marketplace:ratingSubmitted',
  
  // Version Control events
  VERSION_CONTROL_SNAPSHOT_CREATED = 'versionControl:snapshotCreated',
  VERSION_CONTROL_SNAPSHOT_RESTORED = 'versionControl:snapshotRestored',
  VERSION_CONTROL_MERGE_START = 'versionControl:mergeStart',
  VERSION_CONTROL_MERGE_COMPLETE = 'versionControl:mergeComplete',
  VERSION_CONTROL_CONFLICT_DETECTED = 'versionControl:conflictDetected',
  
  // Party events
  PARTY_CREATED = 'party:partyCreated',
  PARTY_JOINED = 'party:partyJoined',
  PARTY_LEFT = 'party:partyLeft',
  PARTY_DISCOVERED = 'party:partyDiscovered',
  PARTY_PLAYER_JOINED = 'party:playerJoined',
  PARTY_PLAYER_LEFT = 'party:playerLeft',
  
  // Analytics events
  ANALYTICS_SESSION_STARTED = 'analytics:sessionStarted',
  ANALYTICS_SESSION_ENDED = 'analytics:sessionEnded',
  ANALYTICS_EVENT_TRACKED = 'analytics:eventTracked',
  ANALYTICS_EXPORT_READY = 'analytics:exportReady',
  
  // Sync events
  SYNC_ONLINE = 'sync:online',
  SYNC_OFFLINE = 'sync:offline',
  SYNC_START = 'sync:syncStart',
  SYNC_COMPLETE = 'sync:syncComplete',
  SYNC_CONFLICT = 'sync:conflict',
  SYNC_UPDATE_QUEUED = 'sync:updateQueued',
  
  // Network events
  NETWORK_PEER_CONNECTED = 'network:peerConnected',
  NETWORK_PEER_DISCONNECTED = 'network:peerDisconnected',
  NETWORK_PRESENCE_BROADCAST = 'network:presenceBroadcast',
  
  // Examples events
  EXAMPLES_WORLD_SPAWNED = 'examples:worldSpawned',
  EXAMPLES_WORLD_LOADED = 'examples:worldLoaded',
  EXAMPLES_WORLD_DESTROYED = 'examples:worldDestroyed'
}

interface EventLogEntry {
  timestamp: number
  event: SystemEventType
  data: any
  source: string
}

interface EventSubscription {
  handler: Function
  filter?: (data: any) => boolean
  once?: boolean
}

/**
 * Central event bus for all HoloScript systems
 * Provides:
 * - Event emission and listening
 * - Event history and replay
 * - Event filtering
 * - Namespace isolation
 * - Performance monitoring
 */
export class HoloScriptEventBus {
  private emitter: EventEmitter
  private eventLog: EventLogEntry[] = []
  private subscriptions = new Map<string, EventSubscription[]>()
  private eventStats = new Map<SystemEventType, { count: number; lastTime: number }>()
  private maxLogSize = 1000
  private enabled = true
  
  constructor() {
    this.emitter = new EventEmitter()
    this.emitter.setMaxListeners(100) // Increase for systems with many listeners
  }
  
  // =========================================================================
  // CORE EVENT OPERATIONS
  // =========================================================================
  
  /**
   * Emit event to all listeners
   */
  emit(event: SystemEventType | string, data: any = {}) {
    if (!this.enabled) return
    
    const source = this.getEventSource(event as SystemEventType)
    
    // Record in log
    this.logEvent(event as SystemEventType, data, source)
    
    // Update stats
    this.updateStats(event as SystemEventType)
    
    // Emit event
    this.emitter.emit(event, data)
  }
  
  /**
   * Listen to an event
   */
  on(event: SystemEventType | string, handler: Function, filter?: (data: any) => boolean) {
    const wrappedHandler = (data: any) => {
      if (filter && !filter(data)) return
      handler(data)
    }
    
    this.emitter.on(event, wrappedHandler)
    
    // Track subscription
    const subscriptions = this.subscriptions.get(event) || []
    subscriptions.push({ handler: wrappedHandler, filter })
    this.subscriptions.set(event, subscriptions)
    
    // Return unsubscribe function
    return () => this.off(event, wrappedHandler)
  }
  
  /**
   * Listen to event once
   */
  once(event: SystemEventType | string, handler: Function) {
    const wrappedHandler = (data: any) => {
      handler(data)
      this.off(event, wrappedHandler)
    }
    
    this.on(event, wrappedHandler)
  }
  
  /**
   * Stop listening to event
   */
  off(event: SystemEventType | string, handler?: Function) {
    if (handler) {
      this.emitter.off(event, handler as any)
      
      const subscriptions = this.subscriptions.get(event) || []
      const index = subscriptions.findIndex(s => s.handler === handler)
      if (index > -1) subscriptions.splice(index, 1)
    } else {
      this.emitter.removeAllListeners(event)
      this.subscriptions.delete(event)
    }
  }
  
  /**
   * Emit and wait for response
   */
  async request(event: SystemEventType | string, data: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off(event)
        reject(new Error(`Event request timeout: ${event}`))
      }, 5000)
      
      this.once(event, (response: any) => {
        clearTimeout(timeout)
        resolve(response)
      })
      
      this.emit(event as SystemEventType, data)
    })
  }
  
  // =========================================================================
  // EVENT HISTORY & REPLAY
  // =========================================================================
  
  /**
   * Get event log entries
   */
  getLog(filter?: { event?: SystemEventType; source?: string; since?: number }): EventLogEntry[] {
    let log = this.eventLog
    
    if (filter?.event) {
      log = log.filter(e => e.event === filter.event)
    }
    if (filter?.source) {
      log = log.filter(e => e.source === filter.source)
    }
    if (filter?.since) {
      log = log.filter(e => e.timestamp >= filter.since)
    }
    
    return log
  }
  
  /**
   * Replay events from log
   */
  replay(entries: EventLogEntry[]) {
    const wasEnabled = this.enabled
    this.enabled = false
    
    for (const entry of entries) {
      this.emitter.emit(entry.event, entry.data)
    }
    
    this.enabled = wasEnabled
  }
  
  /**
   * Clear event log
   */
  clearLog() {
    this.eventLog = []
  }
  
  /**
   * Export event log as JSON
   */
  exportLog(): string {
    return JSON.stringify(this.eventLog, null, 2)
  }
  
  // =========================================================================
  // EVENT FILTERING & QUERYING
  // =========================================================================
  
  /**
   * Get events by type
   */
  getEventsByType(eventType: SystemEventType): EventLogEntry[] {
    return this.eventLog.filter(e => e.event === eventType)
  }
  
  /**
   * Get events by source system
   */
  getEventsBySource(source: string): EventLogEntry[] {
    return this.eventLog.filter(e => e.source === source)
  }
  
  /**
   * Get events in time range
   */
  getEventsByTimeRange(startTime: number, endTime: number): EventLogEntry[] {
    return this.eventLog.filter(e => e.timestamp >= startTime && e.timestamp <= endTime)
  }
  
  /**
   * Get recent events
   */
  getRecentEvents(count: number = 10): EventLogEntry[] {
    return this.eventLog.slice(-count)
  }
  
  // =========================================================================
  // PERFORMANCE MONITORING
  // =========================================================================
  
  /**
   * Get event statistics
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {}
    
    for (const [event, data] of this.eventStats) {
      stats[event] = {
        count: data.count,
        lastTime: new Date(data.lastTime).toISOString()
      }
    }
    
    return stats
  }
  
  /**
   * Get stats for specific system
   */
  getSystemStats(systemName: string): Record<string, any> {
    const stats: Record<string, any> = {}
    
    for (const [event, data] of this.eventStats) {
      if (event.startsWith(systemName + ':')) {
        stats[event] = {
          count: data.count,
          lastTime: new Date(data.lastTime).toISOString()
        }
      }
    }
    
    return stats
  }
  
  /**
   * Get listener count
   */
  getListenerCount(event?: SystemEventType | string): number | Record<string, number> {
    if (event) {
      return this.emitter.listenerCount(event)
    }
    
    const counts: Record<string, number> = {}
    const eventNames = this.emitter.eventNames()
    for (const eventName of eventNames) {
      counts[eventName as string] = this.emitter.listenerCount(eventName)
    }
    return counts
  }
  
  /**
   * Enable/disable event bus
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }
  
  /**
   * Check if event bus is enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }
  
  // =========================================================================
  // PRIVATE HELPERS
  // =========================================================================
  
  private logEvent(event: SystemEventType, data: any, source: string) {
    const entry: EventLogEntry = {
      timestamp: Date.now(),
      event,
      data,
      source
    }
    
    this.eventLog.push(entry)
    
    // Prevent unbounded growth
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize)
    }
  }
  
  private updateStats(event: SystemEventType) {
    const current = this.eventStats.get(event)
    if (current) {
      current.count++
      current.lastTime = Date.now()
    } else {
      this.eventStats.set(event, { count: 1, lastTime: Date.now() })
    }
  }
  
  private getEventSource(event: SystemEventType): string {
    const parts = event.split(':')
    return parts[0] || 'unknown'
  }
  
  // =========================================================================
  // DEBUGGING & INSPECTION
  // =========================================================================
  
  /**
   * Pretty print event log
   */
  printLog(filter?: { event?: SystemEventType; source?: string; limit?: number }) {
    let entries = this.getLog({ event: filter?.event, source: filter?.source })
    
    if (filter?.limit) {
      entries = entries.slice(-filter.limit)
    }
    
    console.group('🎯 HoloScript Event Log')
    for (const entry of entries) {
      console.log(
        `[${new Date(entry.timestamp).toISOString()}] ${entry.event}`,
        entry.data
      )
    }
    console.groupEnd()
  }
  
  /**
   * Dump entire system state for debugging
   */
  dumpState() {
    return {
      enabled: this.enabled,
      eventCount: this.eventLog.length,
      listenerCount: this.getListenerCount(),
      stats: this.getStats(),
      recentEvents: this.getRecentEvents(5)
    }
  }
}

/**
 * Global singleton instance
 */
let globalEventBus: HoloScriptEventBus | null = null

/**
 * Get or create global event bus
 */
export function getEventBus(): HoloScriptEventBus {
  if (!globalEventBus) {
    globalEventBus = new HoloScriptEventBus()
  }
  return globalEventBus
}

/**
 * React component for event monitoring
 */
export function useEventBus() {
  const bus = getEventBus()
  
  return {
    emit: bus.emit.bind(bus),
    on: bus.on.bind(bus),
    once: bus.once.bind(bus),
    off: bus.off.bind(bus),
    request: bus.request.bind(bus),
    getLog: bus.getLog.bind(bus),
    getStats: bus.getStats.bind(bus),
    printLog: bus.printLog.bind(bus),
    setEnabled: bus.setEnabled.bind(bus),
    isEnabled: bus.isEnabled.bind(bus),
    dumpState: bus.dumpState.bind(bus)
  }
}
