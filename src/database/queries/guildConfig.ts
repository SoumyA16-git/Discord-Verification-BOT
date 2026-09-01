import { getDb } from '../client.js';
import { GuildConfigRow } from '../types.js';

export async function getGuildConfig(guildId: string): Promise<GuildConfigRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from('guild_config')
    .select('*')
    .eq('guild_id', guildId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get guild config: ${error.message}`);
  }

  return data as GuildConfigRow | null;
}

export async function upsertGuildConfig(
  config: Partial<GuildConfigRow> & { guild_id: string }
): Promise<GuildConfigRow> {
  const db = getDb();
  const payload = {
    ...config,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from('guild_config')
    .upsert(payload, { onConflict: 'guild_id' })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert guild config: ${error.message}`);
  }

  return data as GuildConfigRow;
}

export async function updateGuildConfig(
  guildId: string,
  updates: Partial<Omit<GuildConfigRow, 'guild_id'>>
): Promise<GuildConfigRow> {
  const db = getDb();
  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from('guild_config')
    .update(payload)
    .eq('guild_id', guildId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update guild config: ${error.message}`);
  }

  return data as GuildConfigRow;
}
