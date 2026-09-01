import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { getEnv } from '../config/env.js';
import { logger } from '../utils/logger.js';
import healthRouter from './routes/health.js';
import verifyApiRouter from './routes/verifyApi.js';
import adminApiRouter from './routes/adminApi.js';

export function createExpressApp(): Express {
  const env = getEnv();
  const app = express();

  app.set('trust proxy', 1);

  // Security Headers
  app.use(helmet());

  // CORS for Vercel Frontend
  const allowedOrigins = [
    env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
          callback(null, true);
        } else {
          callback(null, true); // Permissive in dev
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret'],
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // General API Rate Limiter
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down.' } },
  });
  app.use('/api/', apiLimiter);

  // Routes
  app.use('/health', healthRouter);
  app.use('/api/verify', verifyApiRouter);
  app.use('/api/admin', adminApiRouter);

  // 404
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API Endpoint not found' } });
  });

  // Top-level Error Handler
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const errorObj = err as { status?: number; message?: string };
    const statusCode = errorObj.status || 500;
    logger.error({ err, path: req.path, method: req.method }, 'Unhandled API error');

    res.status(statusCode).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: env.NODE_ENV === 'production' ? 'Internal server error' : errorObj.message || 'Internal server error',
      },
    });
  });

  return app;
}
