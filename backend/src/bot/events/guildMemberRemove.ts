import { GuildMember, PartialGuildMember } from 'discord.js';
import { findUserByDiscordId } from '../../database/queries/users.js';
import { findGuildByDiscordId } from '../../database/queries/guilds.js';
import { createAuditLog } from '../../database/queries/auditLogs.js';
import { logger } from '../../utils/logger.js';

export async function handleGuildMemberRemove(member: GuildMember | PartialGuildMember): Promise<void> {
  if (member.user?.bot) return;

  try {
    const guild = await findGuildByDiscordId(member.guild.id);
    const user = member.user ? await findUserByDiscordId(member.user.id) : null;

    if (guild) {
      await createAuditLog({
        guildId: guild.id,
        userId: user?.id || null,
        eventType: 'member_left',
        metadata: {
          discord_user_id: member.user?.id,
          username: member.user?.username,
        },
      });
    }

    logger.info({ discordGuildId: member.guild.id, discordUserId: member.user?.id }, 'Member left server — logged audit record');
  } catch (err) {
    logger.warn({ err }, 'Error in guildMemberRemove handler');
  }
}
