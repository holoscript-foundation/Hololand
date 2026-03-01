/**
 * usePresence Hook — CRDT-backed multiplayer presence for Studio IDE
 *
 * Connects to a CRDTRoom instance and provides real-time awareness of
 * connected collaborators: cursor positions, selections, voice state,
 * and player metadata.
 *
 * Features:
 *   - Subscribes to player:joined, player:left, player:updated events
 *   - Throttled local cursor/selection broadcasting (configurable rate)
 *   - Deterministic color assignment per user (stable across sessions)
 *   - Active selection tracking (which entity/node a user is editing)
 *   - Connection-aware: gracefully handles room reconnections
 *
 * @module studio/usePresence
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { CRDTRoom, PlayerPresenceData } from '@hololand/network';

// =============================================================================
// Types
// =============================================================================

/** 2D screen-space cursor position for IDE overlay rendering */
export interface CursorPosition {
  x: number;
  y: number;
}

/** Extended collaborator info derived from CRDTRoom player data */
export interface Collaborator {
  /** Unique player ID */
  playerId: string;
  /** Display name */
  displayName: string;
  /** Avatar URL (optional) */
  avatarUrl?: string;
  /** Assigned color (hex) for cursor/badge */
  color: string;
  /** Current cursor position in screen coordinates (null if not broadcasting) */
  cursorPosition: CursorPosition | null;
  /** Currently selected entity/node ID (null if nothing selected) */
  activeSelection: string | null;
  /** Voice state */
  voiceState: 'muted' | 'speaking' | 'listening' | 'deafened';
  /** Player role */
  role: string;
  /** Whether this collaborator is the local user */
  isLocal: boolean;
  /** Timestamp of last update */
  lastSeen: number;
}

/** Hook configuration */
export interface UsePresenceOptions {
  /** The CRDTRoom instance to connect to */
  room: CRDTRoom | null;
  /** Local player ID (must match the room's localNodeId) */
  localPlayerId: string;
  /** Throttle interval for broadcasting local cursor updates (ms, default: 50) */
  broadcastThrottleMs?: number;
  /** Time after which a collaborator is considered idle (ms, default: 30000) */
  idleTimeoutMs?: number;
  /** Whether to track cursor positions (default: true) */
  trackCursors?: boolean;
  /** Whether to track active selections (default: true) */
  trackSelections?: boolean;
}

/** Return value from usePresence */
export interface UsePresenceReturn {
  /** All connected collaborators (excluding local user) */
  collaborators: Collaborator[];
  /** All collaborators including local user */
  allCollaborators: Collaborator[];
  /** Number of connected collaborators (excluding local) */
  collaboratorCount: number;
  /** Broadcast local cursor position */
  updateCursor: (position: CursorPosition | null) => void;
  /** Broadcast local active selection */
  updateSelection: (entityId: string | null) => void;
  /** Whether the hook is connected to a room */
  isConnected: boolean;
  /** Get a collaborator by ID */
  getCollaborator: (playerId: string) => Collaborator | undefined;
  /** Get the color assigned to a player */
  getPlayerColor: (playerId: string) => string;
}

// =============================================================================
// Color Palette
// =============================================================================

/**
 * 12-color palette designed for high contrast on dark IDE backgrounds.
 * Colors are perceptually distinct and accessible against dark themes.
 */
const COLLABORATOR_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#e11d48', // rose
] as const;

/**
 * Deterministic color assignment based on player ID.
 * Uses a simple hash to ensure the same player always gets the same color,
 * even across different sessions and clients.
 */
