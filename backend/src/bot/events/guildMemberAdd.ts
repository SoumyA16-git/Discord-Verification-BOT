import {
  GuildMember,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
} from 'discord.js';
import { getEnv } from '../../config/env.js';
import { upsertUser } from '../../database/queries/users.js';
import { upsertGuild } from '../../database/queries/guilds.js';
import { getGuildConfig } from '../../database/queries/guildConfig.js';
import { createVerificationSession } from '../../database/queries/sessions.js';
import { createAuditLog } from '../../database/queries/auditLogs.js';
import { createSignedSessionToken, generateRandomToken } from '../../utils/crypto.js';
import { logger } from '../../utils/logger.js';

export async function handleGuildMemberAdd(member: GuildMember): Promise<void> {
  if (member.user.bot) return;

  const env = getEnv();
  const discordUserId = member.user.id;
  const discordGuildId = member.guild.id;

  logger.info({ discordUserId, discordGuildId }, 'Member joined guild — processing verification gate');

  try {
    const guild = await upsertGuild(discordGuildId, member.guild.name);
    const user = await upsertUser(discordUserId, member.user.username);
    if (!user) return;

    await createAuditLog({
      guildId: guild.id,
      userId: user.id,
      eventType: 'member_joined',
      metadata: { username: member.user.username, tag: member.user.tag },
    });

    const config = await getGuildConfig(guild.id);
    if (!config || !config.verification_enabled || !config.verified_role_id) {
      logger.debug({ discordGuildId }, 'Verification not enabled or unconfigured for guild on member join');
      return;
    }

    if (config.unverified_role_id) {
      await member.roles.add(config.unverified_role_id, 'Assigned unverified role upon joining').catch((err) => {
        logger.warn({ err }, 'Failed to assign unverified role on join');
      });
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
      .setLabel('Verify Account')
      .setStyle(ButtonStyle.Link)
      .setURL(verifyUrl);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
    const messageContent = `Welcome to **${member.guild.name}**!\n${config.verification_message || 'Please click the button below to verify your account.'}\n*(Link valid for ${expirationMinutes} minutes)*`;

    let dmSuccess = false;
    try {
      await member.send({ content: messageContent, components: [row] });
      dmSuccess = true;
    } catch {
      dmSuccess = false;
    }

    if (!dmSuccess && config.verification_channel_id) {
      const channel = await member.guild.channels.fetch(config.verification_channel_id).catch(() => null);
      if (channel && channel.isTextBased()) {
        const textChannel = channel as TextChannel;
        await textChannel.send({
          content: `<@${discordUserId}> Welcome! Your DMs appear closed. Please click the button below to verify:`,
          components: [row],
        }).catch((err) => {
          logger.warn({ err }, 'Failed posting verification prompt in verification channel');
        });
      }
    }

    await createAuditLog({
      guildId: guild.id,
      userId: user.id,
      eventType: 'verification_started',
      metadata: { sessionId: session.id, source: 'guildMemberAdd', dmSent: dmSuccess },
    });
  } catch (err) {
    logger.error({ err, discordUserId, discordGuildId }, 'Error in guildMemberAdd verification handler');
  }
}
