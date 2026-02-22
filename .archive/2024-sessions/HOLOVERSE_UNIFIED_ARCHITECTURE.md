# 🌐 Holoverse Unified Architecture

**Version**: 1.0
**Date**: 2026-02-19
**Status**: Implementation In Progress (StoryWeaver Layer Complete)

---

## Executive Summary

**Holoverse** is the world's first **Educational Metaverse** - a persistent, quest-driven virtual world that combines the pedagogical power of the StoryWeaver Protocol with the infrastructure of OASIS-inspired persistent worlds.

### The Vision

Transform how humans learn by creating **immersive, persistent, quest-based educational experiences** that bridge the physical and digital worlds through:

- **Pedagogy**: StoryWeaver Protocol (quest systems, genre portals, AI companions)
- **Infrastructure**: OASIS Architecture (persistence, scalability, creator economy)
- **Differentiation**: Digital Twin Technology (real-world sync, competitive moat)

### Current Status

**StoryWeaver Layer**: ✅ 95% Complete (3,600 lines implemented)
**OASIS Layer**: ⏳ 0% Complete (architecture defined)
**Integration**: 🚧 In Progress

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Layer 1: StoryWeaver Protocol (Pedagogy)](#layer-1-storyweaver-protocol)
3. [Layer 2: OASIS Infrastructure (Persistence)](#layer-2-oasis-infrastructure)
4. [Layer 3: Digital Twin Engine (Differentiation)](#layer-3-digital-twin-engine)
5. [Integration Points](#integration-points)
6. [Database Schema](#database-schema)
7. [Authentication System](#authentication-system)
8. [API Architecture](#api-architecture)
9. [Creator Economy](#creator-economy)
10. [Migration Roadmap](#migration-roadmap)
11. [Technology Stack](#technology-stack)
12. [Deployment Architecture](#deployment-architecture)

---

## System Architecture

### The Three-Layer Model

```
┌─────────────────────────────────────────────────────────────────┐
│                        HOLOVERSE PLATFORM                        │
│                   (Educational Metaverse Category)               │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
         LAYER 1        LAYER 2        LAYER 3
        STORYWEAVER      OASIS         DIGITAL
        PROTOCOL      INFRASTRUCTURE   TWINS
        (Pedagogy)    (Persistence)  (Differentiation)
              │              │              │
         ┌────┴────┐    ┌────┴────┐    ┌────┴────┐
         │         │    │         │    │         │
      Quest     Portal  User     Creator City    Enterprise
      System    Nav    Accounts  Economy  Sync    Replicas
         │         │    │         │    │         │
         └─────────┴────┴─────────┴────┴─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
         B2C FREEMIUM   CREATOR      B2B ENTERPRISE
         $0-$29.99/mo   ECONOMY      $50K-$10M
```

### Information Flow

```
User Action → Frontend (React/R3F) → API Layer → Railway Postgres → State Update
     ↓                                                                    ↓
 Event Bus ←───────────────────────────────────────────────────── WebSocket
     ↓                                                                    ↓
AI Companions                                                    Other Clients
     ↓                                                                    ↓
GPT-4 Response → Event → UI Update → Database → Sync → All Connected Users
```

---

## Layer 1: StoryWeaver Protocol

**Status**: ✅ 95% Complete
**Purpose**: Quest-based learning pedagogy
**Code**: 3,600 lines implemented

### Components Implemented

#### 1. State Management (`src/state/QuestState.ts` - 430 lines)

```typescript
interface QuestProgress {
  player: PlayerInfo;                // User profile
  portals: PortalStates;             // Unlock status
  skills: SkillLevels;               // 5 skills: courage, imagination, etc.
  quests: QuestInfo[];               // Active/completed quests
  badges: string[];                  // Achievement system
  timeSpent: number;                 // Engagement tracking
  npcsInteracted: string[];          // AI companion history
}
```

**Features**:
- ✅ Quest progress tracking
- ✅ Portal unlock states (Adventure → Fantasy → Horror → History)
- ✅ Skill level management (5 dimensions)
- ✅ localStorage persistence (needs DB migration)
- ✅ React hooks for easy integration
- ✅ Computed values (portal unlock logic)

#### 2. Event Bus (`src/events/EventBus.ts` - 320 lines)

```typescript
interface HololandEvents {
  PortalActivated: { portalId: string; genre: string; timestamp: number };
  QuestTriggered: { questId: string; genre: string; difficulty: string };
  QuestCompleted: { questId: string; rewards: any; completionTime: number };
  SkillIncreased: { skill: string; oldValue: number; newValue: number };
  PortalUnlocked: { portalId: string; genre: string; unlockedBy: string };
  NPCInteraction: { npcId: string; userId: string; message: string };
  QuestStageCompleted: { questId: string; stage: number };
}
```

**Features**:
- ✅ Type-safe event emitter
- ✅ Event history tracking
- ✅ React hooks (useEvent, useEventOnce, useAnyEvent)
- ⏳ Needs WebSocket broadcast for multiplayer

#### 3. AI Companions (`src/ai/AICompanion.ts` - 470 lines)

```typescript
const COMPANIONS = {
  adventure_guide: {
    name: 'Captain Compass',
    personality: { traits: ['brave', 'optimistic'], catchphrase: 'Fortune favors the bold!' },
    systemPrompt: 'You are Captain Compass, the Adventure Guide...'
  },
  fantasy_guide: { name: 'Lumina Starweaver', ... },
  horror_guide: { name: 'Raven Shadowmere', ... }
};
```

**Features**:
- ✅ OpenAI GPT-4 integration
- ✅ Context-aware dialogue (adapts to player progress)
- ✅ Conversation history
- ✅ Fallback responses (works without API key)
- ⏳ Needs persistent conversation storage

#### 4. HoloScript Parser (`src/holoscript/Parser.ts` - 900 lines)

```typescript
export class HoloScriptParser {
  static parseFile(filePath: string): SceneConfig
  static parseSource(source: string): SceneConfig

  // Converts HoloComposition → Three.js scene
  // Handles @state, @event, @reactive directives
  // Supports all geometry types
}
```

**Features**:
- ✅ Parses .holo files using @holoscript/core
- ✅ Converts to Three.js scene configuration
- ✅ Extracts reactive bindings
- ✅ Event handler mapping
- ⏳ Needs creator tool UI

#### 5. 3D Viewer (`src/components/` - 800 lines)

**Components**:
- `GrandHallViewer.tsx` - Main R3F canvas
- `SceneRenderer.tsx` - Object rendering
- `Portal.tsx` - Interactive portals with states
- `NPC.tsx` - AI companion NPCs
- `SceneMesh.tsx` - Generic mesh rendering

**Features**:
- ✅ React Three Fiber integration
- ✅ Portal animations (locked/unlocking/unlocked)
- ✅ NPC floating + click-to-talk
- ✅ OrbitControls camera
- ✅ Reactive material properties
- ⏳ Needs VR support (XR)
- ⏳ Needs multiplayer avatars

#### 6. Demo UI (`src/pages/StoryWeaverDemo.tsx` - 670 lines)

**Panels**:
- Quest Log (active/completed quests)
- Skills Panel (progress bars for 5 skills)
- AI Chat Interface
- Portal Status Indicators
- Debug Controls

**Features**:
- ✅ Full UI system
- ✅ Event-driven updates
- ✅ Responsive panels
- ⏳ Needs mobile optimization

### StoryWeaver Layer - Gap Analysis

| Feature | Status | Next Step |
|---------|--------|-----------|
| Quest System | ✅ Complete | Add quest content |
| Portal Navigation | ✅ Complete | Add 5th portal (Science) |
| AI Companions | ✅ Complete | Persist conversations |
| HoloScript Parser | ✅ Complete | Creator UI tools |
| 3D Viewer | ✅ Complete | Add VR mode |
| State Management | ✅ Complete | Migrate to Railway DB |
| Event System | ✅ Complete | Add WebSocket sync |
| UI Components | ✅ Complete | Mobile responsive |

---

## Layer 2: OASIS Infrastructure

**Status**: ⏳ 0% Complete (Architecture Defined)
**Purpose**: Persistent metaverse infrastructure
**Plan**: 18-month roadmap to $9.6M ARR

### Core Components (To Build)

#### 1. Authentication System (HoloversAuthSystem)

**Multi-Modal Auth**:

```typescript
interface AuthProvider {
  type: 'email' | 'wallet' | 'oauth' | 'did';

  // Email/Password (Web2)
  signUpWithEmail(email: string, password: string): Promise<User>;

  // Wallet (Web3)
  connectWallet(address: string, signature: string): Promise<User>;

  // OAuth (Social)
  signInWithOAuth(provider: 'google' | 'discord' | 'twitter'): Promise<User>;

  // DID (Decentralized)
  authenticateWithDID(did: string, proof: string): Promise<User>;
}
```

**Features**:
- ⏳ Email/password (traditional)
- ⏳ Wallet connect (MetaMask, WalletConnect)
- ⏳ OAuth (Google, Discord, Twitter)
- ⏳ DID (Decentralized Identity)
- ⏳ Session management
- ⏳ JWT tokens
- ⏳ Refresh tokens
- ⏳ Multi-device support

#### 2. User Persistence (Railway Postgres)

**Database Schema** (11 tables):

```sql
-- Core user data
users                 -- User accounts
user_profiles         -- Extended profile data
user_sessions         -- Active sessions

-- Quest & progression
quest_progress        -- User quest states
skill_levels          -- Skill tracking
portal_unlocks        -- Portal access rights
badges                -- Achievement system

-- Social & interaction
npc_conversations     -- AI companion chat history
user_relationships    -- Friends, followers

-- Creator economy
user_worlds           -- Created content
world_transactions    -- Marketplace sales
```

**Features**:
- ⏳ User account management
- ⏳ Profile customization
- ⏳ Quest persistence
- ⏳ Achievement tracking
- ⏳ Social graph
- ⏳ Creator content storage
- ⏳ Transaction history

#### 3. API Layer (tRPC)

```typescript
// API routes
export const appRouter = router({
  auth: authRouter,          // Authentication
  user: userRouter,          // User profiles
  quest: questRouter,        // Quest system
  portal: portalRouter,      // Portal management
  companion: companionRouter, // AI companions
  creator: creatorRouter,    // Creator tools
  world: worldRouter,        // World management
  social: socialRouter,      // Social features
});
```

**Features**:
- ⏳ Type-safe API with tRPC
- ⏳ REST fallback for third-party
- ⏳ WebSocket for real-time sync
- ⏳ Rate limiting
- ⏳ Caching (Redis)
- ⏳ Error handling
- ⏳ Analytics tracking

#### 4. Creator Economy

**Three-Tier Tools**:

```typescript
// No-Code (Visual Builder)
interface NoCodeBuilder {
  dragAndDropPortal(): void;
  placeNPC(): void;
  selectQuestTemplate(): void;
  publishWorld(): void;
}

// Low-Code (HoloScript IDE)
interface LowCodeIDE {
  editHoloScript(): void;
  previewChanges(): void;
  testQuests(): void;
  publishToMarketplace(): void;
}

// Full-Code (SDK)
interface FullCodeSDK {
  importCustomAssets(): void;
  writeCustomLogic(): void;
  integrateAPIs(): void;
  deployToInfra(): void;
}
```

**Marketplace**:
- ⏳ World templates
- ⏳ Quest packs
- ⏳ NPC characters
- ⏳ 3D assets
- ⏳ 70/30 revenue split (creator keeps 70%)
- ⏳ Creator grants program

#### 5. Accessibility Tiers

**Four-Tier Access**:

```typescript
interface AccessibilityTier {
  vr: {           // Tier 1: Full immersion
    devices: ['Meta Quest', 'PSVR2', 'Apple Vision Pro'];
    features: ['6DOF', 'hand tracking', 'spatial audio'];
  };
  desktop: {      // Tier 2: 3D interactive
    devices: ['Windows', 'Mac', 'Linux'];
    features: ['keyboard+mouse', '3D rendering', 'full quests'];
  };
  mobile: {       // Tier 3: Touch optimized
    devices: ['iOS', 'Android'];
    features: ['touch controls', 'simplified 3D', 'core quests'];
  };
  web2d: {        // Tier 4: Maximum reach
    devices: ['Any browser'];
    features: ['2D interface', 'text quests', 'progress sync'];
  };
}
```

---

## Layer 3: Digital Twin Engine

**Status**: ⏳ 0% Complete (Architecture Defined)
**Purpose**: Real-world sync and competitive differentiation
**Moat**: Multi-year advantage over competitors

### Digital Twin Types

#### 1. City Replicas (B2B Smart Cities)

```typescript
interface CityDigitalTwin {
  // Static data (updated quarterly)
  gisData: GISDataset;        // Buildings, roads, landmarks
  zoning: ZoningMap;          // Land use, regulations

  // Dynamic data (real-time sync)
  weather: WeatherAPI;        // Current conditions
  traffic: TrafficAPI;        // Live traffic flow
  events: EventsAPI;          // Concerts, festivals
  iotSensors: SensorNetwork;  // Air quality, noise, etc.

  // Sync engine
  updateInterval: '15min' | '1hour' | 'realtime';
  conflictResolution: 'server-wins' | 'client-wins' | 'merge';
}
```

**Partnerships**:
- Austin, TX (target city #1)
- NYC Open Data
- Google Maps Platform
- OpenStreetMap

#### 2. Enterprise Facilities (B2B Training)

```typescript
interface FacilityDigitalTwin {
  // Facility data
  floorPlans: CADFiles;
  equipment: EquipmentInventory;
  safety: SafetyProtocols;

  // Training scenarios
  emergencyDrills: Scenario[];
  onboarding: TrainingModule[];
  compliance: ComplianceCheck[];

  // Analytics
  completionRates: TrainingMetrics;
  timeToCompetency: SkillMetrics;
}
```

**Use Cases**:
- Corporate office onboarding
- Factory safety training
- Hospital emergency drills
- Retail employee training

#### 3. Educational Campuses (B2B Universities)

```typescript
interface CampusDigitalTwin {
  // Campus data
  buildings: BuildingModels;
  classrooms: ClassroomLayouts;
  labs: LabEquipment;

  // Educational features
  virtualTours: TourRoutes;
  classroomBooking: BookingSystem;
  studentOrientation: OrientationQuests;

  // Integration
  lmsIntegration: 'Canvas' | 'Blackboard' | 'Moodle';
  ssoIntegration: SAMLConfig;
}
```

---

## Integration Points

### Where StoryWeaver Meets OASIS

#### Integration 1: State Management

**Before (Current - StoryWeaver)**:
```typescript
// Client-side only
const useQuestStore = create<QuestStore>()(
  persist(
    (set) => ({ /* state */ }),
    { name: 'hololand-quest-progress', storage: localStorage }
  )
);
```

**After (Holoverse - OASIS)**:
```typescript
// Server-synchronized
const useQuestStore = create<QuestStore>()(
  persist(
    (set) => ({ /* state */ }),
    {
      name: 'holoverse-quest-progress',
      storage: createDatabaseStorage({
        api: trpc.quest,
        syncInterval: 5000,  // Sync every 5s
        conflictResolution: 'server-wins'
      })
    }
  )
);
```

#### Integration 2: Event Bus → WebSocket

**Before (Current - StoryWeaver)**:
```typescript
// Local events only
events.emit('PortalActivated', { portalId, genre, timestamp });
```

**After (Holoverse - OASIS)**:
```typescript
// Broadcast to all connected users
events.emit('PortalActivated', { portalId, genre, timestamp }, {
  broadcast: true,          // Send to all users in same world
  persist: true,            // Save to event log
  analytics: true           // Track for metrics
});
```

#### Integration 3: AI Companions → Persistent Conversations

**Before (Current - StoryWeaver)**:
```typescript
// Conversation history in memory only
const conversationHistory: ChatMessage[] = [];
```

**After (Holoverse - OASIS)**:
```typescript
// Persistent across sessions
const conversationHistory = await trpc.companion.getHistory.query({
  userId,
  companionId: 'adventure_guide',
  limit: 50
});
```

#### Integration 4: HoloScript Parser → Creator Tools

**Before (Current - StoryWeaver)**:
```typescript
// Parse local .holo files
const scene = await HoloScriptParser.parseFile('/src/zones/library.holo');
```

**After (Holoverse - OASIS)**:
```typescript
// Parse user-created worlds from database
const scene = await trpc.world.getScene.query({ worldId });
// scene was created in no-code builder, stored as HoloScript, parsed on-demand
```

---

## Database Schema

### Railway Postgres Schema (11 Tables)

```sql
-- ============================================================================
-- CORE USER TABLES
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  wallet_address VARCHAR(42) UNIQUE,
  did VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  is_verified BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  subscription_tier VARCHAR(50) DEFAULT 'free', -- 'free', 'premium', 'pro'
  CONSTRAINT email_or_wallet_or_did CHECK (
    email IS NOT NULL OR wallet_address IS NOT NULL OR did IS NOT NULL
  )
);

CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  location VARCHAR(100),
  website TEXT,
  social_links JSONB, -- {twitter, discord, youtube, etc.}
  preferences JSONB,  -- {theme, notifications, privacy, etc.}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  refresh_token_hash VARCHAR(255),
  device_info JSONB, -- {device, browser, os, ip}
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  last_active TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- QUEST & PROGRESSION TABLES
-- ============================================================================

CREATE TABLE quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  quest_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'failed'
  progress INTEGER DEFAULT 0,
  current_stage INTEGER DEFAULT 1,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  time_spent_seconds INTEGER DEFAULT 0,
  rewards JSONB,
  metadata JSONB,
  UNIQUE(user_id, quest_id)
);

CREATE TABLE skill_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  skill_name VARCHAR(100) NOT NULL, -- 'courage', 'imagination', etc.
  level INTEGER DEFAULT 0 CHECK (level >= 0 AND level <= 100),
  experience INTEGER DEFAULT 0,
  last_increased TIMESTAMP,
  UNIQUE(user_id, skill_name)
);

CREATE TABLE portal_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  portal_id VARCHAR(255) NOT NULL, -- 'adventure', 'fantasy', etc.
  unlocked_at TIMESTAMP DEFAULT NOW(),
  unlocked_by VARCHAR(255), -- quest_id or 'premium' or 'admin'
  UNIQUE(user_id, portal_id)
);

CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_name VARCHAR(255) NOT NULL,
  earned_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB,
  UNIQUE(user_id, badge_name)
);

-- ============================================================================
-- SOCIAL & INTERACTION TABLES
-- ============================================================================

CREATE TABLE npc_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  npc_id VARCHAR(255) NOT NULL, -- 'adventure_guide', etc.
  message_role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system'
  message_content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

CREATE TABLE user_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL, -- 'friend', 'follower', 'blocked'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, target_user_id, relationship_type),
  CHECK (user_id != target_user_id)
);

-- ============================================================================
-- CREATOR ECONOMY TABLES
-- ============================================================================

CREATE TABLE user_worlds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  holoscript_source TEXT NOT NULL, -- Full .holo file content
  thumbnail_url TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  price_cents INTEGER DEFAULT 0, -- 0 = free
  revenue_split INTEGER DEFAULT 70 CHECK (revenue_split >= 0 AND revenue_split <= 100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,
  total_visits INTEGER DEFAULT 0,
  total_revenue_cents INTEGER DEFAULT 0,
  tags TEXT[], -- ['adventure', 'beginner', 'short']
  metadata JSONB
);

CREATE TABLE world_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID REFERENCES user_worlds(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES users(id),
  amount_cents INTEGER NOT NULL,
  creator_share_cents INTEGER NOT NULL,
  platform_share_cents INTEGER NOT NULL,
  payment_method VARCHAR(50), -- 'stripe', 'crypto', 'credits'
  payment_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_subscription ON users(subscription_tier);

-- Session management
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- Quest queries
CREATE INDEX idx_quest_progress_user ON quest_progress(user_id);
CREATE INDEX idx_quest_progress_status ON quest_progress(status);
CREATE INDEX idx_skill_levels_user ON skill_levels(user_id);
CREATE INDEX idx_portal_unlocks_user ON portal_unlocks(user_id);
CREATE INDEX idx_badges_user ON badges(user_id);

-- Social features
CREATE INDEX idx_npc_conversations_user ON npc_conversations(user_id);
CREATE INDEX idx_npc_conversations_npc ON npc_conversations(npc_id);
CREATE INDEX idx_relationships_user ON user_relationships(user_id);
CREATE INDEX idx_relationships_target ON user_relationships(target_user_id);

-- Creator economy
CREATE INDEX idx_worlds_creator ON user_worlds(creator_id);
CREATE INDEX idx_worlds_published ON user_worlds(is_published);
CREATE INDEX idx_worlds_featured ON user_worlds(is_featured);
CREATE INDEX idx_transactions_world ON world_transactions(world_id);
CREATE INDEX idx_transactions_buyer ON world_transactions(buyer_id);
CREATE INDEX idx_transactions_creator ON world_transactions(creator_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_worlds_updated_at BEFORE UPDATE ON user_worlds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Authentication System

### HoloversAuthSystem Design

```typescript
// src/auth/HoloversAuthSystem.ts

import { z } from 'zod';

// ============================================================================
// SCHEMAS
// ============================================================================

const EmailSignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(50),
});

const WalletAuthSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature: z.string(),
  message: z.string(),
});

const OAuthCallbackSchema = z.object({
  provider: z.enum(['google', 'discord', 'twitter']),
  code: z.string(),
  state: z.string(),
});

// ============================================================================
// AUTH PROVIDERS
// ============================================================================

export class HoloversAuthSystem {
  // Email/Password
  async signUpWithEmail(data: z.infer<typeof EmailSignUpSchema>) {
    const validated = EmailSignUpSchema.parse(data);

    // 1. Hash password
    const passwordHash = await bcrypt.hash(validated.password, 10);

    // 2. Create user
    const user = await db.users.create({
      data: {
        email: validated.email,
        password_hash: passwordHash,
        profile: {
          create: {
            username: validated.username,
          }
        }
      }
    });

    // 3. Send verification email
    await this.sendVerificationEmail(user.email);

    // 4. Create session
    const session = await this.createSession(user.id);

    return { user, session };
  }

  async signInWithEmail(email: string, password: string) {
    // 1. Find user
    const user = await db.users.findUnique({ where: { email } });
    if (!user) throw new Error('Invalid credentials');

    // 2. Verify password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new Error('Invalid credentials');

    // 3. Create session
    const session = await this.createSession(user.id);

    return { user, session };
  }

  // Wallet Authentication
  async connectWallet(data: z.infer<typeof WalletAuthSchema>) {
    const validated = WalletAuthSchema.parse(data);

    // 1. Verify signature
    const address = ethers.utils.verifyMessage(validated.message, validated.signature);
    if (address.toLowerCase() !== validated.address.toLowerCase()) {
      throw new Error('Invalid signature');
    }

    // 2. Find or create user
    let user = await db.users.findUnique({ where: { wallet_address: validated.address } });

    if (!user) {
      user = await db.users.create({
        data: {
          wallet_address: validated.address,
          profile: {
            create: {
              username: `user_${validated.address.slice(0, 8)}`,
            }
          }
        }
      });
    }

    // 3. Create session
    const session = await this.createSession(user.id);

    return { user, session };
  }

  // OAuth (Google, Discord, Twitter)
  async initiateOAuth(provider: 'google' | 'discord' | 'twitter') {
    const state = crypto.randomUUID();
    const redirectUri = `${process.env.APP_URL}/auth/callback/${provider}`;

    // Store state in Redis for verification
    await redis.setex(`oauth:state:${state}`, 600, provider);

    const authUrls = {
      google: `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
      })}`,
      discord: `https://discord.com/api/oauth2/authorize?${new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'identify email',
        state,
      })}`,
      twitter: `https://twitter.com/i/oauth2/authorize?${new URLSearchParams({
        client_id: process.env.TWITTER_CLIENT_ID!,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'users.read tweet.read',
        state,
        code_challenge: 'challenge', // PKCE
        code_challenge_method: 'S256',
      })}`,
    };

    return { authUrl: authUrls[provider], state };
  }

  async handleOAuthCallback(data: z.infer<typeof OAuthCallbackSchema>) {
    const validated = OAuthCallbackSchema.parse(data);

    // 1. Verify state
    const storedProvider = await redis.get(`oauth:state:${validated.state}`);
    if (storedProvider !== validated.provider) {
      throw new Error('Invalid state');
    }

    // 2. Exchange code for token
    const tokens = await this.exchangeOAuthCode(validated.provider, validated.code);

    // 3. Get user info
    const userInfo = await this.getOAuthUserInfo(validated.provider, tokens.access_token);

    // 4. Find or create user
    let user = await db.users.findUnique({ where: { email: userInfo.email } });

    if (!user) {
      user = await db.users.create({
        data: {
          email: userInfo.email,
          is_verified: true, // OAuth emails are pre-verified
          profile: {
            create: {
              username: userInfo.username || `user_${Date.now()}`,
              display_name: userInfo.name,
              avatar_url: userInfo.avatar,
            }
          }
        }
      });
    }

    // 5. Create session
    const session = await this.createSession(user.id);

    return { user, session };
  }

  // Session Management
  async createSession(userId: string, deviceInfo?: any) {
    const token = crypto.randomUUID();
    const refreshToken = crypto.randomUUID();

    const session = await db.user_sessions.create({
      data: {
        user_id: userId,
        token_hash: await bcrypt.hash(token, 10),
        refresh_token_hash: await bcrypt.hash(refreshToken, 10),
        device_info: deviceInfo,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    });

    return {
      sessionId: session.id,
      token,
      refreshToken,
      expiresAt: session.expires_at,
    };
  }

  async verifySession(token: string) {
    const sessions = await db.user_sessions.findMany({
      where: {
        expires_at: { gt: new Date() }
      },
      include: { user: true }
    });

    for (const session of sessions) {
      const valid = await bcrypt.compare(token, session.token_hash);
      if (valid) {
        // Update last_active
        await db.user_sessions.update({
          where: { id: session.id },
          data: { last_active: new Date() }
        });

        return session.user;
      }
    }

    throw new Error('Invalid session');
  }

  async refreshSession(refreshToken: string) {
    const sessions = await db.user_sessions.findMany({
      where: {
        expires_at: { gt: new Date() }
      }
    });

    for (const session of sessions) {
      const valid = await bcrypt.compare(refreshToken, session.refresh_token_hash);
      if (valid) {
        // Create new session
        return this.createSession(session.user_id);
      }
    }

    throw new Error('Invalid refresh token');
  }

  async revokeSession(sessionId: string) {
    await db.user_sessions.delete({ where: { id: sessionId } });
  }
}
```

---

## API Architecture

### tRPC Router Structure

```typescript
// src/server/api/root.ts

import { router } from './trpc';
import { authRouter } from './routers/auth';
import { userRouter } from './routers/user';
import { questRouter } from './routers/quest';
import { portalRouter } from './routers/portal';
import { companionRouter } from './routers/companion';
import { creatorRouter } from './routers/creator';
import { worldRouter } from './routers/world';
import { socialRouter } from './routers/social';

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  quest: questRouter,
  portal: portalRouter,
  companion: companionRouter,
  creator: creatorRouter,
  world: worldRouter,
  social: socialRouter,
});

export type AppRouter = typeof appRouter;
```

### Example Router: Quest System

```typescript
// src/server/api/routers/quest.ts

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const questRouter = router({
  // Get user's quest progress
  getProgress: protectedProcedure
    .input(z.object({ questId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (input.questId) {
        return ctx.db.quest_progress.findUnique({
          where: {
            user_id_quest_id: {
              user_id: ctx.user.id,
              quest_id: input.questId,
            }
          }
        });
      }

      return ctx.db.quest_progress.findMany({
        where: { user_id: ctx.user.id }
      });
    }),

  // Start a new quest
  startQuest: protectedProcedure
    .input(z.object({
      questId: z.string(),
      metadata: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const progress = await ctx.db.quest_progress.create({
        data: {
          user_id: ctx.user.id,
          quest_id: input.questId,
          status: 'active',
          progress: 0,
          current_stage: 1,
          metadata: input.metadata,
        }
      });

      // Emit event
      ctx.events.emit('QuestTriggered', {
        questId: input.questId,
        userId: ctx.user.id,
      });

      return progress;
    }),

  // Update quest progress
  updateProgress: protectedProcedure
    .input(z.object({
      questId: z.string(),
      progress: z.number().min(0).max(100),
      currentStage: z.number().optional(),
      timeSpent: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.quest_progress.update({
        where: {
          user_id_quest_id: {
            user_id: ctx.user.id,
            quest_id: input.questId,
          }
        },
        data: {
          progress: input.progress,
          current_stage: input.currentStage,
          time_spent_seconds: input.timeSpent,
        }
      });

      // Emit event
      ctx.events.emit('QuestProgressUpdated', {
        questId: input.questId,
        userId: ctx.user.id,
        progress: input.progress,
      });

      return updated;
    }),

  // Complete a quest
  completeQuest: protectedProcedure
    .input(z.object({
      questId: z.string(),
      rewards: z.object({
        skills: z.record(z.number()).optional(),
        badges: z.array(z.string()).optional(),
        unlocks: z.array(z.string()).optional(),
      })
    }))
    .mutation(async ({ ctx, input }) => {
      // Mark quest complete
      const completed = await ctx.db.quest_progress.update({
        where: {
          user_id_quest_id: {
            user_id: ctx.user.id,
            quest_id: input.questId,
          }
        },
        data: {
          status: 'completed',
          completed_at: new Date(),
          progress: 100,
          rewards: input.rewards,
        }
      });

      // Apply skill rewards
      if (input.rewards.skills) {
        for (const [skill, amount] of Object.entries(input.rewards.skills)) {
          await ctx.db.skill_levels.upsert({
            where: {
              user_id_skill_name: {
                user_id: ctx.user.id,
                skill_name: skill,
              }
            },
            create: {
              user_id: ctx.user.id,
              skill_name: skill,
              level: amount,
              experience: amount * 10,
            },
            update: {
              level: { increment: amount },
              experience: { increment: amount * 10 },
              last_increased: new Date(),
            }
          });

          ctx.events.emit('SkillIncreased', {
            userId: ctx.user.id,
            skill,
            amount,
          });
        }
      }

      // Award badges
      if (input.rewards.badges) {
        for (const badgeName of input.rewards.badges) {
          await ctx.db.badges.create({
            data: {
              user_id: ctx.user.id,
              badge_name: badgeName,
            }
          });
        }
      }

      // Unlock portals
      if (input.rewards.unlocks) {
        for (const portalId of input.rewards.unlocks) {
          await ctx.db.portal_unlocks.create({
            data: {
              user_id: ctx.user.id,
              portal_id: portalId,
              unlocked_by: input.questId,
            }
          });

          ctx.events.emit('PortalUnlocked', {
            userId: ctx.user.id,
            portalId,
            unlockedBy: input.questId,
          });
        }
      }

      // Emit completion event
      ctx.events.emit('QuestCompleted', {
        questId: input.questId,
        userId: ctx.user.id,
        rewards: input.rewards,
        completionTime: completed.time_spent_seconds,
      });

      return completed;
    }),
});
```

---

## Creator Economy

### Three-Tier Creator Tools

#### Tier 1: No-Code Visual Builder

```typescript
// Visual drag-and-drop interface
interface NoCodeBuilder {
  // Canvas
  canvas: {
    addPortal(position: Vector3): Portal;
    addNPC(position: Vector3): NPC;
    addObject(type: GeometryType, position: Vector3): Mesh;
    addQuest(template: QuestTemplate): Quest;
  };

  // Templates
  templates: {
    portalTemplates: PortalTemplate[];
    questTemplates: QuestTemplate[];
    npcTemplates: NPCTemplate[];
    worldTemplates: WorldTemplate[];
  };

  // Publishing
  publish: {
    validateWorld(): ValidationResult;
    setPrice(cents: number): void;
    uploadThumbnail(file: File): void;
    publishToMarketplace(): Promise<World>;
  };
}
```

**Features**:
- Drag-and-drop portal placement
- Pre-built quest templates
- NPC wizard (personality, appearance, dialogue)
- One-click publish to marketplace

#### Tier 2: Low-Code HoloScript IDE

```typescript
// Web-based IDE for HoloScript
interface LowCodeIDE {
  // Editor
  editor: {
    openFile(path: string): void;
    saveFile(path: string, content: string): void;
    validateHoloScript(): ValidationResult;
    getAutocomplete(position: Position): Suggestion[];
  };

  // Preview
  preview: {
    renderScene(holoscript: string): SceneConfig;
    testQuest(questId: string): QuestSimulator;
    debugEvents(): EventLog;
  };

  // Assets
  assets: {
    uploadModel(file: File): Promise<Asset>;
    uploadTexture(file: File): Promise<Asset>;
    browse3DMarketplace(): Asset[];
  };
}
```

**Features**:
- Syntax highlighting for HoloScript
- Live preview of changes
- Quest testing simulator
- Asset library integration

#### Tier 3: Full-Code SDK

```typescript
// TypeScript SDK for advanced creators
import { HoloSDK } from '@holoverse/sdk';

const sdk = new HoloSDK({
  apiKey: process.env.HOLOVERSE_API_KEY,
  environment: 'production',
});

// Create custom portal logic
sdk.portals.create({
  id: 'custom_portal',
  position: [0, 0, 0],
  onActivate: async (user) => {
    // Custom activation logic
    await sdk.quests.start({
      userId: user.id,
      questId: 'custom_quest',
    });

    // Custom reward logic
    await sdk.rewards.grant({
      userId: user.id,
      type: 'custom_token',
      amount: 100,
    });
  },
});

// Integrate external APIs
sdk.worlds.addExternalAPI({
  worldId: 'my_world',
  apiEndpoint: 'https://myapi.com/data',
  refreshInterval: 60000, // 1 minute
  onDataUpdate: (data) => {
    // Update world state based on external data
    sdk.state.update({
      worldId: 'my_world',
      key: 'external_data',
      value: data,
    });
  },
});
```

**Features**:
- Full TypeScript SDK
- Custom logic in portal/quest/NPC behaviors
- External API integrations
- Advanced analytics hooks
- Deploy custom server-side functions

### Marketplace Economics

```typescript
interface MarketplaceEconomics {
  pricing: {
    free: 0;                      // Free worlds (ads supported)
    basic: 99;                    // $0.99 (impulse buy)
    standard: 499;                // $4.99 (full quest pack)
    premium: 999;                 // $9.99 (multi-hour experience)
    enterprise: 'custom';         // Custom pricing for B2B
  };

  revenueSplit: {
    creator: 70;                  // Creator keeps 70%
    platform: 30;                 // Platform takes 30%
  };

  payouts: {
    minimum: 1000;                // $10 minimum payout
    schedule: 'monthly';          // Monthly payouts
    methods: ['stripe', 'paypal', 'crypto'];
  };
}
```

---

## Migration Roadmap

### Phase 1: Foundation (Months 1-2)

**Goal**: Set up OASIS infrastructure

**Tasks**:
1. ✅ Set up Railway Postgres database
2. ✅ Create database schema (11 tables)
3. ✅ Implement HoloversAuthSystem
4. ✅ Build tRPC API routes
5. ✅ Migrate QuestState to database
6. ✅ Add WebSocket for real-time sync
7. ✅ Create user dashboard

**Deliverables**:
- Working auth system (email + wallet + OAuth)
- Persistent user accounts
- Quest progress saved to database
- Real-time event synchronization

### Phase 2: Creator Tools (Months 3-4)

**Goal**: Enable user-generated content

**Tasks**:
1. Build no-code visual builder
2. Create HoloScript IDE
3. Implement marketplace
4. Add revenue sharing system
5. Creator grants program

**Deliverables**:
- No-code builder (drag-and-drop)
- Marketplace with 10 template worlds
- First 100 creator accounts
- $1000 in creator grants distributed

### Phase 3: Accessibility (Months 5-6)

**Goal**: Multi-platform access

**Tasks**:
1. Optimize for mobile (iOS/Android)
2. Create 2D web version
3. Add VR support (Meta Quest)
4. Desktop client optimization

**Deliverables**:
- Mobile app (React Native)
- 2D web fallback
- VR mode (WebXR)
- Desktop client (Electron)

### Phase 4: Digital Twins (Months 7-10)

**Goal**: Real-world sync partnerships

**Tasks**:
1. Partner with Austin, TX
2. Build city digital twin
3. University campus replica
4. Enterprise facility demos

**Deliverables**:
- Austin digital twin (beta)
- 2 university partnerships
- 5 enterprise facility demos
- Digital twin SDK

### Phase 5: Scale (Months 11-18)

**Goal**: Market leadership

**Tasks**:
1. Scale to 1M users
2. Expand to 20 cities
3. 10,000 creators active
4. $9.6M ARR

**Deliverables**:
- 1M MAU
- 20 city digital twins
- 10K active creators
- Market leadership

---

## Technology Stack

### Current Stack (StoryWeaver)

**Frontend**:
- React 18.3
- React Three Fiber 8.17
- React Three Drei 9.114
- TypeScript 5.7
- Vite 6.0

**State Management**:
- Zustand 4.5
- localStorage

**3D/Graphics**:
- Three.js 0.170
- cannon-es 0.20 (physics)

**AI**:
- OpenAI GPT-4

**Parsing**:
- @holoscript/core 3.41
- @holoscript/runtime 3.1

### Target Stack (Holoverse)

**Frontend** (unchanged):
- React 18.3
- React Three Fiber 8.17
- TypeScript 5.7
- Vite 6.0

**Backend** (new):
- Next.js 14 (API routes + SSR)
- tRPC 10 (type-safe API)
- Prisma 5 (ORM)

**Database**:
- Railway Postgres (primary)
- Redis (caching, sessions, WebSocket)

**Authentication**:
- NextAuth.js (OAuth providers)
- ethers.js (wallet connect)
- bcrypt (password hashing)
- JWT (session tokens)

**Real-Time**:
- WebSocket (Socket.io or native)
- Redis Pub/Sub (multi-server sync)

**File Storage**:
- Railway Volumes (user uploads)
- CDN (static assets)

**Payments**:
- Stripe (credit cards)
- WalletConnect (crypto payments)

**Analytics**:
- PostHog (product analytics)
- Mixpanel (user behavior)

**Monitoring**:
- Sentry (error tracking)
- Railway Metrics (infrastructure)

---

## Deployment Architecture

### Development Environment

```
localhost:5173 (Vite dev server)
     ↓
localhost:3000 (Next.js API)
     ↓
localhost:5432 (Local Postgres)
localhost:6379 (Local Redis)
```

### Production Environment (Railway)

```
┌─────────────────────────────────────────┐
│         Railway Production              │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐  ┌────────────────┐  │
│  │   Frontend   │  │    Backend     │  │
│  │  (Vite SPA)  │  │  (Next.js API) │  │
│  │  Railway     │  │   Railway      │  │
│  └──────┬───────┘  └────────┬───────┘  │
│         │                   │          │
│         │    ┌──────────────┼────────┐ │
│         │    │              │        │ │
│         ▼    ▼              ▼        ▼ │
│  ┌──────────┐  ┌──────────┐ ┌────────┐│
│  │          │  │          │ │        ││
│  │ Postgres │  │  Redis   │ │Volumes ││
│  │  (Data)  │  │(Sessions)│ │(Files) ││
│  │          │  │          │ │        ││
│  └──────────┘  └──────────┘ └────────┘│
│                                        │
└────────────────────────────────────────┘
         │
         ▼
   ┌──────────┐
   │   CDN    │ (Cloudflare/Vercel)
   │ (Assets) │
   └──────────┘
```

### Scaling Strategy

**Phase 1: Single Server** (0-10K users)
- 1 Railway service (Next.js)
- 1 Postgres instance
- 1 Redis instance

**Phase 2: Horizontal Scale** (10K-100K users)
- 3-5 Railway services (load balanced)
- Postgres read replicas
- Redis cluster

**Phase 3: Geo-Distributed** (100K-1M users)
- Multi-region deployment
- Postgres sharding by user_id
- Redis clusters per region
- CDN edge caching

---

## Summary

### What We Have (StoryWeaver Layer - 95% Complete)

✅ **Quest System** - Full state management with skills, badges, portals
✅ **Event Bus** - Type-safe events with React hooks
✅ **AI Companions** - GPT-4 integration with 3 characters
✅ **HoloScript Parser** - .holo → Three.js scene conversion
✅ **3D Viewer** - React Three Fiber with interactive portals/NPCs
✅ **Demo UI** - Quest log, skills panel, chat interface

### What We Need (OASIS Layer - 0% Complete)

⏳ **Authentication** - Multi-modal auth (email, wallet, OAuth, DID)
⏳ **Database** - Railway Postgres with 11-table schema
⏳ **API Layer** - tRPC for type-safe backend communication
⏳ **Creator Tools** - No-code, low-code, full-code tiers
⏳ **Marketplace** - World templates with 70/30 revenue split
⏳ **Digital Twins** - Real-world sync engine
⏳ **Multi-Platform** - VR, desktop, mobile, 2D web

### The Path Forward

**Next Implementation Steps** (Priority Order):

1. **Set Up Railway Postgres** (4 hours)
   - Create database
   - Run schema migration
   - Configure connection pooling

2. **Implement Auth System** (16 hours)
   - Email/password auth
   - Wallet connect
   - OAuth (Google, Discord)
   - Session management

3. **Build tRPC API** (24 hours)
   - Quest router
   - User router
   - Portal router
   - Companion router

4. **Migrate State to DB** (8 hours)
   - Replace localStorage with API calls
   - Add WebSocket sync
   - Test persistence

5. **Create User Dashboard** (12 hours)
   - Profile page
   - Account settings
   - Subscription management

**Total Estimated Time**: 64 hours (~2 weeks full-time)

---

**Document Version**: 1.0
**Last Updated**: 2026-02-19
**Status**: Architecture Complete, Implementation Starting
**Next Review**: After Phase 1 (Foundation) completion
