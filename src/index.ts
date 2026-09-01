import http from 'http';
import { loadEnv, getEnv } from './config/env.js';
import { logger } from './utils/logger.js';
import { createExpressApp } from './api/server.js';
import { getDiscordClient } from './bot/client.js';
import { handleReady } from './bot/events/ready.js';
import { stopReconciliationScheduler } from './bot/reconciliation.js';

async function bootstrap() {
  // 1. Load and validate environment configuration
  const env = loadEnv();
  logger.info({ nodeEnv: env.NODE_ENV, port: env.PORT, appUrl: env.APP_URL }, 'Starting Discord Verification Platform');

  // 2. Initialize Express Application & HTTP Server
  const app = createExpressApp();
  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info(`HTTP Web & API Server listening on port ${env.PORT}`);
  });

  // 3. Initialize Discord Gateway Client
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

  // 4. Graceful Shutdown Handlers (Render SIGTERM support)
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Graceful shutdown initiated');

    // Stop background jobs
    stopReconciliationScheduler();

    // Close HTTP Server
    server.close(() => {
      logger.info('HTTP server connections closed');
    });

    // Destroy Discord Gateway WebSocket cleanly
    try {
      client.destroy();
      logger.info('Discord client destroyed');
    } catch (err) {
      logger.warn({ err }, 'Error destroying Discord client during shutdown');
    }

    setTimeout(() => {
      logger.info('Shutdown complete. Process exiting.');
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
