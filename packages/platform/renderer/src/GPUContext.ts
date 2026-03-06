/**
 * GPUContext (Phase 5)
 *
 * WebGPU Compute Engine for HoloScript.
 * Handles device initialization, shader modules, bind groups, and compute dispatch.
 */

export interface GPUContextConfig {
  powerPreference?: GPUPowerPreference;
}

export class GPUContext {
  private adapter: GPUAdapter | null = null;
  private device: GPUDevice | null = null;
  private pipelines: Map<string, GPUComputePipeline> = new Map();

  constructor(private config: GPUContextConfig = {}) {}

  async initialize(): Promise<void> {
    if (!navigator.gpu) {
      console.warn('[GPUContext] WebGPU not supported');
      return;
    }

    this.adapter = await navigator.gpu.requestAdapter({
      powerPreference: this.config.powerPreference || 'high-performance',
    });

    if (!this.adapter) {
      console.warn('[GPUContext] No adapter found');
      return;
    }

    this.device = await this.adapter.requestDevice();
    console.log('[GPUContext] WebGPU initialized');
  }

  isSupported(): boolean {
    return !!this.device;
  }

  createComputePipeline(name: string, shaderCode: string): void {
    if (!this.device) return;

    const module = this.device.createShaderModule({
      code: shaderCode,
    });

    const pipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module,
        entryPoint: 'main',
      },
    });

    this.pipelines.set(name, pipeline);
  }

  dispatch(name: string, workgroups: [number, number, number], bindBuffer?: GPUBuffer): void {
    if (!this.device) return;

    const pipeline = this.pipelines.get(name);
    if (!pipeline) {
      console.warn(`[GPUContext] Pipeline ${name} not found`);
      return;
    }

    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);

    if (bindBuffer) {
      // Simplistic bind group creation for demo
      // In reality, we'd manage BindGroupLayouts more robustly
      const bindGroup = this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: bindBuffer },
          },
        ],
      });
      passEncoder.setBindGroup(0, bindGroup);
    }

    passEncoder.dispatchWorkgroups(workgroups[0], workgroups[1], workgroups[2]);
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }

  createBuffer(size: number, usage: GPUBufferUsageFlags): GPUBuffer | null {
    if (!this.device) return null;
    return this.device.createBuffer({
      size,
      usage,
    });
  }
}
