import { GuildMember, PartialGuildMember } from 'discord.js';
import { findUserByDiscordId } from '../../database/queries/users.js';
import { findGuildByDiscordId } from '../../database/queries/guilds.js';
import { createAuditLog } from '../../database/queries/auditLogs.js';
import { deleteVerification } from '../../database/queries/verifications.js';
import { logger } from '../../utils/logger.js';

export async function handleGuildMemberRemove(member: GuildMember | PartialGuildMember): Promise<void> {
  if (member.user?.bot) return;

  try {
    const guild = await findGuildByDiscordId(member.guild.id);
    const user = member.user ? await findUserByDiscordId(member.user.id) : null;

    if (guild && user) {
      await createAuditLog({
        guildId: guild.id,
        userId: user.id,
        eventType: 'member_left',
        metadata: {
          discord_user_id: member.user?.id,
          username: member.user?.username,
        },
      });

      // Delete the verification record so they must re-verify if they join again
      await deleteVerification(user.id, guild.id).catch((err) => {
        logger.error({ err, userId: user.id, guildId: guild.id }, 'Failed to delete verification on leave');
      });
    }

    logger.info({ discordGuildId: member.guild.id, discordUserId: member.user?.id }, 'Member left server — logged audit record and deleted verification');
  } catch (err) {
    logger.warn({ err }, 'Error in guildMemberRemove handler');
  }
}
