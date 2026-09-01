import { Client, Guild, GuildMember, PermissionFlagsBits } from 'discord.js';
import { getDiscordClient } from '../bot/client.js';
import { logger } from '../utils/logger.js';
import { createAuditLog } from '../database/queries/auditLogs.js';

// In-process concurrency mutex per (guildId:userId)
const mutexMap = new Map<string, Promise<unknown>>();

export interface RoleAssignmentResult {
  success: boolean;
  error?: string;
  discordErrorCode?: number;
}

export interface GuildPermissionCheckResult {
  valid: boolean;
  botInGuild: boolean;
  hasManageRoles: boolean;
  roleHierarchyOk: boolean;
  verifiedRoleExists: boolean;
  unverifiedRoleExists: boolean;
  channelExists: boolean;
  errors: string[];
}

/**
 * Execute an operation under a per-key mutex
 */
async function withMutex<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const current = mutexMap.get(key) || Promise.resolve();
  let release: () => void;
  const next = new Promise<void>((res) => {
    release = res;
  });

  mutexMap.set(key, current.then(() => next));

  try {
    await current;
    return await fn();
  } finally {
    release!();
    if (mutexMap.get(key) === next) {
      mutexMap.delete(key);
    }
  }
}

/**
 * Sleep helper for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a Discord API action with exponential backoff on 429/5xx
 */
async function retryDiscordApi<T>(action: () => Promise<T>, maxRetries = 3, baseDelayMs = 500): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await action();
    } catch (err: unknown) {
      attempt++;
      const discordError = err as { status?: number; code?: number; rawError?: { retry_after?: number } };
      const status = discordError.status || 0;
      const retryAfter = discordError.rawError?.retry_after;

      if (attempt >= maxRetries || (status !== 429 && status < 500)) {
        throw err;
      }

      const delay = retryAfter ? Math.ceil(retryAfter * 1000) : baseDelayMs * Math.pow(2, attempt - 1);
      logger.warn({ attempt, maxRetries, delay, status }, 'Retrying Discord API operation due to rate-limit or 5xx');
      await sleep(delay);
    }
  }
}

/**
 * Assign the Verified Role and remove the Unverified Role from a Discord member
 */
export async function assignVerifiedRole(params: {
  discordGuildId: string;
  discordUserId: string;
  verifiedRoleId: string;
  unverifiedRoleId?: string | null;
  internalGuildId?: string;
  internalUserId?: string;
}): Promise<RoleAssignmentResult> {
  const { discordGuildId, discordUserId, verifiedRoleId, unverifiedRoleId, internalGuildId, internalUserId } = params;
  const lockKey = `${discordGuildId}:${discordUserId}`;

  return withMutex(lockKey, async () => {
    const client = getDiscordClient();
    if (!client.isReady()) {
      return { success: false, error: 'Discord bot client is not ready' };
    }

    try {
      const guild = await client.guilds.fetch(discordGuildId).catch(() => null);
      if (!guild) {
        return { success: false, error: 'Bot is not in the specified Discord guild' };
      }

      const botMember = await guild.members.fetchMe().catch(() => null);
      if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
        logger.error({ discordGuildId }, 'Bot lacks ManageRoles permission');
        return { success: false, error: 'Bot lacks Manage Roles permission' };
      }

      const targetMember = await guild.members.fetch(discordUserId).catch(() => null);
      if (!targetMember) {
        return { success: false, error: 'Member is no longer in the Discord guild' };
      }

      const verifiedRole = await guild.roles.fetch(verifiedRoleId).catch(() => null);
      if (!verifiedRole) {
        logger.error({ discordGuildId, verifiedRoleId }, 'Verified role not found in guild');
        return { success: false, error: 'Verified role not found in guild' };
      }

      // Check hierarchy
      if (botMember.roles.highest.position <= verifiedRole.position) {
        logger.error(
          { botPosition: botMember.roles.highest.position, rolePosition: verifiedRole.position },
          'Bot highest role is below verified role in hierarchy'
        );
        return { success: false, error: 'Bot role is lower than the Verified Role in the role hierarchy' };
      }

      // Perform role assignment with retry
      await retryDiscordApi(async () => {
        await targetMember.roles.add(verifiedRoleId, 'Member verified via OAuth2 verification');
        if (unverifiedRoleId) {
          const hasUnverified = targetMember.roles.cache.has(unverifiedRoleId);
          if (hasUnverified) {
            await targetMember.roles.remove(unverifiedRoleId, 'Removed unverified role on successful verification');
          }
        }
      });

      logger.info({ discordGuildId, discordUserId, verifiedRoleId }, 'Successfully assigned verified role to member');

      if (internalGuildId && internalUserId) {
        await createAuditLog({
          guildId: internalGuildId,
          userId: internalUserId,
          eventType: 'role_assigned',
          metadata: { role_id: verifiedRoleId, unverified_role_id: unverifiedRoleId },
        });
      }

      return { success: true };
    } catch (err: unknown) {
      const discordError = err as { code?: number; message?: string };
      logger.error({ err, discordGuildId, discordUserId }, 'Role assignment failed');

      if (internalGuildId && internalUserId) {
        await createAuditLog({
          guildId: internalGuildId,
          userId: internalUserId,
          eventType: 'role_assignment_failure',
          metadata: {
            role_id: verifiedRoleId,
            discord_error_code: discordError.code || null,
            error_message: discordError.message || 'Unknown error',
          },
        });
      }

      return {
        success: false,
        error: discordError.message || 'Failed to assign role on Discord',
        discordErrorCode: discordError.code,
      };
    }
  });
}

