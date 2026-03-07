-- Migration 001: Initial Invite System
-- Invited users whitelist
CREATE TABLE IF NOT EXISTS invited_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  invite_token TEXT UNIQUE,
  invited_by UUID,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_invited_users_email ON invited_users(email);
CREATE INDEX IF NOT EXISTS idx_invited_users_token ON invited_users(invite_token);

-- RLS: Only service role can manage invited_users (admin-only operation)
ALTER TABLE invited_users ENABLE ROW LEVEL SECURITY;

-- No policies - all access via service role (admin API routes)
-- This ensures only server-side code with service role can read/write

-- Migrate existing hardcoded emails to DB
INSERT INTO invited_users (email, name, accepted_at)
VALUES
  ('karlasgerjuhl@gmail.com', 'Karl', NOW())
ON CONFLICT (email) DO NOTHING;
