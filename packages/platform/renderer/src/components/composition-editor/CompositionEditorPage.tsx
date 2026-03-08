/**
 * Composition Editor Page
 *
 * Main page component that integrates all composition editor components:
 * - Vertical selector
 * - Vertical-trait matrix
 * - Trait detail panel
 * - Composition preview
 * - Code generator
 * - Import/export functionality
 */

import React, { useReducer, useState, useCallback, useMemo } from 'react';
import { VerticalSelector } from './VerticalSelector';
import { VerticalTraitMatrix } from './VerticalTraitMatrix';
import { TraitDetailPanel } from './TraitDetailPanel';
import { CompositionPreview } from './CompositionPreview';
import { HoloCodeGenerator } from './HoloCodeGenerator';
import { editorReducer, initialEditorState } from './editorReducer';
import { VERTICAL_MAPPINGS } from './traitVerticalData-full';
import type { ConfiguredTrait, Composition } from './types';
import styles from './CompositionEditorPage.module.css';

export const CompositionEditorPage: React.FC = () => {
  const [state, dispatch] = useReducer(editorReducer, initialEditorState);
  const [searchQuery, setSearchQuery] = useState('');

  // Get applied traits as a Set for quick lookup
  const appliedTraits = useMemo(() => {
    return new Set(state.composition.traits.map((t) => t.name));
  }, [state.composition.traits]);

  // Get the currently configured trait (if selected trait is applied)
  const configuredTrait = useMemo(() => {
    if (!state.selectedTrait) return null;
    return (
      state.composition.traits.find((t) => t.name === state.selectedTrait) ||
      null
    );
  }, [state.selectedTrait, state.composition.traits]);

  // Get trait data for the selected trait
  const selectedTraitData = useMemo(() => {
    if (!state.selectedTrait || !state.activeVertical) return null;
    const vertical = VERTICAL_MAPPINGS.find(
      (v) => v.id === state.activeVertical
    );
    if (!vertical) return null;
    return (
      vertical.traits.find((t) => t.trait === state.selectedTrait) || null
    );
  }, [state.selectedTrait, state.activeVertical]);

  const handleVerticalChange = useCallback((verticalId: string | null) => {
    dispatch({ type: 'SET_VERTICAL', vertical: verticalId });
  }, []);

  const handleTraitClick = useCallback(
    (traitName: string, verticalId: string) => {
      dispatch({ type: 'SELECT_TRAIT', trait: traitName });
      // Also set active vertical to the source vertical
      if (state.activeVertical !== verticalId) {
        dispatch({ type: 'SET_VERTICAL', vertical: verticalId });
      }
    },
    [state.activeVertical]
  );

  const handleAddTrait = useCallback((trait: ConfiguredTrait) => {
    dispatch({ type: 'ADD_TRAIT', trait });
  }, []);

  const handleRemoveTrait = useCallback((traitName: string) => {
    dispatch({ type: 'REMOVE_TRAIT', traitName });
  }, []);

  const handleUpdateTraitConfig = useCallback(
    (traitName: string, config: Record<string, unknown>) => {
      dispatch({ type: 'UPDATE_TRAIT_CONFIG', traitName, config });
    },
    []
  );

  const handleExport = useCallback((code: string, filename: string) => {
    // Create a Blob and download it
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file extension
      if (!file.name.endsWith('.holo')) {
        alert('Please select a .holo file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content) return;

        // Parse the .holo file (simplified parser)
        try {
          const parsed = parseHoloFile(content);
          dispatch({ type: 'LOAD_COMPOSITION', composition: parsed });
          alert('Composition imported successfully!');
        } catch (error) {
          console.error('Failed to parse .holo file:', error);
          alert('Failed to parse .holo file. Please check the file format.');
        }
      };
      reader.readAsText(file);
    },
    []
  );

  const handleReset = useCallback(() => {
    if (confirm('Reset composition? This will clear all traits.')) {
      dispatch({ type: 'RESET' });
    }
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <h1 className={styles.pageTitle}>HoloScript Composition Editor</h1>
          <p className={styles.pageDescription}>
            Visual editor for creating HoloScript compositions with trait
            recommendations from 15 industry verticals.
          </p>
        </div>
        <div className={styles.headerActions}>
          <label className={styles.importButton}>
            Import .holo
            <input
              type="file"
              accept=".holo"
              onChange={handleImport}
              className={styles.fileInput}
              aria-label="Import .holo file"
            />
          </label>
          <button
            className={styles.resetButton}
            onClick={handleReset}
            type="button"
          >
            Reset
          </button>
        </div>
      </header>

      <div className={styles.controls}>
        <VerticalSelector
          verticals={VERTICAL_MAPPINGS}
          activeVertical={state.activeVertical}
          onVerticalChange={handleVerticalChange}
        />
        <div className={styles.searchContainer}>
          <label htmlFor="trait-search" className={styles.searchLabel}>
            Search Traits:
          </label>
          <input
            id="trait-search"
            type="text"
            className={styles.searchInput}
            placeholder="Filter traits by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search traits"
          />
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.leftPanel}>
          <VerticalTraitMatrix
            verticals={VERTICAL_MAPPINGS}
            activeVertical={state.activeVertical}
            selectedTrait={state.selectedTrait}
            appliedTraits={appliedTraits}
            searchQuery={searchQuery}
            onTraitClick={handleTraitClick}
          />
        </div>

        <div className={styles.rightPanel}>
          <div className={styles.detailPanel}>
            <TraitDetailPanel
              traitName={state.selectedTrait}
              traitData={selectedTraitData}
              configuredTrait={configuredTrait}
              sourceVertical={state.activeVertical || 'unknown'}
              onAddTrait={handleAddTrait}
              onRemoveTrait={handleRemoveTrait}
              onUpdateConfig={handleUpdateTraitConfig}
            />
          </div>

          <div className={styles.previewPanel}>
            <CompositionPreview
              composition={state.composition}
              onTraitClick={(traitName) =>
                dispatch({ type: 'SELECT_TRAIT', trait: traitName })
              }
            />
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <HoloCodeGenerator
          composition={state.composition}
          onExport={handleExport}
        />
      </div>
    </div>
  );
};

/**
 * Parse a .holo file into a Composition
 * (Simplified parser - in production, use proper parser)
 */
function parseHoloFile(content: string): Composition {
  // This is a very simplified parser for demonstration
  // In production, use the actual HoloScript parser

  const objectMatch = content.match(/object\s+(\w+)\s*\{/);
  const objectId = objectMatch ? objectMatch[1] : 'imported';

  const traits: ConfiguredTrait[] = [];

  // Extract trait annotations
  const traitMatches = content.matchAll(/@(\w+)\s*\n([\s\S]*?)(?=@|\})/g);
  for (const match of traitMatches) {
    const traitName = `@${match[1]}`;
    const configBlock = match[2];

    // Parse config properties
    const config: Record<string, unknown> = {};
    const propMatches = configBlock.matchAll(/(\w+):\s*([^\n]+)/g);
    for (const propMatch of propMatches) {
      const key = propMatch[1].trim();
      const value = propMatch[2].trim();
      try {
        config[key] = JSON.parse(value);
      } catch {
        config[key] = value;
      }
    }

    traits.push({ name: traitName, config });
  }

  return {
    objectId,
    objectType: 'object',
    vertical: null,
    traits,
    metadata: {},
  };
}

export default CompositionEditorPage;
