import { describe, it, expect } from 'vitest';
import {
  generateRandomToken,
  hashIp,
  createSignedSessionToken,
  verifySignedSessionToken,
} from '../../src/utils/crypto.js';

describe('Crypto Utilities', () => {
  it('generateRandomToken produces high-entropy base64url string', () => {
    const token1 = generateRandomToken(32);
    const token2 = generateRandomToken(32);

    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
    expect(token1).not.toEqual(token2);
    expect(typeof token1).toBe('string');
    expect(token1.length).toBeGreaterThanOrEqual(32);
  });

  it('hashIp creates consistent salted SHA-256 hash and obscures raw IP', () => {
    const rawIp = '192.168.1.100';
    const salt = 'test_secret_salt_12345';

    const hash1 = hashIp(rawIp, salt);
    const hash2 = hashIp(rawIp, salt);
    const diffHash = hashIp('10.0.0.1', salt);

    expect(hash1).toEqual(hash2);
    expect(hash1).not.toEqual(diffHash);
    expect(hash1).not.toContain(rawIp);
    expect(hash1.length).toBe(64); // SHA-256 hex length
  });

  it('createSignedSessionToken & verifySignedSessionToken validates authentic tokens', () => {
    const sessionId = 'd3b07384-d113-4948-84e9-eb69c6e3b5e4';
    const guildId = 'e2b07384-d113-4948-84e9-eb69c6e3b5e5';
    const secret = 'super_secret_signing_key_32_characters';
    const futureExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const token = createSignedSessionToken(sessionId, guildId, futureExpiresAt, secret);
    expect(token).toBeDefined();
    expect(token).toContain('.');

    const verified = verifySignedSessionToken(token, secret);
    expect(verified).not.toBeNull();
    expect(verified?.sessionId).toBe(sessionId);
    expect(verified?.guildId).toBe(guildId);
    expect(verified?.isExpired).toBe(false);
  });

  it('verifySignedSessionToken flags expired tokens', () => {
    const sessionId = 'd3b07384-d113-4948-84e9-eb69c6e3b5e4';
    const guildId = 'e2b07384-d113-4948-84e9-eb69c6e3b5e5';
    const secret = 'super_secret_signing_key_32_characters';
    const pastExpiresAt = new Date(Date.now() - 5000); // in the past

    const token = createSignedSessionToken(sessionId, guildId, pastExpiresAt, secret);
    const verified = verifySignedSessionToken(token, secret);

    expect(verified).not.toBeNull();
    expect(verified?.isExpired).toBe(true);
  });

  it('verifySignedSessionToken rejects tampered signatures', () => {
    const sessionId = 'd3b07384-d113-4948-84e9-eb69c6e3b5e4';
    const guildId = 'e2b07384-d113-4948-84e9-eb69c6e3b5e5';
    const secret = 'super_secret_signing_key_32_characters';
    const futureExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const token = createSignedSessionToken(sessionId, guildId, futureExpiresAt, secret);
    const tampered = token.slice(0, -4) + 'abcd';

    const verified = verifySignedSessionToken(tampered, secret);
    expect(verified).toBeNull();
  });

  it('verifySignedSessionToken rejects wrong secret', () => {
    const sessionId = 'd3b07384-d113-4948-84e9-eb69c6e3b5e4';
    const guildId = 'e2b07384-d113-4948-84e9-eb69c6e3b5e5';
    const futureExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const token = createSignedSessionToken(sessionId, guildId, futureExpiresAt, 'secret_A_1234567890');
    const verified = verifySignedSessionToken(token, 'secret_B_1234567890');

    expect(verified).toBeNull();
  });
});
