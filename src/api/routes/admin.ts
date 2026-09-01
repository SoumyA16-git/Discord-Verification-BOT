import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getEnv } from '../../config/env.js';
import { requireAdmin, requireOwner } from '../../auth/adminAuth.js';
import { getDb, checkDbHealth } from '../../database/client.js';
import { getDiscordClient } from '../../bot/client.js';
import { findAdminByDiscordId, upsertAdminUser, listAdminsForGuild } from '../../database/queries/adminUsers.js';
import { getGuildConfig, updateGuildConfig, upsertGuildConfig } from '../../database/queries/guildConfig.js';
import { findGuildById, findGuildByDiscordId } from '../../database/queries/guilds.js';
import { findUserById, findUserByDiscordId } from '../../database/queries/users.js';
import { getVerification, markVerificationVerified, markVerificationRevoked } from '../../database/queries/verifications.js';
import { getGuildAttemptStats, recordAttempt } from '../../database/queries/attempts.js';
import { createAuditLog, getGuildAuditLogs } from '../../database/queries/auditLogs.js';
import { createVerificationSession } from '../../database/queries/sessions.js';
import { createSignedSessionToken, generateRandomToken } from '../../utils/crypto.js';
import { assignVerifiedRole, removeVerifiedRole, testGuildPermissions } from '../../services/roleService.js';
import { exchangeCodeForUser, getDiscordAuthorizeUrl } from '../../auth/oauth.js';
import { createWebSession, deleteWebSession } from '../../database/queries/webSessions.js';
import { logger } from '../../utils/logger.js';
import { AuditEventType } from '../../database/types.js';

const router = Router();

// Validation Schemas
const updateConfigSchema = z.object({
  verified_role_id: z.string().optional().nullable(),
  unverified_role_id: z.string().optional().nullable(),
  verification_channel_id: z.string().optional().nullable(),
  log_channel_id: z.string().optional().nullable(),
  verification_enabled: z.boolean().optional(),
  verification_message: z.string().max(500).optional().nullable(),
  session_expiration_minutes: z.coerce.number().min(1).max(1440).optional(),
  rate_limit_attempts: z.coerce.number().min(1).max(100).optional(),
  rate_limit_window_minutes: z.coerce.number().min(1).max(1440).optional(),
});

/**
 * GET /admin/login — Admin Login Page
 */
router.get('/login', (req: Request, res: Response) => {
  const env = getEnv();
  const oauthUrl = getDiscordAuthorizeUrl('admin_login_state', env.DISCORD_ADMIN_REDIRECT_URI);
  const error = req.query.error as string | undefined;

  res.render('admin/login', {
    title: 'Admin Login',
    oauthUrl,
    hasAdminSecret: !!env.ADMIN_SECRET,
    error,
  });
});

/**
 * POST /admin/login — Fallback Secret Key Login
 */
router.post('/login', async (req: Request, res: Response) => {
  const env = getEnv();
  const secret = req.body.secret as string | undefined;

  if (env.ADMIN_SECRET && secret && secret === env.ADMIN_SECRET) {
    // Determine default guild
    const db = getDb();
    const { data: defaultGuild } = await db.from('guilds').select('id').limit(1).maybeSingle();
    const guildId = defaultGuild?.id || '00000000-0000-0000-0000-000000000000';

    req.session.adminId = 'emergency-admin-id';
    req.session.discordId = env.INITIAL_ADMIN_DISCORD_ID || '000000000000000000';
    req.session.role = 'owner';
    req.session.guildId = guildId;
    req.session.isSecretAuth = true;

    return res.redirect('/admin');
  }

  res.render('admin/login', {
    title: 'Admin Login',
    oauthUrl: getDiscordAuthorizeUrl('admin_login_state', env.DISCORD_ADMIN_REDIRECT_URI),
    hasAdminSecret: !!env.ADMIN_SECRET,
    error: 'Invalid admin secret passkey.',
  });
});

/**
 * GET /admin/auth/callback — Admin OAuth2 Callback
 */
