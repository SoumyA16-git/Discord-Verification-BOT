import { Router, Request, Response } from 'express';
import { processOAuthCallback } from '../../verification/engine.js';
import { logger } from '../../utils/logger.js';

const router = Router();

/**
 * GET /auth/callback — Discord OAuth2 Authorization Callback
 */
router.get('/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const error = req.query.error as string | undefined;
  const errorDescription = req.query.error_description as string | undefined;
  const clientIp = req.ip || '127.0.0.1';

  // If user cancelled or Discord returned error
  if (error) {
    logger.warn({ error, errorDescription }, 'Discord OAuth2 returned an error');
    return res.redirect(
      `/verify/failure?reason=${encodeURIComponent(
        errorDescription || 'Discord authorization was cancelled or denied.'
      )}`
    );
  }

  if (!code || !state) {
    logger.warn({ code: !!code, state: !!state }, 'Missing code or state parameter in OAuth callback');
    return res.redirect('/verify/failure?reason=Invalid+OAuth2+callback+parameters');
  }

  try {
    const result = await processOAuthCallback({
      code,
      state,
      clientIp,
    });

    switch (result.status) {
      case 'VERIFIED':
        return res.redirect(
          `/verify/success?guild=${encodeURIComponent(result.guildName || 'Discord Server')}&user=${encodeURIComponent(
            result.user?.username || 'Member'
          )}`
        );

      case 'ALREADY_VERIFIED':
        return res.redirect(
          `/verify/already?guild=${encodeURIComponent(result.guildName || 'Discord Server')}`
        );

      case 'EXPIRED':
        return res.redirect('/verify/expired');

      case 'RATE_LIMITED':
        return res.redirect(
          `/verify/failure?reason=${encodeURIComponent(
            result.reason || 'Rate limit exceeded. Please try again later.'
          )}`
        );

      case 'INVALID_STATE':
        return res.redirect(
          '/verify/failure?reason=Invalid+or+expired+session+state.+Please+restart+verification+from+Discord.'
        );

      case 'FAILED':
      default:
        return res.redirect(
          `/verify/failure?reason=${encodeURIComponent(
            result.reason || 'Verification process failed. Please contact a server admin.'
          )}`
        );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown internal error';
    logger.error({ err }, 'Unhandled error in OAuth callback');
    return res.redirect(`/verify/failure?reason=${encodeURIComponent(message)}`);
  }
});

export default router;
