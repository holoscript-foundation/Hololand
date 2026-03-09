/**
 * useMaterialInspector.ts
 *
 * React hook for managing MaterialDef state within the MaterialInspector.
 * Provides controlled state, field-level updaters, preset loading,
 * and an onChange callback for external consumers.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  MaterialDef,
  MaterialType,
  BlendMode,
  CullMode,
} from './materialDefBridge';
import {
  createDefaultMaterialDef,
  MATERIAL_PRESETS,
  hexToRGBA,
  rgbaToHex,
} from './materialDefBridge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseMaterialInspectorOptions {
  /** Initial MaterialDef to load (if any). */
  initialMaterial?: MaterialDef;
  /** Called whenever any property changes. Receives the full updated def. */
  onChange?: (material: MaterialDef) => void;
  /** Debounce interval (ms) for onChange. Default: 16 (one frame at 60 Hz). */
  debounceMs?: number;
}

export interface MaterialInspectorState {
  /** The current MaterialDef. */
  material: MaterialDef;

  // --- Field updaters ---

  /** Set the material type classification. */
  setMaterialType: (type: MaterialType) => void;
  /** Set albedo from a hex color string. Alpha is preserved. */
  setAlbedoHex: (hex: string) => void;
  /** Set albedo alpha (opacity). 0-1. */
  setAlbedoAlpha: (a: number) => void;
  /** Set metallic value. 0-1. */
  setMetallic: (v: number) => void;
  /** Set roughness value. 0-1. */
  setRoughness: (v: number) => void;
  /** Set emission color from hex. */
  setEmissionHex: (hex: string) => void;
  /** Set emission strength. 0+. */
  setEmissionStrength: (v: number) => void;
  /** Set normal map scale. */
  setNormalScale: (v: number) => void;
  /** Set ambient occlusion strength. */
  setAoStrength: (v: number) => void;
  /** Set blend mode. */
  setBlendMode: (mode: BlendMode) => void;
  /** Set cull mode. */
  setCullMode: (mode: CullMode) => void;
  /** Toggle depth write. */
  setDepthWrite: (v: boolean) => void;
  /** Toggle depth test. */
  setDepthTest: (v: boolean) => void;
  /** Toggle double-sided rendering. */
  setDoubleSided: (v: boolean) => void;

  // --- Derived getters (hex strings for UI color inputs) ---

  /** Albedo as hex (#RRGGBB) for color picker. */
  albedoHex: string;
  /** Emission as hex (#RRGGBB) for color picker. */
  emissionHex: string;

  // --- Bulk operations ---

  /** Replace the entire material. */
  loadMaterial: (mat: MaterialDef) => void;
  /** Load a named preset from MATERIAL_PRESETS. */
  loadPreset: (presetKey: string) => void;
  /** Reset to factory defaults. */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMaterialInspector(
  options: UseMaterialInspectorOptions = {},
): MaterialInspectorState {
  const { initialMaterial, onChange, debounceMs = 16 } = options;

  const [material, setMaterial] = useState<MaterialDef>(
    () => initialMaterial ?? createDefaultMaterialDef('inspector', 'Untitled'),
  );

  // Debounced onChange notification
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const notify = useCallback(
    (mat: MaterialDef) => {
      if (!onChangeRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onChangeRef.current?.(mat);
      }, debounceMs);
    },
    [debounceMs],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Helper: update a subset of fields and notify
  const patch = useCallback(
    (updates: Partial<MaterialDef>) => {
      setMaterial((prev) => {
        const next = { ...prev, ...updates };
        notify(next);
        return next;
      });
    },
    [notify],
  );

  // ----- Field updaters -----

  const setMaterialType = useCallback(
    (type: MaterialType) => patch({ materialType: type }),
    [patch],
  );

  const setAlbedoHex = useCallback(
    (hex: string) => {
      setMaterial((prev) => {
        const rgb = hexToRGBA(hex);
        const next = {
          ...prev,
          albedo: { r: rgb.r, g: rgb.g, b: rgb.b, a: prev.albedo.a },
        };
        notify(next);
        return next;
      });
    },
    [notify],
  );

  const setAlbedoAlpha = useCallback(
    (a: number) => {
      setMaterial((prev) => {
        const clamped = Math.max(0, Math.min(1, a));
        const next = {
          ...prev,
          albedo: { ...prev.albedo, a: clamped },
          blendMode: (clamped < 1 ? 'transparent' : prev.blendMode) as BlendMode,
        };
        notify(next);
        return next;
      });
    },
    [notify],
  );

  const setMetallic = useCallback(
    (v: number) => patch({ metallic: Math.max(0, Math.min(1, v)) }),
    [patch],
  );

  const setRoughness = useCallback(
    (v: number) => patch({ roughness: Math.max(0, Math.min(1, v)) }),
    [patch],
  );

  const setEmissionHex = useCallback(
    (hex: string) => {
      const rgb = hexToRGBA(hex);
      patch({ emission: { r: rgb.r, g: rgb.g, b: rgb.b } });
    },
    [patch],
  );

  const setEmissionStrength = useCallback(
    (v: number) => patch({ emissionStrength: Math.max(0, v) }),
    [patch],
  );

  const setNormalScale = useCallback(
    (v: number) => patch({ normalScale: Math.max(0, v) }),
    [patch],
  );

  const setAoStrength = useCallback(
    (v: number) => patch({ aoStrength: Math.max(0, Math.min(1, v)) }),
    [patch],
  );

  const setBlendMode = useCallback(
    (mode: BlendMode) => patch({ blendMode: mode }),
    [patch],
  );

  const setCullMode = useCallback(
    (mode: CullMode) => patch({ cullMode: mode }),
    [patch],
  );

  const setDepthWrite = useCallback(
    (v: boolean) => patch({ depthWrite: v }),
    [patch],
  );

  const setDepthTest = useCallback(
    (v: boolean) => patch({ depthTest: v }),
    [patch],
  );

  const setDoubleSided = useCallback(
    (v: boolean) => patch({ doubleSided: v }),
    [patch],
  );

  // ----- Derived hex values -----

  const albedoHex = rgbaToHex(material.albedo);
  const emissionHex = rgbaToHex(material.emission);

  // ----- Bulk operations -----

  const loadMaterial = useCallback(
    (mat: MaterialDef) => {
      setMaterial(mat);
      notify(mat);
    },
    [notify],
  );

  const loadPreset = useCallback(
    (presetKey: string) => {
      const preset = MATERIAL_PRESETS[presetKey];
      if (!preset) return;
      const mat: MaterialDef = {
        ...createDefaultMaterialDef(`preset_${presetKey}`, preset.name, preset.materialType),
        ...preset,
        id: `preset_${presetKey}`,
        name: preset.name,
      };
      setMaterial(mat);
      notify(mat);
    },
    [notify],
  );

  const reset = useCallback(() => {
    const def = createDefaultMaterialDef('inspector', 'Untitled');
    setMaterial(def);
    notify(def);
  }, [notify]);

  return {
    material,
    setMaterialType,
    setAlbedoHex,
    setAlbedoAlpha,
    setMetallic,
    setRoughness,
    setEmissionHex,
    setEmissionStrength,
    setNormalScale,
    setAoStrength,
    setBlendMode,
    setCullMode,
    setDepthWrite,
    setDepthTest,
    setDoubleSided,
    albedoHex,
    emissionHex,
    loadMaterial,
    loadPreset,
    reset,
  };
}
