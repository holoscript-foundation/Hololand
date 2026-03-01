/**
 * usePostProcessing Hook
 *
 * React hook that manages post-processing state for the Studio IDE viewport:
 *   1. Bloom, depth of field, motion blur, and color grading settings
 *   2. Real-time preview updates pushed to the Three.js render pipeline
 *   3. Preset management (apply, save, reset)
 *   4. HoloScript trait export serialization
 *   5. localStorage persistence of user settings
 *
 * @module studio/usePostProcessing
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  type PostProcessingSettings,
  type BloomSettings,
  type DepthOfFieldSettings,
  type MotionBlurSettings,
  type ColorGradingSettings,
  type PostProcessingPreset,
  DEFAULT_POST_PROCESSING,
  BUILT_IN_PRESETS,
} from './PostProcessingTypes';
import { exportPostProcessingToHoloScript } from './postProcessingExport';

// =============================================================================
// TYPES
// =============================================================================

export interface UsePostProcessingOptions {
  /** Initial settings (overrides defaults / persisted state) */
  initialSettings?: Partial<PostProcessingSettings>;
  /** Whether to persist settings to localStorage (default: true) */
  persist?: boolean;
  /** localStorage key (default: 'hololand-studio-postprocessing') */
  storageKey?: string;
  /** Called whenever any setting changes */
  onChange?: (settings: PostProcessingSettings) => void;
  /** Called when a preset is applied */
  onPresetApply?: (preset: PostProcessingPreset) => void;
  /** Called when settings are exported to HoloScript */
  onExport?: (source: string) => void;
}

export interface UsePostProcessingReturn {
  /** Current post-processing settings */
  settings: PostProcessingSettings;

  // ---- Per-effect updaters ----
  /** Update bloom settings (partial merge) */
  updateBloom: (partial: Partial<BloomSettings>) => void;
  /** Update depth of field settings (partial merge) */
  updateDepthOfField: (partial: Partial<DepthOfFieldSettings>) => void;
  /** Update motion blur settings (partial merge) */
  updateMotionBlur: (partial: Partial<MotionBlurSettings>) => void;
  /** Update color grading settings (partial merge) */
  updateColorGrading: (partial: Partial<ColorGradingSettings>) => void;

  // ---- Toggle shortcuts ----
  /** Toggle bloom on/off */
  toggleBloom: () => void;
  /** Toggle depth of field on/off */
  toggleDepthOfField: () => void;
  /** Toggle motion blur on/off */
  toggleMotionBlur: () => void;
  /** Toggle color grading on/off */
  toggleColorGrading: () => void;

  // ---- Presets ----
  /** Available presets (built-in + user-saved) */
  presets: PostProcessingPreset[];
  /** Currently active preset name (null if modified from preset) */
  activePreset: string | null;
  /** Apply a named preset */
  applyPreset: (name: string) => void;

  // ---- Actions ----
  /** Reset all settings to defaults */
  resetAll: () => void;
  /** Replace entire settings object */
  setSettings: (settings: PostProcessingSettings) => void;
  /** Export current settings as HoloScript trait source */
  exportToHoloScript: (traitName?: string) => string;
  /** Whether any effect is currently enabled */
  hasActiveEffects: boolean;
  /** Number of enabled effects */
  activeEffectCount: number;
}

// =============================================================================
// STORAGE HELPERS
// =============================================================================

const DEFAULT_STORAGE_KEY = 'hololand-studio-postprocessing';

function loadPersistedSettings(key: string): PostProcessingSettings | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Basic shape validation
    if (parsed && typeof parsed === 'object' && 'bloom' in parsed) {
      return parsed as PostProcessingSettings;
    }
  } catch {
    // Corrupted data -- ignore
  }
  return null;
}

function persistSettings(key: string, settings: PostProcessingSettings): void {
  try {
    localStorage.setItem(key, JSON.stringify(settings));
  } catch {
    // Storage full or unavailable -- silently ignore
  }
}

// =============================================================================
// DEEP MERGE HELPER
// =============================================================================

function mergeSettings(
  current: PostProcessingSettings,
  partial: Partial<PostProcessingSettings>,
): PostProcessingSettings {
  return {
    bloom: partial.bloom ? { ...current.bloom, ...partial.bloom } : current.bloom,
    depthOfField: partial.depthOfField
      ? { ...current.depthOfField, ...partial.depthOfField }
      : current.depthOfField,
    motionBlur: partial.motionBlur
      ? { ...current.motionBlur, ...partial.motionBlur }
      : current.motionBlur,
    colorGrading: partial.colorGrading
      ? { ...current.colorGrading, ...partial.colorGrading }
      : current.colorGrading,
  };
}

// =============================================================================
// HOOK
// =============================================================================

