import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url().default('http://localhost:3000'),

  // Discord
  DISCORD_BOT_TOKEN: z.string().min(1, 'DISCORD_BOT_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_CLIENT_SECRET: z.string().min(1, 'DISCORD_CLIENT_SECRET is required'),
  DISCORD_REDIRECT_URI: z.string().url().default('http://localhost:3000/auth/callback'),
  DISCORD_ADMIN_REDIRECT_URI: z.string().url().default('http://localhost:3000/admin/auth/callback'),
  DEV_GUILD_ID: z.string().optional(),

  // Supabase
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Secrets
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 characters').default('super_secret_session_key_fallback_development_only'),
  TOKEN_SIGNING_SECRET: z.string().min(16, 'TOKEN_SIGNING_SECRET must be at least 16 characters').default('super_secret_token_signing_fallback_development_only'),

  // Admin & Bootstrap
  INITIAL_ADMIN_DISCORD_ID: z.string().optional(),
  ADMIN_SECRET: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let parsedEnv: EnvConfig;

export function loadEnv(customEnv?: Record<string, string | undefined>): EnvConfig {
  const source = customEnv || process.env;
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `  - [${issue.path.join('.')}]: ${issue.message}`)
      .join('\n');
    console.error(`\x1b[31m[CONFIG ERROR] Invalid environment variables:\n${errorDetails}\x1b[0m`);
    
    // In test environment, provide fallback or throw
    if (process.env.NODE_ENV === 'test') {
      throw new Error(`Environment validation failed:\n${errorDetails}`);
    }
    process.exit(1);
  }

  parsedEnv = result.data;
  return parsedEnv;
}

export function getEnv(): EnvConfig {
  if (!parsedEnv) {
    return loadEnv();
  }
  return parsedEnv;
}
