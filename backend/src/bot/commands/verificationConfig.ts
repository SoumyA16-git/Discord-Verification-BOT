import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  GuildMember,
} from 'discord.js';
import { findGuildByDiscordId } from '../../database/queries/guilds.js';
import { getGuildConfig, updateGuildConfig } from '../../database/queries/guildConfig.js';
import { createAuditLog } from '../../database/queries/auditLogs.js';

export const data = new SlashCommandBuilder()
  .setName('verification-config')
  .setDescription('View or update verification settings for this server.')
  .addBooleanOption((option) =>
    option.setName('enabled').setDescription('Enable or disable the verification gate').setRequired(false)
  )
  .addRoleOption((option) =>
    option.setName('verified_role').setDescription('Update the verified role').setRequired(false)
  )
  .addRoleOption((option) =>
    option.setName('unverified_role').setDescription('Update the unverified role').setRequired(false)
  )
  .addChannelOption((option) =>
    option.setName('channel').setDescription('Update the verification channel').setRequired(false)
  )
  .addChannelOption((option) =>
    option.setName('log_channel').setDescription('Update the log channel').setRequired(false)
  )
  .addIntegerOption((option) =>
    option.setName('expiration_minutes').setDescription('Session TTL in minutes (default 15)').setMinValue(1).setMaxValue(1440).setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const member = interaction.member as GuildMember;
  if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: 'You lack the **Manage Server** permission.', ephemeral: true });
    return;
  }

  try {
    const guild = await findGuildByDiscordId(interaction.guild!.id);
    if (!guild) {
      await interaction.reply({ content: 'Server not registered. Please run `/verification-setup` first.', ephemeral: true });
      return;
    }

    const currentConfig = await getGuildConfig(guild.id);
    if (!currentConfig) {
      await interaction.reply({ content: 'Configuration not found. Please run `/verification-setup` first.', ephemeral: true });
      return;
    }

    const enabled = interaction.options.getBoolean('enabled');
    const verifiedRole = interaction.options.getRole('verified_role');
    const unverifiedRole = interaction.options.getRole('unverified_role');
    const channel = interaction.options.getChannel('channel');
    const logChannel = interaction.options.getChannel('log_channel');
    const expiration = interaction.options.getInteger('expiration_minutes');

    const updates: Record<string, unknown> = {};
    if (enabled !== null) updates.verification_enabled = enabled;
    if (verifiedRole) updates.verified_role_id = verifiedRole.id;
    if (unverifiedRole) updates.unverified_role_id = unverifiedRole.id;
    if (channel) updates.verification_channel_id = channel.id;
    if (logChannel) updates.log_channel_id = logChannel.id;
    if (expiration !== null) updates.session_expiration_minutes = expiration;

    let updatedConfig = currentConfig;
    if (Object.keys(updates).length > 0) {
      updatedConfig = await updateGuildConfig(guild.id, updates);
      await createAuditLog({
        guildId: guild.id,
        eventType: 'configuration_changed',
        metadata: { updates, updated_by: interaction.user.id },
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('Verification Configuration')
      .setColor(updatedConfig.verification_enabled ? 0x57f287 : 0xfee75c)
      .addFields(
        { name: 'Status', value: updatedConfig.verification_enabled ? 'Active' : 'Disabled', inline: true },
        { name: 'Verified Role', value: updatedConfig.verified_role_id ? `<@&${updatedConfig.verified_role_id}>` : 'Not Set', inline: true },
        { name: 'Unverified Role', value: updatedConfig.unverified_role_id ? `<@&${updatedConfig.unverified_role_id}>` : 'None', inline: true },
        { name: 'Verification Channel', value: updatedConfig.verification_channel_id ? `<#${updatedConfig.verification_channel_id}>` : 'Not Set', inline: true },
        { name: 'Log Channel', value: updatedConfig.log_channel_id ? `<#${updatedConfig.log_channel_id}>` : 'None', inline: true },
        { name: 'Session TTL', value: `${updatedConfig.session_expiration_minutes} minutes`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (err) {
    await interaction.reply({ content: 'Failed to update configuration.', ephemeral: true });
  }
}
