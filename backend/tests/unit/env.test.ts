import { describe, it, expect } from 'vitest';
import { loadEnv } from '../../src/config/env.js';

describe('Backend Environment Configuration Loader', () => {
  const validMockEnv = {
    NODE_ENV: 'test',
    PORT: '4000',
    FRONTEND_URL: 'http://localhost:3000',
    BACKEND_URL: 'http://localhost:4000',
    DISCORD_BOT_TOKEN: 'mock_bot_token',
    DISCORD_CLIENT_ID: '123456789012345678',
    DISCORD_CLIENT_SECRET: 'mock_client_secret',
    DISCORD_REDIRECT_URI: 'http://localhost:3000/auth/callback',
    DISCORD_ADMIN_REDIRECT_URI: 'http://localhost:3000/admin/auth/callback',
    SUPABASE_URL: 'https://test-project.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'mock_service_role_key',
    JWT_SECRET: 'super_secret_jwt_key_32_characters',
    TOKEN_SIGNING_SECRET: 'super_secret_signing_key_32_characters',
  };

  it('successfully loads valid backend environment variables', () => {
    const config = loadEnv(validMockEnv);
    expect(config.PORT).toBe(4000);
    expect(config.NODE_ENV).toBe('test');
    expect(config.FRONTEND_URL).toBe('http://localhost:3000');
  });

  it('fails validation when required keys are missing', () => {
    const invalidEnv = { ...validMockEnv, DISCORD_BOT_TOKEN: '' };
    expect(() => loadEnv(invalidEnv)).toThrow();
  });
});
