import { Guild, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { upsertGuild } from '../../database/queries/guilds.js';
import { bootstrapInitialAdmin } from '../../auth/adminAuth.js';
import { autoProvisionServerRoles } from '../services/roleOrchestrator.js';
import { getEnv } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export async function handleGuildCreate(guild: Guild): Promise<void> {
  logger.info({ guildId: guild.id, name: guild.name }, 'Bot joined a new Discord guild');

  try {
    const dbGuild = await upsertGuild(guild.id, guild.name);
    await bootstrapInitialAdmin(dbGuild.id);

    // Automatically provision Verified/Unverified roles, hierarchy positions, and #verification channel
    await autoProvisionServerRoles(guild, dbGuild.id);

    // Send welcome DM to the server owner with admin dashboard link
    await sendOwnerWelcomeDm(guild, dbGuild.id);
  } catch (err) {
    logger.error({ err, guildId: guild.id }, 'Error initializing config on guildCreate');
  }
}

async function sendOwnerWelcomeDm(guild: Guild, internalGuildId: string): Promise<void> {
  const env = getEnv();
  try {
    const owner = await guild.fetchOwner();
    if (!owner || owner.user.bot) return;

    const dashboardUrl = `${env.FRONTEND_URL}/admin/config?guildId=${internalGuildId}`;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('911 - Verification BOT has been added to your server!')
      .setDescription(
        `Thanks for adding the bot to **${guild.name}**!\n\n` +
        `Your server has been automatically provisioned with:\n` +
        `- **@Verified** and **@Unverified** roles\n` +
        `- **#verification** channel\n\n` +
        `**Important:** Make sure the bot's role is at the **very top** of your role list in Server Settings, otherwise it cannot assign roles.\n\n` +
        `Use the button below to open the Admin Dashboard and complete your setup.`
      )
      .setThumbnail(guild.client.user?.displayAvatarURL() || null)
      .setFooter({ text: '911 - Verification BOT' })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Open Admin Dashboard')
        .setStyle(ButtonStyle.Link)
        .setURL(dashboardUrl)
        .setEmoji('🛡️')
    );

    await owner.send({ embeds: [embed], components: [row] });
    logger.info({ guildId: guild.id, ownerId: owner.id }, 'Sent welcome DM to server owner');
  } catch (err) {
    // Non-fatal: owner may have DMs disabled
    logger.warn({ err, guildId: guild.id }, 'Could not send welcome DM to server owner (DMs may be disabled)');
  }
}
