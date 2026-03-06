/**
 * @hololand/agents AsyncAgentLoop
 *
 * Asynchronous agent inference loop that runs alongside VR rendering.
 * Ensures agent AI never blocks the render thread.
 */

export interface AgentLoopConfig {
  targetFrequencyHz: number;
  maxAgentsPerTick: number;
  timeoutMs: number;
}

const DEFAULT_CONFIG: AgentLoopConfig = {
  targetFrequencyHz: 5,
  maxAgentsPerTick: 10,
  timeoutMs: 200,
};

export type AgentInferenceCallback = (agentId: string) => Promise<unknown>;

export class AsyncAgentLoop {
  private config: AgentLoopConfig;
  private agents: Map<string, AgentInferenceCallback> = new Map();
  private running: boolean = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private tickCount: number = 0;
  private errors: number = 0;

  constructor(config?: Partial<AgentLoopConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  registerAgent(agentId: string, callback: AgentInferenceCallback): void {
    this.agents.set(agentId, callback);
  }

  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const interval = 1000 / this.config.targetFrequencyHz;
    this.timer = setInterval(() => this.tick(), interval);
  }

  stop(): void {
    this.running = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  private async tick(): Promise<void> {
    this.tickCount++;
    const agentIds = Array.from(this.agents.keys()).slice(0, this.config.maxAgentsPerTick);

    const promises = agentIds.map(async (agentId) => {
      const callback = this.agents.get(agentId);
      if (!callback) return;
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), this.config.timeoutMs));
        await Promise.race([callback(agentId), timeoutPromise]);
      } catch {
        this.errors++;
      }
    });

    await Promise.allSettled(promises);
  }

  isRunning(): boolean { return this.running; }
  getAgentCount(): number { return this.agents.size; }
  getTickCount(): number { return this.tickCount; }
  getErrorCount(): number { return this.errors; }
}
