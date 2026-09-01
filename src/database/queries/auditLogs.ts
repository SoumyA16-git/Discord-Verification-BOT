import { getDb } from '../client.js';
import { AuditEventType, AuditLogRow } from '../types.js';

export async function createAuditLog(params: {
  guildId?: string | null;
  userId?: string | null;
  adminId?: string | null;
  eventType: AuditEventType;
  metadata?: Record<string, unknown>;
}): Promise<AuditLogRow> {
  const db = getDb();
  const { data, error } = await db
    .from('audit_logs')
    .insert({
      guild_id: params.guildId || null,
      user_id: params.userId || null,
      admin_id: params.adminId || null,
      event_type: params.eventType,
      metadata: params.metadata || {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create audit log: ${error.message}`);
  }

  return data as AuditLogRow;
}

export async function getGuildAuditLogs(params: {
  guildId: string;
  limit?: number;
  offset?: number;
  eventType?: AuditEventType;
}): Promise<{ logs: AuditLogRow[]; total: number }> {
  const db = getDb();
  const limit = params.limit || 50;
  const offset = params.offset || 0;

  let query = db
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .eq('guild_id', params.guildId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.eventType) {
    query = query.eq('event_type', params.eventType);
  }

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`);
  }

  return {
    logs: (data || []) as AuditLogRow[],
    total: count || 0,
  };
}

export async function pruneOldAuditLogs(days: number = 180): Promise<number> {
  const db = getDb();
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from('audit_logs')
    .delete()
    .lt('created_at', threshold)
    .select('id');

  if (error) {
    throw new Error(`Failed to prune old audit logs: ${error.message}`);
  }

  return (data || []).length;
}
