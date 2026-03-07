-- GYM APP DATABASE SCHEMA
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. MESSAGES (raw truth - all chat messages)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  day_key DATE NOT NULL,           -- user's local date
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS messages_user_day_idx ON messages (user_id, day_key, created_at);

-- ============================================
-- 2. DAY_LOGS (structured output from processing)
-- ============================================
CREATE TABLE IF NOT EXISTS day_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  day_key DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processor_version TEXT NOT NULL DEFAULT 'v0',
  source_message_max_id BIGINT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed','failed')),
  day_log JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS day_logs_user_day_unique ON day_logs (user_id, day_key);

-- ============================================
-- 3. USER_GOALS (target calories, protein, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS user_goals (
  user_id UUID PRIMARY KEY,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL  -- target_calories, target_protein, goal_type (bulk/lean_bulk/cut), etc.
);

-- ============================================
-- 4. INVITED_USERS (invite system + whitelist)
-- ============================================
CREATE TABLE IF NOT EXISTS invited_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,                    -- NULLABLE (for generic invites)
  name TEXT,                     -- NULLABLE (for generic invites)
  invite_token TEXT UNIQUE,      -- Secure token for invite link
  invited_by UUID,               -- User who created the invite
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,       -- Set when user completes magic link
  is_generic BOOLEAN DEFAULT FALSE,  -- True for generic invites
  claimed_at TIMESTAMPTZ,        -- Set when generic invite is claimed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invited_users_email ON invited_users(email);
CREATE INDEX IF NOT EXISTS idx_invited_users_token ON invited_users(invite_token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invited_users_email_unique ON invited_users(email) WHERE email IS NOT NULL;

-- ============================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE invited_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. RLS POLICIES
-- ============================================

-- Messages: Users can only see their own messages
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Day logs: Users can only see their own day logs
CREATE POLICY "Users can view own day_logs" ON day_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own day_logs" ON day_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own day_logs" ON day_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- User goals: Users can only see/update their own goals
CREATE POLICY "Users can view own goals" ON user_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals" ON user_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON user_goals
  FOR UPDATE USING (auth.uid() = user_id);

-- Note: invited_users has NO policies - all access via service role (admin API only)
