type GPUPowerPreference = 'low-power' | 'high-performance';
type GPUBufferUsageFlags = number;
type GPUTextureFormat = string;
type GPUBufferMapState = 'unmapped' | 'pending' | 'mapped';

type GPUAdapter = any;
type GPUBindGroup = any;
type GPUBindGroupLayout = any;
type GPUBuffer = any;
type GPUBufferDescriptor = any;
type GPUCanvasContext = any;
type GPUCommandBuffer = any;
type GPUCommandEncoder = any;
type GPUComputePipeline = any;
type GPUDevice = any;
type GPUDeviceLostInfo = any;
type GPURenderPassColorAttachment = any;
type GPURenderPassDepthStencilAttachment = any;
type GPURenderPipeline = any;
type GPUSampler = any;
type GPUShaderModule = any;
type GPUSupportedFeatures = any;
type GPUSupportedLimits = any;
type GPUTexture = any;
type GPUTextureView = any;

interface Navigator {
  readonly gpu?: {
    requestAdapter(options?: Record<string, unknown>): Promise<GPUAdapter | null>;
    getPreferredCanvasFormat(): GPUTextureFormat;
  };
}

declare const GPUBufferUsage: {
  readonly MAP_READ: number;
  readonly MAP_WRITE: number;
  readonly COPY_SRC: number;
  readonly COPY_DST: number;
  readonly INDEX: number;
  readonly VERTEX: number;
  readonly UNIFORM: number;
  readonly STORAGE: number;
  readonly INDIRECT: number;
  readonly QUERY_RESOLVE: number;
};

declare const GPUTextureUsage: {
  readonly COPY_SRC: number;
  readonly COPY_DST: number;
  readonly TEXTURE_BINDING: number;
  readonly STORAGE_BINDING: number;
  readonly RENDER_ATTACHMENT: number;
};

declare const GPUMapMode: {
  readonly READ: number;
  readonly WRITE: number;
};

declare const GPUColorWrite: {
  readonly RED: number;
  readonly GREEN: number;
  readonly BLUE: number;
  readonly ALPHA: number;
  readonly ALL: number;
};
