import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  createdAt: number;
}

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);

  const login = useCallback((nextUser: AuthUser) => setUser(nextUser), []);
  const logout = useCallback(() => setUser(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading: false, login, logout }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
