import { getEnv } from '../config/env.js';
import { hashIp } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { findSessionByOAuthState, consumeSessionAtomically, updateSessionStatus } from '../database/queries/sessions.js';
import { findUserById, upsertUser } from '../database/queries/users.js';
import { findGuildById } from '../database/queries/guilds.js';
import { getGuildConfig } from '../database/queries/guildConfig.js';
import { getVerification, markVerificationVerified, markVerificationFailed } from '../database/queries/verifications.js';
import { recordAttempt } from '../database/queries/attempts.js';
import { createAuditLog } from '../database/queries/auditLogs.js';
import { checkUserVerificationRateLimit } from '../services/rateLimiter.js';
import { assignVerifiedRole } from '../services/roleService.js';
import { exchangeCodeForUser, DiscordUserIdentity } from '../auth/oauth.js';

export interface VerificationProcessResult {
  status: 'VERIFIED' | 'FAILED' | 'EXPIRED' | 'ALREADY_VERIFIED' | 'RATE_LIMITED' | 'INVALID_STATE';
  reason?: string;
  retryAfterSeconds?: number;
  user?: DiscordUserIdentity;
  guildName?: string;
}

export async function processOAuthCallback(params: {
  code: string;
  state: string;
  clientIp: string;
}): Promise<VerificationProcessResult> {
  const env = getEnv();
  const { code, state, clientIp } = params;
  const ipHash = hashIp(clientIp, env.TOKEN_SIGNING_SECRET);

  logger.info({ state, ipHash }, 'Processing OAuth2 callback in backend verification engine');

  // 1. Look up session by OAuth state
  const session = await findSessionByOAuthState(state);
  if (!session) {
    logger.warn({ state }, 'Invalid or unrecognized OAuth state token');
    await createAuditLog({
      eventType: 'oauth_failure',
      metadata: { reason: 'state_mismatch', state, ip_hash: ipHash },
    });
    return { status: 'INVALID_STATE', reason: 'Invalid or expired verification session token' };
  }

  const { id: sessionId, user_id: sessionUserId, guild_id: guildId, expires_at: expiresAtStr, consumed_at: consumedAt } = session;

  // 2. Fetch Guild & Guild Config
  const guild = await findGuildById(guildId);
  if (!guild) {
    return { status: 'FAILED', reason: 'Guild record not found in system' };
  }

  const guildConfig = await getGuildConfig(guildId);
  if (!guildConfig || !guildConfig.verification_enabled) {
    return { status: 'FAILED', reason: 'Verification is currently disabled or unconfigured for this server' };
  }

  if (!guildConfig.verified_role_id) {
    return { status: 'FAILED', reason: 'Server has no Verified Role configured' };
  }

  // 3. Check if session has expired
  const expiresAt = new Date(expiresAtStr);
  if (expiresAt.getTime() < Date.now()) {
    await updateSessionStatus(sessionId, 'EXPIRED');
    await recordAttempt({
      userId: sessionUserId,
      guildId,
      sessionId,
      result: 'FAILURE',
      failureReason: 'session_expired',
      ipHash,
    });
    return { status: 'EXPIRED', reason: 'Your verification session has expired. Please request a new link.' };
  }

  // 4. Check if session was already consumed (Idempotency)
  if (consumedAt) {
    const existingVerif = await getVerification(sessionUserId, guildId);
    if (existingVerif && existingVerif.status === 'VERIFIED') {
      return { status: 'ALREADY_VERIFIED', guildName: guild.name || 'Discord Server' };
    }
    return { status: 'FAILED', reason: 'This verification link has already been used' };
  }

  // 5. Check Rate Limits
  const rateLimitResult = await checkUserVerificationRateLimit({
    userId: sessionUserId,
    guildId,
    maxAttempts: guildConfig.rate_limit_attempts,
    windowMinutes: guildConfig.rate_limit_window_minutes,
  });

  if (!rateLimitResult.allowed) {
    await recordAttempt({
      userId: sessionUserId,
      guildId,
      sessionId,
      result: 'FAILURE',
      failureReason: 'rate_limit_exceeded',
      ipHash,
    });
    return {
      status: 'RATE_LIMITED',
      retryAfterSeconds: rateLimitResult.retryAfterSeconds,
      reason: `Too many attempts. Please try again in ${rateLimitResult.retryAfterSeconds} seconds.`,
    };
  }

  // 6. Atomically consume the session
  const consumedSession = await consumeSessionAtomically(sessionId);
  if (!consumedSession) {
    const existingVerif = await getVerification(sessionUserId, guildId);
    if (existingVerif && existingVerif.status === 'VERIFIED') {
      return { status: 'ALREADY_VERIFIED', guildName: guild.name || 'Discord Server' };
    }
    return { status: 'FAILED', reason: 'Verification session was consumed concurrently' };
  }

  // 7. Exchange Discord OAuth2 Code for User Profile
  let discordUser: DiscordUserIdentity;
  try {
    discordUser = await exchangeCodeForUser(code);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'OAuth exchange failed';
    logger.warn({ err, sessionId }, 'Failed exchanging OAuth code with Discord');
    await updateSessionStatus(sessionId, 'FAILED');
    await recordAttempt({
      userId: sessionUserId,
      guildId,
      sessionId,
      result: 'FAILURE',
      failureReason: 'oauth_denied_or_failed',
      ipHash,
    });
    await createAuditLog({
      guildId,
      userId: sessionUserId,
      eventType: 'oauth_failure',
      metadata: { error: message },
    });
    return { status: 'FAILED', reason: 'Discord OAuth2 authentication was denied or failed' };
  }

  // 8. Canonical User Identity Verification
  const internalUser = await upsertUser(discordUser.id, discordUser.username);
  if (!internalUser) {
    return { status: 'FAILED', reason: 'Failed to record user identity in database' };
  }

  // 8.5 Account Age Check
  if (guildConfig.minimum_account_age_enabled && guildConfig.minimum_account_age_days > 0) {
    // Discord snowflake epoch is 1420070400000
    const accountCreationTime = new Date(Number(BigInt(discordUser.id) >> 22n) + 1420070400000);
    const ageInDays = (Date.now() - accountCreationTime.getTime()) / (1000 * 60 * 60 * 24);
    
    if (ageInDays < guildConfig.minimum_account_age_days) {
      await updateSessionStatus(sessionId, 'FAILED');
      await recordAttempt({
        userId: sessionUserId,
        guildId,
        sessionId,
        result: 'FAILURE',
        failureReason: 'account_too_new',
        ipHash,
      });
      return { 
        status: 'FAILED', 
        reason: `Your Discord account is too new. It must be at least ${guildConfig.minimum_account_age_days} days old to verify on this server. Please try again later.` 
      };
    }
  }

  const expectedUser = await findUserById(sessionUserId);
  if (expectedUser && expectedUser.discord_id !== discordUser.id) {
    logger.warn(
      { expected: expectedUser.discord_id, actual: discordUser.id },
      'OAuth Discord ID does not match the session initiator'
    );
    await updateSessionStatus(sessionId, 'FAILED');
    await recordAttempt({
      userId: internalUser.id,
      guildId,
      sessionId,
      result: 'FAILURE',
      failureReason: 'discord_id_mismatch',
      ipHash,
    });
    await createAuditLog({
      guildId,
      userId: internalUser.id,
      eventType: 'suspicious_activity',
      metadata: { reason: 'discord_id_mismatch', expectedDiscordId: expectedUser.discord_id },
    });
    return {
      status: 'FAILED',
      reason: 'The Discord account you authenticated with does not match the session account.',
    };
  }

  await createAuditLog({
    guildId,
    userId: internalUser.id,
    eventType: 'oauth_success',
    metadata: { discord_id: discordUser.id },
  });

  // 9. Assign Discord Role BEFORE committing VERIFIED status (Binding Rule)
  const roleResult = await assignVerifiedRole({
    discordGuildId: guild.discord_guild_id,
    discordUserId: discordUser.id,
    verifiedRoleId: guildConfig.verified_role_id,
    unverifiedRoleId: guildConfig.unverified_role_id,
    internalGuildId: guildId,
    internalUserId: internalUser.id,
  });

  if (!roleResult.success) {
    await updateSessionStatus(sessionId, 'FAILED');
    await markVerificationFailed({ userId: internalUser.id, guildId, sessionId });
    await recordAttempt({
      userId: internalUser.id,
      guildId,
      sessionId,
      result: 'FAILURE',
      failureReason: `role_assignment_failed: ${roleResult.error}`,
      ipHash,
    });
    await createAuditLog({
      guildId,
      userId: internalUser.id,
      eventType: 'verification_failure',
      metadata: { reason: roleResult.error },
    });
    return {
      status: 'FAILED',
      reason: roleResult.error || 'Failed to assign Verified role in Discord. Please contact a server admin.',
    };
  }

  // 10. Success: Mark DB State VERIFIED
  await updateSessionStatus(sessionId, 'VERIFIED');
  await markVerificationVerified({ userId: internalUser.id, guildId, sessionId });
  await recordAttempt({
    userId: internalUser.id,
    guildId,
    sessionId,
    result: 'SUCCESS',
    ipHash,
  });
  await createAuditLog({
    guildId,
    userId: internalUser.id,
    eventType: 'verification_success',
    metadata: { verifiedRoleId: guildConfig.verified_role_id },
  });

  logger.info({ userId: internalUser.id, discordId: discordUser.id, guildId }, 'Verification completed successfully');

  return {
    status: 'VERIFIED',
    user: discordUser,
    guildName: guild.name || 'Discord Server',
  };
}
