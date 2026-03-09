/**
 * AgentCommunicationManager
 *
 * Centralized service for multi-agent communication with:
 * - DeltaCRDT synchronization for efficient state updates
 * - WebRTC P2P data channels for low-latency agent-to-agent communication
 * - Message routing with delivery guarantees and priority queuing
 * - Integration with @holoscript/crdt for authenticated CRDTs
 * - AgentRBAC permission enforcement for all operations
 * - MVC object persistence via IndexedDB
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────┐
 * │         AgentCommunicationManager (Public API)          │
 * └─────────────────────────────────────────────────────────┘
 *                           │
 *      ┌────────────────────┼────────────────────┐
 *      │                    │                    │
 *      ▼                    ▼                    ▼
 * ┌──────────┐      ┌─────────────┐      ┌──────────────┐
 * │  Delta   │      │   WebRTC    │      │   Message    │
 * │  CRDT    │◄────►│   Manager   │◄────►│   Router     │
 * │  Sync    │      │             │      │              │
 * │  Engine  │      └─────────────┘      └──────────────┘
 * └──────────┘              │                    │
 *      │                    │                    │
 *      │                    ▼                    ▼
 *      │            ┌─────────────┐      ┌──────────────┐
 *      │            │  Signaling  │      │   Delivery   │
 *      │            │   Server    │      │  Guarantee   │
 *      │            └─────────────┘      │   Manager    │
 *      │                                 └──────────────┘
 *      ▼
 * ┌──────────────────────┐
 * │   MVC Persistence    │
 * │   (IndexedDB)        │
 * └──────────────────────┘
 *      ▲
 *      │
 *      ▼
 * ┌──────────────────────┐
 * │   AgentRBAC          │
 * │   Permission Check   │
 * └──────────────────────┘
 *
 * @module AgentCommunicationManager
 * @version 1.0.0
 */

import type { DIDSigner, SignedOperation, WebRTCSync } from '@holoscript/crdt';
import type {
  DecisionHistory,
  ActiveTaskState,
  UserPreferences,
  SpatialContextSummary,
  EvidenceTrail,
} from '@holoscript/mvc-schema';
import type { RBACEnforcer, AccessDecision, AgentTokenPayload } from '@hololand/agents';

// ============================================================================
// Types
// ============================================================================

/**
 * MVC object types for type-safe persistence
 */
export type MVCObjectType =
  | 'DecisionHistory'
  | 'ActiveTaskState'
  | 'UserPreferences'
  | 'SpatialContextSummary'
  | 'EvidenceTrail';

/**
 * Union type of all MVC objects
 */
export type MVCObject =
  | DecisionHistory
  | ActiveTaskState
  | UserPreferences
  | SpatialContextSummary
  | EvidenceTrail;

/**
 * Agent communication message
 */
export interface AgentMessage {
  /** Unique message ID */
  id: string;

  /** Message type */
  type: string;

  /** Sender agent DID */
  from: string;

  /** Recipient agent DID(s) */
  to: string | string[];

  /** Message payload */
  payload: unknown;

  /** Message priority (1-10, 10 = highest) */
  priority?: number;

  /** Timestamp when message was created */
  timestamp: number;

  /** Delivery guarantee level */
  deliveryGuarantee?: 'at-most-once' | 'at-least-once' | 'exactly-once';

  /** TTL in milliseconds (optional) */
  ttl?: number;

  /** CRDT operation (if applicable) */
  crdtOperation?: SignedOperation;
}

/**
 * Message delivery status
 */
export interface MessageDeliveryStatus {
  /** Message ID */
  messageId: string;

  /** Delivery state */
  state: 'pending' | 'sent' | 'delivered' | 'failed' | 'expired';

  /** Number of delivery attempts */
  attempts: number;

  /** Last delivery attempt timestamp */
  lastAttempt: number;

  /** Error message (if failed) */
  error?: string;

  /** Recipients that successfully received the message */
  deliveredTo: string[];

  /** Recipients that failed to receive the message */
  failedRecipients: string[];
}

/**
 * WebRTC connection state
 */
export interface WebRTCConnectionState {
  /** Peer agent DID */
  peerId: string;

  /** Connection state */
  state: 'connecting' | 'connected' | 'disconnected' | 'failed';

