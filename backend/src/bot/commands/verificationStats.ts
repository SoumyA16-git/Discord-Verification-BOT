import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  GuildMember,
} from 'discord.js';
import { findGuildByDiscordId } from '../../database/queries/guilds.js';
import { getGuildAttemptStats } from '../../database/queries/attempts.js';
import { getDb } from '../../database/client.js';
import { createAuditLog } from '../../database/queries/auditLogs.js';

export const data = new SlashCommandBuilder()
  .setName('verification-stats')
  .setDescription('View verification statistics and success metrics.')
  .addIntegerOption((option) =>
    option.setName('days').setDescription('Timeframe in days (default 30)').setMinValue(1).setMaxValue(180).setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const member = interaction.member as GuildMember;
  if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: 'You lack the **Manage Server** permission.', ephemeral: true });
    return;
  }

  const days = interaction.options.getInteger('days') || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const guild = await findGuildByDiscordId(interaction.guild!.id);
    if (!guild) {
      await interaction.reply({ content: 'No server records found.', ephemeral: true });
      return;
    }

    const stats = await getGuildAttemptStats(guild.id, since);
    const db = getDb();

    const { count: verifiedCount } = await db
      .from('verifications')
      .select('*', { count: 'exact', head: true })
      .eq('guild_id', guild.id)
      .eq('status', 'VERIFIED');

    const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 100;

    const embed = new EmbedBuilder()
      .setTitle(`Verification Stats (Last ${days} Days)`)
      .setColor(0x5865f2)
      .addFields(
        { name: 'Total Verified Members', value: `${verifiedCount || 0}`, inline: true },
        { name: 'Total Attempts', value: `${stats.total}`, inline: true },
        { name: 'Success Rate', value: `${successRate}%`, inline: true },
        { name: 'Successful Verifications', value: `${stats.success}`, inline: true },
        { name: 'Failed Attempts', value: `${stats.failure}`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

    await createAuditLog({
      guildId: guild.id,
      eventType: 'stats_viewed',
      metadata: { days, viewed_by: interaction.user.id },
    });
  } catch (err) {
    await interaction.reply({ content: 'Failed to retrieve stats.', ephemeral: true });
  }
}
