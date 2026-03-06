/**
 * @hololand/agents RenderBridge
 *
 * Bridge between inference scheduling (1-5Hz) and VR renderer (90Hz).
 * Provides interpolated agent state to the renderer each frame from
 * the latest cached inference results.
 *
 * The renderer never waits on inference -- it always reads the latest
 * cached + interpolated state.
 */

import { InferenceCache } from './InferenceCache';
import { ReasoningTierLevel, type InferenceResult } from './ReasoningTier';

export interface AgentRenderState {
  agentId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  animationBlend: number;
  emotionState: string;
  lastInferenceTime: number;
  interpolationAlpha: number;
  stale: boolean;
}

export interface RenderBridgeConfig {
  /** Maximum staleness before marking state as stale (ms). */
  staleThresholdMs: number;
  /** Interpolation smoothing factor (0-1). */
  interpolationFactor: number;
  /** Maximum agents to track. */
  maxAgents: number;
}

const DEFAULT_CONFIG: RenderBridgeConfig = {
  staleThresholdMs: 500,
  interpolationFactor: 0.15,
  maxAgents: 100,
};

interface AgentSnapshot {
  previous: AgentRenderState;
  current: AgentRenderState;
  lastUpdateTime: number;
}

/**
 * Provides smooth, interpolated agent state for 90Hz VR rendering
 * from cached inference results running at 1-5Hz.
 */
export class RenderBridge {
  private config: RenderBridgeConfig;
  private cache: InferenceCache;
  private snapshots: Map<string, AgentSnapshot> = new Map();

  constructor(cache: InferenceCache, config?: Partial<RenderBridgeConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = cache;
  }

  /**
   * Called each render frame. Returns interpolated state for an agent.
   * This must be O(1) -- no inference, no blocking.
   */
  getAgentState(agentId: string, frameTime: number = Date.now()): AgentRenderState | null {
    const snapshot = this.snapshots.get(agentId);
    if (!snapshot) return null;

    const timeSinceUpdate = frameTime - snapshot.lastUpdateTime;
    const stale = timeSinceUpdate > this.config.staleThresholdMs;

    // Interpolate between previous and current
    const alpha = Math.min(1, timeSinceUpdate / Math.max(1, this.getInferenceInterval(agentId)));

    return {
      agentId,
      position: this.lerpVec3(snapshot.previous.position, snapshot.current.position, alpha),
      rotation: this.slerpQuat(snapshot.previous.rotation, snapshot.current.rotation, alpha),
      animationBlend: this.lerp(snapshot.previous.animationBlend, snapshot.current.animationBlend, alpha),
      emotionState: snapshot.current.emotionState,
      lastInferenceTime: snapshot.lastUpdateTime,
      interpolationAlpha: alpha,
      stale,
    };
  }

  /**
   * Push new inference result to the render bridge.
   * Called when inference scheduler produces a new result.
   */
  pushInferenceResult(agentId: string, result: InferenceResult): void {
    const parsed = this.parseInferenceResult(result);
    if (!parsed) return;

    const existing = this.snapshots.get(agentId);
    const now = Date.now();

    if (existing) {
      // Shift current to previous, set new current
      this.snapshots.set(agentId, {
        previous: { ...existing.current },
        current: parsed,
        lastUpdateTime: now,
      });
    } else {
      // First result -- both previous and current are the same
      this.snapshots.set(agentId, {
        previous: parsed,
        current: parsed,
        lastUpdateTime: now,
      });
    }

    // Enforce max agents limit
    if (this.snapshots.size > this.config.maxAgents) {
      this.evictOldest();
    }
  }

  /**
   * Update from the inference cache (pull model).
   * Call periodically to refresh from latest cached results.
   */
  refreshFromCache(agentId: string, cacheKey: string = 'spatial'): boolean {
    const cached = this.cache.getLatestAboveTier(
      agentId,
      ReasoningTierLevel.Reactive,
      cacheKey,
    );
    if (cached) {
      this.pushInferenceResult(agentId, cached);
      return true;
    }
    return false;
  }

  /**
   * Get all tracked agent IDs.
   */
  getTrackedAgents(): string[] {
    return Array.from(this.snapshots.keys());
  }

  /**
   * Check if an agent's state is stale.
   */
  isStale(agentId: string, now: number = Date.now()): boolean {
    const snapshot = this.snapshots.get(agentId);
    if (!snapshot) return true;
    return now - snapshot.lastUpdateTime > this.config.staleThresholdMs;
  }

  /**
   * Remove an agent from the render bridge.
   */
  removeAgent(agentId: string): void {
    this.snapshots.delete(agentId);
  }

  /**
   * Get count of tracked agents.
   */
  getAgentCount(): number {
    return this.snapshots.size;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private parseInferenceResult(result: InferenceResult): AgentRenderState | null {
    const data = result.result as Record<string, unknown> | null;
    if (!data) return null;

    const pos = (data.position as { x: number; y: number; z: number }) ?? { x: 0, y: 0, z: 0 };
    const rot = (data.rotation as { x: number; y: number; z: number; w: number }) ?? {
      x: 0, y: 0, z: 0, w: 1,
    };

    return {
      agentId: result.agentId,
      position: pos,
      rotation: rot,
      animationBlend: (data.animationBlend as number) ?? 0,
      emotionState: (data.emotionState as string) ?? 'neutral',
      lastInferenceTime: result.timestamp,
      interpolationAlpha: 0,
      stale: false,
    };
  }

  private getInferenceInterval(agentId: string): number {
    // Estimate from snapshot history
    const snapshot = this.snapshots.get(agentId);
    if (!snapshot) return 200; // default 5Hz
    return 200; // Simplified: assume 5Hz spatial reasoning
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private lerpVec3(
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number },
    t: number,
  ): { x: number; y: number; z: number } {
    return {
      x: this.lerp(a.x, b.x, t),
      y: this.lerp(a.y, b.y, t),
      z: this.lerp(a.z, b.z, t),
    };
  }

  private slerpQuat(
    a: { x: number; y: number; z: number; w: number },
    b: { x: number; y: number; z: number; w: number },
    t: number,
  ): { x: number; y: number; z: number; w: number } {
    // Simplified linear interpolation for quaternions (true slerp is more complex)
    const result = {
      x: this.lerp(a.x, b.x, t),
      y: this.lerp(a.y, b.y, t),
      z: this.lerp(a.z, b.z, t),
      w: this.lerp(a.w, b.w, t),
    };
    // Normalize
    const len = Math.sqrt(result.x ** 2 + result.y ** 2 + result.z ** 2 + result.w ** 2);
    if (len > 0) {
      result.x /= len;
      result.y /= len;
      result.z /= len;
      result.w /= len;
    }
    return result;
  }

  private evictOldest(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;
    for (const [id, snapshot] of this.snapshots) {
      if (snapshot.lastUpdateTime < oldestTime) {
        oldestTime = snapshot.lastUpdateTime;
        oldestId = id;
      }
    }
    if (oldestId) this.snapshots.delete(oldestId);
  }
}
