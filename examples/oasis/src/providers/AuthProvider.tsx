import { ReactNode, useEffect } from 'react';
import { AuthProvider as HololandAuthProvider, useAuth } from '@hololand/auth';
import { useAuthStore } from '@/stores/authStore';

interface AuthBridgeProps {
  children: ReactNode;
}

/**
 * Bridge between @hololand/auth and our Zustand store
 * Keeps both in sync for flexibility
 */
function AuthBridge({ children }: AuthBridgeProps) {
  const hololandAuth = useAuth();
  const { setUser } = useAuthStore();

  // Sync @hololand/auth user to our Zustand store
  useEffect(() => {
    if (hololandAuth.user) {
      setUser({
        id: hololandAuth.user.id,
        email: hololandAuth.user.email || '',
        username: hololandAuth.user.name || hololandAuth.user.email?.split('@')[0] || 'user',
        displayName: hololandAuth.user.name || 'User',
        avatarUrl: hololandAuth.user.avatar,
        status: 'online',
        createdAt: hololandAuth.user.createdAt,
      });
    } else {
      setUser(null);
    }
  }, [hololandAuth.user, setUser]);

  return <>{children}</>;
}

interface OasisAuthProviderProps {
  children: ReactNode;
}

/**
 * Oasis Auth Provider
 * Wraps @hololand/auth and bridges to local Zustand store
 */
export function OasisAuthProvider({ children }: OasisAuthProviderProps) {
  return (
    <HololandAuthProvider>
      <AuthBridge>{children}</AuthBridge>
    </HololandAuthProvider>
  );
}

export { useAuth } from '@hololand/auth';
