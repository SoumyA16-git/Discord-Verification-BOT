import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { logger } from '../utils/logger.js';

let discordClient: Client | null = null;

export function getDiscordClient(): Client {
  if (!discordClient) {
    discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.User],
    });

    discordClient.on('error', (err) => {
      logger.error({ err }, 'Discord client error event');
    });

    discordClient.on('warn', (warning) => {
      logger.warn({ warning }, 'Discord client warning event');
    });

    discordClient.on('shardDisconnect', (event, shardId) => {
      logger.warn({ event, shardId }, 'Discord client shard disconnected');
    });

    discordClient.on('shardReconnecting', (shardId) => {
      logger.info({ shardId }, 'Discord client shard reconnecting');
    });

    discordClient.on('shardResume', (shardId, replayedEvents) => {
      logger.info({ shardId, replayedEvents }, 'Discord client shard resumed');
    });
  }

  return discordClient;
}
