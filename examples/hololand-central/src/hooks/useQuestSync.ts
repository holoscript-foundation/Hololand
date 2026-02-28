/**
 * Quest Sync Hook
 *
 * Automatically syncs quest progress with Railway Postgres database
 * Uses tRPC for type-safe API calls
 */

import { useEffect, useCallback } from 'react';
import { trpc } from '../utils/trpc';
import { useQuestStore } from '../state/QuestStateDB';
import type { SkillLevels, PortalStates } from '../state/QuestState';

/**
 * Hook to sync quest progress with database
 *
 * Usage:
 * ```tsx
 * function App() {
 *   const { syncStatus, manualSync } = useQuestSync();
 *   // ...
 * }
 * ```
 */
export function useQuestSync() {
  const utils = trpc.useUtils();
  const player = useQuestStore((state) => state.progress.player);
  const isSyncing = useQuestStore((state) => state.isSyncing);

  // ==========================================
  // MUTATIONS
  // ==========================================

  const startQuestMutation = trpc.quest.start.useMutation({
    onSuccess: () => {
      console.log('[useQuestSync] Quest started successfully');
      utils.quest.getAll.invalidate();
    },
    onError: (error) => {
      console.error('[useQuestSync] Failed to start quest:', error);
    },
  });

  const completeQuestMutation = trpc.quest.complete.useMutation({
    onSuccess: () => {
      console.log('[useQuestSync] Quest completed successfully');
      utils.quest.getAll.invalidate();
      utils.user.getSkills.invalidate();
      utils.user.getBadges.invalidate();
      utils.portal.getUnlocked.invalidate();
    },
    onError: (error) => {
      console.error('[useQuestSync] Failed to complete quest:', error);
    },
  });

  const updateProgressMutation = trpc.quest.updateProgress.useMutation({
    onError: (error) => {
      console.error('[useQuestSync] Failed to update progress:', error);
    },
  });

  const unlockPortalMutation = trpc.portal.unlock.useMutation({
    onSuccess: () => {
      console.log('[useQuestSync] Portal unlocked successfully');
      utils.portal.getUnlocked.invalidate();
    },
    onError: (error) => {
      console.error('[useQuestSync] Failed to unlock portal:', error);
    },
  });

  // ==========================================
  // SYNC FUNCTIONS
  // ==========================================

  /**
   * Sync quest start to database
   */
  const syncQuestStart = useCallback(
    async (questId: string) => {
      if (!player.id) return;

      try {
        await startQuestMutation.mutateAsync({ questId });
      } catch (error) {
        console.error('[useQuestSync] syncQuestStart failed:', error);
      }
    },
    [player.id, startQuestMutation]
  );

  /**
   * Sync quest completion to database
   */
  const syncQuestComplete = useCallback(
    async (
      questId: string,
      rewards: {
        skills?: Partial<SkillLevels>;
        badges?: string[];
        unlocks?: (keyof PortalStates)[];
      }
    ) => {
      if (!player.id) return;

      try {
        // Convert rewards to database format
        const dbRewards = {
          skills: rewards.skills
            ? Object.fromEntries(
                Object.entries(rewards.skills).map(([k, v]) => [k, v || 0])
              )
            : undefined,
          badges: rewards.badges,
          unlocks: rewards.unlocks?.map((p) => String(p)),
        };

        await completeQuestMutation.mutateAsync({
          questId,
          rewards: dbRewards,
        });
      } catch (error) {
        console.error('[useQuestSync] syncQuestComplete failed:', error);
      }
    },
    [player.id, completeQuestMutation]
  );

  /**
   * Sync quest progress to database (debounced)
   */
  const syncQuestProgress = useCallback(
    async (questId: string, progress: number) => {
      if (!player.id) return;

      try {
        await updateProgressMutation.mutateAsync({ questId, progress });
      } catch (error) {
        console.error('[useQuestSync] syncQuestProgress failed:', error);
      }
    },
    [player.id, updateProgressMutation]
  );

  /**
   * Sync portal unlock to database
   */
  const syncPortalUnlock = useCallback(
    async (portalId: string) => {
      if (!player.id) return;

      try {
        await unlockPortalMutation.mutateAsync({ portalId });
      } catch (error) {
        console.error('[useQuestSync] syncPortalUnlock failed:', error);
      }
    },
    [player.id, unlockPortalMutation]
  );

  /**
   * Full sync from database (pull all data)
   */
  const syncFromDatabase = useCallback(async () => {
    if (!player.id) {
      console.log('[useQuestSync] Not authenticated, skipping sync');
      return;
    }

    console.log('[useQuestSync] Syncing from database...');

    try {
      useQuestStore.setState({ isSyncing: true });

      // Fetch all data from database
      const [questsData, skillsData, portalsData, badgesData] =
        await Promise.all([
          utils.quest.getAll.fetch(),
          utils.user.getSkills.fetch(),
          utils.portal.getUnlocked.fetch(),
          utils.user.getBadges.fetch(),
        ]);

      // Update local state with database data
      const state = useQuestStore.getState();

      // Convert database format to local format
      const updatedProgress = {
        ...state.progress,
        quests: {
          active: questsData
            .filter((q) => q.status === 'active')
            .map((q) => ({
              id: q.questId,
              genre: 'adventure', // TODO: Add genre to database
              status: 'active' as const,
              progress: q.progress,
              startedAt: q.startedAt?.getTime(),
            })),
          completed: questsData
            .filter((q) => q.status === 'completed')
            .map((q) => ({
              id: q.questId,
              genre: 'adventure',
              status: 'completed' as const,
              progress: 100,
              startedAt: q.startedAt?.getTime(),
              completedAt: q.completedAt?.getTime(),
            })),
          available: state.progress.quests.available, // Keep local available quests
        },
        skills: Object.fromEntries(
          skillsData.map((s) => [s.skillName, s.level])
        ) as SkillLevels,
        portals: Object.fromEntries(
          portalsData.map((p) => [p.portalId, true])
        ) as PortalStates,
        badges: badgesData.map((b) => b.badgeName),
      };

      useQuestStore.setState({
        progress: updatedProgress,
        isSyncing: false,
        lastSyncedAt: Date.now(),
      });

      console.log('[useQuestSync] Sync from database complete');
    } catch (error) {
      console.error('[useQuestSync] Failed to sync from database:', error);
      useQuestStore.setState({ isSyncing: false });
    }
  }, [player.id, utils]);

  // ==========================================
  // AUTO-SYNC ON MOUNT
  // ==========================================

  useEffect(() => {
    if (player.id) {
      syncFromDatabase();
    }
  }, [player.id]); // Only sync when player.id changes

  // ==========================================
  // RETURN API
  // ==========================================

  return {
    // Sync functions
    syncQuestStart,
    syncQuestComplete,
    syncQuestProgress,
    syncPortalUnlock,
    syncFromDatabase,

    // Status
    isSyncing,
    lastSyncedAt: useQuestStore((state) => state.lastSyncedAt),

    // Mutation states
    isStartingQuest: startQuestMutation.isPending,
    isCompletingQuest: completeQuestMutation.isPending,
    isUpdatingProgress: updateProgressMutation.isPending,
    isUnlockingPortal: unlockPortalMutation.isPending,
  };
}

/**
 * Hook to get quest sync status
 */
export function useQuestSyncStatus() {
  const isSyncing = useQuestStore((state) => state.isSyncing);
  const lastSyncedAt = useQuestStore((state) => state.lastSyncedAt);

  return {
    isSyncing,
    lastSyncedAt,
    lastSyncedAgo: lastSyncedAt ? Date.now() - lastSyncedAt : null,
  };
}
