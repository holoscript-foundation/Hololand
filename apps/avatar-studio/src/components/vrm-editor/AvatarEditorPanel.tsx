'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BlendShapeEditor } from './BlendShapeEditor';
import { SkeletonVisualizer } from './SkeletonVisualizer';
import { MorphTargetPreview } from './MorphTargetPreview';
import { RPMIntegrationPanel } from './RPMIntegrationPanel';
import { TriangleBudgetDisplay } from './TriangleBudgetDisplay';
import { MaterialQualityControls, DEFAULT_MATERIAL_SETTINGS } from './MaterialQualityControls';
import type {
  AvatarEditorPanelId,
  BlendShapeValues,
  MaterialQualitySettings,
  VRMFileInfo,
  RPMAvatarMetadata,
  ExpressionPresetName,
  MorphTargetWeight,
} from './types';

// ---------------------------------------------------------------------------
// Panel Navigation
// ---------------------------------------------------------------------------

interface PanelTab {
  id: AvatarEditorPanelId;
  label: string;
  shortLabel: string;
  icon: string;
}

const PANEL_TABS: PanelTab[] = [
  { id: 'blendShapes', label: 'Blend Shapes', shortLabel: 'Blend', icon: 'BS' },
  { id: 'skeleton', label: 'Skeleton', shortLabel: 'Skel', icon: 'SK' },
  { id: 'morphTargets', label: 'Morph Targets', shortLabel: 'Morph', icon: 'MT' },
  { id: 'rpm', label: 'Ready Player Me', shortLabel: 'RPM', icon: 'RP' },
  { id: 'triangleBudget', label: 'Triangle Budget', shortLabel: 'Tris', icon: 'TB' },
  { id: 'materials', label: 'Materials', shortLabel: 'Mat', icon: 'MQ' },
];

// ---------------------------------------------------------------------------
// VRM File Upload Zone
// ---------------------------------------------------------------------------

interface UploadZoneProps {
  onFileLoaded: (info: VRMFileInfo) => void;
  isLoading: boolean;
}

