import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { loadEnv } from '../../src/config/env.js';
import { createExpressApp } from '../../src/api/server.js';
import { Express } from 'express';

describe('Express Web App & API Routes Integration', () => {
  let app: Express;

  beforeAll(() => {
    loadEnv({
      NODE_ENV: 'test',
      PORT: '3000',
      APP_URL: 'http://localhost:3000',
      DISCORD_BOT_TOKEN: 'mock_bot_token',
      DISCORD_CLIENT_ID: '123456789012345678',
      DISCORD_CLIENT_SECRET: 'mock_client_secret',
      DISCORD_REDIRECT_URI: 'http://localhost:3000/auth/callback',
      DISCORD_ADMIN_REDIRECT_URI: 'http://localhost:3000/admin/auth/callback',
      SUPABASE_URL: 'https://test-project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'mock_service_role_key',
      SESSION_SECRET: 'super_secret_session_key_32_characters',
      TOKEN_SIGNING_SECRET: 'super_secret_signing_key_32_characters',
      ADMIN_SECRET: 'test_admin_secret_passkey',
    });

    app = createExpressApp();
  });

  it('GET /health returns health status object', async () => {
    const res = await request(app).get('/health');
    // Without active Discord gateway in tests, returns 503 degraded
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('uptime_seconds');
    expect(res.body).toHaveProperty('discord_gateway');
  });

  it('GET / returns HTML landing page', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('Discord Member Verification');
    expect(res.text).toContain('Add Bot to Server');
  });

  it('GET /verify without token renders error page', async () => {
    const res = await request(app).get('/verify');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Invalid Verification Link');
    expect(res.text).toContain('MISSING_TOKEN');
  });

  it('GET /verify/success renders success message', async () => {
    const res = await request(app).get('/verify/success?guild=Test+Server&user=Tester');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Verification Successful!');
    expect(res.text).toContain('Test Server');
    expect(res.text).toContain('@Tester');
  });

  it('GET /verify/failure renders failure message', async () => {
    const res = await request(app).get('/verify/failure?reason=OAuth+Denied');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Verification Failed');
    expect(res.text).toContain('OAuth Denied');
  });

  it('GET /verify/already renders already verified page', async () => {
    const res = await request(app).get('/verify/already?guild=Test+Server');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Already Verified');
    expect(res.text).toContain('Test Server');
  });

  it('GET /verify/expired renders expired session page', async () => {
    const res = await request(app).get('/verify/expired');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Verification Link Expired');
  });

  it('GET /admin/login renders login portal', async () => {
    const res = await request(app).get('/admin/login');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Admin Dashboard Login');
    expect(res.text).toContain('Login with Discord OAuth2');
  });

  it('GET /non-existent-route returns 404 page', async () => {
    const res = await request(app).get('/non-existent-route');
    expect(res.status).toBe(404);
    expect(res.text).toContain('Page Not Found');
  });
});
