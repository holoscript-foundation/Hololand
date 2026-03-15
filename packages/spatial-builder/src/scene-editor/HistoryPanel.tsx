/**
 * @hololand/spatial-builder - HistoryPanel (Spatial Blame)
 *
 * Operations Hub component: "Git for 3D"
 * When a .holo file is loaded from a Git repo, clicking a trait (e.g., @breakable)
 * queries git blame and renders the commit hash/author who introduced that behavioral contract.
 *
 * Integrates with the SceneEditorApp as a new panel.
 */

import React, { useState, useCallback, useMemo } from 'react';

// -- Types --

export interface BlameEntry {
  /** Line number in the .holo file */
  line: number;
  /** Short commit hash (8 chars) */
  commitHash: string;
  /** Full commit hash */
  commitHashFull: string;
  /** Author name */
  author: string;
  /** Author email */
  authorEmail: string;
  /** Commit timestamp (ISO 8601) */
  timestamp: string;
  /** Commit summary message */
  summary: string;
  /** The source line content */
  content: string;
  /** Detected trait name (if line contains a trait) */
  traitName?: string;
}

export interface DiffEntry {
  /** Object name that changed */
  objectName: string;
  /** Type of change */
  changeType: 'added' | 'removed' | 'modified';
  /** Properties that changed */
  properties: string[];
  /** Before value (for modified) */
  before?: string;
  /** After value (for modified) */
  after?: string;
  /** Commit hash */
  commitHash: string;
}

export interface HistoryPanelProps {
  /** Blame data for the currently loaded .holo file */
  blameEntries: BlameEntry[];
  /** Diff entries for visual comparison */
  diffEntries: DiffEntry[];
  /** Currently selected trait/line in the editor */
  selectedLine?: number;
  /** Callback when user clicks a blame entry to highlight in 3D */
  onBlameSelect?: (entry: BlameEntry) => void;
  /** Callback when user wants to see visual diff in the 3D canvas */
  onShowDiff?: (entry: DiffEntry) => void;
  /** Whether the panel is in loading state */
  loading?: boolean;
  /** The .holo file path being inspected */
  filePath?: string;
}

