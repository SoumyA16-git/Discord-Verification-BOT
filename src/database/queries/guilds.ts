import { getDb } from '../client.js';
import { GuildRow } from '../types.js';

export async function upsertGuild(discordGuildId: string, name?: string | null): Promise<GuildRow> {
  const db = getDb();
  const payload: { discord_guild_id: string; name?: string | null } = {
    discord_guild_id: discordGuildId,
  };

  if (name !== undefined) {
    payload.name = name;
  }

  const { data, error } = await db
    .from('guilds')
    .upsert(payload, { onConflict: 'discord_guild_id' })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert guild: ${error.message}`);
  }

  return data as GuildRow;
}

export async function findGuildByDiscordId(discordGuildId: string): Promise<GuildRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from('guilds')
    .select('*')
    .eq('discord_guild_id', discordGuildId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find guild by discord_guild_id: ${error.message}`);
  }

  return data as GuildRow | null;
}

export async function findGuildById(id: string): Promise<GuildRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from('guilds')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find guild by id: ${error.message}`);
  }

  return data as GuildRow | null;
}