  /** Data channel ready state */
  channelState?: RTCDataChannelState;

  /** ICE connection state */
  iceState?: RTCIceConnectionState;

  /** Connection latency in ms */
  latency?: number;

  /** Last activity timestamp */
  lastActivity: number;
}

/**
 * Delta CRDT synchronization state
 */
export interface DeltaSyncState {
  /** CRDT instance ID */
  crdtId: string;

  /** CRDT type */
  crdtType: string;

  /** Last synchronized operation ID */
  lastOperationId: string;

  /** Vector clock state */
  vectorClock: Record<string, number>;

  /** Number of pending operations */
  pendingOperations: number;

  /** Last sync timestamp */
  lastSync: number;
}

/**
 * Agent communication configuration
 */
export interface AgentCommunicationConfig {
  /** Agent DID */
  agentDid: string;

  /** DID signer for CRDT operations */
  didSigner: DIDSigner;

  /** RBAC enforcer for permission checks */
  rbacEnforcer: RBACEnforcer;

  /** Agent token payload for RBAC */
  agentToken: AgentTokenPayload;

  /** WebRTC configuration */
  webrtc?: {
    /** ICE servers for NAT traversal */
    iceServers?: RTCIceServer[];

    /** Signaling server URL */
    signalingUrl?: string;

    /** Max reconnection attempts */
    maxReconnectAttempts?: number;

    /** Heartbeat interval in ms */
    heartbeatInterval?: number;
  };

  /** Message routing configuration */
  routing?: {
    /** Max message queue size */
    maxQueueSize?: number;

    /** Message retry configuration */
    retry?: {
      /** Max retry attempts */
      maxAttempts?: number;

      /** Base delay in ms */
      baseDelay?: number;

      /** Max delay in ms */
      maxDelay?: number;
    };
  };

  /** Persistence configuration */
  persistence?: {
    /** IndexedDB database name */
    dbName?: string;

    /** Enable automatic persistence */
    autoSave?: boolean;

    /** Auto-save interval in ms */
    autoSaveInterval?: number;
  };

  /** Delta sync configuration */
  deltaSync?: {
    /** Enable delta synchronization */
    enabled?: boolean;

    /** Sync interval in ms */
    syncInterval?: number;

    /** Max delta batch size */
    maxBatchSize?: number;
  };
}

/**
 * Communication statistics
 */
export interface CommunicationStats {
  /** Total messages sent */
  messagesSent: number;

  /** Total messages received */
  messagesReceived: number;

  /** Total CRDT operations synchronized */
  crdtOperationsSynced: number;

  /** Active WebRTC connections */
  activeConnections: number;

  /** Average message latency in ms */
  averageLatency: number;

  /** Failed message count */
  failedMessages: number;

  /** Bytes sent */
  bytesSent: number;

  /** Bytes received */
  bytesReceived: number;
}

// ============================================================================
// AgentCommunicationManager
// ============================================================================

/**
 * Main service class for agent communication
 */
export class AgentCommunicationManager {
  private config: Required<AgentCommunicationConfig>;
  private deltaSyncEngine: DeltaCRDTSyncEngine;
  private webrtcManager: WebRTCManager;
  private messageRouter: MessageRouter;
  private persistenceLayer: MVCPersistenceLayer;
  private stats: CommunicationStats;
  private initialized: boolean = false;

