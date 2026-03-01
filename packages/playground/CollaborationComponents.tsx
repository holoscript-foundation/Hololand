/**
 * CollaborationComponents.tsx - Yjs CRDT Collaboration React Components
 *
 * Provides React hooks and components for real-time collaboration:
 *   - useCollaboration: Main hook connecting to AwarenessProtocol
 *   - CursorPresence: Renders remote user cursors with labels
 *   - SelectionHighlight: Renders remote user text selections
 *   - ConflictBanner: Shows active conflicts with resolution options
 *   - PresenceBar: Shows connected users with status indicators
 *   - TypingIndicator: Shows which users are typing
 *
 * These components integrate with Hololand's existing network layer
 * through the AwarenessProtocol in YjsCollaboration.ts.
 *
 * @module CollaborationComponents
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  createContext,
  useContext,
} from 'react';

import type {
  AwarenessState,
  AwarenessConfig,
  AwarenessEvent,
  CursorPosition,
  SelectionRange,
  UserColor,
  EditConflict,
  ConflictingEdit,
  ConflictResolutionStrategy,
} from '../platform/network/src/YjsCollaboration';

import {
  AwarenessProtocol,
  ConflictDetector,
  createAwarenessProtocol,
  createConflictDetector,
} from '../platform/network/src/YjsCollaboration';

// =============================================================================
// Context
// =============================================================================

interface CollaborationContextValue {
  /** The awareness protocol instance */
  awareness: AwarenessProtocol;
  /** The conflict detector instance */
  conflictDetector: ConflictDetector;
  /** Local user's state */
  localState: AwarenessState;
  /** All remote peers */
  peers: Map<string, AwarenessState>;
  /** Active (unresolved) conflicts */
  activeConflicts: EditConflict[];
  /** Update local cursor position */
  setCursor: (cursor: CursorPosition | null) => void;
  /** Update local selection */
  setSelection: (selection: SelectionRange | null) => void;
  /** Signal that user is typing */
  signalTyping: () => void;
  /** Resolve a conflict */
  resolveConflict: (conflictId: string, strategy?: ConflictResolutionStrategy) => void;
  /** Dismiss a conflict */
  dismissConflict: (conflictId: string) => void;
}

const CollaborationContext = createContext<CollaborationContextValue | null>(null);

/**
 * Hook to access the collaboration context.
 * Must be used within a CollaborationProvider.
 */
export function useCollaboration(): CollaborationContextValue {
  const ctx = useContext(CollaborationContext);
  if (!ctx) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return ctx;
}

// =============================================================================
// Provider
// =============================================================================

interface CollaborationProviderProps {
  /** Configuration for the awareness protocol */
  config: AwarenessConfig;
  /** Default conflict resolution strategy */
  conflictStrategy?: ConflictResolutionStrategy;
  /** Optional broadcast function for sending state to other peers */
  onBroadcast?: (state: AwarenessState) => void;
  /** Children components */
  children: React.ReactNode;
}

/**
 * CollaborationProvider sets up the awareness protocol and conflict detector,
 * providing them to child components via React context.
 *
 * Usage:
 * ```tsx
 * <CollaborationProvider
 *   config={{ clientId: 'user-1', displayName: 'Alice' }}
 *   onBroadcast={(state) => socket.emit('awareness', state)}
 * >
 *   <Editor />
 *   <PresenceBar />
 * </CollaborationProvider>
 * ```
 */
