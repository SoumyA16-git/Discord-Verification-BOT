import { Router, Request, Response } from 'express';
import { getEnv } from '../../config/env.js';
import { verifySignedSessionToken, hashIp } from '../../utils/crypto.js';
import { findSessionByToken, findSessionById, updateSessionStatus } from '../../database/queries/sessions.js';
import { getDiscordAuthorizeUrl } from '../../auth/oauth.js';
import { checkIpOAuthRateLimit } from '../../services/rateLimiter.js';
import { processOAuthCallback } from '../../verification/engine.js';
import { logger } from '../../utils/logger.js';

const router = Router();

/**
 * POST /api/verify/initiate
 * Validates a signed link token from the Vercel frontend and provides the Discord OAuth2 URL
 */
router.post('/initiate', async (req: Request, res: Response) => {
  const env = getEnv();
  const token = req.body.token as string | undefined;
  const turnstileToken = req.body.turnstileToken as string | undefined;
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || '127.0.0.1';
  const ipHash = hashIp(clientIp, env.TOKEN_SIGNING_SECRET);

  if (!token) {
    return res.status(400).json({ error: { code: 'MISSING_TOKEN', message: 'No verification token was provided.' } });
  }
  
  if (!turnstileToken) {
    return res.status(400).json({ error: { code: 'MISSING_TURNSTILE', message: 'Please complete the anti-bot verification.' } });
  }

  // Validate Turnstile Token
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    try {
      const tsResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: turnstileSecret,
          response: turnstileToken,
          remoteip: clientIp,
        }),
      });
      const tsData: any = await tsResponse.json();
      if (!tsData.success) {
        logger.warn({ tsData, ipHash }, 'Turnstile verification failed');
        return res.status(403).json({ error: { code: 'BOT_REJECTED', message: 'Anti-bot verification failed.' } });
      }
    } catch (err) {
      logger.error({ err }, 'Turnstile API error');
      return res.status(500).json({ error: { code: 'TURNSTILE_ERROR', message: 'Anti-bot service is currently unavailable.' } });
    }
  }

  // Check IP rate limit
  const ipLimit = await checkIpOAuthRateLimit(ipHash);
  if (!ipLimit.allowed) {
    return res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: `Too many attempts. Please wait ${ipLimit.retryAfterSeconds} seconds.`,
        retryAfterSeconds: ipLimit.retryAfterSeconds,
      },
    });
  }

  // Check token signature
  const verifiedToken = verifySignedSessionToken(token, env.TOKEN_SIGNING_SECRET);
  if (!verifiedToken) {
    const session = await findSessionByToken(token);
    if (!session) {
      return res.status(400).json({ error: { code: 'INVALID_TOKEN', message: 'Verification link is invalid.' } });
    }

    if (new Date(session.expires_at).getTime() < Date.now()) {
      return res.status(410).json({ error: { code: 'EXPIRED', message: 'Verification link has expired.' } });
    }

    if (session.status === 'VERIFIED') {
      return res.json({ status: 'ALREADY_VERIFIED', message: 'Account is already verified.' });
    }

    await updateSessionStatus(session.id, 'IN_PROGRESS');
    const authorizeUrl = getDiscordAuthorizeUrl(session.oauth_state);
    return res.json({ status: 'OK', authorizeUrl });
  }

  if (verifiedToken.isExpired) {
    return res.status(410).json({ error: { code: 'EXPIRED', message: 'Verification link has expired.' } });
  }

  const session = await findSessionById(verifiedToken.sessionId);
  if (!session) {
    return res.status(404).json({ error: { code: 'SESSION_NOT_FOUND', message: 'Session not found.' } });
  }

  if (session.status === 'VERIFIED') {
    return res.json({ status: 'ALREADY_VERIFIED', message: 'Account is already verified.' });
  }

  await updateSessionStatus(session.id, 'IN_PROGRESS');
  const authorizeUrl = getDiscordAuthorizeUrl(session.oauth_state);
  return res.json({ status: 'OK', authorizeUrl });
});

/**
 * POST /api/verify/process
 * Executes OAuth2 code exchange, role assignment, and database state update
 */
router.post('/process', async (req: Request, res: Response) => {
  const { code, state } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || '127.0.0.1';

  if (!code || !state) {
    return res.status(400).json({ error: { code: 'INVALID_PARAMS', message: 'Code and state are required.' } });
  }

  try {
    const result = await processOAuthCallback({
      code,
      state,
      clientIp,
    });

    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown internal error';
    logger.error({ err }, 'Error in /api/verify/process');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message } });
  }
});

/**
 * GET /api/verify/status/:sessionId
 */
router.get('/status/:sessionId', async (req: Request, res: Response) => {
  try {
    const session = await findSessionById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    }

    res.json({
      sessionId: session.id,
      status: session.status,
      isExpired: new Date(session.expires_at).getTime() < Date.now(),
    });
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to check status' } });
  }
});

export default router;
