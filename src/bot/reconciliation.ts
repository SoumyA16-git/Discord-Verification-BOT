import { Client, TextChannel } from 'discord.js';
import { getDb } from '../database/client.js';
import { getDiscordClient } from './client.js';
import { getGuildConfig } from '../database/queries/guildConfig.js';
import { listVerifiedInGuild, markVerificationVerified, markVerificationFailed } from '../database/queries/verifications.js';
import { findUserById, upsertUser } from '../database/queries/users.js';
import { createAuditLog } from '../database/queries/auditLogs.js';
import { sweepExpiredSessions } from '../database/queries/sessions.js';
import { pruneOldRateLimits } from '../database/queries/rateLimits.js';
import { assignVerifiedRole } from '../services/roleService.js';
import { logger } from '../utils/logger.js';

let reconciliationTimer: NodeJS.Timeout | null = null;

export async function runReconciliationSweep(): Promise<void> {
  const client = getDiscordClient();
  if (!client.isReady()) {
    logger.debug('Skipping reconciliation sweep — Discord client is not ready');
    return;
  }

  logger.info('Starting periodic DB & Discord role reconciliation sweep');

  try {
    // 1. Sweep expired sessions & old rate limit records
    await sweepExpiredSessions().catch(() => {});
    await pruneOldRateLimits().catch(() => {});

    const db = getDb();
    const { data: guilds } = await db.from('guilds').select('*');

    if (!guilds) return;

    for (const g of guilds) {
      const config = await getGuildConfig(g.id);
      if (!config || !config.verification_enabled || !config.verified_role_id) continue;

      const discordGuild = await client.guilds.fetch(g.discord_guild_id).catch(() => null);
      if (!discordGuild) continue;

      // 2. Forward Reconciliation: Check DB VERIFIED rows against live members
      const verifiedRows = await listVerifiedInGuild(g.id);
      for (const row of verifiedRows) {
        const user = await findUserById(row.user_id);
        if (!user) continue;

        const member = await discordGuild.members.fetch(user.discord_id).catch(() => null);
        if (!member) continue; // Member left the guild

        const hasRole = member.roles.cache.has(config.verified_role_id);
        if (!hasRole) {
          logger.warn(
            { discordUserId: user.discord_id, guildId: g.id },
            'Reconciliation: Member is VERIFIED in DB but lacks role in Discord — re-assigning'
          );

          const roleResult = await assignVerifiedRole({
            discordGuildId: g.discord_guild_id,
            discordUserId: user.discord_id,
            verifiedRoleId: config.verified_role_id,
            unverifiedRoleId: config.unverified_role_id,
            internalGuildId: g.id,
            internalUserId: user.id,
          });

          if (!roleResult.success) {
            await markVerificationFailed({ userId: user.id, guildId: g.id });
            if (config.log_channel_id) {
              const logChan = await discordGuild.channels.fetch(config.log_channel_id).catch(() => null);
              if (logChan && logChan.isTextBased()) {
                (logChan as TextChannel).send({
                  content: `⚠️ **Reconciliation Alert:** Failed to re-assign Verified Role to <@${user.discord_id}>: ${roleResult.error}`,
                }).catch(() => {});
              }
            }
          }
        }
      }

      // 3. Reverse Reconciliation: Check live members holding role vs DB
      try {
        const members = await discordGuild.members.fetch();
        for (const [memberId, member] of members) {
          if (member.user.bot) continue;

          const hasVerifiedRole = member.roles.cache.has(config.verified_role_id);
          if (hasVerifiedRole) {
            const user = await upsertUser(memberId, member.user.username);
            if (user) {
              const existingVerif = await db
                .from('verifications')
                .select('status')
                .eq('user_id', user.id)
                .eq('guild_id', g.id)
                .maybeSingle();

              if (!existingVerif.data || existingVerif.data.status !== 'VERIFIED') {
                logger.info(
                  { memberId, guildId: g.id },
                  'Reconciliation: Member holds Verified role in Discord but lacks VERIFIED row in DB — recording'
                );
                await markVerificationVerified({ userId: user.id, guildId: g.id });
                await createAuditLog({
                  guildId: g.id,
                  userId: user.id,
                  eventType: 'verification_success',
                  metadata: { source: 'reconciliation_reverse' },
                });
              }
            }
          }
        }
      } catch (err) {
        logger.warn({ err, guildId: g.id }, 'Error during reverse reconciliation member fetch');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error during reconciliation sweep');
  }
}

export function startReconciliationScheduler(intervalMinutes = 30): void {
  if (reconciliationTimer) clearInterval(reconciliationTimer);

  logger.info({ intervalMinutes }, 'Starting background reconciliation scheduler');
  // Initial run shortly after startup
  setTimeout(() => {
    runReconciliationSweep().catch(() => {});
  }, 10000);

  reconciliationTimer = setInterval(() => {
    runReconciliationSweep().catch(() => {});
  }, intervalMinutes * 60 * 1000);
}

export function stopReconciliationScheduler(): void {
  if (reconciliationTimer) {
    clearInterval(reconciliationTimer);
    reconciliationTimer = null;
  }
}
