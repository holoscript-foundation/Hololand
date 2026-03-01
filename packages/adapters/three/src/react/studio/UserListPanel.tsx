/**
 * UserListPanel Component
 *
 * A collapsible sidebar panel showing all connected collaborators in the
 * current Studio IDE session. Each user row displays:
 *   - Avatar (image or initials fallback with assigned color)
 *   - Display name
 *   - Role badge (host, moderator, player, spectator)
 *   - Voice state indicator
 *   - Active selection highlight (which entity/node they are editing)
 *   - Online presence dot
 *
 * Follows the same dark-theme design language as RendererStatsOverlay
 * and other Studio IDE panels.
 *
 * @module studio/UserListPanel
 */

import React, { useMemo, useState, type CSSProperties } from 'react';
import type { Collaborator } from './usePresence';

// =============================================================================
// Types
// =============================================================================

export interface UserListPanelProps {
  /** All collaborators (including local user) from usePresence */
  collaborators: Collaborator[];
  /** The local player's ID (used to label "You") */
  localPlayerId: string;
  /** Position of the panel (default: 'top-left') */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Whether the panel starts collapsed (default: false) */
  defaultCollapsed?: boolean;
  /** Panel title (default: 'Collaborators') */
  title?: string;
  /** Panel opacity (0-1, default: 0.92) */
  opacity?: number;
  /** Maximum visible rows before scrolling (default: 8) */
  maxVisibleRows?: number;
  /** Called when a collaborator is clicked */
  onCollaboratorClick?: (playerId: string) => void;
  /** Called when "follow" is toggled for a collaborator */
  onFollowToggle?: (playerId: string) => void;
  /** ID of the currently followed collaborator (if any) */
  followingPlayerId?: string | null;
  /** Additional CSS class */
  className?: string;
  /** Override root styles */
  style?: CSSProperties;
}

// =============================================================================
// Position Mapping
// =============================================================================

const POSITIONS: Record<string, CSSProperties> = {
  'top-left': { top: 12, left: 12 },
  'top-right': { top: 12, right: 12 },
  'bottom-left': { bottom: 12, left: 12 },
  'bottom-right': { bottom: 12, right: 12 },
};

// =============================================================================
// Styles
// =============================================================================

function createStyles(
  position: string,
  opacity: number,
  collapsed: boolean,
  maxVisibleRows: number,
): Record<string, CSSProperties> {
  return {
    root: {
      position: 'fixed',
      zIndex: 9998,
      ...(POSITIONS[position] || POSITIONS['top-left']),
      width: collapsed ? 48 : 240,
      fontFamily:
        '"Inter", "SF Pro Text", -apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: 12,
      lineHeight: 1.4,
      color: '#d4d4d8',
      backgroundColor: `rgba(15, 15, 25, ${opacity})`,
      backdropFilter: 'blur(12px)',
      borderRadius: 10,
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      overflow: 'hidden',
      userSelect: 'none',
      transition: 'width 0.2s ease',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px',
      borderBottom: collapsed
        ? 'none'
        : '1px solid rgba(255, 255, 255, 0.06)',
      cursor: 'pointer',
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
      color: '#a1a1aa',
    },
    countBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: 'rgba(99, 102, 241, 0.3)',
      color: '#a5b4fc',
      fontSize: 10,
      fontWeight: 700,
      padding: '0 5px',
    },
    collapseIcon: {
      width: 14,
      height: 14,
      color: '#71717a',
      transition: 'transform 0.2s ease',
      transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
    },
    body: {
      maxHeight: collapsed ? 0 : maxVisibleRows * 44 + 8,
      overflow: collapsed ? 'hidden' : 'auto',
      transition: 'max-height 0.25s ease',
      padding: collapsed ? 0 : '4px 0',
    },
    userRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '5px 12px',
      cursor: 'pointer',
      transition: 'background-color 0.1s ease',
      borderRadius: 0,
    },
    userRowHover: {
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
    avatarContainer: {
      position: 'relative' as const,
      width: 28,
      height: 28,
      flexShrink: 0,
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: '50%',
      objectFit: 'cover' as const,
      border: '2px solid transparent',
    },
    avatarFallback: {
      width: 28,
      height: 28,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 700,
      color: '#fff',
      border: '2px solid transparent',
    },
    presenceDot: {
      position: 'absolute' as const,
      bottom: -1,
      right: -1,
      width: 8,
      height: 8,
      borderRadius: '50%',
      border: '1.5px solid rgba(15, 15, 25, 1)',
    },
    userInfo: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 1,
    },
    nameRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    },
    userName: {
      fontSize: 12,
      fontWeight: 500,
      color: '#e4e4e7',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    },
    youBadge: {
      fontSize: 9,
      fontWeight: 600,
      color: '#a1a1aa',
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      padding: '1px 4px',
      borderRadius: 3,
    },
    roleBadge: {
      fontSize: 9,
      fontWeight: 600,
      padding: '1px 4px',
      borderRadius: 3,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.04em',
    },
    selectionRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 3,
      fontSize: 10,
      color: '#71717a',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    },
    selectionDot: {
      width: 5,
      height: 5,
      borderRadius: '50%',
      flexShrink: 0,
    },
    voiceIcon: {
      width: 14,
      height: 14,
      flexShrink: 0,
      opacity: 0.6,
    },
    followBtn: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 20,
      height: 20,
      borderRadius: 4,
      border: 'none',
      cursor: 'pointer',
      backgroundColor: 'transparent',
      padding: 0,
      flexShrink: 0,
      transition: 'background-color 0.1s ease',
    },
    emptyState: {
      padding: '16px 12px',
      textAlign: 'center' as const,
      fontSize: 11,
      color: '#52525b',
    },
  };
}

