import { Interaction, ChatInputCommandInteraction } from 'discord.js';
import * as verifyCommand from '../commands/verify.js';
import * as verifyStatusCommand from '../commands/verifyStatus.js';
import * as verifyUserCommand from '../commands/verifyUser.js';
import * as unverifyCommand from '../commands/unverify.js';
import * as verificationSetupCommand from '../commands/verificationSetup.js';
import * as verificationConfigCommand from '../commands/verificationConfig.js';
import * as verificationStatsCommand from '../commands/verificationStats.js';
import { logger } from '../../utils/logger.js';

export const commands = [
  verifyCommand,
  verifyStatusCommand,
  verifyUserCommand,
  unverifyCommand,
  verificationSetupCommand,
  verificationConfigCommand,
  verificationStatsCommand,
];

const commandMap = new Map<string, { execute: (i: ChatInputCommandInteraction) => Promise<void> }>();
for (const cmd of commands) {
  commandMap.set(cmd.data.name, cmd);
}

export async function handleInteraction(interaction: Interaction): Promise<void> {
  if (interaction.isButton()) {
    if (interaction.customId === 'start_verification' || interaction.customId.startsWith('start_verification_')) {
      try {
        let guildIdOverride: string | undefined = undefined;
        if (interaction.customId.startsWith('start_verification_')) {
          guildIdOverride = interaction.customId.split('start_verification_')[1];
        }
        await verifyCommand.execute(interaction, guildIdOverride);
      } catch (err) {
        logger.error({ err }, 'Error handling persistent verify button click');
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: 'An error occurred.', ephemeral: true }).catch(() => {});
        } else {
          await interaction.reply({ content: 'An error occurred.', ephemeral: true }).catch(() => {});
        }
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = commandMap.get(interaction.commandName);
  if (!command) {
    logger.warn({ commandName: interaction.commandName }, 'Received unknown command interaction');
    return;
  }

  try {
    await command.execute(interaction);
  } catch (err) {
    logger.error({ err, commandName: interaction.commandName }, 'Error handling slash command interaction');
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'An unexpected error occurred executing this command.', ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: 'An unexpected error occurred executing this command.', ephemeral: true }).catch(() => {});
    }
  }
}
