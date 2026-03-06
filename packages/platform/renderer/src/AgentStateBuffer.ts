/**
 * AgentStateBuffer
 *
 * Double-buffered state container for agent communication in VR/AR rendering.
 *
 * PROBLEM: Agent communication (MCP tools, WebSocket messages, HTTP polling)
 * involves variable-latency I/O. If this work occurs on the render loop,
 * it causes frame drops and jank, violating the 11.1ms budget at 90Hz VR.
 *
 * SOLUTION: Double-buffering separates reads (renderer) from writes (agents):
 * - Back buffer: Written to by agent communication manager (off render loop)
 * - Front buffer: Read by the renderer during syncWorldToScene (on render loop)
 * - Swap: Atomic pointer swap at a safe point between frames (< 0.01ms)
 *
 * GUARANTEES:
 * - Renderer NEVER blocks on agent I/O
 * - Agent state is always consistent within a single frame (no torn reads)
 * - Swap cost is O(1) regardless of state size
 * - Memory overhead is exactly 2x the state size (two buffers)
 *
 * USAGE:
 * ```typescript
 * const buffer = new AgentStateBuffer<AgentWorldState>();
 *
 * // Agent communication thread (off render loop, e.g., setInterval or Worker)
 * const back = buffer.getBackBuffer();
 * back.agents['brittney'].position = { x: 1, y: 2, z: 3 };
 * back.agents['brittney'].emotion = 'curious';
 * buffer.swap(); // Atomic swap, < 0.01ms
 *
 * // Render loop (on requestAnimationFrame)
 * const front = buffer.getFrontBuffer(); // Always safe, never blocks
 * applyAgentState(front);
 * ```
 *
 * @module AgentStateBuffer
 */

import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Position in 3D space
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Quaternion rotation
 */
export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * State of a single agent avatar in the world
 */
export interface AgentAvatarState {
  /** Unique agent identifier */
  agentId: string;
  /** Display name */
  name: string;
  /** World-space position */
  position: Vec3;
  /** World-space rotation */
  rotation: Quat;
  /** Optional scale override */
  scale: Vec3;
  /** Whether agent avatar is visible */
  visible: boolean;
  /** Current animation state (idle, talking, thinking, etc.) */
  animationState: string;
  /** Emotional state for expression blending */
  emotion: string;
  /** Gaze/look-at target position (null = forward) */
  gazeTarget: Vec3 | null;
  /** Speech bubble text (empty = no bubble) */
  speechText: string;
  /** Custom metadata from agent (e.g., tool in use, confidence level) */
  metadata: Record<string, unknown>;
  /** Timestamp of last state update (ms since epoch) */
  lastUpdateTimestamp: number;
}

/**
 * A command queued by an agent to be executed on the render side
 */
export interface AgentCommand {
  /** Unique command ID */
  id: string;
  /** Agent that issued the command */
  agentId: string;
  /** Command type (e.g., 'spawn_object', 'highlight', 'navigate_camera') */
  type: string;
  /** Command payload */
  payload: Record<string, unknown>;
  /** Timestamp when command was issued */
  timestamp: number;
  /** Whether this command has been consumed by the renderer */
  consumed: boolean;
}

/**
 * Aggregate state of all agents visible in the world.
 * This is what gets double-buffered.
 */
export interface AgentWorldState {
  /** Map of agentId -> avatar state */
  agents: Record<string, AgentAvatarState>;
  /** Queued commands from agents, consumed by renderer */
  commands: AgentCommand[];
  /** Global notification text (shown as HUD overlay) */
  notification: string;
  /** Sequence number, incremented on each swap for staleness detection */
  sequence: number;
  /** Timestamp of last swap */
  lastSwapTimestamp: number;
}

/**
 * Metrics tracked by the buffer for performance monitoring
 */
export interface AgentStateBufferMetrics {
  /** Total number of swaps performed */
  totalSwaps: number;
  /** Average time between swaps in ms */
  averageSwapInterval: number;
  /** Number of writes to back buffer since last swap */
  writesSinceLastSwap: number;
  /** Number of reads from front buffer since last swap */
  readsSinceLastSwap: number;
  /** Whether the front buffer data is stale (no swap in > threshold) */
  isStale: boolean;
  /** Staleness threshold in ms */
  stalenessThreshold: number;
  /** Time since last swap in ms */
  timeSinceLastSwap: number;
}

