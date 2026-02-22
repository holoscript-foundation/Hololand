# Quest State Migration Guide

This guide explains how to migrate from localStorage-based QuestState to database-backed QuestStateDB.

## What Changed

### Before (localStorage only)
```typescript
import { useQuestStore, useQuestActions } from './state/QuestState';

function MyComponent() {
  const { startQuest, completeQuest } = useQuestActions();

  const handleStart = () => {
    startQuest('quest-1'); // Only updates localStorage
  };
}
```

### After (Database-backed with Railway Postgres)
```typescript
import { useQuestStore, useQuestActions } from './state/QuestStateDB';
import { useQuestSync } from './hooks/useQuestSync';

function MyComponent() {
  const { startQuest, completeQuest } = useQuestActions();
  const { syncQuestStart, syncQuestComplete } = useQuestSync();

  const handleStart = async () => {
    startQuest('quest-1'); // Updates local state
    await syncQuestStart('quest-1'); // Syncs to database
  };
}
```

## Migration Steps

### 1. Add TRPCProvider to your app

```typescript
// main.tsx or App.tsx
import { TRPCProvider } from './providers/TRPCProvider';

function App() {
  return (
    <TRPCProvider>
      {/* Your app components */}
    </TRPCProvider>
  );
}
```

### 2. Update imports

Replace all imports from `./state/QuestState` with `./state/QuestStateDB`:

```typescript
// Before
import { useQuestStore, usePlayer, useQuestActions } from './state/QuestState';

// After
import { useQuestStore, usePlayer, useQuestActions } from './state/QuestStateDB';
```

### 3. Add useQuestSync hook

Add the `useQuestSync` hook to components that modify quest state:

```typescript
import { useQuestSync } from './hooks/useQuestSync';

function QuestComponent() {
  const { syncQuestStart, syncQuestComplete } = useQuestSync();
  const { startQuest, completeQuest } = useQuestActions();

  const handleStartQuest = async (questId: string) => {
    startQuest(questId);
    await syncQuestStart(questId);
  };

  const handleCompleteQuest = async (questId: string, rewards: any) => {
    completeQuest(questId, rewards);
    await syncQuestComplete(questId, rewards);
  };
}
```

### 4. Handle authentication

The database sync only works when the user is authenticated. Set the player ID after login:

```typescript
import { useQuestStore } from './state/QuestStateDB';
import { useQuestSync } from './hooks/useQuestSync';

function LoginComponent() {
  const setPlayerId = useQuestStore(state => state.setPlayerId);
  const { syncFromDatabase } = useQuestSync();

  const handleLogin = async (userId: string) => {
    setPlayerId(userId);
    await syncFromDatabase(); // Pull user's data from database
  };
}
```

## API Compatibility

The new `QuestStateDB` maintains 100% API compatibility with the original `QuestState`:

### Same Hooks
- ✅ `usePlayer()`
- ✅ `usePortals()`
- ✅ `useSkills()`
- ✅ `useQuests()`
- ✅ `useBadges()`
- ✅ `useQuestActions()`
- ✅ `usePortalUnlockStatus(portal)`

### Same Actions
- ✅ `startQuest(questId)`
- ✅ `completeQuest(questId, rewards)`
- ✅ `updateQuestProgress(questId, progress)`
- ✅ `unlockPortal(portal)`
- ✅ `increaseSkill(skill, amount)`
- ✅ `addBadge(badge)`
- ✅ `addNPCInteraction(npcId)`

### New Actions
- 🆕 `syncFromDB()` - Pull data from database
- 🆕 `syncToDB()` - Push data to database

### New Hooks
- 🆕 `useQuestSync()` - Automatic database sync
- 🆕 `useIsSyncing()` - Check sync status
- 🆕 `useLastSyncedAt()` - Get last sync timestamp

## Offline Support

The new system gracefully handles offline scenarios:

1. **Not Authenticated**: Falls back to localStorage only
2. **Offline**: Local changes are queued, synced when online
3. **Sync Failed**: Keeps local state, retries later

## Example: Complete Migration

### Before (QuestState.ts)
```typescript
import { useQuestActions } from './state/QuestState';

function TreasureQuest() {
  const { startQuest, completeQuest } = useQuestActions();

  const handleComplete = () => {
    completeQuest('treasure-quest', {
      skills: { courage: 10, wisdom: 5 },
      badges: ['treasure-hunter'],
      unlocks: ['fantasy']
    });
  };

  return <button onClick={handleComplete}>Complete</button>;
}
```

### After (QuestStateDB.ts)
```typescript
import { useQuestActions } from './state/QuestStateDB';
import { useQuestSync } from './hooks/useQuestSync';

function TreasureQuest() {
  const { startQuest, completeQuest } = useQuestActions();
  const { syncQuestComplete, isCompletingQuest } = useQuestSync();

  const handleComplete = async () => {
    const rewards = {
      skills: { courage: 10, wisdom: 5 },
      badges: ['treasure-hunter'],
      unlocks: ['fantasy' as const]
    };

    completeQuest('treasure-quest', rewards);
    await syncQuestComplete('treasure-quest', rewards);
  };

  return (
    <button onClick={handleComplete} disabled={isCompletingQuest}>
      {isCompletingQuest ? 'Completing...' : 'Complete'}
    </button>
  );
}
```

## Testing

To test the migration:

1. **Local Development**: Works with localStorage
2. **With Database**: Set `VITE_API_URL` to your Railway backend
3. **Check Sync**: Use `useQuestSyncStatus()` to monitor sync state

```typescript
import { useQuestSyncStatus } from './hooks/useQuestSync';

function DebugPanel() {
  const { isSyncing, lastSyncedAt, lastSyncedAgo } = useQuestSyncStatus();

  return (
    <div>
      <p>Syncing: {isSyncing ? 'Yes' : 'No'}</p>
      <p>Last synced: {lastSyncedAgo ? `${Math.floor(lastSyncedAgo / 1000)}s ago` : 'Never'}</p>
    </div>
  );
}
```

## Rollback Plan

If you need to rollback, simply revert the imports:

```typescript
// Rollback to localStorage only
import { useQuestStore } from './state/QuestState';
```

The original `QuestState.ts` file remains unchanged and fully functional.

## Next Steps

1. ✅ Update all components to use `QuestStateDB`
2. ✅ Add `TRPCProvider` to app root
3. ✅ Test database sync with Railway Postgres
4. ✅ Add loading states for sync operations
5. ✅ Implement offline queue for failed syncs
6. ✅ Add sync status indicator to UI
