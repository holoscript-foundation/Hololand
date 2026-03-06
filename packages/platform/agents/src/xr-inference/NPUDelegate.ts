/**
 * @hololand/agents NPUDelegate
 *
 * Qualcomm QNN Hexagon NPU delegate for ExecuTorch.
 * Manages NPU resource allocation, thermal monitoring,
 * and fallback to GPU/CPU when NPU is unavailable.
 */

export type DelegateType = 'npu' | 'gpu' | 'cpu';

export interface NPUDelegateConfig {
  preferredDelegate: DelegateType;
  fallbackChain: DelegateType[];
  thermalThrottleTemp: number; // Celsius
  maxConcurrentOps: number;
  powerMode: 'performance' | 'balanced' | 'efficiency';
}

const DEFAULT_CONFIG: NPUDelegateConfig = {
  preferredDelegate: 'npu',
  fallbackChain: ['gpu', 'cpu'],
  thermalThrottleTemp: 85,
  maxConcurrentOps: 4,
  powerMode: 'balanced',
};

export interface DelegateStatus {
  activeDelegate: DelegateType;
  npuAvailable: boolean;
  temperature: number;
  throttled: boolean;
  activeOps: number;
  fallbackCount: number;
}

export class NPUDelegate {
  private config: NPUDelegateConfig;
  private activeDelegate: DelegateType;
  private temperature: number = 45;
  private activeOps: number = 0;
  private fallbackCount: number = 0;
  private npuAvailable: boolean = true;

  constructor(config?: Partial<NPUDelegateConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.activeDelegate = this.config.preferredDelegate;
  }

  /**
   * Select the best available delegate for inference.
   */
  selectDelegate(): DelegateType {
    if (this.activeDelegate === 'npu' && this.npuAvailable && !this.isThrottled()) {
      if (this.activeOps < this.config.maxConcurrentOps) {
        return 'npu';
      }
    }

    // Fallback
    for (const delegate of this.config.fallbackChain) {
      if (delegate === 'npu' && (!this.npuAvailable || this.isThrottled())) continue;
      this.fallbackCount++;
      return delegate;
    }

    return 'cpu';
  }

  acquireOp(): DelegateType {
    const delegate = this.selectDelegate();
    this.activeOps++;
    return delegate;
  }

  releaseOp(): void {
    this.activeOps = Math.max(0, this.activeOps - 1);
  }

  updateTemperature(tempCelsius: number): void {
    this.temperature = tempCelsius;
  }

  isThrottled(): boolean {
    return this.temperature >= this.config.thermalThrottleTemp;
  }

  setNPUAvailable(available: boolean): void {
    this.npuAvailable = available;
    if (!available && this.activeDelegate === 'npu') {
      this.activeDelegate = this.config.fallbackChain[0] ?? 'cpu';
    }
  }

  getStatus(): DelegateStatus {
    return {
      activeDelegate: this.activeDelegate,
      npuAvailable: this.npuAvailable,
      temperature: this.temperature,
      throttled: this.isThrottled(),
      activeOps: this.activeOps,
      fallbackCount: this.fallbackCount,
    };
  }
}
