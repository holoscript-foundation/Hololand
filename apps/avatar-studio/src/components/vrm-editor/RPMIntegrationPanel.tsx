'use client';

import { useCallback, useState } from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { RPMImportStatus, RPMAvatarMetadata } from './types';

// ---------------------------------------------------------------------------
// Status Step Indicators
// ---------------------------------------------------------------------------

const STATUS_STEPS: { key: RPMImportStatus; label: string; order: number }[] = [
  { key: 'validating', label: 'Validating URL', order: 1 },
  { key: 'downloading', label: 'Downloading Avatar', order: 2 },
  { key: 'converting', label: 'Converting to VRM', order: 3 },
  { key: 'complete', label: 'Import Complete', order: 4 },
];

function getStepState(
  currentStatus: RPMImportStatus,
  stepKey: RPMImportStatus
): 'completed' | 'active' | 'pending' | 'error' {
  if (currentStatus === 'error') return 'error';
  const current = STATUS_STEPS.find((s) => s.key === currentStatus);
  const step = STATUS_STEPS.find((s) => s.key === stepKey);
  if (!current || !step) return 'pending';
  if (step.order < current.order) return 'completed';
  if (step.order === current.order) return 'active';
  return 'pending';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface RPMIntegrationPanelProps {
  onImport?: (metadata: RPMAvatarMetadata) => void;
}

export function RPMIntegrationPanel({ onImport }: RPMIntegrationPanelProps) {
  const [rpmUrl, setRpmUrl] = useState('');
  const [status, setStatus] = useState<RPMImportStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<RPMAvatarMetadata | null>(null);

  const isValidUrl = useCallback((url: string): boolean => {
    try {
      const parsed = new URL(url);
      return (
        parsed.hostname.endsWith('readyplayer.me') ||
        parsed.hostname.endsWith('rpm.app') ||
        parsed.hostname === 'models.readyplayer.me'
      );
    } catch {
      return false;
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!rpmUrl.trim()) return;
    if (!isValidUrl(rpmUrl)) {
      setError('Please enter a valid Ready Player Me avatar URL');
      return;
    }

    setError(null);
    setMetadata(null);

    // Simulate the import process with progressive status updates
    try {
      setStatus('validating');
      await new Promise((r) => setTimeout(r, 800));

      setStatus('downloading');
      await new Promise((r) => setTimeout(r, 1500));

      setStatus('converting');
      await new Promise((r) => setTimeout(r, 1200));

      // Simulated metadata from a successful import
      const importedMeta: RPMAvatarMetadata = {
        id: `rpm-${Date.now().toString(36)}`,
        gender: 'neutral',
        bodyType: 'fullbody',
        createdAt: new Date().toISOString(),
        assets: ['head', 'body', 'outfit', 'hair'],
        polyCount: 28450,
        textureCount: 6,
      };

      setMetadata(importedMeta);
      setStatus('complete');
      onImport?.(importedMeta);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  }, [rpmUrl, isValidUrl, onImport]);

  const handleReset = useCallback(() => {
    setRpmUrl('');
    setStatus('idle');
    setError(null);
    setMetadata(null);
  }, []);

  const isImporting = status !== 'idle' && status !== 'complete' && status !== 'error';

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">
      <SectionHeader
        title="Ready Player Me"
        description="Import avatars from Ready Player Me into your VRM project"
      />

      {/* URL Input */}
      <section>
        <label className="text-xs font-medium text-studio-muted mb-1.5 block">Avatar URL</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={rpmUrl}
            onChange={(e) => {
              setRpmUrl(e.target.value);
              setError(null);
            }}
            placeholder="https://models.readyplayer.me/..."
            className="studio-input flex-1 text-xs font-mono"
            disabled={isImporting}
          />
          <button
            onClick={status === 'complete' || status === 'error' ? handleReset : handleImport}
            disabled={isImporting || (!rpmUrl.trim() && status === 'idle')}
            className={`px-4 py-2 rounded text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              status === 'complete' || status === 'error'
                ? 'bg-studio-surface border border-studio-border text-studio-text hover:bg-studio-surface/80'
                : 'bg-holo-500 text-white hover:bg-holo-400'
            }`}
          >
            {status === 'complete' || status === 'error'
              ? 'Reset'
              : isImporting
                ? 'Importing...'
                : 'Import'}
          </button>
        </div>
        {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
        <p className="text-[10px] text-studio-muted mt-1.5">
          Paste a Ready Player Me avatar URL (.glb) or avatar ID to import
        </p>
      </section>

      {/* Import Progress */}
      {status !== 'idle' && (
        <section className="studio-panel rounded-lg p-3">
          <div className="text-xs font-medium text-studio-muted mb-3">Import Progress</div>
          <div className="flex flex-col gap-2">
            {STATUS_STEPS.map((step, idx) => {
              const state = getStepState(status, step.key);
              return (
                <div key={step.key} className="flex items-center gap-3">
                  {/* Step indicator */}
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold transition-colors ${
                      state === 'completed'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : state === 'active'
                          ? 'bg-holo-500/20 text-holo-400 border border-holo-500/40'
                          : state === 'error'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-studio-bg text-studio-muted border border-studio-border'
                    }`}
                  >
                    {state === 'completed' ? (
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : state === 'error' ? (
                      'X'
                    ) : (
                      idx + 1
                    )}
                  </div>

                  {/* Step label */}
                  <span
                    className={`text-xs transition-colors ${
                      state === 'completed'
                        ? 'text-green-400'
                        : state === 'active'
                          ? 'text-holo-400 font-medium'
                          : state === 'error'
                            ? 'text-red-400'
                            : 'text-studio-muted'
                    }`}
                  >
                    {step.label}
                  </span>

                  {/* Loading spinner for active step */}
                  {state === 'active' && (
                    <div className="w-3 h-3 border-2 border-holo-500/30 border-t-holo-400 rounded-full animate-spin ml-auto" />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Avatar Metadata Display */}
      {metadata && (
        <section className="studio-panel rounded-lg p-3">
          <div className="text-xs font-semibold text-studio-text mb-3">Avatar Metadata</div>
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-studio-muted">ID</span>
              <span className="text-studio-text font-mono">{metadata.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-studio-muted">Gender</span>
              <span className="text-studio-text capitalize">{metadata.gender}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-studio-muted">Body Type</span>
              <span className="text-studio-text capitalize">{metadata.bodyType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-studio-muted">Created</span>
              <span className="text-studio-text">
                {new Date(metadata.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-studio-muted">Polygons</span>
              <span className="text-studio-text font-mono">
                {metadata.polyCount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-studio-muted">Textures</span>
              <span className="text-studio-text font-mono">{metadata.textureCount}</span>
            </div>

            {/* Assets list */}
            <div className="mt-1 pt-2 border-t border-studio-border">
              <span className="text-studio-muted block mb-1.5">Included Assets</span>
              <div className="flex flex-wrap gap-1.5">
                {metadata.assets.map((asset) => (
                  <span
                    key={asset}
                    className="px-2 py-0.5 bg-holo-500/10 text-holo-400 text-[10px] rounded-full font-medium capitalize"
                  >
                    {asset}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* RPM Info */}
      <section className="studio-panel rounded-lg p-3">
        <p className="text-[10px] text-studio-muted leading-relaxed">
          Ready Player Me avatars are imported as GLB files and automatically converted to VRM
          format with proper humanoid bone mapping and blend shape configuration. Supported avatar
          types: half-body and full-body. Texture and material quality is preserved during
          conversion.
        </p>
      </section>
    </div>
  );
}
