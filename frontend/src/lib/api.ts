export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export interface VerificationResult {
  status: 'VERIFIED' | 'FAILED' | 'EXPIRED' | 'ALREADY_VERIFIED' | 'RATE_LIMITED' | 'INVALID_STATE';
  reason?: string;
  retryAfterSeconds?: number;
  user?: {
    id: string;
    username: string;
    avatar: string | null;
  };
  guildName?: string;
}

export async function initiateVerification(token: string, turnstileToken?: string) {
  const res = await fetch(`${BACKEND_URL}/api/verify/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, turnstileToken }),
  });
  return res.json();
}

export async function processVerification(code: string, state: string): Promise<VerificationResult> {
  const res = await fetch(`${BACKEND_URL}/api/verify/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state }),
  });
  return res.json();
}

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, { cache: 'no-store' });
    return await res.json();
  } catch {
    return { status: 'offline', discord_gateway: 'disconnected' };
  }
}

export async function adminLogin(params: { secret?: string; code?: string }) {
  const res = await fetch(`${BACKEND_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function getAdminGuilds(token: string) {
  const res = await fetch(`${BACKEND_URL}/api/admin/guilds`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  return res.json();
}

export async function getGuildDiscordData(token: string, guildId: string) {
  const res = await fetch(`${BACKEND_URL}/api/admin/guilds/${guildId}/discord-data`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  return res.json();
}

export async function sendVerificationEmbed(token: string, guildId: string) {
  const res = await fetch(`${BACKEND_URL}/api/admin/guilds/${guildId}/send-verification-message`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function getAdminOverview(token: string, guildId?: string) {
  const url = new URL(`${BACKEND_URL}/api/admin/overview`);
  if (guildId) url.searchParams.set('guildId', guildId);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  return res.json();
}

export async function getAdminMembers(token: string, query?: string, guildId?: string) {
  const url = new URL(`${BACKEND_URL}/api/admin/members`);
  if (query) url.searchParams.set('q', query);
  if (guildId) url.searchParams.set('guildId', guildId);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  return res.json();
}

export async function getAdminMemberDetail(token: string, userId: string, guildId?: string) {
  const url = new URL(`${BACKEND_URL}/api/admin/members/${userId}`);
  if (guildId) url.searchParams.set('guildId', guildId);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  return res.json();
}

export async function adminVerifyUser(token: string, userId: string, guildId?: string) {
  const url = new URL(`${BACKEND_URL}/api/admin/members/${userId}/verify`);
  if (guildId) url.searchParams.set('guildId', guildId);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function adminRevokeUser(token: string, userId: string, reason?: string, guildId?: string) {
  const url = new URL(`${BACKEND_URL}/api/admin/members/${userId}/revoke`);
  if (guildId) url.searchParams.set('guildId', guildId);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });
  return res.json();
}

export async function adminReverifyUser(token: string, userId: string, guildId?: string) {
  const url = new URL(`${BACKEND_URL}/api/admin/members/${userId}/reverify`);
  if (guildId) url.searchParams.set('guildId', guildId);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function getAdminConfig(token: string, guildId?: string) {
  const url = new URL(`${BACKEND_URL}/api/admin/config`);
  if (guildId) url.searchParams.set('guildId', guildId);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  return res.json();
}

export async function updateAdminConfig(token: string, config: unknown, guildId?: string) {
  const url = new URL(`${BACKEND_URL}/api/admin/config`);
  if (guildId) url.searchParams.set('guildId', guildId);

  const res = await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });
  return res.json();
}

export async function autoSetupAdminConfig(token: string, guildId?: string) {
  const url = new URL(`${BACKEND_URL}/api/admin/config/auto-setup`);
  if (guildId) url.searchParams.set('guildId', guildId);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function testAdminConfig(token: string, guildId?: string) {
  const url = new URL(`${BACKEND_URL}/api/admin/config/test`);
  if (guildId) url.searchParams.set('guildId', guildId);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function getAdminLogs(token: string, page = 1, event?: string, guildId?: string) {
  const url = new URL(`${BACKEND_URL}/api/admin/logs`);
  url.searchParams.set('page', `${page}`);
  if (event) url.searchParams.set('event', event);
  if (guildId) url.searchParams.set('guildId', guildId);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  return res.json();
}
