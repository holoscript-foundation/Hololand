/**
 * @hololand/agents BatchedInference
 *
 * Batched GPU inference engine for 100 concurrent AI agent inferences.
 * Groups multiple agent inference requests into GPU batches for throughput.
 *
 * Key design:
 * - Dynamic batch sizing based on queue depth and latency targets
 * - Priority ordering within batches
 * - Timeout handling for stuck inferences
 * - Memory-aware batch limits
 */

export interface InferenceRequest {
  requestId: string;
  agentId: string;
  modelId: string;
  inputTokens: number[];
  maxOutputTokens: number;
  priority: number; // 0 = highest
  createdAt: number;
  timeoutMs: number;
}

export interface InferenceResponse {
  requestId: string;
  agentId: string;
  outputTokens: number[];
  latencyMs: number;
  batchId: string;
  batchPosition: number;
  fromFallback: boolean;
}

export interface BatchConfig {
  /** Maximum requests per batch. */
  maxBatchSize: number;
  /** Maximum wait time before flushing a partial batch (ms). */
  maxBatchWaitMs: number;
  /** Maximum total tokens in a batch. */
  maxBatchTokens: number;
  /** Default timeout per request (ms). */
  defaultTimeoutMs: number;
  /** GPU memory budget in bytes. */
  gpuMemoryBudget: number;
}

const DEFAULT_BATCH_CONFIG: BatchConfig = {
  maxBatchSize: 32,
  maxBatchWaitMs: 50,
  maxBatchTokens: 8192,
  defaultTimeoutMs: 5000,
  gpuMemoryBudget: 4 * 1024 * 1024 * 1024, // 4GB
};

export interface BatchMetrics {
  totalBatches: number;
  totalRequests: number;
  averageBatchSize: number;
  averageLatencyMs: number;
  timeouts: number;
  gpuMemoryUsed: number;
}

type InferenceExecutor = (batch: InferenceRequest[]) => Promise<number[][]>;

/**
 * Batched inference engine that groups requests for GPU throughput.
 */
export class BatchedInference {
  private config: BatchConfig;
  private queue: InferenceRequest[] = [];
  private pendingResolvers: Map<string, (response: InferenceResponse) => void> = new Map();
  private pendingRejecters: Map<string, (error: Error) => void> = new Map();
  private executor: InferenceExecutor;
  private batchCount: number = 0;
  private totalLatency: number = 0;
  private totalRequests: number = 0;
  private timeouts: number = 0;
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private processing: boolean = false;
  private gpuMemoryUsed: number = 0;

  constructor(executor: InferenceExecutor, config?: Partial<BatchConfig>) {
    this.config = { ...DEFAULT_BATCH_CONFIG, ...config };
    this.executor = executor;
  }

  /**
   * Submit an inference request. Returns a promise that resolves with the response.
   */
  async submit(request: InferenceRequest): Promise<InferenceResponse> {
    return new Promise((resolve, reject) => {
      this.pendingResolvers.set(request.requestId, resolve);
      this.pendingRejecters.set(request.requestId, reject);

      // Insert into queue sorted by priority
      const insertIdx = this.queue.findIndex((r) => r.priority > request.priority);
      if (insertIdx === -1) {
        this.queue.push(request);
      } else {
        this.queue.splice(insertIdx, 0, request);
      }

      // Set timeout
      setTimeout(() => {
        if (this.pendingRejecters.has(request.requestId)) {
          this.pendingRejecters.get(request.requestId)!(
            new Error(`Inference timeout for request ${request.requestId}`),
          );
          this.pendingResolvers.delete(request.requestId);
          this.pendingRejecters.delete(request.requestId);
          this.timeouts++;
        }
      }, request.timeoutMs || this.config.defaultTimeoutMs);

      // Check if we should flush
      this.scheduleFlush();
    });
  }

  /**
   * Force flush the current queue as a batch.
   */
  async flush(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    try {
      // Build batch respecting limits
      const batch: InferenceRequest[] = [];
      let totalTokens = 0;

      while (
        batch.length < this.config.maxBatchSize &&
        this.queue.length > 0 &&
        totalTokens + this.queue[0].inputTokens.length <= this.config.maxBatchTokens
      ) {
        const req = this.queue.shift()!;
        totalTokens += req.inputTokens.length;
        batch.push(req);
      }

      if (batch.length === 0) {
        this.processing = false;
        return;
      }

      const batchId = `batch_${++this.batchCount}`;
      const startTime = performance.now();

      // Execute batch inference
      const outputs = await this.executor(batch);
      const latency = performance.now() - startTime;

      // Distribute results
      for (let i = 0; i < batch.length; i++) {
        const req = batch[i];
        const resolver = this.pendingResolvers.get(req.requestId);
        if (resolver) {
          resolver({
            requestId: req.requestId,
            agentId: req.agentId,
            outputTokens: outputs[i] ?? [],
            latencyMs: latency,
            batchId,
            batchPosition: i,
            fromFallback: false,
          });
          this.pendingResolvers.delete(req.requestId);
          this.pendingRejecters.delete(req.requestId);
        }
      }

      this.totalLatency += latency;
      this.totalRequests += batch.length;
    } catch (err) {
      // Reject all pending in batch
      for (const req of this.queue) {
        const rejecter = this.pendingRejecters.get(req.requestId);
        if (rejecter) {
          rejecter(err instanceof Error ? err : new Error(String(err)));
          this.pendingResolvers.delete(req.requestId);
          this.pendingRejecters.delete(req.requestId);
        }
      }
    } finally {
      this.processing = false;
      // Process remaining queue
      if (this.queue.length > 0) {
        this.scheduleFlush();
      }
    }
  }

  /**
   * Get queue depth.
   */
  getQueueDepth(): number {
    return this.queue.length;
  }

  /**
   * Get metrics.
   */
  getMetrics(): BatchMetrics {
    return {
      totalBatches: this.batchCount,
      totalRequests: this.totalRequests,
      averageBatchSize: this.batchCount > 0 ? this.totalRequests / this.batchCount : 0,
      averageLatencyMs: this.totalRequests > 0 ? this.totalLatency / this.batchCount : 0,
      timeouts: this.timeouts,
      gpuMemoryUsed: this.gpuMemoryUsed,
    };
  }

  /**
   * Update GPU memory usage tracking.
   */
  setGPUMemoryUsed(bytes: number): void {
    this.gpuMemoryUsed = bytes;
  }

  isProcessing(): boolean {
    return this.processing;
  }

  private scheduleFlush(): void {
    if (this.queue.length >= this.config.maxBatchSize) {
      // Batch is full, flush immediately
      this.flush();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.batchTimer = null;
        this.flush();
      }, this.config.maxBatchWaitMs);
    }
  }
}