function UploadZone({ onFileLoaded, isLoading }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'vrm' && ext !== 'glb' && ext !== 'gltf') {
        alert('Please select a .vrm, .glb, or .gltf file');
        return;
      }

      // Simulate VRM parsing -- in production this would use @pixiv/three-vrm
      const simulatedInfo: VRMFileInfo = {
        fileName: file.name,
        fileSize: file.size,
        version: ext === 'vrm' ? '1.0' : 'glTF 2.0',
        triangleCount: Math.floor(15000 + Math.random() * 40000),
        materialCount: Math.floor(3 + Math.random() * 8),
        textureCount: Math.floor(4 + Math.random() * 12),
        boneCount: 55,
        blendShapeCount: 52,
      };

      onFileLoaded(simulatedInfo);
    },
    [onFileLoaded]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-3 p-8 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
        isDragOver
          ? 'border-holo-500 bg-holo-500/5'
          : 'border-studio-border hover:border-studio-muted hover:bg-studio-surface/30'
      }`}
      role="button"
      tabIndex={0}
      aria-label="Upload VRM file"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".vrm,.glb,.gltf"
        onChange={handleInputChange}
        className="hidden"
      />

      {isLoading ? (
        <div className="w-8 h-8 border-2 border-holo-500/30 border-t-holo-400 rounded-full animate-spin" />
      ) : (
        <svg
          className="w-10 h-10 text-studio-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      )}

      <div className="text-center">
        <p className="text-xs font-medium text-studio-text">
          {isLoading ? 'Loading VRM...' : 'Drop VRM file here or click to browse'}
        </p>
        <p className="text-[10px] text-studio-muted mt-1">Supports .vrm, .glb, .gltf (max 50MB)</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VRM File Info Card
// ---------------------------------------------------------------------------

interface FileInfoCardProps {
  info: VRMFileInfo;
  onRemove: () => void;
}

function FileInfoCard({ info, onRemove }: FileInfoCardProps) {
  return (
    <div className="studio-panel rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-holo-500/15 flex items-center justify-center">
            <span className="text-xs font-bold text-holo-400">VRM</span>
          </div>
          <div>
            <p className="text-xs font-medium text-studio-text truncate max-w-[200px]">
              {info.fileName}
            </p>
            <p className="text-[10px] text-studio-muted">
              {(info.fileSize / (1024 * 1024)).toFixed(1)}MB | {info.version}
            </p>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Triangles', value: info.triangleCount.toLocaleString() },
          { label: 'Materials', value: String(info.materialCount) },
          { label: 'Textures', value: String(info.textureCount) },
          { label: 'Bones', value: String(info.boneCount) },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <div className="text-xs font-semibold text-studio-text font-mono">{value}</div>
            <div className="text-[9px] text-studio-muted">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3D Preview Canvas (placeholder for R3F integration)
// ---------------------------------------------------------------------------

function PreviewCanvas({ vrmFile }: { vrmFile: VRMFileInfo | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = parent.clientWidth * dpr;
    canvas.height = parent.clientHeight * dpr;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const w = parent.clientWidth;
    const h = parent.clientHeight;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#1a1d27');
    bgGrad.addColorStop(1, '#0f1117');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Grid floor
    ctx.strokeStyle = '#ffffff08';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, h * 0.7);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = h * 0.7; y < h; y += 15) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (vrmFile) {
      // Placeholder avatar silhouette
      const cx = w / 2;
      const baseY = h * 0.75;

      ctx.strokeStyle = '#4c9ef640';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Head
      ctx.beginPath();
      ctx.ellipse(cx, baseY - h * 0.35, 20, 24, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Body
      ctx.beginPath();
      ctx.moveTo(cx - 25, baseY - h * 0.28);
      ctx.lineTo(cx - 15, baseY - h * 0.05);
      ctx.lineTo(cx + 15, baseY - h * 0.05);
      ctx.lineTo(cx + 25, baseY - h * 0.28);
      ctx.stroke();

      // Arms
      ctx.beginPath();
      ctx.moveTo(cx - 25, baseY - h * 0.25);
      ctx.lineTo(cx - 45, baseY - h * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 25, baseY - h * 0.25);
      ctx.lineTo(cx + 45, baseY - h * 0.1);
      ctx.stroke();

      // Legs
      ctx.beginPath();
      ctx.moveTo(cx - 12, baseY - h * 0.05);
      ctx.lineTo(cx - 15, baseY + h * 0.05);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 12, baseY - h * 0.05);
      ctx.lineTo(cx + 15, baseY + h * 0.05);
      ctx.stroke();

      ctx.setLineDash([]);

      // File name
      ctx.fillStyle = '#8b8fa3';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(vrmFile.fileName, cx, baseY + h * 0.1);
      ctx.font = '9px Inter, sans-serif';
      ctx.fillStyle = '#8b8fa360';
      ctx.fillText('R3F preview integration pending', cx, baseY + h * 0.1 + 14);
    } else {
      ctx.fillStyle = '#8b8fa350';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Upload a VRM file to preview', w / 2, h / 2);
    }
  }, [vrmFile]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

// ---------------------------------------------------------------------------
// Main AvatarEditorPanel
// ---------------------------------------------------------------------------

export function AvatarEditorPanel() {
  const [activePanel, setActivePanel] = useState<AvatarEditorPanelId>('blendShapes');
  const [vrmFile, setVrmFile] = useState<VRMFileInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [blendShapeValues, setBlendShapeValues] = useState<BlendShapeValues>({});
  const [materialSettings, setMaterialSettings] =
    useState<MaterialQualitySettings>(DEFAULT_MATERIAL_SETTINGS);
  const [selectedBone, setSelectedBone] = useState<string | null>(null);

  const handleFileLoaded = useCallback((info: VRMFileInfo) => {
    setIsLoading(true);
    // Simulate async loading
    setTimeout(() => {
      setVrmFile(info);
      setIsLoading(false);
    }, 600);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setVrmFile(null);
    setBlendShapeValues({});
    setSelectedBone(null);
  }, []);

  const handleRPMImport = useCallback((metadata: RPMAvatarMetadata) => {
    // Simulate creating a VRM file from RPM import
    setVrmFile({
      fileName: `rpm-avatar-${metadata.id}.vrm`,
      fileSize: 2.5 * 1024 * 1024,
      version: '1.0 (RPM)',
      triangleCount: metadata.polyCount,
      materialCount: 4,
      textureCount: metadata.textureCount,
      boneCount: 55,
      blendShapeCount: 52,
    });
  }, []);

  const handlePresetApply = useCallback(
    (_preset: ExpressionPresetName, weights: MorphTargetWeight[]) => {
      const newValues = { ...blendShapeValues };
      for (const { name, weight } of weights) {
        newValues[name] = weight;
      }
      setBlendShapeValues(newValues);
    },
    [blendShapeValues]
  );

  const renderActivePanel = () => {
    switch (activePanel) {
      case 'blendShapes':
        return <BlendShapeEditor values={blendShapeValues} onChange={setBlendShapeValues} />;
      case 'skeleton':
        return <SkeletonVisualizer selectedBone={selectedBone} onBoneSelect={setSelectedBone} />;
      case 'morphTargets':
        return <MorphTargetPreview onPresetApply={handlePresetApply} />;
      case 'rpm':
        return <RPMIntegrationPanel onImport={handleRPMImport} />;
      case 'triangleBudget':
        return <TriangleBudgetDisplay currentTriangleCount={vrmFile?.triangleCount ?? 0} />;
      case 'materials':
        return (
          <MaterialQualityControls settings={materialSettings} onChange={setMaterialSettings} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-studio-bg">
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-studio-border bg-studio-panel">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-studio-text tracking-wide">HOLOLAND</h1>
          <span className="text-xs text-studio-muted">VRM Avatar Editor</span>
        </div>
        <div className="flex items-center gap-2">
          {vrmFile && (
            <>
              <span className="text-[10px] text-holo-400 font-medium">
                {vrmFile.triangleCount.toLocaleString()} tris
              </span>
              <div className="w-px h-4 bg-studio-border" />
            </>
          )}
          <span className="text-xs text-studio-muted font-mono">
            {vrmFile?.fileName ?? 'No file loaded'}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* 3D Preview (left) */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Preview Canvas */}
          <div className="flex-1 min-h-0 relative">
            <PreviewCanvas vrmFile={vrmFile} />

            {/* Upload overlay when no file */}
            {!vrmFile && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="max-w-sm w-full">
                  <UploadZone onFileLoaded={handleFileLoaded} isLoading={isLoading} />
                </div>
              </div>
            )}

            {/* Camera controls */}
            {vrmFile && (
              <div className="absolute bottom-3 right-3 flex gap-1.5">
                <button className="studio-btn-secondary p-1.5 text-xs" title="Front View">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </button>
                <button className="studio-btn-secondary p-1.5 text-xs" title="Rotate">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
                <button className="studio-btn-secondary p-1.5 text-xs" title="Zoom to Fit">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* File Info Card at bottom of preview */}
          {vrmFile && (
            <div className="p-3 border-t border-studio-border bg-studio-panel">
              <FileInfoCard info={vrmFile} onRemove={handleRemoveFile} />
            </div>
          )}
        </div>

        {/* Property Panel (right) */}
        <aside className="w-[380px] flex-shrink-0 border-l border-studio-border bg-studio-panel flex flex-col">
          {/* Panel Tabs */}
          <nav className="flex border-b border-studio-border overflow-x-auto scrollbar-none">
            {PANEL_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id)}
                className={`studio-tab whitespace-nowrap flex-shrink-0 ${
                  activePanel === tab.id ? 'studio-tab-active' : ''
                }`}
                title={tab.label}
              >
                <span className="hidden lg:inline">{tab.label}</span>
                <span className="lg:hidden">{tab.shortLabel}</span>
              </button>
            ))}
          </nav>

          {/* Active Panel Content */}
          <div className="flex-1 min-h-0 overflow-hidden">{renderActivePanel()}</div>
        </aside>
      </div>
    </div>
  );
}