router.get('/auth/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  const env = getEnv();

  if (!code) {
    return res.redirect('/admin/login?error=OAuth+authentication+cancelled');
  }

  try {
    const discordUser = await exchangeCodeForUser(code, env.DISCORD_ADMIN_REDIRECT_URI);

    // Look up in admin_users
    let admin = await findAdminByDiscordId(discordUser.id);

    // Check bootstrap
    if (!admin && env.INITIAL_ADMIN_DISCORD_ID && discordUser.id === env.INITIAL_ADMIN_DISCORD_ID) {
      const db = getDb();
      const { data: firstGuild } = await db.from('guilds').select('id').limit(1).maybeSingle();
      const guildId = firstGuild?.id || '00000000-0000-0000-0000-000000000000';

      admin = await upsertAdminUser({
        discordId: discordUser.id,
        guildId,
        role: 'owner',
      });
    }

    if (!admin) {
      logger.warn({ discordId: discordUser.id }, 'Unauthorized admin login attempt');
      return res.redirect('/admin/login?error=Your+Discord+account+is+not+authorized+as+an+admin.');
    }

    // Set session
    req.session.adminId = admin.id;
    req.session.discordId = admin.discord_id;
    req.session.role = admin.role;
    req.session.guildId = admin.guild_id;

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await createWebSession(req.sessionID, admin.id, expiresAt);

    await createAuditLog({
      guildId: admin.guild_id,
      adminId: admin.id,
      eventType: 'admin_action',
      metadata: { action: 'admin_login', discord_id: admin.discord_id },
    });

    res.redirect('/admin');
  } catch (err) {
    logger.error({ err }, 'Error in admin OAuth callback');
    res.redirect('/admin/login?error=Authentication+failed');
  }
});

/**
 * POST /admin/logout
 */
router.post('/logout', async (req: Request, res: Response) => {
  if (req.sessionID) {
    await deleteWebSession(req.sessionID).catch(() => {});
  }
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

// ==============================================================================
// PROTECTED ADMIN ROUTES (requireAdmin)
// ==============================================================================

/**
 * Helper: Resolve active guild for admin session
 */
async function resolveAdminGuildId(req: Request): Promise<string> {
  if (req.admin?.guildId && req.admin.guildId !== 'default' && req.admin.guildId !== '00000000-0000-0000-0000-000000000000') {
    return req.admin.guildId;
  }
  const db = getDb();
  const { data } = await db.from('guilds').select('id').limit(1).maybeSingle();
  return data?.id || '';
}

/**
 * GET /admin — Overview Dashboard
 */
router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const guildId = await resolveAdminGuildId(req);
    const db = getDb();

    // 1. Fetch Guild Info
    const guild = guildId ? await findGuildById(guildId) : null;
    const guildConfig = guildId ? await getGuildConfig(guildId) : null;

    // 2. Member Statistics
    const { count: totalUsers } = await db.from('users').select('*', { count: 'exact', head: true });
    const { count: verifiedUsers } = await db
      .from('verifications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'VERIFIED')
      .eq('guild_id', guildId || '');

    const unverifiedUsers = (totalUsers || 0) - (verifiedUsers || 0);

    // 3. Attempt Stats (24h, 7d, 30d)
    const now = Date.now();
    const stats24h = await getGuildAttemptStats(guildId, new Date(now - 24 * 60 * 60 * 1000));
    const stats7d = await getGuildAttemptStats(guildId, new Date(now - 7 * 24 * 60 * 60 * 1000));
    const stats30d = await getGuildAttemptStats(guildId, new Date(now - 30 * 24 * 60 * 60 * 1000));

    const totalAttempts = stats30d.total;
    const successRate = totalAttempts > 0 ? Math.round((stats30d.success / totalAttempts) * 100) : 100;

    // 4. System Health
    const client = getDiscordClient();
    const dbHealth = await checkDbHealth();

    // 5. Recent 20 Audit Logs
    const { logs: recentLogs } = await getGuildAuditLogs({ guildId, limit: 20 });

    res.render('admin/overview', {
      title: 'Admin Dashboard',
      admin: req.admin,
      guild,
      guildConfig,
      metrics: {
        totalUsers: totalUsers || 0,
        verifiedUsers: verifiedUsers || 0,
        unverifiedUsers: Math.max(0, unverifiedUsers),
        stats24h,
        stats7d,
        stats30d,
        successRate,
      },
      health: {
        botReady: client.isReady() && client.ws.status === 0,
        dbOk: dbHealth.ok,
        dbLatencyMs: dbHealth.latencyMs || 0,
      },
      recentLogs,
    });
  } catch (err) {
    logger.error({ err }, 'Error loading admin overview');
    res.status(500).render('error', { title: 'Admin Error', errorCode: '500', message: 'Failed to load dashboard data.' });
  }
});

/**
 * GET /api/admin/overview
 */
