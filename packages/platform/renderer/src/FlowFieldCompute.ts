export interface FlowFieldComputeConfig {
  width: number;
  height: number;
  depth?: number;
  diffusion?: number;
  decay?: number;
}

export class FlowFieldCompute {
  private readonly config: Required<FlowFieldComputeConfig>;
  private velocityBuffer: GPUBuffer | null = null;

  constructor(
    private readonly device: GPUDevice | null,
    config: FlowFieldComputeConfig
  ) {
    this.config = {
      depth: 1,
      diffusion: 0.98,
      decay: 0.995,
      ...config,
    };
  }

  initialize(): GPUBuffer | null {
    if (!this.device) {
      return null;
    }

    const cells = this.config.width * this.config.height * this.config.depth;
    this.velocityBuffer = this.device.createBuffer({
      label: 'hololand-flow-field-velocity',
      size: Math.max(cells * 4 * Float32Array.BYTES_PER_ELEMENT, 16),
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    return this.velocityBuffer;
  }

  getVelocityBuffer(): GPUBuffer | null {
    return this.velocityBuffer;
  }

  getConfig(): Readonly<Required<FlowFieldComputeConfig>> {
    return this.config;
  }

  dispatch(): void {
    throw new Error(
      'FlowFieldCompute.dispatch requires the full WebGPU flow-field shader pipeline, which is not bundled in this compatibility facade.'
    );
  }

  dispose(): void {
    this.velocityBuffer?.destroy();
    this.velocityBuffer = null;
  }
}
