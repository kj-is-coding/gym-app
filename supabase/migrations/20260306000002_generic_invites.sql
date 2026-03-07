-- Migration 002: Generic Invite Support
-- Generic invite links support
-- Allows creating invite links without knowing recipient's email

-- Make email and name nullable for unclaimed (generic) invites
ALTER TABLE invited_users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE invited_users ALTER COLUMN name DROP NOT NULL;

-- Add is_generic flag to distinguish generic invites
ALTER TABLE invited_users ADD COLUMN IF NOT EXISTS is_generic BOOLEAN DEFAULT FALSE;

-- Add claimed_at to track when a generic invite was claimed
ALTER TABLE invited_users ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- Add partial unique index for email (only enforce uniqueness when NOT NULL)
-- This allows multiple NULL emails while ensuring unique non-NULL emails
CREATE UNIQUE INDEX IF NOT EXISTS idx_invited_users_email_unique
  ON invited_users(email)
  WHERE email IS NOT NULL;
