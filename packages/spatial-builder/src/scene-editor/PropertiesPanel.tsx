/**
 * @hololand/spatial-builder - PropertiesPanel
 *
 * Inspector panel for the selected scene object.
 * Shows and edits:
 *   - Transform (position, rotation, scale)
 *   - Material (color, metalness, roughness, emissive, etc.)
 *   - Light properties (color, intensity, distance, etc.)
 */

import React, { useCallback } from 'react';
import { Move, RotateCw, Maximize2, Palette, Lightbulb } from 'lucide-react';
import type { SceneObject, Vec3, EulerRotation, SceneMaterial, SceneLightProps } from './types';
import type { SceneEditorAPI } from './useSceneEditor';

export interface PropertiesPanelProps {
  editor: SceneEditorAPI;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** Numeric input with label */
function NumericField({
  label,
  value,
  onChange,
  step = 0.1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-white/40 w-3 text-center uppercase font-bold">
        {label}
      </span>
      <input
        type="number"
        value={parseFloat(value.toFixed(3))}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        max={max}
        className="w-full bg-neutral-800 text-white/80 text-xs px-1.5 py-1 rounded border border-white/10 outline-none focus:border-indigo-400 transition-colors"
      />
    </div>
  );
}

/** Vec3 editor row */
function Vec3Editor({
  label,
  icon: Icon,
  value,
  onChange,
  step = 0.1,
}: {
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
  value: Vec3;
  onChange: (v: Vec3) => void;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-white/50">
        <Icon size={12} />
        <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        <NumericField label="X" value={value.x} onChange={(v) => onChange({ ...value, x: v })} step={step} />
        <NumericField label="Y" value={value.y} onChange={(v) => onChange({ ...value, y: v })} step={step} />
        <NumericField label="Z" value={value.z} onChange={(v) => onChange({ ...value, z: v })} step={step} />
      </div>
    </div>
  );
}

/** Color picker field */
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/40 uppercase font-semibold flex-1">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
      />
      <span className="text-[10px] text-white/30 font-mono w-14">{value}</span>
    </div>
  );
}

/** Slider field */
function SliderField({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/40 uppercase font-semibold w-20">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-indigo-500 h-1"
      />
      <span className="text-[10px] text-white/30 font-mono w-10 text-right">
        {value.toFixed(2)}
      </span>
    </div>
  );
}

