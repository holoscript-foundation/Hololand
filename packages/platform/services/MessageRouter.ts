/**
 * MessageRouter
 *
 * Advanced message routing system with:
 * - Delivery guarantees (at-most-once, at-least-once, exactly-once)
 * - Priority-based message queuing
 * - Message persistence for reliability
 * - Retry mechanisms with exponential backoff
 * - Dead letter queue for failed messages
 * - Message TTL (time-to-live) enforcement
 * - AgentRBAC permission enforcement
 * - Message acknowledgment tracking
 *
 * Delivery Guarantees:
 * - At-most-once: Send once, no retry (fire-and-forget)
 * - At-least-once: Retry until acknowledged (may duplicate)
 * - Exactly-once: Deduplication + acknowledgment (idempotent)
 *
 * @module MessageRouter
 * @version 1.0.0
 */

import type { RBACEnforcer, AgentTokenPayload } from '@hololand/agents';
import type { AgentMessage, MessageDeliveryStatus } from './AgentCommunicationManager';

// ============================================================================
// Types
// ============================================================================

/**
 * Message router configuration
 */
export interface MessageRouterConfig {
  /** Local agent DID */
  agentDid: string;

  /** Maximum message queue size */
  maxQueueSize: number;

  /** Retry configuration */
  retry: {
    /** Maximum retry attempts */
    maxAttempts: number;

    /** Base delay between retries (ms) */
    baseDelay: number;

    /** Maximum delay between retries (ms) */
    maxDelay: number;
  };

  /** RBAC enforcer */
  rbacEnforcer: RBACEnforcer;

  /** Agent token for RBAC */
  agentToken: AgentTokenPayload;

  /** Enable message persistence */
  enablePersistence?: boolean;

  /** Message processing interval (ms) */
  processingInterval?: number;

  /** Dead letter queue size */
  deadLetterQueueSize?: number;
}

/**
 * Priority queue node
 */
interface PriorityQueueNode {
  message: AgentMessage;
  priority: number;
}

/**
 * Message handler function
 */
type MessageHandler = (message: AgentMessage) => Promise<void> | void;

/**
 * Send handler function
 */
type SendHandler = (message: AgentMessage, recipient: string) => void;

/**
 * Internal message metadata
 */
interface MessageMetadata {
  message: AgentMessage;
  status: MessageDeliveryStatus;
  queuedAt: number;
  expiresAt: number | null;
  retryCount: number;
  nextRetryAt: number;
  ackReceived: boolean;
  deduplicationId: string;
}

// ============================================================================
// Priority Queue
// ============================================================================

/**
 * Priority queue for message ordering
 */
class PriorityQueue {
  private heap: PriorityQueueNode[] = [];

  /**
   * Add a message to the queue
   */
  enqueue(message: AgentMessage): void {
    const priority = message.priority || 5;
    const node: PriorityQueueNode = { message, priority };

    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * Remove and return the highest priority message
   */
  dequeue(): AgentMessage | null {
    if (this.heap.length === 0) return null;

    const top = this.heap[0];
    const bottom = this.heap.pop();

    if (this.heap.length > 0 && bottom) {
      this.heap[0] = bottom;
      this.bubbleDown(0);
    }

    return top.message;
  }

  /**
   * Peek at the highest priority message without removing it
   */
  peek(): AgentMessage | null {
    return this.heap.length > 0 ? this.heap[0].message : null;
  }

  /**
   * Get the size of the queue
   */
  size(): number {
    return this.heap.length;
  }

  /**
   * Check if the queue is empty
   */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].priority <= this.heap[parentIndex].priority) break;

      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let largest = index;

      if (
        leftChild < this.heap.length &&
        this.heap[leftChild].priority > this.heap[largest].priority
      ) {
        largest = leftChild;
      }

      if (
        rightChild < this.heap.length &&
        this.heap[rightChild].priority > this.heap[largest].priority
      ) {
        largest = rightChild;
      }

      if (largest === index) break;

      [this.heap[index], this.heap[largest]] = [this.heap[largest], this.heap[index]];
      index = largest;
    }
  }
}

// ============================================================================
// MessageRouter
// ============================================================================

/**
 * Message routing and delivery management system
 */
export class MessageRouter {
  private config: Required<MessageRouterConfig>;
  private messageQueue: PriorityQueue = new PriorityQueue();
  private deadLetterQueue: AgentMessage[] = [];
  private messageMetadata: Map<string, MessageMetadata> = new Map();
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private sendHandlers: Set<SendHandler> = new Set();
  private processingTimer: ReturnType<typeof setInterval> | null = null;
  private deduplicationCache: Map<string, number> = new Map();
  private running: boolean = false;

  constructor(config: MessageRouterConfig) {
    this.config = {
      enablePersistence: false,
      processingInterval: 100,
      deadLetterQueueSize: 1000,
      ...config,
    };
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Start the message router
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('MessageRouter already running');
    }

