-- Enhanced schema with audit trails, soft deletes, and better constraints
-- Run these migrations BEFORE initial data inserts

-- Add audit columns to existing tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE worlds ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE worlds ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create audit log table for compliance
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL, -- CREATE, UPDATE, DELETE, PUBLISH
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES users(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Create RLS policies for soft deletes
ALTER TABLE worlds ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS worlds_not_deleted ON worlds
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY IF NOT EXISTS worlds_create ON worlds
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY IF NOT EXISTS worlds_update ON worlds
  FOR UPDATE USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS reviews_not_deleted ON reviews
  FOR SELECT USING (deleted_at IS NULL);

-- Create materialized view for leaderboard (for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS creator_leaderboard_materialized AS
SELECT 
  cp.user_id,
  cp.display_name,
  cp.total_earnings,
  COUNT(DISTINCT w.id) as world_count,
  COUNT(DISTINCT r.id) as review_count,
  AVG(r.rating) as avg_rating,
  COUNT(DISTINCT f.follower_id) as follower_count
FROM creator_profiles cp
LEFT JOIN worlds w ON cp.user_id = w.creator_id AND w.deleted_at IS NULL AND w.published = true
LEFT JOIN reviews r ON cp.user_id = r.creator_id AND r.deleted_at IS NULL
LEFT JOIN follows f ON cp.user_id = f.creator_id
GROUP BY cp.user_id, cp.display_name, cp.total_earnings
ORDER BY cp.total_earnings DESC;

CREATE INDEX IF NOT EXISTS idx_creator_leaderboard_earnings 
  ON creator_leaderboard_materialized(total_earnings DESC);

-- Create function to refresh leaderboard (call weekly)
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY creator_leaderboard_materialized;
END;
$$ LANGUAGE plpgsql;

-- Create function for soft delete
CREATE OR REPLACE FUNCTION soft_delete_world(world_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE worlds SET deleted_at = CURRENT_TIMESTAMP 
  WHERE id = world_id AND deleted_at IS NULL;
  
  INSERT INTO audit_logs (entity_type, entity_id, action, user_id, created_at)
  VALUES ('worlds', world_id, 'DELETE', auth.uid(), CURRENT_TIMESTAMP);
END;
$$ LANGUAGE plpgsql;

-- Create function to track state changes (audit trail)
CREATE OR REPLACE FUNCTION log_world_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_logs (entity_type, entity_id, action, old_values, new_values, user_id)
    VALUES ('worlds', NEW.id, 'UPDATE', 
            to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs (entity_type, entity_id, action, new_values, user_id)
    VALUES ('worlds', NEW.id, 'CREATE', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for audit logging
DROP TRIGGER IF NOT EXISTS world_audit_trigger ON worlds;
CREATE TRIGGER world_audit_trigger
AFTER INSERT OR UPDATE ON worlds
FOR EACH ROW EXECUTE FUNCTION log_world_change();

-- Add performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_world_date 
  ON analytics_events(world_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_creator_date 
  ON analytics_events(creator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_worlds_creator_published 
  ON worlds(creator_id, published, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_creator_status_date 
  ON transactions(creator_id, status, created_at DESC);

-- Add check constraints for data integrity
ALTER TABLE reviews ADD CONSTRAINT review_rating_check 
  CHECK (rating >= 1 AND rating <= 5);

ALTER TABLE creator_profiles ADD CONSTRAINT earnings_non_negative 
  CHECK (total_earnings >= 0);

ALTER TABLE transactions ADD CONSTRAINT amount_positive 
  CHECK (total_amount > 0 AND creator_amount >= 0 AND platform_amount >= 0);

-- Add unique constraints where needed
CREATE UNIQUE INDEX IF NOT EXISTS idx_follows_unique 
  ON follows(follower_id, creator_id);

-- Create view for common queries
CREATE OR REPLACE VIEW published_worlds_with_ratings AS
SELECT 
  w.id,
  w.title,
  w.description,
  w.creator_id,
  w.visit_count,
  w.created_at,
  AVG(r.rating) as avg_rating,
  COUNT(r.id) as review_count,
  cp.display_name as creator_name
FROM worlds w
LEFT JOIN reviews r ON w.id = r.world_id AND r.deleted_at IS NULL
LEFT JOIN creator_profiles cp ON w.creator_id = cp.user_id
WHERE w.published = true AND w.deleted_at IS NULL
GROUP BY w.id, w.title, w.description, w.creator_id, w.visit_count, w.created_at, cp.display_name;

-- Grant RLS permissions (adjust for your auth scheme)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS audit_logs_view ON audit_logs
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid() IN (SELECT creator_id FROM worlds WHERE id = entity_id)
  );
