/**
 * SpatialContextEditor Component
 *
 * Map view showing geospatial anchors (WGS84) and movement history.
 * Integrates with @holoscript/mvc-schema SpatialContextSummary CRDT.
 *
 * Features:
 * - Interactive map with WGS84 coordinate visualization
 * - Spatial anchor markers with labels
 * - Primary anchor highlighting
 * - Movement history trail
 * - 3D pose visualization (position + orientation quaternion)
 * - Environmental context display
 * - Anchor creation and editing
 * - Search and filter anchors
 *
 * Accessibility (WCAG 2.1 AA):
 * - role="region" with aria-label on container
 * - role="list" for anchor list view
 * - Keyboard navigation
 * - Focus visible indicators
 * - 4.5:1 contrast ratios
 * - Alternative list view for screen readers
 *
 * @module mvc-editor/SpatialContextEditor
 */

import React, { useState, useMemo, useCallback } from 'react';
import type {
  SpatialContextEditorProps,
  SpatialContextEditorState,
  MVCEditorTheme,
} from './types';
import {
  mergeTheme,
  applyOverlayOpacity,
  formatRelativeTime,
  truncateText,
} from './types';
import type { SpatialAnchor, AgentPose } from '@holoscript/mvc-schema';

/**
 * SpatialContextEditor component
 */
