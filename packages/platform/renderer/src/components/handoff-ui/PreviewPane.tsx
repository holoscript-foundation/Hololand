/**
 * PreviewPane Component
 *
 * Displays a summary of the MVC (Minimum Viable Continuity) payload that
 * will be transferred during a cross-reality handoff. Shows decision count,
 * task description, spatial anchors, evidence items, and estimated size.
 *
 * @module handoff-ui/PreviewPane
 */

import React from 'react';
import type { PayloadPreview } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface PreviewPaneProps {
  /** MVC payload summary to display */
  payloadPreview: PayloadPreview;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format byte count to a human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Determine the size budget health color.
 * Target: <10KB per MVC spec.
 */
function getSizeBudgetColor(bytes: number): string {
  if (bytes <= 8192) return '#4caf50';   // green: well within budget
  if (bytes <= 10240) return '#ff9800';  // amber: near budget limit
  return '#f44336';                       // red: over budget
}

// =============================================================================
// STYLES
// =============================================================================

const paneStyle: React.CSSProperties = {
  padding: '1rem',
  borderRadius: '8px',
  backgroundColor: '#0f0f17',
  border: '1px solid #1e1e2e',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  color: '#e0e0e0',
};

const headerStyle: React.CSSProperties = {
  margin: '0 0 0.875rem 0',
  fontSize: '0.95rem',
  fontWeight: 600,
  color: '#e0e0e0',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.625rem',
};

const metricCardStyle: React.CSSProperties = {
  padding: '0.625rem 0.75rem',
  borderRadius: '6px',
  backgroundColor: '#12121a',
  border: '1px solid #1e1e2e',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.2rem',
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: '#888',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
};

const metricValueStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 700,
  color: '#e0e0e0',
  lineHeight: 1.2,
};

const taskRowStyle: React.CSSProperties = {
  gridColumn: '1 / -1',
  padding: '0.625rem 0.75rem',
  borderRadius: '6px',
  backgroundColor: '#12121a',
  border: '1px solid #1e1e2e',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.2rem',
};

const taskDescriptionStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 500,
  color: '#e0e0e0',
  lineHeight: 1.4,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const PreviewPane: React.FC<PreviewPaneProps> = ({ payloadPreview }) => {
  const {
    decisionCount,
    taskDescription,
    spatialAnchors,
    evidenceItems,
    estimatedSizeBytes,
  } = payloadPreview;

  const sizeColor = getSizeBudgetColor(estimatedSizeBytes);
  const formattedSize = formatBytes(estimatedSizeBytes);
  const isOverBudget = estimatedSizeBytes > 10240;

  return (
    <div
      className="preview-pane"
      style={paneStyle}
      data-testid="preview-pane"
      role="region"
      aria-label="Transfer payload preview"
    >
      <h4 style={headerStyle}>
        Payload Preview
      </h4>

      <div style={gridStyle}>
        {/* Decision Count */}
        <div style={metricCardStyle} data-testid="metric-decisions">
          <span style={metricLabelStyle}>Decisions</span>
          <span style={metricValueStyle}>{decisionCount}</span>
        </div>

        {/* Spatial Anchors */}
        <div style={metricCardStyle} data-testid="metric-anchors">
          <span style={metricLabelStyle}>Spatial Anchors</span>
          <span style={metricValueStyle}>{spatialAnchors}</span>
        </div>

        {/* Evidence Items */}
        <div style={metricCardStyle} data-testid="metric-evidence">
          <span style={metricLabelStyle}>Evidence Items</span>
          <span style={metricValueStyle}>{evidenceItems}</span>
        </div>

        {/* Estimated Size */}
        <div style={metricCardStyle} data-testid="metric-size">
          <span style={metricLabelStyle}>Est. Size</span>
          <span style={{ ...metricValueStyle, color: sizeColor }}>
            {formattedSize}
          </span>
          {isOverBudget && (
            <span style={{ fontSize: '0.65rem', color: '#f44336', marginTop: '0.15rem' }}>
              Exceeds 10KB MVC budget
            </span>
          )}
        </div>

        {/* Task Description -- full width */}
        <div style={taskRowStyle} data-testid="metric-task">
          <span style={metricLabelStyle}>Active Task</span>
          <span style={taskDescriptionStyle} title={taskDescription}>
            {taskDescription || 'No active task'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PreviewPane;
