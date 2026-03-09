/**
 * WebRTCManager
 *
 * Manages WebRTC peer-to-peer connections for agent communication with:
 * - P2P data channel setup and lifecycle management
 * - Signaling server integration for connection establishment
 * - ICE candidate gathering and negotiation
 * - Automatic reconnection with exponential backoff
 * - Connection quality monitoring (latency, packet loss)
 * - AgentRBAC permission enforcement
 * - Multi-peer mesh topology support
 *
 * Connection Flow:
 * 1. Agent A requests connection to Agent B
 * 2. Signaling server facilitates SDP offer/answer exchange
 * 3. ICE candidates exchanged through signaling
 * 4. P2P connection established via WebRTC
 * 5. Data channels opened (reliable + unreliable)
 * 6. Heartbeat mechanism keeps connection alive
 *
 * @module WebRTCManager
 * @version 1.0.0
 */

import type { RBACEnforcer, AgentTokenPayload } from '@hololand/agents';
import type { AgentMessage } from './AgentCommunicationManager';

// ============================================================================
// Types
// ============================================================================

/**
 * WebRTC connection configuration
 */
export interface WebRTCManagerConfig {
  /** Local agent DID */
  agentDid: string;

  /** ICE servers for NAT traversal */
  iceServers: RTCIceServer[];

  /** Signaling server WebSocket URL */
  signalingUrl: string;

  /** Maximum reconnection attempts */
  maxReconnectAttempts: number;

  /** Heartbeat interval in milliseconds */
  heartbeatInterval: number;

  /** RBAC enforcer */
  rbacEnforcer: RBACEnforcer;

  /** Agent token for RBAC */
  agentToken: AgentTokenPayload;

  /** Enable data channel compression */
  enableCompression?: boolean;

  /** Max message size before chunking (bytes) */
  maxMessageSize?: number;
}

/**
 * Peer connection wrapper
 */
interface PeerConnection {
  /** Remote agent DID */
  peerId: string;

  /** WebRTC peer connection */
  connection: RTCPeerConnection;

  /** Reliable data channel (ordered, guaranteed delivery) */
  reliableChannel: RTCDataChannel | null;

  /** Unreliable data channel (unordered, no retransmission) */
  unreliableChannel: RTCDataChannel | null;

  /** Connection state */
  state: 'connecting' | 'connected' | 'disconnected' | 'failed';

  /** ICE connection state */
  iceState: RTCIceConnectionState;

  /** Connection quality metrics */
  metrics: {
    latency: number;
    lastPing: number;
    lastPong: number;
    packetsSent: number;
    packetsReceived: number;
    bytesSent: number;
    bytesReceived: number;
  };

  /** Reconnection state */
  reconnect: {
    attempts: number;
    nextAttempt: number;
    backoff: number;
  };

  /** Last activity timestamp */
  lastActivity: number;
}

/**
 * Signaling message types
 */
enum SignalingMessageType {
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice_candidate',
  PEER_JOINED = 'peer_joined',
  PEER_LEFT = 'peer_left',
  ERROR = 'error',
}

/**
 * Signaling message structure
 */
interface SignalingMessage {
  type: SignalingMessageType;
  from: string;
  to: string;
  payload: any;
  timestamp: number;
}

/**
 * Connection state change event
 */
export interface ConnectionStateChangeEvent {
  peerId: string;
  state: 'connecting' | 'connected' | 'disconnected' | 'failed';
  iceState?: RTCIceConnectionState;
  channelState?: RTCDataChannelState;
  latency?: number;
  lastActivity: number;
}

// ============================================================================
// WebRTCManager
// ============================================================================

/**
 * WebRTC connection manager for P2P agent communication
 */
export class WebRTCManager {
  private config: Required<WebRTCManagerConfig>;
  private peers: Map<string, PeerConnection> = new Map();
  private signalingSocket: WebSocket | null = null;
  private messageHandlers: Set<(message: AgentMessage) => void> = new Set();
  private connectionStateHandlers: Set<(state: ConnectionStateChangeEvent) => void> =
    new Set();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private initialized: boolean = false;
  private reconnectQueue: Set<string> = new Set();

