/**
 * CollaboratorCursor Component
 *
 * Renders a remote collaborator's cursor on the Studio IDE viewport.
 * Each cursor displays:
 *   - A color-coded pointer SVG (matches the collaborator's assigned color)
 *   - A name badge pill showing the user's display name
 *   - Smooth CSS transitions for cursor movement (interpolated feel)
 *   - Fade-in/out animation on appearance/disappearance
 *
 * The cursor is positioned absolutely in screen space and rendered
 * in a fixed overlay layer (z-index 9999) so it floats above all
 * IDE panels and the 3D viewport.
 *
 * @module studio/CollaboratorCursor
 */

import React, { useMemo, type CSSProperties } from 'react';
import type { Collaborator, CursorPosition } from './usePresence';

// =============================================================================
// Types
// =============================================================================

export interface CollaboratorCursorProps {
  /** Collaborator data from usePresence hook */
  collaborator: Collaborator;
  /** Optional override for cursor position (useful for testing) */
  position?: CursorPosition;
  /** Whether to show the name badge (default: true) */
  showLabel?: boolean;
  /** Whether to show the selection indicator dot (default: true) */
  showSelectionIndicator?: boolean;
  /** Cursor pointer size in pixels (default: 20) */
  cursorSize?: number;
  /** Additional CSS class for the root element */
  className?: string;
  /** Override root styles */
  style?: CSSProperties;
}

// =============================================================================
// Styles
// =============================================================================

function createStyles(
  color: string,
  x: number,
  y: number,
  cursorSize: number,
): Record<string, CSSProperties> {
  return {
    root: {
      position: 'fixed',
      left: x,
      top: y,
      zIndex: 9999,
      pointerEvents: 'none',
      transition: 'left 80ms linear, top 80ms linear, opacity 200ms ease',
      willChange: 'left, top',
    },
    pointer: {
      width: cursorSize,
      height: cursorSize,
      filter: `drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5))`,
    },
    badge: {
      position: 'absolute' as const,
      left: cursorSize - 2,
      top: cursorSize - 4,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px 2px 6px',
      borderRadius: 4,
      backgroundColor: color,
      color: '#fff',
      fontSize: 11,
      fontWeight: 600,
      fontFamily:
        '"Inter", "SF Pro Text", -apple-system, BlinkMacSystemFont, sans-serif',
      lineHeight: '16px',
      whiteSpace: 'nowrap' as const,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      maxWidth: 140,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    selectionDot: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      backgroundColor: '#fff',
      border: `1.5px solid ${color}`,
      boxShadow: '0 0 4px rgba(255, 255, 255, 0.5)',
      flexShrink: 0,
    },
  };
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a single collaborator cursor with color-coded pointer and name badge.
 *
 * @example
 * ```tsx
 * {collaborators.map((collab) =>
 *   collab.cursorPosition && (
 *     <CollaboratorCursor
 *       key={collab.playerId}
 *       collaborator={collab}
 *     />
 *   )
 * )}
 * ```
 */
export const CollaboratorCursor = React.memo<CollaboratorCursorProps>(
  function CollaboratorCursor({
    collaborator,
    position,
    showLabel = true,
    showSelectionIndicator = true,
    cursorSize = 20,
    className,
    style,
  }) {
    const cursorPos = position ?? collaborator.cursorPosition;

    // Don't render if no cursor position
    if (!cursorPos) return null;

    const { color, displayName, activeSelection } = collaborator;

    const styles = useMemo(
      () => createStyles(color, cursorPos.x, cursorPos.y, cursorSize),
      [color, cursorPos.x, cursorPos.y, cursorSize],
    );

    return (
      <div
        style={{ ...styles.root, ...style }}
        className={className}
        role="status"
        aria-label={`${displayName}'s cursor`}
        aria-live="off"
      >
        {/* Cursor pointer SVG */}
        <svg
          style={styles.pointer}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Outer shadow/stroke for contrast */}
          <path
            d="M5.65 2.09L20.24 12.77L12.68 13.82L8.5 21.36L5.65 2.09Z"
            fill="rgba(0,0,0,0.3)"
            stroke="rgba(0,0,0,0.2)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Main colored fill */}
          <path
            d="M5.65 2.09L20.24 12.77L12.68 13.82L8.5 21.36L5.65 2.09Z"
            fill={color}
            stroke="#fff"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>

        {/* Name badge */}
        {showLabel && (
          <div style={styles.badge}>
            {/* Selection indicator dot */}
            {showSelectionIndicator && activeSelection && (
              <div
                style={styles.selectionDot}
                title={`Editing: ${activeSelection}`}
              />
            )}
            {displayName}
          </div>
        )}
      </div>
    );
  },
);

export default CollaboratorCursor;
