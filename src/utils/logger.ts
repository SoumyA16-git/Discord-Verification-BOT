import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  redact: {
    paths: [
      'token',
      'botToken',
      'clientSecret',
      'serviceRoleKey',
      'sessionSecret',
      'password',
      'authorization',
      'cookie',
      'headers.cookie',
      'headers.authorization',
      'code',
      'access_token',
      'refresh_token',
      '*.token',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

export interface LogContext {
  event?: string;
  guildId?: string;
  userId?: string;
  adminId?: string;
  sessionId?: string;
  [key: string]: unknown;
}

export function createScopedLogger(context: LogContext) {
  return logger.child(context);
}
