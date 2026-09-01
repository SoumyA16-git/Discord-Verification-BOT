import {
  GuildMember,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { upsertUser } from '../../database/queries/users.js';
import { upsertGuild } from '../../database/queries/guilds.js';
import { getGuildConfig } from '../../database/queries/guildConfig.js';
import { createAuditLog } from '../../database/queries/auditLogs.js';
import { logger } from '../../utils/logger.js';

export async function handleGuildMemberAdd(member: GuildMember): Promise<void> {
  if (member.user.bot) return;

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

    const button = new ButtonBuilder()
      .setCustomId(`start_verification_${guild.id}`)
      .setLabel('Verify Account')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
    const messageContent = `Welcome to **${member.guild.name}**!\n${config.verification_message || 'Please click the button below to verify your account.'}`;

    let dmSuccess = false;
    try {
      await member.send({ content: messageContent, components: [row] });
      dmSuccess = true;
    } catch {
      dmSuccess = false;
    }

    await createAuditLog({
      guildId: guild.id,
      userId: user.id,
      eventType: 'verification_started',
      metadata: { source: 'guildMemberAdd_DM', dmSent: dmSuccess },
    });
  } catch (err) {
    logger.error({ err, discordUserId, discordGuildId }, 'Error in guildMemberAdd verification handler');
  }
}
