import { getDb } from '../client.js';
import { RateLimitRow } from '../types.js';

export async function checkAndIncrementRateLimit(
  key: string,
  limit: number,
  windowMinutes: number
): Promise<{ allowed: boolean; currentCount: number; retryAfterSeconds: number }> {
  const db = getDb();
  const now = new Date();
  const windowMs = windowMinutes * 60 * 1000;

  // Check existing row
  const { data: existing, error: fetchError } = await db
    .from('rate_limits')
    .select('*')
    .eq('key', key)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to check rate limit: ${fetchError.message}`);
  }

  const row = existing as RateLimitRow | null;

  if (!row) {
    // New key
    await db.from('rate_limits').insert({
      key,
      count: 1,
      window_start: now.toISOString(),
      updated_at: now.toISOString(),
    });
    return { allowed: true, currentCount: 1, retryAfterSeconds: 0 };
  }

  const windowStart = new Date(row.window_start).getTime();
  const elapsedMs = now.getTime() - windowStart;

  if (elapsedMs >= windowMs) {
    // Window has reset
    await db
      .from('rate_limits')
      .update({
        count: 1,
        window_start: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('key', key);
    return { allowed: true, currentCount: 1, retryAfterSeconds: 0 };
  }

  // Still inside window
  const newCount = row.count + 1;
  const remainingSeconds = Math.ceil((windowMs - elapsedMs) / 1000);

  await db
    .from('rate_limits')
    .update({
      count: newCount,
      updated_at: now.toISOString(),
    })
    .eq('key', key);

  if (newCount > limit) {
    return {
      allowed: false,
      currentCount: newCount,
      retryAfterSeconds: remainingSeconds,
    };
  }

  return {
    allowed: true,
    currentCount: newCount,
    retryAfterSeconds: 0,
  };
}

export async function pruneOldRateLimits(hours: number = 24): Promise<number> {
  const db = getDb();
  const threshold = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from('rate_limits')
    .delete()
    .lt('updated_at', threshold)
    .select('key');

  if (error) {
    throw new Error(`Failed to prune old rate limits: ${error.message}`);
  }

  return (data || []).length;
}
