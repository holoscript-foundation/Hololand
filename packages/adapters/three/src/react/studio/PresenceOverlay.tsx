/**
 * PresenceOverlay Component
 *
 * Top-level container that composes the full multiplayer presence system
 * for the Studio IDE. Combines:
 *   - usePresence hook (CRDT-backed state sync)
 *   - CollaboratorCursor[] (remote user cursors on viewport)
 *   - UserListPanel (sidebar with connected user list)
 *
 * Drop this single component into any Studio IDE layout to enable
 * full multiplayer presence awareness.
 *
 * @example
 * ```tsx
 * import { PresenceOverlay } from '@hololand/three-adapter/react/studio';
 *
 * function StudioViewport({ room, localPlayerId }) {
 *   return (
 *     <>
 *       <Canvas>
 *         {/* 3D scene */}
 *       </Canvas>
 *       <PresenceOverlay
 *         room={room}
 *         localPlayerId={localPlayerId}
 *         showUserList
 *         showCursors
 *       />
 *     </>
 *   );
 * }
 * ```
 *
 * @module studio/PresenceOverlay
 */

import React, { useCallback, useEffect, useRef, type CSSProperties } from 'react';
import type { CRDTRoom } from '@hololand/network';
import { usePresence, type CursorPosition, type UsePresenceOptions } from './usePresence';
import { CollaboratorCursor } from './CollaboratorCursor';
import { UserListPanel } from './UserListPanel';

// =============================================================================
// Types
// =============================================================================

export interface PresenceOverlayProps {
  /** The CRDTRoom instance to sync presence through */
  room: CRDTRoom | null;
  /** Local player ID (must match the room's localNodeId) */
  localPlayerId: string;
  /** Whether to show remote collaborator cursors (default: true) */
  showCursors?: boolean;
  /** Whether to show the user list panel (default: true) */
  showUserList?: boolean;
  /** Whether to show name labels on cursors (default: true) */
  showCursorLabels?: boolean;
  /** Whether to track mouse movement for cursor broadcasting (default: true) */
  trackLocalCursor?: boolean;
  /** Throttle rate for cursor broadcast in ms (default: 50) */
  cursorBroadcastRate?: number;
  /** Idle timeout for hiding stale cursors in ms (default: 30000) */
  idleTimeoutMs?: number;
  /** Cursor size in pixels (default: 20) */
  cursorSize?: number;
  /** User list panel position (default: 'top-left') */
  userListPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** User list panel starts collapsed (default: false) */
  userListCollapsed?: boolean;
  /** User list panel opacity (default: 0.92) */
  userListOpacity?: number;
  /** Called when a collaborator is clicked in the user list */
  onCollaboratorClick?: (playerId: string) => void;
  /** Called when "follow" is toggled for a collaborator */
  onFollowToggle?: (playerId: string) => void;
  /** ID of the currently followed collaborator */
  followingPlayerId?: string | null;
  /** DOM element to track mouse within (default: document) */
  trackingElement?: HTMLElement | null;
  /** Called when presence updates occur (for external integrations) */
  onPresenceUpdate?: (collaborators: ReturnType<typeof usePresence>['collaborators']) => void;
  /** Additional CSS class */
  className?: string;
  /** Override root styles */
  style?: CSSProperties;
}

// =============================================================================
// Component
// =============================================================================

export const PresenceOverlay = React.memo<PresenceOverlayProps>(
  function PresenceOverlay({
    room,
    localPlayerId,
    showCursors = true,
    showUserList = true,
    showCursorLabels = true,
    trackLocalCursor = true,
    cursorBroadcastRate = 50,
    idleTimeoutMs = 30_000,
    cursorSize = 20,
    userListPosition = 'top-left',
    userListCollapsed = false,
    userListOpacity = 0.92,
    onCollaboratorClick,
    onFollowToggle,
    followingPlayerId = null,
    trackingElement = null,
    onPresenceUpdate,
    className,
    style,
  }) {
    // -----------------------------------------------------------------------
    // Presence hook
    // -----------------------------------------------------------------------
    const presence = usePresence({
      room,
      localPlayerId,
      broadcastThrottleMs: cursorBroadcastRate,
      idleTimeoutMs,
      trackCursors: showCursors,
      trackSelections: true,
    });

    const {
      collaborators,
      allCollaborators,
      updateCursor,
      isConnected,
    } = presence;

    // -----------------------------------------------------------------------
    // Notify external listeners of presence changes
    // -----------------------------------------------------------------------
    const prevCollaboratorsRef = useRef(collaborators);
    useEffect(() => {
      if (
        onPresenceUpdate &&
        collaborators !== prevCollaboratorsRef.current
      ) {
        prevCollaboratorsRef.current = collaborators;
        onPresenceUpdate(collaborators);
      }
    }, [collaborators, onPresenceUpdate]);

    // -----------------------------------------------------------------------
    // Mouse tracking for local cursor broadcasting
    // -----------------------------------------------------------------------
    const handleMouseMove = useCallback(
      (event: MouseEvent) => {
        if (!trackLocalCursor || !isConnected) return;

        const position: CursorPosition = {
          x: event.clientX,
          y: event.clientY,
        };
        updateCursor(position);
      },
      [trackLocalCursor, isConnected, updateCursor],
    );

    const handleMouseLeave = useCallback(() => {
      if (!trackLocalCursor || !isConnected) return;
      updateCursor(null);
    }, [trackLocalCursor, isConnected, updateCursor]);

    useEffect(() => {
      if (!trackLocalCursor || !isConnected) return;

      const target = trackingElement ?? document.documentElement;

      target.addEventListener('mousemove', handleMouseMove);
      target.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        target.removeEventListener('mousemove', handleMouseMove);
        target.removeEventListener('mouseleave', handleMouseLeave);
      };
    }, [
      trackLocalCursor,
      isConnected,
      trackingElement,
      handleMouseMove,
      handleMouseLeave,
    ]);

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    if (!isConnected) return null;

    return (
      <div
        className={className}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          pointerEvents: 'none',
          zIndex: 9998,
          ...style,
        }}
        role="region"
        aria-label="Multiplayer presence overlay"
        aria-live="polite"
      >
        {/* Remote collaborator cursors */}
        {showCursors &&
          collaborators.map(
            (collab) =>
              collab.cursorPosition && (
                <CollaboratorCursor
                  key={collab.playerId}
                  collaborator={collab}
                  showLabel={showCursorLabels}
                  showSelectionIndicator
                  cursorSize={cursorSize}
                />
              ),
          )}

        {/* User list panel (needs pointer events) */}
        {showUserList && (
          <div style={{ pointerEvents: 'auto' }}>
            <UserListPanel
              collaborators={allCollaborators}
              localPlayerId={localPlayerId}
              position={userListPosition}
              defaultCollapsed={userListCollapsed}
              opacity={userListOpacity}
              onCollaboratorClick={onCollaboratorClick}
              onFollowToggle={onFollowToggle}
              followingPlayerId={followingPlayerId}
            />
          </div>
        )}
      </div>
    );
  },
);

export default PresenceOverlay;
