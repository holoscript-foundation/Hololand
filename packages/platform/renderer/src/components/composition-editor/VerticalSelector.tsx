/**
 * Vertical Selector Component
 *
 * Dropdown selector for filtering the trait matrix by industry vertical.
 * Shows all 15 verticals with descriptions.
 */

import React from 'react';
import type { VerticalMapping } from './types';
import styles from './VerticalSelector.module.css';

interface VerticalSelectorProps {
  /** All available verticals */
  verticals: VerticalMapping[];
  /** Currently selected vertical ID (null = show all) */
  activeVertical: string | null;
  /** Callback when vertical selection changes */
  onVerticalChange: (verticalId: string | null) => void;
}

export const VerticalSelector: React.FC<VerticalSelectorProps> = ({
  verticals,
  activeVertical,
  onVerticalChange,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    onVerticalChange(value === '' ? null : value);
  };

  const selectedVertical = verticals.find((v) => v.id === activeVertical);

  return (
    <div className={styles.selectorContainer}>
      <label htmlFor="vertical-selector" className={styles.label}>
        Industry Vertical:
      </label>
      <select
        id="vertical-selector"
        className={styles.select}
        value={activeVertical || ''}
        onChange={handleChange}
        aria-label="Select industry vertical to filter traits"
      >
        <option value="">All Verticals (Show Full Matrix)</option>
        {verticals.map((vertical) => (
          <option key={vertical.id} value={vertical.id}>
            {vertical.displayName}
          </option>
        ))}
      </select>
      {selectedVertical && (
        <p className={styles.description}>{selectedVertical.description}</p>
      )}
    </div>
  );
};
