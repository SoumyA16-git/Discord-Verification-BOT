import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { getEnv } from '../../config/env.js';
import { upsertUser } from '../../database/queries/users.js';
import { upsertGuild } from '../../database/queries/guilds.js';
import { getGuildConfig } from '../../database/queries/guildConfig.js';
import { createVerificationSession } from '../../database/queries/sessions.js';
import { createAuditLog } from '../../database/queries/auditLogs.js';
import { createSignedSessionToken, generateRandomToken } from '../../utils/crypto.js';

export const data = new SlashCommandBuilder()
  .setName('verify-user')
  .setDescription('Force a member into a new verification session and DM them a link.')
  .addUserOption((option) =>
    option.setName('user').setDescription('Target member to force reverification').setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const member = interaction.member as GuildMember;
  if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) {
    await interaction.reply({ content: 'You lack the **Manage Roles** permission to run this command.', ephemeral: true });
    return;
  }

  const targetUser = interaction.options.getUser('user', true);
  const env = getEnv();

  try {
    const guild = await upsertGuild(interaction.guild!.id, interaction.guild!.name);
    const user = await upsertUser(targetUser.id, targetUser.username);
    const config = await getGuildConfig(guild.id);

    if (!user || !config) {
      await interaction.reply({ content: 'Server configuration or user record not initialized.', ephemeral: true });
      return;
    }

    const oauthState = generateRandomToken(32);
    const expirationMinutes = config.session_expiration_minutes || 15;
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
    const signedToken = createSignedSessionToken(user.id, guild.id, expiresAt, env.TOKEN_SIGNING_SECRET);

    const session = await createVerificationSession({
      userId: user.id,
      guildId: guild.id,
      oauthState,
      signedToken,
      expiresAt,
    });

    const verifyUrl = `${env.APP_URL}/verify?token=${encodeURIComponent(signedToken)}`;

    // Attempt to DM the target user
    let dmSent = false;
    try {
      const button = new ButtonBuilder().setLabel('Verify Account').setStyle(ButtonStyle.Link).setURL(verifyUrl);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      await targetUser.send({
        content: `An administrator in **${interaction.guild!.name}** has requested that you verify your account.\nClick the button below to complete verification within ${expirationMinutes} minutes.`,
        components: [row],
      });
      dmSent = true;
    } catch {
      dmSent = false;
    }

    await createAuditLog({
      guildId: guild.id,
      userId: user.id,
      eventType: 'admin_force_reverify',
      metadata: { target_discord_id: targetUser.id, triggered_by: interaction.user.id, dmSent },
    });

    if (dmSent) {
      await interaction.reply({
        content: `A new verification link has been generated and sent via DM to **${targetUser.username}**.`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `Verification session created for **${targetUser.username}**, but their DMs are closed.\nDirect Link: <${verifyUrl}>`,
        ephemeral: true,
      });
    }
  } catch (err) {
    await interaction.reply({ content: 'Failed to create reverification session.', ephemeral: true });
  }
}
