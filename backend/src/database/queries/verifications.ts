import { getDb } from '../client.js';
import { VerificationRow, VerificationStatus } from '../types.js';

export async function getVerification(
  userId: string,
  guildId: string
): Promise<VerificationRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from('verifications')
    .select('*')
    .eq('user_id', userId)
    .eq('guild_id', guildId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get verification: ${error.message}`);
  }

  return data as VerificationRow | null;
}

export async function upsertVerification(params: {
  userId: string;
  guildId: string;
  status: VerificationStatus;
  roleAssigned?: boolean;
  sessionId?: string | null;
  verifiedAt?: string | null;
  revokedAt?: string | null;
  revokedBy?: string | null;
}): Promise<VerificationRow> {
  const db = getDb();
  const payload: Record<string, unknown> = {
    user_id: params.userId,
    guild_id: params.guildId,
    status: params.status,
    role_assigned: params.roleAssigned ?? false,
    updated_at: new Date().toISOString(),
  };

  if (params.sessionId !== undefined) payload.session_id = params.sessionId;
  if (params.verifiedAt !== undefined) payload.verified_at = params.verifiedAt;
  if (params.revokedAt !== undefined) payload.revoked_at = params.revokedAt;
  if (params.revokedBy !== undefined) payload.revoked_by = params.revokedBy;

  const { data, error } = await db
    .from('verifications')
    .upsert(payload, { onConflict: 'user_id,guild_id' })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert verification: ${error.message}`);
  }

  return data as VerificationRow;
}

export async function markVerificationVerified(params: {
  userId: string;
  guildId: string;
  sessionId?: string | null;
}): Promise<VerificationRow> {
  return upsertVerification({
    userId: params.userId,
    guildId: params.guildId,
    status: 'VERIFIED',
    roleAssigned: true,
    sessionId: params.sessionId,
    verifiedAt: new Date().toISOString(),
    revokedAt: null,
    revokedBy: null,
  });
}

export async function markVerificationRevoked(params: {
  userId: string;
  guildId: string;
  revokedByAdminId?: string | null;
}): Promise<VerificationRow> {
  return upsertVerification({
    userId: params.userId,
    guildId: params.guildId,
    status: 'REVOKED',
    roleAssigned: false,
    revokedAt: new Date().toISOString(),
    revokedBy: params.revokedByAdminId,
  });
}

export async function markVerificationFailed(params: {
  userId: string;
  guildId: string;
  sessionId?: string | null;
}): Promise<VerificationRow> {
  return upsertVerification({
    userId: params.userId,
    guildId: params.guildId,
    status: 'FAILED',
    roleAssigned: false,
    sessionId: params.sessionId,
  });
}

export async function listVerifiedInGuild(guildId: string): Promise<VerificationRow[]> {
  const db = getDb();
  const { data, error } = await db
    .from('verifications')
    .select('*')
    .eq('guild_id', guildId)
    .eq('status', 'VERIFIED');

  if (error) {
    throw new Error(`Failed to list verified users in guild: ${error.message}`);
  }

  return (data || []) as VerificationRow[];
}

export async function deleteVerification(userId: string, guildId: string): Promise<void> {
  const db = getDb();
  const { error } = await db
    .from('verifications')
    .delete()
    .eq('user_id', userId)
    .eq('guild_id', guildId);

  if (error) {
    throw new Error(`Failed to delete verification: ${error.message}`);
  }
}
