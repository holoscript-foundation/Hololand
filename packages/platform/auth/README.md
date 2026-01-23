# @hololand/auth

**Unified authentication for the Hololand ecosystem**

One account works across:
- hololand.io (landing page)
- infinityassistant.io (2D builder)
- central.hololand.io (VR hub)

## Features

- ✅ **Email + Password** - Traditional authentication
- ✅ **OAuth** - Google, GitHub, Discord
- ✅ **Web3 Wallet** - MetaMask, WalletConnect ($BRIAN token holders)
- ✅ **JWT Tokens** - Secure cross-domain authentication
- ✅ **Supabase Backend** - Production-ready auth infrastructure
- ✅ **React Hooks** - Easy integration with Next.js/React apps

## Installation

```bash
npm install @hololand/auth
# or
pnpm add @hololand/auth
```

## Quick Start

### 1. Setup Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_BRIAN_CONTRACT=0x3ecced5b416e58664f04a39dD18935eB71D33B15
```

### 2. Wrap Your App

```tsx
// app/layout.tsx or pages/_app.tsx
import { AuthProvider } from '@hololand/auth';

export default function RootLayout({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
```

### 3. Use Authentication

```tsx
'use client';

import { useAuth } from '@hololand/auth';

export function Profile() {
  const { user, signIn, signOut, signInWithWallet } = useAuth();

  if (!user) {
    return (
      <div>
        <button onClick={() => signIn({ email: 'user@example.com', password: 'password' })}>
          Sign In
        </button>
        <button onClick={() => signInWithWallet()}>
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div>
      <p>Welcome, {user.email}!</p>
      {user.wallet && <p>Wallet: {user.wallet}</p>}
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

## Authentication Methods

### Email + Password

```typescript
import { signIn, signUp, signOut } from '@hololand/auth';

// Sign up
await signUp({
  email: 'user@example.com',
  password: 'securePassword123',
  metadata: {
    name: 'John Doe',
  },
});

// Sign in
await signIn({
  email: 'user@example.com',
  password: 'securePassword123',
});

// Sign out
await signOut();
```

### OAuth (Google, GitHub, Discord)

```typescript
import { signInWithOAuth } from '@hololand/auth';

// Google
await signInWithOAuth('google');

// GitHub
await signInWithOAuth('github');

// Discord
await signInWithOAuth('discord');
```

### Web3 Wallet (MetaMask)

```typescript
import { signInWithWallet, verifyBrianHolder } from '@hololand/auth';

// Connect wallet
const { user, wallet } = await signInWithWallet();

// Check if user holds $BRIAN tokens
const holdings = await verifyBrianHolder(wallet);
console.log(`User holds ${holdings} $BRIAN tokens`);

// Premium features for $BRIAN holders
if (holdings > 1000) {
  console.log('User has premium access!');
}
```

## React Hooks

### useAuth

Main authentication hook:

```typescript
import { useAuth } from '@hololand/auth';

function Component() {
  const {
    user,           // Current user or null
    loading,        // Loading state
    signIn,         // Email sign in
    signUp,         // Email sign up
    signOut,        // Sign out
    signInWithOAuth,     // OAuth sign in
    signInWithWallet,    // Web3 wallet sign in
  } = useAuth();

  // ...
}
```

### useWallet

Web3 wallet integration:

```typescript
import { useWallet } from '@hololand/auth';

function Component() {
  const {
    wallet,         // Connected wallet address
    balance,        // $BRIAN token balance
    isHolder,       // Has $BRIAN tokens
    connect,        // Connect wallet
    disconnect,     // Disconnect wallet
  } = useWallet();

  if (!wallet) {
    return <button onClick={connect}>Connect Wallet</button>;
  }

  return (
    <div>
      <p>Wallet: {wallet}</p>
      <p>$BRIAN Balance: {balance}</p>
      {isHolder && <span>Premium Member ✨</span>}
    </div>
  );
}
```

## API Reference

### Core Functions

#### `signUp(options)`

Create a new account with email and password.

```typescript
interface SignUpOptions {
  email: string;
  password: string;
  metadata?: {
    name?: string;
    avatar?: string;
  };
}

await signUp(options);
```

#### `signIn(options)`

Sign in with email and password.

```typescript
interface SignInOptions {
  email: string;
  password: string;
}

await signIn(options);
```

#### `signInWithOAuth(provider)`

Sign in with OAuth provider.

```typescript
type Provider = 'google' | 'github' | 'discord';

await signInWithOAuth(provider);
```

#### `signInWithWallet()`

Sign in with Web3 wallet (MetaMask).

```typescript
const { user, wallet } = await signInWithWallet();
```

#### `signOut()`

Sign out the current user.

```typescript
await signOut();
```

### User Object

```typescript
interface User {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  wallet?: string;        // Web3 wallet address
  brianBalance?: number;  // $BRIAN token balance
  createdAt: Date;
  metadata?: Record<string, any>;
}
```

## Cross-Domain Authentication

Authentication works across all Hololand domains:

```typescript
// User signs in on hololand.io
await signIn({ email: 'user@example.com', password: 'password' });

// JWT token is set with domain: .hololand.io
// Now user is authenticated on:
// - hololand.io
// - infinityassistant.io (if same domain)
// - central.hololand.io
```

For cross-origin domains (infinityassistant.io), tokens are shared via:
1. Secure cookie with SameSite=Lax
2. JWT stored in localStorage
3. Token refresh on page load

## Database Schema

### Users Table

```sql
create table users (
  id uuid primary key default uuid_generate_v4(),
  email text unique,
  name text,
  avatar text,
  wallet text unique,           -- Web3 wallet address
  brian_balance numeric default 0,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  metadata jsonb
);

-- Index for wallet lookups
create index idx_users_wallet on users(wallet);
```

### Sessions Table

```sql
create table sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  token text unique not null,
  expires_at timestamp not null,
  created_at timestamp default now(),
  metadata jsonb
);

-- Index for token lookups
create index idx_sessions_token on sessions(token);
create index idx_sessions_user_id on sessions(user_id);
```

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key  # Server-side only

# $BRIAN Token
NEXT_PUBLIC_BRIAN_CONTRACT=0x3ecced5b416e58664f04a39dD18935eB71D33B15
NEXT_PUBLIC_CHAIN_ID=8453  # Based Chain

# OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

## Security Features

- ✅ **JWT Tokens** - Signed with HS256
- ✅ **HttpOnly Cookies** - Protected from XSS
- ✅ **CSRF Protection** - Built-in token validation
- ✅ **Rate Limiting** - Supabase built-in
- ✅ **Password Hashing** - bcrypt with salt
- ✅ **Session Expiry** - 7-day default, configurable

## Testing

```bash
pnpm test
```

## Building

```bash
pnpm build
```

Output: `dist/index.js`, `dist/index.mjs`, `dist/index.d.ts`

## License

MIT License - see [LICENSE](../../LICENSE) for details

## Links

- [Hololand](https://hololand.io)
- [Infinity Assistant](https://infinityassistant.io)
- [Hololand Central](https://central.hololand.io)
- [GitHub](https://github.com/brianonbased-dev/Hololand)

---

**Built with ❤️ by the Hololand Community**
