import { supabase } from './client';
import type { User, SignUpOptions, SignInOptions, OAuthProvider } from './types';

/**
 * Convert Supabase user to Hololand user format
 */
function toHololandUser(supabaseUser: any): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: supabaseUser.user_metadata?.name,
    avatar: supabaseUser.user_metadata?.avatar,
    wallet: supabaseUser.user_metadata?.wallet,
    brianBalance: supabaseUser.user_metadata?.brian_balance || 0,
    createdAt: new Date(supabaseUser.created_at),
    metadata: supabaseUser.user_metadata,
  };
}

/**
 * Sign up with email and password
 */
export async function signUp(options: SignUpOptions): Promise<User> {
  const { email, password, metadata } = options;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata || {},
    },
  });

  if (error) {
    throw new Error(`Sign up failed: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('Sign up failed: No user returned');
  }

  return toHololandUser(data.user);
}

/**
 * Sign in with email and password
 */
export async function signIn(options: SignInOptions): Promise<User> {
  const { email, password } = options;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Sign in failed: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('Sign in failed: No user returned');
  }

  return toHololandUser(data.user);
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(`Sign out failed: ${error.message}`);
  }
}

/**
 * Sign in with OAuth provider
 */
export async function signInWithOAuth(provider: OAuthProvider): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(`OAuth sign in failed: ${error.message}`);
  }
}

/**
 * Get current session
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Get session failed: ${error.message}`);
  }

  return data.session;
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return toHololandUser(data.user);
}

/**
 * Update user metadata
 */
export async function updateUser(updates: Partial<User>): Promise<User> {
  const { data, error } = await supabase.auth.updateUser({
    data: {
      name: updates.name,
      avatar: updates.avatar,
      wallet: updates.wallet,
      ...updates.metadata,
    },
  });

  if (error) {
    throw new Error(`Update user failed: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('Update user failed: No user returned');
  }

  return toHololandUser(data.user);
}

/**
 * Reset password
 */
export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) {
    throw new Error(`Reset password failed: ${error.message}`);
  }
}
