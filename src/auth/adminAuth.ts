import { Request, Response, NextFunction } from 'express';
import { getEnv } from '../config/env.js';
import { findAdminById, findAdminByDiscordId, upsertAdminUser } from '../database/queries/adminUsers.js';
import { findWebSession } from '../database/queries/webSessions.js';
import { AdminRole, AdminUserRow } from '../database/types.js';
import { logger } from '../utils/logger.js';

// Extend Express Session & Request types
declare module 'express-session' {
  interface SessionData {
    adminId?: string;
    discordId?: string;
    role?: AdminRole;
    guildId?: string;
    isSecretAuth?: boolean;
  }
}

declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        discordId: string;
        guildId: string;
        role: AdminRole;
        isSecretAuth?: boolean;
      };
    }
  }
}

/**
 * Bootstrap the initial admin if INITIAL_ADMIN_DISCORD_ID is configured
 */
export async function bootstrapInitialAdmin(guildId: string): Promise<void> {
  const env = getEnv();
  if (!env.INITIAL_ADMIN_DISCORD_ID) return;

  try {
    const existing = await findAdminByDiscordId(env.INITIAL_ADMIN_DISCORD_ID, guildId);
    if (!existing) {
      await upsertAdminUser({
        discordId: env.INITIAL_ADMIN_DISCORD_ID,
        guildId,
        role: 'owner',
      });
      logger.info(
        { discordId: env.INITIAL_ADMIN_DISCORD_ID, guildId },
        'Bootstrapped initial owner admin account'
      );
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to bootstrap initial admin account');
  }
}

/**
 * Middleware: Require authenticated admin session or valid emergency secret
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const env = getEnv();

  // 1. Check emergency/dev Admin Secret header
  const secretHeader = req.headers['x-admin-secret'] as string | undefined;
  if (env.ADMIN_SECRET && secretHeader && secretHeader === env.ADMIN_SECRET) {
    req.admin = {
      id: 'emergency-admin-id',
      discordId: env.INITIAL_ADMIN_DISCORD_ID || '000000000000000000',
      guildId: req.query.guildId as string || 'default',
      role: 'owner',
      isSecretAuth: true,
    };
    return next();
  }

  // 2. Check session state
  const session = req.session;
  if (!session || !session.adminId) {
    if (req.accepts('html')) {
      return res.redirect('/admin/login');
    }
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Admin authentication required' } });
    return;
  }

  // If secret auth was stored in session
  if (session.isSecretAuth) {
    req.admin = {
      id: session.adminId,
      discordId: session.discordId || '000000000000000000',
      guildId: session.guildId || 'default',
      role: (session.role as AdminRole) || 'owner',
      isSecretAuth: true,
    };
    return next();
  }

  try {
    const admin = await findAdminById(session.adminId);
    if (!admin) {
      req.session.destroy(() => {});
      if (req.accepts('html')) {
        return res.redirect('/admin/login');
      }
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Admin account not found or revoked' } });
      return;
    }

    req.admin = {
      id: admin.id,
      discordId: admin.discord_id,
      guildId: admin.guild_id,
      role: admin.role,
    };

    next();
  } catch (err) {
    logger.error({ err }, 'Error in requireAdmin middleware');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Authentication verification failed' } });
  }
}

/**
 * Middleware: Require Owner role for high-privilege operations (e.g. manual verify override)
 */
export function requireOwner(req: Request, res: Response, next: NextFunction): void {
  if (!req.admin || req.admin.role !== 'owner') {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'This operation requires the Server Owner role' },
    });
    return;
  }
  next();
}