export function CollaborationProvider({
  config,
  conflictStrategy = 'last-writer-wins',
  onBroadcast,
  children,
}: CollaborationProviderProps): React.ReactElement {
  const [localState, setLocalState] = useState<AwarenessState>(() => ({
    clientId: config.clientId,
    displayName: config.displayName,
    color: { color: '#3b82f6', light: '#93c5fd' },
    cursor: null,
    selection: null,
    isTyping: false,
    isOnline: true,
    lastActivity: Date.now(),
  }));
  const [peers, setPeers] = useState<Map<string, AwarenessState>>(new Map());
  const [activeConflicts, setActiveConflicts] = useState<EditConflict[]>([]);

  const awarenessRef = useRef<AwarenessProtocol | null>(null);
  const conflictDetectorRef = useRef<ConflictDetector | null>(null);

  // Initialize awareness protocol
  useEffect(() => {
    const awareness = createAwarenessProtocol(config);
    const detector = createConflictDetector(conflictStrategy);

    awarenessRef.current = awareness;
    conflictDetectorRef.current = detector;

    // Set broadcast function
    if (onBroadcast) {
      awareness.setBroadcastFunction(onBroadcast);
    }

    // Listen for awareness events
    const unsubUpdate = awareness.on('awareness-update', () => {
      setPeers(new Map(awareness.getPeers()));
      setLocalState(awareness.getLocalState());
    });

    const unsubAdd = awareness.on('awareness-add', () => {
      setPeers(new Map(awareness.getPeers()));
    });

    const unsubRemove = awareness.on('awareness-remove', () => {
      setPeers(new Map(awareness.getPeers()));
    });

    // Listen for conflict events
    const unsubConflictDetected = detector.onConflict('detected', () => {
      setActiveConflicts(detector.getActiveConflicts());
    });

    const unsubConflictResolved = detector.onConflict('resolved', () => {
      setActiveConflicts(detector.getActiveConflicts());
    });

    // Start broadcasting
    awareness.start();

    // Set initial local state
    setLocalState(awareness.getLocalState());

    return () => {
      unsubUpdate();
      unsubAdd();
      unsubRemove();
      unsubConflictDetected();
      unsubConflictResolved();
      awareness.destroy();
    };
  }, [config.clientId, config.displayName]);

  const setCursor = useCallback((cursor: CursorPosition | null) => {
    awarenessRef.current?.setLocalCursor(cursor);
  }, []);

  const setSelection = useCallback((selection: SelectionRange | null) => {
    awarenessRef.current?.setLocalSelection(selection);
  }, []);

  const signalTyping = useCallback(() => {
    awarenessRef.current?.setLocalTyping();
  }, []);

  const resolveConflict = useCallback(
    (conflictId: string, strategy?: ConflictResolutionStrategy) => {
      conflictDetectorRef.current?.resolveConflict(conflictId, strategy);
    },
    [],
  );

  const dismissConflict = useCallback((conflictId: string) => {
    conflictDetectorRef.current?.dismissConflict(conflictId);
  }, []);

  const contextValue = useMemo<CollaborationContextValue>(
    () => ({
      awareness: awarenessRef.current!,
      conflictDetector: conflictDetectorRef.current!,
      localState,
      peers,
      activeConflicts,
      setCursor,
      setSelection,
      signalTyping,
      resolveConflict,
      dismissConflict,
    }),
    [localState, peers, activeConflicts, setCursor, setSelection, signalTyping, resolveConflict, dismissConflict],
  );

  // Wait for initialization
  if (!awarenessRef.current || !conflictDetectorRef.current) {
    return <>{children}</>;
  }

  return (
    <CollaborationContext.Provider value={contextValue}>
      {children}
    </CollaborationContext.Provider>
  );
}

// =============================================================================
// Cursor Presence Component
// =============================================================================

interface CursorPresenceProps {
  /** Container element reference for positioning cursors */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Function to convert a cursor position to pixel coordinates */
  positionToPixels: (cursor: CursorPosition) => { x: number; y: number } | null;
  /** Whether to show the user name label above the cursor */
  showLabel?: boolean;
  /** Whether to animate cursor movement */
  animate?: boolean;
  /** Custom CSS class for the cursor container */
  className?: string;
  /** Line height in pixels (for cursor height) */
  lineHeight?: number;
}

/**
 * CursorPresence renders remote users' cursor positions as colored vertical
 * bars with name labels. Positions are calculated using the provided
 * `positionToPixels` callback.
 *
 * Usage:
 * ```tsx
 * <CursorPresence
 *   containerRef={editorRef}
 *   positionToPixels={(cursor) => ({
 *     x: cursor.column * charWidth,
 *     y: cursor.line * lineHeight
 *   })}
 * />
 * ```
 */
