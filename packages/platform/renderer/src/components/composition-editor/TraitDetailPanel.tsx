/**
 * Trait Detail Panel Component
 *
 * Shows detailed information about a selected trait including:
 * - Documentation and rationale
 * - Configuration properties with hints
 * - Usage examples
 * - Add/Remove trait button
 */

import React, { useState } from 'react';
import type { TraitRecommendation, ConfiguredTrait } from './types';
import styles from './TraitDetailPanel.module.css';

interface TraitDetailPanelProps {
  /** Selected trait name */
  traitName: string | null;
  /** Trait recommendation data from the selected vertical */
  traitData: TraitRecommendation | null;
  /** Currently configured trait (if already applied) */
  configuredTrait: ConfiguredTrait | null;
  /** Source vertical ID */
  sourceVertical: string;
  /** Callback to add trait to composition */
  onAddTrait: (trait: ConfiguredTrait) => void;
  /** Callback to remove trait from composition */
  onRemoveTrait: (traitName: string) => void;
  /** Callback to update trait configuration */
  onUpdateConfig: (traitName: string, config: Record<string, unknown>) => void;
}

export const TraitDetailPanel: React.FC<TraitDetailPanelProps> = ({
  traitName,
  traitData,
  configuredTrait,
  sourceVertical,
  onAddTrait,
  onRemoveTrait,
  onUpdateConfig,
}) => {
  const [configText, setConfigText] = useState(() => {
    if (configuredTrait) {
      return JSON.stringify(configuredTrait.config, null, 2);
    }
    if (traitData) {
      // Parse config hint to create initial config
      try {
        const parsed: Record<string, unknown> = {};
        traitData.configHint.split(',').forEach((pair) => {
          const [key, value] = pair.split(':').map((s) => s.trim());
          if (key && value) {
            // Try to parse value as JSON
            try {
              parsed[key] = JSON.parse(value);
            } catch {
              // Keep as string if not valid JSON
              parsed[key] = value.replace(/"/g, '');
            }
          }
        });
        return JSON.stringify(parsed, null, 2);
      } catch {
        return '{}';
      }
    }
    return '{}';
  });

  const isApplied = configuredTrait !== null;

  const handleAddTrait = () => {
    if (!traitName) return;
    try {
      const config = JSON.parse(configText);
      onAddTrait({
        name: traitName,
        config,
        sourceVertical,
      });
    } catch (error) {
      alert('Invalid JSON configuration. Please fix syntax errors.');
    }
  };

  const handleRemoveTrait = () => {
    if (!traitName) return;
    onRemoveTrait(traitName);
  };

  const handleUpdateConfig = () => {
    if (!traitName) return;
    try {
      const config = JSON.parse(configText);
      onUpdateConfig(traitName, config);
    } catch (error) {
      alert('Invalid JSON configuration. Please fix syntax errors.');
    }
  };

  if (!traitName || !traitData) {
    return (
      <div className={styles.panel}>
        <div className={styles.emptyState}>
          <p>Select a trait from the matrix to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.traitName}>{traitName}</h3>
        <div className={styles.relevanceBadge}>
          Relevance: {(traitData.relevance * 100).toFixed(0)}%
        </div>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Rationale</h4>
        <p className={styles.rationale}>{traitData.rationale}</p>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Configuration</h4>
        <div className={styles.configHint}>
          <strong>Recommended properties:</strong> {traitData.configHint}
        </div>
        <textarea
          className={styles.configEditor}
          value={configText}
          onChange={(e) => setConfigText(e.target.value)}
          placeholder="Enter trait configuration as JSON"
          rows={10}
          aria-label="Trait configuration editor"
        />
        {isApplied && (
          <button
            className={styles.updateButton}
            onClick={handleUpdateConfig}
            type="button"
          >
            Update Configuration
          </button>
        )}
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Usage Example</h4>
        <pre className={styles.codeExample}>
          {`object MyObject {
  ${traitName}
    ${traitData.configHint
      .split(',')
      .map((prop) => prop.trim())
      .join('\n    ')}
}`}
        </pre>
      </div>

      <div className={styles.actions}>
        {isApplied ? (
          <button
            className={styles.removeButton}
            onClick={handleRemoveTrait}
            type="button"
          >
            Remove from Composition
          </button>
        ) : (
          <button
            className={styles.addButton}
            onClick={handleAddTrait}
            type="button"
          >
            Add to Composition
          </button>
        )}
      </div>
    </div>
  );
};
