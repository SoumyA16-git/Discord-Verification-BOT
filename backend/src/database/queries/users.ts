import { getDb } from '../client.js';
import { UserRow } from '../types.js';

export async function upsertUser(discordId: string, username?: string | null): Promise<UserRow | null> {
  const db = getDb();
  const updatePayload: { discord_id: string; username?: string | null; updated_at: string } = {
    discord_id: discordId,
    updated_at: new Date().toISOString(),
  };

  if (username !== undefined) {
    updatePayload.username = username;
  }

  const { data, error } = await db
    .from('users')
    .upsert(updatePayload, { onConflict: 'discord_id' })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert user: ${error.message}`);
  }

  return data as UserRow;
}

export async function findUserByDiscordId(discordId: string): Promise<UserRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find user by discord_id: ${error.message}`);
  }

  return data as UserRow | null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find user by id: ${error.message}`);
  }

  return data as UserRow | null;
}
