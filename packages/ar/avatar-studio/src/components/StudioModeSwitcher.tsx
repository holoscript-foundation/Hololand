/**
 * Studio Mode Switcher Component
 *
 * A tabbed navigation component that switches between the different
 * modes/views of the Avatar Studio. Each mode corresponds to a different
 * aspect of avatar customization.
 *
 * Modes include the original StudioTab values from the type system
 * (body, face, hair, clothing, accessories, expressions, export)
 * plus the newly added "scenarios" mode which renders the ScenarioGallery.
 *
 * This component follows the tab-switching pattern established by the
 * TraitEditor in @hololand/creator-tools (properties/code/preview tabs)
 * and the VisualEditor's EditorMode pattern.
 *
 * ## Usage
 *
 * ```tsx
 * import { StudioModeSwitcher } from '@hololand/avatar-studio';
 *
 * function AvatarEditorUI() {
 *   return (
 *     <StudioModeSwitcher
 *       scenarios={myScenarios}
 *       onModeChange={(mode) => console.log('Switched to', mode)}
 *       onScenarioApply={(scenario) => studio.applyScenario(scenario)}
 *     >
 *       {(activeMode) => (
 *         <>
 *           {activeMode === 'body' && <BodyEditor />}
 *           {activeMode === 'face' && <FaceEditor />}
 *           {// scenarios mode is handled internally by StudioModeSwitcher}
 *         </>
 *       )}
 *     </StudioModeSwitcher>
 *   );
 * }
 * ```
 */

import React, { useState, useCallback, useMemo } from 'react';
import { ScenarioGallery } from './ScenarioGallery';
import type { AvatarScenario } from './ScenarioGallery';
import type { StudioTab } from '../types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Extended studio mode that includes the original StudioTab values
 * plus the new 'scenarios' mode.
 */
export type StudioMode = StudioTab | 'scenarios';

/** Configuration for a single mode tab */
export interface StudioModeConfig {
  /** The mode identifier */
  id: StudioMode;
  /** Display label */
  label: string;
  /** Short description shown on hover */
  description: string;
  /** Whether this tab is enabled */
  enabled: boolean;
  /** Optional badge text (e.g., "NEW", count) */
  badge?: string;
}

export interface StudioModeSwitcherProps {
  /** The currently active mode */
  activeMode?: StudioMode;
  /** Default mode to show on mount */
  defaultMode?: StudioMode;
  /** Callback when the mode changes */
  onModeChange?: (mode: StudioMode) => void;
  /** Scenarios to display in the ScenarioGallery */
  scenarios?: AvatarScenario[];
  /** Callback when a scenario is previewed */
  onScenarioPreview?: (scenario: AvatarScenario) => void;
  /** Callback when a scenario is applied */
  onScenarioApply?: (scenario: AvatarScenario) => void;
  /** Currently active scenario ID */
  activeScenarioId?: string;
  /** Whether scenarios are loading */
  scenariosLoading?: boolean;
  /** Override the default mode configurations */
  modeConfigs?: Partial<Record<StudioMode, Partial<StudioModeConfig>>>;
  /** Modes to hide from the tab bar */
  hiddenModes?: StudioMode[];
  /** Render prop for mode content (modes other than 'scenarios') */
  children?: (activeMode: StudioMode) => React.ReactNode;
  /** Custom CSS class name */
  className?: string;
  /** Orientation of the tab bar */
  orientation?: 'horizontal' | 'vertical';
  /** Whether to show mode descriptions below the tabs */
  showDescriptions?: boolean;
}

// =============================================================================
// DEFAULT MODE CONFIGURATIONS
// =============================================================================