  constructor(config: AgentCommunicationConfig) {
    this.config = this.normalizeConfig(config);
    this.stats = this.initializeStats();

    // Initialize subsystems
    this.deltaSyncEngine = new DeltaCRDTSyncEngine({
      agentDid: this.config.agentDid,
      didSigner: this.config.didSigner,
      rbacEnforcer: this.config.rbacEnforcer,
      agentToken: this.config.agentToken,
      enabled: this.config.deltaSync.enabled,
      syncInterval: this.config.deltaSync.syncInterval,
      maxBatchSize: this.config.deltaSync.maxBatchSize,
    });

    this.webrtcManager = new WebRTCManager({
      agentDid: this.config.agentDid,
      iceServers: this.config.webrtc.iceServers,
      signalingUrl: this.config.webrtc.signalingUrl,
      maxReconnectAttempts: this.config.webrtc.maxReconnectAttempts,
      heartbeatInterval: this.config.webrtc.heartbeatInterval,
      rbacEnforcer: this.config.rbacEnforcer,
      agentToken: this.config.agentToken,
    });

    this.messageRouter = new MessageRouter({
      agentDid: this.config.agentDid,
      maxQueueSize: this.config.routing.maxQueueSize,
      retry: this.config.routing.retry,
      rbacEnforcer: this.config.rbacEnforcer,
      agentToken: this.config.agentToken,
    });

    this.persistenceLayer = new MVCPersistenceLayer({
      dbName: this.config.persistence.dbName,
      autoSave: this.config.persistence.autoSave,
      autoSaveInterval: this.config.persistence.autoSaveInterval,
      rbacEnforcer: this.config.rbacEnforcer,
      agentToken: this.config.agentToken,
    });

    this.wireSubsystems();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the communication manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('AgentCommunicationManager already initialized');
    }

    // Initialize persistence layer first
    await this.persistenceLayer.initialize();

    // Initialize WebRTC manager
    await this.webrtcManager.initialize();

    // Initialize delta sync engine
    await this.deltaSyncEngine.initialize();

    // Start message router
    await this.messageRouter.start();

