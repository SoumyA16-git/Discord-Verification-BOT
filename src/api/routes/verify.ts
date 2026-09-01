import { Router, Request, Response } from 'express';
import { getEnv } from '../../config/env.js';
import { verifySignedSessionToken, hashIp } from '../../utils/crypto.js';
import { findSessionByToken, findSessionById, updateSessionStatus } from '../../database/queries/sessions.js';
import { getDiscordAuthorizeUrl } from '../../auth/oauth.js';
import { checkIpOAuthRateLimit } from '../../services/rateLimiter.js';
import { logger } from '../../utils/logger.js';

const router = Router();

/**
 * GET / — Landing Page
 */
router.get('/', (_req: Request, res: Response) => {
  const env = getEnv();
  const botInviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${env.DISCORD_CLIENT_ID}&permissions=268435456&scope=bot%20applications.commands`;

  res.render('landing', {
    title: 'Discord Verification Platform',
    botInviteUrl,
    appUrl: env.APP_URL,
  });
});

/**
 * GET /verify — Verification Entry Point (Validates signed token & initiates OAuth2)
 */
router.get('/verify', async (req: Request, res: Response) => {
  const env = getEnv();
  const token = req.query.token as string | undefined;
  const clientIp = req.ip || '127.0.0.1';
  const ipHash = hashIp(clientIp, env.SESSION_SECRET);

  if (!token) {
    return res.render('error', {
      title: 'Invalid Verification Link',
      errorCode: 'MISSING_TOKEN',
      message: 'No verification token was provided. Please use the /verify command in your Discord server.',
    });
  }

  // Check IP rate limit for OAuth initiation
  const ipLimit = await checkIpOAuthRateLimit(ipHash);
  if (!ipLimit.allowed) {
    return res.status(429).render('failure', {
      title: 'Rate Limit Exceeded',
      reason: `Too many verification attempts from this network. Please wait ${ipLimit.retryAfterSeconds} seconds before trying again.`,
    });
  }

  // 1. Verify cryptographic token signature
  const verifiedToken = verifySignedSessionToken(token, env.TOKEN_SIGNING_SECRET);
  if (!verifiedToken) {
    // Fallback: check database directly
    const session = await findSessionByToken(token);
    if (!session) {
      return res.render('error', {
        title: 'Invalid Token',
        errorCode: 'INVALID_TOKEN',
        message: 'This verification link is invalid or has been tampered with.',
      });
    }

    if (new Date(session.expires_at).getTime() < Date.now()) {
      return res.render('expired', {
        title: 'Verification Link Expired',
        message: 'This verification link has expired. Please run /verify in Discord to generate a new one.',
      });
    }

    if (session.status === 'VERIFIED') {
      return res.render('already', {
        title: 'Already Verified',
        message: 'Your account is already verified in this Discord server.',
      });
    }

    await updateSessionStatus(session.id, 'IN_PROGRESS');
    const authorizeUrl = getDiscordAuthorizeUrl(session.oauth_state);
    return res.redirect(authorizeUrl);
  }

  if (verifiedToken.isExpired) {
    return res.render('expired', {
      title: 'Verification Link Expired',
      message: 'This verification link has expired. Please run /verify in Discord to generate a new one.',
    });
  }

  // Look up session in DB
  const session = await findSessionById(verifiedToken.sessionId);
  if (!session) {
    return res.render('error', {
      title: 'Session Not Found',
      errorCode: 'SESSION_NOT_FOUND',
      message: 'The verification session could not be found.',
    });
  }

  if (session.status === 'VERIFIED') {
    return res.render('already', {
      title: 'Already Verified',
      message: 'Your account is already verified in this server.',
    });
  }

  await updateSessionStatus(session.id, 'IN_PROGRESS');
  const authorizeUrl = getDiscordAuthorizeUrl(session.oauth_state);
  return res.redirect(authorizeUrl);
});

/**
 * Result Pages
 */
router.get('/verify/success', (req: Request, res: Response) => {
  res.render('success', {
    title: 'Verification Successful',
    guildName: (req.query.guild as string) || 'Discord Server',
    username: (req.query.user as string) || 'Member',
  });
});

router.get('/verify/failure', (req: Request, res: Response) => {
  res.render('failure', {
    title: 'Verification Failed',
    reason: (req.query.reason as string) || 'Unable to complete verification. Please try again.',
  });
});

router.get('/verify/already', (req: Request, res: Response) => {
  res.render('already', {
    title: 'Already Verified',
    guildName: (req.query.guild as string) || 'Discord Server',
  });
});

router.get('/verify/expired', (_req: Request, res: Response) => {
  res.render('expired', {
    title: 'Session Expired',
    message: 'Your verification link has expired. Please run /verify in your Discord server.',
  });
});

/**
 * Polling status check for cold-start / waking-up page
 */
router.get('/api/verify/status/:sessionId', async (req: Request, res: Response) => {
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
    logger.error({ err }, 'Error checking session status');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to check status' } });
  }
});

export default router;
