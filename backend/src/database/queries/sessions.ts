import { getDb } from '../client.js';
import { SessionStatus, VerificationSessionRow } from '../types.js';

export async function createVerificationSession(params: {
  id?: string;
  userId: string;
  guildId: string;
  oauthState: string;
  signedToken: string;
  expiresAt: Date;
}): Promise<VerificationSessionRow> {
  const db = getDb();
  
  const payload: any = {
    user_id: params.userId,
    guild_id: params.guildId,
    oauth_state: params.oauthState,
    signed_token: params.signedToken,
    expires_at: params.expiresAt.toISOString(),
    status: 'PENDING',
  };
  
  if (params.id) {
    payload.id = params.id;
  }

  const { data, error } = await db
    .from('verification_sessions')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create verification session: ${error.message}`);
  }

  return data as VerificationSessionRow;
}

export async function findSessionById(id: string): Promise<VerificationSessionRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from('verification_sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find session by id: ${error.message}`);
  }

  return data as VerificationSessionRow | null;
}

export async function findSessionByToken(signedToken: string): Promise<VerificationSessionRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from('verification_sessions')
    .select('*')
    .eq('signed_token', signedToken)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find session by signed_token: ${error.message}`);
  }

  return data as VerificationSessionRow | null;
}

export async function findSessionByOAuthState(oauthState: string): Promise<VerificationSessionRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from('verification_sessions')
    .select('*')
    .eq('oauth_state', oauthState)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find session by oauth_state: ${error.message}`);
  }

  return data as VerificationSessionRow | null;
}

export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus
): Promise<VerificationSessionRow> {
  const db = getDb();
  const { data, error } = await db
    .from('verification_sessions')
    .update({ status })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update session status: ${error.message}`);
  }

  return data as VerificationSessionRow;
}

export async function consumeSessionAtomically(
  sessionId: string
): Promise<VerificationSessionRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from('verification_sessions')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', sessionId)
    .is('consumed_at', null)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to atomically consume session: ${error.message}`);
  }

  return data as VerificationSessionRow | null;
}

export async function sweepExpiredSessions(): Promise<number> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('verification_sessions')
    .update({ status: 'EXPIRED' })
    .eq('status', 'PENDING')
    .lt('expires_at', now)
    .select('id');

  if (error) {
    throw new Error(`Failed to sweep expired sessions: ${error.message}`);
  }

  return (data || []).length;
}
