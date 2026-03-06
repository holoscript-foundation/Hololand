/**
 * ChunkBreakdown Component
 *
 * Displays a detailed breakdown of all bundle chunks with size,
 * budget utilization, category, and delta from previous build.
 * Chunks are sorted by size (largest first) with budget status
 * color-coding.
 *
 * @module bundle-monitor/ChunkBreakdown
 */

import React, { useMemo, useState } from 'react';
import type {
  BundleChunk,
  ChunkCategory,
  BundleMonitorTheme,
} from './types';
import {
  CHUNK_CATEGORY_CONFIG,
  getBudgetStatusColor,
  formatSize,
} from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface ChunkBreakdownProps {
  /** Bundle chunks */
  chunks: BundleChunk[];
  /** Theme */
  theme: BundleMonitorTheme;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
}

type SortField = 'name' | 'gzipSize' | 'budgetUtilization' | 'delta';

// =============================================================================
// COMPONENT
// =============================================================================

export const ChunkBreakdown: React.FC<ChunkBreakdownProps> = ({
  chunks,
  theme,
  className,
  style,
}) => {
  const [sortField, setSortField] = useState<SortField>('gzipSize');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedChunk, setExpandedChunk] = useState<string | null>(null);

  const sortedChunks = useMemo(() => {
    return [...chunks].sort((a, b) => {
      let cmp: number;
      switch (sortField) {
        case 'name':
          cmp = a.displayName.localeCompare(b.displayName);
          break;
        case 'gzipSize':
          cmp = a.gzipSize - b.gzipSize;
          break;
        case 'budgetUtilization':
          cmp = (a.budgetBytes > 0 ? a.gzipSize / a.budgetBytes : 0) -
                (b.budgetBytes > 0 ? b.gzipSize / b.budgetBytes : 0);
          break;
        case 'delta':
          cmp = a.deltaBytes - b.deltaBytes;
          break;
        default:
          cmp = 0;
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [chunks, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const toggleExpand = (chunkName: string) => {
    setExpandedChunk((prev) => (prev === chunkName ? null : chunkName));
  };

  return (
    <div
      className={className}
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
        ...style,
      }}
      role="region"
      aria-label="Bundle chunk breakdown"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
        }}
      >
        <span
          style={{
            fontSize: `calc(0.75rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: theme.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Chunks ({chunks.length})
        </span>
      </div>

      {/* Column headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 70px 80px 60px 60px',
          gap: '0.3rem',
          padding: '0.25rem 0.4rem',
          borderBottom: `1px solid ${theme.borderColor}`,
          marginBottom: '0.25rem',
        }}
      >
        <SortHeader
          label="Chunk"
          field="name"
          currentField={sortField}
          sortAsc={sortAsc}
          onClick={handleSort}
          theme={theme}
        />
        <SortHeader
          label="Gzip"
          field="gzipSize"
          currentField={sortField}
          sortAsc={sortAsc}
          onClick={handleSort}
          theme={theme}
          align="right"
        />
        <SortHeader
          label="Budget"
          field="budgetUtilization"
          currentField={sortField}
          sortAsc={sortAsc}
          onClick={handleSort}
          theme={theme}
          align="right"
        />
        <SortHeader
          label="Delta"
          field="delta"
          currentField={sortField}
          sortAsc={sortAsc}
          onClick={handleSort}
          theme={theme}
          align="right"
        />
        <span
          style={{
            fontSize: `calc(0.55rem * ${theme.fontScale})`,
            color: theme.textMuted,
            textAlign: 'right',
          }}
        >
          Type
        </span>
      </div>

      {/* Chunk rows */}
      <div
        role="list"
        aria-label="Bundle chunks"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.1rem',
          maxHeight: '300px',
          overflowY: 'auto',
        }}
      >
        {sortedChunks.map((chunk) => (
          <ChunkRow
            key={chunk.name}
            chunk={chunk}
            isExpanded={chunk.name === expandedChunk}
            onToggle={() => toggleExpand(chunk.name)}
            theme={theme}
          />
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SortHeaderProps {
  label: string;
  field: SortField;
  currentField: SortField;
  sortAsc: boolean;
  onClick: (field: SortField) => void;
  theme: BundleMonitorTheme;
  align?: 'left' | 'right';
}

const SortHeader: React.FC<SortHeaderProps> = ({
  label,
  field,
  currentField,
  sortAsc,
  onClick,
  theme,
  align = 'left',
}) => {
  const isActive = field === currentField;
  return (
    <button
      type="button"
      onClick={() => onClick(field)}
      style={{
        fontSize: `calc(0.55rem * ${theme.fontScale})`,
        fontWeight: isActive ? 700 : 500,
        fontFamily: theme.fontFamily,
        color: isActive ? theme.accentColor : theme.textMuted,
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        textAlign: align,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
      aria-label={`Sort by ${label}`}
    >
      {label}
      {isActive && (
        <span style={{ marginLeft: '0.15rem' }}>
          {sortAsc ? '\u2191' : '\u2193'}
        </span>
      )}
    </button>
  );
};

interface ChunkRowProps {
  chunk: BundleChunk;
  isExpanded: boolean;
  onToggle: () => void;
  theme: BundleMonitorTheme;
}

const ChunkRow: React.FC<ChunkRowProps> = ({
  chunk,
  isExpanded,
  onToggle,
  theme,
}) => {
  const budgetPct = chunk.budgetBytes > 0 ? chunk.gzipSize / chunk.budgetBytes : 0;
  const statusColor = getBudgetStatusColor(chunk.budgetStatus, theme);
  const categoryConfig = CHUNK_CATEGORY_CONFIG[chunk.category];
  const deltaColor = chunk.deltaBytes > 0
    ? theme.exceededColor
    : chunk.deltaBytes < 0
      ? theme.okColor
      : theme.textMuted;

  return (
    <div
      role="listitem"
      style={{
        borderRadius: '4px',
        backgroundColor: isExpanded ? `${theme.accentColor}08` : 'transparent',
        transition: 'background-color 0.1s ease',
      }}
    >
      {/* Main row */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 70px 80px 60px 60px',
          gap: '0.3rem',
          alignItems: 'center',
          padding: '0.25rem 0.4rem',
          cursor: 'pointer',
          fontSize: `calc(0.65rem * ${theme.fontScale})`,
        }}
        aria-expanded={isExpanded}
        aria-label={`${chunk.displayName}: ${formatSize(chunk.gzipSize)}`}
      >
        {/* Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', minWidth: 0 }}>
          <span
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              backgroundColor: statusColor,
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
          <span
            style={{
              color: theme.textPrimary,
              fontFamily: theme.monoFontFamily,
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {chunk.displayName}
          </span>
          {chunk.isEntry && (
            <span
              style={{
                fontSize: `calc(0.45rem * ${theme.fontScale})`,
                color: theme.accentColor,
                border: `1px solid ${theme.accentColor}40`,
                borderRadius: '2px',
                padding: '0 0.1rem',
                flexShrink: 0,
              }}
            >
              entry
            </span>
          )}
          {chunk.isLazy && (
            <span
              style={{
                fontSize: `calc(0.45rem * ${theme.fontScale})`,
                color: theme.warningColor,
                border: `1px solid ${theme.warningColor}40`,
                borderRadius: '2px',
                padding: '0 0.1rem',
                flexShrink: 0,
              }}
            >
              lazy
            </span>
          )}
        </div>

        {/* Gzip size */}
        <span
          style={{
            textAlign: 'right',
            fontFamily: theme.monoFontFamily,
            color: statusColor,
            fontWeight: 600,
          }}
        >
          {formatSize(chunk.gzipSize)}
        </span>

        {/* Budget bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'flex-end' }}>
          <div
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              backgroundColor: theme.borderColor,
              overflow: 'hidden',
              maxWidth: '40px',
            }}
            role="meter"
            aria-label={`Budget utilization: ${(budgetPct * 100).toFixed(0)}%`}
            aria-valuenow={Math.round(budgetPct * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(budgetPct * 100, 100)}%`,
                backgroundColor: statusColor,
                borderRadius: '2px',
              }}
            />
          </div>
          <span
            style={{
              fontSize: `calc(0.55rem * ${theme.fontScale})`,
              color: statusColor,
              fontWeight: 500,
              minWidth: '30px',
              textAlign: 'right',
            }}
          >
            {(budgetPct * 100).toFixed(0)}%
          </span>
        </div>

        {/* Delta */}
        <span
          style={{
            textAlign: 'right',
            fontFamily: theme.monoFontFamily,
            color: deltaColor,
            fontSize: `calc(0.55rem * ${theme.fontScale})`,
          }}
        >
          {chunk.deltaBytes > 0 ? '+' : ''}{chunk.deltaBytes !== 0 ? formatSize(Math.abs(chunk.deltaBytes)) : '--'}
        </span>

        {/* Category */}
        <span
          style={{
            textAlign: 'right',
            fontSize: `calc(0.5rem * ${theme.fontScale})`,
            color: categoryConfig.color,
          }}
        >
          {categoryConfig.label}
        </span>
      </div>

      {/* Expanded detail */}
      {isExpanded && chunk.topModules.length > 0 && (
        <div
          style={{
            padding: '0.3rem 0.4rem 0.3rem 1.2rem',
            borderTop: `1px solid ${theme.borderColor}`,
          }}
        >
          <div
            style={{
              fontSize: `calc(0.55rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: theme.textMuted,
              textTransform: 'uppercase',
              marginBottom: '0.2rem',
            }}
          >
            Top Modules
          </div>
          {chunk.topModules.map((mod) => (
            <div
              key={mod.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: `calc(0.55rem * ${theme.fontScale})`,
                padding: '0.1rem 0',
              }}
            >
              <span
                style={{
                  flex: 1,
                  color: theme.textSecondary,
                  fontFamily: theme.monoFontFamily,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {mod.name}
              </span>
              <span style={{ color: theme.textMuted, flexShrink: 0 }}>
                {formatSize(mod.size)}
              </span>
              <span style={{ color: theme.textMuted, flexShrink: 0, minWidth: '32px', textAlign: 'right' }}>
                {mod.percentage.toFixed(0)}%
              </span>
            </div>
          ))}
          <div
            style={{
              marginTop: '0.2rem',
              fontSize: `calc(0.5rem * ${theme.fontScale})`,
              color: theme.textMuted,
            }}
          >
            Raw: {formatSize(chunk.rawSize)}
            {chunk.brotliSize !== undefined && ` | Brotli: ${formatSize(chunk.brotliSize)}`}
            {' '}| Budget: {formatSize(chunk.budgetBytes)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChunkBreakdown;
