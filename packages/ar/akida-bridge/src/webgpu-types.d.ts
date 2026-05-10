type GPUDevice = any;

interface Navigator {
  readonly gpu?: {
    requestAdapter(options?: Record<string, unknown>): Promise<any | null>;
  };
}

declare const GPUBufferUsage: {
  readonly STORAGE: number;
  readonly COPY_DST: number;
  readonly COPY_SRC: number;
  readonly MAP_READ: number;
};

declare const GPUShaderStage: {
  readonly COMPUTE: number;
};

declare const GPUMapMode: {
  readonly READ: number;
};
