import { checkAndIncrementRateLimit } from '../database/queries/rateLimits.js';
import { countRecentFailures } from '../database/queries/attempts.js';
import { createAuditLog } from '../database/queries/auditLogs.js';
import { logger } from '../utils/logger.js';

export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfterSeconds: number;
  isSuspicious?: boolean;
}

export async function checkUserVerificationRateLimit(params: {
  userId: string;
  guildId: string;
  maxAttempts: number;
  windowMinutes: number;
}): Promise<RateLimitCheckResult> {
  const { userId, guildId, maxAttempts, windowMinutes } = params;
  const key = `verify:${userId}:${guildId}`;

  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
  const failureCount = await countRecentFailures(userId, guildId, windowStart);

  let effectiveWindow = windowMinutes;
  let isSuspicious = false;

  if (failureCount >= 5) {
    effectiveWindow = windowMinutes * 2;
    isSuspicious = true;
    logger.warn(
      { userId, guildId, failureCount },
      'User exceeded 5 consecutive verification failures — applying 2x cooldown'
    );
    await createAuditLog({
      guildId,
      userId,
      eventType: 'suspicious_activity',
      metadata: {
        reason: 'consecutive_failures_exceeded',
        failureCount,
        cooldownWindowMinutes: effectiveWindow,
      },
    });
  }

  const result = await checkAndIncrementRateLimit(key, maxAttempts, effectiveWindow);

  return {
    allowed: result.allowed,
    retryAfterSeconds: result.retryAfterSeconds,
    isSuspicious,
  };
}

export async function checkIpOAuthRateLimit(ipHash: string): Promise<RateLimitCheckResult> {
  const key = `oauth:${ipHash}`;
  const limit = 10;
  const windowMinutes = 10;

  const result = await checkAndIncrementRateLimit(key, limit, windowMinutes);

  return {
    allowed: result.allowed,
    retryAfterSeconds: result.retryAfterSeconds,
  };
}
