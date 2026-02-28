/**
 * Quest Progress State Management
 *
 * Uses Zustand for reactive state management
 * Persists to localStorage for session continuity
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface PlayerInfo {
  id: string;
  name: string;
  level: number;
  position: [number, number, number];
}

export interface PortalStates {
  adventure: boolean;
  fantasy: boolean;
  horror: boolean;
  history: boolean;
  science: boolean;
}

export interface SkillLevels {
  courage: number;       // 0-100
  imagination: number;   // 0-100
  resilience: number;    // 0-100
  wisdom: number;        // 0-100
  knowledge: number;     // 0-100
}

export interface QuestInfo {
  id: string;
  genre: string;
  status: 'available' | 'active' | 'completed';
  progress: number;      // 0-100
  startedAt?: number;
  completedAt?: number;
}

export interface QuestProgress {
  player: PlayerInfo;
  portals: PortalStates;
  skills: SkillLevels;
  quests: {
    active: QuestInfo[];
    completed: QuestInfo[];
    available: QuestInfo[];
  };
  badges: string[];
  timeSpent: number;
  npcsInteracted: string[];
}

// ==========================================
// INITIAL STATE
// ==========================================

const initialState: QuestProgress = {
  player: {
    id: '',
    name: 'Adventurer',
    level: 1,
    position: [0, 1, 60]
  },
  portals: {
    adventure: true,    // Always unlocked
    fantasy: false,
    horror: false,
    history: false,
    science: false
  },
  skills: {
    courage: 0,
    imagination: 0,
    resilience: 0,
    wisdom: 0,
    knowledge: 0
  },
  quests: {
    active: [],
    completed: [],
    available: [
      {
        id: 'treasure_island_intro',
        genre: 'adventure',
        status: 'available',
        progress: 0
      }
    ]
  },
  badges: [],
  timeSpent: 0,
  npcsInteracted: []
};

// ==========================================
// STATE STORE
// ==========================================

interface QuestStore {
  // State
  progress: QuestProgress;

  // Actions
  setPlayerId: (id: string) => void;
  setPlayerName: (name: string) => void;
  updatePlayerPosition: (position: [number, number, number]) => void;

  unlockPortal: (portal: keyof PortalStates) => void;
  increaseSkill: (skill: keyof SkillLevels, amount: number) => void;

  startQuest: (questId: string) => void;
  completeQuest: (questId: string, rewards: { skills?: Partial<SkillLevels>; badges?: string[]; unlocks?: (keyof PortalStates)[] }) => void;
  updateQuestProgress: (questId: string, progress: number) => void;

  addBadge: (badge: string) => void;
  addNPCInteraction: (npcId: string) => void;
  incrementTimeSpent: (seconds: number) => void;

  reset: () => void;
}

export const useQuestStore = create<QuestStore>()(
  persist(
    (set) => ({
      progress: initialState,

      setPlayerId: (id) =>
        set((state) => ({
          progress: {
            ...state.progress,
            player: { ...state.progress.player, id }
          }
        })),

      setPlayerName: (name) =>
        set((state) => ({
          progress: {
            ...state.progress,
            player: { ...state.progress.player, name }
          }
        })),

      updatePlayerPosition: (position) =>
        set((state) => ({
          progress: {
            ...state.progress,
            player: { ...state.progress.player, position }
          }
        })),

      unlockPortal: (portal) =>
        set((state) => {
          console.log(`[QuestState] Unlocking portal: ${portal}`);
          return {
            progress: {
              ...state.progress,
              portals: {
                ...state.progress.portals,
                [portal]: true
              }
            }
          };
        }),

      increaseSkill: (skill, amount) =>
        set((state) => {
          const currentValue = state.progress.skills[skill];
          const newValue = Math.min(100, currentValue + amount);
          console.log(`[QuestState] Skill ${skill}: ${currentValue} -> ${newValue} (+${amount})`);

          return {
            progress: {
              ...state.progress,
              skills: {
                ...state.progress.skills,
                [skill]: newValue
              }
            }
          };
        }),

      startQuest: (questId) =>
        set((state) => {
          console.log(`[QuestState] Starting quest: ${questId}`);

          const availableQuest = state.progress.quests.available.find(q => q.id === questId);
          if (!availableQuest) {
            console.warn(`Quest ${questId} not found in available quests`);
            return state;
          }

          return {
            progress: {
              ...state.progress,
              quests: {
                ...state.progress.quests,
                available: state.progress.quests.available.filter(q => q.id !== questId),
                active: [
                  ...state.progress.quests.active,
                  {
                    ...availableQuest,
                    status: 'active' as const,
                    startedAt: Date.now()
                  }
                ]
              }
            }
          };
        }),

      completeQuest: (questId, rewards) =>
        set((state) => {
          console.log(`[QuestState] Completing quest: ${questId}`, rewards);

          const activeQuest = state.progress.quests.active.find(q => q.id === questId);
          if (!activeQuest) {
            console.warn(`Quest ${questId} not found in active quests`);
            return state;
          }

          // Apply skill rewards
          const newSkills = { ...state.progress.skills };
          if (rewards.skills) {
            Object.entries(rewards.skills).forEach(([skill, amount]) => {
              const skillKey = skill as keyof SkillLevels;
              newSkills[skillKey] = Math.min(100, newSkills[skillKey] + (amount || 0));
            });
          }

          // Apply portal unlocks
          const newPortals = { ...state.progress.portals };
          if (rewards.unlocks) {
            rewards.unlocks.forEach(portal => {
              newPortals[portal] = true;
            });
          }

          // Apply badges
          const newBadges = [
            ...state.progress.badges,
            ...(rewards.badges || [])
          ];

          return {
            progress: {
              ...state.progress,
              skills: newSkills,
              portals: newPortals,
              badges: newBadges,
              quests: {
                ...state.progress.quests,
                active: state.progress.quests.active.filter(q => q.id !== questId),
                completed: [
                  ...state.progress.quests.completed,
                  {
                    ...activeQuest,
                    status: 'completed' as const,
                    progress: 100,
                    completedAt: Date.now()
                  }
                ]
              }
            }
          };
        }),

      updateQuestProgress: (questId, progress) =>
        set((state) => ({
          progress: {
            ...state.progress,
            quests: {
              ...state.progress.quests,
              active: state.progress.quests.active.map(q =>
                q.id === questId ? { ...q, progress } : q
              )
            }
          }
        })),

      addBadge: (badge) =>
        set((state) => ({
          progress: {
            ...state.progress,
            badges: [...state.progress.badges, badge]
          }
        })),

      addNPCInteraction: (npcId) =>
        set((state) => ({
          progress: {
            ...state.progress,
            npcsInteracted: [...state.progress.npcsInteracted, npcId]
          }
        })),

      incrementTimeSpent: (seconds) =>
        set((state) => ({
          progress: {
            ...state.progress,
            timeSpent: state.progress.timeSpent + seconds
          }
        })),

      reset: () =>
        set({ progress: initialState })
    }),
    {
      name: 'hololand-quest-progress',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ==========================================
// HELPER HOOKS
// ==========================================

// Get specific state slices
export const usePlayer = () => useQuestStore(state => state.progress.player);
export const usePortals = () => useQuestStore(state => state.progress.portals);
export const useSkills = () => useQuestStore(state => state.progress.skills);
export const useQuests = () => useQuestStore(state => state.progress.quests);
export const useBadges = () => useQuestStore(state => state.progress.badges);

// Get actions
export const useQuestActions = () => useQuestStore(state => ({
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
  reset: state.reset
}));

// Computed values
export const usePortalUnlockStatus = (portal: keyof PortalStates) => {
  return useQuestStore(state => {
    const portals = state.progress.portals;
    const quests = state.progress.quests;

    if (portals[portal]) return 'unlocked';

    // Check unlock conditions
    switch (portal) {
      case 'adventure':
        return 'unlocked'; // Always unlocked

      case 'fantasy':
        // Unlocks after 1 adventure quest
        const adventureQuests = quests.completed.filter(q => q.genre === 'adventure');
        return adventureQuests.length > 0 ? 'unlocking' : 'locked';

      case 'horror':
        // Unlocks after 1 fantasy quest
        const fantasyQuests = quests.completed.filter(q => q.genre === 'fantasy');
        return fantasyQuests.length > 0 ? 'unlocking' : 'locked';

      case 'history':
        // Unlocks after 3 total quests
        return quests.completed.length >= 3 ? 'unlocking' : 'locked';

      case 'science':
        // Unlocks after mastery quest
        const masteryQuest = quests.completed.find(q => q.id === 'mastery_quest');
        return masteryQuest ? 'unlocking' : 'locked';

      default:
        return 'locked';
    }
  });
};
