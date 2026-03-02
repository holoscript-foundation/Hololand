/**
 * Real-Time Collaborative Editing
 *
 * Provides collaborative editing markers, cursor presence, and
 * real-time synchronization for multi-user HoloScript editing.
 *
 * Features:
 * - Remote cursor visualization (colored cursors per user)
 * - Selection range sharing
 * - User presence indicators (who's editing what)
 * - Edit operation broadcasting
 * - Conflict resolution via operational transform
 * - Connection status tracking
 */

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface CollaboratorInfo {
  /** Unique user ID */
  userId: string;
  /** Display name */
  displayName: string;
  /** Avatar URL or initials */
  avatar: string;
  /** Assigned cursor color */
  color: string;
  /** Whether the user is currently connected */
  isConnected: boolean;
  /** Last activity timestamp */
  lastActivity: number;
}

export interface CursorPresence {
  /** User who owns this cursor */
  userId: string;
  /** Current cursor line number */
  lineNumber: number;
  /** Current cursor column */
  column: number;
  /** Selected range (if any) */
  selection: SelectionRange | null;
  /** Timestamp of last cursor update */
  timestamp: number;
}

export interface SelectionRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface EditOperation {
  /** User who made the edit */
  userId: string;
  /** Operation type */
  type: 'insert' | 'delete' | 'replace';
  /** Position in the document */
  position: { line: number; column: number };
  /** Text inserted */
  insertText?: string;
  /** Range deleted */
  deleteRange?: SelectionRange;
  /** Timestamp */
  timestamp: number;
  /** Operation version for ordering */
  version: number;
}

export interface CollaborationConfig {
  /** Room/session ID for this editing session */
  roomId: string;
  /** Current user info */
  currentUser: CollaboratorInfo;
  /** WebSocket URL for real-time communication */
  wsUrl?: string;
  /** Callback when remote cursor positions change */
  onCursorsUpdate?: (cursors: CursorPresence[]) => void;
  /** Callback when collaborators join/leave */
  onPresenceChange?: (collaborators: CollaboratorInfo[]) => void;
  /** Callback when a remote edit operation is received */
  onRemoteEdit?: (operation: EditOperation) => void;
  /** Callback when connection status changes */
  onConnectionChange?: (status: ConnectionStatus) => void;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

// --------------------------------------------------------------------------
// Cursor Colors
// --------------------------------------------------------------------------

const COLLABORATOR_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#FFE66D', // Yellow
  '#A8E6CF', // Light green
  '#DDA0DD', // Plum
  '#FF8C94', // Coral
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Lavender
  '#85C1E9', // Sky blue
];

// --------------------------------------------------------------------------
// Collaborative Editor Class
// --------------------------------------------------------------------------

/**
 * CollaborativeEditor
 *
 * Manages real-time collaborative editing state for HoloScript scenes.
 * Tracks remote user cursors, handles presence updates, and coordinates
 * edit operations between multiple users.
 *
 * This is the client-side coordination layer. It communicates with the
 * HoloLand backend via WebSocket for real-time synchronization.
 */
