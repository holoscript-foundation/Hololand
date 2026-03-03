-- Founders Program Schema (Supabase/PostgreSQL)
-- Supports application flow, waitlist, badge tiers, quota overrides, and onboarding wizard

-- Application status enum type
DO $$ BEGIN
  CREATE TYPE founder_application_status AS ENUM (
    'pending',
    'waitlisted',
    'approved',
    'rejected',
    'revoked'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Badge tier enum type
DO $$ BEGIN
  CREATE TYPE founder_badge_tier AS ENUM (
    'pioneer',
    'visionary',
    'architect'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Onboarding step enum type
DO $$ BEGIN
  CREATE TYPE founder_onboarding_step AS ENUM (
    'welcome',
    'profile',
    'first_world',
    'tutorial',
    'community',
    'complete'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Main founders table
CREATE TABLE IF NOT EXISTS founders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Application
  application_status founder_application_status NOT NULL DEFAULT 'pending',
  invite_code VARCHAR(8) UNIQUE,
  score DECIMAL(5, 2) DEFAULT 0,

  -- Badge
  badge_tier founder_badge_tier,

  -- Onboarding
  onboarding_step founder_onboarding_step DEFAULT 'welcome',
  onboarding_completed_at TIMESTAMP,

  -- Referrals
  referred_by UUID REFERENCES founders(id),
  referral_count INT DEFAULT 0,

  -- Quota overrides (3x default for founders)
  quota_worlds INT DEFAULT 30,       -- default is 10, founders get 3x
  quota_assets INT DEFAULT 150,      -- default is 50, founders get 3x
  quota_storage_mb INT DEFAULT 3072, -- default is 1024MB, founders get 3x

  -- Application data
  portfolio_url TEXT,
  application_note TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Founder asset grants (starter pack tracking)
CREATE TABLE IF NOT EXISTS founder_asset_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  asset_type VARCHAR(50) NOT NULL,  -- 'premium_asset', 'exclusive_material', 'badge_model'
  asset_id VARCHAR(100) NOT NULL,   -- reference to asset in asset system
  asset_name TEXT NOT NULL,
  granted_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(founder_id, asset_id)
);

-- Founder world templates (auto-forked worlds for onboarding)
CREATE TABLE IF NOT EXISTS founder_template_worlds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  template_id VARCHAR(50) NOT NULL,
  world_id UUID REFERENCES worlds(id),
  forked_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(founder_id, template_id)
);

-- Waitlist priority queue view
CREATE OR REPLACE VIEW founder_waitlist AS
SELECT
  f.id,
  f.user_id,
  u.email,
  u.username,
  f.score,
  f.referral_count,
  f.portfolio_url,
  f.application_note,
  f.created_at,
  -- Priority score: portfolio quality (score) + referral bonus (5 points per referral)
  (f.score + (f.referral_count * 5)) AS priority_score
FROM founders f
JOIN users u ON f.user_id = u.id
WHERE f.application_status = 'waitlisted'
ORDER BY (f.score + (f.referral_count * 5)) DESC, f.created_at ASC;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_founders_user_id ON founders(user_id);
CREATE INDEX IF NOT EXISTS idx_founders_invite_code ON founders(invite_code);
CREATE INDEX IF NOT EXISTS idx_founders_status ON founders(application_status);
CREATE INDEX IF NOT EXISTS idx_founders_badge_tier ON founders(badge_tier);
CREATE INDEX IF NOT EXISTS idx_founders_referred_by ON founders(referred_by);
CREATE INDEX IF NOT EXISTS idx_founders_score ON founders(score DESC);
CREATE INDEX IF NOT EXISTS idx_founder_asset_grants_founder ON founder_asset_grants(founder_id);
CREATE INDEX IF NOT EXISTS idx_founder_template_worlds_founder ON founder_template_worlds(founder_id);

-- RLS policies
ALTER TABLE founders ENABLE ROW LEVEL SECURITY;

-- Users can view their own founder record
CREATE POLICY IF NOT EXISTS founders_select_own ON founders
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all founder records
CREATE POLICY IF NOT EXISTS founders_service_all ON founders
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE founder_asset_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS founder_assets_select_own ON founder_asset_grants
  FOR SELECT USING (
    founder_id IN (SELECT id FROM founders WHERE user_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS founder_assets_service_all ON founder_asset_grants
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE founder_template_worlds ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS founder_templates_select_own ON founder_template_worlds
  FOR SELECT USING (
    founder_id IN (SELECT id FROM founders WHERE user_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS founder_templates_service_all ON founder_template_worlds
  FOR ALL USING (auth.role() = 'service_role');

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_founders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS founders_updated_at ON founders;
CREATE TRIGGER founders_updated_at
  BEFORE UPDATE ON founders
  FOR EACH ROW EXECUTE FUNCTION update_founders_updated_at();

-- Function to increment referral count when a new founder is referred
CREATE OR REPLACE FUNCTION increment_referral_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referred_by IS NOT NULL THEN
    UPDATE founders SET referral_count = referral_count + 1
    WHERE id = NEW.referred_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS founders_referral_count ON founders;
CREATE TRIGGER founders_referral_count
  AFTER INSERT ON founders
  FOR EACH ROW EXECUTE FUNCTION increment_referral_count();
