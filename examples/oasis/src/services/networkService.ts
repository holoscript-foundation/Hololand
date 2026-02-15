import { NetworkClient, Room } from '@hololand/network';

// Singleton network client
let client: NetworkClient | null = null;
let currentRoom: Room | null = null;

export interface NetworkConfig {
  url: string;
  token?: string;
}

/**
 * Initialize the network client
 */
export async function initNetwork(config: NetworkConfig): Promise<NetworkClient> {
  if (client?.isConnected()) {
    return client;
  }

  client = new NetworkClient({
    url: config.url || import.meta.env.VITE_WS_URL || 'wss://api.hololand.io',
    reconnect: true,
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    heartbeatInterval: 30000,
    timeout: 10000,
  });

  // Set up global event listeners
  client.on('connected', ({ clientId }) => {
    console.log('[Network] Connected as', clientId);
  });

  client.on('disconnected', ({ reason }) => {
    console.log('[Network] Disconnected:', reason);
  });

  client.on('error', ({ message, code }) => {
    console.error('[Network] Error:', code, message);
  });

  client.on('reconnecting', ({ attempt, maxAttempts }) => {
    console.log(`[Network] Reconnecting... ${attempt}/${maxAttempts}`);
  });

  await client.connect();
  return client;
}

/**
 * Get the current network client
 */
export function getNetworkClient(): NetworkClient | null {
  return client;
}

/**
 * Join a world room
 */
export async function joinWorldRoom(
  worldId: string,
  options?: {
    maxPlayers?: number;
    isPublic?: boolean;
  }
): Promise<Room> {
  if (!client?.isConnected()) {
    throw new Error('Network client not connected');
  }

  // Leave current room if any
  if (currentRoom) {
    await leaveCurrentRoom();
  }

  currentRoom = await client.joinRoom(worldId, {
    maxPlayers: options?.maxPlayers || 50,
    isPublic: options?.isPublic ?? true,
  });

  // Set up room event listeners
  currentRoom.on('player:join', (player) => {
    console.log(`[Room] ${player.name} joined`);
  });

  currentRoom.on('player:leave', (player) => {
    console.log(`[Room] ${player.name} left`);
  });

  return currentRoom;
}

/**
 * Leave the current room
 */
export async function leaveCurrentRoom(): Promise<void> {
  if (currentRoom) {
    currentRoom.leave();
    currentRoom = null;
  }
}

/**
 * Get the current room
 */
export function getCurrentRoom(): Room | null {
  return currentRoom;
}

/**
 * Send player position update
 */
export function sendPlayerMove(
  position: { x: number; y: number; z: number },
  rotation?: { x: number; y: number; z: number; w: number }
): void {
  if (currentRoom) {
    currentRoom.send('player:move', {
      position,
      rotation: rotation || { x: 0, y: 0, z: 0, w: 1 },
      timestamp: Date.now(),
    });
  }
}

/**
 * Send chat message to room
 */
export function sendChatMessage(message: string): void {
  if (currentRoom) {
    currentRoom.send('chat:message', {
      message,
      timestamp: Date.now(),
    });
  }
}

/**
 * Disconnect from network
 */
export function disconnect(): void {
  if (currentRoom) {
    currentRoom.leave();
    currentRoom = null;
  }
  if (client) {
    client.disconnect();
    client = null;
  }
}

/**
 * Get connection info
 */
export function getConnectionInfo() {
  if (!client) return null;
  return {
    connected: client.isConnected(),
    latency: client.getLatency(),
    state: client.getState(),
    ...client.getConnectionInfo(),
  };
}
