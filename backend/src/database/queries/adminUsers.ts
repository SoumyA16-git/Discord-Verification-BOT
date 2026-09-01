import { getDb } from '../client.js';
import { AdminRole, AdminUserRow } from '../types.js';

export async function findAdminByDiscordId(
  discordId: string,
  guildId?: string
): Promise<AdminUserRow | null> {
  const db = getDb();
  let query = db.from('admin_users').select('*').eq('discord_id', discordId);

  if (guildId) {
    query = query.eq('guild_id', guildId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Failed to find admin by discord_id: ${error.message}`);
  }

  return data as AdminUserRow | null;
}

export async function findAdminById(id: string): Promise<AdminUserRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from('admin_users')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find admin by id: ${error.message}`);
  }

  return data as AdminUserRow | null;
}

export async function upsertAdminUser(params: {
  discordId: string;
  guildId: string;
  role?: AdminRole;
}): Promise<AdminUserRow> {
  const db = getDb();
  const { data, error } = await db
    .from('admin_users')
    .upsert(
      {
        discord_id: params.discordId,
        guild_id: params.guildId,
        role: params.role || 'admin',
      },
      { onConflict: 'discord_id' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert admin user: ${error.message}`);
  }

  return data as AdminUserRow;
}
