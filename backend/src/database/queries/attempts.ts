import { getDb } from '../client.js';
import { AttemptResult, VerificationAttemptRow } from '../types.js';

export async function recordAttempt(params: {
  userId: string;
  guildId: string;
  sessionId?: string | null;
  result: AttemptResult;
  failureReason?: string | null;
  ipHash?: string | null;
}): Promise<VerificationAttemptRow> {
  const db = getDb();
  const { data, error } = await db
    .from('verification_attempts')
    .insert({
      user_id: params.userId,
      guild_id: params.guildId,
      session_id: params.sessionId || null,
      result: params.result,
      failure_reason: params.failureReason || null,
      ip_hash: params.ipHash || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record verification attempt: ${error.message}`);
  }

  return data as VerificationAttemptRow;
}

export async function countRecentFailures(
  userId: string,
  guildId: string,
  since: Date
): Promise<number> {
  const db = getDb();
  const { count, error } = await db
    .from('verification_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('guild_id', guildId)
    .eq('result', 'FAILURE')
    .gte('created_at', since.toISOString());

  if (error) {
    throw new Error(`Failed to count recent failures: ${error.message}`);
  }

  return count || 0;
}

export async function getGuildAttemptStats(
  guildId: string,
  since?: Date
): Promise<{ total: number; success: number; failure: number }> {
  const db = getDb();
  let query = db.from('verification_attempts').select('result').eq('guild_id', guildId);

  if (since) {
    query = query.gte('created_at', since.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get attempt stats: ${error.message}`);
  }

  const rows = data || [];
  const total = rows.length;
  const success = rows.filter((r) => r.result === 'SUCCESS').length;
  const failure = total - success;

  return { total, success, failure };
}
