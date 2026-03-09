/**
 * Cultural Profile Editor Component Library
 *
 * Schwartz value-based cultural identity editor for HoloLand agents.
 * Provides 10 value dimension sliders (self-direction, stimulation, hedonism,
 * achievement, power, security, conformity, tradition, benevolence, universalism),
 * cultural family presets, cooperation index configuration, and real-time
 * compatibility preview against other agent profiles.
 *
 * Designed for Layer 6 holographic transparency with WCAG 2.1 AA compliance.
 *
 * @example
 * ```tsx
 * import {
 *   CulturalProfileEditor,
 *   useCulturalProfileEditor,
 * } from '@hololand/renderer/components/cultural-profile-editor';
 *
 * function MyProfileEditor() {
 *   const [state, actions] = useCulturalProfileEditor({
 *     agentId: 'agent-001',
 *     agentName: 'Explorer',
 *     onSave: async (profile) => {
 *       await api.saveCulturalProfile(profile);
 *     },
 *   });
 *
 *   return (
 *     <CulturalProfileEditor
 *       externalState={state}
 *       externalActions={actions}
 *     />
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With comparison profiles for compatibility preview
 * const [state, actions] = useCulturalProfileEditor({
 *   agentId: 'agent-001',
 *   comparisonProfiles: otherAgentProfiles,
 * });
 *
 * <CulturalProfileEditor
 *   externalState={state}
 *   externalActions={actions}
 *   showCompatibilityPreview={true}
 * />
 * ```
 *
 * @module cultural-profile-editor
 */

// Main component
export {
  CulturalProfileEditor,
  type CulturalProfileEditorProps,
} from './CulturalProfileEditor';

// Hook
export {
  useCulturalProfileEditor,
  type UseCulturalProfileEditorConfig,
} from './useCulturalProfileEditor';

// Types
export type {
  SchwartzValue,
  SchwartzCategory,
  SchwartzValueMeta,
  SchwartzCategoryMeta,
  CulturalFamily,
  CulturalFamilyMeta,
  CulturalProfile,
  CompatibilityResult,
  CompatibilityLevel,
  CulturalProfileEditorState,
  CulturalProfileEditorActions,
  CulturalProfileEditorTheme,
} from './types';

export {
  ALL_SCHWARTZ_VALUES,
  SCHWARTZ_VALUE_CONFIG,
  SCHWARTZ_CATEGORY_CONFIG,
  ALL_CULTURAL_FAMILIES,
  CULTURAL_FAMILY_PRESETS,
  DEFAULT_CULTURAL_PROFILE_EDITOR_THEME,
  computeCosineSimilarity,
  computeCompatibility,
  scoreToCompatibilityLevel,
  getCompatibilityColor,
  getCompatibilityLabel,
  createDefaultProfile,
  clampUnit,
  formatPercent,
  applyOverlayOpacity,
} from './types';