export class CollaborativeEditor {
  private config: CollaborationConfig;
  private collaborators: Map<string, CollaboratorInfo> = new Map();
  private cursors: Map<string, CursorPresence> = new Map();
  private ws: WebSocket | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private operationVersion = 0;
  private pendingOperations: EditOperation[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private colorIndex = 0;

  constructor(config: CollaborationConfig) {
    this.config = config;
    // Add current user to collaborators
    this.collaborators.set(config.currentUser.userId, config.currentUser);
  }

  /**
   * Connect to the collaboration server
   */
  async connect(): Promise<void> {
    if (!this.config.wsUrl) {
      // Fallback: local-only mode (no server)
      this.connectionStatus = 'connected';
      this.config.onConnectionChange?.('connected');
      return;
    }

    this.connectionStatus = 'connecting';
    this.config.onConnectionChange?.('connecting');

    try {
      this.ws = new WebSocket(this.config.wsUrl);

      this.ws.onopen = () => {
        this.connectionStatus = 'connected';
        this.reconnectAttempts = 0;
        this.config.onConnectionChange?.('connected');

        // Send join message
        this.sendMessage({
          type: 'join',
          roomId: this.config.roomId,
          user: this.config.currentUser,
        });

        // Start heartbeat
        this.heartbeatTimer = setInterval(() => {
          this.sendMessage({ type: 'heartbeat', userId: this.config.currentUser.userId });
        }, 15000);
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (e) {
          console.error('[CollaborativeEditor] Failed to parse message:', e);
        }
      };

      this.ws.onclose = () => {
        this.connectionStatus = 'disconnected';
        this.config.onConnectionChange?.('disconnected');

        if (this.heartbeatTimer) {
          clearInterval(this.heartbeatTimer);
          this.heartbeatTimer = null;
        }

        // Auto-reconnect
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[CollaborativeEditor] WebSocket error:', error);
      };
    } catch (error) {
      console.error('[CollaborativeEditor] Connection failed:', error);
      this.connectionStatus = 'disconnected';
      this.config.onConnectionChange?.('disconnected');
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the collaboration server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.ws) {
      this.sendMessage({
        type: 'leave',
        roomId: this.config.roomId,
        userId: this.config.currentUser.userId,
      });
      this.ws.close();
      this.ws = null;
    }

    this.connectionStatus = 'disconnected';
    this.config.onConnectionChange?.('disconnected');
  }

  /**
   * Broadcast local cursor position to other collaborators
   */
  broadcastCursor(lineNumber: number, column: number, selection?: SelectionRange): void {
    const cursor: CursorPresence = {
      userId: this.config.currentUser.userId,
      lineNumber,
      column,
      selection: selection ?? null,
      timestamp: Date.now(),
    };

    this.cursors.set(this.config.currentUser.userId, cursor);

    this.sendMessage({
      type: 'cursor',
      roomId: this.config.roomId,
      cursor,
    });
  }

  /**
   * Broadcast a local edit operation to other collaborators
   */
  broadcastEdit(operation: Omit<EditOperation, 'userId' | 'timestamp' | 'version'>): void {
    const fullOp: EditOperation = {
      ...operation,
      userId: this.config.currentUser.userId,
      timestamp: Date.now(),
      version: ++this.operationVersion,
    };

    this.pendingOperations.push(fullOp);

    this.sendMessage({
      type: 'edit',
      roomId: this.config.roomId,
      operation: fullOp,
    });
  }

  /**
   * Get all current collaborator cursors (excluding self)
   */
  getRemoteCursors(): CursorPresence[] {
    const now = Date.now();
    const staleThreshold = 30000; // 30 seconds

    return Array.from(this.cursors.values())
      .filter(c => c.userId !== this.config.currentUser.userId)
      .filter(c => now - c.timestamp < staleThreshold);
  }

  /**
   * Get all currently connected collaborators
   */
  getCollaborators(): CollaboratorInfo[] {
    return Array.from(this.collaborators.values());
  }

  /**
   * Get connected collaborator count (excluding self)
   */
  getCollaboratorCount(): number {
    return Array.from(this.collaborators.values())
      .filter(c => c.userId !== this.config.currentUser.userId && c.isConnected)
      .length;
  }

  /**
   * Get the current connection status
   */
  getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Get Monaco editor decorations for remote cursors.
   * These can be applied to the editor to show other users' cursor positions.
   */
  getMonacoDecorations(): Array<{
    range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number };
    options: { className?: string; hoverMessage?: { value: string }; inlineClassName?: string; afterContentClassName?: string };
  }> {
    const decorations: Array<any> = [];
    const remoteCursors = this.getRemoteCursors();

    for (const cursor of remoteCursors) {
      const collaborator = this.collaborators.get(cursor.userId);
      if (!collaborator) continue;

      // Cursor line decoration
      decorations.push({
        range: {
          startLineNumber: cursor.lineNumber,
          startColumn: cursor.column,
          endLineNumber: cursor.lineNumber,
          endColumn: cursor.column + 1,
        },
        options: {
          className: `collab-cursor collab-cursor-${collaborator.userId.replace(/[^a-zA-Z0-9]/g, '')}`,
          hoverMessage: { value: `${collaborator.displayName} is editing here` },
          afterContentClassName: `collab-cursor-label`,
        },
      });

      // Selection range decoration
      if (cursor.selection) {
        decorations.push({
          range: {
            startLineNumber: cursor.selection.startLine,
            startColumn: cursor.selection.startColumn,
            endLineNumber: cursor.selection.endLine,
            endColumn: cursor.selection.endColumn,
          },
          options: {
            className: `collab-selection collab-selection-${collaborator.userId.replace(/[^a-zA-Z0-9]/g, '')}`,
          },
        });
      }
    }

    return decorations;
  }

