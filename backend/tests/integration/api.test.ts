import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { loadEnv } from '../../src/config/env.js';
import { createExpressApp } from '../../src/api/server.js';
import { Express } from 'express';

describe('Backend REST API Routes Integration', () => {
  let app: Express;

  beforeAll(() => {
    loadEnv({
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
      ADMIN_SECRET: 'test_admin_secret_passkey',
    });

    app = createExpressApp();
  });

  it('GET /health returns JSON status', async () => {
    const res = await request(app).get('/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('uptime_seconds');
  });

  it('POST /api/verify/initiate without token returns 400', async () => {
    const res = await request(app).post('/api/verify/initiate').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_TOKEN');
  });

  it('POST /api/verify/process without code/state returns 400', async () => {
    const res = await request(app).post('/api/verify/process').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PARAMS');
  });

  it('POST /api/admin/auth/login with secret returns JWT token', async () => {
    const res = await request(app).post('/api/admin/auth/login').send({
      secret: 'test_admin_secret_passkey',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('token');
    expect(res.body.admin.role).toBe('owner');
  });

  it('GET /api/admin/overview without token returns 401', async () => {
    const res = await request(app).get('/api/admin/overview');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
