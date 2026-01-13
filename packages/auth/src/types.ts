export interface User {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  wallet?: string;
  brianBalance?: number;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface SignUpOptions {
  email: string;
  password: string;
  metadata?: {
    name?: string;
    avatar?: string;
  };
}

export interface SignInOptions {
  email: string;
  password: string;
}

export type OAuthProvider = 'google' | 'github' | 'discord';

export interface WalletSignInResult {
  user: User;
  wallet: string;
}

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signUp: (options: SignUpOptions) => Promise<User>;
  signIn: (options: SignInOptions) => Promise<User>;
  signOut: () => Promise<void>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>;
  signInWithWallet: () => Promise<WalletSignInResult>;
}

export interface WalletContextValue {
  wallet: string | null;
  balance: number;
  isHolder: boolean;
  connect: () => Promise<string>;
  disconnect: () => void;
}
