import { create } from 'zustand';

export interface World {
  id: string;
  name: string;
  description: string;
  thumbnailUrl?: string;
  ownerId: string;
  ownerName: string;
  playerCount: number;
  maxPlayers: number;
  tags: string[];
  isPublic: boolean;
  isFeatured?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface WorldState {
  // Browsing
  worlds: World[];
  featuredWorlds: World[];
  recentWorlds: World[];
  searchResults: World[];

  // Current world
  currentWorld: World | null;
  isInWorld: boolean;
  isLoading: boolean;

  // Actions
  fetchWorlds: (category?: string) => Promise<void>;
  fetchFeaturedWorlds: () => Promise<void>;
  searchWorlds: (query: string) => Promise<void>;
  joinWorld: (worldId: string) => Promise<void>;
  leaveWorld: () => void;
  createWorld: (world: Partial<World>) => Promise<World>;
}

// Mock data for featured worlds
const mockFeaturedWorlds: World[] = [
  {
    id: 'central',
    name: 'Hololand Central',
    description: 'The downtown hub - Plaza, Casino, Arcade, and more!',
    thumbnailUrl: '/thumbnails/central.jpg',
    ownerId: 'system',
    ownerName: 'Hololand',
    playerCount: 42,
    maxPlayers: 500,
    tags: ['official', 'social', 'hub'],
    isPublic: true,
    isFeatured: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'casino',
    name: 'Hololand Casino',
    description: 'Try your luck at crypto poker and tower climb!',
    thumbnailUrl: '/thumbnails/casino.jpg',
    ownerId: 'system',
    ownerName: 'Hololand',
    playerCount: 18,
    maxPlayers: 100,
    tags: ['games', 'social'],
    isPublic: true,
    isFeatured: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'arcade',
    name: 'GREEN MACHINE ARCADE',
    description: 'VR arcade games, racing sims, and leaderboards',
    thumbnailUrl: '/thumbnails/arcade.jpg',
    ownerId: 'system',
    ownerName: 'Hololand',
    playerCount: 24,
    maxPlayers: 50,
    tags: ['games', 'arcade'],
    isPublic: true,
    isFeatured: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const useWorldStore = create<WorldState>((set, get) => ({
  worlds: [],
  featuredWorlds: mockFeaturedWorlds,
  recentWorlds: [],
  searchResults: [],
  currentWorld: null,
  isInWorld: false,
  isLoading: false,

  fetchWorlds: async (category) => {
    set({ isLoading: true });
    try {
      // TODO: Fetch from API
      // const worlds = await worldService.getWorlds(category);
      set({ worlds: mockFeaturedWorlds, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch worlds:', error);
      set({ isLoading: false });
    }
  },

  fetchFeaturedWorlds: async () => {
    set({ isLoading: true });
    try {
      // TODO: Fetch from API
      set({ featuredWorlds: mockFeaturedWorlds, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch featured worlds:', error);
      set({ isLoading: false });
    }
  },

  searchWorlds: async (query) => {
    set({ isLoading: true });
    try {
      const results = mockFeaturedWorlds.filter(
        (w) =>
          w.name.toLowerCase().includes(query.toLowerCase()) ||
          w.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      );
      set({ searchResults: results, isLoading: false });
    } catch (error) {
      console.error('Failed to search worlds:', error);
      set({ isLoading: false });
    }
  },

  joinWorld: async (worldId) => {
    set({ isLoading: true });
    try {
      const world = [...get().featuredWorlds, ...get().worlds].find((w) => w.id === worldId);
      if (world) {
        set({ currentWorld: world, isInWorld: true, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to join world:', error);
      set({ isLoading: false });
    }
  },

  leaveWorld: () => {
    set({ currentWorld: null, isInWorld: false });
  },

  createWorld: async (worldData) => {
    set({ isLoading: true });
    try {
      const newWorld: World = {
        id: `world-${Date.now()}`,
        name: worldData.name || 'New World',
        description: worldData.description || '',
        ownerId: 'current-user',
        ownerName: 'You',
        playerCount: 0,
        maxPlayers: worldData.maxPlayers || 16,
        tags: worldData.tags || [],
        isPublic: worldData.isPublic ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      set((state) => ({
        worlds: [newWorld, ...state.worlds],
        isLoading: false,
      }));

      return newWorld;
    } catch (error) {
      console.error('Failed to create world:', error);
      set({ isLoading: false });
      throw error;
    }
  },
}));
