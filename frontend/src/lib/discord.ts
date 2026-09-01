export function getBaseAppUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export function getBotInviteUrl(discordGuildId?: string): string {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1544352312972279820';
  const appUrl = getBaseAppUrl();
  const redirectUri = `${appUrl}/auth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    permissions: '8',
    response_type: 'code',
    redirect_uri: redirectUri,
    integration_type: '0',
    scope: 'bot applications.commands identify guilds',
  });

  if (discordGuildId) {
    params.set('guild_id', discordGuildId);
    params.set('disable_guild_select', 'true');
  }

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export function getAdminOAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1544352312972279820';
  const appUrl = getBaseAppUrl();
  const redirectUri = `${appUrl}/admin/login`;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'identify guilds',
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
