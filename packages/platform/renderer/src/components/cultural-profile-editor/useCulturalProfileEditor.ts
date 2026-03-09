/**
 * useCulturalProfileEditor Hook
 *
 * React state management hook for the Cultural Profile Editor.
 * Manages the agent's Schwartz value profile, cultural family selection,
 * cooperation index, and real-time compatibility computation against
 * other agent profiles.
 *
 * State Management:
 *   - Profile editing: Individual value sliders, family presets, cooperation
 *   - Comparison: Select another agent's profile for compatibility preview
 *   - Compatibility: Recomputed on every profile or comparison change (O(1))
 *   - Dirty tracking: Marks profile as modified when values diverge from saved
 *
 * Performance Contract:
 *   - Compatibility recomputation: O(1) -- 10-dim dot product, < 0.01ms
 *   - State updates: React batch mode, max 60Hz slider debounce
 *   - No async operations in the hot path (save is the only async action)
 *
 * @module cultural-profile-editor/useCulturalProfileEditor
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  CulturalProfile,
  CulturalProfileEditorState,
  CulturalProfileEditorActions,
  SchwartzValue,
  CulturalFamily,
  CompatibilityResult,
} from './types';
import {
  CULTURAL_FAMILY_PRESETS,
  computeCompatibility,
  createDefaultProfile,
  clampUnit,
} from './types';

// =============================================================================
// HOOK CONFIG
// =============================================================================

/**
 * Configuration for the useCulturalProfileEditor hook.
 */
export interface UseCulturalProfileEditorConfig {
  /** Agent ID for the profile being edited */
  agentId: string;
  /** Agent display name */
  agentName?: string;
  /** Initial profile (if restoring from saved state) */
  initialProfile?: CulturalProfile;
  /** Other agent profiles available for comparison */
  comparisonProfiles?: CulturalProfile[];
  /** Callback when profile is saved */
  onSave?: (profile: CulturalProfile) => void | Promise<void>;
  /** Callback when any value changes */
  onChange?: (profile: CulturalProfile) => void;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * React hook for managing Cultural Profile Editor state.
 *
 * @returns [state, actions] tuple matching the component pattern
 */
export function useCulturalProfileEditor(
  config?: UseCulturalProfileEditorConfig,
): [CulturalProfileEditorState, CulturalProfileEditorActions] {
  const agentId = config?.agentId ?? 'unknown-agent';
  const agentName = config?.agentName;

  // Initialize profile from config or create default
  const [profile, setProfile] = useState<CulturalProfile>(() => {
    if (config?.initialProfile) return { ...config.initialProfile };
    return createDefaultProfile(agentId, agentName);
  });

  // Saved profile reference for dirty tracking
  const [savedProfile, setSavedProfile] = useState<CulturalProfile>(() => {
    if (config?.initialProfile) return { ...config.initialProfile };
    return createDefaultProfile(agentId, agentName);
  });

  // Comparison profiles and selection
  const [comparisonProfiles, setComparisonProfiles] = useState<CulturalProfile[]>(
    () => config?.comparisonProfiles ?? [],
  );
  const [selectedComparisonId, setSelectedComparisonId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Compute dirty state by comparing current vs saved
  const isDirty = useMemo(() => {
    if (profile.culturalFamily !== savedProfile.culturalFamily) return true;
    if (profile.cooperationIndex !== savedProfile.cooperationIndex) return true;
    for (const key of Object.keys(profile.values) as SchwartzValue[]) {
      if (profile.values[key] !== savedProfile.values[key]) return true;
    }
    return false;
  }, [profile, savedProfile]);

  // Compute compatibility when a comparison profile is selected
  const compatibility = useMemo((): CompatibilityResult | null => {
    if (!selectedComparisonId) return null;
    const comparisonProfile = comparisonProfiles.find(
      (p) => p.agentId === selectedComparisonId,
    );
    if (!comparisonProfile) return null;
    return computeCompatibility(profile, comparisonProfile);
  }, [profile, selectedComparisonId, comparisonProfiles]);

  // Assemble state
  const state: CulturalProfileEditorState = useMemo(
    () => ({
      profile,
      comparisonProfiles,
      selectedComparisonId,
      compatibility,
      isDirty,
      isSaving,
      errors: {},
    }),
    [profile, comparisonProfiles, selectedComparisonId, compatibility, isDirty, isSaving],
  );

  // -- Actions --

  const setSchwartzValue = useCallback(
    (value: SchwartzValue, score: number) => {
      const clamped = clampUnit(score);
      setProfile((prev) => {
        const next: CulturalProfile = {
          ...prev,
          values: { ...prev.values, [value]: clamped },
          culturalFamily: 'custom',
          lastModified: Date.now(),
        };
        config?.onChange?.(next);
        return next;
      });
    },
    [config],
  );

  const setCooperationIndex = useCallback(
    (index: number) => {
      const clamped = clampUnit(index);
      setProfile((prev) => {
        const next: CulturalProfile = {
          ...prev,
          cooperationIndex: clamped,
          lastModified: Date.now(),
        };
        config?.onChange?.(next);
        return next;
      });
    },
    [config],
  );

  const selectCulturalFamily = useCallback(
    (family: CulturalFamily) => {
      const preset = CULTURAL_FAMILY_PRESETS[family];
      setProfile((prev) => {
        const next: CulturalProfile = {
          ...prev,
          culturalFamily: family,
          values: { ...preset.presetValues },
          cooperationIndex: preset.suggestedCooperationIndex,
          lastModified: Date.now(),
        };
        config?.onChange?.(next);
        return next;
      });
    },
    [config],
  );

  const selectComparison = useCallback((agentId: string | null) => {
    setSelectedComparisonId(agentId);
  }, []);

  const resetToFamilyDefaults = useCallback(() => {
    const preset = CULTURAL_FAMILY_PRESETS[profile.culturalFamily];
    setProfile((prev) => {
      const next: CulturalProfile = {
        ...prev,
        values: { ...preset.presetValues },
        cooperationIndex: preset.suggestedCooperationIndex,
        lastModified: Date.now(),
      };
      config?.onChange?.(next);
      return next;
    });
  }, [profile.culturalFamily, config]);

  const saveProfile = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await config?.onSave?.(profile);
      setSavedProfile({ ...profile });
    } finally {
      setIsSaving(false);
    }
  }, [profile, isSaving, config]);

  const updateComparisonProfiles = useCallback((profiles: CulturalProfile[]) => {
    setComparisonProfiles(profiles);
  }, []);

  // Assemble actions
  const actions: CulturalProfileEditorActions = useMemo(
    () => ({
      setSchwartzValue,
      setCooperationIndex,
      selectCulturalFamily,
      selectComparison,
      resetToFamilyDefaults,
      saveProfile,
      updateComparisonProfiles,
    }),
    [
      setSchwartzValue,
      setCooperationIndex,
      selectCulturalFamily,
      selectComparison,
      resetToFamilyDefaults,
      saveProfile,
      updateComparisonProfiles,
    ],
  );

  return [state, actions];
}
