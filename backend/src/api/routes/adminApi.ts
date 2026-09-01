import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel } from 'discord.js';
import { getEnv } from '../../config/env.js';
import { requireAdmin, requireOwner } from '../../auth/adminAuth.js';
import { getDb, checkDbHealth } from '../../database/client.js';
import { getDiscordClient } from '../../bot/client.js';
import { findAdminByDiscordId, upsertAdminUser } from '../../database/queries/adminUsers.js';
import { getGuildConfig, updateGuildConfig, upsertGuildConfig } from '../../database/queries/guildConfig.js';
import { findGuildById, upsertGuild, findGuildByDiscordId, findGuildByIdOrDiscordId } from '../../database/queries/guilds.js';
import { findUserById, findUserByDiscordId, upsertUser } from '../../database/queries/users.js';
import { getVerification, markVerificationVerified, markVerificationRevoked } from '../../database/queries/verifications.js';
import { getGuildAttemptStats, recordAttempt } from '../../database/queries/attempts.js';
import { createAuditLog, getGuildAuditLogs } from '../../database/queries/auditLogs.js';
import { createVerificationSession } from '../../database/queries/sessions.js';
import { createSignedSessionToken, generateRandomToken, signAdminToken } from '../../utils/crypto.js';
import { assignVerifiedRole, removeVerifiedRole, testGuildPermissions } from '../../services/roleService.js';
import { autoProvisionServerRoles } from '../../bot/services/roleOrchestrator.js';
import { exchangeCodeForTokens, fetchDiscordUserProfile, fetchDiscordUserGuilds } from '../../auth/oauth.js';
import { logger } from '../../utils/logger.js';
import { AuditEventType } from '../../database/types.js';

const router = Router();

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

function hasServerAdminPermissions(permissions: string, isOwner: boolean): boolean {
  if (isOwner) return true;
  try {
    const bits = BigInt(permissions || '0');
    const adminBit = 0x8n;
    const manageGuildBit = 0x20n;
    return (bits & adminBit) === adminBit || (bits & manageGuildBit) === manageGuildBit;
  } catch {
    return false;
  }
}

/**
 * POST /api/admin/auth/login
 * ONLY registers and returns servers where the bot is joined
 */
