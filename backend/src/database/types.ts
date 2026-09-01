export type VerificationStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'VERIFIED'
  | 'FAILED'
  | 'EXPIRED'
  | 'REVOKED';

export type SessionStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'VERIFIED'
  | 'FAILED'
  | 'EXPIRED';

export type AttemptResult = 'SUCCESS' | 'FAILURE';

export type AdminRole = 'admin' | 'owner';

export type AuditEventType =
  | 'member_joined'
  | 'member_left'
  | 'verification_started'
  | 'oauth_success'
  | 'oauth_failure'
  | 'verification_success'
  | 'verification_failure'
  | 'role_assigned'
  | 'role_assignment_failure'
  | 'verification_revoked'
  | 'admin_action'
  | 'configuration_changed'
  | 'bot_error'
  | 'suspicious_activity'
  | 'status_checked'
  | 'stats_viewed'
  | 'admin_force_reverify';

export interface UserRow {
  id: string;
  discord_id: string;
  username: string | null;
  created_at: string;
  updated_at: string;
}

export interface GuildRow {
  id: string;
  discord_guild_id: string;
  name: string | null;
  created_at: string;
}

export interface GuildConfigRow {
  guild_id: string;
  verified_role_id: string | null;
  unverified_role_id: string | null;
  verification_channel_id: string | null;
  log_channel_id: string | null;
  verification_enabled: boolean;
  verification_message: string | null;
  session_expiration_minutes: number;
  rate_limit_attempts: number;
  rate_limit_window_minutes: number;
  minimum_account_age_enabled: boolean;
  minimum_account_age_days: number;
  updated_at: string;
}

export interface AdminUserRow {
  id: string;
  discord_id: string;
  guild_id: string;
  role: AdminRole;
  created_at: string;
}

export interface VerificationSessionRow {
  id: string;
  user_id: string;
  guild_id: string;
  oauth_state: string;
  status: SessionStatus;
  signed_token: string;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}

export interface VerificationRow {
  id: string;
  user_id: string;
  guild_id: string;
  status: VerificationStatus;
  role_assigned: boolean;
  verified_at: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationAttemptRow {
  id: string;
  user_id: string;
  guild_id: string;
  session_id: string | null;
  result: AttemptResult;
  failure_reason: string | null;
  ip_hash: string | null;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  guild_id: string | null;
  user_id: string | null;
  admin_id: string | null;
  event_type: AuditEventType;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RateLimitRow {
  key: string;
  count: number;
  window_start: string;
  updated_at: string;
}

export interface WebSessionRow {
  sid: string;
  admin_id: string;
  expires_at: string;
  created_at: string;
}
