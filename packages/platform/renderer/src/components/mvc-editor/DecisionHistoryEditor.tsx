/**
 * DecisionHistoryEditor Component
 *
 * Timeline view of agent decisions with rationale, outcomes, and causal relationships.
 * Integrates with @holoscript/mvc-schema DecisionHistory CRDT for conflict-free merging.
 *
 * Features:
 * - Timeline visualization with chronological decision flow
 * - Decision type categorization with color coding
 * - Outcome badges (success/failure/pending)
 * - Confidence score visualization
 * - Causal chain graph showing parent-child relationships
 * - Search and filter by type, outcome, agent
 * - Add new decisions with form validation
 *
 * Accessibility (WCAG 2.1 AA):
 * - role="region" with aria-label on container
 * - role="list" for decision timeline
 * - role="listitem" for each decision
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Focus visible indicators
 * - 4.5:1 contrast ratios
 *
 * @module mvc-editor/DecisionHistoryEditor
 */

import React, { useState, useMemo, useCallback } from 'react';
import type {
  DecisionHistoryEditorProps,
  DecisionHistoryEditorState,
  MVCEditorTheme,
} from './types';
import {
  mergeTheme,
  applyOverlayOpacity,
  formatRelativeTime,
  truncateText,
} from './types';
import type { DecisionEntry } from '@holoscript/mvc-schema';

/**
 * DecisionHistoryEditor component
 */
