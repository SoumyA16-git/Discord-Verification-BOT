import { Guild, PermissionFlagsBits, ChannelType } from 'discord.js';
import { upsertGuildConfig } from '../../database/queries/guildConfig.js';
import { logger } from '../../utils/logger.js';

export interface ProvisionResult {
  verifiedRoleId: string;
  unverifiedRoleId?: string;
  channelId?: string;
  success: boolean;
  warning?: string;
}

/**
 * Automatically provisions Verified and Unverified roles,
 * positions them correctly below Admin/Mod roles, and configures
 * the verification channel.
 */
export async function autoProvisionServerRoles(guild: Guild, dbGuildId: string): Promise<ProvisionResult> {
  logger.info({ guildId: guild.id, name: guild.name }, 'Starting automatic server role & gate orchestration');

  try {
    const me = guild.members.me;
    if (!me) {
      logger.warn({ guildId: guild.id }, 'Bot member not found in guild');
      return { verifiedRoleId: '', success: false };
    }

    // 1. Fetch live guild roles & channels
    await guild.roles.fetch();
    await guild.channels.fetch();

    // 2. Find or Create "Verified" Role
    let verifiedRole = guild.roles.cache.find(
      (r) => r.name.toLowerCase() === 'verified' && !r.managed
    );

    if (!verifiedRole) {
      logger.info({ guildId: guild.id }, 'Creating "Verified" role');
      verifiedRole = await guild.roles.create({
        name: 'Verified',
        color: 0x22c55e, // Emerald Green
        reason: 'Auto-provisioned by 911 - Verification BOT',
        permissions: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AddReactions,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
        ],
      });
    }

    // 3. Find or Create "Unverified" Role
    let unverifiedRole = guild.roles.cache.find(
      (r) => (r.name.toLowerCase() === 'unverified' || r.name.toLowerCase() === 'guest') && !r.managed
    );

    if (!unverifiedRole) {
      logger.info({ guildId: guild.id }, 'Creating "Unverified" role');
      unverifiedRole = await guild.roles.create({
        name: 'Unverified',
        color: 0x64748b, // Slate Grey
        reason: 'Auto-provisioned by 911 - Verification BOT',
        permissions: [],
      });
    }

    // 4. Calculate Hierarchy:
    // Bot should place Verified & Unverified roles right below the highest position bot can manage
    const botHighestRole = me.roles.highest;
    const targetPosition = Math.max(1, botHighestRole.position - 1);

    let hierarchyWarning: string | undefined = undefined;

    try {
      if (verifiedRole.position < targetPosition && botHighestRole.position > verifiedRole.position) {
        await guild.roles.setPositions([
          { role: verifiedRole.id, position: targetPosition },
          { role: unverifiedRole.id, position: Math.max(1, targetPosition - 1) },
        ]);
        logger.info(
          { guildId: guild.id, verifiedRolePos: targetPosition },
          'Successfully auto-organized verification roles below Admin/Bot roles'
        );
      }
    } catch (posErr) {
      logger.warn({ posErr, guildId: guild.id }, 'Role position auto-adjustment skipped due to hierarchy bounds');
      hierarchyWarning = "The bot couldn't move the Verified/Unverified roles to the top. Please manually drag the bot's highest role above the Verified role in Server Settings -> Roles.";
    }

    // 5. Find or Create "#verification" Channel
    let verifyChannel = guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildText &&
        (c.name.toLowerCase().includes('verif') || c.name.toLowerCase().includes('verify'))
    );

    if (!verifyChannel) {
      logger.info({ guildId: guild.id }, 'Creating "#verification" gate channel');
      verifyChannel = await guild.channels.create({
        name: 'verification',
        type: ChannelType.GuildText,
        reason: 'Auto-provisioned verification channel by 911 - Verification BOT',
        permissionOverwrites: [
          {
            id: guild.id, // @everyone
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
            deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions],
          },
          {
            id: verifiedRole.id,
            deny: [PermissionFlagsBits.ViewChannel], // Hide once verified
          },
          {
            id: me.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.EmbedLinks,
              PermissionFlagsBits.ManageMessages,
            ],
          },
        ],
      });
    }

    // 6. Automatically save configuration to Database
    await upsertGuildConfig({
      guild_id: dbGuildId,
      verified_role_id: verifiedRole.id,
      unverified_role_id: unverifiedRole.id,
      verification_channel_id: verifyChannel.id,
      verification_enabled: true,
      verification_message:
        'Welcome to the server! To prevent automated spam and unlock all channels, please complete verification by clicking the button below.',
    });

    logger.info(
      { guildId: guild.id, verifiedRoleId: verifiedRole.id, channelId: verifyChannel.id },
      'Auto-provisioning completed successfully'
    );

    return {
      verifiedRoleId: verifiedRole.id,
      unverifiedRoleId: unverifiedRole.id,
      channelId: verifyChannel.id,
      success: true,
      warning: hierarchyWarning,
    };
  } catch (err) {
    logger.error({ err, guildId: dbGuildId }, 'Auto-provisioning failed entirely');
    return { verifiedRoleId: '', success: false };
  }
}
