/**
 * @hololand/agents BrainServer
 *
 * Centralized Brain Server for 100 concurrent AI agent inferences.
 * Orchestrates batched GPU inference, agent lifecycle, and CRDT
 * state distribution.
 *
 * Architecture:
 * - BatchedInference: GPU batch scheduler
 * - AgentOrphanManager: Lifecycle + orphan cleanup
 * - CRDTPublisher: Conflict-free state distribution
 */

import { BatchedInference, type InferenceRequest, type InferenceResponse, type BatchConfig } from './BatchedInference';
import { AgentOrphanManager, type OrphanPolicy } from './AgentOrphanManager';
import { CRDTPublisher, type CRDTOperation } from './CRDTPublisher';

export interface BrainServerConfig {
  nodeId: string;
  maxConcurrentAgents: number;
  batchConfig?: Partial<BatchConfig>;
  orphanPolicy?: Partial<OrphanPolicy>;
}

const DEFAULT_CONFIG: BrainServerConfig = {
  nodeId: 'brain-0',
  maxConcurrentAgents: 100,
};

export interface BrainServerMetrics {
  activeAgents: number;
  maxAgents: number;
  totalInferences: number;
  averageInferenceLatencyMs: number;
  orphanedAgents: number;
  crdtOperations: number;
  queueDepth: number;
}

type InferenceExecutor = (batch: InferenceRequest[]) => Promise<number[][]>;

/**
 * Brain Server: centralized AI inference hub for HoloLand agents.
 */
export class BrainServer {
  private config: BrainServerConfig;
  private batchEngine: BatchedInference;
  private orphanManager: AgentOrphanManager;
  private crdtPublisher: CRDTPublisher;
  private running: boolean = false;
  private totalInferences: number = 0;

  constructor(executor: InferenceExecutor, config?: Partial<BrainServerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.batchEngine = new BatchedInference(executor, this.config.batchConfig);
    this.orphanManager = new AgentOrphanManager(this.config.orphanPolicy);
    this.crdtPublisher = new CRDTPublisher(this.config.nodeId);

    // Wire up orphan cleanup to CRDT
    this.orphanManager.onOrphan((agentId) => {
      this.crdtPublisher.removeAgent(agentId);
    });
  }

  /**
   * Start the brain server (monitoring, batch processing).
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.orphanManager.startMonitoring();
  }

  /**
   * Stop the brain server.
   */
  stop(): void {
    this.running = false;
    this.orphanManager.stopMonitoring();
  }

  /**
   * Register a new agent with the brain server.
   */
  registerAgent(agentId: string, clientId: string, modelId: string): boolean {
    if (this.orphanManager.getAgentCount() >= this.config.maxConcurrentAgents) {
      return false;
    }
    this.orphanManager.registerAgent(agentId, clientId, modelId);
    return true;
  }

  /**
   * Unregister an agent.
   */
  unregisterAgent(agentId: string): void {
    this.orphanManager.removeAgent(agentId);
    this.crdtPublisher.removeAgent(agentId);
  }

  /**
   * Submit an inference request for an agent.
   */
  async infer(request: InferenceRequest): Promise<InferenceResponse> {
    if (!this.running) {
      throw new Error('BrainServer is not running');
    }

    const agent = this.orphanManager.getAgent(request.agentId);
    if (!agent) {
      throw new Error(`Agent ${request.agentId} not registered`);
    }

    this.orphanManager.startInference(request.agentId);
    try {
      const response = await this.batchEngine.submit(request);
      this.totalInferences++;

      // Publish result to CRDT
      this.crdtPublisher.publish(request.agentId, 'lastInference', {
        outputTokens: response.outputTokens.length,
        latencyMs: response.latencyMs,
        timestamp: Date.now(),
      });

      return response;
    } finally {
      this.orphanManager.endInference(request.agentId);
    }
  }

  /**
   * Send heartbeat for an agent.
   */
  heartbeat(agentId: string): boolean {
    return this.orphanManager.heartbeat(agentId);
  }

  /**
   * Get CRDT state for an agent.
   */
  getAgentState(agentId: string): Record<string, unknown> | undefined {
    return this.crdtPublisher.getState(agentId);
  }

  /**
   * Subscribe to CRDT operations for state sync.
   */
  onStateChange(handler: (operation: CRDTOperation) => void): void {
    this.crdtPublisher.subscribe(handler);
  }

  /**
   * Get server metrics.
   */
  getMetrics(): BrainServerMetrics {
    const batchMetrics = this.batchEngine.getMetrics();
    return {
      activeAgents: this.orphanManager.getAgentCount(),
      maxAgents: this.config.maxConcurrentAgents,
      totalInferences: this.totalInferences,
      averageInferenceLatencyMs: batchMetrics.averageLatencyMs,
      orphanedAgents: this.orphanManager.getOrphanedCount(),
      crdtOperations: this.crdtPublisher.getOperationCount(),
      queueDepth: this.batchEngine.getQueueDepth(),
    };
  }

  isRunning(): boolean {
    return this.running;
  }

  getBatchEngine(): BatchedInference {
    return this.batchEngine;
  }

  getOrphanManager(): AgentOrphanManager {
    return this.orphanManager;
  }

  getCRDTPublisher(): CRDTPublisher {
    return this.crdtPublisher;
  }
}