router.get('/overview', requireAdmin, async (req: Request, res: Response) => {
  const guildId = await resolveAdminGuildId(req);
  const stats24h = await getGuildAttemptStats(guildId, new Date(Date.now() - 24 * 60 * 60 * 1000));
  const stats7d = await getGuildAttemptStats(guildId, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const stats30d = await getGuildAttemptStats(guildId, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  res.json({
    guildId,
    stats: { stats24h, stats7d, stats30d },
  });
});

/**
 * GET /admin/members — Member Search & List
 */
router.get('/members', requireAdmin, async (req: Request, res: Response) => {
  const query = (req.query.q as string || '').trim();
  const guildId = await resolveAdminGuildId(req);
  const db = getDb();

  let membersQuery = db
    .from('users')
    .select(`
      id,
      discord_id,
      username,
      created_at,
      verifications!left(status, role_assigned, verified_at, updated_at)
    `)
    .limit(50);

  if (query) {
    if (/^\d{17,20}$/.test(query)) {
      membersQuery = membersQuery.eq('discord_id', query);
    } else {
      membersQuery = membersQuery.ilike('username', `%${query}%`);
    }
  }

  const { data: members, error } = await membersQuery;

  if (error) {
    logger.error({ error }, 'Error searching members');
  }

  if (req.accepts('html')) {
    res.render('admin/members', {
      title: 'Member Management',
      admin: req.admin,
      members: members || [],
      query,
    });
  } else {
    res.json({ members: members || [] });
  }
});

/**
 * GET /admin/members/:userId — Member Detail
 */
router.get('/members/:userId', requireAdmin, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const guildId = await resolveAdminGuildId(req);
  const db = getDb();

  const user = await findUserById(userId);
  if (!user) {
    return res.status(404).render('error', { title: 'User Not Found', errorCode: '404', message: 'User not found in system.' });
  }

  const verification = await getVerification(userId, guildId);

  // Fetch attempts history
  const { data: attempts } = await db
    .from('verification_attempts')
    .select('*')
    .eq('user_id', userId)
    .eq('guild_id', guildId)
    .order('created_at', { ascending: false })
    .limit(20);

  // Fetch user audit history
  const { data: auditLogs } = await db
    .from('audit_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (req.accepts('html')) {
    res.render('admin/member-detail', {
      title: `Member Detail — ${user.username || user.discord_id}`,
      admin: req.admin,
      user,
      verification,
      attempts: attempts || [],
      auditLogs: auditLogs || [],
    });
  } else {
    res.json({ user, verification, attempts, auditLogs });
  }
});

/**
 * POST /api/admin/members/:userId/verify — Manual Override (Owner only)
 */
router.post('/members/:userId/verify', requireAdmin, requireOwner, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const guildId = await resolveAdminGuildId(req);
  const user = await findUserById(userId);
  const guild = await findGuildById(guildId);
  const config = await getGuildConfig(guildId);

  if (!user || !guild || !config || !config.verified_role_id) {
    return res.status(400).json({ error: { code: 'INVALID_CONFIG', message: 'User or guild configuration is incomplete' } });
  }

  // Assign Discord role
  const roleResult = await assignVerifiedRole({
    discordGuildId: guild.discord_guild_id,
    discordUserId: user.discord_id,
    verifiedRoleId: config.verified_role_id,
    unverifiedRoleId: config.unverified_role_id,
    internalGuildId: guildId,
    internalUserId: userId,
  });

  if (!roleResult.success) {
    return res.status(500).json({ error: { code: 'ROLE_ASSIGN_FAILED', message: roleResult.error } });
  }

  await markVerificationVerified({ userId, guildId });
  await recordAttempt({ userId, guildId, result: 'SUCCESS' });
  await createAuditLog({
    guildId,
    userId,
    adminId: req.admin?.id,
    eventType: 'admin_action',
    metadata: { action: 'manual_verify_override' },
  });

  res.json({ success: true, message: 'Member verified successfully' });
});

/**
 * POST /api/admin/members/:userId/revoke — Revoke Verification
 */
router.post('/members/:userId/revoke', requireAdmin, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const reason = (req.body.reason as string) || 'Revoked by admin';
  const guildId = await resolveAdminGuildId(req);
  const user = await findUserById(userId);
  const guild = await findGuildById(guildId);
  const config = await getGuildConfig(guildId);

  if (!user || !guild || !config || !config.verified_role_id) {
    return res.status(400).json({ error: { code: 'INVALID_CONFIG', message: 'User or guild configuration incomplete' } });
  }

  // Remove role from Discord
  await removeVerifiedRole({
    discordGuildId: guild.discord_guild_id,
    discordUserId: user.discord_id,
    verifiedRoleId: config.verified_role_id,
    unverifiedRoleId: config.unverified_role_id,
  });

  await markVerificationRevoked({ userId, guildId, revokedByAdminId: req.admin?.id });
  await createAuditLog({
    guildId,
    userId,
    adminId: req.admin?.id,
    eventType: 'verification_revoked',
    metadata: { reason },
  });

  res.json({ success: true, message: 'Verification revoked' });
});

