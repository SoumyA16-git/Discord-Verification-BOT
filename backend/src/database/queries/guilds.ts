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

export async function findGuildByIdOrDiscordId(idOrDiscordId: string): Promise<GuildRow | null> {
  if (!idOrDiscordId || idOrDiscordId === 'undefined' || idOrDiscordId === 'null') return null;
  const db = getDb();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrDiscordId);
  if (isUuid) {
    const { data } = await db.from('guilds').select('*').eq('id', idOrDiscordId).maybeSingle();
    if (data) return data as GuildRow;
  }
  const { data } = await db.from('guilds').select('*').eq('discord_guild_id', idOrDiscordId).maybeSingle();
  return (data as GuildRow) || null;
}

