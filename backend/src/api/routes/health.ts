import { Router, Request, Response } from 'express';
import { getDiscordClient } from '../../bot/client.js';

const router = Router();
const startupTime = Date.now();

router.get('/', (_req: Request, res: Response) => {
  const client = getDiscordClient();
  const uptimeSeconds = Math.floor((Date.now() - startupTime) / 1000);
  const isGatewayConnected = client.isReady() && client.ws.status === 0;

  if (isGatewayConnected) {
    res.status(200).json({
      status: 'ok',
      uptime_seconds: uptimeSeconds,
      discord_gateway: 'connected',
      bot: {
        id: client.user?.id,
        username: client.user?.username,
        displayName: client.user?.displayName || client.user?.username,
        tag: client.user?.tag,
        avatar: client.user?.displayAvatarURL(),
      },
    });
  } else {
    res.status(503).json({
      status: 'degraded',
      uptime_seconds: uptimeSeconds,
      discord_gateway: client.isReady() ? 'reconnecting' : 'disconnected',
      bot: client.user ? {
        id: client.user.id,
        username: client.user.username,
        displayName: client.user.displayName || client.user.username,
        tag: client.user.tag,
        avatar: client.user.displayAvatarURL(),
      } : null,
    });
  }
});

export default router;
