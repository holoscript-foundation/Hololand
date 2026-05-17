declare module '@hololand/audio' {
  export interface AvatarEmbodimentPipelineConfig {
    avatar?: unknown;
    lipSync?: unknown;
    emotion?: unknown;
    fillerGestures?: boolean;
  }

  export class AvatarEmbodimentPipeline {
    constructor(config: AvatarEmbodimentPipelineConfig);
    start(): void;
    stop(): void;
    update(delta: number): Record<string, number>;
  }
}
