import { Guild, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
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

    const verifyChannelOverwrites = [
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
    ];

    if (!verifyChannel) {
      logger.info({ guildId: guild.id }, 'Creating "#verification" gate channel');
      verifyChannel = await guild.channels.create({
        name: 'verification',
        type: ChannelType.GuildText,
        reason: 'Auto-provisioned verification channel by 911 - Verification BOT',
        permissionOverwrites: verifyChannelOverwrites,
      });
    } else {
      logger.info({ guildId: guild.id }, 'Updating permissions for existing "#verification" channel');
      await (verifyChannel as TextChannel).permissionOverwrites.set(verifyChannelOverwrites, 'Enforcing verification gate permissions');
    }

    // 5.5 Disable ViewChannel for @everyone role so other channels are hidden by default
    try {
      const everyoneRole = guild.roles.everyone;
      if (everyoneRole.permissions.has(PermissionFlagsBits.ViewChannel)) {
        logger.info({ guildId: guild.id }, 'Disabling ViewChannel for @everyone role (Server Lockdown)');
        const newPermissions = everyoneRole.permissions.remove(PermissionFlagsBits.ViewChannel);
        await everyoneRole.setPermissions(newPermissions, 'Auto-provisioned server lockdown by 911 - Verification BOT');
      }
    } catch (err) {
      logger.warn({ err, guildId: guild.id }, 'Failed to disable ViewChannel for @everyone role. Missing ManageRoles permission or bot role is not high enough.');
      if (!hierarchyWarning) hierarchyWarning = "Failed to lock down channels. Please manually turn off 'View Channels' for the @everyone role in Server Settings.";
    }

    // 5.8 Post persistent verification button to the channel
    try {
      if (verifyChannel && verifyChannel.isTextBased()) {
        const textChannel = verifyChannel as import('discord.js').TextChannel;
        // Check if there's already a message to avoid spamming on re-setup
        const messages = await textChannel.messages.fetch({ limit: 1 }).catch(() => null);
        if (!messages || messages.size === 0) {

          const embed = new EmbedBuilder()
            .setTitle('Server Verification')
            .setColor(0x5865F2)
            .setDescription('To gain full access to the server, you must verify your account.\n\nClick the button below to receive your unique verification link securely in this channel.')
            .setFooter({ text: 'Powered by 911 - Verification BOT' });
          
          const button = new ButtonBuilder()
            .setCustomId('start_verification')
            .setLabel('Verify Account')
            .setStyle(ButtonStyle.Primary);
            
          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
          
          await textChannel.send({ embeds: [embed], components: [row] });
          logger.info({ guildId: guild.id }, 'Posted persistent verification button to channel');
        }
      }
    } catch (err) {
      logger.warn({ err, guildId: guild.id }, 'Failed to post persistent verification button');
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
