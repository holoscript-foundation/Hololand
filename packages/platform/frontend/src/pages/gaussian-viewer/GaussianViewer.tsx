import React, { useState } from 'react';
import { WebSplatterEngine } from './WebSplatterEngine';
import { ProgressiveLoader } from './ProgressiveLoader';
import type { RenderStats, LoadProgress, ViewerConfig, GaussianSplatScene } from './types';

interface GaussianViewerProps {
  scene: GaussianSplatScene;
  stats: RenderStats;
  loadProgress: LoadProgress;
}

const DEFAULT_CONFIG: ViewerConfig = { opacityCullingThreshold: 0.01, sortStrategy: 'wait-free', dynamicQuadsEnabled: true, maxSplats: 3000000, fov: 60, nearPlane: 0.1, farPlane: 1000 };

/**
 * GaussianViewer -- WebGPU Gaussian Splatting viewer with WebSplatter architecture.
 */
export function GaussianViewer({ scene, stats, loadProgress }: GaussianViewerProps) {
  const [config, setConfig] = useState<ViewerConfig>(DEFAULT_CONFIG);
  const isLoading = loadProgress.stage !== 'ready';

  return (
    <div style={{ minHeight: '100vh', background: '#08090f', color: '#d0d0e8', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', height: '100vh' }}>
        {/* Viewport */}
        <div style={{ flex: 1, position: 'relative', background: '#000' }}>
          {isLoading && <ProgressiveLoader progress={loadProgress} />}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334' }}>
            <span style={{ fontSize: 13 }}>WebGPU Gaussian Splat Viewport</span>
          </div>
          {/* HUD overlay */}
          <div style={{ position: 'absolute', top: 12, left: 12, fontSize: 10, color: '#667788', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: 4 }}>
            {scene.name} &middot; {(scene.splatCount / 1000000).toFixed(1)}M splats &middot; {stats.fps} FPS
          </div>
        </div>

        {/* Sidebar */}
        <WebSplatterEngine stats={stats} config={config} onConfigChange={(partial) => setConfig((prev) => ({ ...prev, ...partial }))} />
      </div>
    </div>
  );
}

export default GaussianViewer;
