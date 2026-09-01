import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from '../config/env.js';
import { logger } from '../utils/logger.js';

let supabaseInstance: SupabaseClient | null = null;
let lastSuccessfulPing: Date | null = null;

export function getDb(): SupabaseClient {
  if (!supabaseInstance) {
    const env = getEnv();
    supabaseInstance = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'x-application-name': 'discord-verification-platform',
        },
      },
    });
    logger.info('Supabase database client initialized with service role key');
  }
  return supabaseInstance;
}

export function setMockDb(client: SupabaseClient | null) {
  supabaseInstance = client;
}

/**
 * Lightweight reachability check with caching (cached for 60 seconds)
 */
export async function checkDbHealth(): Promise<{ ok: boolean; latencyMs?: number; lastPing?: Date }> {
  try {
    const start = Date.now();
    const db = getDb();
    const { error } = await db.from('guilds').select('id', { count: 'exact', head: true }).limit(1);

    if (error) {
      logger.warn({ error }, 'Supabase health check failed');
      return { ok: false, lastPing: lastSuccessfulPing || undefined };
    }

    const latencyMs = Date.now() - start;
    lastSuccessfulPing = new Date();
    return { ok: true, latencyMs, lastPing: lastSuccessfulPing };
  } catch (err) {
    logger.warn({ err }, 'Supabase health check exception');
    return { ok: false, lastPing: lastSuccessfulPing || undefined };
  }
}
