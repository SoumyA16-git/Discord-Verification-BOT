-- ==============================================================================
-- 0001_init.sql — Discord Verification Platform Database Schema
-- Matches PRD.md Section 6.3 & 6.4 with Row Level Security (RLS)
-- ==============================================================================

-- Enable pgcrypto for UUID generation
create extension if not exists pgcrypto;

-- 1. Users Table (Canonical Discord Identifiers)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null unique,
  username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Guilds Table
create table if not exists guilds (
  id uuid primary key default gen_random_uuid(),
  discord_guild_id text not null unique,
  name text,
  created_at timestamptz not null default now()
);

-- 3. Guild Configuration Table
create table if not exists guild_config (
  guild_id uuid primary key references guilds(id) on delete cascade,
  verified_role_id text,
  unverified_role_id text,
  verification_channel_id text,
  log_channel_id text,
  verification_enabled boolean not null default false,
  verification_message text default 'Click the button below to verify your account.',
  session_expiration_minutes integer not null default 15 check (session_expiration_minutes > 0),
  rate_limit_attempts integer not null default 5 check (rate_limit_attempts > 0),
  rate_limit_window_minutes integer not null default 10 check (rate_limit_window_minutes > 0),
  updated_at timestamptz not null default now()
);

-- 4. Admin Users Table
create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null unique,
  guild_id uuid not null references guilds(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'owner')),
  created_at timestamptz not null default now()
);

-- 5. Verification Sessions Table (Short-lived OAuth round-trips)
create table if not exists verification_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  guild_id uuid not null references guilds(id) on delete cascade,
  oauth_state text not null unique,
  status text not null default 'PENDING' check (status in ('PENDING', 'IN_PROGRESS', 'VERIFIED', 'FAILED', 'EXPIRED')),
  signed_token text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_sessions_expiry on verification_sessions (expires_at) where status = 'PENDING';
create index if not exists idx_sessions_token on verification_sessions (signed_token);

-- 6. Durable Verifications Table (One canonical record per user per guild)
create table if not exists verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  guild_id uuid not null references guilds(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING', 'VERIFIED', 'FAILED', 'EXPIRED', 'REVOKED')),
  role_assigned boolean not null default false,
  verified_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references admin_users(id) on delete set null,
  session_id uuid references verification_sessions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, guild_id)
);

-- 7. Verification Attempts Table (Append-only historical audit)
create table if not exists verification_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  guild_id uuid not null references guilds(id) on delete cascade,
  session_id uuid references verification_sessions(id) on delete set null,
  result text not null check (result in ('SUCCESS', 'FAILURE')),
  failure_reason text,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists idx_attempts_user_guild_created on verification_attempts (user_id, guild_id, created_at desc);

-- 8. Audit Logs Table (Full auditable event trail)
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid references guilds(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  admin_id uuid references admin_users(id) on delete set null,
  event_type text not null check (event_type in (
    'member_joined', 'member_left', 'verification_started', 'oauth_success', 'oauth_failure',
    'verification_success', 'verification_failure', 'role_assigned', 'role_assignment_failure',
    'verification_revoked', 'admin_action', 'configuration_changed', 'bot_error',
    'suspicious_activity', 'status_checked', 'stats_viewed', 'admin_force_reverify'
  )),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_guild_created on audit_logs (guild_id, created_at desc);

-- 9. Rate Limits Table (PostgreSQL sliding window counter)
create table if not exists rate_limits (
  key text primary key,
  count integer not null default 1,
  window_start timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 10. Web Sessions Table (Admin cookie-backed sessions)
create table if not exists web_sessions (
  sid text primary key,
  admin_id uuid not null references admin_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Updated_at Trigger Function
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated on users;
create trigger trg_users_updated before update on users
  for each row execute function set_updated_at();

drop trigger if exists trg_guild_config_updated on guild_config;
create trigger trg_guild_config_updated before update on guild_config
  for each row execute function set_updated_at();

drop trigger if exists trg_verifications_updated on verifications;
create trigger trg_verifications_updated before update on verifications
  for each row execute function set_updated_at();

-- ==============================================================================
-- Row Level Security (RLS) Configuration
-- Enable RLS across all tables. Default zero-policy state blocks all anon access.
-- Privileged server operations bypass RLS using the service_role key.
-- ==============================================================================
alter table users enable row level security;
alter table guilds enable row level security;
alter table guild_config enable row level security;
alter table admin_users enable row level security;
alter table verification_sessions enable row level security;
alter table verifications enable row level security;
alter table verification_attempts enable row level security;
alter table audit_logs enable row level security;
alter table rate_limits enable row level security;
alter table web_sessions enable row level security;
