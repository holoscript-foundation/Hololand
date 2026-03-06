/**
 * AgentCommunicationManager
 *
 * Manages all agent communication OFF the VR render loop.
 *
 * ARCHITECTURE:
 * The render loop runs at 72-90Hz (11.1-13.9ms budget). Agent communication
 * involves network I/O (WebSocket, HTTP, MCP tool calls) with 10-500ms latency.
 * Mixing these on the same loop causes frame drops.
 *
 * This manager runs on a separate timing loop (setInterval at configurable Hz)
 * and writes agent state updates to the BACK buffer of an AgentStateBuffer.
 * The renderer reads the FRONT buffer, which is updated atomically via swap().
 *
 * DATA FLOW:
 * ```
 *   Agent Message (MCP/WS/HTTP)
 *        |
 *        v
 *   AgentCommunicationManager.onMessage()     <-- OFF render loop
 *        |
 *        v
 *   AgentStateBuffer.getBackBuffer()          <-- Write to back buffer
 *        |
 *        v
 *   AgentStateBuffer.swap()                   <-- Between frames
 *        |
 *        v
 *   AgentStateBuffer.getFrontBuffer()         <-- Renderer reads (ON render loop)
 *        |
 *        v
 *   HololandRenderer.syncAgentState()         <-- Apply to Three.js scene
 * ```
 *
 * SUPPORTED MESSAGE SOURCES:
 * - WebSocket: Real-time bidirectional (lowest latency)
 * - MCP Tool calls: Via orchestrator HTTP API
 * - Polling: Periodic HTTP GET for agent state
 * - Direct: Programmatic state injection (for testing)
 *
 * @module AgentCommunicationManager
 */

import { logger } from './logger';
import {
  AgentStateBuffer,
  createAgentStateBuffer,
  createDefaultAgentAvatarState,
  type AgentWorldState,
  type AgentAvatarState,
  type AgentCommand,
  type AgentStateBufferMetrics,
  type Vec3,
  type Quat,
} from './AgentStateBuffer';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for the AgentCommunicationManager
 */
export interface AgentCommunicationConfig {
  /** Update frequency in Hz (how often to process agent messages, default: 30) */
  updateHz?: number;

  /** Maximum number of queued commands before oldest are dropped (default: 100) */
  maxCommandQueueSize?: number;

  /** Staleness threshold for buffer metrics (ms, default: 500) */
  stalenessThresholdMs?: number;

  /** Whether to auto-start the update loop (default: false) */
  autoStart?: boolean;

  /** Callback when an agent connects */
  onAgentConnected?: (agentId: string) => void;

  /** Callback when an agent disconnects */
  onAgentDisconnected?: (agentId: string) => void;

  /** Callback when a command is queued */
  onCommandQueued?: (command: AgentCommand) => void;

  /** Callback when buffer is swapped (for debugging) */
  onBufferSwap?: (sequence: number) => void;
}

/**
 * Message format for incoming agent communication
 */
export interface AgentMessage {
  /** Type of message */
  type: 'state_update' | 'command' | 'connect' | 'disconnect' | 'heartbeat';
  /** Agent that sent the message */
  agentId: string;
  /** Timestamp when message was created */
  timestamp: number;
  /** Message payload (varies by type) */
  payload: Record<string, unknown>;
}

/**
 * Metrics for the communication manager
 */
export interface AgentCommunicationMetrics {
  /** Whether the update loop is running */
  isRunning: boolean;
  /** Number of connected agents */
  connectedAgents: number;
  /** Total messages processed */
  totalMessagesProcessed: number;
  /** Messages processed per second (rolling average) */
  messagesPerSecond: number;
  /** Total commands queued */
  totalCommandsQueued: number;
  /** Commands currently pending (not yet consumed by renderer) */
  pendingCommands: number;
  /** Update loop frequency in Hz */
  updateHz: number;
  /** Average update loop duration in ms */
  averageUpdateDuration: number;
  /** Buffer metrics from AgentStateBuffer */
  bufferMetrics: AgentStateBufferMetrics;
}

