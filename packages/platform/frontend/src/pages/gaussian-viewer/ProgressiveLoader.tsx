import React from 'react';
import type { LoadProgress } from './types';

interface ProgressiveLoaderProps { progress: LoadProgress; }

const STAGE_LABELS: Record<LoadProgress['stage'], string> = { downloading: 'Downloading splats...', parsing: 'Parsing point cloud...', uploading: 'Uploading to GPU...', sorting: 'Initial sort...', ready: 'Ready' };

export function ProgressiveLoader({ progress }: ProgressiveLoaderProps) {
  if (progress.stage === 'ready') return null;
  const mbLoaded = (progress.bytesLoaded / 1024 / 1024).toFixed(1);
  const mbTotal = (progress.bytesTotal / 1024 / 1024).toFixed(1);

  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(13,16,32,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32, textAlign: 'center', minWidth: 300, zIndex: 10 }} role="status" aria-label="Loading Gaussian splat scene">
      <div style={{ fontSize: 32, marginBottom: 12 }}>{progress.stage === 'downloading' ? '\u{2B07}\u{FE0F}' : progress.stage === 'parsing' ? '\u{1F9E9}' : progress.stage === 'uploading' ? '\u{1F4E4}' : '\u{1F504}'}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#e8e8f8', marginBottom: 8 }}>{STAGE_LABELS[progress.stage]}</div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 8 }}>
        <div style={{ height: '100%', width: `${progress.progress}%`, background: '#4ecdc4', borderRadius: 2, transition: 'width 0.3s' }} role="progressbar" aria-valuenow={progress.progress} />
      </div>
      <div style={{ fontSize: 11, color: '#556677' }}>{mbLoaded} / {mbTotal} MB ({progress.progress.toFixed(0)}%)</div>
    </div>
  );
}

export default ProgressiveLoader;
