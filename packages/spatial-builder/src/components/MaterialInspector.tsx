/**
 * MaterialInspector.tsx
 *
 * Slider-based PBR Material Inspector panel that edits a MaterialDef
 * from @holoscript/core. Exposes every numeric PBR property as a slider,
 * colors as native color pickers, and enums as dropdowns.
 *
 * Follows the same Tailwind / lucide-react patterns used by
 * PropertiesPanel and TraitInspectorLite in the spatial-builder package.
 *
 * Usage:
 *   <MaterialInspector
 *     initialMaterial={myMaterialDef}
 *     onChange={(updated) => scene.applyMaterial(updated)}
 *   />
 */

import React, { useState } from 'react';
import { Palette, X, RotateCcw, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import type { MaterialDef, BlendMode, CullMode, MaterialType } from './materialDefBridge';
import { MATERIAL_PRESETS, rgbaToHex } from './materialDefBridge';
import { useMaterialInspector } from './useMaterialInspector';

// =============================================================================
// PROPS
// =============================================================================

export interface MaterialInspectorProps {
  /** Initial material to edit. If omitted, uses factory defaults. */
  initialMaterial?: MaterialDef;
  /** Called whenever any property changes (debounced by ~16 ms). */
  onChange?: (material: MaterialDef) => void;
  /** Optional callback when the panel is closed. */
  onClose?: () => void;
  /** Optional CSS class for the root container. */
  className?: string;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** Slider with label and live numeric readout. */
function InspectorSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  decimals = 2,
  accentClass = 'accent-indigo-500',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  accentClass?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/40 uppercase font-semibold w-24 shrink-0">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`flex-1 h-1 ${accentClass}`}
      />
      <span className="text-[10px] text-white/30 font-mono w-12 text-right shrink-0">
        {value.toFixed(decimals)}
      </span>
    </div>
  );
}

/** Color picker with label and hex readout. */
function InspectorColor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
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

/** Dropdown select. */
function InspectorSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/40 uppercase font-semibold w-24 shrink-0">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="flex-1 bg-neutral-800 text-white/80 text-xs px-2 py-1 rounded border border-white/10 outline-none focus:border-indigo-400 transition-colors"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Boolean toggle matching PropertiesPanel's ToggleField. */
function InspectorToggle({
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

/** Collapsible section with a disclosure triangle. */
function InspectorSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 w-full text-left"
      >
        {open ? (
          <ChevronDown size={12} className="text-white/30" />
        ) : (
          <ChevronRight size={12} className="text-white/30" />
        )}
        <span className="text-[10px] text-white/30 uppercase tracking-wider font-bold">
          {title}
        </span>
      </button>
      {open && <div className="space-y-2 pl-3">{children}</div>}
    </div>
  );
}

// =============================================================================
// OPTION DEFINITIONS
// =============================================================================

const MATERIAL_TYPE_OPTIONS: { value: MaterialType; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'physical', label: 'Physical' },
  { value: 'metal', label: 'Metal' },
  { value: 'glass', label: 'Glass' },
  { value: 'emissive', label: 'Emissive' },
  { value: 'toon', label: 'Toon' },
  { value: 'basic', label: 'Basic' },
];

const BLEND_MODE_OPTIONS: { value: BlendMode; label: string }[] = [
  { value: 'opaque', label: 'Opaque' },
  { value: 'transparent', label: 'Transparent' },
  { value: 'additive', label: 'Additive' },
  { value: 'multiply', label: 'Multiply' },
];

const CULL_MODE_OPTIONS: { value: CullMode; label: string }[] = [
  { value: 'back', label: 'Back' },
  { value: 'front', label: 'Front' },
  { value: 'none', label: 'None' },
];

// =============================================================================
// MATERIAL INSPECTOR
// =============================================================================

/**
 * MaterialInspector
 *
 * Full slider-based PBR material editor backed by MaterialDef.
 * Organizes controls into collapsible sections:
 *   1. Surface  - albedo color/opacity, material type
 *   2. PBR      - metallic, roughness
 *   3. Emission - emission color + strength
 *   4. Detail   - normal scale, AO strength
 *   5. Rendering- blend mode, cull mode, depth flags, double-sided
 *   6. Presets  - one-click preset picker
 */