// =============================================================================
// Helpers
// =============================================================================

/** Extract initials from a display name */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Get role badge color */
function getRoleBadgeStyle(role: string): CSSProperties {
  switch (role) {
    case 'host':
      return {
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
        color: '#fbbf24',
      };
    case 'moderator':
      return {
        backgroundColor: 'rgba(167, 139, 250, 0.15)',
        color: '#a78bfa',
      };
    case 'spectator':
      return {
        backgroundColor: 'rgba(113, 113, 122, 0.15)',
        color: '#a1a1aa',
      };
    default:
      return {
        backgroundColor: 'rgba(96, 165, 250, 0.15)',
        color: '#93c5fd',
      };
  }
}

/** Voice state to presence dot color */
function getPresenceDotColor(
  voiceState: string,
  lastSeen: number,
  idleThreshold: number = 30_000,
): string {
  const idle = Date.now() - lastSeen > idleThreshold;
  if (idle) return '#71717a'; // gray = idle
  if (voiceState === 'speaking') return '#4ade80'; // green = speaking
  if (voiceState === 'deafened') return '#ef4444'; // red = deafened
  return '#4ade80'; // green = online
}

// =============================================================================
// Sub-Components
// =============================================================================

/** Voice state icon */
const VoiceIcon: React.FC<{ state: string; color: string }> = ({
  state,
  color,
}) => {
  if (state === 'muted' || state === 'deafened') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        style={{
          width: 14,
          height: 14,
          flexShrink: 0,
          opacity: 0.5,
        }}
        aria-label={state === 'muted' ? 'Muted' : 'Deafened'}
      >
        <path
          d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"
          fill={state === 'deafened' ? '#ef4444' : '#71717a'}
        />
        <path
          d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
          fill={state === 'deafened' ? '#ef4444' : '#71717a'}
        />
        {/* Strike-through line */}
        <line
          x1="3"
          y1="3"
          x2="21"
          y2="21"
          stroke={state === 'deafened' ? '#ef4444' : '#71717a'}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (state === 'speaking') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        style={{
          width: 14,
          height: 14,
          flexShrink: 0,
        }}
        aria-label="Speaking"
      >
        <path
          d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"
          fill="#4ade80"
        />
        <path
          d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
          fill="#4ade80"
        />
      </svg>
    );
  }

  // listening (default)
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      style={{
        width: 14,
        height: 14,
        flexShrink: 0,
        opacity: 0.4,
      }}
      aria-label="Listening"
    >
      <path
        d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"
        fill="#a1a1aa"
      />
      <path
        d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
        fill="#a1a1aa"
      />
    </svg>
  );
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * Sidebar panel showing connected collaborators with avatar, name, role,
 * voice state, and active selection highlighting.
 *
 * @example
 * ```tsx
 * const { allCollaborators } = usePresence({ room, localPlayerId });
 *
 * <UserListPanel
 *   collaborators={allCollaborators}
 *   localPlayerId={localPlayerId}
 *   position="top-left"
 *   onCollaboratorClick={(id) => viewport.focusOnPlayer(id)}
 * />
 * ```
 */
