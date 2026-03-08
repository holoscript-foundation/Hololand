/**
 * Vertical-Trait Matrix Component
 *
 * Displays a 15x200+ grid showing all verticals (rows) and traits (columns)
 * with color-coded relevance scores. Users can click cells to view trait details
 * and add traits to their composition.
 */

import React, { useMemo, useCallback } from 'react';
import type { VerticalMapping, MatrixCell } from './types';
import styles from './VerticalTraitMatrix.module.css';

interface VerticalTraitMatrixProps {
  /** All vertical mappings */
  verticals: VerticalMapping[];
  /** Currently active vertical filter (null = show all) */
  activeVertical: string | null;
  /** Currently selected trait */
  selectedTrait: string | null;
  /** Traits already applied to the composition */
  appliedTraits: Set<string>;
  /** Search query for filtering traits */
  searchQuery: string;
  /** Callback when a trait cell is clicked */
  onTraitClick: (traitName: string, vertical: string) => void;
}

/**
 * Get color for relevance score (0.0-1.0)
 */
function getRelevanceColor(relevance: number): string {
  if (relevance >= 0.9) return '#2ecc71'; // High relevance - green
  if (relevance >= 0.75) return '#27ae60'; // Medium-high - dark green
  if (relevance >= 0.6) return '#f39c12'; // Medium - orange
  return '#95a5a6'; // Low - gray
}

/**
 * Get opacity for relevance score
 */
function getRelevanceOpacity(relevance: number): number {
  return 0.3 + relevance * 0.7; // Range from 0.3 to 1.0
}

export const VerticalTraitMatrix: React.FC<VerticalTraitMatrixProps> = ({
  verticals,
  activeVertical,
  selectedTrait,
  appliedTraits,
  searchQuery,
  onTraitClick,
}) => {
  // Get all unique traits across all verticals
  const allTraits = useMemo(() => {
    const traitSet = new Set<string>();
    verticals.forEach((v) => {
      v.traits.forEach((t) => traitSet.add(t.trait));
    });
    return Array.from(traitSet).sort();
  }, [verticals]);

  // Filter traits by search query
  const filteredTraits = useMemo(() => {
    if (!searchQuery) return allTraits;
    const query = searchQuery.toLowerCase();
    return allTraits.filter((trait) => trait.toLowerCase().includes(query));
  }, [allTraits, searchQuery]);

  // Filter verticals by active vertical
  const filteredVerticals = useMemo(() => {
    if (!activeVertical) return verticals;
    return verticals.filter((v) => v.id === activeVertical);
  }, [verticals, activeVertical]);

  // Build matrix cells
  const matrixData = useMemo(() => {
    const cells: MatrixCell[][] = [];
    filteredVerticals.forEach((vertical) => {
      const row: MatrixCell[] = [];
      filteredTraits.forEach((traitName) => {
        const traitRec = vertical.traits.find((t) => t.trait === traitName);
        if (traitRec) {
          row.push({
            vertical: vertical.id,
            trait: traitName,
            relevance: traitRec.relevance,
            rationale: traitRec.rationale,
            configHint: traitRec.configHint,
            isSelected: traitName === selectedTrait,
            isApplied: appliedTraits.has(traitName),
          });
        } else {
          // Trait not relevant to this vertical
          row.push({
            vertical: vertical.id,
            trait: traitName,
            relevance: 0,
            rationale: '',
            configHint: '',
            isSelected: traitName === selectedTrait,
            isApplied: appliedTraits.has(traitName),
          });
        }
      });
      cells.push(row);
    });
    return cells;
  }, [filteredVerticals, filteredTraits, selectedTrait, appliedTraits]);

  const handleCellClick = useCallback(
    (cell: MatrixCell) => {
      if (cell.relevance > 0) {
        onTraitClick(cell.trait, cell.vertical);
      }
    },
    [onTraitClick]
  );

  if (filteredTraits.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No traits match your search query.</p>
      </div>
    );
  }

  return (
    <div className={styles.matrixContainer}>
      <div className={styles.matrixScroll}>
        <table className={styles.matrix}>
          <thead>
            <tr>
              <th className={styles.verticalHeader}>Vertical</th>
              {filteredTraits.map((trait) => (
                <th key={trait} className={styles.traitHeader}>
                  <div className={styles.traitHeaderText}>{trait}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredVerticals.map((vertical, vIndex) => (
              <tr key={vertical.id}>
                <td className={styles.verticalLabel}>
                  <div className={styles.verticalLabelText}>
                    {vertical.displayName}
                  </div>
                </td>
                {matrixData[vIndex].map((cell) => (
                  <td
                    key={`${cell.vertical}-${cell.trait}`}
                    className={`${styles.matrixCell} ${
                      cell.isSelected ? styles.selected : ''
                    } ${cell.isApplied ? styles.applied : ''} ${
                      cell.relevance === 0 ? styles.irrelevant : ''
                    }`}
                    style={{
                      backgroundColor:
                        cell.relevance > 0
                          ? getRelevanceColor(cell.relevance)
                          : '#2c3e50',
                      opacity: cell.relevance > 0 ? getRelevanceOpacity(cell.relevance) : 0.1,
                    }}
                    onClick={() => handleCellClick(cell)}
                    role="button"
                    tabIndex={cell.relevance > 0 ? 0 : -1}
                    aria-label={`${cell.trait} for ${vertical.displayName}: ${
                      cell.relevance > 0
                        ? `${(cell.relevance * 100).toFixed(0)}% relevance`
                        : 'not relevant'
                    }`}
                    title={
                      cell.relevance > 0
                        ? `${cell.trait} (${(cell.relevance * 100).toFixed(0)}%)\n${cell.rationale}`
                        : `${cell.trait} - Not relevant for ${vertical.displayName}`
                    }
                  >
                    {cell.relevance > 0 && (
                      <span className={styles.relevanceScore}>
                        {(cell.relevance * 100).toFixed(0)}%
                      </span>
                    )}
                    {cell.isApplied && (
                      <span className={styles.appliedIndicator} aria-label="Applied">
                        ✓
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendTitle}>Relevance Scale:</div>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}>
            <span
              className={styles.legendColor}
              style={{ backgroundColor: '#2ecc71' }}
            />
            <span>90-100% (High)</span>
          </div>
          <div className={styles.legendItem}>
            <span
              className={styles.legendColor}
              style={{ backgroundColor: '#27ae60' }}
            />
            <span>75-89% (Medium-High)</span>
          </div>
          <div className={styles.legendItem}>
            <span
              className={styles.legendColor}
              style={{ backgroundColor: '#f39c12' }}
            />
            <span>60-74% (Medium)</span>
          </div>
          <div className={styles.legendItem}>
            <span
              className={styles.legendColor}
              style={{ backgroundColor: '#95a5a6' }}
            />
            <span>&lt;60% (Low)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