export const MaterialInspector: React.FC<MaterialInspectorProps> = ({
  initialMaterial,
  onChange,
  onClose,
  className,
}) => {
  const inspector = useMaterialInspector({ initialMaterial, onChange });
  const { material } = inspector;

  const [presetsOpen, setPresetsOpen] = useState(false);

  return (
    <div
      className={`flex flex-col bg-neutral-900/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden ${className ?? ''}`}
      style={{ width: '300px' }}
    >
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2 text-white/90 font-medium">
          <Palette size={14} className="text-indigo-400" />
          <span className="text-xs tracking-wide uppercase">Material Inspector</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={inspector.reset}
            title="Reset to defaults"
            className="text-white/30 hover:text-white/70 transition-colors p-1"
          >
            <RotateCcw size={12} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/30 hover:text-white/70 transition-colors p-1"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ---- Scrollable body ---- */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Material name + ID */}
        <div className="space-y-0.5">
          <div className="text-xs text-white/80 font-medium">{material.name}</div>
          <div className="text-[10px] text-white/25 font-mono">{material.id}</div>
        </div>

        {/* -------- SURFACE -------- */}
        <InspectorSection title="Surface">
          <InspectorSelect
            label="Type"
            value={material.materialType ?? 'standard'}
            options={MATERIAL_TYPE_OPTIONS}
            onChange={inspector.setMaterialType}
          />
          <InspectorColor
            label="Albedo"
            value={inspector.albedoHex}
            onChange={inspector.setAlbedoHex}
          />
          <InspectorSlider
            label="Opacity"
            value={material.albedo.a}
            onChange={inspector.setAlbedoAlpha}
            min={0}
            max={1}
            step={0.01}
          />
        </InspectorSection>

        {/* -------- PBR -------- */}
        <InspectorSection title="PBR">
          <InspectorSlider
            label="Metallic"
            value={material.metallic}
            onChange={inspector.setMetallic}
            accentClass="accent-sky-500"
          />
          <InspectorSlider
            label="Roughness"
            value={material.roughness}
            onChange={inspector.setRoughness}
            accentClass="accent-amber-500"
          />
        </InspectorSection>

        {/* -------- EMISSION -------- */}
        <InspectorSection title="Emission" defaultOpen={material.emissionStrength > 0}>
          <InspectorColor
            label="Color"
            value={inspector.emissionHex}
            onChange={inspector.setEmissionHex}
          />
          <InspectorSlider
            label="Strength"
            value={material.emissionStrength}
            onChange={inspector.setEmissionStrength}
            min={0}
            max={10}
            step={0.1}
            decimals={1}
            accentClass="accent-emerald-500"
          />
        </InspectorSection>

        {/* -------- DETAIL -------- */}
        <InspectorSection title="Detail" defaultOpen={false}>
          <InspectorSlider
            label="Normal Scale"
            value={material.normalScale}
            onChange={inspector.setNormalScale}
            min={0}
            max={2}
            step={0.01}
          />
          <InspectorSlider
            label="AO Strength"
            value={material.aoStrength}
            onChange={inspector.setAoStrength}
          />
        </InspectorSection>

        {/* -------- RENDERING -------- */}
        <InspectorSection title="Rendering" defaultOpen={false}>
          <InspectorSelect
            label="Blend Mode"
            value={material.blendMode}
            options={BLEND_MODE_OPTIONS}
            onChange={inspector.setBlendMode}
          />
          <InspectorSelect
            label="Cull Mode"
            value={material.cullMode}
            options={CULL_MODE_OPTIONS}
            onChange={inspector.setCullMode}
          />
          <InspectorToggle
            label="Depth Write"
            value={material.depthWrite}
            onChange={inspector.setDepthWrite}
          />
          <InspectorToggle
            label="Depth Test"
            value={material.depthTest}
            onChange={inspector.setDepthTest}
          />
          <InspectorToggle
            label="Double-Sided"
            value={material.doubleSided}
            onChange={inspector.setDoubleSided}
          />
        </InspectorSection>

        {/* -------- PRESETS -------- */}
        <div className="space-y-2">
          <button
            onClick={() => setPresetsOpen(!presetsOpen)}
            className="flex items-center gap-1 w-full text-left"
          >
            {presetsOpen ? (
              <ChevronDown size={12} className="text-white/30" />
            ) : (
              <ChevronRight size={12} className="text-white/30" />
            )}
            <Layers size={10} className="text-white/30" />
            <span className="text-[10px] text-white/30 uppercase tracking-wider font-bold">
              Presets
            </span>
          </button>
          {presetsOpen && (
            <div className="grid grid-cols-3 gap-1.5 pl-3">
              {Object.entries(MATERIAL_PRESETS).map(([key, preset]) => {
                const previewHex = preset.albedo ? rgbaToHex(preset.albedo) : '#808080';
                return (
                  <button
                    key={key}
                    onClick={() => inspector.loadPreset(key)}
                    className="flex flex-col items-center gap-1 p-1.5 rounded-md bg-neutral-800/60 border border-white/5 hover:border-indigo-400/40 hover:bg-indigo-500/10 transition-all"
                    title={preset.name}
                  >
                    <div
                      className="w-full aspect-square rounded-sm border border-white/10"
                      style={{ background: previewHex }}
                    />
                    <span className="text-[9px] text-white/40 leading-tight truncate w-full text-center">
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ---- Footer status bar ---- */}
      <div className="px-3 py-1.5 bg-white/5 border-t border-white/10 flex items-center justify-between">
        <span className="text-[9px] text-white/20 font-mono">
          {material.materialType ?? 'standard'} | {material.blendMode}
        </span>
        <span className="text-[9px] text-white/20 font-mono">
          M:{material.metallic.toFixed(2)} R:{material.roughness.toFixed(2)}
        </span>
      </div>
    </div>
  );
};

// Re-export types and utilities for convenience
export type { MaterialDef, MaterialType, BlendMode, CullMode } from './materialDefBridge';
export {
  createDefaultMaterialDef,
  MATERIAL_PRESETS,
  sceneMaterialToMaterialDef,
  materialDefToSceneMaterial,
  hexToRGBA,
  rgbaToHex,
} from './materialDefBridge';
export { useMaterialInspector } from './useMaterialInspector';
export type { UseMaterialInspectorOptions, MaterialInspectorState } from './useMaterialInspector';
