'use client';

import { useCallback } from 'react';
import { Select } from '@/components/ui/Select';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { MaterialQualitySettings, TextureResolution, LODLevel } from './types';

// ---------------------------------------------------------------------------
// Default Settings
// ---------------------------------------------------------------------------

export const DEFAULT_MATERIAL_SETTINGS: MaterialQualitySettings = {
  textureResolution: 1024,
  enablePBR: true,
  enableNormalMap: true,
  enableEmissive: false,
  enableAO: true,
  enableMetallicRoughness: true,
  lodLevel: 0,
  enableMipmaps: true,
  textureCompression: 'ktx2',
};

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const RESOLUTION_OPTIONS: { value: string; label: string }[] = [
  { value: '256', label: '256x256 (Mobile)' },
  { value: '512', label: '512x512 (Quest)' },
  { value: '1024', label: '1024x1024 (Standard)' },
  { value: '2048', label: '2048x2048 (High)' },
  { value: '4096', label: '4096x4096 (Ultra)' },
];

const COMPRESSION_OPTIONS: { value: string; label: string }[] = [
  { value: 'none', label: 'None (Uncompressed)' },
  { value: 'basis', label: 'Basis Universal' },
  { value: 'ktx2', label: 'KTX2 (Recommended)' },
];

const LOD_LABELS: Record<LODLevel, string> = {
  0: 'LOD 0 (Full Detail)',
  1: 'LOD 1 (75% Detail)',
  2: 'LOD 2 (50% Detail)',
  3: 'LOD 3 (25% Detail)',
};

const LOD_OPTIONS: { value: string; label: string }[] = [
  { value: '0', label: LOD_LABELS[0] },
  { value: '1', label: LOD_LABELS[1] },
  { value: '2', label: LOD_LABELS[2] },
  { value: '3', label: LOD_LABELS[3] },
];

// ---------------------------------------------------------------------------
// Estimated VRAM calculation
// ---------------------------------------------------------------------------

