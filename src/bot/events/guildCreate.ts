import { Guild } from 'discord.js';
import { upsertGuild } from '../../database/queries/guilds.js';
import { upsertGuildConfig } from '../../database/queries/guildConfig.js';
import { bootstrapInitialAdmin } from '../../auth/adminAuth.js';
import { logger } from '../../utils/logger.js';

export async function handleGuildCreate(guild: Guild): Promise<void> {
  logger.info({ guildId: guild.id, name: guild.name }, 'Bot joined a new Discord guild');

  try {
    const dbGuild = await upsertGuild(guild.id, guild.name);
    await upsertGuildConfig({
      guild_id: dbGuild.id,
      verification_enabled: false,
      session_expiration_minutes: 15,
      rate_limit_attempts: 5,
      rate_limit_window_minutes: 10,
    });

    await bootstrapInitialAdmin(dbGuild.id);
  } catch (err) {
    logger.error({ err, guildId: guild.id }, 'Error initializing config on guildCreate');
  }
}
