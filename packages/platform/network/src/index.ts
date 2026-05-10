type Listener<T = any> = (payload: T) => void;

class EventHub {
  private listeners = new Map<string, Set<Listener>>();

  on<T = any>(event: string, listener: Listener<T>): () => void {
    const bucket = this.listeners.get(event) ?? new Set<Listener>();
    bucket.add(listener as Listener);
    this.listeners.set(event, bucket);
    return () => this.off(event, listener as Listener);
  }

  off(event: string, listener: Listener): void {
    this.listeners.get(event)?.delete(listener);
  }

  protected emit<T = any>(event: string, payload: T): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(payload);
    }
  }
}

export interface NetworkClientConfig {
  url?: string;
  serverUrl?: string;
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  timeout?: number;
}

export interface NetworkMessage<T = any> {
  type: string;
  payload?: T;
  timestamp?: number;
  [key: string]: any;
}

export interface RoomInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  state?: 'open' | 'closed' | 'full';
  isPrivate?: boolean;
  hostId?: string;
  createdAt: number;
}

export interface PlayerInfo {
  id: string;
  displayName: string;
  role: string;
  joinedAt: number;
  metadata?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  type?: string;
  senderId: string;
  senderName: string;
  channel?: string;
  content: string;
  timestamp: number;
}

export type SyncState = Record<string, unknown>;

export interface CRDTOperation {
  type: 'set' | 'increment' | 'insert' | 'delete' | string;
  path: string[];
  value?: unknown;
  timestamp?: number;
  actor?: string;
}

export interface SyncMessage {
  type: 'state_sync';
  peerId: string;
  operations: CRDTOperation[];
  timestamp: number;
}

export class NetworkClient extends EventHub {
  private socket: WebSocket | null = null;
  private connected = false;
  private latency = 0;
  private readonly clientId = `client_${Math.random().toString(36).slice(2, 10)}`;
  private readonly url: string;

  constructor(private readonly config: NetworkClientConfig = {}) {
    super();
    this.url = config.url ?? config.serverUrl ?? '';
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    if (!this.url) {
      throw new Error('@hololand/network requires a url or serverUrl to connect.');
    }
    if (typeof WebSocket === 'undefined') {
      throw new Error('@hololand/network cannot connect: WebSocket is unavailable in this runtime.');
    }

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(
        () => {
          reject(new Error(`@hololand/network connection timed out: ${this.url}`));
        },
        this.config.timeout ?? 10000,
      );

      const started = performance.now();
      const socket = new WebSocket(this.url);
      this.socket = socket;

      socket.addEventListener('open', () => {
        window.clearTimeout(timeout);
        this.connected = true;
        this.latency = Math.round(performance.now() - started);
        this.emit('connected', { clientId: this.clientId });
        resolve();
      });

      socket.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(String(event.data)) as NetworkMessage;
          this.emit('message', { message });
          this.emit(message.type, message.payload);
        } catch {
          this.emit('message', { message: { type: 'raw', payload: event.data } });
        }
      });

      socket.addEventListener('close', () => {
        this.connected = false;
        this.emit('disconnected', { reason: 'socket_closed' });
      });

      socket.addEventListener('error', () => {
        window.clearTimeout(timeout);
        this.connected = false;
        const message = `@hololand/network failed to connect: ${this.url}`;
        this.emit('error', { code: 'connect_failed', message });
        reject(new Error(message));
      });
    });
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
    this.connected = false;
    this.emit('disconnected', { reason: 'client_disconnect' });
  }

  isConnected(): boolean {
    return this.connected;
  }

  getClientId(): string {
    return this.clientId;
  }

  getLatency(): number {
    return this.latency;
  }

  getState(): string {
    return this.connected ? 'connected' : 'disconnected';
  }

  getConnectionInfo(): Record<string, unknown> {
    return { url: this.url, clientId: this.clientId };
  }

  send(message: NetworkMessage): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.emit('error', {
        code: 'not_connected',
        message: '@hololand/network send() called before a WebSocket connection was open.',
      });
      return false;
    }
    this.socket.send(JSON.stringify({ ...message, timestamp: message.timestamp ?? Date.now() }));
    return true;
  }

  onMessage<T = any>(type: string, listener: Listener<NetworkMessage<T>>): () => void {
    return this.on<{ message: NetworkMessage<T> }>('message', ({ message }) => {
      if (message.type === type) listener(message);
    });
  }

  async joinRoom(id: string, options: Partial<RoomInfo> = {}): Promise<Room> {
    return new Room({
      id,
      name: options.name ?? id,
      playerCount: 1,
      maxPlayers: options.maxPlayers ?? 50,
      state: 'open',
      isPrivate: options.isPrivate ?? false,
      hostId: this.clientId,
      createdAt: Date.now(),
    });
  }
}

export class Room extends EventHub {
  private players: PlayerInfo[];

  constructor(private info: RoomInfo) {
    super();
    this.players = [
      {
        id: info.hostId ?? 'local',
        displayName: 'Local Player',
        role: 'host',
        joinedAt: Date.now(),
      },
    ];
  }

  getInfo(): RoomInfo {
    return { ...this.info, playerCount: this.players.length };
  }

  getPlayers(): PlayerInfo[] {
    return [...this.players];
  }

  send(type: string, payload?: unknown): void {
    this.emit(type, payload);
  }

  leave(): void {
    this.emit('left', { roomId: this.info.id });
  }
}

