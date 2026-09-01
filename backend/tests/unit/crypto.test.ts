import { describe, it, expect } from 'vitest';
import {
  generateRandomToken,
  hashIp,
  createSignedSessionToken,
  verifySignedSessionToken,
  signAdminToken,
  verifyAdminToken,
} from '../../src/utils/crypto.js';

describe('Backend Crypto Utilities', () => {
  it('generateRandomToken produces high-entropy base64url string', () => {
    const token1 = generateRandomToken(32);
    const token2 = generateRandomToken(32);

    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
    expect(token1).not.toEqual(token2);
  });

  it('hashIp creates consistent salted SHA-256 hash', () => {
    const rawIp = '192.168.1.100';
    const salt = 'test_secret_salt_12345';

    const hash1 = hashIp(rawIp, salt);
    const hash2 = hashIp(rawIp, salt);
    expect(hash1).toEqual(hash2);
    expect(hash1.length).toBe(64);
  });

  it('createSignedSessionToken and verifySignedSessionToken work as expected', () => {
    const sessionId = 'd3b07384-d113-4948-84e9-eb69c6e3b5e4';
    const guildId = 'e2b07384-d113-4948-84e9-eb69c6e3b5e5';
    const secret = 'super_secret_signing_key_32_characters';
    const futureExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const token = createSignedSessionToken(sessionId, guildId, futureExpiresAt, secret);
    const verified = verifySignedSessionToken(token, secret);

    expect(verified).not.toBeNull();
    expect(verified?.sessionId).toBe(sessionId);
    expect(verified?.guildId).toBe(guildId);
    expect(verified?.isExpired).toBe(false);
  });

  it('signAdminToken and verifyAdminToken validate authentic admin JWTs', () => {
    const secret = 'jwt_secret_super_long_32_chars_ok';
    const token = signAdminToken(
      {
        adminId: 'admin-uuid',
        discordId: '123456789012345678',
        guildId: 'guild-uuid',
        role: 'owner',
      },
      secret,
      3600
    );

    expect(token).toBeDefined();
    const payload = verifyAdminToken(token, secret);

    expect(payload).not.toBeNull();
    expect(payload?.adminId).toBe('admin-uuid');
    expect(payload?.role).toBe('owner');
  });

  it('verifyAdminToken rejects invalid secret', () => {
    const token = signAdminToken(
      { adminId: '1', discordId: '2', guildId: '3', role: 'admin' },
      'secret_A_1234567890_long'
    );
    const payload = verifyAdminToken(token, 'secret_B_1234567890_long');
    expect(payload).toBeNull();
  });
});