function estimateVRAM(settings: MaterialQualitySettings): number {
  const basePixels = settings.textureResolution * settings.textureResolution;
  let channelCount = 3; // base color (RGB)

  if (settings.enableNormalMap) channelCount += 3;
  if (settings.enableMetallicRoughness) channelCount += 2;
  if (settings.enableAO) channelCount += 1;
  if (settings.enableEmissive) channelCount += 3;

  let bytes = basePixels * channelCount;

  // Mipmaps add ~33% overhead
  if (settings.enableMipmaps) bytes *= 1.33;

  // Compression reduces by ~6-8x
  if (settings.textureCompression === 'basis') bytes *= 0.15;
  if (settings.textureCompression === 'ktx2') bytes *= 0.12;

  // LOD reduces texture res
  const lodScale = [1, 0.5, 0.25, 0.125][settings.lodLevel];
  bytes *= lodScale;

  return bytes;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MaterialQualityControlsProps {
  settings: MaterialQualitySettings;
  onChange: (settings: MaterialQualitySettings) => void;
}

export function MaterialQualityControls({ settings, onChange }: MaterialQualityControlsProps) {
  const updateField = useCallback(
    <K extends keyof MaterialQualitySettings>(key: K, value: MaterialQualitySettings[K]) => {
      onChange({ ...settings, [key]: value });
    },
    [settings, onChange]
  );

  const vramEstimate = estimateVRAM(settings);

  // Quick presets
  const applyPreset = useCallback(
    (preset: 'mobile' | 'standard' | 'high') => {
      switch (preset) {
        case 'mobile':
          onChange({
            textureResolution: 512,
            enablePBR: true,
            enableNormalMap: false,
            enableEmissive: false,
            enableAO: false,
            enableMetallicRoughness: false,
            lodLevel: 2,
            enableMipmaps: true,
            textureCompression: 'basis',
          });
          break;
        case 'standard':
          onChange({
            textureResolution: 1024,
            enablePBR: true,
            enableNormalMap: true,
            enableEmissive: false,
            enableAO: true,
            enableMetallicRoughness: true,
            lodLevel: 0,
            enableMipmaps: true,
            textureCompression: 'ktx2',
          });
          break;
        case 'high':
          onChange({
            textureResolution: 2048,
            enablePBR: true,
            enableNormalMap: true,
            enableEmissive: true,
            enableAO: true,
            enableMetallicRoughness: true,
            lodLevel: 0,
            enableMipmaps: true,
            textureCompression: 'none',
          });
          break;
      }
    },
    [onChange]
  );

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">
      <SectionHeader
        title="Material Quality"
        description="Configure texture resolution, PBR maps, and LOD settings"
      />

      {/* Quick Presets */}
      <section>
        <div className="text-xs font-medium text-studio-muted mb-2">Quality Presets</div>
        <div className="grid grid-cols-3 gap-1.5">
          {(['mobile', 'standard', 'high'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => applyPreset(preset)}
              className="px-3 py-2 rounded border border-studio-border text-xs font-medium capitalize text-studio-muted hover:text-studio-text hover:border-holo-500/50 hover:bg-holo-500/5 transition-all"
            >
              {preset}
            </button>
          ))}
        </div>
      </section>

      {/* VRAM Estimate */}
      <div className="studio-panel rounded-lg p-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-studio-muted">Est. VRAM Usage</div>
          <div className="text-sm font-bold text-studio-text font-mono mt-0.5">
            {formatBytes(vramEstimate)}
          </div>
        </div>
        <div
          className={`px-2 py-1 rounded text-[10px] font-medium ${
            vramEstimate > 50 * 1024 * 1024
              ? 'bg-red-500/15 text-red-400'
              : vramEstimate > 20 * 1024 * 1024
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-green-500/15 text-green-400'
          }`}
        >
          {vramEstimate > 50 * 1024 * 1024
            ? 'High'
            : vramEstimate > 20 * 1024 * 1024
              ? 'Medium'
              : 'Low'}
        </div>
      </div>

      {/* Texture Resolution */}
      <Select
        label="Texture Resolution"
        value={String(settings.textureResolution)}
        options={RESOLUTION_OPTIONS}
        onChange={(v) => updateField('textureResolution', parseInt(v, 10) as TextureResolution)}
      />

      {/* Texture Compression */}
      <Select
        label="Texture Compression"
        value={settings.textureCompression}
        options={COMPRESSION_OPTIONS}
        onChange={(v) =>
          updateField('textureCompression', v as MaterialQualitySettings['textureCompression'])
        }
      />

      {/* LOD Level */}
      <Select
        label="LOD Level"
        value={String(settings.lodLevel)}
        options={LOD_OPTIONS}
        onChange={(v) => updateField('lodLevel', parseInt(v, 10) as LODLevel)}
      />

      {/* PBR Toggles */}
      <section>
        <SectionHeader
          title="PBR Material Maps"
          description="Toggle individual material channels"
        />
        <div className="flex flex-col gap-2">
          {[
            {
              key: 'enablePBR' as const,
              label: 'PBR Shading',
              desc: 'Physically-based rendering pipeline',
            },
            {
              key: 'enableNormalMap' as const,
              label: 'Normal Map',
              desc: 'Surface detail without extra geometry',
            },
            {
              key: 'enableMetallicRoughness' as const,
              label: 'Metallic / Roughness',
              desc: 'Metal and surface smoothness maps',
            },
            {
              key: 'enableAO' as const,
              label: 'Ambient Occlusion',
              desc: 'Soft contact shadows in crevices',
            },
            {
              key: 'enableEmissive' as const,
              label: 'Emissive',
              desc: 'Self-illuminating material regions',
            },
            {
              key: 'enableMipmaps' as const,
              label: 'Mipmaps',
              desc: 'Pre-filtered texture LODs for rendering',
            },
          ].map(({ key, label, desc }) => (
            <label
              key={key}
              className="flex items-start gap-2.5 px-3 py-2 rounded hover:bg-studio-surface/30 transition-colors cursor-pointer"
            >
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={(e) => updateField(key, e.target.checked)}
                className="mt-0.5 rounded border-studio-border bg-studio-surface text-holo-500 focus:ring-holo-500"
              />
              <div>
                <span className="text-xs font-medium text-studio-text block">{label}</span>
                <span className="text-[10px] text-studio-muted">{desc}</span>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* LOD Preview Description */}
      <section className="studio-panel rounded-lg p-3">
        <div className="text-xs font-medium text-studio-muted mb-2">
          LOD Preview -- {LOD_LABELS[settings.lodLevel]}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {([0, 1, 2, 3] as LODLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => updateField('lodLevel', level)}
              className={`flex flex-col items-center gap-1 p-2 rounded border transition-all ${
                settings.lodLevel === level
                  ? 'border-holo-500 bg-holo-500/10'
                  : 'border-studio-border hover:border-studio-muted'
              }`}
            >
              {/* LOD visual indicator -- decreasing detail squares */}
              <div className="w-8 h-8 flex items-center justify-center">
                <div
                  className={`rounded transition-all ${
                    settings.lodLevel === level ? 'bg-holo-500/40' : 'bg-studio-muted/20'
                  }`}
                  style={{
                    width: `${32 - level * 6}px`,
                    height: `${32 - level * 6}px`,
                  }}
                />
              </div>
              <span
                className={`text-[10px] font-mono ${
                  settings.lodLevel === level ? 'text-holo-400' : 'text-studio-muted'
                }`}
              >
                LOD {level}
              </span>
              <span className="text-[9px] text-studio-muted">{[100, 75, 50, 25][level]}%</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