// =============================================================================
// AGENT COMMUNICATION MANAGER
// =============================================================================

/**
 * Off-render-loop agent communication manager.
 *
 * Processes agent messages and writes state to the back buffer.
 * The renderer reads state from the front buffer.
 *
 * Usage:
 * ```typescript
 * const manager = new AgentCommunicationManager({ updateHz: 30 });
 * const buffer = manager.getBuffer();
 *
 * // Start the update loop
 * manager.start();
 *
 * // Send agent messages (from WebSocket, MCP, etc.)
 * manager.onMessage({
 *   type: 'state_update',
 *   agentId: 'brittney',
 *   timestamp: Date.now(),
 *   payload: { position: { x: 1, y: 0, z: 2 }, emotion: 'happy' },
 * });
 *
 * // In render loop (HololandRenderer.animate):
 * //   const agentState = buffer.getFrontBuffer();
 * //   this.syncAgentState(agentState);
 *
 * // Cleanup
 * manager.stop();
 * manager.dispose();
 * ```
 */
export class AgentCommunicationManager {
  private readonly config: Required<AgentCommunicationConfig>;
  private readonly buffer: AgentStateBuffer<AgentWorldState>;

  // Message queue (accumulated between update ticks)
  private messageQueue: AgentMessage[] = [];
  private readonly MAX_QUEUE_SIZE = 1000;

  // Update loop
  private updateIntervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;

  // Connected agents tracking
  private connectedAgents: Set<string> = new Set();

  // Metrics
  private totalMessagesProcessed: number = 0;
  private totalCommandsQueued: number = 0;
  private messageTimestamps: number[] = [];
  private updateDurations: number[] = [];
  private readonly MAX_METRIC_HISTORY = 120;
  private commandIdCounter: number = 0;

  constructor(config?: AgentCommunicationConfig) {
    this.config = {
      updateHz: config?.updateHz ?? 30,
      maxCommandQueueSize: config?.maxCommandQueueSize ?? 100,
      stalenessThresholdMs: config?.stalenessThresholdMs ?? 500,
      autoStart: config?.autoStart ?? false,
      onAgentConnected: config?.onAgentConnected ?? (() => {}),
      onAgentDisconnected: config?.onAgentDisconnected ?? (() => {}),
      onCommandQueued: config?.onCommandQueued ?? (() => {}),
      onBufferSwap: config?.onBufferSwap ?? (() => {}),
    };

    this.buffer = createAgentStateBuffer(this.config.stalenessThresholdMs);

    if (this.config.autoStart) {
      this.start();
    }

    logger.info('[AgentCommunicationManager] Initialized', {
      updateHz: this.config.updateHz,
      maxCommandQueueSize: this.config.maxCommandQueueSize,
      autoStart: this.config.autoStart,
    });
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Start the off-render-loop update cycle.
   * Processes queued messages and swaps buffers at the configured Hz.
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[AgentCommunicationManager] Already running');
      return;
    }

    const intervalMs = Math.max(1, Math.round(1000 / this.config.updateHz));
    this.updateIntervalId = setInterval(() => this.update(), intervalMs);
    this.isRunning = true;

