import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  GuildMember,
} from 'discord.js';
import { findUserByDiscordId } from '../../database/queries/users.js';
import { findGuildByDiscordId } from '../../database/queries/guilds.js';
import { getVerification } from '../../database/queries/verifications.js';
import { createAuditLog } from '../../database/queries/auditLogs.js';
import { getDb } from '../../database/client.js';

export const data = new SlashCommandBuilder()
  .setName('verify-status')
  .setDescription('Check your current verification status or inspect a member (Admin).')
  .addUserOption((option) =>
    option.setName('user').setDescription('Target member to inspect (Admin only)').setRequired(false)
  )
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  const targetUser = interaction.options.getUser('user') || interaction.user;
  const isCheckingOther = targetUser.id !== interaction.user.id;

  // If checking someone else, check ManageRoles permission
  if (isCheckingOther) {
    const member = interaction.member as GuildMember;
    if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.reply({
        content: 'You need the **Manage Roles** permission to check other members\' verification status.',
        ephemeral: true,
      });
      return;
    }
  }

  try {
    const guild = await findGuildByDiscordId(interaction.guild.id);
    const user = await findUserByDiscordId(targetUser.id);

    if (!guild || !user) {
      await interaction.reply({
        content: `No verification record found for **${targetUser.username}**.`,
        ephemeral: true,
      });
      return;
    }

    const verification = await getVerification(user.id, guild.id);
    const db = getDb();
    const { count: attemptCount } = await db
      .from('verification_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('guild_id', guild.id);

    const embed = new EmbedBuilder()
      .setTitle(`Verification Standing: ${targetUser.username}`)
      .setColor(verification && verification.status === 'VERIFIED' ? 0x57f287 : 0xfee75c)
      .addFields(
        { name: 'Status', value: verification ? verification.status : 'UNVERIFIED', inline: true },
        {
          name: 'Role Confirmed',
          value: verification && verification.role_assigned ? 'Yes' : 'No',
          inline: true,
        },
        {
          name: 'Attempts Logged',
          value: `${attemptCount || 0}`,
          inline: true,
        },
        {
          name: 'Verified At',
          value: verification && verification.verified_at ? `<t:${Math.floor(new Date(verification.verified_at).getTime() / 1000)}:R>` : 'Never',
          inline: false,
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

    await createAuditLog({
      guildId: guild.id,
      userId: user.id,
      eventType: 'status_checked',
      metadata: { target_discord_id: targetUser.id, checked_by: interaction.user.id },
    });
  } catch (err) {
    await interaction.reply({ content: 'Failed to retrieve verification status.', ephemeral: true });
  }
}
