# @hololand/social

> Avatars & Presence Tracking for Hololand Metaverse

## Installation

```bash
npm install @hololand/social
```

## Features

- **Avatar Management** - Create and customize user avatars
- **Presence Tracking** - Real-time online/offline status
- **Position Sharing** - Track user positions in 3D space
- **Profile Data** - Store and retrieve user profile information

## Quick Start

```typescript
import { Avatar, PresenceManager } from '@hololand/social';

// Create an avatar
const avatar = new Avatar({
  id: 'user-123',
  displayName: 'Alice',
  color: 0xff69b4,
});

// Track presence
const presence = new PresenceManager();
presence.setOnline('user-123', { x: 0, y: 1, z: -5 });

// Get online users
const onlineUsers = presence.getOnlineUsers();
```

## API

### Avatar

```typescript
const avatar = new Avatar({
  id: string;
  displayName: string;
  color?: number;
  modelUrl?: string;
});

avatar.updatePosition({ x, y, z });
avatar.updateRotation({ x, y, z, w });
avatar.setExpression('happy' | 'neutral' | 'thinking');
```

### PresenceManager

```typescript
const presence = new PresenceManager();

presence.setOnline(userId, position);
presence.setOffline(userId);
presence.updatePosition(userId, position);
presence.getOnlineUsers(): User[];
presence.isOnline(userId): boolean;
```

## License

MIT