  constructor(config: WebRTCManagerConfig) {
    this.config = {
      enableCompression: false,
      maxMessageSize: 16 * 1024, // 16KB
      ...config,
    };
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Initialize WebRTC manager and connect to signaling server
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('WebRTCManager already initialized');
    }

    // Connect to signaling server
    await this.connectSignalingServer();

    // Start heartbeat timer
    this.startHeartbeat();

    this.initialized = true;
  }

  /**
   * Shutdown WebRTC manager and close all connections
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    // Stop heartbeat
    this.stopHeartbeat();

    // Close all peer connections
    for (const [peerId] of this.peers) {
      await this.disconnect(peerId);
    }

    // Close signaling connection
    if (this.signalingSocket) {
      this.signalingSocket.close();
      this.signalingSocket = null;
    }

    this.initialized = false;
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connect to a remote agent
   */
  async connect(peerDid: string): Promise<void> {
    this.ensureInitialized();

    // Permission check
    await this.checkPermission('connect_peer', { peerDid });

    if (this.peers.has(peerDid)) {
      const peer = this.peers.get(peerDid)!;
      if (peer.state === 'connected') {
        return; // Already connected
      }
    }

    // Create peer connection
    const peer = this.createPeerConnection(peerDid);
    this.peers.set(peerDid, peer);

    // Create offer
    await this.createOffer(peer);
  }

  /**
   * Disconnect from a remote agent
   */
  async disconnect(peerDid: string): Promise<void> {
    const peer = this.peers.get(peerDid);
    if (!peer) return;

    // Close data channels
    peer.reliableChannel?.close();
    peer.unreliableChannel?.close();

    // Close peer connection
    peer.connection.close();

    // Update state
    peer.state = 'disconnected';

    // Remove from peers
    this.peers.delete(peerDid);

    // Emit state change
    this.emitStateChange({
      peerId: peerDid,
      state: 'disconnected',
      lastActivity: Date.now(),
    });
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): ConnectionStateChangeEvent[] {
    return Array.from(this.peers.values())
      .filter((peer) => peer.state === 'connected')
      .map((peer) => this.peerToStateEvent(peer));
  }

  /**
   * Get connection state for a specific peer
   */
  getConnectionState(peerDid: string): ConnectionStateChangeEvent | null {
    const peer = this.peers.get(peerDid);
    if (!peer) return null;

    return this.peerToStateEvent(peer);
  }

  // ============================================================================
  // Messaging
  // ============================================================================

  /**
   * Send a message to a specific peer
   */
  sendMessage(peerDid: string, message: AgentMessage): void {
    const peer = this.peers.get(peerDid);
    if (!peer || peer.state !== 'connected') {
      throw new Error(`Not connected to peer '${peerDid}'`);
    }

    const channel = this.selectChannel(peer, message);
    if (!channel || channel.readyState !== 'open') {
      throw new Error(`Data channel not ready for peer '${peerDid}'`);
    }

    const payload = JSON.stringify(message);

    // Check message size and chunk if necessary
    if (payload.length > this.config.maxMessageSize) {
      this.sendChunkedMessage(channel, payload, peer);
    } else {
      channel.send(payload);
      peer.metrics.packetsSent++;
      peer.metrics.bytesSent += payload.length;
    }

    peer.lastActivity = Date.now();
  }

  /**
   * Broadcast a message to all connected peers
   */
  broadcastMessage(message: AgentMessage): void {
    for (const [peerId, peer] of this.peers) {
      if (peer.state === 'connected') {
        try {
          this.sendMessage(peerId, message);
        } catch (err) {
          console.error(`Failed to send to peer ${peerId}:`, err);
        }
      }
    }
  }

  /**
   * Register a message handler
   */
  onMessage(handler: (message: AgentMessage) => void): void {
    this.messageHandlers.add(handler);
  }

  /**
   * Register a connection state change handler
   */
  onConnectionStateChange(handler: (state: ConnectionStateChangeEvent) => void): void {
    this.connectionStateHandlers.add(handler);
  }

  // ============================================================================
  // Private Methods - Signaling
  // ============================================================================

  private async connectSignalingServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.signalingSocket = new WebSocket(this.config.signalingUrl);

      this.signalingSocket.onopen = () => {
        // Register with signaling server
        this.sendSignalingMessage({
          type: SignalingMessageType.PEER_JOINED,
          from: this.config.agentDid,
          to: '',
          payload: { agentDid: this.config.agentDid },
          timestamp: Date.now(),
        });

        resolve();
      };

      this.signalingSocket.onerror = (error) => {
        reject(new Error(`Signaling connection failed: ${error}`));
      };

      this.signalingSocket.onmessage = (event) => {
        this.handleSignalingMessage(JSON.parse(event.data));
      };

      this.signalingSocket.onclose = () => {
        console.warn('Signaling connection closed');
        // Attempt to reconnect
        setTimeout(() => {
          if (this.initialized) {
            this.connectSignalingServer().catch(console.error);
          }
        }, 5000);
      };
    });
  }

  private sendSignalingMessage(message: SignalingMessage): void {
    if (!this.signalingSocket || this.signalingSocket.readyState !== WebSocket.OPEN) {
      throw new Error('Signaling socket not connected');
    }

    this.signalingSocket.send(JSON.stringify(message));
  }

  private async handleSignalingMessage(message: SignalingMessage): Promise<void> {
    switch (message.type) {
      case SignalingMessageType.OFFER:
        await this.handleOffer(message.from, message.payload.sdp);
        break;

      case SignalingMessageType.ANSWER:
        await this.handleAnswer(message.from, message.payload.sdp);
        break;

      case SignalingMessageType.ICE_CANDIDATE:
        await this.handleIceCandidate(message.from, message.payload.candidate);
        break;

      case SignalingMessageType.PEER_JOINED:
        // Optionally auto-connect to new peer
        break;

      case SignalingMessageType.PEER_LEFT:
        await this.disconnect(message.from);
        break;

      case SignalingMessageType.ERROR:
        console.error('Signaling error:', message.payload);
        break;
    }
  }

  // ============================================================================
  // Private Methods - WebRTC
  // ============================================================================

  private createPeerConnection(peerId: string): PeerConnection {
    const connection = new RTCPeerConnection({
      iceServers: this.config.iceServers,
    });

    const peer: PeerConnection = {
      peerId,
      connection,
      reliableChannel: null,
      unreliableChannel: null,
      state: 'connecting',
      iceState: 'new',
      metrics: {
        latency: 0,
        lastPing: 0,
        lastPong: 0,
        packetsSent: 0,
        packetsReceived: 0,
        bytesSent: 0,
        bytesReceived: 0,
      },
      reconnect: {
        attempts: 0,
        nextAttempt: 0,
        backoff: 1000,
      },
      lastActivity: Date.now(),
    };

    // ICE candidate handler
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: SignalingMessageType.ICE_CANDIDATE,
          from: this.config.agentDid,
          to: peerId,
          payload: { candidate: event.candidate.toJSON() },
          timestamp: Date.now(),
        });
      }
    };

    // Connection state change handler
    connection.onconnectionstatechange = () => {
      peer.state = this.mapConnectionState(connection.connectionState);
      this.emitStateChange(this.peerToStateEvent(peer));

      if (connection.connectionState === 'failed') {
        this.handleConnectionFailure(peer);
      }
    };

    // ICE connection state change handler
    connection.oniceconnectionstatechange = () => {
      peer.iceState = connection.iceConnectionState;

      if (connection.iceConnectionState === 'failed') {
        this.handleConnectionFailure(peer);
      }
    };

    // Data channel handler (for answerer)
    connection.ondatachannel = (event) => {
      const channel = event.channel;
      if (channel.label === 'reliable') {
        peer.reliableChannel = channel;
        this.setupDataChannel(peer, channel);
      } else if (channel.label === 'unreliable') {
        peer.unreliableChannel = channel;
        this.setupDataChannel(peer, channel);
      }
    };

    return peer;
  }

  private async createOffer(peer: PeerConnection): Promise<void> {
    // Create data channels (offerer creates them)
    peer.reliableChannel = peer.connection.createDataChannel('reliable', {
      ordered: true,
    });
    this.setupDataChannel(peer, peer.reliableChannel);

    peer.unreliableChannel = peer.connection.createDataChannel('unreliable', {
      ordered: false,
      maxRetransmits: 0,
    });
    this.setupDataChannel(peer, peer.unreliableChannel);

    // Create offer
    const offer = await peer.connection.createOffer();
    await peer.connection.setLocalDescription(offer);

    // Send offer via signaling
    this.sendSignalingMessage({
      type: SignalingMessageType.OFFER,
      from: this.config.agentDid,
      to: peer.peerId,
      payload: { sdp: offer.sdp },
      timestamp: Date.now(),
    });
  }

  private async handleOffer(peerId: string, sdp: string): Promise<void> {
    let peer = this.peers.get(peerId);
    if (!peer) {
      peer = this.createPeerConnection(peerId);
      this.peers.set(peerId, peer);
    }

    // Set remote description
    await peer.connection.setRemoteDescription(
      new RTCSessionDescription({ type: 'offer', sdp }),
    );

    // Create answer
    const answer = await peer.connection.createAnswer();
    await peer.connection.setLocalDescription(answer);

    // Send answer via signaling
    this.sendSignalingMessage({
      type: SignalingMessageType.ANSWER,
      from: this.config.agentDid,
      to: peerId,
      payload: { sdp: answer.sdp },
      timestamp: Date.now(),
    });
  }

  private async handleAnswer(peerId: string, sdp: string): Promise<void> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      console.warn(`Received answer from unknown peer: ${peerId}`);
      return;
    }

    await peer.connection.setRemoteDescription(
      new RTCSessionDescription({ type: 'answer', sdp }),
    );
  }

  private async handleIceCandidate(
    peerId: string,
    candidate: RTCIceCandidateInit,
  ): Promise<void> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      console.warn(`Received ICE candidate from unknown peer: ${peerId}`);
      return;
    }

    try {
      await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error(`Failed to add ICE candidate:`, err);
    }
  }

  private setupDataChannel(peer: PeerConnection, channel: RTCDataChannel): void {
    channel.onopen = () => {
      if (channel.label === 'reliable') {
        peer.state = 'connected';
        this.emitStateChange(this.peerToStateEvent(peer));
      }
    };

    channel.onclose = () => {
      console.log(`Data channel '${channel.label}' closed for peer ${peer.peerId}`);
    };

    channel.onmessage = (event) => {
      this.handleDataChannelMessage(peer, event.data);
    };

    channel.onerror = (error) => {
      console.error(`Data channel error for peer ${peer.peerId}:`, error);
    };
  }

  private handleDataChannelMessage(peer: PeerConnection, data: string): void {
    peer.metrics.packetsReceived++;
    peer.metrics.bytesReceived += data.length;
    peer.lastActivity = Date.now();

    try {
      const message: AgentMessage = JSON.parse(data);

      // Handle special messages
      if (message.type === 'ping') {
        this.handlePing(peer, message);
        return;
      } else if (message.type === 'pong') {
        this.handlePong(peer, message);
        return;
      }

      // Emit message to handlers
      this.messageHandlers.forEach((handler) => handler(message));
    } catch (err) {
      console.error('Failed to parse data channel message:', err);
    }
  }

  private handlePing(peer: PeerConnection, message: AgentMessage): void {
    const pong: AgentMessage = {
      id: message.id,
      type: 'pong',
      from: this.config.agentDid,
      to: peer.peerId,
      payload: message.payload,
      timestamp: Date.now(),
    };

    this.sendMessage(peer.peerId, pong);
  }

  private handlePong(peer: PeerConnection, message: AgentMessage): void {
    const latency = Date.now() - peer.metrics.lastPing;
    peer.metrics.latency = latency;
    peer.metrics.lastPong = Date.now();
  }

  private selectChannel(peer: PeerConnection, message: AgentMessage): RTCDataChannel | null {
    // Use unreliable channel for high-frequency state updates
    const useUnreliable =
      message.type === 'state_update' || message.type === 'crdt_operation';

    if (useUnreliable && peer.unreliableChannel?.readyState === 'open') {
      return peer.unreliableChannel;
    }

    return peer.reliableChannel;
  }

  private sendChunkedMessage(
    channel: RTCDataChannel,
    payload: string,
    peer: PeerConnection,
  ): void {
    const chunkSize = this.config.maxMessageSize;
    const chunks = Math.ceil(payload.length / chunkSize);

    for (let i = 0; i < chunks; i++) {
      const chunk = payload.slice(i * chunkSize, (i + 1) * chunkSize);
      const chunkMessage = JSON.stringify({
        type: 'chunk',
        chunkIndex: i,
        totalChunks: chunks,
        data: chunk,
      });

      channel.send(chunkMessage);
      peer.metrics.packetsSent++;
      peer.metrics.bytesSent += chunkMessage.length;
    }
  }

  // ============================================================================
  // Private Methods - Heartbeat & Reconnection
  // ============================================================================

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();

      for (const [peerId, peer] of this.peers) {
        if (peer.state === 'connected') {
          // Send ping
          const ping: AgentMessage = {
            id: `ping_${now}`,
            type: 'ping',
            from: this.config.agentDid,
            to: peerId,
            payload: { timestamp: now },
            timestamp: now,
          };

          peer.metrics.lastPing = now;
          this.sendMessage(peerId, ping);

          // Check for stale connections
          if (now - peer.lastActivity > this.config.heartbeatInterval * 3) {
            console.warn(`Connection to ${peerId} appears stale`);
            this.handleConnectionFailure(peer);
          }
        }
      }

      // Process reconnection queue
      this.processReconnectQueue();
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleConnectionFailure(peer: PeerConnection): void {
    if (peer.reconnect.attempts >= this.config.maxReconnectAttempts) {
      console.error(`Max reconnect attempts reached for peer ${peer.peerId}`);
      this.disconnect(peer.peerId);
      return;
    }

    // Schedule reconnection
    peer.reconnect.attempts++;
    peer.reconnect.backoff = Math.min(peer.reconnect.backoff * 2, 30000);
    peer.reconnect.nextAttempt = Date.now() + peer.reconnect.backoff;
    this.reconnectQueue.add(peer.peerId);
  }

  private processReconnectQueue(): void {
    const now = Date.now();

    for (const peerId of this.reconnectQueue) {
      const peer = this.peers.get(peerId);
      if (!peer) {
        this.reconnectQueue.delete(peerId);
        continue;
      }

      if (now >= peer.reconnect.nextAttempt) {
        console.log(`Reconnecting to peer ${peerId} (attempt ${peer.reconnect.attempts})`);
        this.reconnectQueue.delete(peerId);
        this.connect(peerId).catch((err) => {
          console.error(`Reconnection failed:`, err);
        });
      }
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapConnectionState(
    state: RTCPeerConnectionState,
  ): 'connecting' | 'connected' | 'disconnected' | 'failed' {
    switch (state) {
      case 'connecting':
      case 'new':
        return 'connecting';
      case 'connected':
        return 'connected';
      case 'disconnected':
        return 'disconnected';
      case 'failed':
      case 'closed':
        return 'failed';
      default:
        return 'disconnected';
    }
  }

  private peerToStateEvent(peer: PeerConnection): ConnectionStateChangeEvent {
    return {
      peerId: peer.peerId,
      state: peer.state,
      iceState: peer.iceState,
      channelState: peer.reliableChannel?.readyState,
      latency: peer.metrics.latency,
      lastActivity: peer.lastActivity,
    };
  }

  private emitStateChange(event: ConnectionStateChangeEvent): void {
    this.connectionStateHandlers.forEach((handler) => handler(event));
  }

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

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('WebRTCManager not initialized. Call initialize() first.');
    }
  }
}
