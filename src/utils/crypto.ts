import crypto from 'crypto';

/**
 * Generate a cryptographically secure random base64url string
 */
export function generateRandomToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Hash an IP address with a secret salt using SHA-256 for privacy preservation
 */
export function hashIp(ip: string, salt: string = 'ip_salt_fallback'): string {
  const normalized = (ip || 'unknown').trim().toLowerCase();
  return crypto.createHmac('sha256', salt).update(normalized).digest('hex');
}

/**
 * Create a signed token embedding session ID, expiration timestamp, and HMAC signature
 */
export function createSignedSessionToken(
  sessionId: string,
  guildId: string,
  expiresAt: Date,
  secret: string
): string {
  const payload = Buffer.from(
    JSON.stringify({
      sid: sessionId,
      gid: guildId,
      exp: expiresAt.getTime(),
      nonce: generateRandomToken(8),
    })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

export interface VerifiedSignedToken {
  sessionId: string;
  guildId: string;
  expiresAt: Date;
  isExpired: boolean;
}

/**
 * Verify and decode a signed session token
 */
export function verifySignedSessionToken(
  token: string,
  secret: string
): VerifiedSignedToken | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadStr, signature] = parts;

  // Verify HMAC signature using timing-safe comparison
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadStr)
    .digest('base64url');

  try {
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(payloadStr, 'base64url').toString('utf-8')
    );

    if (!decoded.sid || !decoded.gid || !decoded.exp) {
      return null;
    }

    const expiresAt = new Date(decoded.exp);
    const isExpired = expiresAt.getTime() < Date.now();

    return {
      sessionId: decoded.sid,
      guildId: decoded.gid,
      expiresAt,
      isExpired,
    };
  } catch {
    return null;
  }
}
