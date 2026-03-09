/**
 * Quality Inspector Component
 *
 * Interactive UI for controlling quality tier, LOD settings, geometry resolution,
 * and effect parameters. Integrates with QualityProfileManager for real-time
 * profile updates and preset management.
 *
 * Features:
 * - Quality tier slider (Industrial/Cinematic/Mobile)
 * - LOD distance controls
 * - Geometry resolution settings
 * - Fire effect controls (intensity, color, particle count)
 * - Real-time preview updates
 * - Preset save/load functionality
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { QualityProfileName } from '@hololand/quality-profiles';

// =============================================================================
// TYPES
// =============================================================================

export interface FireEffectParams {
  /** Fire intensity (0-1) */
  intensity: number;
  /** Fire color as hex string */
  color: string;
  /** Particle count (10-5000) */
  particleCount: number;
  /** Fire size scale multiplier */
  sizeScale: number;
  /** Emission rate (particles per second) */
  emissionRate: number;
}

export interface LODParams {
  /** Enable LOD system */
  enabled: boolean;
  /** Number of LOD levels */
  levels: number;
  /** Distance multiplier for LOD transitions */
  distanceMultiplier: number;
  /** Auto-switch LOD based on distance */
  autoSwitch: boolean;
  /** Maximum distance for LOD 0 (highest quality) */
  maxDistanceLOD0: number;
}

export interface GeometryParams {
  /** Maximum polygon count */
  maxPolyCount: number;
  /** Maximum texture size (pixels) */
  maxTextureSize: number;
  /** Anisotropic filtering level */
  anisotropy: number;
  /** Shadow map resolution */
  shadowMapSize: number;
}

export interface QualityPreset {
  /** Preset identifier */
  id: string;
  /** Preset display name */
  name: string;
  /** Profile tier */
  profile: QualityProfileName;
  /** LOD parameters */
  lod: LODParams;
  /** Geometry parameters */
  geometry: GeometryParams;
  /** Fire effect parameters (optional) */
  fireEffect?: FireEffectParams;
  /** Custom user preset */
  isCustom: boolean;
  /** Creation timestamp */
  createdAt: number;
}