export function usePostProcessing(
  options: UsePostProcessingOptions = {},
): UsePostProcessingReturn {
  const {
    initialSettings,
    persist = true,
    storageKey = DEFAULT_STORAGE_KEY,
    onChange,
    onPresetApply,
    onExport,
  } = options;

  // -------------------------------------------------------------------------
  // Resolve initial state: explicit props > persisted > defaults
  // -------------------------------------------------------------------------

  const resolveInitial = (): PostProcessingSettings => {
    const base = { ...DEFAULT_POST_PROCESSING };
    if (persist) {
      const persisted = loadPersistedSettings(storageKey);
      if (persisted) return mergeSettings(base, persisted);
    }
    if (initialSettings) return mergeSettings(base, initialSettings);
    return base;
  };

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [settings, setSettingsRaw] = useState<PostProcessingSettings>(resolveInitial);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Stable callback refs
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onPresetApplyRef = useRef(onPresetApply);
  onPresetApplyRef.current = onPresetApply;
  const onExportRef = useRef(onExport);
  onExportRef.current = onExport;

  // -------------------------------------------------------------------------
  // Internal setter that persists + notifies
  // -------------------------------------------------------------------------

  const updateSettings = useCallback(
    (next: PostProcessingSettings) => {
      setSettingsRaw(next);
      setActivePreset(null); // Any manual change clears preset label
      if (persist) persistSettings(storageKey, next);
      onChangeRef.current?.(next);
    },
    [persist, storageKey],
  );

  // -------------------------------------------------------------------------
  // Per-effect updaters
  // -------------------------------------------------------------------------

  const updateBloom = useCallback(
    (partial: Partial<BloomSettings>) => {
      setSettingsRaw((prev) => {
        const next = { ...prev, bloom: { ...prev.bloom, ...partial } };
        setActivePreset(null);
        if (persist) persistSettings(storageKey, next);
        onChangeRef.current?.(next);
        return next;
      });
    },
    [persist, storageKey],
  );

  const updateDepthOfField = useCallback(
    (partial: Partial<DepthOfFieldSettings>) => {
      setSettingsRaw((prev) => {
        const next = { ...prev, depthOfField: { ...prev.depthOfField, ...partial } };
        setActivePreset(null);
        if (persist) persistSettings(storageKey, next);
        onChangeRef.current?.(next);
        return next;
      });
    },
    [persist, storageKey],
  );

  const updateMotionBlur = useCallback(
    (partial: Partial<MotionBlurSettings>) => {
      setSettingsRaw((prev) => {
        const next = { ...prev, motionBlur: { ...prev.motionBlur, ...partial } };
        setActivePreset(null);
        if (persist) persistSettings(storageKey, next);
        onChangeRef.current?.(next);
        return next;
      });
    },
    [persist, storageKey],
  );

  const updateColorGrading = useCallback(
    (partial: Partial<ColorGradingSettings>) => {
      setSettingsRaw((prev) => {
        const next = { ...prev, colorGrading: { ...prev.colorGrading, ...partial } };
        setActivePreset(null);
        if (persist) persistSettings(storageKey, next);
        onChangeRef.current?.(next);
        return next;
      });
    },
    [persist, storageKey],
  );

  // -------------------------------------------------------------------------
  // Toggle shortcuts
  // -------------------------------------------------------------------------

  const toggleBloom = useCallback(() => {
    updateBloom({ enabled: !settings.bloom.enabled });
  }, [settings.bloom.enabled, updateBloom]);

  const toggleDepthOfField = useCallback(() => {
    updateDepthOfField({ enabled: !settings.depthOfField.enabled });
  }, [settings.depthOfField.enabled, updateDepthOfField]);

  const toggleMotionBlur = useCallback(() => {
    updateMotionBlur({ enabled: !settings.motionBlur.enabled });
  }, [settings.motionBlur.enabled, updateMotionBlur]);

  const toggleColorGrading = useCallback(() => {
    updateColorGrading({ enabled: !settings.colorGrading.enabled });
  }, [settings.colorGrading.enabled, updateColorGrading]);

  // -------------------------------------------------------------------------
  // Preset management
  // -------------------------------------------------------------------------

  const presets = BUILT_IN_PRESETS;

  const applyPreset = useCallback(
    (name: string) => {
      const preset = presets.find((p) => p.name === name);
      if (!preset) return;

      const next: PostProcessingSettings = {
        bloom: { ...preset.settings.bloom },
        depthOfField: { ...preset.settings.depthOfField },
        motionBlur: { ...preset.settings.motionBlur },
        colorGrading: { ...preset.settings.colorGrading },
      };

      setSettingsRaw(next);
      setActivePreset(name);
      if (persist) persistSettings(storageKey, next);
      onChangeRef.current?.(next);
      onPresetApplyRef.current?.(preset);
    },
    [presets, persist, storageKey],
  );

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const resetAll = useCallback(() => {
    const defaults: PostProcessingSettings = {
      bloom: { ...DEFAULT_POST_PROCESSING.bloom },
      depthOfField: { ...DEFAULT_POST_PROCESSING.depthOfField },
      motionBlur: { ...DEFAULT_POST_PROCESSING.motionBlur },
      colorGrading: { ...DEFAULT_POST_PROCESSING.colorGrading },
    };
    setSettingsRaw(defaults);
    setActivePreset('None');
    if (persist) persistSettings(storageKey, defaults);
    onChangeRef.current?.(defaults);
  }, [persist, storageKey]);

  const setSettings = useCallback(
    (next: PostProcessingSettings) => {
      updateSettings(next);
    },
    [updateSettings],
  );

  const exportToHoloScript = useCallback(
    (traitName?: string): string => {
      const source = exportPostProcessingToHoloScript(settings, traitName);
      onExportRef.current?.(source);
      return source;
    },
    [settings],
  );

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const hasActiveEffects =
    settings.bloom.enabled ||
    settings.depthOfField.enabled ||
    settings.motionBlur.enabled ||
    settings.colorGrading.enabled;

  const activeEffectCount =
    (settings.bloom.enabled ? 1 : 0) +
    (settings.depthOfField.enabled ? 1 : 0) +
    (settings.motionBlur.enabled ? 1 : 0) +
    (settings.colorGrading.enabled ? 1 : 0);

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------

  return {
    settings,
    updateBloom,
    updateDepthOfField,
    updateMotionBlur,
    updateColorGrading,
    toggleBloom,
    toggleDepthOfField,
    toggleMotionBlur,
    toggleColorGrading,
    presets,
    activePreset,
    applyPreset,
    resetAll,
    setSettings,
    exportToHoloScript,
    hasActiveEffects,
    activeEffectCount,
  };
}
