# 09 - Multiplayer Lobby

The flagship Phase 3 example: **Real-time multiplayer with rooms, chat, and voice**.

This demonstrates Hololand's networking capabilities for building multiplayer VR/AR experiences.

## Features Demonstrated

- **Room System**: Create, join, and manage virtual rooms
- **Player Presence**: Real-time player synchronization
- **Text Chat**: Instant messaging with emotes
- **Voice Chat**: WebRTC-based spatial voice
- **State Sync**: Smooth interpolation of networked objects

## Running the Example

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Note: Runs in demo mode without a server. Connect to `wss://your-server:8080` for full functionality.

## Architecture

```
+------------------------------------------------------------------+
|                         Main View                                 |
|  +------------------+  +--------------------------------------+  |
|  |    Sidebar UI    |  |           Room Canvas               |  |
|  |  +------------+  |  |                                      |  |
|  |  | Connection |  |  |     [Player1]      [Player2]        |  |
|  |  | Status     |  |  |        @              @             |  |
|  |  | Name Input |  |  |      Alice          Bob             |  |
|  |  +------------+  |  |                                      |  |
|  |  +------------+  |  |          [Player3]                  |  |
|  |  | Room List  |  |  |             @                       |  |
|  |  | - Room 1   |  |  |           Charlie                   |  |
|  |  | - Room 2   |  |  |                                      |  |
|  |  | [Create]   |  |  +--------------------------------------+  |
|  |  +------------+  |  +--------------------------------------+  |
|  |  +------------+  |  |            Chat Panel                |  |
|  |  | Current    |  |  | [Alice]: Hello everyone!            |  |
|  |  | Room Info  |  |  | [Bob]: Hey! Ready to build?         |  |
|  |  | Players    |  |  | [System]: Charlie joined            |  |
|  |  | [Leave]    |  |  | [_______________] [Send]            |  |
|  |  +------------+  |  +--------------------------------------+  |
|  |  +------------+  |                                           |
|  |  | Voice Chat |  |                                           |
|  |  | [x] Join   |  |                                           |
|  |  | [ ] Mute   |  |                                           |
|  |  +------------+  |                                           |
|  +------------------+                                           |
+------------------------------------------------------------------+
```

## Network Components

| Component | Purpose |
|-----------|---------|
| `NetworkClient` | WebSocket connection management |
| `RoomManager` | Room creation and joining |
| `StateSync` | Object state interpolation |
| `InterestManager` | Spatial relevance filtering |
| `VoiceChat` | WebRTC voice channels |
| `TextChat` | Real-time messaging |

## Room Operations

```typescript
// Create a room
const room = await roomManager.createRoom({
  name: "My VR Room",
  maxPlayers: 10,
});

// Join a room
const room = await roomManager.joinRoom(roomId);

// Listen for events
room.on('playerJoined', ({ player }) => {
  console.log(`${player.displayName} joined!`);
});

// Update position (synced to other players)
room.updatePosition({ x: 1, y: 0, z: 2 });

// Leave room
room.leave();
```

## Chat Integration

```typescript
// Join chat
textChat.joinRoom(roomId, displayName);

// Send message
textChat.send("Hello everyone!");

// Send emote
textChat.sendEmote(":wave:");

// Listen for messages
textChat.on('message', ({ message }) => {
  console.log(`${message.senderName}: ${message.content}`);
});
```

## Voice Chat

```typescript
// Join voice
await voiceChat.joinVoice(roomId);

// Mute/unmute
voiceChat.mute();
voiceChat.unmute();

// Spatial audio
voiceChat.updateLocalPosition({ x: 0, y: 0, z: 0 });
voiceChat.updateParticipantPosition(playerId, position);

// Leave voice
voiceChat.leaveVoice();
```

## Server Requirements

For full functionality, run a compatible WebSocket server that handles:

- `createRoom` / `joinRoom` / `leaveRoom`
- `chatMessage` / `chatWhisper`
- `voiceJoin` / `voiceLeave`
- WebRTC signaling (offer/answer/ICE candidates)
- State synchronization broadcasts

## Use Cases

- **VR Social Spaces**: Hang out with friends in virtual rooms
- **Multiplayer Games**: Real-time competitive/cooperative gameplay
- **Virtual Events**: Conferences, concerts, meetups
- **Collaborative Building**: Create worlds together in real-time
- **Remote Work**: Virtual offices and meeting rooms