export const UserListPanel = React.memo<UserListPanelProps>(
  function UserListPanel({
    collaborators,
    localPlayerId,
    position = 'top-left',
    defaultCollapsed = false,
    title = 'Collaborators',
    opacity = 0.92,
    maxVisibleRows = 8,
    onCollaboratorClick,
    onFollowToggle,
    followingPlayerId = null,
    className,
    style,
  }) {
    const [collapsed, setCollapsed] = useState(defaultCollapsed);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const styles = useMemo(
      () => createStyles(position, opacity, collapsed, maxVisibleRows),
      [position, opacity, collapsed, maxVisibleRows],
    );

    // Sort: local user first, then by display name
    const sortedCollaborators = useMemo(() => {
      return [...collaborators].sort((a, b) => {
        if (a.isLocal) return -1;
        if (b.isLocal) return 1;
        return a.displayName.localeCompare(b.displayName);
      });
    }, [collaborators]);

    return (
      <div
        style={{ ...styles.root, ...style }}
        className={className}
        role="region"
        aria-label="Collaborator list panel"
      >
        {/* Header */}
        <div
          style={styles.header}
          onClick={() => setCollapsed((c) => !c)}
          role="button"
          aria-expanded={!collapsed}
          aria-label={
            collapsed ? 'Expand collaborator list' : 'Collapse collaborator list'
          }
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setCollapsed((c) => !c);
            }
          }}
        >
          <div style={styles.headerLeft}>
            <span style={styles.headerTitle}>{title}</span>
            <span style={styles.countBadge}>{collaborators.length}</span>
          </div>

          {/* Collapse chevron */}
          <svg
            style={styles.collapseIcon}
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <polyline points="4 5 7 8 10 5" />
          </svg>
        </div>

        {/* Body */}
        <div style={styles.body} aria-hidden={collapsed} role="list">
          {sortedCollaborators.length === 0 && !collapsed && (
            <div style={styles.emptyState}>No collaborators connected</div>
          )}

          {sortedCollaborators.map((collab) => {
            const isHovered = hoveredId === collab.playerId;
            const isFollowing = followingPlayerId === collab.playerId;
            const presenceDotColor = getPresenceDotColor(
              collab.voiceState,
              collab.lastSeen,
            );
            const roleBadgeStyle = getRoleBadgeStyle(collab.role);

            return (
              <div
                key={collab.playerId}
                style={{
                  ...styles.userRow,
                  ...(isHovered ? styles.userRowHover : {}),
                }}
                role="listitem"
                aria-label={`${collab.displayName}${collab.isLocal ? ' (you)' : ''}`}
                onMouseEnter={() => setHoveredId(collab.playerId)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onCollaboratorClick?.(collab.playerId)}
              >
                {/* Avatar */}
                <div style={styles.avatarContainer}>
                  {collab.avatarUrl ? (
                    <img
                      src={collab.avatarUrl}
                      alt={`${collab.displayName}'s avatar`}
                      style={{
                        ...styles.avatar,
                        borderColor: collab.color,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        ...styles.avatarFallback,
                        backgroundColor: collab.color,
                        borderColor: collab.color,
                      }}
                      aria-hidden="true"
                    >
                      {getInitials(collab.displayName)}
                    </div>
                  )}

                  {/* Presence dot */}
                  <div
                    style={{
                      ...styles.presenceDot,
                      backgroundColor: presenceDotColor,
                    }}
                    title={
                      collab.voiceState === 'speaking'
                        ? 'Speaking'
                        : collab.voiceState === 'deafened'
                          ? 'Deafened'
                          : 'Online'
                    }
                  />
                </div>

                {/* User info */}
                <div style={styles.userInfo}>
                  <div style={styles.nameRow}>
                    <span style={styles.userName}>{collab.displayName}</span>
                    {collab.isLocal && (
                      <span style={styles.youBadge}>You</span>
                    )}
                    {collab.role !== 'player' && (
                      <span
                        style={{
                          ...styles.roleBadge,
                          ...roleBadgeStyle,
                        }}
                      >
                        {collab.role}
                      </span>
                    )}
                  </div>

                  {/* Active selection */}
                  {collab.activeSelection && (
                    <div style={styles.selectionRow}>
                      <div
                        style={{
                          ...styles.selectionDot,
                          backgroundColor: collab.color,
                        }}
                      />
                      <span>Editing: {collab.activeSelection}</span>
                    </div>
                  )}
                </div>

                {/* Voice state icon */}
                <VoiceIcon state={collab.voiceState} color={collab.color} />

                {/* Follow button (only for non-local users) */}
                {!collab.isLocal && onFollowToggle && (
                  <button
                    style={{
                      ...styles.followBtn,
                      backgroundColor: isFollowing
                        ? 'rgba(99, 102, 241, 0.2)'
                        : 'transparent',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onFollowToggle(collab.playerId);
                    }}
                    title={
                      isFollowing
                        ? `Stop following ${collab.displayName}`
                        : `Follow ${collab.displayName}`
                    }
                    aria-label={
                      isFollowing
                        ? `Stop following ${collab.displayName}`
                        : `Follow ${collab.displayName}`
                    }
                    aria-pressed={isFollowing}
                  >
                    <svg
                      viewBox="0 0 16 16"
                      width="12"
                      height="12"
                      fill={isFollowing ? '#6366f1' : '#71717a'}
                      aria-hidden="true"
                    >
                      <path d="M8 3C4.5 3 1.6 5.1.5 8c1.1 2.9 4 5 7.5 5s6.4-2.1 7.5-5c-1.1-2.9-4-5-7.5-5zm0 8.3c-1.8 0-3.3-1.5-3.3-3.3S6.2 4.7 8 4.7s3.3 1.5 3.3 3.3S9.8 11.3 8 11.3zm0-5.3c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

export default UserListPanel;
