/**
 * GRPO Event Emitter
 *
 * Server-side WebSocket event emitter that broadcasts GRPO training metrics
 * to all connected dashboard clients. Designed to be imported by the MCP
 * orchestrator or any Node.js server that manages training runs.
 *
 * Event types emitted:
 *   - reward:     Per-step reward signal data points
 *   - kl:         KL divergence measurements
 *   - completion: Completion sample groups (best/worst pairs)
 *   - forgetting: OPLoRA constraint and benchmark metrics
 *   - status:     Training status changes (running/paused/completed/error)
 *   - params:     Parameter updates (temperature, beta)
 *   - progress:   Training progress (step, ETA, elapsed)
 *   - gpu:        GPU utilization, memory, temperature stats
 *   - snapshot:   Full state snapshot for initial client hydration
 *
 * Usage:
 * ```ts
 * import { WebSocketServer } from 'ws';
 * import { GRPOEventEmitter } from './GRPOEventEmitter';
 *
 * const wss = new WebSocketServer({ path: '/grpo/events', port: 5567 });
 * const emitter = new GRPOEventEmitter(wss);
 *
 * // From training loop:
 * emitter.emitReward({ step: 100, rewards: { ... } });
 * emitter.emitGPU({ gpuUtilization: 92, ... });
 * ```
 *
 * @module grpo-training-dashboard/GRPOEventEmitter
 */

import type {
  RewardDataPoint,
  KLDataPoint,
  CompletionGroup,
  ForgettingMetrics,
  GPUStats,
  TrainingParams,
  TrainingProgress,
  TrainingStatus,
  GRPODashboardState,
} from './types';

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * All possible GRPO event type discriminators.
 */
export type GRPOEventType =
  | 'reward'
  | 'kl'
  | 'completion'
  | 'forgetting'
  | 'status'
  | 'params'
  | 'progress'
  | 'gpu'
  | 'snapshot';

/**
 * Discriminated union of all GRPO WebSocket events.
 */
export type GRPOEvent =
  | { type: 'reward'; point: RewardDataPoint }
  | { type: 'kl'; point: KLDataPoint }
  | { type: 'completion'; group: CompletionGroup }
  | { type: 'forgetting'; metrics: ForgettingMetrics }
  | { type: 'status'; status: TrainingStatus }
  | { type: 'params'; params: TrainingParams }
  | { type: 'progress'; progress: TrainingProgress }
  | { type: 'gpu'; stats: GPUStats }
  | { type: 'snapshot'; } & Partial<GRPODashboardState>;

/**
 * Command messages sent from dashboard clients to the server.
 */
export type GRPOCommand =
  | { command: 'pause' }
  | { command: 'resume' }
  | { command: 'set_temperature'; value: number }
  | { command: 'set_beta'; value: number }
  | { command: 'trigger_benchmark' }
  | { command: 'request_snapshot' };

// =============================================================================
// WEBSOCKET-LIKE INTERFACE (for testability)
// =============================================================================

/**
 * Minimal WebSocket interface for a single client connection.
 * Compatible with the 'ws' package's WebSocket and browser WebSocket.
 */
export interface WSClient {
  readyState: number;
  send(data: string): void;
}

/**
 * Minimal WebSocket server interface.
 * Compatible with the 'ws' package's WebSocketServer.
 */
export interface WSServer {
  clients: Set<WSClient>;
  on(event: 'connection', listener: (ws: WSClient) => void): void;
}

/** WebSocket OPEN readyState constant. */
const WS_OPEN = 1;

// =============================================================================
// EMITTER OPTIONS
// =============================================================================

export interface GRPOEventEmitterOptions {
  /** Maximum reward history points to keep for snapshots (default: 500) */
  maxRewardHistory?: number;
  /** Maximum KL history points to keep for snapshots (default: 500) */
  maxKLHistory?: number;
  /** Maximum completion groups to keep for snapshots (default: 50) */
  maxCompletionGroups?: number;
  /** Callback invoked when a client sends a command */
  onCommand?: (command: GRPOCommand, client: WSClient) => void;
}

