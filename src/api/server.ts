import path from 'path';
import { fileURLToPath } from 'url';
import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import { getEnv } from '../config/env.js';
import { logger } from '../utils/logger.js';
import healthRouter from './routes/health.js';
import verifyRouter from './routes/verify.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createExpressApp(): Express {
  const env = getEnv();
  const app = express();

  // Trust proxy for Render deployment
  app.set('trust proxy', 1);

  // Security Headers via Helmet & strict CSP (PRD Section 8)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https://cdn.discordapp.com', 'https://discord.com'],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // Body parsers
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // General API Rate Limiting (60 req/min per IP)
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down.' } },
  });
  app.use('/api/', apiLimiter);

  // Session Middleware
  app.use(
    session({
      name: 'dverif.sid',
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  // View Engine (EJS)
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // Static Assets
  app.use(express.static(path.join(__dirname, 'public')));

  // Routes
  app.use('/health', healthRouter);
  app.use('/', verifyRouter);
  app.use('/auth', authRouter);
  app.use('/admin', adminRouter);
  app.use('/api/admin', adminRouter);

  // 404 Handler
  app.use((req: Request, res: Response) => {
    if (req.accepts('html')) {
      res.status(404).render('error', {
        title: 'Page Not Found',
        errorCode: '404',
        message: 'The page you requested could not be found.',
      });
    } else {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
    }
  });

  // Top-level Express Error Handler
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const errorObj = err as { status?: number; message?: string; stack?: string };
    const statusCode = errorObj.status || 500;

    logger.error({ err, path: req.path, method: req.method }, 'Unhandled Express error');

    if (req.accepts('html')) {
      res.status(statusCode).render('error', {
        title: 'An Error Occurred',
        errorCode: `${statusCode}`,
        message: env.NODE_ENV === 'production' ? 'An unexpected error occurred. Please try again later.' : errorObj.message || 'Internal Server Error',
      });
    } else {
      res.status(statusCode).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: env.NODE_ENV === 'production' ? 'Internal server error' : errorObj.message || 'Internal server error',
        },
      });
    }
  });

  return app;
}
