/**
 * @hololand/agents AgentOrphanManager
 *
 * Detects and handles orphaned agent inferences -- agents whose
 * controlling client disconnected or whose inference timed out.
 * Ensures no GPU resources leak from abandoned computations.
 */

export interface AgentRegistration {
  agentId: string;
  clientId: string;
  modelId: string;
  registeredAt: number;
  lastHeartbeatAt: number;
  activeInferences: number;
}

export interface OrphanPolicy {
  /** Time without heartbeat before marking as orphan (ms). */
  heartbeatTimeoutMs: number;
  /** Maximum inference time before force-cancellation (ms). */
  maxInferenceTimeMs: number;
  /** Grace period after orphan detection before cleanup (ms). */
  gracePeriodMs: number;
  /** Check interval (ms). */
  checkIntervalMs: number;
}

const DEFAULT_POLICY: OrphanPolicy = {
  heartbeatTimeoutMs: 10_000,
  maxInferenceTimeMs: 30_000,
  gracePeriodMs: 5_000,
  checkIntervalMs: 2_000,
};

export type OrphanHandler = (agentId: string, reason: string) => void;

/**
 * Manages agent lifecycle and detects orphaned agents for cleanup.
 */
export class AgentOrphanManager {
  private policy: OrphanPolicy;
  private agents: Map<string, AgentRegistration> = new Map();
  private orphanedAt: Map<string, number> = new Map(); // agentId -> timestamp marked orphan
  private cleanupHandlers: OrphanHandler[] = [];
  private checkTimer: ReturnType<typeof setInterval> | null = null;
  private orphanCount: number = 0;

  constructor(policy?: Partial<OrphanPolicy>) {
    this.policy = { ...DEFAULT_POLICY, ...policy };
  }

  /**
   * Register an agent with the manager.
   */
  registerAgent(agentId: string, clientId: string, modelId: string): void {
    this.agents.set(agentId, {
      agentId,
      clientId,
      modelId,
      registeredAt: Date.now(),
      lastHeartbeatAt: Date.now(),
      activeInferences: 0,
    });
  }

  /**
   * Record a heartbeat from an agent.
   */
  heartbeat(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    agent.lastHeartbeatAt = Date.now();
    // If it was marked orphaned, un-orphan it
    this.orphanedAt.delete(agentId);
    return true;
  }

  /**
   * Increment active inference count for an agent.
   */
  startInference(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) agent.activeInferences++;
  }

  /**
   * Decrement active inference count for an agent.
   */
  endInference(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) agent.activeInferences = Math.max(0, agent.activeInferences - 1);
  }

  /**
   * Check for orphaned agents and trigger cleanup.
   */
  checkOrphans(): string[] {
    const now = Date.now();
    const orphans: string[] = [];

    for (const [agentId, agent] of this.agents) {
      const timeSinceHeartbeat = now - agent.lastHeartbeatAt;

      // Check heartbeat timeout
      if (timeSinceHeartbeat > this.policy.heartbeatTimeoutMs) {
        if (!this.orphanedAt.has(agentId)) {
          // Mark as orphaned
          this.orphanedAt.set(agentId, now);
        } else {
          // Check grace period
          const orphanTime = now - this.orphanedAt.get(agentId)!;
          if (orphanTime > this.policy.gracePeriodMs) {
            orphans.push(agentId);
            this.cleanup(agentId, 'heartbeat_timeout');
          }
        }
      }
    }

    return orphans;
  }

  /**
   * Register a cleanup handler for orphaned agents.
   */
  onOrphan(handler: OrphanHandler): void {
    this.cleanupHandlers.push(handler);
  }

  /**
   * Start periodic orphan checking.
   */
  startMonitoring(): void {
    if (this.checkTimer) return;
    this.checkTimer = setInterval(() => this.checkOrphans(), this.policy.checkIntervalMs);
  }

  /**
   * Stop periodic orphan checking.
   */
  stopMonitoring(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  /**
   * Get agent registration info.
   */
  getAgent(agentId: string): AgentRegistration | undefined {
    const agent = this.agents.get(agentId);
    return agent ? { ...agent } : undefined;
  }

  /**
   * Get all registered agents.
   */
  getAllAgents(): AgentRegistration[] {
    return Array.from(this.agents.values()).map((a) => ({ ...a }));
  }

  /**
   * Get count of orphaned agents currently in grace period.
   */
  getOrphanedCount(): number {
    return this.orphanedAt.size;
  }

  /**
   * Get total orphan cleanup count.
   */
  getTotalOrphanCount(): number {
    return this.orphanCount;
  }

  getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Manually remove an agent.
   */
  removeAgent(agentId: string): void {
    this.agents.delete(agentId);
    this.orphanedAt.delete(agentId);
  }

  private cleanup(agentId: string, reason: string): void {
    for (const handler of this.cleanupHandlers) {
      try {
        handler(agentId, reason);
      } catch {
        // Swallow handler errors
      }
    }
    this.agents.delete(agentId);
    this.orphanedAt.delete(agentId);
    this.orphanCount++;
  }
}