// =============================================================================
// GRPO EVENT EMITTER
// =============================================================================

/**
 * Manages WebSocket broadcasting of GRPO training events.
 *
 * Maintains an internal snapshot of the latest state so new clients
 * receive a full hydration payload on connection.
 */
export class GRPOEventEmitter {
  private readonly wss: WSServer;
  private readonly maxRewardHistory: number;
  private readonly maxKLHistory: number;
  private readonly maxCompletionGroups: number;
  private readonly onCommand?: (command: GRPOCommand, client: WSClient) => void;

  // Internal state for snapshot hydration
  private rewardHistory: RewardDataPoint[] = [];
  private klHistory: KLDataPoint[] = [];
  private completionGroups: CompletionGroup[] = [];
  private forgettingMetrics: ForgettingMetrics | null = null;
  private trainingStatus: TrainingStatus = 'paused';
  private trainingParams: TrainingParams = { temperature: 0.7, beta: 0.04 };
  private progress: TrainingProgress = {
    currentStep: 0,
    totalSteps: 0,
    elapsedSeconds: 0,
    estimatedRemainingSeconds: 0,
  };
  private gpuStats: GPUStats | null = null;

  constructor(wss: WSServer, options?: GRPOEventEmitterOptions) {
    this.wss = wss;
    this.maxRewardHistory = options?.maxRewardHistory ?? 500;
    this.maxKLHistory = options?.maxKLHistory ?? 500;
    this.maxCompletionGroups = options?.maxCompletionGroups ?? 50;
    this.onCommand = options?.onCommand;

    // Listen for new connections and send snapshot
    this.wss.on('connection', (ws: WSClient) => {
      this.sendSnapshot(ws);
      this.setupClientMessageHandler(ws);
    });
  }

  // ---------------------------------------------------
  // EMIT METHODS
  // ---------------------------------------------------

  /**
   * Broadcast a reward data point to all connected clients.
   */
  emitReward(point: RewardDataPoint): void {
    this.rewardHistory.push(point);
    if (this.rewardHistory.length > this.maxRewardHistory) {
      this.rewardHistory = this.rewardHistory.slice(
        this.rewardHistory.length - this.maxRewardHistory,
      );
    }
    this.broadcast({ type: 'reward', point });
  }

  /**
   * Broadcast a KL divergence data point to all connected clients.
   */
  emitKL(point: KLDataPoint): void {
    this.klHistory.push(point);
    if (this.klHistory.length > this.maxKLHistory) {
      this.klHistory = this.klHistory.slice(
        this.klHistory.length - this.maxKLHistory,
      );
    }
    this.broadcast({ type: 'kl', point });
  }

  /**
   * Broadcast a completion group to all connected clients.
   */
  emitCompletion(group: CompletionGroup): void {
    this.completionGroups.push(group);
    if (this.completionGroups.length > this.maxCompletionGroups) {
      this.completionGroups = this.completionGroups.slice(
        this.completionGroups.length - this.maxCompletionGroups,
      );
    }
    this.broadcast({ type: 'completion', group });
  }

  /**
   * Broadcast forgetting/OPLoRA metrics to all connected clients.
   */
  emitForgetting(metrics: ForgettingMetrics): void {
    this.forgettingMetrics = metrics;
    this.broadcast({ type: 'forgetting', metrics });
  }

  /**
   * Broadcast training status change to all connected clients.
   */
  emitStatus(status: TrainingStatus): void {
    this.trainingStatus = status;
    this.broadcast({ type: 'status', status });
  }

  /**
   * Broadcast parameter updates to all connected clients.
   */
  emitParams(params: TrainingParams): void {
    this.trainingParams = params;
    this.broadcast({ type: 'params', params });
  }

  /**
   * Broadcast training progress to all connected clients.
   */
  emitProgress(progress: TrainingProgress): void {
    this.progress = progress;
    this.broadcast({ type: 'progress', progress });
  }

  /**
   * Broadcast GPU stats to all connected clients.
   */
  emitGPU(stats: GPUStats): void {
    this.gpuStats = stats;
    this.broadcast({ type: 'gpu', stats });
  }

