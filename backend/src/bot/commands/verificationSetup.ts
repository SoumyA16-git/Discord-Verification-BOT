import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  GuildMember,
} from 'discord.js';
import { upsertGuild } from '../../database/queries/guilds.js';
import { upsertGuildConfig } from '../../database/queries/guildConfig.js';
import { createAuditLog } from '../../database/queries/auditLogs.js';
import { testGuildPermissions } from '../../services/roleService.js';

export const data = new SlashCommandBuilder()
  .setName('verification-setup')
  .setDescription('Setup and enable OAuth2 member verification for this server.')
  .addRoleOption((option) =>
    option.setName('verified_role').setDescription('The role given to verified members').setRequired(true)
  )
  .addChannelOption((option) =>
    option.setName('channel').setDescription('Channel where verification instructions/button live').setRequired(true)
  )
  .addRoleOption((option) =>
    option.setName('unverified_role').setDescription('Optional role removed upon verification').setRequired(false)
  )
  .addChannelOption((option) =>
    option.setName('log_channel').setDescription('Optional channel for logging verification events').setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const member = interaction.member as GuildMember;
  if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: 'You lack the **Manage Server** permission.', ephemeral: true });
    return;
  }

  const verifiedRole = interaction.options.getRole('verified_role', true);
  const channel = interaction.options.getChannel('channel', true);
  const unverifiedRole = interaction.options.getRole('unverified_role', false);
  const logChannel = interaction.options.getChannel('log_channel', false);

  try {
    const guild = await upsertGuild(interaction.guild!.id, interaction.guild!.name);

    const check = await testGuildPermissions({
      discordGuildId: interaction.guild!.id,
      verifiedRoleId: verifiedRole.id,
      unverifiedRoleId: unverifiedRole?.id,
      channelId: channel.id,
    });

    if (!check.valid) {
      const errorMsg = (check.errors || []).join('\n• ');
      await interaction.reply({
        content: `**Permission Warning:**\n• ${errorMsg}\n\nPlease fix the role hierarchy or bot permissions and try again.`,
        ephemeral: true,
      });
      return;
    }

    await upsertGuildConfig({
      guild_id: guild.id,
      verified_role_id: verifiedRole.id,
      unverified_role_id: unverifiedRole ? unverifiedRole.id : null,
      verification_channel_id: channel.id,
      log_channel_id: logChannel ? logChannel.id : null,
      verification_enabled: true,
    });

    await createAuditLog({
      guildId: guild.id,
      eventType: 'configuration_changed',
      metadata: {
        verified_role_id: verifiedRole.id,
        unverified_role_id: unverifiedRole?.id || null,
        channel_id: channel.id,
        log_channel_id: logChannel?.id || null,
        verification_enabled: true,
        configured_by: interaction.user.id,
      },
    });

    const embed = new EmbedBuilder()
      .setTitle('Verification System Enabled')
      .setColor(0x57f287)
      .setDescription('Discord OAuth2 Member Verification is now configured and active!')
      .addFields(
        { name: 'Verified Role', value: `<@&${verifiedRole.id}>`, inline: true },
        { name: 'Unverified Role', value: unverifiedRole ? `<@&${unverifiedRole.id}>` : 'None', inline: true },
        { name: 'Verification Channel', value: `<#${channel.id}>`, inline: true },
        { name: 'Log Channel', value: logChannel ? `<#${logChannel.id}>` : 'None', inline: true }
      )
      .setFooter({ text: 'Members can verify via DM on join or using /verify.' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    await interaction.reply({ content: 'Failed to configure verification system.', ephemeral: true });
  }
}
