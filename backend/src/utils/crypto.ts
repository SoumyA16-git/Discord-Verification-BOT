import crypto from 'crypto';

export function generateRandomToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function hashIp(ip: string, salt: string = 'ip_salt_fallback'): string {
  const normalized = (ip || 'unknown').trim().toLowerCase();
  return crypto.createHmac('sha256', salt).update(normalized).digest('hex');
}

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

export function verifySignedSessionToken(
  token: string,
  secret: string
): VerifiedSignedToken | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadStr, signature] = parts;

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

export interface AdminJwtPayload {
  adminId: string;
  discordId: string;
  guildId: string;
  role: 'admin' | 'owner';
  exp: number;
}

/**
 * Sign Admin JWT Bearer Token
 */
export function signAdminToken(
  payload: Omit<AdminJwtPayload, 'exp'>,
  secret: string,
  expiresInSeconds = 7 * 24 * 60 * 60
): string {
  const fullPayload: AdminJwtPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

/**
 * Verify Admin JWT Bearer Token
 */
export function verifyAdminToken(token: string, secret: string): AdminJwtPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');

  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as AdminJwtPayload;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}