export function CursorPresence({
  containerRef,
  positionToPixels,
  showLabel = true,
  animate = true,
  className = '',
  lineHeight = 20,
}: CursorPresenceProps): React.ReactElement | null {
  const { peers } = useCollaboration();

  const activeCursors = useMemo(() => {
    const cursors: Array<{
      clientId: string;
      displayName: string;
      color: UserColor;
      cursor: CursorPosition;
    }> = [];

    for (const [clientId, state] of peers) {
      if (state.cursor && state.isOnline) {
        cursors.push({
          clientId,
          displayName: state.displayName,
          color: state.color,
          cursor: state.cursor,
        });
      }
    }

    return cursors;
  }, [peers]);

  if (activeCursors.length === 0) return null;

  return (
    <div
      className={`collaboration-cursors ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 10,
        overflow: 'hidden',
      }}
    >
      {activeCursors.map(({ clientId, displayName, color, cursor }) => {
        const pos = positionToPixels(cursor);
        if (!pos) return null;

        return (
          <div
            key={clientId}
            className="collaboration-cursor"
            data-client-id={clientId}
            style={{
              position: 'absolute',
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              transition: animate ? 'left 120ms ease-out, top 120ms ease-out' : 'none',
              pointerEvents: 'none',
            }}
          >
            {/* Cursor line */}
            <div
              style={{
                width: '2px',
                height: `${lineHeight}px`,
                backgroundColor: color.color,
                borderRadius: '1px',
                boxShadow: `0 0 4px ${color.color}40`,
              }}
            />

            {/* User label */}
            {showLabel && (
              <div
                className="collaboration-cursor-label"
                style={{
                  position: 'absolute',
                  top: `-${lineHeight + 2}px`,
                  left: '0px',
                  backgroundColor: color.color,
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 500,
                  lineHeight: '16px',
                  padding: '1px 6px',
                  borderRadius: '3px 3px 3px 0',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
              >
                {displayName}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Selection Highlight Component
// =============================================================================

interface SelectionHighlightProps {
  /** Container element reference for positioning highlights */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Function to convert a selection range to an array of pixel rects */
  selectionToRects: (selection: SelectionRange) => Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  /** Opacity for the selection highlight (0-1) */
  opacity?: number;
  /** Custom CSS class */
  className?: string;
}

/**
 * SelectionHighlight renders remote users' text selections as colored
 * rectangular overlays. Each user's selection is shown in their assigned color.
 *
 * The `selectionToRects` callback should convert a selection range into
 * pixel-space rectangles that represent the highlighted lines/regions.
 *
 * Usage:
 * ```tsx
 * <SelectionHighlight
 *   containerRef={editorRef}
 *   selectionToRects={(selection) => {
 *     // Convert selection range to pixel rectangles
 *     return computeSelectionRects(selection, charWidth, lineHeight);
 *   }}
 * />
 * ```
 */
export function SelectionHighlight({
  containerRef,
  selectionToRects,
  opacity = 0.2,
  className = '',
}: SelectionHighlightProps): React.ReactElement | null {
  const { peers } = useCollaboration();

  const activeSelections = useMemo(() => {
    const selections: Array<{
      clientId: string;
      displayName: string;
      color: UserColor;
      selection: SelectionRange;
    }> = [];

    for (const [clientId, state] of peers) {
      if (state.selection && state.isOnline) {
        selections.push({
          clientId,
          displayName: state.displayName,
          color: state.color,
          selection: state.selection,
        });
      }
    }

    return selections;
  }, [peers]);

  if (activeSelections.length === 0) return null;

  return (
    <div
      className={`collaboration-selections ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 5,
        overflow: 'hidden',
      }}
    >
      {activeSelections.map(({ clientId, color, selection }) => {
        const rects = selectionToRects(selection);

        return (
          <div key={clientId} data-client-id={clientId}>
            {rects.map((rect, i) => (
              <div
                key={`${clientId}-rect-${i}`}
                className="collaboration-selection-rect"
                style={{
                  position: 'absolute',
                  left: `${rect.x}px`,
                  top: `${rect.y}px`,
                  width: `${rect.width}px`,
                  height: `${rect.height}px`,
                  backgroundColor: color.light,
                  opacity,
                  borderRadius: '2px',
                  pointerEvents: 'none',
                  transition: 'all 120ms ease-out',
                }}
              />
            ))}

            {/* Selection border lines at start and end */}
            {rects.length > 0 && (
              <>
                <div
                  style={{
                    position: 'absolute',
                    left: `${rects[0].x}px`,
                    top: `${rects[0].y}px`,
                    width: '2px',
                    height: `${rects[0].height}px`,
                    backgroundColor: color.color,
                    opacity: 0.6,
                    borderRadius: '1px',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: `${rects[rects.length - 1].x + rects[rects.length - 1].width}px`,
                    top: `${rects[rects.length - 1].y}px`,
                    width: '2px',
                    height: `${rects[rects.length - 1].height}px`,
                    backgroundColor: color.color,
                    opacity: 0.6,
                    borderRadius: '1px',
                  }}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Conflict Banner Component
// =============================================================================

interface ConflictBannerProps {
  /** Custom CSS class */
  className?: string;
  /** Position of the banner */
  position?: 'top' | 'bottom';
  /** Whether to allow auto-resolve actions */
  allowAutoResolve?: boolean;
  /** Callback when a conflict is resolved */
  onResolve?: (conflictId: string, edit: ConflictingEdit) => void;
}

/**
 * ConflictBanner shows active edit conflicts with options for resolution.
 * It appears when two or more users edit the same region concurrently.
 *
 * Usage:
 * ```tsx
 * <ConflictBanner
 *   position="top"
 *   onResolve={(conflictId, edit) => applyEdit(edit)}
 * />
 * ```
 */
export function ConflictBanner({
  className = '',
  position = 'top',
  allowAutoResolve = true,
  onResolve,
}: ConflictBannerProps): React.ReactElement | null {
  const { activeConflicts, resolveConflict, dismissConflict } = useCollaboration();
  const [expandedConflict, setExpandedConflict] = useState<string | null>(null);

  if (activeConflicts.length === 0) return null;

  return (
    <div
      className={`collaboration-conflict-banner ${className}`}
      style={{
        position: 'fixed',
        [position]: '0',
        left: '0',
        right: '0',
        zIndex: 100,
        padding: '8px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {activeConflicts.map((conflict) => (
        <div
          key={conflict.id}
          style={{
            backgroundColor: '#1e1e2e',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: expandedConflict === conflict.id ? '12px' : '0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  backgroundColor: '#f59e0b',
                  color: '#000',
                  borderRadius: '50%',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                !
              </span>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>
                Edit Conflict: {conflict.edits.length} concurrent changes at line{' '}
                {conflict.region.anchor.line + 1}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                by{' '}
                {conflict.edits.map((e) => e.displayName).join(', ')}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() =>
                  setExpandedConflict(
                    expandedConflict === conflict.id ? null : conflict.id,
                  )
                }
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  backgroundColor: '#334155',
                  color: '#e2e8f0',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {expandedConflict === conflict.id ? 'Collapse' : 'View'}
              </button>

              {allowAutoResolve && (
                <button
                  onClick={() => {
                    resolveConflict(conflict.id, 'last-writer-wins');
                  }}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    backgroundColor: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Auto-resolve (LWW)
                </button>
              )}

              <button
                onClick={() => dismissConflict(conflict.id)}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  border: '1px solid #475569',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Expanded: show each user's edit */}
          {expandedConflict === conflict.id && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {conflict.edits.map((edit, idx) => (
                <div
                  key={`${edit.clientId}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '8px 12px',
                    backgroundColor: '#0f172a',
                    borderRadius: '6px',
                    borderLeft: `3px solid ${edit.color.color}`,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: edit.color.color,
                        marginBottom: '4px',
                      }}
                    >
                      {edit.displayName}
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        color: '#cbd5e1',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                      }}
                    >
                      {edit.text}
                    </pre>
                  </div>

                  <button
                    onClick={() => {
                      onResolve?.(conflict.id, edit);
                      resolveConflict(conflict.id, 'user-choice');
                    }}
                    style={{
                      padding: '4px 12px',
                      fontSize: '11px',
                      backgroundColor: edit.color.color,
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    Accept this
                  </button>
                </div>
              ))}

              {/* Merge option */}
              {allowAutoResolve && conflict.edits.length === 2 && (
                <button
                  onClick={() => resolveConflict(conflict.id, 'merge-both')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '11px',
                    backgroundColor: '#065f46',
                    color: '#a7f3d0',
                    border: '1px solid #10b981',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                  }}
                >
                  Merge both edits
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Presence Bar Component
// =============================================================================

interface PresenceBarProps {
  /** Custom CSS class */
  className?: string;
  /** Whether to show the current user in the bar */
  showSelf?: boolean;
  /** Maximum number of avatars to show before "+N" */
  maxVisible?: number;
  /** Size of each avatar circle in pixels */
  avatarSize?: number;
}

/**
 * PresenceBar shows all connected users as colored circles with
 * status indicators (online, typing, idle).
 *
 * Usage:
 * ```tsx
 * <PresenceBar showSelf maxVisible={8} avatarSize={32} />
 * ```
 */
export function PresenceBar({
  className = '',
  showSelf = true,
  maxVisible = 10,
  avatarSize = 28,
}: PresenceBarProps): React.ReactElement {
  const { localState, peers } = useCollaboration();

  const allUsers = useMemo(() => {
    const users: AwarenessState[] = [];
    if (showSelf) users.push(localState);
    for (const peer of peers.values()) {
      if (peer.isOnline) users.push(peer);
    }
    return users;
  }, [localState, peers, showSelf]);

  const visibleUsers = allUsers.slice(0, maxVisible);
  const overflowCount = Math.max(0, allUsers.length - maxVisible);

  return (
    <div
      className={`collaboration-presence-bar ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
      }}
    >
      {visibleUsers.map((user) => {
        const initials = user.displayName
          .split(' ')
          .map((s) => s[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();

        const isSelf = user.clientId === localState.clientId;

        return (
          <div
            key={user.clientId}
            title={`${user.displayName}${isSelf ? ' (you)' : ''}${user.isTyping ? ' - typing...' : ''}`}
            style={{
              position: 'relative',
              width: `${avatarSize}px`,
              height: `${avatarSize}px`,
              borderRadius: '50%',
              backgroundColor: user.color.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: `${Math.max(10, avatarSize * 0.38)}px`,
              fontWeight: 600,
              color: '#ffffff',
              cursor: 'default',
              border: isSelf ? '2px solid #fff' : '2px solid transparent',
              boxSizing: 'border-box',
              flexShrink: 0,
              transition: 'transform 150ms ease',
            }}
          >
            {initials}

            {/* Typing indicator dot */}
            {user.isTyping && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#22c55e',
                  border: '2px solid #1e1e2e',
                  animation: 'collaboration-typing-pulse 1s infinite',
                }}
              />
            )}

            {/* Online indicator */}
            {!user.isTyping && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: user.isOnline ? '#22c55e' : '#6b7280',
                  border: '2px solid #1e1e2e',
                }}
              />
            )}
          </div>
        );
      })}

      {overflowCount > 0 && (
        <div
          style={{
            width: `${avatarSize}px`,
            height: `${avatarSize}px`,
            borderRadius: '50%',
            backgroundColor: '#374151',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: `${Math.max(9, avatarSize * 0.35)}px`,
            fontWeight: 600,
            color: '#9ca3af',
            flexShrink: 0,
          }}
        >
          +{overflowCount}
        </div>
      )}

      {/* Inline animation keyframes */}
      <style>{`
        @keyframes collaboration-typing-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// Typing Indicator Component
// =============================================================================

interface TypingIndicatorProps {
  /** Custom CSS class */
  className?: string;
  /** Maximum number of names to show before "and N others" */
  maxNames?: number;
}

/**
 * TypingIndicator shows a text message like "Alice and Bob are typing..."
 * when remote users are actively typing.
 *
 * Usage:
 * ```tsx
 * <TypingIndicator maxNames={3} />
 * ```
 */
export function TypingIndicator({
  className = '',
  maxNames = 3,
}: TypingIndicatorProps): React.ReactElement | null {
  const { peers } = useCollaboration();

  const typingUsers = useMemo(() => {
    const users: string[] = [];
    for (const peer of peers.values()) {
      if (peer.isTyping && peer.isOnline) {
        users.push(peer.displayName);
      }
    }
    return users;
  }, [peers]);

  if (typingUsers.length === 0) return null;

  let message: string;
  if (typingUsers.length === 1) {
    message = `${typingUsers[0]} is typing`;
  } else if (typingUsers.length <= maxNames) {
    const last = typingUsers[typingUsers.length - 1];
    const rest = typingUsers.slice(0, -1).join(', ');
    message = `${rest} and ${last} are typing`;
  } else {
    const visible = typingUsers.slice(0, maxNames).join(', ');
    const others = typingUsers.length - maxNames;
    message = `${visible} and ${others} ${others === 1 ? 'other' : 'others'} are typing`;
  }

  return (
    <div
      className={`collaboration-typing-indicator ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        fontSize: '12px',
        color: '#94a3b8',
        fontStyle: 'italic',
      }}
    >
      {/* Animated dots */}
      <span
        style={{
          display: 'inline-flex',
          gap: '2px',
          alignItems: 'center',
        }}
      >
        <span style={{ animation: 'collaboration-dot-bounce 1.4s infinite 0s' }}>.</span>
        <span style={{ animation: 'collaboration-dot-bounce 1.4s infinite 0.2s' }}>.</span>
        <span style={{ animation: 'collaboration-dot-bounce 1.4s infinite 0.4s' }}>.</span>
      </span>
      <span>{message}</span>

      <style>{`
        @keyframes collaboration-dot-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// Custom Hooks
// =============================================================================

/**
 * Hook to receive awareness state from a remote peer transport.
 * Call the returned function whenever a remote awareness message arrives.
 *
 * Usage:
 * ```tsx
 * const receiveRemote = useRemoteAwareness();
 *
 * socket.on('awareness', (state) => {
 *   receiveRemote(state);
 * });
 * ```
 */
export function useRemoteAwareness(): (state: AwarenessState) => void {
  const { awareness } = useCollaboration();

  return useCallback(
    (state: AwarenessState) => {
      awareness.receiveRemoteState(state);
    },
    [awareness],
  );
}

/**
 * Hook to track cursor position from editor events.
 * Automatically updates the awareness protocol.
 *
 * Usage:
 * ```tsx
 * const { onCursorChange, onSelectionChange, onInput } = useCursorTracking();
 *
 * <textarea
 *   onSelect={onSelectionChange}
 *   onInput={onInput}
 *   onClick={onCursorChange}
 * />
 * ```
 */
export function useCursorTracking() {
  const { setCursor, setSelection, signalTyping } = useCollaboration();

  const onCursorChange = useCallback(
    (e: React.SyntheticEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const target = e.currentTarget;
      const pos = target.selectionStart ?? 0;
      const text = target.value.substring(0, pos);
      const lines = text.split('\n');
      const line = lines.length - 1;
      const column = lines[lines.length - 1].length;

      setCursor({ line, column, offset: pos });
    },
    [setCursor],
  );

  const onSelectionChange = useCallback(
    (e: React.SyntheticEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const target = e.currentTarget;
      const start = target.selectionStart ?? 0;
      const end = target.selectionEnd ?? 0;

      if (start === end) {
        setSelection(null);
        return;
      }

      const textToStart = target.value.substring(0, start);
      const linesStart = textToStart.split('\n');
      const anchor: CursorPosition = {
        line: linesStart.length - 1,
        column: linesStart[linesStart.length - 1].length,
        offset: start,
      };

      const textToEnd = target.value.substring(0, end);
      const linesEnd = textToEnd.split('\n');
      const head: CursorPosition = {
        line: linesEnd.length - 1,
        column: linesEnd[linesEnd.length - 1].length,
        offset: end,
      };

      setSelection({
        anchor,
        head,
        isReversed: target.selectionDirection === 'backward',
      });
    },
    [setSelection],
  );

  const onInput = useCallback(() => {
    signalTyping();
  }, [signalTyping]);

  return { onCursorChange, onSelectionChange, onInput };
}

/**
 * Hook to get the count of online peers.
 */
export function useOnlinePeerCount(): number {
  const { peers } = useCollaboration();

  return useMemo(() => {
    let count = 0;
    for (const peer of peers.values()) {
      if (peer.isOnline) count++;
    }
    return count;
  }, [peers]);
}

/**
 * Hook to subscribe to specific awareness events.
 *
 * Usage:
 * ```tsx
 * useAwarenessEvent('cursor-move', (event) => {
 *   console.log(`${event.clientId} moved cursor`);
 * });
 * ```
 */
export function useAwarenessEvent(
  eventType: AwarenessEvent['type'],
  handler: (event: AwarenessEvent) => void,
): void {
  const { awareness } = useCollaboration();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const unsubscribe = awareness.on(eventType, (event) => {
      handlerRef.current(event);
    });
    return unsubscribe;
  }, [awareness, eventType]);
}

// =============================================================================
// Exports
// =============================================================================

export type {
  AwarenessState,
  AwarenessConfig,
  AwarenessEvent,
  CursorPosition,
  SelectionRange,
  UserColor,
  EditConflict,
  ConflictingEdit,
  ConflictResolutionStrategy,
  CollaborationContextValue,
};
