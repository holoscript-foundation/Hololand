# @hololand/network

Real-time networking and multiplayer for the Hololand metaverse.

## Features

- **WebSocket Transport**: Low-latency real-time communication
- **State Synchronization**: Automatic object state sync across clients
- **Room Management**: Create, join, and manage multiplayer rooms
- **Presence System**: Track connected users and their states
- **Interest Management**: Only sync relevant objects per player
- **Lag Compensation**: Client-side prediction and server reconciliation

## Installation

```bash
pnpm add @hololand/network
```

## Usage

```typescript
import { NetworkClient, Room } from '@hololand/network';

// Connect to server
const client = new NetworkClient({
  url: 'wss://api.hololand.io',
  token: authToken,
});

await client.connect();

// Join or create room
const room = await client.joinRoom('my-world', {
  maxPlayers: 50,
  isPublic: true,
});

// Sync player position
room.send('player:move', {
  position: { x: 5, y: 0, z: 3 },
  rotation: { x: 0, y: 0.5, z: 0, w: 0.866 },
});

// Listen for other players
room.on('player:move', (data, playerId) => {
  updatePlayerPosition(playerId, data.position);
});
```

## State Synchronization

```typescript
import { SyncedObject } from '@hololand/network';

// Create synced object (automatically replicated)
const ball = new SyncedObject({
  id: 'ball-1',
  type: 'sphere',
  position: { x: 0, y: 5, z: 0 },
  physics: { velocity: { x: 1, y: 0, z: 0 } },
});

room.addSyncedObject(ball);

// Changes are automatically broadcast
ball.position.x = 10;
```

## Room Events

```typescript
room.on('player:join', (player) => {
  console.log(`${player.name} joined`);
});

room.on('player:leave', (player) => {
  console.log(`${player.name} left`);
});

room.on('state:sync', (state) => {
  // Full state synchronization
});
```

## API Reference

### NetworkClient

Main network client.

- `connect()` - Connect to server
- `disconnect()` - Disconnect
- `joinRoom(id, options?)` - Join/create room
- `leaveRoom()` - Leave current room

### Room

Multiplayer room.

- `send(type, data)` - Send message
- `on(type, handler)` - Listen for messages
- `addSyncedObject(obj)` - Add synchronized object
- `getPlayers()` - Get connected players

### SyncedObject

Automatically synchronized object.

- Properties auto-sync on change
- Supports interpolation and extrapolation
- Ownership and authority management

## License

MIT © Hololand Team
