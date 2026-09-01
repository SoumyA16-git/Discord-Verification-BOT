import { Client } from 'discord.js';
import { getEnv } from '../../config/env.js';
import { commands, handleInteraction } from './interactionCreate.js';
import { handleGuildMemberAdd } from './guildMemberAdd.js';
import { handleGuildMemberRemove } from './guildMemberRemove.js';
import { handleGuildCreate } from './guildCreate.js';
import { startReconciliationScheduler } from '../reconciliation.js';
import { logger } from '../../utils/logger.js';

export async function handleReady(client: Client): Promise<void> {
  const env = getEnv();
  logger.info(
    { tag: client.user?.tag, id: client.user?.id, guildsCount: client.guilds.cache.size },
    'Discord bot gateway connected and ready'
  );

  // Register command payloads
  const commandData = commands.map((c) => c.data.toJSON());

  try {
    if (env.DEV_GUILD_ID) {
      logger.info({ devGuildId: env.DEV_GUILD_ID }, 'Deploying slash commands to dev guild for fast iteration');
      const guild = await client.guilds.fetch(env.DEV_GUILD_ID).catch(() => null);
      if (guild) {
        await guild.commands.set(commandData);
        logger.info('Guild-scoped slash commands registered successfully');
      } else {
        logger.warn({ devGuildId: env.DEV_GUILD_ID }, 'DEV_GUILD_ID provided but guild not found in bot cache');
      }
    } else {
      logger.info('Deploying slash commands globally to Discord application');
      await client.application?.commands.set(commandData);
      logger.info('Global slash commands registered successfully');
    }
  } catch (err) {
    logger.error({ err }, 'Failed deploying slash commands on ready');
  }

  // Register bot event handlers
  client.on('guildMemberAdd', (member) => {
    handleGuildMemberAdd(member).catch((err) => {
      logger.error({ err }, 'Error in guildMemberAdd event');
    });
  });

  client.on('guildMemberRemove', (member) => {
    handleGuildMemberRemove(member).catch((err) => {
      logger.error({ err }, 'Error in guildMemberRemove event');
    });
  });

  client.on('guildCreate', (guild) => {
    handleGuildCreate(guild).catch((err) => {
      logger.error({ err }, 'Error in guildCreate event');
    });
  });

  client.on('interactionCreate', (interaction) => {
    handleInteraction(interaction).catch((err) => {
      logger.error({ err }, 'Error in interactionCreate event');
    });
  });

  // Start background reconciliation
  startReconciliationScheduler(30);
}