export class RoomManager {
  private currentRoom: Room | null = null;

  constructor(private readonly client: NetworkClient) {}

  async getRoomList(): Promise<RoomInfo[]> {
    return [];
  }

  async createRoom(options: { name: string; maxPlayers?: number }): Promise<Room> {
    this.currentRoom = new Room({
      id: `room_${Date.now()}`,
      name: options.name,
      playerCount: 1,
      maxPlayers: options.maxPlayers ?? 10,
      state: 'open',
      isPrivate: false,
      hostId: this.client.getClientId(),
      createdAt: Date.now(),
    });
    return this.currentRoom;
  }

  async joinRoom(roomId: string): Promise<Room> {
    this.currentRoom = await this.client.joinRoom(roomId);
    return this.currentRoom;
  }

  leaveCurrentRoom(): void {
    this.currentRoom?.leave();
    this.currentRoom = null;
  }
}

export class TextChat extends EventHub {
  constructor(
    private readonly clientOrUserId?: NetworkClient | string,
    private readonly displayName = 'Player',
  ) {
    super();
  }

  joinRoom(roomId: string, displayName?: string): void {
    this.emit('joined', { roomId, displayName });
  }

  leaveRoom(): void {
    this.emit('left', {});
  }

  send(content: string): void {
    const message: ChatMessage = {
      id: `msg_${Date.now()}`,
      type: 'text',
      senderId: typeof this.clientOrUserId === 'string' ? this.clientOrUserId : 'local',
      senderName: this.displayName,
      channel: 'room',
      content,
      timestamp: Date.now(),
    };
    this.emit('message', { message });
    this.emit('messageReceived', { message });
  }

  destroy(): void {
    this.leaveRoom();
  }
}

export class VoiceChat {
  private inVoice = false;
  private muted = false;

  constructor(private readonly client?: NetworkClient) {}

  async joinVoice(roomId: string): Promise<void> {
    if (!this.client?.isConnected()) {
      throw new Error('@hololand/network voice requires an active NetworkClient connection.');
    }
    this.inVoice = true;
  }

  leaveVoice(): void {
    this.inVoice = false;
  }

  isInVoice(): boolean {
    return this.inVoice;
  }

  mute(): void {
    this.muted = true;
  }

  unmute(): void {
    this.muted = false;
  }

  isMuted(): boolean {
    return this.muted;
  }

  destroy(): void {
    this.leaveVoice();
  }
}

export class StateSync {
  private snapshot: SyncState = {};

  processSnapshot(snapshot: SyncState): void {
    this.snapshot = { ...snapshot };
  }

  getSnapshot(): SyncState {
    return { ...this.snapshot };
  }
}

export class InterestManager {
  constructor(public readonly options: { viewDistance?: number } = {}) {}
}

export class StateSyncNetworkManager {
  private sendCallback: ((message: SyncMessage) => void) | null = null;

  constructor(private readonly peerId: string) {}

  setSendCallback(callback: (message: SyncMessage) => void): void {
    this.sendCallback = callback;
  }

  queueOperation(operation: CRDTOperation): void {
    this.sendCallback?.({
      type: 'state_sync',
      peerId: this.peerId,
      operations: [{ ...operation, actor: operation.actor ?? this.peerId, timestamp: Date.now() }],
      timestamp: Date.now(),
    });
  }

  handleNetworkMessage(message: SyncMessage): CRDTOperation[] {
    if (message.peerId === this.peerId) return [];
    return message.operations ?? [];
  }
}

export interface PlayerPresenceData {
  playerId: string;
  displayName: string;
  avatarUrl?: string;
  voiceState: 'muted' | 'speaking' | 'listening' | 'deafened';
  role: string;
  lastHeartbeat: number;
  metadata?: Record<string, unknown>;
}

export class CRDTRoom extends EventHub {
  private players = new Map<string, PlayerPresenceData>();

  constructor(public readonly localNodeId: string) {
    super();
  }

  getAllPlayers(): PlayerPresenceData[] {
    return Array.from(this.players.values());
  }

  getPlayer(playerId: string): PlayerPresenceData | undefined {
    return this.players.get(playerId);
  }

  updatePlayer(playerId: string, patch: Partial<PlayerPresenceData>): void {
    const player: PlayerPresenceData = {
      playerId,
      displayName: playerId,
      voiceState: 'listening',
      role: 'player',
      lastHeartbeat: Date.now(),
      ...(this.players.get(playerId) ?? {}),
      ...patch,
    };
    this.players.set(playerId, player);
    this.emit('player:updated', { player });
  }
}

export interface NetworkSystem {
  client: NetworkClient;
  bridge: {
    send: (message: NetworkMessage) => boolean;
    onMessage: (type: string, listener: Listener<NetworkMessage>) => () => void;
  };
  update: (delta: number) => void;
  dispose: () => void;
}

export function createHololandNetwork(config: NetworkClientConfig): NetworkSystem {
  const client = new NetworkClient(config);
  return {
    client,
    bridge: {
      send: (message) => client.send(message),
      onMessage: (type, listener) => client.onMessage(type, listener),
    },
    update: () => {},
    dispose: () => client.disconnect(),
  };
}

export default {
  NetworkClient,
  RoomManager,
  Room,
  TextChat,
  VoiceChat,
  StateSync,
  InterestManager,
  StateSyncNetworkManager,
  CRDTRoom,
  createHololandNetwork,
};
