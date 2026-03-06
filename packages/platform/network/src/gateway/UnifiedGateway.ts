/**
 * Unified Communication Gateway
 *
 * Central message bus that normalizes all protocol traffic (MCP/A2A agent
 * messages, Photon/Mirror multiplayer state, and CRDT world state) into a
 * single Canonical Intermediate Representation (CIR) for unified routing,
 * conflict resolution, and observability.
 *
 * Architecture:
 *   [MCP Adapter] ─┐
 *   [A2A Adapter] ──┤
 *   [Photon]  ──────┤──▶ [Normalization] ──▶ [Router] ──▶ [Subscribers]
 *   [Mirror]  ──────┤                            │
 *   [CRDT]    ──────┘                   [Conflict Resolver]
 *
 * @module gateway/UnifiedGateway
 */

import {
  type CanonicalMessage,
  type ProtocolAdapter,
  type ProtocolType,
  type MessageChannel,
  type GatewayConfig,
  type GatewayEventMap,
  type GatewayEventType,
  type GatewayEventHandler,
  type GatewayMetrics,
  type RoutingRule,
  MessagePriority,
} from './types';
import {
  CRDTConflictResolver,
  type CRDTOperation,
} from './CRDTConflictResolver';
import { createAdapter } from './ProtocolAdapters';

// =============================================================================
// Subscription types
// =============================================================================

type ChannelSubscriber = (message: CanonicalMessage) => void;

interface Subscription {
  channel: string;
  handler: ChannelSubscriber;
}

// =============================================================================
// Default configuration
// =============================================================================

const DEFAULT_CONFIG: GatewayConfig = {
  maxThroughput: 10000,
  metricsEnabled: true,
  metricsIntervalMs: 5000,
  crdtConfig: {
    strategy: 'operation',
    thresholds: { operationMax: 15, deltaStateMax: 50 },
    maxClockDriftMs: 100,
    tiebreaker: 'timestamp',
  },
  adapters: [],
  routingRules: [],
  deadLetterEnabled: true,
  deadLetterMaxSize: 1000,
};

// =============================================================================
// Unified Gateway
// =============================================================================

export class UnifiedGateway {
  private config: GatewayConfig;
  private adapters: Map<ProtocolType, ProtocolAdapter> = new Map();
  private conflictResolver: CRDTConflictResolver;
  private subscriptions: Map<string, Subscription[]> = new Map();
  private eventHandlers: Map<string, Array<(...args: any[]) => void>> = new Map();
  private messageQueue: CanonicalMessage[] = [];
  private deadLetterQueue: CanonicalMessage[] = [];
  private routingRules: RoutingRule[] = [];
  private running = false;
  private metricsTimer: ReturnType<typeof setInterval> | null = null;
  private processingTimer: ReturnType<typeof setInterval> | null = null;

  /** Metrics counters */
  private totalMessages = 0;
  private messagesSinceLastInterval = 0;
  private normalizationLatencies: number[] = [];
  private routingLatencies: number[] = [];
  private conflictsPerInterval = 0;
  private startTime = 0;

  constructor(config?: Partial<GatewayConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.conflictResolver = new CRDTConflictResolver(this.config.crdtConfig);
    this.routingRules = [...this.config.routingRules];

    // Wire up conflict resolver events
    this.conflictResolver.onConflict((event) => {
      this.conflictsPerInterval++;
      this.emit('conflict:detected', {
        entityId: event.entityId,
        strategy: event.strategy,
        nodeCount: this.conflictResolver.getActiveNodeCount(),
      });
      if (event.resolved) {
        this.emit('conflict:resolved', {
          entityId: event.entityId,
          winner: event.winnerNodeId ?? 'unknown',
          strategy: event.strategy,
        });
      }
    });

    this.conflictResolver.onStrategyChange((event) => {
      this.emit('strategy:changed', event);
    });
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.startTime = Date.now();

    // Register configured adapters
    for (const protocol of this.config.adapters) {
      await this.registerAdapter(protocol);
    }

    // Start message processing loop
    this.processingTimer = setInterval(() => this.processQueue(), 1);

    // Start metrics collection
    if (this.config.metricsEnabled) {
      this.metricsTimer = setInterval(
        () => this.collectMetrics(),
        this.config.metricsIntervalMs,
      );
    }
  }

