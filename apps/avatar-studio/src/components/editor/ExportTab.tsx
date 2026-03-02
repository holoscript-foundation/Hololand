'use client';

import { useCallback, useState } from 'react';
import type { UseBlueprintReturn } from '@/hooks/useBlueprint';
import type {
  ExportFormat,
  ExportQuality,
  VRMAllowedUser,
  VRMLicenseType,
} from '@hololand/avatar-studio';
import { Select } from '@/components/ui/Select';
import { SectionHeader } from '@/components/ui/SectionHeader';

interface ExportTabProps {
  store: UseBlueprintReturn;
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string }[] = [
  { value: 'vrm', label: 'VRM (Recommended)' },
  { value: 'glb', label: 'GLB (glTF Binary)' },
  { value: 'gltf', label: 'glTF' },
  { value: 'fbx', label: 'FBX' },
];

const QUALITY_OPTIONS: { value: ExportQuality; label: string }[] = [
  { value: 'full', label: 'Full Quality' },
  { value: 'optimized', label: 'Optimized (Default)' },
  { value: 'mobile', label: 'Mobile / Quest' },
];

const LICENSE_OPTIONS: { value: VRMLicenseType; label: string }[] = [
  { value: 'CC0', label: 'CC0 (Public Domain)' },
  { value: 'CC_BY', label: 'CC BY (Default)' },
  { value: 'CC_BY_NC', label: 'CC BY-NC' },
  { value: 'CC_BY_SA', label: 'CC BY-SA' },
  { value: 'CC_BY_NC_SA', label: 'CC BY-NC-SA' },
  { value: 'CC_BY_ND', label: 'CC BY-ND' },
  { value: 'CC_BY_NC_ND', label: 'CC BY-NC-ND' },
  { value: 'Redistribution_Prohibited', label: 'No Redistribution' },
  { value: 'Other', label: 'Other' },
];

const ALLOWED_USER_OPTIONS: { value: VRMAllowedUser; label: string }[] = [
  { value: 'Everyone', label: 'Everyone' },
  { value: 'ExplicitlyLicensedPerson', label: 'Licensed Users' },
  { value: 'OnlyAuthor', label: 'Author Only' },
];

export function ExportTab({ store }: ExportTabProps) {
  const { blueprint, setVRMMeta } = store;
  const { vrmMeta } = blueprint;

  const [exportFormat, setExportFormat] = useState<ExportFormat>('vrm');
  const [exportQuality, setExportQuality] = useState<ExportQuality>('optimized');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      // In the full implementation, this calls the AvatarStudio.exportVRM()
      // or triggers a save via the Cloud API. For now, we serialize the blueprint.
      const blueprintJson = JSON.stringify(blueprint, null, 2);
      const blob = new Blob([blueprintJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${blueprint.name.replace(/\s+/g, '-').toLowerCase()}.blueprint.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }, [blueprint]);

  const handleSaveToCloud = useCallback(async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/v1/avatars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blueprint }),
      });
      if (!response.ok) {
        throw new Error(`Save failed: ${response.status}`);
      }
      const data = await response.json();
      alert(`Avatar saved! ID: ${data.data.id}`);
    } catch (err) {
      alert(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  }, [blueprint]);

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto h-full">
      {/* Export Settings */}
      <section>
        <SectionHeader
          title="Export Settings"
          description="Configure the output format and quality"
        />
        <div className="flex flex-col gap-3">
          <Select
            label="Format"
            value={exportFormat}
            options={FORMAT_OPTIONS}
            onChange={(v) => setExportFormat(v as ExportFormat)}
          />
          <Select
            label="Quality"
            value={exportQuality}
            options={QUALITY_OPTIONS}
            onChange={(v) => setExportQuality(v as ExportQuality)}
          />
        </div>
      </section>

      {/* VRM Metadata */}
      <section>
        <SectionHeader
          title="VRM Metadata"
          description="Information embedded in the exported VRM file"
        />
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-studio-muted">
              Title
            </label>
            <input
              type="text"
              value={vrmMeta.title}
              onChange={(e) => setVRMMeta({ title: e.target.value })}
              className="studio-input"
              placeholder="My Avatar"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-studio-muted">
              Author
            </label>
            <input
              type="text"
              value={vrmMeta.author}
              onChange={(e) => setVRMMeta({ author: e.target.value })}
              className="studio-input"
              placeholder="Your Name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-studio-muted">
              Description
            </label>
            <textarea
              value={vrmMeta.description}
              onChange={(e) => setVRMMeta({ description: e.target.value })}
              className="studio-input resize-none h-20"
              placeholder="Describe your avatar..."
            />
          </div>
          <Select
            label="License"
            value={vrmMeta.license}
            options={LICENSE_OPTIONS}
            onChange={(v) => setVRMMeta({ license: v as VRMLicenseType })}
          />
          <Select
            label="Allowed Users"
            value={vrmMeta.allowedUser}
            options={ALLOWED_USER_OPTIONS}
            onChange={(v) =>
              setVRMMeta({ allowedUser: v as VRMAllowedUser })
            }
          />

          {/* Usage permissions */}
          <div className="flex flex-col gap-2 mt-2">
            <label className="text-xs font-medium text-studio-muted">
              Usage Permissions
            </label>
            <label className="flex items-center gap-2 text-xs text-studio-text cursor-pointer">
              <input
                type="checkbox"
                checked={vrmMeta.commercialUsage}
                onChange={(e) =>
                  setVRMMeta({ commercialUsage: e.target.checked })
                }
                className="rounded border-studio-border bg-studio-surface text-holo-500 focus:ring-holo-500"
              />
              Commercial usage
            </label>
            <label className="flex items-center gap-2 text-xs text-studio-text cursor-pointer">
              <input
                type="checkbox"
                checked={vrmMeta.violentUsage}
                onChange={(e) =>
                  setVRMMeta({ violentUsage: e.target.checked })
                }
                className="rounded border-studio-border bg-studio-surface text-holo-500 focus:ring-holo-500"
              />
              Violent content usage
            </label>
            <label className="flex items-center gap-2 text-xs text-studio-text cursor-pointer">
              <input
                type="checkbox"
                checked={vrmMeta.sexualUsage}
                onChange={(e) =>
                  setVRMMeta({ sexualUsage: e.target.checked })
                }
                className="rounded border-studio-border bg-studio-surface text-holo-500 focus:ring-holo-500"
              />
              Sexual content usage
            </label>
          </div>
        </div>
      </section>

      {/* Performance Estimate */}
      <section className="studio-panel p-3">
        <SectionHeader title="Performance Estimate" />
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-semibold text-studio-text">
              {blueprint.clothing.length + blueprint.accessories.length}
            </div>
            <div className="text-[10px] text-studio-muted">Items</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-studio-text">
              {blueprint.expressions.length}
            </div>
            <div className="text-[10px] text-studio-muted">Expressions</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-holo-400">
              {exportQuality === 'mobile' ? '~30K' : exportQuality === 'optimized' ? '~50K' : '~70K'}
            </div>
            <div className="text-[10px] text-studio-muted">Est. Polys</div>
          </div>
        </div>
      </section>

      {/* Export Buttons */}
      <section className="flex flex-col gap-2">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="studio-btn-primary w-full py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
        </button>
        <button
          onClick={handleSaveToCloud}
          disabled={isExporting}
          className="studio-btn-secondary w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save to Cloud
        </button>
      </section>
    </div>
  );
}
