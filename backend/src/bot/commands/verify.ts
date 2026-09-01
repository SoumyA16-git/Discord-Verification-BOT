import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { getEnv } from '../../config/env.js';
import { upsertUser } from '../../database/queries/users.js';
import { upsertGuild } from '../../database/queries/guilds.js';
import { getGuildConfig } from '../../database/queries/guildConfig.js';
import { getVerification } from '../../database/queries/verifications.js';
import { createVerificationSession } from '../../database/queries/sessions.js';
import { createAuditLog } from '../../database/queries/auditLogs.js';
import { createSignedSessionToken, generateRandomToken } from '../../utils/crypto.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('verify')
  .setDescription('Start the verification process to gain verified server access.')
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guild || !interaction.member) {
    await interaction.editReply({ content: 'This command can only be used inside a server.' });
    return;
  }

  const env = getEnv();
  const discordUserId = interaction.user.id;
  const discordGuildId = interaction.guild.id;

  try {
    const guild = await upsertGuild(discordGuildId, interaction.guild.name);
    const user = await upsertUser(discordUserId, interaction.user.username);
    if (!user) {
      await interaction.editReply({ content: 'Failed to initialize user session.' });
      return;
    }

    const config = await getGuildConfig(guild.id);
    if (!config || !config.verification_enabled) {
      await interaction.editReply({
        content: 'Verification is currently disabled or not yet configured for this server.',
      });
      return;
    }

    if (!config.verified_role_id) {
      await interaction.editReply({
        content: 'Server verification is misconfigured: No Verified Role is assigned. Please contact an admin.',
      });
      return;
    }

    const existingVerif = await getVerification(user.id, guild.id);
    const member = await interaction.guild.members.fetch(discordUserId).catch(() => null);
    const hasRole = member?.roles.cache.has(config.verified_role_id);

    if (existingVerif && existingVerif.status === 'VERIFIED' && hasRole) {
      await interaction.editReply({
        content: 'You are already verified in this server! You have full access.',
      });
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

    // Point directly to Vercel frontend URL
    const verifyUrl = `${env.FRONTEND_URL}/verify?token=${encodeURIComponent(signedToken)}`;

    const button = new ButtonBuilder()
      .setLabel('Verify with Discord')
      .setStyle(ButtonStyle.Link)
      .setURL(verifyUrl);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    await interaction.editReply({
      content: `${config.verification_message || 'Click the button below to complete verification.'}\n*(Link expires in ${expirationMinutes} minutes)*`,
      components: [row],
    });

    await createAuditLog({
      guildId: guild.id,
      userId: user.id,
      eventType: 'verification_started',
      metadata: { sessionId: session.id, source: 'slash_command' },
    });
  } catch (err) {
    logger.error({ err, discordUserId, discordGuildId }, 'Error executing /verify command');
    await interaction.editReply({
      content: 'An unexpected error occurred while generating your verification link. Please try again.',
    });
  }
}