/**
 * POST /api/admin/members/:userId/reverify — Force Re-verification
 */
router.post('/members/:userId/reverify', requireAdmin, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const guildId = await resolveAdminGuildId(req);
  const env = getEnv();
  const user = await findUserById(userId);
  const config = await getGuildConfig(guildId);

  if (!user || !config) {
    return res.status(400).json({ error: { code: 'NOT_FOUND', message: 'User or config not found' } });
  }

  const oauthState = generateRandomToken(32);
  const expiresAt = new Date(Date.now() + (config.session_expiration_minutes || 15) * 60 * 1000);
  const signedToken = createSignedSessionToken(user.id, guildId, expiresAt, env.TOKEN_SIGNING_SECRET);

  const session = await createVerificationSession({
    userId: user.id,
    guildId,
    oauthState,
    signedToken,
    expiresAt,
  });

  const verifyUrl = `${env.APP_URL}/verify?token=${encodeURIComponent(signedToken)}`;

  await createAuditLog({
    guildId,
    userId: user.id,
    adminId: req.admin?.id,
    eventType: 'admin_force_reverify',
    metadata: { sessionId: session.id },
  });

  res.json({ success: true, verifyUrl, sessionId: session.id });
});

/**
 * GET /admin/config & /api/admin/config
 */
router.get('/config', requireAdmin, async (req: Request, res: Response) => {
  const guildId = await resolveAdminGuildId(req);
  const guild = await findGuildById(guildId);
  const config = await getGuildConfig(guildId);

  if (req.accepts('html')) {
    res.render('admin/config', {
      title: 'Server Configuration',
      admin: req.admin,
      guild,
      config: config || {},
      message: req.query.saved ? 'Configuration saved successfully!' : null,
    });
  } else {
    res.json({ guild, config });
  }
});

/**
 * PATCH & POST /api/admin/config — Update Guild Config
 */
const handleConfigUpdate = async (req: Request, res: Response) => {
  const guildId = await resolveAdminGuildId(req);
  const parsed = updateConfigSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.issues } });
  }

  const updated = await upsertGuildConfig({
    guild_id: guildId,
    ...parsed.data,
  });

  await createAuditLog({
    guildId,
    adminId: req.admin?.id,
    eventType: 'configuration_changed',
    metadata: parsed.data,
  });

  if (req.headers['content-type']?.includes('application/json')) {
    res.json({ success: true, config: updated });
  } else {
    res.redirect('/admin/config?saved=true');
  }
};

router.patch('/config', requireAdmin, handleConfigUpdate);
router.post('/config', requireAdmin, handleConfigUpdate);

/**
 * POST /api/admin/config/test — Dry Run Permissions & Hierarchy
 */
router.post('/config/test', requireAdmin, async (req: Request, res: Response) => {
  const guildId = await resolveAdminGuildId(req);
  const guild = await findGuildById(guildId);
  const config = await getGuildConfig(guildId);

  if (!guild) {
    return res.status(404).json({ error: { code: 'GUILD_NOT_FOUND', message: 'Guild not found' } });
  }

  const check = await testGuildPermissions({
    discordGuildId: guild.discord_guild_id,
    verifiedRoleId: config?.verified_role_id,
    unverifiedRoleId: config?.unverified_role_id,
    channelId: config?.verification_channel_id,
  });

  res.json(check);
});

/**
 * GET /admin/logs & /api/admin/logs — Audit Logs
 */
router.get('/logs', requireAdmin, async (req: Request, res: Response) => {
  const guildId = await resolveAdminGuildId(req);
  const eventType = req.query.event as AuditEventType | undefined;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = 30;
  const offset = (page - 1) * limit;

  const { logs, total } = await getGuildAuditLogs({
    guildId,
    limit,
    offset,
    eventType,
  });

  const totalPages = Math.ceil(total / limit);

  if (req.accepts('html')) {
    res.render('admin/logs', {
      title: 'Audit Logs Feed',
      admin: req.admin,
      logs,
      total,
      currentPage: page,
      totalPages,
      selectedEvent: eventType || '',
    });
  } else {
    res.json({ logs, total, page, totalPages });
  }
});

export default router;
