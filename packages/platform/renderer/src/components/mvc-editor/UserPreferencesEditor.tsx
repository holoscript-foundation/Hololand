/**
 * UserPreferencesEditor Component
 *
 * Key-value editor for user/agent preferences with learned vs explicit distinction.
 * Integrates with @holoscript/mvc-schema UserPreferences CRDT (LWW-Map).
 *
 * Features:
 * - Category-based organization (spatial, communication, visual, privacy)
 * - Field-level editing with type-appropriate controls (text, number, boolean, select, range)
 * - Learned vs explicit preference visualization
 * - Last updated metadata display
 * - Reset to default functionality
 * - Search and filter
 * - Validation feedback
 *
 * Accessibility (WCAG 2.1 AA):
 * - role="region" with aria-label on container
 * - role="tablist" for category navigation
 * - role="form" for preference editor
 * - Proper label associations for all inputs
 * - Keyboard navigation
 * - Focus visible indicators
 * - 4.5:1 contrast ratios
 *
 * @module mvc-editor/UserPreferencesEditor
 */

import React, { useState, useMemo, useCallback } from 'react';
import type {
  UserPreferencesEditorProps,
  UserPreferencesEditorState,
  PreferenceFieldMetadata,
  MVCEditorTheme,
} from './types';
import {
  mergeTheme,
  applyOverlayOpacity,
  formatRelativeTime,
  truncateText,
} from './types';
import type { UserPreferences } from '@holoscript/mvc-schema';

/**
 * Preference field definitions
 */
const PREFERENCE_FIELDS: Record<string, PreferenceFieldMetadata[]> = {
  spatial: [
    {
      key: 'movementSpeed',
      label: 'Movement Speed',
      description: 'Preferred movement speed in meters per second',
      type: 'range',
      defaultValue: 1.5,
      validation: { min: 0.5, max: 5.0 },
    },
    {
      key: 'personalSpaceRadius',
      label: 'Personal Space Radius',
      description: 'Personal space bubble radius in meters',
      type: 'range',
      defaultValue: 0.5,
      validation: { min: 0.1, max: 2.0 },
    },
    {
      key: 'interactionDistance',
      label: 'Interaction Distance',
      description: 'Preferred distance for interactions in meters',
      type: 'range',
      defaultValue: 1.0,
      validation: { min: 0.3, max: 3.0 },
    },
    {
      key: 'handDominance',
      label: 'Hand Dominance',
      description: 'Dominant hand for gesture controls',
      type: 'select',
      defaultValue: 'right',
      validation: {
        options: [
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
          { value: 'ambidextrous', label: 'Ambidextrous' },
        ],
      },
    },
  ],
  communication: [
    {
      key: 'style',
      label: 'Communication Style',
      description: 'Preferred communication tone',
      type: 'select',
      defaultValue: 'casual',
      validation: {
        options: [
          { value: 'formal', label: 'Formal' },
          { value: 'casual', label: 'Casual' },
          { value: 'technical', label: 'Technical' },
          { value: 'concise', label: 'Concise' },
        ],
      },
    },
    {
      key: 'language',
      label: 'Language',
      description: 'Preferred language (ISO 639-1)',
      type: 'string',
      defaultValue: 'en',
    },
    {
      key: 'voiceInput',
      label: 'Voice Input',
      description: 'Enable voice input controls',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'textToSpeech',
      label: 'Text-to-Speech',
      description: 'Enable text-to-speech output',
      type: 'boolean',
      defaultValue: false,
    },
    {
      key: 'notifications',
      label: 'Notification Level',
      description: 'Notification verbosity',
      type: 'select',
      defaultValue: 'important',
      validation: {
        options: [
          { value: 'all', label: 'All Notifications' },
          { value: 'important', label: 'Important Only' },
          { value: 'critical', label: 'Critical Only' },
          { value: 'none', label: 'None' },
        ],
      },
    },
  ],
  visual: [
    {
      key: 'theme',
      label: 'Theme',
      description: 'Visual theme preference',
      type: 'select',
      defaultValue: 'dark',
      validation: {
        options: [
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'auto', label: 'Auto' },
          { value: 'high-contrast', label: 'High Contrast' },
        ],
      },
    },
    {
      key: 'uiScale',
      label: 'UI Scale',
      description: 'User interface scale factor',
      type: 'range',
      defaultValue: 1.0,
      validation: { min: 0.5, max: 2.0 },
    },
    {
      key: 'colorVisionMode',
      label: 'Color Vision Mode',
      description: 'Color vision accessibility mode',
      type: 'select',
      defaultValue: 'normal',
      validation: {
        options: [
          { value: 'normal', label: 'Normal' },
          { value: 'protanopia', label: 'Protanopia' },
          { value: 'deuteranopia', label: 'Deuteranopia' },
          { value: 'tritanopia', label: 'Tritanopia' },
        ],
      },
    },
    {
      key: 'reducedMotion',
      label: 'Reduced Motion',
      description: 'Reduce motion and animations',
      type: 'boolean',
      defaultValue: false,
    },
    {
      key: 'showAnchors',
      label: 'Show Spatial Anchors',
      description: 'Display spatial anchor markers',
      type: 'boolean',
      defaultValue: true,
    },
  ],
  privacy: [
    {
      key: 'shareLocation',
      label: 'Share Location',
      description: 'Share location with other agents',
      type: 'boolean',
      defaultValue: false,
    },
    {
      key: 'shareTaskState',
      label: 'Share Task State',
      description: 'Share task state with team',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'allowCollaboration',
      label: 'Allow Collaboration',
      description: 'Enable agent collaboration features',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'visibilityMode',
      label: 'Visibility Mode',
      description: 'Profile visibility setting',
      type: 'select',
      defaultValue: 'team',
      validation: {
        options: [
          { value: 'public', label: 'Public' },
          { value: 'friends', label: 'Friends' },
          { value: 'team', label: 'Team' },
          { value: 'private', label: 'Private' },
        ],
      },
    },
  ],
};

