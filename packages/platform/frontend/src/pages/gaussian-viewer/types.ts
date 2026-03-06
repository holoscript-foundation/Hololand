/** Gaussian Splatting Viewer Types */

export interface GaussianSplatScene { url: string; name: string; splatCount: number; fileSizeMB: number; }

export interface RenderStats {
  fps: number;
  visibleSplats: number;
  totalSplats: number;
  culledSplats: number;
  sortTimeMs: number;
  renderTimeMs: number;
  memoryUsageMB: number;
  dynamicQuads: number;
}

export interface LoadProgress { stage: 'downloading' | 'parsing' | 'uploading' | 'sorting' | 'ready'; progress: number; bytesLoaded: number; bytesTotal: number; }

export interface ViewerConfig { opacityCullingThreshold: number; sortStrategy: 'wait-free' | 'standard'; dynamicQuadsEnabled: boolean; maxSplats: number; fov: number; nearPlane: number; farPlane: number; }
