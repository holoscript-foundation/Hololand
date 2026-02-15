import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  status: 'online' | 'away' | 'busy' | 'invisible';
  createdAt: Date;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  setStatus: (status: User['status']) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Integrate with @hololand/auth
          // const { user } = await auth.signInWithEmail(email, password);

          // Mock login for now
          const mockUser: User = {
            id: '1',
            email,
            username: email.split('@')[0],
            displayName: email.split('@')[0],
            status: 'online',
            createdAt: new Date(),
          };

          set({ user: mockUser, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      register: async (email, password, username) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Integrate with @hololand/auth
          // const { user } = await auth.signUpWithEmail(email, password, { username });

          const mockUser: User = {
            id: '1',
            email,
            username,
            displayName: username,
            status: 'online',
            createdAt: new Date(),
          };

          set({ user: mockUser, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      logout: () => {
        // TODO: auth.signOut();
        set({ user: null, isAuthenticated: false });
      },

      updateProfile: async (updates) => {
        const { user } = get();
        if (!user) return;

        set({ isLoading: true });
        try {
          // TODO: await auth.updateProfile(updates);
          set({ user: { ...user, ...updates }, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      setStatus: (status) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, status } });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'oasis-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
