import http from 'http';
import { loadEnv } from './config/env.js';
import { logger } from './utils/logger.js';
import { createExpressApp } from './api/server.js';
import { getDiscordClient } from './bot/client.js';
import { handleReady } from './bot/events/ready.js';
import { stopReconciliationScheduler } from './bot/reconciliation.js';

async function bootstrap() {
  const env = loadEnv();
  logger.info({ nodeEnv: env.NODE_ENV, port: env.PORT, frontendUrl: env.FRONTEND_URL }, 'Starting Discord Verification Backend');

  const app = createExpressApp();
  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info(`REST API Server listening on port ${env.PORT}`);
  });

  const client = getDiscordClient();

  client.once('ready', (readyClient) => {
    handleReady(readyClient).catch((err) => {
      logger.error({ err }, 'Error in Discord client ready handler');
    });
  });

  try {
    await client.login(env.DISCORD_BOT_TOKEN);
  } catch (err) {
    logger.error({ err }, 'Failed to login to Discord Gateway. Check DISCORD_BOT_TOKEN.');
  }

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Graceful shutdown initiated');
    stopReconciliationScheduler();

    server.close(() => {
      logger.info('HTTP server closed');
    });

    try {
      client.destroy();
      logger.info('Discord client destroyed');
    } catch (err) {
      logger.warn({ err }, 'Error destroying Discord client during shutdown');
    }

    setTimeout(() => {
      logger.info('Shutdown complete. Exiting.');
      process.exit(0);
    }, 1000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled Promise Rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught Exception');
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Fatal bootstrap failure');
  process.exit(1);
});
