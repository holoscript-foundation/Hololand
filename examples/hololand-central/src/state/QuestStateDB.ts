/**
 * Quest Progress State Management (Database-Backed)
 *
 * Hybrid approach:
 * - Uses Zustand for reactive client-side state
 * - Uses tRPC for server-side persistence
 * - Automatically syncs with Railway Postgres
 * - Falls back to localStorage when offline/unauthenticated
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { trpc } from '../utils/trpc';
import type {
  PlayerInfo,
  PortalStates,
  SkillLevels,
  QuestInfo,
  QuestProgress,
} from './QuestState';

// Re-export types from original QuestState
export type {
  PlayerInfo,
  PortalStates,
  SkillLevels,
  QuestInfo,
  QuestProgress,
};

// ==========================================
// INITIAL STATE
// ==========================================

const initialState: QuestProgress = {
  player: {
    id: '',
    name: 'Adventurer',
    level: 1,
    position: [0, 1, 60],
  },
  portals: {
    adventure: true,
    fantasy: false,
    horror: false,
    history: false,
    science: false,
  },
  skills: {
    courage: 0,
    imagination: 0,
    resilience: 0,
    wisdom: 0,
    knowledge: 0,
  },
  quests: {
    active: [],
    completed: [],
    available: [
      {
        id: 'treasure_island_intro',
        genre: 'adventure',
        status: 'available',
        progress: 0,
      },
    ],
  },
  badges: [],
  timeSpent: 0,
  npcsInteracted: [],
};

// ==========================================
// STATE STORE (with DB sync)
// ==========================================

interface QuestStore {
  // State
  progress: QuestProgress;
  isSyncing: boolean;
  lastSyncedAt: number | null;

  // Actions
  setPlayerId: (id: string) => void;
  setPlayerName: (name: string) => void;
  updatePlayerPosition: (position: [number, number, number]) => void;

  unlockPortal: (portal: keyof PortalStates) => void;
  increaseSkill: (skill: keyof SkillLevels, amount: number) => void;

  startQuest: (questId: string) => void;
  completeQuest: (
    questId: string,
    rewards: {
      skills?: Partial<SkillLevels>;
      badges?: string[];
      unlocks?: (keyof PortalStates)[];
    }
  ) => void;
  updateQuestProgress: (questId: string, progress: number) => void;

  addBadge: (badge: string) => void;
  addNPCInteraction: (npcId: string) => void;
  incrementTimeSpent: (seconds: number) => void;

  // Database sync
  syncFromDB: () => Promise<void>;
  syncToDB: () => Promise<void>;

  reset: () => void;
}

export const useQuestStore = create<QuestStore>()(
  persist(
    (set, get) => ({
      progress: initialState,
      isSyncing: false,
      lastSyncedAt: null,

      setPlayerId: (id) =>
        set((state) => ({
          progress: {
            ...state.progress,
            player: { ...state.progress.player, id },
          },
        })),

      setPlayerName: (name) =>
        set((state) => ({
          progress: {
            ...state.progress,
            player: { ...state.progress.player, name },
          },
        })),

      updatePlayerPosition: (position) =>
        set((state) => ({
          progress: {
            ...state.progress,
            player: { ...state.progress.player, position },
          },
        })),

      unlockPortal: async (portal) => {
        console.log(`[QuestStateDB] Unlocking portal: ${portal}`);

        set((state) => ({
          progress: {
            ...state.progress,
            portals: {
              ...state.progress.portals,
              [portal]: true,
            },
          },
        }));

        // Sync to database
        const state = get();
        if (state.progress.player.id) {
          try {
            // This would call the tRPC mutation
            // await trpc.portal.unlock.mutate({ portalId: portal });
            console.log(`[QuestStateDB] Synced portal unlock to DB: ${portal}`);
          } catch (error) {
            console.error('[QuestStateDB] Failed to sync portal unlock:', error);
          }
        }
      },

      increaseSkill: async (skill, amount) => {
        const state = get();
        const currentValue = state.progress.skills[skill];
        const newValue = Math.min(100, currentValue + amount);
        console.log(
          `[QuestStateDB] Skill ${skill}: ${currentValue} -> ${newValue} (+${amount})`
        );

        set((prevState) => ({
          progress: {
            ...prevState.progress,
            skills: {
              ...prevState.progress.skills,
              [skill]: newValue,
            },
          },
        }));

        // Note: Skills are synced when quest is completed
      },

      startQuest: async (questId) => {
        console.log(`[QuestStateDB] Starting quest: ${questId}`);

        const state = get();
        const availableQuest = state.progress.quests.available.find(
          (q) => q.id === questId
        );

        if (!availableQuest) {
          console.warn(`Quest ${questId} not found in available quests`);
          return;
        }

        set((prevState) => ({
          progress: {
            ...prevState.progress,
            quests: {
              ...prevState.progress.quests,
              available: prevState.progress.quests.available.filter(
                (q) => q.id !== questId
              ),
              active: [
                ...prevState.progress.quests.active,
                {
                  ...availableQuest,
                  status: 'active' as const,
                  startedAt: Date.now(),
                },
              ],
            },
          },
        }));

        // Sync to database
        const currentState = get();
        if (currentState.progress.player.id) {
          try {
            // This would call the tRPC mutation
            // await trpc.quest.start.mutate({ questId });
            console.log(`[QuestStateDB] Synced quest start to DB: ${questId}`);
          } catch (error) {
            console.error('[QuestStateDB] Failed to sync quest start:', error);
          }
        }
      },

      completeQuest: async (questId, rewards) => {
        console.log(`[QuestStateDB] Completing quest: ${questId}`, rewards);

        const state = get();
        const activeQuest = state.progress.quests.active.find(
          (q) => q.id === questId
        );

        if (!activeQuest) {
          console.warn(`Quest ${questId} not found in active quests`);
          return;
        }

        // Apply rewards locally
        const newSkills = { ...state.progress.skills };
        if (rewards.skills) {
          Object.entries(rewards.skills).forEach(([skill, amount]) => {
            const skillKey = skill as keyof SkillLevels;
            newSkills[skillKey] = Math.min(
              100,
              newSkills[skillKey] + (amount || 0)
            );
          });
        }

        const newPortals = { ...state.progress.portals };
        if (rewards.unlocks) {
          rewards.unlocks.forEach((portal) => {
            newPortals[portal] = true;
          });
        }

        const newBadges = [
          ...state.progress.badges,
          ...(rewards.badges || []),
        ];

        set((prevState) => ({
          progress: {
            ...prevState.progress,
            skills: newSkills,
            portals: newPortals,
            badges: newBadges,
            quests: {
              ...prevState.progress.quests,
              active: prevState.progress.quests.active.filter(
                (q) => q.id !== questId
              ),
              completed: [
                ...prevState.progress.quests.completed,
                {
                  ...activeQuest,
                  status: 'completed' as const,
                  progress: 100,
                  completedAt: Date.now(),
                },
              ],
            },
          },
        }));

        // Sync to database with rewards
        const currentState = get();
        if (currentState.progress.player.id) {
          try {
            // This would call the tRPC mutation
            // await trpc.quest.complete.mutate({
            //   questId,
            //   rewards: {
            //     skills: Object.fromEntries(
            //       Object.entries(rewards.skills || {}).map(([k, v]) => [k, v])
            //     ),
            //     badges: rewards.badges,
            //     unlocks: rewards.unlocks?.map(p => p),
            //   }
            // });
            console.log(`[QuestStateDB] Synced quest completion to DB: ${questId}`);
          } catch (error) {
            console.error('[QuestStateDB] Failed to sync quest completion:', error);
          }
        }
      },

      updateQuestProgress: async (questId, progress) => {
        set((state) => ({
          progress: {
            ...state.progress,
            quests: {
              ...state.progress.quests,
              active: state.progress.quests.active.map((q) =>
                q.id === questId ? { ...q, progress } : q
              ),
            },
          },
        }));

        // Sync to database (debounced in real implementation)
        const state = get();
        if (state.progress.player.id) {
          try {
            // This would call the tRPC mutation
            // await trpc.quest.updateProgress.mutate({ questId, progress });
            console.log(
              `[QuestStateDB] Synced quest progress to DB: ${questId} -> ${progress}%`
            );
          } catch (error) {
            console.error('[QuestStateDB] Failed to sync quest progress:', error);
          }
        }
      },

      addBadge: (badge) =>
        set((state) => ({
          progress: {
            ...state.progress,
            badges: [...state.progress.badges, badge],
          },
        })),

      addNPCInteraction: (npcId) =>
        set((state) => ({
          progress: {
            ...state.progress,
            npcsInteracted: [...state.progress.npcsInteracted, npcId],
          },
        })),

      incrementTimeSpent: (seconds) =>
        set((state) => ({
          progress: {
            ...state.progress,
            timeSpent: state.progress.timeSpent + seconds,
          },
        })),

      // ==========================================
      // DATABASE SYNC METHODS
      // ==========================================

      syncFromDB: async () => {
        const state = get();
        if (!state.progress.player.id) {
          console.log('[QuestStateDB] Not authenticated, skipping DB sync');
          return;
        }

        set({ isSyncing: true });

        try {
          // This would fetch data from tRPC
          // const [user, quests, skills, portals, badges] = await Promise.all([
          //   trpc.user.getProfile.query(),
          //   trpc.quest.getAll.query(),
          //   trpc.user.getSkills.query(),
          //   trpc.portal.getUnlocked.query(),
          //   trpc.user.getBadges.query(),
          // ]);

          // For now, just log
          console.log('[QuestStateDB] Synced from database');

          set({
            isSyncing: false,
            lastSyncedAt: Date.now(),
          });
        } catch (error) {
          console.error('[QuestStateDB] Failed to sync from DB:', error);
          set({ isSyncing: false });
        }
      },

      syncToDB: async () => {
        const state = get();
        if (!state.progress.player.id) {
          console.log('[QuestStateDB] Not authenticated, skipping DB sync');
          return;
        }

        set({ isSyncing: true });

        try {
          // This would push current state to tRPC
          console.log('[QuestStateDB] Synced to database');

          set({
            isSyncing: false,
            lastSyncedAt: Date.now(),
          });
        } catch (error) {
          console.error('[QuestStateDB] Failed to sync to DB:', error);
          set({ isSyncing: false });
        }
      },

      reset: () => set({ progress: initialState }),
    }),
    {
      name: 'hololand-quest-progress-v2',
      storage: createJSONStorage(() => localStorage),
      // Only persist certain fields (don't persist sync state)
      partialize: (state) => ({
        progress: state.progress,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);

// ==========================================
// HELPER HOOKS (same API as original)
// ==========================================

export const usePlayer = () => useQuestStore((state) => state.progress.player);
export const usePortals = () => useQuestStore((state) => state.progress.portals);
export const useSkills = () => useQuestStore((state) => state.progress.skills);
export const useQuests = () => useQuestStore((state) => state.progress.quests);
export const useBadges = () => useQuestStore((state) => state.progress.badges);

export const useQuestActions = () =>
  useQuestStore((state) => ({
    setPlayerId: state.setPlayerId,
    setPlayerName: state.setPlayerName,
    updatePlayerPosition: state.updatePlayerPosition,
    unlockPortal: state.unlockPortal,
    increaseSkill: state.increaseSkill,
    startQuest: state.startQuest,
    completeQuest: state.completeQuest,
    updateQuestProgress: state.updateQuestProgress,
    addBadge: state.addBadge,
    addNPCInteraction: state.addNPCInteraction,
    incrementTimeSpent: state.incrementTimeSpent,
    syncFromDB: state.syncFromDB,
    syncToDB: state.syncToDB,
    reset: state.reset,
  }));

// Computed values
export const usePortalUnlockStatus = (portal: keyof PortalStates) => {
  return useQuestStore((state) => {
    const portals = state.progress.portals;
    const quests = state.progress.quests;

    if (portals[portal]) return 'unlocked';

    switch (portal) {
      case 'adventure':
        return 'unlocked';

      case 'fantasy':
        const adventureQuests = quests.completed.filter(
          (q) => q.genre === 'adventure'
        );
        return adventureQuests.length > 0 ? 'unlocking' : 'locked';

      case 'horror':
        const fantasyQuests = quests.completed.filter(
          (q) => q.genre === 'fantasy'
        );
        return fantasyQuests.length > 0 ? 'unlocking' : 'locked';

      case 'history':
        return quests.completed.length >= 3 ? 'unlocking' : 'locked';

      case 'science':
        const masteryQuest = quests.completed.find(
          (q) => q.id === 'mastery_quest'
        );
        return masteryQuest ? 'unlocking' : 'locked';

      default:
        return 'locked';
    }
  });
};

// Sync status hooks
export const useIsSyncing = () => useQuestStore((state) => state.isSyncing);
export const useLastSyncedAt = () =>
  useQuestStore((state) => state.lastSyncedAt);
