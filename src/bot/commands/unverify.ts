import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
} from 'discord.js';
import { findUserByDiscordId } from '../../database/queries/users.js';
import { findGuildByDiscordId } from '../../database/queries/guilds.js';
import { getGuildConfig } from '../../database/queries/guildConfig.js';
import { markVerificationRevoked } from '../../database/queries/verifications.js';
import { removeVerifiedRole } from '../../services/roleService.js';
import { createAuditLog } from '../../database/queries/auditLogs.js';

export const data = new SlashCommandBuilder()
  .setName('unverify')
  .setDescription('Revoke a member\'s verification status and remove their verified role.')
  .addUserOption((option) =>
    option.setName('user').setDescription('Member to unverify').setRequired(true)
  )
  .addStringOption((option) =>
    option.setName('reason').setDescription('Reason for revocation').setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const member = interaction.member as GuildMember;
  if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) {
    await interaction.reply({ content: 'You lack the **Manage Roles** permission.', ephemeral: true });
    return;
  }

  const targetUser = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason') || 'Revoked by admin';

  try {
    const guild = await findGuildByDiscordId(interaction.guild!.id);
    const user = await findUserByDiscordId(targetUser.id);
    const config = guild ? await getGuildConfig(guild.id) : null;

    if (!guild || !user || !config || !config.verified_role_id) {
      await interaction.reply({
        content: 'Server configuration or member record incomplete.',
        ephemeral: true,
      });
      return;
    }

    // Remove role in Discord
    const roleResult = await removeVerifiedRole({
      discordGuildId: interaction.guild!.id,
      discordUserId: targetUser.id,
      verifiedRoleId: config.verified_role_id,
      unverifiedRoleId: config.unverified_role_id,
    });

    if (!roleResult.success) {
      await interaction.reply({
        content: `Failed to remove role from member: ${roleResult.error}`,
        ephemeral: true,
      });
      return;
    }

    // Update DB status to REVOKED
    await markVerificationRevoked({ userId: user.id, guildId: guild.id });

    await createAuditLog({
      guildId: guild.id,
      userId: user.id,
      eventType: 'verification_revoked',
      metadata: { target_discord_id: targetUser.id, admin_discord_id: interaction.user.id, reason },
    });

    await interaction.reply({
      content: `Successfully revoked verification for **${targetUser.username}**. Verified role has been removed.`,
      ephemeral: true,
    });
  } catch (err) {
    await interaction.reply({ content: 'An error occurred while un-verifying the user.', ephemeral: true });
  }
}