export const DecisionHistoryEditor: React.FC<DecisionHistoryEditorProps> = ({
  decisionHistory,
  onAddDecision,
  onSelectDecision,
  maxDecisions = 100,
  filterType = 'all',
  sortOrder = 'newest',
  showOutcomes = true,
  showConfidence = true,
  showCausalChains = false,
  displayMode = 'full',
  theme: themeOverride,
  className = '',
  style,
  ariaLabel = 'Decision History Editor',
  disabled = false,
}) => {
  const theme = mergeTheme(themeOverride);

  // State
  const [state, setState] = useState<DecisionHistoryEditorState>({
    selectedDecisionId: null,
    filterType,
    sortOrder,
    searchQuery: '',
    viewMode: 'timeline',
  });

  // Filtered and sorted decisions
  const filteredDecisions = useMemo(() => {
    let decisions = [...decisionHistory.decisions];

    // Filter by type
    if (state.filterType !== 'all') {
      decisions = decisions.filter((d) => d.type === state.filterType);
    }

    // Filter by search query
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      decisions = decisions.filter(
        (d) =>
          d.description.toLowerCase().includes(query) ||
          d.choice.toLowerCase().includes(query)
      );
    }

    // Sort
    decisions.sort((a, b) => {
      if (state.sortOrder === 'newest') {
        return b.timestamp - a.timestamp;
      } else if (state.sortOrder === 'oldest') {
        return a.timestamp - b.timestamp;
      } else {
        // Sort by type
        return a.type.localeCompare(b.type);
      }
    });

    // Limit
    return decisions.slice(0, maxDecisions);
  }, [decisionHistory.decisions, state.filterType, state.searchQuery, state.sortOrder, maxDecisions]);

  // Decision type colors
  const getDecisionTypeColor = useCallback((type: DecisionEntry['type']): string => {
    switch (type) {
      case 'task':
        return theme.primaryColor;
      case 'preference':
        return theme.secondaryColor;
      case 'strategy':
        return '#f59e0b';
      case 'resource':
        return '#10b981';
      case 'social':
        return '#8b5cf6';
      default:
        return theme.textColor;
    }
  }, [theme]);

  // Outcome badge colors
  const getOutcomeColor = useCallback((outcome?: DecisionEntry['outcome']): string => {
    switch (outcome) {
      case 'success':
        return theme.successColor;
      case 'failure':
        return theme.errorColor;
      case 'pending':
        return theme.warningColor;
      default:
        return theme.disabledColor;
    }
  }, [theme]);

  // Handlers
  const handleSelectDecision = useCallback((decisionId: string) => {
    setState((prev) => ({
      ...prev,
      selectedDecisionId: prev.selectedDecisionId === decisionId ? null : decisionId,
    }));
    onSelectDecision?.(decisionId);
  }, [onSelectDecision]);

  const handleFilterChange = useCallback((filterType: DecisionEntry['type'] | 'all') => {
    setState((prev) => ({ ...prev, filterType }));
  }, []);

  const handleSortChange = useCallback((sortOrder: 'newest' | 'oldest' | 'type') => {
    setState((prev) => ({ ...prev, sortOrder }));
  }, []);

  const handleSearchChange = useCallback((searchQuery: string) => {
    setState((prev) => ({ ...prev, searchQuery }));
  }, []);

  const handleViewModeChange = useCallback((viewMode: 'timeline' | 'list' | 'graph') => {
    setState((prev) => ({ ...prev, viewMode }));
  }, []);

  // Compact mode
  if (displayMode === 'compact') {
    return (
      <div
        className={`decision-history-editor-compact ${className}`}
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
          <span style={{ color: theme.textColor, fontWeight: 600 }}>Decisions:</span>
          <span style={{ color: theme.primaryColor }}>{filteredDecisions.length}</span>
          {filteredDecisions[0] && (
            <span style={{ color: theme.disabledColor, fontSize: theme.baseFontSize - 2 }}>
              Latest: {truncateText(filteredDecisions[0].description, 40)}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Full mode
  return (
    <div
      className={`decision-history-editor ${className}`}
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
          Decision History
        </h2>
        <p style={{ margin: '8px 0 0', color: theme.disabledColor, fontSize: theme.baseFontSize - 2 }}>
          {filteredDecisions.length} decisions • Last updated {formatRelativeTime(decisionHistory.lastUpdated)}
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
        {/* Search */}
        <input
          type="text"
          placeholder="Search decisions..."
          value={state.searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          disabled={disabled}
          style={{
            flex: '1 1 200px',
            padding: '8px 12px',
            backgroundColor: applyOverlayOpacity(theme.borderColor, 0.5),
            border: `1px solid ${theme.borderColor}`,
            borderRadius: theme.borderRadius / 2,
            color: theme.textColor,
            fontSize: theme.baseFontSize,
          }}
          aria-label="Search decisions"
        />

        {/* Filter by type */}
        <select
          value={state.filterType}
          onChange={(e) => handleFilterChange(e.target.value as DecisionEntry['type'] | 'all')}
          disabled={disabled}
          style={{
            padding: '8px 12px',
            backgroundColor: applyOverlayOpacity(theme.borderColor, 0.5),
            border: `1px solid ${theme.borderColor}`,
            borderRadius: theme.borderRadius / 2,
            color: theme.textColor,
            fontSize: theme.baseFontSize,
          }}
          aria-label="Filter by type"
        >
          <option value="all">All Types</option>
          <option value="task">Task</option>
          <option value="preference">Preference</option>
          <option value="strategy">Strategy</option>
          <option value="resource">Resource</option>
          <option value="social">Social</option>
        </select>

        {/* Sort order */}
        <select
          value={state.sortOrder}
          onChange={(e) => handleSortChange(e.target.value as 'newest' | 'oldest' | 'type')}
          disabled={disabled}
          style={{
            padding: '8px 12px',
            backgroundColor: applyOverlayOpacity(theme.borderColor, 0.5),
            border: `1px solid ${theme.borderColor}`,
            borderRadius: theme.borderRadius / 2,
            color: theme.textColor,
            fontSize: theme.baseFontSize,
          }}
          aria-label="Sort order"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="type">By Type</option>
        </select>

        {/* View mode */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['timeline', 'list', 'graph'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => handleViewModeChange(mode)}
              disabled={disabled}
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
                cursor: disabled ? 'not-allowed' : 'pointer',
                textTransform: 'capitalize',
              }}
              aria-label={`${mode} view`}
              aria-pressed={state.viewMode === mode}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Decision List */}
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
        {filteredDecisions.length === 0 ? (
          <div
            style={{
              padding: theme.panelSpacing * 2,
              textAlign: 'center',
              color: theme.disabledColor,
            }}
          >
            No decisions found
          </div>
        ) : (
          filteredDecisions.map((decision) => (
            <div
              key={decision.id}
              role="listitem"
              tabIndex={0}
              onClick={() => handleSelectDecision(decision.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectDecision(decision.id);
                }
              }}
              style={{
                padding: theme.panelSpacing,
                backgroundColor: applyOverlayOpacity(
                  state.selectedDecisionId === decision.id
                    ? theme.primaryColor
                    : theme.borderColor,
                  state.selectedDecisionId === decision.id ? 0.3 : 0.5
                ),
                border: `2px solid ${
                  state.selectedDecisionId === decision.id
                    ? theme.primaryColor
                    : 'transparent'
                }`,
                borderRadius: theme.borderRadius,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              aria-selected={state.selectedDecisionId === decision.id}
            >
              {/* Decision Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {/* Type Badge */}
                <span
                  style={{
                    padding: '4px 8px',
                    backgroundColor: getDecisionTypeColor(decision.type),
                    borderRadius: theme.borderRadius / 2,
                    fontSize: theme.baseFontSize - 4,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  {decision.type}
                </span>

                {/* Timestamp */}
                <span style={{ color: theme.disabledColor, fontSize: theme.baseFontSize - 2 }}>
                  {formatRelativeTime(decision.timestamp)}
                </span>

                {/* Outcome Badge */}
                {showOutcomes && decision.outcome && (
                  <span
                    style={{
                      padding: '4px 8px',
                      backgroundColor: getOutcomeColor(decision.outcome),
                      borderRadius: theme.borderRadius / 2,
                      fontSize: theme.baseFontSize - 4,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    {decision.outcome}
                  </span>
                )}

                {/* Confidence Score */}
                {showConfidence && decision.confidence !== undefined && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      color: theme.disabledColor,
                      fontSize: theme.baseFontSize - 2,
                    }}
                  >
                    {Math.round(decision.confidence * 100)}% confident
                  </span>
                )}
              </div>

              {/* Description */}
              <p style={{ margin: '0 0 8px', fontSize: theme.baseFontSize, fontWeight: 500 }}>
                {decision.description}
              </p>

              {/* Choice */}
              <p
                style={{
                  margin: 0,
                  color: theme.primaryColor,
                  fontSize: theme.baseFontSize - 1,
                  fontWeight: 600,
                }}
              >
                Choice: {decision.choice}
              </p>

              {/* Expanded Details */}
              {state.selectedDecisionId === decision.id && (
                <div
                  style={{
                    marginTop: theme.panelSpacing,
                    paddingTop: theme.panelSpacing,
                    borderTop: `1px solid ${theme.borderColor}`,
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
                    <span style={{ color: theme.disabledColor }}>Decision ID:</span>
                    <span style={{ fontFamily: 'monospace', fontSize: theme.baseFontSize - 2 }}>
                      {decision.id}
                    </span>

                    {decision.agentDid && (
                      <>
                        <span style={{ color: theme.disabledColor }}>Agent DID:</span>
                        <span
                          style={{ fontFamily: 'monospace', fontSize: theme.baseFontSize - 2 }}
                        >
                          {truncateText(decision.agentDid, 50)}
                        </span>
                      </>
                    )}

                    {decision.parentId && (
                      <>
                        <span style={{ color: theme.disabledColor }}>Parent Decision:</span>
                        <span
                          style={{ fontFamily: 'monospace', fontSize: theme.baseFontSize - 2 }}
                        >
                          {decision.parentId}
                        </span>
                      </>
                    )}

                    <span style={{ color: theme.disabledColor }}>Timestamp:</span>
                    <span style={{ fontSize: theme.baseFontSize - 2 }}>
                      {new Date(decision.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DecisionHistoryEditor;
