import { Guild } from 'discord.js';
import { upsertGuild } from '../../database/queries/guilds.js';
import { bootstrapInitialAdmin } from '../../auth/adminAuth.js';
import { autoProvisionServerRoles } from '../services/roleOrchestrator.js';
import { logger } from '../../utils/logger.js';

export async function handleGuildCreate(guild: Guild): Promise<void> {
  logger.info({ guildId: guild.id, name: guild.name }, 'Bot joined a new Discord guild');

  try {
    const dbGuild = await upsertGuild(guild.id, guild.name);
    await bootstrapInitialAdmin(dbGuild.id);

    // Automatically provision Verified/Unverified roles, hierarchy positions, and #verification channel
    await autoProvisionServerRoles(guild, dbGuild.id);
  } catch (err) {
    logger.error({ err, guildId: guild.id }, 'Error initializing config on guildCreate');
  }
}