  async stop(): Promise<void> {
    this.running = false;

    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }

    // Stop all adapters
    for (const [, adapter] of this.adapters) {
      await adapter.stop();
    }
    this.adapters.clear();
  }

  // ===========================================================================
  // Adapter Management
  // ===========================================================================

  async registerAdapter(protocol: ProtocolType): Promise<void> {
    if (this.adapters.has(protocol)) {
      throw new Error(`Adapter already registered for protocol: ${protocol}`);
    }

    const adapter = createAdapter(protocol);
    await adapter.start();
    this.adapters.set(protocol, adapter);

    this.emit('adapter:connected', { protocol });
  }

  async unregisterAdapter(protocol: ProtocolType): Promise<void> {
    const adapter = this.adapters.get(protocol);
    if (!adapter) return;

    await adapter.stop();
    this.adapters.delete(protocol);
    this.emit('adapter:disconnected', { protocol, reason: 'unregistered' });
  }

  getAdapter(protocol: ProtocolType): ProtocolAdapter | undefined {
    return this.adapters.get(protocol);
  }

  // ===========================================================================
  // Message Ingestion
  // ===========================================================================

  /**
   * Ingest a native message from a specific protocol.
   * Normalizes it to CIR and enqueues for routing.
   */
  ingest<T>(protocol: ProtocolType, nativeMessage: T): CanonicalMessage {
    const adapter = this.adapters.get(protocol);
    if (!adapter) {
      throw new Error(
        `No adapter registered for protocol: ${protocol}. ` +
        `Registered: ${Array.from(this.adapters.keys()).join(', ')}`,
      );
    }

    const normStart = performance.now();
    const canonical = adapter.normalize(nativeMessage as any);
    const normLatency = performance.now() - normStart;
    this.normalizationLatencies.push(normLatency);

    // Check TTL
    if (canonical.ttlMs > 0) {
      const age = Date.now() - canonical.gatewayTimestamp;
      if (age > canonical.ttlMs) {
        this.emit('message:dropped', {
          message: canonical,
          reason: 'TTL expired',
        });
        return canonical;
      }
    }

    this.emit('message:received', {
      message: canonical,
      adapter: protocol,
    });

    // Handle CRDT messages through conflict resolver
    if (canonical.channel === 'world.crdt') {
      this.handleCRDTMessage(canonical);
    }

    // Enqueue for routing
    this.messageQueue.push(canonical);
    this.totalMessages++;
    this.messagesSinceLastInterval++;

    return canonical;
  }

  /**
   * Ingest a pre-normalized canonical message (e.g., from internal systems).
   */
  ingestCanonical(message: CanonicalMessage): void {
    this.messageQueue.push(message);
    this.totalMessages++;
    this.messagesSinceLastInterval++;

    if (message.channel === 'world.crdt') {
      this.handleCRDTMessage(message);
    }

    this.emit('message:received', {
      message,
      adapter: message.sourceProtocol,
    });
  }

  // ===========================================================================
  // CRDT Conflict Resolution
  // ===========================================================================

  private handleCRDTMessage(canonical: CanonicalMessage): void {
    const payload = canonical.payload as Record<string, unknown>;
    const operation: CRDTOperation = {
      entityId: (payload.entityId as string) ?? '',
      nodeId: canonical.senderId,
      type: (payload.type as CRDTOperation['type']) ?? 'set',
      path: (payload.path as string) ?? '',
      value: payload.value,
      vectorClock: canonical.vectorClock,
      timestamp: canonical.gatewayTimestamp,
      sequence: (payload.sequence as number) ?? 0,
    };

    this.conflictResolver.applyOperation(operation);
    this.conflictResolver.updateNodeClock(
      canonical.senderId,
      canonical.vectorClock,
    );
  }

  /**
   * Register a node (agent) with the conflict resolver.
   * Triggers strategy re-evaluation.
   */
  registerNode(nodeId: string): void {
    this.conflictResolver.registerNode(nodeId);
  }

  /**
   * Deregister a node.
   */
  deregisterNode(nodeId: string): void {
    this.conflictResolver.deregisterNode(nodeId);
  }

  // ===========================================================================
  // Message Routing
  // ===========================================================================

  /**
   * Process the message queue: apply routing rules and deliver to subscribers.
   */
  private processQueue(): void {
    if (!this.running) return;

    // Process up to maxThroughput messages per second (divided by interval)
    const batchSize = Math.ceil(this.config.maxThroughput / 1000);
    const batch = this.messageQueue.splice(0, batchSize);

    for (const message of batch) {
      this.routeMessage(message);
    }
  }

  private routeMessage(message: CanonicalMessage): void {
    const routeStart = performance.now();
    let routed = false;

    // Apply routing rules
    for (const rule of this.routingRules) {
      if (this.matchesPattern(message.channel, rule.sourcePattern)) {
        if (
          rule.minPriority !== undefined &&
          message.priority > rule.minPriority
        ) {
          continue;
        }

        const transformed = rule.transform ? rule.transform(message) : message;

        for (const target of rule.targets) {
          this.deliverToChannel(target, transformed);
          routed = true;
        }

        this.emit('message:routed', {
          message: transformed,
          targets: rule.targets,
        });
      }
    }

    // Deliver to direct channel subscribers
    if (this.deliverToChannel(message.channel, message)) {
      routed = true;
    }

    // Dead letter queue for undeliverable messages
    if (!routed && this.config.deadLetterEnabled) {
      this.deadLetterQueue.push(message);
      if (this.deadLetterQueue.length > this.config.deadLetterMaxSize) {
        this.deadLetterQueue.shift();
      }
      this.emit('message:deadletter', {
        message,
        error: 'No subscribers for channel: ' + message.channel,
      });
    }

    this.routingLatencies.push(performance.now() - routeStart);
  }

  private deliverToChannel(
    channel: string,
    message: CanonicalMessage,
  ): boolean {
    const subs = this.subscriptions.get(channel);
    if (!subs || subs.length === 0) return false;

    for (const sub of subs) {
      try {
        sub.handler(message);
      } catch (err) {
        this.emit('adapter:error', {
          protocol: message.sourceProtocol,
          error: `Subscriber error on ${channel}: ${err}`,
        });
      }
    }
    return true;
  }

  /**
   * Match a channel name against a glob pattern.
   * Supports: "agent.*" matches "agent.request", "agent.response"
   */
  private matchesPattern(channel: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern === channel) return true;

    // Convert glob to regex
    const regexStr = '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '[^.]+') + '$';
    return new RegExp(regexStr).test(channel);
  }

  // ===========================================================================
  // Subscription API
  // ===========================================================================

  /**
   * Subscribe to messages on a specific channel.
   * Supports glob patterns: "agent.*", "multiplayer.*", etc.
   */
  subscribe(
    channel: string,
    handler: ChannelSubscriber,
  ): () => void {
    const sub: Subscription = { channel, handler };

    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, []);
    }
    this.subscriptions.get(channel)!.push(sub);

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(channel);
      if (subs) {
        const idx = subs.indexOf(sub);
        if (idx >= 0) subs.splice(idx, 1);
      }
    };
  }

  /**
   * Add a routing rule.
   */
  addRoutingRule(rule: RoutingRule): void {
    this.routingRules.push(rule);
  }

  /**
   * Remove a routing rule by source pattern.
   */
  removeRoutingRule(sourcePattern: string): void {
    this.routingRules = this.routingRules.filter(
      (r) => r.sourcePattern !== sourcePattern,
    );
  }

  // ===========================================================================
  // Event System
  // ===========================================================================

  on<K extends GatewayEventType>(
    event: K,
    handler: GatewayEventHandler<K>,
  ): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);

    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx >= 0) handlers.splice(idx, 1);
      }
    };
  }

  private emit<K extends GatewayEventType>(
    event: K,
    data: GatewayEventMap[K],
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        (handler as GatewayEventHandler<K>)(data);
      }
    }
  }

  // ===========================================================================
  // Egress: Convert CIR back to native protocol
  // ===========================================================================

  /**
   * Convert a canonical message back to a native protocol format for egress.
   */
  toNative<T>(protocol: ProtocolType, message: CanonicalMessage): T {
    const adapter = this.adapters.get(protocol);
    if (!adapter) {
      throw new Error(`No adapter for protocol: ${protocol}`);
    }
    return adapter.denormalize(message) as T;
  }

  /**
   * Broadcast a canonical message to all registered adapters.
   * Each adapter denormalizes to its native format.
   */
  broadcast(message: CanonicalMessage): Map<ProtocolType, unknown> {
    const results = new Map<ProtocolType, unknown>();
    for (const [protocol, adapter] of this.adapters) {
      try {
        results.set(protocol, adapter.denormalize(message));
      } catch {
        // Skip adapters that can't handle this message type
      }
    }
    return results;
  }

  // ===========================================================================
  // Metrics & Health
  // ===========================================================================

  private collectMetrics(): void {
    const adapterHealths = new Map(
      Array.from(this.adapters.entries()).map(([p, a]) => [p, a.healthCheck()]),
    );

    this.emit('health:report', {
      adapters: Array.from(adapterHealths.values()),
      throughput: this.messagesSinceLastInterval /
        (this.config.metricsIntervalMs / 1000),
      queueDepth: this.messageQueue.length,
    });

    // Reset interval counters
    this.messagesSinceLastInterval = 0;
    this.conflictsPerInterval = 0;

    // Trim latency arrays to prevent unbounded growth
    if (this.normalizationLatencies.length > 1000) {
      this.normalizationLatencies = this.normalizationLatencies.slice(-500);
    }
    if (this.routingLatencies.length > 1000) {
      this.routingLatencies = this.routingLatencies.slice(-500);
    }
  }

  getMetrics(): GatewayMetrics {
    const avgNorm =
      this.normalizationLatencies.length > 0
        ? this.normalizationLatencies.reduce((a, b) => a + b, 0) /
          this.normalizationLatencies.length
        : 0;

    const avgRoute =
      this.routingLatencies.length > 0
        ? this.routingLatencies.reduce((a, b) => a + b, 0) /
          this.routingLatencies.length
        : 0;

    const conflictMetrics = this.conflictResolver.getConflictMetrics();

    return {
      totalMessages: this.totalMessages,
      messagesPerSecond: this.messagesSinceLastInterval /
        (this.config.metricsIntervalMs / 1000),
      avgNormalizationLatencyMs: avgNorm,
      avgRoutingLatencyMs: avgRoute,
      queueDepth: this.messageQueue.length,
      deadLetterDepth: this.deadLetterQueue.length,
      adapterMetrics: new Map(
        Array.from(this.adapters.entries()).map(([p, a]) => [
          p,
          a.healthCheck(),
        ]),
      ),
      crdtStrategy: this.conflictResolver.getCurrentStrategy(),
      agentCount: this.conflictResolver.getActiveNodeCount(),
      conflictsPerSecond: conflictMetrics.perSecond,
      uptimeSeconds: (Date.now() - this.startTime) / 1000,
    };
  }

  // ===========================================================================
  // Dead Letter Queue
  // ===========================================================================

  getDeadLetters(): CanonicalMessage[] {
    return [...this.deadLetterQueue];
  }

  clearDeadLetters(): void {
    this.deadLetterQueue.length = 0;
  }

  replayDeadLetters(): number {
    const letters = this.deadLetterQueue.splice(0);
    for (const msg of letters) {
      this.messageQueue.push(msg);
    }
    return letters.length;
  }

  // ===========================================================================
  // Conflict Resolver Access
  // ===========================================================================

  getConflictResolver(): CRDTConflictResolver {
    return this.conflictResolver;
  }

  getEntityState(entityId: string): Map<string, unknown> | null {
    return this.conflictResolver.getEntityState(entityId);
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  dispose(): void {
    this.stop();
    this.subscriptions.clear();
    this.eventHandlers.clear();
    this.messageQueue.length = 0;
    this.deadLetterQueue.length = 0;
    this.conflictResolver.dispose();
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createUnifiedGateway(
  config?: Partial<GatewayConfig>,
): UnifiedGateway {
  return new UnifiedGateway(config);
}