/**
 * UserPreferencesEditor component
 */
export const UserPreferencesEditor: React.FC<UserPreferencesEditorProps> = ({
  userPreferences,
  onUpdatePreference,
  onResetPreference,
  showLearnedVsExplicit = true,
  showMetadata = true,
  categories = ['spatial', 'communication', 'visual', 'privacy'],
  allowEditing = true,
  displayMode = 'full',
  theme: themeOverride,
  className = '',
  style,
  ariaLabel = 'User Preferences Editor',
  disabled = false,
}) => {
  const theme = mergeTheme(themeOverride);

  // State
  const [state, setState] = useState<UserPreferencesEditorState>({
    activeCategory: categories[0],
    searchQuery: '',
    editingField: null,
    showModifiedOnly: false,
  });

  // Get preference value
  const getPreferenceValue = useCallback(
    (category: string, field: string): unknown => {
      const categoryPrefs = userPreferences[category as keyof UserPreferences];
      if (categoryPrefs && typeof categoryPrefs === 'object' && !Array.isArray(categoryPrefs)) {
        return (categoryPrefs as Record<string, unknown>)[field];
      }
      return undefined;
    },
    [userPreferences]
  );

  // Get preference metadata
  const getPreferenceMetadata = useCallback(
    (category: string, field: string) => {
      const fieldPath = `${category}.${field}`;
      return userPreferences.lwwMetadata[fieldPath];
    },
    [userPreferences.lwwMetadata]
  );

  // Check if preference is modified
  const isPreferenceModified = useCallback(
    (category: string, field: string): boolean => {
      const value = getPreferenceValue(category, field);
      const fieldDef = PREFERENCE_FIELDS[category]?.find((f) => f.key === field);
      return value !== undefined && value !== fieldDef?.defaultValue;
    },
    [getPreferenceValue]
  );

  // Filtered fields
  const filteredFields = useMemo(() => {
    const fields = PREFERENCE_FIELDS[state.activeCategory] || [];

    return fields.filter((field) => {
      // Search filter
      if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        if (
          !field.label.toLowerCase().includes(query) &&
          !field.description.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Modified only filter
      if (state.showModifiedOnly) {
        return isPreferenceModified(state.activeCategory, field.key);
      }

      return true;
    });
  }, [state.activeCategory, state.searchQuery, state.showModifiedOnly, isPreferenceModified]);

  // Handlers
  const handleCategoryChange = useCallback((category: typeof state.activeCategory) => {
    setState((prev) => ({ ...prev, activeCategory: category }));
  }, []);

  const handleUpdatePreference = useCallback(
    (field: string, value: unknown) => {
      if (!disabled && allowEditing) {
        onUpdatePreference?.(state.activeCategory, field, value);
      }
    },
    [state.activeCategory, disabled, allowEditing, onUpdatePreference]
  );

  const handleResetPreference = useCallback(
    (field: string) => {
      if (!disabled && allowEditing) {
        onResetPreference?.(state.activeCategory, field);
      }
    },
    [state.activeCategory, disabled, allowEditing, onResetPreference]
  );

  // Render field control
  const renderFieldControl = useCallback(
    (field: PreferenceFieldMetadata) => {
      const value = getPreferenceValue(state.activeCategory, field.key);
      const currentValue = value !== undefined ? value : field.defaultValue;

      switch (field.type) {
        case 'boolean':
          return (
            <input
              type="checkbox"
              checked={currentValue as boolean}
              onChange={(e) => handleUpdatePreference(field.key, e.target.checked)}
              disabled={disabled || !allowEditing}
              style={{
                width: 20,
                height: 20,
                cursor: disabled || !allowEditing ? 'not-allowed' : 'pointer',
              }}
              aria-label={field.label}
            />
          );

        case 'range':
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <input
                type="range"
                min={field.validation?.min}
                max={field.validation?.max}
                step={0.1}
                value={currentValue as number}
                onChange={(e) => handleUpdatePreference(field.key, parseFloat(e.target.value))}
                disabled={disabled || !allowEditing}
                style={{
                  flex: 1,
                  cursor: disabled || !allowEditing ? 'not-allowed' : 'pointer',
                }}
                aria-label={field.label}
              />
              <span
                style={{
                  minWidth: 60,
                  color: theme.textColor,
                  fontSize: theme.baseFontSize - 2,
                  textAlign: 'right',
                }}
              >
                {(currentValue as number).toFixed(1)}
              </span>
            </div>
          );

        case 'select':
          return (
            <select
              value={currentValue as string}
              onChange={(e) => handleUpdatePreference(field.key, e.target.value)}
              disabled={disabled || !allowEditing}
              style={{
                padding: '6px 10px',
                backgroundColor: applyOverlayOpacity(theme.borderColor, 0.5),
                border: `1px solid ${theme.borderColor}`,
                borderRadius: theme.borderRadius / 2,
                color: theme.textColor,
                fontSize: theme.baseFontSize - 1,
                cursor: disabled || !allowEditing ? 'not-allowed' : 'pointer',
              }}
              aria-label={field.label}
            >
              {field.validation?.options?.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>
          );

        case 'number':
          return (
            <input
              type="number"
              value={currentValue as number}
              onChange={(e) => handleUpdatePreference(field.key, parseFloat(e.target.value))}
              disabled={disabled || !allowEditing}
              min={field.validation?.min}
              max={field.validation?.max}
              style={{
                padding: '6px 10px',
                backgroundColor: applyOverlayOpacity(theme.borderColor, 0.5),
                border: `1px solid ${theme.borderColor}`,
                borderRadius: theme.borderRadius / 2,
                color: theme.textColor,
                fontSize: theme.baseFontSize - 1,
                width: 120,
              }}
              aria-label={field.label}
            />
          );

        case 'string':
        default:
          return (
            <input
              type="text"
              value={currentValue as string}
              onChange={(e) => handleUpdatePreference(field.key, e.target.value)}
              disabled={disabled || !allowEditing}
              pattern={field.validation?.pattern}
              style={{
                padding: '6px 10px',
                backgroundColor: applyOverlayOpacity(theme.borderColor, 0.5),
                border: `1px solid ${theme.borderColor}`,
                borderRadius: theme.borderRadius / 2,
                color: theme.textColor,
                fontSize: theme.baseFontSize - 1,
                flex: 1,
              }}
              aria-label={field.label}
            />
          );
      }
    },
    [
      state.activeCategory,
      theme,
      disabled,
      allowEditing,
      getPreferenceValue,
      handleUpdatePreference,
    ]
  );

  // Compact mode
  if (displayMode === 'compact') {
    const modifiedCount = categories.reduce((count, category) => {
      const fields = PREFERENCE_FIELDS[category] || [];
      return count + fields.filter((f) => isPreferenceModified(category, f.key)).length;
    }, 0);

    return (
      <div
        className={`user-preferences-editor-compact ${className}`}
        style={{
          ...style,
          padding: theme.panelSpacing / 2,
          backgroundColor: applyOverlayOpacity(theme.backgroundColor, theme.overlayOpacity),
          borderRadius: theme.borderRadius,
          fontFamily: theme.fontFamily,
          fontSize: theme.baseFontSize,
        }}
        role="region"
        aria-label={ariaLabel}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: theme.textColor, fontWeight: 600 }}>Preferences:</span>
          <span style={{ color: theme.primaryColor }}>{modifiedCount} customized</span>
        </div>
      </div>
    );
  }

  // Full mode
  return (
    <div
      className={`user-preferences-editor ${className}`}
      style={{
        ...style,
        padding: theme.panelSpacing,
        backgroundColor: applyOverlayOpacity(theme.backgroundColor, theme.overlayOpacity),
        borderRadius: theme.borderRadius,
        fontFamily: theme.fontFamily,
        fontSize: theme.baseFontSize,
        color: theme.textColor,
      }}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Header */}
      <div style={{ marginBottom: theme.panelSpacing }}>
        <h2 style={{ margin: 0, fontSize: theme.baseFontSize + 6, fontWeight: 700 }}>
          User Preferences
        </h2>
        <p style={{ margin: '8px 0 0', color: theme.disabledColor, fontSize: theme.baseFontSize - 2 }}>
          Agent: {truncateText(userPreferences.agentDid, 40)} • Last updated{' '}
          {formatRelativeTime(userPreferences.lastUpdated)}
        </p>
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: theme.panelSpacing / 2,
          marginBottom: theme.panelSpacing,
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <input
          type="text"
          placeholder="Search preferences..."
          value={state.searchQuery}
          onChange={(e) => setState((prev) => ({ ...prev, searchQuery: e.target.value }))}
          style={{
            flex: '1 1 200px',
            padding: '8px 12px',
            backgroundColor: applyOverlayOpacity(theme.borderColor, 0.5),
            border: `1px solid ${theme.borderColor}`,
            borderRadius: theme.borderRadius / 2,
            color: theme.textColor,
            fontSize: theme.baseFontSize,
          }}
          aria-label="Search preferences"
        />

        {/* Show Modified Only */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={state.showModifiedOnly}
            onChange={(e) =>
              setState((prev) => ({ ...prev, showModifiedOnly: e.target.checked }))
            }
          />
          <span style={{ fontSize: theme.baseFontSize - 1 }}>Modified only</span>
        </label>
      </div>

      {/* Category Tabs */}
      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: theme.panelSpacing,
          borderBottom: `2px solid ${theme.borderColor}`,
        }}
      >
        {categories.map((category) => (
          <button
            key={category}
            role="tab"
            aria-selected={state.activeCategory === category}
            onClick={() => handleCategoryChange(category)}
            style={{
              padding: '10px 16px',
              backgroundColor:
                state.activeCategory === category
                  ? applyOverlayOpacity(theme.primaryColor, 0.3)
                  : 'transparent',
              border: 'none',
              borderBottom: `3px solid ${
                state.activeCategory === category ? theme.primaryColor : 'transparent'
              }`,
              color: state.activeCategory === category ? theme.primaryColor : theme.textColor,
              fontSize: theme.baseFontSize,
              fontWeight: state.activeCategory === category ? 600 : 400,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Preference Fields */}
      <div
        role="form"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.panelSpacing,
          maxHeight: displayMode === 'overlay' ? '400px' : 'none',
          overflowY: 'auto',
        }}
      >
        {filteredFields.length === 0 ? (
          <div
            style={{
              padding: theme.panelSpacing * 2,
              textAlign: 'center',
              color: theme.disabledColor,
            }}
          >
            No preferences found
          </div>
        ) : (
          filteredFields.map((field) => {
            const metadata = getPreferenceMetadata(state.activeCategory, field.key);
            const isModified = isPreferenceModified(state.activeCategory, field.key);

            return (
              <div
                key={field.key}
                style={{
                  padding: theme.panelSpacing,
                  backgroundColor: applyOverlayOpacity(theme.borderColor, 0.3),
                  borderRadius: theme.borderRadius,
                  border: `2px solid ${isModified ? theme.primaryColor : 'transparent'}`,
                }}
              >
                {/* Field Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: theme.baseFontSize,
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      {field.label}
                      {isModified && (
                        <span
                          style={{
                            marginLeft: 8,
                            padding: '2px 6px',
                            backgroundColor: theme.primaryColor,
                            borderRadius: theme.borderRadius / 2,
                            fontSize: theme.baseFontSize - 4,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                          }}
                        >
                          Modified
                        </span>
                      )}
                    </label>
                    <p
                      style={{
                        margin: 0,
                        color: theme.disabledColor,
                        fontSize: theme.baseFontSize - 2,
                      }}
                    >
                      {field.description}
                    </p>
                  </div>

                  {/* Reset Button */}
                  {isModified && allowEditing && (
                    <button
                      onClick={() => handleResetPreference(field.key)}
                      disabled={disabled}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'transparent',
                        border: `1px solid ${theme.borderColor}`,
                        borderRadius: theme.borderRadius / 2,
                        color: theme.disabledColor,
                        fontSize: theme.baseFontSize - 2,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                      }}
                      aria-label={`Reset ${field.label}`}
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Field Control */}
                <div style={{ marginBottom: showMetadata && metadata ? 8 : 0 }}>
                  {renderFieldControl(field)}
                </div>

                {/* Metadata */}
                {showMetadata && metadata && (
                  <div
                    style={{
                      fontSize: theme.baseFontSize - 3,
                      color: theme.disabledColor,
                    }}
                  >
                    Last updated {formatRelativeTime(metadata.timestamp)} by{' '}
                    {truncateText(metadata.actorDid, 30)}
                    {showLearnedVsExplicit && (
                      <span style={{ marginLeft: 8 }}>
                        ({metadata.actorDid === userPreferences.agentDid ? 'Explicit' : 'Learned'})
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default UserPreferencesEditor;