// -- Component --

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  blameEntries,
  diffEntries,
  selectedLine,
  onBlameSelect,
  onShowDiff,
  loading = false,
  filePath,
}) => {
  const [activeTab, setActiveTab] = useState<'blame' | 'diff'>('blame');
  const [filterTrait, setFilterTrait] = useState<string>('');

  const uniqueTraits = useMemo(() => {
    const traits = new Set<string>();
    blameEntries.forEach((e) => {
      if (e.traitName) traits.add(e.traitName);
    });
    return Array.from(traits).sort();
  }, [blameEntries]);

  const filteredBlame = useMemo(() => {
    if (!filterTrait) return blameEntries;
    return blameEntries.filter((e) => e.traitName === filterTrait);
  }, [blameEntries, filterTrait]);

  const handleBlameClick = useCallback(
    (entry: BlameEntry) => {
      onBlameSelect?.(entry);
    },
    [onBlameSelect]
  );

  const handleDiffClick = useCallback(
    (entry: DiffEntry) => {
      onShowDiff?.(entry);
    },
    [onShowDiff]
  );

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#0f0f1a',
        color: '#e0e0e0',
        fontSize: '12px',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #2a2a3e',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '13px' }}>Spatial Blame</span>
        {filePath && (
          <span style={{ color: '#888', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {filePath}
          </span>
        )}
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #2a2a3e' }}>
        <button
          onClick={() => setActiveTab('blame')}
          style={{
            flex: 1,
            padding: '6px',
            background: activeTab === 'blame' ? '#1a1a2e' : 'transparent',
            color: activeTab === 'blame' ? '#6366f1' : '#888',
            border: 'none',
            borderBottom: activeTab === 'blame' ? '2px solid #6366f1' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          Blame ({filteredBlame.length})
        </button>
        <button
          onClick={() => setActiveTab('diff')}
          style={{
            flex: 1,
            padding: '6px',
            background: activeTab === 'diff' ? '#1a1a2e' : 'transparent',
            color: activeTab === 'diff' ? '#6366f1' : '#888',
            border: 'none',
            borderBottom: activeTab === 'diff' ? '2px solid #6366f1' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          3D Diff ({diffEntries.length})
        </button>
      </div>

      {/* Trait Filter */}
      {activeTab === 'blame' && uniqueTraits.length > 0 && (
        <div style={{ padding: '6px 12px', borderBottom: '1px solid #1a1a2e' }}>
          <select
            value={filterTrait}
            onChange={(e) => setFilterTrait(e.target.value)}
            style={{
              width: '100%',
              padding: '4px',
              background: '#1a1a2e',
              color: '#e0e0e0',
              border: '1px solid #2a2a3e',
              borderRadius: '4px',
              fontSize: '11px',
            }}
          >
            <option value="">All traits</option>
            {uniqueTraits.map((t) => (
              <option key={t} value={t}>
                @{t}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            Loading git history...
          </div>
        ) : activeTab === 'blame' ? (
          filteredBlame.map((entry, i) => (
            <div
              key={entry.commitHash + '-' + entry.line}
              onClick={() => handleBlameClick(entry)}
              style={{
                display: 'flex',
                padding: '4px 8px',
                cursor: 'pointer',
                background:
                  selectedLine === entry.line
                    ? '#6366f133'
                    : i % 2 === 0
                    ? '#0f0f1a'
                    : '#12121e',
                borderLeft:
                  selectedLine === entry.line
                    ? '3px solid #6366f1'
                    : '3px solid transparent',
              }}
            >
              <span style={{ width: '30px', color: '#555', textAlign: 'right', marginRight: '8px', flexShrink: 0 }}>
                {entry.line}
              </span>
              <span style={{ width: '65px', color: '#f59e0b', fontWeight: 500, flexShrink: 0 }}>
                {entry.commitHash}
              </span>
              <span style={{ width: '60px', color: '#22c55e', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {entry.author}
              </span>
              <span style={{ width: '55px', color: '#666', flexShrink: 0 }}>
                {formatTimestamp(entry.timestamp)}
              </span>
              <span style={{ flex: 1, color: entry.traitName ? '#a78bfa' : '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.content.trim()}
              </span>
            </div>
          ))
        ) : (
          diffEntries.map((entry, i) => (
            <div
              key={entry.commitHash + '-' + entry.objectName + '-' + i}
              onClick={() => handleDiffClick(entry)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid #1a1a2e',
                background: '#0f0f1a',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    fontWeight: 600,
                    background:
                      entry.changeType === 'added'
                        ? '#22c55e33'
                        : entry.changeType === 'removed'
                        ? '#ef444433'
                        : '#f59e0b33',
                    color:
                      entry.changeType === 'added'
                        ? '#22c55e'
                        : entry.changeType === 'removed'
                        ? '#ef4444'
                        : '#f59e0b',
                  }}
                >
                  {entry.changeType.toUpperCase()}
                </span>
                <span style={{ fontWeight: 600 }}>{entry.objectName}</span>
                <span style={{ color: '#666', fontSize: '10px' }}>{entry.commitHash}</span>
              </div>
              {entry.properties.length > 0 && (
                <div style={{ marginTop: '4px', color: '#888', fontSize: '11px' }}>
                  {entry.properties.join(', ')}
                </div>
              )}
              {entry.changeType === 'modified' && entry.before && entry.after && (
                <div style={{ marginTop: '4px', fontSize: '11px' }}>
                  <span style={{ color: '#ef4444' }}>- {entry.before}</span>
                  <br />
                  <span style={{ color: '#22c55e' }}>+ {entry.after}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
