// Core authentication
export {
  signUp,
  signIn,
  signOut,
  signInWithOAuth,
  getCurrentUser,
  getSession,
  updateUser,
  resetPassword,
} from './auth';

// Wallet integration
export {
  connectWallet,
  getBrianBalance,
  verifyBrianHolder,
  signInWithWallet,
  signMessage,
} from './wallet';

// React components and hooks
export { AuthProvider, useAuth } from './provider';
export { useWallet, useRequireAuth } from './hooks';

// Supabase client (if needed)
export { supabase } from './client';

// TypeScript types
export type {
  User,
  SignUpOptions,
  SignInOptions,
  OAuthProvider,
  WalletSignInResult,
  AuthContextValue,
  WalletContextValue,
} from './types';
