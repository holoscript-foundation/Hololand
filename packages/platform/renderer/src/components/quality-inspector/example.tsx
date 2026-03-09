/**
 * Quality Inspector Example
 *
 * Demonstrates usage of QualityInspector component with all features:
 * - Quality tier selection
 * - LOD configuration
 * - Geometry settings
 * - Fire effect controls
 * - Preset save/load
 */

import React from 'react';
import { QualityInspector, useQualityInspector } from './index';
import type { LODParams, GeometryParams, FireEffectParams } from './types';

/**
 * Example 1: Basic Usage
 */
export function BasicExample() {
  const { currentProfile, setProfile } = useQualityInspector({
    initialProfile: 'industrial',
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Basic Quality Inspector</h1>
      <QualityInspector
        currentProfile={currentProfile}
        onProfileChange={setProfile}
        onLODChange={(params) => console.log('LOD changed:', params)}
        onGeometryChange={(params) => console.log('Geometry changed:', params)}
      />
    </div>
  );
}

/**
 * Example 2: With Fire Effect Controls
 */
export function FireEffectExample() {
  const { currentProfile, setProfile, presets, savePreset, loadPreset } = useQualityInspector({
    initialProfile: 'cinematic',
    persistPresets: true,
  });

  const handleFireEffectChange = (params: FireEffectParams) => {
    console.log('Fire effect changed:', params);
    // In a real app, you would update your fire particle system here
    // fireSystem.setIntensity(params.intensity);
    // fireSystem.setColor(params.color);
    // etc.
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Quality Inspector with Fire Effects</h1>
      <QualityInspector
        currentProfile={currentProfile}
        onProfileChange={setProfile}
        onLODChange={(params) => console.log('LOD changed:', params)}
        onGeometryChange={(params) => console.log('Geometry changed:', params)}
        onFireEffectChange={handleFireEffectChange}
        onPresetSave={savePreset}
        onPresetLoad={loadPreset}
        presets={presets}
        showFireControls={true}
        enablePreview={true}
      />
    </div>
  );
}

/**
 * Example 3: Manual Apply Mode (No Real-time Preview)
 */
export function ManualApplyExample() {
  const { currentProfile, setProfile } = useQualityInspector({
    initialProfile: 'mobile',
  });

  const handleApplyLOD = (params: LODParams) => {
    console.log('Applying LOD settings:', params);
    // Apply settings only when user clicks "Apply Changes"
  };

  const handleApplyGeometry = (params: GeometryParams) => {
    console.log('Applying geometry settings:', params);
    // Apply settings only when user clicks "Apply Changes"
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Manual Apply Mode</h1>
      <p>Changes are applied only when you click "Apply Changes" button</p>
      <QualityInspector
        currentProfile={currentProfile}
        onProfileChange={setProfile}
        onLODChange={handleApplyLOD}
        onGeometryChange={handleApplyGeometry}
        enablePreview={false}
      />
    </div>
  );
}

/**
 * Example 4: Full-Featured with Preset Management
 */
export function FullFeaturedExample() {
  const {
    currentProfile,
    setProfile,
    presets,
    savePreset,
    loadPreset,
    deletePreset,
    exportPresets,
    importPresets,
  } = useQualityInspector({
    initialProfile: 'cinematic',
    persistPresets: true,
    enablePreview: true,
  });

  const handleExportPresets = () => {
    const json = exportPresets();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `quality-presets-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
  };

  const handleImportPresets = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const success = importPresets(text);

      if (success) {
        alert('Presets imported successfully!');
      } else {
        alert('Failed to import presets. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h1>Full-Featured Quality Inspector</h1>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button
            onClick={handleExportPresets}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Export Presets
          </button>
          <label
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#10b981',
              color: 'white',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Import Presets
            <input
              type="file"
              accept=".json"
              onChange={handleImportPresets}
              style={{ display: 'none' }}
            />
          </label>
          {presets.length > 0 && (
            <span style={{ alignSelf: 'center', color: '#666' }}>
              {presets.length} preset{presets.length !== 1 ? 's' : ''} saved
            </span>
          )}
        </div>
      </div>

      <QualityInspector
        currentProfile={currentProfile}
        onProfileChange={(profile) => {
          console.log('Profile changed to:', profile);
          setProfile(profile);
        }}
        onLODChange={(params) => {
          console.log('LOD params:', params);
        }}
        onGeometryChange={(params) => {
          console.log('Geometry params:', params);
        }}
        onFireEffectChange={(params) => {
          console.log('Fire effect params:', params);
        }}
        onPresetSave={(preset) => {
          console.log('Saving preset:', preset.name);
          savePreset(preset);
        }}
        onPresetLoad={(preset) => {
          console.log('Loading preset:', preset.name);
          loadPreset(preset);
        }}
        presets={presets}
        showFireControls={true}
        enablePreview={true}
      />

      {/* Preset Management Panel */}
      {presets.length > 0 && (
        <div
          style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
          }}
        >
          <h3>Manage Presets</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {presets.map((preset) => (
              <div
                key={preset.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  backgroundColor: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold' }}>{preset.name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    {preset.profile} • {new Date(preset.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => loadPreset(preset)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Load
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete preset "${preset.name}"?`)) {
                        deletePreset(preset.id);
                      }
                    }}
                    style={{
                      padding: '0.4rem 0.8rem',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Example 5: Integration with QualityProfileManager
 */
export function IntegratedExample() {
  const [rendererStats, setRendererStats] = React.useState({
    fps: 60,
    polyCount: 500000,
    textureMemory: 512,
    lodLevel: 0,
  });

  const { currentProfile, setProfile } = useQualityInspector({
    initialProfile: 'industrial',
  });

  const handleLODChange = (params: LODParams) => {
    console.log('Updating LOD configuration:', params);
    // In a real application, you would call your renderer's LOD system here
    // renderer.setLODConfig(params);

    // Simulate stats update
    setRendererStats((prev) => ({
      ...prev,
      lodLevel: params.enabled ? params.levels : 0,
    }));
  };

  const handleGeometryChange = (params: GeometryParams) => {
    console.log('Updating geometry configuration:', params);
    // In a real application, you would call your renderer's geometry system here
    // renderer.setMaxPolyCount(params.maxPolyCount);
    // renderer.setTextureSize(params.maxTextureSize);

    // Simulate stats update
    setRendererStats((prev) => ({
      ...prev,
      polyCount: params.maxPolyCount,
      textureMemory: params.maxTextureSize,
    }));
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Integrated Quality Management</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
        {/* Main Inspector */}
        <div>
          <QualityInspector
            currentProfile={currentProfile}
            onProfileChange={setProfile}
            onLODChange={handleLODChange}
            onGeometryChange={handleGeometryChange}
            enablePreview={true}
          />
        </div>

        {/* Stats Panel */}
        <div
          style={{
            padding: '1.5rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            height: 'fit-content',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Renderer Stats</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>FPS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{rendererStats.fps}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>Poly Count</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {(rendererStats.polyCount / 1000).toFixed(0)}K
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>Texture Memory</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {rendererStats.textureMemory}px
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>Active LOD Level</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {rendererStats.lodLevel}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * App Component - Renders All Examples
 */
export default function App() {
  const [activeExample, setActiveExample] = React.useState<number>(1);

  const examples = [
    { id: 1, name: 'Basic', component: BasicExample },
    { id: 2, name: 'Fire Effects', component: FireEffectExample },
    { id: 3, name: 'Manual Apply', component: ManualApplyExample },
    { id: 4, name: 'Full Featured', component: FullFeaturedExample },
    { id: 5, name: 'Integrated', component: IntegratedExample },
  ];

  const ActiveComponent = examples.find((ex) => ex.id === activeExample)?.component || BasicExample;

  return (
    <div>
      {/* Example Selector */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          backgroundColor: 'white',
          borderBottom: '2px solid #e0e0e0',
          padding: '1rem',
          zIndex: 100,
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ margin: '0 0 1rem 0' }}>Quality Inspector Examples</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {examples.map((example) => (
              <button
                key={example.id}
                onClick={() => setActiveExample(example.id)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: activeExample === example.id ? '#3b82f6' : '#f5f5f5',
                  color: activeExample === example.id ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: activeExample === example.id ? 'bold' : 'normal',
                }}
              >
                {example.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Example */}
      <ActiveComponent />
    </div>
  );
}