const DEFAULT_MODE_CONFIGS: Record<StudioMode, StudioModeConfig> = {
  body: {
    id: 'body',
    label: 'Body',
    description: 'Adjust body proportions, skin color, and build',
    enabled: true,
  },
  face: {
    id: 'face',
    label: 'Face',
    description: 'Customize facial features, eyes, nose, and mouth',
    enabled: true,
  },
  hair: {
    id: 'hair',
    label: 'Hair',
    description: 'Choose hairstyle, color, and physics settings',
    enabled: true,
  },
  clothing: {
    id: 'clothing',
    label: 'Clothing',
    description: 'Equip and customize clothing items',
    enabled: true,
  },
  accessories: {
    id: 'accessories',
    label: 'Accessories',
    description: 'Add hats, glasses, jewelry, and more',
    enabled: true,
  },
  expressions: {
    id: 'expressions',
    label: 'Expressions',
    description: 'Configure facial expressions and blend shapes',
    enabled: true,
  },
  scenarios: {
    id: 'scenarios',
    label: 'Scenarios',
    description: 'Apply pre-configured looks and environments',
    enabled: true,
    badge: 'NEW',
  },
  export: {
    id: 'export',
    label: 'Export',
    description: 'Export avatar to VRM or other formats',
    enabled: true,
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export const StudioModeSwitcher: React.FC<StudioModeSwitcherProps> = ({
  activeMode: controlledActiveMode,
  defaultMode = 'body',
  onModeChange,
  scenarios = [],
  onScenarioPreview,
  onScenarioApply,
  activeScenarioId,
  scenariosLoading = false,
  modeConfigs: modeConfigOverrides,
  hiddenModes = [],
  children,
  className,
  orientation = 'horizontal',
  showDescriptions = false,
}) => {
  // Support both controlled and uncontrolled usage
  const [internalMode, setInternalMode] = useState<StudioMode>(defaultMode);
  const activeMode = controlledActiveMode ?? internalMode;

  // Merge default configs with overrides
  const modeConfigs = useMemo(() => {
    const configs = { ...DEFAULT_MODE_CONFIGS };
    if (modeConfigOverrides) {
      for (const [key, overrides] of Object.entries(modeConfigOverrides)) {
        const modeKey = key as StudioMode;
        if (configs[modeKey] && overrides) {
          configs[modeKey] = { ...configs[modeKey], ...overrides };
        }
      }
    }
    return configs;
  }, [modeConfigOverrides]);

  // Filter out hidden modes and get ordered list
  const visibleModes = useMemo(() => {
    const modeOrder: StudioMode[] = [
      'body',
      'face',
      'hair',
      'clothing',
      'accessories',
      'expressions',
      'scenarios',
      'export',
    ];
    return modeOrder.filter(
      (mode) => !hiddenModes.includes(mode) && modeConfigs[mode]?.enabled !== false
    );
  }, [hiddenModes, modeConfigs]);

  const handleModeChange = useCallback(
    (mode: StudioMode) => {
      setInternalMode(mode);
      onModeChange?.(mode);
    },
    [onModeChange]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, currentIndex: number) => {
      let nextIndex: number;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          nextIndex = (currentIndex + 1) % visibleModes.length;
          handleModeChange(visibleModes[nextIndex]);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          nextIndex = (currentIndex - 1 + visibleModes.length) % visibleModes.length;
          handleModeChange(visibleModes[nextIndex]);
          break;
        case 'Home':
          event.preventDefault();
          handleModeChange(visibleModes[0]);
          break;
        case 'End':
          event.preventDefault();
          handleModeChange(visibleModes[visibleModes.length - 1]);
          break;
      }
    },
    [visibleModes, handleModeChange]
  );

  const isVertical = orientation === 'vertical';

  return (
    <div
      className={className}
      style={{
        ...styles.container,
        ...(isVertical ? styles.containerVertical : {}),
      }}
    >
      {/* Tab Bar */}
      <div
        role="tablist"
        aria-label="Avatar studio modes"
        aria-orientation={orientation}
        style={{
          ...styles.tabBar,
          ...(isVertical ? styles.tabBarVertical : {}),
        }}
      >
        {visibleModes.map((mode, index) => {
          const config = modeConfigs[mode];
          const isActive = activeMode === mode;

          return (
            <button
              key={mode}
              role="tab"
              id={`studio-tab-${mode}`}
              aria-selected={isActive}
              aria-controls={`studio-panel-${mode}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleModeChange(mode)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              title={config.description}
              style={{
                ...styles.tab,
                ...(isVertical ? styles.tabVertical : {}),
                ...(isActive ? styles.tabActive : {}),
                ...(isActive && isVertical ? styles.tabActiveVertical : {}),
                ...(!config.enabled ? styles.tabDisabled : {}),
              }}
              disabled={!config.enabled}
            >
              <span style={styles.tabLabel}>{config.label}</span>
              {config.badge && <span style={styles.tabBadge}>{config.badge}</span>}
            </button>
          );
        })}
      </div>

      {/* Active Mode Description */}
      {showDescriptions && (
        <div style={styles.modeDescription}>
          <p style={styles.modeDescriptionText}>{modeConfigs[activeMode]?.description}</p>
        </div>
      )}

      {/* Content Panel */}
      <div
        role="tabpanel"
        id={`studio-panel-${activeMode}`}
        aria-labelledby={`studio-tab-${activeMode}`}
        style={styles.contentPanel}
      >
        {activeMode === 'scenarios' ? (
          <ScenarioGallery
            scenarios={scenarios}
            onPreview={onScenarioPreview}
            onApply={onScenarioApply}
            activeScenarioId={activeScenarioId}
            isLoading={scenariosLoading}
          />
        ) : (
          children?.(activeMode)
        )}
      </div>
    </div>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  // Container
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#ffffff',
  },
  containerVertical: {
    flexDirection: 'row',
  },

  // Tab Bar
  tabBar: {
    display: 'flex',
    borderBottom: '2px solid #e0e0e0',
    backgroundColor: '#fafafa',
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollbarWidth: 'thin' as any,
    flexShrink: 0,
  },
  tabBarVertical: {
    flexDirection: 'column',
    borderBottom: 'none',
    borderRight: '2px solid #e0e0e0',
    width: '180px',
    minWidth: '180px',
    overflowX: 'hidden',
    overflowY: 'auto',
  },

  // Tab
  tab: {
    flex: '0 0 auto',
    padding: '0.75rem 1rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
    color: '#666',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    whiteSpace: 'nowrap',
    marginBottom: '-2px',
  },
  tabVertical: {
    borderBottom: 'none',
    borderRight: '3px solid transparent',
    marginBottom: 0,
    marginRight: '-2px',
    justifyContent: 'flex-start',
    padding: '0.75rem 1.25rem',
  },
  tabActive: {
    color: '#2196f3',
    borderBottomColor: '#2196f3',
    backgroundColor: 'white',
  },
  tabActiveVertical: {
    borderBottomColor: 'transparent',
    borderRightColor: '#2196f3',
  },
  tabDisabled: {
    color: '#ccc',
    cursor: 'not-allowed',
  },

  // Tab label and badge
  tabLabel: {
    lineHeight: 1,
  },
  tabBadge: {
    padding: '0.1rem 0.35rem',
    backgroundColor: '#2196f3',
    color: 'white',
    borderRadius: '3px',
    fontSize: '0.6rem',
    fontWeight: 'bold',
    lineHeight: 1,
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },

  // Mode description
  modeDescription: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f5f5f5',
    borderBottom: '1px solid #eee',
  },
  modeDescriptionText: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#888',
    fontStyle: 'italic',
  },

  // Content Panel
  contentPanel: {
    flex: 1,
    overflow: 'auto',
    padding: '1rem',
  },
};

export default StudioModeSwitcher;