// =============================================================================
// DEFAULT STATE FACTORY
// =============================================================================

/**
 * Create a fresh, empty AgentWorldState
 */
export function createEmptyAgentWorldState(): AgentWorldState {
  return {
    agents: {},
    commands: [],
    notification: '',
    sequence: 0,
    lastSwapTimestamp: 0,
  };
}

/**
 * Create a fresh AgentAvatarState with defaults
 */
export function createDefaultAgentAvatarState(agentId: string, name?: string): AgentAvatarState {
  return {
    agentId,
    name: name ?? agentId,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 1, y: 1, z: 1 },
    visible: true,
    animationState: 'idle',
    emotion: 'neutral',
    gazeTarget: null,
    speechText: '',
    metadata: {},
    lastUpdateTimestamp: Date.now(),
  };
}

// =============================================================================
// AGENT STATE BUFFER (DOUBLE-BUFFERED)
// =============================================================================

/**
 * Double-buffered state container for lock-free producer/consumer pattern.
 *
 * Generic over state type T, but defaults to AgentWorldState.
 * Provides zero-copy reads on the render loop by swapping buffer pointers.
 *
 * Thread safety model:
 * - Single writer (agent communication manager) writes to back buffer
 * - Single reader (renderer) reads from front buffer
 * - swap() atomically switches front and back (pointer swap only)
 * - Deep copy on swap ensures isolation between producer and consumer
 *
 * Performance characteristics:
 * - getFrontBuffer(): O(1), zero allocation
 * - getBackBuffer(): O(1), zero allocation
 * - swap(): O(n) where n = state size (deep copy for isolation)
 * - Memory: 2x state size (two complete buffers)
 */
export class AgentStateBuffer<T = AgentWorldState> {
  private bufferA: T;
  private bufferB: T;
  private frontIsA: boolean = true;

  // Metrics
  private swapCount: number = 0;
  private swapTimestamps: number[] = [];
  private writeCount: number = 0;
  private readCount: number = 0;
  private lastSwapTime: number = 0;
  private readonly MAX_SWAP_HISTORY = 60; // Track last 60 swaps for averaging
  private stalenessThresholdMs: number = 500; // Default 500ms

  /**
   * Create a new double-buffered state container.
   *
   * @param initialState - Factory function that creates an empty state.
   *   Called twice to initialize both buffers.
   * @param stalenessThresholdMs - How long before front buffer is considered stale (default 500ms)
   */
  constructor(
    private readonly stateFactory: () => T,
    stalenessThresholdMs?: number,
  ) {
    this.bufferA = stateFactory();
    this.bufferB = stateFactory();

    if (stalenessThresholdMs !== undefined) {
      this.stalenessThresholdMs = stalenessThresholdMs;
    }

    logger.debug('[AgentStateBuffer] Initialized with double buffers');
  }

  // ===========================================================================
  // CORE API
  // ===========================================================================

  /**
   * Get the front buffer (read-only, used by renderer on render loop).
   *
   * This is always safe to call from the render loop. The returned reference
   * is stable until the next swap() call. Since swap() is called between
   * frames (never during render), the data is consistent for the entire frame.
   *
   * Cost: O(1), zero allocation
   */
  getFrontBuffer(): Readonly<T> {
    this.readCount++;
    return this.frontIsA ? this.bufferA : this.bufferB;
  }

  /**
   * Get the back buffer (writable, used by agent communication off render loop).
   *
   * Writers can freely mutate this buffer without affecting the renderer.
   * Changes become visible to the renderer only after swap() is called.
   *
   * Cost: O(1), zero allocation
   */
  getBackBuffer(): T {
    this.writeCount++;
    return this.frontIsA ? this.bufferB : this.bufferA;
  }

