-- Hololand Worlds Schema (Supabase/PostgreSQL)
-- Phase 0 MVP Schema

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'creator', 'pro', 'enterprise')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Creator profiles
CREATE TABLE creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  display_name TEXT NOT NULL,
  description TEXT,
  website URL,
  social_links JSONB,
  verified BOOLEAN DEFAULT false,
  total_earnings DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Worlds (user-created VR experiences)
CREATE TABLE worlds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT CHECK (category IN ('experience', 'game', 'social', 'education', 'commerce')),
  tags TEXT[] DEFAULT '{}',
  
  -- Content
  data JSONB NOT NULL,  -- HoloScript AST or R3F config
  version INT DEFAULT 1,
  
  -- Metadata
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  visits INT DEFAULT 0,
  rating DECIMAL(2, 1) DEFAULT 0,
  review_count INT DEFAULT 0,
  
  -- Pricing
  price_usd DECIMAL(6, 2) DEFAULT 0,
  
  -- Limits (Phase 0)
  max_objects INT DEFAULT 50,
  max_players INT DEFAULT 4,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- World assets (models, textures, audio)
CREATE TABLE world_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('model', 'texture', 'audio', 'video', 'script')),
  file_url TEXT NOT NULL,
  file_size INT,
  file_hash TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Transactions (purchases)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES users(id),
  world_id UUID NOT NULL REFERENCES worlds(id),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id),
  
  price DECIMAL(6, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Split
  creator_amount DECIMAL(6, 2) NOT NULL,  -- 70%
  platform_amount DECIMAL(6, 2) NOT NULL,  -- 30%
  
  stripe_transaction_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(world_id, reviewer_id)
);

-- Follows (creator discovery)
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, creator_id)
);

-- Creator tiers (early monetization)
CREATE TABLE creator_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  monthly_price DECIMAL(5, 2),
  perks TEXT[] DEFAULT '{}',
  members INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(creator_id, name)
);

-- Analytics events
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  world_id UUID REFERENCES worlds(id),
  user_id UUID REFERENCES users(id),
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_creator_profiles_user_id ON creator_profiles(user_id);
CREATE INDEX idx_worlds_creator_id ON worlds(creator_id);
CREATE INDEX idx_worlds_published ON worlds(published);
CREATE INDEX idx_worlds_category ON worlds(category);
CREATE INDEX idx_transactions_buyer_id ON transactions(buyer_id);
CREATE INDEX idx_transactions_creator_id ON transactions(creator_id);
CREATE INDEX idx_reviews_world_id ON reviews(world_id);
CREATE INDEX idx_follows_creator_id ON follows(creator_id);
CREATE INDEX idx_analytics_world_id ON analytics_events(world_id);
CREATE INDEX idx_analytics_user_id ON analytics_events(user_id);