    logger.info('[AgentCommunicationManager] Started update loop', {
      intervalMs,
      hz: this.config.updateHz,
    });
  }

  /**
   * Stop the update cycle. Buffer state is preserved.
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[AgentCommunicationManager] Already stopped');
      return;
    }

    if (this.updateIntervalId !== null) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = null;
    }
    this.isRunning = false;

    logger.info('[AgentCommunicationManager] Stopped');
  }

  /**
   * Dispose all resources. Cannot be restarted after this.
   */
  dispose(): void {
    this.stop();
    this.messageQueue = [];
    this.connectedAgents.clear();
    this.buffer.reset();

    logger.info('[AgentCommunicationManager] Disposed');
  }

  // ===========================================================================
  // MESSAGE INGESTION (OFF RENDER LOOP)
  // ===========================================================================

  /**
   * Receive a message from an agent.
   *
   * Messages are queued and processed on the next update tick (off render loop).
   * This method is safe to call from any context (WebSocket handler, HTTP callback, etc.)
   *
   * @param message - The agent message to process
   */
  onMessage(message: AgentMessage): void {
    // Prevent unbounded queue growth
    if (this.messageQueue.length >= this.MAX_QUEUE_SIZE) {
      logger.warn('[AgentCommunicationManager] Message queue overflow, dropping oldest');
      this.messageQueue.shift();
    }

    this.messageQueue.push(message);
  }

  /**
   * Directly update an agent's avatar state.
   * Convenience method that creates a state_update message internally.
   *
   * @param agentId - Agent to update
   * @param updates - Partial state to merge
   */
  updateAgentState(agentId: string, updates: Partial<AgentAvatarState>): void {
    this.onMessage({
      type: 'state_update',
      agentId,
      timestamp: Date.now(),
      payload: updates as Record<string, unknown>,
    });
  }

  /**
   * Queue a command from an agent to be consumed by the renderer.
   *
   * @param agentId - Agent issuing the command
   * @param commandType - Type of command
   * @param payload - Command data
   * @returns The command ID
   */
  queueCommand(agentId: string, commandType: string, payload: Record<string, unknown>): string {
    const id = `cmd-${agentId}-${++this.commandIdCounter}`;
    this.onMessage({
      type: 'command',
      agentId,
      timestamp: Date.now(),
      payload: { id, commandType, ...payload },
    });
    return id;
  }

  /**
   * Connect an agent. Creates default avatar state.
   *
   * @param agentId - Agent to connect
   * @param name - Display name
   * @param initialState - Optional initial avatar state
   */
  connectAgent(
    agentId: string,
    name?: string,
    initialState?: Partial<AgentAvatarState>,
  ): void {
    this.onMessage({
      type: 'connect',
      agentId,
      timestamp: Date.now(),
      payload: { name: name ?? agentId, ...initialState } as Record<string, unknown>,
    });
  }

  /**
   * Disconnect an agent. Removes avatar from world.
   *
   * @param agentId - Agent to disconnect
   */
  disconnectAgent(agentId: string): void {
    this.onMessage({
      type: 'disconnect',
      agentId,
      timestamp: Date.now(),
      payload: {},
    });
  }

  // ===========================================================================
  // UPDATE LOOP (OFF RENDER LOOP)
  // ===========================================================================

  /**
   * Process all queued messages and swap buffers.
   * Called by setInterval, NOT by requestAnimationFrame.
   */
  private update(): void {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // Drain the message queue
    const messages = this.messageQueue.splice(0);

    if (messages.length > 0) {
      const back = this.buffer.getBackBuffer();

      for (const msg of messages) {
        this.processMessage(msg, back);
      }

      // Increment sequence number
      back.sequence++;
      back.lastSwapTimestamp = Date.now();

      // Swap buffers (makes new state visible to renderer)
      this.buffer.swap();
      this.config.onBufferSwap(back.sequence);
    }

    // Track metrics
    this.totalMessagesProcessed += messages.length;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.messageTimestamps.push(now);
    if (this.messageTimestamps.length > this.MAX_METRIC_HISTORY) {
      this.messageTimestamps.shift();
    }

    const duration = now - startTime;
    this.updateDurations.push(duration);
    if (this.updateDurations.length > this.MAX_METRIC_HISTORY) {
      this.updateDurations.shift();
    }
  }

  /**
   * Process a single agent message, writing to the back buffer.
   */
  private processMessage(msg: AgentMessage, state: AgentWorldState): void {
    switch (msg.type) {
      case 'connect':
        this.handleConnect(msg, state);
        break;

      case 'disconnect':
        this.handleDisconnect(msg, state);
        break;

      case 'state_update':
        this.handleStateUpdate(msg, state);
        break;

      case 'command':
        this.handleCommand(msg, state);
        break;

      case 'heartbeat':
        this.handleHeartbeat(msg, state);
        break;

      default:
        logger.warn('[AgentCommunicationManager] Unknown message type', {
          type: msg.type,
          agentId: msg.agentId,
        });
    }
  }

  /**
   * Handle agent connect message
   */
  private handleConnect(msg: AgentMessage, state: AgentWorldState): void {
    const agentId = msg.agentId;
    const name = (msg.payload.name as string) ?? agentId;

    // Create default avatar state
    const avatarState = createDefaultAgentAvatarState(agentId, name);

    // Apply any initial state from payload
    if (msg.payload.position) {
      avatarState.position = msg.payload.position as Vec3;
    }
    if (msg.payload.rotation) {
      avatarState.rotation = msg.payload.rotation as Quat;
    }
    if (msg.payload.emotion) {
      avatarState.emotion = msg.payload.emotion as string;
    }

    state.agents[agentId] = avatarState;
    this.connectedAgents.add(agentId);

    this.config.onAgentConnected(agentId);

    logger.info('[AgentCommunicationManager] Agent connected', { agentId, name });
  }

  /**
   * Handle agent disconnect message
   */
  private handleDisconnect(msg: AgentMessage, state: AgentWorldState): void {
    const agentId = msg.agentId;

    delete state.agents[agentId];
    this.connectedAgents.delete(agentId);

    this.config.onAgentDisconnected(agentId);

    logger.info('[AgentCommunicationManager] Agent disconnected', { agentId });
  }

  /**
   * Handle agent state update message
   */
  private handleStateUpdate(msg: AgentMessage, state: AgentWorldState): void {
    const agentId = msg.agentId;

    // Auto-connect if not already connected
    if (!state.agents[agentId]) {
      state.agents[agentId] = createDefaultAgentAvatarState(agentId);
      this.connectedAgents.add(agentId);
    }

    const agent = state.agents[agentId];

    // Merge update fields
    if (msg.payload.position) {
      agent.position = msg.payload.position as Vec3;
    }
    if (msg.payload.rotation) {
      agent.rotation = msg.payload.rotation as Quat;
    }
    if (msg.payload.scale) {
      agent.scale = msg.payload.scale as Vec3;
    }
    if (msg.payload.visible !== undefined) {
      agent.visible = msg.payload.visible as boolean;
    }
    if (msg.payload.animationState) {
      agent.animationState = msg.payload.animationState as string;
    }
    if (msg.payload.emotion) {
      agent.emotion = msg.payload.emotion as string;
    }
    if (msg.payload.gazeTarget !== undefined) {
      agent.gazeTarget = msg.payload.gazeTarget as Vec3 | null;
    }
    if (msg.payload.speechText !== undefined) {
      agent.speechText = msg.payload.speechText as string;
    }
    if (msg.payload.metadata) {
      Object.assign(agent.metadata, msg.payload.metadata as Record<string, unknown>);
    }

    agent.lastUpdateTimestamp = msg.timestamp;
  }

  /**
   * Handle agent command message
   */
  private handleCommand(msg: AgentMessage, state: AgentWorldState): void {
    const command: AgentCommand = {
      id: (msg.payload.id as string) ?? `cmd-${msg.agentId}-${++this.commandIdCounter}`,
      agentId: msg.agentId,
      type: (msg.payload.commandType as string) ?? 'unknown',
      payload: msg.payload,
      timestamp: msg.timestamp,
      consumed: false,
    };

    // Enforce max queue size
    if (state.commands.length >= this.config.maxCommandQueueSize) {
      // Drop oldest unconsumed command
      const oldestIdx = state.commands.findIndex((c) => !c.consumed);
      if (oldestIdx >= 0) {
        state.commands.splice(oldestIdx, 1);
      }
    }

    state.commands.push(command);
    this.totalCommandsQueued++;

    this.config.onCommandQueued(command);
  }

  /**
   * Handle heartbeat message (keeps agent alive, updates timestamp)
   */
  private handleHeartbeat(msg: AgentMessage, state: AgentWorldState): void {
    const agentId = msg.agentId;
    if (state.agents[agentId]) {
      state.agents[agentId].lastUpdateTimestamp = msg.timestamp;
    }
  }

  // ===========================================================================
  // QUERY API (SAFE FROM ANY CONTEXT)
  // ===========================================================================

  /**
   * Get the underlying double-buffered state container.
   * The renderer uses this to read the front buffer each frame.
   */
  getBuffer(): AgentStateBuffer<AgentWorldState> {
    return this.buffer;
  }

  /**
   * Get the current front buffer state (read-only, render-safe).
   * Convenience wrapper around buffer.getFrontBuffer().
   */
  getCurrentState(): Readonly<AgentWorldState> {
    return this.buffer.getFrontBuffer();
  }

  /**
   * Check if a specific agent is connected
   */
  isAgentConnected(agentId: string): boolean {
    return this.connectedAgents.has(agentId);
  }

  /**
   * Get list of all connected agent IDs
   */
  getConnectedAgentIds(): string[] {
    return Array.from(this.connectedAgents);
  }

  /**
   * Get the number of connected agents
   */
  getConnectedAgentCount(): number {
    return this.connectedAgents.size;
  }

  /**
   * Check if the update loop is running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  // ===========================================================================
  // RENDERER INTEGRATION
  // ===========================================================================

  /**
   * Consume all pending commands from the front buffer.
   *
   * The renderer calls this during its update cycle to get commands
   * that need to be executed (spawn objects, highlights, camera moves, etc.)
   *
   * Consumed commands are marked so they are not returned again.
   *
   * @returns Array of unconsumed commands
   */
  consumeCommands(): AgentCommand[] {
    const state = this.buffer.getFrontBuffer() as AgentWorldState;
    const pending = state.commands.filter((c) => !c.consumed);

    // Mark as consumed
    for (const cmd of pending) {
      cmd.consumed = true;
    }

    // Clean up old consumed commands (keep last 20 for debugging)
    if (state.commands.length > 20) {
      const consumed = state.commands.filter((c) => c.consumed);
      if (consumed.length > 20) {
        state.commands.splice(
          0,
          state.commands.indexOf(consumed[consumed.length - 20]),
        );
      }
    }

    return pending;
  }

  // ===========================================================================
  // METRICS
  // ===========================================================================

  /**
   * Get comprehensive communication metrics
   */
  getMetrics(): AgentCommunicationMetrics {
    // Calculate messages per second
    let messagesPerSecond = 0;
    if (this.messageTimestamps.length >= 2) {
      const timeSpan =
        this.messageTimestamps[this.messageTimestamps.length - 1] -
        this.messageTimestamps[0];
      if (timeSpan > 0) {
        messagesPerSecond = (this.totalMessagesProcessed / timeSpan) * 1000;
      }
    }

    // Calculate average update duration
    let averageUpdateDuration = 0;
    if (this.updateDurations.length > 0) {
      averageUpdateDuration =
        this.updateDurations.reduce((a, b) => a + b, 0) /
        this.updateDurations.length;
    }

    // Count pending commands
    const state = this.buffer.getFrontBuffer();
    const pendingCommands = state.commands.filter((c) => !c.consumed).length;

    return {
      isRunning: this.isRunning,
      connectedAgents: this.connectedAgents.size,
      totalMessagesProcessed: this.totalMessagesProcessed,
      messagesPerSecond: Math.round(messagesPerSecond * 100) / 100,
      totalCommandsQueued: this.totalCommandsQueued,
      pendingCommands,
      updateHz: this.config.updateHz,
      averageUpdateDuration: Math.round(averageUpdateDuration * 1000) / 1000,
      bufferMetrics: this.buffer.getMetrics(),
    };
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create an AgentCommunicationManager with the given configuration.
 */
export function createAgentCommunicationManager(
  config?: AgentCommunicationConfig,
): AgentCommunicationManager {
  return new AgentCommunicationManager(config);
}