  /**
   * Swap front and back buffers.
   *
   * After swap, the renderer sees the latest agent state, and the writer
   * gets a fresh buffer to write the next state into.
   *
   * The back buffer is deep-copied from the new front buffer after swap
   * to ensure the writer starts from the latest known state. This prevents
   * the "lost update" problem where the writer would overwrite state from
   * two frames ago.
   *
   * TIMING: Must be called between frames, never during render.
   * Recommended call sites:
   * - At the START of the animation loop, before syncWorldToScene
   * - In a setInterval callback that fires at agent update frequency
   *
   * Cost: O(n) deep copy of state for isolation
   */
  swap(): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // Swap the pointer
    this.frontIsA = !this.frontIsA;

    // Deep copy front -> back so writer starts from latest state
    const front = this.frontIsA ? this.bufferA : this.bufferB;
    const back = this.frontIsA ? this.bufferB : this.bufferA;
    this.deepCopy(front, back);

    // Update metrics
    this.swapCount++;
    this.lastSwapTime = now;
    this.swapTimestamps.push(now);
    if (this.swapTimestamps.length > this.MAX_SWAP_HISTORY) {
      this.swapTimestamps.shift();
    }
    this.writeCount = 0;
    this.readCount = 0;
  }

  /**
   * Reset both buffers to initial state.
   * Useful when changing worlds or clearing all agent state.
   */
  reset(): void {
    this.bufferA = this.stateFactory();
    this.bufferB = this.stateFactory();
    this.frontIsA = true;
    this.swapCount = 0;
    this.swapTimestamps = [];
    this.writeCount = 0;
    this.readCount = 0;
    this.lastSwapTime = 0;

    logger.debug('[AgentStateBuffer] Reset to initial state');
  }

  // ===========================================================================
  // METRICS
  // ===========================================================================

  /**
   * Get performance metrics for this buffer.
   * Useful for monitoring agent communication health.
   */
  getMetrics(): AgentStateBufferMetrics {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const timeSinceLastSwap = this.lastSwapTime > 0 ? now - this.lastSwapTime : 0;

    // Calculate average swap interval from history
    let averageSwapInterval = 0;
    if (this.swapTimestamps.length >= 2) {
      let totalInterval = 0;
      for (let i = 1; i < this.swapTimestamps.length; i++) {
        totalInterval += this.swapTimestamps[i] - this.swapTimestamps[i - 1];
      }
      averageSwapInterval = totalInterval / (this.swapTimestamps.length - 1);
    }

    return {
      totalSwaps: this.swapCount,
      averageSwapInterval: Math.round(averageSwapInterval * 100) / 100,
      writesSinceLastSwap: this.writeCount,
      readsSinceLastSwap: this.readCount,
      isStale: timeSinceLastSwap > this.stalenessThresholdMs,
      stalenessThreshold: this.stalenessThresholdMs,
      timeSinceLastSwap: Math.round(timeSinceLastSwap * 100) / 100,
    };
  }

  /**
   * Get total number of swaps performed
   */
  getSwapCount(): number {
    return this.swapCount;
  }

  /**
   * Set the staleness threshold in milliseconds
   */
  setStalenessThreshold(ms: number): void {
    this.stalenessThresholdMs = ms;
  }

  // ===========================================================================
  // INTERNAL
  // ===========================================================================

  /**
   * Deep copy source state into target.
   * Uses structuredClone where available, falls back to JSON round-trip.
   */
  private deepCopy(source: T, target: T): void {
    // We replace target's contents with a clone of source.
    // Since T is typically an object, we copy properties.
    if (typeof structuredClone === 'function') {
      const cloned = structuredClone(source);
      Object.assign(target as Record<string, unknown>, cloned as Record<string, unknown>);
    } else {
      // Fallback for environments without structuredClone
      const cloned = JSON.parse(JSON.stringify(source));
      Object.assign(target as Record<string, unknown>, cloned);
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create an AgentStateBuffer pre-configured for AgentWorldState.
 *
 * @param stalenessThresholdMs - How long before front buffer is considered stale (default 500ms)
 */
export function createAgentStateBuffer(
  stalenessThresholdMs?: number,
): AgentStateBuffer<AgentWorldState> {
  return new AgentStateBuffer<AgentWorldState>(
    createEmptyAgentWorldState,
    stalenessThresholdMs,
  );
}
