/**
 * useQualityInspector Hook
 *
 * Custom React hook for managing quality inspector state and integration
 * with QualityProfileManager. Provides state management, preset persistence,
 * and real-time update callbacks.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { QualityProfileName } from '@hololand/quality-profiles';
import type {
  FireEffectParams,
  LODParams,
  GeometryParams,
  QualityPreset,
} from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface UseQualityInspectorOptions {
  /** Initial quality profile */
  initialProfile?: QualityProfileName;
  /** Enable localStorage persistence for presets */
  persistPresets?: boolean;
  /** Enable real-time preview updates */
  enablePreview?: boolean;
  /** Callback when profile changes */
  onProfileChange?: (profile: QualityProfileName) => void;
  /** Callback when LOD params change */
  onLODChange?: (params: LODParams) => void;
  /** Callback when geometry params change */
  onGeometryChange?: (params: GeometryParams) => void;
  /** Callback when fire effect params change */
  onFireEffectChange?: (params: FireEffectParams) => void;
}

export interface UseQualityInspectorReturn {
  /** Current quality profile */
  currentProfile: QualityProfileName;
  /** Set quality profile */
  setProfile: (profile: QualityProfileName) => void;
  /** Saved presets */
  presets: QualityPreset[];
  /** Save a new preset */
  savePreset: (preset: QualityPreset) => void;
  /** Load a preset */
  loadPreset: (preset: QualityPreset) => void;
  /** Delete a preset */
  deletePreset: (presetId: string) => void;
  /** Clear all presets */
  clearPresets: () => void;
  /** Export presets as JSON */
  exportPresets: () => string;
  /** Import presets from JSON */
  importPresets: (json: string) => boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'hololand:quality-inspector:presets';

// =============================================================================
// HOOK
// =============================================================================

export function useQualityInspector(
  options: UseQualityInspectorOptions = {}
): UseQualityInspectorReturn {
  const {
    initialProfile = 'industrial',
    persistPresets = true,
    enablePreview = true,
    onProfileChange,
    onLODChange,
    onGeometryChange,
    onFireEffectChange,
  } = options;

  // State
  const [currentProfile, setCurrentProfile] = useState<QualityProfileName>(initialProfile);
  const [presets, setPresets] = useState<QualityPreset[]>([]);

  // Refs for callbacks (to avoid re-running effects)
  const callbacksRef = useRef({ onProfileChange, onLODChange, onGeometryChange, onFireEffectChange });
  useEffect(() => {
    callbacksRef.current = { onProfileChange, onLODChange, onGeometryChange, onFireEffectChange };
  }, [onProfileChange, onLODChange, onGeometryChange, onFireEffectChange]);

  // Load presets from localStorage on mount
  useEffect(() => {
    if (!persistPresets) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as QualityPreset[];
        setPresets(parsed);
      }
    } catch (error) {
      console.error('Failed to load quality presets from localStorage:', error);
    }
  }, [persistPresets]);

  // Save presets to localStorage whenever they change
  useEffect(() => {
    if (!persistPresets) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    } catch (error) {
      console.error('Failed to save quality presets to localStorage:', error);
    }
  }, [presets, persistPresets]);

  // Set profile handler
  const setProfile = useCallback(
    (profile: QualityProfileName) => {
      setCurrentProfile(profile);
      callbacksRef.current.onProfileChange?.(profile);
    },
    []
  );

  // Save preset handler
  const savePreset = useCallback((preset: QualityPreset) => {
    setPresets((prev) => {
      // Check if preset with same ID exists (update) or add new
      const existingIndex = prev.findIndex((p) => p.id === preset.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = preset;
        return updated;
      }
      return [...prev, preset];
    });
  }, []);

  // Load preset handler
  const loadPreset = useCallback(
    (preset: QualityPreset) => {
      setCurrentProfile(preset.profile);
      callbacksRef.current.onProfileChange?.(preset.profile);
      callbacksRef.current.onLODChange?.(preset.lod);
      callbacksRef.current.onGeometryChange?.(preset.geometry);
      if (preset.fireEffect) {
        callbacksRef.current.onFireEffectChange?.(preset.fireEffect);
      }
    },
    []
  );

  // Delete preset handler
  const deletePreset = useCallback((presetId: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== presetId));
  }, []);

  // Clear all presets
  const clearPresets = useCallback(() => {
    setPresets([]);
  }, []);

  // Export presets as JSON
  const exportPresets = useCallback(() => {
    return JSON.stringify(presets, null, 2);
  }, [presets]);

  // Import presets from JSON
  const importPresets = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json) as QualityPreset[];

      // Validate structure
      if (!Array.isArray(parsed)) {
        console.error('Invalid presets JSON: not an array');
        return false;
      }

      // Basic validation of each preset
      const valid = parsed.every(
        (preset) =>
          preset.id &&
          preset.name &&
          preset.profile &&
          preset.lod &&
          preset.geometry &&
          typeof preset.createdAt === 'number'
      );

      if (!valid) {
        console.error('Invalid presets JSON: missing required fields');
        return false;
      }

      // Merge with existing presets (avoid duplicates by ID)
      setPresets((prev) => {
        const merged = [...prev];
        for (const preset of parsed) {
          const existingIndex = merged.findIndex((p) => p.id === preset.id);
          if (existingIndex >= 0) {
            merged[existingIndex] = preset;
          } else {
            merged.push(preset);
          }
        }
        return merged;
      });

      return true;
    } catch (error) {
      console.error('Failed to import presets:', error);
      return false;
    }
  }, []);

  return {
    currentProfile,
    setProfile,
    presets,
    savePreset,
    loadPreset,
    deletePreset,
    clearPresets,
    exportPresets,
    importPresets,
  };
}