router.post('/auth/login', async (req: Request, res: Response) => {
  const env = getEnv();
  const { code, secret, guildId: requestedGuildId } = req.body;

  // 1. Passkey Login
  if (secret && env.ADMIN_SECRET && secret === env.ADMIN_SECRET) {
    const db = getDb();
    const { data: defaultGuild } = await db.from('guilds').select('id').limit(1).maybeSingle();
    const guildId = defaultGuild?.id || '00000000-0000-0000-0000-000000000000';

    const token = signAdminToken(
      {
        adminId: 'emergency-admin-id',
        discordId: env.INITIAL_ADMIN_DISCORD_ID || '000000000000000000',
        guildId,
        role: 'owner',
      },
      env.JWT_SECRET
    );

    return res.json({
      success: true,
      token,
      admin: {
        id: 'emergency-admin-id',
        discordId: env.INITIAL_ADMIN_DISCORD_ID || '000000000000000000',
        username: 'Emergency Administrator',
        avatar: null,
        role: 'owner',
        guildId,
      },
    });
  }

  // 2. Discord OAuth2 Login (identify + guilds)
  if (code) {
    try {
      const { accessToken } = await exchangeCodeForTokens(code, env.DISCORD_ADMIN_REDIRECT_URI);
      const discordUser = await fetchDiscordUserProfile(accessToken);
      const userGuilds = await fetchDiscordUserGuilds(accessToken);

      const client = getDiscordClient();
      const botGuildsCache = client.guilds?.cache || new Map();

      // Find all guilds user manages WHERE THE BOT IS PRESENT
      const managedGuildsWithBot = userGuilds.filter(
        (g) => hasServerAdminPermissions(g.permissions, g.owner) && botGuildsCache.has(g.id)
      );

      let activeGuildId = '';
      let activeAdminRole: 'admin' | 'owner' = 'admin';
      let adminRowId = 'admin-' + discordUser.id;

      const accessibleGuildsList: Array<{
        id: string;
        discordGuildId: string;
        name: string;
        icon: string | null;
        iconUrl: string | null;
        isOwner: boolean;
        hasBot: boolean;
      }> = [];

      for (const g of managedGuildsWithBot) {
        const dbGuild = await upsertGuild(g.id, g.name);

        const existingConfig = await getGuildConfig(dbGuild.id);
        if (!existingConfig) {
          await upsertGuildConfig({
            guild_id: dbGuild.id,
            verification_enabled: false,
            session_expiration_minutes: 15,
            rate_limit_attempts: 5,
            rate_limit_window_minutes: 10,
          });
        }

        const role = g.owner ? 'owner' : 'admin';
        const adminUser = await upsertAdminUser({
          discordId: discordUser.id,
          guildId: dbGuild.id,
          role,
        });

        if (!activeGuildId || (requestedGuildId && dbGuild.id === requestedGuildId)) {
          activeGuildId = dbGuild.id;
          activeAdminRole = role;
          adminRowId = adminUser.id;
        }

        const iconUrl = g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128` : null;

        accessibleGuildsList.push({
          id: dbGuild.id,
          discordGuildId: g.id,
          name: g.name,
          icon: g.icon,
          iconUrl,
          isOwner: g.owner,
          hasBot: true,
        });
      }

      // If user hasn't added bot to any of their servers yet
      if (!activeGuildId) {
        const token = signAdminToken(
          {
            adminId: adminRowId,
            discordId: discordUser.id,
            guildId: 'no-guild',
            role: 'owner',
          },
          env.JWT_SECRET
        );

        return res.json({
          success: true,
          token,
          admin: {
            id: adminRowId,
            discordId: discordUser.id,
            username: discordUser.username,
            avatar: discordUser.avatar,
            role: 'owner',
            guildId: '',
          },
          guilds: [],
        });
      }

      const token = signAdminToken(
        {
          adminId: adminRowId,
          discordId: discordUser.id,
          guildId: activeGuildId,
          role: activeAdminRole,
        },
        env.JWT_SECRET
      );

      logger.info({ discordId: discordUser.id, username: discordUser.username, connectedCount: accessibleGuildsList.length }, 'Admin logged in via Discord OAuth');

      return res.json({
        success: true,
        token,
        admin: {
          id: adminRowId,
          discordId: discordUser.id,
          username: discordUser.username,
          avatar: discordUser.avatar,
          role: activeAdminRole,
          guildId: activeGuildId,
        },
        guilds: accessibleGuildsList,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      logger.error({ err }, 'Admin Discord OAuth login error');
      return res.status(401).json({ error: { code: 'AUTH_FAILED', message: msg } });
    }
  }

  return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Either code or secret is required.' } });
});

async function resolveAdminGuildId(req: Request): Promise<string> {
  const queryGuild = (req.query.guildId as string | undefined)?.trim();
  if (queryGuild && queryGuild !== 'undefined' && queryGuild !== 'null' && queryGuild !== '') {
    const resolved = await findGuildByIdOrDiscordId(queryGuild);
    if (resolved) return resolved.id;
    return queryGuild;
  }
  
  const bodyGuild = (req.body?.guildId as string | undefined)?.trim();
  if (bodyGuild && bodyGuild !== 'undefined' && bodyGuild !== 'null' && bodyGuild !== '') {
    const resolved = await findGuildByIdOrDiscordId(bodyGuild);
    if (resolved) return resolved.id;
    return bodyGuild;
  }
  
  // Fallback: If token has a specific guild
  if (req.admin?.guildId && req.admin.guildId !== 'no-guild' && req.admin.guildId !== '') {
    const resolved = await findGuildByIdOrDiscordId(req.admin.guildId);
    if (resolved) return resolved.id;
  }

  // Fallback: Pick the first active guild where bot is present
  const db = getDb();
  const client = getDiscordClient();
  const botGuilds = client.guilds?.cache || new Map();
  const { data: allGuilds } = await db.from('guilds').select('id, discord_guild_id').limit(10);
  const matched = (allGuilds || []).find((g: any) => botGuilds.has(g.discord_guild_id));
  return matched?.id || allGuilds?.[0]?.id || '';
}

/**
 * GET /api/admin/guilds
 * Returns ONLY servers where the bot is joined
 */
router.get('/guilds', requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const client = getDiscordClient();
    const botGuilds = client.guilds?.cache || new Map();

    // Auto-sync all guilds currently cached in Discord Bot gateway to DB
    for (const [discordGuildId, discordGuild] of botGuilds.entries()) {
      await upsertGuild(discordGuildId, discordGuild.name).catch(() => null);
    }

    const { data: guilds } = await db.from('guilds').select(`
      id,
      discord_guild_id,
      name,
      created_at,
      guild_config!left(verification_enabled)
    `);

    // Filter to ONLY guilds where the bot is present in cache
    const result = (guilds || [])
      .filter((g: any) => botGuilds.has(g.discord_guild_id))
      .map((g: any) => {
        const discordGuild = botGuilds.get(g.discord_guild_id);
        const iconUrl = discordGuild?.icon ? discordGuild.iconURL({ size: 128 }) : null;
        const memberCount = discordGuild?.memberCount || 0;
        const verificationEnabled = g.guild_config?.[0]?.verification_enabled ?? false;

        return {
          id: g.id,
          discordGuildId: g.discord_guild_id,
          name: discordGuild?.name || g.name || 'Discord Server',
          hasBot: true,
          iconUrl,
          memberCount,
          verificationEnabled,
        };
      });

    res.json({ guilds: result });
  } catch (err) {
    logger.error({ err }, 'Error fetching admin guilds');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch server list' } });
  }
});

/**
 * GET /api/admin/guilds/:guildId/discord-data
 */
router.get('/guilds/:guildId/discord-data', requireAdmin, async (req: Request, res: Response) => {
  const { guildId } = req.params;
  const guild = await findGuildByIdOrDiscordId(guildId);
  if (!guild) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Guild not found in database' } });
  }

  const client = getDiscordClient();
  if (!client.isReady()) {
    return res.status(503).json({ error: { code: 'BOT_OFFLINE', message: 'Discord bot gateway is offline' } });
  }

  let discordGuild = client.guilds.cache.get(guild.discord_guild_id);
  if (!discordGuild) {
    try {
      discordGuild = await client.guilds.fetch(guild.discord_guild_id);
    } catch {
      // Ignored
    }
  }

  if (!discordGuild) {
    return res.json({
      hasBot: false,
      roles: [],
      channels: [],
      botRolePosition: 0,
      name: guild.name,
    });
  }

  // Explicitly fetch roles and channels to ensure cache is fully populated
  await Promise.all([
    discordGuild.roles.fetch().catch(() => null),
    discordGuild.channels.fetch().catch(() => null)
  ]);

  const botMember = await discordGuild.members.fetchMe().catch(() => null);
  const botHighestPosition = botMember?.roles.highest.position || 0;

  const roles = discordGuild.roles.cache
    .filter((r) => r.id !== discordGuild.id)
    .map((r) => ({
      id: r.id,
      name: r.name,
      color: r.hexColor !== '#000000' ? r.hexColor : '#99aab5',
      position: r.position,
      managed: r.managed,
      isBelowBot: r.position < botHighestPosition,
    }))
    .sort((a, b) => b.position - a.position);

  const channels = discordGuild.channels.cache
    .filter((c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)
    .map((c) => ({
      id: c.id,
      name: c.name,
      position: c.position,
    }))
    .sort((a, b) => a.position - b.position);

  res.json({
    hasBot: true,
    name: discordGuild.name,
    iconUrl: discordGuild.iconURL({ size: 128 }),
    memberCount: discordGuild.memberCount,
    botRolePosition: botHighestPosition,
    bot: {
      id: client.user?.id,
      username: client.user?.username || 'Verification Bot',
      displayName: client.user?.displayName || client.user?.username || 'Verification Bot',
      tag: client.user?.tag,
      avatar: client.user?.displayAvatarURL(),
    },
    roles,
    channels,
  });
});

/**
 * POST /api/admin/guilds/:guildId/send-verification-message
 */
router.post('/guilds/:guildId/send-verification-message', requireAdmin, async (req: Request, res: Response) => {
  const { guildId } = req.params;
  const env = getEnv();
  const guild = await findGuildById(guildId);
  const config = await getGuildConfig(guildId);

  if (!guild || !config) {
    return res.status(400).json({ error: { code: 'CONFIG_MISSING', message: 'Guild or config not found' } });
  }

  if (!config.verification_channel_id) {
    return res.status(400).json({ error: { code: 'NO_CHANNEL', message: 'No Verification Channel configured. Please configure a channel first.' } });
  }

  const client = getDiscordClient();
  if (!client.isReady()) {
    return res.status(503).json({ error: { code: 'BOT_OFFLINE', message: 'Discord bot gateway is disconnected' } });
  }

  const discordGuild = await client.guilds.fetch(guild.discord_guild_id).catch(() => null);
  if (!discordGuild) {
    return res.status(404).json({ error: { code: 'GUILD_NOT_FOUND', message: 'Bot is not inside this Discord server' } });
  }

  const channel = await discordGuild.channels.fetch(config.verification_channel_id).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return res.status(400).json({ error: { code: 'INVALID_CHANNEL', message: 'Configured channel is not a valid text channel' } });
  }

  const textChannel = channel as TextChannel;

  try {
    // Delete previous messages sent by the bot in this channel for a "fresh" look
    try {
      const fetched = await textChannel.messages.fetch({ limit: 50 });
      const botMessages = fetched.filter(m => m.author.id === client.user?.id);
      for (const [, msg] of botMessages) {
        await msg.delete().catch(() => {});
      }
    } catch (e) {
      logger.warn({ err: e }, 'Failed to delete previous messages in verification channel');
    }

    const embed = new EmbedBuilder()
      .setTitle(`${discordGuild.name} Member Verification`)
      .setDescription(
        config.verification_message ||
          'Welcome to the server! To prevent automated spam and unlock all channels, please complete verification.\n\nClick the button below to get your unique verification link.'
      )
      .setColor(0x5865f2)
      .setFooter({ text: 'Powered by Discord Verification Platform • Safe & Tamper-Proof' })
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId(`start_verification_${guild.id}`)
      .setLabel('Verify Account')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    await textChannel.send({ embeds: [embed], components: [row] });

    await createAuditLog({
      guildId,
      adminId: req.admin?.id,
      eventType: 'admin_action',
      metadata: { action: 'sent_verification_embed', channel_id: config.verification_channel_id },
    });

    res.json({ success: true, message: `Verification prompt dispatched to #${channel.name}!` });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to send message in Discord channel';
    res.status(500).json({ error: { code: 'DISCORD_ERROR', message: errorMsg } });
  }
});

/**
 * GET /api/admin/overview
 */
router.get('/overview', requireAdmin, async (req: Request, res: Response) => {
  try {
    const guildId = await resolveAdminGuildId(req);
    const db = getDb();
    const client = getDiscordClient();

    if (!guildId) {
      return res.json({
        admin: req.admin,
        guild: null,
        guildConfig: null,
        discordGuild: { hasBot: false },
        metrics: { totalUsers: 0, verifiedUsers: 0, unverifiedUsers: 0, stats24h: { total: 0, success: 0, failure: 0 }, stats7d: { total: 0, success: 0, failure: 0 }, stats30d: { total: 0, success: 0, failure: 0 }, successRate: 100 },
        health: { botReady: client.isReady() && client.ws.status === 0, dbOk: true, dbLatencyMs: 0 },
        recentLogs: [],
      });
    }

    const guild = await findGuildById(guildId);
    const guildConfig = await getGuildConfig(guildId);

    const { count: totalUsers } = await db.from('users').select('*', { count: 'exact', head: true });
    const { count: verifiedUsers } = await db
      .from('verifications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'VERIFIED')
      .eq('guild_id', guildId || '');

    const unverifiedUsers = (totalUsers || 0) - (verifiedUsers || 0);

    const now = Date.now();
    const stats24h = await getGuildAttemptStats(guildId, new Date(now - 24 * 60 * 60 * 1000));
    const stats7d = await getGuildAttemptStats(guildId, new Date(now - 7 * 24 * 60 * 60 * 1000));
    const stats30d = await getGuildAttemptStats(guildId, new Date(now - 30 * 24 * 60 * 60 * 1000));

    const totalAttempts = stats30d.total;
    const successRate = totalAttempts > 0 ? Math.round((stats30d.success / totalAttempts) * 100) : 100;

    const dbHealth = await checkDbHealth();
    const { logs: recentLogs } = await getGuildAuditLogs({ guildId, limit: 20 });

    const discordGuild = guild ? client.guilds.cache.get(guild.discord_guild_id) : null;

    res.json({
      admin: req.admin,
      guild,
      guildConfig,
      discordGuild: discordGuild
        ? {
            hasBot: true,
            iconUrl: discordGuild.iconURL({ size: 128 }),
            memberCount: discordGuild.memberCount,
            name: discordGuild.name,
          }
        : { hasBot: false },
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
    logger.error({ err }, 'Error in /api/admin/overview');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load dashboard overview' } });
  }
});

/**
 * GET /api/admin/members
 * Fetches live Discord guild members and merges DB verification status.
 * Uses cursor-based pagination via ?after=<discordId>
 */
router.get('/members', requireAdmin, async (req: Request, res: Response) => {
  const query = ((req.query.q as string) || '').trim();
  const after = (req.query.after as string | undefined)?.trim() || undefined;
  const limit = 50;
  const guildId = await resolveAdminGuildId(req);
  const db = getDb();
  const client = getDiscordClient();

  if (!guildId) {
    return res.json({ members: [], nextCursor: null, hasMore: false });
  }

  const guild = await findGuildById(guildId);
  if (!guild) {
    return res.status(404).json({ error: { code: 'GUILD_NOT_FOUND', message: 'Guild not found' } });
  }

  if (!client.isReady()) {
    return res.status(503).json({ error: { code: 'BOT_OFFLINE', message: 'Discord bot gateway is offline' } });
  }

  let discordGuild = client.guilds.cache.get(guild.discord_guild_id);
  if (!discordGuild) {
    try {
      discordGuild = await client.guilds.fetch(guild.discord_guild_id);
    } catch {
      return res.status(404).json({ error: { code: 'DISCORD_GUILD_NOT_FOUND', message: 'Bot is not in this Discord server' } });
    }
  }

  try {
    let discordMembers: any[];

    // If query is a Snowflake ID — fetch that single member directly
    if (query && /^\d{17,20}$/.test(query)) {
      try {
        const single = await discordGuild.members.fetch(query);
        discordMembers = single && !single.user.bot ? [single] : [];
      } catch {
        discordMembers = [];
      }
    } else {
      // Cursor-based list — Discord members.list() returns up to 1000, we page ourselves
      const fetchOptions: Parameters<typeof discordGuild.members.list>[0] = { limit };
      if (after) (fetchOptions as any).after = after;
      // Username query filter (Discord API fuzzy-matches displayName)
      if (query) (fetchOptions as any).query = query;

      const col = await discordGuild.members.list(fetchOptions);
      discordMembers = [...col.values()].filter((m) => !m.user.bot);
    }

    // Build map of discord_id -> verification from DB for this guild
    const discordIds = discordMembers.map((m) => m.user.id);

    let verifMap = new Map<string, any>();
    if (discordIds.length > 0) {
      // Join verifications -> users on discord_id
      const { data: verifRows } = await db
        .from('verifications')
        .select('status, role_assigned, verified_at, users!inner(discord_id)')
        .eq('guild_id', guildId)
        .in('users.discord_id', discordIds);

      verifMap = new Map(
        (verifRows || []).map((v: any) => [v.users.discord_id, v])
      );
    }

    // Merge Discord member data with verification status
    const members = discordMembers.map((m) => {
      const verif = verifMap.get(m.user.id);
      return {
        discordId: m.user.id,
        username: m.user.username,
        displayName: m.displayName || m.user.username,
        avatar: m.user.displayAvatarURL({ size: 64 }),
        joinedAt: m.joinedAt?.toISOString() ?? null,
        status: verif?.status ?? 'UNVERIFIED',
        roleAssigned: verif?.role_assigned ?? false,
        verifiedAt: verif?.verified_at ?? null,
      };
    });

    // Cursor = last member's discordId (only when not a single-member or username search)
    const isSearchMode = !!query;
    const nextCursor = !isSearchMode && members.length === limit
      ? members[members.length - 1].discordId
      : null;

    res.json({ members, nextCursor, hasMore: !!nextCursor });
  } catch (err) {
    logger.error({ err, guildId }, 'Error fetching Discord guild members');
    res.status(500).json({ error: { code: 'DISCORD_ERROR', message: 'Failed to fetch Discord guild members' } });
  }
});

/**
 * GET /api/admin/members/:userId
 * Accepts either an internal UUID or a Discord snowflake ID.
 */
router.get('/members/:userId', requireAdmin, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const guildId = await resolveAdminGuildId(req);
  const db = getDb();
  const client = getDiscordClient();

  // Resolve user: try snowflake first, then internal UUID
  let user = /^\d{17,20}$/.test(userId)
    ? await findUserByDiscordId(userId)
    : await findUserById(userId);

  // If not in DB yet, try to fetch from Discord and enrich response anyway
  let discordMember: any = null;
  const guild = await findGuildById(guildId);
  if (guild && client.isReady()) {
    try {
      const discordGuild = client.guilds.cache.get(guild.discord_guild_id)
        || await client.guilds.fetch(guild.discord_guild_id).catch(() => null);
      if (discordGuild) {
        const discordId = user?.discord_id ?? (/^\d{17,20}$/.test(userId) ? userId : null);
        if (discordId) {
          discordMember = await discordGuild.members.fetch(discordId).catch(() => null);
        }
      }
    } catch {
      // Non-fatal — Discord lookup failure still returns DB data
    }
  }

  if (!user && !discordMember) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found in database or Discord server' } });
  }

  // Build a synthetic user object if not in DB (never interacted with bot)
  const userRow = user ?? {
    id: null,
    discord_id: discordMember?.user.id,
    username: discordMember?.user.username,
    created_at: discordMember?.joinedAt?.toISOString() ?? new Date().toISOString(),
  };

  // Enrich with live Discord data
  const enriched = {
    ...userRow,
    displayName: discordMember?.displayName ?? userRow.username,
    avatar: discordMember?.user.displayAvatarURL({ size: 128 }) ?? null,
    joinedAt: discordMember?.joinedAt?.toISOString() ?? null,
    roles: discordMember?.roles.cache
      .filter((r: any) => r.id !== discordMember?.guild.id)
      .map((r: any) => ({ id: r.id, name: r.name, color: r.hexColor })) ?? [],
  };

  const internalUserId = user?.id;
  const verification = internalUserId ? await getVerification(internalUserId, guildId) : null;

  const { data: attempts } = internalUserId ? await db
    .from('verification_attempts')
    .select('*')
    .eq('user_id', internalUserId)
    .eq('guild_id', guildId)
    .order('created_at', { ascending: false })
    .limit(20) : { data: [] };

  const { data: auditLogs } = internalUserId ? await db
    .from('audit_logs')
    .select('*')
    .eq('user_id', internalUserId)
    .order('created_at', { ascending: false })
    .limit(20) : { data: [] };

  res.json({ user: enriched, verification, attempts: attempts || [], auditLogs: auditLogs || [] });
});

/**
 * POST /api/admin/members/:userId/verify
 */
router.post('/members/:userId/verify', requireAdmin, requireOwner, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const guildId = await resolveAdminGuildId(req);
  const client = getDiscordClient();

  // Accept both Discord snowflake and internal UUID
  let user = /^\d{17,20}$/.test(userId)
    ? await findUserByDiscordId(userId)
    : await findUserById(userId);

  // If user not in DB (never interacted with bot), auto-create them via Discord fetch
  if (!user && /^\d{17,20}$/.test(userId)) {
    try {
      const discordUser = await client.users.fetch(userId);
      user = await upsertUser(discordUser.id, discordUser.username);
    } catch {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found in Discord server' } });
    }
  }

  const guild = await findGuildById(guildId);
  const config = await getGuildConfig(guildId);

  if (!user || !guild || !config || !config.verified_role_id) {
    return res.status(400).json({ error: { code: 'INVALID_CONFIG', message: 'User or guild configuration is incomplete' } });
  }

  const roleResult = await assignVerifiedRole({
    discordGuildId: guild.discord_guild_id,
    discordUserId: user.discord_id,
    verifiedRoleId: config.verified_role_id,
    unverifiedRoleId: config.unverified_role_id,
    internalGuildId: guildId,
    internalUserId: user.id,
  });

  if (!roleResult.success) {
    return res.status(500).json({ error: { code: 'ROLE_ASSIGN_FAILED', message: roleResult.error } });
  }

  await markVerificationVerified({ userId: user.id, guildId });
  await recordAttempt({ userId: user.id, guildId, result: 'SUCCESS' });
  await createAuditLog({
    guildId,
    userId: user.id,
    adminId: req.admin?.id,
    eventType: 'admin_action',
    metadata: { action: 'manual_verify_override' },
  });

  res.json({ success: true, message: 'Member verified successfully' });
});

/**
 * POST /api/admin/members/:userId/revoke
 */
router.post('/members/:userId/revoke', requireAdmin, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const reason = (req.body.reason as string) || 'Revoked by admin';
  const guildId = await resolveAdminGuildId(req);

  // Accept both Discord snowflake and internal UUID
  const user = /^\d{17,20}$/.test(userId)
    ? await findUserByDiscordId(userId)
    : await findUserById(userId);

  const guild = await findGuildById(guildId);
  const config = await getGuildConfig(guildId);

  if (!user || !guild || !config || !config.verified_role_id) {
    return res.status(400).json({ error: { code: 'INVALID_CONFIG', message: 'User or config incomplete' } });
  }

  await removeVerifiedRole({
    discordGuildId: guild.discord_guild_id,
    discordUserId: user.discord_id,
    verifiedRoleId: config.verified_role_id,
    unverifiedRoleId: config.unverified_role_id,
  });

  await markVerificationRevoked({ userId: user.id, guildId, revokedByAdminId: req.admin?.id });
  await createAuditLog({
    guildId,
    userId: user.id,
    adminId: req.admin?.id,
    eventType: 'verification_revoked',
    metadata: { reason },
  });

  res.json({ success: true, message: 'Verification revoked' });
});

/**
 * POST /api/admin/members/:userId/reverify
 */
router.post('/members/:userId/reverify', requireAdmin, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const guildId = await resolveAdminGuildId(req);
  const env = getEnv();
  const client = getDiscordClient();

  // Accept both Discord snowflake and internal UUID
  let user = /^\d{17,20}$/.test(userId)
    ? await findUserByDiscordId(userId)
    : await findUserById(userId);

  // If user not in DB (never interacted with bot), auto-create them via Discord fetch
  if (!user && /^\d{17,20}$/.test(userId)) {
    try {
      const discordUser = await client.users.fetch(userId);
      user = await upsertUser(discordUser.id, discordUser.username);
    } catch {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found in Discord server' } });
    }
  }

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

  const verifyUrl = `${env.FRONTEND_URL}/verify?token=${encodeURIComponent(signedToken)}`;

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
 * GET & PATCH /api/admin/config
 */
router.get('/config', requireAdmin, async (req: Request, res: Response) => {
  const guildId = await resolveAdminGuildId(req);
  const guild = await findGuildById(guildId);
  const config = await getGuildConfig(guildId);
  res.json({ guild, config });
});

router.patch('/config', requireAdmin, async (req: Request, res: Response) => {
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

  res.json({ success: true, config: updated });
});

/**
 * POST /api/admin/config/auto-setup
 * Automatically provisions Verified role, Unverified role, and sets hierarchy
 */
router.post('/config/auto-setup', requireAdmin, async (req: Request, res: Response) => {
  const guildId = await resolveAdminGuildId(req);
  const guild = await findGuildById(guildId);

  if (!guild) {
    return res.status(404).json({ error: { code: 'GUILD_NOT_FOUND', message: 'Guild not found' } });
  }

  const client = getDiscordClient();
  const discordGuild = client.guilds.cache.get(guild.discord_guild_id);
  if (!discordGuild) {
    return res.status(404).json({ error: { code: 'BOT_NOT_IN_GUILD', message: 'Bot is not connected to this Discord server' } });
  }

  const result = await autoProvisionServerRoles(discordGuild, guild.id);
  const updatedConfig = await getGuildConfig(guild.id);

  res.json({ success: result.success, result, config: updatedConfig });
});

/**
 * POST /api/admin/config/test
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
 * GET /api/admin/logs
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

  res.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
});

export default router;