export interface QualityInspectorProps {
  /** Current quality profile */
  currentProfile: QualityProfileName;
  /** Callback when profile changes */
  onProfileChange?: (profile: QualityProfileName) => void;
  /** Callback when LOD params change */
  onLODChange?: (params: LODParams) => void;
  /** Callback when geometry params change */
  onGeometryChange?: (params: GeometryParams) => void;
  /** Callback when fire effect params change */
  onFireEffectChange?: (params: FireEffectParams) => void;
  /** Callback when preset is saved */
  onPresetSave?: (preset: QualityPreset) => void;
  /** Callback when preset is loaded */
  onPresetLoad?: (preset: QualityPreset) => void;
  /** Available presets */
  presets?: QualityPreset[];
  /** Show fire effect controls */
  showFireControls?: boolean;
  /** Enable real-time preview */
  enablePreview?: boolean;
  /** Custom CSS class name */
  className?: string;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const DEFAULT_LOD_PARAMS: Record<QualityProfileName, LODParams> = {
  industrial: {
    enabled: true,
    levels: 3,
    distanceMultiplier: 1.5,
    autoSwitch: true,
    maxDistanceLOD0: 50,
  },
  cinematic: {
    enabled: true,
    levels: 4,
    distanceMultiplier: 0.8,
    autoSwitch: true,
    maxDistanceLOD0: 100,
  },
  mobile: {
    enabled: true,
    levels: 5,
    distanceMultiplier: 2.0,
    autoSwitch: true,
    maxDistanceLOD0: 30,
  },
};

const DEFAULT_GEOMETRY_PARAMS: Record<QualityProfileName, GeometryParams> = {
  industrial: {
    maxPolyCount: 500000,
    maxTextureSize: 1024,
    anisotropy: 4,
    shadowMapSize: 1024,
  },
  cinematic: {
    maxPolyCount: 2000000,
    maxTextureSize: 4096,
    anisotropy: 16,
    shadowMapSize: 4096,
  },
  mobile: {
    maxPolyCount: 50000,
    maxTextureSize: 512,
    anisotropy: 1,
    shadowMapSize: 512,
  },
};

const DEFAULT_FIRE_EFFECT: FireEffectParams = {
  intensity: 0.8,
  color: '#ff6600',
  particleCount: 500,
  sizeScale: 1.0,
  emissionRate: 100,
};

// =============================================================================
// COMPONENT
// =============================================================================

export const QualityInspector: React.FC<QualityInspectorProps> = ({
  currentProfile,
  onProfileChange,
  onLODChange,
  onGeometryChange,
  onFireEffectChange,
  onPresetSave,
  onPresetLoad,
  presets = [],
  showFireControls = false,
  enablePreview = true,
  className,
}) => {
  // Local state
  const [activeTab, setActiveTab] = useState<'quality' | 'lod' | 'geometry' | 'fire'>('quality');
  const [lodParams, setLodParams] = useState<LODParams>(DEFAULT_LOD_PARAMS[currentProfile]);
  const [geometryParams, setGeometryParams] = useState<GeometryParams>(
    DEFAULT_GEOMETRY_PARAMS[currentProfile]
  );
  const [fireEffect, setFireEffect] = useState<FireEffectParams>(DEFAULT_FIRE_EFFECT);
  const [presetName, setPresetName] = useState('');
  const [showPresetDialog, setShowPresetDialog] = useState(false);

  // Update params when profile changes
  useEffect(() => {
    setLodParams(DEFAULT_LOD_PARAMS[currentProfile]);
    setGeometryParams(DEFAULT_GEOMETRY_PARAMS[currentProfile]);
  }, [currentProfile]);

  // Handlers
  const handleProfileChange = useCallback(
    (profile: QualityProfileName) => {
      onProfileChange?.(profile);
    },
    [onProfileChange]
  );

  const handleLODParamChange = useCallback(
    <K extends keyof LODParams>(key: K, value: LODParams[K]) => {
      const updated = { ...lodParams, [key]: value };
      setLodParams(updated);
      if (enablePreview) {
        onLODChange?.(updated);
      }
    },
    [lodParams, enablePreview, onLODChange]
  );

  const handleGeometryParamChange = useCallback(
    <K extends keyof GeometryParams>(key: K, value: GeometryParams[K]) => {
      const updated = { ...geometryParams, [key]: value };
      setGeometryParams(updated);
      if (enablePreview) {
        onGeometryChange?.(updated);
      }
    },
    [geometryParams, enablePreview, onGeometryChange]
  );

  const handleFireEffectChange = useCallback(
    <K extends keyof FireEffectParams>(key: K, value: FireEffectParams[K]) => {
      const updated = { ...fireEffect, [key]: value };
      setFireEffect(updated);
      if (enablePreview) {
        onFireEffectChange?.(updated);
      }
    },
    [fireEffect, enablePreview, onFireEffectChange]
  );

  const handleApplyChanges = useCallback(() => {
    onLODChange?.(lodParams);
    onGeometryChange?.(geometryParams);
    if (showFireControls) {
      onFireEffectChange?.(fireEffect);
    }
  }, [lodParams, geometryParams, fireEffect, showFireControls, onLODChange, onGeometryChange, onFireEffectChange]);

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return;

    const preset: QualityPreset = {
      id: `preset-${Date.now()}`,
      name: presetName.trim(),
      profile: currentProfile,
      lod: lodParams,
      geometry: geometryParams,
      fireEffect: showFireControls ? fireEffect : undefined,
      isCustom: true,
      createdAt: Date.now(),
    };

    onPresetSave?.(preset);
    setPresetName('');
    setShowPresetDialog(false);
  }, [presetName, currentProfile, lodParams, geometryParams, fireEffect, showFireControls, onPresetSave]);

  const handleLoadPreset = useCallback(
    (preset: QualityPreset) => {
      setLodParams(preset.lod);
      setGeometryParams(preset.geometry);
      if (preset.fireEffect) {
        setFireEffect(preset.fireEffect);
      }
      handleProfileChange(preset.profile);
      onPresetLoad?.(preset);
    },
    [handleProfileChange, onPresetLoad]
  );

  const profileLabels: Record<QualityProfileName, string> = {
    industrial: 'Industrial',
    cinematic: 'Cinematic',
    mobile: 'Mobile',
  };

  const profileColors: Record<QualityProfileName, string> = {
    industrial: '#3b82f6',
    cinematic: '#8b5cf6',
    mobile: '#10b981',
  };

  return (
    <div className={className} style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Quality Inspector</h2>
        <div style={styles.headerActions}>
          <button onClick={() => setShowPresetDialog(true)} style={styles.headerButton}>
            Save Preset
          </button>
          {!enablePreview && (
            <button onClick={handleApplyChanges} style={styles.applyButton}>
              Apply Changes
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabBar} role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'quality'}
          onClick={() => setActiveTab('quality')}
          style={{
            ...styles.tab,
            ...(activeTab === 'quality' ? styles.tabActive : {}),
          }}
        >
          Quality Tier
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'lod'}
          onClick={() => setActiveTab('lod')}
          style={{
            ...styles.tab,
            ...(activeTab === 'lod' ? styles.tabActive : {}),
          }}
        >
          LOD Settings
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'geometry'}
          onClick={() => setActiveTab('geometry')}
          style={{
            ...styles.tab,
            ...(activeTab === 'geometry' ? styles.tabActive : {}),
          }}
        >
          Geometry
        </button>
        {showFireControls && (
          <button
            role="tab"
            aria-selected={activeTab === 'fire'}
            onClick={() => setActiveTab('fire')}
            style={{
              ...styles.tab,
              ...(activeTab === 'fire' ? styles.tabActive : {}),
            }}
          >
            Fire Effects
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div style={styles.content} role="tabpanel">
        {/* Quality Tier Tab */}
        {activeTab === 'quality' && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Quality Tier</h3>
            <p style={styles.sectionDescription}>
              Select a quality profile optimized for your use case
            </p>

            {/* Profile Selector */}
            <div style={styles.profileGrid}>
              {(['industrial', 'cinematic', 'mobile'] as QualityProfileName[]).map((profile) => (
                <button
                  key={profile}
                  onClick={() => handleProfileChange(profile)}
                  style={{
                    ...styles.profileCard,
                    ...(currentProfile === profile
                      ? {
                          ...styles.profileCardActive,
                          borderColor: profileColors[profile],
                          backgroundColor: `${profileColors[profile]}11`,
                        }
                      : {}),
                  }}
                  aria-pressed={currentProfile === profile}
                >
                  <div
                    style={{
                      ...styles.profileIndicator,
                      backgroundColor: profileColors[profile],
                    }}
                  />
                  <div style={styles.profileLabel}>{profileLabels[profile]}</div>
                  <div style={styles.profileHint}>
                    {profile === 'industrial' && 'Data accuracy, high-precision'}
                    {profile === 'cinematic' && 'Maximal visual quality'}
                    {profile === 'mobile' && 'Performance optimized'}
                  </div>
                </button>
              ))}
            </div>

            {/* Preset List */}
            {presets.length > 0 && (
              <div style={styles.presetsSection}>
                <h4 style={styles.subsectionTitle}>Saved Presets</h4>
                <div style={styles.presetList}>
                  {presets.map((preset) => (
                    <div key={preset.id} style={styles.presetItem}>
                      <div style={styles.presetInfo}>
                        <div style={styles.presetName}>{preset.name}</div>
                        <div style={styles.presetMeta}>
                          {profileLabels[preset.profile]} • {new Date(preset.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleLoadPreset(preset)}
                        style={styles.presetLoadButton}
                        aria-label={`Load preset ${preset.name}`}
                      >
                        Load
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* LOD Settings Tab */}
        {activeTab === 'lod' && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>LOD Configuration</h3>
            <p style={styles.sectionDescription}>
              Control level-of-detail transitions and distance thresholds
            </p>

            {/* LOD Enabled */}
            <div style={styles.controlRow}>
              <label style={styles.label}>
                <input
                  type="checkbox"
                  checked={lodParams.enabled}
                  onChange={(e) => handleLODParamChange('enabled', e.target.checked)}
                  style={styles.checkbox}
                />
                Enable LOD System
              </label>
            </div>

            {/* LOD Levels */}
            <div style={styles.controlRow}>
              <label style={styles.label}>
                LOD Levels: {lodParams.levels}
              </label>
              <input
                type="range"
                min={2}
                max={6}
                value={lodParams.levels}
                onChange={(e) => handleLODParamChange('levels', parseInt(e.target.value))}
                disabled={!lodParams.enabled}
                style={styles.slider}
              />
              <div style={styles.rangeHint}>2 to 6 levels</div>
            </div>

            {/* Distance Multiplier */}
            <div style={styles.controlRow}>
              <label style={styles.label}>
                Distance Multiplier: {lodParams.distanceMultiplier.toFixed(1)}x
              </label>
              <input
                type="range"
                min={0.5}
                max={3.0}
                step={0.1}
                value={lodParams.distanceMultiplier}
                onChange={(e) => handleLODParamChange('distanceMultiplier', parseFloat(e.target.value))}
                disabled={!lodParams.enabled}
                style={styles.slider}
              />
              <div style={styles.rangeHint}>0.5x to 3.0x (lower = higher quality at distance)</div>
            </div>

            {/* Max Distance LOD0 */}
            <div style={styles.controlRow}>
              <label style={styles.label}>
                Max Distance LOD0: {lodParams.maxDistanceLOD0}m
              </label>
              <input
                type="range"
                min={10}
                max={200}
                step={5}
                value={lodParams.maxDistanceLOD0}
                onChange={(e) => handleLODParamChange('maxDistanceLOD0', parseInt(e.target.value))}
                disabled={!lodParams.enabled}
                style={styles.slider}
              />
              <div style={styles.rangeHint}>10m to 200m (highest quality distance)</div>
            </div>

            {/* Auto Switch */}
            <div style={styles.controlRow}>
              <label style={styles.label}>
                <input
                  type="checkbox"
                  checked={lodParams.autoSwitch}
                  onChange={(e) => handleLODParamChange('autoSwitch', e.target.checked)}
                  disabled={!lodParams.enabled}
                  style={styles.checkbox}
                />
                Auto-switch LOD based on distance
              </label>
            </div>
          </div>
        )}

        {/* Geometry Tab */}
        {activeTab === 'geometry' && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Geometry Resolution</h3>
            <p style={styles.sectionDescription}>
              Configure polygon count, texture resolution, and shadow quality
            </p>

            {/* Max Poly Count */}
            <div style={styles.controlRow}>
              <label style={styles.label}>
                Max Polygon Count: {geometryParams.maxPolyCount.toLocaleString()}
              </label>
              <input
                type="range"
                min={10000}
                max={5000000}
                step={10000}
                value={geometryParams.maxPolyCount}
                onChange={(e) => handleGeometryParamChange('maxPolyCount', parseInt(e.target.value))}
                style={styles.slider}
              />
              <div style={styles.rangeHint}>10K to 5M polygons</div>
            </div>

            {/* Max Texture Size */}
            <div style={styles.controlRow}>
              <label style={styles.label}>
                Max Texture Size: {geometryParams.maxTextureSize}px
              </label>
              <input
                type="range"
                min={256}
                max={8192}
                step={256}
                value={geometryParams.maxTextureSize}
                onChange={(e) => handleGeometryParamChange('maxTextureSize', parseInt(e.target.value))}
                style={styles.slider}
              />
              <div style={styles.rangeHint}>256px to 8192px</div>
            </div>

            {/* Anisotropy */}
            <div style={styles.controlRow}>
              <label style={styles.label}>
                Anisotropic Filtering: {geometryParams.anisotropy}x
              </label>
              <input
                type="range"
                min={1}
                max={16}
                step={1}
                value={geometryParams.anisotropy}
                onChange={(e) => handleGeometryParamChange('anisotropy', parseInt(e.target.value))}
                style={styles.slider}
              />
              <div style={styles.rangeHint}>1x to 16x (texture sharpness at angles)</div>
            </div>

            {/* Shadow Map Size */}
            <div style={styles.controlRow}>
              <label style={styles.label}>
                Shadow Map Resolution: {geometryParams.shadowMapSize}px
              </label>
              <input
                type="range"
                min={256}
                max={8192}
                step={256}
                value={geometryParams.shadowMapSize}
                onChange={(e) => handleGeometryParamChange('shadowMapSize', parseInt(e.target.value))}
                style={styles.slider}
              />
              <div style={styles.rangeHint}>256px to 8192px (higher = sharper shadows)</div>
            </div>
          </div>
        )}

        {/* Fire Effects Tab */}
        {activeTab === 'fire' && showFireControls && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Fire Effect Controls</h3>
            <p style={styles.sectionDescription}>
              Adjust fire intensity, color, and particle emission
            </p>

            {/* Fire Intensity */}
            <div style={styles.controlRow}>
              <label style={styles.label}>
                Intensity: {(fireEffect.intensity * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={fireEffect.intensity}
                onChange={(e) => handleFireEffectChange('intensity', parseFloat(e.target.value))}
                style={styles.slider}
              />
              <div style={styles.rangeHint}>0% to 100%</div>
            </div>

            {/* Fire Color */}
            <div style={styles.controlRow}>
              <label style={styles.label}>
                Fire Color
              </label>
              <input
                type="color"
                value={fireEffect.color}
                onChange={(e) => handleFireEffectChange('color', e.target.value)}
                style={styles.colorPicker}
              />
              <div style={styles.colorValue}>{fireEffect.color}</div>
            </div>

            {/* Particle Count */}
            <div style={styles.controlRow}>
              <label style={styles.label}>
                Particle Count: {fireEffect.particleCount}
              </label>
              <input
                type="range"
                min={10}
                max={5000}
                step={10}
                value={fireEffect.particleCount}
                onChange={(e) => handleFireEffectChange('particleCount', parseInt(e.target.value))}
                style={styles.slider}
              />
              <div style={styles.rangeHint}>10 to 5000 particles</div>
            </div>

            {/* Size Scale */}
            <div style={styles.controlRow}>
              <label style={styles.label}>
                Size Scale: {fireEffect.sizeScale.toFixed(1)}x
              </label>
              <input
                type="range"
                min={0.1}
                max={5.0}
                step={0.1}
                value={fireEffect.sizeScale}
                onChange={(e) => handleFireEffectChange('sizeScale', parseFloat(e.target.value))}
                style={styles.slider}
              />
              <div style={styles.rangeHint}>0.1x to 5.0x</div>
            </div>

            {/* Emission Rate */}
            <div style={styles.controlRow}>
              <label style={styles.label}>
                Emission Rate: {fireEffect.emissionRate} p/s
              </label>
              <input
                type="range"
                min={10}
                max={1000}
                step={10}
                value={fireEffect.emissionRate}
                onChange={(e) => handleFireEffectChange('emissionRate', parseInt(e.target.value))}
                style={styles.slider}
              />
              <div style={styles.rangeHint}>10 to 1000 particles/sec</div>
            </div>
          </div>
        )}
      </div>

      {/* Preset Save Dialog */}
      {showPresetDialog && (
        <div style={styles.dialogOverlay} onClick={() => setShowPresetDialog(false)}>
          <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.dialogTitle}>Save Quality Preset</h3>
            <input
              type="text"
              placeholder="Preset name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              style={styles.dialogInput}
              autoFocus
            />
            <div style={styles.dialogActions}>
              <button onClick={() => setShowPresetDialog(false)} style={styles.dialogCancelButton}>
                Cancel
              </button>
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                style={styles.dialogSaveButton}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    color: '#333',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    overflow: 'hidden',
  },

  // Header
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    backgroundColor: 'white',
    borderBottom: '1px solid #e0e0e0',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  headerActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  headerButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f5f5f5',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#555',
    transition: 'all 0.2s',
  },
  applyButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'white',
    transition: 'all 0.2s',
  },

  // Tabs
  tabBar: {
    display: 'flex',
    backgroundColor: 'white',
    borderBottom: '2px solid #e0e0e0',
  },
  tab: {
    flex: 1,
    padding: '0.75rem 1rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#666',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#3b82f6',
    borderBottomColor: '#3b82f6',
  },

  // Content
  content: {
    padding: '1.5rem',
    backgroundColor: 'white',
    minHeight: '400px',
  },

  // Section
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  sectionDescription: {
    margin: 0,
    fontSize: '0.85rem',
    color: '#666',
  },

  // Profile Grid
  profileGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    marginTop: '0.5rem',
  },
  profileCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '1.5rem 1rem',
    backgroundColor: 'white',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  profileCardActive: {
    borderWidth: '3px',
    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
  },
  profileIndicator: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    marginBottom: '0.75rem',
  },
  profileLabel: {
    fontSize: '0.95rem',
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: '0.25rem',
  },
  profileHint: {
    fontSize: '0.75rem',
    color: '#999',
    textAlign: 'center',
  },

  // Controls
  controlRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#444',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    outline: 'none',
    cursor: 'pointer',
  },
  rangeHint: {
    fontSize: '0.75rem',
    color: '#999',
  },
  colorPicker: {
    width: '60px',
    height: '40px',
    border: '2px solid #e0e0e0',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  colorValue: {
    fontSize: '0.85rem',
    color: '#666',
    fontFamily: 'monospace',
  },

  // Presets
  presetsSection: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e0e0e0',
  },
  subsectionTitle: {
    margin: '0 0 0.75rem 0',
    fontSize: '0.95rem',
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  presetList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  presetItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    backgroundColor: '#f8f9fa',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
  },
  presetInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  presetName: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#1a1a2e',
  },
  presetMeta: {
    fontSize: '0.75rem',
    color: '#999',
  },
  presetLoadButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'white',
    transition: 'all 0.2s',
  },

  // Dialog
  dialogOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '1.5rem',
    minWidth: '400px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
  },
  dialogTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  dialogInput: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '0.9rem',
    outline: 'none',
    marginBottom: '1rem',
  },
  dialogActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem',
  },
  dialogCancelButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f5f5f5',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#555',
  },
  dialogSaveButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'white',
  },
};

export default QualityInspector;