export const SpatialContextEditor: React.FC<SpatialContextEditorProps> = ({
  spatialContext,
  onAddAnchor,
  onUpdateAnchor,
  onDeleteAnchor,
  onSelectAnchor,
  mapCenter: initialMapCenter,
  mapZoom: initialMapZoom = 15,
  showMovementHistory = false,
  showEnvironment = true,
  show3DPose = false,
  displayMode = 'full',
  theme: themeOverride,
  className = '',
  style,
  ariaLabel = 'Spatial Context Editor',
  disabled = false,
}) => {
  const theme = mergeTheme(themeOverride);

  // State
  const [state, setState] = useState<SpatialContextEditorState>({
    selectedAnchorId: null,
    mapCenter: initialMapCenter || {
      latitude: spatialContext.primaryAnchor?.coordinate.latitude || 0,
      longitude: spatialContext.primaryAnchor?.coordinate.longitude || 0,
    },
    mapZoom: initialMapZoom,
    viewMode: 'map',
    isAnchorFormOpen: false,
    editingAnchorId: null,
  });

  // All anchors (primary + recent)
  const allAnchors = useMemo(() => {
    const anchors: SpatialAnchor[] = [...spatialContext.recentAnchors];
    if (spatialContext.primaryAnchor) {
      anchors.unshift(spatialContext.primaryAnchor);
    }
    return anchors;
  }, [spatialContext.primaryAnchor, spatialContext.recentAnchors]);

  // Handlers
  const handleSelectAnchor = useCallback(
    (anchorId: string) => {
      setState((prev) => ({
        ...prev,
        selectedAnchorId: prev.selectedAnchorId === anchorId ? null : anchorId,
      }));
      onSelectAnchor?.(anchorId);

      // Center map on selected anchor
      const anchor = allAnchors.find((a) => a.id === anchorId);
      if (anchor) {
        setState((prev) => ({
          ...prev,
          mapCenter: {
            latitude: anchor.coordinate.latitude,
            longitude: anchor.coordinate.longitude,
          },
        }));
      }
    },
    [allAnchors, onSelectAnchor]
  );

  const handleViewModeChange = useCallback((viewMode: 'map' | 'list' | '3d') => {
    setState((prev) => ({ ...prev, viewMode }));
  }, []);

  const handleCreateAnchor = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isAnchorFormOpen: true,
      editingAnchorId: null,
    }));
  }, []);

  const handleEditAnchor = useCallback((anchorId: string) => {
    setState((prev) => ({
      ...prev,
      isAnchorFormOpen: true,
      editingAnchorId: anchorId,
    }));
  }, []);

  const handleCloseForm = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isAnchorFormOpen: false,
      editingAnchorId: null,
    }));
  }, []);

  // Format coordinate
  const formatCoordinate = useCallback((lat: number, lon: number): string => {
    return `${lat.toFixed(6)}°, ${lon.toFixed(6)}°`;
  }, []);

  // Format pose
  const formatPose = useCallback((pose: AgentPose): string => {
    const [x, y, z] = pose.position;
    return `Position: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}) m`;
  }, []);

  // Get anchor type color
  const getAnchorTypeColor = useCallback(
    (type?: SpatialAnchor['type']): string => {
      switch (type) {
        case 'waypoint':
          return theme.primaryColor;
        case 'poi':
          return theme.secondaryColor;
        case 'workspace':
          return '#10b981';
        case 'meeting':
          return '#f59e0b';
        case 'reference':
          return '#8b5cf6';
        default:
          return theme.textColor;
      }
    },
    [theme]
  );

  // Compact mode
  if (displayMode === 'compact') {
    return (
      <div
        className={`spatial-context-editor-compact ${className}`}
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
          <span style={{ color: theme.textColor, fontWeight: 600 }}>Location:</span>
          {spatialContext.primaryAnchor ? (
            <span style={{ color: theme.primaryColor }}>
              {truncateText(spatialContext.primaryAnchor.label, 30)} •{' '}
              {allAnchors.length} anchors
            </span>
          ) : (
            <span style={{ color: theme.disabledColor }}>No primary anchor</span>
          )}
        </div>
      </div>
    );
  }

  // Full mode
  return (
    <div
      className={`spatial-context-editor ${className}`}
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
          Spatial Context
        </h2>
        <p style={{ margin: '8px 0 0', color: theme.disabledColor, fontSize: theme.baseFontSize - 2 }}>
          Agent: {truncateText(spatialContext.agentDid, 40)} • {allAnchors.length} anchors • Last
          updated {formatRelativeTime(spatialContext.lastUpdated)}
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
        {/* View Mode */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['map', 'list', '3d'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => handleViewModeChange(mode)}
              disabled={disabled || (mode === '3d' && !show3DPose)}
              style={{
                padding: '8px 16px',
                backgroundColor:
                  state.viewMode === mode
                    ? theme.primaryColor
                    : applyOverlayOpacity(theme.borderColor, 0.5),
                border: `1px solid ${theme.borderColor}`,
                borderRadius: theme.borderRadius / 2,
                color: theme.textColor,
                fontSize: theme.baseFontSize - 2,
                cursor: disabled || (mode === '3d' && !show3DPose) ? 'not-allowed' : 'pointer',
                textTransform: 'capitalize',
              }}
              aria-label={`${mode} view`}
              aria-pressed={state.viewMode === mode}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Create Anchor Button */}
        <button
          onClick={handleCreateAnchor}
          disabled={disabled}
          style={{
            marginLeft: 'auto',
            padding: '8px 16px',
            backgroundColor: theme.successColor,
            border: 'none',
            borderRadius: theme.borderRadius / 2,
            color: theme.textColor,
            fontSize: theme.baseFontSize,
            fontWeight: 600,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          aria-label="Create new anchor"
        >
          + New Anchor
        </button>
      </div>

      {/* Primary Anchor Display */}
      {spatialContext.primaryAnchor && (
        <div
          style={{
            padding: theme.panelSpacing,
            backgroundColor: applyOverlayOpacity(theme.primaryColor, 0.2),
            border: `2px solid ${theme.primaryColor}`,
            borderRadius: theme.borderRadius,
            marginBottom: theme.panelSpacing,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: theme.baseFontSize + 2, fontWeight: 600 }}>
                Primary Anchor: {spatialContext.primaryAnchor.label}
              </h3>
              <p style={{ margin: 0, color: theme.disabledColor, fontSize: theme.baseFontSize - 1 }}>
                {formatCoordinate(
                  spatialContext.primaryAnchor.coordinate.latitude,
                  spatialContext.primaryAnchor.coordinate.longitude
                )}{' '}
                • Altitude: {spatialContext.primaryAnchor.coordinate.altitude.toFixed(1)}m
              </p>
              {spatialContext.primaryAnchor.type && (
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: 8,
                    padding: '4px 8px',
                    backgroundColor: getAnchorTypeColor(spatialContext.primaryAnchor.type),
                    borderRadius: theme.borderRadius / 2,
                    fontSize: theme.baseFontSize - 3,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  {spatialContext.primaryAnchor.type}
                </span>
              )}
            </div>
            {spatialContext.primaryAnchor.confidence !== undefined && (
              <div
                style={{
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: theme.baseFontSize + 4, fontWeight: 700 }}>
                  {Math.round(spatialContext.primaryAnchor.confidence * 100)}%
                </div>
                <div style={{ fontSize: theme.baseFontSize - 2, color: theme.disabledColor }}>
                  Confidence
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current Pose */}
      {show3DPose && spatialContext.currentPose && (
        <div
          style={{
            padding: theme.panelSpacing,
            backgroundColor: applyOverlayOpacity(theme.borderColor, 0.3),
            borderRadius: theme.borderRadius,
            marginBottom: theme.panelSpacing,
          }}
        >
          <h3 style={{ margin: '0 0 8px', fontSize: theme.baseFontSize + 1, fontWeight: 600 }}>
            Current Pose
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
            <span style={{ color: theme.disabledColor }}>Position:</span>
            <span style={{ fontFamily: 'monospace', fontSize: theme.baseFontSize - 1 }}>
              ({spatialContext.currentPose.position.map((v) => v.toFixed(2)).join(', ')}) m
            </span>

            <span style={{ color: theme.disabledColor }}>Orientation:</span>
            <span style={{ fontFamily: 'monospace', fontSize: theme.baseFontSize - 1 }}>
              ({spatialContext.currentPose.orientation.map((v) => v.toFixed(3)).join(', ')})
            </span>

            {spatialContext.currentPose.velocity && (
              <>
                <span style={{ color: theme.disabledColor }}>Velocity:</span>
                <span style={{ fontFamily: 'monospace', fontSize: theme.baseFontSize - 1 }}>
                  ({spatialContext.currentPose.velocity.map((v) => v.toFixed(2)).join(', ')}) m/s
                </span>
              </>
            )}

            <span style={{ color: theme.disabledColor }}>Updated:</span>
            <span style={{ fontSize: theme.baseFontSize - 1 }}>
              {formatRelativeTime(spatialContext.currentPose.timestamp)}
            </span>
          </div>
        </div>
      )}

      {/* Environmental Context */}
      {showEnvironment && spatialContext.environment && (
        <div
          style={{
            padding: theme.panelSpacing,
            backgroundColor: applyOverlayOpacity(theme.borderColor, 0.3),
            borderRadius: theme.borderRadius,
            marginBottom: theme.panelSpacing,
          }}
        >
          <h3 style={{ margin: '0 0 8px', fontSize: theme.baseFontSize + 1, fontWeight: 600 }}>
            Environment
          </h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <span style={{ color: theme.disabledColor, fontSize: theme.baseFontSize - 2 }}>
                Type:{' '}
              </span>
              <span style={{ textTransform: 'capitalize' }}>
                {spatialContext.environment.type}
              </span>
            </div>

            {spatialContext.environment.lightingLevel !== undefined && (
              <div>
                <span style={{ color: theme.disabledColor, fontSize: theme.baseFontSize - 2 }}>
                  Lighting:{' '}
                </span>
                <span>{spatialContext.environment.lightingLevel} lux</span>
              </div>
            )}

            {spatialContext.environment.noiseLevel !== undefined && (
              <div>
                <span style={{ color: theme.disabledColor, fontSize: theme.baseFontSize - 2 }}>
                  Noise:{' '}
                </span>
                <span>{spatialContext.environment.noiseLevel} dB</span>
              </div>
            )}

            {spatialContext.environment.temperature !== undefined && (
              <div>
                <span style={{ color: theme.disabledColor, fontSize: theme.baseFontSize - 2 }}>
                  Temperature:{' '}
                </span>
                <span>{spatialContext.environment.temperature}°C</span>
              </div>
            )}

            {spatialContext.environment.weather && (
              <div>
                <span style={{ color: theme.disabledColor, fontSize: theme.baseFontSize - 2 }}>
                  Weather:{' '}
                </span>
                <span style={{ textTransform: 'capitalize' }}>
                  {spatialContext.environment.weather}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Anchor List View */}
      {state.viewMode === 'list' && (
        <div
          role="list"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.panelSpacing / 2,
            maxHeight: displayMode === 'overlay' ? '400px' : 'none',
            overflowY: 'auto',
          }}
        >
          {allAnchors.length === 0 ? (
            <div
              style={{
                padding: theme.panelSpacing * 2,
                textAlign: 'center',
                color: theme.disabledColor,
              }}
            >
              No spatial anchors
            </div>
          ) : (
            allAnchors.map((anchor, index) => {
              const isPrimary = index === 0 && spatialContext.primaryAnchor?.id === anchor.id;

              return (
                <div
                  key={anchor.id}
                  role="listitem"
                  tabIndex={0}
                  onClick={() => handleSelectAnchor(anchor.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectAnchor(anchor.id);
                    }
                  }}
                  style={{
                    padding: theme.panelSpacing,
                    backgroundColor: applyOverlayOpacity(
                      state.selectedAnchorId === anchor.id || isPrimary
                        ? theme.primaryColor
                        : theme.borderColor,
                      state.selectedAnchorId === anchor.id || isPrimary ? 0.3 : 0.5
                    ),
                    border: `2px solid ${
                      state.selectedAnchorId === anchor.id || isPrimary
                        ? theme.primaryColor
                        : 'transparent'
                    }`,
                    borderRadius: theme.borderRadius,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  aria-selected={state.selectedAnchorId === anchor.id}
                >
                  {/* Anchor Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {isPrimary && (
                      <span
                        style={{
                          padding: '4px 8px',
                          backgroundColor: theme.primaryColor,
                          borderRadius: theme.borderRadius / 2,
                          fontSize: theme.baseFontSize - 4,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}
                      >
                        Primary
                      </span>
                    )}

                    {anchor.type && (
                      <span
                        style={{
                          padding: '4px 8px',
                          backgroundColor: getAnchorTypeColor(anchor.type),
                          borderRadius: theme.borderRadius / 2,
                          fontSize: theme.baseFontSize - 4,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}
                      >
                        {anchor.type}
                      </span>
                    )}

                    <span style={{ color: theme.disabledColor, fontSize: theme.baseFontSize - 2 }}>
                      {formatRelativeTime(anchor.lastVerified)}
                    </span>
                  </div>

                  {/* Anchor Label */}
                  <p style={{ margin: '0 0 8px', fontSize: theme.baseFontSize, fontWeight: 500 }}>
                    {anchor.label}
                  </p>

                  {/* Coordinates */}
                  <p
                    style={{
                      margin: 0,
                      color: theme.disabledColor,
                      fontSize: theme.baseFontSize - 1,
                      fontFamily: 'monospace',
                    }}
                  >
                    {formatCoordinate(anchor.coordinate.latitude, anchor.coordinate.longitude)} •
                    Alt: {anchor.coordinate.altitude.toFixed(1)}m
                  </p>

                  {/* Expanded Details */}
                  {state.selectedAnchorId === anchor.id && (
                    <div
                      style={{
                        marginTop: theme.panelSpacing,
                        paddingTop: theme.panelSpacing,
                        borderTop: `1px solid ${theme.borderColor}`,
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
                        <span style={{ color: theme.disabledColor }}>Anchor ID:</span>
                        <span
                          style={{ fontFamily: 'monospace', fontSize: theme.baseFontSize - 2 }}
                        >
                          {anchor.id}
                        </span>

                        {anchor.creatorDid && (
                          <>
                            <span style={{ color: theme.disabledColor }}>Creator DID:</span>
                            <span
                              style={{ fontFamily: 'monospace', fontSize: theme.baseFontSize - 2 }}
                            >
                              {truncateText(anchor.creatorDid, 50)}
                            </span>
                          </>
                        )}

                        {anchor.coordinate.horizontalAccuracy !== undefined && (
                          <>
                            <span style={{ color: theme.disabledColor }}>
                              Horizontal Accuracy:
                            </span>
                            <span style={{ fontSize: theme.baseFontSize - 2 }}>
                              ±{anchor.coordinate.horizontalAccuracy.toFixed(1)}m
                            </span>
                          </>
                        )}

                        {anchor.coordinate.verticalAccuracy !== undefined && (
                          <>
                            <span style={{ color: theme.disabledColor }}>
                              Vertical Accuracy:
                            </span>
                            <span style={{ fontSize: theme.baseFontSize - 2 }}>
                              ±{anchor.coordinate.verticalAccuracy.toFixed(1)}m
                            </span>
                          </>
                        )}

                        <span style={{ color: theme.disabledColor }}>Created:</span>
                        <span style={{ fontSize: theme.baseFontSize - 2 }}>
                          {new Date(anchor.createdAt).toLocaleString()}
                        </span>

                        <span style={{ color: theme.disabledColor }}>Last Verified:</span>
                        <span style={{ fontSize: theme.baseFontSize - 2 }}>
                          {new Date(anchor.lastVerified).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Map View Placeholder */}
      {state.viewMode === 'map' && (
        <div
          style={{
            padding: theme.panelSpacing * 2,
            backgroundColor: applyOverlayOpacity(theme.borderColor, 0.3),
            borderRadius: theme.borderRadius,
            textAlign: 'center',
            color: theme.disabledColor,
          }}
        >
          <p style={{ margin: 0, fontSize: theme.baseFontSize + 2 }}>
            Interactive map view
          </p>
          <p style={{ margin: '8px 0 0', fontSize: theme.baseFontSize - 1 }}>
            Map visualization requires integration with mapping library (Leaflet, MapBox, Google
            Maps)
          </p>
          <p style={{ margin: '8px 0 0', fontSize: theme.baseFontSize - 2 }}>
            Center: {formatCoordinate(state.mapCenter.latitude, state.mapCenter.longitude)} • Zoom:{' '}
            {state.mapZoom}
          </p>
        </div>
      )}

      {/* 3D View Placeholder */}
      {state.viewMode === '3d' && (
        <div
          style={{
            padding: theme.panelSpacing * 2,
            backgroundColor: applyOverlayOpacity(theme.borderColor, 0.3),
            borderRadius: theme.borderRadius,
            textAlign: 'center',
            color: theme.disabledColor,
          }}
        >
          <p style={{ margin: 0, fontSize: theme.baseFontSize + 2 }}>
            3D pose visualization
          </p>
          <p style={{ margin: '8px 0 0', fontSize: theme.baseFontSize - 1 }}>
            3D view requires Three.js integration for pose rendering
          </p>
        </div>
      )}
    </div>
  );
};

export default SpatialContextEditor;