/**
 * Remove the Verified Role (used by /unverify)
 */
export async function removeVerifiedRole(params: {
  discordGuildId: string;
  discordUserId: string;
  verifiedRoleId: string;
  unverifiedRoleId?: string | null;
}): Promise<RoleAssignmentResult> {
  const { discordGuildId, discordUserId, verifiedRoleId, unverifiedRoleId } = params;
  const lockKey = `${discordGuildId}:${discordUserId}`;

  return withMutex(lockKey, async () => {
    const client = getDiscordClient();
    if (!client.isReady()) {
      return { success: false, error: 'Discord bot client is not ready' };
    }

    try {
      const guild = await client.guilds.fetch(discordGuildId).catch(() => null);
      if (!guild) return { success: false, error: 'Bot is not in the specified guild' };

      const targetMember = await guild.members.fetch(discordUserId).catch(() => null);
      if (!targetMember) return { success: false, error: 'Member not found in guild' };

      await retryDiscordApi(async () => {
        if (targetMember.roles.cache.has(verifiedRoleId)) {
          await targetMember.roles.remove(verifiedRoleId, 'Verification revoked by admin');
        }
        if (unverifiedRoleId && !targetMember.roles.cache.has(unverifiedRoleId)) {
          await targetMember.roles.add(unverifiedRoleId, 'Restored unverified role on verification revocation');
        }
      });

      return { success: true };
    } catch (err: unknown) {
      const discordError = err as { code?: number; message?: string };
      return {
        success: false,
        error: discordError.message || 'Failed to remove role on Discord',
        discordErrorCode: discordError.code,
      };
    }
  });
}

/**
 * Dry-run testing permissions and role hierarchy for admin config check
 */
export async function testGuildPermissions(params: {
  discordGuildId: string;
  verifiedRoleId?: string | null;
  unverifiedRoleId?: string | null;
  channelId?: string | null;
}): Promise<GuildPermissionCheckResult> {
  const errors: string[] = [];
  const client = getDiscordClient();

  if (!client.isReady()) {
    return {
      valid: false,
      botInGuild: false,
      hasManageRoles: false,
      roleHierarchyOk: false,
      verifiedRoleExists: false,
      unverifiedRoleExists: false,
      channelExists: false,
      errors: ['Discord bot client is not connected to Discord Gateway'],
    };
  }

  const guild = await client.guilds.fetch(params.discordGuildId).catch(() => null);
  if (!guild) {
    return {
      valid: false,
      botInGuild: false,
      hasManageRoles: false,
      roleHierarchyOk: false,
      verifiedRoleExists: false,
      unverifiedRoleExists: false,
      channelExists: false,
      errors: ['Bot is not present in the specified Discord guild'],
    };
  }

  const botMember = await guild.members.fetchMe().catch(() => null);
  const hasManageRoles = !!botMember?.permissions.has(PermissionFlagsBits.ManageRoles);
  if (!hasManageRoles) {
    errors.push('Bot lacks the "Manage Roles" permission in this server.');
  }

  let verifiedRoleExists = false;
  let unverifiedRoleExists = true;
  let roleHierarchyOk = true;

  if (params.verifiedRoleId) {
    const vRole = await guild.roles.fetch(params.verifiedRoleId).catch(() => null);
    if (vRole) {
      verifiedRoleExists = true;
      if (botMember && botMember.roles.highest.position <= vRole.position) {
        roleHierarchyOk = false;
        errors.push(`Bot's highest role is lower than or equal to the Verified Role "${vRole.name}". Move the bot role above it.`);
      }
    } else {
      errors.push('Configured Verified Role ID does not exist in this server.');
    }
  }

  if (params.unverifiedRoleId) {
    const uvRole = await guild.roles.fetch(params.unverifiedRoleId).catch(() => null);
    if (uvRole) {
      unverifiedRoleExists = true;
      if (botMember && botMember.roles.highest.position <= uvRole.position) {
        roleHierarchyOk = false;
        errors.push(`Bot's highest role is lower than or equal to the Unverified Role "${uvRole.name}". Move the bot role above it.`);
      }
    } else {
      unverifiedRoleExists = false;
      errors.push('Configured Unverified Role ID does not exist in this server.');
    }
  }

  let channelExists = true;
  if (params.channelId) {
    const channel = await guild.channels.fetch(params.channelId).catch(() => null);
    if (!channel) {
      channelExists = false;
      errors.push('Configured Verification Channel ID does not exist in this server.');
    }
  }

  const valid = hasManageRoles && roleHierarchyOk && (!params.verifiedRoleId || verifiedRoleExists) && (!params.channelId || channelExists);

  return {
    valid,
    botInGuild: true,
    hasManageRoles,
    roleHierarchyOk,
    verifiedRoleExists,
    unverifiedRoleExists,
    channelExists,
    errors,
  };
}
