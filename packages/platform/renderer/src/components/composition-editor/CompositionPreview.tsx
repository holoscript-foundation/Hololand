/**
 * Composition Preview Component
 *
 * Shows a live preview of the composition structure with all applied traits.
 * Displays as a hierarchical tree view showing the object and its traits.
 */

import React from 'react';
import type { Composition } from './types';
import styles from './CompositionPreview.module.css';

interface CompositionPreviewProps {
  /** Current composition being edited */
  composition: Composition;
  /** Callback when a trait is clicked in the preview */
  onTraitClick?: (traitName: string) => void;
}

export const CompositionPreview: React.FC<CompositionPreviewProps> = ({
  composition,
  onTraitClick,
}) => {
  return (
    <div className={styles.preview}>
      <div className={styles.header}>
        <h3 className={styles.title}>Composition Preview</h3>
        <div className={styles.stats}>
          <span className={styles.stat}>
            <strong>{composition.traits.length}</strong> traits applied
          </span>
          {composition.vertical && (
            <span className={styles.stat}>
              Vertical: <strong>{composition.vertical}</strong>
            </span>
          )}
        </div>
      </div>

      <div className={styles.tree}>
        <div className={styles.objectNode}>
          <div className={styles.objectHeader}>
            <span className={styles.keyword}>object</span>{' '}
            <span className={styles.identifier}>{composition.objectId}</span>
            {composition.metadata.category && (
              <span className={styles.metadata}>
                // {composition.metadata.category}
              </span>
            )}
          </div>

          {composition.traits.length === 0 ? (
            <div className={styles.emptyTraits}>
              <span className={styles.comment}>
                // No traits applied yet. Select traits from the matrix above.
              </span>
            </div>
          ) : (
            <div className={styles.traitsContainer}>
              {composition.traits.map((trait) => (
                <div
                  key={trait.name}
                  className={styles.traitNode}
                  onClick={() => onTraitClick?.(trait.name)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onTraitClick?.(trait.name);
                    }
                  }}
                >
                  <div className={styles.traitHeader}>
                    <span className={styles.traitName}>{trait.name}</span>
                    {trait.sourceVertical && (
                      <span className={styles.source}>
                        from {trait.sourceVertical}
                      </span>
                    )}
                  </div>
                  <div className={styles.traitConfig}>
                    {Object.keys(trait.config).length > 0 ? (
                      Object.entries(trait.config).map(([key, value]) => (
                        <div key={key} className={styles.configProp}>
                          <span className={styles.propKey}>{key}</span>
                          <span className={styles.propValue}>
                            {JSON.stringify(value)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className={styles.comment}>
                        // No configuration
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.objectFooter}>{'}'}</div>
        </div>
      </div>
    </div>
  );
};