/** Boolean toggle */
function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/40 uppercase font-semibold flex-1">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`
          w-8 h-4 rounded-full transition-colors relative
          ${value ? 'bg-indigo-500' : 'bg-neutral-700'}
        `}
      >
        <div
          className={`
            w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform
            ${value ? 'translate-x-4' : 'translate-x-0.5'}
          `}
        />
      </button>
    </div>
  );
}

/** Section divider */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-white/30 uppercase tracking-wider font-bold border-b border-white/5 pb-1">
        {title}
      </div>
      {children}
    </div>
  );
}

// =============================================================================
// MAIN PANEL
// =============================================================================

/**
 * PropertiesPanel
 *
 * Displays and edits properties of the currently selected scene object.
 * Shows "No selection" placeholder when nothing is selected.
 */
export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ editor }) => {
  const { selectedObject } = editor;

  const handlePositionChange = useCallback(
    (position: Vec3) => {
      if (!selectedObject) return;
      editor.updateTransform(selectedObject.id, { position });
    },
    [editor, selectedObject]
  );

  const handleRotationChange = useCallback(
    (rotation: EulerRotation) => {
      if (!selectedObject) return;
      editor.updateTransform(selectedObject.id, { rotation });
    },
    [editor, selectedObject]
  );

  const handleScaleChange = useCallback(
    (scale: Vec3) => {
      if (!selectedObject) return;
      editor.updateTransform(selectedObject.id, { scale });
    },
    [editor, selectedObject]
  );

  const handleMaterialChange = useCallback(
    (updates: Partial<SceneMaterial>) => {
      if (!selectedObject) return;
      editor.updateMaterial(selectedObject.id, updates);
    },
    [editor, selectedObject]
  );

  const handleLightChange = useCallback(
    (updates: Partial<SceneLightProps>) => {
      if (!selectedObject) return;
      editor.updateLight(selectedObject.id, updates);
    },
    [editor, selectedObject]
  );

  return (
    <div className="flex flex-col h-full bg-neutral-900/95 border-l border-white/10">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 bg-white/5">
        <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
          Properties
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {!selectedObject ? (
          <div className="text-center text-white/25 text-xs py-12">
            Select an object to view its properties.
          </div>
        ) : (
          <>
            {/* Object info */}
            <div className="space-y-1">
              <div className="text-xs text-white/80 font-medium">{selectedObject.name}</div>
              <div className="text-[10px] text-white/30">
                {selectedObject.kind === 'light'
                  ? `${selectedObject.lightProps?.lightType} light`
                  : selectedObject.primitiveType ?? 'object'}
                {' | ID: '}
                <span className="font-mono">{selectedObject.id.slice(0, 12)}</span>
              </div>
            </div>

            {/* Transform */}
            <Section title="Transform">
              <Vec3Editor
                label="Position"
                icon={Move}
                value={selectedObject.position}
                onChange={handlePositionChange}
                step={0.1}
              />
              <Vec3Editor
                label="Rotation"
                icon={RotateCw}
                value={selectedObject.rotation}
                onChange={handleRotationChange}
                step={1}
              />
              {selectedObject.kind !== 'light' && (
                <Vec3Editor
                  label="Scale"
                  icon={Maximize2}
                  value={selectedObject.scale}
                  onChange={handleScaleChange}
                  step={0.1}
                />
              )}
            </Section>

            {/* Material (only for primitives) */}
            {selectedObject.kind === 'primitive' && (
              <Section title="Material">
                <ColorField
                  label="Color"
                  value={selectedObject.material.color}
                  onChange={(color) => handleMaterialChange({ color })}
                />
                <SliderField
                  label="Metalness"
                  value={selectedObject.material.metalness}
                  onChange={(metalness) => handleMaterialChange({ metalness })}
                />
                <SliderField
                  label="Roughness"
                  value={selectedObject.material.roughness}
                  onChange={(roughness) => handleMaterialChange({ roughness })}
                />
                <ColorField
                  label="Emissive"
                  value={selectedObject.material.emissive}
                  onChange={(emissive) => handleMaterialChange({ emissive })}
                />
                <SliderField
                  label="Emissive Int."
                  value={selectedObject.material.emissiveIntensity}
                  onChange={(emissiveIntensity) => handleMaterialChange({ emissiveIntensity })}
                  max={5}
                  step={0.1}
                />
                <SliderField
                  label="Opacity"
                  value={selectedObject.material.opacity}
                  onChange={(opacity) => handleMaterialChange({ opacity })}
                />
                <ToggleField
                  label="Wireframe"
                  value={selectedObject.material.wireframe}
                  onChange={(wireframe) => handleMaterialChange({ wireframe })}
                />
              </Section>
            )}

            {/* Light properties (only for lights) */}
            {selectedObject.kind === 'light' && selectedObject.lightProps && (
              <Section title="Light">
                <ColorField
                  label="Color"
                  value={selectedObject.lightProps.color}
                  onChange={(color) => handleLightChange({ color })}
                />
                <SliderField
                  label="Intensity"
                  value={selectedObject.lightProps.intensity}
                  onChange={(intensity) => handleLightChange({ intensity })}
                  max={20}
                  step={0.1}
                />
                {selectedObject.lightProps.lightType !== 'ambient' && (
                  <>
                    <SliderField
                      label="Distance"
                      value={selectedObject.lightProps.distance ?? 0}
                      onChange={(distance) => handleLightChange({ distance })}
                      max={100}
                      step={1}
                    />
                    <ToggleField
                      label="Cast Shadow"
                      value={selectedObject.lightProps.castShadow}
                      onChange={(castShadow) => handleLightChange({ castShadow })}
                    />
                  </>
                )}
                {selectedObject.lightProps.lightType === 'spot' && (
                  <>
                    <SliderField
                      label="Angle"
                      value={selectedObject.lightProps.angle ?? Math.PI / 6}
                      onChange={(angle) => handleLightChange({ angle })}
                      max={Math.PI / 2}
                      step={0.01}
                    />
                    <SliderField
                      label="Penumbra"
                      value={selectedObject.lightProps.penumbra ?? 0.5}
                      onChange={(penumbra) => handleLightChange({ penumbra })}
                    />
                  </>
                )}
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
};
