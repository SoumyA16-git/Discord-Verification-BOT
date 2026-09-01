import { Request, Response, NextFunction } from 'express';
import { getEnv } from '../config/env.js';
import { findAdminById, findAdminByDiscordId, upsertAdminUser } from '../database/queries/adminUsers.js';
import { verifyAdminToken } from '../utils/crypto.js';
import { AdminRole, AdminUserRow } from '../database/types.js';
import { logger } from '../utils/logger.js';

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

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const env = getEnv();

  // 1. Check emergency passkey header
  const secretHeader = req.headers['x-admin-secret'] as string | undefined;
  if (env.ADMIN_SECRET && secretHeader && secretHeader === env.ADMIN_SECRET) {
    req.admin = {
      id: 'emergency-admin-id',
      discordId: env.INITIAL_ADMIN_DISCORD_ID || '000000000000000000',
      guildId: (req.query.guildId as string) || 'default',
      role: 'owner',
      isSecretAuth: true,
    };
    return next();
  }

  // 2. Check Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } });
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAdminToken(token, env.JWT_SECRET);

  if (!payload) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired admin token' } });
    return;
  }

  req.admin = {
    id: payload.adminId,
    discordId: payload.discordId,
    guildId: payload.guildId,
    role: payload.role,
  };

  next();
}

export function requireOwner(req: Request, res: Response, next: NextFunction): void {
  if (!req.admin || req.admin.role !== 'owner') {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'This operation requires the Server Owner role' },
    });
    return;
  }
  next();
}
