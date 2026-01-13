'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './client';
import type { User, AuthContextValue } from './types';
import * as auth from './auth';
import * as wallet from './wallet';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    auth.getCurrentUser().then((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name,
          avatar: session.user.user_metadata?.avatar,
          wallet: session.user.user_metadata?.wallet,
          brianBalance: session.user.user_metadata?.brian_balance || 0,
          createdAt: new Date(session.user.created_at),
          metadata: session.user.user_metadata,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    signUp: async (options) => {
      const newUser = await auth.signUp(options);
      setUser(newUser);
      return newUser;
    },
    signIn: async (options) => {
      const loggedInUser = await auth.signIn(options);
      setUser(loggedInUser);
      return loggedInUser;
    },
    signOut: async () => {
      await auth.signOut();
      setUser(null);
    },
    signInWithOAuth: auth.signInWithOAuth,
    signInWithWallet: async () => {
      const result = await wallet.signInWithWallet();
      setUser(result.user);
      return result;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