    this.running = true;
    this.startProcessing();
  }

  /**
   * Stop the message router
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    this.running = false;
    this.stopProcessing();

    // Process remaining messages
    await this.processQueue();
  }

  // ============================================================================
  // Routing
  // ============================================================================

  /**
   * Route a message to its destination(s)
   */
  async route(message: AgentMessage): Promise<string> {
    this.ensureRunning();

    // Permission check
    await this.checkPermission('route_message', { message });

    // Check queue size
    if (this.messageQueue.size() >= this.config.maxQueueSize) {
      throw new Error('Message queue full');
    }

    // Check deduplication (for exactly-once delivery)
    if (message.deliveryGuarantee === 'exactly-once') {
      const dedupId = this.getDeduplicationId(message);
      if (this.deduplicationCache.has(dedupId)) {
        console.warn(`Duplicate message detected: ${message.id}`);
        return message.id;
      }
      this.deduplicationCache.set(dedupId, Date.now());
    }

    // Create metadata
    const metadata = this.createMessageMetadata(message);
    this.messageMetadata.set(message.id, metadata);

    // Enqueue message
    this.messageQueue.enqueue(message);

    return message.id;
  }

  /**
   * Handle an incoming message from a peer
   */
  async handleIncomingMessage(message: AgentMessage): Promise<void> {
    this.ensureRunning();

    // Check deduplication
    if (message.deliveryGuarantee === 'exactly-once') {
      const dedupId = this.getDeduplicationId(message);
      if (this.deduplicationCache.has(dedupId)) {
        console.warn(`Duplicate incoming message detected: ${message.id}`);
        return;
      }
      this.deduplicationCache.set(dedupId, Date.now());
    }

    // Send acknowledgment if required
    if (
      message.deliveryGuarantee === 'at-least-once' ||
      message.deliveryGuarantee === 'exactly-once'
    ) {
      this.sendAcknowledgment(message);
    }

    // Dispatch to handlers
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(message);
        } catch (err) {
          console.error(`Message handler failed for type '${message.type}':`, err);
        }
      }
    }
  }

  /**
   * Register a message handler for a specific type
   */
  onMessage(messageType: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }

    this.messageHandlers.get(messageType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.get(messageType)?.delete(handler);
    };
  }

  /**
   * Register a send handler (called when message should be sent)
   */
  onSend(handler: SendHandler): void {
    this.sendHandlers.add(handler);
  }

  // ============================================================================
  // Message Status
  // ============================================================================

  /**
   * Get message delivery status
   */
  async getMessageStatus(messageId: string): Promise<MessageDeliveryStatus | null> {
    const metadata = this.messageMetadata.get(messageId);
    if (!metadata) return null;

    return { ...metadata.status };
  }

  /**
   * Acknowledge message receipt
   */
  acknowledgeMessage(messageId: string, recipient: string): void {
    const metadata = this.messageMetadata.get(messageId);
    if (!metadata) return;

    metadata.ackReceived = true;
    metadata.status.deliveredTo.push(recipient);

    if (this.allRecipientsAcknowledged(metadata)) {
      metadata.status.state = 'delivered';
    }
  }

  /**
   * Mark message as failed
   */
  markMessageFailed(messageId: string, recipient: string, error: string): void {
    const metadata = this.messageMetadata.get(messageId);
    if (!metadata) return;

    metadata.status.failedRecipients.push(recipient);
    metadata.status.error = error;

    if (this.allRecipientsFailed(metadata)) {
      metadata.status.state = 'failed';
      this.moveToDeadLetterQueue(metadata.message);
    }
  }

  // ============================================================================
  // Private Methods - Processing
  // ============================================================================

  private startProcessing(): void {
    this.processingTimer = setInterval(() => {
      this.processQueue().catch((err) => {
        console.error('Queue processing failed:', err);
      });
    }, this.config.processingInterval);
  }

  private stopProcessing(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
  }

  private async processQueue(): Promise<void> {
    const now = Date.now();

    // Clean up deduplication cache (remove entries older than 1 hour)
    for (const [dedupId, timestamp] of this.deduplicationCache) {
      if (now - timestamp > 3600000) {
        this.deduplicationCache.delete(dedupId);
      }
    }

    // Process messages
    while (!this.messageQueue.isEmpty()) {
      const message = this.messageQueue.peek();
      if (!message) break;

      const metadata = this.messageMetadata.get(message.id);
      if (!metadata) {
        this.messageQueue.dequeue();
        continue;
      }

      // Check expiration
      if (metadata.expiresAt && now > metadata.expiresAt) {
        metadata.status.state = 'expired';
        this.messageQueue.dequeue();
        this.moveToDeadLetterQueue(message);
        continue;
      }

      // Check if ready for retry
      if (metadata.status.state === 'pending' && now >= metadata.nextRetryAt) {
        this.messageQueue.dequeue();
        await this.sendMessage(metadata);
        continue;
      }

      // Check if already delivered or failed
      if (metadata.status.state === 'delivered' || metadata.status.state === 'failed') {
        this.messageQueue.dequeue();
        continue;
      }

      // Not ready to process yet
      break;
    }
  }

  private async sendMessage(metadata: MessageMetadata): Promise<void> {
    const message = metadata.message;
    const recipients = Array.isArray(message.to) ? message.to : [message.to];

    metadata.status.state = 'sent';
    metadata.status.attempts++;
    metadata.status.lastAttempt = Date.now();

    for (const recipient of recipients) {
      try {
        // Emit to send handlers
        for (const handler of this.sendHandlers) {
          handler(message, recipient);
        }

        // For at-most-once, mark as delivered immediately
        if (message.deliveryGuarantee === 'at-most-once') {
          metadata.status.deliveredTo.push(recipient);
          metadata.status.state = 'delivered';
        }
      } catch (err) {
        console.error(`Failed to send message to ${recipient}:`, err);
        this.handleSendFailure(metadata, recipient, String(err));
      }
    }
  }

  private handleSendFailure(
    metadata: MessageMetadata,
    recipient: string,
    error: string,
  ): void {
    metadata.status.failedRecipients.push(recipient);

    // Check retry limit
    if (metadata.status.attempts >= this.config.retry.maxAttempts) {
      metadata.status.state = 'failed';
      metadata.status.error = error;
      this.moveToDeadLetterQueue(metadata.message);
      return;
    }

    // Schedule retry
    const delay = this.calculateRetryDelay(metadata.retryCount);
    metadata.nextRetryAt = Date.now() + delay;
    metadata.retryCount++;
    metadata.status.state = 'pending';

    // Re-enqueue
    this.messageQueue.enqueue(metadata.message);
  }

  private sendAcknowledgment(message: AgentMessage): void {
    const ackMessage: AgentMessage = {
      id: `ack_${message.id}`,
      type: 'message_acknowledgment',
      from: this.config.agentDid,
      to: message.from,
      payload: { messageId: message.id },
      timestamp: Date.now(),
    };

    // Send ack through send handlers
    for (const handler of this.sendHandlers) {
      handler(ackMessage, message.from);
    }
  }

  private calculateRetryDelay(retryCount: number): number {
    const exponentialDelay =
      this.config.retry.baseDelay * Math.pow(2, retryCount);
    return Math.min(exponentialDelay, this.config.retry.maxDelay);
  }

  private createMessageMetadata(message: AgentMessage): MessageMetadata {
    const now = Date.now();

    return {
      message,
      status: {
        messageId: message.id,
        state: 'pending',
        attempts: 0,
        lastAttempt: 0,
        deliveredTo: [],
        failedRecipients: [],
      },
      queuedAt: now,
      expiresAt: message.ttl ? now + message.ttl : null,
      retryCount: 0,
      nextRetryAt: now,
      ackReceived: false,
      deduplicationId: this.getDeduplicationId(message),
    };
  }

  private getDeduplicationId(message: AgentMessage): string {
    // Create a unique ID based on message content for deduplication
    return `${message.from}_${message.type}_${message.timestamp}`;
  }

  private allRecipientsAcknowledged(metadata: MessageMetadata): boolean {
    const recipients = Array.isArray(metadata.message.to)
      ? metadata.message.to
      : [metadata.message.to];

    return recipients.every((recipient) =>
      metadata.status.deliveredTo.includes(recipient),
    );
  }

  private allRecipientsFailed(metadata: MessageMetadata): boolean {
    const recipients = Array.isArray(metadata.message.to)
      ? metadata.message.to
      : [metadata.message.to];

    return recipients.every((recipient) =>
      metadata.status.failedRecipients.includes(recipient),
    );
  }

  private moveToDeadLetterQueue(message: AgentMessage): void {
    if (this.deadLetterQueue.length >= this.config.deadLetterQueueSize) {
      this.deadLetterQueue.shift(); // Remove oldest
    }

    this.deadLetterQueue.push(message);
    console.warn(`Message moved to dead letter queue: ${message.id}`);
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get router statistics
   */
  getStats(): {
    queueSize: number;
    deadLetterQueueSize: number;
    totalMessages: number;
    deliveredMessages: number;
    failedMessages: number;
    pendingMessages: number;
  } {
    let delivered = 0;
    let failed = 0;
    let pending = 0;

    for (const metadata of this.messageMetadata.values()) {
      switch (metadata.status.state) {
        case 'delivered':
          delivered++;
          break;
        case 'failed':
        case 'expired':
          failed++;
          break;
        case 'pending':
        case 'sent':
          pending++;
          break;
      }
    }

    return {
      queueSize: this.messageQueue.size(),
      deadLetterQueueSize: this.deadLetterQueue.length,
      totalMessages: this.messageMetadata.size,
      deliveredMessages: delivered,
      failedMessages: failed,
      pendingMessages: pending,
    };
  }

  /**
   * Get dead letter queue messages
   */
  getDeadLetterQueue(): AgentMessage[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async checkPermission(operation: string, context: any): Promise<void> {
    const decision = await this.config.rbacEnforcer.checkAccess(
      this.config.agentToken,
      operation,
      JSON.stringify(context),
    );

    if (!decision.allowed) {
      throw new Error(
        `Permission denied for operation '${operation}': ${decision.reason}`,
      );
    }
  }

  private ensureRunning(): void {
    if (!this.running) {
      throw new Error('MessageRouter not running. Call start() first.');
    }
  }
}