    this.initialized = true;
  }

  /**
   * Shutdown the communication manager
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    // Stop message router
    await this.messageRouter.stop();

    // Shutdown delta sync
    await this.deltaSyncEngine.shutdown();

    // Close WebRTC connections
    await this.webrtcManager.shutdown();

    // Flush and close persistence
    await this.persistenceLayer.close();

    this.initialized = false;
  }

  // ============================================================================
  // Messaging API
  // ============================================================================

  /**
   * Send a message to one or more agents
   */
  async sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<string> {
    this.ensureInitialized();

    // Permission check
    await this.checkPermission('send_message', { to: message.to });

    // Create full message
    const fullMessage: AgentMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: Date.now(),
    };

    // Route message
    const messageId = await this.messageRouter.route(fullMessage);

    // Update stats
    this.stats.messagesSent++;

    return messageId;
  }

  /**
   * Register a message handler for a specific message type
   */
  onMessage(
    messageType: string,
    handler: (message: AgentMessage) => Promise<void> | void,
  ): () => void {
    return this.messageRouter.onMessage(messageType, handler);
  }

  /**
   * Get message delivery status
   */
  async getMessageStatus(messageId: string): Promise<MessageDeliveryStatus | null> {
    return this.messageRouter.getMessageStatus(messageId);
  }

  // ============================================================================
  // WebRTC Connection Management
  // ============================================================================

  /**
   * Establish a WebRTC connection to another agent
   */
  async connectToPeer(peerDid: string): Promise<void> {
    this.ensureInitialized();

    // Permission check
    await this.checkPermission('connect_peer', { peerDid });

    await this.webrtcManager.connect(peerDid);
  }

  /**
   * Disconnect from a peer agent
   */
  async disconnectFromPeer(peerDid: string): Promise<void> {
    this.ensureInitialized();
    await this.webrtcManager.disconnect(peerDid);
  }

  /**
   * Get all active WebRTC connections
   */
  getActiveConnections(): WebRTCConnectionState[] {
    return this.webrtcManager.getActiveConnections();
  }

  /**
   * Get connection state for a specific peer
   */
  getConnectionState(peerDid: string): WebRTCConnectionState | null {
    return this.webrtcManager.getConnectionState(peerDid);
  }

  // ============================================================================
  // CRDT Synchronization
  // ============================================================================

  /**
   * Register a CRDT instance for synchronization
   */
  async registerCRDT(crdtId: string, crdtInstance: any): Promise<void> {
    this.ensureInitialized();

    // Permission check
    await this.checkPermission('register_crdt', { crdtId });

    await this.deltaSyncEngine.registerCRDT(crdtId, crdtInstance);
  }

  /**
   * Unregister a CRDT instance
   */
  async unregisterCRDT(crdtId: string): Promise<void> {
    this.ensureInitialized();
    await this.deltaSyncEngine.unregisterCRDT(crdtId);
  }

  /**
   * Manually trigger a sync for a specific CRDT
   */
  async syncCRDT(crdtId: string, peerDid?: string): Promise<void> {
    this.ensureInitialized();

    // Permission check
    await this.checkPermission('sync_crdt', { crdtId, peerDid });

    await this.deltaSyncEngine.sync(crdtId, peerDid);
  }

  /**
   * Get synchronization state for a CRDT
   */
  getSyncState(crdtId: string): DeltaSyncState | null {
    return this.deltaSyncEngine.getSyncState(crdtId);
  }

  // ============================================================================
  // MVC Object Persistence
  // ============================================================================

  /**
   * Save an MVC object to IndexedDB
   */
  async saveMVCObject(
    objectType: MVCObjectType,
    objectId: string,
    object: MVCObject,
  ): Promise<void> {
    this.ensureInitialized();

    // Permission check
    await this.checkPermission('save_mvc_object', { objectType, objectId });

    await this.persistenceLayer.save(objectType, objectId, object);
  }

  /**
   * Load an MVC object from IndexedDB
   */
  async loadMVCObject(
    objectType: MVCObjectType,
    objectId: string,
  ): Promise<MVCObject | null> {
    this.ensureInitialized();

    // Permission check
    await this.checkPermission('load_mvc_object', { objectType, objectId });

    return this.persistenceLayer.load(objectType, objectId);
  }

  /**
   * Delete an MVC object from IndexedDB
   */
  async deleteMVCObject(objectType: MVCObjectType, objectId: string): Promise<void> {
    this.ensureInitialized();

    // Permission check
    await this.checkPermission('delete_mvc_object', { objectType, objectId });

    await this.persistenceLayer.delete(objectType, objectId);
  }

  /**
   * List all MVC objects of a specific type
   */
  async listMVCObjects(objectType: MVCObjectType): Promise<string[]> {
    this.ensureInitialized();

    // Permission check
    await this.checkPermission('list_mvc_objects', { objectType });

    return this.persistenceLayer.list(objectType);
  }

  // ============================================================================
  // Statistics & Monitoring
  // ============================================================================

  /**
   * Get communication statistics
   */
  getStats(): CommunicationStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = this.initializeStats();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private normalizeConfig(config: AgentCommunicationConfig): Required<AgentCommunicationConfig> {
    return {
      agentDid: config.agentDid,
      didSigner: config.didSigner,
      rbacEnforcer: config.rbacEnforcer,
      agentToken: config.agentToken,
      webrtc: {
        iceServers: config.webrtc?.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }],
        signalingUrl: config.webrtc?.signalingUrl || 'ws://localhost:3001/signaling',
        maxReconnectAttempts: config.webrtc?.maxReconnectAttempts || 5,
        heartbeatInterval: config.webrtc?.heartbeatInterval || 5000,
      },
      routing: {
        maxQueueSize: config.routing?.maxQueueSize || 1000,
        retry: {
          maxAttempts: config.routing?.retry?.maxAttempts || 3,
          baseDelay: config.routing?.retry?.baseDelay || 1000,
          maxDelay: config.routing?.retry?.maxDelay || 30000,
        },
      },
      persistence: {
        dbName: config.persistence?.dbName || 'hololand_mvc_objects',
        autoSave: config.persistence?.autoSave ?? true,
        autoSaveInterval: config.persistence?.autoSaveInterval || 30000,
      },
      deltaSync: {
        enabled: config.deltaSync?.enabled ?? true,
        syncInterval: config.deltaSync?.syncInterval || 5000,
        maxBatchSize: config.deltaSync?.maxBatchSize || 100,
      },
    };
  }

  private initializeStats(): CommunicationStats {
    return {
      messagesSent: 0,
      messagesReceived: 0,
      crdtOperationsSynced: 0,
      activeConnections: 0,
      averageLatency: 0,
      failedMessages: 0,
      bytesSent: 0,
      bytesReceived: 0,
    };
  }

  private wireSubsystems(): void {
    // Wire WebRTC manager to message router
    this.webrtcManager.onMessage((message) => {
      this.messageRouter.handleIncomingMessage(message);
      this.stats.messagesReceived++;
    });

    // Wire message router to WebRTC manager
    this.messageRouter.onSend((message, recipient) => {
      this.webrtcManager.sendMessage(recipient, message);
    });

    // Wire delta sync to WebRTC for operation broadcast
    this.deltaSyncEngine.onOperation((operation, crdtId) => {
      const message: AgentMessage = {
        id: this.generateMessageId(),
        type: 'crdt_operation',
        from: this.config.agentDid,
        to: [], // Broadcast to all connected peers
        payload: { crdtId, operation },
        timestamp: Date.now(),
        crdtOperation: operation,
      };
      this.messageRouter.route(message);
      this.stats.crdtOperationsSynced++;
    });

    // Wire incoming CRDT operations to delta sync
    this.messageRouter.onMessage('crdt_operation', async (message) => {
      if (message.crdtOperation) {
        await this.deltaSyncEngine.applyOperation(message.crdtOperation);
      }
    });

    // Wire persistence layer to delta sync for auto-save
    if (this.config.persistence.autoSave) {
      this.deltaSyncEngine.onSync((crdtId, state) => {
        // Auto-save CRDT state to persistence layer
        // (implementation would map CRDT instances to MVC objects)
      });
    }

    // Update connection stats
    this.webrtcManager.onConnectionStateChange((state) => {
      this.stats.activeConnections = this.webrtcManager.getActiveConnections().length;
    });
  }

  private async checkPermission(operation: string, context: any): Promise<void> {
    const decision: AccessDecision = await this.config.rbacEnforcer.checkAccess(
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

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('AgentCommunicationManager not initialized. Call initialize() first.');
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

// ============================================================================
// Subsystem Stub Imports (to be implemented)
// ============================================================================

/**
 * Delta CRDT synchronization engine
 * (Implementation in ./DeltaCRDTSyncEngine.ts)
 */
class DeltaCRDTSyncEngine {
  constructor(config: any) {}
  async initialize(): Promise<void> {}
  async shutdown(): Promise<void> {}
  async registerCRDT(crdtId: string, instance: any): Promise<void> {}
  async unregisterCRDT(crdtId: string): Promise<void> {}
  async sync(crdtId: string, peerDid?: string): Promise<void> {}
  getSyncState(crdtId: string): DeltaSyncState | null {
    return null;
  }
  async applyOperation(operation: SignedOperation): Promise<void> {}
  onOperation(handler: (operation: SignedOperation, crdtId: string) => void): void {}
  onSync(handler: (crdtId: string, state: any) => void): void {}
}

/**
 * WebRTC connection manager
 * (Implementation in ./WebRTCManager.ts)
 */
class WebRTCManager {
  constructor(config: any) {}
  async initialize(): Promise<void> {}
  async shutdown(): Promise<void> {}
  async connect(peerDid: string): Promise<void> {}
  async disconnect(peerDid: string): Promise<void> {}
  getActiveConnections(): WebRTCConnectionState[] {
    return [];
  }
  getConnectionState(peerDid: string): WebRTCConnectionState | null {
    return null;
  }
  onMessage(handler: (message: AgentMessage) => void): void {}
  sendMessage(recipient: string, message: AgentMessage): void {}
  onConnectionStateChange(handler: (state: WebRTCConnectionState) => void): void {}
}

/**
 * Message routing and delivery
 * (Implementation in ./MessageRouter.ts)
 */
class MessageRouter {
  constructor(config: any) {}
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async route(message: AgentMessage): Promise<string> {
    return message.id;
  }
  onMessage(type: string, handler: (message: AgentMessage) => Promise<void> | void): () => void {
    return () => {};
  }
  async handleIncomingMessage(message: AgentMessage): Promise<void> {}
  onSend(handler: (message: AgentMessage, recipient: string) => void): void {}
  async getMessageStatus(messageId: string): Promise<MessageDeliveryStatus | null> {
    return null;
  }
}

/**
 * MVC object persistence layer
 * (Implementation in ./MVCPersistenceLayer.ts)
 */
class MVCPersistenceLayer {
  constructor(config: any) {}
  async initialize(): Promise<void> {}
  async close(): Promise<void> {}
  async save(type: MVCObjectType, id: string, object: MVCObject): Promise<void> {}
  async load(type: MVCObjectType, id: string): Promise<MVCObject | null> {
    return null;
  }
  async delete(type: MVCObjectType, id: string): Promise<void> {}
  async list(type: MVCObjectType): Promise<string[]> {
    return [];
  }
}
