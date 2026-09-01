-- 0002_account_age.sql
-- Adds minimum account age configuration to guild_config

ALTER TABLE guild_config
ADD COLUMN IF NOT EXISTS minimum_account_age_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS minimum_account_age_days INTEGER NOT NULL DEFAULT 7 CHECK (minimum_account_age_days >= 0);
