import { getDb } from '../client.js';
import { WebSessionRow } from '../types.js';

export async function createWebSession(
  sid: string,
  adminId: string,
  expiresAt: Date
): Promise<WebSessionRow> {
  const db = getDb();
  const { data, error } = await db
    .from('web_sessions')
    .upsert({
      sid,
      admin_id: adminId,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create web session: ${error.message}`);
  }

  return data as WebSessionRow;
}

export async function findWebSession(sid: string): Promise<WebSessionRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from('web_sessions')
    .select('*')
    .eq('sid', sid)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find web session: ${error.message}`);
  }

  if (!data) return null;

  // Check if expired
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await deleteWebSession(sid);
    return null;
  }

  return data as WebSessionRow;
}

export async function deleteWebSession(sid: string): Promise<void> {
  const db = getDb();
  const { error } = await db.from('web_sessions').delete().eq('sid', sid);
  if (error) {
    throw new Error(`Failed to delete web session: ${error.message}`);
  }
}

export async function pruneExpiredWebSessions(): Promise<number> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('web_sessions')
    .delete()
    .lt('expires_at', now)
    .select('sid');

  if (error) {
    throw new Error(`Failed to prune expired web sessions: ${error.message}`);
  }

  return (data || []).length;
}