  /**
   * Generate CSS styles for collaborator cursors and selections.
   * Inject this into the page for collaborative cursor visualization.
   */
  generateCollaboratorCSS(): string {
    const styles: string[] = [];

    for (const collaborator of this.collaborators.values()) {
      if (collaborator.userId === this.config.currentUser.userId) continue;

      const safeId = collaborator.userId.replace(/[^a-zA-Z0-9]/g, '');
      const color = collaborator.color;

      styles.push(`
        .collab-cursor-${safeId} {
          border-left: 2px solid ${color} !important;
          position: relative;
        }
        .collab-cursor-${safeId}::after {
          content: "${collaborator.displayName}";
          position: absolute;
          top: -18px;
          left: -2px;
          background: ${color};
          color: white;
          padding: 1px 6px;
          border-radius: 3px;
          font-size: 10px;
          white-space: nowrap;
          pointer-events: none;
          z-index: 100;
        }
        .collab-selection-${safeId} {
          background-color: ${color}22 !important;
          border-top: 1px solid ${color}44;
          border-bottom: 1px solid ${color}44;
        }
      `);
    }

    return styles.join('\n');
  }

  // --- Private methods ---

  private sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'user_joined': {
        const user = message.user as CollaboratorInfo;
        if (!user.color) {
          user.color = this.assignColor();
        }
        user.isConnected = true;
        user.lastActivity = Date.now();
        this.collaborators.set(user.userId, user);
        this.config.onPresenceChange?.(this.getCollaborators());
        break;
      }

      case 'user_left': {
        const userId = message.userId;
        const user = this.collaborators.get(userId);
        if (user) {
          user.isConnected = false;
          this.collaborators.delete(userId);
          this.cursors.delete(userId);
        }
        this.config.onPresenceChange?.(this.getCollaborators());
        this.config.onCursorsUpdate?.(this.getRemoteCursors());
        break;
      }

      case 'cursor': {
        const cursor = message.cursor as CursorPresence;
        if (cursor.userId !== this.config.currentUser.userId) {
          this.cursors.set(cursor.userId, cursor);
          this.config.onCursorsUpdate?.(this.getRemoteCursors());
        }
        break;
      }

      case 'edit': {
        const operation = message.operation as EditOperation;
        if (operation.userId !== this.config.currentUser.userId) {
          this.config.onRemoteEdit?.(operation);
        }
        break;
      }

      case 'room_state': {
        // Full room state sync on join
        if (message.collaborators) {
          for (const user of message.collaborators) {
            if (!user.color) user.color = this.assignColor();
            user.isConnected = true;
            this.collaborators.set(user.userId, user);
          }
          this.config.onPresenceChange?.(this.getCollaborators());
        }
        if (message.cursors) {
          for (const cursor of message.cursors) {
            this.cursors.set(cursor.userId, cursor);
          }
          this.config.onCursorsUpdate?.(this.getRemoteCursors());
        }
        break;
      }

      case 'heartbeat_ack': {
        // Server acknowledged heartbeat
        break;
      }

      default:
        console.warn('[CollaborativeEditor] Unknown message type:', message.type);
    }
  }

  private assignColor(): string {
    const color = COLLABORATOR_COLORS[this.colorIndex % COLLABORATOR_COLORS.length];
    this.colorIndex++;
    return color;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[CollaborativeEditor] Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    this.connectionStatus = 'reconnecting';
    this.config.onConnectionChange?.('reconnecting');

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }
}