function hashPlayerColor(playerId: string): string {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    const char = playerId.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  const index = Math.abs(hash) % COLLABORATOR_COLORS.length;
  return COLLABORATOR_COLORS[index];
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function usePresence(options: UsePresenceOptions): UsePresenceReturn {
  const {
    room,
    localPlayerId,
    broadcastThrottleMs = 50,
    idleTimeoutMs = 30_000,
    trackCursors = true,
    trackSelections = true,
  } = options;

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  const [collaboratorMap, setCollaboratorMap] = useState<
    Map<string, Collaborator>
  >(new Map());

  const lastBroadcastRef = useRef<number>(0);
  const pendingCursorRef = useRef<CursorPosition | null>(null);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -------------------------------------------------------------------------
  // Color assignment (memoized)
  // -------------------------------------------------------------------------
  const getPlayerColor = useCallback(
    (playerId: string): string => hashPlayerColor(playerId),
    [],
  );

  // -------------------------------------------------------------------------
  // Build collaborator from player presence data
  // -------------------------------------------------------------------------
  const buildCollaborator = useCallback(
    (player: PlayerPresenceData): Collaborator => {
      // Extract screen cursor from player metadata if available
      const screenCursor = player.metadata?.screenCursor as
        | CursorPosition
        | undefined;
      const activeSelection =
        (player.metadata?.activeSelection as string) || null;

      return {
        playerId: player.playerId,
        displayName: player.displayName,
        avatarUrl: player.avatarUrl,
        color: getPlayerColor(player.playerId),
        cursorPosition: screenCursor ?? null,
        activeSelection,
        voiceState: player.voiceState,
        role: player.role,
        isLocal: player.playerId === localPlayerId,
        lastSeen: player.lastHeartbeat,
      };
    },
    [localPlayerId, getPlayerColor],
  );

  // -------------------------------------------------------------------------
  // Subscribe to room events
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!room) {
      setCollaboratorMap(new Map());
      return;
    }

    // Initialize from current room state
    const initialMap = new Map<string, Collaborator>();
    for (const player of room.getAllPlayers()) {
      initialMap.set(player.playerId, buildCollaborator(player));
    }
    setCollaboratorMap(initialMap);

    // Player joined
    const unsubJoined = room.on('player:joined', ({ player }) => {
      setCollaboratorMap((prev) => {
        const next = new Map(prev);
        next.set(player.playerId, buildCollaborator(player));
        return next;
      });
    });

    // Player left
    const unsubLeft = room.on('player:left', ({ playerId }) => {
      setCollaboratorMap((prev) => {
        const next = new Map(prev);
        next.delete(playerId);
        return next;
      });
    });

    // Player updated (cursor moved, selection changed, etc.)
    const unsubUpdated = room.on('player:updated', ({ player }) => {
      // Skip updating self from remote events
      if (player.playerId === localPlayerId) return;

      setCollaboratorMap((prev) => {
        const next = new Map(prev);
        next.set(player.playerId, buildCollaborator(player));
        return next;
      });
    });

    return () => {
      unsubJoined();
      unsubLeft();
      unsubUpdated();

      // Clean up throttle timer
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    };
  }, [room, buildCollaborator, localPlayerId]);

  // -------------------------------------------------------------------------
  // Broadcast local cursor position (throttled)
  // -------------------------------------------------------------------------
  const broadcastCursor = useCallback(
    (position: CursorPosition | null) => {
      if (!room || !trackCursors) return;

      pendingCursorRef.current = position;

      const now = Date.now();
      const elapsed = now - lastBroadcastRef.current;

      if (elapsed >= broadcastThrottleMs) {
        // Enough time passed, send immediately
        lastBroadcastRef.current = now;
        room.updatePlayer(localPlayerId, {
          metadata: {
            ...(room.getPlayer(localPlayerId)?.metadata ?? {}),
            screenCursor: position,
          },
        });
      } else if (!throttleTimerRef.current) {
        // Schedule a deferred send
        throttleTimerRef.current = setTimeout(() => {
          throttleTimerRef.current = null;
          lastBroadcastRef.current = Date.now();
          const pending = pendingCursorRef.current;
          room.updatePlayer(localPlayerId, {
            metadata: {
              ...(room.getPlayer(localPlayerId)?.metadata ?? {}),
              screenCursor: pending,
            },
          });
        }, broadcastThrottleMs - elapsed);
      }
    },
    [room, localPlayerId, broadcastThrottleMs, trackCursors],
  );

  // -------------------------------------------------------------------------
  // Broadcast local active selection
  // -------------------------------------------------------------------------
  const updateSelection = useCallback(
    (entityId: string | null) => {
      if (!room || !trackSelections) return;

      room.updatePlayer(localPlayerId, {
        metadata: {
          ...(room.getPlayer(localPlayerId)?.metadata ?? {}),
          activeSelection: entityId,
        },
      });
    },
    [room, localPlayerId, trackSelections],
  );

  // -------------------------------------------------------------------------
  // Idle detection: mark stale collaborators
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!room) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setCollaboratorMap((prev) => {
        let changed = false;
        const next = new Map(prev);

        for (const [id, collab] of next) {
          if (
            !collab.isLocal &&
            now - collab.lastSeen > idleTimeoutMs &&
            collab.cursorPosition !== null
          ) {
            // Clear cursor for idle users
            next.set(id, { ...collab, cursorPosition: null });
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    }, idleTimeoutMs / 2);

    return () => clearInterval(interval);
  }, [room, idleTimeoutMs]);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------
  const allCollaborators = useMemo(
    () => Array.from(collaboratorMap.values()),
    [collaboratorMap],
  );

  const collaborators = useMemo(
    () => allCollaborators.filter((c) => !c.isLocal),
    [allCollaborators],
  );

  const getCollaborator = useCallback(
    (playerId: string) => collaboratorMap.get(playerId),
    [collaboratorMap],
  );

  const isConnected = room !== null;

  return {
    collaborators,
    allCollaborators,
    collaboratorCount: collaborators.length,
    updateCursor: broadcastCursor,
    updateSelection,
    isConnected,
    getCollaborator,
    getPlayerColor,
  };
}

export default usePresence;
