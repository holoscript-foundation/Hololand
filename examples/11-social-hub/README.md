# Example 11: Social Hub

Complete social features demonstration using @hololand/social v2.0.

## Features

### Friend System
- **Friend List**: View all friends with online status
- **Friend Requests**: Accept or reject incoming requests
- **Favorites**: Mark friends as favorites for quick access
- **Blocking**: Block and unblock users
- **Search**: Filter friends by name

### Party System
- **Create Party**: Set name, privacy, and max size
- **Party Invites**: Send and receive party invitations
- **Join/Leave**: Seamlessly join and leave parties
- **Voice Integration**: Party voice chat support

### Emote System
- **20+ Built-in Emotes**: Greetings, expressions, dances, actions, reactions
- **Visual Feedback**: Animated emote display
- **Unlock System**: Some emotes require unlocking
- **Quick Access**: Click to perform emotes instantly

### Notification System
- **Real-time Notifications**: Friend requests, party invites, achievements
- **Actionable**: Accept/decline directly from notifications
- **Preferences**: Control which notifications you receive
- **Status Management**: Set presence and status messages

## Packages Used

- `@hololand/core` - Core utilities
- `@hololand/social` - Complete social feature set
- `@hololand/network` - Network integration

## Running

```bash
cd examples/11-social-hub
pnpm install
pnpm dev
```

## UI Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│                           Social Hub                      [User Profile]│
├──────────────────┬────────────────────────────┬─────────────────────────┤
│                  │                            │                         │
│   FRIENDS        │     MY PARTY               │    NOTIFICATIONS        │
│                  │     ┌──────────────────┐   │                         │
│   ┌───────────┐  │     │ Party Card       │   │   ┌─────────────────┐   │
│   │ Friend 1  │  │     │ Members: ●●●●    │   │   │ Friend Request  │   │
│   │ Friend 2  │  │     │ [Leave]          │   │   │ [Accept][Reject]│   │
│   │ Friend 3  │  │     └──────────────────┘   │   └─────────────────┘   │
│   └───────────┘  │                            │                         │
│                  │     PARTY INVITES          │   ┌─────────────────┐   │
│   [All][Online]  │     ┌──────────────────┐   │   │ Party Invite    │   │
│   [Requests]     │     │ Invite from Alex │   │   │ [Join][Decline] │   │
│   [Blocked]      │     │ [Join][Decline]  │   │   └─────────────────┘   │
│                  │     └──────────────────┘   │                         │
│                  │                            │   ─────────────────────  │
│                  │     EMOTES                 │                         │
│                  │     ┌──┬──┬──┬──┬──┬──┐   │   STATUS                │
│                  │     │👋│🙇│🫡│🤜│😄│😢│   │   [🟢][🟡][🔴][⚫]      │
│                  │     │😂│🤷│🤔│🕺│🏆│🤖│   │                         │
│                  │     │👏│👆│🪑│🧘│👍│👎│   │   [Status message...]   │
│                  │     │❤️│🔥│        │   │                         │
│                  │     └──┴──┴──┴──┴──┴──┘   │                         │
└──────────────────┴────────────────────────────┴─────────────────────────┘
```

## Code Examples

### Friend System
```typescript
import { createFriendSystem } from '@hololand/social';

const friends = createFriendSystem(userId, displayName);

// Send friend request
friends.sendFriendRequest(targetId, targetName, 'Hey, let\'s connect!');

// Accept request
friends.acceptFriendRequest(requestId);

// Get online friends
const online = friends.getOnlineFriends();

// Block a user
friends.blockUser(userId, displayName, 'Spam');
```

### Party System
```typescript
import { createPartySystem } from '@hololand/social';

const party = createPartySystem(userId, displayName);

// Create a party
const myParty = party.createParty({
  name: 'Building Crew',
  privacy: 'friends',
  maxSize: 8,
  voiceEnabled: true,
});

// Invite a friend
party.sendInvite(friendId, friendName);

// Accept an invite
party.acceptInvite(inviteId);

// Leave party
party.leaveParty();
```

### Emote System
```typescript
import { createEmoteSystem } from '@hololand/social';

const emotes = createEmoteSystem(userId, displayName);

// Play an emote
emotes.playEmote('wave');

// Quick access methods
emotes.wave();
emotes.clap();
emotes.dance();
emotes.thumbsUp();

// Get all available emotes
const allEmotes = emotes.getEmotes();
const unlockedEmotes = emotes.getUnlockedEmotes();
```

### Notification System
```typescript
import { createNotificationSystem } from '@hololand/social';

const notifs = createNotificationSystem(userId);

// Push custom notification
notifs.push({
  type: 'system',
  title: 'Hello!',
  message: 'Welcome to Hololand',
  priority: 'normal',
});

// Convenience methods
notifs.notifyFriendRequest(fromName, requestId);
notifs.notifyPartyInvite(fromName, partyName, inviteId);
notifs.notifyAchievement('Explorer', 'Visited 10 worlds');

// Status management
notifs.setPresence('online');
notifs.setStatusMessage('Building something cool!');
notifs.setActivityInWorld(worldId, worldName);
```

## Events

### Friend Events
- `friendAdded` - New friend added
- `friendRemoved` - Friend removed
- `friendRequestReceived` - Incoming request
- `friendStatusChanged` - Online status changed
- `userBlocked` / `userUnblocked`

### Party Events
- `partyCreated` - Party created
- `partyJoined` / `partyLeft`
- `partyInviteReceived`
- `memberJoined` / `memberLeft`
- `leaderChanged`

### Emote Events
- `emotePerformed` - Emote played
- `gesturePerformed` - Gesture played

### Notification Events
- `notificationReceived`
- `notificationRead`
- `notificationCleared`

## Demo Mode

This example includes demo data for testing. In production, connect to your backend:

```typescript
// Set network callback for real-time sync
friendSystem.setNetworkCallback((type, data) => {
  websocket.send(JSON.stringify({ type, data }));
});

// Handle incoming network events
websocket.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  friendSystem.handleNetworkEvent(type, data);
};
```