  // ---------------------------------------------------
  // SNAPSHOT
  // ---------------------------------------------------

  /**
   * Send a full state snapshot to a single client.
   */
  private sendSnapshot(client: WSClient): void {
    const snapshot: GRPOEvent = {
      type: 'snapshot',
      rewardHistory: this.rewardHistory,
      klHistory: this.klHistory,
      completionGroups: this.completionGroups,
      forgettingMetrics: this.forgettingMetrics,
      trainingStatus: this.trainingStatus,
      trainingParams: this.trainingParams,
      progress: this.progress,
      gpuStats: this.gpuStats,
      connected: true,
      lastUpdateTimestamp: Date.now(),
    };
    this.sendToClient(client, snapshot);
  }

  /**
   * Broadcast a full snapshot to all connected clients.
   * Useful when the emitter state is externally mutated.
   */
  broadcastSnapshot(): void {
    for (const client of this.wss.clients) {
      if (client.readyState === WS_OPEN) {
        this.sendSnapshot(client);
      }
    }
  }

  // ---------------------------------------------------
  // CLIENT COMMAND HANDLING
  // ---------------------------------------------------

  /**
   * Set up message handling for incoming client commands.
   */
  private setupClientMessageHandler(ws: WSClient): void {
    if (!this.onCommand) return;

    // Cast to access .on method (present in ws package WebSocket instances)
    const wsAny = ws as WSClient & {
      on?: (event: string, listener: (data: unknown) => void) => void;
    };

    if (typeof wsAny.on === 'function') {
      wsAny.on('message', (data: unknown) => {
        try {
          const message = JSON.parse(String(data));
          if (message && typeof message.command === 'string') {
            this.onCommand!(message as GRPOCommand, ws);
          }
        } catch {
          // Ignore malformed messages
        }
      });
    }
  }

  // ---------------------------------------------------
  // INTERNAL
  // ---------------------------------------------------

  /**
   * Broadcast an event to all connected clients.
   */
  private broadcast(event: GRPOEvent): void {
    const data = JSON.stringify(event);
    for (const client of this.wss.clients) {
      if (client.readyState === WS_OPEN) {
        try {
          client.send(data);
        } catch {
          // Client may have disconnected between readyState check and send
        }
      }
    }
  }

  /**
   * Send an event to a single client.
   */
  private sendToClient(client: WSClient, event: GRPOEvent): void {
    if (client.readyState === WS_OPEN) {
      try {
        client.send(JSON.stringify(event));
      } catch {
        // Client may have disconnected
      }
    }
  }

  // ---------------------------------------------------
  // ACCESSORS (for testing and external state reads)
  // ---------------------------------------------------

  /** Get the current number of connected clients. */
  get clientCount(): number {
    let count = 0;
    for (const client of this.wss.clients) {
      if (client.readyState === WS_OPEN) {
        count++;
      }
    }
    return count;
  }

  /** Get a copy of the current internal state. */
  getState(): Omit<GRPODashboardState, 'connected' | 'lastUpdateTimestamp'> {
    return {
      rewardHistory: [...this.rewardHistory],
      klHistory: [...this.klHistory],
      completionGroups: [...this.completionGroups],
      forgettingMetrics: this.forgettingMetrics,
      trainingStatus: this.trainingStatus,
      trainingParams: { ...this.trainingParams },
      progress: { ...this.progress },
      gpuStats: this.gpuStats ? { ...this.gpuStats } : null,
    };
  }

  /** Reset internal state (for testing or training restarts). */
  reset(): void {
    this.rewardHistory = [];
    this.klHistory = [];
    this.completionGroups = [];
    this.forgettingMetrics = null;
    this.trainingStatus = 'paused';
    this.trainingParams = { temperature: 0.7, beta: 0.04 };
    this.progress = {
      currentStep: 0,
      totalSteps: 0,
      elapsedSeconds: 0,
      estimatedRemainingSeconds: 0,
    };
    this.gpuStats = null;
  }
}
